/**
 * Query Waffo order status by orderMerchantExternalId (our orderNo).
 * Usage: pnpm exec tsx scripts/with-env.ts "pnpm exec tsx scripts/waffo-query-order.ts TEST_xxx"
 */
import { Environment, WaffoPancake } from '@waffo/pancake-ts';

async function main() {
  const orderNo = process.argv[2];
  if (!orderNo) throw new Error('Usage: waffo-query-order.ts <orderNo>');

  const merchantId = process.env.WAFFO_MERCHANT_ID!;
  const privateKey = process.env.WAFFO_PRIVATE_KEY!;
  const storeId = process.env.WAFFO_STORE_ID!;

  const client = new WaffoPancake({
    merchantId,
    privateKey,
    environment: Environment.Test,
  });

  const onetime = await client.graphql.query<{
    onetimeOrders: Array<{
      id: string;
      status: string;
      buyerEmail: string;
      orderMerchantExternalId?: string;
      currency?: string;
      priceSnapshot?: { total?: string; currency?: string };
      createdAt?: string;
    }>;
  }>({
    query: `query ($storeId: String!, $ref: String!) {
      onetimeOrders(
        storeId: $storeId
        filter: { orderMerchantExternalId: { eq: $ref } }
        limit: 1
      ) {
        id buyerEmail status orderMerchantExternalId currency
        priceSnapshot { total currency } createdAt
      }
    }`,
    variables: { storeId, ref: orderNo },
  });

  const subscription = await client.graphql.query<{
    subscriptionOrders: Array<{
      id: string;
      status: string;
      buyerEmail: string;
      orderMerchantExternalId?: string;
      billingPeriod?: string;
      currency?: string;
      currentPeriodStart?: string;
      currentPeriodEnd?: string;
      createdAt?: string;
    }>;
  }>({
    query: `query ($storeId: String!, $ref: String!) {
      subscriptionOrders(
        storeId: $storeId
        filter: { orderMerchantExternalId: { eq: $ref } }
        limit: 1
      ) {
        id buyerEmail status orderMerchantExternalId billingPeriod currency
        currentPeriodStart currentPeriodEnd createdAt
      }
    }`,
    variables: { storeId, ref: orderNo },
  });

  console.log(
    JSON.stringify(
      {
        orderNo,
        onetime: onetime.data?.onetimeOrders?.[0] || null,
        subscription: subscription.data?.subscriptionOrders?.[0] || null,
      },
      null,
      2
    )
  );
}

main().catch((e) => {
  console.error(e?.errors?.[0] || e?.message || e);
  process.exit(1);
});
