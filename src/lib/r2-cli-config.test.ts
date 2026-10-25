import assert from 'node:assert/strict';
import test from 'node:test';

import { hasR2CliEnvConfig, resolveR2CliConfig } from './r2-cli-config';

const adminComplete = {
  r2_endpoint: 'https://admin.example.com/',
  r2_bucket_name: 'admin-bucket',
  r2_access_key: 'admin-ak',
  r2_secret_key: 'admin-sk',
  r2_upload_path: 'uploads',
};

test('resolveR2CliConfig uses admin when no R2_* env is set', () => {
  const config = resolveR2CliConfig({ env: {}, admin: adminComplete });
  assert.equal(config.source, 'admin');
  assert.equal(config.bucket, 'admin-bucket');
  assert.equal(config.endpoint, 'https://admin.example.com');
  assert.equal(config.uploadPath, 'uploads');
  assert.equal(config.accessKeyId, 'admin-ak');
});

test('resolveR2CliConfig builds endpoint from admin account id', () => {
  const config = resolveR2CliConfig({
    env: {},
    admin: {
      r2_account_id: 'acct99',
      r2_bucket_name: 'b',
      r2_access_key: 'ak',
      r2_secret_key: 'sk',
    },
  });
  assert.equal(config.endpoint, 'https://acct99.r2.cloudflarestorage.com');
});

test('resolveR2CliConfig prefers env atomically and ignores admin fields', () => {
  const config = resolveR2CliConfig({
    env: {
      R2_BUCKET_NAME: 'env-bucket',
      R2_ACCESS_KEY: 'env-ak',
      R2_SECRET_KEY: 'env-sk',
      R2_ACCOUNT_ID: 'envacct',
      R2_UPLOAD_PATH: 'assets/uploads',
    },
    admin: adminComplete,
  });
  assert.equal(config.source, 'env');
  assert.equal(config.bucket, 'env-bucket');
  assert.equal(config.accessKeyId, 'env-ak');
  assert.equal(config.endpoint, 'https://envacct.r2.cloudflarestorage.com');
  assert.equal(config.uploadPath, 'assets/uploads');
});

test('resolveR2CliConfig does not mix partial env with admin', () => {
  assert.throws(
    () =>
      resolveR2CliConfig({
        env: { R2_BUCKET_NAME: 'only-bucket' },
        admin: adminComplete,
      }),
    /env config is incomplete/
  );
});

test('resolveR2CliConfig fails clearly when admin is empty', () => {
  assert.throws(
    () => resolveR2CliConfig({ env: {}, admin: {} }),
    /not fully configured via Admin/
  );
});

test('hasR2CliEnvConfig detects any connection env var', () => {
  assert.equal(hasR2CliEnvConfig({}), false);
  assert.equal(hasR2CliEnvConfig({ R2_UPLOAD_PATH: 'uploads' }), true);
  assert.equal(hasR2CliEnvConfig({ R2_BUCKET_NAME: 'b' }), true);
});

test('resolveR2CliConfig never includes secrets in error messages', () => {
  try {
    resolveR2CliConfig({
      env: {
        R2_BUCKET_NAME: 'b',
        R2_ACCESS_KEY: 'SUPER_SECRET_AK',
        R2_SECRET_KEY: 'SUPER_SECRET_SK',
      },
    });
    assert.fail('expected throw');
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    assert.equal(message.includes('SUPER_SECRET_AK'), false);
    assert.equal(message.includes('SUPER_SECRET_SK'), false);
  }
});
