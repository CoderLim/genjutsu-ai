import { createFileRoute } from '@tanstack/react-router';

import { getGenjutsuProductTemplatePreviewUrl } from '@/modules/genjutsu/storage';
import { isGenjutsuProductId } from '@/modules/genjutsu/workflow';

async function GET({ request }: { request: Request }) {
  const product = new URL(request.url).searchParams.get('product');
  if (!isGenjutsuProductId(product)) {
    return new Response('Invalid or missing product', {
      status: 400,
      headers: { 'Cache-Control': 'no-store' },
    });
  }

  try {
    const previewUrl = await getGenjutsuProductTemplatePreviewUrl(product);
    return new Response(null, {
      status: 302,
      headers: {
        Location: previewUrl,
        'Cache-Control': 'private, max-age=300',
        'X-Genjutsu-Template-Source': 'r2',
        'X-Genjutsu-Template-Product': product,
      },
    });
  } catch (error) {
    console.error('genjutsu template preview unavailable:', product, error);
    return new Response(
      error instanceof Error
        ? error.message
        : 'Template is not configured in R2',
      {
        status: 503,
        headers: {
          'Cache-Control': 'no-store',
          'X-Genjutsu-Template-Source': 'missing',
          'X-Genjutsu-Template-Product': product,
        },
      }
    );
  }
}

export const Route = createFileRoute('/api/genjutsu/template')({
  server: {
    handlers: { GET },
  },
});
