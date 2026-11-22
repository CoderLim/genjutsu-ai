import assert from 'node:assert/strict';
import test from 'node:test';

import { parseGeneratorMp4Duration, parseGeneratorWavDuration } from './media-metadata';

function fakeMvhd(version: 0 | 1, timescale: number, duration: number) {
  const buffer = new ArrayBuffer(128);
  const data = new DataView(buffer);
  const bytes = new Uint8Array(buffer);
  data.setUint32(0, version === 0 ? 108 : 120, false);
  bytes.set([0x6d, 0x76, 0x68, 0x64], 4);
  bytes[8] = version;
  if (version === 0) {
    data.setUint32(20, timescale, false);
    data.setUint32(24, duration, false);
  } else {
    data.setUint32(28, timescale, false);
    data.setBigUint64(32, BigInt(duration), false);
  }
  return bytes;
}

test('parse MP4/MOV v0 duration from mvhd without old Genjutsu code', () => {
  assert.equal(parseGeneratorMp4Duration(fakeMvhd(0, 1000, 14500)), 14.5);
});

test('parse MP4/MOV v1 64-bit duration', () => {
  assert.equal(parseGeneratorMp4Duration(fakeMvhd(1, 1000, 15000)), 15);
});

test('do not accept invalid media without readable duration', () => {
  assert.equal(parseGeneratorMp4Duration(new Uint8Array(1024)), null);
  assert.equal(parseGeneratorMp4Duration(fakeMvhd(0, 0, 9000)), null);
});

test('PCM WAV duration derived from RIFF byte-rate and chunk size', () => {
  const buffer = new ArrayBuffer(48);
  const view = new DataView(buffer);
  const data = new Uint8Array(buffer);
  data.set(new TextEncoder().encode('RIFF'), 0);
  view.setUint32(4, 12345, true);
  data.set(new TextEncoder().encode('WAVEfmt '), 8);
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, 16000, true);
  view.setUint32(28, 32000, true);
  data.set(new TextEncoder().encode('data'), 36);
  view.setUint32(40, 320000, true);
  assert.equal(parseGeneratorWavDuration(data), 10);
  assert.equal(parseGeneratorWavDuration(new Uint8Array(128)), null);
});
