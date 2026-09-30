import { Check } from 'lucide-react';

import { Link } from '@/core/i18n/navigation';
import { GENJUTSU_CREDIT_PACKS } from '@/modules/genjutsu/pricing';
import { cn } from '@/lib/cn';

export function PricingSection() {
  return (
    <section id="pricing" className="py-12 md:py-20">
      <div className="container mx-auto px-4">
        <div className="mx-auto mb-10 max-w-3xl text-center">
          <h2 className="text-foreground mb-4 text-3xl font-semibold lg:text-4xl">
            Genjutsu AI Pricing
          </h2>
          <p className="text-muted-foreground text-base">
            No subscription. Choose a one-time credit pack and spend credits on
            Genjutsu Motion Transfer or Object Swap.
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
                  Popular
                </span>
              ) : null}

              <p className="text-foreground text-lg font-semibold">
                {pack.name}
              </p>
              <p className="text-foreground mt-3 text-3xl font-bold">
                ${(pack.priceCents / 100).toFixed(2)}
              </p>
              <p className="text-muted-foreground text-sm">one-time</p>

              <p className="text-primary mt-5 text-2xl font-semibold tabular-nums">
                {pack.credits.toLocaleString()} credits
              </p>

              <ul className="text-muted-foreground mt-5 space-y-2 text-sm">
                <li className="flex items-center gap-2">
                  <Check className="text-primary size-4" />
                  No subscription
                </li>
                <li className="flex items-center gap-2">
                  <Check className="text-primary size-4" />
                  Motion Transfer
                </li>
                <li className="flex items-center gap-2">
                  <Check className="text-primary size-4" />
                  Object Swap
                </li>
              </ul>

              <Link
                href="/pricing"
                className={cn(
                  'mt-auto flex h-10 w-full items-center justify-center rounded-lg',
                  pack.highlighted
                    ? 'bg-primary text-primary-foreground'
                    : 'border-border bg-background text-foreground border',
                  'text-sm font-medium transition hover:brightness-105'
                )}
              >
                Buy credits
              </Link>
            </div>
          ))}
        </div>

        <p className="text-muted-foreground mx-auto mt-6 max-w-2xl text-center text-sm leading-relaxed">
          Each generation consumes API time equal to your input clip duration
          (rounded up to the next second). Credits are calculated from that
          estimate on the server before the job starts — longer clips and higher
          resolution cost more.
        </p>
      </div>
    </section>
  );
}
