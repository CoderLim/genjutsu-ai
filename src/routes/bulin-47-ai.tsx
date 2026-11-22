import { createFileRoute, redirect } from '@tanstack/react-router';
import {
  CheckCircle2,
  Film,
  ImageIcon,
  Music,
  Sparkles,
  WandSparkles,
} from 'lucide-react';

import { Link } from '@/core/i18n/navigation';
import { localeLinks, socialMeta } from '@/lib/seo';
import { m } from '@/paraglide/messages.js';
import { getLocale } from '@/paraglide/runtime.js';
import { HotelLobbyGeneratorPanel } from '@/components/landing/HotelLobbyGeneratorPanel';
import { SiteFooter } from '@/components/landing/SiteFooter';
import { SiteHeader } from '@/components/landing/SiteHeader';

const DATE_PUBLISHED = '2026-10-11';
const DATE_MODIFIED = '2026-10-11';

const GENERATOR_HREF = '#generator';

/** Visible FAQ + FAQPage JSON-LD must stay character-identical. */
const FAQ_ITEMS = [
  {
    question: 'What is the Bulin 47 AI video trend?',
    answer:
      'A Spanish-language street freestyle clip that got rebuilt by AI around other people — same style, look and energy, different face. It took off in early October 2026, with searches first appearing on October 6 and peaking October 9.',
  },
  {
    question: 'How do I make a Bulin 47 style AI video?',
    answer:
      'Upload one photo of yourself, write a scene prompt that names the look, the setting and the attitude, add audio you have the rights to, and export in 9:16. The full walkthrough is above.',
  },
  {
    question: 'Which tool makes these videos?',
    answer:
      'The trend is being made across several image-to-video generators — Dreamina, Higgsfield AI and Genematic AI all show up in the rising searches. The steps on this page work in any of them.',
  },
  {
    question: 'Can I use the original audio?',
    answer:
      'No. Use your own track or a licensed one. Pulling the audio out of the original clip is the fastest way to get your video taken down.',
  },
  {
    question: 'Is this trend still growing?',
    answer:
      "It appeared in early October and peaked on October 9. Trend phrases like this cool off fast — if you're reading this months later, check whether it still has search interest before you build a page around it.",
  },
] as const;

const HOW_STEPS = [
  {
    name: 'Pick a photo of yourself',
    text: "Front-facing, one person, even light, eyes open, at least 512 px on the short side. One person per generation — group photos don't work. The better the source photo, the closer the result holds up.",
  },
  {
    name: 'Write the scene prompt',
    text: 'Three things carry the whole look, and tutorials for this trend say the same thing: the look, the environment, the attitude. Name the outfit, name the place, name the energy. Vague prompts produce generic clips.',
  },
  {
    name: 'Add audio you have the rights to',
    text: "Use your own track or a licensed one. Don't download the audio from the original clip — the recording belongs to whoever made it, and swapping it into your video is the fastest way to get a takedown.",
  },
  {
    name: 'Export vertical and post',
    text: '9:16, 8–15 seconds, 1080p. Short single-beat clips travel furthest.',
  },
] as const;

const PHOTO_TIPS = [
  'One face, front-facing, eyes open',
  'Even light, no hard side shadows',
  'Mouth and chin uncovered',
  '512 px minimum on the short side',
  'No group shots — one person per generation',
] as const;

const COMPARE_ROWS = [
  [
    'What you bring',
    'One photo + a written scene',
    'Footage you shot yourself',
  ],
  ['Time to first version', 'About a minute', '30 minutes-plus'],
  ['Skills needed', 'None', 'Cut, keyframe, colour'],
  ['Audio', 'Your own or licensed track', 'Same'],
  ['Result', 'Same person, new scene', 'Full control, full effort'],
] as const;

function faqJsonLd() {
  return {
    '@type': 'FAQPage',
    mainEntity: FAQ_ITEMS.map((item) => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: item.answer,
      },
    })),
  };
}

function howToJsonLd() {
  return {
    '@type': 'HowTo',
    name: 'How to make a Bulin 47 style AI video',
    step: HOW_STEPS.map((step) => ({
      '@type': 'HowToStep',
      name: step.name,
      text: step.text,
    })),
  };
}

