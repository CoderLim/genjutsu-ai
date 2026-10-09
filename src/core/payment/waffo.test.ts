import assert from 'node:assert/strict';
import { generateKeyPairSync } from 'node:crypto';
import { test } from 'node:test';
import {
  WebhookEventType,
  type WebhookEvent,
  type WebhookEventData,
} from '@waffo/pancake-ts';

import {
  isWebhookIgnored,
  PaymentEventType,
  PaymentInterval,
  PaymentStatus,
  PaymentType,
  SubscriptionCycleType,
  WebhookIgnoredError,
  type PaymentSession,
} from './types';
import {
  createWaffoProvider,
  getWaffoOneTimePriceSnapshot,
} from './waffo';

const WAFFO_SUBSCRIPTION_RENEWED = 'subscription.renewed';
const WAFFO_SUBSCRIPTION_RECOVERED = 'subscription.recovered';

const { privateKey: TEST_PRIVATE_KEY } = generateKeyPairSync('rsa', {
  modulusLength: 2048,
  privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
  publicKeyEncoding: { type: 'spki', format: 'pem' },
});

type WaffoWebhookInternals = {
  mapWaffoEventType(eventType: string): PaymentEventType;
  buildPaymentSessionFromWebhook(event: WebhookEvent): PaymentSession;
};

function providerInternals() {
  return createWaffoProvider({
    merchantId: 'MER_abcdefghijklmnopqrstuv',
    privateKey: TEST_PRIVATE_KEY,
    environment: 'test',
  }) as unknown as WaffoWebhookInternals;
}

function baseData(overrides: Partial<WebhookEventData> = {}): WebhookEventData {
  return {
    orderId: 'ORD_123',
    buyerEmail: 'buyer@example.com',
    currency: 'USD',
    amount: '9.99',
    taxAmount: '0',
    productName: 'Lite Monthly',
    orderMerchantExternalId: 'local-order-1',
    ...overrides,
  };
}

function baseEvent(
  eventType: string,
  data: WebhookEventData,
  overrides: Partial<WebhookEvent> = {}
): WebhookEvent {
  return {
    id: 'delivery-uuid-1',
    timestamp: '2026-09-10T08:00:00.000Z',
    eventType,
    eventId: 'EVT_1',
    storeId: 'STO_1',
    storeName: 'Test Store',
    mode: 'test',
    data,
    ...overrides,
  };
}

test('V2 Waffo checkout uses the local one-time order price snapshot', () => {
  const forPrice = (amount: number, currency = 'usd') =>
    getWaffoOneTimePriceSnapshot({
      type: PaymentType.ONE_TIME,
      price: { amount, currency },
    });

  assert.deepEqual(forPrice(1499), {
    amount: '14.99',
    taxCategory: 'saas',
  });
  assert.deepEqual(forPrice(4999), {
    amount: '49.99',
    taxCategory: 'saas',
  });
  assert.deepEqual(forPrice(9999), {
    amount: '99.99',
    taxCategory: 'saas',
  });
  assert.equal(forPrice(0), undefined);
  assert.equal(forPrice(14.2), undefined);
  assert.equal(
    getWaffoOneTimePriceSnapshot({
      type: PaymentType.SUBSCRIPTION,
      price: { amount: 1499, currency: 'usd' },
    }),
    undefined
  );
});

test('subscription.payment_succeeded is ignored (ACK path)', () => {
  const internals = providerInternals();
  assert.throws(
    () =>
      internals.mapWaffoEventType(
        WebhookEventType.SubscriptionPaymentSucceeded
      ),
    (err: unknown) => {
      assert.ok(isWebhookIgnored(err));
      assert.ok(err instanceof WebhookIgnoredError);
      assert.match((err as Error).message, /subscription\.payment_succeeded/);
      return true;
    }
  );
});

test('subscription.activated creates first-cycle checkout success', () => {
  const internals = providerInternals();
  assert.equal(
    internals.mapWaffoEventType(WebhookEventType.SubscriptionActivated),
    PaymentEventType.CHECKOUT_SUCCESS
  );

  const session = internals.buildPaymentSessionFromWebhook(
    baseEvent(
      WebhookEventType.SubscriptionActivated,
      baseData({
        billingPeriod: 'monthly',
        currentPeriodStart: '2026-09-10',
        currentPeriodEnd: '2026-10-10',
      })
    )
  );

  assert.equal(session.paymentStatus, PaymentStatus.SUCCESS);
  assert.equal(
    session.paymentInfo?.subscriptionCycleType,
    SubscriptionCycleType.CREATE
  );
  assert.equal(session.subscriptionInfo?.interval, PaymentInterval.MONTH);
  assert.equal(
    session.subscriptionInfo?.currentPeriodStart.toISOString().slice(0, 10),
    '2026-09-10'
  );
  assert.equal(
    session.subscriptionInfo?.currentPeriodEnd.toISOString().slice(0, 10),
    '2026-10-10'
  );
});

