import { AwsClient } from 'aws4fetch';

import { getAllConfigs } from '@/modules/config/service';
import { getStorage } from '@/modules/storage/service';
import { getUuid } from '@/lib/hash';
import { resolveR2ObjectKey } from '@/lib/r2-object-key';
import {
  buildR2CopySourceHeader,
  buildR2S3ObjectUrl,
  resolveR2SigningConfigFromMap,
  type R2SigningConfig,
} from '@/lib/r2-signing-config';

import {
  VIDEO_FACE_SWAP_MAX_IMAGE_BYTES,
  VIDEO_FACE_SWAP_MAX_VIDEO_BYTES,
} from './constants';

const UPLOAD_EXPIRES_SECONDS = 10 * 60;
const READ_EXPIRES_SECONDS = 60 * 60;

type R2BucketBinding = {
  put: (
    key: string,
    value:
      | ReadableStream
      | ArrayBuffer
      | ArrayBufferView
      | Blob
      | string
      | null,
    options?: { httpMetadata?: { contentType?: string } }
  ) => Promise<unknown>;
};

export class VideoFaceSwapR2BindingMissingError extends Error {
  readonly statusCode = 503;
  constructor() {
    super(
      'R2_BUCKET binding is not configured. Add r2_buckets to wrangler.jsonc and redeploy.'
    );
    this.name = 'VideoFaceSwapR2BindingMissingError';
  }
}

function isCloudflareWorkersRuntime() {
  const env = (globalThis as any).__CF_ENV__ ?? (globalThis as any).__env__;
  return Boolean(env);
}

function getR2BucketBinding(): R2BucketBinding | null {
  const env = (globalThis as any).__CF_ENV__ ?? (globalThis as any).__env__;
  const binding = env?.R2_BUCKET ?? env?.BUCKET;
  return binding && typeof binding.put === 'function'
    ? (binding as R2BucketBinding)
    : null;
}

/** Map put/proxy failures to HTTP status so the client can retry 5xx. */
export function statusForVideoFaceSwapProxyUploadError(error: unknown): number {
  if (error instanceof VideoFaceSwapR2BindingMissingError) {
    return error.statusCode;
  }
  if (error instanceof Error) {
    if (
      /mismatch|Invalid|Unsupported|must be|not an? |Provide |Missing body/i.test(
        error.message
      )
    ) {
      return 400;
    }
  }
  return 502;
}

const IMAGE_CONTENT_TYPES: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/png': 'png',
};

const VIDEO_CONTENT_TYPES: Record<string, string> = {
  'video/mp4': 'mp4',
};

export type VideoFaceSwapUploadRole = 'video' | 'image';

type ObjectMetadata = {
  contentLength: number;
  contentType: string;
  etag?: string;
};

function safeSegment(value: string) {
  return value.replace(/[^A-Za-z0-9_-]/g, '_');
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^$()|[\]\\]/g, '\\$&');
}

function assertSafeObjectKey(key: string) {
  if (
    !key ||
    key.includes('..') ||
    key.includes('\\') ||
    key.includes('?') ||
    key.includes('#') ||
    key.includes('%') ||
    key.includes('//') ||
    !/^[A-Za-z0-9._/-]+$/.test(key)
  ) {
    throw new Error('Invalid video-face-swap storage key');
  }
}

async function getR2SigningConfig(): Promise<R2SigningConfig> {
  return resolveR2SigningConfigFromMap(await getAllConfigs());
}

function createR2Client(config: R2SigningConfig) {
  return new AwsClient({
    accessKeyId: config.accessKeyId,
    secretAccessKey: config.secretAccessKey,
    region: 'auto',
    service: 's3',
  });
}

function buildR2ObjectUrl(config: R2SigningConfig, key: string) {
  assertSafeObjectKey(key);
  return buildR2S3ObjectUrl(config, key);
}

