import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';

let ffmpegSingleton: FFmpeg | null = null;
let ffmpegLoadPromise: Promise<FFmpeg> | null = null;

async function getFfmpeg() {
  if (ffmpegSingleton) return ffmpegSingleton;
  if (ffmpegLoadPromise) return ffmpegLoadPromise;

  ffmpegLoadPromise = (async () => {
    const ffmpeg = new FFmpeg();
    const baseURL =
      'https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.10/dist/esm';
    await ffmpeg.load({
      coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
      wasmURL: await toBlobURL(
        `${baseURL}/ffmpeg-core.wasm`,
        'application/wasm'
      ),
    });
    ffmpegSingleton = ffmpeg;
    return ffmpeg;
  })();

  try {
    return await ffmpegLoadPromise;
  } catch (error) {
    ffmpegLoadPromise = null;
    throw error;
  }
}

type TrimSource = {
  sourceUrl?: string;
  /** Prefer File/Blob when available — more reliable than blob: URLs. */
  sourceFile?: Blob;
};

/**
 * Trim a remote/local video to an MP4 clip for Fal / WaveSpeed video models.
 * Prefers stream-copy; falls back to re-encode if copy fails.
 */
export async function trimVideoToFile(params: {
  sourceUrl?: string;
  sourceFile?: Blob;
  startSeconds: number;
  endSeconds: number;
  fileName?: string;
  /** Re-encode instead of stream-copy for frame-accurate short previews. */
  accurate?: boolean;
}): Promise<File> {
  const source = resolveTrimSource(params);
  const start = Math.max(0, params.startSeconds);
  const end = Math.max(start + 0.2, params.endSeconds);
  const duration = end - start;
  if (duration < 0.5) {
    throw new Error('Clip must be at least 0.5 seconds');
  }

  const ffmpeg = await getFfmpeg();
  const inputName = 'input.bin';
  const outputName = 'output.mp4';
  const logs: string[] = [];
  const onLog = ({ message }: { message: string }) => {
    if (message) logs.push(message.slice(0, 240));
  };
  ffmpeg.on('log', onLog);

  await ffmpeg.writeFile(inputName, await fetchFile(source));

  const run = async (args: string[]) => {
    await ffmpeg.deleteFile(outputName).catch(() => undefined);
    const code = await ffmpeg.exec(args);
    if (code !== 0) {
      throw new Error(`ffmpeg exited with code ${code}`);
    }
    const data = await ffmpeg.readFile(outputName);
    if (!(data instanceof Uint8Array) || data.byteLength <= 0) {
      throw new Error('Trimmed clip was empty');
    }
    return data;
  };

  const reencode = (
    videoCodec: 'libx264' | 'mpeg4',
    audioMode: 'none' | 'aac'
  ) =>
    run([
      '-i',
      inputName,
      '-ss',
      start.toFixed(3),
      '-t',
      duration.toFixed(3),
      '-c:v',
      videoCodec,
      ...(videoCodec === 'libx264'
        ? ['-preset', 'veryfast', '-crf', '23', '-pix_fmt', 'yuv420p']
        : ['-q:v', '5']),
      ...(audioMode === 'aac' ? ['-c:a', 'aac'] : ['-an']),
      '-movflags',
      '+faststart',
      outputName,
    ]);

  const streamCopy = () =>
    run([
      '-i',
      inputName,
      '-ss',
      start.toFixed(3),
      '-t',
      duration.toFixed(3),
      '-c',
      'copy',
      '-avoid_negative_ts',
      'make_zero',
      '-movflags',
      '+faststart',
      outputName,
    ]);

  /** Try strategies in order; keep first success. Prefer keeping audio. */
  const strategies: Array<() => Promise<Uint8Array>> = params.accurate
    ? [
        // Keep soundtrack when possible. Only strip audio after AAC + copy fail
        // (old path preferred -an, so Preview clips were silent).
        () => reencode('libx264', 'aac'),
        () => streamCopy(),
        () => reencode('libx264', 'none'),
        () => reencode('mpeg4', 'none'),
      ]
    : [
        () => streamCopy(),
        () => reencode('libx264', 'aac'),
        () => reencode('libx264', 'none'),
        () => reencode('mpeg4', 'none'),
      ];

  let data: Uint8Array | null = null;
  let lastError: unknown;
  try {
    for (const strategy of strategies) {
      try {
        data = await strategy();
        break;
      } catch (cause) {
        lastError = cause;
      }
    }
    if (!data) {
      const detail =
        lastError instanceof Error ? lastError.message : 'unknown error';
      const logTail = logs.slice(-6).join(' | ');
      throw new Error(
        logTail
          ? `Video trim failed (${detail}). ${logTail}`
          : `Video trim failed (${detail})`
      );
    }
  } finally {
    ffmpeg.off('log', onLog);
    await ffmpeg.deleteFile(inputName).catch(() => undefined);
    await ffmpeg.deleteFile(outputName).catch(() => undefined);
  }

  // Copy into a fresh ArrayBuffer-backed Uint8Array for Blob Part compatibility.
  const copy = new Uint8Array(data.byteLength);
  copy.set(data);

  return new File([copy], params.fileName ?? 'hotel-lobby-clip.mp4', {
    type: 'video/mp4',
    lastModified: Date.now(),
  });
}

function resolveTrimSource(params: TrimSource): Blob | string {
  if (params.sourceFile) return params.sourceFile;
  if (params.sourceUrl) return params.sourceUrl;
  throw new Error('trimVideoToFile requires sourceFile or sourceUrl');
}
