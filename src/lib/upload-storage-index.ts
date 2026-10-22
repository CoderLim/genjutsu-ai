/**
 * Map a client upload slot to the server storage fileIndex.
 *
 * Homepage / preview: storage indices are usually 0 (video) + 1..N (images).
 * Fixed-template full mode: clients only upload images at indices 1..N.
 * Never report the loop/array offset when `upload.index` is present.
 */
export function resolveUploadStorageIndex(
  upload: { index?: number | null },
  fallbackArrayIndex: number
): number {
  const index = upload.index;
  if (typeof index === 'number' && Number.isInteger(index) && index >= 0) {
    return index;
  }
  return fallbackArrayIndex;
}
