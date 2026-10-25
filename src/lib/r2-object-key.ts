/**
 * Map logical storage keys to R2 physical object keys.
 * Do not persist a prefixed key in the DB: apply the prefix only at the R2 boundary.
 */
export function trimR2PathSlashes(value: string): string {
  return value.replace(/^\/+|\/+$/g, '');
}

/**
 * Reject ambiguous or unsafe paths without restricting legacy Unicode/space filenames.
 * Business-specific validators remain responsible for ownership/prefix restrictions.
 */
export function assertSafeR2ObjectKey(key: string): void {
  if (
    !key ||
    key.startsWith('/') ||
    key.endsWith('/') ||
    key.includes('//') ||
    key.includes('\\') ||
    key.includes('?') ||
    key.includes('#') ||
    key.includes('%') ||
    /[\u0000-\u001f\u007f]/.test(key) ||
    key.split('/').some((segment) => segment === '.' || segment === '..')
  ) {
    throw new Error('Invalid R2 object key');
  }
}

/** Idempotent for already-prefixed keys, including multi-segment prefixes. */
export function resolveR2ObjectKey(uploadPath: string, key: string): string {
  const prefix = trimR2PathSlashes(uploadPath.trim());
  const objectKey = key.trim();
  assertSafeR2ObjectKey(objectKey);
  if (prefix) assertSafeR2ObjectKey(prefix);

  if (!prefix || objectKey === prefix || objectKey.startsWith(`${prefix}/`)) {
    return objectKey;
  }
  return `${prefix}/${objectKey}`;
}
