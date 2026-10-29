import { createFileRoute } from '@tanstack/react-router';

import { getAuth } from '@/core/auth';
import { assertVideoFaceSwapGenerationId } from '@/modules/video-face-swap/assert';
import { ensureVideoFaceSwapInitiatedTask } from '@/modules/video-face-swap/billing';
import { VIDEO_FACE_SWAP_CONSENT_VERSION } from '@/modules/video-face-swap/constants';
import {
  assertVideoFaceSwapImageUploadSize,
  assertVideoFaceSwapVideoUploadSize,
  createVideoFaceSwapProxyUploadDescriptor,
  getVideoFaceSwapInputKey,
} from '@/modules/video-face-swap/storage';
import { enforceMinIntervalRateLimit } from '@/lib/rate-limit';
import { respData, respErr } from '@/lib/resp';

async function POST({ request }: { request: Request }) {
  const limited = enforceMinIntervalRateLimit(request, {
    intervalMs: 750,
    keyPrefix: 'video-face-swap-upload-url',
  });
  if (limited) return limited;

  try {
    const auth = getAuth();
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) return respErr('Unauthorized', { status: 401 });

    const body = await request.json().catch(() => ({}));
    const generationId = assertVideoFaceSwapGenerationId(body.generationId);

    const videoContentType =
      typeof body.videoContentType === 'string' ? body.videoContentType : '';
    const imageContentType =
      typeof body.imageContentType === 'string' ? body.imageContentType : '';
    const videoContentLength = Number(body.videoContentLength);
    const imageContentLength = Number(body.imageContentLength);

    if (
      !videoContentType ||
      !imageContentType ||
      !Number.isFinite(videoContentLength) ||
      !Number.isFinite(imageContentLength)
    ) {
      return respErr('Provide video and image content types and lengths', {
        status: 400,
      });
    }

    assertVideoFaceSwapVideoUploadSize(videoContentLength);
    assertVideoFaceSwapImageUploadSize(imageContentLength);

    const video = getVideoFaceSwapInputKey({
      userId: session.user.id,
      generationId,
      role: 'video',
      contentType: videoContentType,
    });
    const image = getVideoFaceSwapInputKey({
      userId: session.user.id,
      generationId,
      role: 'image',
      contentType: imageContentType,
    });

    const consentVersion =
      typeof body.consentVersion === 'string' && body.consentVersion.trim()
        ? body.consentVersion.trim()
        : VIDEO_FACE_SWAP_CONSENT_VERSION;
    if (consentVersion !== VIDEO_FACE_SWAP_CONSENT_VERSION) {
      return respErr('Consent version is outdated; refresh and try again', {
        status: 400,
      });
    }

    await ensureVideoFaceSwapInitiatedTask({
      generationId,
      userId: session.user.id,
      stagingVideoKey: video.key,
      stagingImageKey: image.key,
      videoContentType: video.contentType,
      imageContentType: image.contentType,
      videoContentLength,
      imageContentLength,
      consentVersion,
    });

    const videoUpload = createVideoFaceSwapProxyUploadDescriptor(request, {
      userId: session.user.id,
      generationId,
      role: 'video',
      contentType: video.contentType,
      contentLength: videoContentLength,
    });
    const imageUpload = createVideoFaceSwapProxyUploadDescriptor(request, {
      userId: session.user.id,
      generationId,
      role: 'image',
      contentType: image.contentType,
      contentLength: imageContentLength,
    });

    return respData({
      uploads: [videoUpload, imageUpload],
      consentVersion,
    });
  } catch (error: any) {
    console.error('video-face-swap upload-url failed:', error);
    return respErr(error?.message || 'Failed to create upload URL', {
      status: 400,
    });
  }
}

export const Route = createFileRoute('/api/video-face-swap/upload-url')({
  server: {
    handlers: { POST },
  },
});
