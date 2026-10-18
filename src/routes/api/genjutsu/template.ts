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

  try {
    const previewUrl = await resolveFixedTemplatePreviewUrl({
      product,
      aspect: searchParams.get('aspect'),
      subject: searchParams.get('subject'),
    });
    return new Response(null, {
      status: 302,
      headers: {
        Location: previewUrl,
        'Cache-Control': 'private, max-age=300',
        'X-Template-Source': 'r2',
        'X-Template-Product': product,
      },
    });
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
