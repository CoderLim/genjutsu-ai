import { useState } from 'react';
import { Check } from 'lucide-react';

import { Link } from '@/core/i18n/navigation';
import { cn } from '@/lib/cn';

type BillingTab = 'monthly' | 'yearly' | 'packs';

type PlanDef = {
  name: 'Pro' | 'Ultimate' | 'Max';
  featured?: boolean;
  monthlyPrice: number;
  yearlyMonthly: number;
  yearlyTotal: number;
  yearlyOriginal: number;
  features: string[];
};

const MODEL_CHIPS = [
  'Seedream 3.5',
  'Nano Banana',
  'GPT',
  'Seedream',
  'Veo',
  'Seedance',
  'Kling',
] as const;

const PLANS: PlanDef[] = [
  {
    name: 'Pro',
    monthlyPrice: 20,
    yearlyMonthly: 10,
    yearlyTotal: 120,
    yearlyOriginal: 240,
    features: [
      '2,000 credits per month',
      'Up to 2,000 fast images',
      'Up to 250 basic videos',
      'Unlimited Seedream 3.5 generations',
      'Priority queue',
      'No watermarks',
      'Batch AI image upscaling',
    ],
  },
  {
    name: 'Ultimate',
    featured: true,
    monthlyPrice: 40,
    yearlyMonthly: 20,
    yearlyTotal: 240,
    yearlyOriginal: 480,
    features: [
      '5,000 credits per month',
      'Up to 5,000 fast images',
      'Up to 625 basic videos',
      'Unlimited Seedream 3.5 generations',
      'Highest priority queue',
      'No watermarks',
      'Batch AI image upscaling',
      'Full privacy',
    ],
  },
  {
    name: 'Max',
    monthlyPrice: 80,
    yearlyMonthly: 40,
    yearlyTotal: 480,
    yearlyOriginal: 960,
    features: [
      '10,000 credits per month',
      'Up to 10,000 fast images',
      'Up to 1,250 basic videos',
      'Unlimited Seedream 3.5 generations',
      'Highest priority queue',
      'No watermarks',
      'Batch AI image upscaling',
      'Full privacy',
    ],
  },
];

const CREDIT_PACKS: Array<{
  credits: string;
  price: string;
  subscriber: string;
  base: string;
  bonus: string;
  featured?: boolean;
}> = [
  {
    credits: '1,500 Credits',
    price: '$29.9',
    subscriber: '2,250',
    base: '1,500',
    bonus: '750',
  },
  {
    credits: '3,000 Credits',
    price: '$49.9',
    subscriber: '4,500',
    base: '3,000',
    bonus: '1,500',
    featured: true,
  },
  {
    credits: '5,000 Credits',
    price: '$69.9',
    subscriber: '7,500',
    base: '5,000',
    bonus: '2,500',
  },
  {
    credits: '8,000 Credits',
    price: '$99.9',
    subscriber: '12,000',
    base: '8,000',
    bonus: '4,000',
  },
];

function DiscountBadge({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        'pointer-events-none inline-flex h-4 min-w-[2.6rem] items-center justify-center',
        'rounded-[5px] bg-[#e05256] px-1.5 text-[9px] font-black whitespace-nowrap',
        'leading-none text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.10)]',
        className
      )}
    >
      -50%
    </span>
  );
}

