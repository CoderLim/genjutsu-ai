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
  refundGenjutsuGeneration,
  reserveGenjutsuCredits,
} from '@/modules/genjutsu/billing';
import {
  isGenjutsuE2EMockEnabled,
  resolveGenjutsuE2EInputUrls,
  sealGenjutsuE2EStorageObject,
} from '@/modules/genjutsu/e2e-mock';
import { calculateGenjutsuCredits } from '@/modules/genjutsu/pricing';
import {
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

    if (task.status !== 'initiated' && task.status !== 'ready') {
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

    if (task.status === 'initiated') {
      const claimed = await claimGenjutsuSeal({
        generationId,
        userId: session.user.id,
      });
      if (!claimed) {
        task = await getGenjutsuTaskById({
          generationId,
          userId: session.user.id,
        });
        if (!task) throw new Error('Generation attempt disappeared');
        if (task.status !== 'ready' && task.status !== 'reserved') {
          return respJson(
            -1,
            'Generation inputs are already being sealed',
            { code: 'GENERATION_SEAL_IN_PROGRESS' },
            { status: 409 }
          );
        }
      } else {
        const sealed = await sealZombieHugInputs({
          userId: session.user.id,
          generationId,
          imageKeys,
          contentTypes,
          contentLengths,
        });
        task = await markGenjutsuAttemptReady({
          generationId,
          userId: session.user.id,
          ...sealed,
        });
        if (!task || task.status !== 'ready') {
          throw new Error('Failed to finalize sealed generation inputs');
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
      const estimate = await resolveGenjutsuProviderCost({
        ...providerInput,
        ...target,
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
        sourceDurationSeconds: estimate.sourceDurationSeconds,
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
          { status: error.status >= 400 && error.status < 500 ? 400 : 502 }
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
