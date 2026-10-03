import { createFileRoute } from '@tanstack/react-router';

import { getAuth } from '@/core/auth';
import { getBalance } from '@/modules/credits/service';
import {
  assertGenerationId,
  claimGenjutsuSubmission,
  getGenjutsuTaskById,
  InsufficientCreditsError,
  markGenjutsuAttemptFailedPreflight,
  markGenjutsuAttemptInsufficient,
  markGenjutsuSubmissionUnknown,
  markGenjutsuSubmitted,
  parseGenjutsuTaskInfo,
  refundGenjutsuGeneration,
  reserveGenjutsuCredits,
} from '@/modules/genjutsu/billing';
import {
  isGenjutsuE2EMockEnabled,
  resolveGenjutsuE2EInputUrls,
} from '@/modules/genjutsu/e2e-mock';
import {
  calculateGenjutsuCredits,
  estimateGenjutsuCredits,
} from '@/modules/genjutsu/pricing';
import {
  HiggsfieldHttpError,
  HiggsfieldPreflightError,
  isSeedanceLikenessRejection,
  resolveGenjutsuProviderCost,
  resolveGenjutsuProviderTarget,
  SeedanceHttpError,
  SeedancePreflightError,
  submitGenjutsu,
  type GenjutsuMode,
  type GenjutsuProvider,
  type GenjutsuResolution,
} from '@/modules/genjutsu/service';
import { resolveGenjutsuInputUrls } from '@/modules/genjutsu/storage';
import { enforceMinIntervalRateLimit } from '@/lib/rate-limit';
import { respData, respErr, respJson } from '@/lib/resp';

type GenerationInput = {
  mode: GenjutsuMode;
  resolution: GenjutsuResolution;
  prompt: string;
  videoKey?: string;
  imageKeys?: string[];
  videoUrl?: string;
  imageUrls?: string[];
};

type ProviderGenerationInput = {
  mode: GenjutsuMode;
  resolution: GenjutsuResolution;
  prompt: string;
  videoUrl: string;
  imageUrls: string[];
};

function hasStorageInput(input: GenerationInput) {
  return (
    typeof input.videoKey === 'string' &&
    input.videoKey.length > 0 &&
    Array.isArray(input.imageKeys) &&
    input.imageKeys.length > 0
  );
}

function taskSourceDurationSeconds(task: any) {
  const { info } = parseGenjutsuTaskInfo(task);
  const direct = info?.sourceDurationSeconds;
  if (typeof direct === 'number' && Number.isFinite(direct) && direct > 0) {
    return direct;
  }

  const quoted = info?.providerEstimate?.sourceDurationSeconds;
  return typeof quoted === 'number' && Number.isFinite(quoted) && quoted > 0
    ? quoted
    : undefined;
}

function inputFromBody(body: any): GenerationInput {
  return {
    mode: body.mode as GenjutsuMode,
    resolution: body.resolution as GenjutsuResolution,
    prompt: typeof body.prompt === 'string' ? body.prompt : '',
    videoKey: typeof body.videoKey === 'string' ? body.videoKey : undefined,
    imageKeys: Array.isArray(body.imageKeys)
      ? body.imageKeys.filter(
          (value: unknown): value is string => typeof value === 'string'
        )
      : undefined,
    videoUrl: typeof body.videoUrl === 'string' ? body.videoUrl : undefined,
    imageUrls: Array.isArray(body.imageUrls)
      ? body.imageUrls.filter(
          (value: unknown): value is string => typeof value === 'string'
        )
      : undefined,
  };
}

function inputFromTask(task: {
  options?: string | null;
  prompt?: string | null;
}): GenerationInput {
  if (!task.options) throw new Error('Generation input is missing');
  const parsed = JSON.parse(task.options);
  return {
    mode: parsed.mode as GenjutsuMode,
    resolution: parsed.resolution as GenjutsuResolution,
    prompt:
      typeof parsed.prompt === 'string'
        ? parsed.prompt
        : typeof task.prompt === 'string'
          ? task.prompt
          : '',
    videoKey: typeof parsed.videoKey === 'string' ? parsed.videoKey : undefined,
    imageKeys: Array.isArray(parsed.imageKeys)
      ? parsed.imageKeys.filter(
          (value: unknown): value is string => typeof value === 'string'
        )
      : undefined,
    videoUrl: typeof parsed.videoUrl === 'string' ? parsed.videoUrl : undefined,
    imageUrls: Array.isArray(parsed.imageUrls)
      ? parsed.imageUrls.filter(
          (value: unknown): value is string => typeof value === 'string'
        )
      : undefined,
  };
}

