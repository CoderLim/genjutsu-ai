/**
 * Enable required Waffo subscription lifecycle events on existing HTTP
 * webhooks for the configured store. Safe to re-run (idempotent).
 *
 * Currently ensures:
 *   - subscription.renewed
 *   - subscription.recovered
 *
 *   ENV_FILE=.env.production pnpm exec tsx scripts/with-env.ts \
 *     "pnpm exec tsx scripts/enable-waffo-subscription-renewed.ts"
 *
 *   # dry-run (list only):
 *   DRY_RUN=1 ENV_FILE=.env.production pnpm exec tsx scripts/with-env.ts \
 *     "pnpm exec tsx scripts/enable-waffo-subscription-renewed.ts"
 */
import { Environment, WaffoPancake } from '@waffo/pancake-ts';

const REQUIRED_EVENTS = [
  'subscription.renewed',
  'subscription.recovered',
] as const;

type StoreWebhookRow = {
  id: string;
  channel: string;
  url: string;
  events: string[];
  testMode: boolean;
  createdAt?: string;
  updatedAt?: string;
};

async function main() {
  const merchantId = process.env.WAFFO_MERCHANT_ID;
  const privateKey = process.env.WAFFO_PRIVATE_KEY;
  const storeId = process.env.WAFFO_STORE_ID;
  const dryRun = process.env.DRY_RUN === '1';

  if (!merchantId || !privateKey || !storeId) {
    throw new Error(
      'WAFFO_MERCHANT_ID, WAFFO_PRIVATE_KEY, and WAFFO_STORE_ID are required'
    );
  }

  const environment =
    process.env.WAFFO_ENVIRONMENT === 'prod'
      ? Environment.Prod
      : Environment.Test;

  const client = new WaffoPancake({ merchantId, privateKey, environment });

  const result = await client.graphql.query<{
    store: {
      id: string;
      name: string;
      storeWebhooks: StoreWebhookRow[];
    } | null;
  }>({
    query: `query ($storeId: String!) {
      store(id: $storeId) {
        id
        name
        storeWebhooks {
          id
          channel
          url
          events
          testMode
          createdAt
          updatedAt
        }
      }
    }`,
    variables: { storeId },
  });

  const store = result.data?.store;
  if (!store) {
    throw new Error(`Store not found: ${storeId}`);
  }

  console.log(
    `Store: ${store.name} (${store.id}) env=${process.env.WAFFO_ENVIRONMENT || 'test'} dryRun=${dryRun}`
  );

  const webhooks = store.storeWebhooks || [];
  if (webhooks.length === 0) {
    console.log('No webhooks found for this store/environment.');
    return;
  }

  for (const wh of webhooks) {
    const missing = REQUIRED_EVENTS.filter((e) => !wh.events.includes(e));
    console.log(
      `\n[${wh.channel}] ${wh.url}\n  id=${wh.id} testMode=${wh.testMode}\n  events=${wh.events.join(', ') || '(none)'}\n  missing=${missing.join(', ') || '(none)'}`
    );

    if (wh.channel !== 'http') {
      console.log('  skip: non-http channel');
      continue;
    }

    if (missing.length === 0) {
      console.log('  ok: already enabled');
      continue;
    }

    const nextEvents = [...wh.events, ...missing];
    if (dryRun) {
      console.log(`  dry-run: would update events → ${nextEvents.join(', ')}`);
      continue;
    }

    // SDK enum lags the API for newer lifecycle events; cast intentionally.
    const updated = await client.webhooks.update({
      id: wh.id,
      events: nextEvents as any,
    });

    console.log(
      `  updated: ${updated.webhook.events.join(', ')}${
        updated.warnings?.length
          ? ` warnings=${JSON.stringify(updated.warnings)}`
          : ''
      }`
    );
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
