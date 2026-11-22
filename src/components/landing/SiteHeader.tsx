import { useState } from 'react';
import { Flame } from 'lucide-react';

import { useSession } from '@/core/auth/client';
import { Link } from '@/core/i18n/navigation';
import { envConfigs } from '@/config';
import { cn } from '@/lib/cn';
import { m } from '@/paraglide/messages.js';
import { ChevronDownIcon, MenuIcon, RaphaelLogo } from '@/components/icons';
import { LocaleSelector } from '@/components/locale-selector';
import { SiteUserMenu } from '@/components/site-user-menu';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';

const NAV_LINKS = [
  { label: m['site.header.feature'], href: '/#feature' },
  { label: m['site.header.pricing'], href: '/pricing' },
  { label: m['site.header.blog'], href: '/blog' },
] as const;

const AI_PHOTO_EDITOR_HREF =
  'https://getaiphotoeditor.com/?utm_source=genjutsu-ai';

const TOOLS_LINKS = [
  {
    label: m['site.header.photo_editor'],
    href: AI_PHOTO_EDITOR_HREF,
    external: true,
    badge: true,
  },
  {
    label: m['site.header.image_to_video'],
    href: '/image-to-video',
    external: false,
    badge: false,
  },
] as const;

const TRENDING_LINKS = [
  {
    label: 'Jatayu Video Prompt',
    href: '/jatayu-video-prompt',
    poster: '/videos/demos/jatayu-case-01-poster.jpg',
  },
  {
    label: 'Wassup in a Minute AI',
    href: '/wassup-in-a-minute-ai',
    poster: '/videos/wassup-in-a-minute-ai-tpl-poster.jpg',
  },
  {
    label: 'Tiny Desk AI',
    href: '/tiny-desk-ai',
    poster: '/videos/tiny-desk-ai-tpl-poster.jpg',
  },
  {
    label: 'Can I Ride Dance AI',
    href: '/can-i-ride-dance-ai',
    poster: '/videos/can-i-ride-dance-duo-tpl-poster.jpg',
  },
  {
    label: 'GTA 5 Goodbye AI Video',
    href: '/gta-5-goodbye-ai-video',
    poster: '/videos/gta-5-goodbye-ai-video-tpl-poster.jpg',
  },
  {
    label: 'Gas Station Dance AI',
    href: '/gas-station-dance-ai',
    poster: '/videos/long-trival-tpl-poster.jpg',
  },
  {
    label: 'Deck the Halls Dance AI',
    href: '/deck-the-halls-dance-ai',
    poster: '/videos/deck-the-halls-dance-duo-tpl-poster.jpg',
  },
  {
    label: 'Say It Right AI',
    href: '/say-it-right-ai',
    poster: '/videos/say-it-right-dance-tpl-poster.jpg',
  },
  {
    label: 'Coldplay Kiss Cam',
    href: '/coldplay-kiss-cam',
    poster: '/videos/coldplay-kiss-cam-tpl-poster.jpg',
  },
  {
    label: 'Shan Shen Bu',
    href: '/shan-shen-bu',
    poster: '/videos/shan-shen-bu-tpl-poster.jpg',
  },
  {
    label: 'Flying Car AI',
    href: '/flying-car-ai',
    poster: '/videos/flying-car-ai-tpl-poster.jpg',
  },
  {
    label: 'A2O LITE AI',
    href: '/a2o-lite-ai',
    poster: '/videos/a2o-lite-ai-tpl-poster.jpg',
  },
  {
    label: 'Enzo Fernandez AI',
    href: '/enzo-fernandez-ai',
    poster: '/videos/enzo-fernandez-ai-tpl-poster.jpg',
  },
  {
    label: 'Crazy Frog AI',
    href: '/crazy-frog-ai',
    poster: '/videos/crazy-frog-tpl-poster.jpg',
  },
  {
    label: 'Bad Times AI',
    href: '/kairo-bad-times',
    poster: '/videos/kairo-bad-times-tpl-poster.jpg',
  },
  {
    label: 'Smalltown Boy Dance',
    href: '/smalltown-boy-dance',
    poster: '/videos/smalltown-boy-dance-tpl-poster.jpg',
  },
  {
    label: 'Rumpelstiltskin AI',
    href: '/ai-rumpelstiltskin',
    poster: '/videos/rumpelstiltskin-tpl-poster.jpg',
  },
  {
    label: 'Bulin 47 AI',
    href: '/bulin-47-ai',
    poster: '/videos/bulin47-tpl-poster.jpg',
  },
  {
    label: 'Bicep Heart Trend',
    href: '/bicep-heart-ai',
    poster: '/videos/bicep-heart-tpl-poster.jpg',
  },
  {
    label: 'Glow Stick AI',
    href: '/glow-stick-ai',
    poster: '/videos/glow-stick-tpl-poster.jpg',
  },
  {
    label: 'Chipmunks Dance',
    href: '/chipmunks-dance',
    poster: '/videos/chipmunks-dance-tpl-poster.jpg',
  },
  {
    label: '58th Floor AI',
    href: '/58th-floor-ai-video',
    poster: '/videos/58th-floor-tpl-poster.jpg',
  },
  {
    label: 'Hotel Lobby',
    href: '/hotel-lobby-ai',
    poster: '/readme/hotel-lobby.jpg',
  },
  {
    label: 'Zombie Hug',
    href: '/ai-zombie-hug',
    poster: '/readme/zombie-hug.jpg',
  },
  {
    label: 'Day of the Dead AI Video',
    href: '/day-of-the-dead-ai-video',
    poster: '/videos/day-of-the-dead-ai-video-demo-poster.jpg',
  },
] as const;

