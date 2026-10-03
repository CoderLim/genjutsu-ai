import { envConfigs } from '@/config';

import {
  createGenjutsuE2ERequestId,
  isGenjutsuE2EMockEnabled,
} from './e2e-mock';
import { estimateGenjutsuListCost } from './pricing';
import {
  estimateSeedanceProviderCost,
  getSeedanceStatus,
  isSeedanceLikenessRejection,
  SeedanceHttpError,
  SeedancePreflightError,
  submitSeedance,
} from './seedance';
import type {
  GenjutsuMode,
  GenjutsuProvider,
  GenjutsuResolution,
} from './types';
import { probeSeedanceSourceDurationSeconds } from './video-metadata';
import { resolveGenjutsuProviderTarget } from './workflow';

export type {
  GenjutsuMode,
  GenjutsuProvider,
  GenjutsuResolution,
} from './types';
export {
  isSeedanceLikenessRejection,
  SeedanceHttpError,
  SeedancePreflightError,
  resolveGenjutsuProviderTarget,
};

const VALID_RESOLUTIONS = new Set<GenjutsuResolution>([
  '480p',
  '720p',
  '1080p',
]);

/** Free estimate must not stall generation if Higgsfield is slow. */
const ESTIMATE_TIMEOUT_MS = 8_000;

/**
 * When estimate returns a pricing description (or fails), bill against the
 * published list rate. Cap at Genjutsu's 30s source limit; prefer a
 * conservative upper bound when duration is unknown so we do not under-reserve.
 */
const FALLBACK_DURATION_SECONDS = 30;

export class HiggsfieldPreflightError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'HiggsfieldPreflightError';
  }
}

export class HiggsfieldHttpError extends Error {
  constructor(
    public status: number,
    message: string,
    public payload?: unknown
  ) {
    super(message);
    this.name = 'HiggsfieldHttpError';
  }
}

function getApiKey() {
  const value = envConfigs.higgsfield_api_key?.trim();
  if (!value) {
    throw new HiggsfieldPreflightError(
      'Higgsfield API key is not configured. Set HF_API_KEY on the server.'
    );
  }
  return value;
}

function getApiBaseUrl() {
  return (
    envConfigs.higgsfield_api_base_url?.trim() || 'https://api.higgsfield.ai'
  ).replace(/\/$/, '');
}

export function getGenjutsuModel(mode: GenjutsuMode) {
  if (mode === 'motion-transfer') {
    return (
      envConfigs.higgsfield_genjutsu_motion_model?.trim() ||
      'higgsfield/genjutsu/motion-transfer/v1.0'
    );
  }

  return (
    envConfigs.higgsfield_genjutsu_object_swap_model?.trim() ||
    'higgsfield/genjutsu/object-swap/v1.0'
  );
}

async function readProviderJson(response: Response) {
  const payload = await response.json().catch(() => null);
  if (response.ok) return payload;

  const message =
    payload?.detail?.message ||
    payload?.detail ||
    payload?.message ||
    payload?.error ||
    `Higgsfield request failed with HTTP ${response.status}`;
  throw new HiggsfieldHttpError(
    response.status,
    typeof message === 'string' ? message : JSON.stringify(message),
    payload
  );
}

async function providerFetch(path: string, init?: RequestInit) {
  const response = await fetch(`${getApiBaseUrl()}${path}`, {
    ...init,
    headers: {
      Authorization: `Key ${getApiKey()}`,
      ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
      ...init?.headers,
    },
  });
  return readProviderJson(response);
}

function parseEstimateUsd(payload: any): number | null {
  const usdRaw =
    payload?.usd ??
    payload?.cost_usd ??
    payload?.cost?.usd ??
    payload?.estimate?.usd;
  const providerCostUsd = Number(usdRaw);
  if (!Number.isFinite(providerCostUsd) || providerCostUsd <= 0) return null;
  return providerCostUsd;
}

function normalizeFallbackDurationSeconds(value: unknown) {
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) {
    return FALLBACK_DURATION_SECONDS;
  }
  return Math.min(FALLBACK_DURATION_SECONDS, Math.max(1, value));
}

export async function createHiggsfieldUploadUrl(contentType: string) {
  const normalized = contentType.trim().toLowerCase();
  if (
    !normalized ||
    (!normalized.startsWith('image/') && !normalized.startsWith('video/'))
  ) {
    throw new Error('Only image and video uploads are supported');
  }

  const payload = await providerFetch('/files/generate-upload-url', {
    method: 'POST',
    body: JSON.stringify({ content_type: normalized }),
  });

  const uploadUrl = payload?.upload_url;
  const publicUrl = payload?.public_url;
  if (typeof uploadUrl !== 'string' || typeof publicUrl !== 'string') {
    throw new Error('Higgsfield did not return a valid upload URL');
  }

  const rawHeaders = payload?.upload_headers;
  const uploadHeaders: Record<string, string> = {};
  if (
    rawHeaders &&
    typeof rawHeaders === 'object' &&
    !Array.isArray(rawHeaders)
  ) {
    for (const [key, value] of Object.entries(rawHeaders)) {
      if (typeof value === 'string') uploadHeaders[key] = value;
    }
  }

  return {
    uploadUrl,
    uploadHeaders,
    publicUrl,
  };
}

