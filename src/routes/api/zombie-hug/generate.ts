import { createFileRoute } from '@tanstack/react-router';

import { getAuth } from '@/core/auth';
import {
  assertGenerationId,
  claimGenjutsuSeal,
  claimGenjutsuSubmission,
  getGenjutsuTaskById,
  InsufficientCreditsError,
  markGenjutsuAttemptFailedPreflight,
  markGenjutsuAttemptReady,
  markGenjutsuSubmissionUnknown,
  markGenjutsuSubmitted,
  parseGenjutsuTaskInfo,
  reclaimStaleGenjutsuSeal,
  refundGenjutsuGeneration,
  reserveGenjutsuCredits,
} from '@/modules/genjutsu/billing';
import {
  ensureGenjutsuE2ETemplateObject,
  getGenjutsuE2EUrlForStorageKey,
  isGenjutsuE2EMockEnabled,
  resolveGenjutsuE2EInputUrls,
  sealGenjutsuE2EStorageObject,
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
  submitGenjutsu,
} from '@/modules/genjutsu/service';
import {
  ensureZombieHugTemplateInR2,
  findExistingSealedGenjutsuTemplateInputs,
  getGenjutsuSealedInputKey,
  getZombieHugTemplateVideoKey,
  resolveGenjutsuInputUrls,
  sealGenjutsuTemplateR2Inputs,
} from '@/modules/genjutsu/storage';
import {
  ZOMBIE_HUG_MODE,
  ZOMBIE_HUG_PRESET,
  ZOMBIE_HUG_PROMPT,
  ZOMBIE_HUG_RESOLUTION,
  ZOMBIE_HUG_TEMPLATE_DURATION_SECONDS,
} from '@/modules/zombie-hug/prompt';
import { enforceMinIntervalRateLimit } from '@/lib/rate-limit';
import { respData, respErr, respJson } from '@/lib/resp';

