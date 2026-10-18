import { createFileRoute } from '@tanstack/react-router';

import {
  HOTEL_LOBBY_PRESET_ID,
  isHotelLobbyPresetId,
} from '@/modules/hotel-lobby/presets';
import { getHotelLobbyTemplatePreviewUrl } from '@/modules/hotel-lobby/storage';

/**
 * Legacy same-origin proxy for hotel-lobby template trim/fetch.
 * Prefer `/api/genjutsu/template?product=<presetId>&delivery=proxy` for new callers.
 * Optional `presetId` keeps Rumpel/Bulin (etc.) from collapsing onto Hotel Lobby.
 */
async function GET({ request }: { request: Request }) {
  const presetParam = new URL(request.url).searchParams.get('presetId');
  const presetId = isHotelLobbyPresetId(presetParam)
    ? presetParam
    : HOTEL_LOBBY_PRESET_ID;

  try {
    const url = await getHotelLobbyTemplatePreviewUrl(presetId);
    const upstream = await fetch(url);
    if (!upstream.ok || !upstream.body) {
      return new Response('Hotel Lobby template is not available', {
        status: 404,
        headers: {
          'Cache-Control': 'no-store',
          'X-Template-Preset': presetId,
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
    headers.set('X-Template-Preset', presetId);
    headers.set('X-Template-Delivery', 'proxy');

    return new Response(upstream.body, {
      status: 200,
      headers,
    });
  } catch (error) {
    console.error('hotel-lobby template-file unavailable:', presetId, error);
    return new Response('Hotel Lobby template is not configured', {
      status: 404,
      headers: {
        'Cache-Control': 'no-store',
        'X-Template-Preset': presetId,
      },
    });
  }
}

export const Route = createFileRoute('/api/hotel-lobby/template-file')({
  server: {
    handlers: { GET },
  },
});
