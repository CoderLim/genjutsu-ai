import { createFileRoute } from '@tanstack/react-router';

import { getAuth } from '@/core/auth';
import {
  assertHotelLobbyGenerationId,
  claimHotelLobbySubmission,
  getHotelLobbyTaskById,
  HotelLobbyInsufficientCreditsError,
  markHotelLobbySubmitted,
  markHotelLobbySubmissionUnknown,
  refundHotelLobbyGeneration,
  reserveHotelLobbyGeneration,
} from '@/modules/hotel-lobby/billing';
import {
  estimateHotelLobbyCredits,
  estimateHotelLobbyProviderCost,
  HOTEL_LOBBY_ASPECT_RATIOS,
  HOTEL_LOBBY_MODEL,
  HOTEL_LOBBY_RESOLUTIONS,
  type HotelLobbyAspectRatio,
  type HotelLobbyResolution,
} from '@/modules/hotel-lobby/pricing';
import {
  submitHotelLobby,
  type HotelLobbyPromptExpansionMode,
} from '@/modules/hotel-lobby/service';
import {
  resolveHotelLobbyInputUrls,
  sealHotelLobbyInputs,
} from '@/modules/hotel-lobby/storage';
import { enforceMinIntervalRateLimit } from '@/lib/rate-limit';
import { respData, respErr, respJson } from '@/lib/resp';

const PROMPT_EXPANSION_MODES = new Set<HotelLobbyPromptExpansionMode>([
  'disabled',
  'fast',
  'balanced',
  'quality',
]);

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

    const prompt = typeof body.prompt === 'string' ? body.prompt.trim() : '';
    const duration = Number(body.duration);
    const resolution = body.resolution as HotelLobbyResolution;
    const aspectRatio = body.aspectRatio as HotelLobbyAspectRatio;
    const promptExpansionMode =
      body.promptExpansionMode as HotelLobbyPromptExpansionMode;

    if (!prompt) return respErr('Prompt is required', { status: 400 });
    if (!HOTEL_LOBBY_RESOLUTIONS.includes(resolution)) {
      return respErr('Invalid resolution', { status: 400 });
    }
    if (!HOTEL_LOBBY_ASPECT_RATIOS.includes(aspectRatio)) {
      return respErr('Invalid aspect ratio', { status: 400 });
    }
    if (!PROMPT_EXPANSION_MODES.has(promptExpansionMode)) {
      return respErr('Invalid prompt expansion mode', { status: 400 });
    }

    const videoKey =
      typeof body.videoKey === 'string' ? body.videoKey : '';
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
      !videoKey ||
      imageKeys.length < 1 ||
      imageKeys.length > 9 ||
      contentTypes.length !== imageKeys.length + 1 ||
      contentLengths.length !== contentTypes.length
    ) {
      return respErr('Uploaded reference media is incomplete', {
        status: 400,
      });
    }

    const providerCostUsd = estimateHotelLobbyProviderCost({
      duration,
      resolution,
      imageCount: imageKeys.length,
    });
    const credits = estimateHotelLobbyCredits({
      duration,
      resolution,
      imageCount: imageKeys.length,
    });

    const sealed = await sealHotelLobbyInputs({
      userId,
      generationId,
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

    const task = await reserveHotelLobbyGeneration({
      generationId,
      userId,
      userEmail: session.user.email,
      model: HOTEL_LOBBY_MODEL,
      prompt,
      duration,
      resolution,
      aspectRatio,
      promptExpansionMode,
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
        resolution,
        aspectRatio,
        promptExpansionMode,
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
        error instanceof Error ? error.message : 'MiniMax H3 submission failed';

      if (/request failed with status:/i.test(message)) {
        await refundHotelLobbyGeneration({
          generationId,
          userId,
          providerStatus: 'submit_failed',
          error: message,
        });
        return respJson(
          -1,
          'MiniMax H3 could not start this generation. Credits were refunded.',
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
