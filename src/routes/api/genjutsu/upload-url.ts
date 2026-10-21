import { createFileRoute } from '@tanstack/react-router';

import { getAuth } from '@/core/auth';
import { isAllowedA2oLiteAiPrompt } from '@/modules/a2o-lite-ai/assert';
import {
  A2O_LITE_AI_ASPECT_RATIO,
  A2O_LITE_AI_MODE,
  A2O_LITE_AI_PRODUCT_ID,
  A2O_LITE_AI_RESOLUTIONS,
} from '@/modules/a2o-lite-ai/constants';
import {
  A2oLiteAiProviderBindingError,
  assertA2oLiteAiProviderBinding,
} from '@/modules/a2o-lite-ai/provider';
import { isAllowedColdplayKissCamPrompt } from '@/modules/coldplay-kiss-cam/assert';
import {
  COLDPLAY_KISS_CAM_ASPECT_RATIO,
  COLDPLAY_KISS_CAM_MODE,
  COLDPLAY_KISS_CAM_PRODUCT_ID,
  COLDPLAY_KISS_CAM_RESOLUTIONS,
} from '@/modules/coldplay-kiss-cam/constants';
import {
  assertColdplayKissCamProviderBinding,
  ColdplayKissCamProviderBindingError,
} from '@/modules/coldplay-kiss-cam/provider';
import {
  CRAZY_FROG_ASPECT_RATIO,
  CRAZY_FROG_PRODUCT_ID,
  CRAZY_FROG_RESOLUTIONS,
} from '@/modules/crazy-frog/constants';
import { isAllowedEnzoFernandezAiPrompt } from '@/modules/enzo-fernandez-ai/assert';
import {
  ENZO_FERNANDEZ_AI_ASPECT_RATIO,
  ENZO_FERNANDEZ_AI_MODE,
  ENZO_FERNANDEZ_AI_PRODUCT_ID,
  ENZO_FERNANDEZ_AI_RESOLUTIONS,
} from '@/modules/enzo-fernandez-ai/constants';
import {
  assertEnzoFernandezAiProviderBinding,
  EnzoFernandezAiProviderBindingError,
} from '@/modules/enzo-fernandez-ai/provider';
import { isAllowedFlyingCarAiPrompt } from '@/modules/flying-car-ai/assert';
import {
  FLYING_CAR_AI_ASPECT_RATIO,
  FLYING_CAR_AI_MODE,
  FLYING_CAR_AI_PRODUCT_ID,
  FLYING_CAR_AI_RESOLUTIONS,
} from '@/modules/flying-car-ai/constants';
import {
  assertFlyingCarAiProviderBinding,
  FlyingCarAiProviderBindingError,
} from '@/modules/flying-car-ai/provider';
import { isAllowedGangnamStyleAiPrompt } from '@/modules/gangnam-style-ai/assert';
import {
  GANGNAM_STYLE_AI_ASPECT_RATIO,
  GANGNAM_STYLE_AI_MODE,
  GANGNAM_STYLE_AI_PRODUCT_ID,
  GANGNAM_STYLE_AI_RESOLUTIONS,
} from '@/modules/gangnam-style-ai/constants';
import {
  assertGangnamStyleAiProviderBinding,
  GangnamStyleAiProviderBindingError,
} from '@/modules/gangnam-style-ai/provider';
import {
  assertGenerationId,
  bindGenjutsuUploadInputs,
  createGenjutsuAttempt,
  GenjutsuAttemptConflictError,
  getGenjutsuTaskById,
  markGenjutsuAttemptFailedPreflight,
} from '@/modules/genjutsu/billing';
import {
  createGenjutsuE2EUploadDescriptor,
  ensureGenjutsuE2ETemplateObject,
  isGenjutsuE2EMockEnabled,
} from '@/modules/genjutsu/e2e-mock';
import {
  assertGenjutsuUploadSize,
  createGenjutsuProxyUploadDescriptor,
  createGenjutsuR2UploadDescriptor,
  ensureA2oLiteAiTemplateInR2,
  ensureColdplayKissCamTemplateInR2,
  ensureCrazyFrogTemplateInR2,
  ensureEnzoFernandezAiTemplateInR2,
  ensureFlyingCarAiTemplateInR2,
  ensureGangnamStyleAiTemplateInR2,
  ensureSmalltownBoyDanceTemplateInR2,
  GENJUTSU_PROXY_UPLOAD_MAX_BYTES,
  getA2oLiteAiTemplateVideoKey,
  getColdplayKissCamTemplateVideoKey,
  getCrazyFrogTemplateVideoKey,
  getEnzoFernandezAiTemplateVideoKey,
  getFlyingCarAiTemplateVideoKey,
  getGangnamStyleAiTemplateVideoKey,
  getGenjutsuInputKey,
  getSmalltownBoyDanceTemplateVideoKey,
} from '@/modules/genjutsu/storage';
import type { GenjutsuProvider } from '@/modules/genjutsu/types';
import {
  isGenjutsuProductId,
  resolveProductProviderTarget,
} from '@/modules/genjutsu/workflow';
import {
  SMALLTOWN_ASPECT_RATIO,
  SMALLTOWN_PRODUCT_ID,
  SMALLTOWN_RESOLUTIONS,
} from '@/modules/smalltown-boy-dance/constants';
import { enforceMinIntervalRateLimit } from '@/lib/rate-limit';
import { respData, respErr, respJson } from '@/lib/resp';

