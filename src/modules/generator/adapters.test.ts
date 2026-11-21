import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildGeneratorProviderRequest,
  getGeneratorProviderIdentity,
} from './adapters';
import { GENERATOR_MODELS, getGeneratorModel } from './catalog';
import { createGeneratorState, updateGeneratorState } from './normalize';
import { calculateGeneratorCredits } from './pricing';
import { assertGeneratorReady } from './validation';
import type { GeneratorInputs, Workflow } from './types';

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


test('Nano Banana accepts all aspect ratios advertised in the public model settings', () => {
  for (const id of ['nano-banana-2', 'nano-banana-pro']) {
    const model = getGeneratorModel(id);
    for (const aspectRatio of model.workflows['text-to-image']!.fields.aspectRatio.options ?? []) {
      const draft = updateGeneratorState(createGeneratorState(model), model, {
        params: { aspectRatio },
      });
      const request = buildGeneratorProviderRequest(draft, {
        referenceImages: [], referenceVideos: [], referenceAudio: [],
      });
      assert.equal(request.aspect_ratio, aspectRatio, id + ':' + aspectRatio);
    }
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
    'minimax-h3': 'minimax/h3',
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
    if (stagedModel(id).workflows['start-end']) {
      assert.equal(getGeneratorProviderIdentity(id, 'start-end').providerModelId,
        base + '/image-to-video', id);
    }
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
  for (const id of ['kling-4', 'kling-3']) {
    const model = stagedModel(id);
    const state = updateGeneratorState(createGeneratorState(model), model, {
      workflow: 'start-end', prompt: 'A smooth transition',
    });
    const request = buildGeneratorProviderRequest(state, media);
    assert.equal(request.start_image_url, media.startFrame);
    assert.equal(request.end_image_url, media.endFrame);
    assert.equal(request.image_url, undefined);
  }
  const turbo = stagedModel('kling-3-turbo');
  assert.equal(turbo.workflows['start-end'], undefined);
  const turboRequest = buildGeneratorProviderRequest(
    updateGeneratorState(createGeneratorState(turbo), turbo, {
      prompt: 'A camera dolly move',
    }),
    media
  );
  assert.equal(turboRequest.image_url, media.startFrame);
  assert.equal(turboRequest.start_image_url, undefined);
  assert.equal(turboRequest.end_image_url, undefined);
  assert.equal(turboRequest.generate_audio, undefined);

  const flash = stagedModel('kling-4-flash');
  assert.equal(flash.workflows['start-end'], undefined);
  const flashRequest = buildGeneratorProviderRequest(createGeneratorState(flash), media);
  assert.equal(flashRequest.start_image_url, media.startFrame);
  assert.equal(flashRequest.end_image_url, undefined);

  const minimax = getGeneratorModel('minimax-h3-max');
  const request = buildGeneratorProviderRequest(createGeneratorState(minimax), media);
  assert.equal(request.image_url, media.startFrame);
  assert.equal(request.resolution, '768P');
  assert.equal(request.prompt_expansion_mode, 'balanced');
  assert.equal(request.enable_safety_checker, true);
  assert.equal(request.generate_audio, undefined);
  const end = updateGeneratorState(createGeneratorState(minimax), minimax, {
    workflow: 'start-end',
  });
  const endRequest = buildGeneratorProviderRequest(end, media);
  assert.equal(endRequest.end_image_url, media.endFrame);
});

test('Fal frame workflows hide an ignored aspect setting; sound toggles are sent', () => {
  const models = [
    'seedance-2-fast', 'seedance-2-mini', 'seedance-2.5',
    'seedance-2.5-flash', 'minimax-h3', 'minimax-h3-max',
    'kling-4', 'kling-4-flash', 'kling-3-turbo', 'kling-3',
  ];
  for (const id of models) {
    const model = stagedModel(id);
    assert.equal(model.workflows['first-frame']?.fields.aspectRatio, undefined, id);
    assert.ok(model.workflows['text-to-video']?.fields.aspectRatio, id);
    assert.equal(model.workflows['start-end']?.fields.aspectRatio, undefined, id);
  }
  for (const id of [
    'seedance-2-fast', 'seedance-2-mini', 'seedance-2.5',
    'seedance-2.5-flash', 'kling-3',
  ]) {
    const model = stagedModel(id);
    assert.deepEqual(model.workflows['first-frame']?.fields.generateAudio?.options,
      [true, false], id);
    const state = updateGeneratorState(createGeneratorState(model), model, {
      params: { generateAudio: false },
    });
    assert.equal(buildGeneratorProviderRequest(state, {
      ...emptyMedia, startFrame: 'https://example.test/start.png',
    }).generate_audio, false, id);
  }
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
    assert.equal(request.output_format, 'png');
    assert.equal(request.resolution, undefined);
  }
});

