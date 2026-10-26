import {
  assertWavespeedConfigured,
  getWavespeedPredictionStatus,
  submitWavespeedPrediction,
  type WavespeedNormalizedTask,
} from '@/core/ai/wavespeed';

import {
  claimImageToVideoCompletion,
  finalizeImageToVideoGeneration,
  getImageToVideoTaskById,
  listImageToVideoTasksNeedingReconcile,
  parseImageToVideoTask,
  promoteImageToVideoSubmissionUnknownToSubmitted,
  promoteStaleImageToVideoSubmitting,
  refundImageToVideoGeneration,
} from './billing';
import { IMAGE_TO_VIDEO_MODEL } from './constants';
import {
  createImageToVideoR2ReadUrl,
  persistImageToVideoResultToR2,
} from './storage';

export type ImageToVideoReconcileResult = {
  status: 'completed' | 'failed' | 'processing';
  providerStatus: string;
  videoUrl: string | null;
  error?: string;
  errorCode?: string;
  reservedCredits?: number;
  refundedCredits?: number;
};

export type ImageToVideoReconcileDeps = {
  getProviderStatus: (requestId: string) => Promise<WavespeedNormalizedTask>;
  promoteUnknownToSubmitted: typeof promoteImageToVideoSubmissionUnknownToSubmitted;
  claimCompletion: typeof claimImageToVideoCompletion;
  getTaskById: typeof getImageToVideoTaskById;
  persistResult: typeof persistImageToVideoResultToR2;
  finalize: typeof finalizeImageToVideoGeneration;
  refund: typeof refundImageToVideoGeneration;
  promoteStaleSubmitting: typeof promoteStaleImageToVideoSubmitting;
};

const defaultReconcileDeps: ImageToVideoReconcileDeps = {
  getProviderStatus: getWavespeedPredictionStatus,
  promoteUnknownToSubmitted: promoteImageToVideoSubmissionUnknownToSubmitted,
  claimCompletion: claimImageToVideoCompletion,
  getTaskById: getImageToVideoTaskById,
  persistResult: persistImageToVideoResultToR2,
  finalize: finalizeImageToVideoGeneration,
  refund: refundImageToVideoGeneration,
  promoteStaleSubmitting: promoteStaleImageToVideoSubmitting,
};

function stableResultUrl(generationId: string) {
  return `/api/image-to-video/result/${encodeURIComponent(generationId)}`;
}

export async function submitImageToVideo(params: {
  imageUrl: string;
  prompt: string;
  duration: number;
  resolution: string;
  aspectRatio: string;
  generateAudio: boolean;
}) {
  await assertWavespeedConfigured();
  return submitWavespeedPrediction(IMAGE_TO_VIDEO_MODEL, {
    image: params.imageUrl,
    prompt: params.prompt,
    duration: params.duration,
    resolution: params.resolution,
    aspect_ratio: params.aspectRatio,
    generate_audio: params.generateAudio,
  });
}

export async function reconcileImageToVideoGeneration(
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
  deps: ImageToVideoReconcileDeps = defaultReconcileDeps
): Promise<ImageToVideoReconcileResult> {
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

  const parsed = parseImageToVideoTask(task);

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
        ? parseImageToVideoTask(refunded)
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
        const currentParsed = parseImageToVideoTask(current);
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
      ? parseImageToVideoTask(refunded)
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
            const completedParsed = parseImageToVideoTask(current);
            if (!completedParsed.result?.videoKey) {
              console.error(
                '[ops] image-to-video completed_without_videoKey credits_held',
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
      console.error('[ops] image-to-video result persist failed', {
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
export async function reconcileImageToVideoBatch(params?: {
  limit?: number;
  minAgeMs?: number;
  nowMs?: number;
  deps?: ImageToVideoReconcileDeps;
}) {
  const tasks = await listImageToVideoTasksNeedingReconcile({
    limit: params?.limit,
    minAgeMs: params?.minAgeMs,
    nowMs: params?.nowMs,
  });

  const results: Array<{
    generationId: string;
    userId: string;
    beforeStatus: string;
    result: ImageToVideoReconcileResult;
  }> = [];

  for (const task of tasks) {
    try {
      const result = await reconcileImageToVideoGeneration(
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
      console.error('[ops] image-to-video batch reconcile item failed', {
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

export async function resolveSealedImageUrl(sealedImageKey: string) {
  return createImageToVideoR2ReadUrl(sealedImageKey);
}
