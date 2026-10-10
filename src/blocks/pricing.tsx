'use client';

import { useMemo, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { m } from '@/paraglide/messages.js';

import { useSession } from '@/core/auth/client';
import { useRouter } from '@/core/i18n/navigation';
import { listVisibleCreditPacks } from '@/modules/genjutsu/pricing';
import { apiPost } from '@/lib/api-client';
import { currentPathWithQuery } from '@/lib/redirect';
import { usePublicConfig } from '@/hooks/use-public-config';
import {
  PaymentProviderModal,
  type PaymentProvider,
} from '@/components/payment-provider-modal';
import {
  PricingTable,
  type PricingGroup,
  type PricingPlan,
} from '@/components/pricing-table';

const ALL_PROVIDERS: PaymentProvider[] = [
  'stripe',
  'creem',
  'waffo',
  'paypal',
  'alipay',
  'wechat',
];

export function Pricing({ title }: { title?: string } = {}) {
  const router = useRouter();
  const { data: session } = useSession();
  const { data: configsData } = usePublicConfig();
  const configs = configsData ?? {};

  const [modalOpen, setModalOpen] = useState(false);
  const [pendingPlan, setPendingPlan] = useState<PricingPlan | null>(null);
  const [loadingProvider, setLoadingProvider] =
    useState<PaymentProvider | null>(null);

  const enabledProviders = useMemo<PaymentProvider[]>(
    () => ALL_PROVIDERS.filter((p) => configs[`${p}_enabled`] === 'true'),
    [configs]
  );

  const groups: PricingGroup[] = [
    {
      key: 'credits',
      label: m['site.pricing.packs'](),
      plans: listVisibleCreditPacks(session?.user?.email).map((pack) => {
        const currency = pack.currency || 'usd';
        const priceLabel =
          currency === 'cny'
            ? `¥${(pack.priceCents / 100).toFixed(2)}`
            : `$${(pack.priceCents / 100).toFixed(2)}`;
        return {
          id: pack.id,
          name: pack.name,
          description: m['site.pricing.pack_description']({ count: pack.credits.toLocaleString() }),
          price: priceLabel,
          featured: pack.highlighted,
          badge:
            pack.id === 'smoke'
              ? m['site.pricing.dev_only']()
              : pack.highlighted
                ? m['site.pricing.popular']()
                : undefined,
          features: [
            m['site.pricing.credits_genjutsu']({ count: pack.credits.toLocaleString() }),
            m['site.pricing.purchase_once'](),
            m['site.pricing.no_subscription'](),
            m['site.pricing.modes'](),
          ],
          buttonText: m['site.pricing.buy'](),
          productId: pack.id,
          productName: `${pack.name} Credits`,
          priceInCents: pack.priceCents,
          currency,
          credits: pack.credits,
        };
      }),
    },
  ];

  const checkoutMutation = useMutation({
    mutationFn: ({
      plan,
      provider,
    }: {
      plan: PricingPlan;
      provider: PaymentProvider;
    }) =>
      apiPost<{ checkout_url?: string }>('/api/payment/checkout', {
        product_id: plan.productId,
        payment_provider: provider,
        redirect: currentPathWithQuery('/settings/billing'),
      }),
    onSuccess: (data) => {
      if (!data?.checkout_url) {
        toast.error(m['site.pricing.checkout_failed']());
        setLoadingProvider(null);
        return;
      }
      window.location.href = data.checkout_url;
    },
    onError: (err: any) => {
      toast.error(err?.message || m['site.pricing.checkout_failed']());
      setLoadingProvider(null);
    },
  });

  function startCheckout(plan: PricingPlan, provider: PaymentProvider) {
    setLoadingProvider(provider);
    checkoutMutation.mutate({ plan, provider });
  }

  async function handleCheckout(plan: PricingPlan) {
    if (!session?.user) {
      const callbackUrl = encodeURIComponent(currentPathWithQuery('/pricing'));
      router.push(`/sign-in?callbackUrl=${callbackUrl}`);
      return;
    }

    const selectEnabled = configs.select_payment_enabled === 'true';
    const preferred = configs.default_payment_provider as
      | PaymentProvider
      | undefined;
    const defaultProvider =
      (preferred && enabledProviders.includes(preferred)
        ? preferred
        : undefined) || enabledProviders[0];

    if (!defaultProvider) {
      toast.error(
        m['site.pricing.no_provider']()
      );
      return;
    }

    if (selectEnabled && enabledProviders.length > 1) {
      setPendingPlan(plan);
      setModalOpen(true);
      return;
    }

    startCheckout(plan, defaultProvider);
  }

  function handleProviderSelect(provider: PaymentProvider) {
    if (!pendingPlan) return;
    startCheckout(pendingPlan, provider);
  }

  return (
    <section
      id="pricing"
      className="border-border border-t px-4 py-24 sm:py-32"
    >
      <div className="mx-auto max-w-6xl">
        <div className="mb-16 text-center">
          <h2 className="font-serif text-4xl font-normal tracking-tight sm:text-5xl">
            {title ?? m['site.pricing.standalone_title']()}
          </h2>
          <p className="text-muted-foreground mx-auto mt-5 max-w-2xl">
            {m['site.pricing.standalone_description']()}
          </p>
        </div>

        <PricingTable groups={groups} onCheckout={handleCheckout} />
      </div>

      <PaymentProviderModal
        open={modalOpen}
        onOpenChange={(open) => {
          setModalOpen(open);
          if (!open) {
            setPendingPlan(null);
            setLoadingProvider(null);
          }
        }}
        providers={enabledProviders.length ? enabledProviders : ['waffo']}
        loadingProvider={loadingProvider}
        onSelect={handleProviderSelect}
        planName={pendingPlan?.name}
        price={pendingPlan?.price}
      />
    </section>
  );
}