test('subscription.renewed drives renewal with unique transactionId', () => {
  const internals = providerInternals();
  assert.equal(
    internals.mapWaffoEventType(WAFFO_SUBSCRIPTION_RENEWED),
    PaymentEventType.PAYMENT_SUCCESS
  );

  const session = internals.buildPaymentSessionFromWebhook(
    baseEvent(
      WAFFO_SUBSCRIPTION_RENEWED,
      baseData({
        billingPeriod: 'monthly',
        currentPeriodStart: '2026-10-10',
        currentPeriodEnd: '2026-11-10',
        amount: '9.99',
      }),
      {
        id: 'ORD_123',
        eventId: 'ORD_123-renewed-2026-10-10',
      }
    )
  );

  assert.equal(session.paymentStatus, PaymentStatus.SUCCESS);
  assert.equal(
    session.paymentInfo?.subscriptionCycleType,
    SubscriptionCycleType.RENEWAL
  );
  assert.equal(
    session.paymentInfo?.transactionId,
    'ORD_123-renewed-2026-10-10'
  );
  assert.notEqual(session.paymentInfo?.transactionId, 'ORD_123');
  assert.equal(session.metadata?.webhookEventId, 'ORD_123-renewed-2026-10-10');
  assert.equal(
    session.subscriptionInfo?.currentPeriodStart.toISOString().slice(0, 10),
    '2026-10-10'
  );
  assert.equal(
    session.subscriptionInfo?.currentPeriodEnd.toISOString().slice(0, 10),
    '2026-11-10'
  );
});

test('second month renewal uses a different transactionId than orderId', () => {
  const internals = providerInternals();

  const first = internals.buildPaymentSessionFromWebhook(
    baseEvent(
      WAFFO_SUBSCRIPTION_RENEWED,
      baseData({
        billingPeriod: 'monthly',
        currentPeriodStart: '2026-10-10',
        currentPeriodEnd: '2026-11-10',
      }),
      { eventId: 'ORD_123-renewed-2026-10-10' }
    )
  );
  const second = internals.buildPaymentSessionFromWebhook(
    baseEvent(
      WAFFO_SUBSCRIPTION_RENEWED,
      baseData({
        billingPeriod: 'monthly',
        currentPeriodStart: '2026-11-10',
        currentPeriodEnd: '2026-12-10',
      }),
      { eventId: 'ORD_123-renewed-2026-11-10' }
    )
  );

  assert.equal(first.paymentInfo?.transactionId, 'ORD_123-renewed-2026-10-10');
  assert.equal(second.paymentInfo?.transactionId, 'ORD_123-renewed-2026-11-10');
  assert.notEqual(
    first.paymentInfo?.transactionId,
    second.paymentInfo?.transactionId
  );
});

test('annual renewal uses provider period, not +30 days', () => {
  const internals = providerInternals();
  const session = internals.buildPaymentSessionFromWebhook(
    baseEvent(
      WAFFO_SUBSCRIPTION_RENEWED,
      baseData({
        orderId: 'ORD_annual',
        billingPeriod: 'yearly',
        currentPeriodStart: '2027-09-10',
        currentPeriodEnd: '2028-09-10',
        amount: '99.00',
        productName: 'Lite Annual',
      }),
      { eventId: 'ORD_annual-renewed-2027-09-10' }
    )
  );

  assert.equal(session.subscriptionInfo?.interval, PaymentInterval.YEAR);
  assert.equal(
    session.subscriptionInfo?.currentPeriodStart.toISOString().slice(0, 10),
    '2027-09-10'
  );
  assert.equal(
    session.subscriptionInfo?.currentPeriodEnd.toISOString().slice(0, 10),
    '2028-09-10'
  );
});

test('renewed without period fields throws (not silent fallback)', () => {
  const internals = providerInternals();
  assert.throws(
    () =>
      internals.buildPaymentSessionFromWebhook(
        baseEvent(WAFFO_SUBSCRIPTION_RENEWED, baseData())
      ),
    (err: unknown) => {
      assert.ok(err instanceof Error);
      assert.ok(!isWebhookIgnored(err));
      assert.match((err as Error).message, /missing subscription period/);
      return true;
    }
  );
});

test('activated without period fields throws', () => {
  const internals = providerInternals();
  assert.throws(
    () =>
      internals.buildPaymentSessionFromWebhook(
        baseEvent(WebhookEventType.SubscriptionActivated, baseData())
      ),
    /missing subscription period/
  );
});

test('order.completed one-time purchase still maps to checkout success', () => {
  const internals = providerInternals();
  assert.equal(
    internals.mapWaffoEventType(WebhookEventType.OrderCompleted),
    PaymentEventType.CHECKOUT_SUCCESS
  );

  const session = internals.buildPaymentSessionFromWebhook(
    baseEvent(
      WebhookEventType.OrderCompleted,
      baseData({
        orderStatus: 'completed',
        amount: '19.99',
        productName: 'Starter Pack',
      })
    )
  );

  assert.equal(session.paymentStatus, PaymentStatus.SUCCESS);
  assert.equal(session.paymentInfo?.subscriptionCycleType, undefined);
  assert.equal(session.subscriptionInfo, undefined);
  assert.equal(session.paymentInfo?.amount, 1999);
});

