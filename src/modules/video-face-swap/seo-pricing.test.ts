import assert from 'node:assert/strict';
import { test } from 'node:test';

import { estimateVideoFaceSwapCredits } from './pricing';
import { getVideoFaceSwapSeoPriceAmounts } from './seo-pricing';

test('seo price amounts match estimate helpers at Creator pack rate', () => {
  const amounts = getVideoFaceSwapSeoPriceAmounts();

  assert.equal(
    amounts.credits3s480,
    String(
      estimateVideoFaceSwapCredits({
        durationSeconds: 3,
        resolution: '480p',
      })
    )
  );
  assert.equal(
    amounts.credits10s480,
    String(
      estimateVideoFaceSwapCredits({
        durationSeconds: 10,
        resolution: '480p',
      })
    )
  );
  assert.equal(
    amounts.credits15s480,
    String(
      estimateVideoFaceSwapCredits({
        durationSeconds: 15,
        resolution: '480p',
      })
    )
  );
  assert.equal(
    amounts.credits15s720,
    String(
      estimateVideoFaceSwapCredits({
        durationSeconds: 15,
        resolution: '720p',
      })
    )
  );

  assert.equal(amounts.credits3s480, '21');
  assert.equal(amounts.usd3s480, '$0.25');
  assert.equal(amounts.credits10s480, '68');
  assert.equal(amounts.usd10s480, '$0.80');
  assert.equal(amounts.credits15s480, '102');
  assert.equal(amounts.usd15s480, '$1.20');
  assert.equal(amounts.credits15s720, '204');
  assert.equal(amounts.usd15s720, '$2.40');
  assert.equal(amounts.starterPrice, '$4.99');
  assert.equal(amounts.creatorPrice, '$9.99');
});
