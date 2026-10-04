import { envConfigs } from '@/config';

import { estimateSeedanceProviderCost } from './seedance';
import type { GenjutsuMode, GenjutsuResolution } from './types';
import { buildSeedanceWorkflowPrompt } from './workflow';

const DEFAULT_ARK_API_BASE_URL = 'https://ark.cn-beijing.volces.com/api/v3';
const DEFAULT_VOLCENGINE_SEEDANCE_MODEL = 'doubao-seedance-2-5-260628';
const DEFAULT_VIDEO_INPUT_RATE_CNY_PER_MILLION_TOKENS = 42;
const DEFAULT_CNY_PER_USD = 7;

const ESTIMATED_TOKENS_PER_BILLED_SECOND: Record<GenjutsuResolution, number> = {
  // Ark's public estimate formula is:
  // seconds * width * height * fps / 1024.
  // Use representative 24fps dimensions for pre-submit telemetry only;
  // final accounting always prefers usage.completion_tokens from Ark.
  '480p': Math.round((854 * 480 * 24) / 1024),
  '720p': (1280 * 720 * 24) / 1024,
  '1080p': (1920 * 1080 * 24) / 1024,
};

export class VolcengineSeedanceHttpError extends Error {
  constructor(
    public status: number,
    message: string,
    public code?: string,
    public payload?: unknown
  ) {
    super(message);
    this.name = 'VolcengineSeedanceHttpError';
  }
}

