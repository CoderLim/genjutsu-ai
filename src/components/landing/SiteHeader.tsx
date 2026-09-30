import { useEffect, useRef, useState } from 'react';
import type { NavDropdownItem, NavItem } from '@/types/landing';

import { Link } from '@/core/i18n/navigation';
import { cn } from '@/lib/cn';
import {
  ChevronDownIcon,
  GlobeIcon,
  MenuIcon,
  RaphaelLogo,
} from '@/components/icons';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';

const NAV_ITEMS: NavItem[] = [
  {
    label: 'AI Image',
    groups: [
      {
        items: [
          {
            title: 'Text to Image',
            description: 'Create images from text prompts',
            href: '/text-to-image',
          },
          {
            title: 'Image to Image',
            description: 'Generate from reference images',
            href: '/image-to-image',
          },
          {
            title: 'Image Templates',
            description: 'Start faster from image templates',
            href: '/image-templates',
          },
        ],
      },
    ],
  },
  {
    label: 'AI Video',
    groups: [
      {
        items: [
          {
            title: 'AI Video Generator',
            description: 'Open the video generation workspace',
            href: '/ai-video-generator',
          },
          {
            title: 'Text to Video',
            description: 'Create videos from text prompts',
            href: '/text-to-video',
          },
          {
            title: 'Image to Video',
            description: 'Animate reference images',
            href: '/image-to-video',
          },
          {
            title: 'Lip Sync',
            description: 'Create lip-sync videos with AI',
            href: 'https://fameo.ai/lip-sync-generators/ai-lip-sync-generator',
            badge: 'HOT',
          },
        ],
      },
    ],
  },
  {
    label: 'AI Photo Editor',
    groups: [
      {
        items: [
          {
            title: 'AI Photo Editor',
            description: 'Edit existing images with text',
            href: '/ai-image-editor',
          },
          {
            title: 'Expand Image',
            description: 'Extend images beyond their original borders',
            href: '/uncrop',
          },
          {
            title: 'Remove Background',
            description: 'Remove background from any image instantly',
            href: '/background-remover',
          },
          {
            title: 'AI Image Upscaler',
            description: 'Upscale images 2× or 4× with AI',
            href: '/image-upscaler',
            badge: 'NEW',
          },
        ],
      },
    ],
  },
  {
    label: 'AI Models',
    groups: [
      {
        label: 'Image Models',
        items: [
          {
            title: '🍌 Nano Banana 2 Lite',
            description: 'Fast 1K generation and editing',
            href: '/nano-banana-2-lite',
            badge: 'NEW',
          },
          {
            title: 'Seedream 5.0 Pro',
            description: 'Professional 1K / 2K generation and editing',
            href: '/seedream-5-pro',
            badge: '-30%',
            iconSrc: '/images/logos/image-models/seedream.svg',
          },
          {
            title: 'GPT Image 2',
            description: 'Precise prompts, clean text, product shots',
            href: '/gpt-image-2',
            iconSrc: '/images/logos/image-models/openai.svg',
          },
          {
            title: '🍌 Nano Banana 2',
            description: 'Faster next-generation image model',
            href: '/nano-banana-2',
          },
          {
            title: 'Seedream 5.0 Lite',
            description: 'Cinematic realism with dramatic lighting',
            href: '/seedream-5',
            iconSrc: '/images/logos/image-models/seedream.svg',
          },
          {
            title: 'Seedream 4.5',
            description: '2K / 4K generation and reference editing',
            href: '/seedream-4-5',
            iconSrc: '/images/logos/image-models/seedream.svg',
          },
          {
            title: 'Seedream 4.0',
            description: 'Cost-efficient 1K / 2K / 4K generation and editing',
            href: '/seedream-4',
            iconSrc: '/images/logos/image-models/seedream.svg',
          },
          {
            title: '🍌 Nano Banana Pro',
            description: 'High-quality model for professional image work',
            href: '/nano-banana-pro',
          },
          {
            title: '🍌 Nano Banana',
            description: 'Lightweight fast image generation model',
            href: '/nano-banana',
          },
          {
            title: 'Seedream 3.5 Pro',
            description: 'Consistent portraits and brand visuals',
            href: '/raphael-image-model',
            iconSrc: '/images/logos/image-models/seedream.svg',
          },
        ],
      },
      {
        label: 'Video Models',
        items: [
          {
            title: 'Seedance 2.0 Mini',
            description: 'Lower-cost drafts with rich reference control',
            href: '/seedance-2-mini',
            badge: 'NEW',
            iconSrc: '/images/logos/video-models/seedance.svg',
          },
          {
            title: 'Seedance 1.5 Pro',
            description: '1080p video with synchronized native audio',
            href: '/seedance-1-5',
            iconSrc: '/images/logos/video-models/seedance.svg',
          },
          {
            title: 'Seedance 1.0 Pro Fast',
            description: 'Fast video up to 1080p from 4 credits/sec',
            href: '/seedance-1',
            iconSrc: '/images/logos/video-models/seedance.svg',
          },
          {
            title: 'Kling 3.0 Turbo',
            description: 'Faster short-form text and image-to-video',
            href: '/kling-3-turbo',
            badge: 'NEW',
            iconSrc: '/images/logos/video-models/kling-official.png',
          },
          {
            title: 'Seedance 2.0',
            description: 'Smooth motion and natural choreography',
            href: '/seedance-2',
            iconSrc: '/images/logos/video-models/seedance.svg',
          },
          {
            title: 'Veo 3.1',
            description: 'Native audio, 4K output, cinematic realism',
            href: '/veo-3-1',
            iconSrc: '/images/logos/video-models/google-g.svg',
          },
          {
            title: 'Kling 3.0',
            description: 'Fast action with bold camera moves',
            href: '/kling-3',
            iconSrc: '/images/logos/video-models/kling-official.png',
          },
          {
            title: 'Seedance 1.0 Turbo',
            description: 'Stable shots with commercial control',
            href: '/raphael-video-pro',
            iconSrc: '/images/logos/video-models/seedance.svg',
          },
        ],
      },
    ],
  },
  {
    label: 'AI Tools',
    groups: [
      {
        items: [
          {
            title: 'AI 3D Model Generator',
            description: 'Turn text or images into 3D models in seconds',
            href: 'https://fast3d.io',
          },
          {
            title: 'AI Voice Cloning',
            description: 'Clone any voice from just 3 seconds of audio',
            href: 'https://anyvoice.net',
          },
          {
            title: 'AI Lip Sync Video',
            description: 'Create natural talking videos with AI lip sync',
            href: 'https://fameo.ai',
            badge: 'HOT',
          },
        ],
      },
    ],
  },
];