async function signR2Object(params: {
  key: string;
  method: 'GET' | 'PUT';
  contentType?: string;
  expiresSeconds: number;
}) {
  const config = await getR2SigningConfig();
  const url = new URL(buildR2ObjectUrl(config, params.key));
  url.searchParams.set('X-Amz-Expires', String(params.expiresSeconds));

  const headers = new Headers();
  if (params.contentType) headers.set('Content-Type', params.contentType);

  return createR2Client(config).sign(
    new Request(url.toString(), {
      method: params.method,
      headers,
    }),
    {
      aws: {
        signQuery: true,
        service: 's3',
        region: 'auto',
      },
    }
  );
}

async function headR2Object(key: string): Promise<ObjectMetadata> {
  const config = await getR2SigningConfig();
  const response = await createR2Client(config).fetch(
    new Request(buildR2ObjectUrl(config, key), { method: 'HEAD' })
  );

  if (!response.ok) {
    throw new Error(
      response.status === 404
        ? 'Uploaded media is missing from R2'
        : `Failed to inspect uploaded media: HTTP ${response.status}`
    );
  }

  const contentLength = Number(response.headers.get('content-length') || '');
  const contentType =
    response.headers
      .get('content-type')
      ?.split(';', 1)[0]
      ?.trim()
      .toLowerCase() || '';

  if (!Number.isSafeInteger(contentLength) || contentLength <= 0) {
    throw new Error('Uploaded media has an invalid content length');
  }

  return {
    contentLength,
    contentType,
    etag: response.headers.get('etag') || undefined,
  };
}

async function copyR2Object(params: {
  sourceKey: string;
  destinationKey: string;
  sourceEtag?: string;
}) {
  const config = await getR2SigningConfig();
  assertSafeObjectKey(params.sourceKey);
  assertSafeObjectKey(params.destinationKey);

  const headers = new Headers({
    'x-amz-copy-source': buildR2CopySourceHeader(config, params.sourceKey),
    'x-amz-metadata-directive': 'COPY',
  });
  if (params.sourceEtag) {
    headers.set('x-amz-copy-source-if-match', params.sourceEtag);
  }

  const response = await createR2Client(config).fetch(
    new Request(buildR2ObjectUrl(config, params.destinationKey), {
      method: 'PUT',
      headers,
    })
  );
  if (!response.ok) {
    throw new Error(
      `Failed to seal video-face-swap input: HTTP ${response.status}`
    );
  }
}

async function deleteR2ObjectBestEffort(key: string) {
  try {
    const config = await getR2SigningConfig();
    await createR2Client(config).fetch(
      new Request(buildR2ObjectUrl(config, key), { method: 'DELETE' })
    );
  } catch {
    // best-effort orphan cleanup
  }
}

export function assertVideoFaceSwapImageUploadSize(contentLength: number) {
  if (
    !Number.isSafeInteger(contentLength) ||
    contentLength <= 0 ||
    contentLength > VIDEO_FACE_SWAP_MAX_IMAGE_BYTES
  ) {
    const maxMb = Math.floor(VIDEO_FACE_SWAP_MAX_IMAGE_BYTES / 1024 / 1024);
    throw new Error(`Head photos must be ${maxMb} MB or smaller`);
  }
}

export function assertVideoFaceSwapVideoUploadSize(contentLength: number) {
  if (
    !Number.isSafeInteger(contentLength) ||
    contentLength <= 0 ||
    contentLength > VIDEO_FACE_SWAP_MAX_VIDEO_BYTES
  ) {
    const maxMb = Math.floor(VIDEO_FACE_SWAP_MAX_VIDEO_BYTES / 1024 / 1024);
    throw new Error(`Source videos must be ${maxMb} MB or smaller`);
  }
}

export function getVideoFaceSwapInputPrefix(params: {
  userId: string;
  generationId: string;
}) {
  return `video-face-swap/inputs/${safeSegment(params.userId)}/${safeSegment(
    params.generationId
  )}/`;
}