function buildGenjutsuPayload(input: {
  mode: GenjutsuMode;
  model?: string;
  resolution: GenjutsuResolution;
  prompt?: string;
  videoUrl: string;
  imageUrls: string[];
}) {
  if (input.mode !== 'motion-transfer' && input.mode !== 'objects-swap') {
    throw new HiggsfieldPreflightError('Unsupported Genjutsu mode');
  }
  if (!VALID_RESOLUTIONS.has(input.resolution)) {
    throw new HiggsfieldPreflightError('Unsupported resolution');
  }

  const prompt = (input.prompt || '').trim();
  if (prompt.length > 2000) {
    throw new HiggsfieldPreflightError('Prompt is too long');
  }
  if (!isHttpUrl(input.videoUrl)) {
    throw new HiggsfieldPreflightError('A valid uploaded video URL is required');
  }
  if (
    !Array.isArray(input.imageUrls) ||
    input.imageUrls.length < 1 ||
    input.imageUrls.length > 8 ||
    input.imageUrls.some((url) => !isHttpUrl(url))
  ) {
    throw new HiggsfieldPreflightError('Provide between 1 and 8 valid reference image URLs');
  }

  return {
    model: input.model?.trim() || getGenjutsuModel(input.mode),
    body: {
      prompt,
      video_url: input.videoUrl,
      image_urls: input.imageUrls,
      resolution: input.resolution,
    },
  };
}

export type GenjutsuCostEstimate = {
  providerCostUsd: number;
  providerCredits: unknown;
  payload: unknown;
  source: 'estimate' | 'list_fallback' | 'seedance_list_estimate';
  sourceDurationSeconds?: number;
};

/**
 * Best-effort Higgsfield estimate. Returns null when the response has no
 * usable USD figure (e.g. Genjutsu's `pricing_description` shape).
 */
