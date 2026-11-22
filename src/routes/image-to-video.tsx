import { createFileRoute } from '@tanstack/react-router';

import {
  IMAGE_TO_VIDEO_DESCRIPTION,
  IMAGE_TO_VIDEO_FAQS,
  IMAGE_TO_VIDEO_PATH,
  IMAGE_TO_VIDEO_STEPS,
  IMAGE_TO_VIDEO_TITLE,
} from '@/modules/image-to-video/seo';
import { absoluteUrl, socialMeta } from '@/lib/seo';
import { GeneratorForm } from '@/components/generator/GeneratorForm';
import { ImageToVideoSeoSections } from '@/components/landing/ImageToVideoSeoSections';
import { SiteFooter } from '@/components/landing/SiteFooter';
import {
  SITE_HEADER_OFFSET_CLASS,
  SiteHeader,
} from '@/components/landing/SiteHeader';
import { SeoJsonLd } from '@/components/seo-json-ld';

// English-only editorial until real translations are available.
const CANONICAL = absoluteUrl(IMAGE_TO_VIDEO_PATH);
const HERO_VIDEO_SRC = '/videos/image-to-video-hero.mp4';
const HERO_POSTER_SRC = '/videos/image-to-video-hero-poster.jpg';
const HERO_POSTER_WIDTH = 1280;
const HERO_POSTER_HEIGHT = 720;

function softwareApplicationJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'Image to Video AI',
    applicationCategory: 'MultimediaApplication',
    operatingSystem: 'Web',
    url: CANONICAL,
    description: IMAGE_TO_VIDEO_DESCRIPTION,
    offers: {
      '@type': 'Offer',
      priceCurrency: 'USD',
      description:
        'Generation uses Genjutsu AI credits; the estimated cost is shown before you confirm.',
    },
  };
}

function howToJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'HowTo',
    name: 'How to turn a photo into a video',
    description:
      'Upload a photo, describe the motion, then generate and download the resulting MP4 video.',
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

function breadcrumbJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: 'Home',
        item: absoluteUrl('/'),
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: 'Image to Video AI',
        item: CANONICAL,
      },
    ],
  };
}

function ImageToVideoPage() {
  return (
    <div className="bg-background text-foreground flex min-h-screen flex-col">
      <SeoJsonLd value={softwareApplicationJsonLd()} />
      <SeoJsonLd value={howToJsonLd()} />
      <SeoJsonLd value={faqJsonLd()} />
      <SeoJsonLd value={breadcrumbJsonLd()} />

      <SiteHeader />

      <div className="relative">
        <section
          className={`relative flex min-h-svh w-full flex-col justify-center ${SITE_HEADER_OFFSET_CLASS}`}
        >
          {/* Pin media to the first viewport only — section grows with the generator. */}
          <div
            className="pointer-events-none absolute inset-x-0 top-0 h-svh overflow-hidden"
            aria-hidden
          >
            <div
              className="absolute inset-0 bg-cover bg-center"
              style={{ backgroundImage: `url(${HERO_POSTER_SRC})` }}
            />
            <video
              className="absolute inset-0 size-full object-cover motion-reduce:hidden"
              autoPlay
              muted
              loop
              playsInline
              preload="metadata"
              poster={HERO_POSTER_SRC}
            >
              <source src={HERO_VIDEO_SRC} type="video/mp4" />
            </video>
          </div>

          <div className="relative z-10 mx-auto w-full max-w-[1180px] px-4 pt-20 pb-10 sm:pt-24 sm:pb-14 md:px-5">
            <p className="text-xs font-semibold tracking-wide text-white/70 uppercase">
              Genjutsu · Image to video generator
            </p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight text-[rgb(237,234,222)] sm:text-5xl">
              Image to Video AI
            </h1>
            <p className="mt-5 max-w-4xl text-base leading-7 text-white/78 sm:text-lg sm:leading-8">
              Most AI video tools start with a blank prompt and ask you to
              imagine everything from scratch. This one can start with a photo
              you already have. Upload an image, describe how it should move,
              and download a short clip for a post, a product listing, or
              someone you care about. No editing timeline or special software
              required.
            </p>

            <div id="generator" className="mt-8 scroll-mt-24 sm:mt-10">
              <GeneratorForm
                mediaType="video"
                initialModelId="photo-to-video-standard"
              />
            </div>
          </div>
        </section>
      </div>

      <main className="mx-auto w-full max-w-[1180px] flex-1 px-4 py-8 sm:py-12">
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
        image: absoluteUrl(HERO_POSTER_SRC),
        imageWidth: HERO_POSTER_WIDTH,
        imageHeight: HERO_POSTER_HEIGHT,
      }),
    ],
    links: [
      { rel: 'canonical', href: CANONICAL },
      // No artificial hreflang translations for English-only page content.
      { rel: 'alternate', hrefLang: 'en', href: CANONICAL },
      { rel: 'alternate', hrefLang: 'x-default', href: CANONICAL },
      {
        rel: 'preload',
        as: 'image',
        href: HERO_POSTER_SRC,
      },
    ],
  }),
  component: ImageToVideoPage,
});
