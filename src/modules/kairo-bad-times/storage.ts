import { AwsClient } from 'aws4fetch';

import {
  buildR2CopySourceHeader,
  buildR2S3ObjectUrl,
  resolveR2SigningConfigFromMap,
  type R2SigningConfig,
} from '@/lib/r2-signing-config';

import { envConfigs } from '@/config';
import { getAllConfigs } from '@/modules/config/service';
import { getStorage } from '@/modules/storage/service';

import {
  KAIRO_BAD_TIMES_DEFAULT_PET_PREVIEW_TEMPLATE_VIDEO_KEY,
  KAIRO_BAD_TIMES_DEFAULT_PET_TEMPLATE_VIDEO_KEY,
  KAIRO_BAD_TIMES_DEFAULT_PREVIEW_TEMPLATE_VIDEO_KEY,
  KAIRO_BAD_TIMES_DEFAULT_TEMPLATE_VIDEO_KEY,
  KAIRO_BAD_TIMES_LOCAL_PET_PREVIEW_TEMPLATE_PATH,
  KAIRO_BAD_TIMES_LOCAL_PET_TEMPLATE_PATH,
  KAIRO_BAD_TIMES_LOCAL_PREVIEW_TEMPLATE_PATH,
  KAIRO_BAD_TIMES_LOCAL_TEMPLATE_PATH,
  type KairoBadTimesSubject,
} from './constants';
import { KAIRO_BAD_TIMES_MAX_IMAGE_BYTES } from './pricing';
import {
  normalizeKairoBadTimesDuration,
  probeKairoBadTimesDurationSecondsRaw,
  probeKairoBadTimesLocalFileDurationSecondsRaw,
} from './video-metadata';

const UPLOAD_EXPIRES_SECONDS = 10 * 60;
const READ_EXPIRES_SECONDS = 60 * 60;
const STORAGE_PREFIX = 'kairo-bad-times/';

export { KAIRO_BAD_TIMES_MAX_IMAGE_BYTES };

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
    throw new Error('Invalid Kairo Bad Times storage key');
  }
}

function assertKairoBadTimesKeyPrefix(key: string) {
  assertSafeObjectKey(key);
  if (!key.startsWith(STORAGE_PREFIX)) {
    throw new Error(
      'Kairo Bad Times storage keys must use the kairo-bad-times/ prefix'
    );
  }
}

function isCloudflareWorkersRuntime() {
  const env = (globalThis as any).__CF_ENV__ ?? (globalThis as any).__env__;
  return Boolean(env);
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
  assertKairoBadTimesKeyPrefix(key);
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

function imageContentTypeExtension(contentType: string) {
  const normalized = contentType.split(';', 1)[0]?.trim().toLowerCase() || '';
  const ext = IMAGE_CONTENT_TYPES[normalized];
  if (!ext) {
    throw new Error('Unsupported reference-image content type');
  }
  return { contentType: normalized, ext };
}

export function assertKairoBadTimesUploadSize(contentLength: number) {
  if (
    !Number.isSafeInteger(contentLength) ||
    contentLength <= 0 ||
    contentLength > KAIRO_BAD_TIMES_MAX_IMAGE_BYTES
  ) {
    const maxMb = Math.floor(KAIRO_BAD_TIMES_MAX_IMAGE_BYTES / 1024 / 1024);
    throw new Error(`Reference image must be ${maxMb} MB or smaller`);
  }
}

export function getKairoBadTimesInputPrefix(params: {
  userId: string;
  generationId: string;
}) {
  return `${STORAGE_PREFIX}inputs/${safeSegment(params.userId)}/${safeSegment(
    params.generationId
  )}/`;
}

export function getKairoBadTimesSealedInputPrefix(params: {
  userId: string;
  generationId: string;
}) {
  return `${STORAGE_PREFIX}sealed-inputs/${safeSegment(
    params.userId
  )}/${safeSegment(params.generationId)}/`;
}

export function getKairoBadTimesInputKey(params: {
  userId: string;
  generationId: string;
  contentType: string;
}) {
  const normalized = imageContentTypeExtension(params.contentType);
  const prefix = getKairoBadTimesInputPrefix(params);
  const key = `${prefix}image.${normalized.ext}`;
  return { key, contentType: normalized.contentType };
}

function assertKairoBadTimesInputKey(params: {
  userId: string;
  generationId: string;
  key: string;
  sealed: boolean;
}) {
  assertKairoBadTimesKeyPrefix(params.key);
  const prefix = params.sealed
    ? getKairoBadTimesSealedInputPrefix(params)
    : getKairoBadTimesInputPrefix(params);
  const escapedPrefix = escapeRegExp(prefix);
  const pattern = new RegExp(
    `^${escapedPrefix}image\\.(?:jpg|png|webp|gif|avif|heic|heif)$`
  );
  if (!pattern.test(params.key)) {
    throw new Error('Invalid Kairo Bad Times reference-image key');
  }
}

export function assertKairoBadTimesSealedImageKeyOwned(params: {
  userId: string;
  generationId: string;
  imageKey: string;
}) {
  assertKairoBadTimesInputKey({
    userId: params.userId,
    generationId: params.generationId,
    key: params.imageKey,
    sealed: true,
  });
}

export async function createKairoBadTimesUploadDescriptor(params: {
  userId: string;
  generationId: string;
  contentType: string;
  contentLength: number;
}) {
  assertKairoBadTimesUploadSize(params.contentLength);
  const normalized = getKairoBadTimesInputKey(params);
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

async function copyR2Object(params: {
  sourceKey: string;
  destinationKey: string;
  sourceEtag?: string;
}) {
  const config = await getR2SigningConfig();
  assertKairoBadTimesKeyPrefix(params.sourceKey);
  assertKairoBadTimesKeyPrefix(params.destinationKey);

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
      `Failed to seal Kairo Bad Times input: HTTP ${response.status}`
    );
  }
}

