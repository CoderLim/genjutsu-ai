import type {
  GenjutsuProvider,
  GenjutsuProviderTarget,
} from '@/modules/genjutsu/types';
import {
  GANGNAM_STYLE_AI_PRODUCT,
  isSeedanceFamilyProvider,
  resolveObjectsSwapTargetForProvider,
  resolveProductProviderTarget,
} from '@/modules/genjutsu/workflow';

import { GANGNAM_STYLE_AI_MODE } from './constants';

export class GangnamStyleAiProviderBindingError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'GangnamStyleAiProviderBindingError';
  }
}

/**
 * Same router as Crazy Frog / Smalltown:
 * `GENJUTSU_OBJECT_SWAP_PROVIDER` (homepage objects-swap), optionally overridden
 * by `GENJUTSU_PRODUCT_PROVIDER` for allowlisted product pages.
 */
export function resolveGangnamStyleAiProviderTarget(): GenjutsuProviderTarget {
  return resolveProductProviderTarget(
    GANGNAM_STYLE_AI_PRODUCT,
    GANGNAM_STYLE_AI_MODE
  );
}

/**
 * Persisted attempts keep the provider/model they were created with.
 * Accept any Seedance-family objects-swap pair for that provider — so an
 * in-flight Higgsfield job still settles after the site switches to Wavespeed.
 */
export function assertGangnamStyleAiProviderBinding(
  provider: unknown,
  model: unknown
) {
  if (
    typeof provider !== 'string' ||
    !provider.trim() ||
    typeof model !== 'string' ||
    !model.trim()
  ) {
    throw new GangnamStyleAiProviderBindingError(
      'Gangnam Style AI task is missing a provider/model binding'
    );
  }
  if (!isSeedanceFamilyProvider(provider)) {
    throw new GangnamStyleAiProviderBindingError(
      'Gangnam Style AI requires a Seedance family provider'
    );
  }
  const expected = resolveObjectsSwapTargetForProvider(
    provider as GenjutsuProvider
  );
  if (model !== expected.model) {
    throw new GangnamStyleAiProviderBindingError(
      'Gangnam Style AI task model does not match the Seedance objects-swap target for its provider'
    );
  }
}
