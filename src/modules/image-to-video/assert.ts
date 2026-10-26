export function assertImageToVideoGenerationId(value: unknown): string {
  if (typeof value !== 'string' || !/^[A-Za-z0-9_-]{8,128}$/.test(value)) {
    throw new Error('Invalid generation ID');
  }
  return value;
}
