import { createFileRoute } from '@tanstack/react-router';

import { getAuth } from '@/core/auth';
import {
  assertGenerationId,
  getGenjutsuTaskById,
  getGenjutsuUploadBinding,
  markGenjutsuUploadFailed,
} from '@/modules/genjutsu/billing';
import { inspectGenjutsuStagingObject } from '@/modules/genjutsu/storage';
import { enforceMinIntervalRateLimit } from '@/lib/rate-limit';
import { respData, respErr } from '@/lib/resp';
import { sanitizeUploadDiagnostics } from '@/lib/upload-diagnostics';

const UPLOAD_ERROR_CODES = new Set([
  'UPLOAD_HTTP_ERROR',
  'UPLOAD_NETWORK_ERROR',
  'UPLOAD_ABORTED',
]);

async function POST({ request }: { request: Request }) {
  const limited = enforceMinIntervalRateLimit(request, {
    intervalMs: 500,
    keyPrefix: 'genjutsu-attempt-failure',
  });
  if (limited) return limited;

  try {
    const auth = getAuth();
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) return respErr('Unauthorized', { status: 401 });

    const body = await request.json().catch(() => ({}));
    const generationId = assertGenerationId(body.generationId);
    const errorCode = typeof body.errorCode === 'string' ? body.errorCode : '';
    if (!UPLOAD_ERROR_CODES.has(errorCode)) {
      return respErr('Invalid upload failure code', { status: 400 });
    }

    const fileIndex = Number(body.fileIndex);
    if (!Number.isInteger(fileIndex) || fileIndex < 0 || fileIndex > 8) {
      return respErr('Invalid upload file index', { status: 400 });
    }

    const fileType = fileIndex === 0 ? 'video' : 'image';
    const rawStatus = Number(body.httpStatus);
    const httpStatus =
      Number.isInteger(rawStatus) && rawStatus >= 400 && rawStatus <= 599
        ? rawStatus
        : null;
    const diagnostics = sanitizeUploadDiagnostics(body.diagnostics);

    let error: string;
    if (errorCode === 'UPLOAD_HTTP_ERROR') {
      error = httpStatus
        ? `Upload failed with HTTP ${httpStatus}`
        : 'Upload failed with an HTTP error';
    } else if (errorCode === 'UPLOAD_ABORTED') {
      error = `Upload was aborted while sending ${fileType} ${fileIndex}`;
    } else {
      error = `Network error while uploading ${fileType} ${fileIndex}`;
    }

    const task = await getGenjutsuTaskById({
      generationId,
      userId: session.user.id,
    });
    if (!task) return respErr('Generation attempt not found', { status: 404 });
    if (task.status !== 'initiated') {
      return respData({
        generationId,
        status: task.status,
        recorded: false,
        recovered: false,
        r2ObjectExists: null,
        r2ObjectSizeMatches: null,
        r2ObjectTypeMatches: null,
      });
    }

    const binding = getGenjutsuUploadBinding(task);
    const storageKey =
      fileIndex === 0 ? binding?.videoKey : binding?.imageKeys?.[fileIndex - 1];

    let inspection = {
      exists: false,
      sizeMatches: false,
      typeMatches: false,
      contentLength: null as number | null,
      contentType: null as string | null,
    };

    if (storageKey && binding) {
      try {
        inspection = await inspectGenjutsuStagingObject({
          userId: session.user.id,
          generationId,
          fileIndex,
          storageKey,
          expectedContentType: binding.contentTypes[fileIndex],
          expectedContentLength: binding.contentLengths[fileIndex],
        });
      } catch (inspectError) {
        console.error('genjutsu attempt-failure inspect failed:', inspectError);
      }
    }

    const canRecover =
      (errorCode === 'UPLOAD_NETWORK_ERROR' ||
        errorCode === 'UPLOAD_ABORTED') &&
      inspection.exists &&
      inspection.sizeMatches &&
      inspection.typeMatches;

    if (canRecover) {
      return respData({
        generationId,
        status: task.status,
        recorded: false,
        recovered: true,
        r2ObjectExists: true,
        r2ObjectSizeMatches: true,
        r2ObjectTypeMatches: true,
      });
    }

    const updated = await markGenjutsuUploadFailed({
      generationId,
      userId: session.user.id,
      errorCode: errorCode as
        | 'UPLOAD_HTTP_ERROR'
        | 'UPLOAD_NETWORK_ERROR'
        | 'UPLOAD_ABORTED',
      error,
      fileIndex,
      fileType,
      httpStatus,
      attemptCount: diagnostics.attemptCount ?? null,
      uploadElapsedMs: diagnostics.uploadElapsedMs ?? null,
      online: diagnostics.online ?? null,
      visibilityState: diagnostics.visibilityState ?? null,
      browser: diagnostics.browser ?? null,
      os: diagnostics.os ?? null,
      errorName: diagnostics.errorName ?? null,
      r2ObjectExists: inspection.exists,
      r2ObjectSizeMatches: inspection.sizeMatches,
      r2ObjectTypeMatches: inspection.typeMatches,
      recovered: false,
    });

    if (!updated)
      return respErr('Generation attempt not found', { status: 404 });

    return respData({
      generationId,
      status: updated.status,
      recorded: updated.status === 'failed_preflight',
      recovered: false,
      r2ObjectExists: inspection.exists,
      r2ObjectSizeMatches: inspection.sizeMatches,
      r2ObjectTypeMatches: inspection.typeMatches,
    });
  } catch (error: any) {
    console.error('genjutsu attempt-failure failed:', error);
    return respErr(error?.message || 'Failed to record upload failure', {
      status: 400,
    });
  }
}

export const Route = createFileRoute('/api/genjutsu/attempt-failure')({
  server: {
    handlers: { POST },
  },
});
