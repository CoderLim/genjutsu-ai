import assert from 'node:assert/strict';
import test from 'node:test';

import { createGeneratorState, normalizeGeneratorState, updateGeneratorState } from './normalize';
import { GENERATOR_PREVIEW_MODELS, getPreviewModel } from './registry';

const video = getPreviewModel('video');
const image = getPreviewModel('image');

test('start-end to first-frame retains start and drops end', () => {
  const start = createGeneratorState(video);
  const pair = updateGeneratorState(start, video, {
    workflow: 'start-end',
    inputs: { ...start.inputs, startFrame: 'start', endFrame: 'end' },
  });
  const single = updateGeneratorState(pair, video, { workflow: 'first-frame' });
  assert.equal(single.inputs.startFrame, 'start');
  assert.equal(single.inputs.endFrame, null);
});

test('first-frame to start-end keeps start and leaves end empty', () => {
  const start = createGeneratorState(video);
  const single = updateGeneratorState(start, video, {
    inputs: { ...start.inputs, startFrame: 'start' },
  });
  const pair = updateGeneratorState(single, video, { workflow: 'start-end' });
  assert.equal(pair.inputs.startFrame, 'start');
  assert.equal(pair.inputs.endFrame, null);
});

test('all-in-one truncates, then first-frame keeps first image', () => {
  const start = createGeneratorState(video);
  const many = updateGeneratorState(start, video, {
    workflow: 'all-in-one-reference',
    inputs: { ...start.inputs, referenceImages: ['a', 'b', 'c', 'd', 'e', 'f'] },
  });
  assert.deepEqual(many.inputs.referenceImages, ['a', 'b', 'c', 'd', 'e']);
  const next = updateGeneratorState(many, video, { workflow: 'first-frame' });
  assert.equal(next.inputs.startFrame, 'a');
  assert.deepEqual(next.inputs.referenceImages, []);
});

test('unsupported workflow resets to model default', () => {
  const previous = createGeneratorState(video);
  const next = normalizeGeneratorState(previous, image, 'first-frame');
  assert.equal(next.mediaType, 'image');
  assert.equal(next.workflow, 'text-to-image');
  assert.deepEqual(next.inputs.referenceImages, []);
});

test('changing resolution clamps dependent duration and drops unsupported fields', () => {
  const start = createGeneratorState(video);
  const long = updateGeneratorState(start, video, { params: { duration: 10 } });
  const high = updateGeneratorState(long, video, {
    params: { resolution: '720p', rogue: 'bad' },
  });
  assert.equal(high.params.duration, 4);
  assert.equal(high.params.resolution, '720p');
  assert.ok(!('rogue' in high.params));
});

test('changing workflow removes audio field when unsupported', () => {
  const start = createGeneratorState(video);
  const audio = updateGeneratorState(start, video, {
    params: { generateAudio: true },
  });
  const next = updateGeneratorState(audio, video, { workflow: 'start-end' });
  assert.ok(!('generateAudio' in next.params));
});

test('image output count survives compatible workflow switching', () => {
  const start = createGeneratorState(image);
  const edited = updateGeneratorState(start, image, { params: { outputCount: 3 } });
  assert.equal(updateGeneratorState(edited, image, { workflow: 'image-to-image' }).params.outputCount, 3);
});

test('H3 preview is reference-to-video only, never all-in-one', () => {
  const h3 = GENERATOR_PREVIEW_MODELS.find((model) => model.id === 'h3-reference-preview');
  assert.ok(h3);
  assert.deepEqual(Object.keys(h3.workflows), ['reference-to-video']);
  const incompatible = normalizeGeneratorState(createGeneratorState(h3), h3, 'all-in-one-reference');
  assert.equal(incompatible.workflow, 'reference-to-video');
  assert.equal(h3.workflows['reference-to-video']!.slots.referenceImages!.max, 9);
});
