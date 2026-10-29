import {
  assertWavespeedConfigured,
  getWavespeedPredictionStatus,
  submitWavespeedPrediction,
  type WavespeedNormalizedTask,
} from '@/core/ai/wavespeed';

import {
  claimVideoFaceSwapCompletion,
  finalizeVideoFaceSwapGeneration,
  getVideoFaceSwapTaskById,
  listVideoFaceSwapTasksNeedingReconcile,
  parseVideoFaceSwapTask,
  promoteStaleVideoFaceSwapSubmitting,
  promoteVideoFaceSwapSubmissionUnknownToSubmitted,
  refundVideoFaceSwapGeneration,
} from './billing';
import { VIDEO_FACE_SWAP_MODEL } from './constants';
import {
  createVideoFaceSwapR2ReadUrl,
  persistVideoFaceSwapResultToR2,
} from './storage';

export type VideoFaceSwapReconcileResult = {
  status: 'completed' | 'failed' | 'processing';
  providerStatus: string;
  videoUrl: string | null;
  error?: string;
  errorCode?: string;
  reservedCredits?: number;
  refundedCredits?: number;
};

export type VideoFaceSwapReconcileDeps = {
  getProviderStatus: (requestId: string) => Promise<WavespeedNormalizedTask>;
  promoteUnknownToSubmitted: typeof promoteVideoFaceSwapSubmissionUnknownToSubmitted;
  claimCompletion: typeof claimVideoFaceSwapCompletion;
  getTaskById: typeof getVideoFaceSwapTaskById;
  persistResult: typeof persistVideoFaceSwapResultToR2;
  finalize: typeof finalizeVideoFaceSwapGeneration;
  refund: typeof refundVideoFaceSwapGeneration;
  promoteStaleSubmitting: typeof promoteStaleVideoFaceSwapSubmitting;
};

const defaultReconcileDeps: VideoFaceSwapReconcileDeps = {
  getProviderStatus: getWavespeedPredictionStatus,
  promoteUnknownToSubmitted: promoteVideoFaceSwapSubmissionUnknownToSubmitted,
  claimCompletion: claimVideoFaceSwapCompletion,
  getTaskById: getVideoFaceSwapTaskById,
  persistResult: persistVideoFaceSwapResultToR2,
  finalize: finalizeVideoFaceSwapGeneration,
  refund: refundVideoFaceSwapGeneration,
  promoteStaleSubmitting: promoteStaleVideoFaceSwapSubmitting,
};

function stableResultUrl(generationId: string) {
  return `/api/video-face-swap/result/${encodeURIComponent(generationId)}`;
}

export async function submitVideoFaceSwap(params: {
  videoUrl: string;
  faceImageUrl: string;
  prompt: string;
  resolution: string;
}) {
  await assertWavespeedConfigured();
  return submitWavespeedPrediction(VIDEO_FACE_SWAP_MODEL, {
    video: params.videoUrl,
    face_image: params.faceImageUrl,
    prompt: params.prompt,
    resolution: params.resolution,
  });
}

