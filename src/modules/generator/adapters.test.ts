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

test('text-to-video sends no image field to WaveSpeed', () => {
  const model = getGeneratorModel('seedance-2-t2v');
  const state = updateGeneratorState(createGeneratorState(model), model, {
    prompt: 'A summer storm over the sea',
  });
  const request = buildGeneratorProviderRequest(state, {
    referenceImages: [], referenceVideos: [], referenceAudio: [],
  });
  assert.equal(request.image, undefined);
  assert.equal(request.last_image, undefined);
  assert.equal(request.duration, 5);
  assert.equal(request.generate_audio, true);
  assert.equal(getGeneratorProviderIdentity(state.modelId).providerModelId,
    'bytedance/seedance-2.0/text-to-video');
});

test('multi-image reference sends only reference_images and uses text-to-video rates', () => {
  const model = getGeneratorModel('seedance-2-multiimage');
  const state = updateGeneratorState(createGeneratorState(model), model, {
    prompt: '@image1 runs through a meadow, @image2 follows',
  });
  const body = buildGeneratorProviderRequest(state, {
    referenceImages: ['https://test.example/1.png', 'https://test.example/2.png'],
    referenceVideos: [], referenceAudio: [],
  });
  assert.deepEqual(body.reference_images, [
    'https://test.example/1.png', 'https://test.example/2.png',
  ]);
  assert.equal(body.reference_videos, undefined);
  assert.equal(getGeneratorProviderIdentity(state.modelId).providerModelId,
    'bytedance/seedance-2.0/text-to-video');
});
