import { createFileRoute } from '@tanstack/react-router';

import { getAuth } from '@/core/auth';
import { getGenjutsuStatus } from '@/modules/genjutsu/service';
import {
  copyGenjutsuE2EStorageObject,
  isGenjutsuE2EMockEnabled,
  readGenjutsuE2EVideoKey,
} from '@/modules/genjutsu/e2e-mock';
import {
  getGenjutsuResultKey,
  persistGenjutsuResultToR2,
} from '@/modules/genjutsu/storage';
import {
  assertGenerationId,
  getGenjutsuTaskById,
  getGenjutsuTaskByRequestId,
  parseGenjutsuTaskInfo,
  refundGenjutsuGeneration,
  settleGenjutsuGeneration,
} from '@/modules/genjutsu/billing';
import { enforceMinIntervalRateLimit } from '@/lib/rate-limit';
import { respData, respErr, respJson } from '@/lib/resp';

function stableResultUrl(generationId: string) {
  return `/api/genjutsu/result/${encodeURIComponent(generationId)}`;
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
      return respData({
        status: 'failed',
        providerStatus: parsed.result?.providerStatus || 'failed',
        videoUrl: null,
        error: parsed.result?.error || 'Generation failed',
        refundedCredits:
          parsed.result?.refundedCredits ?? task.costCredits ?? 0,
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

    const provider = await getGenjutsuStatus({
      provider: task.provider || 'higgsfield',
      model: task.model,
      requestId: task.taskId,
    });

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
        providerUsage: provider.providerUsage,
      });

      if (settled?.status === 'completed') {
        return respData({
          ...provider,
          videoUrl: stableResultUrl(task.id),
          reservedCredits: task.costCredits || 0,
        });
      }

      const settledParsed = settled ? parseGenjutsuTaskInfo(settled) : null;
      return respData({
        status: settled?.status === 'refunded' ? 'failed' : 'processing',
        providerStatus:
          settledParsed?.result?.providerStatus || settled?.status || 'processing',
        videoUrl: null,
        error: settledParsed?.result?.error,
        reservedCredits: task.costCredits || 0,
        refundedCredits:
          settled?.status === 'refunded'
            ? settledParsed?.result?.refundedCredits ?? settled.costCredits ?? 0
            : undefined,
      });
    }

    if (provider.status === 'failed') {
      const refunded = await refundGenjutsuGeneration({
        generationId: task.id,
        userId: session.user.id,
        providerStatus: provider.providerStatus,
        error: provider.error || 'Generation failed',
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
        ...provider,
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
