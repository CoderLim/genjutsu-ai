import assert from 'node:assert/strict';
import test from 'node:test';

import { buildHotelLobbyPrompt } from './service';

test('two-image prompt names both Elements and insists on right-side swap', () => {
  const prompt = buildHotelLobbyPrompt(2);
  assert.match(prompt, /@Video1/);
  assert.match(prompt, /@Element1/);
  assert.match(prompt, /@Element2/);
  assert.match(prompt, /left performer/i);
  assert.match(prompt, /right performer/i);
  assert.match(prompt, /do not keep the original right performer/i);
});

test('one-image prompt references @Element1 only', () => {
  const prompt = buildHotelLobbyPrompt(1);
  assert.match(prompt, /@Element1/);
  assert.doesNotMatch(prompt, /@Element2/);
});
