import {
  isSeedanceLikenessRejection,
  SEEDANCE_LIKENESS_REJECTION_MESSAGE,
} from './seedance';

/** Stable English copy returned to end users for provider/infra failures. */
export const GENJUTSU_PROVIDER_FAILURE_USER_MESSAGE =
  'Generation failed. Please try again later.';

export const GENJUTSU_PROVIDER_FAILED_CODE = 'PROVIDER_FAILED';

/**
 * Provider dumps that should never reach the end-user UI (account ids,
 * request ids, Safe Experience Mode, internal model activation copy, etc.).
 * Likeness rejections stay actionable; everything else becomes a generic
 * failure while the raw text is kept for admin via `providerError`.
 */
export function looksLikeRawProviderError(message: string): boolean {
  const text = message.trim();
  if (!text) return false;

  const lower = text.toLowerCase();
  return (
    /request\s*id\s*:/i.test(text) ||
    /your account\s*\[?\d+/i.test(text) ||
    lower.includes('safe experience mode') ||
    lower.includes('安心体验') ||
    lower.includes('安全体验') ||
    lower.includes('usage limit') ||
    lower.includes('model activation') ||
    lower.includes('model service has been paused') ||
    lower.includes('doubao-seedance') ||
    lower.includes('ark.cn-beijing') ||
    lower.includes('volcengine') ||
    /http\s+[45]\d\d/.test(lower)
  );
}

export function toUserFacingProviderError(raw: string): string {
  if (isSeedanceLikenessRejection(raw)) {
    return SEEDANCE_LIKENESS_REJECTION_MESSAGE;
  }
  // Provider HTTP / failed-status paths: never surface vendor account,
  // quota, request-id, or activation copy to end users.
  return GENJUTSU_PROVIDER_FAILURE_USER_MESSAGE;
}

export function splitProviderFailureError(raw: string | null | undefined): {
  error: string;
  providerError: string;
  errorCode: string;
  likeness: boolean;
} {
  const providerError = (raw || '').trim() || 'Generation failed';
  const likeness = isSeedanceLikenessRejection(providerError);
  return {
    error: toUserFacingProviderError(providerError),
    providerError,
    errorCode: likeness
      ? 'PROVIDER_LIKENESS_REJECTED'
      : GENJUTSU_PROVIDER_FAILED_CODE,
    likeness,
  };
}
