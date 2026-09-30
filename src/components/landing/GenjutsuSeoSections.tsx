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

function SectionHeading({
  id,
  title,
  description,
}: {
  id?: string;
  title: string;
  description?: string;
}) {
  return (
    <div className="mx-auto max-w-3xl text-center">
      <h2
        id={id}
        className="text-foreground text-3xl font-bold tracking-tight sm:text-4xl"
      >
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
    <section className={cn('py-16', className)}>
      <SectionHeading title="What Is Genjutsu AI?" />
      <p className="text-foreground/75 mx-auto mt-8 max-w-3xl text-base leading-relaxed sm:text-lg">
        Genjutsu is a video-to-video model by Higgsfield. You upload an existing
        clip; the model rewrites the character, outfit, scene, or props in that
        footage while preserving the original motion, camera movement, and
        timing. It is not a from-scratch text-to-video generator — the source
        take is the skeleton, and Genjutsu changes who and what you see on that
        skeleton.
      </p>
    </section>
  );
}

export function HowGenjutsuWorks({ className }: { className?: string }) {
  return (
    <section className={cn('py-16', className)}>
      <SectionHeading
        title="How Genjutsu Works"
        description="Three steps: keep the move, rewrite the subject."
      />
      <ol className="mt-12 grid gap-6 sm:grid-cols-3">
        {GENJUTSU_HOW_IT_WORKS.map((item) => (
          <li
            key={item.step}
            className="rounded-2xl border border-white/8 bg-white/[0.03] p-6"
          >
            <span className="text-primary font-mono text-sm font-semibold">
              {item.step}
            </span>
            <h3 className="text-foreground mt-3 text-lg font-semibold">
              {item.title}
            </h3>
            <p className="text-foreground/65 mt-3 text-sm leading-relaxed">
              {item.description}
            </p>
          </li>
        ))}
      </ol>
    </section>
  );
}

export function WhatYouCanChange({ className }: { className?: string }) {
  return (
    <section className={cn('py-16', className)}>
      <SectionHeading
        title="What You Can Change"
        description="Full restage or a local swap — character, wardrobe, location, or a single object."
      />
      <div className="mt-12 grid gap-6 sm:grid-cols-2">
        {GENJUTSU_CHANGE_ITEMS.map((item) => (
          <article
            key={item.title}
            className="rounded-2xl border border-white/8 bg-white/[0.03] p-6"
          >
            <h3 className="text-foreground text-lg font-semibold">
              {item.title}
            </h3>
            <p className="text-foreground/65 mt-3 text-sm leading-relaxed">
              {item.description}
            </p>
          </article>
        ))}
      </div>
      <ul className="text-foreground/75 mx-auto mt-10 max-w-3xl list-disc space-y-2 pl-5 text-sm leading-relaxed sm:text-base">
        {GENJUTSU_CHANGE_EXAMPLES.map((example) => (
          <li key={example}>{example}</li>
        ))}
      </ul>
    </section>
  );
}

export function HowToUseGenerator({ className }: { className?: string }) {
  return (
    <section className={cn('py-16', className)}>
      <SectionHeading
        title="How to Use the Generator"
        description="Five steps from upload to download. Use the numbered frames as a stand-in for product screenshots until captures are added."
      />
      <ol className="mx-auto mt-12 max-w-3xl space-y-8">
        {GENJUTSU_HOWTO_STEPS.map((item) => (
          <li
            key={item.step}
            className="grid gap-4 sm:grid-cols-[220px_1fr] sm:items-start"
          >
            <div
              className={cn(
                'flex aspect-video items-center justify-center rounded-xl border border-white/10',
                'bg-white/[0.04] font-mono text-2xl font-semibold text-[rgb(249,166,57)]'
              )}
            >
              {item.step}
            </div>
            <div>
              <h3 className="text-foreground text-lg font-semibold">
                Step {item.step}: {item.title}
              </h3>
              <p className="text-foreground/65 mt-2 text-sm leading-relaxed">
                {item.description}
              </p>
            </div>
          </li>
        ))}
      </ol>
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
      <SectionHeading
        title="Genjutsu Prompt Ideas"
        description="Start with a concrete rewrite, then say what motion must stay."
      />
      <div className="mt-12 grid gap-4 sm:grid-cols-2">
        {GENJUTSU_PROMPT_IDEAS.map((item) => (
          <article
            key={item.title}
            className="rounded-2xl border border-white/8 bg-white/[0.03] p-5"
          >
            <h3 className="text-foreground text-base font-semibold">
              {item.title}
            </h3>
            <p className="text-foreground/70 mt-3 text-sm leading-relaxed">
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
    </section>
  );
}

export function VsOfficial({ className }: { className?: string }) {
  return (
    <section className={cn('py-16', className)}>
      <SectionHeading
        title="Our Tool vs the Official Higgsfield Genjutsu"
        description="Same underlying model. Different way to pay. Use the official app if you want the full Higgsfield suite on a subscription; use this site if you prefer prepaid credits for Genjutsu jobs only."
      />
      <div className="mt-12 overflow-x-auto">
        <table className="w-full min-w-[640px] border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-white/10">
              <th className="text-foreground/50 px-3 py-3 font-medium"> </th>
              <th className="text-foreground px-3 py-3 font-semibold">
                This site
              </th>
              <th className="text-foreground px-3 py-3 font-semibold">
                Official Higgsfield
              </th>
            </tr>
          </thead>
          <tbody>
            {GENJUTSU_VS_ROWS.map((row) => (
              <tr key={row.label} className="border-b border-white/8">
                <th className="text-foreground px-3 py-4 align-top font-medium">
                  {row.label}
                </th>
                <td className="text-foreground/70 px-3 py-4 align-top">
                  {row.ours}
                </td>
                <td className="text-foreground/70 px-3 py-4 align-top">
                  {row.official}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export function BackToToolCta({ className }: { className?: string }) {
  return (
    <section className={cn('px-4 pb-24', className)}>
      <div className="mx-auto max-w-3xl rounded-3xl border border-dashed px-6 py-12 text-center sm:px-10">
        <h2 className="text-foreground text-3xl font-bold tracking-tight sm:text-4xl">
          Ready to rewrite a clip?
        </h2>
        <p className="text-foreground/70 mx-auto mt-4 max-w-xl text-base leading-relaxed">
          Upload a video, write the result you want, and generate. The tool is
          at the top of this page.
        </p>
        <a
          href="#hero-generator"
          className="mt-8 inline-flex h-11 items-center justify-center rounded-xl bg-[rgb(204,144,92)] px-6 text-sm font-semibold text-[rgb(247,246,243)] transition hover:brightness-105"
        >
          Back to the generator
        </a>
      </div>
    </section>
  );
}
