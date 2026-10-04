export const UPLOAD_RETRY_DELAYS_MS = [0, 1_000, 2_000] as const;

const UPLOAD_TIMEOUT_MIN_MS = 60_000;
const UPLOAD_TIMEOUT_MAX_MS = 8 * 60_000;
const UPLOAD_TIMEOUT_BASE_MS = 30_000;
const UPLOAD_TIMEOUT_ASSUMED_BYTES_PER_SECOND = 256 * 1024;

export function getUploadPutTimeoutMs(fileSizeBytes: number) {
  if (!Number.isFinite(fileSizeBytes) || fileSizeBytes <= 0) {
    return UPLOAD_TIMEOUT_MIN_MS;
  }

  const transferMs = Math.ceil(
    (fileSizeBytes / UPLOAD_TIMEOUT_ASSUMED_BYTES_PER_SECOND) * 1_000
  );
  return Math.min(
    UPLOAD_TIMEOUT_MAX_MS,
    Math.max(UPLOAD_TIMEOUT_MIN_MS, UPLOAD_TIMEOUT_BASE_MS + transferMs)
  );
}

export type UploadClientDiagnostics = {
  attemptCount: number;
  uploadElapsedMs: number;
  online: boolean | null;
  visibilityState: string | null;
  browser: string | null;
  os: string | null;
  errorName: string | null;
};

const BROWSERS = [
  'Edge',
  'Opera',
  'Chrome',
  'Firefox',
  'Safari',
  'Samsung',
  'Other',
] as const;

const OPERATING_SYSTEMS = [
  'iOS',
  'Android',
  'Windows',
  'macOS',
  'Linux',
  'ChromeOS',
  'Other',
] as const;

const VISIBILITY_STATES = new Set(['visible', 'hidden', 'prerender']);

export function classifyClientEnvironment(userAgent: string): {
  browser: (typeof BROWSERS)[number];
  os: (typeof OPERATING_SYSTEMS)[number];
} {
  const ua = userAgent || '';

  let os: (typeof OPERATING_SYSTEMS)[number] = 'Other';
  if (/iPhone|iPad|iPod/i.test(ua)) os = 'iOS';
  else if (/Android/i.test(ua)) os = 'Android';
  else if (/CrOS/i.test(ua)) os = 'ChromeOS';
  else if (/Windows/i.test(ua)) os = 'Windows';
  else if (/Mac OS X|Macintosh/i.test(ua)) os = 'macOS';
  else if (/Linux/i.test(ua)) os = 'Linux';

  let browser: (typeof BROWSERS)[number] = 'Other';
  if (/Edg\//i.test(ua) || /EdgiOS\//i.test(ua)) browser = 'Edge';
  else if (/OPR\/|Opera|OPiOS\//i.test(ua)) browser = 'Opera';
  else if (/SamsungBrowser/i.test(ua)) browser = 'Samsung';
  else if (/Firefox\/|FxiOS\//i.test(ua)) browser = 'Firefox';
  else if (
    /CriOS\//i.test(ua) ||
    (/Chrome\//i.test(ua) && !/Chromium/i.test(ua))
  )
    browser = 'Chrome';
  else if (/Safari\//i.test(ua)) browser = 'Safari';

  return { browser, os };
}

function getHttpStatus(cause: unknown): number | null {
  if (
    cause instanceof Error &&
    cause.name === 'ApiError' &&
    'code' in cause &&
    typeof (cause as { code?: unknown }).code === 'number'
  ) {
    return (cause as { code: number }).code;
  }
  return null;
}

export function isRetryableUploadFailure(cause: unknown): boolean {
  const status = getHttpStatus(cause);
  if (status != null) {
    return status === 408 || status === 429 || (status >= 500 && status <= 599);
  }

  if (cause instanceof Error && cause.name === 'UploadTimeoutError') {
    return true;
  }

  if (cause instanceof Error && cause.name === 'AbortError') {
    return false;
  }

  // fetch network/CORS failures typically surface as TypeError("Failed to fetch")
  return true;
}

export function collectUploadDiagnostics(params: {
  attemptCount: number;
  uploadElapsedMs: number;
  cause?: unknown;
}): UploadClientDiagnostics {
  const env =
    typeof navigator !== 'undefined'
      ? classifyClientEnvironment(navigator.userAgent || '')
      : { browser: null, os: null };

  const visibilityState =
    typeof document !== 'undefined' &&
    VISIBILITY_STATES.has(document.visibilityState)
      ? document.visibilityState
      : null;

  const online =
    typeof navigator !== 'undefined' && typeof navigator.onLine === 'boolean'
      ? navigator.onLine
      : null;

  const errorName =
    params.cause instanceof Error
      ? params.cause.name.slice(0, 64)
      : typeof params.cause === 'string'
        ? 'StringError'
        : params.cause === undefined
          ? null
          : 'UnknownError';

  return {
    attemptCount: params.attemptCount,
    uploadElapsedMs: params.uploadElapsedMs,
    online,
    visibilityState,
    browser: env.browser,
    os: env.os,
    errorName,
  };
}

export function sanitizeUploadDiagnostics(
  raw: unknown
): Partial<UploadClientDiagnostics> {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};

  const input = raw as Record<string, unknown>;
  const out: Partial<UploadClientDiagnostics> = {};

  const attemptCount = Number(input.attemptCount);
  if (
    Number.isInteger(attemptCount) &&
    attemptCount >= 1 &&
    attemptCount <= 10
  ) {
    out.attemptCount = attemptCount;
  }

  const uploadElapsedMs = Number(input.uploadElapsedMs);
  if (
    Number.isInteger(uploadElapsedMs) &&
    uploadElapsedMs >= 0 &&
    uploadElapsedMs <= 600_000
  ) {
    out.uploadElapsedMs = uploadElapsedMs;
  }

  if (typeof input.online === 'boolean') {
    out.online = input.online;
  }

  if (
    typeof input.visibilityState === 'string' &&
    VISIBILITY_STATES.has(input.visibilityState)
  ) {
    out.visibilityState = input.visibilityState;
  }

  if (
    typeof input.browser === 'string' &&
    (BROWSERS as readonly string[]).includes(input.browser)
  ) {
    out.browser = input.browser;
  }

  if (
    typeof input.os === 'string' &&
    (OPERATING_SYSTEMS as readonly string[]).includes(input.os)
  ) {
    out.os = input.os;
  }

  if (
    typeof input.errorName === 'string' &&
    /^[A-Za-z][A-Za-z0-9._-]{0,63}$/.test(input.errorName)
  ) {
    out.errorName = input.errorName;
  }

  return out;
}
