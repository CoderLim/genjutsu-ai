import { createFileRoute } from '@tanstack/react-router';

import { getAuth } from '@/core/auth';
import { isAllowedA2oLiteAiPrompt } from '@/modules/a2o-lite-ai/assert';
import {
  A2O_LITE_AI_MODE,
  A2O_LITE_AI_PRODUCT_ID,
  A2O_LITE_AI_RESOLUTIONS,
} from '@/modules/a2o-lite-ai/constants';
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
import {
  assertGenerationId,
  createGenjutsuAttempt,
  GenjutsuAttemptConflictError,
} from '@/modules/genjutsu/billing';
import {
  isGenjutsuProductId,
  resolveProductProviderTarget,
} from '@/modules/genjutsu/workflow';
import {
  SMALLTOWN_PRODUCT_ID,
  SMALLTOWN_RESOLUTIONS,
} from '@/modules/smalltown-boy-dance/constants';
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
