import { createFileRoute } from '@tanstack/react-router';

import { getAuth } from '@/core/auth';
import { assertHotelLobbyGenerationId } from '@/modules/hotel-lobby/billing';
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
    keyPrefix: 'hotel-lobby-upload-url',
  });
  if (limited) return limited;

  try {
    const auth = getAuth();
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) return respErr('Unauthorized', { status: 401 });

    const body = await request.json().catch(() => ({}));
    const generationId = assertHotelLobbyGenerationId(body.generationId);
    const contentTypes = Array.isArray(body.contentTypes)
      ? body.contentTypes.filter(
          (value: unknown): value is string => typeof value === 'string'
        )
      : [];
    const contentLengths = Array.isArray(body.contentLengths)
      ? body.contentLengths.map((value: unknown) => Number(value))
      : [];

    if (
      contentTypes.length < 2 ||
      contentTypes.length > 10 ||
      contentLengths.length !== contentTypes.length
    ) {
      return respErr(
        'Provide one 2–15s reference video plus 1–9 reference images',
        { status: 400 }
      );
    }

    const uploads = [];
    for (let index = 0; index < contentTypes.length; index += 1) {
      assertHotelLobbyUploadSize(index, contentLengths[index]);
      const normalized = getHotelLobbyInputKey({
        userId: session.user.id,
        generationId,
        index,
        contentType: contentTypes[index],
      });
      uploads.push(
        await createHotelLobbyUploadDescriptor({
          userId: session.user.id,
          generationId,
          index,
          contentType: normalized.contentType,
          contentLength: contentLengths[index],
        })
      );
    }

    return respData({ uploads });
  } catch (error: any) {
    console.error('hotel-lobby upload-url failed:', error);
    return respErr(error?.message || 'Failed to create upload URLs', {
      status: 400,
    });
  }
}

export const Route = createFileRoute('/api/hotel-lobby/upload-url')({
  server: {
    handlers: { POST },
  },
});
