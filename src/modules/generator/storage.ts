import { AwsClient } from 'aws4fetch';

import { getAllConfigs } from '@/modules/config/service';
import { getStorage } from '@/modules/storage/service';
import { resolveR2ObjectKey } from '@/lib/r2-object-key';
import {
  buildR2CopySourceHeader,
  buildR2S3ObjectUrl,
  resolveR2SigningConfigFromMap,
  type R2SigningConfig,
} from '@/lib/r2-signing-config';
import type { GeneratorInputs, MediaSlot } from './types';
import { limitStagingUploadStream } from './upload-limits';
import { putBoundedGeneratorResultMultipart } from './r2-result-multipart';

export const GENERATOR_MAX_IMAGE_BYTES = 12 * 1024 * 1024;
export const GENERATOR_MAX_VIDEO_BYTES = 80 * 1024 * 1024;
export const GENERATOR_MAX_AUDIO_BYTES = 20 * 1024 * 1024;

const EXTENSIONS: Record<string, string> = {
  'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp',
  'video/mp4': 'mp4', 'video/quicktime': 'mov', 'video/webm': 'webm',
  'audio/mpeg': 'mp3', 'audio/wav': 'wav', 'audio/mp4': 'm4a',
};
const MIME_TYPES = Object.keys(EXTENSIONS);
const SLOTS: MediaSlot[] = [
  'startFrame', 'endFrame', 'referenceImages', 'referenceVideos', 'referenceAudio',
];
const UUID_REGEX = /^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i;

type Metadata = {
  contentType: string;
  contentLength: number;
  etag?: string;
};

function sanitizeSegment(value: string): string {
  return value.replace(/[^A-Za-z0-9_-]/g, '_');
}

export function assertGenerationId(value: unknown): string {
  if (typeof value !== 'string' || !UUID_REGEX.test(value)) {
    throw new Error('Invalid generation ID');
  }
  return value.toLowerCase();
}

export function normalizeUploadType(input: unknown): string {
  if (typeof input !== 'string') throw new Error('Content type is required');
  const mime = input.split(';', 1)[0].trim().toLowerCase();
  if (!EXTENSIONS[mime]) throw new Error('Unsupported media type');
  return mime;
}

export function assertUploadSize(contentType: string, contentLength: number) {
  const limit = contentType.startsWith('image/')
    ? GENERATOR_MAX_IMAGE_BYTES
    : contentType.startsWith('video/')
      ? GENERATOR_MAX_VIDEO_BYTES
      : GENERATOR_MAX_AUDIO_BYTES;
  if (!Number.isSafeInteger(contentLength) || contentLength < 1 || contentLength > limit) {
    throw new Error('Media must be between 1 and ' + Math.floor(limit / 1048576) + ' MB');
  }
}

function safeKey(key: string) {
  if (!key || key.includes('..') || key.includes('\\') ||
    key.includes('%') || key.includes('?') || key.includes('#') ||
    key.includes('//') || !/^[A-Za-z0-9._/-]+$/.test(key)) {
    throw new Error('Invalid generator storage key');
  }
}

export function getStagingPrefix(userId: string, generationId: string) {
  return 'generator/staging/' + sanitizeSegment(userId) + '/' + assertGenerationId(generationId) + '/';
}

export function getSealedPrefix(userId: string, generationId: string) {
  return 'generator/sealed/' + sanitizeSegment(userId) + '/' + assertGenerationId(generationId) + '/';
}

export function createGeneratorStagingKey(input: {
  userId: string; generationId: string; slot: MediaSlot; contentType: string;
}): string {
  if (!SLOTS.includes(input.slot)) throw new Error('Unsupported upload slot');
  const mime = normalizeUploadType(input.contentType);
  return getStagingPrefix(input.userId, input.generationId) +
    input.slot + '/' + crypto.randomUUID() + '.' + EXTENSIONS[mime];
}

export function assertStagingOwnership(key: string, userId: string, generationId: string, slot: MediaSlot) {
  safeKey(key);
  if (!SLOTS.includes(slot)) throw new Error('Invalid upload slot');
  const prefix = getStagingPrefix(userId, generationId) + slot + '/';
  if (!key.startsWith(prefix)) throw new Error('Upload key does not belong to this generation');
  const leaf = key.slice(prefix.length);
  const parts = leaf.split('.');
  if (parts.length !== 2 || !UUID_REGEX.test(parts[0]) ||
    !Object.values(EXTENSIONS).includes(parts[1])) {
    throw new Error('Invalid upload key format');
  }
}

export function assertSealedOwnership(key: string, userId: string, generationId: string) {
  safeKey(key);
  if (!key.startsWith(getSealedPrefix(userId, generationId))) {
    throw new Error('Invalid sealed generator key');
  }
}

