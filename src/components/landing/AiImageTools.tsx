import { Link } from '@/core/i18n/navigation';
import { cn } from '@/lib/cn';

import { TOOL_CARDS } from './content';

export function AiImageTools({ className }: { className?: string }) {
  return (
    <section className={cn('mt-2 sm:mt-4 md:-mx-5 md:w-auto', className)}>
      <h2 className="text-foreground mb-4 text-lg font-bold tracking-tight sm:mb-5 sm:text-xl">
        AI Image Tools
      </h2>
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-5">
        {TOOL_CARDS.map((tool) => (
          <Link
            key={tool.href}
            href={tool.href}
            className="group relative flex h-full flex-col gap-3 transition-transform duration-300 hover:-translate-y-1"
          >
            <div className="relative aspect-[4/3] w-full overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] shadow-[0_22px_54px_-34px_rgba(0,0,0,0.82)] transition-all duration-300 group-hover:border-white/20 group-hover:shadow-[0_28px_60px_-30px_rgba(240,134,43,0.45)]">
              <img
                src={tool.imageSrc}
                alt={tool.imageAlt}
                loading="lazy"
                decoding="async"
                className="absolute inset-0 size-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
              />
            </div>
            <div className="px-1 sm:px-1.5">
              <p className="text-foreground/90 group-hover:text-foreground text-sm leading-snug font-semibold transition-colors sm:text-[15px]">
                {tool.title}
              </p>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
