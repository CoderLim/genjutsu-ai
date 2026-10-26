import { createFileRoute } from '@tanstack/react-router';
import {
  CheckCircle2,
  Download,
  Film,
  ImageIcon,
  Sparkles,
  WandSparkles,
  XCircle,
} from 'lucide-react';

import { Link } from '@/core/i18n/navigation';
import { absoluteUrl, localeLinks, ogImageUrl, socialMeta } from '@/lib/seo';
import { m } from '@/paraglide/messages.js';
import { getLocale } from '@/paraglide/runtime.js';
import { HotelLobbyGeneratorPanel } from '@/components/landing/HotelLobbyGeneratorPanel';
import {
  getRumpelSeoCopy,
  RUMPEL_SEO_LOCALES,
} from '@/components/landing/rumpel-seo-i18n';
import { SiteFooter } from '@/components/landing/SiteFooter';
import { SiteHeader } from '@/components/landing/SiteHeader';
import { SeoJsonLd } from '@/components/seo-json-ld';

const DATE_PUBLISHED = '2026-10-11';
const DATE_MODIFIED = '2026-10-26';
const GENERATOR_HREF = '#generator';
const PAGE_PATH = '/ai-rumpelstiltskin';
/** Only locales with translated article bodies are advertised. */
const SEO_LOCALES = RUMPEL_SEO_LOCALES;
const COVER_PATH = '/imgs/blog/how-to-make-rumpelstiltskin-ai-video-cover.jpg';
const DEMO_VIDEO_PATH = '/videos/rumpelstiltskin-tpl.mp4';
const DEMO_POSTER_PATH = '/videos/rumpelstiltskin-tpl-poster.jpg';
const APP_NAME = 'Genjutsu AI';

/** Visible FAQ + FAQPage JSON-LD must stay character-identical. */
const FAQ_ITEMS = [
  {
    id: 'origin',
    question: 'Is the Rumpelstiltskin 1987 clip from a real movie?',
    answer:
      "No. A Rumpelstiltskin film did come out in 1987 — a Cannon Movie Tales musical starring Billy Barty — but this barn scene isn't in it. The clip is AI-generated and first posted to Instagram in August 2026.",
  },
  {
    id: 'dance',
    question: 'What is the Rumpelstiltskin dance?',
    answer:
      "It's the sly tiptoe routine from the viral clip: a little man in a velvet tuxedo creeps across a hay barn on his toes, shushes the camera, and keeps tiptoeing as straw turns to gold.",
  },
  {
    id: 'generate',
    question: 'How do I make a Rumpelstiltskin AI video?',
    answer:
      "Upload a clear image and open the Rumpelstiltskin template. The character, barn and film grade are pre-set, so there's no prompt to write. The clip renders in a few minutes.",
  },
  {
    id: 'audio',
    question: 'Can I use the original audio?',
    answer:
      'Only if you hold rights to it. The track that made the trend spread is a commercial release. Use a cleared track, or a licensed template sound.',
  },
  {
    id: 'year',
    question: "Why does the video say 1987 if it's not from 1987?",
    answer:
      "That's the joke — and also the misinformation. The caption was written to make it look like a lost film. If you make your own, put a made-up title on the card and label it AI.",
  },
  {
    id: 'song',
    question: 'What song is in the Tiptoeing in My Jordans video?',
    answer:
      '"Tip Toe Wing In My Jawwdinz" by Riff Raff (2013). Use the official sound inside TikTok or Instagram Reels — both platforms carry the licensed audio.',
  },
  {
    id: 'halloween',
    question: 'Is there a Halloween version of the tiptoe video?',
    answer:
      'Yes. Add a pointed witch hat, swap the barn dressing for carved pumpkins, autumn leaves and faint fog, and keep the original 4-second creep, 4-second shush, 4-second exit timing.',
  },
  {
    id: 'spelling',
    question: 'Is it "tiptoeing" or "tip toeing" in my Jordans?',
    answer:
      'Both. The trend started as "Tip Toein\' in My Jordans" and Google treats the variations as one query — tiptoeing, tip toeing, tip toein\', tiptoing.',
  },
] as const;

