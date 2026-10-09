import { createFileRoute } from '@tanstack/react-router';

import { getAuth } from '@/core/auth';
import {
  assertCheckoutProductAllowed,
  getPricingProduct,
} from '@/config/pricing';
import { getAllConfigs } from '@/modules/config/service';
import { resolveGenjutsuCheckoutAmount } from '@/modules/payment/checkout-amount';
import { createCheckout } from '@/modules/payment/service';
import { enforceMinIntervalRateLimit } from '@/lib/rate-limit';
import { respData, respErr } from '@/lib/resp';

function safeSameOriginPath(
  input: string | undefined | null,
  fallbackPath: string,
  baseUrl: string
): string {
  if (!input) return fallbackPath;
  try {
    const appUrl = new URL(baseUrl);
    const candidate = new URL(input, appUrl);
    if (candidate.origin !== appUrl.origin) return fallbackPath;
    return candidate.pathname + candidate.search + candidate.hash;
  } catch {
    return fallbackPath;
  }
}

async function POST({ request }: { request: Request }) {
  const limited = enforceMinIntervalRateLimit(request, {
    intervalMs: 1000,
    keyPrefix: 'checkout',
  });
  if (limited) return limited;

  try {
    const auth = getAuth();
    const session = await auth.api.getSession({ headers: request.headers });

    if (!session?.user) {
      return respErr('Unauthorized');
    }

    const body = await request.json().catch(() => ({}));
    const { product_id, payment_provider, redirect } = body;

    if (!product_id || typeof product_id !== 'string') {
      return respErr('Missing product_id');
    }

    // Look up product in the authoritative server-side catalog.
    // We DO NOT trust price / credits / plan from the request body.
    const product = getPricingProduct(product_id);
    if (!product) {
      return respErr('Unknown product');
    }

    try {
      assertCheckoutProductAllowed(product_id, session.user.email);
    } catch (error: any) {
      return respErr(error.message || 'Product not available');
    }

    // A stale *_test_amount value must never lower a V2 public pack's
    // order amount (and thus Waffo's authoritative priceSnapshot).
    const configs = await getAllConfigs();
    const providerKey = payment_provider || configs.default_payment_provider;
    if (!providerKey) return respErr('No payment provider configured');
    const chargeAmount = resolveGenjutsuCheckoutAmount({
      catalogAmountCents: product.priceInCents,
      productId: product.productId,
      provider: providerKey,
      providerEnvironment:
        providerKey === 'waffo' ? configs.waffo_environment : undefined,
      testAmountRaw: configs[`${providerKey}_test_amount`],
    });

    // Build success/cancel URLs — only accept same-origin redirects.
    const baseUrl = configs.app_url || 'http://localhost:3000';
    const safeRedirectPath = safeSameOriginPath(
      redirect,
      '/settings/billing',
      baseUrl
    );
    // Straight to the destination: safeSameOriginPath has already reduced it
    // to a path on this site. The old detour through /auth-callback exists to
    // hand a session token to a desktop client — a browser coming back from
    // checkout is already signed in, and that page isn't part of this app.
    const finalRedirect = `${baseUrl}${safeRedirectPath}`;
    const successUrl = `${baseUrl}/api/payment/callback?redirect=${encodeURIComponent(finalRedirect)}`;
    const cancelUrl = `${baseUrl}/pricing`;

    const checkout = await createCheckout({
      userId: session.user.id,
      userEmail: session.user.email,
      productName: product.productName,
      planName: product.planName,
      credits: product.credits,
      creditsValidDays: product.creditsValidDays,
      paymentOrder: {
        productId: product.productId,
        price: { amount: chargeAmount, currency: product.currency },
        type: product.type,
        description: product.description,
        successUrl,
        cancelUrl,
        customer: {
          id: session.user.id,
          email: session.user.email,
          name: session.user.name,
        },
        plan: product.plan
          ? {
              name: product.plan.name,
              interval: product.plan.interval,
              intervalCount: product.plan.intervalCount,
            }
          : undefined,
      },
      provider: payment_provider,
    });

    return respData({ checkout_url: checkout.checkoutInfo.checkoutUrl });
  } catch (error: any) {
    console.error('checkout error:', error);
    return respErr(error.message || 'Checkout failed');
  }
}

export const Route = createFileRoute('/api/payment/checkout')({
  server: {
    handlers: { POST },
  },
});
