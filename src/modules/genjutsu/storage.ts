import { AwsClient } from 'aws4fetch';

import { getAllConfigs } from '@/modules/config/service';
import { getStorage } from '@/modules/storage/service';

const UPLOAD_EXPIRES_SECONDS = 15 * 60;
const READ_EXPIRES_SECONDS = 60 * 60;

export const GENJUTSU_MAX_VIDEO_BYTES = 200 * 1024 * 1024;
export const GENJUTSU_MAX_IMAGE_BYTES = 12 * 1024 * 1024;
/** Cloudflare Workers request body limit is 100 MiB — stay under it for proxy uploads. */
export const GENJUTSU_PROXY_UPLOAD_MAX_BYTES = 95 * 1024 * 1024;

type R2BucketBinding = {
  put(
    key: string,
    value:
      | ReadableStream
      | ArrayBuffer
      | ArrayBufferView
      | string
      | Blob
      | null,
    options?: {
      httpMetadata?: { contentType?: string };
    }
  ): Promise<unknown>;
};

function getR2BucketBinding(): R2BucketBinding | null {
  const env = (globalThis as any).__CF_ENV__ ?? (globalThis as any).__env__;
  const binding = env?.R2_BUCKET ?? env?.BUCKET;
  return binding && typeof binding.put === 'function'
    ? (binding as R2BucketBinding)
    : null;
}

const VIDEO_CONTENT_TYPES: Record<string, string> = {
  'video/mp4': 'mp4',
  'video/quicktime': 'mov',
  'video/webm': 'webm',
};

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

type R2SigningConfig = {
  endpoint: string;
  bucket: string;
  uploadPath: string;
  accessKeyId: string;
  secretAccessKey: string;
};

export type GenjutsuObjectMetadata = {
  contentLength: number;
  contentType: string;
  etag?: string;
};

function trimSlashes(value: string) {
  return value.replace(/^\/+|\/+$/g, '');
}

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
    throw new Error('Invalid Genjutsu storage key');
  }
}

function encodePath(value: string) {
  return value
    .split('/')
    .filter(Boolean)
    .map((segment) => encodeURIComponent(segment))
    .join('/');
}

function contentTypeExtension(contentType: string, index: number) {
  const normalized = contentType.split(';', 1)[0]?.trim().toLowerCase() || '';
  const ext =
    index === 0
      ? VIDEO_CONTENT_TYPES[normalized]
      : IMAGE_CONTENT_TYPES[normalized];

  if (!ext) {
    throw new Error(
      index === 0
        ? 'Unsupported source-video content type'
        : 'Unsupported reference-image content type'
    );
  }

  return { contentType: normalized, ext };
}

export function assertGenjutsuUploadSize(index: number, contentLength: number) {
  const maxBytes =
    index === 0 ? GENJUTSU_MAX_VIDEO_BYTES : GENJUTSU_MAX_IMAGE_BYTES;
  if (
    !Number.isSafeInteger(contentLength) ||
    contentLength <= 0 ||
    contentLength > maxBytes
  ) {
    const maxMb = Math.floor(maxBytes / 1024 / 1024);
    throw new Error(
      index === 0
        ? `Source video must be ${maxMb} MB or smaller`
        : `Reference images must be ${maxMb} MB or smaller`
    );
  }
}

async function getR2SigningConfig(): Promise<R2SigningConfig> {
  const configs = await getAllConfigs();
  const endpoint = configs.r2_endpoint?.trim().replace(/\/$/, '');
  const bucket = configs.r2_bucket_name?.trim();
  const accessKeyId = configs.r2_access_key?.trim();
  const secretAccessKey = configs.r2_secret_key?.trim();
  const uploadPath = trimSlashes(configs.r2_upload_path?.trim() || 'uploads');

  if (!endpoint || !bucket || !accessKeyId || !secretAccessKey) {
    throw new Error(
      'R2 storage is not fully configured. Set endpoint, bucket, access key, and secret key in Admin → Storage.'
    );
  }

  return {
    endpoint,
    bucket,
    uploadPath,
    accessKeyId,
    secretAccessKey,
  };
}

