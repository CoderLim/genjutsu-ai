import { createFileRoute } from '@tanstack/react-router';

import { getAuth } from '@/core/auth';
import { assertImageToVideoGenerationId } from '@/modules/image-to-video/assert';
import {
  claimImageToVideoSubmission,
  getImageToVideoTaskById,
  ImageToVideoGenerationConflictError,
  ImageToVideoInsufficientCreditsError,
  markImageToVideoSubmissionUnknown,
  markImageToVideoSubmitted,
  parseImageToVideoTask,
  refundImageToVideoGeneration,
  reserveImageToVideoGeneration,
} from '@/modules/image-to-video/billing';
import {
  IMAGE_TO_VIDEO_DEFAULT_ASPECT_RATIO,
  IMAGE_TO_VIDEO_DEFAULT_DURATION,
  IMAGE_TO_VIDEO_DEFAULT_RESOLUTION,
  IMAGE_TO_VIDEO_MODEL,
  isImageToVideoAspectRatio,
  isImageToVideoResolution,
} from '@/modules/image-to-video/constants';
import {
  ImageToVideoPreflightError,
  resolveImageToVideoPreset,
  resolveImageToVideoVariant,
} from '@/modules/image-to-video/presets';
import {
  estimateImageToVideoCredits,
  estimateImageToVideoProviderCost,
} from '@/modules/image-to-video/pricing';
import { submitImageToVideo } from '@/modules/image-to-video/service';
import {
  createImageToVideoR2ReadUrl,
  deleteImageToVideoOrphanSealedKey,
  sealImageToVideoInput,
} from '@/modules/image-to-video/storage';
import { enforceMinIntervalRateLimit } from '@/lib/rate-limit';
import { respData, respErr, respJson } from '@/lib/resp';

function taskResponse(task: any) {
  return {
    generationId: task.id,
    requestId: task.taskId || null,
    status: task.status,
    reservedCredits: task.costCredits || 0,
  };
}

