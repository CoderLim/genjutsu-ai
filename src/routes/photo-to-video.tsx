import { createFileRoute } from '@tanstack/react-router';

import { GeneratorForm } from '@/components/generator/GeneratorForm';
import { SiteFooter } from '@/components/landing/SiteFooter';
import { SiteHeader } from '@/components/landing/SiteHeader';

function PhotoToVideoPage() {
  return (
    <div className="bg-background text-foreground flex min-h-screen flex-col">
      <SiteHeader />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:py-12">
        <p className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
          New generator
        </p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight">Photo to Video</h1>
        <p className="text-muted-foreground mb-8 mt-2 max-w-2xl text-sm">
          Upload a photo, describe the motion, and create a video. Switch to
          Start &amp; End to guide both frames. Your credit estimate updates
          immediately as the video settings change.
        </p>
        <GeneratorForm mediaType="video" initialModelId="photo-to-video-standard" />
      </main>
      <SiteFooter />
    </div>
  );
}

export const Route = createFileRoute('/photo-to-video')({
  head: () => ({
    meta: [
      { title: 'Photo to Video — Genjutsu AI' },
      { name: 'description', content: 'Turn a photo into a video with model-specific controls.' },
      { name: 'robots', content: 'noindex, nofollow' },
    ],
  }),
  component: PhotoToVideoPage,
});
