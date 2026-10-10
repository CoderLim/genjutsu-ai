import { useEffect, useState } from 'react';
import { ArrowUp, Mic, Plus } from 'lucide-react';

import { cn } from '@/lib/cn';
import { m } from '@/paraglide/messages.js';
import { GeneratorPanel } from '@/components/landing/GeneratorPanel';

type StickyComposerProps = {
  /** Element id of the in-hero generator used as IntersectionObserver target */
  observeId?: string;
};

/**
 * Floating bottom composer — collapsed pill while hero generator is off-screen;
 * expands in place on click (matches raphael.app behavior).
 */
export function StickyComposer({
  observeId = 'hero-generator',
}: StickyComposerProps) {
  const [visible, setVisible] = useState(false);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    const target = document.getElementById(observeId);
    if (!target) return;

    const io = new IntersectionObserver(
      ([entry]) => {
        const show = !entry?.isIntersecting;
        setVisible(show);
        if (!show) setExpanded(false);
      },
      { threshold: 0.12, rootMargin: '0px' }
    );
    io.observe(target);
    return () => io.disconnect();
  }, [observeId]);

  useEffect(() => {
    if (!expanded) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setExpanded(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [expanded]);

  if (!visible) return null;

  return (
    <div
      className={cn(
        'fixed inset-x-0 z-[70] px-3',
        'bottom-[calc(1rem+env(safe-area-inset-bottom))]',
        expanded && 'z-[75]'
      )}
    >
      {!expanded ? (
        <button
          type="button"
          aria-label={m['site.sticky.voice']()}
          className="absolute -top-11 right-[max(1rem,calc(50%-410px+4.5rem))] flex size-9 items-center justify-center rounded-full bg-emerald-600/90 text-white shadow-lg shadow-emerald-900/40 transition hover:bg-emerald-500"
        >
          <Mic className="size-4" />
        </button>
      ) : null}

      {expanded ? (
        <div className="relative mx-auto w-full max-w-[820px]">
          <button
            type="button"
            aria-label={m['site.sticky.collapse_aria']()}
            className="text-foreground/80 hover:text-foreground absolute -top-9 right-0 rounded-full border border-white/10 bg-[rgba(74,56,44,0.88)] px-3 py-1 text-xs backdrop-blur-xl"
            onClick={() => setExpanded(false)}
          >
            {m['site.sticky.collapse']()}
          </button>
          <div className="overflow-hidden rounded-[24px] border border-white/10 bg-[rgba(74,56,44,0.94)] p-2 shadow-2xl backdrop-blur-2xl">
            <GeneratorPanel hidePromo />
          </div>
        </div>
      ) : (
        <div
          role="button"
          tabIndex={0}
          aria-label={m['site.sticky.open_generator']()}
          className="app-workspace-composer-collapsed-frame mx-auto flex w-full max-w-[820px] items-center gap-3 rounded-[24px] border border-white/10 bg-[rgba(74,56,44,0.88)] px-3 py-2 shadow-2xl backdrop-blur-2xl"
          onClick={() => setExpanded(true)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              setExpanded(true);
            }
          }}
        >
          <button
            type="button"
            tabIndex={-1}
            className="text-primary/85 flex size-10 items-center justify-center rounded-[10px] border border-dashed border-white/14 bg-white/[0.04]"
            aria-hidden
          >
            <Plus className="size-5" />
          </button>
          <div className="min-w-0 flex-1 text-left">
            <p className="text-foreground/35 truncate text-base font-medium sm:text-sm">
              {m['site.sticky.composer_hint']()}
            </p>
          </div>
          <button
            type="button"
            tabIndex={-1}
            aria-label={m['site.generator.generate']()}
            disabled
            className="bg-primary text-primary-foreground flex size-10 shrink-0 items-center justify-center rounded-full opacity-50"
          >
            <ArrowUp className="size-5" />
          </button>
        </div>
      )}
    </div>
  );
}