export function resolveKairoBadTimesTemplateVideoKey(
  subject: KairoBadTimesSubject = 'human'
) {
  const key =
    subject === 'pet'
      ? envConfigs.kairo_bad_times_pet_template_video_key?.trim() ||
        KAIRO_BAD_TIMES_DEFAULT_PET_TEMPLATE_VIDEO_KEY
      : envConfigs.kairo_bad_times_template_video_key?.trim() ||
        KAIRO_BAD_TIMES_DEFAULT_TEMPLATE_VIDEO_KEY;
  assertKairoBadTimesKeyPrefix(key);
  return key;
}

export function resolveKairoBadTimesPreviewTemplateVideoKey(
  subject: KairoBadTimesSubject = 'human'
) {
  const key =
    subject === 'pet'
      ? envConfigs.kairo_bad_times_pet_preview_template_video_key?.trim() ||
        KAIRO_BAD_TIMES_DEFAULT_PET_PREVIEW_TEMPLATE_VIDEO_KEY
      : envConfigs.kairo_bad_times_preview_template_video_key?.trim() ||
        KAIRO_BAD_TIMES_DEFAULT_PREVIEW_TEMPLATE_VIDEO_KEY;
  assertKairoBadTimesKeyPrefix(key);
  return key;
}

async function putKairoBadTimesObjectBytes(params: {
  key: string;
  bytes: Uint8Array;
  contentType: string;
}) {
  assertKairoBadTimesKeyPrefix(params.key);

  const config = await getR2SigningConfig();
  const headers = new Headers({
    'Content-Type': params.contentType,
    'Content-Length': String(params.bytes.byteLength),
    'x-amz-content-sha256': 'UNSIGNED-PAYLOAD',
  });
  const response = await createR2Client(config).fetch(
    new Request(buildR2ObjectUrl(config, params.key), {
      method: 'PUT',
      headers,
      body: params.bytes.buffer.slice(
        params.bytes.byteOffset,
        params.bytes.byteOffset + params.bytes.byteLength
      ) as ArrayBuffer,
    })
  );
  if (!response.ok) {
    const detail = await response.text().catch(() => '');
    throw new Error(
      `Failed to upload Kairo Bad Times object: HTTP ${response.status}${
        detail ? ` - ${detail.slice(0, 300)}` : ''
      }`
    );
  }
}

