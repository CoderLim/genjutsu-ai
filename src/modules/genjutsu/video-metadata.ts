const HEAD_BYTES = 2 * 1024 * 1024;
const TAIL_BYTES = 4 * 1024 * 1024;
const MAX_SEEDANCE_SOURCE_SECONDS = 30.2;
const MIN_SEEDANCE_SOURCE_SECONDS = 1.8;

function readUint32(bytes: Uint8Array, offset: number) {
  if (offset < 0 || offset + 4 > bytes.byteLength) return null;
  return (
    bytes[offset] * 0x1000000 +
    bytes[offset + 1] * 0x10000 +
    bytes[offset + 2] * 0x100 +
    bytes[offset + 3]
  );
}

function readUint64(bytes: Uint8Array, offset: number) {
  const high = readUint32(bytes, offset);
  const low = readUint32(bytes, offset + 4);
  if (high == null || low == null) return null;
  const value = high * 0x100000000 + low;
  return Number.isSafeInteger(value) ? value : null;
}

function isMvhd(bytes: Uint8Array, offset: number) {
  return (
    bytes[offset] === 0x6d &&
    bytes[offset + 1] === 0x76 &&
    bytes[offset + 2] === 0x68 &&
    bytes[offset + 3] === 0x64
  );
}

export function parseIsoBmffDurationSeconds(bytes: Uint8Array) {
  for (let typeOffset = 4; typeOffset + 24 < bytes.byteLength; typeOffset += 1) {
    if (!isMvhd(bytes, typeOffset)) continue;

    const declaredSize = readUint32(bytes, typeOffset - 4);
    if (declaredSize == null || declaredSize < 24) continue;

    const payload = typeOffset + 4;
    const version = bytes[payload];

    let timescale: number | null;
    let duration: number | null;

    if (version === 0) {
      timescale = readUint32(bytes, payload + 12);
      duration = readUint32(bytes, payload + 16);
    } else if (version === 1) {
      timescale = readUint32(bytes, payload + 20);
      duration = readUint64(bytes, payload + 24);
    } else {
      continue;
    }

    if (
      timescale == null ||
      duration == null ||
      timescale <= 0 ||
      duration <= 0
    ) {
      continue;
    }

    const seconds = duration / timescale;
    if (Number.isFinite(seconds) && seconds > 0) return seconds;
  }

  return null;
}

function parseTotalBytes(contentRange: string | null) {
  if (!contentRange) return null;
  const match = /\/(\d+)$/.exec(contentRange);
  if (!match) return null;
  const total = Number(match[1]);
  return Number.isSafeInteger(total) && total > 0 ? total : null;
}

async function fetchRange(url: string, range: string) {
  const response = await fetch(url, {
    headers: { Range: range },
  });

  if (response.status !== 206) {
    response.body?.cancel().catch(() => undefined);
    throw new Error(
      'Source-video storage must support byte-range reads for server-side duration validation'
    );
  }

  return {
    bytes: new Uint8Array(await response.arrayBuffer()),
    totalBytes: parseTotalBytes(response.headers.get('content-range')),
  };
}

export async function probeSeedanceSourceDurationSeconds(videoUrl: string) {
  const first = await fetchRange(videoUrl, `bytes=0-${HEAD_BYTES - 1}`);
  let seconds = parseIsoBmffDurationSeconds(first.bytes);

  if (seconds == null && first.totalBytes && first.totalBytes > HEAD_BYTES) {
    const start = Math.max(0, first.totalBytes - TAIL_BYTES);
    const tail = await fetchRange(videoUrl, `bytes=${start}-`);
    seconds = parseIsoBmffDurationSeconds(tail.bytes);
  }

  if (seconds == null) {
    throw new Error(
      'Could not read the source video duration. Seedance currently requires MP4 or MOV input with readable metadata.'
    );
  }

  if (
    seconds < MIN_SEEDANCE_SOURCE_SECONDS ||
    seconds > MAX_SEEDANCE_SOURCE_SECONDS
  ) {
    throw new Error(
      `Seedance source video must be between ${MIN_SEEDANCE_SOURCE_SECONDS} and ${MAX_SEEDANCE_SOURCE_SECONDS} seconds`
    );
  }

  return seconds;
}
