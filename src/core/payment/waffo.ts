import {
  Environment,
  verifyWebhook,
  WaffoPancake,
  WebhookEventType,
  type WebhookEvent,
  type WebhookEventData,
} from '@waffo/pancake-ts';

import {
  CheckoutSession,
  PaymentConfigs,
  PaymentEvent,
  PaymentEventType,
  PaymentInterval,
  PaymentOrder,
  PaymentProvider,
  PaymentSession,
  PaymentStatus,
  SubscriptionCycleType,
  SubscriptionInfo,
  SubscriptionStatus,
  WebhookIgnoredError,
} from './types';

/**
 * Waffo Pancake payment provider configs
 * @docs https://docs.waffo.ai/
 */
export interface WaffoConfigs extends PaymentConfigs {
  merchantId: string;
  privateKey: string;
  storeId?: string;
  environment?: 'test' | 'prod';
}

const ZERO_DECIMAL = new Set([
  'bif',
  'clp',
  'djf',
  'gnf',
  'jpy',
  'kmf',
  'krw',
  'mga',
  'pyg',
  'rwf',
  'ugx',
  'vnd',
  'vuv',
  'xaf',
  'xof',
  'xpf',
]);

/**
 * Lifecycle events not yet in @waffo/pancake-ts WebhookEventType (0.19.x).
 * Keep as local strings until the SDK catches up.
 */
const WAFFO_SUBSCRIPTION_RENEWED = 'subscription.renewed';
const WAFFO_SUBSCRIPTION_RECOVERED = 'subscription.recovered';

/** Convert app cents (or whole units for zero-decimal) to Waffo display amount. */
export function centsToWaffoAmount(
  amountInCents: number,
  currency: string
): string {
  const code = currency.toLowerCase();
  if (ZERO_DECIMAL.has(code)) {
    return String(Math.round(amountInCents));
  }
  return (amountInCents / 100).toFixed(2);
}

/** Convert Waffo display amount string to integer cents for storage. */
export function waffoAmountToCents(amount: string, currency: string): number {
  const code = currency.toLowerCase();
  const n = Number(amount);
  if (!Number.isFinite(n)) return 0;
  if (ZERO_DECIMAL.has(code)) return Math.round(n);
  return Math.round(n * 100);
}

/**
 * Waffo Pancake payment provider
 * @website https://pancake.waffo.ai/
 */
export class WaffoProvider implements PaymentProvider {
  readonly name = 'waffo';
  configs: WaffoConfigs;

  private client: WaffoPancake;

  constructor(configs: WaffoConfigs) {
    this.configs = configs;
    this.client = new WaffoPancake({
      merchantId: configs.merchantId,
      privateKey: configs.privateKey,
      environment:
        configs.environment === 'prod' ? Environment.Prod : Environment.Test,
    });
  }

  async createPayment({
    order,
  }: {
    order: PaymentOrder;
  }): Promise<CheckoutSession> {
    if (!order.productId) {
      throw new Error('productId is required for Waffo checkout');
    }

    const currency = (order.price?.currency || 'USD').toUpperCase();
    const orderNo = order.orderNo || '';

    // Product prices live on the Waffo product — do not override with
    // catalog cents unless the caller explicitly opts into priceSnapshot.
    const params: Parameters<typeof this.client.checkout.createSession>[0] = {
      productId: order.productId,
      currency,
      buyerEmail: order.customer?.email,
      successUrl: order.successUrl,
      orderMerchantExternalId: orderNo || undefined,
      metadata: {
        ...(order.metadata
          ? Object.fromEntries(
              Object.entries(order.metadata).map(([k, v]) => [k, String(v)])
            )
          : {}),
        ...(orderNo ? { orderNo } : {}),
      },
    };

    const session = await this.client.checkout.createSession(params);

    // Store our orderNo as sessionId so webhook/callback lookup matches
    // orderMerchantExternalId (same pattern as Alipay out_trade_no).
    const lookupId = orderNo || session.sessionId;

    return {
      provider: this.name,
      checkoutParams: params,
      checkoutInfo: {
        sessionId: lookupId,
        checkoutUrl: session.checkoutUrl,
      },
      checkoutResult: session,
      metadata: {
        ...(order.metadata || {}),
        orderNo,
        checkoutSessionId: session.sessionId,
      },
    };
  }