async function ensureKairoBadTimesObjectInR2(params: {
  key: string;
  localRelative: string;
  label: string;
}) {
  const { key, localRelative, label } = params;

  let remoteBytes: number | null = null;
  try {
    const head = await headR2Object(key);
    remoteBytes = head.contentLength;
  } catch {
    // missing — seed below when a local source exists
  }

  if (isCloudflareWorkersRuntime()) {
    if (remoteBytes != null) return key;
    throw new Error(
      `${label} missing from R2 (${key}). Upload ${localRelative} to that key.`
    );
  }

  const { readFile, stat } = await import('node:fs/promises');
  const { existsSync } = await import('node:fs');
  const path = await import('node:path');
  const localPath = path.join(process.cwd(), localRelative);
  if (!existsSync(localPath)) {
    if (remoteBytes != null) return key;
    throw new Error(
      `${label} missing from R2 (${key}) and local file ${localPath} was not found`
    );
  }

  const localBytes = (await stat(localPath)).size;
  if (remoteBytes != null && remoteBytes === localBytes) {
    return key;
  }

  const bytes = new Uint8Array(await readFile(localPath));
  await putKairoBadTimesObjectBytes({
    key,
    bytes,
    contentType: 'video/mp4',
  });
  return key;
}

export async function ensureKairoBadTimesTemplateInR2(
  subject: KairoBadTimesSubject = 'human'
) {
  const isPet = subject === 'pet';
  return ensureKairoBadTimesObjectInR2({
    key: resolveKairoBadTimesTemplateVideoKey(subject),
    localRelative: isPet
      ? KAIRO_BAD_TIMES_LOCAL_PET_TEMPLATE_PATH
      : KAIRO_BAD_TIMES_LOCAL_TEMPLATE_PATH,
    label: isPet ? 'Kairo Bad Times pet template' : 'Kairo Bad Times template',
  });
}

export async function ensureKairoBadTimesPreviewTemplateInR2(
  subject: KairoBadTimesSubject = 'human'
) {
  const isPet = subject === 'pet';
  return ensureKairoBadTimesObjectInR2({
    key: resolveKairoBadTimesPreviewTemplateVideoKey(subject),
    localRelative: isPet
      ? KAIRO_BAD_TIMES_LOCAL_PET_PREVIEW_TEMPLATE_PATH
      : KAIRO_BAD_TIMES_LOCAL_PREVIEW_TEMPLATE_PATH,
    label: isPet
      ? 'Kairo Bad Times pet preview template'
      : 'Kairo Bad Times preview template',
  });
}

export async function createKairoBadTimesR2ReadUrl(key: string) {
  assertKairoBadTimesKeyPrefix(key);
  const signed = await signR2Object({
    key,
    method: 'GET',
    expiresSeconds: READ_EXPIRES_SECONDS,
  });
  return signed.url;
}

export async function getKairoBadTimesTemplateVideoUrl(
  subject: KairoBadTimesSubject = 'human'
) {
  const key = await ensureKairoBadTimesTemplateInR2(subject);
  const metadata = await headR2Object(key);
  if (!VIDEO_CONTENT_TYPES[metadata.contentType]) {
    throw new Error('Kairo Bad Times template must be MP4 or MOV');
  }
  return createKairoBadTimesR2ReadUrl(key);
}

function resolveKairoBadTimesLocalTemplatePath(subject: KairoBadTimesSubject) {
  return subject === 'pet'
    ? KAIRO_BAD_TIMES_LOCAL_PET_TEMPLATE_PATH
    : KAIRO_BAD_TIMES_LOCAL_TEMPLATE_PATH;
}

export async function getKairoBadTimesTemplateDurationSecondsRaw(
  subject: KairoBadTimesSubject = 'human'
) {
  try {
    const url = await getKairoBadTimesTemplateVideoUrl(subject);
    return await probeKairoBadTimesDurationSecondsRaw(url);
  } catch (error) {
    // R2 range reads can flake (ECONNRESET); Node can still price from the seed file.
    if (isCloudflareWorkersRuntime()) throw error;
    const { existsSync } = await import('node:fs');
    const path = await import('node:path');
    const localPath = path.join(
      process.cwd(),
      resolveKairoBadTimesLocalTemplatePath(subject)
    );
    if (!existsSync(localPath)) throw error;
    console.warn(
      'kairo-bad-times: R2 duration probe failed, falling back to local file:',
      error instanceof Error ? error.message : error
    );
    return probeKairoBadTimesLocalFileDurationSecondsRaw(localPath);
  }
}

