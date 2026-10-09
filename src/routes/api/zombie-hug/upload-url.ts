import { createFileRoute } from '@tanstack/react-router';

import { getAuth } from '@/core/auth';
import { envConfigs } from '@/config';
import {
  assertGenerationId,
  bindGenjutsuUploadInputs,
  createGenjutsuAttempt,
  GenjutsuAttemptConflictError,
  markGenjutsuAttemptFailedPreflight,
} from '@/modules/genjutsu/billing';
import {
  createGenjutsuE2EUploadDescriptor,
  ensureGenjutsuE2ETemplateObject,
  isGenjutsuE2EMockEnabled,
} from '@/modules/genjutsu/e2e-mock';
import { getGenjutsuModel } from '@/modules/genjutsu/service';
import {
  assertGenjutsuUploadSize,
  createGenjutsuProxyUploadDescriptor,
  createGenjutsuR2UploadDescriptor,
  ensureZombieHugTemplateInR2,
  GENJUTSU_PROXY_UPLOAD_MAX_BYTES,
  getGenjutsuInputKey,
  getZombieHugTemplateVideoKey,
} from '@/modules/genjutsu/storage';
import {
  isZombieHugAspectRatio,
  isZombieHugResolution,
  ZOMBIE_HUG_DEFAULT_ASPECT_RATIO,
  ZOMBIE_HUG_DEFAULT_RESOLUTION,
  ZOMBIE_HUG_IMAGE_COUNT,
  ZOMBIE_HUG_MODE,
  ZOMBIE_HUG_PRESET,
  ZOMBIE_HUG_PROMPT,
  type ZombieHugAspectRatio,
  type ZombieHugResolution,
} from '@/modules/zombie-hug/prompt';
import { enforceMinIntervalRateLimit } from '@/lib/rate-limit';
import { respData, respErr, respJson } from '@/lib/resp';

async function POST({ request }: { request: Request }) {
  let generationIdForFailure: string | null = null;
  let userIdForFailure: string | null = null;
  const limited = enforceMinIntervalRateLimit(request, {
    intervalMs: 1_000,
    keyPrefix: 'zombie-hug-upload-url',
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

    const resolution: ZombieHugResolution = isZombieHugResolution(
      body.resolution
    )
      ? body.resolution
      : ZOMBIE_HUG_DEFAULT_RESOLUTION;
    const aspectRatio: ZombieHugAspectRatio = isZombieHugAspectRatio(
      body.aspectRatio
    )
      ? body.aspectRatio
      : ZOMBIE_HUG_DEFAULT_ASPECT_RATIO;

    const contentTypes = Array.isArray(body.contentTypes)
      ? body.contentTypes.filter(
          (value: unknown): value is string => typeof value === 'string'
        )
      : [];
    const contentLengths = Array.isArray(body.contentLengths)
      ? body.contentLengths.map((value: unknown) => Number(value))
      : [];

    if (
      contentTypes.length !== ZOMBIE_HUG_IMAGE_COUNT ||
      contentLengths.length !== ZOMBIE_HUG_IMAGE_COUNT
    ) {
      return respErr('Upload exactly two reference images', { status: 400 });
    }

    for (const contentType of contentTypes) {
      const mime = contentType.split(';', 1)[0]?.trim().toLowerCase() || '';
      if (!mime.startsWith('image/')) {
        return respErr('Both uploads must be images (JPG, PNG, WebP, or GIF)', {
          status: 400,
        });
      }
    }

    // Fail before the user uploads photos when the shared motion template is
    // missing. E2E mock seeds an in-memory object; real deploys need R2.
    try {
      if (isGenjutsuE2EMockEnabled()) {
        ensureGenjutsuE2ETemplateObject(
          getZombieHugTemplateVideoKey(aspectRatio)
        );
      } else {
        await ensureZombieHugTemplateInR2(aspectRatio);
      }
    } catch (error: any) {
      return respJson(
        -1,
        error?.message ||
          'Zombie hug template is not configured in R2. Upload the matching public/videos/zombie-hug-tpl*.mp4 to R2.',
        { code: 'TEMPLATE_NOT_CONFIGURED' },
        { status: 503 }
      );
    }

    // Image staging keys use Genjutsu indices 1 and 2 (0 is the template video).
    const normalizedInputs = contentTypes.map(
      (contentType: string, fileIndex: number) => {
        const storageIndex = fileIndex + 1;
        const contentLength = contentLengths[fileIndex];
        assertGenjutsuUploadSize(storageIndex, contentLength);
        return {
          ...getGenjutsuInputKey({
            userId: session.user.id,
            generationId,
            index: storageIndex,
            contentType,
          }),
          storageIndex,
          contentLength,
        };
      }
    );

    const provider = 'higgsfield' as const;
    const model =
      envConfigs.higgsfield_genjutsu_motion_model?.trim() ||
      getGenjutsuModel(ZOMBIE_HUG_MODE);

    await createGenjutsuAttempt({
      generationId,
      userId: session.user.id,
      mode: ZOMBIE_HUG_MODE,
      resolution,
      prompt: ZOMBIE_HUG_PROMPT,
      provider,
      model,
    });

    await bindGenjutsuUploadInputs({
      generationId,
      userId: session.user.id,
      mode: ZOMBIE_HUG_MODE,
      resolution,
      prompt: ZOMBIE_HUG_PROMPT,
      provider,
      model,
      useDefaultTemplate: true,
      preset: ZOMBIE_HUG_PRESET,
      aspectRatio,
      imageKeys: normalizedInputs.map((item: { key: string }) => item.key),
      contentTypes: normalizedInputs.map(
        (item: { contentType: string }) => item.contentType
      ),
      contentLengths,
    });

    const uploads = [];
    for (let fileIndex = 0; fileIndex < contentTypes.length; fileIndex += 1) {
      const item = normalizedInputs[fileIndex];
      const contentLength = item.contentLength;

      if (isGenjutsuE2EMockEnabled()) {
        uploads.push(
          createGenjutsuE2EUploadDescriptor(request, {
            contentType: item.contentType,
            storageKey: item.key,
          })
        );
      } else if (contentLength > GENJUTSU_PROXY_UPLOAD_MAX_BYTES) {
        uploads.push(
          await createGenjutsuR2UploadDescriptor({
            userId: session.user.id,
            generationId,
            index: item.storageIndex,
            contentType: item.contentType,
            contentLength,
          })
        );
      } else {
        uploads.push(
          createGenjutsuProxyUploadDescriptor(request, {
            userId: session.user.id,
            generationId,
            index: item.storageIndex,
            contentType: item.contentType,
            contentLength,
          })
        );
      }
    }

    return respData({
      uploads: uploads.map((upload, fileIndex) => ({
        ...upload,
        index: fileIndex + 1,
      })),
    });
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

    console.error('zombie-hug upload-url failed:', error);
    return respErr(error?.message || 'Failed to create upload URL', {
      status: 400,
    });
  }
}

export const Route = createFileRoute('/api/zombie-hug/upload-url')({
  server: {
    handlers: { POST },
  },
});
