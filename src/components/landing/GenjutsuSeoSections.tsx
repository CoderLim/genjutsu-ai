import {
  Clapperboard,
  MapPin,
  Package,
  Palette,
  type LucideIcon,
} from 'lucide-react';

import { Link } from '@/core/i18n/navigation';
import { cn } from '@/lib/cn';
import { m } from '@/paraglide/messages.js';
import {
  GENJUTSU_CHANGE_EXAMPLES,
  GENJUTSU_CHANGE_ITEMS,
  GENJUTSU_HOW_IT_WORKS,
  GENJUTSU_HOWTO_STEPS,
  GENJUTSU_PROMPT_IDEAS,
  GENJUTSU_VS_ROWS,
} from '@/components/landing/content';

const CHANGE_ICONS: LucideIcon[] = [Package, Palette, MapPin, Clapperboard];
const HOW_COPY = [
  { title: m['site.seo.step1_title'], description: m['site.seo.step1_desc'] },
  { title: m['site.seo.step2_title'], description: m['site.seo.step2_desc'] },
  { title: m['site.seo.step3_title'], description: m['site.seo.step3_desc'] },
];
const EXAMPLE_COPY = [
  m['site.seo.example1'],
  m['site.seo.example2'],
  m['site.seo.example3'],
  m['site.seo.example4'],
  m['site.seo.example5'],
  m['site.seo.example6'],
];
const HOWTO_COPY = [
  { title: m['site.seo.howto1_title'], description: m['site.seo.howto1_desc'] },
  { title: m['site.seo.howto2_title'], description: m['site.seo.howto2_desc'] },
  { title: m['site.seo.howto3_title'], description: m['site.seo.howto3_desc'] },
  { title: m['site.seo.howto4_title'], description: m['site.seo.howto4_desc'] },
  { title: m['site.seo.howto5_title'], description: m['site.seo.howto5_desc'] },
];
const VS_COPY = [
  { label: m['site.seo.vs1_label'], ours: m['site.seo.vs1_ours'], official: m['site.seo.vs1_official'] },
  { label: m['site.seo.vs2_label'], ours: m['site.seo.vs2_ours'], official: m['site.seo.vs2_official'] },
  { label: m['site.seo.vs3_label'], ours: m['site.seo.vs3_ours'], official: m['site.seo.vs3_official'] },
  { label: m['site.seo.vs4_label'], ours: m['site.seo.vs4_ours'], official: m['site.seo.vs4_official'] },
];
const CHANGE_COPY = [
  { title: m['site.seo.change_products'], description: m['site.seo.change_products_desc'] },
  { title: m['site.seo.change_styles'], description: m['site.seo.change_styles_desc'] },
  { title: m['site.seo.change_scenes'], description: m['site.seo.change_scenes_desc'] },
  { title: m['site.seo.change_props'], description: m['site.seo.change_props_desc'] },
];

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
        <SectionHeading title={m['site.seo.what_title']()} />
        <p className="text-foreground/70 mx-auto mt-8 max-w-3xl text-center text-base leading-relaxed sm:text-lg">
          {m['site.seo.what_description']()}
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
          title={m['site.seo.how_title']()}
          description={m['site.seo.how_desc']()}
        />
        <ol className="mx-auto mt-12 grid max-w-[1180px] gap-8 sm:grid-cols-3">
          {GENJUTSU_HOW_IT_WORKS.map((item, index) => (
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
                {HOW_COPY[index]?.title() ?? item.title}
              </h3>
              <p className="text-foreground/65 mt-3 text-sm leading-relaxed">
                {HOW_COPY[index]?.description() ?? item.description}
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
          title={m['site.seo.change_title']()}
          description={m['site.seo.change_desc']()}
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
                  {CHANGE_COPY[index]?.title() ?? item.title}
                </h3>
                <p className="text-foreground/80 leading-relaxed">
                  {CHANGE_COPY[index]?.description() ?? item.description}
                </p>
              </div>
            );
          })}
        </div>
        <div className="mx-auto mt-12 grid max-w-[1180px] gap-4 sm:grid-cols-2">
          {GENJUTSU_CHANGE_EXAMPLES.map((example, index) => (
            <div
              key={example}
              className="rounded-2xl border border-white/8 bg-white/[0.03] p-5"
            >
              <p className="text-foreground/70 text-sm leading-relaxed">
                {EXAMPLE_COPY[index]?.() ?? example}
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
          title={m['site.seo.howto_title']()}
          description={m['site.seo.howto_desc']()}
        />
        <ol className="mx-auto mt-12 max-w-3xl space-y-8">
          {GENJUTSU_HOWTO_STEPS.map((item, index) => (
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
                  {HOWTO_COPY[index]?.title() ?? item.title}
                </h3>
                <p className="text-foreground/70 mt-2 text-base leading-relaxed">
                  {HOWTO_COPY[index]?.description() ?? item.description}
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
          title={m['site.seo.ideas_title']()}
          description={m['site.seo.ideas_desc']()}
        />
        <div className="mx-auto mt-12 grid max-w-[1180px] gap-8 sm:grid-cols-2">
          {GENJUTSU_PROMPT_IDEAS.slice(0, 8).map((item) => (
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
              {m['site.seo.browse_prompts']()}
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
          title={m['site.seo.vs_title']()}
          description={m['site.seo.vs_description']()}
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
                  {m['site.seo.this_site']()}
                </th>
                <th className="text-foreground px-5 py-4 font-semibold">
                  {m['site.seo.official']()}
                </th>
              </tr>
            </thead>
            <tbody>
              {GENJUTSU_VS_ROWS.map((row, index) => (
                <tr
                  key={row.label}
                  className="border-border/50 border-b last:border-b-0"
                >
                  <th className="text-foreground px-5 py-4 align-top font-medium">
                    {VS_COPY[index]?.label() ?? row.label}
                  </th>
                  <td className="text-foreground/70 px-5 py-4 align-top leading-relaxed">
                    {VS_COPY[index]?.ours() ?? row.ours}
                  </td>
                  <td className="text-foreground/70 px-5 py-4 align-top leading-relaxed">
                    {VS_COPY[index]?.official() ?? row.official}
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
            {m['site.seo.cta_title']()}
          </h2>
          <p className="text-foreground/70 mx-auto mt-6 max-w-xl text-base leading-relaxed sm:text-lg">
            {m['site.seo.cta_description']()}
          </p>
          <div className="mt-8 flex justify-center">
            <a
              href="#hero-generator"
              className="inline-flex h-11 items-center justify-center rounded-xl bg-[rgb(204,144,92)] px-6 text-sm font-semibold text-[rgb(247,246,243)] transition hover:brightness-105"
            >
              {m['site.seo.cta_button']()}
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