export async function getKairoBadTimesTemplateDurationSeconds(
  subject: KairoBadTimesSubject = 'human'
) {
  return normalizeKairoBadTimesDuration(
    await getKairoBadTimesTemplateDurationSecondsRaw(subject)
  );
}

export async function sealKairoBadTimesInput(params: {
  userId: string;
  generationId: string;
  imageKey: string;
  contentType: string;
  contentLength: number;
}) {
  const stagingPrefix = getKairoBadTimesInputPrefix(params);
  const sealedPrefix = getKairoBadTimesSealedInputPrefix(params);

  assertKairoBadTimesInputKey({
    userId: params.userId,
    generationId: params.generationId,
    key: params.imageKey,
    sealed: false,
  });

  const uploadedMetadata = await headR2Object(params.imageKey);
  assertKairoBadTimesUploadSize(uploadedMetadata.contentLength);
  const expectedType =
    params.contentType?.split(';', 1)[0]?.trim().toLowerCase() || '';
  if (!expectedType || uploadedMetadata.contentType !== expectedType) {
    throw new Error('Uploaded media content type changed before generation');
  }
  if (uploadedMetadata.contentLength !== params.contentLength) {
    throw new Error('Uploaded media size changed before generation');
  }

  const filename = params.imageKey.slice(stagingPrefix.length);
  if (!filename || filename.includes('/')) {
    throw new Error('Invalid Kairo Bad Times staging image key');
  }
  const sealedImageKey = `${sealedPrefix}${filename}`;

  await copyR2Object({
    sourceKey: params.imageKey,
    destinationKey: sealedImageKey,
    sourceEtag: uploadedMetadata.etag,
  });

  assertKairoBadTimesInputKey({
    userId: params.userId,
    generationId: params.generationId,
    key: sealedImageKey,
    sealed: true,
  });

  const sealedMetadata = await headR2Object(sealedImageKey);
  if (
    sealedMetadata.contentLength !== uploadedMetadata.contentLength ||
    sealedMetadata.contentType !== uploadedMetadata.contentType
  ) {
    throw new Error(
      'Sealed Kairo Bad Times image does not match uploaded media'
    );
  }

  return { imageKey: sealedImageKey };
}

export async function resolveKairoBadTimesInputUrls(params: {
  userId: string;
  generationId: string;
  imageKey: string;
  templateVideoKey: string;
}) {
  assertKairoBadTimesInputKey({
    userId: params.userId,
    generationId: params.generationId,
    key: params.imageKey,
    sealed: true,
  });
  assertKairoBadTimesKeyPrefix(params.templateVideoKey);

  await Promise.all([
    headR2Object(params.imageKey),
    headR2Object(params.templateVideoKey),
  ]);

  const [imageUrl, videoUrl] = await Promise.all([
    createKairoBadTimesR2ReadUrl(params.imageKey),
    createKairoBadTimesR2ReadUrl(params.templateVideoKey),
  ]);

  return { imageUrl, videoUrl };
}

export function getKairoBadTimesResultKey(params: {
  userId: string;
  generationId: string;
}) {
  return `${STORAGE_PREFIX}results/${safeSegment(params.userId)}/${safeSegment(
    params.generationId
  )}.mp4`;
}

export function assertKairoBadTimesResultKeyOwned(params: {
  userId: string;
  generationId: string;
  videoKey: string;
}) {
  assertKairoBadTimesKeyPrefix(params.videoKey);
  if (params.videoKey !== getKairoBadTimesResultKey(params)) {
    throw new Error('Invalid Kairo Bad Times result key');
  }
}

export async function persistKairoBadTimesResultToR2(params: {
  userId: string;
  generationId: string;
  sourceUrl: string;
}) {
  const storage = await getStorage();
  if (!storage) throw new Error('R2 storage is not configured');

  const videoKey = getKairoBadTimesResultKey(params);
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
        copied.error || 'Failed to persist Kairo Bad Times result'
      );
    }
  }

  return { videoKey };
}
