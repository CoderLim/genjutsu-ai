import { useState } from 'react';
import { PanelsTopLeft, Pointer, Zap, type LucideIcon } from 'lucide-react';

import { Link } from '@/core/i18n/navigation';
import { cn } from '@/lib/cn';

import { ADVANCED_TABS } from './content';

const TAB_META: Record<string, { eyebrow: string; icon: LucideIcon }> = {
  speed: { eyebrow: 'Speed', icon: Zap },
  control: { eyebrow: 'Control', icon: Pointer },
  style: { eyebrow: 'Style', icon: PanelsTopLeft },
};

export function AdvancedFeatures({ className }: { className?: string }) {
  const [activeId, setActiveId] = useState(ADVANCED_TABS[0]?.id ?? 'speed');
  const active =
    ADVANCED_TABS.find((tab) => tab.id === activeId) ?? ADVANCED_TABS[0]!;
  const activeMeta = TAB_META[active.id] ?? TAB_META.speed!;

  return (
    <section className={cn('relative my-40', className)}>
      <div className="mx-auto w-full max-w-6xl px-4">
        <div className="flex w-full justify-center">
          <div className="bg-primary text-primary-foreground inline-flex items-center rounded-full border border-transparent px-2.5 py-0.5 text-xs font-medium">
            Advanced Features
          </div>
        </div>
        <h2 className="text-foreground mx-auto mt-4 max-w-4xl text-center text-3xl font-bold tracking-tight md:text-4xl">
          Advanced Features of Raphael AI Image Generator
        </h2>
        <p className="text-foreground/80 mx-auto mt-6 max-w-4xl text-center text-lg">
          Experience the power of Raphael AI Image Generator with advanced AI
          creation and editing tools
        </p>

        <div className="mt-16 w-full">
          <div className="mb-12 flex justify-center">
            <div
              role="tablist"
              aria-label="Advanced features"
              className="border-foreground/10 bg-foreground/5 flex w-full max-w-full items-center justify-start gap-1 overflow-x-auto rounded-3xl border p-1.5 backdrop-blur-md lg:justify-center"
            >
              {ADVANCED_TABS.map((tab) => {
                const selected = tab.id === activeId;
                const meta = TAB_META[tab.id];
                const Icon = meta?.icon ?? Zap;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    role="tab"
                    id={`advanced-tab-${tab.id}`}
                    aria-selected={selected}
                    aria-controls={`advanced-panel-${tab.id}`}
                    tabIndex={selected ? 0 : -1}
                    onClick={() => setActiveId(tab.id)}
                    className={cn(
                      'relative flex h-9 items-center justify-center gap-2.5 rounded-full border border-transparent px-6 py-2.5 text-sm font-medium whitespace-nowrap transition-all duration-300',
                      selected
                        ? 'bg-background text-foreground shadow-md'
                        : 'text-foreground/50 hover:bg-background/70 hover:text-foreground/80'
                    )}
                  >
                    <span className="scale-110">
                      <Icon
                        className="h-auto w-4 shrink-0"
                        aria-hidden="true"
                      />
                    </span>
                    {tab.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div
            role="tabpanel"
            id={`advanced-panel-${active.id}`}
            aria-labelledby={`advanced-tab-${active.id}`}
            className="mt-8"
          >
            <div className="flex flex-col items-center gap-10 lg:flex-row lg:gap-16">
              <div className="w-full space-y-6 text-center lg:w-1/2 lg:text-left">
                <div className="inline-flex">
                  <div className="border-primary/30 bg-primary/5 text-primary inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium">
                    {activeMeta.eyebrow}
                  </div>
                </div>
                <h3 className="text-foreground text-3xl font-bold tracking-tight md:text-4xl">
                  {active.title}
                </h3>
                <p className="text-foreground/80 text-lg leading-relaxed">
                  {active.description}
                </p>
                <div className="flex justify-center lg:justify-start">
                  <Link
                    href={active.ctaHref}
                    className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex h-10 items-center justify-center rounded-lg px-4 py-2 text-sm font-medium shadow transition-colors"
                  >
                    {active.ctaLabel}
                  </Link>
                </div>
              </div>
              <div className="border-border/40 w-full overflow-hidden rounded-2xl border lg:w-1/2">
                <img
                  src={active.imageSrc}
                  alt={active.imageAlt}
                  loading="lazy"
                  decoding="async"
                  className="h-auto w-full object-cover"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
