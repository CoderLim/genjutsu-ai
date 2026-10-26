import { createFileRoute } from '@tanstack/react-router';

import { getAuth } from '@/core/auth';
import { assertImageToVideoGenerationId } from '@/modules/image-to-video/assert';
import { ensureImageToVideoInitiatedTask } from '@/modules/image-to-video/billing';
import {
  ImageToVideoPreflightError,
  resolveImageToVideoPreset,
  resolveImageToVideoVariant,
} from '@/modules/image-to-video/presets';
import {
  assertImageToVideoUploadSize,
  createImageToVideoProxyUploadDescriptor,
  getImageToVideoInputKey,
} from '@/modules/image-to-video/storage';
import { enforceMinIntervalRateLimit } from '@/lib/rate-limit';
import { respData, respErr } from '@/lib/resp';

async function POST({ request }: { request: Request }) {
  const limited = enforceMinIntervalRateLimit(request, {
    intervalMs: 750,
    keyPrefix: 'image-to-video-upload-url',
  });
  if (limited) return limited;

  try {
    const auth = getAuth();
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) return respErr('Unauthorized', { status: 401 });

    const body = await request.json().catch(() => ({}));
    const generationId = assertImageToVideoGenerationId(body.generationId);
    const preset = resolveImageToVideoPreset(body.presetId);
    const variant = resolveImageToVideoVariant(preset, body.variant);

    const contentType =
      typeof body.contentType === 'string'
        ? body.contentType
        : Array.isArray(body.contentTypes) &&
            typeof body.contentTypes[0] === 'string'
          ? body.contentTypes[0]
          : '';
    const contentLength = Number(
      body.contentLength ??
        (Array.isArray(body.contentLengths) ? body.contentLengths[0] : NaN)
    );

    if (!contentType || !Number.isFinite(contentLength)) {
      return respErr('Provide one image content type and length', {
        status: 400,
      });
    }

    assertImageToVideoUploadSize(contentLength);
    const normalized = getImageToVideoInputKey({
      userId: session.user.id,
      generationId,
      contentType,
    });

    await ensureImageToVideoInitiatedTask({
      generationId,
      userId: session.user.id,
      presetId: preset.id,
      variant,
      stagingImageKey: normalized.key,
      contentType: normalized.contentType,
      contentLength,
    });

    // Prefer same-origin proxy (Genjutsu pattern) so browser PUT never hits R2 CORS.
    const upload = createImageToVideoProxyUploadDescriptor(request, {
      userId: session.user.id,
      generationId,
      contentType: normalized.contentType,
      contentLength,
    });

    return respData({
      uploads: [upload],
      presetId: preset.id,
      variant,
    });
  } catch (error: any) {
    console.error('image-to-video upload-url failed:', error);
    if (error instanceof ImageToVideoPreflightError) {
      return respErr(error.message, { status: 400 });
    }
    return respErr(error?.message || 'Failed to create upload URL', {
      status: 400,
    });
  }
}

export const Route = createFileRoute('/api/image-to-video/upload-url')({
  server: {
    handlers: { POST },
  },
});
