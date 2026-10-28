import type {
  GenjutsuProvider,
  GenjutsuProviderTarget,
} from '@/modules/genjutsu/types';
import {
  isSeedanceFamilyProvider,
  resolveObjectsSwapTargetForProvider,
  resolveProductProviderTarget,
  SHAN_SHEN_BU_PRODUCT,
} from '@/modules/genjutsu/workflow';

import { SHAN_SHEN_BU_MODE } from './constants';

export class ShanShenBuProviderBindingError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ShanShenBuProviderBindingError';
  }
}

/**
 * Same router as Crazy Frog / A2O / Enzo / Smalltown:
 * `GENJUTSU_OBJECT_SWAP_PROVIDER` (homepage objects-swap), optionally overridden
 * by `GENJUTSU_PRODUCT_PROVIDER` for allowlisted product pages.
 */
export function resolveShanShenBuProviderTarget(): GenjutsuProviderTarget {
  return resolveProductProviderTarget(SHAN_SHEN_BU_PRODUCT, SHAN_SHEN_BU_MODE);
}

/**
 * Persisted attempts keep the provider/model they were created with.
 * Accept any Seedance-family objects-swap pair for that provider.
 */
export function assertShanShenBuProviderBinding(
  provider: unknown,
  model: unknown
) {
  if (
    typeof provider !== 'string' ||
    !provider.trim() ||
    typeof model !== 'string' ||
    !model.trim()
  ) {
    throw new ShanShenBuProviderBindingError(
      'Shan Shen Bu task is missing a provider/model binding'
    );
  }
  if (!isSeedanceFamilyProvider(provider)) {
    throw new ShanShenBuProviderBindingError(
      'Shan Shen Bu requires a Seedance family provider'
    );
  }
  const expected = resolveObjectsSwapTargetForProvider(
    provider as GenjutsuProvider
  );
  if (model !== expected.model) {
    throw new ShanShenBuProviderBindingError(
      'Shan Shen Bu task model does not match the Seedance objects-swap target for its provider'
    );
  }
}
