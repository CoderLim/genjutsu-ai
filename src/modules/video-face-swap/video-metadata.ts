import { parseIsoBmffDurationSeconds } from '@/modules/genjutsu/video-metadata';

import {
  VIDEO_FACE_SWAP_MAX_DURATION_SECONDS,
  VIDEO_FACE_SWAP_MIN_DURATION_SECONDS,
} from './constants';

const HEAD_BYTES = 2 * 1024 * 1024;
const TAIL_BYTES = 4 * 1024 * 1024;
const DURATION_EPSILON_SECONDS = 0.001;

function parseTotalBytes(contentRange: string | null) {
  if (!contentRange) return null;
  const match = /\/(\d+)$/.exec(contentRange);
  if (!match) return null;
  const total = Number(match[1]);
  return Number.isSafeInteger(total) && total > 0 ? total : null;
}

async function fetchRange(url: string, range: string) {
  const parsed = new URL(url);
  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
    throw new Error('Invalid source-video URL protocol');
  }

  const response = await fetch(parsed, {
    headers: { Range: range },
    redirect: 'manual',
  });

  if (response.status >= 300 && response.status < 400) {
    response.body?.cancel().catch(() => undefined);
    throw new Error('Source-video URL redirected unexpectedly');
  }

  if (response.status !== 206) {
    response.body?.cancel().catch(() => undefined);
    throw new Error(
      'Source-video storage must support byte-range reads for duration validation'
    );
  }

  return {
    bytes: new Uint8Array(await response.arrayBuffer()),
    totalBytes: parseTotalBytes(response.headers.get('content-range')),
  };
}

function readEbmlVint(
  bytes: Uint8Array,
  offset: number
): { value: number; length: number } | null {
  if (offset >= bytes.length) return null;
  const first = bytes[offset];
  if (first === 0) return null;

  let length = 1;
  let mask = 0x80;
  while (length <= 8 && (first & mask) === 0) {
    length += 1;
    mask >>= 1;
  }
  if (length > 8 || offset + length > bytes.length) return null;

  let value = first & (mask - 1);
  for (let i = 1; i < length; i += 1) {
    value = value * 256 + bytes[offset + i];
  }
  return { value, length };
}
function readFloat64(bytes: Uint8Array, offset: number) {
  if (offset + 8 > bytes.length) return null;
  return new DataView(bytes.buffer, bytes.byteOffset + offset, 8).getFloat64(
    0,
    false
  );
}
function readFloat32(bytes: Uint8Array, offset: number) {
  if (offset + 4 > bytes.length) return null;
  return new DataView(bytes.buffer, bytes.byteOffset + offset, 4).getFloat32(
    0,
    false
  );
}

function parseWebmDurationSeconds(bytes: Uint8Array) {
  if (bytes.length < 16) return null;
  // EBML magic
  if (
    !(
      bytes[0] === 0x1a &&
      bytes[1] === 0x45 &&
      bytes[2] === 0xdf &&
      bytes[3] === 0xa3
    )
  ) {
    return null;
  }

  let timestampScale = 1_000_000;
  let durationValue: number | null = null;

  for (let offset = 0; offset + 3 < bytes.length; offset += 1) {
    // TimestampScale = 0x2AD7B1
    if (
      bytes[offset] === 0x2a &&
      bytes[offset + 1] === 0xd7 &&
      bytes[offset + 2] === 0xb1
    ) {
      const size = readEbmlVint(bytes, offset + 3);
      if (!size || size.value <= 0 || size.value > 8) continue;
      const dataOffset = offset + 3 + size.length;
      if (dataOffset + size.value > bytes.length) continue;
      let value = 0;
      for (let i = 0; i < size.value; i += 1) {
        value = value * 256 + bytes[dataOffset + i];
      }
      if (value > 0) timestampScale = value;
      continue;
    }

    // Duration = 0x4489
    if (bytes[offset] === 0x44 && bytes[offset + 1] === 0x89) {
      const size = readEbmlVint(bytes, offset + 2);
      if (!size) continue;
      const dataOffset = offset + 2 + size.length;
      if (size.value === 8) {
        durationValue = readFloat64(bytes, dataOffset);
      } else if (size.value === 4) {
        durationValue = readFloat32(bytes, dataOffset);
      }
    }
  }

  if (
    durationValue == null ||
    !Number.isFinite(durationValue) ||
    durationValue <= 0
  ) {
    return null;
  }

  // Duration is in TimestampScale units (nanoseconds when scale is 1e6).
  const seconds = (durationValue * timestampScale) / 1e9;
  if (!Number.isFinite(seconds) || seconds <= 0) return null;
  return seconds;
}

function parseSourceDurationSeconds(bytes: Uint8Array) {
  return parseIsoBmffDurationSeconds(bytes) ?? parseWebmDurationSeconds(bytes);
}

export function normalizeVideoFaceSwapDurationSeconds(seconds: number) {
  if (
    !Number.isFinite(seconds) ||
    seconds < VIDEO_FACE_SWAP_MIN_DURATION_SECONDS - DURATION_EPSILON_SECONDS ||
    seconds > VIDEO_FACE_SWAP_MAX_DURATION_SECONDS + DURATION_EPSILON_SECONDS
  ) {
    throw new Error(
      `Source video must be between ${VIDEO_FACE_SWAP_MIN_DURATION_SECONDS} and ${VIDEO_FACE_SWAP_MAX_DURATION_SECONDS} seconds`
    );
  }
  return Math.min(
    VIDEO_FACE_SWAP_MAX_DURATION_SECONDS,
    Math.max(VIDEO_FACE_SWAP_MIN_DURATION_SECONDS, seconds)
  );
}

/**
 * Probe sealed/staging video duration via signed URL range reads.
 * Rejects when duration cannot be parsed — never trust client seconds for billing.
 */
export async function probeVideoFaceSwapDurationSeconds(signedUrl: string) {
  const head = await fetchRange(signedUrl, `bytes=0-${HEAD_BYTES - 1}`);
  let duration = parseSourceDurationSeconds(head.bytes);
  if (duration == null && head.totalBytes && head.totalBytes > HEAD_BYTES) {
    const start = Math.max(0, head.totalBytes - TAIL_BYTES);
    const tail = await fetchRange(
      signedUrl,
      `bytes=${start}-${head.totalBytes - 1}`
    );
    const merged = new Uint8Array(head.bytes.length + tail.bytes.length);
    merged.set(head.bytes, 0);
    merged.set(tail.bytes, head.bytes.length);
    duration =
      parseSourceDurationSeconds(merged) ??
      parseSourceDurationSeconds(tail.bytes);
  }
  if (duration == null || !Number.isFinite(duration) || duration <= 0) {
    throw new Error(
      'Could not determine source video duration; re-encode as MP4 and try again'
    );
  }
  return normalizeVideoFaceSwapDurationSeconds(duration);
}