export async function estimateGenjutsuProviderCost(input: {
  mode: GenjutsuMode;
  model?: string;
  resolution: GenjutsuResolution;
  prompt?: string;
  videoUrl: string;
  imageUrls: string[];
}): Promise<GenjutsuCostEstimate | null> {
  const { model, body } = buildGenjutsuPayload(input);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ESTIMATE_TIMEOUT_MS);

  try {
    // Estimate is free preflight pricing — always hit the real endpoint.
    const payload = await providerFetch(
      `/estimate/${model.replace(/^\/+/, '')}`,
      {
        method: 'POST',
        body: JSON.stringify(body),
        signal: controller.signal,
      }
    );

    const providerCostUsd = parseEstimateUsd(payload);
    if (providerCostUsd == null) return null;

    return {
      providerCostUsd,
      providerCredits: payload?.credits ?? null,
      payload,
      source: 'estimate',
    };
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Prefer live `/estimate` USD; on timeout, HTTP error, or description-only
 * payloads, fall back to published list rates so generation can proceed.
 */
async function resolveHiggsfieldProviderCost(input: {
  mode: GenjutsuMode;
  model?: string;
  resolution: GenjutsuResolution;
  prompt?: string;
  videoUrl: string;
  imageUrls: string[];
  durationSeconds?: number;
}): Promise<GenjutsuCostEstimate> {
  try {
    const estimate = await estimateGenjutsuProviderCost(input);
    if (estimate) return estimate;
    console.warn(
      'genjutsu estimate returned no usable USD; using list-rate fallback'
    );
  } catch (error) {
    console.warn(
      'genjutsu estimate unavailable, using list-rate fallback:',
      error instanceof Error ? error.message : error
    );
  }

  const durationSeconds = normalizeFallbackDurationSeconds(
    input.durationSeconds
  );
  const providerCostUsd = estimateGenjutsuListCost({
    durationSeconds,
    resolution: input.resolution,
  });

  return {
    providerCostUsd,
    providerCredits: null,
    payload: {
      source: 'list_fallback',
      durationSeconds,
      resolution: input.resolution,
      reason: 'estimate_unavailable_or_non_numeric',
    },
    source: 'list_fallback',
  };
}

function getGenjutsuWebhookUrl() {
  const appUrl = envConfigs.app_url?.trim();
  if (!appUrl || !appUrl.startsWith('https://')) return null;
  try {
    return new URL('/api/genjutsu/webhook', appUrl).toString();
  } catch {
    return null;
  }
}

async function submitHiggsfield(input: {
  mode: GenjutsuMode;
  model?: string;
  resolution: GenjutsuResolution;
  prompt?: string;
  videoUrl: string;
  imageUrls: string[];
}) {
  const { model, body } = buildGenjutsuPayload(input);

  if (isGenjutsuE2EMockEnabled()) {
    return {
      requestId: createGenjutsuE2ERequestId(),
      status: 'queued',
    };
  }
  const modelPath = model.replace(/^\/+/, '');
  const webhookUrl = getGenjutsuWebhookUrl();
  const path = webhookUrl
    ? `/${modelPath}?hf_webhook=${encodeURIComponent(webhookUrl)}`
    : `/${modelPath}`;

  const payload = await providerFetch(path, {
    method: 'POST',
    body: JSON.stringify(body),
  });

  if (typeof payload?.request_id !== 'string' || !payload.request_id) {
    throw new Error('Higgsfield did not return a request ID');
  }

  return {
    requestId: payload.request_id as string,
    status: typeof payload.status === 'string' ? payload.status : 'queued',
  };
}

async function getHiggsfieldStatus(requestId: string) {
  const normalized = requestId.trim();
  if (!/^[A-Za-z0-9._:-]{6,200}$/.test(normalized)) {
    throw new Error('Invalid request ID');
  }

  const payload = await providerFetch(
    `/requests/${encodeURIComponent(normalized)}/status`
  );

  const providerStatus =
    typeof payload?.status === 'string'
      ? payload.status.toLowerCase()
      : 'processing';

  const videoUrl =
    typeof payload?.video?.url === 'string'
      ? payload.video.url
      : typeof payload?.video_url === 'string'
        ? payload.video_url
        : typeof payload?.output?.video?.url === 'string'
          ? payload.output.video.url
          : null;

  if (providerStatus === 'completed') {
    if (!videoUrl) {
      throw new Error('Higgsfield completed the request without a video URL');
    }
    return {
      status: 'completed' as const,
      providerStatus,
      videoUrl,
    };
  }

  if (
    providerStatus === 'failed' ||
    providerStatus === 'nsfw' ||
    providerStatus === 'canceled' ||
    providerStatus === 'cancelled'
  ) {
    const message =
      payload?.error?.message ||
      payload?.error ||
      payload?.message ||
      (providerStatus === 'nsfw'
        ? 'Generation was blocked by the provider safety check'
        : `Generation ended with status: ${providerStatus}`);

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

function isHttpUrl(value: string) {
  try {
    const parsed = new URL(value);
    return parsed.protocol === 'https:' || parsed.protocol === 'http:';
  } catch {
    return false;
  }
}

export type GenjutsuProviderCostInput = {
  provider: GenjutsuProvider;
  model: string;
  mode: GenjutsuMode;
  resolution: GenjutsuResolution;
  prompt?: string;
  videoUrl: string;
  imageUrls: string[];
  durationSeconds?: number;
};

export async function resolveGenjutsuProviderCost(
  input: GenjutsuProviderCostInput
): Promise<GenjutsuCostEstimate> {
  if (input.provider === 'seedance') {
    const sourceDurationSeconds = await probeSeedanceSourceDurationSeconds(
      input.videoUrl
    );
    return {
      ...estimateSeedanceProviderCost({
        resolution: input.resolution,
        sourceDurationSeconds,
      }),
      sourceDurationSeconds,
    };
  }

  return resolveHiggsfieldProviderCost(input);
}

export async function submitGenjutsu(input: {
  provider: GenjutsuProvider;
  model: string;
  mode: GenjutsuMode;
  resolution: GenjutsuResolution;
  prompt?: string;
  videoUrl: string;
  imageUrls: string[];
  endUserId: string;
  sourceDurationSeconds?: number;
}) {
  if (input.provider === 'seedance') {
    if (
      typeof input.sourceDurationSeconds !== 'number' ||
      !Number.isFinite(input.sourceDurationSeconds) ||
      input.sourceDurationSeconds <= 0
    ) {
      throw new SeedancePreflightError(
        'Seedance submission is missing the server-validated source duration'
      );
    }

    return submitSeedance({
      ...input,
      sourceDurationSeconds: input.sourceDurationSeconds,
    });
  }

  return submitHiggsfield(input);
}

export async function getGenjutsuStatus(input: {
  provider: GenjutsuProvider | string;
  model?: string | null;
  requestId: string;
}) {
  if (input.provider === 'seedance') {
    const model =
      input.model?.trim() ||
      envConfigs.seedance_genjutsu_model?.trim() ||
      'bytedance/seedance-2.5/us/reference-to-video';

    return getSeedanceStatus({
      model,
      requestId: input.requestId,
    });
  }

  return getHiggsfieldStatus(input.requestId);
}
