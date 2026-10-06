import { createFileRoute } from '@tanstack/react-router';

import { getHotelLobbyTemplatePreviewUrl } from '@/modules/hotel-lobby/storage';

async function GET() {
  try {
    const url = await getHotelLobbyTemplatePreviewUrl();
    const upstream = await fetch(url);
    if (!upstream.ok) {
      return new Response('Hotel Lobby template is not available', {
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
    console.error('hotel-lobby template-file unavailable:', error);
    return new Response('Hotel Lobby template is not configured', {
      status: 404,
      headers: { 'Cache-Control': 'no-store' },
    });
  }
}

export const Route = createFileRoute('/api/hotel-lobby/template-file')({
  server: {
    handlers: { GET },
  },
});
