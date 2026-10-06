import { createFileRoute } from '@tanstack/react-router';

import { getAuth } from '@/core/auth';
import {
  getHotelLobbyTaskById,
  parseHotelLobbyTask,
} from '@/modules/hotel-lobby/billing';
import {
  assertHotelLobbyResultKeyOwned,
  createHotelLobbyR2ReadUrl,
} from '@/modules/hotel-lobby/storage';

function errorResponse(message: string, status: number) {
  return new Response(message, {
    status,
    headers: { 'Cache-Control': 'no-store' },
  });
}

async function GET({
  request,
  params,
}: {
  request: Request;
  params: { generationId: string };
}) {
  const auth = getAuth();
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.user) return errorResponse('Unauthorized', 401);

  const task = await getHotelLobbyTaskById({
    generationId: params.generationId,
    userId: session.user.id,
  });
  if (!task || task.status !== 'completed') {
    return errorResponse('Generation result not found', 404);
  }

  const parsed = parseHotelLobbyTask(task);
  const videoKey =
    typeof parsed.result?.videoKey === 'string' ? parsed.result.videoKey : null;
  if (!videoKey) return errorResponse('Generation result not found', 404);

  assertHotelLobbyResultKeyOwned({
    userId: task.userId,
    generationId: task.id,
    videoKey,
  });

  return new Response(null, {
    status: 302,
    headers: {
      Location: await createHotelLobbyR2ReadUrl(videoKey),
      'Cache-Control': 'private, no-store, max-age=0',
    },
  });
}

export const Route = createFileRoute(
  '/api/hotel-lobby/result/$generationId'
)({
  server: {
    handlers: { GET },
  },
});
