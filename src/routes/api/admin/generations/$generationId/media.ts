import { createFileRoute } from '@tanstack/react-router';

import { getAuth } from '@/core/auth';
import {
  GENJUTSU_SCENE,
  getGenjutsuTaskByGenerationId,
} from '@/modules/genjutsu/billing';
import {
  getGenjutsuE2EUrlForStorageKey,
  isGenjutsuE2EMockEnabled,
} from '@/modules/genjutsu/e2e-mock';
import {
  assertGenjutsuInputKeysOwned,
  assertGenjutsuSealedInputKeysOwned,
  assertGenjutsuSourceVideoKeyOwned,
  createGenjutsuR2ReadUrl,
} from '@/modules/genjutsu/storage';
import {
  getHotelLobbyTaskByGenerationId,
  HOTEL_LOBBY_SCENE,
} from '@/modules/hotel-lobby/billing';
import {
  assertHotelLobbySealedInputKeysOwned,
  createHotelLobbyR2ReadUrl,
} from '@/modules/hotel-lobby/storage';
import { getKairoBadTimesTaskByGenerationId } from '@/modules/kairo-bad-times/billing';
import { KAIRO_BAD_TIMES_SCENE } from '@/modules/kairo-bad-times/constants';
import {
  assertKairoBadTimesSealedImageKeyOwned,
  createKairoBadTimesR2ReadUrl,
} from '@/modules/kairo-bad-times/storage';
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

function parseOptions(value: string | null | undefined) {
  if (!value) return null;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
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
  if (!isAdmin) return errorResponse('Forbidden', 403);

  const hotelTask = await getHotelLobbyTaskByGenerationId(params.generationId);
  const genjutsuTask = hotelTask
    ? null
    : await getGenjutsuTaskByGenerationId(params.generationId);
  const kairoTask = hotelTask || genjutsuTask
    ? null
    : await getKairoBadTimesTaskByGenerationId(params.generationId);
  const task = hotelTask ?? genjutsuTask ?? kairoTask;
  if (!task) return errorResponse('Generation not found', 404);

  const options = parseOptions(task.options);
  const videoKey =
    typeof options?.videoKey === 'string'
      ? options.videoKey
      : task.scene === KAIRO_BAD_TIMES_SCENE &&
          typeof options?.templateVideoKey === 'string'
        ? options.templateVideoKey
        : null;
  const imageKeys = Array.isArray(options?.imageKeys)
    ? options.imageKeys.filter(
        (value: unknown): value is string => typeof value === 'string'
      )
    : task.scene === KAIRO_BAD_TIMES_SCENE &&
        typeof options?.imageKey === 'string'
      ? [options.imageKey]
      : [];

  if (!videoKey) return errorResponse('Generation input not found', 404);

  const { searchParams } = new URL(request.url);
  const rawIndex = searchParams.get('index');
  const index = rawIndex == null ? Number.NaN : Number(rawIndex);
  if (!Number.isInteger(index) || index < 0 || index > imageKeys.length) {
    return errorResponse('Invalid media index', 400);
  }

  if (task.scene === KAIRO_BAD_TIMES_SCENE) {
    if (
      !videoKey.startsWith('kairo-bad-times/templates/') ||
      !/^[A-Za-z0-9._/-]+\.mp4$/.test(videoKey)
    ) {
      return errorResponse('Generation input not found', 404);
    }
    try {
      assertKairoBadTimesSealedImageKeyOwned({
        userId: task.userId,
        generationId: task.id,
        imageKey: imageKeys[0] || '',
      });
    } catch {
      return errorResponse('Generation input not found', 404);
    }
    const key = index === 0 ? videoKey : imageKeys[index - 1];
    if (!key) return errorResponse('Generation input not found', 404);
    return redirectResponse(await createKairoBadTimesR2ReadUrl(key));
  }

  if (task.scene === HOTEL_LOBBY_SCENE) {
    try {
      assertHotelLobbySealedInputKeysOwned({
        userId: task.userId,
        generationId: task.id,
        videoKey,
        imageKeys,
      });
    } catch {
      return errorResponse('Generation input not found', 404);
    }

    const storageKey = index === 0 ? videoKey : imageKeys[index - 1];
    if (!storageKey) return errorResponse('Generation input not found', 404);
    return redirectResponse(await createHotelLobbyR2ReadUrl(storageKey));
  }

  if (task.scene !== GENJUTSU_SCENE) {
    return errorResponse('Generation not found', 404);
  }

  try {
    if (index === 0) {
      assertGenjutsuSourceVideoKeyOwned({
        userId: task.userId,
        generationId: task.id,
        videoKey,
      });
    } else if (videoKey.startsWith('genjutsu/sealed-inputs/')) {
      assertGenjutsuSealedInputKeysOwned({
        userId: task.userId,
        generationId: task.id,
        videoKey,
        imageKeys,
      });
    } else {
      assertGenjutsuInputKeysOwned({
        userId: task.userId,
        generationId: task.id,
        videoKey,
        imageKeys,
      });
    }
  } catch {
    return errorResponse('Generation input not found', 404);
  }

  const storageKey = index === 0 ? videoKey : imageKeys[index - 1];
  if (!storageKey) return errorResponse('Generation input not found', 404);

  if (isGenjutsuE2EMockEnabled()) {
    const mockUrl = getGenjutsuE2EUrlForStorageKey(storageKey);
    return mockUrl
      ? redirectResponse(mockUrl)
      : errorResponse('E2E input object not found', 404);
  }

  return redirectResponse(await createGenjutsuR2ReadUrl(storageKey));
}

export const Route = createFileRoute(
  '/api/admin/generations/$generationId/media'
)({
  server: {
    handlers: { GET },
  },
});
