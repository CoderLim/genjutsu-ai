import assert from 'node:assert/strict';
import test from 'node:test';

import { GENERATOR_MODELS, listGeneratorModels, getGeneratorModel } from './catalog';
import { getGeneratorModelFamilyId, groupGeneratorModels } from './model-families';
import { createGeneratorState, normalizeGeneratorState, updateGeneratorState } from './normalize';
import { calculateGeneratorCredits } from './pricing';

test('model chooser lists Seedance and Nano Banana, not workflow categories', () => {
  const groups = groupGeneratorModels(listGeneratorModels());
  assert.deepEqual(groups.map(g => g.label), ['Seedance', 'Nano Banana', 'Image Tools']);
  assert.deepEqual(groups[0].models.map(m => m.id), [
    'photo-to-video-standard', 'text-to-video-standard',
    'multi-image-to-video', 'all-in-one-video',
  ]);
  assert.deepEqual(groups[1].models.map(m => m.id), ['nano-banana-2', 'nano-banana-pro']);
  assert.equal(getGeneratorModelFamilyId('nano-banana-pro'), 'nano-banana');
  assert.equal(groupGeneratorModels(GENERATOR_MODELS).at(-1)?.id, 'video-preview');
});

test('changing Nano Banana version keeps image edit workflow and reference photos', () => {
  const regular = getGeneratorModel('nano-banana-2');
  const pro = getGeneratorModel('nano-banana-pro');
  const edited = updateGeneratorState(createGeneratorState(regular), regular, {
    workflow: 'image-to-image',
    prompt: 'Change the background',
    inputs: { ...createGeneratorState(regular).inputs, referenceImages: ['image1'] },
    params: { resolution: '4K' },
  });
  const migrated = normalizeGeneratorState(edited, pro);
  assert.equal(migrated.workflow, 'image-to-image');
  assert.deepEqual(migrated.inputs.referenceImages, ['image1']);
  assert.equal(migrated.prompt, edited.prompt);
  assert.equal(migrated.params.resolution, '4K');
  assert.equal(calculateGeneratorCredits(migrated, pro).credits, 51);
});

test('switching between image/video families clears incompatible fields', () => {
  const seedance = getGeneratorModel('photo-to-video-standard');
  const nano = getGeneratorModel('nano-banana-2');
  const photo = updateGeneratorState(createGeneratorState(seedance), seedance, {
    prompt: 'A person walks',
    inputs: { ...createGeneratorState(seedance).inputs, startFrame: 'first' },
  });
  const image = normalizeGeneratorState(photo, nano);
  assert.equal(image.mediaType, 'image');
  assert.equal(image.workflow, 'text-to-image');
  assert.equal(image.inputs.startFrame, null);
  assert.equal(image.params.duration, undefined);
  assert.equal(image.prompt, photo.prompt);
});
