import { createFileRoute } from '@tanstack/react-router';

import { getAuth } from '@/core/auth';
import { assertHotelLobbyGenerationId } from '@/modules/hotel-lobby/billing';
import { H3_MAX_REFERENCE_IMAGES } from '@/modules/hotel-lobby/pricing';
import {
  assertHotelLobbyUploadSize,
  createHotelLobbyUploadDescriptor,
  getHotelLobbyInputKey,
} from '@/modules/hotel-lobby/storage';
import { enforceMinIntervalRateLimit } from '@/lib/rate-limit';
import { respData, respErr } from '@/lib/resp';

async function POST({ request }: { request: Request }) {
  const limited = enforceMinIntervalRateLimit(request, {
    intervalMs: 750,
    keyPrefix: 'h3-lab-upload-url',
  });
  if (limited) return limited;

  try {
    const auth = getAuth();
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) return respErr('Unauthorized', { status: 401 });

    const body = await request.json().catch(() => ({}));
    const generationId = assertHotelLobbyGenerationId(body.generationId);
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
    const maxFiles = useDefaultTemplate
      ? H3_MAX_REFERENCE_IMAGES
      : H3_MAX_REFERENCE_IMAGES + 1;

    if (
      contentTypes.length < minFiles ||
      contentTypes.length > maxFiles ||
      contentLengths.length !== contentTypes.length
    ) {
      return respErr(
        useDefaultTemplate
          ? `Provide between 1 and ${H3_MAX_REFERENCE_IMAGES} reference images`
          : `Provide one 5–15s reference video plus 1–${H3_MAX_REFERENCE_IMAGES} reference images`,
        { status: 400 }
      );
    }

    const uploads = [];
    for (let fileIndex = 0; fileIndex < contentTypes.length; fileIndex += 1) {
      const storageIndex = useDefaultTemplate ? fileIndex + 1 : fileIndex;
      assertHotelLobbyUploadSize(storageIndex, contentLengths[fileIndex]);
      const normalized = getHotelLobbyInputKey({
        userId: session.user.id,
        generationId,
        index: storageIndex,
        contentType: contentTypes[fileIndex],
      });
      uploads.push(
        await createHotelLobbyUploadDescriptor({
          userId: session.user.id,
          generationId,
          index: storageIndex,
          contentType: normalized.contentType,
          contentLength: contentLengths[fileIndex],
        })
      );
    }

    return respData({ uploads });
  } catch (error: unknown) {
    console.error('h3-lab upload-url failed:', error);
    const message =
      error instanceof Error ? error.message : 'Failed to create upload URLs';
    return respErr(message, { status: 400 });
  }
}

export const Route = createFileRoute('/api/h3-lab/upload-url')({
  server: {
    handlers: { POST },
  },
});
