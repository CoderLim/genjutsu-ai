import type { Testimonial } from '@/types/landing';

import { cn } from '@/lib/cn';
import { TESTIMONIALS } from '@/components/landing/content';

function QuoteCard({ item }: { item: Testimonial }) {
  return (
    <article
      className={cn(
        'border-border w-full max-w-xs rounded-3xl border p-10',
        'shadow-primary/10 shadow-lg'
      )}
    >
      <div className="text-foreground/90 text-sm leading-relaxed">
        {item.quote}
      </div>
      <div className="mt-5 flex items-center gap-2">
        <img
          src={item.avatarSrc}
          alt={item.name}
          width={40}
          height={40}
          className="h-10 w-10 rounded-full object-cover"
        />
        <div className="flex min-w-0 flex-col">
          <div className="text-foreground leading-5 font-medium tracking-tight">
            {item.name}
          </div>
          <div className="leading-5 tracking-tight opacity-60">{item.role}</div>
        </div>
      </div>
    </article>
  );
}

function ScrollColumn({
  items,
  duration,
  className,
}: {
  items: Testimonial[];
  duration: string;
  className?: string;
}) {
  const loop = [...items, ...items];

  return (
    <div className={className}>
      <div
        className="animate-scroll bg-background flex flex-col gap-6 pb-6"
        style={{ animationDuration: duration }}
      >
        {loop.map((item, index) => (
          <QuoteCard key={`${item.name}-${index}`} item={item} />
        ))}
      </div>
    </div>
  );
}

const COLUMN_DURATIONS = ['15s', '19s', '17s'] as const;

export function Testimonials() {
  const columns = [
    TESTIMONIALS.slice(0, 3),
    TESTIMONIALS.slice(3, 6),
    TESTIMONIALS.slice(6, 9),
  ];

  return (
    <section className="bg-background relative my-20">
      <div className="z-10 container mx-auto px-4">
        <div className="mx-auto flex max-w-3xl flex-col items-center justify-center text-center">
          <div className="flex justify-center">
            <div
              className={cn(
                'border-border/60 bg-background/50 rounded-full border px-5 py-1.5',
                'text-foreground/80 text-xs font-semibold backdrop-blur-sm'
              )}
            >
              Testimonials
            </div>
          </div>
          <h2 className="text-foreground mt-6 text-3xl font-bold tracking-tight sm:text-4xl">
            What Creators Say About Genjutsu AI
          </h2>
          <p className="text-foreground/80 mt-6 text-lg leading-relaxed">
            Editors, producers, and short-form teams using video-to-video to
            keep the original motion
          </p>
        </div>

        <div
          className={cn(
            'mt-10 flex max-h-[740px] justify-center gap-6 overflow-hidden',
            '[mask-image:linear-gradient(to_bottom,transparent,black_25%,black_75%,transparent)]'
          )}
        >
          {columns.map((items, index) => (
            <ScrollColumn
              key={index}
              items={items}
              duration={COLUMN_DURATIONS[index]!}
              className={cn(
                index === 1 && 'hidden md:block',
                index === 2 && 'hidden lg:block'
              )}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
