import { createFileRoute } from '@tanstack/react-router';

import { getAuth } from '@/core/auth';
import { getGenjutsuStatus } from '@/modules/genjutsu/service';
import {
  isGenjutsuE2EMockEnabled,
  readGenjutsuE2EVideoUrl,
} from '@/modules/genjutsu/e2e-mock';
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
        videoUrl: parsed.result?.videoUrl || null,
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
      const videoUrl = readGenjutsuE2EVideoUrl(task.options);
      if (!videoUrl) {
        return respErr('E2E generation is missing its source video', {
          status: 500,
        });
      }

      await settleGenjutsuGeneration({
        generationId: task.id,
        userId: session.user.id,
        providerStatus: 'completed',
        videoUrl,
      });

      return respData({
        status: 'completed',
        providerStatus: 'completed',
        videoUrl,
        reservedCredits: task.costCredits || 0,
      });
    }

    const provider = await getGenjutsuStatus(task.taskId);

    if (provider.status === 'completed' && provider.videoUrl) {
      await settleGenjutsuGeneration({
        generationId: task.id,
        userId: session.user.id,
        providerStatus: provider.providerStatus,
        videoUrl: provider.videoUrl,
      });

      return respData({
        ...provider,
        reservedCredits: task.costCredits || 0,
      });
    }

    if (provider.status === 'failed') {
      await refundGenjutsuGeneration({
        generationId: task.id,
        userId: session.user.id,
        providerStatus: provider.providerStatus,
        error: provider.error || 'Generation failed',
      });

      return respData({
        ...provider,
        refundedCredits: task.costCredits || 0,
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
