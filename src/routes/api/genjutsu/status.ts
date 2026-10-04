import { createFileRoute } from '@tanstack/react-router';

import { getAuth } from '@/core/auth';
import {
  assertGenerationId,
  getGenjutsuTaskById,
  getGenjutsuTaskByRequestId,
  parseGenjutsuTaskInfo,
  recordGenjutsuProviderStatusError,
  refundGenjutsuGeneration,
  settleGenjutsuGeneration,
} from '@/modules/genjutsu/billing';
import {
  copyGenjutsuE2EStorageObject,
  isGenjutsuE2EMockEnabled,
  readGenjutsuE2EVideoKey,
} from '@/modules/genjutsu/e2e-mock';
import { splitProviderFailureError } from '@/modules/genjutsu/provider-errors';
import {
  getGenjutsuStatus,
  HiggsfieldHttpError,
  SeedanceHttpError,
  VolcengineSeedanceHttpError,
} from '@/modules/genjutsu/service';
import {
  getGenjutsuResultKey,
  persistGenjutsuResultToR2,
} from '@/modules/genjutsu/storage';
import { enforceMinIntervalRateLimit } from '@/lib/rate-limit';
import { respData, respErr, respJson } from '@/lib/resp';

function stableResultUrl(generationId: string) {
  return `/api/genjutsu/result/${encodeURIComponent(generationId)}`;
}

function userFacingRefundError(
  result: {
    error?: unknown;
    providerError?: unknown;
    errorCode?: unknown;
  } | null
) {
  const storedError =
    typeof result?.error === 'string' ? result.error : 'Generation failed';
  // New records store user copy in `error` and raw dump in `providerError`.
  // Legacy refunds only have the raw provider string in `error`.
  if (typeof result?.providerError === 'string' && result.providerError) {
    return {
      error: storedError,
      errorCode:
        typeof result.errorCode === 'string' ? result.errorCode : undefined,
    };
  }
  const failure = splitProviderFailureError(storedError);
  return {
    error: failure.error,
    errorCode: failure.errorCode,
  };
}