const navLinkClass =
  'hover:bg-accent hover:text-accent-foreground inline-flex h-10 items-center justify-center rounded-md px-4 py-2 text-sm font-medium transition-colors';

function TrendingHotMark({ className }: { className?: string }) {
  return (
    <Flame
      className={cn('size-3.5 shrink-0', className)}
      color="#ff6b35"
      fill="#ff6b35"
      stroke="#ff6b35"
      aria-hidden
    />
  );
}

function TrendingThumb({
  poster,
  className,
}: {
  poster: string;
  className?: string;
}) {
  return (
    <span
      className={cn('bg-muted/40 block overflow-hidden rounded-md', className)}
    >
      <img
        src={poster}
        alt=""
        loading="lazy"
        decoding="async"
        className="aspect-video w-full object-cover"
      />
    </span>
  );
}

function BrandLink({ className }: { className?: string }) {
  return (
    <Link href="/" className={cn('flex items-center gap-2', className)}>
      <RaphaelLogo size={32} className="rounded-full" />
      <span className="text-[20px] font-bold tracking-tight text-[#f9a639]">
        {envConfigs.app_name}
      </span>
    </Link>
  );
}

function NewBadge({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        'rounded bg-[#e05256] px-1 py-px text-[9px] leading-none font-bold text-white',
        className
      )}
    >
      {m['site.header.photo_editor_badge']()}
    </span>
  );
}

function ToolsMenuLink({
  item,
  className,
  onClick,
}: {
  item: (typeof TOOLS_LINKS)[number];
  className?: string;
  onClick?: () => void;
}) {
  return (
    <Link
      href={item.href}
      {...(item.external
        ? { target: '_blank', rel: 'noopener noreferrer' }
        : {})}
      className={cn(
        'hover:bg-accent focus-visible:bg-accent flex items-center rounded-md px-3 py-2 text-sm font-medium transition-colors outline-none',
        className
      )}
      onClick={onClick}
    >
      {item.label()}
      {item.badge ? <NewBadge className="ml-1.5" /> : null}
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
      {m['site.header.upgrade']()}
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
      {m['site.header.signin']()}
    </Link>
  );
}

function AuthSlot({ className }: { className?: string }) {
  const { data: session, isPending } = useSession();
  const user = session?.user;

  if (isPending) {
    return (
      <div
        className={cn(
          'bg-muted/40 size-9 animate-pulse rounded-full',
          className
        )}
        aria-hidden
      />
    );
  }

  if (user) {
    return (
      <SiteUserMenu
        name={user.name || 'User'}
        email={user.email}
        image={user.image}
      />
    );
  }

  return <SignInButton className={className} />;
}