export function getGeneratorResultKey(userId: string, generationId: string, index: number, mimeType: string) {
  if (!Number.isSafeInteger(index) || index < 0 || index > 20) throw new Error('Invalid result index');
  const ext = mimeType === 'video/mp4' ? 'mp4'
    : mimeType === 'image/png' ? 'png'
      : mimeType === 'image/webp' ? 'webp' : 'jpg';
  return 'generator/results/' + sanitizeSegment(userId) + '/' +
    assertGenerationId(generationId) + '/' + index + '.' + ext;
}

export function assertResultOwnership(key: string, userId: string, generationId: string) {
  safeKey(key);
  if (!key.startsWith('generator/results/' + sanitizeSegment(userId) + '/' +
    assertGenerationId(generationId) + '/')) throw new Error('Invalid result key');
}

async function config(): Promise<R2SigningConfig> {
  return resolveR2SigningConfigFromMap(await getAllConfigs());
}

function client(cfg: R2SigningConfig) {
  return new AwsClient({
    accessKeyId: cfg.accessKeyId,
    secretAccessKey: cfg.secretAccessKey,
    region: 'auto',
    service: 's3',
  });
}

function objectUrl(cfg: R2SigningConfig, key: string) {
  safeKey(key);
  return buildR2S3ObjectUrl(cfg, key);
}

async function headObject(key: string): Promise<Metadata> {
  const cfg = await config();
  const response = await client(cfg).fetch(
    new Request(objectUrl(cfg, key), { method: 'HEAD' })
  );
  if (!response.ok) throw new Error(response.status === 404
    ? 'Uploaded media not found'
    : 'Media HEAD failed: HTTP ' + response.status);
  const contentType = normalizeUploadType(response.headers.get('content-type') || '');
  const contentLength = Number(response.headers.get('content-length') || '');
  assertUploadSize(contentType, contentLength);
  return {
    contentType, contentLength,
    etag: response.headers.get('etag') || undefined,
  };
}

function bucketBinding() {
  const env = (globalThis as any).__CF_ENV__ ?? (globalThis as any).__env__;
  const binding = env?.R2_BUCKET ?? env?.BUCKET;
  return binding && typeof binding.put === 'function' ? binding : null;
}

/** Browser -> same-origin authenticated PUT -> Workers R2 binding or local S3. */
export async function putGeneratorStaging(input: {
  key: string; body: ReadableStream<Uint8Array>; contentType: string; contentLength: number;
  maxBytes?: number;
}) {
  safeKey(input.key);
  if (!input.key.startsWith('generator/staging/')) throw new Error('Not a staging key');
  const contentType = normalizeUploadType(input.contentType);
  assertUploadSize(contentType, input.contentLength);
  const globalLimit = contentType.startsWith('image/')
    ? GENERATOR_MAX_IMAGE_BYTES
    : contentType.startsWith('video/') ? GENERATOR_MAX_VIDEO_BYTES : GENERATOR_MAX_AUDIO_BYTES;
  const maxBytes = Math.min(input.maxBytes ?? globalLimit, globalLimit);
  const ext = EXTENSIONS[contentType];
  if (!input.key.endsWith('.' + ext)) throw new Error('File extension mismatch');
  const bounded = limitStagingUploadStream(input.body, {
    expectedBytes: input.contentLength,
    maxBytes,
  });
  const binding = bucketBinding();
  if (binding) {
    const cfg = await config();
    const key = resolveR2ObjectKey(cfg.uploadPath, input.key);
    // Cloudflare R2 requires a fixed-length stream, not an unbounded TransformStream.
    const FixedLength = (globalThis as any).FixedLengthStream;
    if (typeof FixedLength !== 'function') throw new Error('FixedLengthStream unavailable');
    const fixed = new FixedLength(input.contentLength);
    const abort = new AbortController();
    const piping = bounded.pipeTo(fixed.writable, { signal: abort.signal });
    const uploading = Promise.resolve().then(() =>
      binding.put(key, fixed.readable, { httpMetadata: { contentType } }));
    try {
      await Promise.all([piping, uploading]);
    } catch (error) {
      abort.abort();
      await Promise.allSettled([piping, uploading]);
      // Delete any partially persisted staging object on a size mismatch.
      if (typeof binding.delete === 'function') {
        await Promise.resolve(binding.delete(key)).catch(() => undefined);
      }
      throw error;
    }
    return;
  }
  if ((globalThis as any).__CF_ENV__ || (globalThis as any).__env__) {
    throw new Error('R2_BUCKET binding missing');
  }
  // Local/S3 fallback is also bounded before materializing bytes.
  const bytes = new Uint8Array(await new Response(bounded).arrayBuffer());
  const cfg = await config();
  const response = await client(cfg).fetch(
    new Request(objectUrl(cfg, input.key), {
      method: 'PUT',
      headers: {
        'Content-Type': contentType,
        'Content-Length': String(bytes.byteLength),
        'x-amz-content-sha256': 'UNSIGNED-PAYLOAD',
      },
      body: bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer,
    })
  );
  if (!response.ok) throw new Error('R2 upload failed: HTTP ' + response.status);
}