function Badge({ label }: { label: string }) {
  const tone =
    label === 'HOT'
      ? 'bg-orange-500 text-white'
      : label === 'NEW'
        ? 'bg-emerald-500 text-white'
        : label.startsWith('-')
          ? 'bg-[#e05256] text-white'
          : 'bg-primary text-primary-foreground';

  return (
    <span
      className={cn(
        'ml-1.5 inline-flex shrink-0 items-center rounded px-1 py-px text-[10px] leading-none font-bold',
        tone
      )}
    >
      {label}
    </span>
  );
}

function DropdownItem({ item }: { item: NavDropdownItem }) {
  const external = /^https?:/.test(item.href);

  return (
    <Link
      href={item.href}
      target={external ? '_blank' : undefined}
      rel={external ? 'noopener noreferrer' : undefined}
      className="hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground flex gap-3 rounded-md p-3 leading-none no-underline transition-colors outline-none select-none"
    >
      {item.iconSrc ? (
        <span className="bg-muted flex h-10 w-10 shrink-0 items-center justify-center rounded-md">
          <img
            src={item.iconSrc}
            alt=""
            className="h-6 w-6 object-contain"
            width={24}
            height={24}
          />
        </span>
      ) : null}
      <span className="min-w-0 space-y-1">
        <span className="text-foreground flex items-center text-sm leading-none font-medium">
          {item.title}
          {item.badge ? <Badge label={item.badge} /> : null}
        </span>
        <span className="text-muted-foreground line-clamp-2 text-sm leading-snug">
          {item.description}
        </span>
      </span>
    </Link>
  );
}

