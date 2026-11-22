import assert from 'node:assert/strict';
import test from 'node:test';

import { assertGeneratorModelConfig } from './capabilities';
import { GENERATOR_PREVIEW_MODELS, getPreviewModel } from './registry';

test('every preview model has consistent field, upload and pricing declarations', () => {
  for (const model of GENERATOR_PREVIEW_MODELS) {
    assert.doesNotThrow(() => assertGeneratorModelConfig(model));
  }
});

test('invalid default workflow rejected before provider enablement', () => {
  const model = getPreviewModel('image');
  assert.throws(
    () => assertGeneratorModelConfig({ ...model, defaultWorkflow: 'first-frame' }),
    /Missing default workflow/
  );
});

test('missing resolution prices fail fast', () => {
  const model = getPreviewModel('video');
  assert.throws(
    () => assertGeneratorModelConfig({
      ...model,
      pricing: {
        ...model.pricing,
        rule: { kind: 'per-second', rates: { '480p': 8 } },
      },
    }),
    /Missing price/
  );
});

test('invalid media slot minimum and maximum are rejected', () => {
  const model = getPreviewModel('image');
  const img = model.workflows['image-to-image']!;
  assert.throws(
    () => assertGeneratorModelConfig({
      ...model,
      workflows: {
        ...model.workflows,
        'image-to-image': {
          ...img,
          slots: {
            referenceImages: {
              min: 7, max: 6, accept: ['image/jpeg'],
            },
          },
        },
      },
    }),
    /Invalid media slot bounds/
  );
});
