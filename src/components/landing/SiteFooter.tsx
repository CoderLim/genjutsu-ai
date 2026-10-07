import { Link } from '@/core/i18n/navigation';
import { envConfigs } from '@/config';
import { cn } from '@/lib/cn';
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
                  Restyle any video without changing who or what is in it — new
                  scenes, styles, and objects while keeping the original motion.
                  Powered by Higgsfield Genjutsu.
                </p>
              </div>
            </div>

            <div className="grid w-full max-w-md grid-cols-2 gap-8">
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
            <p>© 2026 • {envConfigs.app_name} All rights reserved.</p>
            <div className="flex flex-wrap items-center justify-center gap-4 lg:justify-end">
              <a
                href={`mailto:${envConfigs.app_support_email}`}
                className="hover:text-foreground transition-colors"
              >
                {envConfigs.app_support_email}
              </a>
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
              <Link
                href="/refund-policy"
                className="hover:text-foreground transition-colors"
              >
                Refund Policy
              </Link>
            </div>
          </div>

          <div className="border-border mt-6 flex flex-wrap items-center justify-center gap-4 border-t pt-6">
            <a
              href="https://submito.net"
              target="_blank"
              rel="noopener noreferrer"
              title="Listed on Submito"
            >
              <img
                src="https://submito.net/badge/listed-light.svg"
                alt="Listed on Submito"
                loading="lazy"
                decoding="async"
                className="h-[27px] w-auto"
              />
            </a>
            <a
              href="https://findly.tools/genjutsu-ai?utm_source=genjutsu-ai"
              target="_blank"
              rel="noopener noreferrer"
            >
              <img
                src="https://findly.tools/badges/findly-tools-badge-light.svg"
                alt="Featured on Findly.tools"
                width={175}
                height={55}
                loading="lazy"
                decoding="async"
                className="h-[27px] w-auto"
              />
            </a>
            <a
              href="https://goodaitools.com/ai/genjutsuai"
              target="_blank"
              rel="noopener noreferrer"
            >
              <img
                src="https://goodaitools.com/assets/images/badge.png"
                alt="Good AI Tools"
                height={54}
                loading="lazy"
                decoding="async"
                className="h-[27px] w-auto"
              />
            </a>
          </div>
        </footer>
      </div>
    </section>
  );
}
