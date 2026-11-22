/**
 * Provider's billable reference-video duration is the ceil of the sum of
 * clips, with a 2 second minimum charged per clip and a 15 second total cap.
 * Keep this browser-safe: the server independently reads sealed media lengths.
 */
export function referenceVideoBillableSeconds(seconds: number[]): number {
  if (seconds.length === 0) return 0;
  if (seconds.length > 3) throw new Error('Maximum 3 reference videos');
  let total = 0;
  for (const value of seconds) {
    if (!Number.isFinite(value) || value <= 0 || value > 15) {
      throw new Error('Reference video must be between 0 and 15 seconds');
    }
    total += Math.max(2, value);
  }
  if (total > 15 + 1e-6) {
    throw new Error('Combined reference video duration cannot exceed 15 seconds');
  }
  return Math.ceil(total - 1e-6);
}

export function assertReferenceAudioDuration(seconds: number[]): void {
  if (seconds.length > 3) throw new Error('Maximum 3 reference audios');
  let sum = 0;
  for (const value of seconds) {
    if (!Number.isFinite(value) || value <= 0 || value > 15) {
      throw new Error('Reference audio clip must be between 0 and 15 seconds');
    }
    sum += value;
  }
  if (sum > 15 + 1e-6) {
    throw new Error('Combined reference audio duration cannot exceed 15 seconds');
  }
}
