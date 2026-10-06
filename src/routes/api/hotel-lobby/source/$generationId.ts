import { createFileRoute } from '@tanstack/react-router';

import { getAuth } from '@/core/auth';
import {
  getHotelLobbyTaskByGenerationId,
  getHotelLobbyTaskById,
  parseHotelLobbyTask,
} from '@/modules/hotel-lobby/billing';
import {
  assertHotelLobbySourceVideoKeyOwned,
  createHotelLobbyR2ReadUrl,
} from '@/modules/hotel-lobby/storage';
import { hasPermission } from '@/modules/rbac/service';

function errorResponse(message: string, status: number) {
  return new Response(message, {
    status,
    headers: { 'Cache-Control': 'no-store' },
  });
}

function redirectResponse(url: string) {
  return new Response(null, {
    status: 302,
    headers: {
      Location: url,
      'Cache-Control': 'private, no-store, max-age=0',
    },
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

  const isAdmin = await hasPermission(session.user.id, 'admin.*');
  const task = isAdmin
    ? await getHotelLobbyTaskByGenerationId(params.generationId)
    : await getHotelLobbyTaskById({
        generationId: params.generationId,
        userId: session.user.id,
      });
  if (!task) return errorResponse('Generation source not found', 404);

  const options = parseHotelLobbyTask(task).options;
  const videoKey =
    typeof options?.videoKey === 'string' ? options.videoKey : null;
  if (!videoKey) return errorResponse('Generation source not found', 404);

  try {
    assertHotelLobbySourceVideoKeyOwned({
      userId: task.userId,
      generationId: task.id,
      videoKey,
    });
  } catch {
    return errorResponse('Generation source not found', 404);
  }

  return redirectResponse(await createHotelLobbyR2ReadUrl(videoKey));
}

export const Route = createFileRoute('/api/hotel-lobby/source/$generationId')({
  server: {
    handlers: { GET },
  },
});
