import { cn } from '@/lib/cn';
import { GeneratorPanel } from '@/components/landing/GeneratorPanel';

export function Hero({ className }: { className?: string }) {
  return (
    <section
      className={cn(
        'relative mx-auto w-full max-w-[1128px] pt-6 pb-8 text-center sm:pt-8 md:pt-10',
        className
      )}
    >
      <h1 className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-[28px] leading-[1.15] font-bold tracking-[-1px] text-[rgb(237,234,222)] sm:text-[34px] md:text-[40px] md:leading-[46px]">
        <img
          src="/logo.webp"
          alt=""
          width={48}
          height={48}
          className="size-9 rounded-full sm:size-10 md:size-12"
        />
        <span>Genjutsu AI Video Generator</span>
      </h1>

      <div id="hero-generator" className="mt-5 scroll-mt-24 text-left">
        <GeneratorPanel />
      </div>

      <p className="mx-auto mt-6 max-w-3xl text-base leading-relaxed text-white/82 sm:text-lg">
        Swap the character, keep the motion. Genjutsu is a video-to-video model
        by Higgsfield that rewrites who and what is in your clip while
        preserving the original camera movement and timing.
      </p>
    </section>
  );
}
