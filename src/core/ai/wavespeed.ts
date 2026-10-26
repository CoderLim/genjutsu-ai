import { envConfigs } from '@/config';
import { getConfig } from '@/modules/config/service';

const DEFAULT_WAVESPEED_API_BASE_URL = 'https://api.wavespeed.ai/api/v3';

export class WavespeedHttpError extends Error {
  constructor(
    public status: number,
    message: string,
    public code?: string,
    public payload?: unknown
  ) {
    super(message);
    this.name = 'WavespeedHttpError';
  }
}

/** Retryable / ambiguous WaveSpeed HTTP statuses (do not auto-refund). */
export function isTransientWavespeedHttpStatus(status: number) {
  return status === 0 || status === 408 || status === 429 || status >= 500;
}

/**
 * Submit-time HTTP codes that clearly mean WaveSpeed rejected the request
 * (safe to refund). Excludes 408/429 and all 5xx (uncertain whether accepted).
 */
export function isDefiniteWavespeedSubmitRejection(status: number) {
  return (
    Number.isInteger(status) &&
    status >= 400 &&
    status < 500 &&
    !isTransientWavespeedHttpStatus(status)
  );
}

/**
 * Classify a submit failure for credit handling.
 * Network / abort / unknown errors are always uncertain — the upstream may
 * already have accepted the job even when the client never saw a response.
 */
export function classifyWavespeedSubmitFailure(
  error: unknown
): 'refund' | 'uncertain' {
  if (error instanceof WavespeedHttpError) {
    // Misconfiguration never reached the provider.
    if (
      error.code === 'WAVESPEED_NOT_CONFIGURED' ||
      error.code === 'WAVESPEED_INVALID_BASE_URL' ||
      error.code === 'WAVESPEED_INVALID_MODEL'
    ) {
      return 'refund';
    }
    return isDefiniteWavespeedSubmitRejection(error.status)
      ? 'refund'
      : 'uncertain';
  }
  return 'uncertain';
}

async function getWavespeedApiKey() {
  const value =
    (await getConfig('wavespeed_api_key'))?.trim() ||
    envConfigs.wavespeed_api_key?.trim();
  if (!value) {
    throw new WavespeedHttpError(
      503,
      'WaveSpeed key is not configured. Set WAVESPEED_API_KEY or Admin → Settings → AI → WaveSpeed.',
      'WAVESPEED_NOT_CONFIGURED'
    );
  }
  return value;
}

function getWavespeedApiBaseUrl() {
  const value = (
    envConfigs.wavespeed_api_base_url?.trim() || DEFAULT_WAVESPEED_API_BASE_URL
  ).replace(/\/$/, '');
  try {
    const parsed = new URL(value);
    if (parsed.protocol !== 'https:') throw new Error('HTTPS required');
    return value;
  } catch {
    throw new WavespeedHttpError(
      503,
      'WaveSpeed base URL is invalid.',
      'WAVESPEED_INVALID_BASE_URL'
    );
  }
}

function isWavespeedEnvelopeAckMessage(value: unknown) {
  return typeof value === 'string' && value.trim().toLowerCase() === 'success';
}

function isWavespeedEnvelopeAckCode(value: unknown) {
  return value === 200 || value === '200';
}

function wavespeedErrorMessage(payload: unknown, fallback: string) {
  if (!payload || typeof payload !== 'object') return fallback;
  const record = payload as Record<string, any>;
  const data = record.data;
  const candidates = [
    data?.error?.message,
    data?.error,
    data?.message,
    record.error?.message,
    record.error,
    isWavespeedEnvelopeAckMessage(record.message) ? undefined : record.message,
  ];
  const message = candidates.find(
    (value) => typeof value === 'string' && value.trim()
  );
  return typeof message === 'string' ? message : fallback;
}

function wavespeedErrorCode(payload: unknown) {
  if (!payload || typeof payload !== 'object') return undefined;
  const record = payload as Record<string, any>;
  const candidates = [
    record.data?.error?.code,
    record.data?.code,
    record.error?.code,
    isWavespeedEnvelopeAckCode(record.code) ? undefined : record.code,
  ];
  const code = candidates.find(
    (value) =>
      (typeof value === 'string' && value.trim()) ||
      (typeof value === 'number' && Number.isFinite(value))
  );
  if (typeof code === 'string' && code.trim()) return code;
  if (typeof code === 'number' && Number.isFinite(code)) return String(code);
  return undefined;
}

export function normalizeWavespeedModelPath(model: string) {
  const value = model.trim().replace(/^\/+/, '');
  if (!value || !/^[A-Za-z0-9._/-]+$/.test(value)) {
    throw new WavespeedHttpError(
      503,
      'Invalid WaveSpeed model path.',
      'WAVESPEED_INVALID_MODEL'
    );
  }
  return value;
}

