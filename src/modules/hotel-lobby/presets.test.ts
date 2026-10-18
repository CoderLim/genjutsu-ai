import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildBulin47Prompt,
  buildCrazyFrogPrompt,
  buildRumpelstiltskinPrompt,
  BULIN_47_PRESET_ID,
  CRAZY_FROG_PRESET_ID,
  getHotelLobbyPresetPublicMeta,
  HOTEL_LOBBY_PRESET_ID,
  isHotelLobbyPresetId,
  normalizeStoredPresetId,
  resolveHotelLobbyPreset,
  RUMPELSTILTSKIN_PRESET_ID,
} from './presets';
import { HotelLobbyPreflightError } from './prompt';

test('missing presetId resolves to hotel-lobby', () => {
  const preset = resolveHotelLobbyPreset(undefined);
  assert.equal(preset.id, HOTEL_LOBBY_PRESET_ID);
  assert.equal(preset.keepAudio, true);
  assert.equal(preset.aspectRatio, '16:9');
  assert.equal(preset.allowCustomVideo, true);
});

test('crazy-frog preset is fixed template, two images, keep audio', () => {
  const preset = resolveHotelLobbyPreset(CRAZY_FROG_PRESET_ID, {
    requireEnabled: false,
  });
  assert.equal(preset.id, CRAZY_FROG_PRESET_ID);
  assert.equal(preset.imageCount.min, 2);
  assert.equal(preset.imageCount.max, 2);
  assert.equal(preset.allowCustomVideo, false);
  assert.equal(preset.allowTrim, false);
  assert.equal(preset.keepAudio, true);
  assert.equal(preset.aspectRatio, '4:3');
  assert.equal(preset.enabled, false);
  assert.match(preset.templateVideoKey, /^hotel-lobby\/templates\//);
  assert.equal(preset.localTemplatePath, 'public/videos/crazy-frog-tpl.mp4');
  assert.equal(preset.downloadPrefix, 'crazy-frog');
});

test('rumpelstiltskin preset is fixed template, one image', () => {
  const preset = resolveHotelLobbyPreset(RUMPELSTILTSKIN_PRESET_ID);
  assert.equal(preset.id, RUMPELSTILTSKIN_PRESET_ID);
  assert.equal(preset.imageCount.min, 1);
  assert.equal(preset.imageCount.max, 1);
  assert.equal(preset.allowCustomVideo, false);
  assert.equal(preset.allowTrim, false);
  assert.equal(preset.keepAudio, true);
  assert.equal(preset.aspectRatio, '16:9');
  assert.equal(
    preset.previewUrl,
    '/api/genjutsu/template?product=rumpelstiltskin'
  );
  assert.equal(preset.downloadPrefix, 'rumpelstiltskin');
  assert.match(preset.templateVideoKey, /rumpelstiltskin-v1\.mp4$/);
});

test('bulin-47 preset is fixed template, one image, portrait', () => {
  const preset = resolveHotelLobbyPreset(BULIN_47_PRESET_ID);
  assert.equal(preset.id, BULIN_47_PRESET_ID);
  assert.equal(preset.imageCount.min, 1);
  assert.equal(preset.imageCount.max, 1);
  assert.equal(preset.allowCustomVideo, false);
  assert.equal(preset.allowTrim, false);
  assert.equal(preset.keepAudio, true);
  assert.equal(preset.aspectRatio, '9:16');
  assert.equal(preset.previewUrl, '/api/genjutsu/template?product=bulin-47');
  assert.equal(preset.downloadPrefix, 'bulin-47');
  assert.match(preset.templateVideoKey, /bulin-47-v1\.mp4$/);
});

test('all hotel-lobby presets keep audio by default', () => {
  for (const id of [
    HOTEL_LOBBY_PRESET_ID,
    CRAZY_FROG_PRESET_ID,
    RUMPELSTILTSKIN_PRESET_ID,
    BULIN_47_PRESET_ID,
  ] as const) {
    assert.equal(
      resolveHotelLobbyPreset(id, { requireEnabled: false }).keepAudio,
      true,
      id
    );
  }
});

test('disabled crazy-frog rejects when requireEnabled (migrated to genjutsu)', () => {
  assert.throws(
    () => resolveHotelLobbyPreset(CRAZY_FROG_PRESET_ID),
    /not available|disabled|Crazy Frog/i
  );
  const preset = resolveHotelLobbyPreset(CRAZY_FROG_PRESET_ID, {
    requireEnabled: false,
  });
  assert.equal(preset.id, CRAZY_FROG_PRESET_ID);
  assert.equal(preset.enabled, false);
});

test('unknown preset rejects', () => {
  assert.throws(
    () => resolveHotelLobbyPreset('not-a-real-preset'),
    HotelLobbyPreflightError
  );
});

test('isHotelLobbyPresetId derives from registry', () => {
  assert.equal(isHotelLobbyPresetId('hotel-lobby'), true);
  assert.equal(isHotelLobbyPresetId('crazy-frog'), true);
  assert.equal(isHotelLobbyPresetId('rumpelstiltskin'), true);
  assert.equal(isHotelLobbyPresetId('bulin-47'), true);
  assert.equal(isHotelLobbyPresetId('zombie-hug'), false);
});

test('crazy frog prompt names both Elements and chase roles', () => {
  const prompt = buildCrazyFrogPrompt(2);
  assert.match(prompt, /@Video1/);
  assert.match(prompt, /@Element1/);
  assert.match(prompt, /@Element2/);
  assert.match(prompt, /Use @Video1 only for/i);
  assert.match(prompt, /foreground/i);
  assert.match(prompt, /chasing|chase|chaser/i);
  assert.match(prompt, /do not keep the original foreground rider/i);
  assert.match(prompt, /do not keep the original chaser/i);
  assert.match(prompt, /Do not swap Element1 and Element2/i);
  assert.throws(() => buildCrazyFrogPrompt(1), HotelLobbyPreflightError);
});

test('rumpelstiltskin prompt is single-Element Kling style', () => {
  const prompt = buildRumpelstiltskinPrompt(1);
  assert.match(prompt, /@Video1/);
  assert.match(prompt, /@Element1/);
  assert.match(prompt, /do not keep the original dancer/i);
  assert.doesNotMatch(prompt, /@Image1/);
  assert.throws(() => buildRumpelstiltskinPrompt(2), HotelLobbyPreflightError);
});

test('bulin-47 prompt is single-Element Kling style', () => {
  const prompt = buildBulin47Prompt(1);
  assert.match(prompt, /@Video1/);
  assert.match(prompt, /@Element1/);
  assert.match(prompt, /do not keep the original performer/i);
  assert.doesNotMatch(prompt, /@Image1/);
  assert.throws(() => buildBulin47Prompt(0), HotelLobbyPreflightError);
});

test('public meta includes UI fields', () => {
  const meta = getHotelLobbyPresetPublicMeta(
    resolveHotelLobbyPreset(BULIN_47_PRESET_ID)
  );
  assert.equal(meta.presetId, BULIN_47_PRESET_ID);
  assert.equal(meta.previewUrl, '/api/genjutsu/template?product=bulin-47');
  assert.equal(meta.posterUrl, '/videos/bulin47-tpl-poster.jpg');
  assert.equal(meta.downloadPrefix, 'bulin-47');
  assert.equal(meta.allowCustomVideo, false);
});

test('normalizeStoredPresetId defaults legacy tasks to hotel-lobby', () => {
  assert.equal(normalizeStoredPresetId(undefined), HOTEL_LOBBY_PRESET_ID);
  assert.equal(normalizeStoredPresetId(null), HOTEL_LOBBY_PRESET_ID);
  assert.equal(
    normalizeStoredPresetId(CRAZY_FROG_PRESET_ID),
    CRAZY_FROG_PRESET_ID
  );
  assert.equal(
    normalizeStoredPresetId(RUMPELSTILTSKIN_PRESET_ID),
    RUMPELSTILTSKIN_PRESET_ID
  );
});
