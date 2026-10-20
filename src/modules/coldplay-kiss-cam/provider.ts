import type {
  GenjutsuProvider,
  GenjutsuProviderTarget,
} from '@/modules/genjutsu/types';
import {
  COLDPLAY_KISS_CAM_PRODUCT,
  isSeedanceFamilyProvider,
  resolveObjectsSwapTargetForProvider,
  resolveProductProviderTarget,
} from '@/modules/genjutsu/workflow';

import { COLDPLAY_KISS_CAM_MODE } from './constants';

export class ColdplayKissCamProviderBindingError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ColdplayKissCamProviderBindingError';
  }
}

/**
 * Same router as Crazy Frog / Smalltown:
 * `GENJUTSU_OBJECT_SWAP_PROVIDER` (homepage objects-swap), optionally overridden
 * by `GENJUTSU_PRODUCT_PROVIDER` for allowlisted product pages.
 */
export function resolveColdplayKissCamProviderTarget(): GenjutsuProviderTarget {
  return resolveProductProviderTarget(
    COLDPLAY_KISS_CAM_PRODUCT,
    COLDPLAY_KISS_CAM_MODE
  );
}

/**
 * Persisted attempts keep the provider/model they were created with.
 * Accept any Seedance-family objects-swap pair for that provider — so an
 * in-flight Higgsfield job still settles after the site switches to Wavespeed.
 */
export function assertColdplayKissCamProviderBinding(
  provider: unknown,
  model: unknown
) {
  if (
    typeof provider !== 'string' ||
    !provider.trim() ||
    typeof model !== 'string' ||
    !model.trim()
  ) {
    throw new ColdplayKissCamProviderBindingError(
      'Coldplay Kiss Cam task is missing a provider/model binding'
    );
  }
  if (!isSeedanceFamilyProvider(provider)) {
    throw new ColdplayKissCamProviderBindingError(
      'Coldplay Kiss Cam requires a Seedance family provider'
    );
  }
  const expected = resolveObjectsSwapTargetForProvider(
    provider as GenjutsuProvider
  );
  if (model !== expected.model) {
    throw new ColdplayKissCamProviderBindingError(
      'Coldplay Kiss Cam task model does not match the Seedance objects-swap target for its provider'
    );
  }
}
