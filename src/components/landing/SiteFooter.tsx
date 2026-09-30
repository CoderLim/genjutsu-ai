import { Link } from '@/core/i18n/navigation';
import { envConfigs } from '@/config';
import { cn } from '@/lib/cn';
import { BuiltWithShipAny } from '@/components/built-with-shipany';
import { RaphaelLogo } from '@/components/icons';
import { FOOTER_COLUMNS } from '@/components/landing/content';

const isExternalHref = (href: string) => /^https?:\/\//.test(href);

function FooterLink({
  href,
  label,
  badge,
}: {
  href: string;
  label: string;
  badge?: string;
}) {
  const className =
    'inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground';

  const content = (
    <>
      <span>{label}</span>
      {badge ? (
        <span className="bg-primary/20 text-primary rounded px-1 py-px text-[10px] font-semibold">
          {badge}
        </span>
      ) : null}
    </>
  );

  if (isExternalHref(href)) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className={className}
      >
        {content}
      </a>
    );
  }

  return (
    <Link href={href} className={className}>
      {content}
    </Link>
  );
}

export function SiteFooter() {
  return (
    <section id="footer" className="py-16">
      <div className="mx-auto max-w-7xl px-8">
        <footer>
          <div className="flex flex-col items-center justify-between gap-10 text-center lg:flex-row lg:items-start lg:text-left">
            <div className="flex max-w-96 shrink flex-col items-center justify-between gap-6 lg:items-start">
              <div>
                <div className="flex items-center justify-center gap-2 lg:justify-start">
                  <RaphaelLogo size={44} className="h-11 w-11" />
                  <p className="text-foreground text-3xl font-semibold">
                    {envConfigs.app_name}
                  </p>
                </div>
                <p className="text-md text-muted-foreground mt-6">
                  {envConfigs.app_description ||
                    'Genjutsu AI swaps characters, outfits and scenes in any video while keeping the original motion.'}
                </p>
              </div>
            </div>

            <div className="grid w-full max-w-3xl grid-cols-2 gap-8 sm:grid-cols-3">
              {FOOTER_COLUMNS.map((column) => (
                <div key={column.title}>
                  <p className="text-foreground mb-6 font-bold">
                    {column.title}
                  </p>
                  <ul className="space-y-3">
                    {column.links.map((link) => (
                      <li key={link.label}>
                        <FooterLink
                          href={link.href}
                          label={link.label}
                          badge={link.badge}
                        />
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>

          <div
            className={cn(
              'border-border mt-8 flex flex-col justify-between gap-4 border-t pt-8',
              'text-muted-foreground text-center text-sm font-medium',
              'lg:flex-row lg:items-center lg:text-left'
            )}
          >
            <p>© 2025 • {envConfigs.app_name} All rights reserved.</p>
            <div className="flex flex-wrap items-center justify-center gap-4 lg:justify-end">
              <Link
                href="/privacy-policy"
                className="hover:text-foreground transition-colors"
              >
                Privacy Policy
              </Link>
              <Link
                href="/terms-of-service"
                className="hover:text-foreground transition-colors"
              >
                Terms of Service
              </Link>
              <BuiltWithShipAny />
            </div>
          </div>
        </footer>
      </div>
    </section>
  );
}
