import { createFileRoute } from '@tanstack/react-router';

import { getAuth } from '@/core/auth';
import { getGeneratorModel } from '@/modules/generator/catalog';
import {
  assertGenerationId,
  assertStagingOwnership,
  assertUploadSize,
  normalizeUploadType,
  putGeneratorStaging,
} from '@/modules/generator/storage';
import { getWorkflowSpec, type MediaSlot, type Workflow } from '@/modules/generator/types';
import { enforceMinIntervalRateLimit } from '@/lib/rate-limit';

function fail(message: string, status: number) {
  return new Response(message, { status, headers: { 'Cache-Control': 'no-store' } });
}

const SLOTS: MediaSlot[] = [
  'startFrame', 'endFrame', 'referenceImages', 'referenceVideos', 'referenceAudio',
];

async function PUT({ request, params }: {
  request: Request;
  params: { generationId: string };
}) {
  const limited = enforceMinIntervalRateLimit(request, {
    intervalMs: 200,
    keyPrefix: 'generator-proxy-upload',
  });
  if (limited) return limited;

  try {
    const session = await getAuth().api.getSession({ headers: request.headers });
    if (!session?.user) return fail('Unauthorized', 401);
    const generationId = assertGenerationId(params.generationId);
    const query = new URL(request.url).searchParams;
    const key = query.get('key') || '';
    const slot = SLOTS.find(slot =>
      key.startsWith('generator/staging/') && key.includes('/' + slot + '/')
    );
    if (!slot) throw new Error('Invalid upload key');
    assertStagingOwnership(key, session.user.id, generationId, slot);

    const model = getGeneratorModel(query.get('modelId') || '');
    const workflow = query.get('workflow') as Workflow;
    const limit = getWorkflowSpec(model, workflow).slots[slot];
    if (!limit) throw new Error('Unsupported model upload');
    const contentType = normalizeUploadType(request.headers.get('content-type'));
    const rawLength = request.headers.get('content-length');
    if (!rawLength) throw new Error('Missing upload size');
    const length = Number(rawLength);
    assertUploadSize(contentType, length);
    if (!limit.accept.includes(contentType) ||
      (limit.maxBytes !== undefined && length > limit.maxBytes)) {
      throw new Error('Unsupported file for model');
    }
    if (!request.body) throw new Error('Missing upload bytes');
    await putGeneratorStaging({
      key, contentType, contentLength: length, body: request.body,
    });
    return new Response(null, { status: 204, headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    console.error('[generator] proxy upload error',
      error instanceof Error ? error.message : 'unknown');
    const message = error instanceof Error ? error.message : 'Upload failed';
    return fail(message, /R2|storage|S3|binding|fetch/i.test(message) ? 502 : 400);
  }
}

export const Route = createFileRoute('/api/generator/upload/$generationId')({
  server: { handlers: { PUT } },
});
