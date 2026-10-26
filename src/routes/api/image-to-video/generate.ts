import { createFileRoute } from '@tanstack/react-router';

import { classifyWavespeedSubmitFailure } from '@/core/ai/wavespeed';
import { getAuth } from '@/core/auth';
import { assertImageToVideoGenerationId } from '@/modules/image-to-video/assert';
import {
  assertImageToVideoTaskMatches,
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

function taskResponse(task: {
  id: string;
  taskId?: string | null;
  status: string;
  costCredits?: number | null;
}) {
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

  let orphanSealedKey: string | null = null;

  try {
    const auth = getAuth();
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) return respErr('Unauthorized', { status: 401 });
    const userId = session.user.id;

    const body = await request.json().catch(() => ({}));
    const generationId = assertImageToVideoGenerationId(body.generationId);

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

    const prompt = preset.promptFor(variant);

    const existing = await getImageToVideoTaskById({
      generationId,
      userId,
    });

    // In-flight after claim / terminal: return existing (idempotent) or conflict.
    // `reserved` is intentionally excluded so a crash between reserve and claim
    // can still claim + submit on retry without double-charging.
    if (
      existing &&
      (existing.status === 'submitted' ||
        existing.status === 'completing' ||
        existing.status === 'completed' ||
        existing.status === 'submitting' ||
        existing.status === 'submission_unknown' ||
        existing.status === 'refunding' ||
        existing.status === 'refunded')
    ) {
      const options = parseImageToVideoTask(existing).options;
      if (
        typeof options?.sealedImageKey !== 'string' ||
        !options.sealedImageKey
      ) {
        throw new ImageToVideoGenerationConflictError(
          'This generation ID is already bound to different inputs'
        );
      }
      // Client staging key + generation params must match the reserved binding.
      assertImageToVideoTaskMatches(existing, {
        prompt,
        duration,
        resolution,
        aspectRatio,
        generateAudio: preset.generateAudio,
        sealedImageKey: options.sealedImageKey,
        stagingImageKey: imageKey,
        presetId: preset.id,
        presetVersion: preset.version,
        variant,
      });
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

    const quote = estimateImageToVideoProviderCost({ duration, resolution });
    const credits = estimateImageToVideoCredits({ duration, resolution });

    const matchSnapshot = {
      prompt,
      duration,
      resolution,
      aspectRatio,
      generateAudio: preset.generateAudio,
      sealedImageKey: sealed.sealedImageKey,
      stagingImageKey: imageKey,
      presetId: preset.id,
      presetVersion: preset.version,
      variant,
    };

    const task = await reserveImageToVideoGeneration({
      generationId,
      userId,
      userEmail: session.user.email,
      ...matchSnapshot,
      providerCostUsd: quote.providerCostUsd,
      credits,
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

    // Pre-submit: signed URL failure means we never contacted WaveSpeed → refund.
    let imageUrl: string;
    try {
      imageUrl = await createImageToVideoR2ReadUrl(sealed.sealedImageKey);
    } catch (error: unknown) {
      const message =
        error instanceof Error
          ? error.message
          : 'Failed to prepare sealed image URL';
      await refundImageToVideoGeneration({
        generationId,
        userId,
        error: message,
      });
      return respErr(message, { status: 502 });
    }

    let requestId: string | null = null;
    try {
      const submitted = await submitImageToVideo({
        imageUrl,
        prompt,
        duration,
        resolution,
        aspectRatio,
        generateAudio: preset.generateAudio,
      });
      requestId = submitted.requestId;
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : 'Upstream submit failed';

      // Only definite 4xx / config rejections are safe to refund.
      if (classifyWavespeedSubmitFailure(error) === 'refund') {
        await refundImageToVideoGeneration({
          generationId,
          userId,
          providerStatus: 'submit_failed',
          error: message,
        });
        return respJson(
          -1,
          'Generation could not start. Credits were refunded.',
          { code: 'PROVIDER_SUBMIT_FAILED', generationId },
          { status: 502 }
        );
      }

      console.error('[ops] image-to-video submission_unknown credits_held', {
        generationId,
        userId,
        model: IMAGE_TO_VIDEO_MODEL,
        error: message,
        hasRequestId: false,
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

    if (!requestId) {
      console.error(
        '[ops] image-to-video submission_unknown missing_request_id',
        {
          generationId,
          userId,
        }
      );
      await markImageToVideoSubmissionUnknown({
        generationId,
        userId,
        error: 'Upstream submit returned without a request id',
      });
      return respJson(
        -1,
        'Submission result is uncertain. Credits remain reserved; do not retry. Contact support if this persists.',
        { code: 'SUBMISSION_UNKNOWN', generationId },
        { status: 502 }
      );
    }

    const boundRequestId = requestId;

    // Bind is a separate boundary: WaveSpeed already accepted the job.
    try {
      const updated = await markImageToVideoSubmitted({
        generationId,
        userId,
        requestId: boundRequestId,
      });
      return respData(
        taskResponse(
          updated || {
            ...task,
            taskId: boundRequestId,
            status: 'submitted',
          }
        )
      );
    } catch (error: unknown) {
      const message =
        error instanceof Error
          ? error.message
          : 'Failed to bind WaveSpeed request id';

      console.error('[ops] image-to-video bind_failed requestId_held', {
        generationId,
        userId,
        requestId: boundRequestId,
        error: message,
        hasRequestId: true,
      });

      await markImageToVideoSubmissionUnknown({
        generationId,
        userId,
        requestId: boundRequestId,
        error: `bind_failed: ${message}`,
      });

      return respJson(
        -1,
        'Generation was accepted by the provider but could not be bound locally. Credits remain reserved; do not retry this generation.',
        { code: 'SUBMISSION_UNKNOWN', generationId, requestId: boundRequestId },
        { status: 502 }
      );
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
    if (error instanceof ImageToVideoGenerationConflictError) {
      return respJson(
        -1,
        error.message,
        { code: 'GENERATION_CONFLICT' },
        { status: 409 }
      );
    }
    if (error instanceof ImageToVideoPreflightError) {
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
