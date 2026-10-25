import assert from 'node:assert/strict';
import test from 'node:test';
import { AwsClient } from 'aws4fetch';

import {
  buildR2CopySourceHeader,
  buildR2S3ObjectUrl,
  resolveR2SigningConfigFromMap,
} from './r2-signing-config';

const baseAdmin = {
  r2_bucket_name: 'genjutsu-ai',
  r2_access_key: 'AKIA_TEST',
  r2_secret_key: 'SECRET_TEST',
  r2_upload_path: 'uploads',
};

test('resolveR2SigningConfigFromMap prefers explicit endpoint', () => {
  const config = resolveR2SigningConfigFromMap({
    ...baseAdmin,
    r2_endpoint: 'https://custom.example.com/',
    r2_account_id: 'acct',
  });
  assert.equal(config.endpoint, 'https://custom.example.com');
  assert.equal(config.bucket, 'genjutsu-ai');
  assert.equal(config.uploadPath, 'uploads');
});

test('resolveR2SigningConfigFromMap falls back to accountId host', () => {
  const config = resolveR2SigningConfigFromMap({
    ...baseAdmin,
    r2_account_id: 'abc123',
  });
  assert.equal(config.endpoint, 'https://abc123.r2.cloudflarestorage.com');
});

test('resolveR2SigningConfigFromMap errors when endpoint and accountId missing', () => {
  assert.throws(
    () => resolveR2SigningConfigFromMap({ ...baseAdmin }),
    /not fully configured/
  );
});

test('buildR2S3ObjectUrl adds uploadPath once for logical and physical keys', () => {
  const config = resolveR2SigningConfigFromMap({
    ...baseAdmin,
    r2_account_id: 'acct',
  });
  const logical = 'genjutsu/inputs/user/gen/source.mp4';
  const fromLogical = buildR2S3ObjectUrl(config, logical);
  const fromPhysical = buildR2S3ObjectUrl(
    config,
    'uploads/genjutsu/inputs/user/gen/source.mp4'
  );
  assert.equal(
    fromLogical,
    'https://acct.r2.cloudflarestorage.com/genjutsu-ai/uploads/genjutsu/inputs/user/gen/source.mp4'
  );
  assert.equal(fromLogical, fromPhysical);
  assert.equal(fromLogical.includes('uploads/uploads/'), false);
});

test('buildR2S3ObjectUrl respects custom upload path without doubling', () => {
  const config = resolveR2SigningConfigFromMap({
    ...baseAdmin,
    r2_account_id: 'acct',
    r2_upload_path: '/assets/uploads/',
  });
  assert.equal(
    buildR2S3ObjectUrl(config, 'hotel-lobby/templates/default-v2.mp4'),
    'https://acct.r2.cloudflarestorage.com/genjutsu-ai/assets/uploads/hotel-lobby/templates/default-v2.mp4'
  );
  assert.equal(
    buildR2S3ObjectUrl(
      config,
      'assets/uploads/hotel-lobby/templates/default-v2.mp4'
    ),
    'https://acct.r2.cloudflarestorage.com/genjutsu-ai/assets/uploads/hotel-lobby/templates/default-v2.mp4'
  );
});

test('buildR2CopySourceHeader uses bucket + physical key once', () => {
  const config = resolveR2SigningConfigFromMap({
    ...baseAdmin,
    r2_account_id: 'acct',
  });
  assert.equal(
    buildR2CopySourceHeader(config, 'genjutsu/inputs/u/g/source.mp4'),
    '/genjutsu-ai/uploads/genjutsu/inputs/u/g/source.mp4'
  );
  assert.equal(
    buildR2CopySourceHeader(config, 'uploads/genjutsu/inputs/u/g/source.mp4'),
    '/genjutsu-ai/uploads/genjutsu/inputs/u/g/source.mp4'
  );
  assert.equal(
    buildR2CopySourceHeader(
      config,
      'uploads/genjutsu/inputs/u/g/source.mp4'
    ).includes('uploads/uploads/'),
    false
  );
});

test('buildR2CopySourceHeader supports custom upload path', () => {
  const config = resolveR2SigningConfigFromMap({
    ...baseAdmin,
    r2_account_id: 'acct',
    r2_upload_path: 'assets/uploads',
  });
  assert.equal(
    buildR2CopySourceHeader(config, 'kairo-bad-times/inputs/u/g/image.jpg'),
    '/genjutsu-ai/assets/uploads/kairo-bad-times/inputs/u/g/image.jpg'
  );
});

test('signed query URL keeps logical storageKey and physical path in host URL', async () => {
  const config = resolveR2SigningConfigFromMap({
    ...baseAdmin,
    r2_account_id: 'acct',
  });
  const logicalKey = 'hotel-lobby/inputs/user-1/gen-abcdefgh/video.mp4';
  const baseUrl = buildR2S3ObjectUrl(config, logicalKey);
  const url = new URL(baseUrl);
  url.searchParams.set('X-Amz-Expires', '600');

  const client = new AwsClient({
    accessKeyId: config.accessKeyId,
    secretAccessKey: config.secretAccessKey,
    region: 'auto',
    service: 's3',
  });
  const signed = await client.sign(
    new Request(url.toString(), {
      method: 'PUT',
      headers: { 'Content-Type': 'video/mp4' },
    }),
    {
      aws: {
        signQuery: true,
        service: 's3',
        region: 'auto',
      },
    }
  );

  assert.equal(logicalKey.startsWith('uploads/'), false);
  assert.match(signed.url, /\/genjutsu-ai\/uploads\/hotel-lobby\//);
  assert.equal(signed.url.includes('uploads/uploads/'), false);
  assert.match(signed.url, /X-Amz-Signature=/i);
});

test('errors never echo access or secret keys', () => {
  try {
    resolveR2SigningConfigFromMap({
      r2_bucket_name: 'b',
      r2_access_key: 'SUPER_SECRET_AK',
      r2_secret_key: 'SUPER_SECRET_SK',
    });
    assert.fail('expected throw');
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    assert.equal(message.includes('SUPER_SECRET_AK'), false);
    assert.equal(message.includes('SUPER_SECRET_SK'), false);
  }
});
