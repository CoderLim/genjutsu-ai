import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildGeneratorProviderRequest,
  getGeneratorProviderIdentity,
} from './adapters';
import { GENERATOR_MODELS, getGeneratorModel } from './catalog';
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


const emptyMedia = { referenceImages: [], referenceVideos: [], referenceAudio: [] };

function stagedModel(id: string) {
  const model = GENERATOR_MODELS.find(item => item.id === id);
  assert.ok(model, 'Missing staged model ' + id);
  return model;
}

test('each staged Fal video model resolves separate text and frame endpoints', () => {
  const models: Record<string, string> = {
    'seedance-2-fast': 'bytedance/seedance-2.0/fast',
    'seedance-2-mini': 'bytedance/seedance-2.0/mini',
    'seedance-2.5': 'bytedance/seedance-2.5',
    'seedance-2.5-flash': 'bytedance/seedance-2.5/flash',
    'minimax-h3-max-turbo': 'minimax/h3-max-turbo',
    'minimax-h3-max': 'minimax/h3-max',
    'kling-4': 'kling/v4',
    'kling-4-flash': 'kling/v4/flash',
    'kling-3-turbo': 'fal-ai/kling-video/v3/turbo/standard',
    'kling-3': 'fal-ai/kling-video/v3/pro',
  };
  for (const [id, base] of Object.entries(models)) {
    assert.equal(getGeneratorProviderIdentity(id, 'text-to-video').providerModelId,
      base + '/text-to-video', id);
    assert.equal(getGeneratorProviderIdentity(id, 'first-frame').providerModelId,
      base + '/image-to-video', id);
    assert.equal(getGeneratorProviderIdentity(id, 'start-end').providerModelId,
      base + '/image-to-video', id);
  }
  assert.throws(
    () => getGeneratorProviderIdentity('minimax-h3-turbo', 'text-to-video'),
    /Unknown generator adapter/
  );
});

test('Fal video requests use provider-specific image field names, never generic WaveSpeed image', () => {
  const media = {
    ...emptyMedia,
    startFrame: 'https://example.test/start.png',
    endFrame: 'https://example.test/end.png',
  };
  for (const id of ['seedance-2-fast', 'seedance-2-mini', 'seedance-2.5', 'seedance-2.5-flash']) {
    const model = stagedModel(id);
    const state = updateGeneratorState(createGeneratorState(model), model, {
      workflow: 'start-end', prompt: 'A smooth transition',
    });
    const request = buildGeneratorProviderRequest(state, media);
    assert.equal(request.image_url, media.startFrame);
    assert.equal(request.end_image_url, media.endFrame);
    assert.equal(request.image, undefined);
  }
  for (const id of ['kling-4', 'kling-4-flash', 'kling-3-turbo', 'kling-3']) {
    const model = stagedModel(id);
    const state = updateGeneratorState(createGeneratorState(model), model, {
      workflow: 'start-end', prompt: 'A smooth transition',
    });
    const request = buildGeneratorProviderRequest(state, media);
    assert.equal(request.start_image_url, media.startFrame);
    assert.equal(request.end_image_url, media.endFrame);
    assert.equal(request.image_url, undefined);
  }
  const minimax = getGeneratorModel('minimax-h3-max');
  const request = buildGeneratorProviderRequest(createGeneratorState(minimax), media);
  assert.equal(request.image_url, media.startFrame);
  assert.equal(request.resolution, '768P');
});

test('Fal image model editing swaps endpoints and uses bounded image sizes', () => {
  for (const id of ['minimax-h3-image', 'minimax-h3-image-highspeed']) {
    const model = stagedModel(id);
    const base = getGeneratorProviderIdentity(id, 'text-to-image');
    assert.equal(base.provider, 'fal');
    assert.ok(base.providerModelId.endsWith('/text-to-image'));
    assert.ok(getGeneratorProviderIdentity(id, 'image-to-image').providerModelId.endsWith('/edit'));
    const state = updateGeneratorState(createGeneratorState(model), model, {
      workflow: 'image-to-image',
      params: { resolution: '4K', aspectRatio: '16:9', outputCount: 3 },
    });
    const request = buildGeneratorProviderRequest(state, {
      ...emptyMedia, referenceImages: ['https://example.test/ref.png'],
    });
    assert.deepEqual(request.image_urls, ['https://example.test/ref.png']);
    assert.deepEqual(request.image_size, { width: 3840, height: 2176 });
    assert.equal(request.num_images, 3);
    assert.equal(request.resolution, undefined);
  }
});
