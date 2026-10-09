import { createFileRoute } from '@tanstack/react-router';

import { classifyFalSubmitFailure } from '@/core/ai';
import { getAuth } from '@/core/auth';
import {
  assertHotelLobbyGenerationId,
  claimHotelLobbySubmission,
  getHotelLobbyTaskById,
  HotelLobbyInsufficientCreditsError,
  markHotelLobbySubmissionUnknown,
  markHotelLobbySubmitted,
  refundHotelLobbyGeneration,
  reserveHotelLobbyGeneration,
} from '@/modules/hotel-lobby/billing';
import {
  estimateHotelLobbyCredits,
  estimateHotelLobbyProviderCost,
  HOTEL_LOBBY_BILLING_RESOLUTION,
  HOTEL_LOBBY_MODEL,
} from '@/modules/hotel-lobby/pricing';
import {
  buildHotelLobbyPrompt,
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

const HOTEL_LOBBY_ASPECT_RATIO = '16:9' as const;
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

    const existing = await getHotelLobbyTaskById({
      generationId,
      userId,
    });
    if (existing) return respData(taskResponse(existing));

    const useDefaultTemplate = body.useDefaultTemplate === true;

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

    if (imageKeys.length < 1 || imageKeys.length > 2) {
      return respErr('Provide one or two reference images', { status: 400 });
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
    });
    const providerInput = await resolveHotelLobbyInputUrls({
      userId,
      generationId,
      ...sealed,
    });

    // Output duration follows the reference video (probed from MP4/MOV/WebM),
    // rounded to the integer range Kling O3 accepts (3–15s).
    const clientDurationHint =
      typeof body.durationSeconds === 'number'
        ? body.durationSeconds
        : typeof body.durationSeconds === 'string'
          ? Number(body.durationSeconds)
          : undefined;
    const duration = await probeHotelLobbyDurationSeconds(
      providerInput.videoUrl,
      {
        fallbackSeconds: Number.isFinite(clientDurationHint)
          ? clientDurationHint
          : undefined,
      }
    );
    // Kling O3 rejects out-of-range pixels; fail before credit reservation.
    await probeHotelLobbyVideoDimensions(providerInput.videoUrl);

    const prompt = buildHotelLobbyPrompt(imageKeys.length);
    const providerCostUsd = estimateHotelLobbyProviderCost({
      duration,
      imageCount: imageKeys.length,
    });
    const credits = estimateHotelLobbyCredits({
      duration,
      imageCount: imageKeys.length,
    });

    const task = await reserveHotelLobbyGeneration({
      generationId,
      userId,
      userEmail: session.user.email,
      model: HOTEL_LOBBY_MODEL,
      prompt,
      duration,
      resolution: HOTEL_LOBBY_BILLING_RESOLUTION,
      aspectRatio: HOTEL_LOBBY_ASPECT_RATIO,
      promptExpansionMode: HOTEL_LOBBY_PROMPT_EXPANSION_MODE,
      ...sealed,
      providerCostUsd,
      credits,
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

    try {
      const result = await submitHotelLobby({
        prompt,
        duration,
        ...providerInput,
      });

      const submitted = await markHotelLobbySubmitted({
        generationId,
        userId,
        requestId: result.requestId,
      });

      return respData(
        submitted
          ? taskResponse(submitted)
          : {
              generationId,
              requestId: result.requestId,
              status: 'submitted',
              reservedCredits: credits,
            }
      );
    } catch (error: any) {
      const message =
        error instanceof Error ? error.message : 'Kling O3 submission failed';

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
          'Kling O3 could not start this generation. Credits were refunded.',
          { code: 'PROVIDER_SUBMIT_FAILED', generationId },
          { status: 502 }
        );
      }

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
