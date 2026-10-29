import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  billableSecondsForVideoFaceSwap,
  estimateVideoFaceSwapCredits,
  estimateVideoFaceSwapProviderCost,
} from './pricing';

test('billable seconds ceil with 3s floor', () => {
  assert.equal(billableSecondsForVideoFaceSwap(3), 3);
  assert.equal(billableSecondsForVideoFaceSwap(3.01), 4);
  assert.equal(billableSecondsForVideoFaceSwap(4.2), 5);
  assert.equal(billableSecondsForVideoFaceSwap(15), 15);
  assert.equal(billableSecondsForVideoFaceSwap(30), 30);
  assert.equal(billableSecondsForVideoFaceSwap(120), 120);
});

test('rejects duration outside WaveSpeed 3–120s billed range', () => {
  assert.throws(() => billableSecondsForVideoFaceSwap(2.99));
  assert.throws(() => billableSecondsForVideoFaceSwap(120.01));
});

test('pricing table matches plan credits', () => {
  const cases = [
    { durationSeconds: 3, resolution: '480p' as const, usd: 0.12, credits: 21 },
    { durationSeconds: 3, resolution: '720p' as const, usd: 0.24, credits: 41 },
    { durationSeconds: 5, resolution: '480p' as const, usd: 0.2, credits: 34 },
    { durationSeconds: 5, resolution: '720p' as const, usd: 0.4, credits: 68 },
    { durationSeconds: 10, resolution: '480p' as const, usd: 0.4, credits: 68 },
    {
      durationSeconds: 10,
      resolution: '720p' as const,
      usd: 0.8,
      credits: 136,
    },
    {
      durationSeconds: 15,
      resolution: '480p' as const,
      usd: 0.6,
      credits: 102,
    },
    {
      durationSeconds: 15,
      resolution: '720p' as const,
      usd: 1.2,
      credits: 204,
    },
    {
      durationSeconds: 30,
      resolution: '480p' as const,
      usd: 1.2,
      credits: 204,
    },
    {
      durationSeconds: 30,
      resolution: '720p' as const,
      usd: 2.4,
      credits: 408,
    },
    {
      durationSeconds: 120,
      resolution: '480p' as const,
      usd: 4.8,
      credits: 816,
    },
    {
      durationSeconds: 120,
      resolution: '720p' as const,
      usd: 9.6,
      credits: 1632,
    },
  ];

  for (const row of cases) {
    const quote = estimateVideoFaceSwapProviderCost({
      durationSeconds: row.durationSeconds,
      resolution: row.resolution,
    });
    assert.ok(
      Math.abs(quote.providerCostUsd - row.usd) < 1e-9,
      `${row.durationSeconds}s ${row.resolution} usd`
    );
    assert.equal(
      estimateVideoFaceSwapCredits({
        durationSeconds: row.durationSeconds,
        resolution: row.resolution,
      }),
      row.credits,
      `${row.durationSeconds}s ${row.resolution} credits`
    );
  }
});

test('rejects unsupported resolution', () => {
  assert.throws(() =>
    estimateVideoFaceSwapProviderCost({
      durationSeconds: 5,
      resolution: '1080p' as any,
    })
  );
});
