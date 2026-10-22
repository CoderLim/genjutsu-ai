import { Check, ChevronDown, Globe, Languages } from 'lucide-react';

import { usePathname } from '@/core/i18n/navigation';
import { localeNames } from '@/config/locale';
import { cn } from '@/lib/utils';
import {
  getLocale,
  locales,
  localizeUrl,
  setLocale,
} from '@/paraglide/runtime.js';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export function LocaleSelector({
  variant = 'icon',
  className,
}: {
  variant?: 'icon' | 'pill';
  className?: string;
}) {
  const locale = getLocale();
  const pathname = usePathname();
  const englishOnlyPage = pathname === '/bulin-47-ai';

  function handleSwitch(newLocale: string) {
    if (englishOnlyPage && newLocale !== 'en') {
      // No translated version of this article yet. Open the selected-language
      // homepage directly instead of hitting the article's 307 fallback.
      const homeUrl = localizeUrl(new URL('/', window.location.origin), {
        locale: newLocale as typeof locale,
      });
      window.location.assign(homeUrl.href);
      return;
    }
    // Writes the locale cookie and reloads on the localized URL.
    setLocale(newLocale as typeof locale);
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={cn(
          'inline-flex items-center transition-colors outline-none',
          variant === 'icon'
            ? 'text-muted-foreground hover:bg-accent hover:text-accent-foreground size-8 justify-center rounded-md'
            : 'h-9 gap-2 rounded-full border px-4 text-sm',
          className
        )}
      >
        {variant === 'icon' ? (
          <>
            <Globe className="size-4" />
            <span className="sr-only">Switch language</span>
          </>
        ) : (
          <>
            <Languages className="size-4" />
            <span>{localeNames[locale] || locale}</span>
            <ChevronDown className="size-4 opacity-70" />
          </>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {englishOnlyPage && (
          <div className="text-muted-foreground max-w-56 px-2 py-1.5 text-xs leading-relaxed">
            This page is only available in English. Selecting another language
            opens the homepage.
          </div>
        )}
        {locales.map((loc) => (
          <DropdownMenuItem
            key={loc}
            onClick={() => handleSwitch(loc)}
            className="flex items-center justify-between gap-2"
          >
            {localeNames[loc] || loc}
            {loc === locale && <Check className="size-3.5" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
