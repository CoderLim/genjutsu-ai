import { envConfigs } from '@/config';
import { getConfig } from '@/modules/config/service';

import {
  createGenjutsuE2ERequestId,
  isGenjutsuE2EMockEnabled,
} from './e2e-mock';
import type { GenjutsuMode, GenjutsuResolution } from './types';
import { buildSeedanceWorkflowPrompt, getSeedanceTask } from './workflow';

const FAL_QUEUE_BASE_URL = 'https://queue.fal.run';

const SEEDANCE_VIDEO_REFERENCE_RATE_USD_PER_BILLED_SECOND: Record<
  GenjutsuResolution,
  number
> = {
  // Fal US pricing displayed for Seedance 2.5 with video references.
  // Billing includes both input-video and output-video seconds.
  '480p': 0.15876,
  '720p': 0.34056,
  '1080p': 0.8377668,
};

export class SeedancePreflightError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SeedancePreflightError';
  }
}

export class SeedanceHttpError extends Error {
  constructor(
    public status: number,
    message: string,
    public payload?: unknown
  ) {
    super(message);
    this.name = 'SeedanceHttpError';
  }
}

async function getFalApiKey() {
  const apiKey = (await getConfig('fal_api_key'))?.trim();
  if (!apiKey) {
    throw new SeedancePreflightError(
      'Fal API key is not configured. Set it in Admin → Settings → AI → Fal or FAL_KEY.'
    );
  }
  return apiKey;
}

function modelPath(model: string) {
  const value = model.trim().replace(/^\/+/, '');
  if (!value || !/^[A-Za-z0-9._/-]+$/.test(value)) {
    throw new SeedancePreflightError('Invalid Seedance model');
  }
  return value;
}

/**
 * Queue status/result live on `/{owner}/{app}/requests/{id}`.
 * Submit-only suffixes such as `/us/reference-to-video` accept POST only
 * (GET returns 405; POST would enqueue a second job).
 */
export function falQueueAppPath(model: string) {
  const parts = modelPath(model).split('/').filter(Boolean);
  if (parts[0] === 'bytedance' && parts.length > 2) {
    return `${parts[0]}/${parts[1]}`;
  }
  return parts.join('/');
}

export const SEEDANCE_LIKENESS_REJECTION_MESSAGE =
  'Images and videos cannot contain real people. Please use media without real human likenesses.';

function falErrorMessage(payload: unknown, fallback: string) {
  if (typeof payload === 'string' && payload.trim()) return payload;
  if (!payload || typeof payload !== 'object') return fallback;
  const record = payload as Record<string, unknown>;
  const candidates = [
    record.error,
    record.message,
    record.detail,
    record.payload,
  ];

  for (const candidate of candidates) {
    if (typeof candidate === 'string' && candidate.trim()) return candidate;
    if (Array.isArray(candidate)) {
      const parts = candidate
        .map((item) => {
          if (typeof item === 'string') return item;
          if (item && typeof item === 'object' && 'msg' in item) {
            return String((item as { msg?: unknown }).msg || '');
          }
          return '';
        })
        .filter(Boolean);
      if (parts.length) return parts.join('; ');
    }
    if (candidate && typeof candidate === 'object') {
      const nested = falErrorMessage(candidate, '');
      if (nested) return nested;
    }
  }

  return fallback;
}

export function isSeedanceLikenessRejection(value: unknown): boolean {
  const text = falErrorMessage(value, '').toLowerCase();
  if (!text) return false;
  return (
    text.includes('likenesses of real people') ||
    text.includes('real people') ||
    text.includes('real person') ||
    text.includes('private information that cannot be processed') ||
    text.includes('human face') ||
    text.includes('真人')
  );
}

export function normalizeSeedanceUserError(
  value: unknown,
  fallback: string
): string {
  if (isSeedanceLikenessRejection(value)) {
    return SEEDANCE_LIKENESS_REJECTION_MESSAGE;
  }
  const message = falErrorMessage(value, fallback);
  return message || fallback;
}

async function falFetch(path: string, init?: RequestInit): Promise<any> {
  const apiKey = await getFalApiKey();
  const response = await fetch(
    `${FAL_QUEUE_BASE_URL}/${path.replace(/^\/+/, '')}`,
    {
      ...init,
      headers: {
        Authorization: `Key ${apiKey}`,
        ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
        ...init?.headers,
      },
    }
  );

  const payload = await response.json().catch(() => null);
  if (response.ok) return payload;

  const detail = normalizeSeedanceUserError(
    payload,
    `Fal request failed with HTTP ${response.status}`
  );

  throw new SeedanceHttpError(response.status, detail, payload);
}

function getWebhookUrl() {
  const appUrl = envConfigs.app_url?.trim();
  if (!appUrl || !appUrl.startsWith('https://')) return null;
  try {
    return new URL('/api/genjutsu/webhook', appUrl).toString();
  } catch {
    return null;
  }
}

function estimatedOutputDurationSeconds(sourceDurationSeconds: number) {
  // Reference generation supports explicit 4..30s durations. For short source
  // clips Seedance must use auto; estimate the minimum generated duration.
  return Math.min(30, Math.max(4, sourceDurationSeconds));
}

