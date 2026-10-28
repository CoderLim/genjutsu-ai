import { createFileRoute } from '@tanstack/react-router';

import { getAuth } from '@/core/auth';
import { A2O_LITE_AI_PRODUCT_ID } from '@/modules/a2o-lite-ai/constants';
import { BURNING_BRIDGES_AI_PRODUCT_ID } from '@/modules/burning-bridges-ai/constants';
import { COLDPLAY_KISS_CAM_PRODUCT_ID } from '@/modules/coldplay-kiss-cam/constants';
import { CRAZY_FROG_PRODUCT_ID } from '@/modules/crazy-frog/constants';
import { ENZO_FERNANDEZ_AI_PRODUCT_ID } from '@/modules/enzo-fernandez-ai/constants';
import { FLYING_CAR_AI_PRODUCT_ID } from '@/modules/flying-car-ai/constants';
import { GANGNAM_STYLE_AI_PRODUCT_ID } from '@/modules/gangnam-style-ai/constants';
import { GAS_STATION_DANCE_AI_PRODUCT_ID } from '@/modules/gas-station-dance-ai/constants';
import {
  assertGenerationId,
  claimGenjutsuSeal,
  getGenjutsuTaskById,
  markGenjutsuAttemptFailedPreflight,
  markGenjutsuAttemptReady,
  reclaimStaleGenjutsuSeal,
} from '@/modules/genjutsu/billing';
import {
  getGenjutsuE2EUrlForStorageKey,
  isGenjutsuE2EMockEnabled,
  sealGenjutsuE2EStorageObject,
} from '@/modules/genjutsu/e2e-mock';
import {
  findExistingSealedGenjutsuTemplateInputs,
  genjutsuR2ObjectExists,
  getA2oLiteAiTemplateVideoKey,
  getBurningBridgesAiTemplateVideoKey,
  getColdplayKissCamTemplateVideoKey,
  getCrazyFrogTemplateVideoKey,
  getEnzoFernandezAiTemplateVideoKey,
  getFlyingCarAiTemplateVideoKey,
  getGangnamStyleAiTemplateVideoKey,
  getGasStationDanceAiTemplateVideoKey,
  getGenjutsuSealedInputKey,
  getSayItRightAiTemplateVideoKey,
  getShanShenBuTemplateVideoKey,
  getSmalltownBoyDanceTemplateVideoKey,
  getTinyDeskAiTemplateVideoKey,
  getZombieHugTemplateVideoKey,
  sealGenjutsuR2Inputs,
  sealGenjutsuTemplateR2Inputs,
} from '@/modules/genjutsu/storage';
import { SAY_IT_RIGHT_AI_PRODUCT_ID } from '@/modules/say-it-right-ai/constants';
import { SHAN_SHEN_BU_PRODUCT_ID } from '@/modules/shan-shen-bu/constants';
import { SMALLTOWN_PRODUCT_ID } from '@/modules/smalltown-boy-dance/constants';
import { TINY_DESK_AI_PRODUCT_ID } from '@/modules/tiny-desk-ai/constants';
import {
  isZombieHugAspectRatio,
  ZOMBIE_HUG_DEFAULT_ASPECT_RATIO,
  ZOMBIE_HUG_PRODUCT_ID,
} from '@/modules/zombie-hug/constants';
import { enforceMinIntervalRateLimit } from '@/lib/rate-limit';
import { respData, respErr, respJson } from '@/lib/resp';

