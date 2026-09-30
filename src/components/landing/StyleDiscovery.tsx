import { useRef } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

import { Link } from '@/core/i18n/navigation';
import { cn } from '@/lib/cn';

type StyleItem = {
  href: string;
  label: string;
  imageSrc: string;
  imageAlt: string;
};

const TRY_STYLES: StyleItem[] = [
  {
    href: '/image-templates?templateId=sketch',
    label: 'AI Sketch Portrait Generator',
    imageSrc: '/images/quick-i2i/sketch.webp',
    imageAlt: 'AI Sketch Portrait Generator',
  },
  {
    href: '/image-templates?templateId=holiday-portrait',
    label: 'AI Holiday Portrait Generator',
    imageSrc: '/images/quick-i2i/holiday-portrait.webp',
    imageAlt: 'AI Holiday Portrait Generator',
  },
  {
    href: '/image-templates?templateId=dramatic',
    label: 'AI Dramatic Black and White Portrait',
    imageSrc: '/images/quick-i2i/dramatic_v2.webp',
    imageAlt: 'AI Dramatic Black and White Portrait',
  },
  {
    href: '/image-templates?templateId=plushie',
    label: 'AI Plushie Generator',
    imageSrc: '/images/quick-i2i/plushie_v2.webp',
    imageAlt: 'AI Plushie Generator',
  },
  {
    href: '/image-templates?templateId=baseball-bobblehead',
    label: 'AI Baseball Bobblehead Generator',
    imageSrc: '/images/quick-i2i/baseball-bobblehead.webp',
    imageAlt: 'AI Baseball Bobblehead Generator',
  },
  {
    href: '/image-templates?templateId=3d-glam-doll',
    label: 'AI 3D Glam Doll Generator',
    imageSrc: '/images/quick-i2i/style_3d_glam_doll.webp',
    imageAlt: 'AI 3D Glam Doll Generator',
  },
  {
    href: '/image-templates?templateId=doodle',
    label: 'AI Doodle Portrait Generator',
    imageSrc: '/images/quick-i2i/doodle_v2.webp',
    imageAlt: 'AI Doodle Portrait Generator',
  },
  {
    href: '/image-templates?templateId=inkwork',
    label: 'AI Ink Illustration Generator',
    imageSrc: '/images/quick-i2i/inkwork.webp',
    imageAlt: 'AI Ink Illustration Generator',
  },
  {
    href: '/image-templates?templateId=fisheye',
    label: 'AI Fisheye Portrait Generator',
    imageSrc: '/images/quick-i2i/fisheye.webp',
    imageAlt: 'AI Fisheye Portrait Generator',
  },
  {
    href: '/image-templates?templateId=pop-art',
    label: 'AI Pop Art Portrait Generator',
    imageSrc: '/images/quick-i2i/pop-art.webp',
    imageAlt: 'AI Pop Art Portrait Generator',
  },
  {
    href: '/image-templates?templateId=ornament',
    label: 'AI Christmas Ornament Photo Generator',
    imageSrc: '/images/quick-i2i/ornament.webp',
    imageAlt: 'AI Christmas Ornament Photo Generator',
  },
  {
    href: '/image-templates?templateId=sugar-cookie',
    label: 'AI Sugar Cookie Art Generator',
    imageSrc: '/images/quick-i2i/sugar-cookie.webp',
    imageAlt: 'AI Sugar Cookie Art Generator',
  },
  {
    href: '/image-templates?templateId=art-school',
    label: 'AI Art School Portrait Generator',
    imageSrc: '/images/quick-i2i/art-school.webp',
    imageAlt: 'AI Art School Portrait Generator',
  },
];

const DISCOVER_STYLES: StyleItem[] = [
  {
    href: '/image-templates?templateId=create-a-holiday-card',
    label: 'AI Holiday Card Maker',
    imageSrc: '/images/quick-i2i/create-a-holiday-card.webp',
    imageAlt: 'AI Holiday Card Maker',
  },
  {
    href: '/image-templates?templateId=k-pop-star',
    label: 'AI K-Pop Idol Photo Generator',
    imageSrc: '/images/quick-i2i/what-would-i-look-like-as-a-k-pop-star.webp',
    imageAlt: 'AI K-Pop Idol Photo Generator',
  },
  {
    href: '/image-templates?templateId=girl-with-a-pearl',
    label: 'AI Girl with a Pearl Portrait',
    imageSrc: '/images/quick-i2i/me-as-the-girl-with-a-pearl.webp',
    imageAlt: 'AI Girl with a Pearl Portrait',
  },
  {
    href: '/image-templates?templateId=create-an-album-cover',
    label: 'AI Album Cover Generator',
    imageSrc: '/images/quick-i2i/create-an-album-cover.webp',
    imageAlt: 'AI Album Cover Generator',
  },
  {
    href: '/image-templates?templateId=style-me',
    label: 'AI Outfit Generator',
    imageSrc: '/images/quick-i2i/style-me.webp',
    imageAlt: 'AI Outfit Generator',
  },
  {
    href: '/image-templates?templateId=create-a-professional-product-photo',
    label: 'AI Product Photo Generator',
    imageSrc: '/images/quick-i2i/create-a-professional-product-photo.webp',
    imageAlt: 'AI Product Photo Generator',
  },
  {
    href: '/image-templates?templateId=redecorate-my-room',
    label: 'AI Room Redesign Generator',
    imageSrc: '/images/quick-i2i/redecorate-my-room.webp',
    imageAlt: 'AI Room Redesign Generator',
  },
  {
    href: '/image-templates?templateId=give-us-a-matching-outfit',
    label: 'AI Matching Outfit Generator',
    imageSrc: '/images/quick-i2i/give-us-a-matching-outfit.webp',
    imageAlt: 'AI Matching Outfit Generator',
  },
  {
    href: '/image-templates?templateId=create-a-professional-job-photo',
    label: 'AI Professional Headshot Generator',
    imageSrc: '/images/quick-i2i/create-a-professional-job-photo.webp',
    imageAlt: 'AI Professional Headshot Generator',
  },
  {
    href: '/image-templates?templateId=remove-people-in-the-background',
    label: 'AI Background People Remover',
    imageSrc: '/images/quick-i2i/remove-people-in-the-background.webp',
    imageAlt: 'AI Background People Remover',
  },
  {
    href: '/image-templates?templateId=restore-an-old-photo',
    label: 'AI Old Photo Restoration',
    imageSrc: '/images/quick-i2i/restore-an-old-photo.webp',
    imageAlt: 'AI Old Photo Restoration',
  },
  {
    href: '/image-templates?templateId=turn-into-a-keychain',
    label: 'AI Keychain Generator',
    imageSrc: '/images/quick-i2i/turn-into-a-keychain.webp',
    imageAlt: 'AI Keychain Generator',
  },
];

