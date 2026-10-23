import { createFileRoute } from '@tanstack/react-router';

import { getAuth } from '@/core/auth';
import { assertHotelLobbyGenerationId } from '@/modules/hotel-lobby/billing';
import { resolveHotelLobbyPreset } from '@/modules/hotel-lobby/presets';
import { HotelLobbyPreflightError } from '@/modules/hotel-lobby/service';
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
    const preset = resolveHotelLobbyPreset(body.presetId);
    const useDefaultTemplate = body.useDefaultTemplate === true;
    if (body.preview === true) {
      return respErr('Paid preview is no longer supported', { status: 400 });
    }
    const contentTypes = Array.isArray(body.contentTypes)
      ? body.contentTypes.filter(
          (value: unknown): value is string => typeof value === 'string'
        )
      : [];
    const contentLengths = Array.isArray(body.contentLengths)
      ? body.contentLengths.map((value: unknown) => Number(value))
      : [];

    if (!preset.allowCustomVideo && !useDefaultTemplate) {
      return respErr(
        `${preset.displayName} only supports the fixed reference template`,
        { status: 400 }
      );
    }

    const minImages = preset.imageCount.min;
    const maxImages = preset.imageCount.max;
    const minFiles = useDefaultTemplate ? minImages : minImages + 1;
    const maxFiles = useDefaultTemplate ? maxImages : maxImages + 1;

    if (
      contentTypes.length < minFiles ||
      contentTypes.length > maxFiles ||
      contentLengths.length !== contentTypes.length
    ) {
      return respErr(
        useDefaultTemplate
          ? minImages === maxImages
            ? `Provide exactly ${minImages} reference image${
                minImages === 1 ? '' : 's'
              }`
            : `Provide between ${minImages} and ${maxImages} reference images`
          : `Provide one 3–15s reference video plus ${
              minImages === maxImages
                ? `exactly ${minImages} reference image${
                    minImages === 1 ? '' : 's'
                  }`
                : `${minImages}–${maxImages} reference images`
            }`,
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

    return respData({ uploads, presetId: preset.id });
  } catch (error: any) {
    console.error('hotel-lobby upload-url failed:', error);
    if (error instanceof HotelLobbyPreflightError) {
      return respErr(error.message, { status: 400 });
    }
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
