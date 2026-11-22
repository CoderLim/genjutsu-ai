import {
  assertFalQueueUrls,
  type FalQueueUrls,
} from '@/core/ai/fal-queue-urls';

/** Provider metadata is durable, while taskResult is overwritten by polling. */
export function serializeGeneratorFalQueueMetadata(
  requestId: string,
  urls: FalQueueUrls | undefined
): string | null {
  return urls ? JSON.stringify({
    falQueue: assertFalQueueUrls(urls, requestId),
  }) : null;
}

/**
 * Existing tasks have no falQueue metadata and retain the legacy URL resolver.
 * Metadata present but invalid must never be used as a privileged fetch URL.
 */
export function readGeneratorFalQueueMetadata(
  taskInfo: string | null,
  requestId: string
): FalQueueUrls | undefined {
  if (!taskInfo) return;
  let parsed: unknown;
  try {
    parsed = JSON.parse(taskInfo);
  } catch {
    throw new Error('Invalid saved Fal queue metadata');
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('Invalid saved Fal queue metadata');
  }
  const record = parsed as Record<string, unknown>;
  if (record.falQueue === undefined) return;
  return assertFalQueueUrls(record.falQueue as FalQueueUrls, requestId);
}
