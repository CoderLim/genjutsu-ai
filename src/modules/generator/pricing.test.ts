import assert from 'node:assert/strict';
import test from 'node:test';

import { createGeneratorState, updateGeneratorState } from './normalize';
import { calculateGeneratorCredits } from './pricing';
import { getPreviewModel } from './registry';
import { assertGeneratorDraft, assertGeneratorReady } from './validation';

test('video credits react synchronously to duration, resolution and sound', () => {
  const model = getPreviewModel('video');
  const initial = createGeneratorState(model);
  assert.equal(calculateGeneratorCredits(initial, model).credits, 32);

  const long = updateGeneratorState(initial, model, { params: { duration: 8 } });
  assert.equal(calculateGeneratorCredits(long, model).credits, 64);

  const high = updateGeneratorState(long, model, { params: { resolution: '720p' } });
  // Resolution/duration constraint clamps to a supported pair.
  assert.equal(high.params.duration, 4);
  assert.equal(calculateGeneratorCredits(high, model).credits, 64);

  const sound = updateGeneratorState(high, model, { params: { generateAudio: true } });
  assert.equal(calculateGeneratorCredits(sound, model).credits, 77);
});

test('extra images charged and removed after incompatible workflow switch', () => {
  const model = getPreviewModel('video');
  const first = createGeneratorState(model);
  const refs = updateGeneratorState(first, model, {
    workflow: 'all-in-one-reference',
    inputs: { ...first.inputs, referenceImages: ['a', 'b', 'c', 'd'] },
  });
  assert.equal(calculateGeneratorCredits(refs, model).credits, 36);
  const back = updateGeneratorState(refs, model, { workflow: 'first-frame' });
  assert.equal(calculateGeneratorCredits(back, model).credits, 32);
});

test('image output count and resolution change price', () => {
  const model = getPreviewModel('image');
  const state = createGeneratorState(model);
  assert.equal(calculateGeneratorCredits(state, model).credits, 6);
  const next = updateGeneratorState(state, model, {
    params: { outputCount: 4, resolution: '4K' },
  });
  assert.equal(calculateGeneratorCredits(next, model).credits, 72);
});

test('rejects manipulated unknown fields, illegal values and unsupported mode', () => {
  const model = getPreviewModel('video');
  const state = createGeneratorState(model);
  assert.throws(() => assertGeneratorDraft({
    ...state,
    params: { ...state.params, price: 1 },
  }, model), /Unsupported generator parameter/);
  assert.throws(() => assertGeneratorDraft({
    ...state,
    params: { ...state.params, duration: 100 },
  }, model), /Invalid generator parameter/);
  assert.throws(() => assertGeneratorDraft({
    ...state,
    workflow: 'text-to-video',
  }, model), /Unsupported workflow/);
});

test('readiness requires enabled model, prompt and required files', () => {
  const model = getPreviewModel('video');
  assert.throws(() => assertGeneratorReady(createGeneratorState(model), model), /not enabled/);
  const enabled = { ...model, enabled: true };
  assert.throws(() => assertGeneratorReady(createGeneratorState(enabled), enabled), /Prompt/);
  const withPrompt = updateGeneratorState(createGeneratorState(enabled), enabled, { prompt: 'A scene' });
  assert.throws(() => assertGeneratorReady(withPrompt, enabled), /startFrame/);
});

test('disabled preview models are not exposed in public registry', async () => {
  const { listEnabledGeneratorModels } = await import('./registry');
  assert.deepEqual(listEnabledGeneratorModels(), []);
});
