import type {
  GenjutsuProvider,
  GenjutsuProviderTarget,
} from '@/modules/genjutsu/types';
import {
  GAS_STATION_DANCE_AI_PRODUCT,
  isSeedanceFamilyProvider,
  resolveObjectsSwapTargetForProvider,
  resolveProductProviderTarget,
} from '@/modules/genjutsu/workflow';

import { GAS_STATION_DANCE_AI_MODE } from './constants';

export class GasStationDanceAiProviderBindingError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'GasStationDanceAiProviderBindingError';
  }
}

/**
 * Same router as Crazy Frog / Smalltown / Gangnam:
 * `GENJUTSU_OBJECT_SWAP_PROVIDER` (homepage objects-swap), optionally overridden
 * by `GENJUTSU_PRODUCT_PROVIDER` for allowlisted product pages.
 */
export function resolveGasStationDanceAiProviderTarget(): GenjutsuProviderTarget {
  return resolveProductProviderTarget(
    GAS_STATION_DANCE_AI_PRODUCT,
    GAS_STATION_DANCE_AI_MODE
  );
}

/**
 * Persisted attempts keep the provider/model they were created with.
 * Accept any Seedance-family objects-swap pair for that provider.
 */
export function assertGasStationDanceAiProviderBinding(
  provider: unknown,
  model: unknown
) {
  if (
    typeof provider !== 'string' ||
    !provider.trim() ||
    typeof model !== 'string' ||
    !model.trim()
  ) {
    throw new GasStationDanceAiProviderBindingError(
      'Gas Station Dance AI task is missing a provider/model binding'
    );
  }
  if (!isSeedanceFamilyProvider(provider)) {
    throw new GasStationDanceAiProviderBindingError(
      'Gas Station Dance AI requires a Seedance family provider'
    );
  }
  const expected = resolveObjectsSwapTargetForProvider(
    provider as GenjutsuProvider
  );
  if (model !== expected.model) {
    throw new GasStationDanceAiProviderBindingError(
      'Gas Station Dance AI task model does not match the Seedance objects-swap target for its provider'
    );
  }
}
