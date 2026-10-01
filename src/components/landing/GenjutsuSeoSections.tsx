import {
  Clapperboard,
  MapPin,
  Package,
  Shirt,
  type LucideIcon,
} from 'lucide-react';

import { Link } from '@/core/i18n/navigation';
import { cn } from '@/lib/cn';
import {
  GENJUTSU_CHANGE_EXAMPLES,
  GENJUTSU_CHANGE_ITEMS,
  GENJUTSU_HOW_IT_WORKS,
  GENJUTSU_HOWTO_STEPS,
  GENJUTSU_PROMPT_IDEAS,
  GENJUTSU_VS_ROWS,
} from '@/components/landing/content';

const CHANGE_ICONS: LucideIcon[] = [Package, Shirt, MapPin, Clapperboard];

function SectionHeading({
  title,
  description,
}: {
  title: string;
  description?: string;
}) {
  return (
    <div className="mx-auto max-w-3xl text-center">
      <h2 className="text-foreground text-3xl font-bold tracking-tight sm:text-4xl">
        {title}
      </h2>
      {description ? (
        <p className="text-foreground/70 mt-4 text-base leading-relaxed sm:text-lg">
          {description}
        </p>
      ) : null}
    </div>
  );
}

export function WhatIsGenjutsu({ className }: { className?: string }) {
  return (
    <section id="introduction" className={cn('scroll-mt-24 py-16', className)}>
      <div className="container mx-auto px-4">
        <SectionHeading title="What Is Genjutsu AI?" />
        <p className="text-foreground/70 mx-auto mt-8 max-w-3xl text-center text-base leading-relaxed sm:text-lg">
          Genjutsu is a video-to-video model by Higgsfield. You upload an
          existing clip; this site uses the model to restyle products, outfits,
          scenes, and props while preserving the original motion, camera
          movement, and timing. It is not a from-scratch text-to-video generator
          — the source take provides the motion and Genjutsu changes selected
          visual elements around it.
        </p>
      </div>
    </section>
  );
}

