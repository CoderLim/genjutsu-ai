/**
 * Authoritative checkout catalog.
 *
 * The client sends only product_id as an identifier. Price, credits and
 * payment type are always resolved again on the server from this file.
 */

import { PaymentInterval, PaymentType } from '@/core/payment/types';
import {
  canSeeSmokeCreditPack,
  GENJUTSU_CREDIT_PACKS,
  GENJUTSU_SMOKE_CREDIT_PACK,
  type GenjutsuCreditPack,
} from '@/modules/genjutsu/pricing';

export type PricingPlanInfo = {
  name: string;
  interval: PaymentInterval;
  intervalCount: number;
};

export type PricingProduct = {
  productId: string;
  productName: string;
  planName: string;
  description: string;
  type: PaymentType;
  priceInCents: number;
  currency: string;
  credits: number;
  creditsValidDays?: number;
  plan?: PricingPlanInfo;
};

function toPricingProduct(pack: GenjutsuCreditPack): PricingProduct {
  return {
    productId: pack.id,
    productName: `${pack.name} Credits`,
    planName: pack.name,
    description: `${pack.credits.toLocaleString()} Genjutsu credits`,
    type: PaymentType.ONE_TIME,
    priceInCents: pack.priceCents,
    currency: pack.currency || 'usd',
    credits: pack.credits,
  };
}

export const pricingCatalog: Record<string, PricingProduct> =
  Object.fromEntries(
    [...GENJUTSU_CREDIT_PACKS, GENJUTSU_SMOKE_CREDIT_PACK].map((pack) => [
      pack.id,
      toPricingProduct(pack),
    ])
  );

export function getPricingProduct(productId: string): PricingProduct | null {
  if (!productId) return null;
  return pricingCatalog[productId] ?? null;
}

export function listPricingProducts(email?: string | null): PricingProduct[] {
  return Object.values(pricingCatalog).filter((product) => {
    if (product.productId !== GENJUTSU_SMOKE_CREDIT_PACK.id) return true;
    return canSeeSmokeCreditPack(email);
  });
}

export function assertCheckoutProductAllowed(
  productId: string,
  email?: string | null
): void {
  if (
    productId === GENJUTSU_SMOKE_CREDIT_PACK.id &&
    !canSeeSmokeCreditPack(email)
  ) {
    throw new Error('Product not available');
  }
}
