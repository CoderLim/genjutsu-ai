import { useCallback, useEffect, useRef, useState } from 'react';

import { consumeAdminRecreate } from '@/lib/admin-recreate';
import { cn } from '@/lib/cn';
import { m } from '@/paraglide/messages.js';
import {
  GeneratorPanel,
  type GeneratorTemplateRequest,
} from '@/components/landing/GeneratorPanel';
import {
  isMotionTemplateApply,
  type MotionTemplate,
} from '@/components/landing/motion-templates';
import { MotionTemplateGallery } from '@/components/landing/MotionTemplateGallery';
import { SITE_HEADER_OFFSET_CLASS } from '@/components/landing/SiteHeader';

const BADGES = [
  m['site.hero.motion'],
  m['site.hero.objects'],
  m['site.hero.quality'],
] as const;

const HERO_VIDEO_SRC = '/videos/hero-bg.mp4';
const HERO_POSTER_SRC = '/videos/hero-bg-poster.jpg';

export function Hero({ className }: { className?: string }) {
  const [templateRequest, setTemplateRequest] =
    useState<GeneratorTemplateRequest | null>(null);
  const [applyingTemplateId, setApplyingTemplateId] = useState<string | null>(
    null
  );
  const requestIdRef = useRef(0);
  const adminRecreateConsumedRef = useRef(false);

  const handleSelectTemplate = useCallback((template: MotionTemplate) => {
    if (!isMotionTemplateApply(template)) return;
    const requestId = ++requestIdRef.current;
    setApplyingTemplateId(template.id);
    setTemplateRequest({
      requestId,
      template: {
        mode: template.mode,
        prompt: template.prompt,
        resolution: template.resolution,
        sourceVideo: template.sourceVideo,
      },
    });
    document
      .getElementById('hero-generator')
      ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, []);

  const handleTemplateSettled = useCallback(
    (result: { requestId: number; ok: boolean }) => {
      void result.ok;
      if (result.requestId !== requestIdRef.current) return;
      setApplyingTemplateId(null);
      setTemplateRequest(null);
    },
    []
  );

  useEffect(() => {
    if (adminRecreateConsumedRef.current) return;
    adminRecreateConsumedRef.current = true;
    const payload = consumeAdminRecreate();
    if (!payload) return;

    const requestId = ++requestIdRef.current;
    setTemplateRequest({
      requestId,
      template: {
        mode: payload.mode,
        prompt: payload.prompt,
        resolution: payload.resolution,
        sourceVideo: payload.videoUrl ?? undefined,
        imageUrls: payload.imageUrls,
        replaceImages: true,
      },
    });
    document
      .getElementById('hero-generator')
      ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, []);

  return (
    <section
      className={cn(
        'relative flex min-h-svh w-full flex-col justify-center',
        SITE_HEADER_OFFSET_CLASS,
        className
      )}
    >
      {/* Pin media to the first viewport only — Hero grows with the generator. */}
      <div
        className="pointer-events-none absolute inset-x-0 top-0 z-0 h-svh overflow-hidden"
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
        <div className="absolute inset-0 bg-linear-to-b from-black/65 via-black/50 to-[hsl(28_25%_10%)]" />
      </div>

      <div className="relative z-10 mx-auto w-full max-w-[1180px] px-4 pt-20 pb-10 text-center sm:pt-24 md:px-5 md:pb-14">
        <h1 className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-[28px] leading-[1.15] font-bold tracking-[-1px] text-[rgb(237,234,222)] sm:text-[34px] md:text-[40px] md:leading-[46px]">
          <img
            src="/logo.webp"
            alt="Genjutsu AI"
            width={48}
            height={48}
            fetchPriority="high"
            className="size-9 rounded-full sm:size-10 md:size-12"
          />
          <span>{m['site.hero.title']()}</span>
        </h1>

        <p className="mx-auto mt-3 max-w-3xl text-base leading-relaxed text-white/82 sm:mt-4 sm:text-lg">
          {m['site.hero.description']()}
        </p>

        <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
          {BADGES.map((badge) => (
            <span
              key={badge}
              className="inline-flex h-[27px] items-center rounded-full border border-[rgba(245,158,11,0.2)] bg-[rgba(245,158,11,0.1)] px-2.5 py-0.5 text-[11px] font-medium whitespace-nowrap text-[rgb(245,158,11)] backdrop-blur-sm"
            >
              {badge()}
            </span>
          ))}
        </div>

        <div id="hero-generator" className="mt-5 scroll-mt-24 text-left">
          <GeneratorPanel
            templateRequest={templateRequest}
            onTemplateSettled={handleTemplateSettled}
          />
          <MotionTemplateGallery
            applyingTemplateId={applyingTemplateId}
            onSelect={handleSelectTemplate}
          />
        </div>
      </div>
    </section>
  );
}
