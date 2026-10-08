import {
  collectUploadDiagnostics,
  getUploadPutTimeoutMs,
  isRetryableUploadFailure,
  UPLOAD_RETRY_DELAYS_MS,
  type UploadAttemptDiagnostic,
  type UploadClientDiagnostics,
} from '@/lib/upload-diagnostics';

// Typed client for the app's REST endpoints (src/routes/api/**).
// Unwraps the resp.ts envelope: { code: 0 | -1, message, data? }.

export class ApiError extends Error {
  constructor(
    public code: number,
    message: string,
    public data?: unknown
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export interface PageResult<T> {
  items: T[];
  total: number;
}

export interface PageParams {
  page: number;
  pageSize: number;
  search?: string;
}

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: {
      ...(typeof init?.body === 'string'
        ? { 'Content-Type': 'application/json' }
        : {}),
      ...init?.headers,
    },
  });
  const json = await res
    .json()
    .catch(() => ({ code: -1, message: res.statusText || 'Request failed' }));
  if (json.code !== 0) {
    throw new ApiError(
      json.code ?? -1,
      json.message || 'Request failed',
      json.data
    );
  }
  // respOk() omits data entirely — callers expecting void get undefined.
  return json.data as T;
}

export const apiGet = <T>(url: string, init?: RequestInit) =>
  request<T>(url, init);

export const apiPost = <T = void>(url: string, body?: unknown) =>
  request<T>(url, {
    method: 'POST',
    body: body == null ? undefined : JSON.stringify(body),
  });

export const apiPostForm = <T = void>(url: string, body: FormData) =>
  request<T>(url, {
    method: 'POST',
    body,
  });

export const apiPut = <T = void>(url: string, body?: unknown) =>
  request<T>(url, { method: 'PUT', body: JSON.stringify(body) });

export const apiPatch = <T = void>(url: string, body?: unknown) =>
  request<T>(url, { method: 'PATCH', body: JSON.stringify(body) });

export const apiDelete = <T = void>(url: string) =>
  request<T>(url, { method: 'DELETE' });

export class SignedUploadError extends Error {
  constructor(
    message: string,
    public cause: unknown,
    public diagnostics: UploadClientDiagnostics,
    public httpStatus: number | null = null
  ) {
    super(message);
    this.name = 'SignedUploadError';
  }
}

function uploadFetchCredentials(url: string): RequestCredentials {
  // Same-origin proxy uploads need the session cookie; cross-origin R2
  // signed URLs must stay credential-less (CORS + no cookies).
  try {
    const parsed = new URL(
      url,
      typeof window !== 'undefined' ? window.location.href : 'http://localhost'
    );
    if (
      typeof window !== 'undefined' &&
      parsed.origin === window.location.origin
    ) {
      return 'same-origin';
    }
  } catch {
    // Fall through to omit.
  }
  return 'omit';
}

async function putSignedUploadOnce(params: {
  url: string;
  file: File;
  headers?: Record<string, string>;
}) {
  const controller = new AbortController();
  const timeoutMs = getUploadPutTimeoutMs(params.file.size);
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(params.url, {
      method: 'PUT',
      headers: params.headers,
      body: params.file,
      credentials: uploadFetchCredentials(params.url),
      signal: controller.signal,
    });
    if (!response.ok) {
      throw new ApiError(
        response.status,
        `Upload failed with HTTP ${response.status}`
      );
    }
  } catch (cause) {
    if (cause instanceof Error && cause.name === 'AbortError') {
      const timeout = new Error(`Upload timed out after ${timeoutMs}ms`);
      timeout.name = 'UploadTimeoutError';
      throw timeout;
    }
    throw cause;
  } finally {
    clearTimeout(timer);
  }
}

export async function uploadToSignedUrl(params: {
  url: string;
  file: File;
  headers?: Record<string, string>;
}) {
  const startedAt = Date.now();
  let attemptCount = 0;
  let lastCause: unknown;
  const attempts: UploadAttemptDiagnostic[] = [];

  for (let index = 0; index < UPLOAD_RETRY_DELAYS_MS.length; index += 1) {
    const delayMs = UPLOAD_RETRY_DELAYS_MS[index];
    if (delayMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }

    attemptCount += 1;
    const attemptStartedAt = Date.now();
    try {
      await putSignedUploadOnce(params);
      attempts.push({
        attempt: attemptCount,
        elapsedMs: Date.now() - attemptStartedAt,
        errorName: null,
        errorMessage: null,
        httpStatus: null,
      });
      return {
        attemptCount,
        uploadElapsedMs: Date.now() - startedAt,
        attempts,
      };
    } catch (cause) {
      lastCause = cause;
      attempts.push({
        attempt: attemptCount,
        elapsedMs: Date.now() - attemptStartedAt,
        errorName: cause instanceof Error ? cause.name.slice(0, 64) : null,
        errorMessage:
          cause instanceof Error
            ? cause.message.replace(/[\r\n\t]+/g, ' ').slice(0, 200)
            : typeof cause === 'string'
              ? cause.replace(/[\r\n\t]+/g, ' ').slice(0, 200)
              : null,
        httpStatus:
          cause instanceof ApiError &&
          Number.isInteger(cause.code) &&
          cause.code >= 100 &&
          cause.code <= 599
            ? cause.code
            : null,
      });
      const canRetry =
        index < UPLOAD_RETRY_DELAYS_MS.length - 1 &&
        isRetryableUploadFailure(cause);
      if (!canRetry) break;
    }
  }

  const diagnostics = collectUploadDiagnostics({
    attemptCount,
    uploadElapsedMs: Date.now() - startedAt,
    cause: lastCause,
    attempts,
    uploadUrl: params.url,
  });

  if (
    lastCause instanceof ApiError &&
    Number.isInteger(lastCause.code) &&
    lastCause.code >= 400 &&
    lastCause.code <= 599
  ) {
    throw new SignedUploadError(
      lastCause.message,
      lastCause,
      diagnostics,
      lastCause.code
    );
  }

  if (lastCause instanceof Error && lastCause.name === 'AbortError') {
    throw new SignedUploadError(
      lastCause.message,
      lastCause,
      diagnostics,
      null
    );
  }

  throw new SignedUploadError(
    lastCause instanceof Error ? lastCause.message : 'Upload network error',
    lastCause,
    diagnostics,
    null
  );
}

// Query-string builder for paginated list endpoints.
export function pageQuery(base: string, p: PageParams) {
  const params = new URLSearchParams({
    page: String(p.page),
    pageSize: String(p.pageSize),
  });
  if (p.search) params.set('search', p.search);
  return `${base}?${params}`;
}
