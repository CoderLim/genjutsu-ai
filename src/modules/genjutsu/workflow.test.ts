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

test('motion transfer prompt maps independent multi-reference roles', () => {
  const prompt = buildSeedanceWorkflowPrompt({
    mode: 'motion-transfer',
    userPrompt:
      'Replace the main character with Reference 1 and the jacket with Reference 2',
    imageCount: 2,
  });

  assert.match(prompt, /@Video1/);
  assert.match(prompt, /Reference 1 = @Image1/);
  assert.match(prompt, /Reference 2 = @Image2/);
  assert.match(prompt, /may represent different characters, products/);
  assert.match(prompt, /Do not blend, merge/);
  assert.match(prompt, /motion, timing/);
  assert.match(prompt, /Replace the main character with Reference 1/);
});

test('object swap prompt explicitly preserves unrelated video content', () => {
  const prompt = buildSeedanceWorkflowPrompt({
    mode: 'objects-swap',
    userPrompt: 'Replace the red bottle',
    imageCount: 1,
  });

  assert.match(prompt, /Edit @Video1/);
  assert.match(prompt, /@Image1/);
  assert.match(prompt, /Preserve everything unrelated/);
  assert.match(prompt, /Replace the red bottle/);
});


test('multi-reference object swap keeps references independent', () => {
  const prompt = buildSeedanceWorkflowPrompt({
    mode: 'objects-swap',
    userPrompt:
      'Replace the bottle with Reference 1 and the shirt with Reference 2',
    imageCount: 2,
  });

  assert.match(prompt, /Reference 1 = @Image1/);
  assert.match(prompt, /Reference 2 = @Image2/);
  assert.match(prompt, /each may control a different requested target/);
  assert.match(prompt, /never merge unrelated references|Do not blend, merge/);
  assert.match(prompt, /Preserve everything unrelated/);
});
