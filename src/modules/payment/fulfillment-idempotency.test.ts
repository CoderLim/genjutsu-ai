import assert from 'node:assert/strict';
import test from 'node:test';

import { createClient } from '@libsql/client';

/**
 * Regression coverage for the two database invariants used by the D1 batch
 * checkout path. This is a SQLite behavioral test; the D1 adapter/batch must
 * ALSO be smoke-tested in a local Worker before production deployment.
 */
async function createLedger() {
  const client = createClient({ url: 'file::memory:' });
  await client.executeMultiple(`
    CREATE TABLE "order" (id TEXT PRIMARY KEY, status TEXT NOT NULL);
    CREATE TABLE subscription (
      id TEXT PRIMARY KEY,
      fulfillment_key TEXT UNIQUE
    );
    CREATE TABLE credit (
      id TEXT PRIMARY KEY,
      fulfillment_key TEXT UNIQUE,
      credits INTEGER NOT NULL
    );
    INSERT INTO "order" (id, status) VALUES ('order-1', 'created');
  `);
  return client;
}

function checkoutBatch(
  id: string,
  opts: { withGrant?: boolean; withSubscription?: boolean; failGrant?: boolean } = {}
) {
  const statements: { sql: string; args: (string | number)[] }[] = [];
  const key = 'checkout:order-1';
  if (opts.withSubscription) {
    statements.push({
      sql: 'INSERT INTO subscription (id, fulfillment_key) VALUES (?, ?)',
      args: [id, key],
    });
  }
  if (opts.withGrant !== false) {
    statements.push({
      sql: 'INSERT INTO credit (id, fulfillment_key, credits) VALUES (?, ?, ?)',
      args: [id, key, opts.failGrant ? -1 : 850],
    });
  }
  statements.push({
    sql: 'UPDATE "order" SET status = ? WHERE id = ? AND status IN (?, ?)',
    args: ['paid', 'order-1', 'created', 'pending'],
  });
  return statements;
}

test('concurrent duplicate checkout batches only grant credits once', async () => {
  const client = await createLedger();
  try {
    const attempts = await Promise.allSettled(
      Array.from({ length: 20 }, (_, i) =>
        client.batch(checkoutBatch('grant-' + i), 'write')
      )
    );
    assert.equal(attempts.filter(x => x.status === 'fulfilled').length, 1);
    const grants = await client.execute('SELECT COUNT(*) AS n FROM credit');
    assert.equal(Number(grants.rows[0].n), 1);
    const order = await client.execute('SELECT status FROM "order"');
    assert.equal(order.rows[0].status, 'paid');
  } finally {
    client.close();
  }
});

test('duplicate subscription checkout batch leaves no second subscription', async () => {
  const client = await createLedger();
  try {
    await client.batch(checkoutBatch('first', { withSubscription: true }), 'write');
    await assert.rejects(
      client.batch(checkoutBatch('second', { withSubscription: true }), 'write')
    );
    const subs = await client.execute('SELECT COUNT(*) AS n FROM subscription');
    const grants = await client.execute('SELECT COUNT(*) AS n FROM credit');
    assert.equal(Number(subs.rows[0].n), 1);
    assert.equal(Number(grants.rows[0].n), 1);
  } finally {
    client.close();
  }
});

test('subscription checkout without grant remains idempotent', async () => {
  const client = await createLedger();
  try {
    const opts = { withSubscription: true, withGrant: false };
    await client.batch(checkoutBatch('first', opts), 'write');
    await assert.rejects(client.batch(checkoutBatch('second', opts), 'write'));
    const subs = await client.execute('SELECT COUNT(*) AS n FROM subscription');
    assert.equal(Number(subs.rows[0].n), 1);
  } finally {
    client.close();
  }
});

test('a failed grant rolls back the whole batch including subscription', async () => {
  const client = await createLedger();
  try {
    await client.execute(
      'CREATE TRIGGER positive_credits BEFORE INSERT ON credit WHEN NEW.credits < 0 BEGIN SELECT RAISE(ABORT, \'invalid credit\'); END'
    );
    await assert.rejects(
      client.batch(
        checkoutBatch('failed', { withSubscription: true, failGrant: true }),
        'write'
      )
    );
    const sub = await client.execute('SELECT COUNT(*) AS n FROM subscription');
    const order = await client.execute('SELECT status FROM "order"');
    assert.equal(Number(sub.rows[0].n), 0);
    assert.equal(order.rows[0].status, 'created');
    await client.batch(checkoutBatch('retry', { withSubscription: true }), 'write');
    const grants = await client.execute('SELECT COUNT(*) AS n FROM credit');
    assert.equal(Number(grants.rows[0].n), 1);
  } finally {
    client.close();
  }
});
