import {
  applyHotelLobbyProviderQueryError,
  claimHotelLobbyCompletion,
  clearHotelLobbyProviderQueryErrors,
  finalizeHotelLobbyGeneration,
  getHotelLobbyTaskById,
  parseHotelLobbyTask,
  refundHotelLobbyGeneration,
} from './billing';
import { getHotelLobbyProviderStatus } from './service';
import { persistHotelLobbyResultToR2 } from './storage';

export type HotelLobbyReconcileResult = {
  status: 'completed' | 'failed' | 'processing';
  providerStatus: string;
  videoUrl: string | null;
  error?: string;
  reservedCredits?: number;
  refundedCredits?: number;
};

function stableResultUrl(generationId: string) {
  return `/api/hotel-lobby/result/${encodeURIComponent(generationId)}`;
}

/**
 * Re-query Fal and settle the task. Used by authenticated status polling and
 * by the Fal webhook wake-up path — webhook payloads are never trusted.
 */
export async function reconcileHotelLobbyGeneration(task: {
  id: string;
  userId: string;
  status: string;
  taskId: string | null;
  model: string | null;
  costCredits: number | null;
  taskResult?: string | null;
  options?: string | null;
  taskInfo?: string | null;
}): Promise<HotelLobbyReconcileResult> {
  const generationId = task.id;
  const userId = task.userId;
  const reservedCredits = task.costCredits || 0;
  const parsed = parseHotelLobbyTask(task);

  if (task.status === 'completed') {
    return {
      status: 'completed',
      providerStatus: parsed.result?.providerStatus || 'completed',
      videoUrl: stableResultUrl(generationId),
      reservedCredits,
    };
  }

  if (task.status === 'refunded') {
    return {
      status: 'failed',
      providerStatus: parsed.result?.providerStatus || 'failed',
      videoUrl: null,
      error: parsed.result?.error || 'Generation failed',
      refundedCredits: parsed.result?.refundedCredits ?? reservedCredits,
    };
  }

  if (task.status === 'submission_unknown') {
    return {
      status: 'failed',
      providerStatus: 'submission_unknown',
      videoUrl: null,
      error:
        parsed.result?.error ||
        'Submission result is uncertain. Please contact support before retrying.',
    };
  }

  if (
    task.status === 'reserved' ||
    task.status === 'submitting' ||
    task.status === 'refunding'
  ) {
    return {
      status: 'processing',
      providerStatus: task.status,
      videoUrl: null,
      reservedCredits,
    };
  }

  // `completing` may resume R2 persistence after a prior claim.
  if (
    (task.status !== 'submitted' && task.status !== 'completing') ||
    !task.taskId
  ) {
    return {
      status: 'processing',
      providerStatus: task.status,
      videoUrl: null,
    };
  }

  const provider = await getHotelLobbyProviderStatus(
    task.taskId,
    typeof task.model === 'string' && task.model ? task.model : undefined
  );

  if (task.status === 'submitted' && provider.status === 'unresolved') {
    const outcome = await applyHotelLobbyProviderQueryError({
      generationId,
      userId,
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
      return {
        status: 'processing',
        providerStatus: provider.providerStatus,
        videoUrl: null,
        reservedCredits,
      };
    }

    console.error('[ops] hotel-lobby provider query unresolved credits_held', {
      generationId,
      userId,
      errorCount: outcome.count,
      providerStatus: provider.providerStatus,
      error: provider.error,
      reservedCredits,
    });
    return {
      status: 'failed',
      providerStatus: 'submission_unknown',
      videoUrl: null,
      error:
        'Provider status lookup failed permanently. Credits remain reserved; contact support before retrying.',
    };
  }

  if (task.status === 'submitted' && provider.status === 'processing') {
    await clearHotelLobbyProviderQueryErrors({ generationId, userId });
  }

  if (task.status === 'submitted' && provider.status === 'failed') {
    const refunded = await refundHotelLobbyGeneration({
      generationId,
      userId,
      providerStatus: provider.providerStatus,
      error: provider.error || 'Video generation failed',
    });
    const refundedParsed = refunded
      ? parseHotelLobbyTask(refunded)
      : { result: null };

    return {
      status: 'failed',
      providerStatus: provider.providerStatus,
      videoUrl: null,
      error:
        refundedParsed.result?.error ||
        provider.error ||
        'Video generation failed',
      refundedCredits: reservedCredits,
    };
  }

  if (provider.status === 'completed' && provider.videoUrl) {
    try {
      if (task.status === 'submitted') {
        const ownership = await claimHotelLobbyCompletion({
          generationId,
          userId,
        });
        if (ownership === 'unavailable') {
          const current = await getHotelLobbyTaskById({
            generationId,
            userId,
          });
          if (current?.status === 'completed') {
            return {
              status: 'completed',
              providerStatus: provider.providerStatus,
              videoUrl: stableResultUrl(generationId),
              reservedCredits,
            };
          }
          if (current?.status === 'submission_unknown') {
            return {
              status: 'failed',
              providerStatus: 'submission_unknown',
              videoUrl: null,
              error:
                'Submission result is uncertain. Please contact support before retrying.',
            };
          }
          return {
            status: 'processing',
            providerStatus: current?.status || 'processing',
            videoUrl: null,
            reservedCredits,
          };
        }
      }

      const persisted = await persistHotelLobbyResultToR2({
        userId,
        generationId,
        sourceUrl: provider.videoUrl,
      });

      await finalizeHotelLobbyGeneration({
        generationId,
        userId,
        providerStatus: provider.providerStatus,
        videoKey: persisted.videoKey,
      });

      const current = await getHotelLobbyTaskById({ generationId, userId });
      if (current?.status === 'completed') {
        return {
          status: 'completed',
          providerStatus: provider.providerStatus,
          videoUrl: stableResultUrl(generationId),
          reservedCredits,
        };
      }
    } catch (error) {
      console.error('hotel-lobby result persistence failed:', error);
      return {
        status: 'processing',
        providerStatus: 'persisting',
        videoUrl: null,
        reservedCredits,
      };
    }
  }

  return {
    status: 'processing',
    providerStatus: provider.providerStatus,
    videoUrl: null,
    reservedCredits,
  };
}