export function estimateSeedanceProviderCost(input: {
  resolution: GenjutsuResolution;
  sourceDurationSeconds: number;
}) {
  if (
    !Number.isFinite(input.sourceDurationSeconds) ||
    input.sourceDurationSeconds <= 0
  ) {
    throw new Error('Seedance source duration must be a positive number');
  }

  const outputSeconds = estimatedOutputDurationSeconds(
    input.sourceDurationSeconds
  );
  const billedSeconds = input.sourceDurationSeconds + outputSeconds;
  const providerCostUsd =
    billedSeconds *
    SEEDANCE_VIDEO_REFERENCE_RATE_USD_PER_BILLED_SECOND[input.resolution];

  return {
    providerCostUsd,
    providerCredits: null,
    source: 'seedance_list_estimate' as const,
    payload: {
      source: 'seedance_list_estimate',
      sourceDurationSeconds: input.sourceDurationSeconds,
      estimatedOutputDurationSeconds: outputSeconds,
      billedSeconds,
      resolution: input.resolution,
      rateUsdPerBilledSecond:
        SEEDANCE_VIDEO_REFERENCE_RATE_USD_PER_BILLED_SECOND[input.resolution],
    },
  };
}

export function buildSeedancePayload(input: {
  mode: GenjutsuMode;
  resolution: GenjutsuResolution;
  prompt?: string;
  videoUrl: string;
  imageUrls: string[];
  sourceDurationSeconds: number;
  endUserId: string;
}) {
  if (
    !Array.isArray(input.imageUrls) ||
    input.imageUrls.length < 1 ||
    input.imageUrls.length > 8
  ) {
    throw new SeedancePreflightError(
      'Provide between 1 and 8 reference images'
    );
  }

  const task = getSeedanceTask(input.mode);
  // Objects Swap (task=editing): Seedance requires duration + aspect_ratio to
  // be explicitly "auto". Motion Transfer keeps a source-length duration when
  // the clip is long enough for Seedance's 4–30s enum.
  const duration =
    task === 'editing' || input.sourceDurationSeconds < 4
      ? 'auto'
      : String(
          Math.min(30, Math.max(4, Math.round(input.sourceDurationSeconds)))
        );

  return {
    prompt: buildSeedanceWorkflowPrompt({
      mode: input.mode,
      userPrompt: input.prompt,
      imageCount: input.imageUrls.length,
    }),
    task,
    image_urls: input.imageUrls,
    video_urls: [input.videoUrl],
    resolution: input.resolution,
    duration,
    aspect_ratio: 'auto' as const,
    generate_audio: envConfigs.seedance_genjutsu_generate_audio !== 'false',
    bitrate_mode: 'standard',
    codec: 'H264',
    end_user_id: input.endUserId,
  };
}

export async function submitSeedance(input: {
  model: string;
  mode: GenjutsuMode;
  resolution: GenjutsuResolution;
  prompt?: string;
  videoUrl: string;
  imageUrls: string[];
  sourceDurationSeconds: number;
  endUserId: string;
}) {
  // Validate payload shape even in E2E mock so preflight bugs still surface.
  const model = modelPath(input.model);
  buildSeedancePayload(input);

  if (isGenjutsuE2EMockEnabled()) {
    return {
      requestId: createGenjutsuE2ERequestId(),
      status: 'queued',
    };
  }

  const body = buildSeedancePayload(input);
  const webhookUrl = getWebhookUrl();
  const path = webhookUrl
    ? `${model}?fal_webhook=${encodeURIComponent(webhookUrl)}`
    : model;

  const payload = await falFetch(path, {
    method: 'POST',
    body: JSON.stringify(body),
  });

  const requestId = payload?.request_id;
  if (typeof requestId !== 'string' || !requestId) {
    throw new Error('Fal did not return a request ID');
  }

  return {
    requestId,
    status:
      typeof payload?.status === 'string'
        ? payload.status.toLowerCase()
        : 'queued',
  };
}

export async function getSeedanceStatus(input: {
  model: string;
  requestId: string;
}) {
  const queueApp = falQueueAppPath(input.model);
  const requestId = input.requestId.trim();
  if (!/^[A-Za-z0-9._:-]{6,200}$/.test(requestId)) {
    throw new Error('Invalid request ID');
  }

  const statusPayload = await falFetch(
    `${queueApp}/requests/${encodeURIComponent(requestId)}/status`,
    { method: 'GET' }
  );
  const providerStatus =
    typeof statusPayload?.status === 'string'
      ? statusPayload.status.toLowerCase()
      : 'in_progress';

  if (providerStatus === 'completed') {
    try {
      const result = await falFetch(
        `${queueApp}/requests/${encodeURIComponent(requestId)}`,
        { method: 'GET' }
      );
      const videoUrl =
        typeof result?.video?.url === 'string' ? result.video.url : null;

      if (!videoUrl) {
        return {
          status: 'failed' as const,
          providerStatus: 'failed',
          videoUrl: null,
          error: normalizeSeedanceUserError(
            result,
            'Fal completed the request without a video URL'
          ),
        };
      }

      return {
        status: 'completed' as const,
        providerStatus,
        videoUrl,
      };
    } catch (error) {
      if (error instanceof SeedanceHttpError) {
        return {
          status: 'failed' as const,
          providerStatus: 'failed',
          videoUrl: null,
          error: normalizeSeedanceUserError(error.message, error.message),
        };
      }
      throw error;
    }
  }

  if (
    providerStatus === 'failed' ||
    providerStatus === 'error' ||
    providerStatus === 'cancelled' ||
    providerStatus === 'canceled'
  ) {
    return {
      status: 'failed' as const,
      providerStatus,
      videoUrl: null,
      error: normalizeSeedanceUserError(
        statusPayload,
        `Generation ended with status: ${providerStatus}`
      ),
    };
  }

  return {
    status: 'processing' as const,
    providerStatus,
    videoUrl: null,
  };
}
