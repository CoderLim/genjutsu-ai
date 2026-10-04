import {
  collectUploadDiagnostics,
  isRetryableUploadFailure,
  getUploadPutTimeoutMs,
  UPLOAD_RETRY_DELAYS_MS,
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
      credentials: 'omit',
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

  for (let index = 0; index < UPLOAD_RETRY_DELAYS_MS.length; index += 1) {
    const delayMs = UPLOAD_RETRY_DELAYS_MS[index];
    if (delayMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }

    attemptCount += 1;
    try {
      await putSignedUploadOnce(params);
      return {
        attemptCount,
        uploadElapsedMs: Date.now() - startedAt,
      };
    } catch (cause) {
      lastCause = cause;
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
