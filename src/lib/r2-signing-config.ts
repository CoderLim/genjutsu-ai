/**
 * Shared R2 S3 signing-config + object URL helpers for Genjutsu / Hotel Lobby /
 * Kairo Bad Times storage modules (and unit tests of that call chain).
 *
 * Logical keys stay logical; physical keys are resolved via resolveR2ObjectKey.
 */

import { resolveR2Endpoint } from './r2-endpoint';
import { resolveR2ObjectKey, trimR2PathSlashes } from './r2-object-key';

export type R2SigningConfig = {
  endpoint: string;
  bucket: string;
  uploadPath: string;
  accessKeyId: string;
  secretAccessKey: string;
};

export type R2ConfigFields = {
  r2_endpoint?: string;
  r2_account_id?: string;
  r2_bucket_name?: string;
  r2_access_key?: string;
  r2_secret_key?: string;
  r2_upload_path?: string;
};

const CONFIG_ERROR =
  'R2 storage is not fully configured. Set endpoint or account id, bucket, access key, and secret key in Admin → Storage.';

export function encodeR2S3Path(value: string) {
  return value
    .split('/')
    .filter(Boolean)
    .map((segment) => encodeURIComponent(segment))
    .join('/');
}

/**
 * Resolve signing credentials from an Admin/env config map.
 * Prefer r2_endpoint; fall back to default host from r2_account_id.
 */
export function resolveR2SigningConfigFromMap(
  configs: R2ConfigFields
): R2SigningConfig {
  const bucket = configs.r2_bucket_name?.trim() || '';
  const accessKeyId = configs.r2_access_key?.trim() || '';
  const secretAccessKey = configs.r2_secret_key?.trim() || '';
  const uploadPath = trimR2PathSlashes(
    configs.r2_upload_path?.trim() || 'uploads'
  );

  if (!bucket || !accessKeyId || !secretAccessKey) {
    throw new Error(CONFIG_ERROR);
  }

  let endpoint: string;
  try {
    endpoint = resolveR2Endpoint({
      endpoint: configs.r2_endpoint,
      accountId: configs.r2_account_id,
    });
  } catch {
    throw new Error(CONFIG_ERROR);
  }

  return {
    endpoint,
    bucket,
    uploadPath,
    accessKeyId,
    secretAccessKey,
  };
}

/** Absolute S3/R2 object URL used before query-string signing. */
export function buildR2S3ObjectUrl(
  config: Pick<R2SigningConfig, 'endpoint' | 'bucket' | 'uploadPath'>,
  logicalKey: string
) {
  const objectKey = resolveR2ObjectKey(config.uploadPath, logicalKey);
  const objectPath = encodeR2S3Path(
    [config.bucket, objectKey].filter(Boolean).join('/')
  );
  return `${config.endpoint}/${objectPath}`;
}

/** `x-amz-copy-source` value (leading slash, bucket + physical key). */
export function buildR2CopySourceHeader(
  config: Pick<R2SigningConfig, 'bucket' | 'uploadPath'>,
  logicalSourceKey: string
) {
  const objectKey = resolveR2ObjectKey(config.uploadPath, logicalSourceKey);
  const sourcePath = encodeR2S3Path(
    [config.bucket, objectKey].filter(Boolean).join('/')
  );
  return `/${sourcePath}`;
}
