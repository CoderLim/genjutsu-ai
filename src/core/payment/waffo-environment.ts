import { envConfigs } from '@/config';

/** Only a local Vite dev server configured with a loopback URL uses Test. */
export type WaffoMode = 'test' | 'prod';

export function resolveWaffoEnvironment(
  isDevelopment: boolean,
  appUrl: string | undefined
): WaffoMode {
  if (!isDevelopment || !appUrl) return 'prod';

  try {
    const url = new URL(appUrl);
    const isLoopback =
      url.hostname === 'localhost' ||
      url.hostname === '127.0.0.1' ||
      url.hostname === '[::1]';
    return isLoopback && ['http:', 'https:'].includes(url.protocol)
      ? 'test'
      : 'prod';
  } catch {
    return 'prod';
  }
}

/** Never derive payment environment from a request Host header or user input. */
export function getWaffoEnvironment(): WaffoMode {
  return resolveWaffoEnvironment(
    Boolean(import.meta.env?.DEV),
    envConfigs.app_url
  );
}

/** Signed webhooks and production settlements must match exactly. */
export function assertWaffoMode(
  actual: string | undefined,
  expected: WaffoMode
): void {
  if (actual !== expected) {
    throw new Error(
      `Waffo payment mode mismatch: expected ${expected}, got ${actual ?? 'missing'}`
    );
  }
}
