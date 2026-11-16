import type { GenjutsuProviderTarget } from '@/modules/genjutsu/types';
import {
  isPersistedProductProviderTarget,
  resolveProductProviderTarget,
} from '@/modules/genjutsu/workflow';

import {
  CAN_I_RIDE_DANCE_AI_MODE,
  CAN_I_RIDE_DANCE_AI_PRODUCT_ID,
} from './constants';

export class CanIRideDanceAiProviderBindingError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CanIRideDanceAiProviderBindingError';
  }
}

/** Resolve this product's server-owned model pin (independent of homepage env). */
export function resolveCanIRideDanceAiProviderTarget(): GenjutsuProviderTarget {
  return resolveProductProviderTarget(
    CAN_I_RIDE_DANCE_AI_PRODUCT_ID,
    CAN_I_RIDE_DANCE_AI_MODE
  );
}

/**
 * Persisted attempts keep the provider/model they were created with.
 * Accept previous Standard jobs as well as the current product-scoped Light pin.
 */
export function assertCanIRideDanceAiProviderBinding(
  provider: unknown,
  model: unknown
) {
  if (
    typeof provider !== 'string' ||
    !provider.trim() ||
    typeof model !== 'string' ||
    !model.trim()
  ) {
    throw new CanIRideDanceAiProviderBindingError(
      'Can I Ride Dance AI task is missing a provider/model binding'
    );
  }
  if (
    !isPersistedProductProviderTarget(provider, model, CAN_I_RIDE_DANCE_AI_MODE)
  ) {
    throw new CanIRideDanceAiProviderBindingError(
      `Can I Ride Dance AI does not support persisted provider/model (${String(provider)} / ${String(model)})`
    );
  }
}