const PROMPT_SEGMENTS = [
  {
    id: 'character',
    title: 'A. Character lock (text-to-image reference sheet)',
    prompt: `A small imp in a black velvet tuxedo jacket with satin lapels and an oversized bow tie,
white streak in slicked dark hair, pale skin, pointed ears, mischievous held grin.
Full body, centred, facing camera, arms relaxed at sides, feet together.
Set: candlelit straw barn, one lantern on a wooden beam, hay bales stage left, dust
visible in the light. Lighting: single warm amber key from upper left, soft olive
shadow, golden rim light on the shoulders. Look: 35mm film grain, slightly faded
Technicolor, 1980s children's fantasy film still, shallow depth of field.
Vertical 9:16.`,
    negative: `modern clothing, sneakers, real Jordan sneakers, smooth CGI gloss, plastic skin,
extra fingers, deformed hands, blurry face, mask, text, watermark, high saturation,
wide-angle distortion`,
  },
  {
    id: 'set',
    title: 'B. Barn lock (empty set still)',
    prompt: `Empty straw-filled barn interior at dusk, stacked hay bales left of frame, one lit
candle lantern on a beam, dust suspended in the light beam, wooden floor, dark timber
walls out of focus. Warm amber and olive palette, no blue fill. Static wide shot,
35mm film grain, faint vignette. 1980s fantasy film still. Vertical 9:16.`,
    negative: `modern props, fluorescent light, plastic hay, people, text, watermark, HDR`,
  },
  {
    id: 'self',
    title: 'C. Your photo → tiptoe video (image-to-video template)',
    prompt: `Full-body shot of the person in the reference photo, restyled as a small imp in a black
velvet tuxedo jacket and oversized bow tie, held mischievous grin, pale skin, pointed
ears. He tiptoes out from behind stacked hay bales in a candlelit straw barn, one finger
pressed to his lips in a shush, then breaks into a wide grin and tiptoes sideways out of
frame. The straw he passes over turns to gold thread in a soft wake behind him.
Static front-facing camera, no zoom, no pan. Warm amber key light, olive shadow,
35mm film grain, slightly faded Technicolor, 1980s fantasy film still. Vertical 9:16,
12 seconds, smooth continuous motion.`,
    negative: `camera movement, zoom, handheld shake, jump cuts, morphing face, identity drift,
extra limbs, deformed hands, modern clothing, gloss CGI look, subtitles, watermark`,
  },
  {
    id: 'halloween',
    title: 'D. Halloween version (same as C, three swaps)',
    prompt: `Full-body shot of the person in the reference photo, restyled as a small imp in a black
velvet tuxedo jacket, oversized bow tie, and a pointed witch hat, held mischievous grin, pale skin, pointed
ears. He tiptoes out from behind stacked hay bales in a candlelit barn with carved pumpkins glowing on the floor, autumn leaves over
the straw, cobwebs on the beams and faint fog near the ground, one finger
pressed to his lips in a shush, then breaks into a wide grin under the hat brim and tiptoes sideways out of
frame. The straw he passes over turns to gold thread in a soft wake behind him.
Static front-facing camera, no zoom, no pan. Warm amber key light, olive shadow,
35mm film grain, slightly faded Technicolor, 1980s fantasy film still. Vertical 9:16,
12 seconds, smooth continuous motion.`,
    negative: `camera movement, zoom, handheld shake, jump cuts, morphing face, identity drift,
extra limbs, deformed hands, modern clothing, gloss CGI look, subtitles, watermark`,
  },
  {
    id: 'duo',
    title: 'E. Two people / pet variants',
    prompt: `Two people from the two reference photos, both restyled as small imps in black velvet
tuxedo jackets and oversized bow ties. They tiptoe out from behind the hay bales side
by side, both raise a finger to their lips and shush the camera in unison, then grin at
each other and tiptoe out of frame. Keep both faces clearly visible and evenly lit,
neither face smaller than a third of the frame height. Same barn, same lighting.
Static camera, vertical 9:16, 12 seconds.

Pet variant — swap the subject, keep the staging:
The dog from the reference photo, wearing a black velvet jacket and a satin bow tie,
tiptoes across a candlelit straw barn on its hind legs, turns its head to the camera,
and does a quick head-tilt equivalent of the shush — one paw lifted. Straw turns to
gold behind it. Keep the dog's real markings and face unchanged. Static camera,
vertical 9:16, 12 seconds.`,
    negative: `camera movement, zoom, handheld shake, jump cuts, morphing face, identity drift,
extra limbs, deformed hands, modern clothing, gloss CGI look, subtitles, watermark,
human face, human hands, extra legs, changed fur pattern`,
  },
] as const;

