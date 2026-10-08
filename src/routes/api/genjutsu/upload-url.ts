import { createFileRoute } from '@tanstack/react-router';

import { getAuth } from '@/core/auth';
import {
  assertGenerationId,
  bindGenjutsuUploadInputs,
  createGenjutsuAttempt,
  GenjutsuAttemptConflictError,
  markGenjutsuAttemptFailedPreflight,
} from '@/modules/genjutsu/billing';
import {
  createGenjutsuE2EUploadDescriptor,
  isGenjutsuE2EMockEnabled,
} from '@/modules/genjutsu/e2e-mock';
import { resolveGenjutsuProviderTarget } from '@/modules/genjutsu/service';
import {
  assertGenjutsuUploadSize,
  createGenjutsuProxyUploadDescriptor,
  createGenjutsuR2UploadDescriptor,
  GENJUTSU_PROXY_UPLOAD_MAX_BYTES,
  getGenjutsuInputKey,
} from '@/modules/genjutsu/storage';
import { enforceMinIntervalRateLimit } from '@/lib/rate-limit';
import { respData, respErr, respJson } from '@/lib/resp';

async function POST({ request }: { request: Request }) {
  let generationIdForFailure: string | null = null;
  let userIdForFailure: string | null = null;
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
    userIdForFailure = session.user.id;

    const body = await request.json().catch(() => ({}));
    const generationId = assertGenerationId(body.generationId);
    generationIdForFailure = generationId;
    const mode = body.mode;
    const resolution = body.resolution;
    const prompt = typeof body.prompt === 'string' ? body.prompt : '';

    if (mode !== 'motion-transfer' && mode !== 'objects-swap') {
      return respErr('Invalid Genjutsu mode', { status: 400 });
    }
    if (
      resolution !== '480p' &&
      resolution !== '720p' &&
      resolution !== '1080p'
    ) {
      return respErr('Invalid Genjutsu resolution', { status: 400 });
    }

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

    const normalizedInputs = contentTypes.map((contentType, index) => {
      const contentLength = contentLengths[index];
      assertGenjutsuUploadSize(index, contentLength);
      return getGenjutsuInputKey({
        userId: session.user.id,
        generationId,
        index,
        contentType,
      });
    });

    const target = resolveGenjutsuProviderTarget(mode);
    await createGenjutsuAttempt({
      generationId,
      userId: session.user.id,
      mode,
      resolution,
      prompt,
      ...target,
    });
    await bindGenjutsuUploadInputs({
      generationId,
      userId: session.user.id,
      mode,
      resolution,
      prompt,
      ...target,
      videoKey: normalizedInputs[0].key,
      imageKeys: normalizedInputs.slice(1).map((item) => item.key),
      contentTypes: normalizedInputs.map((item) => item.contentType),
      contentLengths,
    });

    const uploads = [];
    for (let index = 0; index < contentTypes.length; index += 1) {
      const contentType = contentTypes[index];
      const contentLength = contentLengths[index];

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
      } else if (contentLength > GENJUTSU_PROXY_UPLOAD_MAX_BYTES) {
        // Workers request body cap ~100 MiB — keep direct signed PUT for huge videos.
        uploads.push(
          await createGenjutsuR2UploadDescriptor({
            userId: session.user.id,
            generationId,
            index,
            contentType,
            contentLength,
          })
        );
      } else {
        // Same-origin proxy — Android Chrome cannot reliably PUT to R2 S3 host.
        uploads.push(
          createGenjutsuProxyUploadDescriptor(request, {
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
    if (error instanceof GenjutsuAttemptConflictError) {
      return respJson(-1, error.message, { code: error.code }, { status: 409 });
    }

    if (generationIdForFailure && userIdForFailure) {
      await markGenjutsuAttemptFailedPreflight({
        generationId: generationIdForFailure,
        userId: userIdForFailure,
        stage: 'upload_setup',
        errorCode: 'UPLOAD_SETUP_FAILED',
        error: error?.message || 'Failed to create upload URL',
      }).catch(() => undefined);
    }

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
