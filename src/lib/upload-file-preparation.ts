import { classifyClientEnvironment } from '@/lib/upload-diagnostics';

/** Default ON for Android Chrome; set `VITE_ANDROID_CHROME_MATERIALIZE_UPLOADS=false` to roll back. */
const MATERIALIZE_FLAG_ENV = 'VITE_ANDROID_CHROME_MATERIALIZE_UPLOADS';

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

function readMaterializeFlag(): boolean {
  const raw =
    (import.meta as ImportMeta & { env?: Record<string, string | undefined> })
      .env?.[MATERIALIZE_FLAG_ENV] ??
    (typeof process !== 'undefined'
      ? process.env?.[MATERIALIZE_FLAG_ENV]
      : undefined);
  if (raw == null || raw === '') return true;
  return raw !== '0' && raw.toLowerCase() !== 'false' && raw !== 'off';
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
  return readMaterializeFlag() && isAndroidChrome(userAgent);
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
    return new File([buffer], file.name || 'image.jpg', {
      type: file.type || 'application/octet-stream',
      lastModified: file.lastModified,
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
 * Non-Android Chrome: returns the original File (skipped).
 * Android Chrome (flag on): materializes into an independent File.
 */
export async function prepareReferenceImageFile(params: {
  file: File;
  maxBytes?: number;
  userAgent?: string;
}): Promise<PrepareReferenceImageResult> {
  const maxBytes = params.maxBytes ?? MAX_REFERENCE_IMAGE_BYTES_DEFAULT;
  const sizeBucket = fileSizeBucket(params.file.size);

  if (params.file.size <= 0 || params.file.size > maxBytes) {
    const meta: FilePreparationMeta = {
      mode: 'original',
      result: 'failed',
      fileReadError: 'file_size_out_of_range',
      fileSizeBucket: sizeBucket,
    };
    throw new UploadFileReadError(
      `Image must be ${Math.floor(maxBytes / (1024 * 1024))} MB or smaller`
    );
  }

  if (!shouldMaterializeReferenceImages(params.userAgent)) {
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
    const meta: FilePreparationMeta = {
      mode: 'materialized',
      result: 'success',
      fileReadError: null,
      fileSizeBucket: sizeBucket,
    };
    attachFilePreparation(next, meta);
    return { file: next, meta };
  } catch (cause) {
    const readMessage =
      cause instanceof UploadFileReadError
        ? cause.message
        : cause instanceof Error
          ? cause.message
          : 'file_read_failed';
    const meta: FilePreparationMeta = {
      mode: 'materialized',
      result: 'failed',
      fileReadError: readMessage.replace(/[\r\n\t]+/g, ' ').slice(0, 200),
      fileSizeBucket: sizeBucket,
    };
    // Do not attach to the original File — callers must not upload it.
    if (cause instanceof UploadFileReadError) {
      throw cause;
    }
    throw new UploadFileReadError(readMessage, cause);
  }
}
