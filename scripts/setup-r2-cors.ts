/**
 * Apply R2 bucket CORS for browser signed uploads (Hotel Lobby / H3 Lab / Genjutsu).
 *
 * R2 does not allow port wildcards on AllowedOrigins (`http://localhost:*` is invalid).
 * Signed PUTs use credentials: 'omit', so AllowedOrigins: ["*"] is the practical way
 * to cover every localhost port (3000, 3002, …) plus production.
 *
 * Usage:
 *   pnpm tsx scripts/with-env.ts tsx scripts/setup-r2-cors.ts
 *   pnpm tsx scripts/with-env.ts tsx scripts/setup-r2-cors.ts --dry-run
 */

import { AwsClient } from 'aws4fetch';

import { getAllConfigs } from '../src/modules/config/service';

function buildCorsXml() {
  // Dashboard / S3 PutBucketCors shape. Methods cover signed upload + download.
  return `<?xml version="1.0" encoding="UTF-8"?>
<CORSConfiguration xmlns="http://s3.amazonaws.com/doc/2006-03-01/">
  <CORSRule>
    <AllowedOrigin>*</AllowedOrigin>
    <AllowedMethod>GET</AllowedMethod>
    <AllowedMethod>PUT</AllowedMethod>
    <AllowedMethod>HEAD</AllowedMethod>
    <AllowedMethod>POST</AllowedMethod>
    <AllowedMethod>DELETE</AllowedMethod>
    <AllowedHeader>*</AllowedHeader>
    <ExposeHeader>ETag</ExposeHeader>
    <ExposeHeader>Content-Length</ExposeHeader>
    <ExposeHeader>Content-Type</ExposeHeader>
    <MaxAgeSeconds>3600</MaxAgeSeconds>
  </CORSRule>
</CORSConfiguration>`;
}

function buildCorsJsonForDashboard() {
  return [
    {
      AllowedOrigins: ['*'],
      AllowedMethods: ['GET', 'PUT', 'HEAD', 'POST', 'DELETE'],
      AllowedHeaders: ['*'],
      ExposeHeaders: ['ETag', 'Content-Length', 'Content-Type'],
      MaxAgeSeconds: 3600,
    },
  ];
}

async function main() {
  const dryRun = process.argv.includes('--dry-run');
  const configs = await getAllConfigs();

  const endpoint = configs.r2_endpoint?.trim().replace(/\/$/, '');
  const bucket = configs.r2_bucket_name?.trim();
  const accessKeyId = configs.r2_access_key?.trim();
  const secretAccessKey = configs.r2_secret_key?.trim();

  if (!endpoint || !bucket || !accessKeyId || !secretAccessKey) {
    console.error(
      'R2 is not fully configured (need r2_endpoint, r2_bucket_name, r2_access_key, r2_secret_key).'
    );
    console.error(
      'Set them in Admin → Settings → Storage, or paste this policy in the R2 dashboard:\n'
    );
    console.log(JSON.stringify(buildCorsJsonForDashboard(), null, 2));
    process.exit(1);
  }

  const corsUrl = `${endpoint}/${bucket}?cors`;
  const body = buildCorsXml();

  console.log(`Bucket:   ${bucket}`);
  console.log(`Endpoint: ${endpoint}`);
  console.log('Policy:   AllowedOrigins=["*"] (covers all localhost ports)');
  console.log(
    'Dashboard JSON equivalent:\n',
    JSON.stringify(buildCorsJsonForDashboard(), null, 2)
  );

  if (dryRun) {
    console.log('\nDry run — not applying.');
    return;
  }

  const client = new AwsClient({
    accessKeyId,
    secretAccessKey,
    region: 'auto',
    service: 's3',
  });

  const response = await client.fetch(
    new Request(corsUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/xml',
      },
      body,
    })
  );

  if (!response.ok) {
    const text = await response.text();
    console.error(`PutBucketCors failed: HTTP ${response.status}`);
    console.error(text);
    process.exit(1);
  }

  const getResponse = await client.fetch(
    new Request(corsUrl, { method: 'GET' })
  );
  const applied = await getResponse.text();
  console.log(`\nApplied OK (HTTP ${response.status}). Current CORS:\n`);
  console.log(applied);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