export function getVideoFaceSwapSealedInputPrefix(params: {
  userId: string;
  generationId: string;
}) {
  return `video-face-swap/sealed-inputs/${safeSegment(
    params.userId
  )}/${safeSegment(params.generationId)}/`;
}

export function getVideoFaceSwapInputKey(params: {
  userId: string;
  generationId: string;
  role: VideoFaceSwapUploadRole;
  contentType: string;
}) {
  const normalized =
    params.contentType.split(';', 1)[0]?.trim().toLowerCase() || '';
  if (params.role === 'video') {
    const ext = VIDEO_CONTENT_TYPES[normalized];
    if (!ext) throw new Error('Unsupported video content type (MP4 only)');
    return {
      key: `${getVideoFaceSwapInputPrefix(params)}video.${ext}`,
      contentType: normalized,
      role: 'video' as const,
    };
  }
  const ext = IMAGE_CONTENT_TYPES[normalized];
  if (!ext) throw new Error('Unsupported image content type (JPG/PNG only)');
  return {
    key: `${getVideoFaceSwapInputPrefix(params)}head.${ext}`,
    contentType: normalized,
    role: 'image' as const,
  };
}

export function assertVideoFaceSwapStagingKeyOwned(params: {
  userId: string;
  generationId: string;
  role: VideoFaceSwapUploadRole;
  key: string;
}) {
  assertSafeObjectKey(params.key);
  const prefix = getVideoFaceSwapInputPrefix(params);
  const pattern =
    params.role === 'video'
      ? new RegExp(`^${escapeRegExp(prefix)}video\\.mp4$`)
      : new RegExp(`^${escapeRegExp(prefix)}head\\.(?:jpg|png)$`);
  if (!pattern.test(params.key)) {
    throw new Error('Invalid video-face-swap staging key');
  }
}

export function assertVideoFaceSwapSealedKeyOwned(params: {
  userId: string;
  generationId: string;
  role: VideoFaceSwapUploadRole;
  key: string;
}) {
  assertSafeObjectKey(params.key);
  const prefix = getVideoFaceSwapSealedInputPrefix(params);
  const pattern =
    params.role === 'video'
      ? new RegExp(`^${escapeRegExp(prefix)}[A-Za-z0-9_-]+\\.mp4$`)
      : new RegExp(`^${escapeRegExp(prefix)}[A-Za-z0-9_-]+\\.(?:jpg|png)$`);
  if (!pattern.test(params.key)) {
    throw new Error('Invalid video-face-swap sealed key');
  }
}

export function createVideoFaceSwapProxyUploadDescriptor(
  request: Request,
  params: {
    userId: string;
    generationId: string;
    role: VideoFaceSwapUploadRole;
    contentType: string;
    contentLength: number;
  }
) {
  if (params.role === 'video') {
    assertVideoFaceSwapVideoUploadSize(params.contentLength);
  } else {
    assertVideoFaceSwapImageUploadSize(params.contentLength);
  }
  const normalized = getVideoFaceSwapInputKey(params);
  const origin = new URL(request.url).origin;
  const uploadUrl = `${origin}/api/video-face-swap/upload/${encodeURIComponent(
    params.generationId
  )}?role=${params.role}`;

  return {
    role: params.role,
    uploadUrl,
    uploadHeaders: {
      'Content-Type': normalized.contentType,
    },
    storageKey: normalized.key,
    uploadMode: 'proxy' as const,
  };
}

