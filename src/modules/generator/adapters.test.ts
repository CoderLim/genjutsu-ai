import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildGeneratorProviderRequest,
  getGeneratorProviderIdentity,
} from './adapters';
import { getGeneratorModel } from './catalog';
import { createGeneratorState, updateGeneratorState } from './normalize';

test('photo-to-video maps first frame without sending last_image', () => {
  const model = getGeneratorModel('photo-to-video-standard');
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
  const model = getGeneratorModel('photo-to-video-standard');
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
  const model = getGeneratorModel('image-edit-standard');
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
  assert.deepEqual(getGeneratorProviderIdentity('reference-to-video-pro'), {
    provider: 'fal',
    providerModelId: 'minimax/h3/reference-to-video',
  });
});

test('text-to-video sends no image field to WaveSpeed', () => {
  const model = getGeneratorModel('text-to-video-standard');
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
  const model = getGeneratorModel('multi-image-to-video');
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

test('Nano Banana switches Fal endpoints by workflow, without changing user model ID', () => {
  for (const id of ['nano-banana-2', 'nano-banana-pro']) {
    const model = getGeneratorModel(id);
    const textState = createGeneratorState(model);
    const textIdentity = getGeneratorProviderIdentity(id, 'text-to-image');
    const editIdentity = getGeneratorProviderIdentity(id, 'image-to-image');
    assert.equal(textIdentity.provider, 'fal');
    assert.equal(editIdentity.providerModelId, textIdentity.providerModelId + '/edit');

    const media = {
      referenceImages: ['https://test.example/photo.png'],
      referenceVideos: [], referenceAudio: [],
    };
    const textBody = buildGeneratorProviderRequest(textState, media);
    assert.equal(textBody.image_urls, undefined);
    assert.equal(textBody.resolution, '1K');
    assert.equal(textBody.aspect_ratio, '1:1');
    assert.equal(textBody.enable_web_search, undefined);
    assert.equal(textBody.thinking_level, undefined);

    const editState = updateGeneratorState(textState, model, { workflow: 'image-to-image' });
    const editBody = buildGeneratorProviderRequest(editState, media);
    assert.deepEqual(editBody.image_urls, media.referenceImages);
    assert.equal(editBody.output_format, 'png');
    assert.equal(editBody.num_images, 1);
  }
});
