import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { existsSync, rmSync } from 'node:fs';
import { resolve } from 'node:path';

const port = Number(process.env.GENJUTSU_E2E_PORT || 3107);
const baseUrl = `http://127.0.0.1:${port}`;
const dbPath = resolve('data/e2e-genjutsu.db');

const childEnv = {
  ...process.env,
  NODE_ENV: 'development',
  CI: '1',
  DATABASE_PROVIDER: 'sqlite',
  DATABASE_URL: `file:${dbPath}`,
  DB_SINGLETON_ENABLED: 'true',
  VITE_APP_URL: baseUrl,
  AUTH_URL: baseUrl,
  AUTH_SECRET: process.env.AUTH_SECRET || `${randomUUID()}${randomUUID()}`,
  GENJUTSU_E2E_MOCK: 'true',
};

function cleanDb() {
  for (const suffix of ['', '-shm', '-wal']) {
    const path = `${dbPath}${suffix}`;
    if (existsSync(path)) rmSync(path, { force: true });
  }
}

function run(command, args) {
  const result = spawnSync(command, args, {
    cwd: process.cwd(),
    env: childEnv,
    stdio: 'inherit',
  });
  if (result.status !== 0) {
    throw new Error(`${command} ${args.join(' ')} failed`);
  }
}

async function waitForServer() {
  let lastError;
  for (let attempt = 0; attempt < 80; attempt += 1) {
    try {
      const response = await fetch(baseUrl);
      if (response.ok) return;
      lastError = new Error(`HTTP ${response.status}`);
    } catch (error) {
      lastError = error;
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw lastError || new Error('Timed out waiting for E2E server');
}

function cookiesFromResponse(response) {
  const values =
    typeof response.headers.getSetCookie === 'function'
      ? response.headers.getSetCookie()
      : [response.headers.get('set-cookie')].filter(Boolean);
  return values.map((value) => value.split(';')[0]).join('; ');
}

async function readJson(response) {
  const body = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(
      `HTTP ${response.status}: ${body?.message || JSON.stringify(body)}`
    );
  }
  return body;
}

async function ensureSession() {
  const email = `genjutsu-e2e-${Date.now()}@example.com`;
  const password = `E2E-${randomUUID()}`;

  const signUpResponse = await fetch(`${baseUrl}/api/auth/sign-up/email`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Origin: baseUrl,
    },
    body: JSON.stringify({
      name: 'Genjutsu E2E',
      email,
      password,
    }),
  });

  await readJson(signUpResponse);
  let cookie = cookiesFromResponse(signUpResponse);
  if (cookie) return { cookie, email };

  const signInResponse = await fetch(`${baseUrl}/api/auth/sign-in/email`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Origin: baseUrl,
    },
    body: JSON.stringify({ email, password }),
  });
  await readJson(signInResponse);
  cookie = cookiesFromResponse(signInResponse);
  assert.ok(cookie, 'auth response did not set a session cookie');
  return { cookie, email };
}

/** Smoke-test only: seed credits so reserve can succeed without generate auto-grant. */
async function seedSmokeTestCredits(cookie, email) {
  const info = await appGet('/api/user/info', cookie);
  assert.ok(info.id, 'user info missing id');

  const { createClient } = await import('@libsql/client');
  const client = createClient({ url: childEnv.DATABASE_URL });
  const now = Date.now();
  await client.execute({
    sql: `INSERT INTO credit (
      id, user_id, user_email, order_no, subscription_no, transaction_no,
      transaction_type, transaction_scene, credits, remaining_credits,
      description, expires_at, status, created_at, updated_at
    ) VALUES (?, ?, ?, '', '', ?, 'grant', 'genjutsu_e2e', 10000, 10000,
      'E2E smoke test credits', NULL, 'active', ?, ?)`,
    args: [randomUUID(), info.id, email, `e2e-${randomUUID()}`, now, now],
  });
}

