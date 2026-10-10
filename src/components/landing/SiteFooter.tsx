import { Github } from 'lucide-react';

import { Link } from '@/core/i18n/navigation';
import { envConfigs } from '@/config';
import { cn } from '@/lib/cn';
import { m } from '@/paraglide/messages.js';
import { RaphaelLogo } from '@/components/icons';
import { FOOTER_COLUMNS } from '@/components/landing/content';

function translatedFooterText(value: string) {
  switch (value) {
    case 'About': return m['site.footer.about']();
    case 'Tools': return m['site.footer.tools']();
    case 'Features': return m['site.footer.features']();
    case 'Pricing': return m['site.header.pricing']();
    case 'Blog': return m['site.header.blog']();
    case 'Partners': return m['site.footer.partners']();
    case 'Person Remover': return m['site.footer.personremover']();
    case 'Video Text Remover': return m['site.footer.videotextremover']();
    default: return value; // Brand/product labels are intentionally retained.
  }
}

const GITHUB_REPO_URL = 'https://github.com/limbuilder/genjutsu-ai';

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
                  {m['site.footer.description']()}
                </p>
                <a
                  href={GITHUB_REPO_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Genjutsu AI on GitHub"
                  title="GitHub"
                  className="text-muted-foreground hover:text-foreground mt-5 inline-flex size-9 items-center justify-center rounded-md transition-colors"
                >
                  <Github className="size-5" />
                </a>
              </div>
            </div>

            <div className="grid w-full max-w-md grid-cols-2 gap-8">
              {FOOTER_COLUMNS.map((column) => (
                <div key={translatedFooterText(column.title)}>
                  <p className="text-foreground mb-6 font-bold">
                    {translatedFooterText(column.title)}
                  </p>
                  <ul className="space-y-3">
                    {column.links.map((link) => (
                      <li key={link.label}>
                        <FooterLink
                          href={link.href}
                          label={translatedFooterText(link.label)}
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
            <p>© 2026 • {envConfigs.app_name} {m['site.footer.copyright']()}</p>
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
                {m['site.footer.privacy']()}
              </Link>
              <Link
                href="/terms-of-service"
                className="hover:text-foreground transition-colors"
              >
                {m['site.footer.terms']()}
              </Link>
              <Link
                href="/refund-policy"
                className="hover:text-foreground transition-colors"
              >
                {m['site.footer.refund']()}
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
            <a
              href="https://openhunts.com"
              target="_blank"
              rel="noopener noreferrer"
              title="OpenHunts Club"
            >
              <img
                src="https://cdn.openhunts.com/badges/club.webp"
                alt="OpenHunts Club Member"
                width={486}
                height={105}
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
