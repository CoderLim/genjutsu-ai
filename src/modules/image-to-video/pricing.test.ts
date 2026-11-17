import assert from 'node:assert/strict';
import { test } from 'node:test';

import { calculateProviderCredits } from '@/lib/ai-credits';

import {
  estimateImageToVideoCredits,
  estimateImageToVideoProviderCost,
} from './pricing';

test('I2V standard 480p 5s matches WaveSpeed table', () => {
  const quote = estimateImageToVideoProviderCost({
    duration: 5,
    resolution: '480p',
  });
  assert.ok(Math.abs(quote.providerCostUsd - 0.6) < 1e-9);
  assert.equal(
    estimateImageToVideoCredits({ duration: 5, resolution: '480p' }),
    calculateProviderCredits(0.6)
  );
});

test('I2V standard 720p 5s matches WaveSpeed table', () => {
  const quote = estimateImageToVideoProviderCost({
    duration: 5,
    resolution: '720p',
  });
  assert.ok(Math.abs(quote.providerCostUsd - 1.2) < 1e-9);
  assert.equal(
    estimateImageToVideoCredits({ duration: 5, resolution: '720p' }),
    calculateProviderCredits(1.2)
  );
});

test('I2V standard 1080p 5s matches WaveSpeed table', () => {
  const quote = estimateImageToVideoProviderCost({
    duration: 5,
    resolution: '1080p',
  });
  assert.equal(quote.providerCostUsd, 3);
});

test('I2V standard 720p 7s scales linearly', () => {
  const quote = estimateImageToVideoProviderCost({
    duration: 7,
    resolution: '720p',
  });
  assert.ok(Math.abs(quote.providerCostUsd - 1.68) < 1e-9);
});
