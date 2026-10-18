import { createFileRoute } from '@tanstack/react-router';

import { resolveHotelLobbyPreset } from '@/modules/hotel-lobby/presets';
import { HotelLobbyPreflightError } from '@/modules/hotel-lobby/service';
import { getHotelLobbyTemplatePreviewUrl } from '@/modules/hotel-lobby/storage';

async function GET({ request }: { request: Request }) {
  try {
    const { searchParams } = new URL(request.url);
    // Preview may load a disabled preset (Generate stays blocked elsewhere).
    // Keep this route on hotel-lobby R2 keys — `crazy-frog` conflicts with the
    // genjutsu product id on `/api/genjutsu/template`.
    const preset = resolveHotelLobbyPreset(searchParams.get('presetId'), {
      requireEnabled: false,
    });
    const url = await getHotelLobbyTemplatePreviewUrl(preset.id);
    return new Response(null, {
      status: 302,
      headers: {
        Location: url,
        'Cache-Control': 'private, max-age=300',
        'X-Template-Source': 'r2',
        'X-Template-Product': preset.id,
      },
    });
  } catch (error) {
    console.error('hotel-lobby template unavailable:', error);
    const message =
      error instanceof HotelLobbyPreflightError
        ? error.message
        : error instanceof Error
          ? error.message
          : 'Hotel Lobby template is not configured';
    return new Response(message, {
      status: error instanceof HotelLobbyPreflightError ? 400 : 503,
      headers: { 'Cache-Control': 'no-store' },
    });
  }
}

export const Route = createFileRoute('/api/hotel-lobby/template')({
  server: {
    handlers: { GET },
  },
});
