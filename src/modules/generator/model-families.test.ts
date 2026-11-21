import assert from 'node:assert/strict';
import test from 'node:test';

import { GENERATOR_MODELS, listGeneratorModels, getGeneratorModel } from './catalog';
import {
  getGeneratorModelFamilyId,
  getGeneratorModelHighlights,
  getGeneratorStartingCredits,
  groupGeneratorModels,
  getGeneratorModelChoices,
  getGeneratorWorkflowChoices,
  generatorModelLabel,
  isSameGeneratorModelChoice,
} from './model-families';
import { createGeneratorState, normalizeGeneratorState, updateGeneratorState } from './normalize';
import { calculateGeneratorCredits } from './pricing';

test('model chooser lists Seedance and Nano Banana, not workflow categories', () => {
  const groups = groupGeneratorModels(listGeneratorModels());
  assert.deepEqual(groups.map(g => g.label), [
    'Seedance', 'Nano Banana', 'MiniMax', 'Kling', 'FLUX',
  ]);
  assert.deepEqual(groups[0].models.map(m => m.id), [
    'photo-to-video-standard', 'text-to-video-standard',
    'multi-image-to-video', 'all-in-one-video',
    'seedance-2-fast', 'seedance-2-mini',
    'seedance-2.5', 'seedance-2.5-flash',
  ]);
  assert.deepEqual(groups[1].models.map(m => m.id), ['nano-banana-2.1', 'nano-banana-2-lite', 'nano-banana-2', 'nano-banana-pro']);
  assert.equal(getGeneratorModelFamilyId('nano-banana-pro'), 'nano-banana');
  assert.equal(getGeneratorModelFamilyId('reference-to-video-pro'), 'minimax');
  assert.equal(GENERATOR_MODELS.find(model => model.id === 'reference-to-video-pro')?.name, 'MiniMax H3');
  assert.equal(getGeneratorModelFamilyId('image-edit-standard'), 'flux');
});

test('changing Nano Banana version keeps image edit workflow and reference photos', () => {
  const regular = getGeneratorModel('nano-banana-2');
  const pro = getGeneratorModel('nano-banana-pro');
  const edited = updateGeneratorState(createGeneratorState(regular), regular, {
    workflow: 'image-to-image',
    prompt: 'Change the background',
    inputs: { ...createGeneratorState(regular).inputs, referenceImages: ['image1'] },
    params: { resolution: '4K' },
  });
  const migrated = normalizeGeneratorState(edited, pro);
  assert.equal(migrated.workflow, 'image-to-image');
  assert.deepEqual(migrated.inputs.referenceImages, ['image1']);
  assert.equal(migrated.prompt, edited.prompt);
  assert.equal(migrated.params.resolution, '4K');
  assert.equal(calculateGeneratorCredits(migrated, pro).credits, 51);
});

test('switching between image/video families clears incompatible fields', () => {
  const seedance = getGeneratorModel('photo-to-video-standard');
  const nano = getGeneratorModel('nano-banana-2');
  const photo = updateGeneratorState(createGeneratorState(seedance), seedance, {
    prompt: 'A person walks',
    inputs: { ...createGeneratorState(seedance).inputs, startFrame: 'first' },
  });
  const image = normalizeGeneratorState(photo, nano);
  assert.equal(image.mediaType, 'image');
  assert.equal(image.workflow, 'text-to-image');
  assert.equal(image.inputs.startFrame, null);
  assert.equal(image.params.duration, undefined);
  assert.equal(image.prompt, photo.prompt);
});


test('model menu contains one Seedance 2.0 item and no workflow or resolution metadata', () => {
  const models = listGeneratorModels();
  const menu = getGeneratorModelChoices(models);
  assert.deepEqual(menu.map(generatorModelLabel), [
    'Seedance 2.0',
    'Nano Banana 2.1',
    'Nano Banana 2 Lite',
    'Nano Banana 2',
    'Nano Banana Pro',
    'FLUX.1 Schnell',
    'FLUX.2 Flash',
    'Seedance 2.0 Fast', 'Seedance 2.0 Mini',
    'Seedance 2.5', 'Seedance 2.5 Flash',
    'MiniMax H3', 'MiniMax H3 Max Turbo', 'MiniMax H3 Max',
    'Kling 4.0', 'Kling 4.0 Flash', 'Kling 3.0 Turbo', 'Kling 3.0',
    'MiniMax H3 Image', 'MiniMax H3 Image Highspeed',
  ]);
  const selectedTextVideo = getGeneratorModel('text-to-video-standard');
  const seedance = getGeneratorModel('photo-to-video-standard');
  assert.equal(isSameGeneratorModelChoice(seedance, selectedTextVideo), true);
  assert.equal(isSameGeneratorModelChoice(
    getGeneratorModel('nano-banana-2'), selectedTextVideo
  ), false);
});