export function HowGenjutsuWorks({ className }: { className?: string }) {
  return (
    <section id="how-it-works" className={cn('scroll-mt-24 py-16', className)}>
      <div className="container mx-auto px-4">
        <SectionHeading
          title="How Genjutsu Works"
          description="Three steps: keep the move, rewrite the subject."
        />
        <ol className="mx-auto mt-12 grid max-w-[1180px] gap-8 sm:grid-cols-3">
          {GENJUTSU_HOW_IT_WORKS.map((item) => (
            <li
              key={item.step}
              className="rounded-2xl border border-white/8 bg-white/[0.03] p-6"
            >
              <span
                className={cn(
                  'border-primary text-primary inline-flex size-8 items-center justify-center',
                  'rounded-sm border font-mono text-xs font-semibold'
                )}
              >
                {item.step}
              </span>
              <h3 className="text-foreground mt-4 text-lg font-semibold">
                {item.title}
              </h3>
              <p className="text-foreground/65 mt-3 text-sm leading-relaxed">
                {item.description}
              </p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

export function WhatYouCanChange({ className }: { className?: string }) {
  return (
    <section id="feature" className={cn('scroll-mt-24 py-16', className)}>
      <div className="container mx-auto px-4">
        <SectionHeading
          title="What You Can Change"
          description="Full restage or a local swap — product, wardrobe, location, or a single object."
        />
        <div className="mx-auto mt-12 grid max-w-[1180px] gap-10 sm:grid-cols-2 lg:grid-cols-4">
          {GENJUTSU_CHANGE_ITEMS.map((item, index) => {
            const Icon = CHANGE_ICONS[index] ?? Package;
            return (
              <div key={item.title} className="flex flex-col">
                <div className="border-primary mb-5 flex size-16 items-center justify-center rounded-full border">
                  <Icon className="text-primary size-8" aria-hidden="true" />
                </div>
                <h3 className="text-foreground mb-2 text-xl font-bold">
                  {item.title}
                </h3>
                <p className="text-foreground/80 leading-relaxed">
                  {item.description}
                </p>
              </div>
            );
          })}
        </div>
        <div className="mx-auto mt-12 grid max-w-[1180px] gap-4 sm:grid-cols-2">
          {GENJUTSU_CHANGE_EXAMPLES.map((example) => (
            <div
              key={example}
              className="rounded-2xl border border-white/8 bg-white/[0.03] p-5"
            >
              <p className="text-foreground/70 text-sm leading-relaxed">
                {example}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export function HowToUseGenerator({ className }: { className?: string }) {
  return (
    <section className={cn('py-16', className)}>
      <div className="container mx-auto px-4">
        <SectionHeading
          title="How to Use the Generator"
          description="Five steps from upload to download."
        />
        <ol className="mx-auto mt-12 max-w-3xl space-y-8">
          {GENJUTSU_HOWTO_STEPS.map((item) => (
            <li key={item.step} className="flex gap-4">
              <span
                className={cn(
                  'mt-0.5 flex size-6 shrink-0 items-center justify-center',
                  'border-primary text-primary rounded-sm border font-mono text-xs'
                )}
              >
                {item.step}
              </span>
              <div className="min-w-0 flex-1">
                <h3 className="text-foreground text-xl font-bold">
                  {item.title}
                </h3>
                <p className="text-foreground/70 mt-2 text-base leading-relaxed">
                  {item.description}
                </p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

export function PromptIdeas({
  className,
  showAllLink = true,
}: {
  className?: string;
  showAllLink?: boolean;
}) {
  return (
    <section className={cn('py-16', className)}>
      <div className="container mx-auto px-4">
        <SectionHeading
          title="Genjutsu Prompt Ideas"
          description="Start with a concrete rewrite, then say what motion must stay."
        />
        <div className="mx-auto mt-12 grid max-w-[1180px] gap-8 sm:grid-cols-2">
          {GENJUTSU_PROMPT_IDEAS.map((item) => (
            <article
              key={item.title}
              className="rounded-2xl border border-white/8 bg-white/[0.03] p-6"
            >
              <h3 className="text-foreground text-lg font-semibold">
                {item.title}
              </h3>
              <p className="text-foreground/65 mt-3 text-sm leading-relaxed">
                {item.prompt}
              </p>
            </article>
          ))}
        </div>
        {showAllLink ? (
          <p className="mt-8 text-center">
            <Link
              href="/genjutsu-prompts"
              className="text-primary text-sm font-medium underline-offset-4 hover:underline"
            >
              Browse all Genjutsu prompt ideas
            </Link>
          </p>
        ) : null}
      </div>
    </section>
  );
}

export function VsOfficial({ className }: { className?: string }) {
  return (
    <section className={cn('py-16', className)}>
      <div className="container mx-auto px-4">
        <SectionHeading
          title="Our Tool vs the Official Higgsfield Genjutsu"
          description="Same underlying model. Different way to pay. Use the official app if you want the full Higgsfield suite on a subscription; use this site if you prefer prepaid credits for Genjutsu jobs only."
        />
        <div className="border-border/70 mx-auto mt-12 max-w-[1180px] overflow-x-auto rounded-xl border">
          <table className="w-full min-w-[640px] table-fixed border-collapse text-left text-sm">
            <colgroup>
              <col className="w-[22%]" />
              <col className="w-[39%]" />
              <col className="w-[39%]" />
            </colgroup>
            <thead>
              <tr className="border-border/60 border-b bg-white/[0.03]">
                <th className="text-foreground/50 px-5 py-4 font-medium">
                  &nbsp;
                </th>
                <th className="text-foreground px-5 py-4 font-semibold">
                  This site
                </th>
                <th className="text-foreground px-5 py-4 font-semibold">
                  Official Higgsfield
                </th>
              </tr>
            </thead>
            <tbody>
              {GENJUTSU_VS_ROWS.map((row) => (
                <tr
                  key={row.label}
                  className="border-border/50 border-b last:border-b-0"
                >
                  <th className="text-foreground px-5 py-4 align-top font-medium">
                    {row.label}
                  </th>
                  <td className="text-foreground/70 px-5 py-4 align-top leading-relaxed">
                    {row.ours}
                  </td>
                  <td className="text-foreground/70 px-5 py-4 align-top leading-relaxed">
                    {row.official}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

export function BackToToolCta({ className }: { className?: string }) {
  return (
    <section className={cn('pb-24', className)}>
      <div className="container mx-auto px-4">
        <div className="mx-auto max-w-3xl rounded-3xl border border-dashed px-6 py-12 text-center sm:px-10 sm:py-16">
          <h2 className="text-foreground text-3xl font-bold tracking-tight sm:text-4xl">
            Ready to rewrite a clip?
          </h2>
          <p className="text-foreground/70 mx-auto mt-6 max-w-xl text-base leading-relaxed sm:text-lg">
            Upload a video, write the result you want, and generate. The tool is
            at the top of this page.
          </p>
          <div className="mt-8 flex justify-center">
            <a
              href="#hero-generator"
              className="inline-flex h-11 items-center justify-center rounded-xl bg-[rgb(204,144,92)] px-6 text-sm font-semibold text-[rgb(247,246,243)] transition hover:brightness-105"
            >
              Back to the generator
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
