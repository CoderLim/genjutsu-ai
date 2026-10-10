import { createFileRoute } from '@tanstack/react-router';

import { localeLinks, socialMeta } from '@/lib/seo';
import { getLocale } from '@/paraglide/runtime.js';
import { m } from '@/paraglide/messages.js';
import { Pricing } from '@/blocks/pricing';
import { SiteFooter } from '@/components/landing/SiteFooter';
import { SiteHeader } from '@/components/landing/SiteHeader';


export const Route = createFileRoute('/pricing')({
  loader: () => {
    const locale = getLocale();
    return { locale };
  },
  head: ({ loaderData }) => {
    const locale = loaderData?.locale ?? 'en';
    const { canonical, alternates } = localeLinks('/pricing', locale);
    return {
      meta: [
        { title: m['site.pricing.standalone_meta_title']() },
        { name: 'description', content: m['site.pricing.standalone_meta_desc']() },
        ...socialMeta({
          title: m['site.pricing.standalone_meta_title'](),
          description: m['site.pricing.standalone_meta_desc'](),
          url: canonical,
        }),
      ],
      links: [{ rel: 'canonical', href: canonical }, ...alternates],
    };
  },
  component: PricingPage,
});

function PricingPage() {
  return (
    <div className="bg-background text-foreground flex min-h-screen flex-col">
      <SiteHeader />
      <main className="flex-1">
        <Pricing />
      </main>
      <SiteFooter />
    </div>
  );
}
