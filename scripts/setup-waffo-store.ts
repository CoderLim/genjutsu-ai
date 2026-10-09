/**
 * Create (or reuse) the Waffo store named after this repo, then create
 * products for every entry in the pricing catalog in WAFFO_ENVIRONMENT.
 *
 * Pitfalls already learned from person-remover / video-text-remover:
 *   - One Store per product app (do NOT reuse another app's STO_*)
 *   - Merchant + private key can be shared across apps
 *   - Test vs prod product IDs differ — WAFFO_ENVIRONMENT selects the target
 *   - New V2 products use catalog prices; per-session checkout priceSnapshot also enforces the local order amount
 *   - checkout maps via WAFFO_PRODUCT_IDS_MAPPING
 *   - Verify/create use the catalog currency (USD/CNY/…) — do not hardcode USD
 *   - Webhook: {APP_URL}/api/payment/notify/waffo (HTTPS public URL required)
 *
 * Usage:
 *   pnpm exec tsx scripts/with-env.ts "pnpm exec tsx scripts/setup-waffo-store.ts"
 *
 * Env required: WAFFO_MERCHANT_ID, WAFFO_PRIVATE_KEY
 * Optional: WAFFO_STORE_ID (reuse), WAFFO_PRODUCT_IDS_MAPPING (non-V2 products)
 * V2 public products require WAFFO_RECREATE_V2_PRODUCTS=true when provisioning.
 *
 * The generated mapping is written to .env.development and, when the app
 * database is configured, synchronized to DB-backed Admin settings because DB
 * config takes precedence over environment values at runtime.
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  BillingPeriod,
  Environment,
  TaxCategory,
  WaffoPancake,
  WebhookEventType,
  type Prices,
} from '@waffo/pancake-ts';

import { pricingCatalog } from '../src/config/pricing.js';
import { PaymentInterval, PaymentType } from '../src/core/payment/types.js';

const STORE_NAME = 'genjutsu-ai';
const ENV_PATH = resolve('.env.development');

const WEBHOOK_EVENTS = [
  WebhookEventType.OrderCompleted,
  WebhookEventType.SubscriptionActivated,
  WebhookEventType.SubscriptionCanceling,
  WebhookEventType.SubscriptionUncanceled,
  WebhookEventType.SubscriptionUpdated,
  WebhookEventType.SubscriptionCanceled,
  WebhookEventType.SubscriptionPastDue,
  WebhookEventType.RefundSucceeded,
  // Lifecycle events not yet in SDK enum (same as enable-waffo-subscription-renewed.ts)
  'subscription.renewed' as any,
  'subscription.recovered' as any,
];

function centsToAmount(cents: number) {
  return (cents / 100).toFixed(2);
}

function upsertEnv(key: string, value: string) {
  let content = existsSync(ENV_PATH) ? readFileSync(ENV_PATH, 'utf-8') : '';
  const line = `${key}=${value}`;
  if (new RegExp(`^${key}=`, 'm').test(content)) {
    content = content.replace(new RegExp(`^${key}=.*$`, 'm'), line);
  } else {
    content = content.trimEnd() + `\n${line}\n`;
  }
  writeFileSync(ENV_PATH, content, 'utf-8');
}

function mapBillingPeriod(
  interval?: PaymentInterval
): (typeof BillingPeriod)[keyof typeof BillingPeriod] {
  switch (interval) {
    case PaymentInterval.WEEK:
      return BillingPeriod.Weekly;
    case PaymentInterval.YEAR:
      return BillingPeriod.Yearly;
    case PaymentInterval.MONTH:
    default:
      return BillingPeriod.Monthly;
  }
}

async function verifyCheckoutAvailable(
  client: WaffoPancake,
  productId: string,
  currency: string
): Promise<boolean> {
  try {
    await client.checkout.createSession({
      productId,
      currency: currency.toUpperCase(),
      buyerEmail: 'test@example.com',
      orderMerchantExternalId: `VERIFY_${Date.now()}`,
      successUrl: 'http://localhost:3000/settings/billing?success=1',
    });
    return true;
  } catch {
    return false;
  }
}

async function findStoreByName(
  client: WaffoPancake,
  name: string
): Promise<{ id: string; name: string } | null> {
  const result = await client.graphql.query<{
    stores: Array<{ id: string; name: string }>;
  }>({
    query: `query { stores { id name } }`,
  });
  return result.data?.stores?.find((s) => s.name === name) ?? null;
}

async function ensureWebhook(
  client: WaffoPancake,
  storeId: string,
  appUrl: string,
  testMode: boolean
) {
  if (!appUrl.startsWith('https://')) {
    console.log(
      `Skip webhook: APP_URL is not HTTPS (${appUrl}). Register later at Dashboard.`
    );
    return;
  }

  const url = `${appUrl.replace(/\/$/, '')}/api/payment/notify/waffo`;
  const result = await client.graphql.query<{
    store: {
      storeWebhooks: Array<{ id: string; url: string; testMode: boolean }>;
    } | null;
  }>({
    query: `query ($storeId: String!) {
      store(id: $storeId) {
        storeWebhooks { id url testMode }
      }
    }`,
    variables: { storeId },
  });

  const existing = result.data?.store?.storeWebhooks?.find(
    (w) => w.url === url && w.testMode === testMode
  );
  if (existing) {
    console.log(`Webhook already registered: ${url}`);
    return;
  }

  const { webhook } = await client.webhooks.add({
    storeId,
    channel: 'http',
    url,
    events: WEBHOOK_EVENTS,
    testMode,
  });
  console.log(`Webhook registered: ${webhook.url} (${webhook.id})`);
}

async function main() {
  const merchantId = process.env.WAFFO_MERCHANT_ID;
  const privateKey = process.env.WAFFO_PRIVATE_KEY;
  if (!merchantId || !privateKey) {
    throw new Error('WAFFO_MERCHANT_ID and WAFFO_PRIVATE_KEY are required');
  }

  const waffoEnvironment =
    process.env.WAFFO_ENVIRONMENT === 'prod'
      ? Environment.Prod
      : Environment.Test;
  const environmentName =
    waffoEnvironment === Environment.Prod ? 'prod' : 'test';
  // V2 changed the USD prices for existing internal starter/creator/studio
  // IDs. A successful checkout-session probe does NOT verify remote pricing.
  // Never silently reuse V1 Waffo products under V2 catalog IDs.
  const isV2Pricing =
    pricingCatalog.starter?.priceInCents === 1499 &&
    pricingCatalog.creator?.priceInCents === 4999 &&
    pricingCatalog.studio?.priceInCents === 9999;
  const v2PublicIds = new Set(['starter', 'creator', 'studio']);
  const recreateV2 = process.env.WAFFO_RECREATE_V2_PRODUCTS === 'true';

  // Product mappings in DB settings affect LIVE checkout even before a code
  // deployment. Require an explicit cutover acknowledgement in production.
  if (
    isV2Pricing &&
    environmentName === 'prod' &&
    process.env.WAFFO_CONFIRM_V2_PROD_CUTOVER !== 'true'
  ) {
    throw new Error(
      'V2 production mapping is protected. Deploy/test the V2 snapshot-based checkout first, then set WAFFO_CONFIRM_V2_PROD_CUTOVER=true for the intentional cutover.'
    );
  }

  const client = new WaffoPancake({
    merchantId,
    privateKey,
    environment: waffoEnvironment,
  });

  let storeId = process.env.WAFFO_STORE_ID || '';
  if (storeId) {
    console.log(`Using existing store: ${storeId}`);
  } else {
    const found = await findStoreByName(client, STORE_NAME);
    if (found) {
      storeId = found.id;
      console.log(`Reusing store "${STORE_NAME}": ${storeId}`);
    } else {
      const { store } = await client.stores.create({ name: STORE_NAME });
      storeId = store.id;
      console.log(`Created store "${STORE_NAME}": ${storeId}`);
    }
    upsertEnv('WAFFO_STORE_ID', storeId);
  }

  let previousMapping: Record<string, string> = {};
  try {
    previousMapping = JSON.parse(process.env.WAFFO_PRODUCT_IDS_MAPPING || '{}');
  } catch {
    previousMapping = {};
  }

  // V2 always uses new public product IDs; a session availability check cannot
  // validate an existing remote product price. Require explicit provisioning.
  if (isV2Pricing && !recreateV2) {
    throw new Error(
      'V2 requires WAFFO_RECREATE_V2_PRODUCTS=true to provision new priced public SKUs. Existing product IDs cannot bypass price verification.'
    );
  }

  // Rebuild from the current catalog and retire the old Pro checkout mapping.
  const mapping: Record<string, string> = {};

  for (const product of Object.values(pricingCatalog)) {
    const catalogId = product.productId;
    const existingId = previousMapping[catalogId];
    const currency = (product.currency || 'usd').toUpperCase();

    const v2Pack = isV2Pricing && v2PublicIds.has(catalogId);
    if (
      existingId &&
      !v2Pack &&
      (await verifyCheckoutAvailable(client, existingId, currency))
    ) {
      console.log(`✓ ${catalogId} existing checkout works -> ${existingId}`);
      mapping[catalogId] = existingId;
      continue;
    }

    const prices: Prices = {
      [currency]: {
        amount: centsToAmount(product.priceInCents),
        taxCategory: TaxCategory.SaaS,
      },
    };

    const name = product.productName;
    const description = `${product.credits.toLocaleString()} Genjutsu credits — one-time purchase`;

    console.log(`Creating ${catalogId} (${product.type}, ${currency})...`);

    let productId: string;
    let createdPublicPrices: Prices | undefined;
    if (product.type === PaymentType.SUBSCRIPTION) {
      const { product: created } = await client.subscriptionProducts.create({
        storeId,
        name,
        description,
        billingPeriod: mapBillingPeriod(product.plan?.interval),
        prices,
        metadata: { catalogId, app: STORE_NAME },
      });
      productId = created.id;
    } else {
      const { product: created } = await client.onetimeProducts.create({
        storeId,
        name,
        description,
        prices,
        metadata: { catalogId, app: STORE_NAME },
      });
      productId = created.id;
      createdPublicPrices = created.prices;
    }

    // Product creation returns its persisted prices. Reject a missing,
    // differently-currencied or differently-priced V2 response before mapping.
    if (v2Pack) {
      const actual = createdPublicPrices?.[currency]?.amount;
      const expected = centsToAmount(product.priceInCents);
      if (actual !== expected) {
        throw new Error(
          `Waffo V2 price mismatch for ${catalogId}: expected ${currency} ${expected}, returned ${String(actual)}. Mapping was not published.`
        );
      }
      console.log(`✓ ${catalogId} created with verified response price ${currency} ${expected}`);
    }

    const ok = await verifyCheckoutAvailable(client, productId, currency);
    console.log(`  -> ${productId} (checkout availability: ${ok ? 'ok' : 'FAILED'})`);
    if (!ok) {
      throw new Error(
        `Created ${productId} but checkout availability failed — inspect Waffo environment and product status`
      );
    }
    mapping[catalogId] = productId;
  }

  const mappingJson = JSON.stringify(mapping);
  upsertEnv('WAFFO_PRODUCT_IDS_MAPPING', mappingJson);
  upsertEnv('WAFFO_ENABLED', 'true');
  upsertEnv('DEFAULT_PAYMENT_PROVIDER', 'waffo');
  upsertEnv('WAFFO_ENVIRONMENT', environmentName);
  upsertEnv('WAFFO_STORE_ID', storeId);

  // DB-backed Admin settings override env at runtime. Keep the active Waffo
  // mapping in sync when this script is run against a configured app DB.
  if (process.env.DATABASE_URL || process.env.DATABASE_PROVIDER === 'd1') {
    const { saveConfigs } = await import('../src/modules/config/service.js');
    await saveConfigs({
      waffo_product_ids_mapping: mappingJson,
      waffo_enabled: 'true',
      default_payment_provider: 'waffo',
      waffo_environment: environmentName,
      waffo_store_id: storeId,
    });
    console.log('Updated DB-backed Waffo app config.');
  }

  const appUrl = process.env.VITE_APP_URL || 'http://localhost:3000';
  await ensureWebhook(
    client,
    storeId,
    appUrl,
    waffoEnvironment !== Environment.Prod
  );

  console.log('\nDone. Mapping:');
  console.log(JSON.stringify(mapping, null, 2));
  console.log(`\nUpdated ${ENV_PATH}`);
}

main().catch((error: any) => {
  console.error(error?.errors?.[0]?.message || error?.message || error);
  process.exit(1);
});