test('MiniMax H3 Image 1K wide and portrait outputs meet Fal minimum pixel area', () => {
  for (const id of ['minimax-h3-image', 'minimax-h3-image-highspeed']) {
    const model = getGeneratorModel(id);
    for (const aspectRatio of ['16:9', '9:16']) {
      const state = updateGeneratorState(createGeneratorState(model), model, {
        params: { resolution: '1K', aspectRatio, outputFormat: 'webp' },
      });
      const body = buildGeneratorProviderRequest(state, emptyMedia);
      const size = body.image_size as { width: number; height: number };
      assert.ok(size.width * size.height >= 655360, id + ':' + aspectRatio);
      assert.ok(size.width * size.height <= 20000000, id + ':' + aspectRatio);
      const [a, b] = aspectRatio.split(':').map(Number);
      assert.ok(Math.abs(size.width / size.height - a / b) < 0.04);
      assert.equal(body.output_format, 'webp');
    }
  }
});

test('model-specific workflows match documented Fal frame and expansion support', () => {
  for (const id of ['kling-3-turbo', 'kling-4-flash']) {
    const model = getGeneratorModel(id);
    assert.deepEqual(Object.keys(model.workflows),
      ['first-frame', 'all-in-one-reference', 'text-to-video'], id);
    assert.equal(model.workflows['start-end'], undefined, id);
  }
  for (const id of ['kling-3', 'kling-4', 'minimax-h3']) {
    assert.ok(getGeneratorModel(id).workflows['start-end'], id);
  }
  const h3 = getGeneratorModel('minimax-h3');
  assert.ok(h3.workflows['text-to-video']?.fields.promptExpansionMode.options?.includes('fast'));
  for (const id of ['minimax-h3-max', 'minimax-h3-max-turbo']) {
    const mode = getGeneratorModel(id).workflows['text-to-video']?.fields.promptExpansionMode;
    assert.ok(mode);
    assert.equal(mode.options?.includes('fast'), false, id);
    assert.deepEqual(mode.options, ['disabled', 'balanced', 'quality'], id);
  }
});

test('every enabled model/workflow has valid form defaults, billable quote, endpoint and payload', () => {
  const selectedIds = new Set<string>();
  for (const model of GENERATOR_MODELS.filter(item => item.enabled)) {
    for (const [workflowName, spec] of Object.entries(model.workflows)) {
      if (!spec) continue;
      const workflow = workflowName as Workflow;
      const count = (slot: keyof GeneratorInputs) => {
        const min = spec.slots[slot]?.min ?? 0;
        return slot === 'referenceImages' &&
          spec.requiresAnyReference && min === 0 ? 1 : min;
      };
      const inputs: GeneratorInputs = {
        startFrame: count('startFrame') ? 'start' : null,
        endFrame: count('endFrame') ? 'end' : null,
        referenceImages: Array.from({length: count('referenceImages')}, (_, i) => 'img' + i),
        referenceVideos: Array.from({length: count('referenceVideos')}, (_, i) => 'video' + i),
        referenceAudio: Array.from({length: count('referenceAudio')}, (_, i) => 'audio' + i),
      };
      const draft = updateGeneratorState(createGeneratorState(model), model, {
        workflow,
        prompt: 'A calm cinematic camera movement',
        inputs,
      });
      assert.equal(draft.workflow, workflow, model.id + '/' + workflow);
      assert.doesNotThrow(() => assertGeneratorReady(draft, model), model.id + '/' + workflow);
      const price = calculateGeneratorCredits(draft, model);
      assert.ok(price.credits > 0, model.id + '/' + workflow);
      const identity = getGeneratorProviderIdentity(model.id, workflow);
      assert.ok(identity.providerModelId.length > 0, model.id + '/' + workflow);
      const media = {
        startFrame: inputs.startFrame ?? undefined,
        endFrame: inputs.endFrame ?? undefined,
        referenceImages: inputs.referenceImages,
        referenceVideos: inputs.referenceVideos,
        referenceAudio: inputs.referenceAudio,
      };
      const payload = buildGeneratorProviderRequest(draft, media);
      assert.equal(payload.prompt, draft.prompt, model.id + '/' + workflow);
      selectedIds.add(model.id);
    }
  }
  assert.equal(selectedIds.size, GENERATOR_MODELS.filter(item => item.enabled).length);
});

