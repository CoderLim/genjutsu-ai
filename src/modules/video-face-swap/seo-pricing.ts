/**
 * SEO / glance copy amounts derived from the same estimate helpers and
 * Creator (highlighted) pack rate the generator UI uses — never a parallel
 * price table.
 */

import {
  GENJUTSU_CREDIT_PACKS,
  getDisplayCreditPack,
  getDisplayUsdPerCredit,
} from '@/modules/genjutsu/pricing';

import { estimateVideoFaceSwapCredits } from './pricing';

export type VideoFaceSwapSeoPriceAmounts = {
  /** Min billable example at 480p, e.g. "21". */
  credits3s480: string;
  /** Creator-pack approx. USD for 3s 480p, e.g. "$0.25". */
  usd3s480: string;
  credits10s480: string;
  usd10s480: string;
  credits15s480: string;
  usd15s480: string;
  credits15s720: string;
  usd15s720: string;
  /** Cheapest pack list price (“packs start at”), e.g. "$4.99". */
  starterPrice: string;
  /** Highlighted Creator pack list price, e.g. "$9.99". */
  creatorPrice: string;
};

function formatCredits(credits: number) {
  return credits.toLocaleString('en-US');
}

function formatUsd(credits: number, usdPerCredit: number) {
  return `$${(credits * usdPerCredit).toFixed(2)}`;
}

/** Example durations for glance / FAQ / generator billing hint. */
export function getVideoFaceSwapSeoPriceAmounts(): VideoFaceSwapSeoPriceAmounts {
  const starter = GENJUTSU_CREDIT_PACKS[0]!;
  const creator = getDisplayCreditPack();
  const usdPerCredit = getDisplayUsdPerCredit();

  const credits3s480 = estimateVideoFaceSwapCredits({
    durationSeconds: 3,
    resolution: '480p',
  });
  const credits10s480 = estimateVideoFaceSwapCredits({
    durationSeconds: 10,
    resolution: '480p',
  });
  const credits15s480 = estimateVideoFaceSwapCredits({
    durationSeconds: 15,
    resolution: '480p',
  });
  const credits15s720 = estimateVideoFaceSwapCredits({
    durationSeconds: 15,
    resolution: '720p',
  });

  return {
    credits3s480: formatCredits(credits3s480),
    usd3s480: formatUsd(credits3s480, usdPerCredit),
    credits10s480: formatCredits(credits10s480),
    usd10s480: formatUsd(credits10s480, usdPerCredit),
    credits15s480: formatCredits(credits15s480),
    usd15s480: formatUsd(credits15s480, usdPerCredit),
    credits15s720: formatCredits(credits15s720),
    usd15s720: formatUsd(credits15s720, usdPerCredit),
    starterPrice: `$${(starter.priceCents / 100).toFixed(2)}`,
    creatorPrice: `$${(creator.priceCents / 100).toFixed(2)}`,
  };
}
