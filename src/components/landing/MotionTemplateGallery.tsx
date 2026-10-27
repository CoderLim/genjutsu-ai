import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

import { tDynamic } from '@/core/i18n/dynamic';
import { Link } from '@/core/i18n/navigation';
import { cn } from '@/lib/cn';
import { m } from '@/paraglide/messages.js';
import { CloseIcon } from '@/components/icons';
import {
  getMotionTemplatePreviewSrc,
  isMotionTemplateApply,
  MOTION_TEMPLATES,
  type MotionTemplate,
} from '@/components/landing/motion-templates';

/** Load + play muted loop only when the card nears the viewport. */
function useLazyAutoplayVideo(src: string) {
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [active, setActive] = useState(false);

  useEffect(() => {
    const node = containerRef.current;
    if (!node) return;

    const reduceMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)'
    ).matches;
    if (reduceMotion) return;

    const io = new IntersectionObserver(
      ([entry]) => {
        setActive(Boolean(entry?.isIntersecting));
      },
      { rootMargin: '200px 0px', threshold: 0.01 }
    );
    io.observe(node);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (!active) {
      video.pause();
      video.removeAttribute('src');
      video.load();
      return;
    }

    if (video.getAttribute('src') !== src) {
      video.src = src;
    }
    void video.play().catch(() => {
      /* autoplay can be blocked; poster stays visible */
    });
  }, [active, src]);

  return { containerRef, videoRef };
}

type MotionTemplateGalleryProps = {
  className?: string;
  applyingTemplateId?: string | null;
  onSelect?: (template: MotionTemplate) => void;
};

function TemplatePreviewLightbox({
  title,
  src,
  onClose,
}: {
  title: string;
  src: string;
  onClose: () => void;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  if (typeof document === 'undefined') return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[400] flex items-center justify-center p-4 sm:p-8"
      role="dialog"
      aria-modal="true"
      aria-label={m['site.templates.preview_aria']({ title })}
    >
      <button
        type="button"
        aria-label={m['site.generator.preview_close']()}
        className="absolute inset-0 cursor-pointer bg-black/75 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative z-10 max-h-[88vh] max-w-[min(92vw,760px)]">
        <button
          type="button"
          aria-label={m['site.generator.close']()}
          onClick={onClose}
          className="absolute -top-3 -right-3 z-20 flex size-8 cursor-pointer items-center justify-center rounded-full border border-white/15 bg-[rgba(41,30,23,0.95)] text-[rgb(237,234,222)] shadow-lg hover:bg-[rgba(60,44,34,0.98)]"
        >
          <CloseIcon className="size-4" />
        </button>
        <video
          src={src}
          controls
          autoPlay
          className="max-h-[88vh] w-auto max-w-full rounded-xl object-contain shadow-2xl"
        />
      </div>
    </div>,
    document.body
  );
}

const primaryActionClassName =
  'inline-flex h-8 w-full max-w-[9.5rem] cursor-pointer items-center justify-center rounded-lg bg-[rgb(204,144,92)] px-3 text-[11px] font-semibold text-[rgb(247,246,243)] shadow-md transition hover:brightness-105';

function TemplateCard({
  template,
  applying,
  onSelect,
  onPreview,
  className,
}: {
  template: MotionTemplate;
  applying: boolean;
  onSelect?: (template: MotionTemplate) => void;
  onPreview: (template: MotionTemplate) => void;
  className?: string;
}) {
  const title = tDynamic(template.titleKey);
  const previewSrc = getMotionTemplatePreviewSrc(template);
  const { containerRef, videoRef } = useLazyAutoplayVideo(previewSrc);

  return (
    <div
      ref={containerRef}
      className={cn(
        'group relative block w-full overflow-hidden rounded-lg border border-white/12 bg-black/45 text-left shadow-[0_6px_16px_rgba(0,0,0,0.28)] transition',
        'hover:border-[rgba(204,144,92,0.45)] hover:brightness-105',
        applying && 'opacity-80',
        className
      )}
    >
      <img
        src={template.poster}
        alt=""
        loading="lazy"
        decoding="async"
        className="absolute inset-0 size-full object-cover"
      />
      <video
        ref={videoRef}
        className="absolute inset-0 size-full object-cover motion-reduce:hidden"
        muted
        loop
        playsInline
        preload="none"
        poster={template.poster}
        aria-hidden
      />
      <div className="absolute inset-x-0 bottom-0 bg-linear-to-t from-black/85 via-black/45 to-transparent px-1.5 pt-5 pb-1.5">
        <p className="truncate text-[10px] font-semibold text-[rgb(237,234,222)]">
          {title}
        </p>
      </div>

      <div
        className={cn(
          'absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/55 px-2 transition-opacity duration-200',
          'pointer-events-none opacity-0',
          'group-hover:pointer-events-auto group-hover:opacity-100',
          'group-focus-within:pointer-events-auto group-focus-within:opacity-100',
          '[@media(hover:none)]:pointer-events-auto [@media(hover:none)]:opacity-100'
        )}
      >
        {isMotionTemplateApply(template) ? (
          <button
            type="button"
            disabled={applying || !onSelect}
            onClick={() => onSelect?.(template)}
            aria-label={m['site.templates.use_aria']({ title })}
            className={cn(
              primaryActionClassName,
              (applying || !onSelect) && 'cursor-not-allowed opacity-60'
            )}
          >
            {applying
              ? m['site.templates.applying']()
              : m['site.templates.use']()}
          </button>
        ) : (
          <Link
            href={template.href}
            aria-label={
              template.ctaLabelKey
                ? tDynamic(template.ctaLabelKey)
                : m['site.templates.use_aria']({ title })
            }
            className={cn(
              primaryActionClassName,
              template.ctaLabelKey &&
                'max-w-[11.5rem] px-2 text-center leading-tight'
            )}
          >
            {template.ctaLabelKey
              ? tDynamic(template.ctaLabelKey)
              : m['site.templates.use']()}
          </Link>
        )}
        <button
          type="button"
          onClick={() => onPreview(template)}
          aria-label={m['site.templates.preview_aria']({ title })}
          className="inline-flex h-8 w-full max-w-[9.5rem] cursor-pointer items-center justify-center rounded-lg border border-white/25 bg-black/45 px-3 text-[11px] font-semibold text-[rgb(237,234,222)] shadow-md backdrop-blur-sm transition hover:bg-white/10"
        >
          {m['site.templates.preview']()}
        </button>
      </div>
    </div>
  );
}

