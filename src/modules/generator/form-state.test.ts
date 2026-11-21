import assert from 'node:assert/strict';
import test from 'node:test';

import {
  availableGeneratorFieldValues,
  filterGeneratorLocalMedia,
  generatorReadinessError,
  getGeneratorExpansionControls,
  getGeneratorSlotCapacity,
  isGeneratorSlotOptional,
  isGeneratorJobActive,
  shouldPollGeneratorJob,
} from './form-state';
import { getGeneratorModel, GENERATOR_MODELS } from './catalog';
import { getPreviewModel } from './registry';
import { createGeneratorState, normalizeGeneratorState, updateGeneratorState } from './normalize';
import { generatorResultContentType } from './types';

test('photo-to-video requires a start frame in the new composer', () => {
  const model = getGeneratorModel('photo-to-video-standard');
  const spec = model.workflows['first-frame']!;
  const state = updateGeneratorState(createGeneratorState(model), model, {
    prompt: 'A person turns toward the camera',
  });

  assert.equal(isGeneratorSlotOptional(spec, 'startFrame'), false);
  assert.match(generatorReadinessError(state, model) ?? '', /startFrame/);
  assert.equal(
    generatorReadinessError(updateGeneratorState(state, model, {
      inputs: { ...state.inputs, startFrame: 'local-start' },
    }), model),
    null
  );
});

test('first-to-start-end retains first image, end-to-first drops end', () => {
  const model = getGeneratorModel('photo-to-video-standard');
  const start = createGeneratorState(model);
  const withStart = updateGeneratorState(start, model, {
    inputs: { ...start.inputs, startFrame: 'first' },
  });
  const pair = updateGeneratorState(withStart, model, { workflow: 'start-end' });
  assert.equal(pair.inputs.startFrame, 'first');
  assert.equal(pair.inputs.endFrame, null);
  const uploaded = updateGeneratorState(pair, model, {
    inputs: { ...pair.inputs, endFrame: 'last' },
  });
  const solo = updateGeneratorState(uploaded, model, { workflow: 'first-frame' });
  assert.equal(solo.inputs.startFrame, 'first');
  assert.equal(solo.inputs.endFrame, null);
});

test('model switching retains semantic first photo, drops unsupported settings', () => {
  const first = getGeneratorModel('photo-to-video-standard');
  const ref = getGeneratorModel('multi-image-to-video');
  const image = getGeneratorModel('text-to-image-fast');
  const from = updateGeneratorState(createGeneratorState(first), first, {
    prompt: 'Product spins slowly',
    inputs: { ...createGeneratorState(first).inputs, startFrame: 'photo' },
    params: { resolution: '4k', duration: 12 },
  });
  const toRef = normalizeGeneratorState(from, ref);
  assert.equal(toRef.workflow, 'all-in-one-reference');
  assert.deepEqual(toRef.inputs.referenceImages, ['photo']);
  assert.equal(toRef.prompt, from.prompt);
  const toImage = normalizeGeneratorState(toRef, image);
  assert.equal(toImage.workflow, 'text-to-image');
  assert.deepEqual(toImage.inputs.referenceImages, []);
  assert.equal(toImage.params.duration, undefined);
  assert.equal(toImage.prompt, from.prompt);
});

test('combined reference cap is shared across images, videos and audio', () => {
  const model = getGeneratorModel('all-in-one-video');
  const spec = model.workflows['all-in-one-reference']!;
  const state = createGeneratorState(model);
  assert.equal(isGeneratorSlotOptional(spec, 'referenceImages'), true);
  assert.equal(getGeneratorSlotCapacity(spec, state.inputs, 'referenceImages'), 9);
  const full = updateGeneratorState(state, model, {
    inputs: {
      ...state.inputs,
      referenceImages: Array.from({length: 9}, (_, i) => 'img' + i),
      referenceVideos: ['v1', 'v2', 'v3'],
    },
    params: { inputVideoSeconds: 6 },
  });
  assert.equal(getGeneratorSlotCapacity(spec, full.inputs, 'referenceAudio'), 0);
  assert.equal(getGeneratorSlotCapacity(spec, full.inputs, 'referenceImages'), 0);
  const reduced = updateGeneratorState(full, model, {
    inputs: { ...full.inputs, referenceImages: full.inputs.referenceImages.slice(1) },
  });
  assert.equal(getGeneratorSlotCapacity(spec, reduced.inputs, 'referenceAudio'), 1);
});

test('review status only polls if provider request ID exists', () => {
  assert.equal(shouldPollGeneratorJob({status: 'processing'}), true);
  assert.equal(shouldPollGeneratorJob({status: 'review', pollable: true}), true);
  assert.equal(shouldPollGeneratorJob({status: 'review', pollable: false}), false);
  assert.equal(shouldPollGeneratorJob({status: 'completed'}), false);
  assert.equal(shouldPollGeneratorJob({status: 'failed'}), false);
  assert.equal(shouldPollGeneratorJob(null), false);
});

