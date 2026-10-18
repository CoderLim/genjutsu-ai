/**
 * Client-safe relative URLs for fixed-template <video src>.
 * Keep this file free of Node/R2 imports — it is pulled into the browser bundle.
 */
export function fixedTemplatePreviewPath(params: {
  product: string;
  aspect?: string;
  subject?: string;
}): string {
  const query = new URLSearchParams({ product: params.product });
  if (params.aspect) query.set('aspect', params.aspect);
  if (params.subject) query.set('subject', params.subject);
  return `/api/genjutsu/template?${query.toString()}`;
}