export function SiteHeader() {
  const [sheetOpen, setSheetOpen] = useState(false);
  const [trendingOpen, setTrendingOpen] = useState(false);
  const [toolsOpen, setToolsOpen] = useState(false);

  return (
    <section className="text-foreground relative z-[260] py-3">
      <div className="mx-auto px-4 md:max-w-7xl">
        {/* Desktop */}
        <nav className="hidden items-center justify-between gap-4 lg:flex">
          <div className="flex min-w-0 items-center gap-2 xl:gap-4">
            <BrandLink />
            <div className="flex items-center">
              <DropdownMenu open={trendingOpen} onOpenChange={setTrendingOpen}>
                <DropdownMenuTrigger className={navLinkClass}>
                  <TrendingHotMark className="mr-1" />
                  {m['site.header.trending']()}
                  <ChevronDownIcon className="ml-1 size-3.5 opacity-70" />
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="start"
                  className="w-[min(720px,calc(100vw-2rem))] p-3"
                >
                  {/*
                    Use Link (not Menu.Item + router.push). Base UI Menu.Item
                    close/unmount can swallow the navigate for this dense grid.
                  */}
                  <div className="grid grid-cols-4 gap-2">
                    {TRENDING_LINKS.map((item) => (
                      <Link
                        key={item.href}
                        href={item.href}
                        className="hover:bg-accent focus-visible:bg-accent flex h-auto cursor-pointer flex-col items-stretch gap-1.5 rounded-lg px-1.5 py-1.5 transition-colors outline-none"
                        onClick={() => setTrendingOpen(false)}
                      >
                        <TrendingThumb poster={item.poster} />
                        <span className="text-foreground line-clamp-2 px-0.5 text-left text-xs leading-snug font-medium">
                          {item.label}
                        </span>
                      </Link>
                    ))}
                  </div>
                </DropdownMenuContent>
              </DropdownMenu>
              <DropdownMenu open={toolsOpen} onOpenChange={setToolsOpen}>
                <DropdownMenuTrigger className={navLinkClass}>
                  {m['site.header.tools']()}
                  <ChevronDownIcon className="ml-1 size-3.5 opacity-70" />
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="start"
                  className="min-w-[220px] p-1.5"
                >
                  {TOOLS_LINKS.map((item) => (
                    <ToolsMenuLink
                      key={item.href}
                      item={item}
                      onClick={() => setToolsOpen(false)}
                    />
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
              {NAV_LINKS.map((item) => (
                <Link key={item.href} href={item.href} className={navLinkClass}>
                  {item.label()}
                </Link>
              ))}
              <Link href="/creations" className={navLinkClass}>
                {m['creations.nav']()}
              </Link>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <UpgradePill />
            <LocaleSelector className="text-muted-foreground hover:bg-accent hover:text-foreground size-9" />
            <AuthSlot />
          </div>
        </nav>

        {/* Mobile */}
        <div className="flex items-center justify-between gap-3 lg:hidden">
          <BrandLink />
          <div className="flex items-center gap-2">
            <UpgradePill className="hidden sm:inline-flex" />
            <AuthSlot />
            <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
              <SheetTrigger
                aria-label={m['site.header.menu']()}
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
                    {envConfigs.app_name}
                  </SheetTitle>
                </SheetHeader>
                <div className="flex h-full flex-col overflow-y-auto px-4 pt-2 pb-8">
                  <div className="border-border/60 border-b py-3">
                    <p className="text-muted-foreground flex items-center gap-1 text-xs font-medium tracking-wide uppercase">
                      <TrendingHotMark className="size-3" />
                      {m['site.header.trending']()}
                    </p>
                    <div className="mt-2 grid grid-cols-2 gap-2">
                      {TRENDING_LINKS.map((item) => (
                        <Link
                          key={item.href}
                          href={item.href}
                          className="hover:bg-accent focus-visible:bg-accent rounded-lg p-1.5 transition-colors"
                          onClick={() => setSheetOpen(false)}
                        >
                          <TrendingThumb poster={item.poster} />
                          <span className="mt-1.5 line-clamp-2 block px-0.5 text-xs leading-snug font-medium">
                            {item.label}
                          </span>
                        </Link>
                      ))}
                    </div>
                  </div>
                  <div className="border-border/60 border-b py-3">
                    <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
                      {m['site.header.tools']()}
                    </p>
                    <div className="mt-1 flex flex-col">
                      {TOOLS_LINKS.map((item) => (
                        <ToolsMenuLink
                          key={item.href}
                          item={item}
                          className="rounded-none px-0 py-2.5"
                          onClick={() => setSheetOpen(false)}
                        />
                      ))}
                    </div>
                  </div>
                  {NAV_LINKS.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      className="border-border/60 border-b py-3 text-sm font-medium"
                      onClick={() => setSheetOpen(false)}
                    >
                      {item.label()}
                    </Link>
                  ))}
                  <Link
                    href="/creations"
                    className="border-border/60 border-b py-3 text-sm font-medium"
                    onClick={() => setSheetOpen(false)}
                  >
                    {m['creations.nav']()}
                  </Link>
                  <div className="mt-6 flex flex-col gap-3">
                    <UpgradePill className="w-fit" />
                    <LocaleSelector variant="pill" className="w-fit" />
                    <AuthSlot className="w-full" />
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
