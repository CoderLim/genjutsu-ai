/**
 * End-to-end app checkout via payment service (catalog ID → Waffo mapping).
 * Usage: pnpm exec tsx scripts/with-env.ts "pnpm exec tsx scripts/waffo-app-checkout.ts"
 */
import { writeFileSync } from 'node:fs';
import { eq } from 'drizzle-orm';

import { order, user } from '../src/config/db/schema.js';
import { getPricingProduct } from '../src/config/pricing.js';
import { db } from '../src/core/db/index.js';
import { PaymentType } from '../src/core/payment/types.js';
import { createCheckout } from '../src/modules/payment/service.js';

async function main() {
  const catalogId = process.argv[2] || 'starter_lifetime';
  const product = getPricingProduct(catalogId);
  if (!product) throw new Error(`Unknown product ${catalogId}`);

  const users = await db().select().from(user).limit(1);
  let buyer = users[0];
  if (!buyer) {
    throw new Error(
      'No user in DB. Sign up once at http://localhost:3000/sign-up then re-run.'
    );
  }

  console.log(`Using user ${buyer.email} (${buyer.id})`);

  const session = await createCheckout({
    userId: buyer.id,
    userEmail: buyer.email,
    productName: product.productName,
    planName: product.planName,
    credits: product.credits,
    creditsValidDays: product.creditsValidDays,
    paymentOrder: {
      productId: product.productId,
      price: { amount: product.priceInCents, currency: product.currency },
      type: product.type,
      description: product.description,
      successUrl: 'http://localhost:3000/settings/billing?success=1',
      cancelUrl: 'http://localhost:3000/pricing',
      customer: { email: buyer.email, name: buyer.name || undefined },
      plan: product.plan
        ? {
            name: product.plan.name,
            interval: product.plan.interval,
            intervalCount: product.plan.intervalCount,
          }
        : undefined,
    },
    provider: 'waffo',
  });

  // Find the order we just created
  const [row] = await db()
    .select()
    .from(order)
    .where(eq(order.paymentSessionId, session.checkoutInfo.sessionId))
    .limit(1);

  const out = {
    catalogId,
    orderNo: row?.orderNo,
    paymentSessionId: session.checkoutInfo.sessionId,
    checkoutUrl: session.checkoutInfo.checkoutUrl,
    provider: session.provider,
    dbStatus: row?.status,
    productIdStored: row?.productId,
  };
  writeFileSync('/tmp/waffo-app-checkout.json', JSON.stringify(out, null, 2));
  console.log(JSON.stringify(out, null, 2));
}

main().catch((e) => {
  console.error(e?.message || e);
  process.exit(1);
});
