import { createFileRoute } from '@tanstack/react-router';

import { getAuth } from '@/core/auth';
import {
  applyHotelLobbyProviderQueryError,
  assertHotelLobbyGenerationId,
  claimHotelLobbyCompletion,
  clearHotelLobbyProviderQueryErrors,
  finalizeHotelLobbyGeneration,
  getHotelLobbyTaskById,
  parseHotelLobbyTask,
  refundHotelLobbyGeneration,
} from '@/modules/hotel-lobby/billing';
import { getHotelLobbyProviderStatus } from '@/modules/hotel-lobby/service';
import { persistHotelLobbyResultToR2 } from '@/modules/hotel-lobby/storage';
import { enforceMinIntervalRateLimit } from '@/lib/rate-limit';
import { respData, respErr, respJson } from '@/lib/resp';

function stableResultUrl(generationId: string) {
  return `/api/hotel-lobby/result/${encodeURIComponent(generationId)}`;
}

async function GET({ request }: { request: Request }) {
  const limited = enforceMinIntervalRateLimit(request, {
    intervalMs: 1_000,
    keyPrefix: 'hotel-lobby-status',
  });
  if (limited) return limited;

  try {
    const auth = getAuth();
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) return respErr('Unauthorized', { status: 401 });

    const generationId = assertHotelLobbyGenerationId(
      new URL(request.url).searchParams.get('generationId')
    );
    const task = await getHotelLobbyTaskById({
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

    const parsed = parseHotelLobbyTask(task);

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
      task.status === 'refunding'
    ) {
      return respData({
        status: 'processing',
        providerStatus: task.status,
        videoUrl: null,
        reservedCredits: task.costCredits || 0,
      });
    }

    // `completing` may resume R2 persistence after a prior claim; do not
    // early-return before the provider completed branch below.
    if (
      (task.status !== 'submitted' && task.status !== 'completing') ||
      !task.taskId
    ) {
      return respData({
        status: 'processing',
        providerStatus: task.status,
        videoUrl: null,
      });
    }

    const provider = await getHotelLobbyProviderStatus(
      task.taskId,
      typeof task.model === 'string' && task.model ? task.model : undefined
    );

    // Query-error parking only applies while still `submitted`.
    if (task.status === 'submitted' && provider.status === 'unresolved') {
      const outcome = await applyHotelLobbyProviderQueryError({
        generationId,
        userId: session.user.id,
        providerStatus: provider.providerStatus,
        error:
          provider.error ||
          'Provider status lookup failed permanently. Credits remain reserved.',
      });

      if (!outcome.unresolved) {
        console.warn('hotel-lobby provider query error (retrying):', {
          generationId,
          errorCount: outcome.count,
          providerStatus: provider.providerStatus,
          error: provider.error,
        });
        return respData({
          status: 'processing',
          providerStatus: provider.providerStatus,
          videoUrl: null,
          reservedCredits: task.costCredits || 0,
        });
      }

      console.error(
        '[ops] hotel-lobby provider query unresolved credits_held',
        {
          generationId,
          userId: session.user.id,
          errorCount: outcome.count,
          providerStatus: provider.providerStatus,
          error: provider.error,
          reservedCredits: task.costCredits || 0,
        }
      );
      return respData({
        status: 'failed',
        providerStatus: 'submission_unknown',
        videoUrl: null,
        error:
          'Provider status lookup failed permanently. Credits remain reserved; contact support before retrying.',
      });
    }

    if (task.status === 'submitted' && provider.status === 'processing') {
      await clearHotelLobbyProviderQueryErrors({
        generationId,
        userId: session.user.id,
      });
    }

    if (task.status === 'submitted' && provider.status === 'failed') {
      const refunded = await refundHotelLobbyGeneration({
        generationId,
        userId: session.user.id,
        providerStatus: provider.providerStatus,
        error: provider.error || 'Video generation failed',
      });
      const refundedParsed = refunded
        ? parseHotelLobbyTask(refunded)
        : { result: null };

      return respData({
        status: 'failed',
        providerStatus: provider.providerStatus,
        videoUrl: null,
        error:
          refundedParsed.result?.error ||
          provider.error ||
          'Video generation failed',
        refundedCredits: task.costCredits || 0,
      });
    }

    if (provider.status === 'completed' && provider.videoUrl) {
      try {
        // Claim before R2 so concurrent polls cannot park as submission_unknown.
        if (task.status === 'submitted') {
          const ownership = await claimHotelLobbyCompletion({
            generationId,
            userId: session.user.id,
          });
          if (ownership === 'unavailable') {
            const current = await getHotelLobbyTaskById({
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
            if (current?.status === 'submission_unknown') {
              return respData({
                status: 'failed',
                providerStatus: 'submission_unknown',
                videoUrl: null,
                error:
                  'Submission result is uncertain. Please contact support before retrying.',
              });
            }
            return respData({
              status: 'processing',
              providerStatus: current?.status || 'processing',
              videoUrl: null,
              reservedCredits: task.costCredits || 0,
            });
          }
        }

        const persisted = await persistHotelLobbyResultToR2({
          userId: session.user.id,
          generationId,
          sourceUrl: provider.videoUrl,
        });

        await finalizeHotelLobbyGeneration({
          generationId,
          userId: session.user.id,
          providerStatus: provider.providerStatus,
          videoKey: persisted.videoKey,
        });

        const current = await getHotelLobbyTaskById({
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
        console.error('hotel-lobby result persistence failed:', error);
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
    console.error('hotel-lobby status failed:', error);
    return respErr(error?.message || 'Failed to query generation status', {
      status: 400,
    });
  }
}

export const Route = createFileRoute('/api/hotel-lobby/status')({
  server: {
    handlers: { GET },
  },
});
