import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  DAY_OF_THE_DEAD_PRESET_ID,
  JATAYU_PRESET_ID,
  resolveImageToVideoPreset,
  resolveImageToVideoPrompt,
  resolveImageToVideoVariant,
} from './presets';
import {
  DAY_OF_THE_DEAD_PERSON_PROMPT,
  DAY_OF_THE_DEAD_PET_PROMPT,
  JATAYU_EXPANDED_PROMPT,
} from './prompts';

test('day-of-the-dead person and pet prompts are locked and distinct', () => {
  const preset = resolveImageToVideoPreset(DAY_OF_THE_DEAD_PRESET_ID);
  assert.equal(preset.promptFor('person'), DAY_OF_THE_DEAD_PERSON_PROMPT);
  assert.equal(preset.promptFor('pet'), DAY_OF_THE_DEAD_PET_PROMPT);
  assert.notEqual(preset.promptFor('person'), preset.promptFor('pet'));
  assert.match(preset.promptFor('person'), /same person/);
  assert.match(preset.promptFor('pet'), /same animal/);
  assert.doesNotMatch(preset.promptFor('pet'), /Catrina costume/);
});

test('variant defaults to person', () => {
  const preset = resolveImageToVideoPreset(DAY_OF_THE_DEAD_PRESET_ID);
  assert.equal(resolveImageToVideoVariant(preset, undefined), 'person');
});

test('day-of-the-dead defaults to landscape 16:9', () => {
  const preset = resolveImageToVideoPreset(DAY_OF_THE_DEAD_PRESET_ID);
  assert.equal(preset.defaultAspectRatio, '16:9');
});

test('jatayu preset is 9:16 with editable prompt', () => {
  const preset = resolveImageToVideoPreset(JATAYU_PRESET_ID);
  assert.equal(preset.defaultAspectRatio, '9:16');
  assert.equal(preset.allowCustomPrompt, true);
  assert.equal(preset.promptFor('person'), JATAYU_EXPANDED_PROMPT);
  assert.deepEqual([...preset.variants], ['person']);
});

test('custom prompt allowed only on jatayu', () => {
  const locked = resolveImageToVideoPreset(DAY_OF_THE_DEAD_PRESET_ID);
  assert.equal(
    resolveImageToVideoPrompt(locked, 'person', 'x'.repeat(40)),
    DAY_OF_THE_DEAD_PERSON_PROMPT
  );

  const jatayu = resolveImageToVideoPreset(JATAYU_PRESET_ID);
  const custom = `${'A cinematic eagle scene. '.repeat(3)}Keep identity.`;
  assert.equal(resolveImageToVideoPrompt(jatayu, 'person', custom), custom);
  assert.equal(
    resolveImageToVideoPrompt(jatayu, 'person', '   '),
    JATAYU_EXPANDED_PROMPT
  );
});
