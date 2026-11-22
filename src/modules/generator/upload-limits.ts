/** Enforce the actual byte count; Content-Length is not a security boundary. */
export function limitStagingUploadStream(
  source: ReadableStream<Uint8Array>,
  options: { expectedBytes: number; maxBytes: number }
): ReadableStream<Uint8Array> {
  const { expectedBytes, maxBytes } = options;
  if (!Number.isSafeInteger(maxBytes) || maxBytes < 1 ||
      !Number.isSafeInteger(expectedBytes) || expectedBytes < 1 ||
      expectedBytes > maxBytes) {
    throw new Error('Upload exceeds allowed file size');
  }
  let received = 0;
  return source.pipeThrough(new TransformStream<Uint8Array, Uint8Array>({
    transform(chunk, controller) {
      received += chunk.byteLength;
      if (received > expectedBytes || received > maxBytes) {
        throw new Error('Upload exceeds allowed file size');
      }
      controller.enqueue(chunk);
    },
    flush() {
      if (received !== expectedBytes) throw new Error('Upload size mismatch');
    },
  }));
}
