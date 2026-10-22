import { classifyClientEnvironment } from '@/lib/upload-diagnostics';
import { reportUploadPreparationTelemetry } from '@/lib/upload-prep-telemetry';

/**
 * Android Chrome image materialize — build-time client flag.
 * Default OFF when unset (opt-in grayscale). Static property access so Vite
 * can replace it in production bundles.
 */
export const MAX_REFERENCE_IMAGE_BYTES_DEFAULT = 12 * 1024 * 1024;

export type FilePreparationMode = 'original' | 'materialized';
export type FilePreparationResult = 'success' | 'failed' | 'skipped';

export type FilePreparationMeta = {
  mode: FilePreparationMode;
  result: FilePreparationResult;
  fileReadError: string | null;
  fileSizeBucket: string | null;
};

export class UploadFileReadError extends Error {
  constructor(
    message: string,
    public cause?: unknown
  ) {
    super(message);
    this.name = 'UploadFileReadError';
  }
}

const preparationByFile = new WeakMap<File, FilePreparationMeta>();

export function attachFilePreparation(
  file: File,
  meta: FilePreparationMeta
): void {
  preparationByFile.set(file, meta);
}

export function getFilePreparation(file: File): FilePreparationMeta | null {
  return preparationByFile.get(file) ?? null;
}

export function fileSizeBucket(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) return 'unknown';
  if (bytes < 256 * 1024) return '0-256KB';
  if (bytes < 1024 * 1024) return '256KB-1MB';
  if (bytes < 3 * 1024 * 1024) return '1-3MB';
  if (bytes < 6 * 1024 * 1024) return '3-6MB';
  if (bytes < 12 * 1024 * 1024) return '6-12MB';
  return '12MB+';
}

/** Static env read — Vite inlines this at build time. Default OFF. */
export function isAndroidChromeMaterializeEnabled(): boolean {
  // Keep the VITE_* property as a static access so Vite can replace it.
  // Optional-chain `env` for Node unit tests where import.meta.env is undefined.
  const raw = import.meta.env?.VITE_ANDROID_CHROME_MATERIALIZE_UPLOADS;
  if (raw == null || raw === '') return false;
  const normalized = String(raw).trim().toLowerCase();
  if (normalized === '0' || normalized === 'false' || normalized === 'off') {
    return false;
  }
  return normalized === '1' || normalized === 'true' || normalized === 'on';
}

export function isAndroidChrome(userAgent?: string): boolean {
  const ua =
    userAgent ??
    (typeof navigator !== 'undefined' ? navigator.userAgent || '' : '');
  if (!ua) return false;
  const env = classifyClientEnvironment(ua);
  // Samsung Internet and pure WebViews are out of this grayscale.
  return env.os === 'Android' && env.browser === 'Chrome' && !env.isWebView;
}

export function shouldMaterializeReferenceImages(userAgent?: string): boolean {
  return isAndroidChromeMaterializeEnabled() && isAndroidChrome(userAgent);
}

function safeFileSize(file: File): number | null {
  try {
    const size = file.size;
    return Number.isFinite(size) ? size : null;
  } catch {
    return null;
  }
}

function safeFileType(file: File): string {
  try {
    return file.type || 'application/octet-stream';
  } catch {
    return 'application/octet-stream';
  }
}

function safeFileName(file: File): string {
  try {
    return file.name || 'image.jpg';
  } catch {
    return 'image.jpg';
  }
}

/**
 * Re-read image bytes into a fresh File so later PUT does not depend on a
 * long-lived picker File handle (Android Chrome / ERR_UPLOAD_FILE_CHANGED class).
 * Does not change pixels, resolution, or quality.
 */
