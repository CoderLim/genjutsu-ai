import { AwsClient } from 'aws4fetch';

import { getAllConfigs } from '@/modules/config/service';
import { getStorage } from '@/modules/storage/service';

const UPLOAD_EXPIRES_SECONDS = 15 * 60;
const READ_EXPIRES_SECONDS = 60 * 60;

type R2SigningConfig = {
  endpoint: string;
  bucket: string;
  uploadPath: string;
  accessKeyId: string;
  secretAccessKey: string;
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

function extensionForContentType(contentType: string) {
  const normalized = contentType.split(';', 1)[0]?.trim().toLowerCase();
  const map: Record<string, string> = {
    'video/mp4': 'mp4',
    'video/quicktime': 'mov',
    'video/webm': 'webm',
    'image/jpeg': 'jpg',
    'image/jpg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
    'image/gif': 'gif',
    'image/avif': 'avif',
    'image/heic': 'heic',
    'image/heif': 'heif',
  };
  return map[normalized || ''] || (normalized?.startsWith('video/') ? 'mp4' : 'jpg');
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

async function signR2Object(params: {
  key: string;
  method: 'GET' | 'PUT';
  contentType?: string;
  expiresSeconds: number;
}) {
  const config = await getR2SigningConfig();
  const objectPath = encodePath(
    [config.bucket, config.uploadPath, params.key].filter(Boolean).join('/')
  );
  const url = new URL(`${config.endpoint}/${objectPath}`);
  url.searchParams.set('X-Amz-Expires', String(params.expiresSeconds));

  const headers = new Headers();
  if (params.contentType) {
    headers.set('Content-Type', params.contentType);
  }

  const client = new AwsClient({
    accessKeyId: config.accessKeyId,
    secretAccessKey: config.secretAccessKey,
    region: 'auto',
    service: 's3',
  });

  return client.sign(
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

export function getGenjutsuInputPrefix(params: {
  userId: string;
  generationId: string;
}) {
  return `genjutsu/inputs/${safeSegment(params.userId)}/${safeSegment(
    params.generationId
  )}/`;
}

export function assertGenjutsuInputKeysOwned(params: {
  userId: string;
  generationId: string;
  videoKey: string;
  imageKeys: string[];
}) {
  const prefix = getGenjutsuInputPrefix(params);
  if (!params.videoKey.startsWith(`${prefix}source.`)) {
    throw new Error('Invalid Genjutsu source-video storage key');
  }
  if (
    !Array.isArray(params.imageKeys) ||
    params.imageKeys.length < 1 ||
    params.imageKeys.length > 8 ||
    params.imageKeys.some(
      (key) =>
        typeof key !== 'string' ||
        !key.startsWith(`${prefix}reference-`)
    )
  ) {
    throw new Error('Invalid Genjutsu reference-image storage keys');
  }
}

export async function createGenjutsuR2UploadDescriptor(params: {
  userId: string;
  generationId: string;
  index: number;
  contentType: string;
}) {
  const contentType = params.contentType.trim().toLowerCase();
  if (
    !contentType ||
    (!contentType.startsWith('image/') && !contentType.startsWith('video/'))
  ) {
    throw new Error('Only image and video uploads are supported');
  }

  if (params.index === 0 && !contentType.startsWith('video/')) {
    throw new Error('The first Genjutsu upload must be a video');
  }
  if (params.index > 0 && !contentType.startsWith('image/')) {
    throw new Error('Genjutsu reference uploads must be images');
  }

  const prefix = getGenjutsuInputPrefix(params);
  const ext = extensionForContentType(contentType);
  const key =
    params.index === 0
      ? `${prefix}source.${ext}`
      : `${prefix}reference-${String(params.index).padStart(2, '0')}.${ext}`;

  const signed = await signR2Object({
    key,
    method: 'PUT',
    contentType,
    expiresSeconds: UPLOAD_EXPIRES_SECONDS,
  });

  return {
    uploadUrl: signed.url,
    uploadHeaders: {
      'Content-Type': contentType,
    },
    storageKey: key,
  };
}

export async function createGenjutsuR2ReadUrl(key: string) {
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
  const exists = await Promise.all(keys.map((key) => storage.exists({ key })));
  const missingIndex = exists.findIndex((present) => !present);
  if (missingIndex >= 0) {
    throw new Error(`Uploaded media is missing from R2: ${keys[missingIndex]}`);
  }

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

  return {
    videoKey,
    videoUrl: await createGenjutsuR2ReadUrl(videoKey),
  };
}
