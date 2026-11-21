import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildGeneratorProviderRequest,
  getGeneratorProviderIdentity,
} from './adapters';
import { getGeneratorModel } from './catalog';
import { createGeneratorState, updateGeneratorState } from './normalize';

test('photo-to-video maps first frame without sending last_image', () => {
  const model = getGeneratorModel('seedance-2-i2v');
  const state = updateGeneratorState(createGeneratorState(model), model, {
    prompt: 'A cinematic shot',
  });
  const body = buildGeneratorProviderRequest(state, {
    startFrame: 'https://test.example/start.png',
    referenceImages: [], referenceVideos: [], referenceAudio: [],
  });
  assert.equal(body.image, 'https://test.example/start.png');
  assert.equal(body.last_image, undefined);
  assert.equal(body.aspect_ratio, '9:16');
  assert.equal(body.generate_audio, true);
  assert.deepEqual(getGeneratorProviderIdentity(state.modelId), {
    provider: 'wavespeed',
    providerModelId: 'bytedance/seedance-2.0/image-to-video',
  });
});

test('photo-to-video start-end passes two different role-specific URLs', () => {
  const model = getGeneratorModel('seedance-2-i2v');
  const state = updateGeneratorState(createGeneratorState(model), model, {
    workflow: 'start-end',
    prompt: 'A transformation',
  });
  const body = buildGeneratorProviderRequest(state, {
    startFrame: 'https://test.example/start.png',
    endFrame: 'https://test.example/end.png',
    referenceImages: [], referenceVideos: [], referenceAudio: [],
  });
  assert.equal(body.image, 'https://test.example/start.png');
  assert.equal(body.last_image, 'https://test.example/end.png');
});

test('image editing maps up to four references without legacy Genjutsu fields', () => {
  const model = getGeneratorModel('flux2-flash-edit');
  const state = updateGeneratorState(createGeneratorState(model), model, {
    prompt: 'Remove blemishes',
    params: { outputCount: 3, aspectRatio: '16:9' },
  });
  const body = buildGeneratorProviderRequest(state, {
    referenceImages: ['https://test.example/input.png'],
    referenceVideos: [], referenceAudio: [],
  });
  assert.equal(body.image_size, 'landscape_16_9');
  assert.deepEqual(body.image_urls, ['https://test.example/input.png']);
  assert.equal(body.num_images, 3);
  assert.equal(body.output_format, 'png');
  assert.equal(body.enable_safety_checker, true);
});

test('H3 video reference request is distinct from all-in-one workflow', () => {
  assert.deepEqual(getGeneratorProviderIdentity('h3-reference'), {
    provider: 'fal',
    providerModelId: 'minimax/h3/reference-to-video',
  });
});
