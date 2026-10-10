/**
 * Build the Mini-only Waffo mapping update without replacing any existing SKU.
 * Operator must supply the CURRENT active mapping (DB Admin config may override env).
 */
export function withMiniWaffoProduct(
  mapping: unknown,
  miniProductId: string
): Record<string, string> {
  if (
    !mapping ||
    typeof mapping !== 'object' ||
    Array.isArray(mapping)
  ) {
    throw new Error('Provide the current active Waffo product mapping');
  }
  const current = mapping as Record<string, unknown>;
  for (const id of ['starter', 'creator', 'studio']) {
    if (typeof current[id] !== 'string' || !current[id].trim()) {
      throw new Error(`Existing Waffo mapping is missing ${id}`);
    }
  }
  for (const [id, value] of Object.entries(current)) {
    if (typeof value !== 'string' || !value.trim()) {
      throw new Error(`Invalid Waffo product mapping for ${id}`);
    }
  }
  if (typeof miniProductId !== 'string' || !miniProductId.trim()) {
    throw new Error('Mini Waffo product ID is required');
  }
  if (current.mini && current.mini !== miniProductId) {
    throw new Error('Mini already maps to another Waffo product');
  }
  return { ...(current as Record<string, string>), mini: miniProductId };
}
