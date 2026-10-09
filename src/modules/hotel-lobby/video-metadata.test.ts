import assert from 'node:assert/strict';
import test from 'node:test';

import {
  assertHotelLobbyVideoDimensions,
  normalizeH3LabDuration,
  normalizeHotelLobbyDuration,
  parseIsoBmffVideoDimensions,
} from './video-metadata';

function tkhdV0(width: number, height: number) {
  // Minimal synthetic region: size(4)+'tkhd' at offset 0 with v0 layout.
  const bytes = new Uint8Array(96);
  const view = new DataView(bytes.buffer);
  view.setUint32(0, 92); // declared box size
  bytes.set([0x74, 0x6b, 0x68, 0x64], 4); // tkhd
  bytes[8] = 0; // version
  // width/height at typeOffset(4)+80 = 84
  view.setUint32(84, Math.round(width * 65536));
  view.setUint32(88, Math.round(height * 65536));
  return bytes;
}

/** Mimics `ftyp` brands `isomiso2avc1mp41` then a real tkhd — the brand embeds `avc1`. */
function ftypBrandAvc1ThenTkhd(width: number, height: number) {
  const ftyp = new Uint8Array([
    0x00,
    0x00,
    0x00,
    0x20,
    0x66,
    0x74,
    0x79,
    0x70, // size=32, ftyp
    0x69,
    0x73,
    0x6f,
    0x6d,
    0x00,
    0x00,
    0x02,
    0x00, // isom + minor
    0x69,
    0x73,
    0x6f,
    0x6d,
    0x69,
    0x73,
    0x6f,
    0x32, // isom iso2
    0x61,
    0x76,
    0x63,
    0x31,
    0x6d,
    0x70,
    0x34,
    0x31, // avc1 mp41 (brands)
  ]);
  const tkhd = tkhdV0(width, height);
  const bytes = new Uint8Array(ftyp.length + tkhd.length);
  bytes.set(ftyp, 0);
  bytes.set(tkhd, ftyp.length);
  return bytes;
}

test('parses tkhd v0 display dimensions', () => {
  const dims = parseIsoBmffVideoDimensions(tkhdV0(1280, 720));
  assert.deepEqual(dims, { width: 1280, height: 720 });
});

test('ignores ftyp compatible-brand avc1 false positive', () => {
  const dims = parseIsoBmffVideoDimensions(ftypBrandAvc1ThenTkhd(2868, 1320));
  assert.deepEqual(dims, { width: 2868, height: 1320 });
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
