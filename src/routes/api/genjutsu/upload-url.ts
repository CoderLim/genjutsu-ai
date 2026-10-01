import { createFileRoute } from '@tanstack/react-router';

import { getAuth } from '@/core/auth';
import {
  createGenjutsuE2EUploadDescriptor,
  isGenjutsuE2EMockEnabled,
} from '@/modules/genjutsu/e2e-mock';
import { assertGenerationId } from '@/modules/genjutsu/billing';
import {
  createGenjutsuR2UploadDescriptor,
  getGenjutsuInputKey,
  assertGenjutsuUploadSize,
} from '@/modules/genjutsu/storage';
import { enforceMinIntervalRateLimit } from '@/lib/rate-limit';
import { respData, respErr } from '@/lib/resp';

async function POST({ request }: { request: Request }) {
  const limited = enforceMinIntervalRateLimit(request, {
    intervalMs: 1_000,
    keyPrefix: 'genjutsu-upload-url',
  });
  if (limited) return limited;

  try {
    const auth = getAuth();
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) {
      return respErr('Unauthorized', { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const generationId = assertGenerationId(body.generationId);
    const contentTypes = Array.isArray(body.contentTypes)
      ? body.contentTypes.filter(
          (value: unknown): value is string => typeof value === 'string'
        )
      : typeof body.contentType === 'string'
        ? [body.contentType]
        : [];
    const contentLengths = Array.isArray(body.contentLengths)
      ? body.contentLengths.map((value: unknown) => Number(value))
      : [];

    if (
      contentTypes.length < 2 ||
      contentTypes.length > 9 ||
      contentLengths.length !== contentTypes.length
    ) {
      return respErr(
        'Provide one source video plus 1-8 reference images with file sizes',
        { status: 400 }
      );
    }

    const uploads = [];
    for (let index = 0; index < contentTypes.length; index += 1) {
      const contentType = contentTypes[index];
      const contentLength = contentLengths[index];
      assertGenjutsuUploadSize(index, contentLength);

      if (isGenjutsuE2EMockEnabled()) {
        const normalized = getGenjutsuInputKey({
          userId: session.user.id,
          generationId,
          index,
          contentType,
        });
        uploads.push(
          createGenjutsuE2EUploadDescriptor(request, {
            contentType: normalized.contentType,
            storageKey: normalized.key,
          })
        );
      } else {
        uploads.push(
          await createGenjutsuR2UploadDescriptor({
            userId: session.user.id,
            generationId,
            index,
            contentType,
            contentLength,
          })
        );
      }
    }

    return respData({ uploads });
  } catch (error: any) {
    console.error('genjutsu upload-url failed:', error);
    return respErr(error?.message || 'Failed to create upload URL', {
      status: 400,
    });
  }
}

export const Route = createFileRoute('/api/genjutsu/upload-url')({
  server: {
    handlers: { POST },
  },
});
