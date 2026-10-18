import assert from 'node:assert/strict';
import test from 'node:test';

import {
  deriveHotelLobbyTemplateGate,
  hotelLobbyTemplateMediaIdentity,
  shouldResetHotelLobbyTemplateMedia,
} from './template-gate';

test('video ready then meta success → fixed template ready (no wipe)', () => {
  // Media finished first while meta still in flight.
  assert.deepEqual(
    deriveHotelLobbyTemplateGate({
      allowCustomVideo: false,
      r2Available: null,
      mediaStatus: 'ready',
    }),
    { fixedTemplateReady: false, showTemplateError: false }
  );

  // Meta arrives with R2 ok — must become ready without needing another
  // loadedmetadata (same URL).
  assert.deepEqual(
    deriveHotelLobbyTemplateGate({
      allowCustomVideo: false,
      r2Available: true,
      mediaStatus: 'ready',
    }),
    { fixedTemplateReady: true, showTemplateError: false }
  );
});

test('meta success then video ready → fixed template ready', () => {
  assert.deepEqual(
    deriveHotelLobbyTemplateGate({
      allowCustomVideo: false,
      r2Available: true,
      mediaStatus: 'loading',
    }),
    { fixedTemplateReady: false, showTemplateError: false }
  );

  assert.deepEqual(
    deriveHotelLobbyTemplateGate({
      allowCustomVideo: false,
      r2Available: true,
      mediaStatus: 'ready',
    }),
    { fixedTemplateReady: true, showTemplateError: false }
  );
});

test('meta ok but video error → blocked with error UI', () => {
  assert.deepEqual(
    deriveHotelLobbyTemplateGate({
      allowCustomVideo: false,
      r2Available: true,
      mediaStatus: 'error',
    }),
    { fixedTemplateReady: false, showTemplateError: true }
  );
});

test('meta fail but video ready → blocked with error UI', () => {
  assert.deepEqual(
    deriveHotelLobbyTemplateGate({
      allowCustomVideo: false,
      r2Available: false,
      mediaStatus: 'ready',
    }),
    { fixedTemplateReady: false, showTemplateError: true }
  );
});

test('custom-video preset is never blocked by default template failure', () => {
  assert.deepEqual(
    deriveHotelLobbyTemplateGate({
      allowCustomVideo: true,
      r2Available: false,
      mediaStatus: 'error',
    }),
    { fixedTemplateReady: true, showTemplateError: false }
  );
});

test('Preview and Full share the same fixedTemplateReady gate', () => {
  const blocked = deriveHotelLobbyTemplateGate({
    allowCustomVideo: false,
    r2Available: true,
    mediaStatus: 'error',
  });
  const canPreview = blocked.fixedTemplateReady;
  const canGenerateFull = canPreview;
  assert.equal(canPreview, false);
  assert.equal(canGenerateFull, false);

  const ok = deriveHotelLobbyTemplateGate({
    allowCustomVideo: false,
    r2Available: true,
    mediaStatus: 'ready',
  });
  assert.equal(ok.fixedTemplateReady, true);
  assert.equal(ok.fixedTemplateReady, ok.fixedTemplateReady);
});

test('same preview URL after meta must not reset media identity', () => {
  const identity = hotelLobbyTemplateMediaIdentity(
    'rumpelstiltskin',
    '/api/genjutsu/template?product=rumpelstiltskin'
  );
  assert.equal(
    shouldResetHotelLobbyTemplateMedia({
      previousIdentity: identity,
      nextIdentity: identity,
    }),
    false
  );
});

test('preset or URL change resets media identity', () => {
  const a = hotelLobbyTemplateMediaIdentity(
    'hotel-lobby',
    '/api/genjutsu/template?product=hotel-lobby'
  );
  const b = hotelLobbyTemplateMediaIdentity(
    'bulin-47',
    '/api/genjutsu/template?product=bulin-47'
  );
  assert.equal(
    shouldResetHotelLobbyTemplateMedia({
      previousIdentity: a,
      nextIdentity: b,
    }),
    true
  );
  assert.equal(
    shouldResetHotelLobbyTemplateMedia({
      previousIdentity: a,
      nextIdentity: hotelLobbyTemplateMediaIdentity(
        'hotel-lobby',
        '/api/genjutsu/template?product=hotel-lobby&_retry=1'
      ),
    }),
    true
  );
});
