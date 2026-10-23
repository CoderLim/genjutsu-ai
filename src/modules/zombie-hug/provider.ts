import type {
  GenjutsuProvider,
  GenjutsuProviderTarget,
} from '@/modules/genjutsu/types';
import {
  isSeedanceFamilyProvider,
  resolveObjectsSwapTargetForProvider,
  resolveProductProviderTarget,
  ZOMBIE_HUG_PRODUCT,
} from '@/modules/genjutsu/workflow';

import { ZOMBIE_HUG_MODE } from './constants';

export class ZombieHugProviderBindingError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ZombieHugProviderBindingError';
  }
}

/**
 * Same router as Crazy Frog / Coldplay:
 * `GENJUTSU_OBJECT_SWAP_PROVIDER` (homepage objects-swap), optionally overridden
 * by `GENJUTSU_PRODUCT_PROVIDER` for allowlisted product pages.
 */
export function resolveZombieHugProviderTarget(): GenjutsuProviderTarget {
  return resolveProductProviderTarget(ZOMBIE_HUG_PRODUCT, ZOMBIE_HUG_MODE);
}

/**
 * Persisted attempts keep the provider/model they were created with.
 * Accept any Seedance-family objects-swap pair for that provider — so an
 * in-flight Higgsfield job still settles after the site switches to Wavespeed.
 */
export function assertZombieHugProviderBinding(
  provider: unknown,
  model: unknown
) {
  if (
    typeof provider !== 'string' ||
    !provider.trim() ||
    typeof model !== 'string' ||
    !model.trim()
  ) {
    throw new ZombieHugProviderBindingError(
      'Zombie Hug task is missing a provider/model binding'
    );
  }
  if (!isSeedanceFamilyProvider(provider)) {
    throw new ZombieHugProviderBindingError(
      'Zombie Hug requires a Seedance family provider'
    );
  }
  const expected = resolveObjectsSwapTargetForProvider(
    provider as GenjutsuProvider
  );
  if (model !== expected.model) {
    throw new ZombieHugProviderBindingError(
      'Zombie Hug task model does not match the Seedance objects-swap target for its provider'
    );
  }
}
