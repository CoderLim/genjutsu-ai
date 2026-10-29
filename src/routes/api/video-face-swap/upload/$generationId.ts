import { createFileRoute } from '@tanstack/react-router';

import { getAuth } from '@/core/auth';
import { assertVideoFaceSwapGenerationId } from '@/modules/video-face-swap/assert';
import {
  getVideoFaceSwapTaskById,
  getVideoFaceSwapUploadBinding,
} from '@/modules/video-face-swap/billing';
import {
  assertVideoFaceSwapStagingKeyOwned,
  putVideoFaceSwapStagingObject,
  statusForVideoFaceSwapProxyUploadError,
  VideoFaceSwapR2BindingMissingError,
  type VideoFaceSwapUploadRole,
} from '@/modules/video-face-swap/storage';
import { enforceMinIntervalRateLimit } from '@/lib/rate-limit';

function errorResponse(message: string, status: number) {
  return new Response(message, {
    status,
    headers: { 'Cache-Control': 'no-store' },
  });
}

function parseRole(value: string | null): VideoFaceSwapUploadRole | null {
  if (value === 'video' || value === 'image') return value;
  return null;
}

async function PUT({
  request,
  params,
}: {
  request: Request;
  params: { generationId: string };
}) {
  const limited = enforceMinIntervalRateLimit(request, {
    intervalMs: 500,
    keyPrefix: 'video-face-swap-upload-proxy',
  });
  if (limited) return limited;

  try {
    const auth = getAuth();
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) return errorResponse('Unauthorized', 401);

    const generationId = assertVideoFaceSwapGenerationId(params.generationId);
    const role = parseRole(new URL(request.url).searchParams.get('role'));
    if (!role) return errorResponse('Invalid upload role', 400);

    const task = await getVideoFaceSwapTaskById({
      generationId,
      userId: session.user.id,
    });
    if (!task || task.status !== 'initiated') {
      return errorResponse('Generation attempt not found', 404);
    }

    const binding = getVideoFaceSwapUploadBinding(task);
    if (!binding) return errorResponse('Upload not prepared', 400);

    const stagingKey =
      role === 'video' ? binding.stagingVideoKey : binding.stagingImageKey;
    const contentType =
      role === 'video' ? binding.videoContentType : binding.imageContentType;
    const contentLength =
      role === 'video'
        ? binding.videoContentLength
        : binding.imageContentLength;

    assertVideoFaceSwapStagingKeyOwned({
      userId: session.user.id,
      generationId,
      role,
      key: stagingKey,
    });

    const requestType =
      request.headers
        .get('content-type')
        ?.split(';', 1)[0]
        ?.trim()
        .toLowerCase() || '';
    if (requestType && requestType !== contentType) {
      return errorResponse('Content-Type does not match upload binding', 400);
    }

    if (!request.body) return errorResponse('Missing body', 400);

    await putVideoFaceSwapStagingObject({
      key: stagingKey,
      body: request.body,
      contentType,
      contentLength,
      role,
    });

    return new Response(null, {
      status: 204,
      headers: { 'Cache-Control': 'no-store' },
    });
  } catch (error: unknown) {
    console.error('video-face-swap proxy upload failed:', error);
    if (error instanceof VideoFaceSwapR2BindingMissingError) {
      return errorResponse(error.message, error.statusCode);
    }
    const message =
      error instanceof Error ? error.message : 'Failed to upload media';
    return errorResponse(
      message,
      statusForVideoFaceSwapProxyUploadError(error)
    );
  }
}

export const Route = createFileRoute(
  '/api/video-face-swap/upload/$generationId'
)({
  server: {
    handlers: { PUT },
  },
});
