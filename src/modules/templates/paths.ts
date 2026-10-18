/**
 * Client-safe relative URLs for fixed-template <video src>.
 * Keep this file free of Node/R2 imports — it is pulled into the browser bundle.
 *
 * - default (redirect): browser <video> follows 302 to a signed R2 URL
 * - delivery=proxy: same-origin stream for fetch()/Recreate (avoids R2 CORS)
 */
export function fixedTemplatePreviewPath(params: {
  product: string;
  aspect?: string;
  subject?: string;
  delivery?: 'redirect' | 'proxy';
}): string {
  const query = new URLSearchParams({ product: params.product });
  if (params.aspect) query.set('aspect', params.aspect);
  if (params.subject) query.set('subject', params.subject);
  if (params.delivery === 'proxy') query.set('delivery', 'proxy');
  return `/api/genjutsu/template?${query.toString()}`;
}