export async function materializeImageFile(file: File): Promise<File> {
  let buffer: ArrayBuffer;
  try {
    buffer = await file.arrayBuffer();
  } catch (cause) {
    throw new UploadFileReadError(
      'Could not read the selected image from this device',
      cause
    );
  }

  if (buffer.byteLength <= 0) {
    throw new UploadFileReadError(
      'Could not read the selected image from this device'
    );
  }

  try {
    return new File([buffer], safeFileName(file), {
      type: safeFileType(file),
      lastModified: (() => {
        try {
          return file.lastModified;
        } catch {
          return Date.now();
        }
      })(),
    });
  } catch (cause) {
    throw new UploadFileReadError(
      'Could not prepare the selected image for upload',
      cause
    );
  }
}

export type PrepareReferenceImageResult = {
  file: File;
  meta: FilePreparationMeta;
};

/**
 * Prepare a reference image at selection time.
 * Non-Android Chrome / flag off: returns the original File (skipped).
 * Android Chrome + flag on: materializes into an independent File.
 *
 * `forceMaterialize` is test-only / explicit override; production callers omit it.
 */
export async function prepareReferenceImageFile(params: {
  file: File;
  maxBytes?: number;
  userAgent?: string;
  forceMaterialize?: boolean;
  product?: string;
}): Promise<PrepareReferenceImageResult> {
  const maxBytes = params.maxBytes ?? MAX_REFERENCE_IMAGE_BYTES_DEFAULT;
  const product = params.product || 'genjutsu';

  let size: number | null;
  try {
    size = safeFileSize(params.file);
  } catch {
    size = null;
  }

  if (size == null) {
    const err = new UploadFileReadError(
      'Could not read the selected image from this device'
    );
    reportUploadPreparationTelemetry({
      result: 'failed',
      preparationMode: 'materialized',
      fileSizeBucket: null,
      product,
      cause: err,
    });
    throw err;
  }

  const sizeBucket = fileSizeBucket(size);

  if (size <= 0 || size > maxBytes) {
    const err = new UploadFileReadError(
      `Image must be ${Math.floor(maxBytes / (1024 * 1024))} MB or smaller`
    );
    reportUploadPreparationTelemetry({
      result: 'failed',
      preparationMode: 'original',
      fileSizeBucket: sizeBucket,
      product,
      cause: err,
    });
    throw err;
  }

  const shouldMaterialize =
    params.forceMaterialize === true ||
    (params.forceMaterialize !== false &&
      shouldMaterializeReferenceImages(params.userAgent));

  if (!shouldMaterialize) {
    const meta: FilePreparationMeta = {
      mode: 'original',
      result: 'skipped',
      fileReadError: null,
      fileSizeBucket: sizeBucket,
    };
    attachFilePreparation(params.file, meta);
    return { file: params.file, meta };
  }

  try {
    const next = await materializeImageFile(params.file);
    // Re-check materialized byte length so the 12MB gate cannot be bypassed.
    if (next.size <= 0 || next.size > maxBytes) {
      throw new UploadFileReadError(
        `Image must be ${Math.floor(maxBytes / (1024 * 1024))} MB or smaller`
      );
    }
    const meta: FilePreparationMeta = {
      mode: 'materialized',
      result: 'success',
      fileReadError: null,
      fileSizeBucket: fileSizeBucket(next.size),
    };
    attachFilePreparation(next, meta);
    reportUploadPreparationTelemetry({
      result: 'success',
      preparationMode: 'materialized',
      fileSizeBucket: meta.fileSizeBucket,
      product,
    });
    return { file: next, meta };
  } catch (cause) {
    const readMessage =
      cause instanceof UploadFileReadError
        ? cause.message
        : cause instanceof Error
          ? cause.message
          : 'file_read_failed';
    const err =
      cause instanceof UploadFileReadError
        ? cause
        : new UploadFileReadError(readMessage, cause);
    reportUploadPreparationTelemetry({
      result: 'failed',
      preparationMode: 'materialized',
      fileSizeBucket: sizeBucket,
      product,
      cause: err,
    });
    throw err;
  }
}