test('unverified preview model cannot generate', () => {
  const disabled = GENERATOR_MODELS.find(m => m.id === 'reference-to-video-pro')!;
  const state = createGeneratorState(disabled);
  assert.match(generatorReadinessError(state, disabled) ?? '', /not enabled/);
});

test('settings present only options valid under model constraints', () => {
  const model = getPreviewModel('video');
  const state = createGeneratorState(model);
  const spec = model.workflows['first-frame']!;
  const choices = [...(spec.fields.duration.options ?? [])];
  assert.deepEqual(
    availableGeneratorFieldValues(spec, state.params, 'duration', choices),
    [4, 6, 8, 10]
  );
  const high = updateGeneratorState(state, model, { params: { resolution: '720p' } });
  assert.deepEqual(
    availableGeneratorFieldValues(spec, high.params, 'duration', choices),
    [4, 6]
  );
  assert.deepEqual(
    availableGeneratorFieldValues(spec, high.params, 'aspectRatio', ['16:9','9:16']),
    ['16:9','9:16']
  );
});

test('pending or ambiguous generation blocks a second new submission', () => {
  assert.equal(isGeneratorJobActive({status: 'processing'}), true);
  assert.equal(isGeneratorJobActive({status: 'review'}), true);
  assert.equal(isGeneratorJobActive({status: 'completed'}), false);
  assert.equal(isGeneratorJobActive({status: 'failed'}), false);
  assert.equal(isGeneratorJobActive(null), false);
});

test('H3 Fast and Enhance controls only appear when supported by the selected model', () => {
  const h3 = getGeneratorModel('minimax-h3');
  const base = getGeneratorExpansionControls(h3.workflows['first-frame']!);
  assert.deepEqual(base, { enhance: false, fast: false });
  const h3Turbo = GENERATOR_MODELS.find(model => model.id === 'minimax-h3-turbo')!;
  assert.deepEqual(
    getGeneratorExpansionControls(h3Turbo.workflows['first-frame']!),
    { enhance: false, fast: false }
  );
  for (const id of ['minimax-h3-max', 'minimax-h3-max-turbo']) {
    const spec = getGeneratorModel(id).workflows['text-to-video']!;
    assert.deepEqual(getGeneratorExpansionControls(spec),
      { enhance: true, fast: false }, id);
  }
  for (const id of ['kling-4', 'seedance-2-fast', 'nano-banana-2']) {
    const spec = getGeneratorModel(id).workflows[
      getGeneratorModel(id).defaultWorkflow
    ]!;
    assert.deepEqual(getGeneratorExpansionControls(spec),
      { enhance: false, fast: false }, id);
  }
});

test('switching away from Kling Start & End drops an unsupported end frame', () => {
  const kling4 = getGeneratorModel('kling-4');
  const flash = getGeneratorModel('kling-4-flash');
  const prepared = updateGeneratorState(createGeneratorState(kling4), kling4, {
    workflow: 'start-end', prompt: 'Camera tracks subject',
    inputs: {
      ...createGeneratorState(kling4).inputs,
      startFrame: 'start-frame',
      endFrame: 'end-frame',
    },
  });
  const changed = normalizeGeneratorState(prepared, flash);
  assert.equal(changed.workflow, 'first-frame');
  assert.equal(changed.inputs.startFrame, 'start-frame');
  assert.equal(changed.inputs.endFrame, null);
  assert.equal(changed.params.duration, 5);
  assert.equal(changed.params.resolution, '720p');
});

test('all advertised H3 prompt expansion options survive form normalization', () => {
  for (const id of ['minimax-h3-max', 'minimax-h3-max-turbo']) {
    const model = getGeneratorModel(id);
    const spec = model.workflows['text-to-video']!;
    const modes = spec.fields.promptExpansionMode?.options ?? [];
    const available = availableGeneratorFieldValues(spec,
      createGeneratorState(model).params, 'promptExpansionMode', modes);
    assert.deepEqual(available, modes, id);
    for (const mode of modes) {
      const state = updateGeneratorState(createGeneratorState(model), model, {
        workflow: 'text-to-video',
        params: { promptExpansionMode: mode },
      });
      assert.equal(state.params.promptExpansionMode, mode, id + ':' + mode);
    }
  }
});

test('switching from a reference model to H3 preserves only a compatible first frame', () => {
  const seedance = getGeneratorModel('seedance-2.5');
  const h3 = getGeneratorModel('minimax-h3');
  const reference = updateGeneratorState(createGeneratorState(seedance), seedance, {
    workflow: 'all-in-one-reference',
    prompt: 'A dancer performing on a stage',
    inputs: { ...createGeneratorState(seedance).inputs,
      referenceImages: ['reference-1', 'reference-2'] },
    params: { duration: 4, resolution: '720p', generateAudio: true },
  });
  const converted = normalizeGeneratorState(reference, h3);
  assert.equal(converted.workflow, 'first-frame');
  assert.equal(converted.inputs.startFrame, 'reference-1');
  assert.deepEqual(converted.inputs.referenceImages, []);
  assert.equal(converted.params.duration, 5);
  assert.equal(converted.params.resolution, '768P');
  assert.equal(converted.params.generateAudio, undefined);
  assert.equal(converted.params.aspectRatio, undefined);
  assert.equal(converted.prompt, reference.prompt);

  const startEnd = updateGeneratorState(converted, h3, { workflow: 'start-end' });
  assert.equal(startEnd.inputs.startFrame, 'reference-1');
  assert.equal(startEnd.inputs.endFrame, null);
  assert.match(generatorReadinessError(startEnd, h3) ?? '', /endFrame/);
});

