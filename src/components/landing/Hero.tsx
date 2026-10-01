import { cn } from '@/lib/cn';
import { GeneratorPanel } from '@/components/landing/GeneratorPanel';

const BADGES = ['Motion Transfer', 'Objects Swap', 'Up to 1080p'] as const;

export function Hero({ className }: { className?: string }) {
  return (
    <section
      className={cn(
        'relative mx-auto w-full max-w-[1180px] pt-6 pb-8 text-center sm:pt-8 md:pt-10',
        className
      )}
    >
      <h1 className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-[28px] leading-[1.15] font-bold tracking-[-1px] text-[rgb(237,234,222)] sm:text-[34px] md:text-[40px] md:leading-[46px]">
        <img
          src="/logo.webp"
          alt="Genjutsu AI"
          width={48}
          height={48}
          fetchPriority="high"
          className="size-9 rounded-full sm:size-10 md:size-12"
        />
        <span>Genjutsu AI Video Generator</span>
      </h1>

      <p className="mx-auto mt-3 max-w-3xl text-base leading-relaxed text-white/82 sm:mt-4 sm:text-lg">
        Restyle the shot, keep the motion. Genjutsu is a video-to-video model
        by Higgsfield that rewrites who and what is in your clip while
        preserving the original camera movement and timing.
      </p>

      <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
        {BADGES.map((badge) => (
          <span
            key={badge}
            className="inline-flex h-[27px] items-center rounded-full border border-[rgba(245,158,11,0.2)] bg-[rgba(245,158,11,0.1)] px-2.5 py-0.5 text-[11px] font-medium whitespace-nowrap text-[rgb(245,158,11)]"
          >
            {badge}
          </span>
        ))}
      </div>

      <div id="hero-generator" className="mt-5 scroll-mt-24 text-left">
        <GeneratorPanel />
      </div>
    </section>
  );
}
