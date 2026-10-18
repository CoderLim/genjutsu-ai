import { createFileRoute } from '@tanstack/react-router';

import { resolveFixedTemplatePreviewUrl } from '@/modules/templates/preview';

async function GET({ request }: { request: Request }) {
  const { searchParams } = new URL(request.url);
  const product = searchParams.get('product');
  if (!product) {
    return new Response('Missing product', {
      status: 400,
      headers: { 'Cache-Control': 'no-store' },
    });
  }

  const delivery = searchParams.get('delivery');
  const proxy = delivery === 'proxy';

  try {
    const previewUrl = await resolveFixedTemplatePreviewUrl({
      product,
      aspect: searchParams.get('aspect'),
      subject: searchParams.get('subject'),
    });

    if (!proxy) {
      return new Response(null, {
        status: 302,
        headers: {
          Location: previewUrl,
          'Cache-Control': 'private, max-age=300',
          'X-Template-Source': 'r2',
          'X-Template-Product': product,
          'X-Template-Delivery': 'redirect',
        },
      });
    }

    const upstream = await fetch(previewUrl);
    if (!upstream.ok || !upstream.body) {
      return new Response('Template upstream fetch failed', {
        status: 503,
        headers: {
          'Cache-Control': 'no-store',
          'X-Template-Source': 'missing',
          'X-Template-Product': product,
          'X-Template-Delivery': 'proxy',
        },
      });
    }

    const headers = new Headers();
    headers.set(
      'Content-Type',
      upstream.headers.get('content-type') || 'video/mp4'
    );
    headers.set('Cache-Control', 'private, max-age=300');
    const length = upstream.headers.get('content-length');
    if (length) headers.set('Content-Length', length);
    headers.set('X-Template-Source', 'r2');
    headers.set('X-Template-Product', product);
    headers.set('X-Template-Delivery', 'proxy');

    return new Response(upstream.body, { status: 200, headers });
  } catch (error) {
    console.error('fixed template preview unavailable:', product, error);
    const message =
      error instanceof Error
        ? error.message
        : 'Template is not configured in R2';
    const status =
      message.startsWith('Unknown fixed template') ||
      message.includes('Invalid')
        ? 400
        : 503;
    return new Response(message, {
      status,
      headers: {
        'Cache-Control': 'no-store',
        'X-Template-Source': 'missing',
        'X-Template-Product': product,
      },
    });
  }
}

export const Route = createFileRoute('/api/genjutsu/template')({
  server: {
    handlers: { GET },
  },
});
