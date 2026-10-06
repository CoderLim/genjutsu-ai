import { createFileRoute } from '@tanstack/react-router';
import {
  CheckCircle2,
  Film,
  Images,
  ShieldCheck,
  Sparkles,
  WandSparkles,
} from 'lucide-react';

import { Link } from '@/core/i18n/navigation';
import { envConfigs } from '@/config';
import { absoluteUrl, localeLinks, socialMeta } from '@/lib/seo';
import { getLocale } from '@/paraglide/runtime.js';
import { HotelLobbyGeneratorPanel } from '@/components/landing/HotelLobbyGeneratorPanel';
import { SiteHeader } from '@/components/landing/SiteHeader';

const PAGE_TITLE =
  'Hotel Lobby AI Video Generator: 2 Photos, One Orange Booth';
const PAGE_DESCRIPTION =
  'Turn two photos into the viral Hotel Lobby AI video: your faces in the orange booth, trading bars at one hanging mic. Vertical 9:16 and ready to post.';

const FAQ_ITEMS = [
  {
    question: 'What is the Hotel Lobby AI trend?',
    answer:
      'The Hotel Lobby AI trend remixes Quavo and Takeoff’s 2022 A COLORS SHOW performance of “HOTEL LOBBY (Unc & Phew)”: two performers against a bright orange background, sharing one hanging microphone. In September 2026, AI versions spread across TikTok, Reels, and X with friends, couples, pets, celebrities, and fictional characters replacing the original duo.',
  },
  {
    question: 'How do you do the Hotel Lobby AI video?',
    answer:
      'Use the preset performance already loaded on this page, upload one photo with both subjects or one photo per performer, choose a resolution, and press generate. The output is vertical 9:16 and its length follows the reference performance.',
  },
  {
    question: 'Is Hotel Lobby AI free?',
    answer:
      'You can choose photos and preview the preset locally before anything uploads. Generation uses your Genjutsu AI credit balance; the required credits are shown before you run the clip.',
  },
  {
    question: 'Do I need one photo or two?',
    answer:
      'Either works. Use one clear photo containing both subjects, or upload separate left and right performer photos. A second photo is optional.',
  },
  {
    question: 'Do I need Higgsfield for the Hotel Lobby trend?',
    answer:
      'No. This page uses MiniMax H3 with a preset reference performance. Higgsfield Genjutsu is another option when you want a more general motion-transfer workflow with your own source clip.',
  },
  {
    question: 'Can I do Hotel Lobby AI with my pets?',
    answer:
      'Yes. Pets became one of the recognizable early variations of the trend. Use clear photos with the face visible and enough of the body in frame for the model to carry shape and posture into the performance.',
  },
  {
    question: 'Is there a Hotel Lobby AI filter?',
    answer:
      'Not in the usual one-tap camera-filter sense. These clips are AI-generated or AI-edited videos built from reference images and a recognizable performance template.',
  },
  {
    question: 'How do I add the Hotel Lobby sound?',
    answer:
      'For posting, use the licensed “Hotel Lobby” sound from TikTok or Instagram’s music library. This generator does not package or redistribute the copyrighted song for you.',
  },
  {
    question: 'Can I make it longer or in HD?',
    answer:
      'Yes. The output length follows the reference video, which must be 5–15 seconds. You can choose 480P, 768P, 2K, or 4K output; 2K and 4K are upscaled modes in the MiniMax H3 endpoint.',
  },
  {
    question: 'Can I replace the preset Hotel Lobby template?',
    answer:
      'Yes. The preset reference performance is loaded by default, but you can remove it and upload your own 5–15 second MP4 or MOV. The generator will use that clip’s duration automatically.',
  },
] as const;

const CAST_IDEAS = [
  ['You and your best friend', 'The default, and still the easiest joke to land.'],
  ['A couple', 'One photo of the two of you can be enough.'],
  ['Two coworkers', 'A Friday team-chat version practically writes itself.'],
  ['Your parents', 'Formal outfits in the orange booth work surprisingly well.'],
  ['Your pets', 'Use one clear photo per pet, ideally facing the camera.'],
  ['Characters or mascots', 'Illustrated and fictional subjects can work when the face is clear.'],
] as const;

