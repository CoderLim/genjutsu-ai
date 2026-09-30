import type { ModelCard } from '@/types/landing';

import { Link } from '@/core/i18n/navigation';
import { cn } from '@/lib/cn';
import { TEXT_TO_IMAGE_POPULAR_MODELS } from '@/components/landing/content';

function displayName(model: ModelCard) {
  return model.name.replace(
    /^(\p{Emoji_Presentation}|\p{Extended_Pictographic})\s*/u,
    ''
  );
}

export function PopularModels({
  className,
  title = 'Popular Models',
  models = TEXT_TO_IMAGE_POPULAR_MODELS,
}: {
  className?: string;
  title?: string;
  models?: ModelCard[];
}) {
  return (
    <section
      className={cn(
        '-mx-2 py-14 sm:-mx-6 md:py-20 lg:-mx-10 xl:-mx-16 2xl:-mx-20',
        className
      )}
    >
      <div className="mx-auto mb-10 max-w-4xl text-center md:mb-12">
        <h2 className="text-foreground text-2xl font-bold tracking-tight sm:text-3xl lg:text-4xl">
          {title}
        </h2>
      </div>
      <ul className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4 lg:gap-6">
        {models.map((model) => (
          <li key={`${model.name}-${model.href}`} className="h-full">
            <Link href={model.href} className="block h-full">
              <div className="group relative flex h-full flex-col gap-4 transition-transform duration-300 hover:-translate-y-1.5">
                <div className="relative aspect-[4/3] w-full overflow-hidden rounded-[22px] border border-white/10 bg-white/[0.03] shadow-[0_28px_64px_-36px_rgba(0,0,0,0.84)] transition-all duration-300 group-hover:border-white/20 group-hover:shadow-[0_34px_72px_-32px_rgba(240,134,43,0.48)]">
                  {model.coverSrc ? (
                    <img
                      src={model.coverSrc}
                      alt={displayName(model)}
                      loading="lazy"
                      decoding="async"
                      className="absolute inset-0 size-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
                    />
                  ) : null}
                </div>
                <div className="min-h-[52px] px-1 sm:px-2">
                  <p className="text-foreground/80 text-[15px] leading-snug font-medium sm:text-base">
                    {model.description}
                  </p>
                </div>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
