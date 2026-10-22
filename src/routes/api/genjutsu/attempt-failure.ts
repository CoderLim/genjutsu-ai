import { createFileRoute } from '@tanstack/react-router';

import { getAuth } from '@/core/auth';
import {
  assertGenerationId,
  getGenjutsuTaskById,
  getGenjutsuUploadBinding,
  markGenjutsuUploadFailed,
  recordGenjutsuUploadObservation,
} from '@/modules/genjutsu/billing';
import { inspectGenjutsuStagingObject } from '@/modules/genjutsu/storage';
import { enforceMinIntervalRateLimit } from '@/lib/rate-limit';
import { respData, respErr } from '@/lib/resp';
import { sanitizeUploadDiagnostics } from '@/lib/upload-diagnostics';

const UPLOAD_ERROR_CODES = new Set([
  'UPLOAD_HTTP_ERROR',
  'UPLOAD_NETWORK_ERROR',
  'UPLOAD_ABORTED',
  'UPLOAD_FILE_READ_ERROR',
]);

function getCloudflareRequestDiagnostics(request: Request) {
  const cf = (
    request as Request & {
      cf?: {
        country?: unknown;
        colo?: unknown;
        asn?: unknown;
      };
    }
  ).cf;

  return {
    cfCountry: typeof cf?.country === 'string' ? cf.country.slice(0, 8) : null,
    cfColo: typeof cf?.colo === 'string' ? cf.colo.slice(0, 8) : null,
    cfAsn:
      typeof cf?.asn === 'number' && Number.isInteger(cf.asn) && cf.asn >= 0
        ? cf.asn
        : null,
  };
}

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

    // Lightweight observation for successful uploads that needed retries.
    if (body.event === 'retry_succeeded') {
      const fileIndex = Number(body.fileIndex);
      if (!Number.isInteger(fileIndex) || fileIndex < 0 || fileIndex > 8) {
        return respErr('Invalid upload file index', { status: 400 });
      }
      const diagnostics = sanitizeUploadDiagnostics(body.diagnostics);
      const task = await recordGenjutsuUploadObservation({
        generationId,
        userId: session.user.id,
        observation: {
          kind: 'retry_succeeded',
          fileIndex,
          fileType: fileIndex === 0 ? 'video' : 'image',
          attemptCount: diagnostics.attemptCount ?? null,
          uploadElapsedMs: diagnostics.uploadElapsedMs ?? null,
          online: diagnostics.online ?? null,
          visibilityState: diagnostics.visibilityState ?? null,
          browser: diagnostics.browser ?? null,
          os: diagnostics.os ?? null,
        },
      });
      if (!task)
        return respErr('Generation attempt not found', { status: 404 });
      return respData({
        generationId,
        status: task.status,
        recorded: true,
        recovered: false,
        event: 'retry_succeeded',
      });
    }

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
    const edgeDiagnostics = getCloudflareRequestDiagnostics(request);

    let error: string;
    if (errorCode === 'UPLOAD_HTTP_ERROR') {
      error = httpStatus
        ? `Upload failed with HTTP ${httpStatus}`
        : 'Upload failed with an HTTP error';
    } else if (errorCode === 'UPLOAD_ABORTED') {
      error = `Upload was aborted while sending ${fileType} ${fileIndex}`;
    } else if (errorCode === 'UPLOAD_FILE_READ_ERROR') {
      error = `Could not read local ${fileType} ${fileIndex} before upload`;
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
        r2InspectionStatus: null,
        r2InspectionError: null,
      });
    }

    const binding = getGenjutsuUploadBinding(task);
    // Fixed-template products: clients only upload images at storage indices 1..N
    // (contentTypes/lengths are image-only, 0-based). Preview/homepage: index 0 =
    // video, 1+ = images (contentTypes aligned with storage index).
    const useDefaultTemplate = binding?.useDefaultTemplate === true;
    let storageKey: string | undefined;
    let expectedContentType: string | undefined;
    let expectedContentLength: number | undefined;
    if (useDefaultTemplate) {
      if (fileIndex >= 1) {
        const imageIndex = fileIndex - 1;
        storageKey = binding?.imageKeys?.[imageIndex];
        expectedContentType = binding?.contentTypes?.[imageIndex];
        expectedContentLength = binding?.contentLengths?.[imageIndex];
      }
    } else {
      storageKey =
        fileIndex === 0
          ? binding?.videoKey
          : binding?.imageKeys?.[fileIndex - 1];
      expectedContentType = binding?.contentTypes?.[fileIndex];
      expectedContentLength = binding?.contentLengths?.[fileIndex];
    }

    let inspection = {
      exists: null as boolean | null,
      sizeMatches: null as boolean | null,
      typeMatches: null as boolean | null,
      contentLength: null as number | null,
      contentType: null as string | null,
      inspectionStatus: 'skipped' as 'ok' | 'missing' | 'error' | 'skipped',
      inspectionError: null as string | null,
    };

    if (storageKey && binding) {
      try {
        inspection = await inspectGenjutsuStagingObject({
          userId: session.user.id,
          generationId,
          fileIndex,
          storageKey,
          expectedContentType,
          expectedContentLength,
        });
      } catch (inspectError) {
        console.error('genjutsu attempt-failure inspect failed:', inspectError);
        inspection = {
          exists: null,
          sizeMatches: null,
          typeMatches: null,
          contentLength: null,
          contentType: null,
          inspectionStatus: 'error',
          inspectionError:
            inspectError instanceof Error
              ? inspectError.message.slice(0, 200)
              : 'Inspection failed',
        };
      }
    }

    // FILE_READ_ERROR means the browser never sent bytes — do not HEAD-recover.
    const canRecover =
      (errorCode === 'UPLOAD_NETWORK_ERROR' ||
        errorCode === 'UPLOAD_ABORTED') &&
      inspection.exists === true &&
      inspection.sizeMatches === true &&
      inspection.typeMatches === true;

    if (canRecover) {
      await recordGenjutsuUploadObservation({
        generationId,
        userId: session.user.id,
        observation: {
          kind: 'head_recovered',
          fileIndex,
          fileType,
          attemptCount: diagnostics.attemptCount ?? null,
          uploadElapsedMs: diagnostics.uploadElapsedMs ?? null,
          online: diagnostics.online ?? null,
          visibilityState: diagnostics.visibilityState ?? null,
          browser: diagnostics.browser ?? null,
          os: diagnostics.os ?? null,
          errorName: diagnostics.errorName ?? null,
          r2ObjectExists: true,
          r2ObjectSizeMatches: true,
          r2ObjectTypeMatches: true,
          r2InspectionStatus: 'ok',
          recovered: true,
        },
      });

      return respData({
        generationId,
        status: task.status,
        recorded: true,
        recovered: true,
        r2ObjectExists: true,
        r2ObjectSizeMatches: true,
        r2ObjectTypeMatches: true,
        r2InspectionStatus: 'ok',
        r2InspectionError: null,
      });
    }

    const updated = await markGenjutsuUploadFailed({
      generationId,
      userId: session.user.id,
      errorCode: errorCode as
        | 'UPLOAD_HTTP_ERROR'
        | 'UPLOAD_NETWORK_ERROR'
        | 'UPLOAD_ABORTED'
        | 'UPLOAD_FILE_READ_ERROR',
      error,
      fileIndex,
      fileType,
      httpStatus,
      attemptCount: diagnostics.attemptCount ?? null,
      uploadElapsedMs: diagnostics.uploadElapsedMs ?? null,
      online: diagnostics.online ?? null,
      visibilityState: diagnostics.visibilityState ?? null,
      browser: diagnostics.browser ?? null,
      browserMajor: diagnostics.browserMajor ?? null,
      os: diagnostics.os ?? null,
      isWebView: diagnostics.isWebView ?? null,
      inAppBrowser: diagnostics.inAppBrowser ?? null,
      effectiveType: diagnostics.effectiveType ?? null,
      rttMs: diagnostics.rttMs ?? null,
      downlinkMbps: diagnostics.downlinkMbps ?? null,
      origin: diagnostics.origin ?? null,
      uploadHost: diagnostics.uploadHost ?? null,
      errorName: diagnostics.errorName ?? null,
      errorMessage: diagnostics.errorMessage ?? null,
      attempts: diagnostics.attempts ?? [],
      uploadMethod: diagnostics.uploadMethod ?? null,
      filePreparationMode: diagnostics.filePreparationMode ?? null,
      filePreparationResult: diagnostics.filePreparationResult ?? null,
      fileReadError: diagnostics.fileReadError ?? null,
      fileSizeBucket: diagnostics.fileSizeBucket ?? null,
      // This request is attempt-failure reporting, not the PUT itself.
      reportKind: 'attempt_failure',
      cfCountry: edgeDiagnostics.cfCountry,
      cfColo: edgeDiagnostics.cfColo,
      cfAsn: edgeDiagnostics.cfAsn,
      r2ObjectExists: inspection.exists,
      r2ObjectSizeMatches: inspection.sizeMatches,
      r2ObjectTypeMatches: inspection.typeMatches,
      r2InspectionStatus: inspection.inspectionStatus,
      r2InspectionError: inspection.inspectionError,
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
      r2InspectionStatus: inspection.inspectionStatus,
      r2InspectionError: inspection.inspectionError,
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
