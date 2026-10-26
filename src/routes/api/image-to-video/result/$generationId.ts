import { createFileRoute } from '@tanstack/react-router';

import { getAuth } from '@/core/auth';
import {
  getImageToVideoTaskByGenerationId,
  getImageToVideoTaskById,
  parseImageToVideoTask,
} from '@/modules/image-to-video/billing';
import {
  resolveImageToVideoPreset,
  type ImageToVideoPresetId,
} from '@/modules/image-to-video/presets';
import {
  assertImageToVideoResultKeyOwned,
  createImageToVideoR2ReadUrl,
} from '@/modules/image-to-video/storage';
import { hasPermission } from '@/modules/rbac/service';

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

  const isAdmin = await hasPermission(session.user.id, 'admin.*');
  const task = isAdmin
    ? await getImageToVideoTaskByGenerationId(params.generationId)
    : await getImageToVideoTaskById({
        generationId: params.generationId,
        userId: session.user.id,
      });
  if (!task || task.status !== 'completed') {
    return errorResponse('Generation result not found', 404);
  }

  const parsed = parseImageToVideoTask(task);
  const videoKey =
    typeof parsed.result?.videoKey === 'string' ? parsed.result.videoKey : null;
  if (!videoKey) return errorResponse('Generation result not found', 404);

  assertImageToVideoResultKeyOwned({
    userId: task.userId,
    generationId: task.id,
    videoKey,
  });

  const signedUrl = await createImageToVideoR2ReadUrl(videoKey);
  const wantsDownload =
    new URL(request.url).searchParams.get('download') === '1';

  if (!wantsDownload) {
    return new Response(null, {
      status: 302,
      headers: {
        Location: signedUrl,
        'Cache-Control': 'private, no-store, max-age=0',
      },
    });
  }

  const upstream = await fetch(signedUrl);
  if (!upstream.ok || !upstream.body) {
    return errorResponse('Failed to fetch generation result', 502);
  }

  let prefix = 'image-to-video';
  try {
    const presetId = parsed.options?.presetId as ImageToVideoPresetId;
    prefix = resolveImageToVideoPreset(presetId).downloadPrefix;
  } catch {
    // keep default
  }

  const filename = `${prefix}-${params.generationId.slice(0, 8)}.mp4`;
  const headers = new Headers({
    'Content-Type': upstream.headers.get('Content-Type') || 'video/mp4',
    'Content-Disposition': `attachment; filename="${filename}"`,
    'Cache-Control': 'private, no-store, max-age=0',
  });
  const contentLength = upstream.headers.get('Content-Length');
  if (contentLength) headers.set('Content-Length', contentLength);

  return new Response(upstream.body, {
    status: 200,
    headers,
  });
}

export const Route = createFileRoute(
  '/api/image-to-video/result/$generationId'
)({
  server: {
    handlers: { GET },
  },
});