const HOW_STEPS = [
  {
    id: 'image',
    name: 'Upload a clear image',
    text: 'Choose a clear, well-lit image with the subject visible and enough room to show the dance pose. Avoid blur and heavy filters.',
  },
  {
    id: 'template',
    name: 'Open the Rumpelstiltskin template',
    text: 'The character, the barn, the gold and the 80s film grade are already locked in. Pick this template and you skip prompt writing entirely.',
  },
  {
    id: 'render',
    name: 'Generate and download',
    text: 'The clip renders in a few minutes in HD, with the tiptoe, the shush and the gold already choreographed. Label the result as AI when you post.',
  },
] as const;

const HAND_LOCKS = [
  {
    id: 'character',
    title: 'Lock the character first',
    text: 'One character sheet — front, side, full body — from an image model. Attach the same sheet to every shot. Face drift between shots is what happens when you skip this.',
  },
  {
    id: 'set',
    title: 'Lock the set as a still',
    text: 'Generate the barn as a photograph first — night, hay bales, one lantern, deep shadows, film look baked in. If the still looks digital, the video will too.',
  },
  {
    id: 'beats',
    title: 'Animate in beats of 4–6 seconds',
    text: 'One beat per generation: the tiptoe; the stop and the finger to the lips; the woman turning; the dance. Long takes drift.',
  },
  {
    id: 'grade',
    title: 'Grade it like a print, not a filter',
    text: 'Name the stock and its flaws in the prompt — "1970s fairy-tale film still, 16mm, visible grain, soft focus, light halation." Then add grain and a hint of vertical jitter in the edit.',
  },
  {
    id: 'audio',
    title: 'Audio last',
    text: 'And clear it — see the rights section below.',
  },
] as const;

const RULES = [
  {
    id: 'original',
    ok: true,
    text: "Do build your own version. Rumpelstiltskin is a Brothers Grimm character from 1812 — public domain, no living person's likeness involved. Putting your own photo in it is clean.",
  },
  {
    id: 'accurate_label',
    ok: false,
    text: "Don't label it a real film. Rumpelstiltskin (1987) exists; the rights sit with Amazon MGM, and the actors and Billy Barty's estate are real people whose work you'd be misattributing. Invent a title — a fake studio and a fake year are funnier and safe.",
  },
  {
    id: 'consent',
    ok: false,
    text: "Do not use images of people without permission. Versions featuring public figures may circulate online, but you must have the rights and any required consent to edit or publish someone's likeness. Use only images you are authorized to edit.",
  },
  {
    id: 'music',
    ok: false,
    text: 'Don\'t use the Riff Raff track as your audio unless you have rights to it. "Tip Toe Wing in My Jawwdinz" is a Mad Decent release, and a trending-sounds library is not a licence. Use a cleared track or a template sound you\'re licensed for.',
  },
  {
    id: 'disclosure',
    ok: true,
    text: 'Do label it AI. Put "AI" on the same title card, not in a comment nobody reads.',
  },
] as const;

function translatedFaqItems() {
  const translations = getRumpelSeoCopy(getLocale())?.faq;
  return FAQ_ITEMS.map((item) => ({
    question: translations?.[item.id]?.[0] ?? item.question,
    answer: translations?.[item.id]?.[1] ?? item.answer,
  }));
}

function translatedHowSteps() {
  const translations = getRumpelSeoCopy(getLocale())?.steps;
  return HOW_STEPS.map((step) => ({
    name: translations?.[step.id]?.[0] ?? step.name,
    text: translations?.[step.id]?.[1] ?? step.text,
  }));
}

function translatedHandLocks() {
  const translations = getRumpelSeoCopy(getLocale())?.locks;
  return HAND_LOCKS.map((lock) => ({
    title: translations?.[lock.id]?.[0] ?? lock.title,
    text: translations?.[lock.id]?.[1] ?? lock.text,
  }));
}

function translatedRules() {
  const translations = getRumpelSeoCopy(getLocale())?.rules;
  return RULES.map((rule) => ({
    ...rule,
    text: translations?.[rule.id] ?? rule.text,
  }));
}

