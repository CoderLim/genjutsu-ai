import { AwsClient } from 'aws4fetch';

import { getAllConfigs } from '@/modules/config/service';

const UPLOAD_EXPIRES_SECONDS = 15 * 60;
const READ_EXPIRES_SECONDS = 6 * 60 * 60;

export const KLING_MOTION_MAX_IMAGE_BYTES = 10 * 1024 * 1024;
export const KLING_MOTION_MAX_VIDEO_BYTES = 100 * 1024 * 1024;

export type KlingMotionUploadKind = 'image' | 'video';

type R2SigningConfig = {
  endpoint: string;
  bucket: string;
  uploadPath: string;
  accessKeyId: string;
  secretAccessKey: string;
};

const IMAGE_TYPES: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/png': 'png',
};

const VIDEO_TYPES: Record<string, string> = {
  'video/mp4': 'mp4',
  'video/quicktime': 'mov',
};

function trimSlashes(value: string) {
  return value.replace(/^\/+|\/+$/g, '');
}

function safeSegment(value: string) {
  return value.replace(/[^A-Za-z0-9_-]/g, '_');
}

function encodePath(value: string) {
  return value
    .split('/')
    .filter(Boolean)
    .map((segment) => encodeURIComponent(segment))
    .join('/');
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
    throw new Error('Invalid Kling Motion Control storage key');
  }
}

function assertRequestId(requestId: string) {
  if (
    !requestId ||
    requestId.length > 128 ||
    !/^[A-Za-z0-9_-]+$/.test(requestId)
  ) {
    throw new Error('Invalid Kling Motion Control request id');
  }
}

function normalizeUpload(kind: KlingMotionUploadKind, contentType: string) {
  const normalized = contentType.split(';', 1)[0]?.trim().toLowerCase() || '';
  const ext = kind === 'image' ? IMAGE_TYPES[normalized] : VIDEO_TYPES[normalized];
  if (!ext) {
    throw new Error(
      kind === 'image'
        ? 'Kling reference image must be JPG, JPEG, or PNG'
        : 'Kling motion video must be MP4 or MOV'
    );
  }
  return { contentType: normalized, ext };
}

function assertUploadSize(kind: KlingMotionUploadKind, contentLength: number) {
  const max =
    kind === 'image'
      ? KLING_MOTION_MAX_IMAGE_BYTES
      : KLING_MOTION_MAX_VIDEO_BYTES;
  if (
    !Number.isSafeInteger(contentLength) ||
    contentLength <= 0 ||
    contentLength > max
  ) {
    throw new Error(
      kind === 'image'
        ? 'Kling reference image must be 10 MB or smaller'
        : 'Kling motion video must be 100 MB or smaller'
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
      'R2 storage is not fully configured. Configure it in Admin → Storage before testing Kling Motion Control.'
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

export async function createKlingMotionUploadDescriptor(params: {
  userId: string;
  requestId: string;
  kind: KlingMotionUploadKind;
  contentType: string;
  contentLength: number;
}) {
  assertRequestId(params.requestId);
  assertUploadSize(params.kind, params.contentLength);
  const normalized = normalizeUpload(params.kind, params.contentType);
  const key = `kling-motion-control/${safeSegment(params.userId)}/${safeSegment(
    params.requestId
  )}/${params.kind}.${normalized.ext}`;

  const [upload, read] = await Promise.all([
    signR2Object({
      key,
      method: 'PUT',
      contentType: normalized.contentType,
      expiresSeconds: UPLOAD_EXPIRES_SECONDS,
    }),
    signR2Object({
      key,
      method: 'GET',
      expiresSeconds: READ_EXPIRES_SECONDS,
    }),
  ]);

  return {
    uploadUrl: upload.url,
    uploadHeaders: { 'Content-Type': normalized.contentType },
    inputUrl: read.url,
    storageKey: key,
  };
}
