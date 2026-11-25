import type { GenjutsuProviderTarget } from '@/modules/genjutsu/types';
import {
  isPersistedProductProviderTarget,
  resolveProductProviderTarget,
} from '@/modules/genjutsu/workflow';

import { TINY_DESK_AI_MODE, TINY_DESK_AI_PRODUCT_ID } from './constants';

export class TinyDeskAiProviderBindingError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TinyDeskAiProviderBindingError';
  }
}

/** Resolve this product's server-owned model pin (independent of homepage env). */
export function resolveTinyDeskAiProviderTarget(): GenjutsuProviderTarget {
  return resolveProductProviderTarget(
    TINY_DESK_AI_PRODUCT_ID,
    TINY_DESK_AI_MODE
  );
}

/**
 * Persisted attempts keep the provider/model they were created with.
 * Accept previous Light jobs as well as the current product-scoped Standard pin.
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
  if (!isPersistedProductProviderTarget(provider, model, TINY_DESK_AI_MODE)) {
    throw new TinyDeskAiProviderBindingError(
      `Tiny Desk AI does not support persisted provider/model (${String(provider)} / ${String(model)})`
    );
  }
}
