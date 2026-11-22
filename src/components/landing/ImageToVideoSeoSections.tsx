import { ArrowRight, CheckCircle2, Film, Images, Sparkles } from 'lucide-react';

import { Link } from '@/core/i18n/navigation';
import {
  IMAGE_TO_VIDEO_FAQS,
  IMAGE_TO_VIDEO_STEPS,
} from '@/modules/image-to-video/seo';

/**
 * Keep HowTo/FAQ JSON-LD in the route sourced from this same visible copy.
 * No model-independent promise about watermark, free output, render speed,
 * commercial rights, or fixed duration is made here.
 */
const USE_CASES = [
  {
    name: 'Social posts',
    text: 'A still product shot or portrait can feel static in a feed. A gentle zoom or pan gives it movement for Reels, Shorts, and other posts without having to record new footage.',
  },
  {
    name: 'Product listings',
    text: 'Turn a clean product photo into a short showcase. Subtle camera motion can help a listing stand out, though generated views are not a substitute for accurate product photos.',
  },
  {
    name: 'Old family photos',
    text: 'Give a scanned family picture a gentle push-in or a small atmospheric movement. Keep the motion restrained if preserving the original faces matters more than making the scene dramatic.',
  },
  {
    name: 'Real estate',
    text: 'A slow pan across an exterior or interior image can give a listing page a sense of movement without a dedicated video shoot. Review the result for invented structural details.',
  },
  {
    name: 'Covers and thumbnails',
    text: 'Make a moving background for a channel intro, book announcement, or promotional cover. Starting from your finished image helps preserve the overall composition.',
  },
  {
    name: 'Ads and landing pages',
    text: 'Try a few camera directions on the same creative, then keep the one that works best for your audience. Each generated variation uses credits, so start with a simple motion idea.',
  },
] as const;

const MOTION_TIPS = [
  {
    name: 'Start with a sharp, evenly lit photo.',
    text: 'Motion can magnify blur, grain, and visual artifacts that were barely noticeable in the original.',
  },
  {
    name: 'Leave room around the subject.',
    text: 'A pan or zoom can crop the edges. Give faces, products, and other important details some breathing room.',
  },
  {
    name: 'Describe the camera, not just the mood.',
    text: '“Slow dolly forward” or “camera pans left” gives the model a clearer instruction than “make it cinematic”.',
  },
  {
    name: 'Keep faces and hands under control.',
    text: 'Fast motion and extreme close-ups are harder to keep consistent. Try a wider view and gentler movement.',
  },
  {
    name: 'Try more than one generation.',
    text: 'The same image and prompt can produce different results. Compare a few runs when the shot really matters.',
  },
] as const;

const headingClass =
  'text-2xl font-semibold tracking-tight text-foreground sm:text-[28px]';
const paragraphClass = 'mt-4 text-base leading-8 text-muted-foreground';
const articleLinkClass =
  'font-medium text-primary underline underline-offset-4 hover:opacity-80';

