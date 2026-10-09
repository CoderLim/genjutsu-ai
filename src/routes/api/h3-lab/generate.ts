import { createFileRoute } from '@tanstack/react-router';

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
  assertH3LabDuration,
  estimateH3LabCredits,
  estimateH3LabProviderCost,
  H3_LAB_MODEL,
  H3_MAX_PROMPT_LENGTH,
  H3_MAX_REFERENCE_IMAGES,
  HOTEL_LOBBY_ASPECT_RATIOS,
  HOTEL_LOBBY_RESOLUTIONS,
  type HotelLobbyAspectRatio,
  type HotelLobbyResolution,
} from '@/modules/hotel-lobby/pricing';
import {
  submitH3Lab,
  type HotelLobbyPromptExpansionMode,
} from '@/modules/hotel-lobby/service';
import {
  resolveHotelLobbyInputUrls,
  sealHotelLobbyInputs,
} from '@/modules/hotel-lobby/storage';
import { probeH3LabDurationSeconds } from '@/modules/hotel-lobby/video-metadata';
import { enforceMinIntervalRateLimit } from '@/lib/rate-limit';
import { respData, respErr, respJson } from '@/lib/resp';

const PROMPT_EXPANSION_MODES = new Set<HotelLobbyPromptExpansionMode>([
  'disabled',
  'fast',
  'balanced',
  'quality',
]);

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

function parseDurationOverride(value: unknown): number | undefined {
  if (typeof value === 'number') return value;
  if (typeof value === 'string' && value.trim()) return Number(value);
  return undefined;
}

async function POST({ request }: { request: Request }) {
  const limited = enforceMinIntervalRateLimit(request, {
    intervalMs: 1_500,
    keyPrefix: 'h3-lab-generate',
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
    if (!prompt) return respErr('Prompt is required', { status: 400 });
    if (prompt.length > H3_MAX_PROMPT_LENGTH) {
      return respErr(
        `Prompt is too long (max ${H3_MAX_PROMPT_LENGTH} characters)`,
        {
          status: 400,
        }
      );
    }

    const resolution = body.resolution as HotelLobbyResolution;
    if (!HOTEL_LOBBY_RESOLUTIONS.includes(resolution)) {
      return respErr('Invalid resolution', { status: 400 });
    }

    const aspectRatio = (
      typeof body.aspectRatio === 'string' ? body.aspectRatio : '16:9'
    ) as HotelLobbyAspectRatio;
    if (!HOTEL_LOBBY_ASPECT_RATIOS.includes(aspectRatio)) {
      return respErr('Invalid aspect ratio', { status: 400 });
    }

    const promptExpansionMode = (
      typeof body.promptExpansionMode === 'string'
        ? body.promptExpansionMode
        : 'disabled'
    ) as HotelLobbyPromptExpansionMode;
    if (!PROMPT_EXPANSION_MODES.has(promptExpansionMode)) {
      return respErr('Invalid prompt expansion mode', { status: 400 });
    }

    const enableSafetyChecker = body.enableSafetyChecker !== false;

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

    if (imageKeys.length < 1 || imageKeys.length > H3_MAX_REFERENCE_IMAGES) {
      return respErr(
        `Provide between 1 and ${H3_MAX_REFERENCE_IMAGES} reference images`,
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
      maxReferenceImages: H3_MAX_REFERENCE_IMAGES,
    });
    const providerInput = await resolveHotelLobbyInputUrls({
      userId,
      generationId,
      ...sealed,
      maxReferenceImages: H3_MAX_REFERENCE_IMAGES,
    });

    const durationOverride = parseDurationOverride(body.durationSeconds);
    const durationMode = body.durationMode === 'manual' ? 'manual' : 'auto';

    let duration: number;
    if (durationMode === 'manual') {
      if (durationOverride == null || !Number.isFinite(durationOverride)) {
        return respErr('Manual duration must be an integer 5–15', {
          status: 400,
        });
      }
      const rounded = Math.round(durationOverride);
      assertH3LabDuration(rounded);
      duration = rounded;
    } else {
      duration = await probeH3LabDurationSeconds(providerInput.videoUrl, {
        fallbackSeconds:
          durationOverride != null && Number.isFinite(durationOverride)
            ? durationOverride
            : undefined,
      });
    }

    const providerCostUsd = estimateH3LabProviderCost({
      duration,
      resolution,
      imageCount: imageKeys.length,
    });
    const credits = estimateH3LabCredits({
      duration,
      resolution,
      imageCount: imageKeys.length,
    });

    const task = await reserveHotelLobbyGeneration({
      generationId,
      userId,
      userEmail: session.user.email,
      model: H3_LAB_MODEL,
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
      if (!current) throw new Error('H3 lab generation disappeared');
      return respData(taskResponse(current));
    }

    try {
      const result = await submitH3Lab({
        prompt,
        duration,
        resolution,
        aspectRatio,
        promptExpansionMode,
        enableSafetyChecker,
        maxReferenceImages: H3_MAX_REFERENCE_IMAGES,
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
    } catch (error: unknown) {
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
  } catch (error: unknown) {
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

    console.error('h3-lab generate failed:', error);
    const message =
      error instanceof Error
        ? error.message
        : 'Failed to start H3 lab generation';
    return respErr(message, { status: 400 });
  }
}

export const Route = createFileRoute('/api/h3-lab/generate')({
  server: {
    handlers: { POST },
  },
});
