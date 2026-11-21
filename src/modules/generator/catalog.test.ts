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
    'photo-to-video-standard', 'text-to-video-standard', 'multi-image-to-video', 'all-in-one-video', 'nano-banana-2', 'nano-banana-pro', 'text-to-image-fast', 'image-edit-standard', 'minimax-h3-max-turbo', 'minimax-h3-max',
  ]);
  assert.equal(getGeneratorModel('all-in-one-video').enabled, true);
  assert.throws(() => getGeneratorModel('reference-to-video-pro'), /not enabled/);
  assert.equal(GENERATOR_MODELS.find(x => x.id === 'reference-to-video-pro')?.enabled, false);
});

test('photo-to-video offers verified first-frame and start-end only', () => {
  const model = getGeneratorModel('photo-to-video-standard');
  assert.deepEqual(Object.keys(model.workflows), ['first-frame', 'start-end']);
  assert.equal(model.workflows['start-end']!.slots.endFrame!.max, 1);
  assert.equal(model.workflows['first-frame']!.slots.startFrame!.min, 1);
  assert.ok(!model.workflows['all-in-one-reference']);
});

test('photo-to-video workflow retains start and drops end when switching', () => {
  const model = getGeneratorModel('photo-to-video-standard');
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
  const model = getGeneratorModel('photo-to-video-standard');
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
  const textModel = getGeneratorModel('text-to-image-fast');
  const text = createGeneratorState(textModel);
  assert.equal(calculateGeneratorCredits(text, textModel).credits, 4);
  assert.equal(
    calculateGeneratorCredits(
      updateGeneratorState(text, textModel, { params: { outputCount: 3 } }),
      textModel
    ).credits,
    12
  );

  const editModel = getGeneratorModel('image-edit-standard');
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
  const model = getGeneratorModel('photo-to-video-standard');
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
  const h3 = GENERATOR_MODELS.find(x => x.id === 'reference-to-video-pro')!;
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
  const model = getGeneratorModel('text-to-video-standard');
  const state = createGeneratorState(model);
  assert.equal(state.workflow, 'text-to-video');
  assert.deepEqual(Object.keys(model.workflows['text-to-video']!.slots), []);
  assert.equal(calculateGeneratorCredits(state, model).credits, 204);
  assert.doesNotThrow(() => assertGeneratorReady({
    ...state, prompt: 'Mountain landscape, cinematic dolly shot',
  }, model));
});

test('multi-image reference charges output seconds only and truncates extra photos', () => {
  const model = getGeneratorModel('multi-image-to-video');
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
  const model = getGeneratorModel('all-in-one-video');
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
  const model = getGeneratorModel('all-in-one-video');
  const initial = createGeneratorState(model);
  assert.throws(() => assertGeneratorDraft({
    ...initial, inputs: { ...initial.inputs, referenceAudio: ['audio-only'] },
  }, model), /require an image or video/);
});

test('4k Seedance pricing is derived from verified output rates', () => {
  const model = getGeneratorModel('photo-to-video-standard');
  const state = updateGeneratorState(createGeneratorState(model), model, {
    params: { resolution: '4k', duration: 4 },
  });
  assert.equal(calculateGeneratorCredits(state, model).credits, 816);
  const referenceModel = getGeneratorModel('all-in-one-video');
  const reference = updateGeneratorState(createGeneratorState(referenceModel), referenceModel, {
    inputs: { ...createGeneratorState(referenceModel).inputs, referenceVideos: ['video'] },
    params: { inputVideoSeconds: 5, resolution: '4k', duration: 4 },
  });
  assert.equal(calculateGeneratorCredits(reference, referenceModel).credits, 1148);
});

test('public catalog never reveals upstream brands or enabled estimated models', () => {
  const publicModels = listGeneratorModels();
  const customerLabels = publicModels.map(m => m.id + ' ' + m.name).join(' ');
  assert.doesNotMatch(customerLabels, /wavespeed|fal|h3-reference/i);
  assert.ok(publicModels.every(m => !('providerName' in m)));
  assert.ok(publicModels.every(m => m.pricing.precision === 'exact'));
  assert.ok(publicModels.every(m => m.enabled));
});

test('Nano Banana 2 and Pro publish exact tiered credits for both modes', () => {
  for (const [id, expected] of [
    ['nano-banana-2', [14, 21, 28]],
    ['nano-banana-pro', [26, 26, 51]],
  ] as const) {
    const model = getGeneratorModel(id);
    assert.deepEqual(Object.keys(model.workflows), ['text-to-image', 'image-to-image']);
    for (const [index, resolution] of ['1K', '2K', '4K'].entries()) {
      const draft = updateGeneratorState(createGeneratorState(model), model, {
        params: { resolution, outputCount: 2 },
      });
      assert.equal(calculateGeneratorCredits(draft, model).credits, expected[index] * 2);
    }
    const edit = updateGeneratorState(createGeneratorState(model), model, {
      workflow: 'image-to-image',
      inputs: { ...createGeneratorState(model).inputs, referenceImages: ['photo'] },
    });
    assert.equal(calculateGeneratorCredits(edit, model).credits, expected[0]);
    assert.doesNotThrow(() => assertGeneratorReady({ ...edit, prompt: 'Change the sky' }, model));
  }
});


test('new MiniMax H3 Max models have bounded exact customer rates', () => {
  for (const [id, rate] of [
    ['minimax-h3-max-turbo', 10],
    ['minimax-h3-max', 16],
  ] as const) {
    const model = getGeneratorModel(id);
    assert.equal(model.enabled, true);
    assert.equal(model.pricing.precision, 'exact');
    const state = createGeneratorState(model);
    assert.equal(state.params.resolution, '768P');
    assert.equal(calculateGeneratorCredits(state, model).credits, 5 * rate);
    assert.doesNotThrow(() => assertGeneratorReady({
      ...state, prompt: 'A storm gathers above the mountain',
      inputs: { ...state.inputs, startFrame: 'start' },
    }, model));
  }
});

test('unpriced new models are impossible to charge through the public model lookup', () => {
  const pending = GENERATOR_MODELS.filter(model =>
    model.id.startsWith('seedance-2') ||
    model.id.startsWith('kling-') ||
    model.id.startsWith('minimax-h3-image')
  );
  assert.ok(pending.length >= 10);
  for (const model of pending) {
    assert.equal(model.enabled, false, model.id);
    assert.equal(model.pricing.precision, 'estimate', model.id);
    assert.throws(() => getGeneratorModel(model.id), /not enabled/, model.id);
  }
});