async function copyObject(source: string, destination: string, etag?: string) {
  const cfg = await config();
  const headers = new Headers({
    'x-amz-copy-source': buildR2CopySourceHeader(cfg, source),
    'x-amz-metadata-directive': 'COPY',
  });
  if (etag) headers.set('x-amz-copy-source-if-match', etag);
  const result = await client(cfg).fetch(new Request(objectUrl(cfg, destination), {
    method: 'PUT', headers,
  }));
  if (!result.ok) throw new Error('Unable to seal uploaded media: HTTP ' + result.status);
}

async function deleteObject(key: string) {
  try {
    const cfg = await config();
    await client(cfg).fetch(new Request(objectUrl(cfg, key), { method: 'DELETE' }));
  } catch (error) {
    console.warn('[generator] orphan sealed file cleanup failed', error);
  }
}

/**
 * Validates MIME, length and ETag, then copies to a UUID sealed key.
 * Future browser uploads to the staging key cannot alter the provider input.
 */
export async function sealGeneratorInput(input: {
  key: string; userId: string; generationId: string; slot: MediaSlot;
  accept: readonly string[]; maxBytes?: number;
}) {
  assertStagingOwnership(input.key, input.userId, input.generationId, input.slot);
  const meta = await headObject(input.key);
  if (!input.accept.includes(meta.contentType) ||
    (input.maxBytes !== undefined && meta.contentLength > input.maxBytes)) {
    throw new Error('Uploaded media does not match model limits');
  }

  const ext = EXTENSIONS[meta.contentType];
  const destination = getSealedPrefix(input.userId, input.generationId) +
    input.slot + '/' + crypto.randomUUID() + '.' + ext;
  try {
    await copyObject(input.key, destination, meta.etag);
    const after = await headObject(destination);
    if (meta.contentLength !== after.contentLength ||
        meta.contentType !== after.contentType) {
      throw new Error('Sealed media differs from staging');
    }
  } catch (error) {
    await deleteObject(destination);
    throw error;
  }
  return destination;
}

export async function sealGeneratorInputs(input: {
  inputs: GeneratorInputs; userId: string; generationId: string;
  slots: Record<string, { accept: readonly string[]; maxBytes?: number } | undefined>;
}) {
  const sealed: GeneratorInputs = {
    startFrame: null, endFrame: null,
    referenceImages: [], referenceVideos: [], referenceAudio: [],
  };
  const created: string[] = [];
  try {
    for (const slot of SLOTS) {
      const rule = input.slots[slot];
      const value = input.inputs[slot];
      const items = Array.isArray(value) ? value : value ? [value] : [];
      if (items.length > 0 && !rule) throw new Error('Unexpected media slot');
      const keys: string[] = [];
      for (const key of items) {
        const sealedKey = await sealGeneratorInput({
          key, userId: input.userId, generationId: input.generationId,
          slot, accept: rule!.accept, maxBytes: rule!.maxBytes,
        });
        created.push(sealedKey);
        keys.push(sealedKey);
      }
      if (slot === 'startFrame' || slot === 'endFrame') sealed[slot] = keys[0] ?? null;
      else sealed[slot] = keys;
    }
    return { inputs: sealed, created };
  } catch (error) {
    await Promise.all(created.map(deleteObject));
    throw error;
  }
}

export async function deleteOrphanedSealedInputs(keys: string[]) {
  await Promise.all(keys.map(deleteObject));
}

export async function signGeneratorReadUrl(key: string) {
  safeKey(key);
  if (!key.startsWith('generator/')) throw new Error('Not a generator object');
  const cfg = await config();
  const url = new URL(objectUrl(cfg, key));
  url.searchParams.set('X-Amz-Expires', '3600');
  const signed = await client(cfg).sign(new Request(url.toString(), { method: 'GET' }), {
    aws: { signQuery: true, service: 's3', region: 'auto' },
  });
  return signed.url;
}

const PROVIDER_MEDIA_HOSTS = [
  'fal.media',
  'fal.ai',
  'wavespeed.ai',
  'wavespeedai.com',
  'storage.googleapis.com',
];
const MAX_RESULT_VIDEO_BYTES = 300 * 1024 * 1024;
const MAX_RESULT_IMAGE_BYTES = 30 * 1024 * 1024;

