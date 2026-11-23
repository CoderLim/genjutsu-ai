import assert from 'node:assert/strict';
import test from 'node:test';

import { createClient } from '@libsql/client';
import { drizzle } from 'drizzle-orm/libsql';
import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

import {
  canProcessCheckoutStatus,
  fulfillCheckoutAtomically,
  isCheckoutSettled,
} from './checkout-fulfillment';

// Lightweight SQLite table definitions allow the production settlement
// function to run against a real SQL engine without a payment provider or D1.
const order = sqliteTable('order', {
  id: text('id').primaryKey(),
  status: text('status').notNull(),
  subscriptionNo: text('subscription_no'),
  paidUpdates: integer('paid_updates').notNull().default(0),
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
  id: 'order-1',
  orderNo: 'ORD123',
  creditsAmount: 850,
};

async function createFixture(status: string = 'created') {
  const client = createClient({ url: 'file::memory:' });
  await client.executeMultiple(`
    CREATE TABLE "order" (
      id TEXT PRIMARY KEY, status TEXT NOT NULL,
      subscription_no TEXT, paid_updates INTEGER NOT NULL DEFAULT 0
    );
    CREATE TABLE credit (
      id TEXT PRIMARY KEY, order_no TEXT NOT NULL,
      fulfillment_key TEXT UNIQUE, transaction_type TEXT NOT NULL,
      transaction_scene TEXT, credits INTEGER NOT NULL
    );
    CREATE TABLE subscription (
      id TEXT PRIMARY KEY, subscription_no TEXT NOT NULL,
      fulfillment_key TEXT UNIQUE
    );
    CREATE TRIGGER count_paid_updates
      AFTER UPDATE OF status ON "order"
      WHEN NEW.status = 'paid'
      BEGIN UPDATE "order" SET paid_updates = paid_updates + 1 WHERE id = NEW.id; END;
  `);
  await client.execute({
    sql: 'INSERT INTO "order" (id, status) VALUES (?, ?)',
    args: [checkoutOrder.id, status],
  });

  return {
    client,
    database: drizzle({ client }),
    async state() {
      const [orders, credits, subs] = await Promise.all([
        client.execute('SELECT status, subscription_no, paid_updates FROM "order"'),
        client.execute('SELECT * FROM credit'),
        client.execute('SELECT * FROM subscription'),
      ]);
      return {
        status: orders.rows[0].status,
        paidUpdates: Number(orders.rows[0].paid_updates),
        subscriptionNo: orders.rows[0].subscription_no,
        credits: credits.rows,
        subscriptions: subs.rows,
      };
    },
  };
}

function attempt(database: any, suffix: string, options: {
  withSubscription?: boolean;
  grantCredits?: number;
  databaseProvider?: 'd1' | 'sqlite';
} = {}) {
  const withSubscription = Boolean(options.withSubscription);
  return fulfillCheckoutAtomically({
    dbInstance: database,
    databaseProvider: options.databaseProvider ?? 'd1',
    tables,
    checkoutOrder,
    expectsSubscription: withSubscription,
    newSubscription: withSubscription
      ? {
          id: 'sub-' + suffix,
          subscriptionNo: 'SUB-' + suffix,
          fulfillmentKey: 'checkout:ORD123',
        }
      : null,
    newGrant: {
      id: 'grant-' + suffix,
      orderNo: 'ORD123',
      fulfillmentKey: 'checkout:ORD123',
      transactionType: 'grant',
      transactionScene: withSubscription ? 'subscription' : 'payment',
      credits: options.grantCredits ?? 850,
    },
    orderUpdate: {
      status: 'paid',
      ...(withSubscription ? { subscriptionNo: 'SUB-' + suffix } : {}),
    },
  });
}

test('real checkout settlement function: repeated SUCCESS is fulfilled exactly once', async () => {
  const fixture = await createFixture();
  try {
    assert.equal(await attempt(fixture.database, 'one'), 'fulfilled');
    assert.equal(await attempt(fixture.database, 'two'), 'already_fulfilled');
    const s = await fixture.state();
    assert.equal(s.status, 'paid');
    assert.equal(s.paidUpdates, 1);
    assert.equal(s.credits.length, 1);
    assert.equal(s.credits[0].credits, 850);
  } finally {
    fixture.client.close();
  }
});

test('real checkout settlement function: 20 concurrent SUCCESS attempts yield one grant', async () => {
  const fixture = await createFixture();
  try {
    const results = await Promise.all(
      Array.from({ length: 20 }, (_, i) => attempt(fixture.database, String(i)))
    );
    assert.equal(results.filter((result) => result === 'fulfilled').length, 1);
    assert.equal(
      results.filter((result) => result === 'already_fulfilled').length,
      19
    );
    const s = await fixture.state();
    assert.equal(s.credits.length, 1);
    assert.equal(s.paidUpdates, 1);
    assert.equal(s.status, 'paid');
  } finally {
    fixture.client.close();
  }
});

test('isCheckoutSettled accepts paid order with matching grant', async () => {
  const fixture = await createFixture();
  try {
    await attempt(fixture.database, 'one');
    assert.equal(
      await isCheckoutSettled(fixture.database, tables, checkoutOrder, false),
      true
    );
  } finally {
    fixture.client.close();
  }
});

test('isCheckoutSettled fails closed when paid order has no grant', async () => {
  const fixture = await createFixture('paid');
  try {
    await assert.rejects(
      isCheckoutSettled(fixture.database, tables, checkoutOrder, false),
      /missing its expected credit grant/
    );
  } finally {
    fixture.client.close();
  }
});

test('isCheckoutSettled fails closed on a wrong grant amount', async () => {
  const fixture = await createFixture('paid');
  try {
    await fixture.client.execute(
      "INSERT INTO credit (id, order_no, fulfillment_key, transaction_type, transaction_scene, credits) VALUES ('one', 'ORD123', 'checkout:ORD123', 'grant', 'payment', 400)"
    );
    await assert.rejects(
      isCheckoutSettled(fixture.database, tables, checkoutOrder, false),
      /missing its expected credit grant/
    );
  } finally {
    fixture.client.close();
  }
});

test('verified late SUCCESS recovers failed order through the actual settlement function', async () => {
  const fixture = await createFixture('failed');
  try {
    assert.equal(await attempt(fixture.database, 'late'), 'fulfilled');
    const s = await fixture.state();
    assert.equal(s.status, 'paid');
    assert.equal(s.paidUpdates, 1);
    assert.equal(s.credits.length, 1);
  } finally {
    fixture.client.close();
  }
});

test('subscription checkout creates subscription and grant only once', async () => {
  const fixture = await createFixture();
  try {
    assert.equal(
      await attempt(fixture.database, 'first', { withSubscription: true }),
      'fulfilled'
    );
    assert.equal(
      await attempt(fixture.database, 'second', { withSubscription: true }),
      'already_fulfilled'
    );
    const s = await fixture.state();
    assert.equal(s.subscriptions.length, 1);
    assert.equal(s.credits.length, 1);
    assert.equal(s.paidUpdates, 1);
  } finally {
    fixture.client.close();
  }
});

test('isCheckoutSettled rejects paid subscription without subscription record', async () => {
  const fixture = await createFixture('paid');
  try {
    await assert.rejects(
      isCheckoutSettled(fixture.database, tables, checkoutOrder, true),
      /missing its subscription/
    );
  } finally {
    fixture.client.close();
  }
});

test('failed grant rolls back real atomic batch and retry fulfills it', async () => {
  const fixture = await createFixture();
  try {
    await fixture.client.execute(
      "CREATE TRIGGER positive_credits BEFORE INSERT ON credit WHEN NEW.credits < 0 BEGIN SELECT RAISE(ABORT, 'negative credit'); END"
    );
    await assert.rejects(
      attempt(fixture.database, 'bad', {
        withSubscription: true,
        grantCredits: -1,
      })
    );
    const rolledBack = await fixture.state();
    assert.equal(rolledBack.status, 'created');
    assert.equal(rolledBack.credits.length, 0);
    assert.equal(rolledBack.subscriptions.length, 0);

    assert.equal(
      await attempt(fixture.database, 'retry', { withSubscription: true }),
      'fulfilled'
    );
    const recovered = await fixture.state();
    assert.equal(recovered.status, 'paid');
    assert.equal(recovered.credits.length, 1);
    assert.equal(recovered.subscriptions.length, 1);
  } finally {
    fixture.client.close();
  }
});

test('checkout status gate permits verified late SUCCESS but not late failure', () => {
  assert.equal(canProcessCheckoutStatus('created', true), true);
  assert.equal(canProcessCheckoutStatus('pending', true), true);
  assert.equal(canProcessCheckoutStatus('failed', true), true);
  assert.equal(canProcessCheckoutStatus('failed', false), false);
  assert.equal(canProcessCheckoutStatus('paid', true), false);
  assert.equal(canProcessCheckoutStatus('paid', false), false);
});
