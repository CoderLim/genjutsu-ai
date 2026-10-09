import { createFileRoute } from '@tanstack/react-router';

import { envConfigs } from '@/config';
import { localeLinks, socialMeta } from '@/lib/seo';
import { getLocale } from '@/paraglide/runtime.js';
import { Pricing } from '@/blocks/pricing';
import { SiteFooter } from '@/components/landing/SiteFooter';
import { SiteHeader } from '@/components/landing/SiteHeader';

const PAGE_TITLE = `Genjutsu AI Pricing | ${envConfigs.app_name}`;
const PAGE_DESCRIPTION =
  'One-time Genjutsu credit packs for Motion Transfer and Object Swap. No subscription — pay only for the video generations you run.';

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
        { title: PAGE_TITLE },
        { name: 'description', content: PAGE_DESCRIPTION },
        ...socialMeta({
          title: PAGE_TITLE,
          description: PAGE_DESCRIPTION,
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
