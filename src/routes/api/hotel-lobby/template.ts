import { createFileRoute } from '@tanstack/react-router';

import { getHotelLobbyTemplatePreviewUrl } from '@/modules/hotel-lobby/storage';

async function GET() {
  try {
    const url = await getHotelLobbyTemplatePreviewUrl();
    return new Response(null, {
      status: 302,
      headers: {
        Location: url,
        'Cache-Control': 'public, max-age=300',
      },
    });
  } catch (error) {
    console.error('hotel-lobby template unavailable:', error);
    return new Response('Hotel Lobby template is not configured', {
      status: 404,
      headers: { 'Cache-Control': 'no-store' },
    });
  }
}

export const Route = createFileRoute('/api/hotel-lobby/template')({
  server: {
    handlers: { GET },
  },
});
