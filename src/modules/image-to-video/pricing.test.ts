import assert from 'node:assert/strict';
import { test } from 'node:test';

import { calculateProviderCredits } from '@/lib/ai-credits';

import {
  estimateImageToVideoCredits,
  estimateImageToVideoProviderCost,
} from './pricing';

test('I2V turbo 720p 5s matches WaveSpeed table', () => {
  const quote = estimateImageToVideoProviderCost({
    duration: 5,
    resolution: '720p',
  });
  assert.ok(Math.abs(quote.providerCostUsd - 0.7) < 1e-9);
  assert.equal(
    estimateImageToVideoCredits({ duration: 5, resolution: '720p' }),
    calculateProviderCredits(0.7)
  );
});

test('I2V turbo 1080p 5s matches WaveSpeed table', () => {
  const quote = estimateImageToVideoProviderCost({
    duration: 5,
    resolution: '1080p',
  });
  assert.equal(quote.providerCostUsd, 0.8);
});