function articleJsonLd() {
  return {
    '@type': 'Article',
    headline: 'Bulin 47 AI Video: What It Is and How to Make Your Own',
    datePublished: DATE_PUBLISHED,
    dateModified: DATE_MODIFIED,
    about: 'Bulin 47 freestyle AI video trend',
  };
}

function graphJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@graph': [articleJsonLd(), howToJsonLd(), faqJsonLd()],
  };
}

function JsonLd({ value }: { value: Record<string, unknown> }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(value) }}
    />
  );
}

function Bulin47AiPage() {
  return (
    <div className="bg-background text-foreground flex min-h-screen flex-col">
      <JsonLd value={graphJsonLd()} />

      <SiteHeader />

      <div className="relative">
        <section className="mx-auto w-full max-w-7xl px-4 pt-8 pb-8 text-center md:px-5 md:pb-10">
          <div className="border-primary/20 bg-primary/10 text-primary mx-auto mb-4 flex w-fit items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium">
            <WandSparkles className="size-3.5" />
            {m['site.bulin.hero_badge']()}
          </div>

          <h1 className="text-foreground mx-auto max-w-4xl text-[34px] leading-[1.08] font-bold tracking-[-1.4px] sm:text-[44px] md:text-[56px]">
            {m['site.bulin.hero_title']()}
          </h1>
          <p className="text-muted-foreground mx-auto mt-5 max-w-3xl text-base leading-7 sm:text-lg">
            {m['site.bulin.hero_desc']()}
          </p>

          <div id="generator" className="mt-8 scroll-mt-24 text-left sm:mt-10">
            <HotelLobbyGeneratorPanel presetId="bulin-47" />
          </div>
        </section>
      </div>

      <main className="mx-auto w-full max-w-7xl flex-1 px-4 md:px-5">
        <section id="what-is-bulin-47" className="scroll-mt-24 py-14 md:py-20">
          <div className="mx-auto max-w-5xl">
            <h2 className="text-foreground text-3xl font-semibold tracking-tight sm:text-4xl">
              What the Bulin 47 AI video trend is
            </h2>
            <div className="text-muted-foreground mt-5 space-y-4 text-sm leading-7 sm:text-base">
              <p>
                The original clip is a freestyle shot on the street. What spread
                is not the video itself but the effect: the clip&apos;s look,
                camera angle and energy, rebuilt around a different person.
                That&apos;s why searches split into two camps — people looking
                for the different versions, and people looking for the tool that
                makes them. Rising searches around this trend include higgsfield
                ai, bulin 47 freestyle, bulin 47 viral video, capcut, dreamina
                ai, genematic ai and ai video generator.
              </p>
            </div>
            <figure className="mt-8 overflow-hidden rounded-2xl border border-white/10">
              <img
                src="/imgs/blog/how-to-make-bulin-47-ai-video-cover.jpg"
                alt="Bulin 47 AI video trend: street freestyle look restaged as an AI-generated clip"
                className="h-auto w-full object-cover"
                loading="lazy"
                decoding="async"
              />
            </figure>
          </div>
        </section>

        <section id="how-to" className="scroll-mt-24 py-14 md:py-20">
          <div className="mx-auto max-w-3xl text-center">
            <p className="text-primary text-xs font-semibold tracking-[0.18em] uppercase">
              Four steps
            </p>
            <h2 className="text-foreground mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
              How to make a Bulin 47 style AI video
            </h2>
          </div>

          <div className="mt-9 grid gap-4 md:grid-cols-2">
            {HOW_STEPS.map((step, index) => {
              const icons = [ImageIcon, Sparkles, Music, Film] as const;
              const Icon = icons[index] ?? Sparkles;
              return (
                <div
                  key={step.name}
                  className="border-border/70 bg-card/95 rounded-2xl border p-5"
                >
                  <span className="bg-primary/10 text-primary flex size-10 items-center justify-center rounded-xl">
                    <Icon className="size-5" />
                  </span>
                  <h3 className="text-foreground mt-5 text-lg font-semibold">
                    {index + 1}. {step.name}
                  </h3>
                  <p className="text-muted-foreground mt-2 text-sm leading-6">
                    {step.text}
                  </p>
                </div>
              );
            })}
          </div>

          <div className="mt-8 text-center">
            <Link
              href={GENERATOR_HREF}
              className="text-primary text-sm font-medium underline-offset-2 hover:underline"
            >
              {m['site.bulin.try_generator']()}
            </Link>
          </div>
        </section>

        <section className="py-14 md:py-20">
          <div className="mx-auto max-w-5xl">
            <h2 className="text-foreground text-3xl font-semibold tracking-tight sm:text-4xl">
              Tools people are using for this trend
            </h2>
            <div className="text-muted-foreground mt-5 space-y-4 text-sm leading-7 sm:text-base">
              <p>
                <strong className="text-foreground/80">
                  Dreamina / CapCut
                </strong>{' '}
                — image-to-video templates, and the tools that make this trend a
                one-photo job. Each takes a single upload and returns a short
                vertical clip in about a minute.
              </p>
              <p>
                <strong className="text-foreground/80">Higgsfield AI</strong> —
                motion and camera presets; it&apos;s one of the breakout search
                terms riding this trend, so it belongs in this block rather than
                in the hero.
              </p>
              <p>
                <strong className="text-foreground/80">Genematic AI</strong> —
                named directly in the Instagram posts driving the trend: pick
                the scenario, upload your photo, the clip is built for you.
              </p>
              <p>
                Whatever image-to-video generator you already pay for — the four
                steps above work the same way anywhere. On this site, start from
                the{' '}
                <Link
                  href={GENERATOR_HREF}
                  className="text-primary underline-offset-2 hover:underline"
                >
                  Bulin 47 generator
                </Link>{' '}
                above.
              </p>
            </div>
          </div>
        </section>

        <section className="py-14 md:py-20">
          <div className="mx-auto max-w-5xl">
            <h2 className="text-foreground text-3xl font-semibold tracking-tight sm:text-4xl">
              Doing it in a generator vs. editing it by hand
            </h2>
            <div className="border-border/70 mt-7 overflow-x-auto rounded-2xl border">
              <table className="w-full min-w-[640px] border-collapse text-left text-sm">
                <thead className="bg-card text-foreground/80">
                  <tr>
                    <th className="px-4 py-3 font-semibold"> </th>
                    <th className="px-4 py-3 font-semibold">
                      Image-to-video generator
                    </th>
                    <th className="px-4 py-3 font-semibold">
                      Editing a trend clip by hand
                    </th>
                  </tr>
                </thead>
                <tbody className="text-muted-foreground divide-border/60 divide-y">
                  {COMPARE_ROWS.map((row) => (
                    <tr key={row[0]}>
                      <td className="text-foreground/80 px-4 py-3 font-medium">
                        {row[0]}
                      </td>
                      <td className="px-4 py-3">{row[1]}</td>
                      <td className="px-4 py-3">{row[2]}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-muted-foreground mt-4 text-sm leading-7">
              The reason this trend moved so fast is the left-hand column. The
              reason some versions get taken down is what people put in the
              right-hand one.
            </p>
          </div>
        </section>

        <section
          id="como-hacer-bulin-47"
          className="scroll-mt-24 py-14 md:py-20"
          lang="es"
        >
          <div className="mx-auto max-w-5xl">
            <h2 className="text-foreground text-3xl font-semibold tracking-tight sm:text-4xl">
              ¿Cómo hacer el video de Bulin 47 con IA?
            </h2>
            <p className="text-muted-foreground mt-5 text-sm leading-7 sm:text-base">
              Sube una foto tuya — de frente, una sola persona, con buena luz —
              escribe la escena nombrando el look, el ambiente y la actitud, y
              elige un audio del que tengas derechos. Genera el clip en 9:16,
              entre 8 y 15 segundos, y publícalo. Los cuatro pasos completos
              están arriba, en inglés.
            </p>
          </div>
        </section>

        <section id="before-you-upload" className="scroll-mt-24 py-14 md:py-20">
          <div className="mx-auto max-w-5xl">
            <h2 className="text-foreground text-3xl font-semibold tracking-tight sm:text-4xl">
              Before you upload
            </h2>

            <h3 className="text-foreground mt-8 text-xl font-semibold tracking-tight">
              What makes a good source photo
            </h3>
            <ul className="text-muted-foreground mt-4 list-disc space-y-2 pl-5 text-sm leading-7 sm:text-base">
              {PHOTO_TIPS.map((tip) => (
                <li key={tip}>{tip}</li>
              ))}
            </ul>

            <h3 className="text-foreground mt-10 text-xl font-semibold tracking-tight">
              What you can and can&apos;t upload
            </h3>
            <div className="text-muted-foreground mt-4 space-y-4 text-sm leading-7 sm:text-base">
              <p>
                Only photos of yourself, or of people who gave you written
                permission. Everyone in the photo must be 18 or older.
              </p>
              <p>
                No celebrities, public figures, or anyone else&apos;s likeness —
                that includes Bulin 47, Kevin Wai and everyone else who appears
                in versions of this trend. Uploads of real people you don&apos;t
                hold rights to are rejected.
              </p>
              <p>
                No audio ripped from the original clip. Use your own track or a
                licensed one. The recording belongs to whoever made it.
              </p>
              <p>No nudity, no sexual content, no violence, no hate content.</p>
              <p>Every clip is watermarked as AI-generated.</p>
              <p>
                Uploads that break these rules are rejected and refunded. Full
                rules are in our{' '}
                <Link
                  href="/terms-of-service"
                  className="text-primary underline-offset-2 hover:underline"
                >
                  Acceptable Use Policy
                </Link>
                .
              </p>
            </div>
          </div>
        </section>

        <section id="faq" className="scroll-mt-24 py-14 md:py-20">
          <h2 className="text-foreground text-3xl font-semibold tracking-tight sm:text-4xl">
            Bulin 47 AI video FAQ
          </h2>
          <div className="border-border/70 bg-card/60 divide-border/60 mt-7 divide-y rounded-2xl border px-5 sm:px-7">
            {FAQ_ITEMS.map((item) => (
              <details key={item.question} className="group py-5">
                <summary className="text-foreground/85 cursor-pointer list-none pr-6 text-sm font-semibold sm:text-base">
                  {item.question}
                </summary>
                <p className="text-muted-foreground mt-3 max-w-3xl text-sm leading-7">
                  {item.answer}
                </p>
              </details>
            ))}
          </div>
        </section>

        <section className="pb-20">
          <div className="border-border/70 bg-card/60 rounded-[26px] border p-6 text-center sm:p-10">
            <ul className="text-muted-foreground mx-auto mb-5 flex max-w-xl flex-col gap-2 text-left text-sm">
              {[
                m['site.bulin.cta_tip1'](),
                m['site.bulin.cta_tip2'](),
                m['site.bulin.cta_tip3'](),
              ].map((tip) => (
                <li key={tip} className="flex gap-2">
                  <CheckCircle2 className="text-primary mt-0.5 size-4 shrink-0" />
                  <span>{tip}</span>
                </li>
              ))}
            </ul>
            <h2 className="text-foreground text-2xl font-semibold tracking-tight sm:text-3xl">
              {m['site.bulin.cta_title']()}
            </h2>
            <p className="text-muted-foreground mx-auto mt-3 max-w-2xl text-sm leading-7">
              {m['site.bulin.cta_desc']()}
            </p>
            <a
              href={GENERATOR_HREF}
              className="mt-6 inline-flex h-11 items-center justify-center rounded-xl bg-[rgb(204,144,92)] px-6 text-sm font-semibold text-[rgb(247,246,243)] transition hover:brightness-105"
            >
              {m['site.bulin.hero_cta']()}
            </a>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}

export const Route = createFileRoute('/bulin-47-ai')({
  // English-only editorial content must not render inside a non-English shell.
  // A canonical tag alone does not fix mixed-language content or <html lang>.
  beforeLoad: () => {
    if (getLocale() !== 'en') {
      throw redirect({
        href: '/bulin-47-ai',
        statusCode: 307,
        reloadDocument: true,
      });
    }
  },
  loader: () => {
    const locale = getLocale();
    return { locale };
  },
  head: ({ loaderData }) => {
    const locale = loaderData?.locale ?? 'en';
    const { canonical, alternates } = localeLinks('/bulin-47-ai', locale, [
      'en',
    ]);
    return {
      meta: [
        { title: m['site.bulin.page_title']() },
        { name: 'description', content: m['site.bulin.page_description']() },
        ...socialMeta({
          title: m['site.bulin.page_title'](),
          description: m['site.bulin.page_description'](),
          url: canonical,
        }),
      ],
      links: [{ rel: 'canonical', href: canonical }, ...alternates],
    };
  },
  component: Bulin47AiPage,
});
