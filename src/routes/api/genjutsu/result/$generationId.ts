import { createFileRoute } from '@tanstack/react-router';

import { getAuth } from '@/core/auth';
import {
  getGenjutsuTaskById,
  parseGenjutsuTaskInfo,
} from '@/modules/genjutsu/billing';
import {
  getGenjutsuE2EUrlForStorageKey,
  isGenjutsuE2EMockEnabled,
} from '@/modules/genjutsu/e2e-mock';
import {
  assertGenjutsuResultKeyOwned,
  createGenjutsuR2ReadUrl,
} from '@/modules/genjutsu/storage';

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

  const task = await getGenjutsuTaskById({
    generationId: params.generationId,
    userId: session.user.id,
  });
  if (!task || task.status !== 'completed') {
    return errorResponse('Generation result not found', 404);
  }

  const parsed = parseGenjutsuTaskInfo(task);
  const videoKey =
    typeof parsed.result?.videoKey === 'string'
      ? parsed.result.videoKey
      : null;

  if (videoKey) {
    assertGenjutsuResultKeyOwned({
      userId: session.user.id,
      generationId: task.id,
      videoKey,
    });

    if (isGenjutsuE2EMockEnabled()) {
      const mockUrl = getGenjutsuE2EUrlForStorageKey(videoKey);
      return mockUrl
        ? redirectResponse(mockUrl)
        : errorResponse('E2E result object not found', 404);
    }

    return redirectResponse(await createGenjutsuR2ReadUrl(videoKey));
  }

  const legacyUrl =
    typeof parsed.result?.videoUrl === 'string'
      ? parsed.result.videoUrl
      : null;
  if (!legacyUrl) return errorResponse('Generation result not found', 404);

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(legacyUrl, new URL(request.url).origin);
  } catch {
    return errorResponse('Invalid legacy result URL', 500);
  }

  if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
    return errorResponse('Invalid legacy result URL', 500);
  }

  return redirectResponse(parsedUrl.toString());
}

export const Route = createFileRoute('/api/genjutsu/result/$generationId')({
  server: {
    handlers: { GET },
  },
});