/**
 * Six CSS grid columns per desktop row. A landscape stack spans two
 * columns, and each portrait spans one. Grid accounts for every gap so
 * six portrait cards fit on one row without premature wrapping.
 */
function groupTemplateBlocks(templates: MotionTemplate[]) {
  const portraits = templates.filter(
    (template) => template.aspect === 'portrait'
  );
  const landscapes = templates.filter(
    (template) => template.aspect === 'landscape'
  );
  type Block =
    | { kind: 'portrait'; template: MotionTemplate }
    | { kind: 'landscape-stack'; templates: [MotionTemplate, MotionTemplate] }
    | { kind: 'landscape-single'; template: MotionTemplate };

  const blocks: Block[] = [];
  let portraitIndex = 0;
  let landscapeIndex = 0;

  // Desktop: portrait(1) + stacked landscapes(2) +
  // portrait(1) + stacked landscapes(2) = six width units.
  while (
    portraitIndex + 1 < portraits.length &&
    landscapeIndex + 3 < landscapes.length
  ) {
    blocks.push({ kind: 'portrait', template: portraits[portraitIndex++]! });
    blocks.push({
      kind: 'landscape-stack',
      templates: [landscapes[landscapeIndex++]!, landscapes[landscapeIndex++]!],
    });
    blocks.push({ kind: 'portrait', template: portraits[portraitIndex++]! });
    blocks.push({
      kind: 'landscape-stack',
      templates: [landscapes[landscapeIndex++]!, landscapes[landscapeIndex++]!],
    });
  }

  while (portraitIndex < portraits.length) {
    blocks.push({ kind: 'portrait', template: portraits[portraitIndex++]! });
  }
  while (landscapeIndex + 1 < landscapes.length) {
    blocks.push({
      kind: 'landscape-stack',
      templates: [landscapes[landscapeIndex++]!, landscapes[landscapeIndex++]!],
    });
  }
  if (landscapeIndex < landscapes.length) {
    blocks.push({
      kind: 'landscape-single',
      template: landscapes[landscapeIndex]!,
    });
  }
  return blocks;
}

export function MotionTemplateGallery({
  className,
  applyingTemplateId = null,
  onSelect,
}: MotionTemplateGalleryProps) {
  const blocks = groupTemplateBlocks(MOTION_TEMPLATES);
  const [previewTemplate, setPreviewTemplate] = useState<MotionTemplate | null>(
    null
  );

  const handlePreview = useCallback((template: MotionTemplate) => {
    setPreviewTemplate(template);
  }, []);

  const closePreview = useCallback(() => {
    setPreviewTemplate(null);
  }, []);

  return (
    <section
      className={cn('mt-6 text-left', className)}
      aria-labelledby="motion-templates-heading"
    >
      <div className="mb-3">
        <h2
          id="motion-templates-heading"
          className="text-[18px] font-semibold tracking-tight text-[rgb(237,234,222)] sm:text-[20px]"
        >
          {m['site.templates.title']()}
        </h2>
        <p className="mt-1 text-[13px] text-white/60">
          {m['site.templates.description']()}
        </p>
      </div>

      <div className="grid w-full grid-cols-4 gap-2 sm:gap-3 md:grid-cols-6 lg:gap-4">
        {blocks.map((block) => {
          if (block.kind === 'portrait') {
            return (
              <div key={block.template.id} className="col-span-1 min-w-0">
                <TemplateCard
                  template={block.template}
                  applying={applyingTemplateId === block.template.id}
                  onSelect={onSelect}
                  onPreview={handlePreview}
                  className="aspect-[1/2]"
                />
              </div>
            );
          }

          if (block.kind === 'landscape-single') {
            return (
              <div key={block.template.id} className="col-span-2 min-w-0">
                <TemplateCard
                  template={block.template}
                  applying={applyingTemplateId === block.template.id}
                  onSelect={onSelect}
                  onPreview={handlePreview}
                  className="aspect-[2/1]"
                />
              </div>
            );
          }

          return (
            <div
              key={block.templates[0].id}
              className="col-span-2 flex min-w-0 flex-col gap-2 sm:gap-3 lg:gap-4"
            >
              {block.templates.map((template) => (
                <TemplateCard
                  key={template.id}
                  template={template}
                  applying={applyingTemplateId === template.id}
                  onSelect={onSelect}
                  onPreview={handlePreview}
                  className="aspect-[2/1]"
                />
              ))}
            </div>
          );
        })}
      </div>

      {previewTemplate ? (
        <TemplatePreviewLightbox
          title={tDynamic(previewTemplate.titleKey)}
          src={previewTemplate.sourceVideo}
          onClose={closePreview}
        />
      ) : null}
    </section>
  );
}
