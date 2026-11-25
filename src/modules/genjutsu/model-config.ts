import type { GenjutsuMode, GenjutsuProductId } from './types';

/**
 * Higgsfield Genjutsu endpoints. Both variants share the same Higgsfield
 * transport and task lifecycle; select a model, not a different provider.
 */
export const HIGGSFIELD_GENJUTSU_MODELS = {
  standard: {
    'objects-swap': 'higgsfield/genjutsu/object-swap/v1.0',
    'motion-transfer': 'higgsfield/genjutsu/motion-transfer/v1.0',
  },
  light: {
    'objects-swap': 'higgsfield/genjutsu-light/object-swap/v1.0',
    'motion-transfer': 'higgsfield/genjutsu-light/motion-transfer/v1.0',
  },
} as const satisfies Record<string, Record<GenjutsuMode, string>>;

export type HiggsfieldGenjutsuProfile = keyof typeof HIGGSFIELD_GENJUTSU_MODELS;

/**
 * Only product pages explicitly listed here are pinned to a model.
 * Other products and the homepage continue to use their existing env routing.
 *
 * Explicit product pages pin Standard or Light so homepage env changes do not
 * retarget them. Review each product's output quality before choosing a profile.
 */
export const PRODUCT_GENJUTSU_MODEL_PROFILES: Partial<
  Record<GenjutsuProductId, HiggsfieldGenjutsuProfile>
> = {
  'glow-stick': 'light',
  'tiny-desk-ai': 'standard',
  'chipmunks-dance': 'light',
  'bicep-heart': 'light',
  'deck-the-halls-dance-ai': 'light',
  'can-i-ride-dance-ai': 'light',
  'gta-5-goodbye-ai-video': 'standard',
  'wassup-in-a-minute-ai': 'standard',
};

export function getProductGenjutsuModelProfile(
  product: string | null | undefined
): HiggsfieldGenjutsuProfile | undefined {
  if (
    !product ||
    !Object.prototype.hasOwnProperty.call(
      PRODUCT_GENJUTSU_MODEL_PROFILES,
      product
    )
  ) {
    return undefined;
  }
  return PRODUCT_GENJUTSU_MODEL_PROFILES[product as GenjutsuProductId];
}

export function isHiggsfieldGenjutsuLightModel(
  model: string | null | undefined
) {
  return (
    typeof model === 'string' && model.startsWith('higgsfield/genjutsu-light/')
  );
}

export function isKnownHiggsfieldGenjutsuModel(
  model: string,
  mode: GenjutsuMode
) {
  return (
    model === HIGGSFIELD_GENJUTSU_MODELS.standard[mode] ||
    model === HIGGSFIELD_GENJUTSU_MODELS.light[mode]
  );
}
