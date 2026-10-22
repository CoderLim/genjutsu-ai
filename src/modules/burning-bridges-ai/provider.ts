import type {
  GenjutsuProvider,
  GenjutsuProviderTarget,
} from '@/modules/genjutsu/types';
import {
  BURNING_BRIDGES_AI_PRODUCT,
  isSeedanceFamilyProvider,
  resolveObjectsSwapTargetForProvider,
  resolveProductProviderTarget,
} from '@/modules/genjutsu/workflow';

import { BURNING_BRIDGES_AI_MODE } from './constants';

export class BurningBridgesAiProviderBindingError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'BurningBridgesAiProviderBindingError';
  }
}

/**
 * Same router as Enzo / Crazy Frog / Gas Station:
 * `GENJUTSU_OBJECT_SWAP_PROVIDER` (homepage objects-swap), optionally overridden
 * by `GENJUTSU_PRODUCT_PROVIDER` for allowlisted product pages.
 */
export function resolveBurningBridgesAiProviderTarget(): GenjutsuProviderTarget {
  return resolveProductProviderTarget(
    BURNING_BRIDGES_AI_PRODUCT,
    BURNING_BRIDGES_AI_MODE
  );
}

/**
 * Persisted attempts keep the provider/model they were created with.
 * Accept any Seedance-family objects-swap pair for that provider.
 */
export function assertBurningBridgesAiProviderBinding(
  provider: unknown,
  model: unknown
) {
  if (
    typeof provider !== 'string' ||
    !provider.trim() ||
    typeof model !== 'string' ||
    !model.trim()
  ) {
    throw new BurningBridgesAiProviderBindingError(
      'Burning Bridges AI task is missing a provider/model binding'
    );
  }
  if (!isSeedanceFamilyProvider(provider)) {
    throw new BurningBridgesAiProviderBindingError(
      'Burning Bridges AI requires a Seedance family provider'
    );
  }
  const expected = resolveObjectsSwapTargetForProvider(
    provider as GenjutsuProvider
  );
  if (model !== expected.model) {
    throw new BurningBridgesAiProviderBindingError(
      'Burning Bridges AI task model does not match the Seedance objects-swap target for its provider'
    );
  }
}