export async function putVideoFaceSwapStagingObject(params: {
  key: string;
  body: ReadableStream | ArrayBuffer | ArrayBufferView | Blob;
  contentType: string;
  contentLength: number;
  role: VideoFaceSwapUploadRole;
}) {
  assertSafeObjectKey(params.key);
  if (!params.key.startsWith('video-face-swap/inputs/')) {
    throw new Error('Invalid video-face-swap staging key');
  }
  if (params.role === 'video') {
    assertVideoFaceSwapVideoUploadSize(params.contentLength);
  } else {
    assertVideoFaceSwapImageUploadSize(params.contentLength);
  }

  const binding = getR2BucketBinding();
  if (binding) {
    const config = await getR2SigningConfig();
    const objectKey = resolveR2ObjectKey(config.uploadPath, params.key);
    await binding.put(objectKey, params.body, {
      httpMetadata: { contentType: params.contentType },
    });
    return { via: 'binding' as const, objectKey };
  }

  if (isCloudflareWorkersRuntime()) {
    throw new VideoFaceSwapR2BindingMissingError();
  }

  const config = await getR2SigningConfig();
  const objectKey = resolveR2ObjectKey(config.uploadPath, params.key);
  const bytes =
    params.body instanceof ReadableStream
      ? new Uint8Array(await new Response(params.body).arrayBuffer())
      : params.body instanceof Blob
        ? new Uint8Array(await params.body.arrayBuffer())
        : params.body instanceof ArrayBuffer
          ? new Uint8Array(params.body)
          : new Uint8Array(
              params.body.buffer,
              params.body.byteOffset,
              params.body.byteLength
            );

  if (bytes.byteLength !== params.contentLength) {
    throw new Error(
      `Upload size mismatch: expected ${params.contentLength}, got ${bytes.byteLength}`
    );
  }

  const headers = new Headers({
    'Content-Type': params.contentType,
    'Content-Length': String(bytes.byteLength),
    'x-amz-content-sha256': 'UNSIGNED-PAYLOAD',
  });

  const response = await createR2Client(config).fetch(
    new Request(buildR2ObjectUrl(config, params.key), {
      method: 'PUT',
      headers,
      body: bytes.buffer.slice(
        bytes.byteOffset,
        bytes.byteOffset + bytes.byteLength
      ) as ArrayBuffer,
    })
  );

  if (!response.ok) {
    const detail = await response.text().catch(() => '');
    throw new Error(
      `Failed to upload to R2: HTTP ${response.status}${
        detail ? ` - ${detail.slice(0, 300)}` : ''
      }`
    );
  }

  return { via: 's3' as const, objectKey };
}

async function sealOneInput(params: {
  userId: string;
  generationId: string;
  role: VideoFaceSwapUploadRole;
  stagingKey: string;
  expectedContentType: string;
  expectedContentLength: number;
  existingSealedKey?: string | null;
}) {
  if (params.existingSealedKey) {
    assertVideoFaceSwapSealedKeyOwned({
      userId: params.userId,
      generationId: params.generationId,
      role: params.role,
      key: params.existingSealedKey,
    });
    await headR2Object(params.existingSealedKey);
    return {
      sealedKey: params.existingSealedKey,
      reused: true as const,
    };
  }

  assertVideoFaceSwapStagingKeyOwned({
    userId: params.userId,
    generationId: params.generationId,
    role: params.role,
    key: params.stagingKey,
  });

  const meta = await headR2Object(params.stagingKey);
  if (params.role === 'video') {
    assertVideoFaceSwapVideoUploadSize(meta.contentLength);
  } else {
    assertVideoFaceSwapImageUploadSize(meta.contentLength);
  }

  const expectedType =
    params.expectedContentType.split(';', 1)[0]?.trim().toLowerCase() || '';
  if (!expectedType || meta.contentType !== expectedType) {
    throw new Error('Uploaded media content type changed before generation');
  }
  if (meta.contentLength !== params.expectedContentLength) {
    throw new Error('Uploaded media size changed before generation');
  }

  const extMap =
    params.role === 'video' ? VIDEO_CONTENT_TYPES : IMAGE_CONTENT_TYPES;
  const ext = extMap[meta.contentType];
  if (!ext) throw new Error('Unsupported media content type');

  const sealId = getUuid()
    .replace(/[^A-Za-z0-9_-]/g, '')
    .slice(0, 32);
  const sealedKey = `${getVideoFaceSwapSealedInputPrefix(params)}${sealId}.${ext}`;

  try {
    await copyR2Object({
      sourceKey: params.stagingKey,
      destinationKey: sealedKey,
      sourceEtag: meta.etag,
    });
  } catch (error) {
    await deleteR2ObjectBestEffort(sealedKey);
    throw error instanceof Error
      ? error
      : new Error('Failed to seal input (staging may have changed)');
  }

  const sealedMeta = await headR2Object(sealedKey);
  if (
    sealedMeta.contentLength !== meta.contentLength ||
    sealedMeta.contentType !== meta.contentType
  ) {
    await deleteR2ObjectBestEffort(sealedKey);
    throw new Error('Sealed media does not match uploaded media');
  }

  return {
    sealedKey,
    reused: false as const,
    contentType: sealedMeta.contentType,
    contentLength: sealedMeta.contentLength,
    etag: sealedMeta.etag,
  };
}

