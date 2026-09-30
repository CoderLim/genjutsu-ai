/**
 * Authoritative checkout catalog.
 *
 * The client sends only product_id as an identifier. Price, credits and
 * payment type are always resolved again on the server from this file.
 */

import { PaymentType } from '@/core/payment/types';
import { GENJUTSU_CREDIT_PACKS } from '@/modules/genjutsu/pricing';

export type PricingPlanInfo = {
  name: string;
  interval: string;
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

export const pricingCatalog: Record<string, PricingProduct> =
  Object.fromEntries(
    GENJUTSU_CREDIT_PACKS.map((pack) => [
      pack.id,
      {
        productId: pack.id,
        productName: `${pack.name} Credits`,
        planName: pack.name,
        description: `${pack.credits.toLocaleString()} Genjutsu credits`,
        type: PaymentType.ONE_TIME,
        priceInCents: pack.priceCents,
        currency: 'usd',
        credits: pack.credits,
      },
    ])
  );

export function getPricingProduct(productId: string): PricingProduct | null {
  if (!productId) return null;
  return pricingCatalog[productId] ?? null;
}

export function listPricingProducts(): PricingProduct[] {
  return Object.values(pricingCatalog);
}
