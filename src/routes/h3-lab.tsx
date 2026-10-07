import { createFileRoute } from '@tanstack/react-router';

import { H3LabPanel } from '@/components/h3-lab/H3LabPanel';
import { SiteHeader } from '@/components/landing/SiteHeader';

const PAGE_TITLE = 'H3 Lab (internal)';
const PAGE_DESCRIPTION =
  'Internal MiniMax H3 reference-to-video playground. Not for public indexing.';

function H3LabPage() {
  return (
    <div className="bg-background text-foreground min-h-screen">
      <SiteHeader />
      <main className="px-4 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto mb-8 max-w-5xl">
          <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
            Internal test
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">
            MiniMax H3 Lab
          </h1>
          <p className="text-muted-foreground mt-2 max-w-2xl text-sm">
            Same Fal model as Hotel Lobby AI (
            <code className="text-xs">minimax/h3/reference-to-video</code>
            ), with prompt, up to 9 reference images, resolution, aspect ratio,
            duration, and safety checker exposed for quick A/B tests. Uses your
            credit balance. noindex · not in sitemap.
          </p>
        </div>
        <H3LabPanel />
      </main>
    </div>
  );
}

export const Route = createFileRoute('/h3-lab')({
  head: () => ({
    meta: [
      { title: PAGE_TITLE },
      { name: 'description', content: PAGE_DESCRIPTION },
      { name: 'robots', content: 'noindex, nofollow' },
      { name: 'googlebot', content: 'noindex, nofollow' },
    ],
  }),
  component: H3LabPage,
});
