import assert from 'node:assert/strict';
import test from 'node:test';

import {
  assertHotelLobbyVideoDimensions,
  normalizeH3LabDuration,
  normalizeHotelLobbyDuration,
  parseIsoBmffVideoDimensions,
} from './video-metadata';

function tkhdV0(width: number, height: number) {
  // Minimal synthetic region: 'tkhd' at offset 4 with v0 layout ending in 16.16 size.
  const bytes = new Uint8Array(96);
  bytes.set([0x74, 0x6b, 0x68, 0x64], 4); // tkhd
  bytes[8] = 0; // version
  const view = new DataView(bytes.buffer);
  // width/height at typeOffset(4)+80 = 84
  view.setUint32(84, Math.round(width * 65536));
  view.setUint32(88, Math.round(height * 65536));
  return bytes;
}

test('parses tkhd v0 display dimensions', () => {
  const dims = parseIsoBmffVideoDimensions(tkhdV0(1280, 720));
  assert.deepEqual(dims, { width: 1280, height: 720 });
});

test('Kling pixel bounds reject sub-720 edges', () => {
  assert.throws(() =>
    assertHotelLobbyVideoDimensions({ width: 640, height: 720 })
  );
  assert.doesNotThrow(() =>
    assertHotelLobbyVideoDimensions({ width: 1280, height: 720 })
  );
});

test('duration accepts exact 3–15s and rejects 2.9 / 15.2', () => {
  assert.equal(normalizeHotelLobbyDuration(3), 3);
  assert.equal(normalizeHotelLobbyDuration(15), 15);
  assert.equal(normalizeHotelLobbyDuration(3.4), 3);
  assert.throws(() => normalizeHotelLobbyDuration(2.9));
  assert.throws(() => normalizeHotelLobbyDuration(15.2));
});

test('H3 Lab duration rejects sub-5s raw clips (no Kling round-up)', () => {
  assert.throws(() => normalizeH3LabDuration(4.6));
  assert.equal(normalizeH3LabDuration(5), 5);
  assert.equal(normalizeH3LabDuration(5.4), 5);
});
