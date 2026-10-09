import { createFileRoute } from '@tanstack/react-router';
import {
  CheckCircle2,
  Film,
  Images,
  Sparkles,
  WandSparkles,
} from 'lucide-react';

import { Link } from '@/core/i18n/navigation';
import { envConfigs } from '@/config';
import { localeLinks, socialMeta } from '@/lib/seo';
import { getLocale } from '@/paraglide/runtime.js';
import { SiteHeader } from '@/components/landing/SiteHeader';
import { ZombieHugGeneratorPanel } from '@/components/landing/ZombieHugGeneratorPanel';

const PAGE_TITLE = 'AI Zombie Hug: Turn Two Photos Into the Zombie Hug Video';
const PAGE_DESCRIPTION =
  'Make the AI zombie hug trend video from two photos: the lowered gun, the embrace, the hard cut to a warm memory. Copy-paste prompt and the 3 steps inside.';

const FAQ_ITEMS = [
  {
    question: 'What is the AI zombie hug trend?',
    answer:
      "A two-photo AI video format where someone you love appears as a zombie, you can't shoot them, and the gray scene hard-cuts to a warm memory of you holding each other.",
  },
  {
    question: 'How do I make an AI zombie hug video?',
    answer:
      'Upload one clear photo of yourself (the survivor) and one of your loved one, then generate. This page uses a fixed motion-transfer template so you get the cold standoff, lowered gun, and warm embrace in one clip — about 10 minutes.',
  },
  {
    question: 'What app is used for the zombie hug trend?',
    answer:
      'This page runs Higgsfield Genjutsu motion transfer with a fixed zombie hug template. Tutorials online also use Dreamina or CapCut (Seedance), Kling, and Google Flow (Veo).',
  },
  {
    question: 'Is there a free way to do it?',
    answer:
      'You can preview the template and pick photos here before spending credits. Generation uses your Genjutsu AI balance. Dreamina, CapCut, and Kling also hand out free daily credits if you build the clips yourself.',
  },
  {
    question: 'Why does my zombie not look like my partner?',
    answer:
      'The face drifts when the model has too little to work with. Use a sharp, front-facing photo, keep makeup light around the eyes, and avoid sunglasses or group shots.',
  },
  {
    question: 'Can I do it with my dog or cat?',
    answer:
      "Yes, and it's one of the most popular versions. Keep the zombie details subtle and give the pet one recognizable item, like a collar tag.",
  },
  {
    question: 'How long is the video?',
    answer:
      'The clips that travel are 15–24 seconds, vertical 9:16, with the cut landing exactly where the zombie reaches you. This preset is about 24 seconds.',
  },
  {
    question: 'Is it okay to turn real people into zombies with AI?',
    answer:
      "Only with photos of people who agreed to it, or your own pet. Don't use strangers, celebrities or other people's kids, and label it as AI-generated where the platform asks.",
  },
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
    name: 'How to make an AI zombie hug video',
    totalTime: 'PT10M',
    step: [
      {
        '@type': 'HowToStep',
        position: 1,
        name: 'Pick your two photos',
        text: 'One clear front-facing photo of the person who turns, and one of yourself.',
      },
      {
        '@type': 'HowToStep',
        position: 2,
        name: 'Generate with the zombie hug template',
        text: 'Upload both photos on this page. The motion-transfer template already carries the cold standoff and warm memory beat.',
      },
      {
        '@type': 'HowToStep',
        position: 3,
        name: 'Download and post',
        text: 'Download the 9:16 MP4 and post to TikTok, Reels, or Shorts. Label it as AI where the platform asks.',
      },
    ],
  };
}

function graphJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@graph': [howToJsonLd(), faqJsonLd()],
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

