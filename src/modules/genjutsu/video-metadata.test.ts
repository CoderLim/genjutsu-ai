import assert from 'node:assert/strict';
import test from 'node:test';

import { parseIsoBmffDurationSeconds } from './video-metadata';

function mvhdV0(timescale: number, duration: number) {
  const bytes = new Uint8Array(32);
  const view = new DataView(bytes.buffer);

  // 32-byte mvhd box.
  view.setUint32(0, 32);
  bytes.set([0x6d, 0x76, 0x68, 0x64], 4); // mvhd
  bytes[8] = 0; // version
  // flags + creation/modification stay zero.
  view.setUint32(20, timescale);
  view.setUint32(24, duration);
  return bytes;
}

test('parses ISO BMFF mvhd v0 duration', () => {
  const bytes = mvhdV0(1000, 12_500);
  assert.equal(parseIsoBmffDurationSeconds(bytes), 12.5);
});

test('finds mvhd inside a larger byte range', () => {
  const box = mvhdV0(24_000, 48_000);
  const bytes = new Uint8Array(128);
  bytes.set(box, 41);
  assert.equal(parseIsoBmffDurationSeconds(bytes), 2);
});

test('returns null when mvhd metadata is absent', () => {
  assert.equal(parseIsoBmffDurationSeconds(new Uint8Array(64)), null);
});