const PHOTO_TIPS = [
  'One subject per photo when possible. If you use a group shot, crop to the person you mean.',
  'Show the outfit. Waist-up or full-body photos carry clothing better than a tight face crop.',
  'Face forward in good light. Heavy shadow, blur, and extreme profile angles reduce likeness.',
  'Use the first slot for the left performer and the second slot for the right performer.',
  'Try a second run if identity or hand gestures drift. Video generation is stochastic.',
] as const;

function faqJsonLd() {
  return {
    '@context': 'https://schema.org',
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
    '@context': 'https://schema.org',
    '@type': 'HowTo',
    name: 'How to make a Hotel Lobby AI video',
    totalTime: 'PT2M',
    step: [
      {
        '@type': 'HowToStep',
        name: 'Upload one or two photos',
        text: 'Use one clear photo containing both subjects, or one front-facing photo per performer.',
      },
      {
        '@type': 'HowToStep',
        name: 'Press generate',
        text: 'The Hotel Lobby reference performance is already loaded. Choose a resolution and generate; the output duration follows the reference video.',
      },
      {
        '@type': 'HowToStep',
        name: 'Add the sound and post',
        text: 'Download the MP4, upload it to TikTok or Reels, and choose the licensed Hotel Lobby sound from the platform music library.',
      },
    ],
  };
}

