import type {
  GenjutsuProvider,
  GenjutsuProviderTarget,
} from '@/modules/genjutsu/types';
import {
  isSeedanceFamilyProvider,
  resolveObjectsSwapTargetForProvider,
  resolveProductProviderTarget,
  SAY_IT_RIGHT_AI_PRODUCT,
} from '@/modules/genjutsu/workflow';

import { SAY_IT_RIGHT_AI_MODE } from './constants';

export class SayItRightAiProviderBindingError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SayItRightAiProviderBindingError';
  }
}

/**
 * Same router as Burning Bridges / Gas Station:
 * `GENJUTSU_OBJECT_SWAP_PROVIDER` (homepage objects-swap), optionally overridden
 * by `GENJUTSU_PRODUCT_PROVIDER` for allowlisted product pages.
 */
export function resolveSayItRightAiProviderTarget(): GenjutsuProviderTarget {
  return resolveProductProviderTarget(
    SAY_IT_RIGHT_AI_PRODUCT,
    SAY_IT_RIGHT_AI_MODE
  );
}

/**
 * Persisted attempts keep the provider/model they were created with.
 * Accept any Seedance-family objects-swap pair for that provider.
 */
export function assertSayItRightAiProviderBinding(
  provider: unknown,
  model: unknown
) {
  if (
    typeof provider !== 'string' ||
    !provider.trim() ||
    typeof model !== 'string' ||
    !model.trim()
  ) {
    throw new SayItRightAiProviderBindingError(
      'Say It Right AI task is missing a provider/model binding'
    );
  }
  if (!isSeedanceFamilyProvider(provider)) {
    throw new SayItRightAiProviderBindingError(
      'Say It Right AI requires a Seedance family provider'
    );
  }
  const expected = resolveObjectsSwapTargetForProvider(
    provider as GenjutsuProvider
  );
  if (model !== expected.model) {
    throw new SayItRightAiProviderBindingError(
      'Say It Right AI task model does not match the Seedance objects-swap target for its provider'
    );
  }
}
