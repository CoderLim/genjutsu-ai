import { envConfigs } from '@/config';
import { getConfig } from '@/modules/config/service';

import { buildSeedanceWorkflowPrompt, getSeedanceTask } from './workflow';
import type { GenjutsuMode, GenjutsuResolution } from './types';

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
    throw new Error(
      'Fal API key is not configured. Set it in Admin → Settings → AI → Fal or FAL_KEY.'
    );
  }
  return apiKey;
}

function modelPath(model: string) {
  const value = model.trim().replace(/^\/+/, '');
  if (!value || !/^[A-Za-z0-9._/-]+$/.test(value)) {
    throw new Error('Invalid Seedance model');
  }
  return value;
}

async function falFetch(
  path: string,
  init?: RequestInit
): Promise<any> {
  const apiKey = await getFalApiKey();
  const response = await fetch(`${FAL_QUEUE_BASE_URL}/${path.replace(/^\/+/, '')}`, {
    ...init,
    headers: {
      Authorization: `Key ${apiKey}`,
      ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
      ...init?.headers,
    },
  });

  const payload = await response.json().catch(() => null);
  if (response.ok) return payload;

  const detail =
    payload?.detail?.message ||
    payload?.detail ||
    payload?.message ||
    payload?.error ||
    `Fal request failed with HTTP ${response.status}`;

  throw new SeedanceHttpError(
    response.status,
    typeof detail === 'string' ? detail : JSON.stringify(detail),
    payload
  );
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
    throw new Error('Provide between 1 and 8 reference images');
  }

  const task = getSeedanceTask(input.mode);
  const duration =
    task === 'reference' && input.sourceDurationSeconds >= 4
      ? String(
          Math.min(
            30,
            Math.max(4, Math.round(input.sourceDurationSeconds))
          )
        )
      : 'auto';

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
    aspect_ratio: 'auto',
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
  const model = modelPath(input.model);
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
  const model = modelPath(input.model);
  const requestId = input.requestId.trim();
  if (!/^[A-Za-z0-9._:-]{6,200}$/.test(requestId)) {
    throw new Error('Invalid request ID');
  }

  const statusPayload = await falFetch(
    `${model}/requests/${encodeURIComponent(requestId)}/status`
  );
  const providerStatus =
    typeof statusPayload?.status === 'string'
      ? statusPayload.status.toLowerCase()
      : 'in_progress';

  if (providerStatus === 'completed') {
    const result = await falFetch(
      `${model}/requests/${encodeURIComponent(requestId)}`
    );
    const videoUrl =
      typeof result?.video?.url === 'string' ? result.video.url : null;

    if (!videoUrl) {
      throw new Error('Fal completed the request without a video URL');
    }

    return {
      status: 'completed' as const,
      providerStatus,
      videoUrl,
    };
  }

  if (
    providerStatus === 'failed' ||
    providerStatus === 'error' ||
    providerStatus === 'cancelled' ||
    providerStatus === 'canceled'
  ) {
    const message =
      statusPayload?.error?.message ||
      statusPayload?.error ||
      statusPayload?.message ||
      `Generation ended with status: ${providerStatus}`;

    return {
      status: 'failed' as const,
      providerStatus,
      videoUrl: null,
      error: typeof message === 'string' ? message : JSON.stringify(message),
    };
  }

  return {
    status: 'processing' as const,
    providerStatus,
    videoUrl: null,
  };
}
