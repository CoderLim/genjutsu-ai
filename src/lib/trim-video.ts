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

/**
 * Trim a remote/local video to an MP4 clip for Fal MiniMax H3.
 * Prefers stream-copy; falls back to re-encode if copy fails.
 */
export async function trimVideoToFile(params: {
  sourceUrl: string;
  startSeconds: number;
  endSeconds: number;
  fileName?: string;
}): Promise<File> {
  const start = Math.max(0, params.startSeconds);
  const end = Math.max(start + 0.2, params.endSeconds);
  const duration = end - start;
  if (duration < 0.5) {
    throw new Error('Clip must be at least 0.5 seconds');
  }

  const ffmpeg = await getFfmpeg();
  const inputName = 'input.bin';
  const outputName = 'output.mp4';

  await ffmpeg.writeFile(inputName, await fetchFile(params.sourceUrl));

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

  let data: Uint8Array;
  try {
    // -ss after -i is more accurate; -c copy keeps MP4 for Fal.
    data = await run([
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
  } catch {
    data = await run([
      '-i',
      inputName,
      '-ss',
      start.toFixed(3),
      '-t',
      duration.toFixed(3),
      '-c:v',
      'libx264',
      '-preset',
      'veryfast',
      '-crf',
      '23',
      '-c:a',
      'aac',
      '-movflags',
      '+faststart',
      outputName,
    ]);
  }

  await ffmpeg.deleteFile(inputName).catch(() => undefined);
  await ffmpeg.deleteFile(outputName).catch(() => undefined);

  // Copy into a fresh ArrayBuffer-backed Uint8Array for Blob Part compatibility.
  const copy = new Uint8Array(data.byteLength);
  copy.set(data);

  return new File([copy], params.fileName ?? 'hotel-lobby-clip.mp4', {
    type: 'video/mp4',
    lastModified: Date.now(),
  });
}
