import { createFileRoute } from '@tanstack/react-router';

import { GeneratorForm } from '@/components/generator/GeneratorForm';
import { ImageToVideoSeoSections } from '@/components/landing/ImageToVideoSeoSections';
import { SiteFooter } from '@/components/landing/SiteFooter';
import { SiteHeader } from '@/components/landing/SiteHeader';
import { SeoJsonLd } from '@/components/seo-json-ld';
import { absoluteUrl, socialMeta } from '@/lib/seo';
import {
  IMAGE_TO_VIDEO_DESCRIPTION,
  IMAGE_TO_VIDEO_FAQS,
  IMAGE_TO_VIDEO_PATH,
  IMAGE_TO_VIDEO_STEPS,
  IMAGE_TO_VIDEO_TITLE,
} from '@/modules/image-to-video/seo';

// English-only editorial until real translations are available.
const CANONICAL = absoluteUrl(IMAGE_TO_VIDEO_PATH);

function softwareApplicationJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'Image to Video AI',
    applicationCategory: 'MultimediaApplication',
    operatingSystem: 'Web',
    url: CANONICAL,
    description: IMAGE_TO_VIDEO_DESCRIPTION,
    // This is a credit-based generator, not a promise of free generation.
    // Avoid fabricated free quotas, provider costs or app-level USD offers.
  };
}

function howToJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'HowTo',
    name: 'How to turn a photo into a video',
    description: 'Upload a photo, describe the motion, then generate and download the resulting MP4 video.',
    step: IMAGE_TO_VIDEO_STEPS.map((item, index) => ({
      '@type': 'HowToStep',
      position: index + 1,
      name: item.name,
      text: item.text,
      url: CANONICAL + '#step-' + (index + 1),
    })),
  };
}

function faqJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: IMAGE_TO_VIDEO_FAQS.map((item) => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: item.answer,
      },
    })),
  };
}

function ImageToVideoPage() {
  return (
    <div className="bg-background text-foreground flex min-h-screen flex-col">
      <SeoJsonLd value={softwareApplicationJsonLd()} />
      <SeoJsonLd value={howToJsonLd()} />
      <SeoJsonLd value={faqJsonLd()} />
      <SiteHeader />

      <main className="mx-auto w-full max-w-[1180px] flex-1 px-4 py-8 sm:py-12">
        <p className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
          Image to video generator
        </p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-5xl">
          Image to Video AI
        </h1>
        <p className="text-muted-foreground mt-5 max-w-4xl text-base leading-7 sm:text-lg sm:leading-8">
          Most AI video tools start with a blank prompt and ask you to imagine
          everything from scratch. This one can start with a photo you already
          have. Upload an image, describe how it should move, and download a
          short clip for a post, a product listing, or someone you care about.
          No editing timeline or special software required.
        </p>

        <div id="generator" className="mt-8 scroll-mt-6 sm:mt-10">
          <GeneratorForm
            mediaType="video"
            initialModelId="photo-to-video-standard"
          />
        </div>

        <ImageToVideoSeoSections />
      </main>
      <SiteFooter />
    </div>
  );
}

export const Route = createFileRoute('/image-to-video')({
  head: () => ({
    meta: [
      { title: IMAGE_TO_VIDEO_TITLE },
      { name: 'description', content: IMAGE_TO_VIDEO_DESCRIPTION },
      { name: 'robots', content: 'index, follow' },
      ...socialMeta({
        title: IMAGE_TO_VIDEO_TITLE,
        description: IMAGE_TO_VIDEO_DESCRIPTION,
        url: CANONICAL,
      }),
    ],
    links: [
      { rel: 'canonical', href: CANONICAL },
      // No artificial hreflang translations for English-only page content.
      { rel: 'alternate', hrefLang: 'en', href: CANONICAL },
      { rel: 'alternate', hrefLang: 'x-default', href: CANONICAL },
    ],
  }),
  component: ImageToVideoPage,
});
