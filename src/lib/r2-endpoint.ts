/**
 * Shared Cloudflare R2 S3 API endpoint resolution.
 *
 * Explicit `endpoint` wins; otherwise build the default host from `accountId`.
 * Trailing slashes are stripped. Does not touch public/CDN URL semantics.
 */

export function resolveR2Endpoint(input: {
  endpoint?: string | null;
  accountId?: string | null;
}): string {
  const endpoint = input.endpoint?.trim().replace(/\/+$/, '') || '';
  if (endpoint) return endpoint;

  const accountId = input.accountId?.trim() || '';
  if (accountId) {
    return `https://${accountId}.r2.cloudflarestorage.com`;
  }

  throw new Error(
    'R2 endpoint is required: set endpoint or accountId (https://<accountId>.r2.cloudflarestorage.com)'
  );
}
