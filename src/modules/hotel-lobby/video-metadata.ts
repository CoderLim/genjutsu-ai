import { parseIsoBmffDurationSeconds } from '@/modules/genjutsu/video-metadata';

const HEAD_BYTES = 2 * 1024 * 1024;
const TAIL_BYTES = 4 * 1024 * 1024;

export const HOTEL_LOBBY_MIN_SOURCE_SECONDS = 5;
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

export function normalizeHotelLobbyDuration(seconds: number) {
  if (
    !Number.isFinite(seconds) ||
    seconds < HOTEL_LOBBY_MIN_SOURCE_SECONDS - 0.1 ||
    seconds > HOTEL_LOBBY_MAX_SOURCE_SECONDS + 0.2
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