async function appPost(path, cookie, body) {
  const response = await fetch(`${baseUrl}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: cookie,
      Origin: baseUrl,
    },
    body: JSON.stringify(body),
  });
  const payload = await readJson(response);
  assert.equal(payload.code, 0, payload.message);
  return payload.data;
}

async function appPostExpectError(path, cookie, body, expectedStatus) {
  const response = await fetch(`${baseUrl}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: cookie,
      Origin: baseUrl,
    },
    body: JSON.stringify(body),
  });
  const payload = await response.json().catch(() => null);
  assert.equal(response.status, expectedStatus, JSON.stringify(payload));
  assert.notEqual(payload?.code, 0, 'expected an API error');
  return payload;
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function appGet(path, cookie) {
  const response = await fetch(`${baseUrl}${path}`, {
    headers: {
      Cookie: cookie,
      Origin: baseUrl,
    },
  });
  const payload = await readJson(response);
  assert.equal(payload.code, 0, payload.message);
  return payload.data;
}

async function main() {
  cleanDb();

  console.log('\n[1/6] Preparing isolated SQLite database...');
  run('pnpm', ['db:setup']);
  run('pnpm', ['db:push']);

  console.log('\n[2/6] Compiling locale assets...');
  run('pnpm', ['predev']);

  console.log(`\n[3/6] Starting E2E server on ${baseUrl}...`);
  const server = spawn(
    'pnpm',
    ['exec', 'vite', 'dev', '--host', '127.0.0.1', '--port', String(port)],
    {
      cwd: process.cwd(),
      env: childEnv,
      stdio: 'inherit',
    }
  );

  const stop = () => {
    if (!server.killed) server.kill('SIGTERM');
  };

  try {
    await waitForServer();

    console.log('\n[4/6] Creating an authenticated E2E user...');
    const { cookie, email } = await ensureSession();
    await seedSmokeTestCredits(cookie, email);

    console.log('\n[5/6] Uploading source media through the app upload API...');
    const generationId = `e2e-${randomUUID()}`;
    const videoBytes = Buffer.from('genjutsu-e2e-source-video');
    const imageBytes = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
      'base64'
    );
    await appPost('/api/genjutsu/attempt', cookie, {
      generationId,
      mode: 'motion-transfer',
      resolution: '720p',
      prompt: 'E2E smoke test',
    });

    const attempts = await appGet(
      '/api/user/generations?page=1&pageSize=12',
      cookie
    );
    const recordedAttempt = attempts.items.find(
      (item) => item.id === generationId
    );
    assert.ok(recordedAttempt, 'Generate click was not recorded');
    assert.equal(recordedAttempt.status, 'initiated');

    const uploadBatch = await appPost('/api/genjutsu/upload-url', cookie, {
      generationId,
      mode: 'motion-transfer',
      resolution: '720p',
      prompt: 'E2E smoke test',
      contentTypes: ['video/mp4', 'image/png'],
      contentLengths: [videoBytes.byteLength, imageBytes.byteLength],
    });
    assert.equal(uploadBatch.uploads.length, 2);

    const initiatedStatus = await appGet(
      `/api/genjutsu/status?generationId=${encodeURIComponent(generationId)}`,
      cookie
    );
    assert.equal(initiatedStatus.status, 'processing');
    assert.equal(initiatedStatus.providerStatus, 'initiated');

    // An identical retry may re-sign the same immutable input keys.
    await sleep(1_100);
    const repeatedUploadBatch = await appPost(
      '/api/genjutsu/upload-url',
      cookie,
      {
        generationId,
        mode: 'motion-transfer',
        resolution: '720p',
        prompt: 'E2E smoke test',
        contentTypes: ['video/mp4', 'image/png'],
        contentLengths: [videoBytes.byteLength, imageBytes.byteLength],
      }
    );
    assert.deepEqual(
      repeatedUploadBatch.uploads.map((item) => item.storageKey),
      uploadBatch.uploads.map((item) => item.storageKey)
    );

    // The same generationId must never be rebound to different inputs.
    await sleep(1_100);
    const conflict = await appPostExpectError(
      '/api/genjutsu/upload-url',
      cookie,
      {
        generationId,
        mode: 'motion-transfer',
        resolution: '720p',
        prompt: 'Different prompt must conflict',
        contentTypes: ['video/mp4', 'image/png'],
        contentLengths: [videoBytes.byteLength, imageBytes.byteLength],
      },
      409
    );
    assert.equal(conflict?.data?.code, 'GENERATION_INPUT_CONFLICT');

    const [videoUpload, imageUpload] = repeatedUploadBatch.uploads;
    assert.match(
      videoUpload.storageKey,
      /\/source\.mp4$/
    );
    assert.match(
      imageUpload.storageKey,
      /\/reference-01\.png$/
    );

    for (const [upload, bytes, type] of [
      [videoUpload, videoBytes, 'video/mp4'],
      [imageUpload, imageBytes, 'image/png'],
    ]) {
      const response = await fetch(upload.uploadUrl, {
        method: 'PUT',
        headers: {
          ...(upload.uploadHeaders || {}),
          'Content-Type': type,
        },
        body: bytes,
      });
      assert.ok(response.ok, `mock upload failed: HTTP ${response.status}`);
    }

    const sealed = await appPost('/api/genjutsu/seal-inputs', cookie, {
      generationId,
    });
    assert.equal(sealed.status, 'ready');
    assert.match(sealed.videoKey, /\/sealed-inputs\//);

    const readyStatus = await appGet(
      `/api/genjutsu/status?generationId=${encodeURIComponent(generationId)}`,
      cookie
    );
    assert.equal(readyStatus.status, 'processing');
    assert.equal(readyStatus.providerStatus, 'ready');

    // Old signed PUT URLs may still be valid, but they only target staging.
    // Overwriting staging after seal must not alter the provider input.
    const tamperedVideoBytes = Buffer.from('x'.repeat(videoBytes.byteLength));
    const overwrite = await fetch(videoUpload.uploadUrl, {
      method: 'PUT',
      headers: {
        ...(videoUpload.uploadHeaders || {}),
        'Content-Type': 'video/mp4',
      },
      body: tamperedVideoBytes,
    });
    assert.ok(overwrite.ok, `staging overwrite failed: HTTP ${overwrite.status}`);

    console.log('\n[6/6] Running Generate → Status → sealed source-video result...');
    const started = await appPost('/api/genjutsu/generate', cookie, {
      generationId,
    });

    assert.equal(started.generationId, generationId);
    assert.ok(started.requestId?.startsWith('e2e-'));
    assert.ok(started.reservedCredits > 0);

    await sleep(1_100);
    const completed = await appGet(
      `/api/genjutsu/status?generationId=${encodeURIComponent(generationId)}`,
      cookie
    );
    assert.equal(completed.status, 'completed');
    assert.equal(
      completed.videoUrl,
      `/api/genjutsu/result/${encodeURIComponent(generationId)}`
    );
    assert.equal(completed.reservedCredits, started.reservedCredits);

    // Once reservation/submission has started, upload inputs are frozen even
    // when the caller retries with the exact original payload.
    await sleep(1_100);
    const startedConflict = await appPostExpectError(
      '/api/genjutsu/upload-url',
      cookie,
      {
        generationId,
        mode: 'motion-transfer',
        resolution: '720p',
        prompt: 'E2E smoke test',
        contentTypes: ['video/mp4', 'image/png'],
        contentLengths: [videoBytes.byteLength, imageBytes.byteLength],
      },
      409
    );
    assert.equal(startedConflict?.data?.code, 'GENERATION_ALREADY_STARTED');

    const resultResponse = await fetch(`${baseUrl}${completed.videoUrl}`, {
      headers: {
        Cookie: cookie,
        Origin: baseUrl,
        Range: 'bytes=0-9',
      },
      redirect: 'follow',
    });
    assert.equal(resultResponse.status, 206);
    const returned = Buffer.from(await resultResponse.arrayBuffer());
    assert.deepEqual(returned, videoBytes.subarray(0, 10));

    console.log('\n✅ Genjutsu E2E passed');
    console.log('   auth → persisted attempt → staging upload → immutable seal →');
    console.log('   credit reserve → mock provider submit → durable result URL');
  } finally {
    stop();
    await new Promise((resolve) => setTimeout(resolve, 300));
    if (process.env.KEEP_E2E_DB !== '1') cleanDb();
  }
}

main().catch((error) => {
  console.error('\n❌ Genjutsu E2E failed');
  console.error(error);
  process.exitCode = 1;
});