function videoJsonLd() {
  const rawContentUrl = envConfigs.hotel_lobby_example_video_url?.trim();
  const rawThumbnailUrl = envConfigs.hotel_lobby_example_thumbnail_url?.trim();
  const contentUrl = rawContentUrl ? absoluteUrl(rawContentUrl) : '';
  const thumbnailUrl = rawThumbnailUrl ? absoluteUrl(rawThumbnailUrl) : '';
  const uploadDate = envConfigs.hotel_lobby_example_upload_date?.trim();
  const duration = envConfigs.hotel_lobby_example_duration?.trim();

  if (!contentUrl || !thumbnailUrl || !uploadDate || !duration) return null;

  return {
    '@context': 'https://schema.org',
    '@type': 'VideoObject',
    name: 'Hotel Lobby AI example result',
    description:
      'An example Hotel Lobby AI result generated from reference photos with the preset orange-booth performance.',
    contentUrl,
    thumbnailUrl,
    uploadDate,
    duration,
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

function HotelLobbyAiPage() {
  const rawExampleVideoUrl = envConfigs.hotel_lobby_example_video_url?.trim();
  const rawExampleThumbnailUrl =
    envConfigs.hotel_lobby_example_thumbnail_url?.trim();
  const exampleVideoUrl = rawExampleVideoUrl
    ? absoluteUrl(rawExampleVideoUrl)
    : '';
  const exampleThumbnailUrl = rawExampleThumbnailUrl
    ? absoluteUrl(rawExampleThumbnailUrl)
    : '';
  const videoSchema = videoJsonLd();

  return (
    <div className="min-h-screen bg-[hsl(28_25%_9%)] text-[rgb(237,234,222)]">
      <JsonLd value={faqJsonLd()} />
      <JsonLd value={howToJsonLd()} />
      {videoSchema ? <JsonLd value={videoSchema} /> : null}

      <div className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0" aria-hidden>
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_18%,rgba(154,91,55,0.22),transparent_38%),linear-gradient(to_bottom,rgba(13,10,9,0.5),hsl(28_25%_9%)_78%)]" />
          <div className="absolute top-24 left-1/2 h-[420px] w-[900px] -translate-x-1/2 rounded-full bg-[rgba(204,144,92,0.055)] blur-3xl" />
        </div>

        <div className="relative z-20">
          <SiteHeader />
        </div>

        <main className="relative z-10">
          <section className="mx-auto max-w-7xl px-4 pt-14 pb-12 text-center sm:pt-20 md:px-5 md:pb-16">
            <div className="mx-auto mb-4 flex w-fit items-center gap-2 rounded-full border border-[rgba(204,144,92,0.2)] bg-[rgba(204,144,92,0.07)] px-3 py-1.5 text-xs font-medium text-[rgb(220,155,99)]">
              <WandSparkles className="size-3.5" />
              Hotel Lobby preset · MiniMax H3
            </div>

            <h1 className="mx-auto max-w-4xl text-[34px] leading-[1.08] font-bold tracking-[-1.4px] sm:text-[44px] md:text-[56px]">
              Hotel Lobby AI Video Generator
            </h1>
            <p className="mx-auto mt-5 max-w-3xl text-base leading-7 text-white/58 sm:text-lg">
              One or two photos in, one orange-booth clip out. Put your duo at
              the hanging mic in a vertical 9:16 video, ready for TikTok,
              Reels, or Shorts.
            </p>

            <div id="generator" className="mt-8 text-left sm:mt-10">
              <HotelLobbyGeneratorPanel />
            </div>
          </section>

          <section className="mx-auto max-w-6xl px-4 py-14 md:px-5 md:py-20">
            <div
              className={
                exampleVideoUrl
                  ? 'grid gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-center'
                  : 'mx-auto max-w-3xl'
              }
            >
              <div>
                <p className="text-xs font-semibold tracking-[0.18em] text-[rgb(204,144,92)] uppercase">
                  The result
                </p>
                <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
                  What the Hotel Lobby AI video gives you
                </h2>
                <p className="mt-4 text-sm leading-7 text-white/48 sm:text-base">
                  The preset keeps the recognizable orange performance setup:
                  two performers, one hanging microphone, and the reference
                  choreography. Your uploaded photos control the identities,
                  hair, outfits, and overall appearance.
                </p>
                <p className="mt-4 text-sm leading-7 text-white/48 sm:text-base">
                  Output is vertical 9:16. Its length follows the reference
                  video automatically, from 5 to 15 seconds. For the original
                  song when you post, choose the licensed <em>Hotel Lobby</em>{' '}
                  sound inside TikTok or Instagram rather than bundling the
                  track into the generated file.
                </p>
              </div>

              {exampleVideoUrl ? (
                <div className="overflow-hidden rounded-[24px] border border-white/10 bg-black/25 p-3">
                  <video
                    src={exampleVideoUrl}
                    poster={exampleThumbnailUrl || undefined}
                    controls
                    playsInline
                    preload="metadata"
                    className="mx-auto aspect-[9/16] max-h-[620px] w-auto max-w-full rounded-2xl bg-black object-contain"
                  />
                  <p className="px-1 pt-3 text-center text-xs text-white/34">
                    Real Hotel Lobby AI output
                  </p>
                </div>
              ) : null}
            </div>
          </section>

          <section className="border-y border-white/7 bg-white/[0.018]">
            <div className="mx-auto max-w-5xl px-4 py-14 md:px-5 md:py-20">
              <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
                What is the Hotel Lobby AI trend?
              </h2>
              <div className="mt-5 space-y-4 text-sm leading-7 text-white/48 sm:text-base">
                <p>
                  The orange set, one microphone hanging from the ceiling, and
                  two people trading verses comes from Quavo and Takeoff’s 2022
                  A COLORS SHOW performance of <em>HOTEL LOBBY (Unc &amp; Phew)</em>.
                </p>
                <p>
                  In September 2026, AI remixes of that performance spread
                  across TikTok and X. Creators started replacing the duo with
                  friends, couples, pets, athletes, celebrities, and fictional
                  characters while keeping the recognizable stage and
                  performance structure.
                </p>
                <p>
                  It is not a traditional camera filter. The versions people
                  share are generated or edited with AI from reference images
                  and a motion or scene template. This page packages that
                  generation step into one preset.
                </p>
              </div>
            </div>
          </section>

          <section className="mx-auto max-w-6xl px-4 py-14 md:px-5 md:py-20">
            <div className="mx-auto max-w-3xl text-center">
              <p className="text-xs font-semibold tracking-[0.18em] text-[rgb(204,144,92)] uppercase">
                Three steps
              </p>
              <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
                How to make the Hotel Lobby AI video
              </h2>
            </div>

            <div className="mt-9 grid gap-4 md:grid-cols-3">
              {[
                {
                  icon: Images,
                  title: '1. Upload one or two photos',
                  text: 'Use one photo with both of you, or one clear photo per performer. Waist-up or full-body shots carry outfits better.',
                },
                {
                  icon: Sparkles,
                  title: '2. Press generate',
                  text: 'The Hotel Lobby performance is already loaded. Pick a resolution; the duration is taken from the reference video automatically.',
                },
                {
                  icon: Film,
                  title: '3. Add the sound and post',
                  text: 'Download the MP4, upload it to TikTok or Reels, then choose the licensed Hotel Lobby sound from the platform music library.',
                },
              ].map((step) => {
                const Icon = step.icon;
                return (
                  <div
                    key={step.title}
                    className="rounded-2xl border border-white/8 bg-white/[0.025] p-5"
                  >
                    <span className="flex size-10 items-center justify-center rounded-xl bg-[rgba(204,144,92,0.1)] text-[rgb(220,155,99)]">
                      <Icon className="size-5" />
                    </span>
                    <h3 className="mt-5 text-lg font-semibold">{step.title}</h3>
                    <p className="mt-2 text-sm leading-6 text-white/42">
                      {step.text}
                    </p>
                  </div>
                );
              })}
            </div>
          </section>

          <section className="mx-auto max-w-6xl px-4 pb-14 md:px-5 md:pb-20">
            <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
              Who people cast in the Hotel Lobby AI video
            </h2>
            <div className="mt-7 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {CAST_IDEAS.map(([title, text]) => (
                <div
                  key={title}
                  className="rounded-2xl border border-white/8 bg-white/[0.025] p-5"
                >
                  <h3 className="font-semibold text-white/86">{title}</h3>
                  <p className="mt-2 text-sm leading-6 text-white/42">{text}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="border-y border-white/7 bg-white/[0.018]">
            <div className="mx-auto max-w-6xl px-4 py-14 md:px-5 md:py-20">
              <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
                Hotel Lobby AI vs Higgsfield Genjutsu
              </h2>
              <p className="mt-4 max-w-3xl text-sm leading-7 text-white/48 sm:text-base">
                Both workflows can use a source performance to preserve motion.
                The difference is product scope: this page preloads the Hotel
                Lobby template and fixes the prompt, while Genjutsu is the
                general-purpose motion-transfer and object-swap workflow.
              </p>

              <div className="mt-7 overflow-x-auto rounded-2xl border border-white/8">
                <table className="w-full min-w-[680px] border-collapse text-left text-sm">
                  <thead className="bg-white/[0.035] text-white/72">
                    <tr>
                      <th className="px-4 py-3 font-semibold"> </th>
                      <th className="px-4 py-3 font-semibold">This page</th>
                      <th className="px-4 py-3 font-semibold">
                        Higgsfield Genjutsu
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/7 text-white/46">
                    {[
                      ['What you upload', '1–2 photos; preset video included', '4–30s source clip + references'],
                      ['Copies source motion', 'Yes, from the preset or your replacement clip', 'Yes, in Motion Transfer'],
                      ['Need to find the Hotel Lobby clip', 'No', 'Yes, if that is the motion you want'],
                      ['Default output', '480P · 9:16 · reference length', 'Up to 1080p · source-driven'],
                      ['Prompt writing', 'No fixed prompt exposed', 'Optional / workflow-dependent'],
                    ].map((row) => (
                      <tr key={row[0]}>
                        {row.map((cell, index) => (
                          <td
                            key={cell}
                            className={
                              index === 0
                                ? 'px-4 py-3 font-medium text-white/72'
                                : 'px-4 py-3'
                            }
                          >
                            {cell}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </section>

          <section className="mx-auto grid max-w-6xl gap-8 px-4 py-14 md:px-5 md:py-20 lg:grid-cols-2">
            <div>
              <h2 className="text-3xl font-semibold tracking-tight">
                Photo tips for a better swap
              </h2>
              <ul className="mt-6 space-y-4">
                {PHOTO_TIPS.map((tip) => (
                  <li key={tip} className="flex gap-3 text-sm leading-6 text-white/46">
                    <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-[rgb(204,144,92)]" />
                    <span>{tip}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-[26px] border border-white/8 bg-white/[0.025] p-6 sm:p-7">
              <div className="flex size-11 items-center justify-center rounded-xl bg-[rgba(204,144,92,0.1)] text-[rgb(220,155,99)]">
                <ShieldCheck className="size-5" />
              </div>
              <h2 className="mt-5 text-3xl font-semibold tracking-tight">
                Free to set up, private by default
              </h2>
              <p className="mt-4 text-sm leading-7 text-white/46">
                You can load the preset, choose photos, and preview your setup
                without spending credits. Choosing a file only creates a local
                browser preview. Your
                photos and custom reference video are not uploaded until you
                sign in and press generate. Generation inputs are stored
                privately for the job rather than published to a public
                gallery.
              </p>
              <p className="mt-4 text-sm leading-7 text-white/46">
                Provider failures automatically refund reserved credits. Use
                images of yourself, pets you own, or people who agreed to
                appear.
              </p>
            </div>
          </section>

          <section className="mx-auto max-w-5xl px-4 pb-16 md:px-5 md:pb-24">
            <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
              Hotel Lobby AI FAQ
            </h2>
            <div className="mt-7 divide-y divide-white/7 rounded-2xl border border-white/8 bg-white/[0.02] px-5 sm:px-7">
              {FAQ_ITEMS.map((item) => (
                <details key={item.question} className="group py-5">
                  <summary className="cursor-pointer list-none pr-6 text-sm font-semibold text-white/82 sm:text-base">
                    {item.question}
                  </summary>
                  <p className="mt-3 max-w-3xl text-sm leading-7 text-white/45">
                    {item.answer}
                  </p>
                </details>
              ))}
            </div>
          </section>

          <section className="mx-auto max-w-6xl px-4 pb-20 md:px-5">
            <div className="rounded-[26px] border border-white/8 bg-white/[0.02] p-6 sm:p-8">
              <h2 className="text-2xl font-semibold tracking-tight">
                Explore more
              </h2>
              <div className="mt-5 flex flex-wrap gap-3">
                {[
                  ['Genjutsu motion transfer', '/'],
                  ['Genjutsu prompt guide', '/genjutsu-prompts'],
                  ['Your generated videos', '/creations'],
                  ['Credit pricing', '/pricing'],
                ].map(([label, href]) => (
                  <Link
                    key={href}
                    href={href}
                    className="rounded-full border border-white/10 bg-white/[0.03] px-4 py-2 text-sm text-white/58 transition hover:border-[rgba(204,144,92,0.35)] hover:text-[rgb(220,155,99)]"
                  >
                    {label}
                  </Link>
                ))}
              </div>
            </div>
          </section>
        </main>
      </div>

      <footer className="border-t border-white/7 py-8">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-4 text-center text-xs text-white/32 sm:flex-row sm:text-left md:px-5">
          <p>
            © 2026 {envConfigs.app_name}. Independent tool; not affiliated with
            COLORS, Quavo, or Takeoff.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4">
            <Link href="/privacy-policy" className="transition hover:text-white/65">
              Privacy
            </Link>
            <Link href="/terms-of-service" className="transition hover:text-white/65">
              Terms
            </Link>
            <Link href="/refund-policy" className="transition hover:text-white/65">
              Refunds
            </Link>
            <a
              href={`mailto:${envConfigs.app_support_email}`}
              className="transition hover:text-white/65"
            >
              Support
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}

export const Route = createFileRoute('/hotel-lobby-ai')({
  loader: () => {
    const locale = getLocale();
    return { locale };
  },
  head: ({ loaderData }) => {
    const locale = loaderData?.locale ?? 'en';
    const { canonical, alternates } = localeLinks('/hotel-lobby-ai', locale);
    return {
      meta: [
        { title: PAGE_TITLE },
        { name: 'description', content: PAGE_DESCRIPTION },
        ...socialMeta({
          title: PAGE_TITLE,
          description: PAGE_DESCRIPTION,
          url: canonical,
        }),
      ],
      links: [{ rel: 'canonical', href: canonical }, ...alternates],
    };
  },
  component: HotelLobbyAiPage,
});