  async getPaymentSession({
    sessionId,
  }: {
    sessionId: string;
  }): Promise<PaymentSession> {
    const storeId = this.configs.storeId;
    if (!storeId) {
      throw new Error('waffo storeId is required to query payment status');
    }

    // sessionId is our orderNo (orderMerchantExternalId) when created via createPayment.
    // Query onetime and subscription separately: their priceSnapshot shapes differ
    // (OnetimePriceSnapshot.total vs SubscriptionPriceSnapshot.regularPhase.total).
    // A combined selection would invalidate the whole GraphQL response.
    type OnetimeRow = {
      id: string;
      buyerEmail: string;
      status: string;
      orderMerchantExternalId?: string;
      currency?: string;
      priceSnapshot?: { total?: string | number; currency?: string };
      createdAt?: string;
    };
    type SubscriptionRow = {
      id: string;
      buyerEmail: string;
      status: string;
      orderMerchantExternalId?: string;
      billingPeriod?: string;
      currency?: string;
      currentPeriodStart?: string;
      currentPeriodEnd?: string;
      priceSnapshot?: {
        currency?: string;
        regularPhase?: { total?: string | number };
        specialPhase?: { total?: string | number };
      };
      createdAt?: string;
    };

    const onetimeResult = await this.client.graphql.query<{
      onetimeOrders: OnetimeRow[];
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
      variables: { storeId, ref: sessionId },
    });

    const subscriptionResult = await this.client.graphql.query<{
      subscriptionOrders: SubscriptionRow[];
    }>({
      query: `query ($storeId: String!, $ref: String!) {
        subscriptionOrders(
          storeId: $storeId
          filter: { orderMerchantExternalId: { eq: $ref } }
          limit: 1
        ) {
          id buyerEmail status orderMerchantExternalId billingPeriod currency
          currentPeriodStart currentPeriodEnd
          priceSnapshot {
            currency
            regularPhase { total }
            specialPhase { total }
          }
          createdAt
        }
      }`,
      variables: { storeId, ref: sessionId },
    });

    const onetime = onetimeResult.data?.onetimeOrders?.[0];
    const subscription = subscriptionResult.data?.subscriptionOrders?.[0];
    const found = subscription || onetime;

    if (!found) {
      return {
        provider: this.name,
        paymentStatus: PaymentStatus.PROCESSING,
        paymentResult: { id: sessionId },
        metadata: { orderNo: sessionId },
      };
    }

    const currency = String(
      found.priceSnapshot?.currency || found.currency || 'USD'
    ).toUpperCase();
    const totalRaw = subscription
      ? (subscription.priceSnapshot?.specialPhase?.total ??
        subscription.priceSnapshot?.regularPhase?.total)
      : onetime?.priceSnapshot?.total;
    const totalStr =
      totalRaw == null
        ? '0'
        : typeof totalRaw === 'number'
          ? String(totalRaw)
          : totalRaw;
    const amountCents = waffoAmountToCents(totalStr, currency);
    const paid =
      found.status === 'completed' ||
      found.status === 'active' ||
      found.status === 'canceling';

