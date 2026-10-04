import { isProduction } from '@/lib/env';

import {
  isSeedanceLikenessRejection,
  SEEDANCE_LIKENESS_REJECTION_MESSAGE,
} from './seedance';

/** Stable English copy returned to end users for provider/infra failures. */
export const GENJUTSU_PROVIDER_FAILURE_USER_MESSAGE =
  'Generation failed. Please try again later.';

export const GENJUTSU_PROVIDER_FAILED_CODE = 'PROVIDER_FAILED';

/**
 * Official Ark Seedance privacy codes for “input may contain real person”
 * (ModelArk error table / arkcli-doctor §1.1.1):
 * - InputImageSensitiveContentDetected.PrivacyInformation
 * - InputVideoSensitiveContentDetected.PrivacyInformation
 *
 * @see https://www.volcengine.com/docs/82379/1299023
 */
export function isArkRealPersonPrivacyCode(
  code: string | null | undefined
): boolean {
  if (!code?.trim()) return false;
  const normalized = code.trim();
  return (
    normalized === 'InputImageSensitiveContentDetected.PrivacyInformation' ||
    normalized === 'InputVideoSensitiveContentDetected.PrivacyInformation' ||
    (normalized.includes('SensitiveContentDetected') &&
      normalized.endsWith('.PrivacyInformation'))
  );
}

/** Broader Ark content-safety codes (not necessarily real-person). */
export function isArkSensitiveContentCode(
  code: string | null | undefined
): boolean {
  if (!code?.trim()) return false;
  const normalized = code.trim();
  return (
    normalized.includes('SensitiveContentDetected') ||
    normalized.includes('RiskDetection') ||
    normalized === 'ContentSecurityDetectionError'
  );
}

/**
 * Provider dumps that should never reach the end-user UI (account ids,
 * request ids, Safe Experience Mode, internal model activation copy, etc.).
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

export function toUserFacingProviderError(
  raw: string,
  providerCode?: string | null
): string {
  // Prefer official Ark error codes over message heuristics.
  if (isArkRealPersonPrivacyCode(providerCode)) {
    return SEEDANCE_LIKENESS_REJECTION_MESSAGE;
  }
  if (isSeedanceLikenessRejection(raw)) {
    return SEEDANCE_LIKENESS_REJECTION_MESSAGE;
  }
  return GENJUTSU_PROVIDER_FAILURE_USER_MESSAGE;
}

export function splitProviderFailureError(
  raw: string | null | undefined,
  providerCode?: string | null
): {
  error: string;
  providerError: string;
  providerCode: string | null;
  errorCode: string;
  likeness: boolean;
} {
  const providerError = (raw || '').trim() || 'Generation failed';
  const normalizedCode =
    typeof providerCode === 'string' && providerCode.trim()
      ? providerCode.trim()
      : null;
  const likeness =
    isArkRealPersonPrivacyCode(normalizedCode) ||
    isSeedanceLikenessRejection(providerError);
  return {
    error: toUserFacingProviderError(providerError, normalizedCode),
    providerError,
    providerCode: normalizedCode,
    errorCode: likeness
      ? 'PROVIDER_LIKENESS_REJECTED'
      : GENJUTSU_PROVIDER_FAILED_CODE,
    likeness,
  };
}

/** Always log the raw provider dump (dev + prod). */
export function logGenjutsuProviderFailure(params: {
  stage: string;
  generationId?: string;
  providerStatus?: string;
  errorCode?: string;
  providerCode?: string | null;
  providerError: string;
}) {
  console.error('[genjutsu] provider failure', {
    stage: params.stage,
    generationId: params.generationId ?? null,
    providerStatus: params.providerStatus ?? null,
    errorCode: params.errorCode ?? null,
    providerCode: params.providerCode ?? null,
    providerError: params.providerError,
  });
}

/**
 * Expose raw providerError on API responses only outside production so local
 * Network/devtools can inspect it. Production keeps the sanitized message.
 */
export function providerFailureDebugFields(params: {
  providerError: string;
  providerCode?: string | null;
}) {
  if (isProduction) return {};
  return {
    providerError: params.providerError,
    ...(params.providerCode ? { providerCode: params.providerCode } : {}),
  };
}
