import assert from 'node:assert/strict';
import { test } from 'node:test';

import { fixedTemplatePreviewPath } from '@/modules/templates/paths';

test('fixedTemplatePreviewPath defaults to redirect delivery', () => {
  assert.equal(
    fixedTemplatePreviewPath({ product: 'smalltown-boy-dance' }),
    '/api/genjutsu/template?product=smalltown-boy-dance'
  );
});

test('fixedTemplatePreviewPath supports proxy delivery for Recreate fetch', () => {
  const url = fixedTemplatePreviewPath({
    product: 'zombie-hug',
    aspect: '9:16',
    delivery: 'proxy',
  });
  assert.match(url, /product=zombie-hug/);
  assert.match(url, /aspect=9%3A16/);
  assert.match(url, /delivery=proxy/);
});