function ScrollButtons({
  onPrev,
  onNext,
}: {
  onPrev: () => void;
  onNext: () => void;
}) {
  return (
    <div className="flex shrink-0 items-center gap-1">
      <button
        type="button"
        aria-label="Scroll left"
        onClick={onPrev}
        className="inline-flex size-8 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white/60 transition hover:bg-white/10 hover:text-white"
      >
        <ChevronLeft className="size-4" />
      </button>
      <button
        type="button"
        aria-label="Scroll right"
        onClick={onNext}
        className="inline-flex size-8 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white/60 transition hover:bg-white/10 hover:text-white"
      >
        <ChevronRight className="size-4" />
      </button>
    </div>
  );
}

function useScroller() {
  const ref = useRef<HTMLDivElement>(null);
  const scrollBy = (dir: -1 | 1) => {
    const el = ref.current;
    if (!el) return;
    el.scrollBy({
      left: dir * Math.min(el.clientWidth * 0.8, 480),
      behavior: 'smooth',
    });
  };
  return { ref, scrollBy };
}

/** Style template carousels — matches live "Try a style" / "Discover something new". */
export function StyleDiscovery({ className }: { className?: string }) {
  const tryScroll = useScroller();
  const discScroll = useScroller();

  return (
    <section className={cn('mx-auto mt-10 w-full sm:mt-16', className)}>
      <div className="py-2 sm:py-4">
        {/* Try a style */}
        <div className="mb-6 flex items-center justify-between gap-4">
          <h2 className="text-foreground text-3xl font-semibold tracking-tight sm:text-4xl">
            Try a style
          </h2>
          <ScrollButtons
            onPrev={() => tryScroll.scrollBy(-1)}
            onNext={() => tryScroll.scrollBy(1)}
          />
        </div>

        <div
          ref={tryScroll.ref}
          className="relative flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-smooth px-1 pb-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {TRY_STYLES.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="group flex w-32 shrink-0 snap-start flex-col gap-3 text-left focus:outline-none sm:w-40"
            >
              <div className="relative aspect-[3/4] overflow-hidden rounded-xl">
                <img
                  src={item.imageSrc}
                  alt={item.imageAlt}
                  loading="lazy"
                  decoding="async"
                  className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                />
                <span className="absolute inset-0 bg-black/0 transition-colors group-hover:bg-black/10" />
              </div>
              <span className="text-foreground/90 line-clamp-2 text-sm font-medium">
                {item.label}
              </span>
            </Link>
          ))}
        </div>

        {/* Discover something new */}
        <div className="relative mt-12 mb-6 flex items-center justify-between gap-4">
          <h2 className="text-foreground text-3xl font-semibold tracking-tight sm:text-4xl">
            Discover something new
          </h2>
          <ScrollButtons
            onPrev={() => discScroll.scrollBy(-1)}
            onNext={() => discScroll.scrollBy(1)}
          />
        </div>

        <div
          ref={discScroll.ref}
          className="relative grid snap-x snap-mandatory auto-cols-[minmax(280px,371px)] grid-flow-col grid-rows-3 gap-4 overflow-x-auto scroll-smooth pb-2 [scrollbar-width:none] sm:auto-cols-[371px] [&::-webkit-scrollbar]:hidden"
        >
          {DISCOVER_STYLES.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="group border-border/10 bg-foreground/[0.02] hover:border-border/40 hover:bg-foreground/[0.05] focus-visible:ring-primary relative flex snap-start items-center gap-4 overflow-hidden rounded-xl border p-3 text-left transition-all duration-300 hover:shadow-sm focus:outline-none focus-visible:ring-1"
            >
              <div className="border-border/10 relative h-14 w-14 shrink-0 overflow-hidden rounded-lg border">
                <img
                  src={item.imageSrc}
                  alt={item.imageAlt}
                  width={56}
                  height={56}
                  loading="lazy"
                  decoding="async"
                  className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-110"
                />
              </div>
              <span className="text-foreground/90 min-w-0 flex-1 text-sm font-medium">
                {item.label}
              </span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
