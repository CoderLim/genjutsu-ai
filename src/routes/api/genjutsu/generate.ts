import { createFileRoute } from '@tanstack/react-router';

import { getAuth } from '@/core/auth';
import {
  A2oLiteAiPreflightError,
  assertA2oLiteAiInputs,
} from '@/modules/a2o-lite-ai/assert';
import {
  A2O_LITE_AI_ASPECT_RATIO,
  A2O_LITE_AI_PRODUCT_ID,
} from '@/modules/a2o-lite-ai/constants';
import {
  A2oLiteAiProviderBindingError,
  assertA2oLiteAiProviderBinding,
} from '@/modules/a2o-lite-ai/provider';
import {
  assertBurningBridgesAiInputs,
  BurningBridgesAiPreflightError,
} from '@/modules/burning-bridges-ai/assert';
import {
  BURNING_BRIDGES_AI_ASPECT_RATIO,
  BURNING_BRIDGES_AI_PRODUCT_ID,
} from '@/modules/burning-bridges-ai/constants';
import {
  assertBurningBridgesAiProviderBinding,
  BurningBridgesAiProviderBindingError,
} from '@/modules/burning-bridges-ai/provider';
import {
  assertColdplayKissCamInputs,
  ColdplayKissCamPreflightError,
} from '@/modules/coldplay-kiss-cam/assert';
import {
  COLDPLAY_KISS_CAM_ASPECT_RATIO,
  COLDPLAY_KISS_CAM_PRODUCT_ID,
} from '@/modules/coldplay-kiss-cam/constants';
import {
  assertColdplayKissCamProviderBinding,
  ColdplayKissCamProviderBindingError,
} from '@/modules/coldplay-kiss-cam/provider';
import {
  assertCrazyFrogInputs,
  CrazyFrogPreflightError,
} from '@/modules/crazy-frog/assert';
import {
  CRAZY_FROG_ASPECT_RATIO,
  CRAZY_FROG_PRODUCT_ID,
} from '@/modules/crazy-frog/constants';
import { getBalance } from '@/modules/credits/service';
import {
  assertEnzoFernandezAiInputs,
  EnzoFernandezAiPreflightError,
} from '@/modules/enzo-fernandez-ai/assert';
import {
  ENZO_FERNANDEZ_AI_ASPECT_RATIO,
  ENZO_FERNANDEZ_AI_PRODUCT_ID,
} from '@/modules/enzo-fernandez-ai/constants';
import {
  assertEnzoFernandezAiProviderBinding,
  EnzoFernandezAiProviderBindingError,
} from '@/modules/enzo-fernandez-ai/provider';
import {
  assertFlyingCarAiInputs,
  FlyingCarAiPreflightError,
} from '@/modules/flying-car-ai/assert';
import {
  FLYING_CAR_AI_ASPECT_RATIO,
  FLYING_CAR_AI_PRODUCT_ID,
} from '@/modules/flying-car-ai/constants';
import {
  assertFlyingCarAiProviderBinding,
  FlyingCarAiProviderBindingError,
} from '@/modules/flying-car-ai/provider';
import {
  assertGangnamStyleAiInputs,
  GangnamStyleAiPreflightError,
} from '@/modules/gangnam-style-ai/assert';
import {
  GANGNAM_STYLE_AI_ASPECT_RATIO,
  GANGNAM_STYLE_AI_PRODUCT_ID,
} from '@/modules/gangnam-style-ai/constants';
import {
  assertGangnamStyleAiProviderBinding,
  GangnamStyleAiProviderBindingError,
} from '@/modules/gangnam-style-ai/provider';
import {
  assertGasStationDanceAiInputs,
  GasStationDanceAiPreflightError,
} from '@/modules/gas-station-dance-ai/assert';
import {
  GAS_STATION_DANCE_AI_ASPECT_RATIO,
  GAS_STATION_DANCE_AI_PRODUCT_ID,
} from '@/modules/gas-station-dance-ai/constants';
import {
  assertGasStationDanceAiProviderBinding,
  GasStationDanceAiProviderBindingError,
} from '@/modules/gas-station-dance-ai/provider';
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
import { calculateGenjutsuCredits } from '@/modules/genjutsu/pricing';
import {
  isUncertainProviderHttpStatus,
  logGenjutsuProviderFailure,
  providerFailureDebugFields,
  splitProviderFailureError,
} from '@/modules/genjutsu/provider-errors';
import {
  HiggsfieldHttpError,
  HiggsfieldPreflightError,
  resolveGenjutsuProviderCost,
  resolveGenjutsuProviderTarget,
  SeeapiSeedanceHttpError,
  SeedanceHttpError,
  SeedancePreflightError,
  submitGenjutsu,
  VolcengineSeedanceHttpError,
  WavespeedSeedanceHttpError,
  type GenjutsuMode,
  type GenjutsuProvider,
  type GenjutsuResolution,
} from '@/modules/genjutsu/service';
import { resolveGenjutsuInputUrls } from '@/modules/genjutsu/storage';
import { isSeedanceFamilyProvider } from '@/modules/genjutsu/workflow';
import {
  assertSayItRightAiInputs,
  SayItRightAiPreflightError,
} from '@/modules/say-it-right-ai/assert';
import {
  SAY_IT_RIGHT_AI_ASPECT_RATIO,
  SAY_IT_RIGHT_AI_PRODUCT_ID,
} from '@/modules/say-it-right-ai/constants';
import {
  assertSayItRightAiProviderBinding,
  SayItRightAiProviderBindingError,
} from '@/modules/say-it-right-ai/provider';
import {
  assertSmalltownBoyDanceInputs,
  SmalltownBoyDancePreflightError,
} from '@/modules/smalltown-boy-dance/assert';
import {
  SMALLTOWN_ASPECT_RATIO,
  SMALLTOWN_PRODUCT_ID,
} from '@/modules/smalltown-boy-dance/constants';
import {
  assertZombieHugInputs,
  ZombieHugPreflightError,
} from '@/modules/zombie-hug/assert';
import {
  isZombieHugAspectRatio,
  ZOMBIE_HUG_PRODUCT_ID,
} from '@/modules/zombie-hug/constants';
import {
  assertZombieHugProviderBinding,
  ZombieHugProviderBindingError,
} from '@/modules/zombie-hug/provider';
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

    const taskOptions = task?.options
      ? (JSON.parse(task.options) as Record<string, unknown>)
      : null;
    const product =
      typeof taskOptions?.product === 'string' ? taskOptions.product : null;
    if (product === SMALLTOWN_PRODUCT_ID) {
      assertSmalltownBoyDanceInputs(taskOptions);
    }
    if (product === CRAZY_FROG_PRODUCT_ID) {
      assertCrazyFrogInputs(taskOptions);
    }
    if (product === A2O_LITE_AI_PRODUCT_ID) {
      if (!task) {
        throw new A2oLiteAiPreflightError(
          'A2O Lite AI generation must start from a saved attempt'
        );
      }
      assertA2oLiteAiInputs(taskOptions);
      assertA2oLiteAiProviderBinding(task.provider, task.model);
    }
    if (product === ENZO_FERNANDEZ_AI_PRODUCT_ID) {
      if (!task) {
        throw new EnzoFernandezAiPreflightError(
          'Enzo Fernandez AI generation must start from a saved attempt'
        );
      }
      assertEnzoFernandezAiInputs(taskOptions);
      assertEnzoFernandezAiProviderBinding(task.provider, task.model);
    }
    if (product === BURNING_BRIDGES_AI_PRODUCT_ID) {
      if (!task) {
        throw new BurningBridgesAiPreflightError(
          'Burning Bridges AI generation must start from a saved attempt'
        );
      }
      assertBurningBridgesAiInputs(taskOptions);
      assertBurningBridgesAiProviderBinding(task.provider, task.model);
    }
    if (product === SAY_IT_RIGHT_AI_PRODUCT_ID) {
      if (!task) {
        throw new SayItRightAiPreflightError(
          'Say It Right AI generation must start from a saved attempt'
        );
      }
      assertSayItRightAiInputs(taskOptions);
      assertSayItRightAiProviderBinding(task.provider, task.model);
    }
    if (product === FLYING_CAR_AI_PRODUCT_ID) {
      if (!task) {
        throw new FlyingCarAiPreflightError(
          'Flying Car AI generation must start from a saved attempt'
        );
      }
      assertFlyingCarAiInputs(taskOptions);
      assertFlyingCarAiProviderBinding(task.provider, task.model);
    }
    if (product === COLDPLAY_KISS_CAM_PRODUCT_ID) {
      if (!task) {
        throw new ColdplayKissCamPreflightError(
          'Coldplay Kiss Cam generation must start from a saved attempt'
        );
      }
      assertColdplayKissCamInputs(taskOptions);
      assertColdplayKissCamProviderBinding(task.provider, task.model);
    }
    if (product === GANGNAM_STYLE_AI_PRODUCT_ID) {
      if (!task) {
        throw new GangnamStyleAiPreflightError(
          'Gangnam Style AI generation must start from a saved attempt'
        );
      }
      assertGangnamStyleAiInputs(taskOptions);
      assertGangnamStyleAiProviderBinding(task.provider, task.model);
    }
    if (product === GAS_STATION_DANCE_AI_PRODUCT_ID) {
      if (!task) {
        throw new GasStationDanceAiPreflightError(
          'Gas Station Dance AI generation must start from a saved attempt'
        );
      }
      assertGasStationDanceAiInputs(taskOptions);
      assertGasStationDanceAiProviderBinding(task.provider, task.model);
    }
    if (product === ZOMBIE_HUG_PRODUCT_ID) {
      if (!task) {
        throw new ZombieHugPreflightError(
          'Zombie Hug generation must start from a saved attempt'
        );
      }
      assertZombieHugInputs(taskOptions);
      assertZombieHugProviderBinding(task.provider, task.model);
    }
    const target =
      (product === A2O_LITE_AI_PRODUCT_ID ||
        product === ENZO_FERNANDEZ_AI_PRODUCT_ID ||
        product === BURNING_BRIDGES_AI_PRODUCT_ID ||
        product === SAY_IT_RIGHT_AI_PRODUCT_ID ||
        product === FLYING_CAR_AI_PRODUCT_ID ||
        product === COLDPLAY_KISS_CAM_PRODUCT_ID ||
        product === GANGNAM_STYLE_AI_PRODUCT_ID ||
        product === GAS_STATION_DANCE_AI_PRODUCT_ID ||
        product === ZOMBIE_HUG_PRODUCT_ID) &&
      task
        ? {
            provider: task.provider as GenjutsuProvider,
            model: task.model as string,
          }
        : task
          ? {
              provider: (task.provider || 'higgsfield') as GenjutsuProvider,
              model:
                task.model || resolveGenjutsuProviderTarget(input.mode).model,
            }
          : resolveGenjutsuProviderTarget(input.mode);
    // Aspect is product-scoped (not provider-scoped) so other seedance-higgsfield
    // callers are not forced into a product's frame. Zombie Hug is the one
    // product with a client-selected aspect (16:9 | 9:16).
    const aspectRatio =
      product === SMALLTOWN_PRODUCT_ID
        ? SMALLTOWN_ASPECT_RATIO
        : product === CRAZY_FROG_PRODUCT_ID
          ? CRAZY_FROG_ASPECT_RATIO
          : product === A2O_LITE_AI_PRODUCT_ID
            ? A2O_LITE_AI_ASPECT_RATIO
            : product === ENZO_FERNANDEZ_AI_PRODUCT_ID
              ? ENZO_FERNANDEZ_AI_ASPECT_RATIO
              : product === BURNING_BRIDGES_AI_PRODUCT_ID
                ? BURNING_BRIDGES_AI_ASPECT_RATIO
                : product === SAY_IT_RIGHT_AI_PRODUCT_ID
                  ? SAY_IT_RIGHT_AI_ASPECT_RATIO
                  : product === FLYING_CAR_AI_PRODUCT_ID
                    ? FLYING_CAR_AI_ASPECT_RATIO
                    : product === COLDPLAY_KISS_CAM_PRODUCT_ID
                      ? COLDPLAY_KISS_CAM_ASPECT_RATIO
                      : product === GANGNAM_STYLE_AI_PRODUCT_ID
                        ? GANGNAM_STYLE_AI_ASPECT_RATIO
                        : product === GAS_STATION_DANCE_AI_PRODUCT_ID
                          ? GAS_STATION_DANCE_AI_ASPECT_RATIO
                          : product === ZOMBIE_HUG_PRODUCT_ID &&
                              isZombieHugAspectRatio(taskOptions?.aspectRatio)
                            ? taskOptions.aspectRatio
                            : undefined;

    if (isSeedanceFamilyProvider(target.provider) && !hasStorageInput(input)) {
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

    // Higgsfield's public list rate can be much higher than its live
    // discounted quote. Do not reject before /estimate; reservation below
    // enforces the actual server-side credit requirement.
    if (needsReservation && isSeedanceFamilyProvider(target.provider)) {
      // Seedance family has no free /estimate endpoint. Probe the
      // server-owned R2 source once, build the provider quote, and reject
      // an obviously insufficient wallet before submit.
      const estimate = await resolveGenjutsuProviderCost({
        ...providerInput,
        ...target,
        aspectRatio,
      });
      const credits = calculateGenjutsuCredits(
        estimate.customerPriceBasisUsd ?? estimate.providerCostUsd
      );
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
          durationSeconds: sourceDurationSeconds,
        });
        const credits = calculateGenjutsuCredits(
          estimate.customerPriceBasisUsd ?? estimate.providerCostUsd
        );
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
        aspectRatio,
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
        error instanceof SeedancePreflightError ||
        error instanceof SmalltownBoyDancePreflightError ||
        error instanceof CrazyFrogPreflightError ||
        error instanceof A2oLiteAiPreflightError ||
        error instanceof A2oLiteAiProviderBindingError ||
        error instanceof EnzoFernandezAiPreflightError ||
        error instanceof EnzoFernandezAiProviderBindingError ||
        error instanceof BurningBridgesAiPreflightError ||
        error instanceof BurningBridgesAiProviderBindingError ||
        error instanceof SayItRightAiPreflightError ||
        error instanceof SayItRightAiProviderBindingError ||
        error instanceof FlyingCarAiPreflightError ||
        error instanceof FlyingCarAiProviderBindingError ||
        error instanceof ColdplayKissCamPreflightError ||
        error instanceof ColdplayKissCamProviderBindingError ||
        error instanceof GangnamStyleAiPreflightError ||
        error instanceof GangnamStyleAiProviderBindingError ||
        error instanceof GasStationDanceAiPreflightError ||
        error instanceof GasStationDanceAiProviderBindingError ||
        error instanceof ZombieHugPreflightError ||
        error instanceof ZombieHugProviderBindingError
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
        error instanceof SeedanceHttpError ||
        error instanceof VolcengineSeedanceHttpError ||
        error instanceof SeeapiSeedanceHttpError ||
        error instanceof WavespeedSeedanceHttpError
      ) {
        const failure = splitProviderFailureError(
          error.message,
          error instanceof VolcengineSeedanceHttpError ||
            error instanceof SeeapiSeedanceHttpError ||
            error instanceof WavespeedSeedanceHttpError
            ? error.code
            : undefined
        );
        logGenjutsuProviderFailure({
          stage: 'generate_submit',
          generationId,
          providerStatus: `http_${error.status}`,
          errorCode: failure.errorCode,
          providerCode: failure.providerCode,
          providerError: failure.providerError,
        });

        // 5xx/408/429: provider may have accepted the job. Keep credits held.
        if (isUncertainProviderHttpStatus(error.status)) {
          await markGenjutsuSubmissionUnknown({
            generationId,
            userId: session.user.id,
            error: failure.error,
          });
          return respJson(
            -1,
            'Generation submission result is uncertain. Credits remain reserved; do not retry this generation.',
            {
              code: 'SUBMISSION_UNKNOWN',
              generationId,
              ...providerFailureDebugFields({
                providerError: failure.providerError,
                providerCode: failure.providerCode,
              }),
            },
            { status: 502 }
          );
        }

        await refundGenjutsuGeneration({
          generationId,
          userId: session.user.id,
          providerStatus: `http_${error.status}`,
          error: failure.error,
          providerError: failure.providerError,
          providerCode: failure.providerCode,
          errorCode: failure.errorCode,
        });
        return respJson(
          -1,
          failure.error,
          {
            code: failure.errorCode,
            generationId,
            refundedCredits: task.costCredits || 0,
            ...providerFailureDebugFields({
              providerError: failure.providerError,
              providerCode: failure.providerCode,
            }),
          },
          { status: 400 }
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
