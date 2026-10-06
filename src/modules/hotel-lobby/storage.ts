import { AwsClient } from 'aws4fetch';

import { envConfigs } from '@/config';
import { getAllConfigs } from '@/modules/config/service';
import { getStorage } from '@/modules/storage/service';

import { probeHotelLobbyDurationSeconds } from './video-metadata';

const UPLOAD_EXPIRES_SECONDS = 10 * 60;
const READ_EXPIRES_SECONDS = 60 * 60;

export const HOTEL_LOBBY_MAX_VIDEO_BYTES = 80 * 1024 * 1024;
export const HOTEL_LOBBY_MAX_IMAGE_BYTES = 12 * 1024 * 1024;
export const HOTEL_LOBBY_MAX_REFERENCE_IMAGES = 2;

const VIDEO_CONTENT_TYPES: Record<string, string> = {
  'video/mp4': 'mp4',
  'video/quicktime': 'mov',
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

type ObjectMetadata = {
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
    throw new Error('Invalid Hotel Lobby storage key');
  }
}

function encodePath(value: string) {
  return value
    .split('/')
    .filter(Boolean)
    .map((segment) => encodeURIComponent(segment))
    .join('/');
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
  const objectPath = encodePath(
    [config.bucket, config.uploadPath, key].filter(Boolean).join('/')
  );
  return `${config.endpoint}/${objectPath}`;
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

function contentTypeExtension(contentType: string, index: number) {
  const normalized = contentType.split(';', 1)[0]?.trim().toLowerCase() || '';
  const ext =
    index === 0
      ? VIDEO_CONTENT_TYPES[normalized]
      : IMAGE_CONTENT_TYPES[normalized];

  if (!ext) {
    throw new Error(
      index === 0
        ? 'Unsupported reference-video content type. Use MP4 or MOV.'
        : 'Unsupported reference-image content type'
    );
  }

  return { contentType: normalized, ext };
}

export function assertHotelLobbyUploadSize(
  index: number,
  contentLength: number
) {
  const maxBytes =
    index === 0 ? HOTEL_LOBBY_MAX_VIDEO_BYTES : HOTEL_LOBBY_MAX_IMAGE_BYTES;

  if (
    !Number.isSafeInteger(contentLength) ||
    contentLength <= 0 ||
    contentLength > maxBytes
  ) {
    const maxMb = Math.floor(maxBytes / 1024 / 1024);
    throw new Error(
      index === 0
        ? `Reference video must be ${maxMb} MB or smaller`
        : `Reference images must be ${maxMb} MB or smaller`
    );
  }
}

export function getHotelLobbyInputPrefix(params: {
  userId: string;
  generationId: string;
}) {
  return `hotel-lobby/inputs/${safeSegment(params.userId)}/${safeSegment(
    params.generationId
  )}/`;
}

export function getHotelLobbySealedInputPrefix(params: {
  userId: string;
  generationId: string;
}) {
  return `hotel-lobby/sealed-inputs/${safeSegment(
    params.userId
  )}/${safeSegment(params.generationId)}/`;
}

export function getHotelLobbyInputKey(params: {
  userId: string;
  generationId: string;
  index: number;
  contentType: string;
}) {
  if (!Number.isInteger(params.index) || params.index < 0 || params.index > 2) {
    throw new Error('Invalid Hotel Lobby input index');
  }

  const normalized = contentTypeExtension(params.contentType, params.index);
  const prefix = getHotelLobbyInputPrefix(params);
  const key =
    params.index === 0
      ? `${prefix}video.${normalized.ext}`
      : `${prefix}image-${String(params.index).padStart(2, '0')}.${normalized.ext}`;

  return { key, contentType: normalized.contentType };
}

function assertHotelLobbyInputKey(params: {
  userId: string;
  generationId: string;
  index: number;
  key: string;
  sealed: boolean;
}) {
  assertSafeObjectKey(params.key);
  const prefix = params.sealed
    ? getHotelLobbySealedInputPrefix(params)
    : getHotelLobbyInputPrefix(params);
  const escapedPrefix = escapeRegExp(prefix);

  if (params.index === 0) {
    const pattern = new RegExp(`^${escapedPrefix}video\\.(?:mp4|mov)$`);
    if (!pattern.test(params.key)) {
      throw new Error('Invalid Hotel Lobby reference-video key');
    }
    return;
  }

  if (params.index < 1 || params.index > HOTEL_LOBBY_MAX_REFERENCE_IMAGES) {
    throw new Error('Invalid Hotel Lobby reference-image index');
  }

  const name = `image-${String(params.index).padStart(2, '0')}`;
  const pattern = new RegExp(
    `^${escapedPrefix}${escapeRegExp(
      name
    )}\\.(?:jpg|png|webp|gif|avif|heic|heif)$`
  );
  if (!pattern.test(params.key)) {
    throw new Error('Invalid Hotel Lobby reference-image key');
  }
}

export async function createHotelLobbyUploadDescriptor(params: {
  userId: string;
  generationId: string;
  index: number;
  contentType: string;
  contentLength: number;
}) {
  assertHotelLobbyUploadSize(params.index, params.contentLength);
  const normalized = getHotelLobbyInputKey(params);
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
    index: params.index,
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
    throw new Error(
      `Failed to seal Hotel Lobby input: HTTP ${response.status}`
    );
  }
}

