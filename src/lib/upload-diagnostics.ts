export const UPLOAD_RETRY_DELAYS_MS = [0, 1_000, 2_000] as const;

const UPLOAD_TIMEOUT_MIN_MS = 60_000;
const UPLOAD_TIMEOUT_MAX_MS = 8 * 60_000;
const UPLOAD_TIMEOUT_BASE_MS = 30_000;
const UPLOAD_TIMEOUT_ASSUMED_BYTES_PER_SECOND = 256 * 1024;
const MAX_ERROR_MESSAGE_LENGTH = 200;
const MAX_UPLOAD_ATTEMPTS_RECORDED = 10;

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

export type UploadAttemptDiagnostic = {
  attempt: number;
  elapsedMs: number;
  errorName: string | null;
  errorMessage: string | null;
  httpStatus: number | null;
};

export type UploadClientDiagnostics = {
  attemptCount: number;
  uploadElapsedMs: number;
  online: boolean | null;
  visibilityState: string | null;
  browser: string | null;
  browserMajor: number | null;
  os: string | null;
  isWebView: boolean | null;
  inAppBrowser: string | null;
  effectiveType: string | null;
  rttMs: number | null;
  downlinkMbps: number | null;
  origin: string | null;
  uploadHost: string | null;
  errorName: string | null;
  errorMessage: string | null;
  attempts: UploadAttemptDiagnostic[];
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

const IN_APP_BROWSERS = ['instagram', 'facebook', 'tiktok', 'line'] as const;

const VISIBILITY_STATES = new Set(['visible', 'hidden', 'prerender']);
const EFFECTIVE_TYPES = new Set(['slow-2g', '2g', '3g', '4g']);

function truncateErrorMessage(value: string) {
  return value.replace(/[\r\n\t]+/g, ' ').slice(0, MAX_ERROR_MESSAGE_LENGTH);
}

function getBrowserMajor(
  userAgent: string,
  browser: (typeof BROWSERS)[number]
): number | null {
  const pattern =
    browser === 'Edge'
      ? /Edg\/(\d+)/i
      : browser === 'Opera'
        ? /(?:OPR|Opera)\/(\d+)/i
        : browser === 'Samsung'
          ? /SamsungBrowser\/(\d+)/i
          : browser === 'Firefox'
            ? /(?:Firefox|FxiOS)\/(\d+)/i
            : browser === 'Chrome'
              ? /(?:Chrome|CriOS)\/(\d+)/i
              : browser === 'Safari'
                ? /Version\/(\d+)/i
                : null;
  if (!pattern) return null;
  const match = userAgent.match(pattern);
  if (!match) return null;
  const major = Number(match[1]);
  return Number.isInteger(major) && major > 0 && major < 1_000 ? major : null;
}

function classifyInAppBrowser(userAgent: string): string | null {
  if (/Instagram/i.test(userAgent)) return 'instagram';
  if (/FBAN|FBAV/i.test(userAgent)) return 'facebook';
  if (/TikTok/i.test(userAgent)) return 'tiktok';
  if (/\bLine\//i.test(userAgent)) return 'line';
  return null;
}

function isAndroidWebView(userAgent: string): boolean {
  if (!/Android/i.test(userAgent)) return false;
  return (
    /(?:^|[;\s])wv(?:[;\s)]|$)/i.test(userAgent) ||
    /Version\/4\.0.*Chrome\//i.test(userAgent)
  );
}

export function classifyClientEnvironment(userAgent: string): {
  browser: (typeof BROWSERS)[number];
  browserMajor: number | null;
  os: (typeof OPERATING_SYSTEMS)[number];
  isWebView: boolean;
  inAppBrowser: string | null;
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

  return {
    browser,
    browserMajor: getBrowserMajor(ua, browser),
    os,
    isWebView: isAndroidWebView(ua),
    inAppBrowser: classifyInAppBrowser(ua),
  };
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

function collectConnectionDiagnostics() {
  if (typeof navigator === 'undefined') {
    return {
      effectiveType: null,
      rttMs: null,
      downlinkMbps: null,
    };
  }

  const connection = (
    navigator as Navigator & {
      connection?: {
        effectiveType?: unknown;
        rtt?: unknown;
        downlink?: unknown;
      };
    }
  ).connection;

  return {
    effectiveType:
      typeof connection?.effectiveType === 'string' &&
      EFFECTIVE_TYPES.has(connection.effectiveType)
        ? connection.effectiveType
        : null,
    rttMs:
      typeof connection?.rtt === 'number' &&
      Number.isFinite(connection.rtt) &&
      connection.rtt >= 0
        ? Math.round(connection.rtt)
        : null,
    downlinkMbps:
      typeof connection?.downlink === 'number' &&
      Number.isFinite(connection.downlink) &&
      connection.downlink >= 0
        ? Number(connection.downlink.toFixed(2))
        : null,
  };
}

export function collectUploadDiagnostics(params: {
  attemptCount: number;
  uploadElapsedMs: number;
  cause?: unknown;
  attempts?: UploadAttemptDiagnostic[];
  uploadUrl?: string;
}): UploadClientDiagnostics {
  const env =
    typeof navigator !== 'undefined'
      ? classifyClientEnvironment(navigator.userAgent || '')
      : {
          browser: null,
          browserMajor: null,
          os: null,
          isWebView: null,
          inAppBrowser: null,
        };

  const visibilityState =
    typeof document !== 'undefined' &&
    VISIBILITY_STATES.has(document.visibilityState)
      ? document.visibilityState
      : null;

  const online =
    typeof navigator !== 'undefined' && typeof navigator.onLine === 'boolean'
      ? navigator.onLine
      : null;

  const connection = collectConnectionDiagnostics();

  const errorName =
    params.cause instanceof Error
      ? params.cause.name.slice(0, 64)
      : typeof params.cause === 'string'
        ? 'StringError'
        : params.cause === undefined
          ? null
          : 'UnknownError';

  const errorMessage =
    params.cause instanceof Error
      ? truncateErrorMessage(params.cause.message)
      : typeof params.cause === 'string'
        ? truncateErrorMessage(params.cause)
        : null;

  let uploadHost: string | null = null;
  if (params.uploadUrl) {
    try {
      uploadHost = new URL(params.uploadUrl).host.slice(0, 253);
    } catch {
      uploadHost = null;
    }
  }

  return {
    attemptCount: params.attemptCount,
    uploadElapsedMs: params.uploadElapsedMs,
    online,
    visibilityState,
    browser: env.browser,
    browserMajor: env.browserMajor,
    os: env.os,
    isWebView: env.isWebView,
    inAppBrowser: env.inAppBrowser,
    ...connection,
    origin:
      typeof window !== 'undefined'
        ? window.location.origin.slice(0, 256)
        : null,
    uploadHost,
    errorName,
    errorMessage,
    attempts: (params.attempts || []).slice(-MAX_UPLOAD_ATTEMPTS_RECORDED),
  };
}

function sanitizeAttemptDiagnostics(raw: unknown): UploadAttemptDiagnostic[] {
  if (!Array.isArray(raw)) return [];

  const out: UploadAttemptDiagnostic[] = [];
  for (const item of raw.slice(0, MAX_UPLOAD_ATTEMPTS_RECORDED)) {
    if (!item || typeof item !== 'object' || Array.isArray(item)) continue;
    const input = item as Record<string, unknown>;
    const attempt = Number(input.attempt);
    const elapsedMs = Number(input.elapsedMs);
    if (
      !Number.isInteger(attempt) ||
      attempt < 1 ||
      attempt > MAX_UPLOAD_ATTEMPTS_RECORDED ||
      !Number.isInteger(elapsedMs) ||
      elapsedMs < 0 ||
      elapsedMs > 10 * 60_000
    ) {
      continue;
    }

    const errorName =
      typeof input.errorName === 'string' &&
      /^[A-Za-z][A-Za-z0-9._-]{0,63}$/.test(input.errorName)
        ? input.errorName
        : null;
    const errorMessage =
      typeof input.errorMessage === 'string'
        ? truncateErrorMessage(input.errorMessage)
        : null;
    const rawStatus = Number(input.httpStatus);
    const httpStatus =
      Number.isInteger(rawStatus) && rawStatus >= 100 && rawStatus <= 599
        ? rawStatus
        : null;

    out.push({
      attempt,
      elapsedMs,
      errorName,
      errorMessage,
      httpStatus,
    });
  }
  return out;
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
    uploadElapsedMs <= 30 * 60_000
  ) {
    out.uploadElapsedMs = uploadElapsedMs;
  }

  if (typeof input.online === 'boolean') out.online = input.online;

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

  const browserMajor = Number(input.browserMajor);
  if (
    Number.isInteger(browserMajor) &&
    browserMajor > 0 &&
    browserMajor < 1_000
  ) {
    out.browserMajor = browserMajor;
  }

  if (
    typeof input.os === 'string' &&
    (OPERATING_SYSTEMS as readonly string[]).includes(input.os)
  ) {
    out.os = input.os;
  }

  if (typeof input.isWebView === 'boolean') {
    out.isWebView = input.isWebView;
  }

  if (
    typeof input.inAppBrowser === 'string' &&
    (IN_APP_BROWSERS as readonly string[]).includes(input.inAppBrowser)
  ) {
    out.inAppBrowser = input.inAppBrowser;
  }

  if (
    typeof input.effectiveType === 'string' &&
    EFFECTIVE_TYPES.has(input.effectiveType)
  ) {
    out.effectiveType = input.effectiveType;
  }

  const rttMs = Number(input.rttMs);
  if (Number.isInteger(rttMs) && rttMs >= 0 && rttMs <= 120_000) {
    out.rttMs = rttMs;
  }

  const downlinkMbps = Number(input.downlinkMbps);
  if (
    Number.isFinite(downlinkMbps) &&
    downlinkMbps >= 0 &&
    downlinkMbps <= 100_000
  ) {
    out.downlinkMbps = Math.round(downlinkMbps * 100) / 100;
  }

  if (typeof input.origin === 'string') {
    try {
      const url = new URL(input.origin);
      if (
        (url.protocol === 'https:' || url.protocol === 'http:') &&
        url.origin === input.origin
      ) {
        out.origin = url.origin.slice(0, 256);
      }
    } catch {
      // Ignore malformed origins.
    }
  }

  if (
    typeof input.uploadHost === 'string' &&
    /^[A-Za-z0-9.-]{1,253}$/.test(input.uploadHost)
  ) {
    out.uploadHost = input.uploadHost;
  }

  if (
    typeof input.errorName === 'string' &&
    /^[A-Za-z][A-Za-z0-9._-]{0,63}$/.test(input.errorName)
  ) {
    out.errorName = input.errorName;
  }

  if (typeof input.errorMessage === 'string') {
    out.errorMessage = truncateErrorMessage(input.errorMessage);
  }

  const attempts = sanitizeAttemptDiagnostics(input.attempts);
  if (attempts.length > 0) out.attempts = attempts;

  return out;
}
