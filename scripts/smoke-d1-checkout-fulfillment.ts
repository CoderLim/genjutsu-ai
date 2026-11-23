/**
 * Local Cloudflare D1 smoke (NOT production --remote).
 *
 * Exercises production fulfillCheckoutAtomically against a real D1 binding
 * from wrangler getPlatformProxy (Miniflare local DB).
 *
 * Usage:
 *   pnpm exec tsx scripts/smoke-d1-checkout-fulfillment.ts
 */
import { drizzle } from 'drizzle-orm/d1';
import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';
import { getPlatformProxy } from 'wrangler';

import {
  fulfillCheckoutAtomically,
  isCheckoutSettled,
} from '../src/modules/payment/checkout-fulfillment';

const order = sqliteTable('order', {
  id: text('id').primaryKey(),
  status: text('status').notNull(),
  subscriptionNo: text('subscription_no'),
});
const credit = sqliteTable('credit', {
  id: text('id').primaryKey(),
  orderNo: text('order_no').notNull(),
  fulfillmentKey: text('fulfillment_key').unique(),
  transactionType: text('transaction_type').notNull(),
  transactionScene: text('transaction_scene'),
  credits: integer('credits').notNull(),
});
const subscription = sqliteTable('subscription', {
  id: text('id').primaryKey(),
  subscriptionNo: text('subscription_no').notNull(),
  fulfillmentKey: text('fulfillment_key').unique(),
});

const tables = { order, credit, subscription };
const checkoutOrder = {
  id: 'smoke-order-1',
  orderNo: 'ORDsmoke1',
  creditsAmount: 850,
};

async function runSql(binding: D1Database, sql: string) {
  // Prefer batch of prepared statements over D1Database.exec for tooling hooks.
  const statements = sql
    .split(';')
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) => binding.prepare(s));
  if (statements.length === 1) {
    await statements[0].run();
    return;
  }
  if (statements.length > 1) {
    await binding.batch(statements);
  }
}

async function main() {
  const proxy = await getPlatformProxy({
    configPath: 'wrangler.jsonc',
    // Explicitly local; never touch production D1.
    persist: false,
  });

  try {
    const binding = (proxy.env as { DB?: D1Database }).DB;
    if (!binding) {
      throw new Error('Local D1 binding DB missing from getPlatformProxy env');
    }

    await runSql(
      binding,
      `
      DROP TABLE IF EXISTS credit;
      DROP TABLE IF EXISTS subscription;
      DROP TABLE IF EXISTS "order";
      CREATE TABLE "order" (
        id TEXT PRIMARY KEY,
        status TEXT NOT NULL,
        subscription_no TEXT
      );
      CREATE TABLE credit (
        id TEXT PRIMARY KEY,
        order_no TEXT NOT NULL,
        fulfillment_key TEXT,
        transaction_type TEXT NOT NULL,
        transaction_scene TEXT,
        credits INTEGER NOT NULL
      );
      CREATE UNIQUE INDEX ux_credit_fulfillment_key ON credit(fulfillment_key);
      CREATE TABLE subscription (
        id TEXT PRIMARY KEY,
        subscription_no TEXT NOT NULL,
        fulfillment_key TEXT
      );
      CREATE UNIQUE INDEX ux_subscription_fulfillment_key ON subscription(fulfillment_key);
      INSERT INTO "order" (id, status) VALUES ('smoke-order-1', 'created')
      `
    );

    const dbInstance = drizzle(binding);

    const attempt = (suffix: string) =>
      fulfillCheckoutAtomically({
        dbInstance,
        databaseProvider: 'd1',
        tables,
        checkoutOrder,
        expectsSubscription: false,
        newSubscription: null,
        newGrant: {
          id: `grant-${suffix}`,
          orderNo: checkoutOrder.orderNo,
          fulfillmentKey: `checkout:${checkoutOrder.orderNo}`,
          transactionType: 'grant',
          transactionScene: 'payment',
          credits: 850,
        },
        orderUpdate: { status: 'paid' },
      });

    console.log('[smoke] sequential duplicate…');
    const first = await attempt('seq-a');
    const second = await attempt('seq-b');
    if (first !== 'fulfilled' || second !== 'already_fulfilled') {
      throw new Error(`sequential mismatch: first=${first} second=${second}`);
    }

    await runSql(
      binding,
      `
      DELETE FROM credit;
      UPDATE "order" SET status = 'created' WHERE id = 'smoke-order-1'
      `
    );

    console.log('[smoke] 20 concurrent SUCCESS…');
    const results = await Promise.all(
      Array.from({ length: 20 }, (_, i) => attempt(`c-${i}`))
    );
    const fulfilled = results.filter((r) => r === 'fulfilled').length;
    const already = results.filter((r) => r === 'already_fulfilled').length;
    const grants = await binding
      .prepare('SELECT COUNT(*) AS n FROM credit')
      .first<{ n: number }>();
    const orderRow = await binding
      .prepare('SELECT status FROM "order" WHERE id = ?')
      .bind('smoke-order-1')
      .first<{ status: string }>();

    console.log(
      JSON.stringify(
        {
          fulfilled,
          already_fulfilled: already,
          grantCount: Number(grants?.n ?? -1),
          orderStatus: orderRow?.status,
        },
        null,
        2
      )
    );

    if (fulfilled !== 1 || already !== 19) {
      throw new Error(
        `concurrency mismatch: fulfilled=${fulfilled} already=${already}`
      );
    }
    if (Number(grants?.n) !== 1 || orderRow?.status !== 'paid') {
      throw new Error('ledger mismatch after concurrency');
    }

    const settled = await isCheckoutSettled(
      dbInstance,
      tables,
      checkoutOrder,
      false
    );
    if (!settled) throw new Error('isCheckoutSettled returned false');

    await runSql(
      binding,
      `
      DELETE FROM credit;
      UPDATE "order" SET status = 'failed' WHERE id = 'smoke-order-1'
      `
    );
    console.log('[smoke] failed → late SUCCESS…');
    const late = await attempt('late');
    if (late !== 'fulfilled') {
      throw new Error(`late success mismatch: ${late}`);
    }

    console.log('[smoke] PASS (local D1 binding via getPlatformProxy)');
  } finally {
    await proxy.dispose();
  }
}

main().catch((err) => {
  console.error('[smoke] FAIL', err);
  process.exit(1);
});
