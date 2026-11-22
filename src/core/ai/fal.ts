import {
  AIConfigs,
  AIFile,
  AIGenerateParams,
  AIImage,
  AIMediaType,
  AIProvider,
  AITaskResult,
  AITaskStatus,
  AIVideo,
  SaveFilesFunction,
  UuidFunction,
} from './types';
import { assertFalQueueUrls, type FalQueueUrls } from './fal-queue-urls';

const defaultUuid: UuidFunction = () => crypto.randomUUID();

/** Retryable Fal queue transport failures (not terminal model outcomes). */
export function isTransientFalHttpStatus(status: number) {
  return status === 408 || status === 429 || status >= 500;
}

/**
 * Parse `request failed with status: NNN` from FalProvider.generate errors.
 * Returns null when the message is not an HTTP status failure.
 */
export function parseFalHttpStatusFromError(message: string): number | null {
  const match = /request failed with status:\s*(\d+)/i.exec(message);
  if (!match) return null;
  const status = Number(match[1]);
  return Number.isInteger(status) ? status : null;
}

/**
 * Submit-time HTTP codes that clearly mean Fal rejected the request
 * (safe to refund). Excludes 408/429 (retryable) and all 5xx (uncertain).
 */
export function isDefiniteFalSubmitRejection(status: number) {
  return (
    Number.isInteger(status) &&
    status >= 400 &&
    status < 500 &&
    !isTransientFalHttpStatus(status)
  );
}

export function classifyFalSubmitFailure(
  message: string
): 'refund' | 'uncertain' {
  const status = parseFalHttpStatusFromError(message);
  if (status == null) return 'uncertain';
  return isDefiniteFalSubmitRejection(status) ? 'refund' : 'uncertain';
}

export function isFalPermanentQueryFailure(
  taskInfo?: {
    status?: string;
  } | null
) {
  const status = taskInfo?.status;
  return (
    status === 'QUERY_PERMANENT_ERROR' ||
    status === 'RESULT_FETCH_PERMANENT_ERROR'
  );
}

/** Consecutive permanent status-lookup failures before parking the task. */
export const FAL_QUERY_PERMANENT_ERROR_THRESHOLD = 3;

/**
 * Fal queue status/result model id — usually the same endpoint used at submit.
 *
 * Keep the full path for MiniMax / Kling mode endpoints (`…/text-to-video`,
 * `…/image-to-video`, etc.). Truncating those to `owner/name` makes status
 * miss a Completed request (UI stuck on Generating) while Fal shows done.
 *
 * Exception: nested submit-only paths that 405 on full-path GET — Kling O3
 * `…/video-to-video/edit` and `fal-ai/bytedance/dreamactor/v2` — truncate to
 * `owner/name`. `bytedance/*` matches seedance `falQueueAppPath`.
 */
export function falQueueQueryModel(model?: string): string {
  if (!model) return '';
  const normalized = model.replace(/^\/+/, '');
  const parts = normalized.split('/').filter(Boolean);
  if (parts.length <= 2) {
    return parts.join('/');
  }
  // Match seedance falQueueAppPath: bytedance queue apps live at owner/name.
  if (parts[0] === 'bytedance') {
    return `${parts[0]}/${parts[1]}`;
  }
  // DreamActor and similar fal-ai/bytedance nests 405 on full-path GET.
  if (parts[0] === 'fal-ai' && parts[1] === 'bytedance') {
    return `${parts[0]}/${parts[1]}`;
  }
  // Kling O3 …/video-to-video/edit — submit-only suffix; full path 405s.
  if (parts[parts.length - 1] === 'edit') {
    return `${parts[0]}/${parts[1]}`;
  }
  // MiniMax / Kling mode endpoints need the full id (…/text-to-video, etc.).
  return parts.join('/');
}

/**
 * Fal configs
 * @docs https://fal.ai/
 */
export interface FalConfigs extends AIConfigs {
  apiKey: string;
  customStorage?: boolean;
  saveFiles?: SaveFilesFunction;
  uuid?: UuidFunction;
}

/**
 * Fal provider
 * @docs https://fal.ai/
 */
export class FalProvider implements AIProvider {
  readonly name = 'fal';
  configs: FalConfigs;

  private baseUrl = 'https://queue.fal.run';

  constructor(configs: FalConfigs) {
    this.configs = configs;
  }

