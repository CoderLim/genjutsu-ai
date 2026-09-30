import type { ModelCard } from '@/types/landing';

import { Link } from '@/core/i18n/navigation';
import { cn } from '@/lib/cn';

import { MODEL_CARDS } from './content';

const BADGE_TONE_CLASS: Record<NonNullable<ModelCard['badgeTone']>, string> = {
  new: 'bg-primary text-primary-foreground',
  hot: 'bg-primary text-primary-foreground',
  sale: 'bg-[#e05256] text-white',
  coming: 'bg-primary text-primary-foreground',
};

function ModelIcon({ model }: { model: ModelCard }) {
  const emojiMatch = model.name.match(
    /^(\p{Emoji_Presentation}|\p{Extended_Pictographic})\s*/u
  );
  const emoji = model.emoji ?? (emojiMatch ? emojiMatch[1] : undefined);

  if (model.iconSrc) {
    return (
      <img
        src={model.iconSrc}
        alt=""
        width={24}
        height={24}
        loading="lazy"
        decoding="async"
        className="h-6 w-6 object-contain"
      />
    );
  }

  if (emoji) {
    return (
      <span aria-hidden="true" className="text-xl leading-none">
        {emoji}
      </span>
    );
  }

  return (
    <span aria-hidden="true" className="text-foreground/70 text-sm font-bold">
      {model.name.slice(0, 1)}
    </span>
  );
}

function displayName(model: ModelCard) {
  return model.name.replace(
    /^(\p{Emoji_Presentation}|\p{Extended_Pictographic})\s*/u,
    ''
  );
}

export function TopModels({
  className,
  title = 'Top AI Image & Video Models',
  models = MODEL_CARDS,
  columns = 3,
}: {
  className?: string;
  title?: string;
  models?: ModelCard[];
  columns?: 2 | 3 | 4;
}) {
  return (
    <section
      className={cn('mt-8 w-full sm:mt-10 md:-mx-5 md:w-auto', className)}
    >
      <h2 className="text-foreground mb-4 text-lg font-bold sm:mb-5 sm:text-xl">
        {title}
      </h2>
      <div
        className={cn(
          'grid grid-cols-1 gap-3 sm:grid-cols-2',
          columns === 2 && 'lg:grid-cols-2',
          columns === 3 && 'lg:grid-cols-3',
          columns === 4 && 'lg:grid-cols-4'
        )}
      >
        {models.map((model) => (
          <Link
            key={`${model.name}-${model.href}`}
            href={model.href}
            className="group flex min-h-[72px] items-center gap-3 rounded-xl bg-white/[0.045] p-3 text-left shadow-[inset_0_1px_0_rgba(255,255,255,0.035)] transition-all duration-200 hover:bg-white/[0.07] active:scale-[0.99]"
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-black/35 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
              <ModelIcon model={model} />
            </span>
            <span className="flex min-w-0 flex-1 flex-col gap-1">
              <span className="flex min-w-0 flex-wrap items-center gap-1.5">
                <span className="text-foreground/90 group-hover:text-foreground truncate text-sm leading-5 font-semibold transition-colors duration-200">
                  {displayName(model)}
                </span>
                {model.badge ? (
                  <span className="inline-flex shrink-0 items-center gap-0.5">
                    <span
                      className={cn(
                        'inline-flex h-4 shrink-0 items-center rounded-[5px] px-1.5 text-[8px] font-black tracking-[0.04em] uppercase shadow-[inset_0_1px_0_rgba(255,255,255,0.10)]',
                        model.badgeTone
                          ? BADGE_TONE_CLASS[model.badgeTone]
                          : 'bg-primary text-primary-foreground'
                      )}
                    >
                      {model.badge}
                    </span>
                  </span>
                ) : null}
              </span>
              <span className="text-muted-foreground line-clamp-2 text-xs leading-4">
                {model.description}
              </span>
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}
