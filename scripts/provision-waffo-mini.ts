/**
 * Provision ONLY the Mini $9.99 / 600 credit SKU on Waffo.
 *
 * This script intentionally NEVER writes .env files, runtime DB/Admin settings,
 * existing Waffo SKUs, or production site configuration. The operator must
 * merge the printed Mini mapping into the CURRENT active Admin setting.
 *
 * Usage (after checking active Admin mapping and copying it to env):
 *   WAFFO_ENVIRONMENT=test WAFFO_MINI_CREATE=true \
 *   pnpm exec tsx scripts/with-env.ts "pnpm exec tsx scripts/provision-waffo-mini.ts"
 *
 * For production, additionally set WAFFO_MINI_CONFIRM_PROD_PROVISION=true.
 * Re-running before saving the Mini mapping can create a duplicate SKU:
 * check the Waffo Dashboard first if a previous run may have succeeded.
 */
import { Environment, TaxCategory, WaffoPancake } from '@waffo/pancake-ts';

import { GENJUTSU_CREDIT_PACKS } from '../src/modules/genjutsu/pricing.js';
import { withMiniWaffoProduct } from '../src/modules/payment/waffo-mini-mapping.js';

async function main() {
  const pack = GENJUTSU_CREDIT_PACKS.find((item) => item.id === 'mini');
  if (!pack || pack.priceCents !== 999 || pack.credits !== 600) {
    throw new Error('Mini catalog must be USD 9.99 / 600 credits');
  }
  if (
    !process.env.WAFFO_ENVIRONMENT ||
    !['test', 'prod'].includes(process.env.WAFFO_ENVIRONMENT)
  ) {
    throw new Error('Explicit WAFFO_ENVIRONMENT=test or prod is required');
  }
  const environment = process.env.WAFFO_ENVIRONMENT as 'test' | 'prod';
  const storeId = process.env.WAFFO_STORE_ID;
  const merchantId = process.env.WAFFO_MERCHANT_ID;
  const privateKey = process.env.WAFFO_PRIVATE_KEY;
  if (!storeId || !merchantId || !privateKey) {
    throw new Error(
      'WAFFO_STORE_ID, WAFFO_MERCHANT_ID and WAFFO_PRIVATE_KEY are required'
    );
  }

  // This must be copied from the ACTIVE Admin/DB setting, not an assumed
  // up-to-date local .env value. Otherwise a proposed merged mapping is stale.
  const rawMapping = process.env.WAFFO_PRODUCT_IDS_MAPPING;
  if (!rawMapping) {
    throw new Error(
      'Set WAFFO_PRODUCT_IDS_MAPPING to the current active Admin mapping'
    );
  }
  let current: unknown;
  try {
    current = JSON.parse(rawMapping);
  } catch {
    throw new Error('WAFFO_PRODUCT_IDS_MAPPING is invalid JSON');
  }
  // Validate all pre-existing IDs without changing them.
  const existing = current as Record<string, unknown>;
  const existingMini =
    typeof existing?.mini === 'string' ? existing.mini.trim() : '';
  if (existing?.mini !== undefined && !existingMini) {
    throw new Error('Invalid existing Mini product ID');
  }
  if (existingMini) {
    // Still require starter/creator/studio (and non-empty values) before exit.
    withMiniWaffoProduct(current, existingMini);
    console.log(
      `Mini mapping already exists (${existingMini}). No SKU created; verify its price in Waffo.`
    );
    return;
  }
  withMiniWaffoProduct(current, 'PENDING_MINI_ID');

  if (process.env.WAFFO_MINI_CREATE !== 'true') {
    console.log(
      'Dry run passed: current mapping has existing packs and no Mini.'
    );
    console.log('No Waffo or local configuration changes made.');
    return;
  }
  if (
    environment === 'prod' &&
    process.env.WAFFO_MINI_CONFIRM_PROD_PROVISION !== 'true'
  ) {
    throw new Error(
      'Production creation requires WAFFO_MINI_CONFIRM_PROD_PROVISION=true'
    );
  }

  const client = new WaffoPancake({
    merchantId,
    privateKey,
    environment: environment === 'prod' ? Environment.Prod : Environment.Test,
  });
  const expectedPrice = (pack.priceCents / 100).toFixed(2);
  const { product } = await client.onetimeProducts.create({
    storeId,
    name: 'Mini Credits',
    description: '600 Genjutsu credits — one-time purchase',
    prices: {
      USD: { amount: expectedPrice, taxCategory: TaxCategory.SaaS },
    },
    metadata: { catalogId: 'mini', app: 'genjutsu-ai' },
  });

  // Print immediately: an exception after creation must not hide the ID.
  console.log(`Created ${environment} Waffo Mini product: ${product.id}`);
  const actualPrice = product.prices?.USD?.amount;
  if (String(actualPrice) !== expectedPrice) {
    throw new Error(
      `Waffo Mini amount mismatch: expected USD ${expectedPrice}, got ${String(actualPrice)}. Do not activate this product.`
    );
  }
  await client.checkout.createSession({
    productId: product.id,
    currency: 'USD',
    buyerEmail: 'test@example.com',
    orderMerchantExternalId: `VERIFY_MINI_${Date.now()}`,
    successUrl: 'http://localhost:3000/settings/billing?success=1',
  });

  const proposedMapping = withMiniWaffoProduct(current, product.id);
  console.log('Verified created price and checkout availability.');
  console.log(
    'Proposed mapping; MANUALLY merge into the active Admin setting:'
  );
  console.log(JSON.stringify(proposedMapping, null, 2));
  console.log(
    'No mapping, DB, environment files or existing products were modified.'
  );
}

main().catch((error: any) => {
  console.error(error?.message || error);
  process.exitCode = 1;
});
