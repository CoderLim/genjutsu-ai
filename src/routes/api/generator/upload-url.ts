import { createFileRoute } from '@tanstack/react-router';

import { getAuth } from '@/core/auth';
import { getGeneratorModel } from '@/modules/generator/catalog';
import {
  assertGenerationId,
  assertUploadSize,
  createGeneratorStagingKey,
  normalizeUploadType,
} from '@/modules/generator/storage';
import { getWorkflowSpec, type MediaSlot, type Workflow } from '@/modules/generator/types';
import { enforceMinIntervalRateLimit } from '@/lib/rate-limit';
import { respData, respErr } from '@/lib/resp';

const SLOTS = new Set(['startFrame', 'endFrame', 'referenceImages', 'referenceVideos', 'referenceAudio']);

async function POST({ request }: { request: Request }) {
  const limited = enforceMinIntervalRateLimit(request, {
    intervalMs: 300, keyPrefix: 'generator-upload-url',
  });
  if (limited) return limited;

  try {
    const session = await getAuth().api.getSession({ headers: request.headers });
    if (!session?.user) return respErr('Unauthorized', { status: 401 });
    const body = await request.json();
    const generationId = assertGenerationId(body.generationId);
    const model = getGeneratorModel(body.modelId);
    const spec = getWorkflowSpec(model, body.workflow as Workflow);
    if (!SLOTS.has(body.slot)) throw new Error('Unknown upload slot');
    const slot = body.slot as MediaSlot;
    const limit = spec.slots[slot];
    if (!limit) throw new Error('Model does not support this upload slot');

    const contentType = normalizeUploadType(body.contentType);
    const contentLength = Number(body.contentLength);
    assertUploadSize(contentType, contentLength);
    if (!limit.accept.includes(contentType) ||
        (limit.maxBytes !== undefined && contentLength > limit.maxBytes)) {
      throw new Error('File exceeds model media limits');
    }

    const key = createGeneratorStagingKey({
      userId: session.user.id,
      generationId, slot, contentType,
    });
    // Authenticated same-origin proxy upload: no browser-side R2 CORS.
    return respData({
      storageKey: key,
      uploadMode: 'proxy',
      uploadUrl: '/api/generator/upload/' +
        encodeURIComponent(generationId) +
        '?key=' + encodeURIComponent(key) +
        '&modelId=' + encodeURIComponent(model.id) +
        '&workflow=' + encodeURIComponent(body.workflow),
      uploadHeaders: { 'Content-Type': contentType },
    });
  } catch (error) {
    return respErr(error instanceof Error ? error.message : 'Upload preflight failed', {
      status: 400,
    });
  }
}

export const Route = createFileRoute('/api/generator/upload-url')({
  server: { handlers: { POST } },
});