export function getHotelLobbyTemplateVideoKey() {
  const key =
    envConfigs.hotel_lobby_template_video_key?.trim() ||
    'hotel-lobby/templates/default.mp4';
  assertSafeObjectKey(key);
  if (!key.startsWith('hotel-lobby/')) {
    throw new Error('Hotel Lobby template must use the hotel-lobby/ R2 prefix');
  }
  return key;
}

export async function getHotelLobbyTemplatePreviewUrl() {
  const key = getHotelLobbyTemplateVideoKey();
  const metadata = await headR2Object(key);
  assertHotelLobbyUploadSize(0, metadata.contentLength);
  if (!VIDEO_CONTENT_TYPES[metadata.contentType]) {
    throw new Error('Hotel Lobby template must be MP4 or MOV');
  }
  return createHotelLobbyR2ReadUrl(key);
}

export async function getHotelLobbyTemplateDurationSeconds() {
  const url = await getHotelLobbyTemplatePreviewUrl();
  return probeHotelLobbyDurationSeconds(url);
}

export async function sealHotelLobbyInputs(params: {
  userId: string;
  generationId: string;
  useDefaultTemplate: boolean;
  videoKey?: string;
  imageKeys: string[];
  contentTypes: string[];
  contentLengths: number[];
}) {
  if (
    params.imageKeys.length < 1 ||
    params.imageKeys.length > HOTEL_LOBBY_MAX_REFERENCE_IMAGES
  ) {
    throw new Error('Hotel Lobby requires one or two reference images');
  }

  const expectedUploadCount =
    params.imageKeys.length + (params.useDefaultTemplate ? 0 : 1);
  if (
    params.contentTypes.length !== expectedUploadCount ||
    params.contentLengths.length !== expectedUploadCount
  ) {
    throw new Error('Invalid Hotel Lobby input set');
  }

  const stagingPrefix = getHotelLobbyInputPrefix(params);
  const sealedPrefix = getHotelLobbySealedInputPrefix(params);

  const uploadedEntries: Array<{
    key: string;
    index: number;
    expectedContentType: string;
    expectedContentLength: number;
  }> = [];

  if (!params.useDefaultTemplate) {
    if (!params.videoKey) {
      throw new Error('A custom reference video is required');
    }
    uploadedEntries.push({
      key: params.videoKey,
      index: 0,
      expectedContentType: params.contentTypes[0],
      expectedContentLength: params.contentLengths[0],
    });
  }

  params.imageKeys.forEach((key, imageIndex) => {
    const contentOffset = params.useDefaultTemplate
      ? imageIndex
      : imageIndex + 1;
    uploadedEntries.push({
      key,
      index: imageIndex + 1,
      expectedContentType: params.contentTypes[contentOffset],
      expectedContentLength: params.contentLengths[contentOffset],
    });
  });

  uploadedEntries.forEach((entry) =>
    assertHotelLobbyInputKey({
      userId: params.userId,
      generationId: params.generationId,
      index: entry.index,
      key: entry.key,
      sealed: false,
    })
  );

  const uploadedMetadata = await Promise.all(
    uploadedEntries.map((entry) => headR2Object(entry.key))
  );

  uploadedMetadata.forEach((item, arrayIndex) => {
    const entry = uploadedEntries[arrayIndex];
    assertHotelLobbyUploadSize(entry.index, item.contentLength);
    const expectedType =
      entry.expectedContentType?.split(';', 1)[0]?.trim().toLowerCase() || '';
    if (!expectedType || item.contentType !== expectedType) {
      throw new Error('Uploaded media content type changed before generation');
    }
    if (item.contentLength !== entry.expectedContentLength) {
      throw new Error('Uploaded media size changed before generation');
    }
  });

  let sourceVideoKey: string;
  let sourceVideoMetadata: ObjectMetadata;
  let sealedVideoKey: string;

  if (params.useDefaultTemplate) {
    sourceVideoKey = getHotelLobbyTemplateVideoKey();
    sourceVideoMetadata = await headR2Object(sourceVideoKey);
    assertHotelLobbyUploadSize(0, sourceVideoMetadata.contentLength);
    const videoExt = VIDEO_CONTENT_TYPES[sourceVideoMetadata.contentType];
    if (!videoExt) {
      throw new Error('Hotel Lobby template must be MP4 or MOV');
    }
    sealedVideoKey = `${sealedPrefix}video.${videoExt}`;
  } else {
    sourceVideoKey = params.videoKey as string;
    sourceVideoMetadata = uploadedMetadata[0];
    const filename = sourceVideoKey.slice(stagingPrefix.length);
    if (!filename || filename.includes('/')) {
      throw new Error('Invalid Hotel Lobby staging video key');
    }
    sealedVideoKey = `${sealedPrefix}${filename}`;
  }

  const imageEntryOffset = params.useDefaultTemplate ? 0 : 1;
  const sealedImageKeys = params.imageKeys.map((key) => {
    const filename = key.slice(stagingPrefix.length);
    if (!filename || filename.includes('/')) {
      throw new Error('Invalid Hotel Lobby staging image key');
    }
    return `${sealedPrefix}${filename}`;
  });

  await copyR2Object({
    sourceKey: sourceVideoKey,
    destinationKey: sealedVideoKey,
    sourceEtag: sourceVideoMetadata.etag,
  });

  await Promise.all(
    params.imageKeys.map((sourceKey, index) =>
      copyR2Object({
        sourceKey,
        destinationKey: sealedImageKeys[index],
        sourceEtag: uploadedMetadata[index + imageEntryOffset]?.etag,
      })
    )
  );

  assertHotelLobbyInputKey({
    userId: params.userId,
    generationId: params.generationId,
    index: 0,
    key: sealedVideoKey,
    sealed: true,
  });
  sealedImageKeys.forEach((key, index) =>
    assertHotelLobbyInputKey({
      userId: params.userId,
      generationId: params.generationId,
      index: index + 1,
      key,
      sealed: true,
    })
  );

  const sealedMetadata = await Promise.all(
    [sealedVideoKey, ...sealedImageKeys].map((key) => headR2Object(key))
  );

  if (
    sealedMetadata[0].contentLength !== sourceVideoMetadata.contentLength ||
    sealedMetadata[0].contentType !== sourceVideoMetadata.contentType
  ) {
    throw new Error('Sealed Hotel Lobby video does not match its source');
  }

  sealedImageKeys.forEach((_, index) => {
    const sourceMetadata = uploadedMetadata[index + imageEntryOffset];
    const sealed = sealedMetadata[index + 1];
    if (
      !sourceMetadata ||
      sealed.contentLength !== sourceMetadata.contentLength ||
      sealed.contentType !== sourceMetadata.contentType
    ) {
      throw new Error('Sealed Hotel Lobby image does not match uploaded media');
    }
  });

  return {
    videoKey: sealedVideoKey,
    imageKeys: sealedImageKeys,
  };
}