function parseOptions(value: string | null | undefined) {
  if (!value) return null;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

async function POST({ request }: { request: Request }) {
  const limited = enforceMinIntervalRateLimit(request, {
    intervalMs: 750,
    keyPrefix: 'genjutsu-seal-inputs',
  });
  if (limited) return limited;

  let generationId: string | null = null;
  let userId: string | null = null;
  let sealClaimForFailure: string | null = null;

  try {
    const auth = getAuth();
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) return respErr('Unauthorized', { status: 401 });
    const uid = session.user.id;
    userId = uid;

    const body = await request.json().catch(() => ({}));
    const gid = assertGenerationId(body.generationId);
    generationId = gid;

    let task = await getGenjutsuTaskById({ generationId: gid, userId: uid });
    if (!task) {
      return respJson(
        -1,
        'Generation attempt not found',
        { code: 'GENERATION_NOT_FOUND' },
        { status: 404 }
      );
    }

    const currentOptions = parseOptions(task.options);
    if (task.status === 'ready') {
      return respData({
        generationId: gid,
        status: task.status,
        videoKey: currentOptions?.videoKey,
        imageKeys: currentOptions?.imageKeys,
      });
    }

    if (task.status !== 'initiated' && task.status !== 'sealing') {
      return respJson(
        -1,
        'Generation inputs can no longer be sealed',
        { code: 'GENERATION_ALREADY_STARTED' },
        { status: 409 }
      );
    }

    const useDefaultTemplate = currentOptions?.useDefaultTemplate === true;
    const product =
      typeof currentOptions?.product === 'string'
        ? currentOptions.product
        : null;
    const templateAspectRatio = isZombieHugAspectRatio(
      currentOptions?.aspectRatio
    )
      ? currentOptions.aspectRatio
      : ZOMBIE_HUG_DEFAULT_ASPECT_RATIO;
    // Product-scoped templates first; zombie-hug remains the legacy default
    // for useDefaultTemplate without a product binding.
    const sharedTemplateKey =
      product === SMALLTOWN_PRODUCT_ID
        ? getSmalltownBoyDanceTemplateVideoKey()
        : product === CRAZY_FROG_PRODUCT_ID
          ? getCrazyFrogTemplateVideoKey()
          : product === A2O_LITE_AI_PRODUCT_ID
            ? getA2oLiteAiTemplateVideoKey()
            : product === ENZO_FERNANDEZ_AI_PRODUCT_ID
              ? getEnzoFernandezAiTemplateVideoKey()
              : product === FLYING_CAR_AI_PRODUCT_ID
                ? getFlyingCarAiTemplateVideoKey()
                : product === SHAN_SHEN_BU_PRODUCT_ID
                  ? getShanShenBuTemplateVideoKey()
                  : product === COLDPLAY_KISS_CAM_PRODUCT_ID
                    ? getColdplayKissCamTemplateVideoKey()
                    : product === GANGNAM_STYLE_AI_PRODUCT_ID
                      ? getGangnamStyleAiTemplateVideoKey()
                      : product === GAS_STATION_DANCE_AI_PRODUCT_ID
                        ? getGasStationDanceAiTemplateVideoKey()
                        : product === BURNING_BRIDGES_AI_PRODUCT_ID
                          ? getBurningBridgesAiTemplateVideoKey()
                          : product === TINY_DESK_AI_PRODUCT_ID
                            ? getTinyDeskAiTemplateVideoKey()
                            : product === SAY_IT_RIGHT_AI_PRODUCT_ID
                              ? getSayItRightAiTemplateVideoKey()
                              : product === ZOMBIE_HUG_PRODUCT_ID
                                ? getZombieHugTemplateVideoKey(
                                    templateAspectRatio
                                  )
                                : // Legacy: useDefaultTemplate without product → zombie keys.
                                  getZombieHugTemplateVideoKey(
                                    templateAspectRatio
                                  );
    const videoKey =
      typeof currentOptions?.videoKey === 'string'
        ? currentOptions.videoKey
        : null;
    const imageKeys = Array.isArray(currentOptions?.imageKeys)
      ? currentOptions.imageKeys.filter(
          (value: unknown): value is string => typeof value === 'string'
        )
      : [];
    const contentTypes = Array.isArray(currentOptions?.contentTypes)
      ? currentOptions.contentTypes.filter(
          (value: unknown): value is string => typeof value === 'string'
        )
      : [];
    const contentLengths = Array.isArray(currentOptions?.contentLengths)
      ? currentOptions.contentLengths.map((value: unknown) => Number(value))
      : [];

    if (imageKeys.length < 1 || (!useDefaultTemplate && !videoKey)) {
      throw new Error('Generation upload inputs are not bound');
    }

    let sealClaim: string | null = null;
    if (task.status === 'initiated') {
      sealClaim = await claimGenjutsuSeal({ generationId: gid, userId: uid });
    }
    if (!sealClaim) {
      const reclaim = await reclaimStaleGenjutsuSeal({
        generationId: gid,
        userId: uid,
      });
      if (reclaim.status === 'reclaimed') {
        sealClaim = reclaim.sealClaim;
      } else {
        task = await getGenjutsuTaskById({ generationId: gid, userId: uid });
        const options = parseOptions(task?.options);
        if (task?.status === 'ready') {
          return respData({
            generationId: gid,
            status: task.status,
            videoKey: options?.videoKey,
            imageKeys: options?.imageKeys,
          });
        }
        return respJson(
          -1,
          'Generation inputs are already being sealed',
          { code: 'GENERATION_SEAL_IN_PROGRESS' },
          { status: 409 }
        );
      }
    }

    if (!sealClaim) {
      return respJson(
        -1,
        'Generation inputs are already being sealed',
        { code: 'GENERATION_SEAL_IN_PROGRESS' },
        { status: 409 }
      );
    }
    sealClaimForFailure = sealClaim;

    let sealed: { videoKey: string; imageKeys: string[] } | null = null;
    if (useDefaultTemplate) {
      if (isGenjutsuE2EMockEnabled()) {
        const sealedImageKeys = imageKeys.map((sourceKey: string) =>
          getGenjutsuSealedInputKey({
            userId: uid,
            generationId: gid,
            stagingKey: sourceKey,
          })
        );
        const sealedVideoKey = sealedImageKeys[0]
          .replace(/reference-\d+\./, 'source.')
          .replace(/\.(jpg|png|webp|gif|avif|heic|heif)$/i, '.mp4');
        if (
          getGenjutsuE2EUrlForStorageKey(sealedVideoKey) &&
          sealedImageKeys.every((key: string) =>
            getGenjutsuE2EUrlForStorageKey(key)
          )
        ) {
          sealed = { videoKey: sealedVideoKey, imageKeys: sealedImageKeys };
        }
      } else {
        sealed = await findExistingSealedGenjutsuTemplateInputs({
          userId: uid,
          generationId: gid,
          imageKeys,
        });
      }
    } else if (videoKey) {
      const expectedVideoKey = getGenjutsuSealedInputKey({
        userId: uid,
        generationId: gid,
        stagingKey: videoKey,
      });
      const expectedImageKeys = imageKeys.map((sourceKey: string) =>
        getGenjutsuSealedInputKey({
          userId: uid,
          generationId: gid,
          stagingKey: sourceKey,
        })
      );
      const exists = isGenjutsuE2EMockEnabled()
        ? Boolean(getGenjutsuE2EUrlForStorageKey(expectedVideoKey)) &&
          expectedImageKeys.every((key: string) =>
            Boolean(getGenjutsuE2EUrlForStorageKey(key))
          )
        : (await genjutsuR2ObjectExists(expectedVideoKey)) &&
          (
            await Promise.all(
              expectedImageKeys.map((key: string) =>
                genjutsuR2ObjectExists(key)
              )
            )
          ).every(Boolean);
      if (exists) {
        sealed = { videoKey: expectedVideoKey, imageKeys: expectedImageKeys };
      }
    }

    if (!sealed) {
      if (isGenjutsuE2EMockEnabled()) {
        if (useDefaultTemplate) {
          const sealedImageKeys = imageKeys.map((sourceKey: string) =>
            getGenjutsuSealedInputKey({
              userId: uid,
              generationId: gid,
              stagingKey: sourceKey,
            })
          );
          const sealedVideoKey = sealedImageKeys[0]
            .replace(/reference-\d+\./, 'source.')
            .replace(/\.(jpg|png|webp|gif|avif|heic|heif)$/i, '.mp4');
          sealGenjutsuE2EStorageObject(sharedTemplateKey, sealedVideoKey);
          imageKeys.forEach((sourceKey: string, index: number) =>
            sealGenjutsuE2EStorageObject(sourceKey, sealedImageKeys[index])
          );
          sealed = {
            videoKey: sealedVideoKey,
            imageKeys: sealedImageKeys,
          };
        } else {
          const sourceKeys = [videoKey as string, ...imageKeys];
          const sealedKeys = sourceKeys.map((sourceKey: string) =>
            getGenjutsuSealedInputKey({
              userId: uid,
              generationId: gid,
              stagingKey: sourceKey,
            })
          );
          sourceKeys.forEach((sourceKey: string, index: number) =>
            sealGenjutsuE2EStorageObject(sourceKey, sealedKeys[index])
          );
          sealed = {
            videoKey: sealedKeys[0],
            imageKeys: sealedKeys.slice(1),
          };
        }
      } else if (useDefaultTemplate) {
        sealed = await sealGenjutsuTemplateR2Inputs({
          userId: uid,
          generationId: gid,
          templateVideoKey: sharedTemplateKey,
          imageKeys,
          expectedContentTypes: contentTypes,
          expectedContentLengths: contentLengths,
        });
      } else {
        sealed = await sealGenjutsuR2Inputs({
          userId: uid,
          generationId: gid,
          videoKey: videoKey as string,
          imageKeys,
          expectedContentTypes: contentTypes,
          expectedContentLengths: contentLengths,
        });
      }
    }

    task = await markGenjutsuAttemptReady({
      generationId: gid,
      userId: uid,
      sealClaim,
      ...sealed,
    });
    if (!task || task.status !== 'ready') {
      throw new Error('Failed to finalize sealed generation inputs');
    }

    return respData({
      generationId: gid,
      status: task.status,
      ...sealed,
    });
  } catch (error: any) {
    if (generationId && userId && sealClaimForFailure) {
      await markGenjutsuAttemptFailedPreflight({
        generationId,
        userId,
        sealClaim: sealClaimForFailure,
        stage: 'seal_inputs',
        errorCode: 'INPUT_SEAL_FAILED',
        error: error?.message || 'Failed to seal generation inputs',
      }).catch(() => undefined);
    }

    console.error('genjutsu seal-inputs failed:', error);
    return respErr(error?.message || 'Failed to seal generation inputs', {
      status: 400,
    });
  }
}

export const Route = createFileRoute('/api/genjutsu/seal-inputs')({
  server: {
    handlers: { POST },
  },
});