function AiZombieHugPage() {
  return (
    <div className="min-h-screen bg-[hsl(220_18%_8%)] text-[rgb(232,234,238)]">
      <JsonLd value={graphJsonLd()} />

      <div className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0" aria-hidden>
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_12%,rgba(56,140,100,0.18),transparent_40%),linear-gradient(to_bottom,rgba(10,12,16,0.55),hsl(220_18%_8%)_78%)]" />
          <div className="absolute top-20 left-1/2 h-[420px] w-[900px] -translate-x-1/2 rounded-full bg-[rgba(80,160,120,0.05)] blur-3xl" />
        </div>

        <div className="relative z-20">
          <SiteHeader />
        </div>

        <main className="relative z-10">
          <section className="mx-auto max-w-7xl px-4 pt-14 pb-12 text-center sm:pt-20 md:px-5 md:pb-16">
            <div className="mx-auto mb-4 flex w-fit items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1.5 text-xs font-medium text-emerald-200/90">
              <WandSparkles className="size-3.5" />
              AI zombie hug · Genjutsu motion transfer
            </div>

            <h1 className="mx-auto max-w-4xl text-[34px] leading-[1.08] font-bold tracking-[-1.4px] sm:text-[44px] md:text-[56px]">
              AI Zombie Hug: The Two-Photo Trend Where Nobody Pulls the Trigger
            </h1>
            <p className="mx-auto mt-5 max-w-3xl text-base leading-7 text-white/58 sm:text-lg">
              The AI zombie hug is a two-photo AI video trend: someone you love
              appears as a zombie, you raise a gun and can&apos;t fire it, they
              rush at you — and the cold gray scene hard-cuts to a warm memory
              of the two of you holding each other. It takes about 10 minutes to
              make and two clear photos to start.
            </p>

            <div id="generator" className="mt-8 text-left sm:mt-10">
              <ZombieHugGeneratorPanel />
            </div>
          </section>

          <section
            id="zombie-hug-trend"
            className="border-y border-white/7 bg-white/[0.018]"
          >
            <div className="mx-auto max-w-5xl px-4 py-14 md:px-5 md:py-20">
              <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
                What Is the AI Zombie Hug Trend?
              </h2>
              <div className="mt-5 space-y-4 text-sm leading-7 text-white/48 sm:text-base">
                <p>
                  The zombie hug trend (also written <em>AI zombie hug</em> or{' '}
                  <em>zombie hug AI video</em>) is the emotional branch of the{' '}
                  <a
                    href="#ai-zombie-trend"
                    className="text-emerald-300/90 underline-offset-2 hover:underline"
                  >
                    AI zombie trend
                  </a>
                  . Instead of a jumpscare, it plays the same story in four
                  beats:
                </p>
                <ol className="list-decimal space-y-3 pl-5">
                  <li>
                    <strong className="text-white/72">
                      The impossible choice
                    </strong>{' '}
                    — a gun raised at someone you love, now a zombie.
                  </li>
                  <li>
                    <strong className="text-white/72">
                      Still you, underneath
                    </strong>{' '}
                    — one detail you recognize: a necklace, a collar tag, cloudy
                    eyes that still look like theirs.
                  </li>
                  <li>
                    <strong className="text-white/72">
                      An embrace, not an ending
                    </strong>{' '}
                    — the gun comes down, your arms open, they run into them.
                  </li>
                  <li>
                    <strong className="text-white/72">
                      Back to your best day
                    </strong>{' '}
                    — the instant they reach you, the scene hard-cuts to the two
                    of you in warm light: laughing, holding on, alive.
                  </li>
                </ol>
                <p>
                  That reversal is why it spread so fast. If you&apos;re looking
                  for the broader format — friends, family, pets, all of it —
                  see the{' '}
                  <a
                    href="#ai-zombie-trend"
                    className="text-emerald-300/90 underline-offset-2 hover:underline"
                  >
                    AI zombie trend
                  </a>{' '}
                  notes below.
                </p>
              </div>
            </div>
          </section>

          <section className="mx-auto max-w-6xl px-4 py-14 md:px-5 md:py-20">
            <div className="mx-auto max-w-3xl text-center">
              <p className="text-xs font-semibold tracking-[0.18em] text-emerald-300/80 uppercase">
                Three steps
              </p>
              <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
                How to Make an AI Zombie Hug Video
              </h2>
            </div>

            <div className="mt-9 grid gap-4 md:grid-cols-3">
              {[
                {
                  icon: Images,
                  title: '1. Pick your two photos',
                  text: 'One clear, front-facing photo of the person who turns (no sunglasses, no group shots) and one of yourself. A selfie is enough. The hug needs two faces: you lowering the gun, and the two of you in the memory.',
                },
                {
                  icon: Sparkles,
                  title: '2. Generate on this page',
                  text: 'Upload both photos above. The zombie hug motion template is already loaded — Genjutsu motion transfer maps your faces onto the cold standoff and the warm embrace in one clip.',
                },
                {
                  icon: Film,
                  title: '3. Download and post',
                  text: 'Keep it 9:16 for TikTok, Reels and Shorts. Label the video as AI where the platform asks.',
                },
              ].map((step) => {
                const Icon = step.icon;
                return (
                  <div
                    key={step.title}
                    className="rounded-2xl border border-white/8 bg-white/[0.025] p-5"
                  >
                    <span className="flex size-10 items-center justify-center rounded-xl bg-emerald-400/10 text-emerald-300/90">
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

            <div className="mx-auto mt-12 max-w-3xl rounded-2xl border border-white/8 bg-white/[0.02] p-5 sm:p-6">
              <h3 className="text-lg font-semibold">Copy-paste prompts</h3>
              <p className="mt-2 text-sm leading-6 text-white/42">
                Building the cold and warm beats yourself in CapCut or Dreamina?
                Use the same pose in both so the cut lands. This page skips that
                step — the template already carries both beats.
              </p>
              <div className="mt-5 space-y-4 text-sm leading-6 text-white/55">
                <div>
                  <p className="font-medium text-white/78">Cold beat</p>
                  <blockquote className="mt-2 rounded-xl border border-white/8 bg-black/25 p-4 text-white/48">
                    Cinematic 9:16 shot, rainy empty city street at dusk. A
                    young woman with pale gray skin, clouded eyes and a thin
                    streak of dried blood on her cheek stands six meters away,
                    breathing hard. In the foreground, a man&apos;s hands shake
                    as he raises a pistol, then slowly lowers it. She screams
                    and charges toward him. Desaturated blue-gray grade, shallow
                    depth of field, film grain, 24 fps.
                  </blockquote>
                </div>
                <div>
                  <p className="font-medium text-white/78">
                    Warm beat (same pose)
                  </p>
                  <blockquote className="mt-2 rounded-xl border border-white/8 bg-black/25 p-4 text-white/48">
                    Cinematic 9:16 shot, golden sunset beach. The same young
                    woman, alive and healthy, laughing as she runs into the
                    man&apos;s open arms. He lifts her off the ground. Warm
                    golden grade, soft lens flare, film grain, 24 fps.
                  </blockquote>
                </div>
              </div>
            </div>
          </section>

          <section className="border-y border-white/7 bg-white/[0.018]">
            <div className="mx-auto max-w-6xl px-4 py-14 md:px-5 md:py-20">
              <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
                Photos That Decide Whether It Works
              </h2>
              <div className="mt-7 overflow-x-auto rounded-2xl border border-white/8">
                <table className="w-full min-w-[560px] border-collapse text-left text-sm">
                  <thead className="bg-white/[0.035] text-white/72">
                    <tr>
                      <th className="px-4 py-3 font-semibold">What you need</th>
                      <th className="px-4 py-3 font-semibold">
                        Why it matters
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/7 text-white/46">
                    {[
                      [
                        'One clear, front-facing face',
                        'The model has too little reference otherwise, and the face drifts between the two clips',
                      ],
                      [
                        'Good even light',
                        'Dark or backlit photos come back with a different person',
                      ],
                      [
                        'One recognizable detail',
                        "The necklace, the collar tag, the scar — that's the moment the gun goes down",
                      ],
                      [
                        'No kids, no public figures',
                        'Only people who agreed to it; label the video as AI where the platform asks',
                      ],
                    ].map(([need, why]) => (
                      <tr key={need}>
                        <td className="px-4 py-3 font-medium text-white/72">
                          {need}
                        </td>
                        <td className="px-4 py-3">{why}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </section>

          <section className="mx-auto max-w-6xl px-4 py-14 md:px-5 md:py-20">
            <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
              Three Versions People Are Making
            </h2>
            <div className="mt-7 grid gap-3 md:grid-cols-3">
              {[
                [
                  'The couple version',
                  'The original. Her photo plus his selfie, ending in the beach memory.',
                ],
                [
                  'The pet version',
                  'A dog or cat runs into open arms instead of a person. Keep the zombie details subtle (cloudy eyes, matted fur) and give the pet one recognizable item, like a collar tag.',
                ],
                [
                  'The family version',
                  "A parent you'd never shoot. This one lands hardest with people doing it as a memory, so keep the zombie makeup light around the eyes and mouth.",
                ],
              ].map(([title, text]) => (
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

          <section
            id="ai-zombie-trend"
            className="border-y border-white/7 bg-white/[0.018]"
          >
            <div className="mx-auto max-w-5xl px-4 py-14 md:px-5 md:py-20">
              <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
                AI Zombie Hug vs. AI Zombie Trend: What&apos;s the Difference?
              </h2>
              <p className="mt-5 text-sm leading-7 text-white/48 sm:text-base">
                The AI zombie trend is the whole format — any loved one, any
                ending. The AI zombie hug is the version where the gun goes down
                and the story resolves in an embrace. Same engine, same two
                photos, one different beat. For more motion-transfer workflows
                beyond this preset, see{' '}
                <Link
                  href="/"
                  className="text-emerald-300/90 underline-offset-2 hover:underline"
                >
                  Genjutsu motion transfer
                </Link>
                .
              </p>
            </div>
          </section>

          <section className="mx-auto max-w-5xl px-4 py-14 md:px-5 md:py-20">
            <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
              FAQ
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
            <div className="rounded-[26px] border border-white/8 bg-white/[0.02] p-6 text-center sm:p-10">
              <ul className="mx-auto mb-5 flex max-w-xl flex-col gap-2 text-left text-sm text-white/45">
                {[
                  'Two clear photos decide likeness more than the prompt',
                  'The lowered gun is the emotional beat — keep one fixed detail',
                  '9:16 travels farthest on TikTok, Reels, and Shorts',
                ].map((tip) => (
                  <li key={tip} className="flex gap-2">
                    <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-300/80" />
                    <span>{tip}</span>
                  </li>
                ))}
              </ul>
              <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
                Your story starts here
              </h2>
              <p className="mx-auto mt-3 max-w-2xl text-sm leading-7 text-white/48">
                Upload two photos and get the cold standoff, the lowered gun and
                the warm embrace in one clip.
              </p>
              <a
                href="#generator"
                className="mt-6 inline-flex h-11 items-center justify-center rounded-xl bg-[linear-gradient(135deg,rgb(52,180,120),rgb(28,120,88))] px-6 text-sm font-semibold text-white transition hover:brightness-105"
              >
                Make my zombie hug video
              </a>
            </div>
          </section>
        </main>
      </div>

      <footer className="border-t border-white/7 py-8">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-4 text-center text-xs text-white/32 sm:flex-row sm:text-left md:px-5">
          <p>© 2026 {envConfigs.app_name}. Independent AI video tool.</p>
          <div className="flex flex-wrap items-center justify-center gap-4">
            <Link
              href="/privacy-policy"
              className="transition hover:text-white/65"
            >
              Privacy
            </Link>
            <Link
              href="/terms-of-service"
              className="transition hover:text-white/65"
            >
              Terms
            </Link>
            <Link
              href="/refund-policy"
              className="transition hover:text-white/65"
            >
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

export const Route = createFileRoute('/ai-zombie-hug')({
  loader: () => {
    const locale = getLocale();
    return { locale };
  },
  head: ({ loaderData }) => {
    const locale = loaderData?.locale ?? 'en';
    const { canonical, alternates } = localeLinks('/ai-zombie-hug', locale);
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
  component: AiZombieHugPage,
});
