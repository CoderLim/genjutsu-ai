import { createFileRoute } from '@tanstack/react-router';

import { getAuth } from '@/core/auth';
import { isAllowedA2oLiteAiPrompt } from '@/modules/a2o-lite-ai/assert';
import {
  A2O_LITE_AI_MODE,
  A2O_LITE_AI_PRODUCT_ID,
  A2O_LITE_AI_RESOLUTIONS,
} from '@/modules/a2o-lite-ai/constants';
import { isAllowedBurningBridgesAiPrompt } from '@/modules/burning-bridges-ai/assert';
import {
  BURNING_BRIDGES_AI_MODE,
  BURNING_BRIDGES_AI_PRODUCT_ID,
  BURNING_BRIDGES_AI_RESOLUTIONS,
} from '@/modules/burning-bridges-ai/constants';
import { isAllowedColdplayKissCamPrompt } from '@/modules/coldplay-kiss-cam/assert';
import {
  COLDPLAY_KISS_CAM_MODE,
  COLDPLAY_KISS_CAM_PRODUCT_ID,
  COLDPLAY_KISS_CAM_RESOLUTIONS,
} from '@/modules/coldplay-kiss-cam/constants';
import {
  CRAZY_FROG_PRODUCT_ID,
  CRAZY_FROG_RESOLUTIONS,
} from '@/modules/crazy-frog/constants';
import { isAllowedEnzoFernandezAiPrompt } from '@/modules/enzo-fernandez-ai/assert';
import {
  ENZO_FERNANDEZ_AI_MODE,
  ENZO_FERNANDEZ_AI_PRODUCT_ID,
  ENZO_FERNANDEZ_AI_RESOLUTIONS,
} from '@/modules/enzo-fernandez-ai/constants';
import { isAllowedFlyingCarAiPrompt } from '@/modules/flying-car-ai/assert';
import {
  FLYING_CAR_AI_MODE,
  FLYING_CAR_AI_PRODUCT_ID,
  FLYING_CAR_AI_RESOLUTIONS,
} from '@/modules/flying-car-ai/constants';
import { isAllowedGangnamStyleAiPrompt } from '@/modules/gangnam-style-ai/assert';
import {
  GANGNAM_STYLE_AI_MODE,
  GANGNAM_STYLE_AI_PRODUCT_ID,
  GANGNAM_STYLE_AI_RESOLUTIONS,
} from '@/modules/gangnam-style-ai/constants';
import { isAllowedGasStationDanceAiPrompt } from '@/modules/gas-station-dance-ai/assert';
import {
  GAS_STATION_DANCE_AI_MODE,
  GAS_STATION_DANCE_AI_PRODUCT_ID,
  GAS_STATION_DANCE_AI_RESOLUTIONS,
} from '@/modules/gas-station-dance-ai/constants';
import {
  assertGenerationId,
  createGenjutsuAttempt,
  GenjutsuAttemptConflictError,
} from '@/modules/genjutsu/billing';
import {
  isGenjutsuProductId,
  resolveProductProviderTarget,
} from '@/modules/genjutsu/workflow';
import { isAllowedSayItRightAiPrompt } from '@/modules/say-it-right-ai/assert';
import {
  SAY_IT_RIGHT_AI_MODE,
  SAY_IT_RIGHT_AI_PRODUCT_ID,
  SAY_IT_RIGHT_AI_RESOLUTIONS,
} from '@/modules/say-it-right-ai/constants';
import { isAllowedShanShenBuPrompt } from '@/modules/shan-shen-bu/assert';
import {
  SHAN_SHEN_BU_MODE,
  SHAN_SHEN_BU_PRODUCT_ID,
  SHAN_SHEN_BU_RESOLUTIONS,
} from '@/modules/shan-shen-bu/constants';
import {
  SMALLTOWN_PRODUCT_ID,
  SMALLTOWN_RESOLUTIONS,
} from '@/modules/smalltown-boy-dance/constants';
import { isAllowedTinyDeskAiPrompt } from '@/modules/tiny-desk-ai/assert';
import {
  TINY_DESK_AI_MODE,
  TINY_DESK_AI_PRODUCT_ID,
  TINY_DESK_AI_RESOLUTIONS,
} from '@/modules/tiny-desk-ai/constants';
import { isAllowedZombieHugPrompt } from '@/modules/zombie-hug/assert';
import {
  ZOMBIE_HUG_MODE,
  ZOMBIE_HUG_PRODUCT_ID,
  ZOMBIE_HUG_RESOLUTIONS,
} from '@/modules/zombie-hug/constants';
import { enforceMinIntervalRateLimit } from '@/lib/rate-limit';
import { respData, respErr, respJson } from '@/lib/resp';

