import { createFileRoute } from '@tanstack/react-router';

import { classifyFalSubmitFailure } from '@/core/ai';
import { getAuth } from '@/core/auth';
import {
  assertHotelLobbyGenerationId,
  assertHotelLobbyTaskMatches,
  claimHotelLobbySubmission,
  getHotelLobbyTaskById,
  HotelLobbyGenerationConflictError,
  HotelLobbyInsufficientCreditsError,
  markHotelLobbySubmissionUnknown,
  markHotelLobbySubmitted,
  refundHotelLobbyGeneration,
  reserveHotelLobbyGeneration,
} from '@/modules/hotel-lobby/billing';
import { resolveHotelLobbyPreset } from '@/modules/hotel-lobby/presets';
import {
  estimateHotelLobbyCredits,
  estimateHotelLobbyProviderCost,
  HOTEL_LOBBY_BILLING_RESOLUTION,
  HOTEL_LOBBY_MODEL,
} from '@/modules/hotel-lobby/pricing';
import {
  HotelLobbyPreflightError,
  submitHotelLobby,
} from '@/modules/hotel-lobby/service';
import {
  resolveHotelLobbyInputUrls,
  sealHotelLobbyInputs,
} from '@/modules/hotel-lobby/storage';
import {
  probeHotelLobbyDurationSeconds,
  probeHotelLobbyVideoDimensions,
} from '@/modules/hotel-lobby/video-metadata';
import { enforceMinIntervalRateLimit } from '@/lib/rate-limit';
import { respData, respErr, respJson } from '@/lib/resp';

