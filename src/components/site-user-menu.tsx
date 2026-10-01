'use client';

import { CoinsIcon, LogOutIcon, SettingsIcon, ShieldIcon } from 'lucide-react';

import { signOut } from '@/core/auth/client';
import { Link, useRouter } from '@/core/i18n/navigation';
import { m } from '@/paraglide/messages.js';
import { useUserCredits } from '@/hooks/use-user-credits';
import { useUserPermissions } from '@/hooks/use-user-permissions';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export function SiteUserMenu({
  name,
  email,
  image,
}: {
  name: string;
  email: string;
  image?: string | null;
}) {
  const router = useRouter();
  const { data } = useUserPermissions();
  const creditsQuery = useUserCredits();
  const isAdmin = data?.isAdmin === true;
  const balance = creditsQuery.data?.balance;
  const balanceLabel =
    typeof balance === 'number' ? balance.toLocaleString() : '—';

  async function handleSignOut() {
    await signOut();
    router.push('/');
  }

  return (
    <div className="flex items-center gap-2">
      <DropdownMenu>
        <DropdownMenuTrigger className="focus-visible:ring-ring rounded-full outline-none focus-visible:ring-2">
          <Avatar className="size-9">
            <AvatarImage src={image || undefined} alt={name} />
            <AvatarFallback className="text-xs">
              {name.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="min-w-56" align="end" sideOffset={8}>
          <DropdownMenuGroup>
            <DropdownMenuLabel className="p-0 font-normal">
              <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                <Avatar className="size-8">
                  <AvatarImage src={image || undefined} alt={name} />
                  <AvatarFallback className="text-xs">
                    {name.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-medium">{name}</span>
                  <span className="text-muted-foreground truncate text-xs">
                    {email}
                  </span>
                </div>
              </div>
            </DropdownMenuLabel>
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuItem render={<Link href="/settings" />}>
            <SettingsIcon className="size-4" />
            {m['common.nav.settings']()}
          </DropdownMenuItem>
          {isAdmin && (
            <DropdownMenuItem render={<Link href="/admin" />}>
              <ShieldIcon className="size-4" />
              {m['common.systems.admin']()}
            </DropdownMenuItem>
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleSignOut}>
            <LogOutIcon className="size-4" />
            {m['common.sign.sign_out_title']()}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Link
        href="/settings/credits"
        className="border-border/70 bg-muted/30 text-foreground hover:bg-muted/50 inline-flex h-8 items-center gap-1.5 rounded-full border px-2.5 text-xs font-medium tabular-nums transition-colors"
        aria-label={m['common.nav.credits_remaining']({ count: balanceLabel })}
        title={m['common.nav.credits_remaining']({ count: balanceLabel })}
      >
        <CoinsIcon className="size-3.5 shrink-0 opacity-70" aria-hidden />
        <span
          className={
            creditsQuery.isPending ? 'text-muted-foreground animate-pulse' : ''
          }
        >
          {balanceLabel}
        </span>
      </Link>
    </div>
  );
}
