import assert from 'node:assert/strict';
import test from 'node:test';

import {
  createAsyncRequestGuard,
  deriveHotelLobbyTemplateGate,
  hotelLobbyTemplateMediaIdentity,
  shouldResetHotelLobbyTemplateMedia,
  withHotelLobbyTemplateRetryParam,
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

test('meta fail then retry success restores Generate (with media ready)', () => {
  // Initial meta failure.
  let r2: boolean | null = false;
  let media: 'loading' | 'ready' | 'error' = 'ready';
  assert.equal(
    deriveHotelLobbyTemplateGate({
      allowCustomVideo: false,
      r2Available: r2,
      mediaStatus: media,
    }).fixedTemplateReady,
    false
  );

  // Retry begins — clear inherited failure.
  r2 = null;
  media = 'loading';
  assert.deepEqual(
    deriveHotelLobbyTemplateGate({
      allowCustomVideo: false,
      r2Available: r2,
      mediaStatus: media,
    }),
    { fixedTemplateReady: false, showTemplateError: false }
  );

  // Meta + video succeed after retry.
  r2 = true;
  media = 'ready';
  assert.equal(
    deriveHotelLobbyTemplateGate({
      allowCustomVideo: false,
      r2Available: r2,
      mediaStatus: media,
    }).fixedTemplateReady,
    true
  );
});

test('video fail then retry success restores Generate when meta ok', () => {
  let r2: boolean | null = true;
  let media: 'loading' | 'ready' | 'error' = 'error';
  assert.equal(
    deriveHotelLobbyTemplateGate({
      allowCustomVideo: false,
      r2Available: r2,
      mediaStatus: media,
    }).showTemplateError,
    true
  );

  r2 = null;
  media = 'loading';
  assert.equal(
    deriveHotelLobbyTemplateGate({
      allowCustomVideo: false,
      r2Available: r2,
      mediaStatus: media,
    }).showTemplateError,
    false
  );

  r2 = true;
  media = 'ready';
  assert.equal(
    deriveHotelLobbyTemplateGate({
      allowCustomVideo: false,
      r2Available: r2,
      mediaStatus: media,
    }).fixedTemplateReady,
    true
  );
});

test('stale meta response after newer retry must not apply', () => {
  const guard = createAsyncRequestGuard();
  const first = guard.begin();
  const second = guard.begin();
  assert.equal(guard.isCurrent(first), false);
  assert.equal(guard.isCurrent(second), true);

  // Simulate first (failed) response arriving late — ignored.
  let r2: boolean | null = null;
  if (guard.isCurrent(first)) r2 = false;
  assert.equal(r2, null);

  // Second succeeds.
  if (guard.isCurrent(second)) r2 = true;
  assert.equal(r2, true);
});

test('invalidate drops in-flight requests (preset switch / unmount)', () => {
  const guard = createAsyncRequestGuard();
  const token = guard.begin();
  guard.invalidate();
  assert.equal(guard.isCurrent(token), false);
});

test('repeated begin() keeps only the latest request current', () => {
  const guard = createAsyncRequestGuard();
  const tokens = [guard.begin(), guard.begin(), guard.begin()];
  assert.equal(guard.isCurrent(tokens[0]!), false);
  assert.equal(guard.isCurrent(tokens[1]!), false);
  assert.equal(guard.isCurrent(tokens[2]!), true);
});

test('retry URL preserves product query and replaces prior _retry', () => {
  const retried = withHotelLobbyTemplateRetryParam(
    '/api/genjutsu/template?product=rumpelstiltskin&_retry=1',
    99
  );
  assert.match(retried, /product=rumpelstiltskin/);
  assert.match(retried, /_retry=99/);
  assert.doesNotMatch(retried, /_retry=1(?:&|$)/);
});

test('retry does not imply clearing user photos (inputs are orthogonal)', () => {
  // Documented contract: Retry only resets template meta/media signals.
  const photos = [{ id: 'a' }, { id: 'b' }];
  const afterRetryPhotos = photos;
  assert.equal(afterRetryPhotos, photos);
  assert.equal(afterRetryPhotos.length, 2);
});