/** Provider output URLs are not user-submitted URLs; enforce known CDN hosts. */
export function safeGeneratorProviderUrl(value: string): string {
  const url = new URL(value);
  const host = url.hostname.toLowerCase();
  if (url.protocol !== 'https:' || url.username || url.password ||
      (url.port !== '' && url.port !== '443') ||
      !PROVIDER_MEDIA_HOSTS.some(domain => host === domain || host.endsWith('.' + domain))) {
    throw new Error('Untrusted provider output URL');
  }
  return url.toString();
}

async function fetchTrustedProviderOutput(value: string, hops = 0): Promise<Response> {
  if (hops > 3) throw new Error('Too many provider media redirects');
  const response = await fetch(safeGeneratorProviderUrl(value), { redirect: 'manual' });
  if (response.status >= 300 && response.status <= 399) {
    const location = response.headers.get('location');
    await response.body?.cancel();
    if (!location) throw new Error('Provider media redirect is missing Location');
    return fetchTrustedProviderOutput(new URL(location, value).toString(), hops + 1);
  }
  if (!response.ok || !response.body) {
    throw new Error('Provider media download failed: HTTP ' + response.status);
  }
  return response;
}

/**
 * Stream a trusted upstream response into the R2 Worker binding, with an
 * enforced byte ceiling even if the provider omits Content-Length. This avoids
 * buffering a potentially large video into the 128MB Workers memory limit.
 */
async function saveProviderOutput(input: {
  url: string; key: string; contentType: string; maxBytes: number;
}) {
  const response = await fetchTrustedProviderOutput(input.url);
  const declaredHeader = response.headers.get('content-length');
  const declaredBytes = declaredHeader === null ? undefined : Number(declaredHeader);
  if (declaredBytes !== undefined &&
      (!Number.isSafeInteger(declaredBytes) || declaredBytes < 1 ||
       declaredBytes > input.maxBytes)) {
    await response.body?.cancel();
    throw new Error('Provider result exceeds maximum or has invalid Content-Length');
  }

  const binding = bucketBinding();
  if (binding) {
    try {
      const cfg = await config();
      // Do not pass a TransformStream to R2.put(): on Cloudflare Workers
      // its body length is unknown, even if upstream supplied Content-Length.
      // Multipart accepts fixed-size Uint8Array parts and caps memory at
      // one 8 MiB buffer plus the currently received source chunk.
      if (typeof binding.createMultipartUpload !== 'function') {
        throw new Error('R2 multipart binding unavailable');
      }
      await putBoundedGeneratorResultMultipart({
        bucket: binding,
        key: resolveR2ObjectKey(cfg.uploadPath, input.key),
        body: response.body!,
        contentType: input.contentType,
        maxBytes: input.maxBytes,
        declaredBytes,
      });
    } catch (error) {
      await response.body?.cancel().catch(() => undefined);
      throw error;
    }
    return;
  }

  // Node/local adapter retains a bounded stream; production Workers use the
  // R2 multipart binding above and never buffer an entire video.
  let received = 0;
  const limited = response.body!.pipeThrough(
    new TransformStream<Uint8Array, Uint8Array>({
      transform(chunk, controller) {
        received += chunk.byteLength;
        if (received > input.maxBytes) {
          controller.error(new Error('Provider media exceeds maximum file size'));
          return;
        }
        controller.enqueue(chunk);
      },
    })
  );
  // Node/local fallback only; Workers without R2 binding must not buffer media.
  if ((globalThis as any).__CF_ENV__ || (globalThis as any).__env__) {
    throw new Error('R2_BUCKET binding missing for output persistence');
  }
  const storage = await getStorage();
  if (!storage) throw new Error('R2 storage unavailable');
  const body = new Uint8Array(await new Response(limited).arrayBuffer());
  const uploaded = await storage.uploadFile({
    key: input.key, body, contentType: input.contentType,
    disposition: 'inline',
  });
  if (!uploaded.success) throw new Error(uploaded.error || 'R2 media save failed');
}

/** Save immutable provider result in our bucket before marking completed. */
export async function persistGeneratorResults(input: {
  userId: string; generationId: string;
  outputUrls: string[]; mediaType: 'image' | 'video';
  contentType?: string;
}) {
  const storage = await getStorage();
  if (!storage) throw new Error('R2 storage is not configured');
  const keys: string[] = [];
  for (let index = 0; index < input.outputUrls.length; index++) {
    const type = input.mediaType === 'video' ? 'video/mp4'
      : input.contentType === 'image/png' ? 'image/png'
        : input.contentType === 'image/webp' ? 'image/webp' : 'image/jpeg';
    const key = getGeneratorResultKey(input.userId, input.generationId, index, type);
    if (!(await storage.exists({ key }))) {
      await saveProviderOutput({
        url: input.outputUrls[index], key,
        contentType: type,
        maxBytes: input.mediaType === 'video'
          ? MAX_RESULT_VIDEO_BYTES : MAX_RESULT_IMAGE_BYTES,
      });
    }
    keys.push(key);
  }
  return keys;
}
