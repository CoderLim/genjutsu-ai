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

test('motion transfer prompt assigns video motion and image appearance roles', () => {
  const prompt = buildSeedanceWorkflowPrompt({
    mode: 'motion-transfer',
    userPrompt: 'Make the scene cinematic',
    imageCount: 2,
  });

  assert.match(prompt, /@Video1/);
  assert.match(prompt, /@Image1/);
  assert.match(prompt, /@Image2/);
  assert.match(prompt, /motion, timing/);
  assert.match(prompt, /Make the scene cinematic/);
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
