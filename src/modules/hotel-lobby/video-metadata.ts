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

export async function probeHotelLobbyDurationSeconds(videoUrl: string) {
  const first = await fetchRange(videoUrl, `bytes=0-${HEAD_BYTES - 1}`);
  let seconds = parseIsoBmffDurationSeconds(first.bytes);

  if (seconds == null && first.totalBytes && first.totalBytes > HEAD_BYTES) {
    const start = Math.max(0, first.totalBytes - TAIL_BYTES);
    const tail = await fetchRange(videoUrl, `bytes=${start}-`);
    seconds = parseIsoBmffDurationSeconds(tail.bytes);
  }

  if (seconds == null) {
    throw new Error(
      'Could not read the reference video duration. Use an MP4 or MOV with readable metadata.'
    );
  }

  return normalizeHotelLobbyDuration(seconds);
}
