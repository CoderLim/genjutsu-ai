import type {
  GenjutsuProvider,
  GenjutsuProviderTarget,
} from '@/modules/genjutsu/types';
import {
  GTA_5_GOODBYE_AI_VIDEO_PRODUCT,
  isSeedanceFamilyProvider,
  resolveObjectsSwapTargetForProvider,
  resolveProductProviderTarget,
} from '@/modules/genjutsu/workflow';

import { GTA_5_GOODBYE_AI_VIDEO_MODE } from './constants';

export class Gta5GoodbyeAiVideoProviderBindingError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'Gta5GoodbyeAiVideoProviderBindingError';
  }
}

/**
 * Same router as Enzo / Crazy Frog / Gas Station:
 * `GENJUTSU_OBJECT_SWAP_PROVIDER` (homepage objects-swap), optionally overridden
 * by `GENJUTSU_PRODUCT_PROVIDER` for allowlisted product pages.
 */
export function resolveGta5GoodbyeAiVideoProviderTarget(): GenjutsuProviderTarget {
  return resolveProductProviderTarget(
    GTA_5_GOODBYE_AI_VIDEO_PRODUCT,
    GTA_5_GOODBYE_AI_VIDEO_MODE
  );
}

/**
 * Persisted attempts keep the provider/model they were created with.
 * Accept any Seedance-family objects-swap pair for that provider.
 */
export function assertGta5GoodbyeAiVideoProviderBinding(
  provider: unknown,
  model: unknown
) {
  if (
    typeof provider !== 'string' ||
    !provider.trim() ||
    typeof model !== 'string' ||
    !model.trim()
  ) {
    throw new Gta5GoodbyeAiVideoProviderBindingError(
      'GTA 5 Goodbye AI Video task is missing a provider/model binding'
    );
  }
  if (!isSeedanceFamilyProvider(provider)) {
    throw new Gta5GoodbyeAiVideoProviderBindingError(
      'GTA 5 Goodbye AI Video requires a Seedance family provider'
    );
  }
  const expected = resolveObjectsSwapTargetForProvider(
    provider as GenjutsuProvider
  );
  if (model !== expected.model) {
    throw new Gta5GoodbyeAiVideoProviderBindingError(
      'GTA 5 Goodbye AI Video task model does not match the Seedance objects-swap target for its provider'
    );
  }
}
