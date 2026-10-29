import { createFileRoute } from '@tanstack/react-router';

import { classifyWavespeedSubmitFailure } from '@/core/ai/wavespeed';
import { getAuth } from '@/core/auth';
import { assertVideoFaceSwapGenerationId } from '@/modules/video-face-swap/assert';
import {
  assertVideoFaceSwapTaskMatches,
  claimVideoFaceSwapSubmission,
  getVideoFaceSwapTaskById,
  markVideoFaceSwapSubmissionUnknown,
  markVideoFaceSwapSubmitted,
  parseVideoFaceSwapTask,
  refundVideoFaceSwapGeneration,
  reserveVideoFaceSwapGeneration,
  VideoFaceSwapGenerationConflictError,
  VideoFaceSwapInsufficientCreditsError,
} from '@/modules/video-face-swap/billing';
import {
  isVideoFaceSwapResolution,
  VIDEO_FACE_SWAP_CONSENT_VERSION,
  VIDEO_FACE_SWAP_DEFAULT_RESOLUTION,
  VIDEO_FACE_SWAP_MODEL,
  VIDEO_FACE_SWAP_PREVIEW_DURATION_SECONDS,
  VIDEO_FACE_SWAP_PREVIEW_RESOLUTION,
} from '@/modules/video-face-swap/constants';
import {
  estimateVideoFaceSwapCredits,
  estimateVideoFaceSwapProviderCost,
} from '@/modules/video-face-swap/pricing';
import {
  buildVideoFaceSwapEffectivePrompt,
  normalizeVideoFaceSwapUserInstructions,
  VideoFaceSwapPromptError,
} from '@/modules/video-face-swap/prompt';
import { submitVideoFaceSwap } from '@/modules/video-face-swap/service';
import {
  createVideoFaceSwapR2ReadUrl,
  deleteVideoFaceSwapOrphanSealedKey,
  sealVideoFaceSwapInputs,
} from '@/modules/video-face-swap/storage';
import { probeVideoFaceSwapDurationSeconds } from '@/modules/video-face-swap/video-metadata';
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
    keyPrefix: 'video-face-swap-generate',
  });
  if (limited) return limited;

  const orphanSealedKeys: string[] = [];

  try {
    const auth = getAuth();
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) return respErr('Unauthorized', { status: 401 });
    const userId = session.user.id;

    const body = await request.json().catch(() => ({}));
    const generationId = assertVideoFaceSwapGenerationId(body.generationId);

    const videoKey = typeof body.videoKey === 'string' ? body.videoKey : '';
    const imageKey = typeof body.imageKey === 'string' ? body.imageKey : '';
    const videoContentType =
      typeof body.videoContentType === 'string' ? body.videoContentType : '';
    const imageContentType =
      typeof body.imageContentType === 'string' ? body.imageContentType : '';
    const videoContentLength = Number(body.videoContentLength);
    const imageContentLength = Number(body.imageContentLength);

    if (
      !videoKey ||
      !imageKey ||
      !videoContentType ||
      !imageContentType ||
      !Number.isFinite(videoContentLength) ||
      !Number.isFinite(imageContentLength)
    ) {
      return respErr('Uploaded media is incomplete', { status: 400 });
    }

    const consentVersion =
      typeof body.consentVersion === 'string' ? body.consentVersion.trim() : '';
    if (consentVersion !== VIDEO_FACE_SWAP_CONSENT_VERSION) {
      return respErr('Consent is required before generating', { status: 400 });
    }

    const isPreview = body.preview === true;
    const resolution = isPreview
      ? VIDEO_FACE_SWAP_PREVIEW_RESOLUTION
      : isVideoFaceSwapResolution(body.resolution)
        ? body.resolution
        : VIDEO_FACE_SWAP_DEFAULT_RESOLUTION;
    if (isPreview && body.resolution && body.resolution !== '480p') {
      return respErr('Preview must use 480p', { status: 400 });
    }

    const userInstructions = normalizeVideoFaceSwapUserInstructions(
      body.userInstructions
    );
    const prompt = buildVideoFaceSwapEffectivePrompt(userInstructions);

    const existing = await getVideoFaceSwapTaskById({ generationId, userId });

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
      const options = parseVideoFaceSwapTask(existing).options;
      if (
        typeof options?.sealedVideoKey !== 'string' ||
        typeof options?.sealedImageKey !== 'string' ||
        !options.sealedVideoKey ||
        !options.sealedImageKey
      ) {
        throw new VideoFaceSwapGenerationConflictError(
          'This generation ID is already bound to different inputs'
        );
      }
      assertVideoFaceSwapTaskMatches(existing, {
        prompt,
        durationSeconds: Number(options.durationSeconds),
        billableSeconds: Number(options.billableSeconds),
        resolution: options.resolution,
        sealedVideoKey: options.sealedVideoKey,
        sealedImageKey: options.sealedImageKey,
        stagingVideoKey: videoKey,
        stagingImageKey: imageKey,
        pricingVersion: options.pricingVersion,
        consentVersion: options.consentVersion,
        preview: Boolean(options.preview),
      });
      return respData(taskResponse(existing));
    }

    const existingOptions = existing
      ? parseVideoFaceSwapTask(existing).options
      : null;

    const sealed = await sealVideoFaceSwapInputs({
      userId,
      generationId,
      stagingVideoKey: videoKey,
      stagingImageKey: imageKey,
      videoContentType,
      videoContentLength,
      imageContentType,
      imageContentLength,
      existingSealedVideoKey:
        typeof existingOptions?.sealedVideoKey === 'string'
          ? existingOptions.sealedVideoKey
          : null,
      existingSealedImageKey:
        typeof existingOptions?.sealedImageKey === 'string'
          ? existingOptions.sealedImageKey
          : null,
    });
    orphanSealedKeys.push(...sealed.orphanKeys);

    const videoReadUrl = await createVideoFaceSwapR2ReadUrl(
      sealed.sealedVideoKey
    );
    const durationSeconds =
      await probeVideoFaceSwapDurationSeconds(videoReadUrl);
    if (
      isPreview &&
      durationSeconds > VIDEO_FACE_SWAP_PREVIEW_DURATION_SECONDS + 0.25
    ) {
      return respErr(
        `Preview source must be ${VIDEO_FACE_SWAP_PREVIEW_DURATION_SECONDS}s or shorter`,
        { status: 400 }
      );
    }
    const quote = estimateVideoFaceSwapProviderCost({
      durationSeconds,
      resolution,
    });
    const credits = estimateVideoFaceSwapCredits({
      durationSeconds,
      resolution,
    });

    const matchSnapshot = {
      prompt,
      durationSeconds,
      billableSeconds: quote.billableSeconds,
      resolution,
      sealedVideoKey: sealed.sealedVideoKey,
      sealedImageKey: sealed.sealedImageKey,
      stagingVideoKey: videoKey,
      stagingImageKey: imageKey,
      pricingVersion: quote.pricingVersion,
      consentVersion,
      preview: isPreview,
    };

    const task = await reserveVideoFaceSwapGeneration({
      generationId,
      userId,
      userEmail: session.user.email,
      ...matchSnapshot,
      providerCostUsd: quote.providerCostUsd,
      credits,
    });
    orphanSealedKeys.length = 0;

    if (task.status !== 'reserved') {
      return respData(taskResponse(task));
    }

    const claimed = await claimVideoFaceSwapSubmission({
      generationId,
      userId,
    });
    if (!claimed) {
      const current = await getVideoFaceSwapTaskById({ generationId, userId });
      return respData(taskResponse(current || task));
    }

    let faceImageUrl: string;
    try {
      faceImageUrl = await createVideoFaceSwapR2ReadUrl(sealed.sealedImageKey);
    } catch (error: unknown) {
      const message =
        error instanceof Error
          ? error.message
          : 'Failed to prepare sealed media URL';
      await refundVideoFaceSwapGeneration({
        generationId,
        userId,
        error: message,
      });
      return respErr(message, { status: 502 });
    }

    let requestId: string | null = null;
    try {
      const submitted = await submitVideoFaceSwap({
        videoUrl: videoReadUrl,
        faceImageUrl,
        prompt,
        resolution,
      });
      requestId = submitted.requestId;
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : 'Upstream submit failed';

      if (classifyWavespeedSubmitFailure(error) === 'refund') {
        await refundVideoFaceSwapGeneration({
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

      console.error('[ops] video-face-swap submission_unknown credits_held', {
        generationId,
        userId,
        model: VIDEO_FACE_SWAP_MODEL,
        error: message,
        hasRequestId: false,
      });
      await markVideoFaceSwapSubmissionUnknown({
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
        '[ops] video-face-swap submission_unknown missing_request_id',
        { generationId, userId }
      );
      await markVideoFaceSwapSubmissionUnknown({
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

    try {
      const updated = await markVideoFaceSwapSubmitted({
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
          : 'Failed to bind upstream request id';

      console.error('[ops] video-face-swap bind_failed requestId_held', {
        generationId,
        userId,
        requestId: boundRequestId,
        error: message,
        hasRequestId: true,
      });

      await markVideoFaceSwapSubmissionUnknown({
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
    for (const key of orphanSealedKeys) {
      await deleteVideoFaceSwapOrphanSealedKey(key);
    }
    console.error('video-face-swap generate failed:', error);
    if (error instanceof VideoFaceSwapInsufficientCreditsError) {
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
    if (error instanceof VideoFaceSwapGenerationConflictError) {
      return respJson(
        -1,
        error.message,
        { code: 'GENERATION_CONFLICT' },
        { status: 409 }
      );
    }
    if (error instanceof VideoFaceSwapPromptError) {
      return respErr(error.message, { status: 400 });
    }
    return respErr(error?.message || 'Failed to start generation', {
      status: 400,
    });
  }
}

export const Route = createFileRoute('/api/video-face-swap/generate')({
  server: {
    handlers: { POST },
  },
});
