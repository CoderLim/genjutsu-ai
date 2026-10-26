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

import { IMAGE_TO_VIDEO_MAX_IMAGE_BYTES } from './constants';

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

export class ImageToVideoR2BindingMissingError extends Error {
  readonly statusCode = 503;
  constructor() {
    super(
      'R2_BUCKET binding is not configured. Add r2_buckets to wrangler.jsonc and redeploy.'
    );
    this.name = 'ImageToVideoR2BindingMissingError';
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
export function statusForImageToVideoProxyUploadError(error: unknown): number {
  if (error instanceof ImageToVideoR2BindingMissingError) {
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
  'image/webp': 'webp',
  'image/gif': 'gif',
  'image/avif': 'avif',
  'image/heic': 'heic',
  'image/heif': 'heif',
};

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
    throw new Error('Invalid image-to-video storage key');
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
      `Failed to seal image-to-video input: HTTP ${response.status}`
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

export function assertImageToVideoUploadSize(contentLength: number) {
  if (
    !Number.isSafeInteger(contentLength) ||
    contentLength <= 0 ||
    contentLength > IMAGE_TO_VIDEO_MAX_IMAGE_BYTES
  ) {
    const maxMb = Math.floor(IMAGE_TO_VIDEO_MAX_IMAGE_BYTES / 1024 / 1024);
    throw new Error(`Images must be ${maxMb} MB or smaller`);
  }
}

export function getImageToVideoInputPrefix(params: {
  userId: string;
  generationId: string;
}) {
  return `image-to-video/inputs/${safeSegment(params.userId)}/${safeSegment(
    params.generationId
  )}/`;
}

export function getImageToVideoSealedInputPrefix(params: {
  userId: string;
  generationId: string;
}) {
  return `image-to-video/sealed-inputs/${safeSegment(
    params.userId
  )}/${safeSegment(params.generationId)}/`;
}

export function getImageToVideoInputKey(params: {
  userId: string;
  generationId: string;
  contentType: string;
}) {
  const normalized =
    params.contentType.split(';', 1)[0]?.trim().toLowerCase() || '';
  const ext = IMAGE_CONTENT_TYPES[normalized];
  if (!ext) throw new Error('Unsupported image content type');
  const key = `${getImageToVideoInputPrefix(params)}image.${ext}`;
  return { key, contentType: normalized };
}

export function assertImageToVideoStagingKeyOwned(params: {
  userId: string;
  generationId: string;
  imageKey: string;
}) {
  assertSafeObjectKey(params.imageKey);
  const prefix = getImageToVideoInputPrefix(params);
  const pattern = new RegExp(
    `^${escapeRegExp(prefix)}image\\.(?:jpg|png|webp|gif|avif|heic|heif)$`
  );
  if (!pattern.test(params.imageKey)) {
    throw new Error('Invalid image-to-video staging key');
  }
}

export function assertImageToVideoSealedImageKeyOwned(params: {
  userId: string;
  generationId: string;
  imageKey: string;
}) {
  assertSafeObjectKey(params.imageKey);
  const prefix = getImageToVideoSealedInputPrefix(params);
  const pattern = new RegExp(
    `^${escapeRegExp(
      prefix
    )}[A-Za-z0-9_-]+\\.(?:jpg|png|webp|gif|avif|heic|heif)$`
  );
  if (!pattern.test(params.imageKey)) {
    throw new Error('Invalid image-to-video sealed key');
  }
}

export async function createImageToVideoUploadDescriptor(params: {
  userId: string;
  generationId: string;
  contentType: string;
  contentLength: number;
}) {
  assertImageToVideoUploadSize(params.contentLength);
  const normalized = getImageToVideoInputKey(params);
  const signed = await signR2Object({
    key: normalized.key,
    method: 'PUT',
    contentType: normalized.contentType,
    expiresSeconds: UPLOAD_EXPIRES_SECONDS,
  });

  return {
    uploadUrl: signed.url,
    uploadHeaders: {
      'Content-Type': normalized.contentType,
    },
    storageKey: normalized.key,
    index: 0,
    uploadMode: 'signed' as const,
  };
}

/**
 * Same-origin upload URL (browser → app → R2). Avoids browser CORS / Failed-to-fetch
 * against `*.r2.cloudflarestorage.com` — same pattern as Genjutsu proxy uploads.
 */
export function createImageToVideoProxyUploadDescriptor(
  request: Request,
  params: {
    userId: string;
    generationId: string;
    contentType: string;
    contentLength: number;
  }
) {
  assertImageToVideoUploadSize(params.contentLength);
  const normalized = getImageToVideoInputKey(params);
  const origin = new URL(request.url).origin;
  const uploadUrl = `${origin}/api/image-to-video/upload/${encodeURIComponent(
    params.generationId
  )}`;

  return {
    uploadUrl,
    uploadHeaders: {
      'Content-Type': normalized.contentType,
    },
    storageKey: normalized.key,
    index: 0,
    uploadMode: 'proxy' as const,
  };
}

/**
 * Write a staging object via Workers R2 binding, or signed S3 PUT on local Node.
 */
export async function putImageToVideoStagingObject(params: {
  key: string;
  body: ReadableStream | ArrayBuffer | ArrayBufferView | Blob;
  contentType: string;
  contentLength: number;
}) {
  assertSafeObjectKey(params.key);
  if (!params.key.startsWith('image-to-video/inputs/')) {
    throw new Error('Invalid image-to-video staging key');
  }
  assertImageToVideoUploadSize(params.contentLength);

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
    throw new ImageToVideoR2BindingMissingError();
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

/**
 * Seal staging → unique sealed key with ETag-conditional copy, then caller
 * CAS-binds sealedImageKey on the task.
 */
export async function sealImageToVideoInput(params: {
  userId: string;
  generationId: string;
  stagingImageKey: string;
  expectedContentType: string;
  expectedContentLength: number;
  /** If task already has a sealed key, reuse it (idempotent). */
  existingSealedImageKey?: string | null;
}) {
  if (params.existingSealedImageKey) {
    assertImageToVideoSealedImageKeyOwned({
      userId: params.userId,
      generationId: params.generationId,
      imageKey: params.existingSealedImageKey,
    });
    await headR2Object(params.existingSealedImageKey);
    return {
      sealedImageKey: params.existingSealedImageKey,
      reused: true as const,
    };
  }

  assertImageToVideoStagingKeyOwned({
    userId: params.userId,
    generationId: params.generationId,
    imageKey: params.stagingImageKey,
  });

  const meta = await headR2Object(params.stagingImageKey);
  assertImageToVideoUploadSize(meta.contentLength);

  const expectedType =
    params.expectedContentType.split(';', 1)[0]?.trim().toLowerCase() || '';
  if (!expectedType || meta.contentType !== expectedType) {
    throw new Error('Uploaded media content type changed before generation');
  }
  if (meta.contentLength !== params.expectedContentLength) {
    throw new Error('Uploaded media size changed before generation');
  }

  const ext = IMAGE_CONTENT_TYPES[meta.contentType];
  if (!ext) throw new Error('Unsupported image content type');

  const sealId = getUuid()
    .replace(/[^A-Za-z0-9_-]/g, '')
    .slice(0, 32);
  const sealedImageKey = `${getImageToVideoSealedInputPrefix(params)}${sealId}.${ext}`;

  try {
    await copyR2Object({
      sourceKey: params.stagingImageKey,
      destinationKey: sealedImageKey,
      sourceEtag: meta.etag,
    });
  } catch (error) {
    await deleteR2ObjectBestEffort(sealedImageKey);
    throw error instanceof Error
      ? error
      : new Error('Failed to seal image (staging may have changed)');
  }

  const sealedMeta = await headR2Object(sealedImageKey);
  if (
    sealedMeta.contentLength !== meta.contentLength ||
    sealedMeta.contentType !== meta.contentType
  ) {
    await deleteR2ObjectBestEffort(sealedImageKey);
    throw new Error('Sealed image does not match uploaded media');
  }

  return {
    sealedImageKey,
    reused: false as const,
    contentType: sealedMeta.contentType,
    contentLength: sealedMeta.contentLength,
    etag: sealedMeta.etag,
  };
}

export async function createImageToVideoR2ReadUrl(key: string) {
  assertSafeObjectKey(key);
  if (!key.startsWith('image-to-video/')) {
    throw new Error('Invalid image-to-video storage key');
  }
  const signed = await signR2Object({
    key,
    method: 'GET',
    expiresSeconds: READ_EXPIRES_SECONDS,
  });
  return signed.url;
}

export function getImageToVideoResultKey(params: {
  userId: string;
  generationId: string;
}) {
  return `image-to-video/results/${safeSegment(params.userId)}/${safeSegment(
    params.generationId
  )}.mp4`;
}

export function assertImageToVideoResultKeyOwned(params: {
  userId: string;
  generationId: string;
  videoKey: string;
}) {
  assertSafeObjectKey(params.videoKey);
  if (params.videoKey !== getImageToVideoResultKey(params)) {
    throw new Error('Invalid image-to-video result key');
  }
}

export async function persistImageToVideoResultToR2(params: {
  userId: string;
  generationId: string;
  sourceUrl: string;
}) {
  const storage = await getStorage();
  if (!storage) throw new Error('R2 storage is not configured');

  const videoKey = getImageToVideoResultKey(params);
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
        copied.error || 'Failed to persist image-to-video result'
      );
    }
  }

  return { videoKey };
}

export async function deleteImageToVideoOrphanSealedKey(key: string) {
  await deleteR2ObjectBestEffort(key);
}