test('Seedance mode choices select the real provider profile, not extra model cards', () => {
  const models = listGeneratorModels();
  const photo = getGeneratorModel('photo-to-video-standard');
  const choices = getGeneratorWorkflowChoices(models, photo);
  assert.deepEqual(choices.map(item => item.label), [
    'First Frame', 'Start & End', 'All-in-One Reference',
  ]);
  const start = updateGeneratorState(createGeneratorState(photo), photo, {
    prompt: 'A tracking shot',
    inputs: { ...createGeneratorState(photo).inputs, startFrame: 'photo' },
  });
  const all = choices.find(item => item.label === 'All-in-One Reference')!;
  const nextAllModel = getGeneratorModel(all.modelId);
  const full = normalizeGeneratorState(start, nextAllModel, all.workflow);
  assert.equal(full.workflow, 'all-in-one-reference');
  assert.equal(full.inputs.startFrame, null);
  assert.equal(full.prompt, start.prompt);
  assert.equal(full.modelId, 'all-in-one-video');
  assert.deepEqual(full.inputs.referenceImages, ['photo']);
  assert.equal(calculateGeneratorCredits(full, nextAllModel).credits, 204);
});

test('Nano Banana model choices keep image generation/editing workflow separate', () => {
  const models = listGeneratorModels();
  const nano = getGeneratorModel('nano-banana-2');
  const choices = getGeneratorWorkflowChoices(models, nano);
  assert.deepEqual(choices.map(item => item.label), ['Text to Image', 'Image Edit']);
  assert.ok(choices.every(item => item.modelId === 'nano-banana-2'));
});


test('video tab shows actual enabled video model families only', () => {
  const allModels = GENERATOR_MODELS;
  const models = getGeneratorModelChoices(
    allModels.filter(model => model.mediaType === 'video')
  );
  const groups = groupGeneratorModels(models);
  assert.deepEqual(groups.map(group => group.label), ['Seedance', 'MiniMax', 'Kling']);
  assert.deepEqual(models.map(generatorModelLabel), [
    'Seedance 2.0',
    'Seedance 2.0 Fast', 'Seedance 2.0 Mini',
    'Seedance 2.5', 'Seedance 2.5 Flash',
    'MiniMax H3', 'MiniMax H3 Max Turbo', 'MiniMax H3 Max',
    'Kling 4.0', 'Kling 4.0 Flash', 'Kling 3.0 Turbo', 'Kling 3.0',
  ]);
  // The H3 preview has unverified pricing, so it is not selectable in DEV.
  assert.ok(!models.some(model => model.id === 'reference-to-video-pro'));
  const workflowChoices = getGeneratorWorkflowChoices(allModels, models[0]);
  assert.deepEqual(workflowChoices.map(item => item.label), [
    'First Frame', 'Start & End', 'All-in-One Reference',
  ]);
});

test('image tab lists Nano Banana and real FLUX models, not feature labels', () => {
  const models = getGeneratorModelChoices(
    GENERATOR_MODELS.filter(model => model.mediaType === 'image')
  );
  const groups = groupGeneratorModels(models);
  assert.deepEqual(groups.map(group => group.label), ['Nano Banana', 'MiniMax', 'FLUX']);
  assert.deepEqual(groups.map(group => group.models.map(generatorModelLabel)), [
    ['Nano Banana 2.1', 'Nano Banana 2 Lite', 'Nano Banana 2', 'Nano Banana Pro'],
    ['MiniMax H3 Image', 'MiniMax H3 Image Highspeed'],
    ['FLUX.1 Schnell', 'FLUX.2 Flash'],
  ]);
  assert.equal(models.every(model => model.mediaType === 'image'), true);
  assert.equal(models.every(model => model.enabled), true);
});

test('future enabled MiniMax model appears under its real brand only', () => {
  const h3 = GENERATOR_MODELS.find(model =>
    model.id === 'reference-to-video-pro'
  )!;
  const families = groupGeneratorModels(
    getGeneratorModelChoices([{ ...h3, enabled: true }])
  );
  assert.deepEqual(families.map(group => group.label), ['MiniMax']);
});


test('development previews list requested versions but cannot bill unpriced models', () => {
  const video = getGeneratorModelChoices(
    GENERATOR_MODELS.filter(model => model.mediaType === 'video'), true
  );
  const image = getGeneratorModelChoices(
    GENERATOR_MODELS.filter(model => model.mediaType === 'image'), true
  );
  assert.deepEqual(groupGeneratorModels(video).map(x => x.label), [
    'Seedance', 'MiniMax', 'Kling',
  ]);
  assert.deepEqual(groupGeneratorModels(image).map(x => x.label), [
    'Nano Banana', 'MiniMax', 'FLUX',
  ]);
  assert.deepEqual(video.filter(x => x.id.startsWith('seedance-')).map(x => x.name), [
    'Seedance 2.0 Fast', 'Seedance 2.0 Mini',
    'Seedance 2.5', 'Seedance 2.5 Flash',
  ]);
  assert.deepEqual(video.filter(x => x.id.startsWith('kling-')).map(x => x.name), [
    'Kling 4.0', 'Kling 4.0 Flash', 'Kling 3.0 Turbo', 'Kling 3.0',
  ]);
  assert.equal(video.filter(x => x.id.startsWith('kling-')).every(x => x.enabled), true);
  assert.ok(video.filter(x => x.id.startsWith('seedance-2')).every(x => x.enabled));
  assert.equal(image.filter(x => x.id.startsWith('minimax-h3-image')).length, 2);
  assert.equal(image.filter(x => x.id.startsWith('minimax-h3-image')).every(x => x.enabled), true);
});