async function wavespeedFetch(path: string, init?: RequestInit): Promise<any> {
  const apiKey = await getWavespeedApiKey();
  const headers: Record<string, string> = {
    Authorization: `Bearer ${apiKey}`,
    ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
    ...(init?.headers as Record<string, string> | undefined),
  };

  const response = await fetch(
    `${getWavespeedApiBaseUrl()}/${path.replace(/^\/+/, '')}`,
    {
      ...init,
      headers,
    }
  );

  const payload = await response.json().catch(() => null);
  if (response.ok) return payload;

  throw new WavespeedHttpError(
    response.status,
    wavespeedErrorMessage(
      payload,
      `WaveSpeed request failed with HTTP ${response.status}`
    ),
    wavespeedErrorCode(payload),
    payload
  );
}

function unwrapPrediction(payload: any) {
  if (payload && typeof payload === 'object' && payload.data) {
    return payload.data;
  }
  return payload;
}

function extractVideoUrl(prediction: Record<string, any> | null | undefined) {
  const outputs = prediction?.outputs;
  if (!Array.isArray(outputs)) return null;

  for (const item of outputs) {
    if (typeof item === 'string' && item.trim()) return item.trim();
    if (item && typeof item === 'object') {
      const url =
        (item as { url?: unknown }).url ??
        (item as { video?: unknown }).video ??
        (item as { output?: unknown }).output;
      if (typeof url === 'string' && url.trim()) return url.trim();
    }
  }

  return null;
}

export type WavespeedNormalizedTask =
  | {
      status: 'completed';
      providerStatus: string;
      videoUrl: string;
      providerUsage?: { actualProviderCostUsd: number };
    }
  | {
      status: 'failed';
      providerStatus: string;
      videoUrl: null;
      error: string;
      errorCode?: string;
      providerUsage?: { actualProviderCostUsd: number };
    }
  | {
      status: 'processing';
      providerStatus: string;
      videoUrl: null;
      providerUsage?: { actualProviderCostUsd: number };
    };

export function normalizeWavespeedPrediction(
  payload: any
): WavespeedNormalizedTask {
  const prediction = unwrapPrediction(payload);
  const providerStatus =
    typeof prediction?.status === 'string'
      ? prediction.status.toLowerCase()
      : 'processing';

  const rawPrice = Number(
    prediction?.price ?? prediction?.cost ?? prediction?.billing?.price
  );
  const providerUsage =
    Number.isFinite(rawPrice) && rawPrice >= 0
      ? { actualProviderCostUsd: rawPrice }
      : undefined;

  if (providerStatus === 'completed') {
    const videoUrl = extractVideoUrl(prediction);
    if (!videoUrl) {
      return {
        status: 'failed',
        providerStatus: 'failed',
        videoUrl: null,
        error: 'WaveSpeed completed the request without a video URL',
        providerUsage,
      };
    }
    return {
      status: 'completed',
      providerStatus,
      videoUrl,
      providerUsage,
    };
  }

  if (
    providerStatus === 'failed' ||
    providerStatus === 'cancelled' ||
    providerStatus === 'canceled' ||
    providerStatus === 'timeout' ||
    providerStatus === 'deleted'
  ) {
    return {
      status: 'failed',
      providerStatus,
      videoUrl: null,
      error: wavespeedErrorMessage(
        payload,
        typeof prediction?.error === 'string' && prediction.error.trim()
          ? prediction.error
          : `Generation ended with status: ${providerStatus}`
      ),
      errorCode: wavespeedErrorCode(payload),
      providerUsage,
    };
  }

  return {
    status: 'processing',
    providerStatus,
    videoUrl: null,
    providerUsage,
  };
}

export async function assertWavespeedConfigured() {
  await getWavespeedApiKey();
  getWavespeedApiBaseUrl();
}

export async function submitWavespeedPrediction(
  model: string,
  body: Record<string, unknown>
) {
  const modelPath = normalizeWavespeedModelPath(model);
  const payload = await wavespeedFetch(`/${modelPath}`, {
    method: 'POST',
    body: JSON.stringify(body),
  });

  const prediction = unwrapPrediction(payload);
  const requestId = prediction?.id;
  if (typeof requestId !== 'string' || !requestId) {
    throw new Error('WaveSpeed did not return a prediction ID');
  }

  return {
    requestId,
    status:
      typeof prediction?.status === 'string'
        ? prediction.status.toLowerCase()
        : 'processing',
  };
}

export async function getWavespeedPredictionStatus(requestId: string) {
  const id = requestId.trim();
  if (!/^[A-Za-z0-9._:-]{6,200}$/.test(id)) {
    throw new Error('Invalid WaveSpeed prediction ID');
  }

  const payload = await wavespeedFetch(
    `/predictions/${encodeURIComponent(id)}/result`,
    { method: 'GET' }
  );
  return normalizeWavespeedPrediction(payload);
}
