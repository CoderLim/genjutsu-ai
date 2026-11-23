import { and, eq, inArray } from 'drizzle-orm';

/**
 * Shared checkout settlement boundary used by the real payment service.
 * Tables/driver are passed in so the same implementation can be exercised
 * against a SQLite ledger without invoking the payment provider.
 */
export type CheckoutTables = {
  order: any;
  credit: any;
  subscription: any;
};

export type CheckoutOrder = {
  id: string;
  orderNo: string;
  creditsAmount: number | null;
};

/**
 * Gate the initial checkout by order status.
 * Verified late SUCCESS may recover a previously failed/canceled checkout.
 */
export function canProcessCheckoutStatus(
  orderStatus: string,
  isVerifiedSuccess: boolean
): boolean {
  return (
    orderStatus === 'created' ||
    orderStatus === 'pending' ||
    (orderStatus === 'failed' && isVerifiedSuccess)
  );
}

export async function isCheckoutSettled(
  dbInstance: any,
  tables: CheckoutTables,
  checkoutOrder: CheckoutOrder,
  expectsSubscription: boolean
): Promise<boolean> {
  const [paidOrder] = await dbInstance
    .select({
      status: tables.order.status,
      subscriptionNo: tables.order.subscriptionNo,
    })
    .from(tables.order)
    .where(eq(tables.order.id, checkoutOrder.id))
    .limit(1);

  if (!paidOrder || paidOrder.status !== 'paid') return false;

  if (expectsSubscription && !paidOrder.subscriptionNo) {
    throw new Error(
      `Paid order ${checkoutOrder.orderNo} is missing its subscription`
    );
  }

  if (checkoutOrder.creditsAmount && checkoutOrder.creditsAmount > 0) {
    const [grant] = await dbInstance
      .select({ credits: tables.credit.credits })
      .from(tables.credit)
      .where(
        and(
          eq(tables.credit.orderNo, checkoutOrder.orderNo),
          eq(tables.credit.transactionType, 'grant'),
          inArray(tables.credit.transactionScene, ['payment', 'subscription'])
        )
      )
      .limit(1);

    if (!grant || grant.credits !== checkoutOrder.creditsAmount) {
      throw new Error(
        `Paid order ${checkoutOrder.orderNo} is missing its expected credit grant`
      );
    }
  }

  return true;
}

export async function fulfillCheckoutAtomically(params: {
  dbInstance: any;
  databaseProvider: string;
  tables: CheckoutTables;
  checkoutOrder: CheckoutOrder;
  expectsSubscription: boolean;
  newSubscription: Record<string, any> | null;
  newGrant: Record<string, any> | null;
  orderUpdate: Record<string, any>;
}): Promise<'fulfilled' | 'already_fulfilled'> {
  const {
    dbInstance,
    databaseProvider,
    tables,
    checkoutOrder,
    expectsSubscription,
    newSubscription,
    newGrant,
    orderUpdate,
  } = params;

  try {
    if (databaseProvider === 'd1') {
      // Unlike the D1 transaction compatibility shim, D1 batch is an actual
      // atomic transaction. In particular, INSERT failure rolls back PAID.
      const statements: any[] = [];
      if (newSubscription) {
        statements.push(dbInstance.insert(tables.subscription).values(newSubscription));
      }
      if (newGrant) {
        statements.push(dbInstance.insert(tables.credit).values(newGrant));
      }
      statements.push(
        dbInstance
          .update(tables.order)
          .set(orderUpdate)
          .where(eq(tables.order.id, checkoutOrder.id))
      );
      await dbInstance.batch(statements);
    } else {
      await dbInstance.transaction(async (tx: any) => {
        if (newSubscription) {
          await tx.insert(tables.subscription).values(newSubscription);
        }
        if (newGrant) {
          await tx.insert(tables.credit).values(newGrant);
        }
        await tx
          .update(tables.order)
          .set(orderUpdate)
          .where(eq(tables.order.id, checkoutOrder.id));
      });
    }
    return 'fulfilled';
  } catch (error) {
    // Only a complete, committed fulfillment counts as a duplicate success.
    // A missing grant or subscription throws even when status is already PAID.
    if (
      await isCheckoutSettled(
        dbInstance,
        tables,
        checkoutOrder,
        expectsSubscription
      )
    ) {
      return 'already_fulfilled';
    }
    throw error;
  }
}