export function ImageToVideoSeoSections() {
  return (
    <div className="mx-auto mt-20 w-full max-w-[1000px] space-y-16 pb-12 sm:mt-24 sm:space-y-20">
      <section aria-labelledby="how-image-to-video-works" id="how-it-works">
        <h2 id="how-image-to-video-works" className={headingClass}>
          How to turn a photo into a video
        </h2>
        <p className={paragraphClass}>Three steps, no software to install.</p>
        <ol className="mt-8 grid gap-4 md:grid-cols-3">
          {IMAGE_TO_VIDEO_STEPS.map((item, index) => (
            <li
              id={`step-${index + 1}`}
              key={item.name}
              className="border-border/70 bg-card/50 rounded-2xl border p-6"
            >
              <span className="bg-primary/15 text-primary inline-flex size-8 items-center justify-center rounded-full text-sm font-semibold">
                {index + 1}
              </span>
              <h3 className="mt-4 text-lg font-semibold">{item.name}</h3>
              <p className="text-muted-foreground mt-3 text-sm leading-7">
                {item.text}
              </p>
            </li>
          ))}
        </ol>
      </section>

      <section aria-labelledby="image-to-video-names">
        <h2 id="image-to-video-names" className={headingClass}>
          Photo to video, image to video, picture to video — the same job
        </h2>
        <p className={paragraphClass}>
          People look for this feature under different names, but the job is the
          same: give a still image movement. Whether you call it photo to video,
          image to video, or picture to video, you start from a frame you have
          already chosen instead of generating a whole scene from scratch.
        </p>
        <p className={paragraphClass}>
          What changes is the motion you ask for. A camera can push closer,
          drift across a room, or rise slowly above the subject. A person might
          turn their head, blink, or feel wind moving through their hair. The
          model interprets those instructions and creates a new short clip. The
          starting picture helps guide the result, although fine details are not
          guaranteed to remain perfectly unchanged.
        </p>
      </section>

      <section aria-labelledby="image-to-video-uses">
        <h2 id="image-to-video-uses" className={headingClass}>
          What people use it for
        </h2>
        <p className={paragraphClass}>
          You do not have to film something new every time you want movement.
          Start with an image you already like and think about what a few
          seconds of motion would add.
        </p>
        <div className="mt-8 grid gap-x-10 gap-y-7 sm:grid-cols-2">
          {USE_CASES.map((item) => (
            <div key={item.name} className="border-primary/45 border-l-2 pl-4">
              <h3 className="text-base font-semibold">{item.name}</h3>
              <p className="text-muted-foreground mt-2 text-sm leading-7">
                {item.text}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section aria-labelledby="image-vs-text-to-video">
        <h2 id="image-vs-text-to-video" className={headingClass}>
          Image to video, or text to video?
        </h2>
        <p className={paragraphClass}>
          They solve different problems.{' '}
          <strong className="text-foreground font-semibold">
            Image to video
          </strong>{' '}
          gives the model a picture to work from. It is useful when you already
          have a portrait, product, illustration, or scene and want to keep its
          overall look while adding motion. Composition, lighting, and the
          subject all have a starting point.
        </p>
        <p className={paragraphClass}>
          <strong className="text-foreground font-semibold">
            Text to video
          </strong>{' '}
          starts from a description instead. The model has more freedom to
          invent framing, lighting, and subject details. If you have no image
          yet and want to explore a scene from scratch, start with our{' '}
          <Link href="/" className={articleLinkClass}>
            text to video generator
          </Link>
          . The two workflows can complement each other, but an existing image
          is usually the better starting point when a specific composition
          matters.
        </p>
      </section>

      <section aria-labelledby="image-to-video-tips">
        <h2 id="image-to-video-tips" className={headingClass}>
          Five ways to get a better result
        </h2>
        <ol className="mt-6 space-y-5">
          {MOTION_TIPS.map((tip, index) => (
            <li key={tip.name} className="flex items-start gap-4">
              <span className="border-primary/40 text-primary mt-1 flex size-7 shrink-0 items-center justify-center rounded-full border text-xs font-semibold">
                {index + 1}
              </span>
              <div>
                <h3 className="font-semibold">{tip.name}</h3>
                <p className="text-muted-foreground mt-1 text-sm leading-7">
                  {tip.text}
                </p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section
        aria-labelledby="image-to-video-free"
        className="border-border/70 bg-card/40 rounded-2xl border p-6 sm:p-8"
      >
        <h2 id="image-to-video-free" className={headingClass}>
          Is photo to video free?
        </h2>
        <p className={paragraphClass}>
          You can open the generator and explore the controls without paying up
          front. Generating a video consumes credits, and the required amount
          changes with the model, duration, and resolution. The estimated credit
          cost is shown in the editor before you submit a job.
        </p>
        <p className={paragraphClass}>
          If your account has trial or promotional credits, you can use those
          toward an eligible generation. Otherwise, you can purchase credits as
          needed. There is no blanket promise of a free video allowance, fixed
          render time, or watermark-free output for every model.{' '}
          <Link href="/pricing" className={articleLinkClass}>
            Check available credit packs
          </Link>{' '}
          before you generate.
        </p>
      </section>

      <section aria-labelledby="image-to-video-faq" id="faq">
        <h2 id="image-to-video-faq" className={headingClass}>
          Frequently asked questions
        </h2>
        <div className="divide-border/70 border-border/70 mt-7 divide-y border-y">
          {IMAGE_TO_VIDEO_FAQS.map((item) => (
            <div key={item.question} className="py-5">
              <h3 className="text-base font-semibold">{item.question}</h3>
              <p className="text-muted-foreground mt-2 text-sm leading-7">
                {item.answer}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section aria-labelledby="image-to-video-related">
        <h2 id="image-to-video-related" className={headingClass}>
          Related one-photo video tools
        </h2>
        <p className={paragraphClass}>
          Prefer a fixed scene instead of writing your own motion prompt? These
          Genjutsu pages lock a ready-made look and still start from a photo.
        </p>
        <ul className="mt-6 flex flex-wrap gap-x-6 gap-y-3 text-sm">
          <li>
            <Link href="/enzo-fernandez-ai" className={articleLinkClass}>
              Enzo Fernandez AI
            </Link>
          </li>
          <li>
            <Link href="/day-of-the-dead-ai-video" className={articleLinkClass}>
              Day of the Dead AI Video
            </Link>
          </li>
          <li>
            <Link href="/jatayu-video-prompt" className={articleLinkClass}>
              Jatayu video prompt
            </Link>
          </li>
          <li>
            <Link href="/video-face-swap" className={articleLinkClass}>
              Video Face Swap
            </Link>
          </li>
        </ul>
      </section>

      <section className="border-primary/20 bg-primary/[0.06] rounded-3xl border px-6 py-9 text-center sm:px-12 sm:py-12">
        <div className="text-primary mx-auto mb-4 flex w-fit items-center gap-2 text-xs font-semibold tracking-wider uppercase">
          <Sparkles className="size-4" />
          Ready to animate a photo?
        </div>
        <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
          Your next clip can start from one good photo.
        </h2>
        <p className="text-muted-foreground mx-auto mt-4 max-w-2xl text-sm leading-7">
          Upload an image, write a short motion prompt, and compare the credit
          estimate before generating. If you need more credits, choose a pack
          that fits your plans — you do not need to buy a subscription just to
          open the editor.
        </p>
        <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
          <a
            href="#generator"
            className="border-border bg-background hover:bg-accent inline-flex items-center gap-2 rounded-full border px-5 py-2.5 text-sm font-semibold transition"
          >
            <Images className="size-4" />
            Upload a photo
          </a>
          <Link
            href="/pricing"
            className="bg-primary text-primary-foreground inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold transition hover:opacity-90"
          >
            <Film className="size-4" />
            View credit packs
            <ArrowRight className="size-4" />
          </Link>
        </div>
        <p className="text-muted-foreground mt-4 flex items-center justify-center gap-1.5 text-xs">
          <CheckCircle2 className="size-3.5" />
          Review the credit estimate before generating
        </p>
      </section>
    </div>
  );
}
