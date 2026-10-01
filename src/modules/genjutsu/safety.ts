import { getConfig } from '@/modules/config/service';
import { isGenjutsuE2EMockEnabled } from './e2e-mock';

const FAL_FACE_DETECTION_URL =
  'https://fal.run/fal-ai/moondream3-preview/detect';
const FACE_DETECTION_TIMEOUT_MS = 15_000;

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

async function detectHumanFace(imageUrl: string): Promise<boolean> {
  if (isGenjutsuE2EMockEnabled()) return false;

  const apiKey = await getFalApiKey();
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
        prompt: 'human face',
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
  } catch (error) {
    if (error instanceof GenjutsuSafetyError) throw error;
    console.warn(
      'Genjutsu face detection unavailable:',
      error instanceof Error ? error.message : error
    );
    throw new GenjutsuSafetyError(
      'FACE_DETECTION_UNAVAILABLE',
      'Reference-image safety check is temporarily unavailable. Please try again later.',
      503
    );
  } finally {
    clearTimeout(timer);
  }
}

export async function assertGenjutsuReferenceImagesSafe(
  imageUrls: string[]
): Promise<void> {
  if (isGenjutsuE2EMockEnabled()) return;

  if (!Array.isArray(imageUrls) || imageUrls.length < 1 || imageUrls.length > 8) {
    throw new Error('Provide between 1 and 8 reference images');
  }

  const detections = await Promise.all(imageUrls.map(detectHumanFace));
  if (detections.some(Boolean)) {
    throw new GenjutsuSafetyError(
      'REFERENCE_FACE_DETECTED',
      'Reference images containing human faces are not supported. Use product, clothing, object, or scene references instead.',
      422
    );
  }
}