function PlanCard({ plan, tab }: { plan: PlanDef; tab: 'monthly' | 'yearly' }) {
  const isYearly = tab === 'yearly';
  const price = isYearly ? plan.yearlyMonthly : plan.monthlyPrice;

  return (
    <div
      className={cn(
        'relative rounded-xl p-5 transition-all duration-300',
        'hover:-translate-y-1 hover:shadow-xl',
        plan.featured
          ? 'border-primary/80 bg-primary/[0.08] shadow-primary/25 ring-primary/20 order-1 border-2 shadow-2xl ring-2 md:order-none'
          : 'border-primary/20 bg-card/95 ring-primary/10 order-2 border shadow-lg ring-1 shadow-black/10 md:order-none'
      )}
    >
      {plan.featured && (
        <span
          className={cn(
            'absolute top-0 right-0 rounded-tr-[7px] rounded-bl-md',
            'border-primary bg-primary border px-1.5 py-0 text-[10px]',
            'text-primary-foreground leading-4 font-semibold'
          )}
        >
          Recommended
        </span>
      )}

      <div className="relative mb-4 flex items-center gap-2 pr-16">
        <h3 className="text-foreground text-xl font-semibold">{plan.name}</h3>
        {isYearly && <DiscountBadge className="relative" />}
      </div>

      <div className="mb-1 flex items-end gap-2">
        {isYearly && (
          <span className="text-muted-foreground text-lg line-through">
            ${plan.monthlyPrice}
          </span>
        )}
        <span className="text-foreground text-4xl font-bold tracking-tight">
          ${price}
        </span>
        <span className="text-muted-foreground pb-1 text-sm">/month</span>
      </div>

      {isYearly ? (
        <p className="text-muted-foreground mb-5 text-sm">
          Billed Annually ·{' '}
          <span className="line-through">${plan.yearlyOriginal}</span>{' '}
          <span className="text-foreground font-medium">
            ${plan.yearlyTotal}/year
          </span>
        </p>
      ) : (
        <p className="text-muted-foreground mb-5 text-sm">Billed Monthly</p>
      )}

      <Link
        href="/pricing"
        className={cn(
          'mb-6 flex h-10 w-full items-center justify-center rounded-lg',
          'bg-primary text-primary-foreground text-sm font-medium',
          'hover:bg-primary/90 transition-colors'
        )}
      >
        Upgrade to {plan.name}
      </Link>

      <p className="text-muted-foreground mb-3 text-xs font-medium">
        Advanced models after upgrading
      </p>
      <div className="mb-5 flex flex-wrap gap-1.5">
        {MODEL_CHIPS.map((chip) => (
          <span
            key={chip}
            className={cn(
              'border-border/60 inline-flex items-center rounded-md border',
              'bg-background/40 text-foreground/80 px-2 py-0.5 text-[11px]'
            )}
          >
            {chip}
          </span>
        ))}
      </div>

      <ul className="space-y-2.5">
        {plan.features.map((feature) => (
          <li key={feature} className="flex items-start gap-2 text-sm">
            <Check className="text-primary mt-0.5 size-4 shrink-0" />
            <span className="text-foreground/85">{feature}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function CreditPacks() {
  return (
    <div className="mx-auto w-full max-w-[1180px]">
      <h3 className="text-foreground/90 mb-8 text-center text-lg font-semibold">
        Subscribers get +50% extra credits at the same price
      </h3>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {CREDIT_PACKS.map((pack) => (
          <div
            key={pack.credits}
            className={cn(
              'relative flex min-h-[360px] flex-col rounded-lg border p-5',
              'transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg',
              pack.featured
                ? 'border-primary/80 bg-primary/[0.08] shadow-primary/20 ring-primary/25 shadow-xl ring-1'
                : 'border-border/70 bg-card/95 ring-border/40 shadow-lg ring-1 shadow-black/10'
            )}
          >
            {pack.featured && (
              <span
                className={cn(
                  'absolute top-0 right-0 rounded-tr-lg rounded-bl-md',
                  'bg-primary px-1.5 py-0.5 text-[10px] font-semibold',
                  'text-primary-foreground'
                )}
              >
                Recommended
              </span>
            )}
            <p className="text-foreground text-lg font-semibold">
              {pack.credits}
            </p>
            <p className="text-foreground mt-2 text-3xl font-bold">
              {pack.price}
            </p>
            <p className="text-muted-foreground text-sm">one-time</p>
            <p className="text-foreground/80 mt-4 text-sm">
              Subscribers receive:{' '}
              <span className="text-primary font-semibold">
                {pack.subscriber}
              </span>
            </p>
            <ul className="text-muted-foreground mt-4 space-y-1.5 text-sm">
              <li>Base credits: {pack.base}</li>
              <li>Subscriber bonus: {pack.bonus}</li>
              <li>Valid for 6 months</li>
            </ul>
            <Link
              href="/pricing"
              className={cn(
                'mt-auto flex h-10 w-full items-center justify-center rounded-lg',
                'bg-primary text-primary-foreground text-sm font-medium',
                'hover:bg-primary/90 transition-colors'
              )}
            >
              Buy now
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
}

export function PricingSection() {
  const [tab, setTab] = useState<BillingTab>('yearly');

  return (
    <section className="py-12 md:py-20">
      <div className="container mx-auto px-4">
        <div className="mx-auto mb-10 max-w-3xl text-center">
          <h2 className="text-foreground mb-4 text-3xl font-semibold lg:text-4xl">
            Choose Your Plan
          </h2>
          <p className="text-muted-foreground text-base">
            Free images include a watermark. Upgrade for clean outputs, faster
            generation, and commercial use.
          </p>
        </div>

        <div className="mb-10 flex justify-center">
          <div
            className={cn(
              'flex max-w-full flex-wrap items-center gap-1 rounded-full',
              'border-border/40 bg-muted/30 border p-1 shadow-sm'
            )}
          >
            {(
              [
                { id: 'monthly', label: 'Monthly' },
                { id: 'yearly', label: 'Yearly' },
                { id: 'packs', label: 'Credit Packs' },
              ] as const
            ).map((item) => {
              const active = tab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setTab(item.id)}
                  className={cn(
                    'relative flex h-9 items-center gap-2 rounded-full px-4 text-sm font-medium transition sm:px-5',
                    active
                      ? 'bg-primary text-primary-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  {item.label}
                  {item.id === 'yearly' && (
                    <DiscountBadge className="absolute -top-3 -right-1.5 z-20" />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {tab === 'packs' ? (
          <CreditPacks />
        ) : (
          <div className="mx-auto grid max-w-[1180px] gap-5 md:grid-cols-3">
            {PLANS.map((plan) => (
              <PlanCard key={plan.name} plan={plan} tab={tab} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
