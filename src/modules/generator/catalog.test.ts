import assert from 'node:assert/strict';
import test from 'node:test';

import { assertGeneratorModelConfig } from './capabilities';
import { GENERATOR_MODELS, getGeneratorModel, listGeneratorModels } from './catalog';
import { createGeneratorState, updateGeneratorState } from './normalize';
import { calculateGeneratorCredits } from './pricing';
import { assertGeneratorDraft, assertGeneratorReady } from './validation';

test('live catalog capabilities and price tables are valid', () => {
  for (const model of GENERATOR_MODELS) {
    assert.doesNotThrow(() => assertGeneratorModelConfig(model), model.id);
  }
});

test('public catalog lists completed reference workflows', () => {
  const ids = listGeneratorModels().map(x => x.id);
  assert.deepEqual(ids, [
    'seedance-2-i2v', 'seedance-2-t2v', 'seedance-2-multiimage', 'seedance-2-reference', 'h3-reference', 'flux-schnell', 'flux2-flash-edit',
  ]);
  assert.equal(getGeneratorModel('seedance-2-reference').enabled, true);
});

test('photo-to-video offers verified first-frame and start-end only', () => {
  const model = getGeneratorModel('seedance-2-i2v');
  assert.deepEqual(Object.keys(model.workflows), ['first-frame', 'start-end']);
  assert.equal(model.workflows['start-end']!.slots.endFrame!.max, 1);
  assert.equal(model.workflows['first-frame']!.slots.startFrame!.min, 1);
  assert.ok(!model.workflows['all-in-one-reference']);
});

test('photo-to-video workflow retains start and drops end when switching', () => {
  const model = getGeneratorModel('seedance-2-i2v');
  const start = createGeneratorState(model);
  const full = updateGeneratorState(start, model, {
    workflow: 'start-end',
    inputs: { ...start.inputs, startFrame: 'first', endFrame: 'last' },
  });
  const single = updateGeneratorState(full, model, { workflow: 'first-frame' });
  assert.equal(single.inputs.startFrame, 'first');
  assert.equal(single.inputs.endFrame, null);
  assert.equal(single.params.generateAudio, true);
});

test('photo-to-video credits are synchronous across duration and resolution', () => {
  const model = getGeneratorModel('seedance-2-i2v');
  const base = createGeneratorState(model);
  assert.equal(calculateGeneratorCredits(base, model).credits, 204);
  assert.equal(
    calculateGeneratorCredits(
      updateGeneratorState(base, model, { params: { resolution: '480p' } }),
      model
    ).credits,
    102
  );
  assert.equal(
    calculateGeneratorCredits(
      updateGeneratorState(base, model, {
        params: { resolution: '1080p', duration: 10 },
      }),
      model
    ).credits,
    1020
  );
  assert.equal(
    calculateGeneratorCredits(
      updateGeneratorState(base, model, { params: { generateAudio: false } }),
      model
    ).credits,
    204
  );
});

test('image pricing multiplies output count and reference image surcharges', () => {
  const textModel = getGeneratorModel('flux-schnell');
  const text = createGeneratorState(textModel);
  assert.equal(calculateGeneratorCredits(text, textModel).credits, 4);
  assert.equal(
    calculateGeneratorCredits(
      updateGeneratorState(text, textModel, { params: { outputCount: 3 } }),
      textModel
    ).credits,
    12
  );

  const editModel = getGeneratorModel('flux2-flash-edit');
  const edit = updateGeneratorState(createGeneratorState(editModel), editModel, {
    inputs: {
      ...createGeneratorState(editModel).inputs,
      referenceImages: ['image1', 'image2', 'image3'],
    },
    params: { outputCount: 2 },
  });
  // Base 9 plus 2 extra images * 2 credits = 13 per output.
  assert.equal(calculateGeneratorCredits(edit, editModel).credits, 26);
});

