import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import test from 'node:test';

const safeEnv = {
  ...process.env,
  R2_ACCOUNT_ID: 'testacct',
  R2_ENDPOINT: '',
  R2_BUCKET_NAME: 'genjutsu-ai',
  R2_ACCESS_KEY: 'local-test-access-key',
  R2_SECRET_KEY: 'local-test-secret-key',
  R2_UPLOAD_PATH: 'uploads',
};

test('r2:put dry-run preserves spaces in argv and does not upload', () => {
  const result = spawnSync(
    process.execPath,
    [
      '--import', 'tsx', 'scripts/r2-put-object.ts',
      '--key=genjutsu/templates/a2o-lite-ai-v2.mp4',
      '--file=public/videos/file with spaces.mp4',
      '--dry-run',
    ],
    { cwd: process.cwd(), env: safeEnv, encoding: 'utf8' }
  );
  assert.equal(result.status, 0, result.stderr || result.stdout);
  assert.ok(result.stdout.includes('Object key:'));
  assert.ok(result.stdout.includes('uploads/genjutsu/templates/a2o-lite-ai-v2.mp4'));
  assert.match(result.stdout, /file with spaces.mp4/);
  assert.match(result.stdout, /Dry run — skipped upload/);
});

test('with-env preserves argument boundaries and child status codes', () => {
  const argv = [
    '--import', 'tsx', 'scripts/with-env.ts', process.execPath,
    '-e', 'process.stdout.write(JSON.stringify(process.argv.slice(1)))',
    'file with spaces.mp4',
  ];
  const success = spawnSync(process.execPath, argv, { cwd: process.cwd(), env: safeEnv, encoding: 'utf8' });
  assert.equal(success.status, 0, success.stderr || success.stdout);
  assert.ok(success.stdout.includes('["file with spaces.mp4"]'));
  const failure = spawnSync(
    process.execPath,
    ['--import', 'tsx', 'scripts/with-env.ts', process.execPath, '-e', 'process.exit(23)'],
    { cwd: process.cwd(), env: safeEnv, encoding: 'utf8' }
  );
  assert.equal(failure.status, 23, failure.stderr || failure.stdout);
});
