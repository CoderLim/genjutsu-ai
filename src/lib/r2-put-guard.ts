/**
 * A CLI upload must not overwrite an R2 object without explicit opt-in.
 * Called only after a signed read-only HEAD. Unexpected HEAD results fail closed.
 */
export function checkR2PutHeadStatus(status: number, force: boolean): 'new' | 'existing' {
  if (status === 404) return 'new';
  if (status >= 200 && status < 300) {
    if (!force) {
      throw new Error('R2 object already exists. Pass --force to overwrite intentionally.');
    }
    return 'existing';
  }
  throw new Error(
    `Cannot verify R2 destination before upload (HEAD HTTP ${status}). Upload aborted.`
  );
}
