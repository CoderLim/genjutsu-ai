/**
 * Standalone MP4/MOV duration probe for the new generator.
 * No dependencies on legacy Genjutsu/video-to-video code.
 */
const HEAD_BYTES = 2 * 1024 * 1024;
const TAIL_BYTES = 4 * 1024 * 1024;

function readU32(data: Uint8Array, pos: number): number | null {
  if (pos < 0 || pos + 4 > data.length) return null;
  return data[pos] * 0x1000000 + data[pos + 1] * 0x10000 +
    data[pos + 2] * 0x100 + data[pos + 3];
}

function readU64(data: Uint8Array, pos: number): number | null {
  const hi = readU32(data, pos);
  const lo = readU32(data, pos + 4);
  if (hi === null || lo === null) return null;
  const number = hi * 0x100000000 + lo;
  return Number.isSafeInteger(number) ? number : null;
}

export function parseGeneratorMp4Duration(bytes: Uint8Array): number | null {
  for (let pos = 4; pos + 33 < bytes.length; pos++) {
    if (bytes[pos] !== 0x6d || bytes[pos + 1] !== 0x76 ||
        bytes[pos + 2] !== 0x68 || bytes[pos + 3] !== 0x64) continue;
    const size = readU32(bytes, pos - 4);
    if (!size || size < 24 || size > 1024) continue;
    const payload = pos + 4;
    const version = bytes[payload];
    const timescale = version === 0 ? readU32(bytes, payload + 12)
      : version === 1 ? readU32(bytes, payload + 20) : null;
    const duration = version === 0 ? readU32(bytes, payload + 16)
      : version === 1 ? readU64(bytes, payload + 24) : null;
    if (!timescale || !duration) continue;
    const seconds = duration / timescale;
    if (Number.isFinite(seconds) && seconds > 0) return seconds;
  }
  return null;
}

async function range(url: string, rangeHeader: string) {
  const parsed = new URL(url);
  if (parsed.protocol !== 'https:') throw new Error('Signed video URL must use HTTPS');
  const response = await fetch(url, {
    headers: { Range: rangeHeader },
    redirect: 'manual',
  });
  if (response.status !== 206) {
    response.body?.cancel().catch(() => undefined);
    throw new Error('Video storage did not return an expected byte range');
  }
  const bytes = new Uint8Array(await response.arrayBuffer());
  if (bytes.byteLength > TAIL_BYTES + 1024) {
    throw new Error('Video metadata range too large');
  }
  const total = Number(/\/(\d+)$/.exec(response.headers.get('content-range') ?? '')?.[1]);
  return {
    bytes,
    totalBytes: Number.isSafeInteger(total) && total > 0 ? total : 0,
  };
}

export async function probeGeneratorVideoDuration(url: string): Promise<number> {
  const first = await range(url, 'bytes=0-' + (HEAD_BYTES - 1));
  let seconds = parseGeneratorMp4Duration(first.bytes);
  if (!seconds && first.totalBytes > HEAD_BYTES) {
    const start = Math.max(0, first.totalBytes - TAIL_BYTES);
    const last = await range(url, 'bytes=' + start + '-');
    seconds = parseGeneratorMp4Duration(last.bytes);
  }
  if (!seconds) {
    throw new Error('Cannot read video duration. Use an MP4/MOV with valid metadata.');
  }
  return seconds;
}
