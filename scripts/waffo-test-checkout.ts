/**
 * Create a one-time test checkout session and print the URL.
 * Usage: pnpm exec tsx scripts/with-env.ts "pnpm exec tsx scripts/waffo-test-checkout.ts"
 */
import { writeFileSync } from 'node:fs';
import { Environment, WaffoPancake } from '@waffo/pancake-ts';

async function main() {
  const merchantId = process.env.WAFFO_MERCHANT_ID;
  const privateKey = process.env.WAFFO_PRIVATE_KEY;
  const mapping = JSON.parse(process.env.WAFFO_PRODUCT_IDS_MAPPING || '{}');
  const catalogId = process.argv[2] || 'starter_lifetime';
  const productId = mapping[catalogId];

  if (!merchantId || !privateKey) {
    throw new Error('Missing WAFFO_MERCHANT_ID / WAFFO_PRIVATE_KEY');
  }
  if (!productId) {
    throw new Error(`No mapping for ${catalogId}`);
  }

  const orderNo = `TEST_${Date.now()}`;
  const client = new WaffoPancake({
    merchantId,
    privateKey,
    environment: Environment.Test,
  });

  const session = await client.checkout.createSession({
    productId,
    currency: 'USD',
    buyerEmail: 'test-buyer@genjutsu.ai',
    orderMerchantExternalId: orderNo,
    successUrl: `http://localhost:3000/settings/billing?success=1&order_no=${orderNo}`,
  });

  const out = {
    catalogId,
    productId,
    orderNo,
    sessionId: session.sessionId,
    checkoutUrl: session.checkoutUrl,
  };
  writeFileSync('/tmp/waffo-test-checkout.json', JSON.stringify(out, null, 2));
  console.log(JSON.stringify(out, null, 2));
}

main().catch((e) => {
  console.error(e?.errors?.[0]?.message || e?.message || e);
  process.exit(1);
});
