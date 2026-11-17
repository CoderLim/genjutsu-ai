import type { GenjutsuProviderTarget } from '@/modules/genjutsu/types';
import {
  isPersistedProductProviderTarget,
  resolveProductProviderTarget,
} from '@/modules/genjutsu/workflow';

import {
  GTA_5_GOODBYE_AI_VIDEO_MODE,
  GTA_5_GOODBYE_AI_VIDEO_PRODUCT_ID,
} from './constants';

export class Gta5GoodbyeAiVideoProviderBindingError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'Gta5GoodbyeAiVideoProviderBindingError';
  }
}

/**
 * Server-owned Higgsfield Genjutsu (standard) pin — independent of homepage
 * `GENJUTSU_OBJECT_SWAP_PROVIDER` and `GENJUTSU_PRODUCT_PROVIDER` (Seedance).
 */
export function resolveGta5GoodbyeAiVideoProviderTarget(): GenjutsuProviderTarget {
  return resolveProductProviderTarget(
    GTA_5_GOODBYE_AI_VIDEO_PRODUCT_ID,
    GTA_5_GOODBYE_AI_VIDEO_MODE
  );
}

/**
 * Persisted attempts keep the provider/model they were created with.
 * Accept previous Light jobs as well as the current product-scoped Standard pin.
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
  if (
    !isPersistedProductProviderTarget(
      provider,
      model,
      GTA_5_GOODBYE_AI_VIDEO_MODE
    )
  ) {
    throw new Gta5GoodbyeAiVideoProviderBindingError(
      `GTA 5 Goodbye AI Video does not support persisted provider/model (${String(provider)} / ${String(model)})`
    );
  }
}
