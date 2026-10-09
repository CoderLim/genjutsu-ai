import { parseIsoBmffDurationSeconds } from '@/modules/genjutsu/video-metadata';

import {
  HOTEL_LOBBY_MAX_VIDEO_EDGE_PX,
  HOTEL_LOBBY_MIN_VIDEO_EDGE_PX,
} from './pricing';

const HEAD_BYTES = 2 * 1024 * 1024;
const TAIL_BYTES = 4 * 1024 * 1024;

export const HOTEL_LOBBY_MIN_SOURCE_SECONDS = 3;
export const HOTEL_LOBBY_MAX_SOURCE_SECONDS = 15;

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
    throw new Error('Invalid reference-video URL protocol');
  }

  const response = await fetch(parsed, {
    headers: { Range: range },
    redirect: 'manual',
  });

  if (response.status >= 300 && response.status < 400) {
    response.body?.cancel().catch(() => undefined);
    throw new Error('Reference-video URL redirected unexpectedly');
  }

  if (response.status !== 206) {
    response.body?.cancel().catch(() => undefined);
    throw new Error(
      'Reference-video storage must support byte-range reads for duration validation'
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

/**
 * Best-effort WebM/Matroska duration from the Segment Info header.
 * MediaRecorder clips usually include Duration + TimestampScale near the start.
 */
export function parseWebmDurationSeconds(bytes: Uint8Array) {
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

function parseReferenceDurationSeconds(bytes: Uint8Array) {
  return parseIsoBmffDurationSeconds(bytes) ?? parseWebmDurationSeconds(bytes);
}

export {
  HOTEL_LOBBY_MAX_VIDEO_EDGE_PX,
  HOTEL_LOBBY_MIN_VIDEO_EDGE_PX,
} from './pricing';

/** Tiny float tolerance only — not a product slack window. */
const DURATION_EPSILON_SECONDS = 0.001;

function readUint16(bytes: Uint8Array, offset: number) {
  if (offset < 0 || offset + 2 > bytes.byteLength) return null;
  return bytes[offset] * 0x100 + bytes[offset + 1];
}

function readUint32(bytes: Uint8Array, offset: number) {
  if (offset < 0 || offset + 4 > bytes.byteLength) return null;
  return (
    bytes[offset] * 0x1000000 +
    bytes[offset + 1] * 0x10000 +
    bytes[offset + 2] * 0x100 +
    bytes[offset + 3]
  );
}

function isFourCc(bytes: Uint8Array, offset: number, tag: string) {
  return (
    offset + 4 <= bytes.byteLength &&
    bytes[offset] === tag.charCodeAt(0) &&
    bytes[offset + 1] === tag.charCodeAt(1) &&
    bytes[offset + 2] === tag.charCodeAt(2) &&
    bytes[offset + 3] === tag.charCodeAt(3)
  );
}

/**
 * Best-effort MP4/MOV display size from tkhd (16.16) or visual sample entries.
 * Returns null when metadata is missing (e.g. WebM).
 */
export function parseIsoBmffVideoDimensions(bytes: Uint8Array): {
  width: number;
  height: number;
} | null {
  let best: { width: number; height: number } | null = null;

  const consider = (width: number, height: number) => {
    if (
      !Number.isFinite(width) ||
      !Number.isFinite(height) ||
      width < 16 ||
      height < 16
    ) {
      return;
    }
    const w = Math.round(width);
    const h = Math.round(height);
    if (!best || w * h > best.width * best.height) {
      best = { width: w, height: h };
    }
  };

  for (let typeOffset = 4; typeOffset + 8 < bytes.byteLength; typeOffset += 1) {
    if (isFourCc(bytes, typeOffset, 'tkhd')) {
      const version = bytes[typeOffset + 4];
      const whOffset =
        version === 0 ? typeOffset + 80 : version === 1 ? typeOffset + 92 : -1;
      if (whOffset < 0 || whOffset + 8 > bytes.byteLength) continue;
      const widthFixed = readUint32(bytes, whOffset);
      const heightFixed = readUint32(bytes, whOffset + 4);
      if (widthFixed == null || heightFixed == null) continue;
      consider(widthFixed / 65536, heightFixed / 65536);
      continue;
    }

    if (
      isFourCc(bytes, typeOffset, 'avc1') ||
      isFourCc(bytes, typeOffset, 'avc3') ||
      isFourCc(bytes, typeOffset, 'hvc1') ||
      isFourCc(bytes, typeOffset, 'hev1') ||
      isFourCc(bytes, typeOffset, 'vp09') ||
      isFourCc(bytes, typeOffset, 'av01') ||
      isFourCc(bytes, typeOffset, 'mp4v')
    ) {
      // VisualSampleEntry width/height are uint16 after SampleEntry(8) +
      // pre_defined/reserved/pre_defined[3](16), measured from the type fourcc.
      const width = readUint16(bytes, typeOffset + 28);
      const height = readUint16(bytes, typeOffset + 30);
      if (width != null && height != null) consider(width, height);
    }
  }

  return best;
}

export function assertHotelLobbyVideoDimensions(input: {
  width: number;
  height: number;
}) {
  const { width, height } = input;
  if (
    !Number.isFinite(width) ||
    !Number.isFinite(height) ||
    width < HOTEL_LOBBY_MIN_VIDEO_EDGE_PX ||
    height < HOTEL_LOBBY_MIN_VIDEO_EDGE_PX ||
    width > HOTEL_LOBBY_MAX_VIDEO_EDGE_PX ||
    height > HOTEL_LOBBY_MAX_VIDEO_EDGE_PX
  ) {
    throw new Error(
      `Reference video must be between ${HOTEL_LOBBY_MIN_VIDEO_EDGE_PX}×${HOTEL_LOBBY_MIN_VIDEO_EDGE_PX} and ${HOTEL_LOBBY_MAX_VIDEO_EDGE_PX}×${HOTEL_LOBBY_MAX_VIDEO_EDGE_PX} pixels (got ${Math.round(width)}×${Math.round(height)})`
    );
  }
}

export function normalizeHotelLobbyDuration(seconds: number) {
  if (
    !Number.isFinite(seconds) ||
    seconds < HOTEL_LOBBY_MIN_SOURCE_SECONDS - DURATION_EPSILON_SECONDS ||
    seconds > HOTEL_LOBBY_MAX_SOURCE_SECONDS + DURATION_EPSILON_SECONDS
  ) {
    throw new Error(
      `Reference video must be between ${HOTEL_LOBBY_MIN_SOURCE_SECONDS} and ${HOTEL_LOBBY_MAX_SOURCE_SECONDS} seconds`
    );
  }

  return Math.min(
    HOTEL_LOBBY_MAX_SOURCE_SECONDS,
    Math.max(HOTEL_LOBBY_MIN_SOURCE_SECONDS, Math.round(seconds))
  );
}

export async function probeHotelLobbyDurationSecondsRaw(
  videoUrl: string,
  options?: { fallbackSeconds?: number }
) {
  const first = await fetchRange(videoUrl, `bytes=0-${HEAD_BYTES - 1}`);
  let seconds = parseReferenceDurationSeconds(first.bytes);

  if (seconds == null && first.totalBytes && first.totalBytes > HEAD_BYTES) {
    const start = Math.max(0, first.totalBytes - TAIL_BYTES);
    const tail = await fetchRange(videoUrl, `bytes=${start}-`);
    seconds = parseReferenceDurationSeconds(tail.bytes);
  }

  if (seconds == null || !Number.isFinite(seconds) || seconds <= 0) {
    if (
      typeof options?.fallbackSeconds === 'number' &&
      Number.isFinite(options.fallbackSeconds) &&
      options.fallbackSeconds > 0
    ) {
      return options.fallbackSeconds;
    }
    throw new Error(
      'Could not read the reference video duration. Use an MP4, MOV, or WebM with readable metadata.'
    );
  }

  return seconds;
}

export async function probeHotelLobbyDurationSeconds(
  videoUrl: string,
  options?: { fallbackSeconds?: number }
) {
  return normalizeHotelLobbyDuration(
    await probeHotelLobbyDurationSecondsRaw(videoUrl, options)
  );
}

export async function probeHotelLobbyVideoDimensions(videoUrl: string) {
  const first = await fetchRange(videoUrl, `bytes=0-${HEAD_BYTES - 1}`);
  let dims = parseIsoBmffVideoDimensions(first.bytes);

  if (!dims && first.totalBytes && first.totalBytes > HEAD_BYTES) {
    const start = Math.max(0, first.totalBytes - TAIL_BYTES);
    const tail = await fetchRange(videoUrl, `bytes=${start}-`);
    dims = parseIsoBmffVideoDimensions(tail.bytes);
  }

  if (!dims) {
    throw new Error(
      'Could not read the reference video resolution. Use an MP4 or MOV with readable metadata.'
    );
  }

  assertHotelLobbyVideoDimensions(dims);
  return dims;
}
