import assert from 'node:assert/strict';
import test from 'node:test';

import { withMiniWaffoProduct } from './waffo-mini-mapping';

const activeMapping = {
  starter: 'PROD_STARTER',
  creator: 'PROD_CREATOR',
  studio: 'PROD_STUDIO',
  smoke: 'PROD_SMOKE',
  legacy: 'PROD_LEGACY',
};

test('adding Mini preserves all existing Waffo product mappings', () => {
  const result = withMiniWaffoProduct(activeMapping, 'PROD_MINI');
  assert.deepEqual(result, { ...activeMapping, mini: 'PROD_MINI' });
  assert.deepEqual(Object.keys(activeMapping), Object.keys({
    starter: '', creator: '', studio: '', smoke: '', legacy: '',
  }));
});

test('Mini mapping is idempotent for the same Waffo product', () => {
  const current = { ...activeMapping, mini: 'PROD_MINI' };
  assert.deepEqual(withMiniWaffoProduct(current, 'PROD_MINI'), current);
});

test('Mini mapping rejects stale or incomplete base config', () => {
  assert.throws(
    () => withMiniWaffoProduct({ starter: 'A', creator: 'B' }, 'PROD_MINI'),
    /missing studio/
  );
  assert.throws(
    () => withMiniWaffoProduct(null, 'PROD_MINI'),
    /current active/
  );
  assert.throws(
    () => withMiniWaffoProduct({ ...activeMapping, mini: 'PROD_OLD' }, 'PROD_NEW'),
    /another Waffo product/
  );
  assert.throws(
    () => withMiniWaffoProduct(activeMapping, ''),
    /Mini Waffo product ID/
  );
});
