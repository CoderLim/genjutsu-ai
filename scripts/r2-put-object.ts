/**
 * Put a local file into R2 using the same object-key rules as the App.
 *
 * Logical keys (no uploads/ prefix) are resolved via resolveR2ObjectKey so
 * ops never create bare orphans like hotel-lobby/templates/x.mp4 while the
 * App reads uploads/hotel-lobby/templates/x.mp4.
 *
 * Config (atomic source — never mix env + Admin credentials):
 *   1. If any R2 connection env is set → require a complete env set:
 *        R2_BUCKET_NAME, R2_ACCESS_KEY, R2_SECRET_KEY,
 *        R2_ENDPOINT or R2_ACCOUNT_ID, optional R2_UPLOAD_PATH
 *   2. Else → Admin/DB via getAllConfigs() (r2_* keys)
 *
 * Usage:
 *   pnpm r2:put --key=hotel-lobby/templates/default-v2.mp4 \
 *     --file=public/videos/hotel-lobby-tpl.mp4
 *
 * Options:
 *   --dry-run   print resolved key only, do not upload
 *   --force     explicitly allow overwriting an existing object
 *   --content-type=video/mp4   override Content-Type (default from extension)
 */

import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { AwsClient } from 'aws4fetch';

import {
  hasR2CliEnvConfig,
  resolveR2CliConfig,
} from '../src/lib/r2-cli-config';
import { resolveR2ObjectKey } from '../src/lib/r2-object-key';
import { checkR2PutHeadStatus } from '../src/lib/r2-put-guard';
import { buildR2S3ObjectUrl } from '../src/lib/r2-signing-config';
import { getAllConfigs } from '../src/modules/config/service';

const CONTENT_TYPES: Record<string, string> = {
  '.mp4': 'video/mp4',
  '.mov': 'video/quicktime',
  '.webm': 'video/webm',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
};

function parseArgs(argv: string[]) {
  const out: {
    key?: string;
    file?: string;
    contentType?: string;
    dryRun: boolean;
    force: boolean;
  } = { dryRun: false, force: false };

  for (const arg of argv) {
    if (arg === '--dry-run') {
      out.dryRun = true;
      continue;
    }
    if (arg === '--force') {
      out.force = true;
      continue;
    }
    const match = /^--([^=]+)=(.*)$/.exec(arg);
    if (!match) continue;
    const [, name, value] = match;
    if (name === 'key') out.key = value;
    else if (name === 'file') out.file = value;
    else if (name === 'content-type') out.contentType = value;
  }

  return out;
}

function guessContentType(filePath: string, override?: string) {
  if (override) return override;
  const ext = path.extname(filePath).toLowerCase();
  return CONTENT_TYPES[ext] || 'application/octet-stream';
}

async function loadAdminR2Fields() {
  try {
    const configs = await getAllConfigs();
    return {
      r2_endpoint: configs.r2_endpoint,
      r2_account_id: configs.r2_account_id,
      r2_bucket_name: configs.r2_bucket_name,
      r2_access_key: configs.r2_access_key,
      r2_secret_key: configs.r2_secret_key,
      r2_upload_path: configs.r2_upload_path,
    };
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    throw new Error(
      `Failed to load Admin R2 config from database: ${detail}. ` +
        'Set a complete R2_* env set instead (R2_BUCKET_NAME, R2_ACCESS_KEY, ' +
        'R2_SECRET_KEY, and R2_ENDPOINT or R2_ACCOUNT_ID).'
    );
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args.key || !args.file) {
    console.error(
      'Usage: pnpm r2:put --key=hotel-lobby/templates/default-v2.mp4 \\\n' +
        '  --file=public/videos/hotel-lobby-tpl.mp4 [--dry-run] [--force]'
    );
    process.exit(1);
  }

  // Prefer a complete R2_* env set so local ops do not need prod D1/Admin DB.
  const config = hasR2CliEnvConfig(process.env)
    ? resolveR2CliConfig({ env: process.env })
    : resolveR2CliConfig({
        env: process.env,
        admin: await loadAdminR2Fields(),
      });

  const objectKey = resolveR2ObjectKey(config.uploadPath, args.key);
  const contentType = guessContentType(args.file, args.contentType);
  const absoluteFile = path.resolve(args.file);

  console.log(`Config source: ${config.source}`);
  console.log(`Logical key:  ${args.key}`);
  console.log(`Object key:   ${objectKey}`);
  console.log(`Bucket:       ${config.bucket}`);
  console.log(`Endpoint:     ${config.endpoint}`);
  console.log(`File:         ${absoluteFile}`);
  console.log(`Content-Type: ${contentType}`);

  if (args.dryRun) {
    console.log('Dry run — skipped upload.');
    return;
  }

  const url = buildR2S3ObjectUrl(config, args.key);
  const client = new AwsClient({
    accessKeyId: config.accessKeyId,
    secretAccessKey: config.secretAccessKey,
    region: 'auto',
    service: 's3',
  });

  // A safe CLI must not turn a typo or an existing template key into an overwrite.
  // HEAD failures (including 403) are not evidence that an object is absent.
  const head = await client.fetch(new Request(url, { method: 'HEAD' }));
  const disposition = checkR2PutHeadStatus(head.status, args.force);
  if (disposition === 'existing') {
    console.log('Explicit --force: overwriting an existing R2 object.');
  }

  const body = await readFile(absoluteFile);
  const response = await client.fetch(
    new Request(url, {
      method: 'PUT',
      headers: {
        'Content-Type': contentType,
        'Content-Length': String(body.byteLength),
      },
      body: body.buffer.slice(body.byteOffset, body.byteOffset + body.byteLength) as ArrayBuffer,
    })
  );

  if (!response.ok) {
    const detail = await response.text().catch(() => '');
    console.error(
      `Upload failed: HTTP ${response.status}${detail ? ` — ${detail.slice(0, 400)}` : ''}`
    );
    process.exit(1);
  }

  console.log(
    `Uploaded ${body.byteLength} bytes → ${config.bucket}/${objectKey}`
  );
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
