import { createFileRoute } from '@tanstack/react-router';

import { getHotelLobbyTemplateDurationSecondsRaw } from '@/modules/hotel-lobby/storage';
import { respData, respErr } from '@/lib/resp';

async function GET() {
  try {
    const durationSeconds = await getHotelLobbyTemplateDurationSecondsRaw();
    return respData({ durationSeconds });
  } catch (error) {
    console.error('hotel-lobby template duration unavailable:', error);
    return respErr(
      error instanceof Error
        ? error.message
        : 'Hotel Lobby template duration is unavailable',
      { status: 404 }
    );
  }
}

export const Route = createFileRoute('/api/hotel-lobby/template-meta')({
  server: {
    handlers: { GET },
  },
});
