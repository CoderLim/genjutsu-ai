import { createFileRoute } from '@tanstack/react-router';

import { getAuth } from '@/core/auth';
import {
  assertChuttamalleGenerationId,
  getChuttamalleTaskById,
  parseChuttamalleTask,
  refundChuttamalleGeneration,
  settleChuttamalleGeneration,
} from '@/modules/chuttamalle/billing';
import { getChuttamalleProviderStatus } from '@/modules/chuttamalle/service';
import { persistChuttamalleResultToR2 } from '@/modules/chuttamalle/storage';
import { enforceMinIntervalRateLimit } from '@/lib/rate-limit';
import { respData, respErr, respJson } from '@/lib/resp';

function stableResultUrl(generationId: string) {
  return `/api/chuttamalle/result/${encodeURIComponent(generationId)}`;
}

async function GET({ request }: { request: Request }) {
  const limited = enforceMinIntervalRateLimit(request, {
    intervalMs: 1_000,
    keyPrefix: 'chuttamalle-status',
  });
  if (limited) return limited;

  try {
    const auth = getAuth();
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) return respErr('Unauthorized', { status: 401 });

    const generationId = assertChuttamalleGenerationId(
      new URL(request.url).searchParams.get('generationId')
    );
    const task = await getChuttamalleTaskById({
      generationId,
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

    const parsed = parseChuttamalleTask(task);

    if (task.status === 'completed') {
      return respData({
        status: 'completed',
        providerStatus: parsed.result?.providerStatus || 'completed',
        videoUrl: stableResultUrl(generationId),
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
        status: 'failed',
        providerStatus: 'submission_unknown',
        videoUrl: null,
        error:
          parsed.result?.error ||
          'Submission result is uncertain. Please contact support before retrying.',
      });
    }

    if (
      task.status === 'reserved' ||
      task.status === 'submitting' ||
      task.status === 'completing' ||
      task.status === 'refunding'
    ) {
      return respData({
        status: 'processing',
        providerStatus: task.status,
        videoUrl: null,
        reservedCredits: task.costCredits || 0,
      });
    }

    if (task.status !== 'submitted' || !task.taskId) {
      return respData({
        status: 'processing',
        providerStatus: task.status,
        videoUrl: null,
      });
    }

    const provider = await getChuttamalleProviderStatus(task.taskId);

    if (provider.status === 'failed') {
      const refunded = await refundChuttamalleGeneration({
        generationId,
        userId: session.user.id,
        providerStatus: provider.providerStatus,
        error: provider.error || 'MiniMax H3 generation failed',
      });
      const refundedParsed = refunded
        ? parseChuttamalleTask(refunded)
        : { result: null };

      return respData({
        status: 'failed',
        providerStatus: provider.providerStatus,
        videoUrl: null,
        error:
          refundedParsed.result?.error ||
          provider.error ||
          'MiniMax H3 generation failed',
        refundedCredits: task.costCredits || 0,
      });
    }

    if (provider.status === 'completed' && provider.videoUrl) {
      try {
        const persisted = await persistChuttamalleResultToR2({
          userId: session.user.id,
          generationId,
          sourceUrl: provider.videoUrl,
        });

        await settleChuttamalleGeneration({
          generationId,
          userId: session.user.id,
          providerStatus: provider.providerStatus,
          videoKey: persisted.videoKey,
        });

        const current = await getChuttamalleTaskById({
          generationId,
          userId: session.user.id,
        });

        if (current?.status === 'completed') {
          return respData({
            status: 'completed',
            providerStatus: provider.providerStatus,
            videoUrl: stableResultUrl(generationId),
            reservedCredits: task.costCredits || 0,
          });
        }
      } catch (error) {
        console.error('chuttamalle result persistence failed:', error);
        return respData({
          status: 'processing',
          providerStatus: 'persisting',
          videoUrl: null,
          reservedCredits: task.costCredits || 0,
        });
      }
    }

    return respData({
      status: 'processing',
      providerStatus: provider.providerStatus,
      videoUrl: null,
      reservedCredits: task.costCredits || 0,
    });
  } catch (error: any) {
    console.error('chuttamalle status failed:', error);
    return respErr(error?.message || 'Failed to query generation status', {
      status: 400,
    });
  }
}

export const Route = createFileRoute('/api/chuttamalle/status')({
  server: {
    handlers: { GET },
  },
});
