import { createFileRoute } from '@tanstack/react-router';

import { classifyFalSubmitFailure } from '@/core/ai';
import { getAuth } from '@/core/auth';
import {
  assertChuttamalleGenerationId,
  ChuttamalleInsufficientCreditsError,
  claimChuttamalleSubmission,
  getChuttamalleTaskById,
  markChuttamalleSubmissionUnknown,
  markChuttamalleSubmitted,
  refundChuttamalleGeneration,
  reserveChuttamalleGeneration,
} from '@/modules/chuttamalle/billing';
import {
  CHUTTAMALLE_MODEL,
  CHUTTAMALLE_RESOLUTIONS,
  estimateChuttamalleCredits,
  estimateChuttamalleProviderCost,
  type ChuttamalleResolution,
} from '@/modules/chuttamalle/pricing';
import {
  buildChuttamallePrompt,
  submitChuttamalle,
} from '@/modules/chuttamalle/service';
import {
  resolveChuttamalleInputUrls,
  sealChuttamalleInputs,
} from '@/modules/chuttamalle/storage';
import { probeChuttamalleDurationSeconds } from '@/modules/chuttamalle/video-metadata';
import { enforceMinIntervalRateLimit } from '@/lib/rate-limit';
import { respData, respErr, respJson } from '@/lib/resp';

const CHUTTAMALLE_ASPECT_RATIO = '16:9' as const;
const CHUTTAMALLE_PROMPT_EXPANSION_MODE = 'disabled' as const;

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
    keyPrefix: 'chuttamalle-generate',
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
    generationId = assertChuttamalleGenerationId(body.generationId);

    const existing = await getChuttamalleTaskById({
      generationId,
      userId,
    });
    if (existing) return respData(taskResponse(existing));

    const useDefaultTemplate = body.useDefaultTemplate === true;
    const resolution = body.resolution as ChuttamalleResolution;
    if (!CHUTTAMALLE_RESOLUTIONS.includes(resolution)) {
      return respErr('Invalid resolution', { status: 400 });
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

    const sealed = await sealChuttamalleInputs({
      userId,
      generationId,
      useDefaultTemplate,
      videoKey,
      imageKeys,
      contentTypes,
      contentLengths,
    });
    const providerInput = await resolveChuttamalleInputUrls({
      userId,
      generationId,
      ...sealed,
    });

    // The output duration is intentionally not a user setting on this preset.
    // It follows the reference video duration (probed from MP4/MOV/WebM, with
    // a client-provided fallback for MediaRecorder WebM clips that omit
    // Duration metadata), rounded to the integer range MiniMax H3 accepts.
    const clientDurationHint =
      typeof body.durationSeconds === 'number'
        ? body.durationSeconds
        : typeof body.durationSeconds === 'string'
          ? Number(body.durationSeconds)
          : undefined;
    const duration = await probeChuttamalleDurationSeconds(
      providerInput.videoUrl,
      {
        fallbackSeconds: Number.isFinite(clientDurationHint)
          ? clientDurationHint
          : undefined,
      }
    );

    const prompt = buildChuttamallePrompt(imageKeys.length);
    const providerCostUsd = estimateChuttamalleProviderCost({
      duration,
      resolution,
      imageCount: imageKeys.length,
    });
    const credits = estimateChuttamalleCredits({
      duration,
      resolution,
      imageCount: imageKeys.length,
    });

    const task = await reserveChuttamalleGeneration({
      generationId,
      userId,
      userEmail: session.user.email,
      model: CHUTTAMALLE_MODEL,
      prompt,
      duration,
      resolution,
      aspectRatio: CHUTTAMALLE_ASPECT_RATIO,
      promptExpansionMode: CHUTTAMALLE_PROMPT_EXPANSION_MODE,
      ...sealed,
      providerCostUsd,
      credits,
    });

    if (task.status !== 'reserved') {
      return respData(taskResponse(task));
    }

    const claimed = await claimChuttamalleSubmission({
      generationId,
      userId,
    });
    if (!claimed) {
      const current = await getChuttamalleTaskById({ generationId, userId });
      if (!current) throw new Error('Chuttamalle generation disappeared');
      return respData(taskResponse(current));
    }

    try {
      const result = await submitChuttamalle({
        prompt,
        duration,
        resolution,
        aspectRatio: CHUTTAMALLE_ASPECT_RATIO,
        promptExpansionMode: CHUTTAMALLE_PROMPT_EXPANSION_MODE,
        ...providerInput,
      });

      const submitted = await markChuttamalleSubmitted({
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

      if (classifyFalSubmitFailure(message) === 'refund') {
        await refundChuttamalleGeneration({
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

      await markChuttamalleSubmissionUnknown({
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
    if (error instanceof ChuttamalleInsufficientCreditsError) {
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

    console.error('chuttamalle generate failed:', error);
    return respErr(error?.message || 'Failed to start Chuttamalle generation', {
      status: 400,
    });
  }
}

export const Route = createFileRoute('/api/chuttamalle/generate')({
  server: {
    handlers: { POST },
  },
});