test('saved output MIME matches the supported image format, not always JPEG', () => {
  assert.equal(generatorResultContentType('image', 'png'), 'image/png');
  assert.equal(generatorResultContentType('image', 'jpeg'), 'image/jpeg');
  assert.equal(generatorResultContentType('image', 'webp'), 'image/webp');
  assert.equal(generatorResultContentType('image', undefined), 'image/png');
  assert.equal(generatorResultContentType('video', 'webp'), 'video/mp4');
});

test('image model forms have consistent text/edit modes, reference limits and formats', () => {
  for (const [id, editMax] of [
    ['nano-banana-2.1', 14],
    ['nano-banana-2-lite', 14],
    ['nano-banana-2', 14],
    ['nano-banana-pro', 14],
    ['minimax-h3-image', 16],
    ['minimax-h3-image-highspeed', 16],
    ['image-edit-standard', 4],
  ] as const) {
    const model = getGeneratorModel(id);
    const edit = model.workflows['image-to-image']!;
    assert.equal(edit.slots.referenceImages?.min, 1, id);
    assert.equal(edit.slots.referenceImages?.max, editMax, id);
    assert.ok(edit.fields.outputFormat.options?.includes('png'), id);
    const draft = updateGeneratorState(createGeneratorState(model), model, {
      workflow: 'image-to-image', prompt: 'Update this photo',
    });
    assert.match(generatorReadinessError(draft, model) ?? '',
      /referenceImages/, id);
    const withPhoto = updateGeneratorState(draft, model, {
      inputs: { ...draft.inputs, referenceImages: ['reference'] },
    });
    assert.equal(generatorReadinessError(withPhoto, model), null, id);
  }
  const schnell = getGeneratorModel('text-to-image-fast');
  assert.equal(schnell.workflows['image-to-image'], undefined);
  const lite = getGeneratorModel('nano-banana-2-lite');
  assert.deepEqual(lite.workflows['text-to-image']!.fields.resolution.options, ['1K']);
  assert.deepEqual(lite.workflows['image-to-image']!.fields.resolution.options, ['1K']);
});

test('switching from WebP Seedance frame to JPEG/PNG-only Kling Turbo removes the file', () => {
  const seedance = getGeneratorModel('photo-to-video-standard');
  const turbo = getGeneratorModel('kling-3-turbo');
  const first = updateGeneratorState(createGeneratorState(seedance), seedance, {
    inputs: { ...createGeneratorState(seedance).inputs, startFrame: 'blob:webp' },
    prompt: 'Animate this scene',
  });
  const local = new Map([
    ['blob:webp', { type: 'image/webp', size: 30_000 }],
  ]);
  const switched = normalizeGeneratorState(first, turbo);
  assert.equal(switched.inputs.startFrame, 'blob:webp');
  const clean = filterGeneratorLocalMedia(switched, turbo, url => local.get(url));
  assert.equal(clean.inputs.startFrame, null);
  assert.match(generatorReadinessError(clean, turbo) ?? '', /startFrame/);

  const png = new Map([['blob:png', { type: 'image/png', size: 40_000 }]]);
  const valid = updateGeneratorState(first, seedance, {
    inputs: { ...first.inputs, startFrame: 'blob:png' },
  });
  assert.equal(filterGeneratorLocalMedia(
    normalizeGeneratorState(valid, turbo), turbo, url => png.get(url)
  ).inputs.startFrame, 'blob:png');
});

test('model or workflow changes remove oversize, missing and unsupported reference files', () => {
  const nano = getGeneratorModel('nano-banana-2');
  const edit = updateGeneratorState(createGeneratorState(nano), nano, {
    workflow: 'image-to-image',
    inputs: {
      ...createGeneratorState(nano).inputs,
      referenceImages: ['good', 'oversized', 'wrong-mime', 'missing'],
    },
  });
  const files = new Map([
    ['good', { type: 'image/jpeg', size: 200_000 }],
    ['oversized', { type: 'image/jpeg', size: 13 * 1048576 }],
    ['wrong-mime', { type: 'video/mp4', size: 100_000 }],
  ]);
  const filtered = filterGeneratorLocalMedia(edit, nano, url => files.get(url));
  assert.deepEqual(filtered.inputs.referenceImages, ['good']);
  assert.equal(generatorReadinessError({
    ...filtered, prompt: 'Change background to a forest',
  }, nano), null);

  const text = normalizeGeneratorState(filtered, nano, 'text-to-image');
  assert.deepEqual(filterGeneratorLocalMedia(text, nano, url => files.get(url))
    .inputs.referenceImages, []);
});
