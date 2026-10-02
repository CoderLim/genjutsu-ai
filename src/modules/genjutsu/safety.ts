import { getConfig } from '@/modules/config/service';

import { isGenjutsuE2EMockEnabled } from './e2e-mock';

const FAL_FACE_DETECTION_URL =
  'https://fal.run/fal-ai/moondream3-preview/detect';
const FACE_DETECTION_TIMEOUT_MS = 25_000;
const FACE_DETECTION_MAX_ATTEMPTS = 2;

export const REAL_HUMAN_FACE_DETECTION_PROMPT =
  'real human face, photorealistic human face, actual person face; exclude anime, cartoon, illustration, 3D character, game character';

export type GenjutsuSafetyCode =
  | 'REFERENCE_FACE_DETECTED'
  | 'FACE_DETECTION_UNAVAILABLE';

export class GenjutsuSafetyError extends Error {
  constructor(
    public code: GenjutsuSafetyCode,
    message: string,
    public status: number
  ) {
    super(message);
    this.name = 'GenjutsuSafetyError';
  }
}

export function falPayloadHasFace(payload: unknown): boolean {
  if (!payload || typeof payload !== 'object') {
    throw new Error('Face detection returned an invalid response');
  }

  const objects = (payload as { objects?: unknown }).objects;
  if (!Array.isArray(objects)) {
    throw new Error('Face detection response is missing objects');
  }

  return objects.length > 0;
}

async function getFalApiKey() {
  const apiKey = (await getConfig('fal_api_key'))?.trim();
  if (!apiKey) {
    throw new GenjutsuSafetyError(
      'FACE_DETECTION_UNAVAILABLE',
      'Reference-image safety check is temporarily unavailable.',
      503
    );
  }
  return apiKey;
}

function describeFetchError(error: unknown) {
  if (!(error instanceof Error)) return String(error);
  const cause = (error as Error & { cause?: unknown }).cause;
  if (cause instanceof Error) {
    const code =
      'code' in cause && typeof (cause as { code?: unknown }).code === 'string'
        ? (cause as { code: string }).code
        : undefined;
    return code
      ? `${error.message} (${cause.message}; ${code})`
      : `${error.message} (${cause.message})`;
  }
  return error.message;
}

function isTransientFaceDetectionError(error: unknown) {
  if (!(error instanceof Error)) return false;
  if (error.name === 'AbortError' || error.name === 'TimeoutError') return true;
  const message = describeFetchError(error).toLowerCase();
  return (
    message.includes('fetch failed') ||
    message.includes('network') ||
    message.includes('econnreset') ||
    message.includes('etimedout') ||
    message.includes('socket')
  );
}

async function detectHumanFaceOnce(
  imageUrl: string,
  apiKey: string
): Promise<boolean> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FACE_DETECTION_TIMEOUT_MS);

  try {
    const response = await fetch(FAL_FACE_DETECTION_URL, {
      method: 'POST',
      headers: {
        Authorization: `Key ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        image_url: imageUrl,
        prompt: REAL_HUMAN_FACE_DETECTION_PROMPT,
        preview: false,
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      const detail = await response.text().catch(() => '');
      console.warn(
        'Genjutsu face detection failed:',
        response.status,
        detail.slice(0, 500)
      );
      throw new Error(`Fal face detection failed with HTTP ${response.status}`);
    }

    return falPayloadHasFace(await response.json());
  } finally {
    clearTimeout(timer);
  }
}

async function detectHumanFace(imageUrl: string): Promise<boolean> {
  if (isGenjutsuE2EMockEnabled()) return false;

  const apiKey = await getFalApiKey();
  let lastError: unknown;

  for (let attempt = 1; attempt <= FACE_DETECTION_MAX_ATTEMPTS; attempt += 1) {
    try {
      return await detectHumanFaceOnce(imageUrl, apiKey);
    } catch (error) {
      if (error instanceof GenjutsuSafetyError) throw error;
      lastError = error;
      const transient = isTransientFaceDetectionError(error);
      console.warn(
        'Genjutsu face detection unavailable:',
        describeFetchError(error),
        `(attempt ${attempt}/${FACE_DETECTION_MAX_ATTEMPTS})`
      );
      if (!transient || attempt >= FACE_DETECTION_MAX_ATTEMPTS) break;
      await new Promise((resolve) => setTimeout(resolve, 400 * attempt));
    }
  }

  console.warn(
    'Genjutsu face detection gave up:',
    describeFetchError(lastError)
  );
  throw new GenjutsuSafetyError(
    'FACE_DETECTION_UNAVAILABLE',
    'Reference-image safety check is temporarily unavailable. Please try again later.',
    503
  );
}

export async function assertGenjutsuReferenceImagesSafe(
  imageUrls: string[]
): Promise<void> {
  if (isGenjutsuE2EMockEnabled()) return;

  if (
    !Array.isArray(imageUrls) ||
    imageUrls.length < 1 ||
    imageUrls.length > 8
  ) {
    throw new Error('Provide between 1 and 8 reference images');
  }

  const detections = await Promise.all(imageUrls.map(detectHumanFace));
  if (detections.some(Boolean)) {
    throw new GenjutsuSafetyError(
      'REFERENCE_FACE_DETECTED',
      'Images and videos cannot contain real people. Please use media without real human likenesses.',
      422
    );
  }
}