function faqJsonLd() {
  return {
    '@type': 'FAQPage',
    mainEntity: translatedFaqItems().map((item) => ({
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
    name:
      getRumpelSeoCopy(getLocale())?.sections.howToName ??
      'How to make a Rumpelstiltskin AI video',
    step: translatedHowSteps().map((step) => ({
      '@type': 'HowToStep',
      name: step.name,
      text: step.text,
    })),
  };
}

function articleJsonLd() {
  const pageUrl = absoluteUrl(PAGE_PATH);
  const coverUrl = absoluteUrl(COVER_PATH);
  return {
    '@type': 'Article',
    headline: m['site.rumpel.hero_title'](),
    datePublished: DATE_PUBLISHED,
    dateModified: DATE_MODIFIED,
    about:
      getRumpelSeoCopy(getLocale())?.sections.articleAbout ??
      'Rumpelstiltskin 1987 tip-toe AI video trend',
    inLanguage: getRumpelSeoCopy(getLocale()) ? getLocale() : 'en',
    image: coverUrl,
    author: {
      '@type': 'Organization',
      name: APP_NAME,
    },
    publisher: {
      '@type': 'Organization',
      name: APP_NAME,
      logo: {
        '@type': 'ImageObject',
        url: ogImageUrl(),
      },
    },
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': pageUrl,
    },
  };
}

function videoObjectJsonLd() {
  return {
    '@type': 'VideoObject',
    name: 'Tiptoeing in My Jordans AI video — one photo in, tiptoe barn out',
    description:
      'A 12-second Tiptoeing in My Jordans AI video generated from a single photo: the creep from behind the hay bales, the shush, the grin, and the straw turning to gold.',
    thumbnailUrl: absoluteUrl(DEMO_POSTER_PATH),
    uploadDate: DATE_MODIFIED,
    contentUrl: absoluteUrl(DEMO_VIDEO_PATH),
    embedUrl: absoluteUrl(PAGE_PATH),
    duration: 'PT12S',
    isFamilyFriendly: true,
  };
}

function graphJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@graph': [
      articleJsonLd(),
      howToJsonLd(),
      faqJsonLd(),
      videoObjectJsonLd(),
    ],
  };
}

