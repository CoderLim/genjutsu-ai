import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildJatayuGeneratorPrompt,
  JATAYU_EXPANDED_PROMPT,
} from './jatayu-video-prompt-content';

test('default generator keeps birds, adds lightning, stays 9:16', () => {
  const prompt = buildJatayuGeneratorPrompt({
    format: '9:16',
    distantBirds: true,
    lightning: true,
  });
  assert.match(prompt, /vertical 9:16/);
  assert.match(prompt, /A small flock of distant birds crosses the horizon/);
  assert.match(prompt, /subtle lightning in the sky/);
  assert.match(prompt, /exact identity reference/);
});

test('generator can drop birds and switch to 1:1 without lightning', () => {
  const prompt = buildJatayuGeneratorPrompt({
    format: '1:1',
    distantBirds: false,
    lightning: false,
  });
  assert.match(prompt, /square 1:1/);
  assert.doesNotMatch(
    prompt,
    /A small flock of distant birds crosses the horizon/
  );
  assert.doesNotMatch(prompt, /subtle lightning/);
});

test('expanded prompt starts as vertical clip reference', () => {
  assert.ok(JATAYU_EXPANDED_PROMPT.startsWith('A vertical 9:16'));
  assert.match(JATAYU_EXPANDED_PROMPT, /uploaded clip/);
});
