import type {
  GenjutsuProvider,
  GenjutsuProviderTarget,
} from '@/modules/genjutsu/types';
import {
  FLYING_CAR_AI_PRODUCT,
  isSeedanceFamilyProvider,
  resolveObjectsSwapTargetForProvider,
  resolveProductProviderTarget,
} from '@/modules/genjutsu/workflow';

import { FLYING_CAR_AI_MODE } from './constants';

export class FlyingCarAiProviderBindingError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'FlyingCarAiProviderBindingError';
  }
}

/**
 * Same router as Crazy Frog / A2O / Enzo / Smalltown:
 * `GENJUTSU_OBJECT_SWAP_PROVIDER` (homepage objects-swap), optionally overridden
 * by `GENJUTSU_PRODUCT_PROVIDER` for allowlisted product pages.
 */
export function resolveFlyingCarAiProviderTarget(): GenjutsuProviderTarget {
  return resolveProductProviderTarget(
    FLYING_CAR_AI_PRODUCT,
    FLYING_CAR_AI_MODE
  );
}

/**
 * Persisted attempts keep the provider/model they were created with.
 * Accept any Seedance-family objects-swap pair for that provider.
 */
export function assertFlyingCarAiProviderBinding(
  provider: unknown,
  model: unknown
) {
  if (
    typeof provider !== 'string' ||
    !provider.trim() ||
    typeof model !== 'string' ||
    !model.trim()
  ) {
    throw new FlyingCarAiProviderBindingError(
      'Flying Car AI task is missing a provider/model binding'
    );
  }
  if (!isSeedanceFamilyProvider(provider)) {
    throw new FlyingCarAiProviderBindingError(
      'Flying Car AI requires a Seedance family provider'
    );
  }
  const expected = resolveObjectsSwapTargetForProvider(
    provider as GenjutsuProvider
  );
  if (model !== expected.model) {
    throw new FlyingCarAiProviderBindingError(
      'Flying Car AI task model does not match the Seedance objects-swap target for its provider'
    );
  }
}
