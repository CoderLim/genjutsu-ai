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
import { isAllowedBicepHeartAiPrompt } from '@/modules/bicep-heart-ai/assert';
import {
  BICEP_HEART_AI_ASPECT_RATIO,
  BICEP_HEART_AI_MODE,
  BICEP_HEART_AI_PRODUCT_ID,
  BICEP_HEART_AI_RESOLUTIONS,
} from '@/modules/bicep-heart-ai/constants';
import {
  assertBicepHeartAiProviderBinding,
  BicepHeartAiProviderBindingError,
} from '@/modules/bicep-heart-ai/provider';
import { isAllowedBurningBridgesAiPrompt } from '@/modules/burning-bridges-ai/assert';
import {
  BURNING_BRIDGES_AI_ASPECT_RATIO,
  BURNING_BRIDGES_AI_MODE,
  BURNING_BRIDGES_AI_PRODUCT_ID,
  BURNING_BRIDGES_AI_RESOLUTIONS,
} from '@/modules/burning-bridges-ai/constants';
import {
  assertBurningBridgesAiProviderBinding,
  BurningBridgesAiProviderBindingError,
} from '@/modules/burning-bridges-ai/provider';
import { isAllowedCanIRideDanceAiPrompt } from '@/modules/can-i-ride-dance-ai/assert';
import {
  CAN_I_RIDE_DANCE_AI_ASPECT_RATIO,
  CAN_I_RIDE_DANCE_AI_DEFAULT_CAST_MODE,
  CAN_I_RIDE_DANCE_AI_MODE,
  CAN_I_RIDE_DANCE_AI_PRODUCT_ID,
  CAN_I_RIDE_DANCE_AI_RESOLUTIONS,
  getCanIRideDanceAiImageCount,
  getCanIRideDanceAiPrompt,
  isCanIRideDanceAiCastMode,
  type CanIRideDanceAiCastMode,
} from '@/modules/can-i-ride-dance-ai/constants';
import {
  assertCanIRideDanceAiProviderBinding,
  CanIRideDanceAiProviderBindingError,
} from '@/modules/can-i-ride-dance-ai/provider';
import { isAllowedChipmunksDancePrompt } from '@/modules/chipmunks-dance/assert';
import {
  CHIPMUNKS_DANCE_ASPECT_RATIO,
  CHIPMUNKS_DANCE_MODE,
  CHIPMUNKS_DANCE_PRODUCT_ID,
  CHIPMUNKS_DANCE_RESOLUTIONS,
} from '@/modules/chipmunks-dance/constants';
import {
  assertChipmunksDanceProviderBinding,
  ChipmunksDanceProviderBindingError,
} from '@/modules/chipmunks-dance/provider';
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
import { isAllowedDeckTheHallsDanceAiPrompt } from '@/modules/deck-the-halls-dance-ai/assert';
import {
  DECK_THE_HALLS_DANCE_AI_ASPECT_RATIO,
  DECK_THE_HALLS_DANCE_AI_DEFAULT_CAST_MODE,
  DECK_THE_HALLS_DANCE_AI_MODE,
  DECK_THE_HALLS_DANCE_AI_PRODUCT_ID,
  DECK_THE_HALLS_DANCE_AI_RESOLUTIONS,
  getDeckTheHallsDanceAiImageCount,
  getDeckTheHallsDanceAiPrompt,
  isDeckTheHallsDanceAiCastMode,
  type DeckTheHallsDanceAiCastMode,
} from '@/modules/deck-the-halls-dance-ai/constants';
import {
  assertDeckTheHallsDanceAiProviderBinding,
  DeckTheHallsDanceAiProviderBindingError,
} from '@/modules/deck-the-halls-dance-ai/provider';
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
import { isAllowedGasStationDanceAiPrompt } from '@/modules/gas-station-dance-ai/assert';
import {
  GAS_STATION_DANCE_AI_ASPECT_RATIO,
  GAS_STATION_DANCE_AI_MODE,
  GAS_STATION_DANCE_AI_PRODUCT_ID,
  GAS_STATION_DANCE_AI_RESOLUTIONS,
} from '@/modules/gas-station-dance-ai/constants';
import {
  assertGasStationDanceAiProviderBinding,
  GasStationDanceAiProviderBindingError,
} from '@/modules/gas-station-dance-ai/provider';
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
  ensureBicepHeartTemplateInR2,
  ensureBurningBridgesAiTemplateInR2,
  ensureCanIRideDanceAiTemplateInR2,
  ensureChipmunksDanceTemplateInR2,
  ensureColdplayKissCamTemplateInR2,
  ensureCrazyFrogTemplateInR2,
  ensureDeckTheHallsDanceAiTemplateInR2,
  ensureEnzoFernandezAiTemplateInR2,
  ensureFlyingCarAiTemplateInR2,
  ensureGangnamStyleAiTemplateInR2,
  ensureGasStationDanceAiTemplateInR2,
  ensureGlowStickAiTemplateInR2,
  ensureSayItRightAiTemplateInR2,
  ensureShanShenBuTemplateInR2,
  ensureSmalltownBoyDanceTemplateInR2,
  ensureTinyDeskAiTemplateInR2,
  ensureWassupInAMinuteAiTemplateInR2,
  ensureZombieHugTemplateInR2,
  GENJUTSU_PROXY_UPLOAD_MAX_BYTES,
  getA2oLiteAiTemplateVideoKey,
  getBicepHeartTemplateVideoKey,
  getBurningBridgesAiTemplateVideoKey,
  getCanIRideDanceAiTemplateVideoKey,
  getChipmunksDanceTemplateVideoKey,
  getColdplayKissCamTemplateVideoKey,
  getCrazyFrogTemplateVideoKey,
  getDeckTheHallsDanceAiTemplateVideoKey,
  getEnzoFernandezAiTemplateVideoKey,
  getFlyingCarAiTemplateVideoKey,
  getGangnamStyleAiTemplateVideoKey,
  getGasStationDanceAiTemplateVideoKey,
  getGenjutsuInputKey,
  getGlowStickAiTemplateVideoKey,
  getSayItRightAiTemplateVideoKey,
  getShanShenBuTemplateVideoKey,
  getSmalltownBoyDanceTemplateVideoKey,
  getTinyDeskAiTemplateVideoKey,
  getWassupInAMinuteAiTemplateVideoKey,
  getZombieHugTemplateVideoKey,
} from '@/modules/genjutsu/storage';
import type { GenjutsuProvider } from '@/modules/genjutsu/types';
import {
  isGenjutsuProductId,
  resolveProductProviderTarget,
} from '@/modules/genjutsu/workflow';
import { isAllowedGlowStickAiPrompt } from '@/modules/glow-stick-ai/assert';
import {
  GLOW_STICK_AI_ASPECT_RATIO,
  GLOW_STICK_AI_MODE,
  GLOW_STICK_AI_PRODUCT_ID,
  GLOW_STICK_AI_RESOLUTIONS,
} from '@/modules/glow-stick-ai/constants';
import {
  assertGlowStickAiProviderBinding,
  GlowStickAiProviderBindingError,
} from '@/modules/glow-stick-ai/provider';
import { isAllowedSayItRightAiPrompt } from '@/modules/say-it-right-ai/assert';
import {
  SAY_IT_RIGHT_AI_ASPECT_RATIO,
  SAY_IT_RIGHT_AI_MODE,
  SAY_IT_RIGHT_AI_PRODUCT_ID,
  SAY_IT_RIGHT_AI_RESOLUTIONS,
} from '@/modules/say-it-right-ai/constants';
import {
  assertSayItRightAiProviderBinding,
  SayItRightAiProviderBindingError,
} from '@/modules/say-it-right-ai/provider';
import { isAllowedShanShenBuPrompt } from '@/modules/shan-shen-bu/assert';
import {
  SHAN_SHEN_BU_ASPECT_RATIO,
  SHAN_SHEN_BU_MODE,
  SHAN_SHEN_BU_PRODUCT_ID,
  SHAN_SHEN_BU_RESOLUTIONS,
} from '@/modules/shan-shen-bu/constants';
import {
  assertShanShenBuProviderBinding,
  ShanShenBuProviderBindingError,
} from '@/modules/shan-shen-bu/provider';
import {
  SMALLTOWN_ASPECT_RATIO,
  SMALLTOWN_PRODUCT_ID,
  SMALLTOWN_RESOLUTIONS,
} from '@/modules/smalltown-boy-dance/constants';
import { isAllowedTinyDeskAiPrompt } from '@/modules/tiny-desk-ai/assert';
import {
  TINY_DESK_AI_ASPECT_RATIO,
  TINY_DESK_AI_MAX_IMAGES,
  TINY_DESK_AI_MIN_IMAGES,
  TINY_DESK_AI_MODE,
  TINY_DESK_AI_PRODUCT_ID,
  TINY_DESK_AI_RESOLUTIONS,
} from '@/modules/tiny-desk-ai/constants';
import {
  assertTinyDeskAiProviderBinding,
  TinyDeskAiProviderBindingError,
} from '@/modules/tiny-desk-ai/provider';
import { isAllowedWassupInAMinuteAiPrompt } from '@/modules/wassup-in-a-minute-ai/assert';
import {
  WASSUP_IN_A_MINUTE_AI_ASPECT_RATIO,
  WASSUP_IN_A_MINUTE_AI_MAX_IMAGES,
  WASSUP_IN_A_MINUTE_AI_MIN_IMAGES,
  WASSUP_IN_A_MINUTE_AI_MODE,
  WASSUP_IN_A_MINUTE_AI_PRODUCT_ID,
  WASSUP_IN_A_MINUTE_AI_RESOLUTIONS,
} from '@/modules/wassup-in-a-minute-ai/constants';
import {
  assertWassupInAMinuteAiProviderBinding,
  WassupInAMinuteAiProviderBindingError,
} from '@/modules/wassup-in-a-minute-ai/provider';
import { isAllowedZombieHugPrompt } from '@/modules/zombie-hug/assert';
import {
  isZombieHugAspectRatio,
  ZOMBIE_HUG_MODE,
  ZOMBIE_HUG_PRODUCT_ID,
  ZOMBIE_HUG_RESOLUTIONS,
  type ZombieHugAspectRatio,
} from '@/modules/zombie-hug/constants';
import {
  assertZombieHugProviderBinding,
  ZombieHugProviderBindingError,
} from '@/modules/zombie-hug/provider';
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
    const isBurningBridgesAi = product === BURNING_BRIDGES_AI_PRODUCT_ID;
    const isBicepHeartAi = product === BICEP_HEART_AI_PRODUCT_ID;
    const isTinyDeskAi = product === TINY_DESK_AI_PRODUCT_ID;
    const isSayItRightAi = product === SAY_IT_RIGHT_AI_PRODUCT_ID;
    const isDeckTheHallsDanceAi =
      product === DECK_THE_HALLS_DANCE_AI_PRODUCT_ID;
    const isCanIRideDanceAi = product === CAN_I_RIDE_DANCE_AI_PRODUCT_ID;
    const isFlyingCarAi = product === FLYING_CAR_AI_PRODUCT_ID;
    const isShanShenBu = product === SHAN_SHEN_BU_PRODUCT_ID;
    const isColdplayKissCam = product === COLDPLAY_KISS_CAM_PRODUCT_ID;
    const isGangnamStyleAi = product === GANGNAM_STYLE_AI_PRODUCT_ID;
    const isGasStationDanceAi = product === GAS_STATION_DANCE_AI_PRODUCT_ID;
    const isGlowStickAi = product === GLOW_STICK_AI_PRODUCT_ID;
    const isWassupInAMinuteAi = product === WASSUP_IN_A_MINUTE_AI_PRODUCT_ID;
    const isChipmunksDance = product === CHIPMUNKS_DANCE_PRODUCT_ID;
    const isZombieHug = product === ZOMBIE_HUG_PRODUCT_ID;
    const isTripleImageProduct =
      isGangnamStyleAi ||
      isGasStationDanceAi ||
      isGlowStickAi ||
      isChipmunksDance;
    const isSingleImageProduct =
      isEnzoFernandezAi ||
      isFlyingCarAi ||
      isShanShenBu ||
      isBurningBridgesAi ||
      isBicepHeartAi ||
      isSayItRightAi;
    const isProductPreview =
      (isCrazyFrog ||
        isA2oLiteAi ||
        isEnzoFernandezAi ||
        isBurningBridgesAi ||
        isBicepHeartAi ||
        isTinyDeskAi ||
        isSayItRightAi ||
        isDeckTheHallsDanceAi ||
        isCanIRideDanceAi ||
        isFlyingCarAi ||
        isShanShenBu ||
        isColdplayKissCam ||
        isGangnamStyleAi ||
        isGasStationDanceAi ||
        isGlowStickAi ||
        isWassupInAMinuteAi ||
        isChipmunksDance ||
        isZombieHug ||
        isSmalltown) &&
      body.preview === true;
    // Full fixed templates: server template + image-only uploads.
    // Preview: client uploads a trimmed ≤4s clip + reference image(s).
    const isFixedTemplateProduct =
      (isSmalltown ||
        isCrazyFrog ||
        isA2oLiteAi ||
        isEnzoFernandezAi ||
        isBurningBridgesAi ||
        isBicepHeartAi ||
        isTinyDeskAi ||
        isSayItRightAi ||
        isDeckTheHallsDanceAi ||
        isCanIRideDanceAi ||
        isFlyingCarAi ||
        isShanShenBu ||
        isColdplayKissCam ||
        isGangnamStyleAi ||
        isGasStationDanceAi ||
        isGlowStickAi ||
        isWassupInAMinuteAi ||
        isChipmunksDance ||
        isZombieHug) &&
      !isProductPreview;
    const zombieAspectRatio: ZombieHugAspectRatio | null = isZombieHug
      ? isZombieHugAspectRatio(body.aspectRatio)
        ? body.aspectRatio
        : null
      : null;
    if (isZombieHug && !zombieAspectRatio) {
      return respErr('Zombie Hug requires aspect ratio 16:9 or 9:16', {
        status: 400,
      });
    }
    const deckHallsCastMode: DeckTheHallsDanceAiCastMode | null =
      isDeckTheHallsDanceAi
        ? isDeckTheHallsDanceAiCastMode(body.preset)
          ? body.preset
          : DECK_THE_HALLS_DANCE_AI_DEFAULT_CAST_MODE
        : null;
    if (
      isDeckTheHallsDanceAi &&
      body.preset != null &&
      !isDeckTheHallsDanceAiCastMode(body.preset)
    ) {
      return respErr('Deck the Halls Dance AI cast must be solo or duo', {
        status: 400,
      });
    }
    const canIRideCastMode: CanIRideDanceAiCastMode | null = isCanIRideDanceAi
      ? isCanIRideDanceAiCastMode(body.preset)
        ? body.preset
        : CAN_I_RIDE_DANCE_AI_DEFAULT_CAST_MODE
      : null;
    if (
      isCanIRideDanceAi &&
      body.preset != null &&
      !isCanIRideDanceAiCastMode(body.preset)
    ) {
      return respErr('Can I Ride Dance AI cast must be solo or duo', {
        status: 400,
      });
    }
    const castDanceMode = deckHallsCastMode || canIRideCastMode || undefined;
    // Tiny Desk / Wassup allow variable cast sizes; other fixed templates are exact.
    const fixedTemplateImageCount =
      isTinyDeskAi || isWassupInAMinuteAi
        ? null
        : isDeckTheHallsDanceAi && deckHallsCastMode
          ? getDeckTheHallsDanceAiImageCount(deckHallsCastMode)
          : isCanIRideDanceAi && canIRideCastMode
            ? getCanIRideDanceAiImageCount(canIRideCastMode)
            : isSingleImageProduct
              ? FIXED_TEMPLATE_SINGLE_IMAGE_COUNT
              : isTripleImageProduct
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
            : isZombieHug
              ? 'Zombie Hug preview must use 480p'
              : isGangnamStyleAi
                ? 'Gangnam Style AI preview must use 480p'
                : isGasStationDanceAi
                  ? 'Gas Station Dance AI preview must use 480p'
                  : isGlowStickAi
                    ? 'Glow Stick AI preview must use 480p'
                    : isWassupInAMinuteAi
                      ? 'Wassup in a Minute AI preview must use 480p'
                      : isChipmunksDance
                        ? 'Chipmunks Dance preview must use 480p'
                        : isFlyingCarAi
                          ? 'Flying Car AI preview must use 480p'
                          : isShanShenBu
                            ? 'Shan Shen Bu preview must use 480p'
                            : isEnzoFernandezAi
                              ? 'Enzo Fernandez AI preview must use 480p'
                              : isBurningBridgesAi
                                ? 'Burning Bridges AI preview must use 480p'
                                : isBicepHeartAi
                                  ? 'Bicep Heart AI preview must use 480p'
                                  : isSayItRightAi
                                    ? 'Say It Right AI preview must use 480p'
                                    : isDeckTheHallsDanceAi
                                      ? 'Deck the Halls Dance AI preview must use 480p'
                                      : isCanIRideDanceAi
                                        ? 'Can I Ride Dance AI preview must use 480p'
                                        : isSmalltown
                                          ? 'Smalltown Boy Dance preview must use 480p'
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
    if (isBurningBridgesAi && mode !== BURNING_BRIDGES_AI_MODE) {
      return respErr('Burning Bridges AI only supports objects-swap', {
        status: 400,
      });
    }
    if (
      isBurningBridgesAi &&
      !BURNING_BRIDGES_AI_RESOLUTIONS.includes(
        resolution as (typeof BURNING_BRIDGES_AI_RESOLUTIONS)[number]
      )
    ) {
      return respErr('Burning Bridges AI only supports 480p and 720p', {
        status: 400,
      });
    }
    if (isBurningBridgesAi && !isAllowedBurningBridgesAiPrompt(prompt)) {
      return respErr(
        'Burning Bridges AI prompt does not match the fixed product prompt',
        {
          status: 400,
        }
      );
    }
    if (isTinyDeskAi && mode !== TINY_DESK_AI_MODE) {
      return respErr('Tiny Desk AI only supports objects-swap', {
        status: 400,
      });
    }
    if (
      isTinyDeskAi &&
      !TINY_DESK_AI_RESOLUTIONS.includes(
        resolution as (typeof TINY_DESK_AI_RESOLUTIONS)[number]
      )
    ) {
      return respErr('Tiny Desk AI only supports 480p and 720p', {
        status: 400,
      });
    }
    if (isTinyDeskAi && !isAllowedTinyDeskAiPrompt(prompt)) {
      return respErr(
        'Tiny Desk AI prompt does not match the fixed product prompt',
        {
          status: 400,
        }
      );
    }
    if (isSayItRightAi && mode !== SAY_IT_RIGHT_AI_MODE) {
      return respErr('Say It Right AI only supports objects-swap', {
        status: 400,
      });
    }
    if (
      isSayItRightAi &&
      !SAY_IT_RIGHT_AI_RESOLUTIONS.includes(
        resolution as (typeof SAY_IT_RIGHT_AI_RESOLUTIONS)[number]
      )
    ) {
      return respErr('Say It Right AI only supports 480p and 720p', {
        status: 400,
      });
    }
    if (isSayItRightAi && !isAllowedSayItRightAiPrompt(prompt)) {
      return respErr(
        'Say It Right AI prompt does not match the fixed product prompt',
        {
          status: 400,
        }
      );
    }
    if (isDeckTheHallsDanceAi && mode !== DECK_THE_HALLS_DANCE_AI_MODE) {
      return respErr('Deck the Halls Dance AI only supports objects-swap', {
        status: 400,
      });
    }
    if (
      isDeckTheHallsDanceAi &&
      !DECK_THE_HALLS_DANCE_AI_RESOLUTIONS.includes(
        resolution as (typeof DECK_THE_HALLS_DANCE_AI_RESOLUTIONS)[number]
      )
    ) {
      return respErr('Deck the Halls Dance AI only supports 480p and 720p', {
        status: 400,
      });
    }
    if (isDeckTheHallsDanceAi && !isAllowedDeckTheHallsDanceAiPrompt(prompt)) {
      return respErr(
        'Deck the Halls Dance AI prompt does not match the fixed product prompt',
        {
          status: 400,
        }
      );
    }
    if (
      isDeckTheHallsDanceAi &&
      deckHallsCastMode &&
      prompt !== getDeckTheHallsDanceAiPrompt(deckHallsCastMode)
    ) {
      return respErr(
        'Deck the Halls Dance AI prompt does not match the selected cast mode',
        { status: 400 }
      );
    }
    if (isCanIRideDanceAi && mode !== CAN_I_RIDE_DANCE_AI_MODE) {
      return respErr('Can I Ride Dance AI only supports objects-swap', {
        status: 400,
      });
    }
    if (
      isCanIRideDanceAi &&
      !CAN_I_RIDE_DANCE_AI_RESOLUTIONS.includes(
        resolution as (typeof CAN_I_RIDE_DANCE_AI_RESOLUTIONS)[number]
      )
    ) {
      return respErr('Can I Ride Dance AI only supports 480p and 720p', {
        status: 400,
      });
    }
    if (isCanIRideDanceAi && !isAllowedCanIRideDanceAiPrompt(prompt)) {
      return respErr(
        'Can I Ride Dance AI prompt does not match the fixed product prompt',
        {
          status: 400,
        }
      );
    }
    if (
      isCanIRideDanceAi &&
      canIRideCastMode &&
      prompt !== getCanIRideDanceAiPrompt(canIRideCastMode)
    ) {
      return respErr(
        'Can I Ride Dance AI prompt does not match the selected cast mode',
        { status: 400 }
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
    if (isShanShenBu && mode !== SHAN_SHEN_BU_MODE) {
      return respErr('Shan Shen Bu only supports objects-swap', {
        status: 400,
      });
    }
    if (
      isShanShenBu &&
      !SHAN_SHEN_BU_RESOLUTIONS.includes(
        resolution as (typeof SHAN_SHEN_BU_RESOLUTIONS)[number]
      )
    ) {
      return respErr('Shan Shen Bu only supports 480p and 720p', {
        status: 400,
      });
    }
    if (isShanShenBu && !isAllowedShanShenBuPrompt(prompt)) {
      return respErr(
        'Shan Shen Bu prompt does not match the fixed product prompt',
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
    if (isZombieHug && mode !== ZOMBIE_HUG_MODE) {
      return respErr('Zombie Hug only supports objects-swap', { status: 400 });
    }
    if (
      isZombieHug &&
      !ZOMBIE_HUG_RESOLUTIONS.includes(
        resolution as (typeof ZOMBIE_HUG_RESOLUTIONS)[number]
      )
    ) {
      return respErr('Zombie Hug only supports 480p and 720p', {
        status: 400,
      });
    }
    if (isZombieHug && !isAllowedZombieHugPrompt(prompt)) {
      return respErr(
        'Zombie Hug prompt does not match the fixed product prompt',
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
    if (isGasStationDanceAi && mode !== GAS_STATION_DANCE_AI_MODE) {
      return respErr('Gas Station Dance AI only supports objects-swap', {
        status: 400,
      });
    }
    if (
      isGasStationDanceAi &&
      !GAS_STATION_DANCE_AI_RESOLUTIONS.includes(
        resolution as (typeof GAS_STATION_DANCE_AI_RESOLUTIONS)[number]
      )
    ) {
      return respErr('Gas Station Dance AI only supports 480p and 720p', {
        status: 400,
      });
    }
    if (isGasStationDanceAi && !isAllowedGasStationDanceAiPrompt(prompt)) {
      return respErr(
        'Gas Station Dance AI prompt does not match the fixed product prompt',
        {
          status: 400,
        }
      );
    }
    if (isGlowStickAi && mode !== GLOW_STICK_AI_MODE) {
      return respErr('Glow Stick AI only supports objects-swap', {
        status: 400,
      });
    }
    if (
      isGlowStickAi &&
      !GLOW_STICK_AI_RESOLUTIONS.includes(
        resolution as (typeof GLOW_STICK_AI_RESOLUTIONS)[number]
      )
    ) {
      return respErr('Glow Stick AI only supports 480p and 720p', {
        status: 400,
      });
    }
    if (isGlowStickAi && !isAllowedGlowStickAiPrompt(prompt)) {
      return respErr(
        'Glow Stick AI prompt does not match the fixed product prompt',
        {
          status: 400,
        }
      );
    }
    if (isWassupInAMinuteAi && mode !== WASSUP_IN_A_MINUTE_AI_MODE) {
      return respErr('Wassup in a Minute AI only supports objects-swap', {
        status: 400,
      });
    }
    if (
      isWassupInAMinuteAi &&
      !WASSUP_IN_A_MINUTE_AI_RESOLUTIONS.includes(
        resolution as (typeof WASSUP_IN_A_MINUTE_AI_RESOLUTIONS)[number]
      )
    ) {
      return respErr('Wassup in a Minute AI only supports 480p and 720p', {
        status: 400,
      });
    }
    if (isWassupInAMinuteAi && !isAllowedWassupInAMinuteAiPrompt(prompt)) {
      return respErr(
        'Wassup in a Minute AI prompt does not match the fixed product prompt',
        {
          status: 400,
        }
      );
    }
    if (isChipmunksDance && mode !== CHIPMUNKS_DANCE_MODE) {
      return respErr('Chipmunks Dance only supports objects-swap', {
        status: 400,
      });
    }
    if (
      isChipmunksDance &&
      !CHIPMUNKS_DANCE_RESOLUTIONS.includes(
        resolution as (typeof CHIPMUNKS_DANCE_RESOLUTIONS)[number]
      )
    ) {
      return respErr('Chipmunks Dance only supports 480p and 720p', {
        status: 400,
      });
    }
    if (isChipmunksDance && !isAllowedChipmunksDancePrompt(prompt)) {
      return respErr(
        'Chipmunks Dance prompt does not match the fixed product prompt',
        {
          status: 400,
        }
      );
    }

    if (isBicepHeartAi && mode !== BICEP_HEART_AI_MODE) {
      return respErr('Bicep Heart AI only supports objects-swap', {
        status: 400,
      });
    }
    if (
      isBicepHeartAi &&
      !BICEP_HEART_AI_RESOLUTIONS.includes(
        resolution as (typeof BICEP_HEART_AI_RESOLUTIONS)[number]
      )
    ) {
      return respErr('Bicep Heart AI only supports 480p and 720p', {
        status: 400,
      });
    }
    if (isBicepHeartAi && !isAllowedBicepHeartAiPrompt(prompt)) {
      return respErr(
        'Bicep Heart AI prompt does not match the fixed product prompt',
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
          : isZombieHug
            ? 'Zombie Hug'
            : isGangnamStyleAi
              ? 'Gangnam Style AI'
              : isGasStationDanceAi
                ? 'Gas Station Dance AI'
                : isGlowStickAi
                  ? 'Glow Stick AI'
                  : isChipmunksDance
                    ? 'Chipmunks Dance'
                    : isFlyingCarAi
                      ? 'Flying Car AI'
                      : isShanShenBu
                        ? 'Shan Shen Bu'
                        : isEnzoFernandezAi
                          ? 'Enzo Fernandez AI'
                          : isBurningBridgesAi
                            ? 'Burning Bridges AI'
                            : isBicepHeartAi
                              ? 'Bicep Heart AI'
                              : isSayItRightAi
                                ? 'Say It Right AI'
                                : isDeckTheHallsDanceAi
                                  ? 'Deck the Halls Dance AI'
                                  : isCanIRideDanceAi
                                    ? 'Can I Ride Dance AI'
                                    : isSmalltown
                                      ? 'Smalltown Boy Dance'
                                      : 'Crazy Frog';
      const previewImageCount =
        isTinyDeskAi || isWassupInAMinuteAi
          ? Math.max(0, contentTypes.length - 1)
          : isDeckTheHallsDanceAi && deckHallsCastMode
            ? getDeckTheHallsDanceAiImageCount(deckHallsCastMode)
            : isCanIRideDanceAi && canIRideCastMode
              ? getCanIRideDanceAiImageCount(canIRideCastMode)
              : isSingleImageProduct
                ? 1
                : isTripleImageProduct
                  ? 3
                  : 2;
      const previewUploadCount = previewImageCount + 1;
      if (isTinyDeskAi) {
        if (
          previewImageCount < TINY_DESK_AI_MIN_IMAGES ||
          previewImageCount > TINY_DESK_AI_MAX_IMAGES ||
          contentTypes.length !== previewUploadCount ||
          contentLengths.length !== previewUploadCount
        ) {
          return respErr(
            'Tiny Desk AI preview requires one trimmed video plus 1–5 reference images',
            { status: 400 }
          );
        }
      } else if (isWassupInAMinuteAi) {
        if (
          previewImageCount < WASSUP_IN_A_MINUTE_AI_MIN_IMAGES ||
          previewImageCount > WASSUP_IN_A_MINUTE_AI_MAX_IMAGES ||
          contentTypes.length !== previewUploadCount ||
          contentLengths.length !== previewUploadCount
        ) {
          return respErr(
            'Wassup in a Minute AI preview requires one trimmed video plus 1–3 reference images',
            { status: 400 }
          );
        }
      } else if (
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
      if (isTinyDeskAi) {
        if (
          contentTypes.length < TINY_DESK_AI_MIN_IMAGES ||
          contentTypes.length > TINY_DESK_AI_MAX_IMAGES ||
          contentLengths.length !== contentTypes.length
        ) {
          return respErr('Upload between 1 and 5 reference images', {
            status: 400,
          });
        }
      } else if (isWassupInAMinuteAi) {
        if (
          contentTypes.length < WASSUP_IN_A_MINUTE_AI_MIN_IMAGES ||
          contentTypes.length > WASSUP_IN_A_MINUTE_AI_MAX_IMAGES ||
          contentLengths.length !== contentTypes.length
        ) {
          return respErr('Upload between 1 and 3 reference images', {
            status: 400,
          });
        }
      } else if (
        fixedTemplateImageCount == null ||
        contentTypes.length !== fixedTemplateImageCount ||
        contentLengths.length !== fixedTemplateImageCount
      ) {
        return respErr(
          isCrazyFrog
            ? 'Upload exactly two reference images (lead and chaser)'
            : isTripleImageProduct
              ? 'Upload exactly three reference images'
              : isA2oLiteAi || isColdplayKissCam || isZombieHug
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
            isTinyDeskAi || isWassupInAMinuteAi
              ? 'All uploads must be images (JPG, PNG, WebP, or GIF)'
              : isSingleImageProduct
                ? 'Upload must be an image (JPG, PNG, WebP, or GIF)'
                : isTripleImageProduct
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
                  : isZombieHug
                    ? getZombieHugTemplateVideoKey(zombieAspectRatio!)
                    : isGangnamStyleAi
                      ? getGangnamStyleAiTemplateVideoKey()
                      : isGasStationDanceAi
                        ? getGasStationDanceAiTemplateVideoKey()
                        : isGlowStickAi
                          ? getGlowStickAiTemplateVideoKey()
                          : isChipmunksDance
                            ? getChipmunksDanceTemplateVideoKey()
                            : isFlyingCarAi
                              ? getFlyingCarAiTemplateVideoKey()
                              : isShanShenBu
                                ? getShanShenBuTemplateVideoKey()
                                : isEnzoFernandezAi
                                  ? getEnzoFernandezAiTemplateVideoKey()
                                  : isBurningBridgesAi
                                    ? getBurningBridgesAiTemplateVideoKey()
                                    : isTinyDeskAi
                                      ? getTinyDeskAiTemplateVideoKey()
                                      : isWassupInAMinuteAi
                                        ? getWassupInAMinuteAiTemplateVideoKey()
                                        : isSayItRightAi
                                          ? getSayItRightAiTemplateVideoKey()
                                          : isDeckTheHallsDanceAi
                                            ? getDeckTheHallsDanceAiTemplateVideoKey(
                                                deckHallsCastMode ||
                                                  DECK_THE_HALLS_DANCE_AI_DEFAULT_CAST_MODE
                                              )
                                            : isCanIRideDanceAi
                                              ? getCanIRideDanceAiTemplateVideoKey(
                                                  canIRideCastMode ||
                                                    CAN_I_RIDE_DANCE_AI_DEFAULT_CAST_MODE
                                                )
                                              : getSmalltownBoyDanceTemplateVideoKey()
          );
        } else if (isCrazyFrog) {
          await ensureCrazyFrogTemplateInR2();
        } else if (isA2oLiteAi) {
          await ensureA2oLiteAiTemplateInR2();
        } else if (isColdplayKissCam) {
          await ensureColdplayKissCamTemplateInR2();
        } else if (isZombieHug) {
          await ensureZombieHugTemplateInR2(zombieAspectRatio!);
        } else if (isGangnamStyleAi) {
          await ensureGangnamStyleAiTemplateInR2();
        } else if (isGasStationDanceAi) {
          await ensureGasStationDanceAiTemplateInR2();
        } else if (isGlowStickAi) {
          await ensureGlowStickAiTemplateInR2();
        } else if (isChipmunksDance) {
          await ensureChipmunksDanceTemplateInR2();
        } else if (isFlyingCarAi) {
          await ensureFlyingCarAiTemplateInR2();
        } else if (isShanShenBu) {
          await ensureShanShenBuTemplateInR2();
        } else if (isEnzoFernandezAi) {
          await ensureEnzoFernandezAiTemplateInR2();
        } else if (isBurningBridgesAi) {
          await ensureBurningBridgesAiTemplateInR2();
        } else if (isBicepHeartAi) {
          await ensureBicepHeartTemplateInR2();
        } else if (isTinyDeskAi) {
          await ensureTinyDeskAiTemplateInR2();
        } else if (isWassupInAMinuteAi) {
          await ensureWassupInAMinuteAiTemplateInR2();
        } else if (isSayItRightAi) {
          await ensureSayItRightAiTemplateInR2();
        } else if (isDeckTheHallsDanceAi) {
          await ensureDeckTheHallsDanceAiTemplateInR2(
            deckHallsCastMode || DECK_THE_HALLS_DANCE_AI_DEFAULT_CAST_MODE
          );
        } else if (isCanIRideDanceAi) {
          await ensureCanIRideDanceAiTemplateInR2(
            canIRideCastMode || CAN_I_RIDE_DANCE_AI_DEFAULT_CAST_MODE
          );
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
                  : isZombieHug
                    ? 'Zombie Hug template is not configured in R2.'
                    : isGangnamStyleAi
                      ? 'Gangnam Style AI template is not configured in R2.'
                      : isGasStationDanceAi
                        ? 'Gas Station Dance AI template is not configured in R2.'
                        : isGlowStickAi
                          ? 'Glow Stick AI template is not configured in R2.'
                          : isChipmunksDance
                            ? 'Chipmunks Dance template is not configured in R2.'
                            : isFlyingCarAi
                              ? 'Flying Car AI template is not configured in R2.'
                              : isShanShenBu
                                ? 'Shan Shen Bu template is not configured in R2.'
                                : isEnzoFernandezAi
                                  ? 'Enzo Fernandez AI template is not configured in R2.'
                                  : isBurningBridgesAi
                                    ? 'Burning Bridges AI template is not configured in R2.'
                                    : isBicepHeartAi
                                      ? 'Bicep Heart AI template is not configured in R2.'
                                      : isTinyDeskAi
                                        ? 'Tiny Desk AI template is not configured in R2.'
                                        : isSayItRightAi
                                          ? 'Say It Right AI template is not configured in R2.'
                                          : isDeckTheHallsDanceAi
                                            ? 'Deck the Halls Dance AI template is not configured in R2.'
                                            : isCanIRideDanceAi
                                              ? 'Can I Ride Dance AI template is not configured in R2.'
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

    // Fixed-template products: indices 1–N are images (0 reserved for server template).
    // Homepage: index 0 = video, 1+ = images.
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
    if (isBurningBridgesAi && existing) {
      assertBurningBridgesAiProviderBinding(existing.provider, existing.model);
    }
    if (isBicepHeartAi && existing) {
      assertBicepHeartAiProviderBinding(existing.provider, existing.model);
    }
    if (isTinyDeskAi && existing) {
      assertTinyDeskAiProviderBinding(existing.provider, existing.model);
    }
    if (isSayItRightAi && existing) {
      assertSayItRightAiProviderBinding(existing.provider, existing.model);
    }
    if (isDeckTheHallsDanceAi && existing) {
      assertDeckTheHallsDanceAiProviderBinding(
        existing.provider,
        existing.model
      );
    }
    if (isCanIRideDanceAi && existing) {
      assertCanIRideDanceAiProviderBinding(existing.provider, existing.model);
    }
    if (isFlyingCarAi && existing) {
      assertFlyingCarAiProviderBinding(existing.provider, existing.model);
    }
    if (isShanShenBu && existing) {
      assertShanShenBuProviderBinding(existing.provider, existing.model);
    }
    if (isColdplayKissCam && existing) {
      assertColdplayKissCamProviderBinding(existing.provider, existing.model);
    }
    if (isZombieHug && existing) {
      assertZombieHugProviderBinding(existing.provider, existing.model);
    }
    if (isGangnamStyleAi && existing) {
      assertGangnamStyleAiProviderBinding(existing.provider, existing.model);
    }
    if (isGasStationDanceAi && existing) {
      assertGasStationDanceAiProviderBinding(existing.provider, existing.model);
    }
    if (isGlowStickAi && existing) {
      assertGlowStickAiProviderBinding(existing.provider, existing.model);
    }
    if (isWassupInAMinuteAi && existing) {
      assertWassupInAMinuteAiProviderBinding(existing.provider, existing.model);
    }
    if (isChipmunksDance && existing) {
      assertChipmunksDanceProviderBinding(existing.provider, existing.model);
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

    const productAspectRatio = isZombieHug
      ? zombieAspectRatio!
      : isCrazyFrog
        ? CRAZY_FROG_ASPECT_RATIO
        : isA2oLiteAi
          ? A2O_LITE_AI_ASPECT_RATIO
          : isColdplayKissCam
            ? COLDPLAY_KISS_CAM_ASPECT_RATIO
            : isGangnamStyleAi
              ? GANGNAM_STYLE_AI_ASPECT_RATIO
              : isGasStationDanceAi
                ? GAS_STATION_DANCE_AI_ASPECT_RATIO
                : isGlowStickAi
                  ? GLOW_STICK_AI_ASPECT_RATIO
                  : isWassupInAMinuteAi
                    ? WASSUP_IN_A_MINUTE_AI_ASPECT_RATIO
                    : isChipmunksDance
                      ? CHIPMUNKS_DANCE_ASPECT_RATIO
                      : isFlyingCarAi
                        ? FLYING_CAR_AI_ASPECT_RATIO
                        : isShanShenBu
                          ? SHAN_SHEN_BU_ASPECT_RATIO
                          : isEnzoFernandezAi
                            ? ENZO_FERNANDEZ_AI_ASPECT_RATIO
                            : isBurningBridgesAi
                              ? BURNING_BRIDGES_AI_ASPECT_RATIO
                              : isBicepHeartAi
                                ? BICEP_HEART_AI_ASPECT_RATIO
                                : isTinyDeskAi
                                  ? TINY_DESK_AI_ASPECT_RATIO
                                  : isSayItRightAi
                                    ? SAY_IT_RIGHT_AI_ASPECT_RATIO
                                    : isDeckTheHallsDanceAi
                                      ? DECK_THE_HALLS_DANCE_AI_ASPECT_RATIO
                                      : isCanIRideDanceAi
                                        ? CAN_I_RIDE_DANCE_AI_ASPECT_RATIO
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
        preset: castDanceMode,
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
        preset: castDanceMode,
        aspectRatio: isProductPreview
          ? isZombieHug
            ? zombieAspectRatio!
            : isA2oLiteAi
              ? A2O_LITE_AI_ASPECT_RATIO
              : isColdplayKissCam
                ? COLDPLAY_KISS_CAM_ASPECT_RATIO
                : isGangnamStyleAi
                  ? GANGNAM_STYLE_AI_ASPECT_RATIO
                  : isGasStationDanceAi
                    ? GAS_STATION_DANCE_AI_ASPECT_RATIO
                    : isGlowStickAi
                      ? GLOW_STICK_AI_ASPECT_RATIO
                      : isWassupInAMinuteAi
                        ? WASSUP_IN_A_MINUTE_AI_ASPECT_RATIO
                        : isChipmunksDance
                          ? CHIPMUNKS_DANCE_ASPECT_RATIO
                          : isFlyingCarAi
                            ? FLYING_CAR_AI_ASPECT_RATIO
                            : isShanShenBu
                              ? SHAN_SHEN_BU_ASPECT_RATIO
                              : isEnzoFernandezAi
                                ? ENZO_FERNANDEZ_AI_ASPECT_RATIO
                                : isBurningBridgesAi
                                  ? BURNING_BRIDGES_AI_ASPECT_RATIO
                                  : isBicepHeartAi
                                    ? BICEP_HEART_AI_ASPECT_RATIO
                                    : isTinyDeskAi
                                      ? TINY_DESK_AI_ASPECT_RATIO
                                      : isSayItRightAi
                                        ? SAY_IT_RIGHT_AI_ASPECT_RATIO
                                        : isDeckTheHallsDanceAi
                                          ? DECK_THE_HALLS_DANCE_AI_ASPECT_RATIO
                                          : isCanIRideDanceAi
                                            ? CAN_I_RIDE_DANCE_AI_ASPECT_RATIO
                                            : isSmalltown
                                              ? SMALLTOWN_ASPECT_RATIO
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
      // Fixed-template: storage indices are 1..N (0 reserved for server
      // template). Homepage: 0 = video, 1+ = images.
      uploads: uploads.map((upload, fileIndex) => ({
        ...upload,
        index: isFixedTemplateProduct ? fileIndex + 1 : fileIndex,
      })),
    });
  } catch (error: any) {
    if (
      error instanceof A2oLiteAiProviderBindingError ||
      error instanceof EnzoFernandezAiProviderBindingError ||
      error instanceof BurningBridgesAiProviderBindingError ||
      error instanceof BicepHeartAiProviderBindingError ||
      error instanceof TinyDeskAiProviderBindingError ||
      error instanceof TinyDeskAiProviderBindingError ||
      error instanceof SayItRightAiProviderBindingError ||
      error instanceof DeckTheHallsDanceAiProviderBindingError ||
      error instanceof CanIRideDanceAiProviderBindingError ||
      error instanceof FlyingCarAiProviderBindingError ||
      error instanceof ShanShenBuProviderBindingError ||
      error instanceof ColdplayKissCamProviderBindingError ||
      error instanceof ZombieHugProviderBindingError ||
      error instanceof GangnamStyleAiProviderBindingError ||
      error instanceof GasStationDanceAiProviderBindingError ||
      error instanceof GlowStickAiProviderBindingError ||
      error instanceof WassupInAMinuteAiProviderBindingError ||
      error instanceof ChipmunksDanceProviderBindingError
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
