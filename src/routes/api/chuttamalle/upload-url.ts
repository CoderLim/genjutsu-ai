import { createFileRoute } from '@tanstack/react-router';

import { getAuth } from '@/core/auth';
import { assertChuttamalleGenerationId } from '@/modules/chuttamalle/billing';
import {
  assertChuttamalleUploadSize,
  createChuttamalleUploadDescriptor,
  getChuttamalleInputKey,
} from '@/modules/chuttamalle/storage';
import { enforceMinIntervalRateLimit } from '@/lib/rate-limit';
import { respData, respErr } from '@/lib/resp';

async function POST({ request }: { request: Request }) {
  const limited = enforceMinIntervalRateLimit(request, {
    intervalMs: 750,
    keyPrefix: 'chuttamalle-upload-url',
  });
  if (limited) return limited;

  try {
    const auth = getAuth();
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) return respErr('Unauthorized', { status: 401 });

    const body = await request.json().catch(() => ({}));
    const generationId = assertChuttamalleGenerationId(body.generationId);
    const useDefaultTemplate = body.useDefaultTemplate === true;
    const contentTypes = Array.isArray(body.contentTypes)
      ? body.contentTypes.filter(
          (value: unknown): value is string => typeof value === 'string'
        )
      : [];
    const contentLengths = Array.isArray(body.contentLengths)
      ? body.contentLengths.map((value: unknown) => Number(value))
      : [];

    const minFiles = useDefaultTemplate ? 1 : 2;
    const maxFiles = useDefaultTemplate ? 2 : 3;

    if (
      contentTypes.length < minFiles ||
      contentTypes.length > maxFiles ||
      contentLengths.length !== contentTypes.length
    ) {
      return respErr(
        useDefaultTemplate
          ? 'Provide one or two reference images'
          : 'Provide one 5–15s reference video plus one or two reference images',
        { status: 400 }
      );
    }

    const uploads = [];
    for (let fileIndex = 0; fileIndex < contentTypes.length; fileIndex += 1) {
      const storageIndex = useDefaultTemplate ? fileIndex + 1 : fileIndex;
      assertChuttamalleUploadSize(storageIndex, contentLengths[fileIndex]);
      const normalized = getChuttamalleInputKey({
        userId: session.user.id,
        generationId,
        index: storageIndex,
        contentType: contentTypes[fileIndex],
      });
      uploads.push(
        await createChuttamalleUploadDescriptor({
          userId: session.user.id,
          generationId,
          index: storageIndex,
          contentType: normalized.contentType,
          contentLength: contentLengths[fileIndex],
        })
      );
    }

    return respData({ uploads });
  } catch (error: any) {
    console.error('chuttamalle upload-url failed:', error);
    return respErr(error?.message || 'Failed to create upload URLs', {
      status: 400,
    });
  }
}

export const Route = createFileRoute('/api/chuttamalle/upload-url')({
  server: {
    handlers: { POST },
  },
});