test('renewed prefers paymentId over eventId for transactionId', () => {
  const internals = providerInternals();
  const session = internals.buildPaymentSessionFromWebhook(
    baseEvent(
      WAFFO_SUBSCRIPTION_RENEWED,
      baseData({
        paymentId: 'PAY_unique_1',
        billingPeriod: 'monthly',
        currentPeriodStart: '2026-10-10',
        currentPeriodEnd: '2026-11-10',
      }),
      { eventId: 'ORD_123-renewed-2026-10-10' }
    )
  );

  assert.equal(session.paymentInfo?.transactionId, 'PAY_unique_1');
});

test('subscription.recovered restores ACTIVE via renewal entitlement path', () => {
  const internals = providerInternals();
  assert.equal(
    internals.mapWaffoEventType(WAFFO_SUBSCRIPTION_RECOVERED),
    PaymentEventType.PAYMENT_SUCCESS
  );

  const session = internals.buildPaymentSessionFromWebhook(
    baseEvent(
      WAFFO_SUBSCRIPTION_RECOVERED,
      baseData({
        orderStatus: 'active',
        billingPeriod: 'monthly',
        currentPeriodStart: '2026-04-10',
        currentPeriodEnd: '2026-05-10',
      }),
      {
        eventId: 'ORD_123-2026-05-12T09:15:00.000Z',
      }
    )
  );

  assert.equal(session.paymentStatus, PaymentStatus.SUCCESS);
  assert.equal(
    session.paymentInfo?.subscriptionCycleType,
    SubscriptionCycleType.RENEWAL
  );
  assert.equal(
    session.paymentInfo?.transactionId,
    'ORD_123-2026-05-12T09:15:00.000Z'
  );
  assert.notEqual(session.paymentInfo?.transactionId, 'ORD_123');
  assert.equal(session.subscriptionInfo?.status, 'active');
  assert.equal(
    session.subscriptionInfo?.currentPeriodStart.toISOString().slice(0, 10),
    '2026-04-10'
  );
  assert.equal(
    session.subscriptionInfo?.currentPeriodEnd.toISOString().slice(0, 10),
    '2026-05-10'
  );
});

test('recovered without period fields throws', () => {
  const internals = providerInternals();
  assert.throws(
    () =>
      internals.buildPaymentSessionFromWebhook(
        baseEvent(WAFFO_SUBSCRIPTION_RECOVERED, baseData())
      ),
    /missing subscription period/
  );
});

test('createPayment uses authenticated checkout and preserves merchant order reference', async () => {
  const provider = createWaffoProvider({
    merchantId: 'MER_abcdefghijklmnopqrstuv',
    privateKey: TEST_PRIVATE_KEY,
    storeId: 'STO_1',
    environment: 'prod',
  }) as any;

  let received: Record<string, unknown> | undefined;
  provider.client = {
    checkout: {
      authenticated: {
        create: async (params: Record<string, unknown>) => {
          received = params;
          return {
            sessionId: 'SES_provider_1',
            checkoutUrl: 'https://checkout.example/session',
            expiresAt: '2026-10-02T15:00:00.000Z',
          };
        },
      },
    },
  };

  const session = await provider.createPayment({
    order: {
      orderNo: 'ORD_local_1',
      productId: 'PROD_1',
      price: { amount: 499, currency: 'USD' },
      customer: {
        id: 'user-123',
        email: 'buyer@example.com',
      },
    },
  });

  assert.equal(received?.buyerIdentity, 'user-123');
  assert.equal(received?.orderMerchantExternalId, 'ORD_local_1');
  assert.deepEqual(received?.metadata, { orderNo: 'ORD_local_1' });
  assert.equal(session.checkoutInfo.sessionId, 'ORD_local_1');
  assert.equal(session.metadata.checkoutSessionId, 'SES_provider_1');
  assert.equal(session.metadata.waffoEnvironment, 'prod');
  assert.equal(session.checkoutResult.waffoEnvironment, 'prod');
});

test('prod provider rejects test_mode webhook settlement', () => {
  const provider = createWaffoProvider({
    merchantId: 'MER_abcdefghijklmnopqrstuv',
    privateKey: TEST_PRIVATE_KEY,
    environment: 'prod',
  }) as any;

  assert.throws(
    () => provider.rejectTestModeInProduction('test'),
    /test_mode settlement in production/
  );
  assert.doesNotThrow(() => provider.rejectTestModeInProduction('prod'));
  assert.doesNotThrow(() => provider.rejectTestModeInProduction(undefined));
});

test('webhook session carries waffoMode for settlement guards', () => {
  const internals = providerInternals();
  const session = internals.buildPaymentSessionFromWebhook(
    baseEvent(WebhookEventType.OrderCompleted, baseData(), { mode: 'test' })
  );
  assert.equal(session.metadata?.waffoMode, 'test');
  assert.equal(session.paymentResult?.mode, 'test');
});
