import { useState } from 'react';

import { useSession } from '@/core/auth/client';
import { Link } from '@/core/i18n/navigation';
import { envConfigs } from '@/config';
import { m } from '@/paraglide/messages.js';
import { cn } from '@/lib/cn';
import { GlobeIcon, MenuIcon, RaphaelLogo } from '@/components/icons';
import { SiteUserMenu } from '@/components/site-user-menu';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';

const NAV_LINKS = [
  { label: 'Introduction', href: '/#introduction' },
  { label: 'Feature', href: '/#feature' },
  { label: 'How it works', href: '/#how-it-works' },
  { label: 'Pricing', href: '/#pricing' },
] as const;

const navLinkClass =
  'hover:bg-accent hover:text-accent-foreground inline-flex h-10 items-center justify-center rounded-md px-4 py-2 text-sm font-medium transition-colors';

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
  const navLinks = [
    ...NAV_LINKS,
    { label: m['creations.nav'](), href: '/creations' },
  ];

  return (
    <section className="text-foreground relative z-[260] py-3">
      <div className="mx-auto px-4 md:max-w-7xl">
        {/* Desktop */}
        <nav className="hidden items-center justify-between gap-4 lg:flex">
          <div className="flex min-w-0 items-center gap-2 xl:gap-4">
            <BrandLink />
            <div className="flex items-center">
              {navLinks.map((item) => (
                <Link key={item.href} href={item.href} className={navLinkClass}>
                  {item.label}
                </Link>
              ))}
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
                    {envConfigs.app_name}
                  </SheetTitle>
                </SheetHeader>
                <div className="flex h-full flex-col overflow-y-auto px-4 pt-2 pb-8">
                  {navLinks.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      className="border-border/60 border-b py-3 text-sm font-medium"
                      onClick={() => setSheetOpen(false)}
                    >
                      {item.label}
                    </Link>
                  ))}
                  <div className="mt-6 flex flex-col gap-3">
                    <UpgradePill className="w-fit" />
                    <button
                      type="button"
                      className="text-muted-foreground hover:bg-accent hover:text-foreground inline-flex w-fit items-center gap-2 rounded-md px-2 py-2 text-sm"
                    >
                      <GlobeIcon className="size-4" />
                      Language
                    </button>
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
