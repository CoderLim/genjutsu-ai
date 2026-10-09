import assert from 'node:assert/strict';
import test from 'node:test';

import {
  estimateH3LabProviderCost,
  estimateHotelLobbyCredits,
  estimateHotelLobbyProviderCost,
  HOTEL_LOBBY_OUTPUT_RATE_USD_PER_SECOND,
} from './pricing';

test('Kling O3 Hotel Lobby estimate follows published per-second rate', () => {
  assert.equal(HOTEL_LOBBY_OUTPUT_RATE_USD_PER_SECOND, 0.126);
  assert.equal(
    estimateHotelLobbyProviderCost({
      duration: 5,
      imageCount: 2,
    }),
    0.63
  );
  // ceil(0.63 * 100 * 1.7) = 108
  assert.equal(
    estimateHotelLobbyCredits({
      duration: 5,
      imageCount: 2,
    }),
    108
  );
});

test('3s and 15s Kling clips match Fal rate plus Genjutsu credit markup', () => {
  assert.equal(
    estimateHotelLobbyProviderCost({
      duration: 3,
      imageCount: 1,
    }),
    0.378
  );
  // ceil(0.378 * 100 * 1.7) = 65
  assert.equal(
    estimateHotelLobbyCredits({
      duration: 3,
      imageCount: 1,
    }),
    65
  );
  assert.equal(
    estimateHotelLobbyProviderCost({
      duration: 15,
      imageCount: 1,
    }),
    1.89
  );
  // ceil(1.89 * 100 * 1.7) = 322
  assert.equal(
    estimateHotelLobbyCredits({
      duration: 15,
      imageCount: 1,
    }),
    322
  );
});

test('Hotel Lobby preset accepts one or two subject references only', () => {
  assert.equal(
    estimateHotelLobbyProviderCost({
      duration: 10,
      imageCount: 1,
    }),
    1.26
  );
  assert.throws(() =>
    estimateHotelLobbyProviderCost({
      duration: 10,
      imageCount: 3,
    })
  );
});

test('H3 lab keeps MiniMax H3 rates and up to 9 reference images', () => {
  assert.equal(
    estimateH3LabProviderCost({
      duration: 5,
      resolution: '480P',
      imageCount: 5,
    }),
    0.25
  );
  assert.equal(
    estimateH3LabProviderCost({
      duration: 5,
      resolution: '480P',
      imageCount: 9,
    }),
    0.25 + 4 * 0.08
  );
  assert.throws(() =>
    estimateH3LabProviderCost({
      duration: 5,
      resolution: '480P',
      imageCount: 10,
    })
  );
});

test('Hotel Lobby duration is constrained to the Kling 3–15 second range', () => {
  assert.throws(() =>
    estimateHotelLobbyProviderCost({
      duration: 2,
      imageCount: 1,
    })
  );
  assert.throws(() =>
    estimateHotelLobbyProviderCost({
      duration: 16,
      imageCount: 1,
    })
  );
});

test('H3 lab duration stays on the MiniMax 5–15 second range', () => {
  assert.throws(() =>
    estimateH3LabProviderCost({
      duration: 3,
      resolution: '480P',
      imageCount: 1,
    })
  );
  assert.throws(() =>
    estimateH3LabProviderCost({
      duration: 16,
      resolution: '480P',
      imageCount: 1,
    })
  );
});
