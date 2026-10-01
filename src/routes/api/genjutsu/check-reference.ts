import { createFileRoute } from '@tanstack/react-router';

import {
  assertGenjutsuReferenceImagesSafe,
  GenjutsuSafetyError,
} from '@/modules/genjutsu/safety';
import { enforceMinIntervalRateLimit } from '@/lib/rate-limit';
import { respData, respErr, respJson } from '@/lib/resp';

const MAX_REFERENCE_IMAGE_BYTES = 12 * 1024 * 1024;

function bytesToBase64(bytes: Uint8Array) {
  let binary = '';
  const chunkSize = 0x8000;
  for (let offset = 0; offset < bytes.length; offset += chunkSize) {
    binary += String.fromCharCode(
      ...bytes.subarray(offset, offset + chunkSize)
    );
  }
  return btoa(binary);
}

async function fileToDataUri(file: File) {
  const bytes = new Uint8Array(await file.arrayBuffer());
  return `data:${file.type};base64,${bytesToBase64(bytes)}`;
}

async function POST({ request }: { request: Request }) {
  // Public so guests get upload-time face feedback before sign-in. IP rate
  // limit keeps the Fal proxy from being freely abused.
  const limited = enforceMinIntervalRateLimit(request, {
    intervalMs: 800,
    keyPrefix: 'genjutsu-reference-safety',
  });
  if (limited) return limited;

  try {
    const formData = await request.formData();
    const image = formData.get('image');

    if (!(image instanceof File)) {
      return respErr('A reference image is required', { status: 400 });
    }
    if (!image.type.startsWith('image/')) {
      return respErr('Only image references are supported', { status: 400 });
    }
    if (image.size <= 0 || image.size > MAX_REFERENCE_IMAGE_BYTES) {
      return respErr('Reference images must be 12 MB or smaller', {
        status: 400,
      });
    }

    await assertGenjutsuReferenceImagesSafe([await fileToDataUri(image)]);
    return respData({ safe: true });
  } catch (error) {
    if (error instanceof GenjutsuSafetyError) {
      return respJson(
        -1,
        error.message,
        { code: error.code },
        { status: error.status }
      );
    }

    console.error('genjutsu reference safety check failed:', error);
    return respJson(
      -1,
      'Reference-image safety check is temporarily unavailable. Please try again later.',
      { code: 'FACE_DETECTION_UNAVAILABLE' },
      { status: 503 }
    );
  }
}

export const Route = createFileRoute('/api/genjutsu/check-reference')({
  server: {
    handlers: { POST },
  },
});