async function GET({ request }: { request: Request }) {
  const limited = enforceMinIntervalRateLimit(request, {
    intervalMs: 1_000,
    keyPrefix: 'genjutsu-status',
  });
  if (limited) return limited;

  try {
    const auth = getAuth();
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) {
      return respErr('Unauthorized', { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const generationIdRaw = searchParams.get('generationId');
    const requestId = searchParams.get('requestId') || '';

    const task = generationIdRaw
      ? await getGenjutsuTaskById({
          generationId: assertGenerationId(generationIdRaw),
          userId: session.user.id,
        })
      : await getGenjutsuTaskByRequestId({
          requestId,
          userId: session.user.id,
        });

    if (!task) {
      return respJson(
        -1,
        'Generation not found',
        { code: 'GENERATION_NOT_FOUND' },
        { status: 404 }
      );
    }

    const parsed = parseGenjutsuTaskInfo(task);

    if (task.status === 'completed') {
      return respData({
        status: 'completed',
        providerStatus: parsed.result?.providerStatus || 'completed',
        videoUrl: stableResultUrl(task.id),
        reservedCredits: task.costCredits || 0,
      });
    }

    if (task.status === 'refunded') {
      const failure = userFacingRefundError(parsed.result);
      return respData({
        status: 'failed',
        providerStatus: parsed.result?.providerStatus || 'failed',
        videoUrl: null,
        error: failure.error,
        errorCode: failure.errorCode,
        refundedCredits:
          parsed.result?.refundedCredits ?? task.costCredits ?? 0,
      });
    }

    if (task.status === 'failed_preflight') {
      return respData({
        status: 'failed',
        providerStatus: 'failed_preflight',
        videoUrl: null,
        error: parsed.result?.error || 'Generation failed before submission',
        errorCode: parsed.result?.errorCode || undefined,
        stage: parsed.result?.stage || undefined,
        reservedCredits: 0,
      });
    }

    if (task.status === 'insufficient_credits') {
      const requiredCredits = Number(parsed.result?.requiredCredits);
      const balance = Number(parsed.result?.balance);
      const hasRequired = Number.isFinite(requiredCredits);
      const hasBalance = Number.isFinite(balance);

      return respData({
        status: 'failed',
        providerStatus: 'insufficient_credits',
        videoUrl: null,
        error:
          hasRequired && hasBalance
            ? `Insufficient credits: need ${requiredCredits}, balance ${balance}`
            : hasRequired
              ? `Insufficient credits: need ${requiredCredits}`
              : 'Insufficient credits',
        requiredCredits: hasRequired ? requiredCredits : undefined,
        balance: hasBalance ? balance : undefined,
        reservedCredits: 0,
      });
    }

    if (
      task.status === 'initiated' ||
      task.status === 'sealing' ||
      task.status === 'ready'
    ) {
      return respData({
        status: 'processing',
        providerStatus: task.status,
        videoUrl: null,
        reservedCredits: 0,
      });
    }

    if (task.status === 'submission_unknown') {
      return respData({
        status: 'processing',
        providerStatus: 'submission_unknown',
        videoUrl: null,
        error:
          'The provider submission result is uncertain. Credits are still reserved to avoid double-spending; do not submit the same generation again.',
        reservedCredits: task.costCredits || 0,
      });
    }

    if (!task.taskId) {
      return respData({
        status: 'processing',
        providerStatus: task.status,
        videoUrl: null,
        reservedCredits: task.costCredits || 0,
      });
    }

    if (isGenjutsuE2EMockEnabled()) {
      const sourceVideoKey = readGenjutsuE2EVideoKey(task.options);
      if (!sourceVideoKey) {
        return respErr('E2E generation is missing its source video key', {
          status: 500,
        });
      }

      const videoKey = getGenjutsuResultKey({
        generationId: task.id,
        userId: session.user.id,
      });
      copyGenjutsuE2EStorageObject(sourceVideoKey, videoKey);

      const settled = await settleGenjutsuGeneration({
        generationId: task.id,
        userId: session.user.id,
        providerStatus: 'completed',
        videoKey,
      });

      if (settled?.status !== 'completed') {
        return respData({
          status: settled?.status === 'refunded' ? 'failed' : 'processing',
          providerStatus: settled?.status || 'processing',
          videoUrl: null,
          reservedCredits: task.costCredits || 0,
        });
      }

      return respData({
        status: 'completed',
        providerStatus: 'completed',
        videoUrl: stableResultUrl(task.id),
        reservedCredits: task.costCredits || 0,
      });
    }

    let provider;
    try {
      provider = await getGenjutsuStatus({
        provider: task.provider || 'higgsfield',
        model: task.model,
        requestId: task.taskId,
      });
    } catch (error: any) {
      const providerStatus =
        error instanceof HiggsfieldHttpError ||
        error instanceof SeedanceHttpError ||
        error instanceof VolcengineSeedanceHttpError
          ? `http_${error.status}`
          : 'status_error';
      const failure = splitProviderFailureError(
        error?.message || 'Provider status request failed'
      );
      await recordGenjutsuProviderStatusError({
        generationId: task.id,
        userId: session.user.id,
        providerStatus,
        error: failure.error,
        providerError: failure.providerError,
      }).catch(() => undefined);
      throw error;
    }

    if (provider.status === 'completed' && provider.videoUrl) {
      const durable = await persistGenjutsuResultToR2({
        generationId: task.id,
        userId: session.user.id,
        sourceUrl: provider.videoUrl,
      });

      const settled = await settleGenjutsuGeneration({
        generationId: task.id,
        userId: session.user.id,
        providerStatus: provider.providerStatus,
        videoKey: durable.videoKey,
        providerUsage:
          'providerUsage' in provider ? provider.providerUsage : undefined,
      });

      if (settled?.status === 'completed') {
        return respData({
          ...provider,
          videoUrl: stableResultUrl(task.id),
          reservedCredits: task.costCredits || 0,
        });
      }

      const settledParsed = settled ? parseGenjutsuTaskInfo(settled) : null;
      const refundFailure =
        settled?.status === 'refunded'
          ? userFacingRefundError(settledParsed?.result)
          : null;
      return respData({
        status: settled?.status === 'refunded' ? 'failed' : 'processing',
        providerStatus:
          settledParsed?.result?.providerStatus ||
          settled?.status ||
          'processing',
        videoUrl: null,
        error: refundFailure?.error ?? settledParsed?.result?.error,
        errorCode: refundFailure?.errorCode,
        reservedCredits: task.costCredits || 0,
        refundedCredits:
          settled?.status === 'refunded'
            ? (settledParsed?.result?.refundedCredits ??
              settled.costCredits ??
              0)
            : undefined,
      });
    }

    if (provider.status === 'failed') {
      const failure = splitProviderFailureError(
        provider.error || 'Generation failed'
      );
      const refunded = await refundGenjutsuGeneration({
        generationId: task.id,
        userId: session.user.id,
        providerStatus: provider.providerStatus,
        error: failure.error,
        providerError: failure.providerError,
        errorCode: failure.errorCode,
      });

      if (refunded?.status === 'completed') {
        const completed = parseGenjutsuTaskInfo(refunded);
        return respData({
          status: 'completed',
          providerStatus: completed.result?.providerStatus || 'completed',
          videoUrl: stableResultUrl(refunded.id),
          reservedCredits: refunded.costCredits || 0,
        });
      }

      return respData({
        status: 'failed',
        providerStatus: provider.providerStatus,
        videoUrl: null,
        error: failure.error,
        errorCode: failure.errorCode,
        refundedCredits: refunded?.costCredits ?? task.costCredits ?? 0,
      });
    }

    return respData({
      ...provider,
      reservedCredits: task.costCredits || 0,
    });
  } catch (error: any) {
    console.error('genjutsu status failed:', error);
    return respErr(error?.message || 'Failed to get generation status', {
      status: 400,
    });
  }
}

export const Route = createFileRoute('/api/genjutsu/status')({
  server: {
    handlers: { GET },
  },
});