test('server validation rejects manipulated cost and unsupported modes', () => {
  const model = getGeneratorModel('seedance-2-i2v');
  const state = createGeneratorState(model);
  assert.throws(
    () => assertGeneratorDraft({
      ...state, params: { ...state.params, costCredits: 1 },
    }, model),
    /Unsupported generator parameter/
  );
  assert.throws(
    () => assertGeneratorDraft({
      ...state, workflow: 'all-in-one-reference',
    }, model),
    /Unsupported workflow/
  );
  assert.throws(() => assertGeneratorReady({
    ...state, prompt: 'Make waves',
  }, model), /startFrame/);
  assert.doesNotThrow(() => assertGeneratorReady({
    ...state, prompt: 'Make waves',
    inputs: { ...state.inputs, startFrame: 'sealed-storage-key' },
  }, model));
});

test('H3 supports reference-video workflow but not All-in-One', () => {
  const h3 = getGeneratorModel('h3-reference');
  assert.deepEqual(Object.keys(h3.workflows), ['reference-to-video']);
  const spec = h3.workflows['reference-to-video']!;
  assert.equal(spec.slots.referenceVideos?.min, 1);
  assert.equal(spec.slots.referenceVideos?.maxSeconds, 15);
  assert.equal(spec.slots.referenceImages?.max, 9);
  const initial = createGeneratorState(h3);
  assert.equal(calculateGeneratorCredits(initial, h3).credits, 82);
  const sixPhotos = updateGeneratorState(initial, h3, {
    inputs: {
      ...initial.inputs,
      referenceImages: ['1','2','3','4','5','6'],
    },
  });
  assert.equal(calculateGeneratorCredits(sixPhotos, h3).credits, 96);
});

test('text-to-video is priced without reference media', () => {
  const model = getGeneratorModel('seedance-2-t2v');
  const state = createGeneratorState(model);
  assert.equal(state.workflow, 'text-to-video');
  assert.deepEqual(Object.keys(model.workflows['text-to-video']!.slots), []);
  assert.equal(calculateGeneratorCredits(state, model).credits, 204);
  assert.doesNotThrow(() => assertGeneratorReady({
    ...state, prompt: 'Mountain landscape, cinematic dolly shot',
  }, model));
});

test('multi-image reference charges output seconds only and truncates extra photos', () => {
  const model = getGeneratorModel('seedance-2-multiimage');
  const state = createGeneratorState(model);
  assert.equal(state.workflow, 'all-in-one-reference');
  assert.equal(model.workflows['all-in-one-reference']!.slots.referenceImages?.max, 9);
  assert.equal(model.workflows['all-in-one-reference']!.slots.referenceVideos, undefined);
  const draft = updateGeneratorState(state, model, {
    inputs: {
      ...state.inputs,
      referenceImages: Array.from({ length: 12 }, (_, index) => 'image-' + index),
    },
  });
  assert.equal(draft.inputs.referenceImages.length, 9);
  assert.equal(calculateGeneratorCredits(draft, model).credits, 204);
});

test('reference video input charges input+output using provider-specific tariff', () => {
  const model = getGeneratorModel('seedance-2-reference');
  const defaultDraft = createGeneratorState(model);
  assert.throws(() => assertGeneratorReady({
    ...defaultDraft, prompt: 'Generate a running scene',
  }, model), /At least one reference/);

  const photos = updateGeneratorState(defaultDraft, model, {
    inputs: { ...defaultDraft.inputs, referenceImages: ['image-a'] },
  });
  assert.equal(calculateGeneratorCredits(photos, model).credits, 204);

  const videos = updateGeneratorState(defaultDraft, model, {
    inputs: {
      ...defaultDraft.inputs,
      referenceVideos: ['reference-clip'],
    },
    params: { inputVideoSeconds: 3 },
  });
  assert.equal(calculateGeneratorCredits(videos, model).credits, 204); // 5+3 seconds at 25.5
  assert.equal(calculateGeneratorCredits(
    updateGeneratorState(videos, model, { params: { resolution: '480p' } }), model
  ).credits, 102); // 8 seconds at 12.75
  assert.throws(() => calculateGeneratorCredits(
    updateGeneratorState(videos, model, { params: { inputVideoSeconds: 0 } }), model
  ), /duration is not ready/);
});
test('audio reference without image or video is invalid', () => {
  const model = getGeneratorModel('seedance-2-reference');
  const initial = createGeneratorState(model);
  assert.throws(() => assertGeneratorDraft({
    ...initial, inputs: { ...initial.inputs, referenceAudio: ['audio-only'] },
  }, model), /require an image or video/);
});