    const paymentSession: PaymentSession = {
      provider: this.name,
      paymentStatus: paid ? PaymentStatus.SUCCESS : PaymentStatus.PROCESSING,
      paymentInfo: {
        transactionId: found.id,
        amount: amountCents,
        currency: currency.toLowerCase(),
        paymentAmount: amountCents,
        paymentCurrency: currency.toLowerCase(),
        paymentEmail: found.buyerEmail,
        paidAt: found.createdAt ? new Date(found.createdAt) : new Date(),
        subscriptionCycleType: subscription
          ? SubscriptionCycleType.CREATE
          : undefined,
      },
      paymentResult: {
        ...found,
        id: found.orderMerchantExternalId || sessionId,
        orderMerchantExternalId: found.orderMerchantExternalId || sessionId,
      },
      metadata: { orderNo: found.orderMerchantExternalId || sessionId },
    };

    if (subscription) {
      paymentSession.subscriptionId = subscription.id;
      paymentSession.subscriptionInfo =
        this.buildSubscriptionInfo(subscription);
      paymentSession.subscriptionResult = subscription;
    }

    return paymentSession;
  }

  async getPaymentEvent({ req }: { req: Request }): Promise<PaymentEvent> {
    const rawBody = await req.text();
    const signature = req.headers.get('x-waffo-signature');

    if (!rawBody || !signature) {
      throw new Error('Invalid Waffo webhook request');
    }

    const environment =
      this.configs.environment === 'prod' ? Environment.Prod : Environment.Test;

    let event: WebhookEvent;
    try {
      event = verifyWebhook(rawBody, signature, { environment });
    } catch {
      throw new Error('Invalid Waffo webhook signature');
    }

    console.log('Waffo webhook', {
      eventType: event.eventType,
      eventId: event.eventId || event.id,
      orderId: event.data?.orderId,
    });

    const eventType = this.mapWaffoEventType(event.eventType);
    const paymentSession = this.buildPaymentSessionFromWebhook(event);

    return {
      eventType,
      eventResult: event,
      paymentSession,
    };
  }

  async cancelSubscription({
    subscriptionId,
  }: {
    subscriptionId: string;
  }): Promise<PaymentSession> {
    const result = await this.client.orders.cancelSubscription({
      orderId: subscriptionId,
    });

    return {
      provider: this.name,
      subscriptionId: result.orderId,
      subscriptionInfo: {
        subscriptionId: result.orderId,
        status:
          result.status === 'canceled'
            ? SubscriptionStatus.CANCELED
            : SubscriptionStatus.PENDING_CANCEL,
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(),
      },
      subscriptionResult: result,
      paymentResult: { ...result, id: result.orderId },
    };
  }

  private mapWaffoEventType(eventType: string): PaymentEventType {
    switch (eventType) {
      case WebhookEventType.OrderCompleted:
        return PaymentEventType.CHECKOUT_SUCCESS;
      case WebhookEventType.SubscriptionActivated:
        return PaymentEventType.CHECKOUT_SUCCESS;
      case WAFFO_SUBSCRIPTION_RENEWED:
      case WAFFO_SUBSCRIPTION_RECOVERED:
        // renewed = period rolled; recovered = past_due → active after retry.
        // Both carry the period block and must restore entitlement (credits +
        // ACTIVE). Recovery does NOT emit subscription.renewed.
        return PaymentEventType.PAYMENT_SUCCESS;
      case WebhookEventType.SubscriptionPaymentSucceeded:
        // Payment-only since 2026-09-06; lifecycle is activated/renewed/recovered.
        throw new WebhookIgnoredError(
          'Ignore Waffo subscription.payment_succeeded: subscription lifecycle is driven by activated/renewed/recovered'
        );
      case WebhookEventType.SubscriptionUpdated:
      case WebhookEventType.SubscriptionCanceling:
      case WebhookEventType.SubscriptionUncanceled:
      case WebhookEventType.SubscriptionPastDue:
        return PaymentEventType.SUBSCRIBE_UPDATED;
      case WebhookEventType.SubscriptionCanceled:
        return PaymentEventType.SUBSCRIBE_CANCELED;
      case WebhookEventType.RefundSucceeded:
        return PaymentEventType.PAYMENT_REFUNDED;
      default:
        throw new WebhookIgnoredError(
          `Not handle waffo event type: ${eventType}`
        );
    }
  }

  private buildPaymentSessionFromWebhook(event: WebhookEvent): PaymentSession {
    const data = event.data;
    const currency = (data.currency || 'USD').toUpperCase();
    const amountCents = waffoAmountToCents(
      String(data.amount || '0'),
      currency
    );
    const orderNo =
      data.orderMerchantExternalId || data.orderMetadata?.orderNo || '';

    // renewed / recovered are the authoritative period-entitlement events.
    // Do not use orderId as their transactionId — it is the stable
    // subscription identity and would collapse repeats into one.
    const isRenewal =
      event.eventType === WAFFO_SUBSCRIPTION_RENEWED ||
      event.eventType === WAFFO_SUBSCRIPTION_RECOVERED;
    const isSubscription =
      event.eventType.startsWith('subscription.') ||
      Boolean(data.billingPeriod) ||
      Boolean(data.currentPeriodStart);

    const transactionId = isRenewal
      ? data.paymentId || event.eventId || event.id
      : data.paymentId || event.eventId || data.orderId || event.id;

    const paymentSession: PaymentSession = {
      provider: this.name,
      paymentStatus: this.mapOrderStatus(data, event.eventType),
      paymentInfo: {
        transactionId,
        amount: amountCents,
        currency: currency.toLowerCase(),
        paymentAmount: amountCents,
        paymentCurrency: currency.toLowerCase(),
        paymentEmail: data.buyerEmail,
        paidAt: event.timestamp ? new Date(event.timestamp) : new Date(),
        subscriptionCycleType: isRenewal
          ? SubscriptionCycleType.RENEWAL
          : isSubscription
            ? SubscriptionCycleType.CREATE
            : undefined,
      },
      // id must match paymentSessionId stored at checkout (= our orderNo).
      paymentResult: {
        ...data,
        id: orderNo || data.orderId,
        orderMerchantExternalId: orderNo,
        orderId: data.orderId,
      },
      metadata: {
        ...(data.orderMetadata || {}),
        orderNo,
        webhookEventId: event.eventId || event.id,
      },
    };

    if (isSubscription && data.orderId) {
      paymentSession.subscriptionId = data.orderId;
      paymentSession.subscriptionInfo = this.buildSubscriptionInfoFromWebhook(
        data,
        event.eventType
      );
      paymentSession.subscriptionResult = data;
    }

    return paymentSession;
  }

  private mapOrderStatus(
    data: WebhookEventData,
    eventType: string
  ): PaymentStatus {
    if (
      eventType === WebhookEventType.OrderCompleted ||
      eventType === WebhookEventType.SubscriptionActivated ||
      eventType === WAFFO_SUBSCRIPTION_RENEWED ||
      eventType === WAFFO_SUBSCRIPTION_RECOVERED
    ) {
      return PaymentStatus.SUCCESS;
    }
    if (eventType === WebhookEventType.SubscriptionCanceled) {
      return PaymentStatus.CANCELED;
    }
    if (data.orderStatus === 'completed' || data.orderStatus === 'active') {
      return PaymentStatus.SUCCESS;
    }
    return PaymentStatus.PROCESSING;
  }

  private assertLifecyclePeriodFields(
    data: WebhookEventData,
    eventType: string
  ) {
    const requiresPeriod =
      eventType === WebhookEventType.SubscriptionActivated ||
      eventType === WAFFO_SUBSCRIPTION_RENEWED ||
      eventType === WAFFO_SUBSCRIPTION_RECOVERED;

    if (!requiresPeriod) return;

    if (
      !data.billingPeriod ||
      !data.currentPeriodStart ||
      !data.currentPeriodEnd
    ) {
      throw new Error(`Waffo ${eventType} missing subscription period fields`);
    }
  }

  private buildSubscriptionInfoFromWebhook(
    data: WebhookEventData,
    eventType: string
  ): SubscriptionInfo {
    this.assertLifecyclePeriodFields(data, eventType);

    const currency = (data.currency || 'USD').toUpperCase();
    const amountCents = waffoAmountToCents(
      String(data.amount || '0'),
      currency
    );

    // TODO: Status-only webhooks should not overwrite period fields when the
    // provider payload does not explicitly contain currentPeriodStart/End.
    const start = data.currentPeriodStart
      ? new Date(data.currentPeriodStart)
      : new Date();
    const end = data.currentPeriodEnd
      ? new Date(data.currentPeriodEnd)
      : new Date(start.getTime() + 30 * 24 * 60 * 60 * 1000);

    let status: SubscriptionStatus = SubscriptionStatus.ACTIVE;
    if (eventType === WebhookEventType.SubscriptionCanceled) {
      status = SubscriptionStatus.CANCELED;
    } else if (eventType === WebhookEventType.SubscriptionCanceling) {
      status = SubscriptionStatus.PENDING_CANCEL;
    } else if (eventType === WebhookEventType.SubscriptionPastDue) {
      status = SubscriptionStatus.EXPIRED;
    }

    return {
      subscriptionId: data.orderId,
      description: data.productName,
      amount: amountCents,
      currency: currency.toLowerCase(),
      interval: this.mapBillingPeriod(data.billingPeriod),
      intervalCount: 1,
      currentPeriodStart: start,
      currentPeriodEnd: end,
      status,
      canceledAt: data.canceledAt ? new Date(data.canceledAt) : undefined,
    };
  }

  private buildSubscriptionInfo(subscription: {
    id: string;
    status: string;
    billingPeriod?: string;
    currency?: string;
    currentPeriodStart?: string;
    currentPeriodEnd?: string;
    priceSnapshot?: {
      currency?: string;
      total?: string | number;
      regularPhase?: { total?: string | number };
      specialPhase?: { total?: string | number };
    };
  }): SubscriptionInfo {
    const currency = String(
      subscription.priceSnapshot?.currency || subscription.currency || 'USD'
    ).toUpperCase();
    const totalRaw =
      subscription.priceSnapshot?.specialPhase?.total ??
      subscription.priceSnapshot?.regularPhase?.total ??
      subscription.priceSnapshot?.total;
    const totalStr =
      totalRaw == null
        ? '0'
        : typeof totalRaw === 'number'
          ? String(totalRaw)
          : totalRaw;

    const start = subscription.currentPeriodStart
      ? new Date(subscription.currentPeriodStart)
      : new Date();
    const end = subscription.currentPeriodEnd
      ? new Date(subscription.currentPeriodEnd)
      : new Date(start.getTime() + 30 * 24 * 60 * 60 * 1000);

    let status: SubscriptionStatus = SubscriptionStatus.ACTIVE;
    if (subscription.status === 'canceled') {
      status = SubscriptionStatus.CANCELED;
    } else if (subscription.status === 'canceling') {
      status = SubscriptionStatus.PENDING_CANCEL;
    } else if (subscription.status === 'past_due') {
      status = SubscriptionStatus.EXPIRED;
    }

    return {
      subscriptionId: subscription.id,
      amount: waffoAmountToCents(totalStr, currency),
      currency: currency.toLowerCase(),
      interval: this.mapBillingPeriod(subscription.billingPeriod),
      intervalCount: 1,
      currentPeriodStart: start,
      currentPeriodEnd: end,
      status,
    };
  }

  private mapBillingPeriod(period?: string): PaymentInterval {
    switch (period) {
      case 'weekly':
        return PaymentInterval.WEEK;
      case 'yearly':
        return PaymentInterval.YEAR;
      case 'quarterly':
        return PaymentInterval.MONTH;
      case 'monthly':
      default:
        return PaymentInterval.MONTH;
    }
  }
}

export function createWaffoProvider(configs: WaffoConfigs): WaffoProvider {
  return new WaffoProvider(configs);
}
