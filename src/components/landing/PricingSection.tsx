import { useEffect, useRef } from 'react';
import { Check } from 'lucide-react';
import { toast } from 'sonner';

import { useSession } from '@/core/auth/client';
import { usePathname, useRouter } from '@/core/i18n/navigation';
import {
  GENJUTSU_CREDIT_PACKS,
  type GenjutsuPublicCreditPackId,
} from '@/modules/genjutsu/pricing';
import { apiPost } from '@/lib/api-client';
import { cn } from '@/lib/cn';
import { m } from '@/paraglide/messages.js';

function isPublicPackId(id: string): id is GenjutsuPublicCreditPackId {
  return GENJUTSU_CREDIT_PACKS.some((pack) => pack.id === id);
}

export function PricingSection() {
  const router = useRouter();
  const pathname = usePathname();
  const { data: session, isPending: sessionPending } = useSession();
  const autoBuyStarted = useRef(false);

  async function startCheckout(productId: string) {
    try {
      const data = await apiPost<{ checkout_url?: string }>(
        '/api/payment/checkout',
        {
          product_id: productId,
          redirect: `${pathname}#pricing`,
        }
      );
      if (!data?.checkout_url) {
        throw new Error('Checkout failed');
      }
      window.location.href = data.checkout_url;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Checkout failed');
    }
  }

  function clearBuyQuery() {
    if (typeof window === 'undefined') return;
    const url = new URL(window.location.href);
    if (!url.searchParams.has('buy')) return;
    url.searchParams.delete('buy');
    const next = `${url.pathname}${url.search}${url.hash || '#pricing'}`;
    window.history.replaceState({}, '', next);
  }

  function handleBuy(productId: string) {
    if (!isPublicPackId(productId)) return;

    if (!session?.user) {
      const callbackUrl = encodeURIComponent(
        `${pathname}?buy=${productId}#pricing`
      );
      router.push(`/sign-in?callbackUrl=${callbackUrl}`);
      return;
    }

    void startCheckout(productId);
  }

  // Resume checkout after sign-in: /?buy=mini#pricing
  useEffect(() => {
    if (sessionPending || autoBuyStarted.current) return;
    if (typeof window === 'undefined') return;

    const buy = new URLSearchParams(window.location.search).get('buy');
    if (!buy || !isPublicPackId(buy)) return;

    autoBuyStarted.current = true;
    clearBuyQuery();

    if (!session?.user) {
      const callbackUrl = encodeURIComponent(`${pathname}?buy=${buy}#pricing`);
      router.push(`/sign-in?callbackUrl=${callbackUrl}`);
      return;
    }

    void startCheckout(buy);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- one-shot resume after auth
  }, [sessionPending, session?.user, pathname]);

  return (
    <section id="pricing" className="scroll-mt-24 py-12 md:py-20">
      <div className="container mx-auto px-4">
        <div className="mx-auto mb-10 max-w-3xl text-center">
          <h2 className="text-foreground mb-4 text-3xl font-semibold lg:text-4xl">
            {m['site.pricing.title']()}
          </h2>
          <p className="text-muted-foreground text-base">
            {m['site.pricing.description']()}
          </p>
        </div>

        <div className="mx-auto grid max-w-[1180px] gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {GENJUTSU_CREDIT_PACKS.map((pack) => (
            <div
              key={pack.id}
              className={cn(
                'relative flex min-h-[330px] flex-col rounded-xl border p-5',
                'transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg',
                pack.highlighted
                  ? 'border-primary/80 bg-primary/[0.08] shadow-primary/20 ring-primary/25 shadow-xl ring-1'
                  : 'border-border/70 bg-card/95 ring-border/40 shadow-lg ring-1 shadow-black/10'
              )}
            >
              {pack.highlighted ? (
                <span className="bg-primary text-primary-foreground absolute top-0 right-0 rounded-tr-xl rounded-bl-md px-2 py-0.5 text-[10px] font-semibold">
                  {m['site.pricing.popular']()}
                </span>
              ) : null}

              <p className="text-foreground text-lg font-semibold">
                {pack.name}
              </p>
              <p className="text-foreground mt-3 text-3xl font-bold">
                ${(pack.priceCents / 100).toFixed(2)}
              </p>
              <p className="text-muted-foreground text-sm">{m['site.pricing.once']()}</p>

              <p className="text-primary mt-5 text-2xl font-semibold tabular-nums">
                {m['site.pricing.credits']({ count: pack.credits.toLocaleString() })}
              </p>

              <ul className="text-muted-foreground mt-5 space-y-2 text-sm">
                <li className="flex items-center gap-2">
                  <Check className="text-primary size-4" />
                  {m['site.pricing.no_subscription']()}
                </li>
                <li className="flex items-center gap-2">
                  <Check className="text-primary size-4" />
                  {m['site.hero.motion']()}
                </li>
                <li className="flex items-center gap-2">
                  <Check className="text-primary size-4" />
                  {m['site.hero.objects']()}
                </li>
              </ul>

              <button
                type="button"
                onClick={() => handleBuy(pack.id)}
                className={cn(
                  'mt-auto flex h-10 w-full items-center justify-center rounded-lg',
                  pack.highlighted
                    ? 'bg-primary text-primary-foreground'
                    : 'border-border bg-background text-foreground border',
                  'text-sm font-medium transition hover:brightness-105'
                )}
              >
                {m['site.pricing.buy']()}
              </button>
            </div>
          ))}
        </div>

        <p className="text-muted-foreground mx-auto mt-6 max-w-2xl text-center text-sm leading-relaxed">
          {m['site.pricing.note']()}
        </p>
      </div>
    </section>
  );
}
