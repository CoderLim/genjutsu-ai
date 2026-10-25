/**
 * Resolve R2 connection settings for CLI scripts (e.g. `pnpm r2:put`).
 *
 * Sources are atomic — never mix bucket/endpoint/credentials across env and
 * Admin DB configs. Priority:
 *   1. If any R2 connection identity/credential env var is set → use env only
 *   2. R2_UPLOAD_PATH alone does not select env (and will not override Admin)
 *   3. Otherwise use Admin/config map; incomplete selected source always fails
 */

import { resolveR2Endpoint } from './r2-endpoint';
import { trimR2PathSlashes } from './r2-object-key';

export type R2CliConfigSource = 'env' | 'admin';

export type R2AdminConfigFields = {
  r2_endpoint?: string;
  r2_account_id?: string;
  r2_bucket_name?: string;
  r2_access_key?: string;
  r2_secret_key?: string;
  r2_upload_path?: string;
};

export type R2CliResolvedConfig = {
  endpoint: string;
  bucket: string;
  accessKeyId: string;
  secretAccessKey: string;
  uploadPath: string;
  source: R2CliConfigSource;
};

const ENV_CONNECTION_KEYS = [
  'R2_ACCOUNT_ID',
  'R2_ENDPOINT',
  'R2_BUCKET_NAME',
  'R2_ACCESS_KEY',
  'R2_SECRET_KEY',
] as const;

function trim(value: string | undefined | null): string {
  return value?.trim() || '';
}

export function hasR2CliEnvConfig(
  env: Record<string, string | undefined> = process.env
) {
  // A standalone path hint is not a credential set. Never mix it with
  // Admin connection settings, including the Admin upload prefix.
  return ENV_CONNECTION_KEYS.some((key) => trim(env[key]).length > 0);
}

function resolveFromFields(params: {
  source: R2CliConfigSource;
  endpoint?: string;
  accountId?: string;
  bucket?: string;
  accessKeyId?: string;
  secretAccessKey?: string;
  uploadPath?: string;
}): R2CliResolvedConfig {
  const bucket = trim(params.bucket);
  const accessKeyId = trim(params.accessKeyId);
  const secretAccessKey = trim(params.secretAccessKey);
  const uploadPath = trimR2PathSlashes(trim(params.uploadPath) || 'uploads');

  const missing: string[] = [];
  if (!bucket) missing.push('bucket');
  if (!accessKeyId) missing.push('access key');
  if (!secretAccessKey) missing.push('secret key');

  let endpoint: string;
  try {
    endpoint = resolveR2Endpoint({
      endpoint: params.endpoint,
      accountId: params.accountId,
    });
  } catch {
    missing.push('endpoint or account id');
    endpoint = '';
  }

  if (missing.length > 0) {
    if (params.source === 'env') {
      throw new Error(
        `R2 CLI env config is incomplete (missing: ${missing.join(', ')}). ` +
          'Set R2_BUCKET_NAME, R2_ACCESS_KEY, R2_SECRET_KEY, and R2_ENDPOINT or R2_ACCOUNT_ID. ' +
          'Do not mix with Admin DB values when any R2_* env var is set.'
      );
    }
    throw new Error(
      `R2 is not fully configured via Admin (missing: ${missing.join(', ')}). ` +
        'Set r2_bucket_name, r2_access_key, r2_secret_key, and r2_endpoint or r2_account_id ' +
        'in Admin → Storage, or provide a complete R2_* env set for the CLI.'
    );
  }

  return {
    endpoint,
    bucket,
    accessKeyId,
    secretAccessKey,
    uploadPath,
    source: params.source,
  };
}

/**
 * Pure config resolver for unit tests and CLI entrypoints.
 * Never logs secrets.
 */
export function resolveR2CliConfig(input: {
  env?: Record<string, string | undefined>;
  admin?: R2AdminConfigFields | null;
}): R2CliResolvedConfig {
  const env = input.env ?? {};

  if (hasR2CliEnvConfig(env)) {
    return resolveFromFields({
      source: 'env',
      endpoint: env.R2_ENDPOINT,
      accountId: env.R2_ACCOUNT_ID,
      bucket: env.R2_BUCKET_NAME,
      accessKeyId: env.R2_ACCESS_KEY,
      secretAccessKey: env.R2_SECRET_KEY,
      uploadPath: env.R2_UPLOAD_PATH,
    });
  }

  const admin = input.admin ?? {};
  return resolveFromFields({
    source: 'admin',
    endpoint: admin.r2_endpoint,
    accountId: admin.r2_account_id,
    bucket: admin.r2_bucket_name,
    accessKeyId: admin.r2_access_key,
    secretAccessKey: admin.r2_secret_key,
    uploadPath: admin.r2_upload_path,
  });
}
