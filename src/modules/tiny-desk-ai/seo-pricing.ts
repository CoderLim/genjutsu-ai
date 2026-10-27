/**
 * SEO / glance copy amounts derived from the same estimate helpers and
 * Creator (highlighted) pack rate the generator UI uses — never a parallel
 * price table.
 */

import {
  estimateGenjutsuCreditsForProvider,
  GENJUTSU_CREDIT_PACKS,
  getDisplayCreditPack,
  getDisplayUsdPerCredit,
} from '@/modules/genjutsu/pricing';

import {
  TINY_DESK_AI_ASPECT_RATIO,
  TINY_DESK_AI_TEMPLATE_DURATION_SECONDS,
} from './constants';
import { resolveTinyDeskAiProviderTarget } from './provider';

export type TinyDeskAiSeoPriceAmounts = {
  /** Rounded Creator-pack USD for full 480p clip, e.g. "$10". */
  usd480: string;
  /** Rounded Creator-pack USD for full 720p clip, e.g. "$20". */
  usd720: string;
  /** Cheapest pack list price (“packs start at”), e.g. "$4.99". */
  starterPrice: string;
  /** Highlighted Creator pack list price, e.g. "$9.99". */
  creatorPrice: string;
};

/** Whole-dollar approx. USD at the Creator pack rate (matches glance / FAQ tone). */
export function getTinyDeskAiSeoPriceAmounts(): TinyDeskAiSeoPriceAmounts {
  const starter = GENJUTSU_CREDIT_PACKS[0]!;
  const creator = getDisplayCreditPack();
  const usdPerCredit = getDisplayUsdPerCredit();
  const provider = resolveTinyDeskAiProviderTarget().provider;

  const credits480 = estimateGenjutsuCreditsForProvider({
    provider,
    durationSeconds: TINY_DESK_AI_TEMPLATE_DURATION_SECONDS,
    resolution: '480p',
    aspectRatio: TINY_DESK_AI_ASPECT_RATIO,
  });
  const credits720 = estimateGenjutsuCreditsForProvider({
    provider,
    durationSeconds: TINY_DESK_AI_TEMPLATE_DURATION_SECONDS,
    resolution: '720p',
    aspectRatio: TINY_DESK_AI_ASPECT_RATIO,
  });

  return {
    usd480: `$${Math.round(credits480 * usdPerCredit)}`,
    usd720: `$${Math.round(credits720 * usdPerCredit)}`,
    starterPrice: `$${(starter.priceCents / 100).toFixed(2)}`,
    creatorPrice: `$${(creator.priceCents / 100).toFixed(2)}`,
  };
}