async function resolveProviderInput(params: {
  input: GenerationInput;
  userId: string;
  generationId: string;
  allowLegacyUrls: boolean;
}): Promise<ProviderGenerationInput> {
  const { input } = params;

  if (
    typeof input.videoKey === 'string' &&
    Array.isArray(input.imageKeys) &&
    input.imageKeys.length > 0
  ) {
    const urls =
      params.allowLegacyUrls && isGenjutsuE2EMockEnabled()
        ? resolveGenjutsuE2EInputUrls({
            videoKey: input.videoKey,
            imageKeys: input.imageKeys,
          })
        : await resolveGenjutsuInputUrls({
            userId: params.userId,
            generationId: params.generationId,
            videoKey: input.videoKey,
            imageKeys: input.imageKeys,
          });
    return {
      mode: input.mode,
      resolution: input.resolution,
      prompt: input.prompt,
      ...urls,
    };
  }

  if (
    params.allowLegacyUrls &&
    typeof input.videoUrl === 'string' &&
    Array.isArray(input.imageUrls) &&
    input.imageUrls.length > 0
  ) {
    return {
      mode: input.mode,
      resolution: input.resolution,
      prompt: input.prompt,
      videoUrl: input.videoUrl,
      imageUrls: input.imageUrls,
    };
  }

  throw new Error('Upload the source media to R2 before starting Genjutsu');
}

function taskResponse(task: any) {
  const { info } = parseGenjutsuTaskInfo(task);
  return {
    generationId: task.id,
    requestId: task.taskId || null,
    status: task.status,
    reservedCredits: task.costCredits || 0,
    providerCostUsd:
      typeof info?.providerCostUsd === 'number' ? info.providerCostUsd : null,
  };
}

