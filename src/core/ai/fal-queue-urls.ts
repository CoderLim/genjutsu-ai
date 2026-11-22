/**
 * fal's queue submission response is authoritative for status/result lookup.
 * Never infer an endpoint path from a model when verified URLs are available.
 *
 * These URLs are fetched with the private FAL key, so treat the response
 * (and persisted task metadata) as untrusted, and reject any redirect.
 */
export type FalQueueUrls = {
  statusUrl: string;
  responseUrl: string;
};

const FAL_QUEUE_ORIGIN = 'https://queue.fal.run';
const SEGMENT = /^[a-zA-Z0-9._~-]+$/;

function queueUrl(
  input: unknown,
  requestId: string,
  kind: 'status' | 'result'
): string | null {
  if (typeof input !== 'string' || input.length > 2048) return null;
  if (!SEGMENT.test(requestId)) return null;
  try {
    const url = new URL(input);
    if (url.origin !== FAL_QUEUE_ORIGIN ||
        url.username || url.password || url.search || url.hash ||
        url.href !== input) return null;

    // Fal queue GET is /{owner}/{app}/requests/{request_id}[/status].
    // Never follow arbitrary submit paths or percent-encoded path segments.
    const parts = url.pathname.split('/');
    if (parts.length !== (kind === 'status' ? 6 : 5) ||
        parts[0] !== '' || parts[3] !== 'requests' ||
        parts[4] !== requestId ||
        (kind === 'status' && parts[5] !== 'status') ||
        !SEGMENT.test(parts[1]) || !SEGMENT.test(parts[2])) {
      return null;
    }
    return url.href;
  } catch {
    return null;
  }
}

/**
 * Use only a matched status/result pair for the same app and request.
 * An optional/malformed URL from an older provider response is not trusted.
 */
export function readFalQueueUrls(
  data: unknown,
  requestId: string
): FalQueueUrls | undefined {
  if (!data || typeof data !== 'object' || Array.isArray(data)) return;
  const object = data as Record<string, unknown>;
  const status = queueUrl(object.statusUrl ?? object.status_url, requestId, 'status');
  const result = queueUrl(object.responseUrl ?? object.response_url, requestId, 'result');
  if (!status || !result || status !== result + '/status') return;
  return { statusUrl: status, responseUrl: result };
}

/** Reject invalid persisted metadata before sending a server-side auth header. */
export function assertFalQueueUrls(urls: FalQueueUrls, requestId: string): FalQueueUrls {
  const valid = readFalQueueUrls(urls, requestId);
  if (!valid) throw new Error('Invalid Fal queue URLs for request');
  return valid;
}