export async function sealVideoFaceSwapInputs(params: {
  userId: string;
  generationId: string;
  stagingVideoKey: string;
  stagingImageKey: string;
  videoContentType: string;
  videoContentLength: number;
  imageContentType: string;
  imageContentLength: number;
  existingSealedVideoKey?: string | null;
  existingSealedImageKey?: string | null;
}) {
  const video = await sealOneInput({
    userId: params.userId,
    generationId: params.generationId,
    role: 'video',
    stagingKey: params.stagingVideoKey,
    expectedContentType: params.videoContentType,
    expectedContentLength: params.videoContentLength,
    existingSealedKey: params.existingSealedVideoKey,
  });
  let image;
  try {
    image = await sealOneInput({
      userId: params.userId,
      generationId: params.generationId,
      role: 'image',
      stagingKey: params.stagingImageKey,
      expectedContentType: params.imageContentType,
      expectedContentLength: params.imageContentLength,
      existingSealedKey: params.existingSealedImageKey,
    });
  } catch (error) {
    if (!video.reused) await deleteR2ObjectBestEffort(video.sealedKey);
    throw error;
  }

  return {
    sealedVideoKey: video.sealedKey,
    sealedImageKey: image.sealedKey,
    reusedVideo: video.reused,
    reusedImage: image.reused,
    orphanKeys: [
      ...(video.reused ? [] : [video.sealedKey]),
      ...(image.reused ? [] : [image.sealedKey]),
    ],
  };
}

export async function createVideoFaceSwapR2ReadUrl(key: string) {
  assertSafeObjectKey(key);
  if (!key.startsWith('video-face-swap/')) {
    throw new Error('Invalid video-face-swap storage key');
  }
  const signed = await signR2Object({
    key,
    method: 'GET',
    expiresSeconds: READ_EXPIRES_SECONDS,
  });
  return signed.url;
}

export function getVideoFaceSwapResultKey(params: {
  userId: string;
  generationId: string;
}) {
  return `video-face-swap/results/${safeSegment(params.userId)}/${safeSegment(
    params.generationId
  )}.mp4`;
}

export function assertVideoFaceSwapResultKeyOwned(params: {
  userId: string;
  generationId: string;
  videoKey: string;
}) {
  assertSafeObjectKey(params.videoKey);
  if (params.videoKey !== getVideoFaceSwapResultKey(params)) {
    throw new Error('Invalid video-face-swap result key');
  }
}

export async function persistVideoFaceSwapResultToR2(params: {
  userId: string;
  generationId: string;
  sourceUrl: string;
}) {
  const storage = await getStorage();
  if (!storage) throw new Error('R2 storage is not configured');

  const videoKey = getVideoFaceSwapResultKey(params);
  const exists = await storage.exists({ key: videoKey });

  if (!exists) {
    const copied = await storage.downloadAndUpload({
      url: params.sourceUrl,
      key: videoKey,
      contentType: 'video/mp4',
      disposition: 'inline',
    });
    if (!copied.success) {
      throw new Error(
        copied.error || 'Failed to persist video-face-swap result'
      );
    }
  }

  return { videoKey };
}

export async function deleteVideoFaceSwapOrphanSealedKey(key: string) {
  await deleteR2ObjectBestEffort(key);
}
