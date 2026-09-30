import { Link } from '@/core/i18n/navigation';
import { cn } from '@/lib/cn';
import {
  TEXT_TO_IMAGE_EXPLORE,
  TEXT_TO_IMAGE_FEATURES,
} from '@/components/landing/content';

export function TextToImageFeatures({ className }: { className?: string }) {
  return (
    <section className={cn('py-16', className)}>
      <div className="mx-auto max-w-3xl text-center">
        <h2 className="text-foreground text-3xl font-bold tracking-tight sm:text-4xl">
          From a sentence to a finished image — every top text-to-image AI model
          in one place
        </h2>
        <p className="text-foreground/70 mt-4 text-base leading-relaxed">
          Free AI text to image generator with unlimited basic generation.
          Switch between GPT Image 2, Nano Banana 2, Seedream 5.0, and Seedream
          3.5 Pro in one panel — from one line of description to finished
          images.
        </p>
      </div>

      <div className="mt-12 grid gap-8 sm:grid-cols-2">
        {TEXT_TO_IMAGE_FEATURES.map((feature) => (
          <article
            key={feature.title}
            className="rounded-2xl border border-white/8 bg-white/[0.03] p-6"
          >
            <h3 className="text-foreground text-lg font-semibold">
              {feature.title}
            </h3>
            <p className="text-foreground/65 mt-3 text-sm leading-relaxed">
              {feature.description}
            </p>
          </article>
        ))}
      </div>
    </section>
  );
}

export function KeepExploring({ className }: { className?: string }) {
  return (
    <section className={cn('py-16', className)}>
      <div className="text-center">
        <h2 className="text-foreground text-3xl font-bold tracking-tight sm:text-4xl">
          Keep exploring Raphael
        </h2>
        <p className="text-foreground/65 mt-3">
          One account, the full image and video generation workflow.
        </p>
      </div>
      <div className="mt-10 grid gap-4 sm:grid-cols-3">
        {TEXT_TO_IMAGE_EXPLORE.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="group rounded-2xl border border-white/8 bg-white/[0.03] p-5 transition-colors hover:bg-white/[0.06]"
          >
            <h3 className="text-foreground group-hover:text-primary text-base font-semibold">
              {item.title}
            </h3>
            <p className="text-foreground/60 mt-2 text-sm leading-relaxed">
              {item.description}
            </p>
          </Link>
        ))}
      </div>
    </section>
  );
}

export function TextToImageCta({ className }: { className?: string }) {
  return (
    <section
      className={cn(
        'relative left-1/2 w-screen -translate-x-1/2 py-16',
        'lg:w-[calc(100vw_-_var(--app-sidebar-width,240px))]',
        className
      )}
    >
      <div className="mx-auto max-w-3xl px-4 text-center">
        <img
          src="/logo.webp"
          alt=""
          width={48}
          height={48}
          className="mx-auto size-12 rounded-full"
        />
        <h2 className="text-foreground mt-4 text-3xl font-bold tracking-tight sm:text-4xl">
          Turn a single line into an image — start with Raphael AI
        </h2>
        <a
          href="#t2i-generator"
          className="mt-6 inline-flex h-11 items-center justify-center rounded-xl bg-[rgb(204,144,92)] px-6 text-sm font-semibold text-[rgb(247,246,243)] transition hover:brightness-105"
        >
          Start Generating Images
        </a>
      </div>
    </section>
  );
}
