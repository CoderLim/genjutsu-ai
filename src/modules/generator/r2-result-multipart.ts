/**
 * Cloudflare R2 binding.put() rejects an unbounded TransformStream. Provider
 * videos may have no Content-Length, so use the Workers multipart API instead.
 *
 * Parts are exactly 8 MiB except the final part. This is above R2's 5 MiB
 * minimum, and keeps Worker buffering bounded independently of video size.
 */
export const GENERATOR_RESULT_PART_BYTES = 8 * 1024 * 1024;

type UploadedPart = { partNumber: number; etag: string };

export type GeneratorResultMultipartBucket = {
  createMultipartUpload(
    key: string,
    options: { httpMetadata: { contentType: string } }
  ): Promise<{
    uploadPart(partNumber: number, data: Uint8Array): Promise<UploadedPart>;
    complete(parts: UploadedPart[]): Promise<unknown>;
    abort(): Promise<void>;
  }>;
};

export async function putBoundedGeneratorResultMultipart(input: {
  bucket: GeneratorResultMultipartBucket;
  key: string;
  body: ReadableStream<Uint8Array>;
  contentType: string;
  maxBytes: number;
  declaredBytes?: number;
}): Promise<number> {
  const { bucket, key, body, contentType, maxBytes, declaredBytes } = input;
  if (!Number.isSafeInteger(maxBytes) || maxBytes < 1 ||
      (declaredBytes !== undefined &&
        (!Number.isSafeInteger(declaredBytes) || declaredBytes < 1 ||
         declaredBytes > maxBytes))) {
    throw new Error('Invalid provider media size');
  }

  const reader = body.getReader();
  let upload: Awaited<ReturnType<GeneratorResultMultipartBucket['createMultipartUpload']>> | undefined;
  let completed = false;
  let total = 0;
  let partLength = 0;
  let buffer = new Uint8Array(GENERATOR_RESULT_PART_BYTES);
  const parts: UploadedPart[] = [];

  try {
    upload = await bucket.createMultipartUpload(key, {
      httpMetadata: { contentType },
    });
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      if (!(value instanceof Uint8Array)) {
        throw new Error('Provider returned a non-byte media stream');
      }
      if (value.byteLength > maxBytes - total ||
          (declaredBytes !== undefined && value.byteLength > declaredBytes - total)) {
        throw new Error('Provider result exceeds maximum or declared file size');
      }
      total += value.byteLength;
      let offset = 0;
      while (offset < value.byteLength) {
        const take = Math.min(
          GENERATOR_RESULT_PART_BYTES - partLength,
          value.byteLength - offset
        );
        buffer.set(value.subarray(offset, offset + take), partLength);
        partLength += take;
        offset += take;
        if (partLength === GENERATOR_RESULT_PART_BYTES) {
          parts.push(await upload.uploadPart(parts.length + 1, buffer));
          // No concurrent uploads: only one buffered part plus the current
          // response chunk, avoiding 300MB accumulation in Worker memory.
          buffer = new Uint8Array(GENERATOR_RESULT_PART_BYTES);
          partLength = 0;
        }
      }
    }
    if (total === 0) throw new Error('Provider result is empty');
    if (declaredBytes !== undefined && total !== declaredBytes) {
      throw new Error('Provider result Content-Length does not match downloaded bytes');
    }
    if (partLength > 0) {
      parts.push(await upload.uploadPart(
        parts.length + 1, buffer.subarray(0, partLength)
      ));
    }
    await upload.complete(parts);
    completed = true;
    return total;
  } catch (error) {
    // Failed or truncated objects never become visible at the final key.
    // Always abort, including failures in uploadPart or complete.
    await Promise.allSettled([
      upload?.abort(),
      reader.cancel(error),
    ]);
    throw error;
  } finally {
    if (completed) {
      // Reader reached EOF; do not cancel an already completed source.
    }
    reader.releaseLock();
  }
}