function parseOptions(value: string | null | undefined) {
  if (!value) return null;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
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

async function sealZombieHugInputs(params: {
  userId: string;
  generationId: string;
  imageKeys: string[];
  contentTypes: string[];
  contentLengths: number[];
}) {
  if (isGenjutsuE2EMockEnabled()) {
    const sealedImageKeys = params.imageKeys.map((sourceKey) =>
      getGenjutsuSealedInputKey({
        userId: params.userId,
        generationId: params.generationId,
        stagingKey: sourceKey,
      })
    );
    const sealedVideoKey = sealedImageKeys[0]
      .replace(/reference-\d+\./, 'source.')
      .replace(/\.(jpg|png|webp|gif|avif|heic|heif)$/i, '.mp4');
    sealGenjutsuE2EStorageObject(
      getZombieHugTemplateVideoKey(),
      sealedVideoKey
    );
    params.imageKeys.forEach((sourceKey, index) =>
      sealGenjutsuE2EStorageObject(sourceKey, sealedImageKeys[index])
    );
    return {
      videoKey: sealedVideoKey,
      imageKeys: sealedImageKeys,
    };
  }

  return sealGenjutsuTemplateR2Inputs({
    userId: params.userId,
    generationId: params.generationId,
    templateVideoKey: getZombieHugTemplateVideoKey(),
    imageKeys: params.imageKeys,
    expectedContentTypes: params.contentTypes,
    expectedContentLengths: params.contentLengths,
  });
}

async function findExistingSealedZombieHugInputs(params: {
  userId: string;
  generationId: string;
  imageKeys: string[];
}) {
  if (isGenjutsuE2EMockEnabled()) {
    const sealedImageKeys = params.imageKeys.map((stagingKey) =>
      getGenjutsuSealedInputKey({
        userId: params.userId,
        generationId: params.generationId,
        stagingKey,
      })
    );
    const sealedVideoKey = sealedImageKeys[0]
      .replace(/reference-\d+\./, 'source.')
      .replace(/\.(jpg|png|webp|gif|avif|heic|heif)$/i, '.mp4');
    if (
      !getGenjutsuE2EUrlForStorageKey(sealedVideoKey) ||
      sealedImageKeys.some((key) => !getGenjutsuE2EUrlForStorageKey(key))
    ) {
      return null;
    }
    return { videoKey: sealedVideoKey, imageKeys: sealedImageKeys };
  }

  return findExistingSealedGenjutsuTemplateInputs(params);
}

async function POST({ request }: { request: Request }) {
  const limited = enforceMinIntervalRateLimit(request, {
    intervalMs: 1_500,
    keyPrefix: 'zombie-hug-generate',
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
    if (!task) {
      return respJson(
        -1,
        'Generation attempt not found',
        { code: 'GENERATION_NOT_FOUND' },
        { status: 404 }
      );
    }

    if (
      task.status !== 'initiated' &&
      task.status !== 'sealing' &&
      task.status !== 'ready'
    ) {
      if (task.status === 'reserved' || task.status === 'submitting') {
        // Fall through to claim/submit if somehow mid-flight.
      } else {
        return respData(taskResponse(task));
      }
    }

    const options = parseOptions(task.options);
    if (
      options?.preset !== ZOMBIE_HUG_PRESET ||
      options?.useDefaultTemplate !== true ||
      options?.mode !== ZOMBIE_HUG_MODE
    ) {
      return respErr('This generation is not a zombie hug preset', {
        status: 400,
      });
    }

    // During initiated/sealing these are staging keys under genjutsu/inputs/.
    const imageKeys = Array.isArray(options?.imageKeys)
      ? options.imageKeys.filter(
          (value: unknown): value is string => typeof value === 'string'
        )
      : [];
    const contentTypes = Array.isArray(options?.contentTypes)
      ? options.contentTypes.filter(
          (value: unknown): value is string => typeof value === 'string'
        )
      : [];
    const contentLengths = Array.isArray(options?.contentLengths)
      ? options.contentLengths.map((value: unknown) => Number(value))
      : [];

    if (imageKeys.length !== 2) {
      return respErr('Zombie hug requires exactly two reference images', {
        status: 400,
      });
    }

    if (task.status === 'initiated' || task.status === 'sealing') {
      try {
        if (isGenjutsuE2EMockEnabled()) {
          ensureGenjutsuE2ETemplateObject(getZombieHugTemplateVideoKey());
        } else {
          await ensureZombieHugTemplateInR2();
        }
      } catch (error: any) {
        await markGenjutsuAttemptFailedPreflight({
          generationId,
          userId: session.user.id,
          stage: 'template_missing',
          errorCode: 'TEMPLATE_NOT_CONFIGURED',
          error:
            error?.message || 'Zombie hug template is not configured in R2',
        }).catch(() => undefined);
        return respJson(
          -1,
          error?.message ||
            'Zombie hug template is not configured in R2. Upload public/videos/zombie-hug-tpl.mp4 to genjutsu/templates/zombie-hug.mp4.',
          { code: 'TEMPLATE_NOT_CONFIGURED' },
          { status: 503 }
        );
      }

      let ownSeal = false;
      if (task.status === 'initiated') {
        ownSeal = await claimGenjutsuSeal({
          generationId,
          userId: session.user.id,
        });
      }

      if (!ownSeal) {
        const reclaim = await reclaimStaleGenjutsuSeal({
          generationId,
          userId: session.user.id,
        });
        if (reclaim === 'reclaimed') {
          ownSeal = true;
        } else {
          task = await getGenjutsuTaskById({
            generationId,
            userId: session.user.id,
          });
          if (!task) throw new Error('Generation attempt disappeared');
          if (task.status === 'ready' || task.status === 'reserved') {
            // Another worker finished seal — continue to reserve/submit.
          } else if (reclaim === 'not_stale' || task.status === 'sealing') {
            return respJson(
              -1,
              'Generation inputs are already being sealed',
              { code: 'GENERATION_SEAL_IN_PROGRESS' },
              { status: 409 }
            );
          } else {
            return respData(taskResponse(task));
          }
        }
      }

      if (ownSeal) {
        try {
          const existing = await findExistingSealedZombieHugInputs({
            userId: session.user.id,
            generationId,
            imageKeys,
          });
          const sealed =
            existing ??
            (await sealZombieHugInputs({
              userId: session.user.id,
              generationId,
              imageKeys,
              contentTypes,
              contentLengths,
            }));
          task = await markGenjutsuAttemptReady({
            generationId,
            userId: session.user.id,
            ...sealed,
          });
          if (!task || task.status !== 'ready') {
            throw new Error('Failed to finalize sealed generation inputs');
          }
        } catch (error: any) {
          // We own the sealing lease — always exit that state so retries are
          // not stuck forever after a failed reclaim/reseal.
          await markGenjutsuAttemptFailedPreflight({
            generationId,
            userId: session.user.id,
            stage: 'seal_inputs',
            errorCode: 'INPUT_SEAL_FAILED',
            error: error?.message || 'Failed to seal generation inputs',
          }).catch(() => undefined);
          throw error;
        }
      }
    }

    task = await getGenjutsuTaskById({
      generationId,
      userId: session.user.id,
    });
    if (!task) throw new Error('Generation attempt disappeared');

    const sealedOptions = parseOptions(task.options);
    const sealedVideoKey =
      typeof sealedOptions?.videoKey === 'string'
        ? sealedOptions.videoKey
        : null;
    const sealedImageKeys = Array.isArray(sealedOptions?.imageKeys)
      ? sealedOptions.imageKeys.filter(
          (value: unknown): value is string => typeof value === 'string'
        )
      : [];

    if (!sealedVideoKey || sealedImageKeys.length !== 2) {
      throw new Error('Sealed zombie hug inputs are incomplete');
    }

    const mediaUrls = isGenjutsuE2EMockEnabled()
      ? resolveGenjutsuE2EInputUrls({
          videoKey: sealedVideoKey,
          imageKeys: sealedImageKeys,
        })
      : await resolveGenjutsuInputUrls({
          userId: session.user.id,
          generationId,
          videoKey: sealedVideoKey,
          imageKeys: sealedImageKeys,
        });

    const providerInput = {
      mode: ZOMBIE_HUG_MODE,
      resolution: ZOMBIE_HUG_RESOLUTION,
      prompt: ZOMBIE_HUG_PROMPT,
      ...mediaUrls,
    };

    const target = {
      provider: (task.provider || 'higgsfield') as 'higgsfield',
      model: task.model || 'higgsfield/genjutsu/motion-transfer/v1.0',
    };

    if (task.status === 'ready') {
      // Pass fixed template duration so list-rate fallback matches the UI
      // estimate when Higgsfield /estimate (and probe) are unavailable.
      const estimate = await resolveGenjutsuProviderCost({
        ...providerInput,
        ...target,
        durationSeconds: ZOMBIE_HUG_TEMPLATE_DURATION_SECONDS,
      });
      const credits = calculateGenjutsuCredits(
        estimate.customerPriceBasisUsd ?? estimate.providerCostUsd
      );

      task = await reserveGenjutsuCredits({
        generationId,
        userId: session.user.id,
        userEmail: session.user.email,
        mode: ZOMBIE_HUG_MODE,
        resolution: ZOMBIE_HUG_RESOLUTION,
        prompt: ZOMBIE_HUG_PROMPT,
        videoKey: sealedVideoKey,
        imageKeys: sealedImageKeys,
        ...target,
        providerCostUsd: estimate.providerCostUsd,
        credits,
        providerEstimate: estimate.payload,
        sourceDurationSeconds:
          estimate.sourceDurationSeconds ??
          ZOMBIE_HUG_TEMPLATE_DURATION_SECONDS,
      });

      if (task.status !== 'reserved') {
        return respData(taskResponse(task));
      }
    }

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

    const { info } = parseGenjutsuTaskInfo(task);
    const sourceDurationSeconds =
      typeof info?.sourceDurationSeconds === 'number' &&
      Number.isFinite(info.sourceDurationSeconds) &&
      info.sourceDurationSeconds > 0
        ? info.sourceDurationSeconds
        : undefined;

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
      if (error instanceof HiggsfieldPreflightError) {
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

      if (error instanceof HiggsfieldHttpError) {
        const failure = splitProviderFailureError(error.message);
        logGenjutsuProviderFailure({
          stage: 'generate_submit',
          generationId,
          providerStatus: `http_${error.status}`,
          errorCode: failure.errorCode,
          providerCode: failure.providerCode,
          providerError: failure.providerError,
        });

        // 5xx/408/429: provider may have accepted the job. Keep credits.
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

    console.error('zombie-hug generate failed:', error);
    return respErr(error?.message || 'Failed to start generation', {
      status: 400,
    });
  }
}

export const Route = createFileRoute('/api/zombie-hug/generate')({
  server: {
    handlers: { POST },
  },
});
