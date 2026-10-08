import { createFileRoute } from '@tanstack/react-router';

import { getAuth } from '@/core/auth';
import {
  assertGenerationId,
  getGenjutsuTaskById,
  getGenjutsuUploadBinding,
} from '@/modules/genjutsu/billing';
import {
  assertGenjutsuStagingKeyOwned,
  GENJUTSU_PROXY_UPLOAD_MAX_BYTES,
  GenjutsuR2BindingMissingError,
  putGenjutsuStagingObject,
  statusForGenjutsuProxyUploadError,
} from '@/modules/genjutsu/storage';
import { enforceMinIntervalRateLimit } from '@/lib/rate-limit';

function errorResponse(message: string, status: number) {
  return new Response(message, {
    status,
    headers: { 'Cache-Control': 'no-store' },
  });
}

async function PUT({
  request,
  params,
}: {
  request: Request;
  params: { generationId: string; fileIndex: string };
}) {
  const limited = enforceMinIntervalRateLimit(request, {
    intervalMs: 500,
    keyPrefix: 'genjutsu-upload-proxy',
  });
  if (limited) return limited;

  try {
    const auth = getAuth();
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) return errorResponse('Unauthorized', 401);

    let generationId: string;
    try {
      generationId = assertGenerationId(params.generationId);
    } catch {
      return errorResponse('Invalid generation ID', 400);
    }

    const fileIndex = Number(params.fileIndex);
    if (!Number.isInteger(fileIndex) || fileIndex < 0 || fileIndex > 8) {
      return errorResponse('Invalid file index', 400);
    }

    const task = await getGenjutsuTaskById({
      generationId,
      userId: session.user.id,
    });
    if (!task || task.status !== 'initiated') {
      return errorResponse('Generation attempt not found', 404);
    }

    const binding = getGenjutsuUploadBinding(task);
    if (!binding) return errorResponse('Upload not prepared', 400);

    const storageKey =
      fileIndex === 0 ? binding.videoKey : binding.imageKeys[fileIndex - 1];
    const expectedType = binding.contentTypes[fileIndex]
      ?.split(';', 1)[0]
      ?.trim()
      .toLowerCase();
    const expectedLength = binding.contentLengths[fileIndex];

    if (
      !storageKey ||
      !expectedType ||
      !Number.isSafeInteger(expectedLength) ||
      expectedLength <= 0
    ) {
      return errorResponse('Upload binding incomplete', 400);
    }

    if (expectedLength > GENJUTSU_PROXY_UPLOAD_MAX_BYTES) {
      return errorResponse('File too large for proxy upload', 413);
    }

    try {
      assertGenjutsuStagingKeyOwned({
        userId: session.user.id,
        generationId,
        fileIndex,
        key: storageKey,
      });
    } catch (error: any) {
      return errorResponse(error?.message || 'Invalid storage key', 400);
    }

    const contentType =
      request.headers
        .get('content-type')
        ?.split(';', 1)[0]
        ?.trim()
        .toLowerCase() || '';
    if (contentType !== expectedType) {
      return errorResponse('Content-Type mismatch', 400);
    }

    const contentLengthHeader = request.headers.get('content-length');
    const contentLength = contentLengthHeader
      ? Number(contentLengthHeader)
      : NaN;
    if (
      !Number.isSafeInteger(contentLength) ||
      contentLength !== expectedLength
    ) {
      return errorResponse('Content-Length mismatch', 400);
    }

    if (!request.body) return errorResponse('Missing body', 400);

    try {
      await putGenjutsuStagingObject({
        key: storageKey,
        body: request.body,
        contentType: expectedType,
        contentLength,
      });
    } catch (putError: any) {
      console.error('genjutsu proxy upload put failed:', putError);
      const status = statusForGenjutsuProxyUploadError(putError);
      return errorResponse(
        putError instanceof GenjutsuR2BindingMissingError
          ? putError.message
          : putError?.message || 'Upload failed',
        status
      );
    }

    return new Response(null, {
      status: 204,
      headers: { 'Cache-Control': 'no-store' },
    });
  } catch (error: any) {
    console.error('genjutsu proxy upload failed:', error);
    // Auth/DB/unexpected — treat as retryable server error, not client 400.
    return errorResponse(error?.message || 'Upload failed', 500);
  }
}

export const Route = createFileRoute(
  '/api/genjutsu/upload/$generationId/$fileIndex'
)({
  server: {
    handlers: { PUT },
  },
});
