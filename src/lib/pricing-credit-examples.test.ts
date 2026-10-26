import assert from 'node:assert/strict';
import test from 'node:test';

import {
  A2O_LITE_AI_ASPECT_RATIO,
  A2O_LITE_AI_DEFAULT_RESOLUTION,
  A2O_LITE_AI_TEMPLATE_DURATION_SECONDS,
} from '@/modules/a2o-lite-ai/constants';
import { resolveA2oLiteAiProviderTarget } from '@/modules/a2o-lite-ai/provider';
import {
  estimateGenjutsuCredits,
  estimateGenjutsuCreditsForProvider,
} from '@/modules/genjutsu/pricing';

import {
  listPricingCreditExamples,
  PRICING_EXAMPLE_MOTION_DURATION_SECONDS,
  PRICING_EXAMPLE_MOTION_RESOLUTION,
  PRICING_EXAMPLE_PREVIEW_DURATION_SECONDS,
} from './pricing-credit-examples';

test('pricing examples reuse estimate helpers (no hardcoded credit table)', () => {
  const examples = listPricingCreditExamples();
  assert.equal(examples.length, 3);

  const expectedMotion = estimateGenjutsuCredits({
    durationSeconds: PRICING_EXAMPLE_MOTION_DURATION_SECONDS,
    resolution: PRICING_EXAMPLE_MOTION_RESOLUTION,
  });

  const motion = examples.find((e) => e.id === 'motion-transfer');
  const objectSwap = examples.find((e) => e.id === 'object-swap');
  const a2o = examples.find((e) => e.id === 'a2o-lite');

  assert.ok(motion);
  assert.ok(objectSwap);
  assert.ok(a2o);

  assert.equal(motion.credits, expectedMotion);
  assert.equal(objectSwap.credits, expectedMotion);
  assert.equal(motion.href, '/');
  assert.equal(objectSwap.href, '/');
  assert.equal(a2o.href, '/a2o-lite-ai');

  const provider = resolveA2oLiteAiProviderTarget().provider;
  assert.equal(
    a2o.credits,
    estimateGenjutsuCreditsForProvider({
      provider,
      durationSeconds: A2O_LITE_AI_TEMPLATE_DURATION_SECONDS,
      resolution: A2O_LITE_AI_DEFAULT_RESOLUTION,
      aspectRatio: A2O_LITE_AI_ASPECT_RATIO,
    })
  );
  assert.ok(a2o.preview);
  assert.equal(
    a2o.preview.credits,
    estimateGenjutsuCreditsForProvider({
      provider,
      durationSeconds: PRICING_EXAMPLE_PREVIEW_DURATION_SECONDS,
      resolution: '480p',
      aspectRatio: A2O_LITE_AI_ASPECT_RATIO,
    })
  );
  assert.ok(a2o.credits > 0);
  assert.ok(a2o.preview.credits > 0);
  assert.notEqual(a2o.credits, a2o.preview.credits);
});
