import { createFileRoute } from '@tanstack/react-router';

import { getAuth } from '@/core/auth';
import { getGeneratorTask, parseTaskJson } from '@/modules/generator/billing';
import {
  assertGenerationId,
  assertResultOwnership,
  signGeneratorReadUrl,
} from '@/modules/generator/storage';

async function GET({ request, params }: {
  request: Request;
  params: { generationId: string };
}) {
  const session = await getAuth().api.getSession({ headers: request.headers });
  if (!session?.user) return new Response('Unauthorized', { status: 401 });
  let task;
  try {
    task = await getGeneratorTask({
      generationId: assertGenerationId(params.generationId),
      userId: session.user.id,
    });
  } catch {
    return new Response('Not found', { status: 404 });
  }
  if (!task || task.status !== 'completed') {
    return new Response('Generation result not found', { status: 404 });
  }
  const query = new URL(request.url).searchParams;
  const index = Number(query.get('index') ?? 0);
  if (!Number.isSafeInteger(index) || index < 0 || index > 20) {
    return new Response('Invalid output index', { status: 400 });
  }
  const result = parseTaskJson(task.taskResult);
  const keys = result.resultKeys;
  if (!Array.isArray(keys) || typeof keys[index] !== 'string') {
    return new Response('Output not found', { status: 404 });
  }
  try {
    const key = keys[index] as string;
    assertResultOwnership(key, task.userId, task.id);
    const signedUrl = await signGeneratorReadUrl(key);
    if (query.get('download') !== '1') {
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
      return new Response('Download unavailable', { status: 502 });
    }
    const extension = key.split('.').pop() || 'bin';
    const filename = 'generator-' + task.id.slice(0, 8) + '.' + extension;
    return new Response(upstream.body, {
      status: 200,
      headers: {
        'Content-Type': upstream.headers.get('content-type') ||
          (task.mediaType === 'video' ? 'video/mp4' : 'image/png'),
        'Content-Disposition': 'attachment; filename="' + filename + '"',
        'Cache-Control': 'private, no-store',
      },
    });
  } catch {
    return new Response('Result is unavailable', { status: 502 });
  }
}

export const Route = createFileRoute('/api/generator/result/$generationId')({
  server: { handlers: { GET } },
});
