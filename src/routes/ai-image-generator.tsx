import { createFileRoute } from '@tanstack/react-router';

import { GeneratorForm } from '@/components/generator/GeneratorForm';
import { SiteFooter } from '@/components/landing/SiteFooter';
import { SiteHeader } from '@/components/landing/SiteHeader';

function ImageGeneratorPage() {
  return (
    <div className="bg-background text-foreground flex min-h-screen flex-col">
      <SiteHeader />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:py-12">
        <p className="text-muted-foreground text-xs font-semibold tracking-wider uppercase">New generator · Development</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight">AI Image Generator</h1>
        <p className="text-muted-foreground mb-8 mt-2 max-w-2xl text-sm">
          A model-driven image creation interface. Upload limits and output
          settings adjust to the selected model.
        </p>
        <GeneratorForm mediaType="image" />
      </main>
      <SiteFooter />
    </div>
  );
}

export const Route = createFileRoute('/ai-image-generator')({
  head: () => ({
    meta: [
      { title: 'AI Image Generator — Development | Genjutsu AI' },
      { name: 'description', content: 'Model-driven AI image generator under development.' },
      { name: 'robots', content: 'noindex, nofollow' },
      { name: 'googlebot', content: 'noindex, nofollow' },
    ],
  }),
  component: ImageGeneratorPage,
});