export async function createHotelLobbyR2ReadUrl(key: string) {
  assertSafeObjectKey(key);
  if (!key.startsWith('hotel-lobby/')) {
    throw new Error('Invalid Hotel Lobby storage key');
  }
  const signed = await signR2Object({
    key,
    method: 'GET',
    expiresSeconds: READ_EXPIRES_SECONDS,
  });
  return signed.url;
}

export async function resolveHotelLobbyInputUrls(params: {
  userId: string;
  generationId: string;
  videoKey: string;
  imageKeys: string[];
}) {
  if (
    params.imageKeys.length < 1 ||
    params.imageKeys.length > HOTEL_LOBBY_MAX_REFERENCE_IMAGES
  ) {
    throw new Error('Hotel Lobby requires one or two reference images');
  }

  const keys = [params.videoKey, ...params.imageKeys];
  keys.forEach((key, index) =>
    assertHotelLobbyInputKey({
      userId: params.userId,
      generationId: params.generationId,
      index,
      key,
      sealed: true,
    })
  );

  await Promise.all(keys.map((key) => headR2Object(key)));
  const [videoUrl, ...imageUrls] = await Promise.all(
    keys.map((key) => createHotelLobbyR2ReadUrl(key))
  );

  return { videoUrl, imageUrls };
}

export function getHotelLobbyResultKey(params: {
  userId: string;
  generationId: string;
}) {
  return `hotel-lobby/results/${safeSegment(params.userId)}/${safeSegment(
    params.generationId
  )}.mp4`;
}

export function assertHotelLobbyResultKeyOwned(params: {
  userId: string;
  generationId: string;
  videoKey: string;
}) {
  assertSafeObjectKey(params.videoKey);
  if (params.videoKey !== getHotelLobbyResultKey(params)) {
    throw new Error('Invalid Hotel Lobby result key');
  }
}

export async function persistHotelLobbyResultToR2(params: {
  userId: string;
  generationId: string;
  sourceUrl: string;
}) {
  const storage = await getStorage();
  if (!storage) throw new Error('R2 storage is not configured');

  const videoKey = getHotelLobbyResultKey(params);
  const exists = await storage.exists({ key: videoKey });

  if (!exists) {
    const copied = await storage.downloadAndUpload({
      url: params.sourceUrl,
      key: videoKey,
      contentType: 'video/mp4',
      disposition: 'inline',
    });
    if (!copied.success) {
      throw new Error(copied.error || 'Failed to persist Hotel Lobby result');
    }
  }

  return { videoKey };
}