export async function reconcileVideoFaceSwapGeneration(
  task: {
    id: string;
    userId: string;
    status: string;
    taskId: string | null;
    model: string | null;
    costCredits: number | null;
    taskResult?: string | null;
    options?: string | null;
  },
  deps: VideoFaceSwapReconcileDeps = defaultReconcileDeps
): Promise<VideoFaceSwapReconcileResult> {
  const generationId = task.id;
  const userId = task.userId;
  const reservedCredits = task.costCredits || 0;

  if (task.status === 'submitting') {
    const promoted = await deps.promoteStaleSubmitting({
      generationId,
      userId,
    });
    if (promoted) {
      task = promoted;
    }
  }

  const parsed = parseVideoFaceSwapTask(task);

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
    // Never auto-resubmit. With a requestId, poll upstream and promote
    // atomically into submitted before claim/persist. Without one, keep
    // credits held for ops — do not surface as a refundable "failed".
    if (!task.taskId) {
      return {
        status: 'failed',
        providerStatus: 'submission_unknown',
        videoUrl: null,
        error:
          parsed.result?.error ||
          'Submission result is uncertain. Please contact support before retrying.',
        reservedCredits,
      };
    }

    let provider: WavespeedNormalizedTask;
    try {
      provider = await deps.getProviderStatus(task.taskId);
    } catch {
      return {
        status: 'processing',
        providerStatus: 'submission_unknown',
        videoUrl: null,
        reservedCredits,
        error:
          parsed.result?.error ||
          'Submission result is uncertain. Please contact support before retrying.',
      };
    }

    if (provider.status === 'failed') {
      const refunded = await deps.refund({
        generationId,
        userId,
        providerStatus: provider.providerStatus,
        error: provider.error || 'Upstream generation failed',
      });
      const refundedParsed = refunded
        ? parseVideoFaceSwapTask(refunded)
        : { result: null };

      if (refunded?.status === 'refunded') {
        return {
          status: 'failed',
          providerStatus: provider.providerStatus,
          videoUrl: null,
          error:
            refundedParsed.result?.error ||
            provider.error ||
            'Upstream generation failed',
          refundedCredits: reservedCredits,
        };
      }

      // Concurrent refund already finished, or status moved elsewhere.
      const current = await deps.getTaskById({ generationId, userId });
      if (current?.status === 'refunded') {
        const currentParsed = parseVideoFaceSwapTask(current);
        return {
          status: 'failed',
          providerStatus: currentParsed.result?.providerStatus || 'failed',
          videoUrl: null,
          error: currentParsed.result?.error || provider.error,
          refundedCredits:
            currentParsed.result?.refundedCredits ?? reservedCredits,
        };
      }

      return {
        status: 'processing',
        providerStatus: current?.status || 'submission_unknown',
        videoUrl: null,
        reservedCredits,
        error:
          'Upstream failed but refund could not claim; contact support before retrying.',
      };
    }

    if (provider.status === 'processing') {
      const promoted = await deps.promoteUnknownToSubmitted({
        generationId,
        userId,
      });
      if (promoted?.status === 'submitted') {
        task = promoted;
      } else {
        return {
          status: 'processing',
          providerStatus: 'submission_unknown',
          videoUrl: null,
          reservedCredits,
          error:
            'Submission was interrupted; recovering from upstream. Do not retry.',
        };
      }
    } else if (provider.status === 'completed' && provider.videoUrl) {
      const promoted = await deps.promoteUnknownToSubmitted({
        generationId,
        userId,
      });
      if (promoted?.status === 'submitted') {
        task = promoted;
      } else {
        const current = await deps.getTaskById({ generationId, userId });
        if (current?.status === 'completed') {
          return {
            status: 'completed',
            providerStatus: provider.providerStatus,
            videoUrl: stableResultUrl(generationId),
            reservedCredits,
          };
        }
        if (
          current?.status === 'submitted' ||
          current?.status === 'completing'
        ) {
          task = current;
        } else {
          return {
            status: 'processing',
            providerStatus: current?.status || 'submission_unknown',
            videoUrl: null,
            reservedCredits,
            error:
              'Submission was interrupted; recovering from upstream. Do not retry.',
          };
        }
      }
    } else {
      return {
        status: 'processing',
        providerStatus: 'submission_unknown',
        videoUrl: null,
        reservedCredits,
        error:
          'Submission was interrupted; recovering from upstream. Do not retry.',
      };
    }
  }

  if (
    task.status === 'initiated' ||
    task.status === 'ready' ||
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

  const provider = await deps.getProviderStatus(task.taskId);

  if (task.status === 'submitted' && provider.status === 'failed') {
    const refunded = await deps.refund({
      generationId,
      userId,
      providerStatus: provider.providerStatus,
      error: provider.error || 'Video generation failed',
    });
    const refundedParsed = refunded
      ? parseVideoFaceSwapTask(refunded)
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

  if (provider.status === 'processing') {
    return {
      status: 'processing',
      providerStatus: provider.providerStatus,
      videoUrl: null,
      reservedCredits,
    };
  }

  if (provider.status === 'completed' && provider.videoUrl) {
    try {
      if (task.status === 'submitted' || task.status === 'completing') {
        const ownership = await deps.claimCompletion({
          generationId,
          userId,
        });
        if (ownership === 'unavailable') {
          const current = await deps.getTaskById({
            generationId,
            userId,
          });
          if (current?.status === 'completed') {
            const completedParsed = parseVideoFaceSwapTask(current);
            if (!completedParsed.result?.videoKey) {
              console.error(
                '[ops] video-face-swap completed_without_videoKey credits_held',
                { generationId, userId }
              );
              return {
                status: 'processing',
                providerStatus: 'completing',
                videoUrl: null,
                reservedCredits,
                error: 'Result incomplete; contact support.',
              };
            }
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
              reservedCredits,
            };
          }
          return {
            status: 'processing',
            providerStatus: current?.status || 'processing',
            videoUrl: null,
            reservedCredits,
          };
        }
        // claimed | already_completing — both may run idempotent R2 persist.
      }

      const persisted = await deps.persistResult({
        userId,
        generationId,
        sourceUrl: provider.videoUrl,
      });
      if (!persisted.videoKey) {
        throw new Error('Persist returned empty video key');
      }

      const finalized = await deps.finalize({
        generationId,
        userId,
        providerStatus: provider.providerStatus,
        videoKey: persisted.videoKey,
      });

      if (finalized?.status === 'completed') {
        return {
          status: 'completed',
          providerStatus: provider.providerStatus,
          videoUrl: stableResultUrl(generationId),
          reservedCredits,
        };
      }

      const current = await deps.getTaskById({ generationId, userId });
      if (current?.status === 'completed') {
        return {
          status: 'completed',
          providerStatus: provider.providerStatus,
          videoUrl: stableResultUrl(generationId),
          reservedCredits,
        };
      }

      return {
        status: 'processing',
        providerStatus: current?.status || 'completing',
        videoUrl: null,
        reservedCredits,
        error: 'Saving result; please keep polling.',
      };
    } catch (error: any) {
      console.error('[ops] video-face-swap result persist failed', {
        generationId,
        userId,
        error: error?.message,
      });
      // Never refund on R2/persist failure — upstream already succeeded.
      return {
        status: 'processing',
        providerStatus: 'completing',
        videoUrl: null,
        reservedCredits,
        error: 'Saving result; please keep polling.',
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

/**
 * Batch reconcile for ops / cron. Does not re-submit WaveSpeed jobs.
 * Scheduling this endpoint is a deploy-time concern — shipping the route
 * alone is not unattended recovery.
 */
export async function reconcileVideoFaceSwapBatch(params?: {
  limit?: number;
  minAgeMs?: number;
  nowMs?: number;
  deps?: VideoFaceSwapReconcileDeps;
}) {
  const tasks = await listVideoFaceSwapTasksNeedingReconcile({
    limit: params?.limit,
    minAgeMs: params?.minAgeMs,
    nowMs: params?.nowMs,
  });

  const results: Array<{
    generationId: string;
    userId: string;
    beforeStatus: string;
    result: VideoFaceSwapReconcileResult;
  }> = [];

  for (const task of tasks) {
    try {
      const result = await reconcileVideoFaceSwapGeneration(
        task,
        params?.deps ?? defaultReconcileDeps
      );
      results.push({
        generationId: task.id,
        userId: task.userId,
        beforeStatus: task.status,
        result,
      });
    } catch (error: any) {
      console.error('[ops] video-face-swap batch reconcile item failed', {
        generationId: task.id,
        userId: task.userId,
        error: error?.message,
      });
      results.push({
        generationId: task.id,
        userId: task.userId,
        beforeStatus: task.status,
        result: {
          status: 'processing',
          providerStatus: task.status,
          videoUrl: null,
          error: error?.message || 'Reconcile failed',
          reservedCredits: task.costCredits || 0,
        },
      });
    }
  }

  return { scanned: tasks.length, results };
}

export async function resolveSealedMediaUrl(sealedKey: string) {
  return createVideoFaceSwapR2ReadUrl(sealedKey);
}
