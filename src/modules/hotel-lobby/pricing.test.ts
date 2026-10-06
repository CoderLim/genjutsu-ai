import assert from 'node:assert/strict';
import test from 'node:test';

import {
  estimateHotelLobbyCredits,
  estimateHotelLobbyProviderCost,
} from './pricing';

test('MiniMax H3 Hotel Lobby estimate follows published per-second rates', () => {
  assert.equal(
    estimateHotelLobbyProviderCost({
      duration: 5,
      resolution: '480P',
      imageCount: 2,
    }),
    0.25
  );
  assert.equal(
    estimateHotelLobbyCredits({
      duration: 5,
      resolution: '480P',
      imageCount: 2,
    }),
    43
  );
});

test('first five reference images are included and later images add $0.08 each', () => {
  assert.equal(
    estimateHotelLobbyProviderCost({
      duration: 10,
      resolution: '768P',
      imageCount: 5,
    }),
    0.6
  );
  assert.equal(
    estimateHotelLobbyProviderCost({
      duration: 10,
      resolution: '768P',
      imageCount: 7,
    }),
    0.76
  );
});

test('Hotel Lobby duration is constrained to the H3 5–15 second output range', () => {
  assert.throws(() =>
    estimateHotelLobbyProviderCost({
      duration: 4,
      resolution: '480P',
      imageCount: 1,
    })
  );
  assert.throws(() =>
    estimateHotelLobbyProviderCost({
      duration: 16,
      resolution: '480P',
      imageCount: 1,
    })
  );
});
