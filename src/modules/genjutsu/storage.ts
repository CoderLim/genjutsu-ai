import { AwsClient } from 'aws4fetch';

import { getAllConfigs } from '@/modules/config/service';
import { getStorage } from '@/modules/storage/service';

const UPLOAD_EXPIRES_SECONDS = 5 * 60;
const READ_EXPIRES_SECONDS = 60 * 60;

export const GENJUTSU_MAX_VIDEO_BYTES = 200 * 1024 * 1024;
export const GENJUTSU_MAX_IMAGE_BYTES = 12 * 1024 * 1024;

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
  const config = await getR2SigningConfig();
  const response = await createR2Client(config).fetch(
    new Request(buildR2ObjectUrl(config, key), { method: 'HEAD' })
  );

  if (!response.ok) {
    throw new Error(`Uploaded media is missing from R2: ${key}`);
  }

  const rawLength = response.headers.get('content-length');
  const contentLength = rawLength ? Number(rawLength) : NaN;
  const contentType =
    response.headers.get('content-type')?.split(';', 1)[0]?.trim().toLowerCase() ||
    '';

  if (!Number.isSafeInteger(contentLength) || contentLength <= 0) {
    throw new Error(`R2 object has an invalid content length: ${key}`);
  }

  return { contentLength, contentType };
}

export function getGenjutsuInputPrefix(params: {
  userId: string;
  generationId: string;
}) {
  return `genjutsu/inputs/${safeSegment(params.userId)}/${safeSegment(
    params.generationId
  )}/`;
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
  };
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

export async function resolveGenjutsuInputUrls(params: {
  userId: string;
  generationId: string;
  videoKey: string;
  imageKeys: string[];
}) {
  assertGenjutsuInputKeysOwned(params);

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
      throw new Error(copied.error || 'Failed to persist Genjutsu result to R2');
    }
  }

  return { videoKey };
}