async function POST({ request }: { request: Request }) {
  const limited = enforceMinIntervalRateLimit(request, {
    intervalMs: 1_500,
    keyPrefix: 'image-to-video-generate',
  });
  if (limited) return limited;

  let generationId: string | null = null;
  let userId: string | null = null;
  let orphanSealedKey: string | null = null;

  try {
    const auth = getAuth();
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) return respErr('Unauthorized', { status: 401 });
    userId = session.user.id;

    const body = await request.json().catch(() => ({}));
    generationId = assertImageToVideoGenerationId(body.generationId);

    const preset = resolveImageToVideoPreset(body.presetId);
    const variant = resolveImageToVideoVariant(preset, body.variant);

    const imageKey =
      typeof body.imageKey === 'string'
        ? body.imageKey
        : Array.isArray(body.imageKeys) && typeof body.imageKeys[0] === 'string'
          ? body.imageKeys[0]
          : '';
    const contentType =
      typeof body.contentType === 'string'
        ? body.contentType
        : Array.isArray(body.contentTypes) &&
            typeof body.contentTypes[0] === 'string'
          ? body.contentTypes[0]
          : '';
    const contentLength = Number(
      body.contentLength ??
        (Array.isArray(body.contentLengths) ? body.contentLengths[0] : NaN)
    );

    if (!imageKey || !contentType || !Number.isFinite(contentLength)) {
      return respErr('Uploaded image is incomplete', { status: 400 });
    }

    const duration =
      typeof body.duration === 'number'
        ? body.duration
        : preset.defaultDuration || IMAGE_TO_VIDEO_DEFAULT_DURATION;
    const resolution = isImageToVideoResolution(body.resolution)
      ? body.resolution
      : preset.defaultResolution || IMAGE_TO_VIDEO_DEFAULT_RESOLUTION;
    const aspectRatio = isImageToVideoAspectRatio(body.aspectRatio)
      ? body.aspectRatio
      : preset.defaultAspectRatio || IMAGE_TO_VIDEO_DEFAULT_ASPECT_RATIO;

    const existing = await getImageToVideoTaskById({
      generationId,
      userId,
    });
    if (
      existing &&
      (existing.status === 'submitted' ||
        existing.status === 'completing' ||
        existing.status === 'completed' ||
        existing.status === 'submitting' ||
        existing.status === 'submission_unknown')
    ) {
      return respData(taskResponse(existing));
    }

    const existingOptions = existing
      ? parseImageToVideoTask(existing).options
      : null;

    const sealed = await sealImageToVideoInput({
      userId,
      generationId,
      stagingImageKey: imageKey,
      expectedContentType: contentType,
      expectedContentLength: contentLength,
      existingSealedImageKey:
        typeof existingOptions?.sealedImageKey === 'string'
          ? existingOptions.sealedImageKey
          : null,
    });
    if (!sealed.reused) orphanSealedKey = sealed.sealedImageKey;

    const prompt = preset.promptFor(variant);
    const quote = estimateImageToVideoProviderCost({ duration, resolution });
    const credits = estimateImageToVideoCredits({ duration, resolution });

    const task = await reserveImageToVideoGeneration({
      generationId,
      userId,
      userEmail: session.user.email,
      prompt,
      duration,
      resolution,
      aspectRatio,
      generateAudio: preset.generateAudio,
      sealedImageKey: sealed.sealedImageKey,
      stagingImageKey: imageKey,
      providerCostUsd: quote.providerCostUsd,
      credits,
      presetId: preset.id,
      presetVersion: preset.version,
      variant,
      displayName: preset.displayName,
      creditDescription: preset.creditDescription,
    });
    orphanSealedKey = null;

    if (task.status !== 'reserved') {
      return respData(taskResponse(task));
    }

    const claimed = await claimImageToVideoSubmission({
      generationId,
      userId,
    });
    if (!claimed) {
      const current = await getImageToVideoTaskById({ generationId, userId });
      return respData(taskResponse(current || task));
    }

    const imageUrl = await createImageToVideoR2ReadUrl(sealed.sealedImageKey);

    try {
      const submitted = await submitImageToVideo({
        imageUrl,
        prompt,
        duration,
        resolution,
        aspectRatio,
        generateAudio: preset.generateAudio,
      });

      const updated = await markImageToVideoSubmitted({
        generationId,
        userId,
        requestId: submitted.requestId,
      });
      return respData(taskResponse(updated || task));
    } catch (error: any) {
      const ambiguous = Boolean(error?.ambiguous);
      const message = error?.message || 'Upstream submit failed';

      if (ambiguous) {
        console.error('[ops] image-to-video submission_unknown credits_held', {
          generationId,
          userId,
          model: IMAGE_TO_VIDEO_MODEL,
          error: message,
        });
        await markImageToVideoSubmissionUnknown({
          generationId,
          userId,
          error: message,
        });
        return respJson(
          -1,
          'Submission result is uncertain. Credits remain reserved; do not retry. Contact support if this persists.',
          { code: 'SUBMISSION_UNKNOWN', generationId },
          { status: 502 }
        );
      }

      await refundImageToVideoGeneration({
        generationId,
        userId,
        error: message,
      });
      return respErr(message, { status: 502 });
    }
  } catch (error: any) {
    if (orphanSealedKey) {
      await deleteImageToVideoOrphanSealedKey(orphanSealedKey);
    }
    console.error('image-to-video generate failed:', error);
    if (error instanceof ImageToVideoInsufficientCreditsError) {
      return respJson(
        -1,
        'Insufficient credits',
        {
          code: 'INSUFFICIENT_CREDITS',
          requiredCredits: error.requiredCredits,
          balance: error.balance,
        },
        { status: 402 }
      );
    }
    if (
      error instanceof ImageToVideoPreflightError ||
      error instanceof ImageToVideoGenerationConflictError
    ) {
      return respErr(error.message, { status: 400 });
    }
    return respErr(error?.message || 'Failed to start generation', {
      status: 400,
    });
  }
}

export const Route = createFileRoute('/api/image-to-video/generate')({
  server: {
    handlers: { POST },
  },
});
