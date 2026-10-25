/**
 * Read-only R2 audit helper (HEAD + List). Uses Admin DB config.
 * Never logs secrets. Does not PUT/DELETE/COPY.
 *
 * Usage: pnpm exec tsx scripts/with-env.ts tsx scripts/r2-audit-readonly.ts
 */
import { AwsClient } from 'aws4fetch';

import { resolveR2ObjectKey } from '../src/lib/r2-object-key';
import {
  buildR2S3ObjectUrl,
  resolveR2SigningConfigFromMap,
} from '../src/lib/r2-signing-config';
import { getAllConfigs } from '../src/modules/config/service';

const TEMPLATE_LOGICAL_KEYS = [
  'genjutsu/templates/zombie-hug.mp4',
  'genjutsu/templates/zombie-hug-9x16.mp4',
  'genjutsu/templates/smalltown-boy-dance-v1.mp4',
  'genjutsu/templates/crazy-frog-v1.mp4',
  'genjutsu/templates/a2o-lite-ai-v2.mp4',
  'genjutsu/templates/enzo-fernandez-ai-v1.mp4',
  'genjutsu/templates/flying-car-ai-v2.mp4',
  'genjutsu/templates/coldplay-kiss-cam-v3.mp4',
  'genjutsu/templates/gangnam-style-ai-v1.mp4',
  'genjutsu/templates/gas-station-dance-ai-v1.mp4',
  'genjutsu/templates/burning-bridges-ai-v2.mp4',
  'genjutsu/templates/say-it-right-ai-v1.mp4',
  'hotel-lobby/templates/default.mp4',
  'hotel-lobby/templates/crazy-frog-v1.mp4',
  'hotel-lobby/templates/rumpelstiltskin-v1.mp4',
  'hotel-lobby/templates/bulin-47-v1.mp4',
  'kairo-bad-times/templates/v2.mp4',
  'kairo-bad-times/templates/v2-preview.mp4',
  'kairo-bad-times/templates/pet-v3.mp4',
  'kairo-bad-times/templates/pet-v3-preview.mp4',
] as const;

async function main() {
  const configs = await getAllConfigs();
  const signing = resolveR2SigningConfigFromMap(configs);
  const publicDomain = (configs.r2_domain || '').replace(/\/+$/, '');

  console.log('### Config (non-secret)');
  console.log(`bucket: ${signing.bucket}`);
  console.log(`endpoint: ${signing.endpoint}`);
  console.log(`upload_path: ${signing.uploadPath}`);
  console.log(`public_domain: ${publicDomain || '(empty)'}`);

  const client = new AwsClient({
    accessKeyId: signing.accessKeyId,
    secretAccessKey: signing.secretAccessKey,
    region: 'auto',
    service: 's3',
  });

  console.log('\n### Step 1 Template HEAD');
  let pass = 0;
  let fail = 0;
  for (const logical of TEMPLATE_LOGICAL_KEYS) {
    const physical = resolveR2ObjectKey(signing.uploadPath, logical);
    const url = buildR2S3ObjectUrl(signing, logical);
    const res = await client.fetch(new Request(url, { method: 'HEAD' }));
    const size = res.headers.get('content-length') || '?';
    const type = res.headers.get('content-type') || '?';
    if (res.ok) {
      pass += 1;
      console.log(`PASS ${logical} → ${physical} size=${size} type=${type}`);
    } else {
      fail += 1;
      console.log(`FAIL ${logical} → ${physical} HEAD HTTP ${res.status}`);
    }
  }
  console.log(`templates PASS=${pass} FAIL=${fail}`);

  const a2oPhysical = resolveR2ObjectKey(
    signing.uploadPath,
    'genjutsu/templates/a2o-lite-ai-v2.mp4'
  );
  const a2oExpected = `${signing.bucket}/${a2oPhysical}`;
  const a2oWorkflow =
    'genjutsu-ai/uploads/genjutsu/templates/a2o-lite-ai-v2.mp4';
  console.log(
    `A2O workflow path: got=${a2oExpected} expected_default=${a2oWorkflow} match=${a2oExpected === a2oWorkflow}`
  );

  console.log('\n### Step 2 List bare / doubled prefixes');
  const prefixes = [
    'genjutsu/',
    'hotel-lobby/',
    'kairo-bad-times/',
    `${signing.uploadPath}/${signing.uploadPath}/`,
  ];
  for (const prefix of prefixes) {
    const listUrl = `${signing.endpoint}/${signing.bucket}?list-type=2&prefix=${encodeURIComponent(prefix)}&max-keys=50`;
    const res = await client.fetch(new Request(listUrl, { method: 'GET' }));
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      console.log(
        `LIST FAIL prefix=${prefix} HTTP ${res.status} ${body.slice(0, 200)}`
      );
      continue;
    }
    const xml = await res.text();
    const keys = [...xml.matchAll(/<Key>([^<]*)<\/Key>/g)].map((m) => m[1]);
    console.log(
      `LIST prefix=${prefix} count=${keys.length} keys=${keys.length ? keys.join(' | ') : '(empty)'}`
    );
  }

  if (publicDomain) {
    console.log('\n### Step 4 CDN sample (ASCII template)');
    const logical = 'genjutsu/templates/a2o-lite-ai-v2.mp4';
    const physical = resolveR2ObjectKey(signing.uploadPath, logical);
    const cdnUrl = `${publicDomain}/${physical
      .split('/')
      .map((s) => encodeURIComponent(s))
      .join('/')}`;
    const res = await fetch(cdnUrl, { method: 'HEAD' });
    console.log(
      `CDN HEAD ${cdnUrl} → HTTP ${res.status} size=${res.headers.get('content-length') || '?'}`
    );
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
