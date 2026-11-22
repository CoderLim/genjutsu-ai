import assert from 'node:assert/strict';
import test from 'node:test';

import {
  GENERATOR_RESULT_PART_BYTES,
  putBoundedGeneratorResultMultipart,
  type GeneratorResultMultipartBucket,
} from './r2-result-multipart';

function stream(chunks: Uint8Array[], failAfter = false): ReadableStream<Uint8Array> {
  let next = 0;
  return new ReadableStream({
    pull(controller) {
      if (next < chunks.length) controller.enqueue(chunks[next++]);
      else if (failAfter) controller.error(new Error('upstream network failure'));
      else controller.close();
    },
  });
}

function mockBucket(failPart?: number) {
  const state = {
    created: 0,
    aborted: 0,
    completed: 0,
    key: '',
    contentType: '',
    parts: [] as Array<{ num: number; bytes: number; first: number; last: number }>,
    finalParts: [] as Array<{ partNumber: number; etag: string }>,
  };
  const bucket: GeneratorResultMultipartBucket = {
    async createMultipartUpload(key, options) {
      state.created++;
      state.key = key;
      state.contentType = options.httpMetadata.contentType;
      return {
        async uploadPart(num, bytes) {
          if (num === failPart) throw new Error('simulated R2 part failure');
          state.parts.push({
            num, bytes: bytes.byteLength,
            first: bytes[0], last: bytes[bytes.byteLength - 1],
          });
          return { partNumber: num, etag: 'part-' + num };
        },
        async complete(parts) {
          state.completed++;
          state.finalParts = parts;
          return {};
        },
        async abort() {
          state.aborted++;
        },
      };
    },
  };
  return { bucket, state };
}

test('unknown-length video uploads in fixed 8MiB parts without buffering entire clip', async () => {
  const { bucket, state } = mockBucket();
  const a = new Uint8Array(GENERATOR_RESULT_PART_BYTES - 3).fill(11);
  const b = new Uint8Array(6).fill(22);
  const c = new Uint8Array(31).fill(33);
  const total = a.byteLength + b.byteLength + c.byteLength;
  assert.equal(await putBoundedGeneratorResultMultipart({
    bucket, key: 'generator/results/demo.mp4',
    body: stream([a, b, c]),
    contentType: 'video/mp4', maxBytes: 300 * 1024 * 1024,
  }), total);
  assert.equal(state.key, 'generator/results/demo.mp4');
  assert.equal(state.contentType, 'video/mp4');
  assert.deepEqual(state.parts.map(part => part.bytes), [GENERATOR_RESULT_PART_BYTES, 34]);
  assert.deepEqual(state.parts.map(part => part.num), [1, 2]);
  assert.equal(state.parts[0].first, 11);
  assert.equal(state.parts[0].last, 22);
  assert.equal(state.parts[1].first, 22);
  assert.equal(state.parts[1].last, 33);
  assert.deepEqual(state.finalParts, [
    { partNumber: 1, etag: 'part-1' },
    { partNumber: 2, etag: 'part-2' },
  ]);
  assert.equal(state.completed, 1);
  assert.equal(state.aborted, 0);
});

test('single part small image is valid as last multipart part', async () => {
  const { bucket, state } = mockBucket();
  const bytes = new Uint8Array([3, 8, 9, 15]);
  const len = await putBoundedGeneratorResultMultipart({
    bucket, key: 'generator/results/image.png',
    body: stream([bytes]), contentType: 'image/png',
    maxBytes: 30 * 1024 * 1024, declaredBytes: bytes.length,
  });
  assert.equal(len, 4);
  assert.deepEqual(state.parts.map(p => p.bytes), [4]);
  assert.equal(state.completed, 1);
});

test('exact multiple of part size has no zero-length trailing part', async () => {
  const { bucket, state } = mockBucket();
  const chunk = new Uint8Array(GENERATOR_RESULT_PART_BYTES);
  const len = await putBoundedGeneratorResultMultipart({
    bucket, key: 'generator/results/exact.mp4',
    body: stream([chunk, chunk]), contentType: 'video/mp4',
    maxBytes: GENERATOR_RESULT_PART_BYTES * 2,
  });
  assert.equal(len, GENERATOR_RESULT_PART_BYTES * 2);
  assert.deepEqual(state.parts.map(p => p.bytes),
    [GENERATOR_RESULT_PART_BYTES, GENERATOR_RESULT_PART_BYTES]);
});

test('unknown Content-Length still enforces maximum bytes and aborts partial object', async () => {
  const { bucket, state } = mockBucket();
  await assert.rejects(putBoundedGeneratorResultMultipart({
    bucket, key: 'generator/results/oversized.mp4',
    body: stream([
      new Uint8Array(GENERATOR_RESULT_PART_BYTES),
      new Uint8Array(128),
    ]),
    contentType: 'video/mp4',
    maxBytes: GENERATOR_RESULT_PART_BYTES + 100,
  }), /exceeds maximum/);
  assert.equal(state.aborted, 1);
  assert.equal(state.completed, 0);
});

test('declared Content-Length mismatch aborts even if source ends normally', async () => {
  const { bucket, state } = mockBucket();
  await assert.rejects(putBoundedGeneratorResultMultipart({
    bucket, key: 'generator/results/truncated.mp4',
    body: stream([new Uint8Array(15)]), contentType: 'video/mp4',
    maxBytes: 100, declaredBytes: 20,
  }), /Content-Length does not match/);
  assert.equal(state.aborted, 1);
  assert.equal(state.completed, 0);
});

test('failed R2 uploadPart aborts instead of committing a partial object', async () => {
  const { bucket, state } = mockBucket(1);
  await assert.rejects(putBoundedGeneratorResultMultipart({
    bucket, key: 'generator/results/fail.mp4',
    body: stream([new Uint8Array(GENERATOR_RESULT_PART_BYTES)]),
    contentType: 'video/mp4', maxBytes: 300 * 1024 * 1024,
  }), /simulated R2 part failure/);
  assert.equal(state.aborted, 1);
  assert.equal(state.completed, 0);
});

test('upstream stream error aborts and empty stream cannot complete', async () => {
  const fail = mockBucket();
  await assert.rejects(putBoundedGeneratorResultMultipart({
    bucket: fail.bucket, key: 'generator/results/closed.mp4',
    body: stream([new Uint8Array(7)], true),
    contentType: 'video/mp4', maxBytes: 300 * 1024 * 1024,
  }), /upstream network failure/);
  assert.equal(fail.state.aborted, 1);
  assert.equal(fail.state.completed, 0);
  const empty = mockBucket();
  await assert.rejects(putBoundedGeneratorResultMultipart({
    bucket: empty.bucket, key: 'generator/results/empty.mp4',
    body: stream([]), contentType: 'video/mp4', maxBytes: 100,
  }), /empty/);
  assert.equal(empty.state.aborted, 1);
  assert.equal(empty.state.completed, 0);
});
