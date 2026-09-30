import { envConfigs } from '@/config';

export type GenjutsuMode = 'motion-transfer' | 'objects-swap';
export type GenjutsuResolution = '480p' | '720p' | '1080p';

const VALID_RESOLUTIONS = new Set<GenjutsuResolution>([
  '480p',
  '720p',
  '1080p',
]);

function getApiKey() {
  const value = envConfigs.higgsfield_api_key?.trim();
  if (!value) {
    throw new Error(
      'Higgsfield API key is not configured. Set HF_API_KEY on the server.'
    );
  }
  return value;
}

function getApiBaseUrl() {
  return (
    envConfigs.higgsfield_api_base_url?.trim() ||
    'https://api.higgsfield.ai'
  ).replace(/\/$/, '');
}

function getModel(mode: GenjutsuMode) {
  if (mode === 'motion-transfer') {
    return (
      envConfigs.higgsfield_genjutsu_motion_model?.trim() ||
      'higgsfield/genjutsu/motion-transfer/v1.0'
    );
  }

  // Higgsfield's current Object Swap workflow documentation publishes the
  // provider segment as "higgsfiled". Keep it configurable so this can be
  // corrected without a deploy if their catalog mapping changes.
  return (
    envConfigs.higgsfield_genjutsu_object_swap_model?.trim() ||
    'higgsfiled/genjutsu/object-swap/v1.0'
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
  throw new Error(
    typeof message === 'string' ? message : JSON.stringify(message)
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
  if (rawHeaders && typeof rawHeaders === 'object' && !Array.isArray(rawHeaders)) {
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

export async function submitGenjutsu(input: {
  mode: GenjutsuMode;
  resolution: GenjutsuResolution;
  prompt?: string;
  videoUrl: string;
  imageUrls: string[];
}) {
  if (input.mode !== 'motion-transfer' && input.mode !== 'objects-swap') {
    throw new Error('Unsupported Genjutsu mode');
  }
  if (!VALID_RESOLUTIONS.has(input.resolution)) {
    throw new Error('Unsupported resolution');
  }

  const prompt = (input.prompt || '').trim();
  if (prompt.length > 2000) {
    throw new Error('Prompt is too long');
  }
  if (!isHttpUrl(input.videoUrl)) {
    throw new Error('A valid uploaded video URL is required');
  }
  if (
    !Array.isArray(input.imageUrls) ||
    input.imageUrls.length < 1 ||
    input.imageUrls.length > 8 ||
    input.imageUrls.some((url) => !isHttpUrl(url))
  ) {
    throw new Error('Provide between 1 and 8 valid reference image URLs');
  }

  const model = getModel(input.mode);
  const payload = await providerFetch(`/${model.replace(/^\/+/, '')}`, {
    method: 'POST',
    body: JSON.stringify({
      prompt,
      video_url: input.videoUrl,
      image_urls: input.imageUrls,
      resolution: input.resolution,
    }),
  });

  if (typeof payload?.request_id !== 'string' || !payload.request_id) {
    throw new Error('Higgsfield did not return a request ID');
  }

  return {
    requestId: payload.request_id as string,
    status: typeof payload.status === 'string' ? payload.status : 'queued',
  };
}

export async function getGenjutsuStatus(requestId: string) {
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
