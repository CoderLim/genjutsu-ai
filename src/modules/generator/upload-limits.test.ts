import assert from 'node:assert/strict';
import test from 'node:test';
import { limitStagingUploadStream } from './upload-limits';

function chunks(...sizes: number[]) {
  return new ReadableStream<Uint8Array>({
    start(controller) {
      for (const size of sizes) controller.enqueue(new Uint8Array(size));
      controller.close();
    },
  });
}

test('accepts exactly declared upload bytes', async () => {
  const bounded = limitStagingUploadStream(chunks(2, 3), {
    expectedBytes: 5, maxBytes: 5,
  });
  assert.equal((await new Response(bounded).arrayBuffer()).byteLength, 5);
});
test('rejects a body larger than its forged Content-Length', async () => {
  const bounded = limitStagingUploadStream(chunks(4, 4), {
    expectedBytes: 5, maxBytes: 10,
  });
  await assert.rejects(new Response(bounded).arrayBuffer(), /exceeds allowed/);
});
test('rejects a declared upload over the model-specific limit', () => {
  assert.throws(() => limitStagingUploadStream(chunks(10), {
    expectedBytes: 10, maxBytes: 5,
  }), /exceeds allowed/);
});
test('rejects an incomplete/truncated request body', async () => {
  const bounded = limitStagingUploadStream(chunks(2), {
    expectedBytes: 5, maxBytes: 8,
  });
  await assert.rejects(new Response(bounded).arrayBuffer(), /size mismatch/);
});
