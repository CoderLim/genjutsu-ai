import { createFileRoute } from '@tanstack/react-router';

import { getChuttamalleTemplatePreviewUrl } from '@/modules/chuttamalle/storage';

async function GET() {
  try {
    const url = await getChuttamalleTemplatePreviewUrl();
    return new Response(null, {
      status: 302,
      headers: {
        Location: url,
        'Cache-Control': 'public, max-age=300',
      },
    });
  } catch (error) {
    console.error('chuttamalle template unavailable:', error);
    return new Response('Chuttamalle template is not configured', {
      status: 404,
      headers: { 'Cache-Control': 'no-store' },
    });
  }
}

export const Route = createFileRoute('/api/chuttamalle/template')({
  server: {
    handlers: { GET },
  },
});