const HOTEL_LOBBY_PROMPT_EXPANSION_MODE = 'disabled' as const;

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
    keyPrefix: 'hotel-lobby-generate',
  });
  if (limited) return limited;

  let generationId: string | null = null;
  let userId: string | null = null;

  try {
    const auth = getAuth();
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) return respErr('Unauthorized', { status: 401 });
    userId = session.user.id;

    const body = await request.json().catch(() => ({}));
    generationId = assertHotelLobbyGenerationId(body.generationId);

    const preset = resolveHotelLobbyPreset(body.presetId);
    const useDefaultTemplate = body.useDefaultTemplate === true;
    if (body.preview === true) {
      return respErr('Paid preview is no longer supported', { status: 400 });
    }

    if (!preset.allowCustomVideo) {
      if (!useDefaultTemplate) {
        return respErr(
          `${preset.displayName} only supports the fixed reference template`,
          { status: 400 }
        );
      }
      if (typeof body.videoKey === 'string' && body.videoKey.length > 0) {
        return respErr(
          `${preset.displayName} does not accept a custom reference video`,
          { status: 400 }
        );
      }
    }

    const videoKey =
      typeof body.videoKey === 'string' ? body.videoKey : undefined;
    const imageKeys = Array.isArray(body.imageKeys)
      ? body.imageKeys.filter(
          (value: unknown): value is string => typeof value === 'string'
        )
      : [];
    const contentTypes = Array.isArray(body.contentTypes)
      ? body.contentTypes.filter(
          (value: unknown): value is string => typeof value === 'string'
        )
      : [];
    const contentLengths = Array.isArray(body.contentLengths)
      ? body.contentLengths.map((value: unknown) => Number(value))
      : [];

    if (
      imageKeys.length < preset.imageCount.min ||
      imageKeys.length > preset.imageCount.max
    ) {
      return respErr(
        preset.imageCount.min === preset.imageCount.max
          ? `Provide exactly ${preset.imageCount.min} reference image${
              preset.imageCount.min === 1 ? '' : 's'
            }`
          : `Provide between ${preset.imageCount.min} and ${preset.imageCount.max} reference images`,
        { status: 400 }
      );
    }

    const expectedUploadCount = imageKeys.length + (useDefaultTemplate ? 0 : 1);
    if (
      (!useDefaultTemplate && !videoKey) ||
      contentTypes.length !== expectedUploadCount ||
      contentLengths.length !== expectedUploadCount
    ) {
      return respErr('Uploaded reference media is incomplete', {
        status: 400,
      });
    }

    const sealed = await sealHotelLobbyInputs({
      userId,
      generationId,
      useDefaultTemplate,
      videoKey,
      imageKeys,
      contentTypes,
      contentLengths,
      maxReferenceImages: preset.imageCount.max,
      templateVideoKey: useDefaultTemplate
        ? preset.templateVideoKey
        : undefined,
      presetId: useDefaultTemplate ? preset.id : undefined,
    });
    const providerInput = await resolveHotelLobbyInputUrls({
      userId,
      generationId,
      ...sealed,
    });

    // Output duration follows the reference video (probed from MP4/MOV/WebM),
    // rounded to the integer range Kling O3 accepts (3–15s).
    // Fixed templates: never trust client duration — fail if probe fails.
    const clientDurationHint =
      typeof body.durationSeconds === 'number'
        ? body.durationSeconds
        : typeof body.durationSeconds === 'string'
          ? Number(body.durationSeconds)
          : undefined;
    const duration = await probeHotelLobbyDurationSeconds(
      providerInput.videoUrl,
      useDefaultTemplate
        ? undefined
        : {
            fallbackSeconds: Number.isFinite(clientDurationHint)
              ? clientDurationHint
              : undefined,
          }
    );
    // Kling O3 rejects out-of-range pixels; fail before credit reservation.
    await probeHotelLobbyVideoDimensions(providerInput.videoUrl);

    const prompt = preset.promptFor(imageKeys.length);
    const providerCostUsd = estimateHotelLobbyProviderCost({
      duration,
      imageCount: imageKeys.length,
      maxImages: preset.imageCount.max,
    });
    const credits = estimateHotelLobbyCredits({
      duration,
      imageCount: imageKeys.length,
      maxImages: preset.imageCount.max,
    });

    const matchSnapshot = {
      prompt,
      duration,
      resolution: HOTEL_LOBBY_BILLING_RESOLUTION,
      aspectRatio: preset.aspectRatio,
      promptExpansionMode: HOTEL_LOBBY_PROMPT_EXPANSION_MODE,
      videoKey: sealed.videoKey,
      imageKeys: sealed.imageKeys,
      presetId: preset.id,
      presetVersion: preset.version,
      keepAudio: preset.keepAudio,
    };

    // Conflict-check before reserve so a reused generationId with a different
    // preset/inputs returns 409 instead of silently replaying the old task.
    const existing = await getHotelLobbyTaskById({
      generationId,
      userId,
    });
    if (existing) {
      assertHotelLobbyTaskMatches(existing, matchSnapshot);
      return respData(taskResponse(existing));
    }

    const task = await reserveHotelLobbyGeneration({
      generationId,
      userId,
      userEmail: session.user.email,
      model: HOTEL_LOBBY_MODEL,
      ...matchSnapshot,
      ...sealed,
      providerCostUsd,
      credits,
      creditDescription: preset.creditDescription,
    });

    if (task.status !== 'reserved') {
      return respData(taskResponse(task));
    }

    const claimed = await claimHotelLobbySubmission({
      generationId,
      userId,
    });
    if (!claimed) {
      const current = await getHotelLobbyTaskById({ generationId, userId });
      if (!current) throw new Error('Hotel Lobby generation disappeared');
      return respData(taskResponse(current));
    }

    let requestId: string | null = null;
    try {
      const result = await submitHotelLobby({
        prompt,
        duration,
        keepAudio: preset.keepAudio,
        maxReferenceImages: preset.imageCount.max,
        ...providerInput,
      });
      requestId = result.requestId;
    } catch (error: unknown) {
      const message =
        error instanceof Error
          ? error.message
          : 'Video generation submission failed';

      // Only definite 4xx rejections are safe to refund. 5xx/429/network
      // uncertainty keeps credits reserved for manual recovery.
      if (classifyFalSubmitFailure(message) === 'refund') {
        await refundHotelLobbyGeneration({
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

      console.error('[ops] hotel-lobby submission_unknown credits_held', {
        generationId,
        userId,
        error: message,
        hasRequestId: false,
      });
      await markHotelLobbySubmissionUnknown({
        generationId,
        userId,
        error: message,
      });
      return respJson(
        -1,
        'Generation submission result is uncertain. Credits remain reserved; do not retry this generation.',
        { code: 'SUBMISSION_UNKNOWN', generationId },
        { status: 502 }
      );
    }

    // Bind is a separate error boundary: Fal already accepted the job.
    // Never refund or treat bind failure as a provider rejection.
    try {
      const submitted = await markHotelLobbySubmitted({
        generationId,
        userId,
        requestId,
      });

      return respData(
        submitted
          ? taskResponse(submitted)
          : {
              generationId,
              requestId,
              status: 'submitted',
              reservedCredits: credits,
            }
      );
    } catch (error: unknown) {
      const message =
        error instanceof Error
          ? error.message
          : 'Failed to bind Fal request id';

      console.error('[ops] hotel-lobby bind_failed requestId_persisted', {
        generationId,
        userId,
        requestId,
        error: message,
        hasRequestId: true,
      });

      await markHotelLobbySubmissionUnknown({
        generationId,
        userId,
        requestId,
        error: `bind_failed: ${message}`,
      });

      return respJson(
        -1,
        'Generation was accepted by the provider but could not be bound locally. Credits remain reserved; do not retry this generation.',
        { code: 'SUBMISSION_UNKNOWN', generationId, requestId },
        { status: 502 }
      );
    }
  } catch (error: any) {
    if (error instanceof HotelLobbyInsufficientCreditsError) {
      return respJson(
        -1,
        `Insufficient credits: need ${error.requiredCredits}, balance ${error.balance}`,
        {
          code: 'INSUFFICIENT_CREDITS',
          requiredCredits: error.requiredCredits,
          balance: error.balance,
        },
        { status: 402 }
      );
    }

    if (error instanceof HotelLobbyGenerationConflictError) {
      return respJson(
        -1,
        error.message,
        { code: 'GENERATION_CONFLICT' },
        {
          status: 409,
        }
      );
    }

    if (error instanceof HotelLobbyPreflightError) {
      return respErr(error.message, { status: 400 });
    }

    console.error('hotel-lobby generate failed:', error);
    return respErr(error?.message || 'Failed to start Hotel Lobby generation', {
      status: 400,
    });
  }
}

export const Route = createFileRoute('/api/hotel-lobby/generate')({
  server: {
    handlers: { POST },
  },
});
