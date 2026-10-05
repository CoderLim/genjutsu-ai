import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildSeedanceWorkflowPrompt,
  getSeedanceTask,
} from './workflow';

test('maps motion transfer to Seedance reference task', () => {
  assert.equal(getSeedanceTask('motion-transfer'), 'reference');
});

test('maps object swap to Seedance editing task', () => {
  assert.equal(getSeedanceTask('objects-swap'), 'editing');
});

test('object swap preserves unrelated content and supports locations', () => {
  const prompt = buildSeedanceWorkflowPrompt({
    mode: 'objects-swap',
    userPrompt: 'Replace the red bottle',
    imageCount: 1,
  });

  assert.match(prompt, /Edit @Video1/);
  assert.match(prompt, /Reference 1 maps to @Image1/);
  assert.match(prompt, /locations, environments/);
  assert.match(prompt, /Preserve everything unrelated/);
  assert.match(prompt, /Replace the red bottle/);
});

test('object swap object-only request explicitly preserves background', () => {
  const prompt = buildSeedanceWorkflowPrompt({
    mode: 'objects-swap',
    userPrompt: 'Replace only the perfume bottle with Reference 1',
    imageCount: 1,
  });

  assert.match(prompt, /Replace only the requested/);
  assert.match(prompt, /background/);
  assert.match(prompt, /unrelated people/);
  assert.match(prompt, /unrelated objects/);
  assert.match(prompt, /Do not regenerate or alter unrelated parts/);
  assert.match(prompt, /Replace only the perfume bottle/);
});

test('multi-reference object swap allows different targets or multiple views of one target', () => {
  const prompt = buildSeedanceWorkflowPrompt({
    mode: 'objects-swap',
    userPrompt:
      'Replace the bottle with Reference 1 and the shirt with Reference 2',
    imageCount: 2,
  });

  assert.match(prompt, /Reference 1 = @Image1/);
  assert.match(prompt, /Reference 2 = @Image2/);
  assert.match(
    prompt,
    /different elements, different roles, or multiple views of the same element/
  );
  assert.match(
    prompt,
    /different requested targets or provide multiple views of the same target/
  );
  assert.doesNotMatch(
    prompt,
    /Do not assume they are alternate views of the same subject/
  );
  assert.match(prompt, /Preserve everything unrelated/);
});

test('object swap without a prompt falls back conservatively', () => {
  const prompt = buildSeedanceWorkflowPrompt({
    mode: 'objects-swap',
    imageCount: 2,
  });

  assert.match(prompt, /Use visual correspondence conservatively/);
  assert.match(prompt, /Only modify targets with a clear match/);
  assert.match(prompt, /do not merge unrelated references/);
});

test('motion transfer keeps motion-camera contract without assuming a character replacement', () => {
  const prompt = buildSeedanceWorkflowPrompt({
    mode: 'motion-transfer',
    userPrompt: 'Move the whole fight into the forest from Reference 1',
    imageCount: 1,
  });

  assert.match(
    prompt,
    /source of motion, timing, poses, choreography, camera movement/
  );
  assert.match(prompt, /Use @Image1 as a visual reference/);
  assert.match(prompt, /location, environment/);
  assert.match(prompt, /Move the whole fight into the forest/);
  assert.match(prompt, /changes clearly indicated by the user instruction and references/);
  assert.doesNotMatch(prompt, /replacement character/);
  assert.doesNotMatch(
    prompt,
    /Do not copy the original replaced subject identity/
  );
  assert.doesNotMatch(prompt, /Preserve the original environment/);
  assert.doesNotMatch(prompt, /Rebuild only/);
});

test('motion transfer supports character plus location references', () => {
  const prompt = buildSeedanceWorkflowPrompt({
    mode: 'motion-transfer',
    userPrompt:
      'Use Reference 1 for the fighter and Reference 2 for the location',
    imageCount: 2,
  });

  assert.match(prompt, /Reference 1 = @Image1/);
  assert.match(prompt, /Reference 2 = @Image2/);
  assert.match(
    prompt,
    /characters, products, wardrobe, props, locations, environments/
  );
  assert.match(
    prompt,
    /Preserve the motion, timing, camera movement, framing, and shot progression/
  );
  assert.match(prompt, /Use Reference 1 for the fighter/);
});

test('motion transfer multi-reference prompt allows multiple views of one element', () => {
  const prompt = buildSeedanceWorkflowPrompt({
    mode: 'motion-transfer',
    userPrompt:
      'Use References 1, 2, and 3 as different views of the same squirrel',
    imageCount: 3,
  });

  assert.match(prompt, /Reference 3 = @Image3/);
  assert.match(prompt, /multiple views of the same element/);
  assert.doesNotMatch(
    prompt,
    /Do not assume they are alternate views of the same subject/
  );
});

test('motion transfer without a prompt stays conservative and role-neutral', () => {
  const prompt = buildSeedanceWorkflowPrompt({
    mode: 'motion-transfer',
    imageCount: 1,
  });

  assert.match(prompt, /If a clear visual correspondence exists/);
  assert.match(prompt, /Otherwise preserve the source appearance/);
  assert.match(prompt, /preserving the motion, camera, timing, framing/);
  assert.doesNotMatch(prompt, /primary appearance transformation/);
  assert.doesNotMatch(prompt, /replacement character/);
  assert.doesNotMatch(prompt, /Rebuild only/);
});

test('custom provider reference tokens are preserved', () => {
  const prompt = buildSeedanceWorkflowPrompt({
    mode: 'objects-swap',
    userPrompt: 'Replace the bottle',
    imageCount: 2,
    references: {
      video: '<video_ref_1>',
      images: ['<image_ref_1>', '<image_ref_2>'],
    },
  });

  assert.match(prompt, /Edit <video_ref_1>/);
  assert.match(prompt, /Reference 1 = <image_ref_1>/);
  assert.match(prompt, /Reference 2 = <image_ref_2>/);
  assert.doesNotMatch(prompt, /@Video1/);
});