test('Kling Turbo only accepts documented JPEG/PNG first-frame formats', () => {
  const turbo = getGeneratorModel('kling-3-turbo');
  const supported = turbo.workflows['first-frame']?.slots.startFrame?.accept;
  assert.deepEqual(supported, ['image/png', 'image/jpeg']);
});

test('All-in-One routes text-only and reference-image input to different verified provider endpoints', () => {
  const noMedia = { referenceImages: [], referenceVideos: [], referenceAudio: [] };
  const refMedia = {
    ...noMedia,
    referenceImages: ['https://example.test/ref-1.png'],
  };
  for (const [modelId, refEndpoint, refField] of [
    ['seedance-2-fast', 'bytedance/seedance-2.0/fast/reference-to-video', 'image_urls'],
    ['seedance-2-mini', 'bytedance/seedance-2.0/mini/reference-to-video', 'image_urls'],
    ['seedance-2.5', 'bytedance/seedance-2.5/reference-to-video', 'image_urls'],
    ['seedance-2.5-flash', 'bytedance/seedance-2.5/flash/reference-to-video', 'image_urls'],
    ['minimax-h3', 'minimax/h3/reference-to-video', 'reference_image_urls'],
    ['minimax-h3-max', 'minimax/h3-max/reference-to-video', 'reference_image_urls'],
    ['minimax-h3-max-turbo', 'minimax/h3-max-turbo/reference-to-video', 'reference_image_urls'],
    ['kling-4', 'kling/v4/reference-to-video', 'image_urls'],
    ['kling-4-flash', 'kling/v4/flash/reference-to-video', 'image_urls'],
  ] as const) {
    const model = getGeneratorModel(modelId);
    const spec = model.workflows['all-in-one-reference']!;
    assert.ok(spec, modelId);
    assert.equal(spec.slots.referenceImages?.min, 0);
    assert.ok((spec.slots.referenceImages?.max ?? 0) > 0);
    const draft = updateGeneratorState(createGeneratorState(model), model, {
      workflow: 'all-in-one-reference',
      prompt: 'A character walks across the courtyard',
    });
    assert.doesNotThrow(() => assertGeneratorReady(draft, model));
    assert.equal(getGeneratorProviderIdentity(modelId, 'all-in-one-reference', false)
      .providerModelId, getGeneratorProviderIdentity(modelId, 'text-to-video').providerModelId);
    const textBody = buildGeneratorProviderRequest(draft, noMedia);
    assert.equal(textBody[refField], undefined, modelId);
    const mediaDraft = updateGeneratorState(draft, model, {
      inputs: { ...draft.inputs, referenceImages: ['photo'] },
    });
    assert.equal(getGeneratorProviderIdentity(modelId, 'all-in-one-reference', true)
      .providerModelId, refEndpoint);
    assert.deepEqual(buildGeneratorProviderRequest(mediaDraft, refMedia)[refField],
      refMedia.referenceImages, modelId);
  }

  const seedance = getGeneratorModel('all-in-one-video');
  const draft = updateGeneratorState(createGeneratorState(seedance), seedance, {
    prompt: 'A bicycle moves across the frame',
  });
  assert.doesNotThrow(() => assertGeneratorReady(draft, seedance));
  assert.equal(getGeneratorProviderIdentity(seedance.id, draft.workflow, false).providerModelId,
    'bytedance/seedance-2.0/text-to-video');
  const payload = buildGeneratorProviderRequest(draft, noMedia);
  assert.equal(payload.reference_images, undefined);
  assert.equal(payload.reference_videos, undefined);
  assert.equal(getGeneratorProviderIdentity(seedance.id, draft.workflow, true).providerModelId,
    'bytedance/seedance-2.0/reference-to-video');
});

test('text-only All-in-One on models without reference endpoint has no fake upload slot', () => {
  for (const id of ['kling-3', 'kling-3-turbo']) {
    const model = getGeneratorModel(id);
    const spec = model.workflows['all-in-one-reference']!;
    assert.deepEqual(Object.keys(spec.slots), [], id);
    assert.equal(getGeneratorProviderIdentity(id, 'all-in-one-reference').providerModelId,
      getGeneratorProviderIdentity(id, 'text-to-video').providerModelId);
  }
});