function positiveNumber(value: string | undefined, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function getVolcengineRateCnyPerMillionTokens() {
  return positiveNumber(
    envConfigs.seedance_volcengine_video_input_rate_cny_per_million_tokens,
    DEFAULT_VIDEO_INPUT_RATE_CNY_PER_MILLION_TOKENS
  );
}

function getCnyPerUsd() {
  return positiveNumber(
    envConfigs.seedance_volcengine_cny_per_usd,
    DEFAULT_CNY_PER_USD
  );
}

function getArkApiKey() {
  const value = envConfigs.ark_api_key?.trim();
  if (!value) {
    throw new VolcengineSeedanceHttpError(
      503,
      'Volcengine Ark API key is not configured. Set ARK_API_KEY on the server.',
      'ARK_NOT_CONFIGURED'
    );
  }
  return value;
}

function getArkApiBaseUrl() {
  const value = (
    envConfigs.ark_api_base_url?.trim() || DEFAULT_ARK_API_BASE_URL
  ).replace(/\/$/, '');
  try {
    const parsed = new URL(value);
    if (parsed.protocol !== 'https:') throw new Error('HTTPS required');
    return value;
  } catch {
    throw new VolcengineSeedanceHttpError(
      503,
      'Volcengine Ark API base URL is invalid.',
      'ARK_INVALID_BASE_URL'
    );
  }
}

function normalizeModel(model: string) {
  const value = model.trim();
  if (!value || !/^[A-Za-z0-9._-]+$/.test(value)) {
    throw new VolcengineSeedanceHttpError(
      503,
      'Invalid Volcengine Seedance model configuration.',
      'ARK_INVALID_MODEL'
    );
  }
  return value;
}

function arkErrorMessage(payload: unknown, fallback: string) {
  if (!payload || typeof payload !== 'object') return fallback;
  const record = payload as Record<string, any>;
  const candidates = [
    record.error?.message,
    record.error,
    record.message,
    record.detail?.message,
    record.detail,
  ];
  const message = candidates.find(
    (value) => typeof value === 'string' && value.trim()
  );
  return typeof message === 'string' ? message : fallback;
}

function arkErrorCode(payload: unknown) {
  if (!payload || typeof payload !== 'object') return undefined;
  const record = payload as Record<string, any>;
  const code = record.error?.code ?? record.code;
  return typeof code === 'string' && code.trim() ? code : undefined;
}

async function arkFetch(path: string, init?: RequestInit): Promise<any> {
  const response = await fetch(
    `${getArkApiBaseUrl()}/${path.replace(/^\/+/, '')}`,
    {
      ...init,
      headers: {
        Authorization: `Bearer ${getArkApiKey()}`,
        ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
        ...init?.headers,
      },
    }
  );

  const payload = await response.json().catch(() => null);
  if (response.ok) return payload;

  throw new VolcengineSeedanceHttpError(
    response.status,
    arkErrorMessage(
      payload,
      `Volcengine Ark request failed with HTTP ${response.status}`
    ),
    arkErrorCode(payload),
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

async function hashSafetyIdentifier(endUserId: string) {
  const normalized = endUserId.trim();
  if (!normalized) throw new Error('Volcengine safety identifier is missing');

  const digest = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(normalized)
  );
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('')
    .slice(0, 64);
}

function arkReferenceTokens(imageCount: number) {
  return {
    video: '@视频1',
    images: Array.from(
      { length: imageCount },
      (_, index) => `@图像${index + 1}`
    ),
  };
}

function assertSourceDurationSeconds(value: number) {
  if (!Number.isFinite(value) || value < 4 || value > 30) {
    throw new Error('Seedance source video must be between 4 and 30 seconds');
  }
}

export function assertVolcengineSeedanceConfigured(model?: string) {
  getArkApiKey();
  getArkApiBaseUrl();
  normalizeModel(
    model ||
      envConfigs.seedance_volcengine_model?.trim() ||
      DEFAULT_VOLCENGINE_SEEDANCE_MODEL
  );
}

function estimatedOutputDurationSeconds(input: {
  mode: GenjutsuMode;
  sourceDurationSeconds: number;
}) {
  // Editing locks output duration to the source (within a small provider-side
  // tolerance). Reference generation is intentionally requested at source
  // length so Motion Transfer preserves timing.
  return Math.min(30, Math.max(4, input.sourceDurationSeconds));
}

export function estimateVolcengineSeedanceProviderCost(input: {
  mode: GenjutsuMode;
  resolution: GenjutsuResolution;
  sourceDurationSeconds: number;
  cnyPerUsd?: number;
  rateCnyPerMillionTokens?: number;
}) {
  assertSourceDurationSeconds(input.sourceDurationSeconds);

  const outputSeconds = estimatedOutputDurationSeconds(input);
  const billedSeconds = input.sourceDurationSeconds + outputSeconds;
  const estimatedTokens =
    billedSeconds * ESTIMATED_TOKENS_PER_BILLED_SECOND[input.resolution];
  const rateCnyPerMillionTokens =
    input.rateCnyPerMillionTokens ?? getVolcengineRateCnyPerMillionTokens();
  const cnyPerUsd = input.cnyPerUsd ?? getCnyPerUsd();
  const estimatedProviderCostCny =
    (estimatedTokens * rateCnyPerMillionTokens) / 1_000_000;

  // Keep the customer-facing credit quote compatible with the existing
  // Seedance/fal price during the infrastructure migration. This lets the
  // provider-cost reduction improve margin without silently repricing users.
  const customerQuote = estimateSeedanceProviderCost({
    resolution: input.resolution,
    sourceDurationSeconds: input.sourceDurationSeconds,
  });

  return {
    providerCostUsd: estimatedProviderCostCny / cnyPerUsd,
    customerPriceBasisUsd: customerQuote.providerCostUsd,
    providerCredits: null,
    source: 'volcengine_seedance_estimate' as const,
    payload: {
      source: 'volcengine_seedance_estimate',
      pricingVersion: 'volcengine-seedance-2.5-video-input-2026-10-03',
      sourceDurationSeconds: input.sourceDurationSeconds,
      estimatedOutputDurationSeconds: outputSeconds,
      billedSeconds,
      resolution: input.resolution,
      estimatedTokens,
      rateCnyPerMillionTokens,
      estimatedProviderCostCny,
      cnyPerUsd,
      customerPriceBasisUsd: customerQuote.providerCostUsd,
    },
  };
}

export function buildVolcengineSeedancePayload(input: {
  model: string;
  mode: GenjutsuMode;
  resolution: GenjutsuResolution;
  prompt?: string;
  videoUrl: string;
  imageUrls: string[];
  sourceDurationSeconds: number;
  safetyIdentifier: string;
  callbackUrl: string | null;
}) {
  assertSourceDurationSeconds(input.sourceDurationSeconds);
  if (
    !Array.isArray(input.imageUrls) ||
    input.imageUrls.length < 1 ||
    input.imageUrls.length > 8
  ) {
    throw new Error('Provide between 1 and 8 reference images');
  }

  const taskType = input.mode === 'objects-swap' ? 'edit' : 'reference';
  const workflowPrompt = buildSeedanceWorkflowPrompt({
    mode: input.mode,
    userPrompt: input.prompt,
    imageCount: input.imageUrls.length,
    references: arkReferenceTokens(input.imageUrls.length),
  });
  // Ark still checks prompt intent after validating omni_reference_task_type.
  // Prefix edit jobs with an explicit provider-documented edit keyword so an
  // Objects Swap request cannot be misclassified as plain reference generation.
  const prompt =
    taskType === 'edit' ? `编辑视频：${workflowPrompt}` : workflowPrompt;

  const content: Array<Record<string, unknown>> = [
    { type: 'text', text: prompt },
    {
      type: 'video_url',
      video_url: { url: input.videoUrl },
      role: 'reference_video',
    },
    ...input.imageUrls.map((url) => ({
      type: 'image_url',
      image_url: { url },
      role: 'reference_image',
    })),
  ];

  return {
    model: normalizeModel(input.model || DEFAULT_VOLCENGINE_SEEDANCE_MODEL),
    content,
    omni_reference_task_type: taskType,
    resolution: input.resolution,
    ratio: 'adaptive' as const,
    duration:
      taskType === 'edit'
        ? -1
        : Math.min(30, Math.max(4, Math.round(input.sourceDurationSeconds))),
    generate_audio: envConfigs.seedance_genjutsu_generate_audio !== 'false',
    output_format: 'mp4' as const,
    safety_identifier: input.safetyIdentifier,
    ...(input.callbackUrl ? { callback_url: input.callbackUrl } : {}),
  };
}

export function normalizeVolcengineSeedanceTask(
  payload: any,
  options?: { rateCnyPerMillionTokens?: number }
) {
  const providerStatus =
    typeof payload?.status === 'string'
      ? payload.status.toLowerCase()
      : 'running';
  const rateCnyPerMillionTokens =
    options?.rateCnyPerMillionTokens ?? getVolcengineRateCnyPerMillionTokens();
  const completionTokens = Number(payload?.usage?.completion_tokens);
  const totalTokens = Number(payload?.usage?.total_tokens);
  const providerUsage =
    Number.isFinite(completionTokens) && completionTokens >= 0
      ? {
          completionTokens,
          totalTokens:
            Number.isFinite(totalTokens) && totalTokens >= 0
              ? totalTokens
              : completionTokens,
          rateCnyPerMillionTokens,
          actualProviderCostCny:
            (completionTokens * rateCnyPerMillionTokens) / 1_000_000,
        }
      : undefined;

  if (providerStatus === 'succeeded') {
    const videoUrl =
      typeof payload?.content?.video_url === 'string'
        ? payload.content.video_url
        : null;
    if (!videoUrl) {
      return {
        status: 'failed' as const,
        providerStatus: 'failed',
        videoUrl: null,
        error: 'Volcengine completed the request without a video URL',
        providerUsage,
      };
    }
    return {
      status: 'completed' as const,
      providerStatus,
      videoUrl,
      providerUsage,
    };
  }

  if (
    providerStatus === 'failed' ||
    providerStatus === 'expired' ||
    providerStatus === 'cancelled' ||
    providerStatus === 'canceled'
  ) {
    return {
      status: 'failed' as const,
      providerStatus,
      videoUrl: null,
      error: arkErrorMessage(
        payload,
        `Generation ended with status: ${providerStatus}`
      ),
      errorCode: arkErrorCode(payload),
      providerUsage,
    };
  }

  return {
    status: 'processing' as const,
    providerStatus,
    videoUrl: null,
    providerUsage,
  };
}

export async function submitVolcengineSeedance(input: {
  model: string;
  mode: GenjutsuMode;
  resolution: GenjutsuResolution;
  prompt?: string;
  videoUrl: string;
  imageUrls: string[];
  sourceDurationSeconds: number;
  endUserId: string;
}) {
  const safetyIdentifier = await hashSafetyIdentifier(input.endUserId);
  const body = buildVolcengineSeedancePayload({
    ...input,
    safetyIdentifier,
    callbackUrl: getWebhookUrl(),
  });

  const payload = await arkFetch('/contents/generations/tasks', {
    method: 'POST',
    body: JSON.stringify(body),
  });

  const requestId = payload?.id;
  if (typeof requestId !== 'string' || !requestId) {
    throw new Error('Volcengine Ark did not return a task ID');
  }

  return {
    requestId,
    status:
      typeof payload?.status === 'string'
        ? payload.status.toLowerCase()
        : 'queued',
  };
}

export async function getVolcengineSeedanceStatus(input: {
  requestId: string;
}) {
  const requestId = input.requestId.trim();
  if (!/^[A-Za-z0-9._:-]{6,200}$/.test(requestId)) {
    throw new Error('Invalid Volcengine Seedance task ID');
  }

  const payload = await arkFetch(
    `/contents/generations/tasks/${encodeURIComponent(requestId)}`,
    { method: 'GET' }
  );
  return normalizeVolcengineSeedanceTask(payload);
}
