import { createFileRoute } from '@tanstack/react-router';

import { getHotelLobbyTaskByRequestIdAnyUser } from '@/modules/hotel-lobby/billing';
import { reconcileHotelLobbyGeneration } from '@/modules/hotel-lobby/reconcile';
import { respOk } from '@/lib/resp';

function readRequestId(payload: any, request: Request) {
  const url = new URL(request.url);
  const candidates = [
    payload?.request_id,
    payload?.requestId,
    payload?.id,
    payload?.data?.request_id,
    payload?.data?.requestId,
    url.searchParams.get('request_id'),
    url.searchParams.get('requestId'),
  ];
  return candidates.find(
    (value) => typeof value === 'string' && value.length >= 6
  ) as string | undefined;
}

async function POST({ request }: { request: Request }) {
  try {
    const payload = await request.json().catch(() => ({}));
    const requestId = readRequestId(payload, request);

    // Wake-up only — never trust webhook status/result fields. Settlement
    // always re-queries Fal through reconcileHotelLobbyGeneration.
    if (!requestId) return respOk();

    const task = await getHotelLobbyTaskByRequestIdAnyUser(requestId);
    if (!task) return respOk();

    await reconcileHotelLobbyGeneration(task);
  } catch (error) {
    // Ack early/malformed deliveries. Client polling remains the recovery path.
    console.error('hotel-lobby webhook reconcile failed:', error);
  }

  return respOk();
}

export const Route = createFileRoute('/api/hotel-lobby/webhook')({
  server: {
    handlers: { POST },
  },
});
