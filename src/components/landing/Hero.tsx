import { cn } from '@/lib/cn';
import { GeneratorPanel } from '@/components/landing/GeneratorPanel';

const BADGES = [
  'Motion Transfer',
  'Objects Swap',
  'Up to 1080p',
  'Video + Image',
] as const;

/** Brand amber from live site logo / hero accent */
const BRAND = '#f9a639';

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
        <span>Higgsfield Genjutsu AI</span>
        <span className="basis-full whitespace-nowrap sm:basis-auto">
          <span className="text-foreground/80 hidden sm:inline"> - </span>
          <span
            className="drop-shadow-[0_12px_32px_rgba(255,170,61,0.16)]"
            style={{ color: BRAND }}
          >
            Reality Manipulation
          </span>
        </span>
      </h1>

      <p className="mx-auto mt-2 max-w-2xl text-base text-white/82">
        Transfer motion or swap objects in any video — upload one clip and one
        reference image
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