  private getUuid(): string {
    return (this.configs.uuid || defaultUuid)();
  }

  private async trySaveFiles(files: AIFile[]): Promise<AIFile[] | undefined> {
    if (!this.configs.saveFiles) return undefined;
    try {
      return await this.configs.saveFiles(files);
    } catch (error) {
      console.error('save files failed:', error);
      return undefined;
    }
  }

  async generate({
    params,
  }: {
    params: AIGenerateParams;
  }): Promise<AITaskResult> {
    const { mediaType, model, prompt, options, callbackUrl } = params;

    if (!mediaType) {
      throw new Error('mediaType is required');
    }

    if (!model) {
      throw new Error('model is required');
    }

    if (!prompt) {
      throw new Error('prompt is required');
    }

    const input = this.formatInput({ mediaType, model, prompt, options });

    let apiUrl = `${this.baseUrl}/${model}`;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Authorization: `Key ${this.configs.apiKey}`,
    };

    const isValidCallbackUrl =
      callbackUrl &&
      callbackUrl.startsWith('http') &&
      !callbackUrl.includes('localhost') &&
      !callbackUrl.includes('127.0.0.1');

    if (isValidCallbackUrl) {
      apiUrl += `?fal_webhook=${callbackUrl}`;
    }

    const resp = await fetch(apiUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(input),
    });

    if (!resp.ok) {
      throw new Error(`request failed with status: ${resp.status}`);
    }

    const data = await resp.json();

    if (!data || !data.request_id) {
      throw new Error('generate failed: no request_id');
    }

    return {
      taskStatus: AITaskStatus.PENDING,
      taskId: data.request_id,
      taskInfo: {},
      taskResult: data,
    };
  }

  async query({
    taskId,
    model,
    mediaType,
    queueUrls,
  }: {
    taskId: string;
    model?: string;
    mediaType?: AIMediaType;
    queueUrls?: FalQueueUrls;
  }): Promise<AITaskResult> {
    // Only legacy tasks lacking submission metadata use the old path rules.
    // The queue URLs returned by Fal take precedence for all new tasks.
    const verified = queueUrls
      ? assertFalQueueUrls(queueUrls, taskId) : undefined;
    const queryModel = verified ? '' : this.getQueryModel(model);
    const legacyResultUrl = `${this.baseUrl}/${queryModel}/requests/${encodeURIComponent(taskId)}`;
    const statusUrl = verified?.statusUrl ?? legacyResultUrl + '/status';
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Authorization: `Key ${this.configs.apiKey}`,
    };

    const statusResp = await fetch(statusUrl, {
      method: 'GET', headers, redirect: 'error',
    });

    if (!statusResp.ok) {
      const detail = await statusResp.text().catch(() => '');
      const message =
        detail || `request failed with status: ${statusResp.status}`;
      // 429/5xx (and 408): retryable. 4xx like 401/403/404: permanent lookup
      // failure — callers must not keep polling forever or auto-refund.
      const transient = isTransientFalHttpStatus(statusResp.status);
      return {
        taskId,
        taskStatus: transient ? AITaskStatus.PROCESSING : AITaskStatus.FAILED,
        taskInfo: {
          status: transient ? 'QUERY_ERROR' : 'QUERY_PERMANENT_ERROR',
          errorCode: String(statusResp.status),
          errorMessage: message,
        },
        taskResult: { error: message },
      };
    }

    const statusData = await statusResp.json();
    const taskStatus = this.mapStatus(statusData.status);

    if (taskStatus !== AITaskStatus.SUCCESS) {
      return {
        taskId,
        taskStatus,
        taskInfo: {
          status: statusData.status,
          errorCode: '',
          errorMessage:
            typeof statusData.error === 'string'
              ? statusData.error
              : typeof statusData.message === 'string'
                ? statusData.message
                : '',
        },
        taskResult: statusData,
      };
    }

    const resultUrl = verified?.responseUrl ?? legacyResultUrl;
    const resultResp = await fetch(resultUrl, {
      method: 'GET', headers, redirect: 'error',
    });

    if (!resultResp.ok) {
      const detail = await resultResp.text().catch(() => '');
      const message =
        detail || `request failed with status: ${resultResp.status}`;
      const transient = isTransientFalHttpStatus(resultResp.status);
      return {
        taskId,
        taskStatus: transient ? AITaskStatus.PROCESSING : AITaskStatus.FAILED,
        taskInfo: {
          status: transient
            ? 'RESULT_FETCH_ERROR'
            : 'RESULT_FETCH_PERMANENT_ERROR',
          errorCode: String(resultResp.status),
          errorMessage: message,
        },
        taskResult: { error: message },
      };
    }

    const data = await resultResp.json();

    let images: AIImage[] | undefined = undefined;
    let videos: AIVideo[] | undefined = undefined;

    if (mediaType === AIMediaType.VIDEO) {
      if (data.video && data.video.url) {
        videos = [
          {
            id: '',
            createTime: new Date(),
            videoUrl: data.video.url,
          },
        ];
      } else if (data.videos && Array.isArray(data.videos)) {
        videos = data.videos.map((video: any) => ({
          id: '',
          createTime: new Date(),
          videoUrl: video.url,
        }));
      }
    } else {
      if (data.images && Array.isArray(data.images)) {
        images = data.images.map((image: any) => ({
          id: '',
          createTime: new Date(),
          imageUrl: image.url,
        }));
      }
    }

    if (taskStatus === AITaskStatus.SUCCESS && this.configs.customStorage) {
      if (images && images.length > 0) {
        const filesToSave: AIFile[] = [];
        images.forEach((image, index) => {
          if (image.imageUrl) {
            filesToSave.push({
              url: image.imageUrl,
              contentType: 'image/png',
              key: `fal/image/${this.getUuid()}.png`,
              index: index,
              type: 'image',
            });
          }
        });

        if (filesToSave.length > 0) {
          const uploadedFiles = await this.trySaveFiles(filesToSave);
          if (uploadedFiles) {
            uploadedFiles.forEach((file: AIFile) => {
              if (file && file.url && images && file.index !== undefined) {
                const image = images[file.index];
                if (image) {
                  image.imageUrl = file.url;
                }
              }
            });
          }
        }
      }

      if (videos && videos.length > 0) {
        const filesToSave: AIFile[] = [];
        videos.forEach((video, index) => {
          if (video.videoUrl) {
            filesToSave.push({
              url: video.videoUrl,
              contentType: 'video/mp4',
              key: `fal/video/${this.getUuid()}.mp4`,
              index: index,
              type: 'video',
            });
          }
        });

        if (filesToSave.length > 0) {
          const uploadedFiles = await this.trySaveFiles(filesToSave);
          if (uploadedFiles) {
            uploadedFiles.forEach((file: AIFile) => {
              if (file && file.url && videos && file.index !== undefined) {
                const video = videos[file.index];
                if (video) {
                  video.videoUrl = file.url;
                }
              }
            });
          }
        }
      }
    }

    return {
      taskId,
      taskStatus,
      taskInfo: {
        images,
        videos,
        status: statusData.status,
        errorCode: '',
        errorMessage: '',
        createTime: new Date(),
      },
      taskResult: data,
    };
  }

  private mapStatus(status: string): AITaskStatus {
    switch (status) {
      case 'IN_QUEUE':
        return AITaskStatus.PENDING;
      case 'IN_PROGRESS':
        return AITaskStatus.PROCESSING;
      case 'COMPLETED':
        return AITaskStatus.SUCCESS;
      case 'FAILED':
        return AITaskStatus.FAILED;
      default:
        throw new Error(`unknown status: ${status}`);
    }
  }

  private getQueryModel(model?: string): string {
    return falQueueQueryModel(model);
  }

  private formatInput({
    mediaType,
    model,
    prompt,
    options,
  }: {
    mediaType: AIMediaType;
    model: string;
    prompt: string;
    options: any;
  }): any {
    let input: any = { prompt };

    if (!options) {
      return input;
    }

    input = { ...input, ...options };

    // DreamActor schema has no prompt; FalProvider still requires one for generate().
    if (model.includes('/dreamactor/')) {
      delete input.prompt;
    }

    if (options.image_input && Array.isArray(options.image_input)) {
      if (['fal-ai/kling-video/o1/video-to-video/edit'].includes(model)) {
        input.input_images = options.image_input;
      } else {
        input.image_url = options.image_input[0];
      }
      delete input.image_input;
    }

    if (options.video_input && Array.isArray(options.video_input)) {
      input.video_url = options.video_input[0];
      delete input.video_input;
    }

    return input;
  }
}