async function POST({ request }: { request: Request }) {
  const limited = enforceMinIntervalRateLimit(request, {
    intervalMs: 750,
    keyPrefix: 'genjutsu-attempt',
  });
  if (limited) return limited;

  try {
    const auth = getAuth();
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) return respErr('Unauthorized', { status: 401 });

    const body = await request.json().catch(() => ({}));
    const generationId = assertGenerationId(body.generationId);
    const mode = body.mode;
    const resolution = body.resolution;
    const prompt = typeof body.prompt === 'string' ? body.prompt : '';
    const product =
      typeof body.product === 'string' && isGenjutsuProductId(body.product)
        ? body.product
        : undefined;

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
      product === SMALLTOWN_PRODUCT_ID &&
      !SMALLTOWN_RESOLUTIONS.includes(
        resolution as (typeof SMALLTOWN_RESOLUTIONS)[number]
      )
    ) {
      return respErr('Smalltown Boy Dance only supports 480p and 720p', {
        status: 400,
      });
    }
    if (
      product === CRAZY_FROG_PRODUCT_ID &&
      !CRAZY_FROG_RESOLUTIONS.includes(
        resolution as (typeof CRAZY_FROG_RESOLUTIONS)[number]
      )
    ) {
      return respErr('Crazy Frog only supports 480p and 720p', {
        status: 400,
      });
    }
    const isA2oLiteAi = product === A2O_LITE_AI_PRODUCT_ID;
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
    const isEnzoFernandezAi = product === ENZO_FERNANDEZ_AI_PRODUCT_ID;
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

    const isBurningBridgesAi = product === BURNING_BRIDGES_AI_PRODUCT_ID;
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

    const isTinyDeskAi = product === TINY_DESK_AI_PRODUCT_ID;
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
    const isSayItRightAi = product === SAY_IT_RIGHT_AI_PRODUCT_ID;
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
    const isFlyingCarAi = product === FLYING_CAR_AI_PRODUCT_ID;
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
    const isShanShenBu = product === SHAN_SHEN_BU_PRODUCT_ID;
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
    const isColdplayKissCam = product === COLDPLAY_KISS_CAM_PRODUCT_ID;
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
    const isGangnamStyleAi = product === GANGNAM_STYLE_AI_PRODUCT_ID;
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
    const isGasStationDanceAi = product === GAS_STATION_DANCE_AI_PRODUCT_ID;
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
    const isZombieHug = product === ZOMBIE_HUG_PRODUCT_ID;
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

    const target = resolveProductProviderTarget(product, mode);
    const task = await createGenjutsuAttempt({
      generationId,
      userId: session.user.id,
      mode,
      resolution,
      prompt,
      product,
      ...target,
    });

    return respData({
      generationId: task.id,
      status: task.status,
      provider: task.provider,
      model: task.model,
    });
  } catch (error: any) {
    if (error instanceof GenjutsuAttemptConflictError) {
      return respJson(-1, error.message, { code: error.code }, { status: 409 });
    }
    console.error('genjutsu attempt failed:', error);
    return respErr(error?.message || 'Failed to create generation attempt', {
      status: 400,
    });
  }
}

export const Route = createFileRoute('/api/genjutsu/attempt')({
  server: { handlers: { POST } },
});
