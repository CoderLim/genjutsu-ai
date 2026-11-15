import type { GenjutsuProviderTarget } from '@/modules/genjutsu/types';
import {
  isPersistedProductProviderTarget,
  resolveProductProviderTarget,
} from '@/modules/genjutsu/workflow';

import {
  DECK_THE_HALLS_DANCE_AI_MODE,
  DECK_THE_HALLS_DANCE_AI_PRODUCT_ID,
} from './constants';

export class DeckTheHallsDanceAiProviderBindingError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DeckTheHallsDanceAiProviderBindingError';
  }
}

/** Resolve this product's server-owned model pin (independent of homepage env). */
export function resolveDeckTheHallsDanceAiProviderTarget(): GenjutsuProviderTarget {
  return resolveProductProviderTarget(
    DECK_THE_HALLS_DANCE_AI_PRODUCT_ID,
    DECK_THE_HALLS_DANCE_AI_MODE
  );
}

/**
 * Persisted attempts keep the provider/model they were created with.
 * Accept previous Standard jobs as well as the current product-scoped Light pin.
 */
export function assertDeckTheHallsDanceAiProviderBinding(
  provider: unknown,
  model: unknown
) {
  if (
    typeof provider !== 'string' ||
    !provider.trim() ||
    typeof model !== 'string' ||
    !model.trim()
  ) {
    throw new DeckTheHallsDanceAiProviderBindingError(
      'Deck the Halls Dance AI task is missing a provider/model binding'
    );
  }
  if (
    !isPersistedProductProviderTarget(
      provider,
      model,
      DECK_THE_HALLS_DANCE_AI_MODE
    )
  ) {
    throw new DeckTheHallsDanceAiProviderBindingError(
      `Deck the Halls Dance AI does not support persisted provider/model (${String(provider)} / ${String(model)})`
    );
  }
}
