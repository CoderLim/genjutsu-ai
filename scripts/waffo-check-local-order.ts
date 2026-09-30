import { eq } from 'drizzle-orm';

import { credit, order } from '../src/config/db/schema.js';
import { db } from '../src/core/db/index.js';

async function main() {
  const orderNo = process.argv[2];
  if (!orderNo) throw new Error('orderNo required');

  const [row] = await db()
    .select()
    .from(order)
    .where(eq(order.orderNo, orderNo))
    .limit(1);

  const credits = row?.userId
    ? await db().select().from(credit).where(eq(credit.userId, row.userId))
    : [];

  console.log(
    JSON.stringify(
      {
        order: row
          ? {
              orderNo: row.orderNo,
              status: row.status,
              amount: row.amount,
              currency: row.currency,
              productId: row.productId,
              paymentProvider: row.paymentProvider,
              paymentSessionId: row.paymentSessionId,
              transactionId: row.transactionId,
              creditsAmount: row.creditsAmount,
            }
          : null,
        credits: credits.map((c) => ({
          id: c.id,
          credits: c.credits,
          remainingCredits: c.remainingCredits,
          transactionNo: c.transactionNo,
          status: c.status,
        })),
      },
      null,
      2
    )
  );
}

main().catch((e) => {
  console.error(e?.message || e);
  process.exit(1);
});