async function POST({ request }: { request: Request }) {
  const limited = enforceMinIntervalRateLimit(request, {
    intervalMs: 1_500,
    keyPrefix: 'genjutsu-generate',
  });
  if (limited) return limited;

  let generationIdForFailure: string | null = null;
  let userIdForFailure: string | null = null;

  try {
    const auth = getAuth();
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) {
      return respErr('Unauthorized', { status: 401 });
    }
    userIdForFailure = session.user.id;

    const body = await request.json().catch(() => ({}));
    const generationId = assertGenerationId(body.generationId);
    generationIdForFailure = generationId;

    let task = await getGenjutsuTaskById({
      generationId,
      userId: session.user.id,
    });
    let input: GenerationInput;

    if (task) {
      if (task.status !== 'ready' && task.status !== 'reserved') {
        return respData(taskResponse(task));
      }
      input = inputFromTask(task);
    } else {
      input = inputFromBody(body);
    }

    const needsReservation = !task || task.status === 'ready';

    const target = task
      ? {
          provider: (task.provider || 'higgsfield') as GenjutsuProvider,
          model: task.model || resolveGenjutsuProviderTarget(input.mode).model,
        }
      : resolveGenjutsuProviderTarget(input.mode);

    if (target.provider === 'seedance' && !hasStorageInput(input)) {
      throw new Error(
        'Seedance generations must use server-owned R2 storage keys'
      );
    }

    let sourceDurationSeconds = task
      ? taskSourceDurationSeconds(task)
      : undefined;

    const providerInput = await resolveProviderInput({
      input,
      userId: session.user.id,
      generationId,
      allowLegacyUrls: Boolean(task) || isGenjutsuE2EMockEnabled(),
    });

    let pendingQuote: {
      providerCostUsd: number;
      credits: number;
      providerEstimate: unknown;
      sourceDurationSeconds?: number;
    } | null = null;

    if (needsReservation && target.provider === 'higgsfield') {
      // Cheap preflight: if the user cannot afford even the minimum 4-second
      // clip at this resolution, fail before live /estimate or submit.
      const minimumCredits = estimateGenjutsuCredits({
        durationSeconds: 4,
        resolution: input.resolution,
      });
      const balance = await getBalance(session.user.id);
      if (balance < minimumCredits) {
        await markGenjutsuAttemptInsufficient({
          generationId,
          userId: session.user.id,
          requiredCredits: minimumCredits,
          balance,
        });
        throw new InsufficientCreditsError(minimumCredits, balance);
      }
    } else if (needsReservation && target.provider === 'seedance') {
      // Seedance has no free /estimate endpoint. Probe the server-owned R2
      // source once, build the list-rate quote, and reject an obviously
      // insufficient wallet before submit. Provider likeness policy is
      // enforced by Seedance after submit and surfaced on status/refund.
      const estimate = await resolveGenjutsuProviderCost({
        ...providerInput,
        ...target,
      });
      const credits = calculateGenjutsuCredits(estimate.providerCostUsd);
      const balance = await getBalance(session.user.id);
      if (balance < credits) {
        await markGenjutsuAttemptInsufficient({
          generationId,
          userId: session.user.id,
          requiredCredits: credits,
          balance,
        });
        throw new InsufficientCreditsError(credits, balance);
      }

      sourceDurationSeconds = estimate.sourceDurationSeconds;
      pendingQuote = {
        providerCostUsd: estimate.providerCostUsd,
        credits,
        providerEstimate: estimate.payload,
        sourceDurationSeconds,
      };
    }

    if (needsReservation) {
      if (!pendingQuote) {
        // Higgsfield's live /estimate; client-supplied credit amounts ignored.
        const estimate = await resolveGenjutsuProviderCost({
          ...providerInput,
          ...target,
          durationSeconds:
            typeof body.durationSeconds === 'number'
              ? body.durationSeconds
              : undefined,
        });
        const credits = calculateGenjutsuCredits(estimate.providerCostUsd);
        sourceDurationSeconds = estimate.sourceDurationSeconds;
        pendingQuote = {
          providerCostUsd: estimate.providerCostUsd,
          credits,
          providerEstimate: estimate.payload,
          sourceDurationSeconds,
        };
      }

      task = await reserveGenjutsuCredits({
        generationId,
        userId: session.user.id,
        userEmail: session.user.email,
        ...input,
        ...target,
        providerCostUsd: pendingQuote.providerCostUsd,
        credits: pendingQuote.credits,
        providerEstimate: pendingQuote.providerEstimate,
        sourceDurationSeconds: pendingQuote.sourceDurationSeconds,
      });

      if (task.status !== 'reserved') {
        return respData(taskResponse(task));
      }
    }

    // Only one request is allowed to transition reserved -> submitting.
    const claimed = await claimGenjutsuSubmission({
      generationId,
      userId: session.user.id,
    });
    if (!claimed) {
      const current = await getGenjutsuTaskById({
        generationId,
        userId: session.user.id,
      });
      if (!current) throw new Error('Generation reservation disappeared');
      return respData(taskResponse(current));
    }

    try {
      const result = await submitGenjutsu({
        ...providerInput,
        ...target,
        endUserId: session.user.id,
        sourceDurationSeconds,
      });

      await markGenjutsuSubmitted({
        generationId,
        userId: session.user.id,
        requestId: result.requestId,
      });

      const current = await getGenjutsuTaskById({
        generationId,
        userId: session.user.id,
      });

      return respData(
        current
          ? taskResponse(current)
          : {
              generationId,
              requestId: result.requestId,
              status: result.status,
              reservedCredits: task.costCredits || 0,
            }
      );
    } catch (error: any) {
      if (
        error instanceof HiggsfieldPreflightError ||
        error instanceof SeedancePreflightError
      ) {
        await refundGenjutsuGeneration({
          generationId,
          userId: session.user.id,
          providerStatus: 'preflight_failed',
          error: error.message,
        });
        return respJson(
          -1,
          error.message || 'The video provider could not start the generation',
          {
            code: 'PROVIDER_PREFLIGHT_FAILED',
            generationId,
            refundedCredits: task.costCredits || 0,
          },
          { status: 400 }
        );
      }

      if (
        error instanceof HiggsfieldHttpError ||
        error instanceof SeedanceHttpError
      ) {
        await refundGenjutsuGeneration({
          generationId,
          userId: session.user.id,
          providerStatus: `http_${error.status}`,
          error: error.message,
        });
        const likeness =
          error instanceof SeedanceHttpError &&
          isSeedanceLikenessRejection(error.message);
        return respJson(
          -1,
          error.message || 'The video provider rejected the generation',
          {
            code: likeness ? 'PROVIDER_LIKENESS_REJECTED' : 'PROVIDER_REJECTED',
            generationId,
            refundedCredits: task.costCredits || 0,
          },
          { status: error.status >= 400 && error.status < 500 ? 400 : 502 }
        );
      }

      // A transport error can happen after the provider accepted the request but
      // before we received request_id. Retrying automatically could create a
      // second billable generation, so keep the reservation and flag it.
      const message =
        error instanceof Error ? error.message : 'Unknown submission error';
      await markGenjutsuSubmissionUnknown({
        generationId,
        userId: session.user.id,
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
    if (error instanceof InsufficientCreditsError) {
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

    if (generationIdForFailure && userIdForFailure) {
      await markGenjutsuAttemptFailedPreflight({
        generationId: generationIdForFailure,
        userId: userIdForFailure,
        stage: 'generate_preflight',
        errorCode: 'GENERATION_PREFLIGHT_FAILED',
        error: error?.message || 'Failed to start generation',
      }).catch(() => undefined);
    }

    console.error('genjutsu submit failed:', error);
    return respErr(error?.message || 'Failed to start generation', {
      status: 400,
    });
  }
}

export const Route = createFileRoute('/api/genjutsu/generate')({
  server: {
    handlers: { POST },
  },
});
