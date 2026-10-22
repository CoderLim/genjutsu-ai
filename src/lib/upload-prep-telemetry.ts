import { apiPost } from '@/lib/api-client';
import { classifyClientEnvironment } from '@/lib/upload-diagnostics';
import type {
  FilePreparationMode,
  FilePreparationResult,
} from '@/lib/upload-file-preparation';

/** Sample rate for successful prepares (failures always reported). */
export const UPLOAD_PREP_SUCCESS_SAMPLE_RATE = 0.1;

export type UploadPrepErrorCode =
  | 'file_read_error'
  | 'file_size_out_of_range'
  | 'file_prepare_error'
  | 'unknown';

export type UploadPrepTelemetryPayload = {
  event: 'upload_file_preparation';
  result: FilePreparationResult;
  preparationMode: FilePreparationMode;
  errorCode: UploadPrepErrorCode | null;
  fileSizeBucket: string | null;
  product: string;
  browser: string | null;
  browserMajor: number | null;
  os: string | null;
  isWebView: boolean | null;
  sampled: boolean;
};

function classifyPrepErrorCode(cause: unknown): UploadPrepErrorCode {
  if (!(cause instanceof Error)) return 'unknown';
  const msg = cause.message.toLowerCase();
  if (msg.includes('must be') && msg.includes('mb')) {
    return 'file_size_out_of_range';
  }
  if (
    cause.name === 'UploadFileReadError' ||
    msg.includes('could not read') ||
    msg.includes('could not prepare')
  ) {
    return msg.includes('prepare') ? 'file_prepare_error' : 'file_read_error';
  }
  return 'unknown';
}

function shouldSampleSuccess(): boolean {
  return Math.random() < UPLOAD_PREP_SUCCESS_SAMPLE_RATE;
}

/**
 * Fire-and-forget client diagnostic for image prepare outcomes.
 * Never blocks UI; never creates a generation attempt.
 */
export function reportUploadPreparationTelemetry(params: {
  result: FilePreparationResult;
  preparationMode: FilePreparationMode;
  fileSizeBucket: string | null;
  product?: string;
  cause?: unknown;
}): void {
  const isFailure = params.result === 'failed';
  const sampled = !isFailure && params.result === 'success';
  if (sampled && !shouldSampleSuccess()) return;
  // "skipped" (non-Android / flag off) is intentional silence — not sampled.

  if (params.result === 'skipped') return;

  const env =
    typeof navigator !== 'undefined'
      ? classifyClientEnvironment(navigator.userAgent || '')
      : null;

  const payload: UploadPrepTelemetryPayload = {
    event: 'upload_file_preparation',
    result: params.result,
    preparationMode: params.preparationMode,
    errorCode: isFailure ? classifyPrepErrorCode(params.cause) : null,
    fileSizeBucket: params.fileSizeBucket,
    product: params.product || 'genjutsu',
    browser: env?.browser ?? null,
    browserMajor: env?.browserMajor ?? null,
    os: env?.os ?? null,
    isWebView: env?.isWebView ?? null,
    sampled: sampled || params.result === 'success',
  };

  void apiPost('/api/genjutsu/upload-prep-event', payload).catch(
    () => undefined
  );
}
