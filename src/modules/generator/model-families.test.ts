import assert from 'node:assert/strict';
import test from 'node:test';

import { GENERATOR_MODELS, listGeneratorModels, getGeneratorModel } from './catalog';
import {
  getGeneratorModelFamilyId,
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
  assert.deepEqual(groups.map(g => g.label), ['Seedance', 'Nano Banana', 'FLUX']);
  assert.deepEqual(groups[0].models.map(m => m.id), [
    'photo-to-video-standard', 'text-to-video-standard',
    'multi-image-to-video', 'all-in-one-video',
  ]);
  assert.deepEqual(groups[1].models.map(m => m.id), ['nano-banana-2', 'nano-banana-pro']);
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
    'Nano Banana 2',
    'Nano Banana Pro',
    'FLUX.1 Schnell',
    'FLUX.2 Flash',
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
    'First Frame', 'Start & End', 'Text to Video', 'Multi-Image', 'All-in-One',
  ]);
  const start = updateGeneratorState(createGeneratorState(photo), photo, {
    prompt: 'A tracking shot',
    inputs: { ...createGeneratorState(photo).inputs, startFrame: 'photo' },
  });
  const multi = choices.find(item => item.label === 'Multi-Image')!;
  const multiModel = getGeneratorModel(multi.modelId);
  const next = normalizeGeneratorState(start, multiModel, multi.workflow);
  assert.equal(next.modelId, 'multi-image-to-video');
  assert.equal(next.workflow, 'all-in-one-reference');
  assert.deepEqual(next.inputs.referenceImages, ['photo']);
  assert.equal(next.inputs.startFrame, null);
  assert.equal(next.prompt, 'A tracking shot');
  assert.equal(calculateGeneratorCredits(next, multiModel).credits, 204);
  const all = choices.find(item => item.label === 'All-in-One')!;
  const nextAllModel = getGeneratorModel(all.modelId);
  const full = normalizeGeneratorState(next, nextAllModel, all.workflow);
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
  assert.deepEqual(groups.map(group => group.label), ['Seedance']);
  assert.deepEqual(models.map(generatorModelLabel), ['Seedance 2.0']);
  // The H3 preview has unverified pricing, so it is not selectable in DEV.
  assert.ok(!models.some(model => model.id === 'reference-to-video-pro'));
  const workflowChoices = getGeneratorWorkflowChoices(allModels, models[0]);
  assert.deepEqual(workflowChoices.map(item => item.label), [
    'First Frame', 'Start & End', 'Text to Video', 'Multi-Image', 'All-in-One',
  ]);
});

test('image tab lists Nano Banana and real FLUX models, not feature labels', () => {
  const models = getGeneratorModelChoices(
    GENERATOR_MODELS.filter(model => model.mediaType === 'image')
  );
  const groups = groupGeneratorModels(models);
  assert.deepEqual(groups.map(group => group.label), ['Nano Banana', 'FLUX']);
  assert.deepEqual(groups.map(group => group.models.map(generatorModelLabel)), [
    ['Nano Banana 2', 'Nano Banana Pro'],
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