function buildR2ObjectUrl(config: R2SigningConfig, key: string) {
  assertSafeObjectKey(key);
  const objectPath = encodePath(
    [config.bucket, config.uploadPath, key].filter(Boolean).join('/')
  );
  return `${config.endpoint}/${objectPath}`;
}

function createR2Client(config: R2SigningConfig) {
  return new AwsClient({
    accessKeyId: config.accessKeyId,
    secretAccessKey: config.secretAccessKey,
    region: 'auto',
    service: 's3',
  });
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
  if (params.contentType) {
    headers.set('Content-Type', params.contentType);
  }

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

async function headR2Object(key: string): Promise<GenjutsuObjectMetadata> {
  const result = await headR2ObjectResult(key);
  if (result.status === 'ok') return result.metadata;
  if (result.status === 'missing') {
    throw new Error(`Uploaded media is missing from R2: ${key}`);
  }
  throw new Error(
    `Failed to inspect R2 object ${key}: ${result.error}${
      result.httpStatus != null ? ` (HTTP ${result.httpStatus})` : ''
    }`
  );
}

type HeadR2ObjectResult =
  | { status: 'ok'; metadata: GenjutsuObjectMetadata }
  | { status: 'missing' }
  | { status: 'error'; error: string; httpStatus?: number };

async function headR2ObjectResult(key: string): Promise<HeadR2ObjectResult> {
  try {
    const config = await getR2SigningConfig();
    const response = await createR2Client(config).fetch(
      new Request(buildR2ObjectUrl(config, key), { method: 'HEAD' })
    );

    if (response.status === 404) {
      return { status: 'missing' };
    }

    if (!response.ok) {
      return {
        status: 'error',
        error: `HEAD failed with HTTP ${response.status}`,
        httpStatus: response.status,
      };
    }

    const rawLength = response.headers.get('content-length');
    const contentLength = rawLength ? Number(rawLength) : NaN;
    const contentType =
      response.headers
        .get('content-type')
        ?.split(';', 1)[0]
        ?.trim()
        .toLowerCase() || '';

    if (!Number.isSafeInteger(contentLength) || contentLength <= 0) {
      return {
        status: 'error',
        error: 'R2 object has an invalid content length',
        httpStatus: response.status,
      };
    }

    return {
      status: 'ok',
      metadata: {
        contentLength,
        contentType,
        etag: response.headers.get('etag') || undefined,
      },
    };
  } catch (error) {
    return {
      status: 'error',
      error:
        error instanceof Error
          ? error.message.slice(0, 200)
          : 'HEAD request failed',
    };
  }
}

export function assertGenjutsuStagingKeyOwned(params: {
  userId: string;
  generationId: string;
  fileIndex: number;
  key: string;
}) {
  assertSafeObjectKey(params.key);
  const prefix = getGenjutsuInputPrefix(params);
  const escapedPrefix = escapeRegExp(prefix);

  if (params.fileIndex === 0) {
    const sourcePattern = new RegExp(
      `^${escapedPrefix}source\\.(?:mp4|mov|webm)$`
    );
    if (!sourcePattern.test(params.key)) {
      throw new Error('Invalid Genjutsu source-video storage key');
    }
    return;
  }

  const expectedName = `reference-${String(params.fileIndex).padStart(2, '0')}`;
  const referencePattern = new RegExp(
    `^${escapedPrefix}${escapeRegExp(expectedName)}\\.(?:jpg|png|webp|gif|avif|heic|heif)$`
  );
  if (!referencePattern.test(params.key)) {
    throw new Error('Invalid Genjutsu reference-image storage key');
  }
}

export type GenjutsuStagingObjectInspection = {
  exists: boolean | null;
  sizeMatches: boolean | null;
  typeMatches: boolean | null;
  contentLength: number | null;
  contentType: string | null;
  inspectionStatus: 'ok' | 'missing' | 'error';
  inspectionError: string | null;
};

export async function inspectGenjutsuStagingObject(params: {
  userId: string;
  generationId: string;
  fileIndex: number;
  storageKey: string;
  expectedContentType?: string;
  expectedContentLength?: number;
}): Promise<GenjutsuStagingObjectInspection> {
  assertGenjutsuStagingKeyOwned({
    userId: params.userId,
    generationId: params.generationId,
    fileIndex: params.fileIndex,
    key: params.storageKey,
  });

  const head = await headR2ObjectResult(params.storageKey);

  if (head.status === 'missing') {
    return {
      exists: false,
      sizeMatches: false,
      typeMatches: false,
      contentLength: null,
      contentType: null,
      inspectionStatus: 'missing',
      inspectionError: null,
    };
  }

  if (head.status === 'error') {
    return {
      exists: null,
      sizeMatches: null,
      typeMatches: null,
      contentLength: null,
      contentType: null,
      inspectionStatus: 'error',
      inspectionError: head.error,
    };
  }

  const metadata = head.metadata;
  const expectedType = params.expectedContentType
    ?.split(';', 1)[0]
    ?.trim()
    .toLowerCase();
  const typeMatches = expectedType
    ? metadata.contentType === expectedType
    : true;
  const sizeMatches =
    Number.isSafeInteger(params.expectedContentLength) &&
    params.expectedContentLength! > 0
      ? metadata.contentLength === params.expectedContentLength
      : true;

  return {
    exists: true,
    sizeMatches,
    typeMatches,
    contentLength: metadata.contentLength,
    contentType: metadata.contentType,
    inspectionStatus: 'ok',
    inspectionError: null,
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

  const sourcePath = encodePath(
    [config.bucket, config.uploadPath, params.sourceKey]
      .filter(Boolean)
      .join('/')
  );
  const headers = new Headers({
    'x-amz-copy-source': `/${sourcePath}`,
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
    const detail = await response.text().catch(() => '');
    throw new Error(
      `Failed to seal Genjutsu input: HTTP ${response.status}${detail ? ` - ${detail.slice(0, 300)}` : ''}`
    );
  }
}

export function getGenjutsuInputPrefix(params: {
  userId: string;
  generationId: string;
}) {
  return `genjutsu/inputs/${safeSegment(params.userId)}/${safeSegment(
    params.generationId
  )}/`;
}

export function getGenjutsuSealedInputPrefix(params: {
  userId: string;
  generationId: string;
}) {
  return `genjutsu/sealed-inputs/${safeSegment(params.userId)}/${safeSegment(
    params.generationId
  )}/`;
}

export function getGenjutsuSealedInputKey(params: {
  userId: string;
  generationId: string;
  stagingKey: string;
}) {
  const stagingPrefix = getGenjutsuInputPrefix(params);
  if (!params.stagingKey.startsWith(stagingPrefix)) {
    throw new Error('Invalid Genjutsu staging input key');
  }
  const filename = params.stagingKey.slice(stagingPrefix.length);
  if (!filename || filename.includes('/')) {
    throw new Error('Invalid Genjutsu staging input key');
  }
  return `${getGenjutsuSealedInputPrefix(params)}${filename}`;
}

export function getGenjutsuInputKey(params: {
  userId: string;
  generationId: string;
  index: number;
  contentType: string;
}) {
  const normalized = contentTypeExtension(params.contentType, params.index);
  const prefix = getGenjutsuInputPrefix(params);
  const key =
    params.index === 0
      ? `${prefix}source.${normalized.ext}`
      : `${prefix}reference-${String(params.index).padStart(2, '0')}.${normalized.ext}`;

  return { key, contentType: normalized.contentType };
}

export function assertGenjutsuInputKeysOwned(params: {
  userId: string;
  generationId: string;
  videoKey: string;
  imageKeys: string[];
}) {
  const prefix = getGenjutsuInputPrefix(params);
  const escapedPrefix = escapeRegExp(prefix);
  const sourcePattern = new RegExp(
    `^${escapedPrefix}source\\.(?:mp4|mov|webm)$`
  );
  const referencePattern = new RegExp(
    `^${escapedPrefix}reference-0[1-8]\\.(?:jpg|png|webp|gif|avif|heic|heif)$`
  );

  assertSafeObjectKey(params.videoKey);
  if (!sourcePattern.test(params.videoKey)) {
    throw new Error('Invalid Genjutsu source-video storage key');
  }

  if (
    !Array.isArray(params.imageKeys) ||
    params.imageKeys.length < 1 ||
    params.imageKeys.length > 8 ||
    new Set(params.imageKeys).size !== params.imageKeys.length
  ) {
    throw new Error('Invalid Genjutsu reference-image storage keys');
  }

  for (const key of params.imageKeys) {
    assertSafeObjectKey(key);
    if (!referencePattern.test(key)) {
      throw new Error('Invalid Genjutsu reference-image storage keys');
    }
  }
}

export function assertGenjutsuSourceVideoKeyOwned(params: {
  userId: string;
  generationId: string;
  videoKey: string;
}) {
  assertSafeObjectKey(params.videoKey);
  const stagingPrefix = getGenjutsuInputPrefix(params);
  const sealedPrefix = getGenjutsuSealedInputPrefix(params);
  const stagingPattern = new RegExp(
    `^${escapeRegExp(stagingPrefix)}source\\.(?:mp4|mov|webm)$`
  );
  const sealedPattern = new RegExp(
    `^${escapeRegExp(sealedPrefix)}source\\.(?:mp4|mov|webm)$`
  );
  if (
    !stagingPattern.test(params.videoKey) &&
    !sealedPattern.test(params.videoKey)
  ) {
    throw new Error('Invalid Genjutsu source-video storage key');
  }
}

export function assertGenjutsuSealedInputKeysOwned(params: {
  userId: string;
  generationId: string;
  videoKey: string;
  imageKeys: string[];
}) {
  const prefix = getGenjutsuSealedInputPrefix(params);
  const escapedPrefix = escapeRegExp(prefix);
  const sourcePattern = new RegExp(
    `^${escapedPrefix}source\\.(?:mp4|mov|webm)$`
  );
  const referencePattern = new RegExp(
    `^${escapedPrefix}reference-0[1-8]\\.(?:jpg|png|webp|gif|avif|heic|heif)$`
  );

  assertSafeObjectKey(params.videoKey);
  if (!sourcePattern.test(params.videoKey)) {
    throw new Error('Invalid sealed Genjutsu source-video storage key');
  }

  if (
    !Array.isArray(params.imageKeys) ||
    params.imageKeys.length < 1 ||
    params.imageKeys.length > 8 ||
    new Set(params.imageKeys).size !== params.imageKeys.length
  ) {
    throw new Error('Invalid sealed Genjutsu reference-image storage keys');
  }

  for (const key of params.imageKeys) {
    assertSafeObjectKey(key);
    if (!referencePattern.test(key)) {
      throw new Error('Invalid sealed Genjutsu reference-image storage keys');
    }
  }
}

export function assertGenjutsuObjectMetadata(params: {
  key: string;
  index: number;
  metadata: GenjutsuObjectMetadata;
}) {
  assertGenjutsuUploadSize(params.index, params.metadata.contentLength);

  const expectedGroup = params.index === 0 ? 'video/' : 'image/';
  if (!params.metadata.contentType.startsWith(expectedGroup)) {
    throw new Error(
      params.index === 0
        ? 'Uploaded source is not a video'
        : 'Uploaded reference is not an image'
    );
  }

  const extension = params.key.split('.').pop()?.toLowerCase() || '';
  const expectedExtensions =
    params.index === 0
      ? Object.values(VIDEO_CONTENT_TYPES)
      : Object.values(IMAGE_CONTENT_TYPES);

  if (!expectedExtensions.includes(extension)) {
    throw new Error('Uploaded media has an unsupported file extension');
  }
}

export async function createGenjutsuR2UploadDescriptor(params: {
  userId: string;
  generationId: string;
  index: number;
  contentType: string;
  contentLength: number;
}) {
  assertGenjutsuUploadSize(params.index, params.contentLength);
  const normalized = getGenjutsuInputKey(params);

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
    uploadMode: 'signed' as const,
  };
}

/**
 * Same-origin upload URL (browser → Worker → R2). Avoids Android Chrome
 * Failed-to-fetch against `*.r2.cloudflarestorage.com`.
 */
export function createGenjutsuProxyUploadDescriptor(
  request: Request,
  params: {
    userId: string;
    generationId: string;
    index: number;
    contentType: string;
    contentLength: number;
  }
) {
  assertGenjutsuUploadSize(params.index, params.contentLength);
  if (params.contentLength > GENJUTSU_PROXY_UPLOAD_MAX_BYTES) {
    throw new Error(
      `Proxy upload supports files up to ${Math.floor(GENJUTSU_PROXY_UPLOAD_MAX_BYTES / 1024 / 1024)} MB`
    );
  }

  const normalized = getGenjutsuInputKey(params);
  const origin = new URL(request.url).origin;
  const uploadUrl = `${origin}/api/genjutsu/upload/${encodeURIComponent(
    params.generationId
  )}/${params.index}`;

  return {
    uploadUrl,
    uploadHeaders: {
      'Content-Type': normalized.contentType,
    },
    storageKey: normalized.key,
    uploadMode: 'proxy' as const,
  };
}

/**
 * Write a staging object. Prefers the Workers R2 binding (streamed); falls
 * back to the S3-compatible API for local Node without a binding.
 */
export async function putGenjutsuStagingObject(params: {
  key: string;
  body: ReadableStream | ArrayBuffer | ArrayBufferView | Blob;
  contentType: string;
  contentLength: number;
}) {
  assertSafeObjectKey(params.key);
  if (!params.key.startsWith('genjutsu/inputs/')) {
    throw new Error('Invalid Genjutsu staging key');
  }
  assertGenjutsuUploadSize(
    params.key.includes('/source.') ? 0 : 1,
    params.contentLength
  );

  const config = await getR2SigningConfig();
  const objectKey = [config.uploadPath, params.key].filter(Boolean).join('/');
  const binding = getR2BucketBinding();

  if (binding) {
    await binding.put(objectKey, params.body, {
      httpMetadata: { contentType: params.contentType },
    });
    return { via: 'binding' as const, objectKey };
  }

  // Local / non-Workers: buffer + signed PUT (fine for dev-sized files).
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
      body: bytes,
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

export async function createGenjutsuR2ReadUrl(key: string) {
  assertSafeObjectKey(key);
  if (!key.startsWith('genjutsu/')) {
    throw new Error('Invalid Genjutsu storage key');
  }

  const signed = await signR2Object({
    key,
    method: 'GET',
    expiresSeconds: READ_EXPIRES_SECONDS,
  });
  return signed.url;
}

export async function sealGenjutsuR2Inputs(params: {
  userId: string;
  generationId: string;
  videoKey: string;
  imageKeys: string[];
  expectedContentTypes?: string[];
  expectedContentLengths?: number[];
}) {
  assertGenjutsuInputKeysOwned(params);

  const sourceKeys = [params.videoKey, ...params.imageKeys];
  const metadata = await Promise.all(
    sourceKeys.map((key) => headR2Object(key))
  );

  metadata.forEach((item, index) => {
    assertGenjutsuObjectMetadata({
      key: sourceKeys[index],
      index,
      metadata: item,
    });

    const expectedType = params.expectedContentTypes?.[index]
      ?.split(';', 1)[0]
      ?.trim()
      .toLowerCase();
    if (expectedType && item.contentType !== expectedType) {
      throw new Error('Uploaded media content type changed before sealing');
    }

    const expectedLength = params.expectedContentLengths?.[index];
    if (
      Number.isSafeInteger(expectedLength) &&
      expectedLength! > 0 &&
      item.contentLength !== expectedLength
    ) {
      throw new Error('Uploaded media size changed before sealing');
    }
  });

  const sealedKeys = sourceKeys.map((sourceKey) =>
    getGenjutsuSealedInputKey({
      userId: params.userId,
      generationId: params.generationId,
      stagingKey: sourceKey,
    })
  );

  await Promise.all(
    sourceKeys.map((sourceKey, index) =>
      copyR2Object({
        sourceKey,
        destinationKey: sealedKeys[index],
        sourceEtag: metadata[index].etag,
      })
    )
  );

  const sealedMetadata = await Promise.all(
    sealedKeys.map((key) => headR2Object(key))
  );
  sealedMetadata.forEach((item, index) => {
    assertGenjutsuObjectMetadata({
      key: sealedKeys[index],
      index,
      metadata: item,
    });
    if (
      item.contentLength !== metadata[index].contentLength ||
      item.contentType !== metadata[index].contentType
    ) {
      throw new Error('Sealed Genjutsu input does not match uploaded media');
    }
  });

  return {
    videoKey: sealedKeys[0],
    imageKeys: sealedKeys.slice(1),
  };
}

export async function resolveGenjutsuInputUrls(params: {
  userId: string;
  generationId: string;
  videoKey: string;
  imageKeys: string[];
}) {
  assertGenjutsuSealedInputKeysOwned(params);

  const storage = await getStorage();
  if (!storage) {
    throw new Error('R2 storage is not configured');
  }

  const keys = [params.videoKey, ...params.imageKeys];
  const metadata = await Promise.all(keys.map((key) => headR2Object(key)));

  metadata.forEach((item, index) =>
    assertGenjutsuObjectMetadata({
      key: keys[index],
      index,
      metadata: item,
    })
  );

  const [videoUrl, ...imageUrls] = await Promise.all(
    keys.map((key) => createGenjutsuR2ReadUrl(key))
  );

  return {
    videoUrl,
    imageUrls,
  };
}

export function getGenjutsuResultKey(params: {
  userId: string;
  generationId: string;
}) {
  return `genjutsu/results/${safeSegment(params.userId)}/${safeSegment(
    params.generationId
  )}.mp4`;
}

export function assertGenjutsuResultKeyOwned(params: {
  userId: string;
  generationId: string;
  videoKey: string;
}) {
  assertSafeObjectKey(params.videoKey);
  if (params.videoKey !== getGenjutsuResultKey(params)) {
    throw new Error('Invalid Genjutsu result-video storage key');
  }
}

export async function persistGenjutsuResultToR2(params: {
  userId: string;
  generationId: string;
  sourceUrl: string;
}) {
  const storage = await getStorage();
  if (!storage) {
    throw new Error('R2 storage is not configured');
  }

  const videoKey = getGenjutsuResultKey(params);
  const alreadyStored = await storage.exists({ key: videoKey });

  if (!alreadyStored) {
    const copied = await storage.downloadAndUpload({
      url: params.sourceUrl,
      key: videoKey,
      contentType: 'video/mp4',
      disposition: 'inline',
    });

    if (!copied.success) {
      throw new Error(
        copied.error || 'Failed to persist Genjutsu result to R2'
      );
    }
  }

  return { videoKey };
}
