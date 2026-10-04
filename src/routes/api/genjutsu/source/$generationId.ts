import { createFileRoute } from '@tanstack/react-router';

import { getAuth } from '@/core/auth';
import {
  getGenjutsuTaskByGenerationId,
  getGenjutsuTaskById,
} from '@/modules/genjutsu/billing';
import {
  getGenjutsuE2EUrlForStorageKey,
  isGenjutsuE2EMockEnabled,
} from '@/modules/genjutsu/e2e-mock';
import {
  assertGenjutsuSourceVideoKeyOwned,
  createGenjutsuR2ReadUrl,
} from '@/modules/genjutsu/storage';
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
  const task = isAdmin
    ? await getGenjutsuTaskByGenerationId(params.generationId)
    : await getGenjutsuTaskById({
        generationId: params.generationId,
        userId: session.user.id,
      });
  if (!task) return errorResponse('Generation source not found', 404);

  const options = parseOptions(task.options);
  const videoKey =
    typeof options?.videoKey === 'string' ? options.videoKey : null;
  if (!videoKey) return errorResponse('Generation source not found', 404);

  try {
    assertGenjutsuSourceVideoKeyOwned({
      userId: task.userId,
      generationId: task.id,
      videoKey,
    });
  } catch {
    return errorResponse('Generation source not found', 404);
  }

  if (isGenjutsuE2EMockEnabled()) {
    const mockUrl = getGenjutsuE2EUrlForStorageKey(videoKey);
    return mockUrl
      ? redirectResponse(mockUrl)
      : errorResponse('E2E source object not found', 404);
  }

  return redirectResponse(await createGenjutsuR2ReadUrl(videoKey));
}

export const Route = createFileRoute('/api/genjutsu/source/$generationId')({
  server: {
    handlers: { GET },
  },
});