function AiRumpelstiltskinPage() {
  const copy = getRumpelSeoCopy(getLocale());
  return (
    <div className="bg-background text-foreground flex min-h-screen flex-col">
      <SeoJsonLd value={graphJsonLd()} />

      <div className="relative">
        <div className="absolute inset-x-0 top-0 z-[260]">
          <SiteHeader />
        </div>

        <section className="mx-auto w-full max-w-7xl px-4 pt-20 pb-8 text-center sm:pt-24 md:px-5 md:pb-10">
          <div className="border-primary/20 bg-primary/10 text-primary mx-auto mb-4 flex w-fit items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium">
            <WandSparkles className="size-3.5" />
            {m['site.rumpel.hero_badge']()}
          </div>

          <h1 className="text-foreground mx-auto max-w-4xl text-[34px] leading-[1.08] font-bold tracking-[-1.4px] sm:text-[44px] md:text-[56px]">
            {m['site.rumpel.hero_title']()}
          </h1>
          <p className="text-muted-foreground mx-auto mt-5 max-w-3xl text-base leading-7 sm:text-lg">
            {m['site.rumpel.hero_desc']()}
          </p>

          <div id="generator" className="mt-8 scroll-mt-24 text-left sm:mt-10">
            <HotelLobbyGeneratorPanel presetId="rumpelstiltskin" />
          </div>
        </section>
      </div>

      <main className="mx-auto w-full max-w-7xl flex-1 px-4 md:px-5">
        <section id="what-is" className="scroll-mt-24 py-14 md:py-20">
          <div className="mx-auto max-w-5xl">
            <h2 className="text-foreground text-3xl font-semibold tracking-tight sm:text-4xl">
              {copy?.sections.whatTitle ??
                'What the Rumpelstiltskin 1987 clip actually is'}
            </h2>
            <div className="text-muted-foreground mt-5 space-y-4 text-sm leading-7 sm:text-base">
              <p>
                {copy?.sections.whatP1 ?? (
                  <>
                    A child-sized man with frizzy ginger hair, painted-on
                    wrinkles, a black velvet tuxedo and a bow tie peeks from
                    behind a hay bale, tiptoes toward the camera, raises a
                    finger to his lips, dances in the straw, and turns it into a
                    pile of gold coins.
                  </>
                )}
              </p>
              <p>
                {copy?.sections.whatP2 ?? (
                  <>
                    The caption says 1987. There is no such scene. The real{' '}
                    <em>Rumpelstiltskin</em> (1987) was a Cannon Movie Tales
                    musical shot in Israel, with Billy Barty in his only lead
                    role — a feathered cap, a brown tunic, and a spinning wheel
                    in a castle room. No barn. No tuxedo.
                  </>
                )}
              </p>
              <p>
                {copy?.sections.whatP3 ?? (
                  <>
                    The clip is AI-generated. Know Your Meme traces it to an
                    August 27, 2026 Instagram reel by @stroinaya, whose caption
                    was Russian ad copy for an AI course and named no tool. It
                    sat mostly unnoticed until late September, when someone
                    paired it with Riff Raff&apos;s &quot;Tip Toe Wing in My
                    Jawwdinz&quot; (2014) and a TikTok posted September 29 set
                    off the wave. From there it went to X — one repost reached
                    11.4 million views — and spread across TikTok, Reels and
                    Shorts under the hashtag #tiptoeinginmyjordans. Remixes
                    swapping the imp for other faces arrived within three days,
                    and half the internet went looking for a movie that
                    doesn&apos;t exist.
                  </>
                )}
              </p>
              <p>
                It gets spelled <strong>tip toeing in my jordans</strong>,{' '}
                <strong>tip toein&apos; in my jordans</strong> and{' '}
                <strong>tipto ing</strong> in equal measure — one trend, four
                spellings.
              </p>
            </div>
            <figure className="mt-8 overflow-hidden rounded-2xl border border-white/10">
              <img
                src={COVER_PATH}
                alt={
                  copy?.sections.imageAlt ??
                  'Rumpelstiltskin AI tip-toe barn video trend — AI-generated 1987-style clip'
                }
                className="h-auto w-full object-cover"
                loading="lazy"
                decoding="async"
              />
            </figure>
          </div>
        </section>

        <section id="lost-film" className="scroll-mt-24 py-14 md:py-20">
          <div className="mx-auto max-w-5xl">
            <h2 className="text-foreground text-3xl font-semibold tracking-tight sm:text-4xl">
              {copy?.sections.lostTitle ?? "Why people think it's a lost film"}
            </h2>
            <div className="text-muted-foreground mt-5 space-y-4 text-sm leading-7 sm:text-base">
              <p>
                {copy?.sections.lostP1 ?? (
                  <>
                    Three things sell the illusion: the grain, the grade and the
                    caption. Soft focus, warm saturated Technicolor, a slight
                    gate weave, and a period-serif title card reading
                    &quot;Rumpelstiltskin (1987)&quot; — on a clip that has no
                    title card, no watermark and no credits in its source
                    version.
                  </>
                )}
              </p>
              <p>
                {copy?.sections.lostP2 ?? (
                  <>
                    The tells are the usual AI ones: the imp&apos;s face
                    geometry shifts between the shush and the grin, the gold
                    arrives as an instant pile, and no spinning wheel ever
                    appears.
                  </>
                )}
              </p>
            </div>
          </div>
        </section>

        <section id="song" className="scroll-mt-24 py-14 md:py-20">
          <div className="mx-auto max-w-5xl">
            <h2 className="text-foreground text-3xl font-semibold tracking-tight sm:text-4xl">
              What&apos;s the song in the Tiptoeing in My Jordans video?
            </h2>
            <div className="text-muted-foreground mt-5 space-y-4 text-sm leading-7 sm:text-base">
              <p>
                &quot;Tip Toe Wing In My Jawwdinz&quot; by Riff Raff, released
                in 2013. The clip borrows only the hook and the cadence — the
                &quot;Jordans&quot; in the trend name comes from the lyric, not
                from anyone&apos;s shoes. Nobody in the video is wearing
                Jordans, and the original clip has no Jordan imagery in it at
                all.
              </p>
              <p>
                If you post your own version: use the official sound inside
                TikTok or Instagram Reels rather than re-uploading the track.
                Both platforms carry the licensed audio, and using the official
                sound is what puts your video in front of the trend&apos;s
                audience. Do not let your video generator create its own audio
                track — the model will produce something adjacent at best, and
                mismatched audio is the fastest way to make a tiptoe video look
                wrong.
              </p>
              <p>
                Riff Raff spells it &quot;Tip Toe Wing&quot; on the record; the
                meme spells it three other ways. Same song.
              </p>
            </div>
          </div>
        </section>

        <section id="halloween" className="scroll-mt-24 py-14 md:py-20">
          <div className="mx-auto max-w-5xl">
            <h2 className="text-foreground text-3xl font-semibold tracking-tight sm:text-4xl">
              The Halloween version: same tiptoe, pumpkin barn
            </h2>
            <div className="text-muted-foreground mt-5 space-y-4 text-sm leading-7 sm:text-base">
              <p>
                The tiptoe works because it&apos;s a costume in the original:
                velvet jacket, bow tie, pointed features. Swap the barn dressing
                for Halloween dressing and the motion still reads.
              </p>
              <p>Change three things, keep everything else identical:</p>
              <ul className="list-disc space-y-3 pl-5">
                <li>
                  <strong className="text-foreground">Head:</strong> add a
                  pointed witch hat — the silhouette does more work than a full
                  costume.
                </li>
                <li>
                  <strong className="text-foreground">Set:</strong> carved
                  pumpkins on the barn floor, autumn leaves over the straw,
                  faint fog, cobwebs on the beams. Keep the same single candle
                  as the key light.
                </li>
                <li>
                  <strong className="text-foreground">Timing:</strong> keep the
                  4-second creep, 4-second shush, 4-second exit. Halloween edits
                  fail when people make the intro longer to show off the set.
                </li>
              </ul>
              <p>
                One warning: don&apos;t add masks. A mask over the face breaks
                the shush-and-grin beat, which is the entire payoff of the meme.
              </p>
            </div>
          </div>
        </section>

        <section id="how-to" className="scroll-mt-24 py-14 md:py-20">
          <div className="mx-auto max-w-3xl text-center">
            <p className="text-primary text-xs font-semibold tracking-[0.18em] uppercase">
              {copy?.sections.three ?? 'Three steps'}
            </p>
            <h2 className="text-foreground mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
              {copy?.sections.howTitle ??
                'How to make your own Rumpelstiltskin AI video'}
            </h2>
          </div>

          <div className="mt-9 grid gap-4 md:grid-cols-3">
            {translatedHowSteps().map((step, index) => {
              const icons = [ImageIcon, Film, Download] as const;
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
              {m['site.rumpel.try_generator']()}
            </Link>
          </div>
        </section>

        <section id="by-hand" className="scroll-mt-24 py-14 md:py-20">
          <div className="mx-auto max-w-5xl">
            <h2 className="text-foreground text-3xl font-semibold tracking-tight sm:text-4xl">
              {copy?.sections.handTitle ??
                'Prompt pack: character, barn, and your own tiptoe video'}
            </h2>
            <p className="text-muted-foreground mt-5 text-sm leading-7 sm:text-base">
              {copy?.sections.handIntro ?? (
                <>
                  If you&apos;d rather build the look yourself, use these five
                  prompts. A and B lock the stills; C is the one-photo
                  image-to-video template; D is the Halloween swap; E covers two
                  people and pets. Paste negatives as written.
                </>
              )}
            </p>
            <div className="mt-8 space-y-8">
              {PROMPT_SEGMENTS.map((segment) => (
                <div key={segment.id}>
                  <h3 className="text-foreground text-lg font-semibold">
                    {segment.title}
                  </h3>
                  <pre className="border-border/70 bg-muted/40 text-foreground/90 mt-3 overflow-x-auto rounded-xl border p-4 text-xs leading-6 whitespace-pre-wrap sm:text-sm">
                    {segment.prompt}
                  </pre>
                  <p className="text-muted-foreground mt-3 text-xs font-medium tracking-wide uppercase">
                    Negative
                  </p>
                  <pre className="border-border/70 bg-muted/30 text-muted-foreground mt-2 overflow-x-auto rounded-xl border p-4 text-xs leading-6 whitespace-pre-wrap sm:text-sm">
                    {segment.negative}
                  </pre>
                </div>
              ))}
            </div>
            <div className="mt-10 space-y-5">
              <h3 className="text-foreground text-lg font-semibold">
                Short beats still matter
              </h3>
              {translatedHandLocks().map((lock) => (
                <div key={lock.title}>
                  <h4 className="text-foreground text-base font-semibold">
                    {lock.title}
                  </h4>
                  <p className="text-muted-foreground mt-2 text-sm leading-7 sm:text-base">
                    {lock.text}
                  </p>
                </div>
              ))}
            </div>
            <p className="text-muted-foreground mt-8 text-sm leading-7 sm:text-base">
              {copy?.sections.handLinkBefore ??
                'Prefer the homepage Genjutsu flow with your own template upload? See the step-by-step guide:'}{' '}
              <Link
                href="/blog/how-to-make-rumpelstiltskin-ai-video"
                className="text-primary underline-offset-2 hover:underline"
              >
                {copy?.sections.handLink ??
                  'How to make a Rumpelstiltskin AI video on Genjutsu AI'}
              </Link>
              .
            </p>
          </div>
        </section>

        <section id="rules" className="scroll-mt-24 py-14 md:py-20">
          <div className="mx-auto max-w-5xl">
            <h2 className="text-foreground text-3xl font-semibold tracking-tight sm:text-4xl">
              {copy?.sections.rulesTitle ??
                "What you can and can't do with this trend"}
            </h2>
            <ul className="mt-7 space-y-4">
              {translatedRules().map((rule) => (
                <li
                  key={rule.text.slice(0, 40)}
                  className="text-muted-foreground flex gap-3 text-sm leading-7 sm:text-base"
                >
                  {rule.ok ? (
                    <CheckCircle2 className="text-primary mt-0.5 size-5 shrink-0" />
                  ) : (
                    <XCircle className="mt-0.5 size-5 shrink-0 text-red-400/80" />
                  )}
                  <span>{rule.text}</span>
                </li>
              ))}
            </ul>
            <p className="text-muted-foreground mt-6 text-sm leading-7">
              {copy?.sections.rulesBefore ?? 'Full rules are in our'}{' '}
              <Link
                href="/terms-of-service"
                className="text-primary underline-offset-2 hover:underline"
              >
                {copy?.sections.rulesLink ?? 'Acceptable Use Policy'}
              </Link>
              .
            </p>
          </div>
        </section>

        <section id="faq" className="scroll-mt-24 py-14 md:py-20">
          <h2 className="text-foreground text-3xl font-semibold tracking-tight sm:text-4xl">
            {copy?.sections.faqTitle ?? 'Rumpelstiltskin AI FAQ'}
          </h2>
          <div className="border-border/70 bg-card/60 divide-border/60 mt-7 divide-y rounded-2xl border px-5 sm:px-7">
            {translatedFaqItems().map((item) => (
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
            <h2 className="text-foreground text-2xl font-semibold tracking-tight sm:text-3xl">
              {m['site.rumpel.cta_title']()}
            </h2>
            <p className="text-muted-foreground mx-auto mt-3 max-w-2xl text-sm leading-7">
              {m['site.rumpel.cta_desc']()}
            </p>
            <a
              href={GENERATOR_HREF}
              className="mt-6 inline-flex h-11 items-center justify-center rounded-xl bg-[rgb(204,144,92)] px-6 text-sm font-semibold text-[rgb(247,246,243)] transition hover:brightness-105"
            >
              {m['site.rumpel.hero_cta']()}
            </a>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}

export const Route = createFileRoute('/ai-rumpelstiltskin')({
  loader: () => {
    const locale = getLocale();
    return { locale };
  },
  head: ({ loaderData }) => {
    const locale = loaderData?.locale ?? 'en';
    const { canonical, alternates } = localeLinks(
      PAGE_PATH,
      locale,
      SEO_LOCALES
    );
    const cover = absoluteUrl(COVER_PATH);
    return {
      meta: [
        { title: m['site.rumpel.page_title']() },
        { name: 'description', content: m['site.rumpel.page_description']() },
        ...socialMeta({
          title: m['site.rumpel.page_title'](),
          description: m['site.rumpel.page_description'](),
          url: canonical,
          image: cover,
        }),
      ],
      links: [{ rel: 'canonical', href: canonical }, ...alternates],
    };
  },
  component: AiRumpelstiltskinPage,
});