const FIXED_TEMPLATE_DUAL_IMAGE_COUNT = 2;
const FIXED_TEMPLATE_SINGLE_IMAGE_COUNT = 1;
const FIXED_TEMPLATE_TRIPLE_IMAGE_COUNT = 3;

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
    const product =
      typeof body.product === 'string' && isGenjutsuProductId(body.product)
        ? body.product
        : undefined;
    const isSmalltown = product === SMALLTOWN_PRODUCT_ID;
    const isCrazyFrog = product === CRAZY_FROG_PRODUCT_ID;
    const isA2oLiteAi = product === A2O_LITE_AI_PRODUCT_ID;
    const isEnzoFernandezAi = product === ENZO_FERNANDEZ_AI_PRODUCT_ID;
    const isFlyingCarAi = product === FLYING_CAR_AI_PRODUCT_ID;
    const isColdplayKissCam = product === COLDPLAY_KISS_CAM_PRODUCT_ID;
    const isGangnamStyleAi = product === GANGNAM_STYLE_AI_PRODUCT_ID;
    const isSingleImageProduct = isEnzoFernandezAi || isFlyingCarAi;
    const isProductPreview =
      (isCrazyFrog ||
        isA2oLiteAi ||
        isEnzoFernandezAi ||
        isFlyingCarAi ||
        isColdplayKissCam ||
        isGangnamStyleAi) &&
      body.preview === true;
    // Full fixed templates: server template + image-only uploads.
    // Preview: client uploads a trimmed ≤4s clip + reference image(s).
    const isFixedTemplateProduct =
      (isSmalltown ||
        isCrazyFrog ||
        isA2oLiteAi ||
        isEnzoFernandezAi ||
        isFlyingCarAi ||
        isColdplayKissCam ||
        isGangnamStyleAi) &&
      !isProductPreview;
    const fixedTemplateImageCount = isSingleImageProduct
      ? FIXED_TEMPLATE_SINGLE_IMAGE_COUNT
      : isGangnamStyleAi
        ? FIXED_TEMPLATE_TRIPLE_IMAGE_COUNT
        : FIXED_TEMPLATE_DUAL_IMAGE_COUNT;

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
    if (
      isSmalltown &&
      !SMALLTOWN_RESOLUTIONS.includes(
        resolution as (typeof SMALLTOWN_RESOLUTIONS)[number]
      )
    ) {
      return respErr('Smalltown Boy Dance only supports 480p and 720p', {
        status: 400,
      });
    }
    if (
      isCrazyFrog &&
      !CRAZY_FROG_RESOLUTIONS.includes(
        resolution as (typeof CRAZY_FROG_RESOLUTIONS)[number]
      )
    ) {
      return respErr('Crazy Frog only supports 480p and 720p', {
        status: 400,
      });
    }
    if (isProductPreview && resolution !== '480p') {
      return respErr(
        isA2oLiteAi
          ? 'A2O Lite AI preview must use 480p'
          : isColdplayKissCam
            ? 'Coldplay Kiss Cam preview must use 480p'
            : isGangnamStyleAi
              ? 'Gangnam Style AI preview must use 480p'
              : isFlyingCarAi
                ? 'Flying Car AI preview must use 480p'
                : isEnzoFernandezAi
                  ? 'Enzo Fernandez AI preview must use 480p'
                  : 'Crazy Frog preview must use 480p',
        { status: 400 }
      );
    }
    if (isA2oLiteAi && mode !== A2O_LITE_AI_MODE) {
      return respErr('A2O Lite AI only supports objects-swap', { status: 400 });
    }
    if (
      isA2oLiteAi &&
      !A2O_LITE_AI_RESOLUTIONS.includes(
        resolution as (typeof A2O_LITE_AI_RESOLUTIONS)[number]
      )
    ) {
      return respErr('A2O Lite AI only supports 480p and 720p', {
        status: 400,
      });
    }
    if (isA2oLiteAi && !isAllowedA2oLiteAiPrompt(prompt)) {
      return respErr(
        'A2O Lite AI prompt does not match the fixed product prompt',
        {
          status: 400,
        }
      );
    }
    if (isEnzoFernandezAi && mode !== ENZO_FERNANDEZ_AI_MODE) {
      return respErr('Enzo Fernandez AI only supports objects-swap', {
        status: 400,
      });
    }
    if (
      isEnzoFernandezAi &&
      !ENZO_FERNANDEZ_AI_RESOLUTIONS.includes(
        resolution as (typeof ENZO_FERNANDEZ_AI_RESOLUTIONS)[number]
      )
    ) {
      return respErr('Enzo Fernandez AI only supports 480p and 720p', {
        status: 400,
      });
    }
    if (isEnzoFernandezAi && !isAllowedEnzoFernandezAiPrompt(prompt)) {
      return respErr(
        'Enzo Fernandez AI prompt does not match the fixed product prompt',
        {
          status: 400,
        }
      );
    }
    if (isFlyingCarAi && mode !== FLYING_CAR_AI_MODE) {
      return respErr('Flying Car AI only supports objects-swap', {
        status: 400,
      });
    }
    if (
      isFlyingCarAi &&
      !FLYING_CAR_AI_RESOLUTIONS.includes(
        resolution as (typeof FLYING_CAR_AI_RESOLUTIONS)[number]
      )
    ) {
      return respErr('Flying Car AI only supports 480p and 720p', {
        status: 400,
      });
    }
    if (isFlyingCarAi && !isAllowedFlyingCarAiPrompt(prompt)) {
      return respErr(
        'Flying Car AI prompt does not match the fixed product prompt',
        {
          status: 400,
        }
      );
    }
    if (isColdplayKissCam && mode !== COLDPLAY_KISS_CAM_MODE) {
      return respErr('Coldplay Kiss Cam only supports objects-swap', {
        status: 400,
      });
    }
    if (
      isColdplayKissCam &&
      !COLDPLAY_KISS_CAM_RESOLUTIONS.includes(
        resolution as (typeof COLDPLAY_KISS_CAM_RESOLUTIONS)[number]
      )
    ) {
      return respErr('Coldplay Kiss Cam only supports 480p and 720p', {
        status: 400,
      });
    }
    if (isColdplayKissCam && !isAllowedColdplayKissCamPrompt(prompt)) {
      return respErr(
        'Coldplay Kiss Cam prompt does not match the fixed product prompt',
        {
          status: 400,
        }
      );
    }
    if (isGangnamStyleAi && mode !== GANGNAM_STYLE_AI_MODE) {
      return respErr('Gangnam Style AI only supports objects-swap', {
        status: 400,
      });
    }
    if (
      isGangnamStyleAi &&
      !GANGNAM_STYLE_AI_RESOLUTIONS.includes(
        resolution as (typeof GANGNAM_STYLE_AI_RESOLUTIONS)[number]
      )
    ) {
      return respErr('Gangnam Style AI only supports 480p and 720p', {
        status: 400,
      });
    }
    if (isGangnamStyleAi && !isAllowedGangnamStyleAiPrompt(prompt)) {
      return respErr(
        'Gangnam Style AI prompt does not match the fixed product prompt',
        {
          status: 400,
        }
      );
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

    if (isProductPreview) {
      const productLabel = isA2oLiteAi
        ? 'A2O Lite AI'
        : isColdplayKissCam
          ? 'Coldplay Kiss Cam'
          : isGangnamStyleAi
            ? 'Gangnam Style AI'
            : isFlyingCarAi
              ? 'Flying Car AI'
              : isEnzoFernandezAi
                ? 'Enzo Fernandez AI'
                : 'Crazy Frog';
      const previewImageCount = isSingleImageProduct
        ? 1
        : isGangnamStyleAi
          ? 3
          : 2;
      const previewUploadCount = previewImageCount + 1;
      if (
        contentTypes.length !== previewUploadCount ||
        contentLengths.length !== previewUploadCount
      ) {
        return respErr(
          `${productLabel} preview requires one trimmed video plus ${
            previewImageCount === 1
              ? 'one reference image'
              : previewImageCount === 3
                ? 'three reference images'
                : 'two reference images'
          }`,
          { status: 400 }
        );
      }
      const videoMime =
        contentTypes[0]?.split(';', 1)[0]?.trim().toLowerCase() || '';
      if (!videoMime.startsWith('video/')) {
        return respErr(`${productLabel} preview first upload must be a video`, {
          status: 400,
        });
      }
      for (let i = 1; i < previewUploadCount; i += 1) {
        const mime =
          contentTypes[i]?.split(';', 1)[0]?.trim().toLowerCase() || '';
        if (!mime.startsWith('image/')) {
          return respErr(
            `${productLabel} preview references must be images (JPG, PNG, WebP, or GIF)`,
            { status: 400 }
          );
        }
      }
    } else if (isFixedTemplateProduct) {
      if (
        contentTypes.length !== fixedTemplateImageCount ||
        contentLengths.length !== fixedTemplateImageCount
      ) {
        return respErr(
          isCrazyFrog
            ? 'Upload exactly two reference images (lead and chaser)'
            : isGangnamStyleAi
              ? 'Upload exactly three reference images'
              : isA2oLiteAi || isColdplayKissCam
                ? 'Upload exactly two reference images'
                : isSingleImageProduct
                  ? 'Upload exactly one reference image'
                  : 'Upload exactly two reference images (front and back)',
          { status: 400 }
        );
      }
      for (const contentType of contentTypes) {
        const mime = contentType.split(';', 1)[0]?.trim().toLowerCase() || '';
        if (!mime.startsWith('image/')) {
          return respErr(
            isSingleImageProduct
              ? 'Upload must be an image (JPG, PNG, WebP, or GIF)'
              : isGangnamStyleAi
                ? 'All three uploads must be images (JPG, PNG, WebP, or GIF)'
                : 'Both uploads must be images (JPG, PNG, WebP, or GIF)',
            { status: 400 }
          );
        }
      }

      try {
        if (isGenjutsuE2EMockEnabled()) {
          ensureGenjutsuE2ETemplateObject(
            isCrazyFrog
              ? getCrazyFrogTemplateVideoKey()
              : isA2oLiteAi
                ? getA2oLiteAiTemplateVideoKey()
                : isColdplayKissCam
                  ? getColdplayKissCamTemplateVideoKey()
                  : isGangnamStyleAi
                    ? getGangnamStyleAiTemplateVideoKey()
                    : isFlyingCarAi
                      ? getFlyingCarAiTemplateVideoKey()
                      : isEnzoFernandezAi
                        ? getEnzoFernandezAiTemplateVideoKey()
                        : getSmalltownBoyDanceTemplateVideoKey()
          );
        } else if (isCrazyFrog) {
          await ensureCrazyFrogTemplateInR2();
        } else if (isA2oLiteAi) {
          await ensureA2oLiteAiTemplateInR2();
        } else if (isColdplayKissCam) {
          await ensureColdplayKissCamTemplateInR2();
        } else if (isGangnamStyleAi) {
          await ensureGangnamStyleAiTemplateInR2();
        } else if (isFlyingCarAi) {
          await ensureFlyingCarAiTemplateInR2();
        } else if (isEnzoFernandezAi) {
          await ensureEnzoFernandezAiTemplateInR2();
        } else {
          await ensureSmalltownBoyDanceTemplateInR2();
        }
      } catch (error: any) {
        return respJson(
          -1,
          error?.message ||
            (isCrazyFrog
              ? 'Crazy Frog template is not configured in R2.'
              : isA2oLiteAi
                ? 'A2O Lite AI template is not configured in R2.'
                : isColdplayKissCam
                  ? 'Coldplay Kiss Cam template is not configured in R2.'
                  : isGangnamStyleAi
                    ? 'Gangnam Style AI template is not configured in R2.'
                    : isFlyingCarAi
                      ? 'Flying Car AI template is not configured in R2.'
                      : isEnzoFernandezAi
                        ? 'Enzo Fernandez AI template is not configured in R2.'
                        : 'Smalltown Boy Dance template is not configured in R2.'),
          { code: 'TEMPLATE_NOT_CONFIGURED' },
          { status: 503 }
        );
      }
    } else if (
      contentTypes.length < 2 ||
      contentTypes.length > 9 ||
      contentLengths.length !== contentTypes.length
    ) {
      return respErr(
        'Provide one source video plus 1-8 reference images with file sizes',
        { status: 400 }
      );
    }

    // Fixed-template products: indices 1–2 are images (0 reserved for server template).
    // Homepage / Crazy Frog preview: index 0 = video, 1+ = images.
    const normalizedInputs = contentTypes.map(
      (contentType: string, fileIndex: number) => {
        const storageIndex = isFixedTemplateProduct ? fileIndex + 1 : fileIndex;
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

    // Prefer the provider/model already persisted on the attempt so
    // product-scoped pages do not conflict with a later env switch.
    const existing = await getGenjutsuTaskById({
      generationId,
      userId: session.user.id,
    });
    const resolved = resolveProductProviderTarget(product, mode);
    if (isA2oLiteAi && existing) {
      assertA2oLiteAiProviderBinding(existing.provider, existing.model);
    }
    if (isEnzoFernandezAi && existing) {
      assertEnzoFernandezAiProviderBinding(existing.provider, existing.model);
    }
    if (isFlyingCarAi && existing) {
      assertFlyingCarAiProviderBinding(existing.provider, existing.model);
    }
    if (isColdplayKissCam && existing) {
      assertColdplayKissCamProviderBinding(existing.provider, existing.model);
    }
    if (isGangnamStyleAi && existing) {
      assertGangnamStyleAiProviderBinding(existing.provider, existing.model);
    }
    const target = existing
      ? {
          provider: (existing.provider ||
            resolved.provider) as GenjutsuProvider,
          model: existing.model || resolved.model,
        }
      : resolved;

    await createGenjutsuAttempt({
      generationId,
      userId: session.user.id,
      mode,
      resolution,
      prompt,
      product,
      ...target,
    });

    const productAspectRatio = isCrazyFrog
      ? CRAZY_FROG_ASPECT_RATIO
      : isA2oLiteAi
        ? A2O_LITE_AI_ASPECT_RATIO
        : isColdplayKissCam
          ? COLDPLAY_KISS_CAM_ASPECT_RATIO
          : isGangnamStyleAi
            ? GANGNAM_STYLE_AI_ASPECT_RATIO
            : isFlyingCarAi
              ? FLYING_CAR_AI_ASPECT_RATIO
              : isEnzoFernandezAi
                ? ENZO_FERNANDEZ_AI_ASPECT_RATIO
                : SMALLTOWN_ASPECT_RATIO;

    if (isFixedTemplateProduct) {
      await bindGenjutsuUploadInputs({
        generationId,
        userId: session.user.id,
        mode,
        resolution,
        prompt,
        product,
        ...target,
        useDefaultTemplate: true,
        aspectRatio: productAspectRatio,
        imageKeys: normalizedInputs.map((item) => item.key),
        contentTypes: normalizedInputs.map((item) => item.contentType),
        contentLengths,
      });
    } else {
      await bindGenjutsuUploadInputs({
        generationId,
        userId: session.user.id,
        mode,
        resolution,
        prompt,
        product,
        ...target,
        preview: isProductPreview || undefined,
        aspectRatio: isProductPreview
          ? isA2oLiteAi
            ? A2O_LITE_AI_ASPECT_RATIO
            : isColdplayKissCam
              ? COLDPLAY_KISS_CAM_ASPECT_RATIO
              : isGangnamStyleAi
                ? GANGNAM_STYLE_AI_ASPECT_RATIO
                : isFlyingCarAi
                  ? FLYING_CAR_AI_ASPECT_RATIO
                  : isEnzoFernandezAi
                    ? ENZO_FERNANDEZ_AI_ASPECT_RATIO
                    : CRAZY_FROG_ASPECT_RATIO
          : undefined,
        videoKey: normalizedInputs[0].key,
        imageKeys: normalizedInputs.slice(1).map((item) => item.key),
        contentTypes: normalizedInputs.map((item) => item.contentType),
        contentLengths,
      });
    }

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
      // Fixed-template full runs: storage indices are 1..N (0 reserved for
      // server template). Preview / homepage: 0 = video, 1+ = images.
      uploads: uploads.map((upload, fileIndex) => ({
        ...upload,
        index: isFixedTemplateProduct ? fileIndex + 1 : fileIndex,
      })),
    });
  } catch (error: any) {
    if (
      error instanceof A2oLiteAiProviderBindingError ||
      error instanceof EnzoFernandezAiProviderBindingError ||
      error instanceof FlyingCarAiProviderBindingError ||
      error instanceof ColdplayKissCamProviderBindingError ||
      error instanceof GangnamStyleAiProviderBindingError
    ) {
      return respErr(error.message, { status: 400 });
    }
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
