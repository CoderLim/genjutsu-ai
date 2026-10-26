import type {
  GenjutsuProvider,
  GenjutsuProviderTarget,
} from '@/modules/genjutsu/types';
import {
  isSeedanceFamilyProvider,
  resolveObjectsSwapTargetForProvider,
  resolveProductProviderTarget,
  TINY_DESK_AI_PRODUCT,
} from '@/modules/genjutsu/workflow';

import { TINY_DESK_AI_MODE } from './constants';

export class TinyDeskAiProviderBindingError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TinyDeskAiProviderBindingError';
  }
}

/**
 * Same router as Enzo / Crazy Frog / Gas Station:
 * `GENJUTSU_OBJECT_SWAP_PROVIDER` (homepage objects-swap), optionally overridden
 * by `GENJUTSU_PRODUCT_PROVIDER` for allowlisted product pages.
 */
export function resolveTinyDeskAiProviderTarget(): GenjutsuProviderTarget {
  return resolveProductProviderTarget(TINY_DESK_AI_PRODUCT, TINY_DESK_AI_MODE);
}

/**
 * Persisted attempts keep the provider/model they were created with.
 * Accept any Seedance-family objects-swap pair for that provider.
 */
export function assertTinyDeskAiProviderBinding(
  provider: unknown,
  model: unknown
) {
  if (
    typeof provider !== 'string' ||
    !provider.trim() ||
    typeof model !== 'string' ||
    !model.trim()
  ) {
    throw new TinyDeskAiProviderBindingError(
      'Tiny Desk AI task is missing a provider/model binding'
    );
  }
  if (!isSeedanceFamilyProvider(provider)) {
    throw new TinyDeskAiProviderBindingError(
      'Tiny Desk AI requires a Seedance family provider'
    );
  }
  const expected = resolveObjectsSwapTargetForProvider(
    provider as GenjutsuProvider
  );
  if (model !== expected.model) {
    throw new TinyDeskAiProviderBindingError(
      'Tiny Desk AI task model does not match the Seedance objects-swap target for its provider'
    );
  }
}
