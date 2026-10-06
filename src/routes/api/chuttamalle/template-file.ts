import { createFileRoute } from '@tanstack/react-router';

import { getChuttamalleTemplatePreviewUrl } from '@/modules/chuttamalle/storage';

async function GET() {
  try {
    const url = await getChuttamalleTemplatePreviewUrl();
    const upstream = await fetch(url);
    if (!upstream.ok) {
      return new Response('Chuttamalle template is not available', {
        status: 404,
        headers: { 'Cache-Control': 'no-store' },
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

    return new Response(upstream.body, {
      status: 200,
      headers,
    });
  } catch (error) {
    console.error('chuttamalle template-file unavailable:', error);
    return new Response('Chuttamalle template is not configured', {
      status: 404,
      headers: { 'Cache-Control': 'no-store' },
    });
  }
}

export const Route = createFileRoute('/api/chuttamalle/template-file')({
  server: {
    handlers: { GET },
  },
});