function MegaMenu({
  item,
  open,
  onOpenChange,
}: {
  item: NavItem;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const multi = (item.groups?.length ?? 0) > 1;

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!ref.current?.contains(event.target as Node)) {
        onOpenChange(false);
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onOpenChange(false);
    };
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open, onOpenChange]);

  return (
    <div
      ref={ref}
      className="relative"
      onMouseEnter={() => onOpenChange(true)}
      onMouseLeave={() => onOpenChange(false)}
    >
      <button
        type="button"
        aria-expanded={open}
        className={cn(
          'group hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground inline-flex h-10 w-max items-center justify-center rounded-md px-4 py-2 text-sm font-medium transition-colors focus:outline-none',
          open && 'bg-accent text-accent-foreground'
        )}
        onClick={() => onOpenChange(!open)}
      >
        {item.label}
        <ChevronDownIcon
          className={cn(
            'relative top-px ml-1 size-3 transition-transform duration-200',
            open && 'rotate-180'
          )}
          aria-hidden
        />
      </button>

      {open && item.groups ? (
        <div
          className={cn(
            'border-border bg-popover text-popover-foreground absolute top-full left-0 z-50 mt-1.5 overflow-hidden rounded-xl border shadow-lg',
            multi ? 'w-[min(92vw,720px)] p-3' : 'w-[320px] p-2'
          )}
        >
          <div className={cn(multi && 'grid gap-4 md:grid-cols-2')}>
            {item.groups.map((group) => (
              <div key={group.label ?? item.label} className="space-y-1">
                {group.label ? (
                  <div className="text-muted-foreground px-3 pt-1 pb-1 text-xs font-semibold tracking-wide uppercase">
                    {group.label}
                  </div>
                ) : null}
                <div className="grid gap-0.5">
                  {group.items.map((entry) => (
                    <DropdownItem key={entry.href + entry.title} item={entry} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function BrandLink({ className }: { className?: string }) {
  return (
    <Link href="/" className={cn('flex items-center gap-2', className)}>
      <RaphaelLogo size={32} className="rounded-full" />
      <span className="text-[20px] font-bold tracking-tight text-[#f9a639]">
        Raphael AI
      </span>
    </Link>
  );
}

function UpgradePill({ className }: { className?: string }) {
  return (
    <Link
      href="/pricing"
      className={cn(
        'relative inline-flex h-7 items-center rounded-full px-3.5 text-[11px] font-semibold text-[rgb(36,23,15)] shadow-[0_6px_16px_rgba(221,126,66,0.16)] transition-opacity hover:opacity-90',
        'bg-[linear-gradient(135deg,rgb(240,176,107),rgb(215,123,66))]',
        className
      )}
    >
      Upgrade
      <span className="absolute -top-2 -right-1 rounded bg-[#e05256] px-1 py-px text-[9px] leading-none font-bold text-white">
        -50%
      </span>
    </Link>
  );
}

function SignInButton({ className }: { className?: string }) {
  return (
    <Link
      href="/sign-in"
      className={cn(
        'inline-flex h-10 items-center justify-center rounded-[10px] bg-[rgb(204,144,92)] px-4 text-sm font-medium text-[rgb(247,246,243)] transition-colors hover:bg-[rgb(190,130,80)]',
        className
      )}
    >
      Sign in
    </Link>
  );
}

function MobileNavAccordion({ item }: { item: NavItem }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="border-border/60 border-b">
      <button
        type="button"
        className="text-foreground flex w-full items-center justify-between py-3 text-sm font-medium"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        {item.label}
        <ChevronDownIcon
          className={cn(
            'text-muted-foreground size-4 transition-transform duration-200',
            open && 'rotate-180'
          )}
        />
      </button>
      {open && item.groups ? (
        <div className="space-y-4 pb-3">
          {item.groups.map((group) => (
            <div key={group.label ?? item.label} className="space-y-1">
              {group.label ? (
                <div className="text-muted-foreground px-1 text-xs font-semibold tracking-wide uppercase">
                  {group.label}
                </div>
              ) : null}
              {group.items.map((entry) => (
                <DropdownItem key={entry.href + entry.title} item={entry} />
              ))}
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function SiteHeader() {
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  return (
    <section className="text-foreground relative z-[260] py-3">
      <div className="mx-auto px-4 md:max-w-7xl">
        {/* Desktop */}
        <nav className="hidden items-center justify-between gap-4 lg:flex">
          <div className="flex min-w-0 items-center gap-2 xl:gap-4">
            <BrandLink />
            <div className="flex items-center">
              {NAV_ITEMS.map((item) => (
                <MegaMenu
                  key={item.label}
                  item={item}
                  open={openMenu === item.label}
                  onOpenChange={(open) => setOpenMenu(open ? item.label : null)}
                />
              ))}
              <Link
                href="/pricing"
                className="hover:bg-accent hover:text-accent-foreground inline-flex h-10 items-center justify-center rounded-md px-4 py-2 text-sm font-medium transition-colors"
              >
                Pricing
              </Link>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <UpgradePill />
            <button
              type="button"
              aria-label="Language"
              className="text-muted-foreground hover:bg-accent hover:text-foreground inline-flex size-9 items-center justify-center rounded-md transition-colors"
            >
              <GlobeIcon className="size-4" />
            </button>
            <SignInButton />
          </div>
        </nav>

        {/* Mobile */}
        <div className="flex items-center justify-between gap-3 lg:hidden">
          <BrandLink />
          <div className="flex items-center gap-2">
            <UpgradePill className="hidden sm:inline-flex" />
            <SignInButton />
            <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
              <SheetTrigger
                aria-label="Open menu"
                className="text-foreground hover:bg-accent inline-flex size-9 items-center justify-center rounded-md transition-colors"
              >
                <MenuIcon className="size-5" />
              </SheetTrigger>
              <SheetContent
                side="right"
                className="border-border bg-background w-[min(100vw,360px)] p-0"
              >
                <SheetHeader className="border-border border-b px-4 py-4 text-left">
                  <SheetTitle className="text-primary flex items-center gap-2">
                    <RaphaelLogo size={28} className="rounded-full" />
                    Raphael AI
                  </SheetTitle>
                </SheetHeader>
                <div className="flex h-full flex-col overflow-y-auto px-4 pt-2 pb-8">
                  {NAV_ITEMS.map((item) => (
                    <MobileNavAccordion key={item.label} item={item} />
                  ))}
                  <Link
                    href="/pricing"
                    className="border-border/60 border-b py-3 text-sm font-medium"
                    onClick={() => setSheetOpen(false)}
                  >
                    Pricing
                  </Link>
                  <div className="mt-6 flex flex-col gap-3">
                    <UpgradePill className="w-fit" />
                    <button
                      type="button"
                      className="text-muted-foreground hover:bg-accent hover:text-foreground inline-flex w-fit items-center gap-2 rounded-md px-2 py-2 text-sm"
                    >
                      <GlobeIcon className="size-4" />
                      Language
                    </button>
                    <SignInButton className="w-full" />
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </section>
  );
}