test('Seedance Fast workflows use Fast endpoints, not original Seedance profiles', () => {
  const fast = GENERATOR_MODELS.find(x => x.id === 'seedance-2-fast')!;
  const choices = getGeneratorWorkflowChoices(GENERATOR_MODELS, fast);
  assert.deepEqual(choices.map(x => x.label),
    ['First Frame', 'Start & End', 'All-in-One Reference']);
  assert.ok(choices.every(x => x.modelId === fast.id));
  const old = GENERATOR_MODELS.find(x => x.id === 'photo-to-video-standard')!;
  assert.equal(isSameGeneratorModelChoice(old, fast), false);
});

test('family descriptions explain a useful strength without exposing settings', () => {
  const groups = groupGeneratorModels(getGeneratorModelChoices(listGeneratorModels()));
  assert.deepEqual(groups.map(group => [group.label, group.blurb]), [
    ['Seedance', 'Multi-reference video creation'],
    ['Nano Banana', 'Multi-reference image edits'],
    ['MiniMax', 'High-resolution images & video'],
    ['Kling', 'Cinematic video motion'],
    ['FLUX', 'Fast image generation & edits'],
  ]);
});

test('model highlights use configured maximum capabilities and actual minimum credit quotes', () => {
  const examples: Array<[string, number, string, number | null]> = [
    ['photo-to-video-standard', 82, 'Up to 4K', 15],
    ['seedance-2-fast', 76, 'Up to 720p', 15],
    ['seedance-2-mini', 52, 'Up to 720p', 15],
    ['seedance-2.5', 152, 'Up to 720p', 30],
    ['seedance-2.5-flash', 100, 'Up to 720p', 30],
    ['minimax-h3', 55, 'Up to 4K', 15],
    ['minimax-h3-max', 80, 'Up to 768p', 15],
    ['kling-4', 81, 'Up to 1080p', 30],
    ['kling-4-flash', 51, 'Up to 720p', 20],
    ['nano-banana-2.1', 12, 'Up to 4K', null],
    ['nano-banana-2-lite', 11, 'Up to 1K', null],
    ['nano-banana-2', 14, 'Up to 4K', null],
    ['nano-banana-pro', 26, 'Up to 4K', null],
    ['minimax-h3-image', 8, 'Up to 4K', null],
    ['minimax-h3-image-highspeed', 12, 'Up to 4K', null],
    ['text-to-image-fast', 4, 'Up to 4 outputs', null],
    ['image-edit-standard', 9, 'Up to 4 refs', null],
  ];
  for (const [id, minimum, capability, duration] of examples) {
    const model = getGeneratorModel(id);
    const details = getGeneratorModelHighlights(model);
    assert.equal(details.startingCredits, minimum, id);
    assert.equal(details.capability, capability, id);
    assert.equal(details.maxDuration, duration, id);
    assert.ok(details.description.length <= 55, id);
  }
  const disabled = GENERATOR_MODELS.find(m => m.id === 'minimax-h3-turbo')!;
  assert.equal(getGeneratorStartingCredits(disabled), null);
  assert.equal(getGeneratorModelHighlights(disabled).capability, 'Up to 768p');
  for (const model of getGeneratorModelChoices(listGeneratorModels())) {
    assert.ok((getGeneratorStartingCredits(model) ?? 0) > 0, model.id);
  }
});

test('video modes are model-specific, not a universal three-choice dropdown', () => {
  const allowed = ['First Frame', 'Start & End', 'All-in-One Reference'];
  for (const model of getGeneratorModelChoices(listGeneratorModels('video'))) {
    const labels = getGeneratorWorkflowChoices(listGeneratorModels(), model).map(x => x.label);
    assert.ok(labels.length <= 3, model.id);
    assert.deepEqual(labels, allowed.filter(x => labels.includes(x)), model.id);
    if (model.id === 'minimax-h3' || model.id === 'kling-3') {
      assert.deepEqual(labels, ['First Frame', 'Start & End'], model.id);
    } else if (model.id === 'kling-3-turbo') {
      assert.deepEqual(labels, ['First Frame'], model.id);
    } else if (model.id === 'kling-4-flash') {
      assert.deepEqual(labels, ['First Frame', 'All-in-One Reference'], model.id);
    } else {
      assert.deepEqual(labels, allowed, model.id);
    }
  }
});
