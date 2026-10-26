import {
  assertWavespeedConfigured,
  getWavespeedPredictionStatus,
  submitWavespeedPrediction,
  WavespeedHttpError,
} from '@/core/ai/wavespeed';

import {
  claimImageToVideoCompletion,
  finalizeImageToVideoGeneration,
  getImageToVideoTaskById,
  parseImageToVideoTask,
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

  try {
    return await submitWavespeedPrediction(IMAGE_TO_VIDEO_MODEL, {
      image: params.imageUrl,
      prompt: params.prompt,
      duration: params.duration,
      resolution: params.resolution,
      aspect_ratio: params.aspectRatio,
      generate_audio: params.generateAudio,
    });
  } catch (error) {
    if (error instanceof WavespeedHttpError) {
      const ambiguous =
        error.status >= 500 ||
        error.status === 408 ||
        error.status === 429 ||
        error.status === 0;
      const err = new Error(error.message) as Error & {
        ambiguous?: boolean;
        status?: number;
        code?: string;
      };
      err.ambiguous = ambiguous;
      err.status = error.status;
      err.code = error.code;
      throw err;
    }
    throw error;
  }
}

export async function reconcileImageToVideoGeneration(task: {
  id: string;
  userId: string;
  status: string;
  taskId: string | null;
  model: string | null;
  costCredits: number | null;
  taskResult?: string | null;
  options?: string | null;
}): Promise<ImageToVideoReconcileResult> {
  const generationId = task.id;
  const userId = task.userId;
  const reservedCredits = task.costCredits || 0;

  if (task.status === 'submitting') {
    const promoted = await promoteStaleImageToVideoSubmitting({
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
    // If we somehow have a requestId, poll only — never resubmit.
    if (task.taskId) {
      try {
        const provider = await getWavespeedPredictionStatus(task.taskId);
        if (provider.status === 'completed' && provider.videoUrl) {
          // Continue into completion path below by treating as submitted.
          task = { ...task, status: 'submitted' };
        } else if (provider.status === 'failed') {
          return {
            status: 'failed',
            providerStatus: provider.providerStatus,
            videoUrl: null,
            error:
              provider.error ||
              'Upstream generation failed. Contact support about reserved credits.',
          };
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
      } catch {
        return {
          status: 'failed',
          providerStatus: 'submission_unknown',
          videoUrl: null,
          error:
            parsed.result?.error ||
            'Submission result is uncertain. Please contact support before retrying.',
        };
      }
    } else {
      return {
        status: 'failed',
        providerStatus: 'submission_unknown',
        videoUrl: null,
        error:
          parsed.result?.error ||
          'Submission result is uncertain. Please contact support before retrying.',
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

  const provider = await getWavespeedPredictionStatus(task.taskId);

  if (task.status === 'submitted' && provider.status === 'failed') {
    const refunded = await refundImageToVideoGeneration({
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
      if (task.status === 'submitted') {
        const ownership = await claimImageToVideoCompletion({
          generationId,
          userId,
        });
        if (ownership === 'unavailable') {
          const current = await getImageToVideoTaskById({
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
          return {
            status: 'processing',
            providerStatus: current?.status || 'processing',
            videoUrl: null,
            reservedCredits,
          };
        }
      }

      const persisted = await persistImageToVideoResultToR2({
        userId,
        generationId,
        sourceUrl: provider.videoUrl,
      });

      await finalizeImageToVideoGeneration({
        generationId,
        userId,
        providerStatus: provider.providerStatus,
        videoKey: persisted.videoKey,
      });

      return {
        status: 'completed',
        providerStatus: provider.providerStatus,
        videoUrl: stableResultUrl(generationId),
        reservedCredits,
      };
    } catch (error: any) {
      console.error('[ops] image-to-video result persist failed', {
        generationId,
        userId,
        error: error?.message,
      });
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

export async function resolveSealedImageUrl(sealedImageKey: string) {
  return createImageToVideoR2ReadUrl(sealedImageKey);
}
