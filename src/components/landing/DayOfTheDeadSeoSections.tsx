import { Link } from '@/core/i18n/navigation';
import { m } from '@/paraglide/messages.js';

export const DOTD_FAQ_ITEMS = [
  {
    question: 'What is a Day of the Dead AI video?',
    answer:
      'A photo rebuilt as a short vertical clip inside the visual language of Día de los Muertos — sugar-skull makeup, marigolds, papel picado, candlelight, an ofrenda in the background. One upload, about a minute.',
  },
  {
    question: 'Can I use a photo of my pet?',
    answer:
      "Yes — and it's the easier of the two. A pet photo has no likeness question attached, and the effect reads clearly on a single cat or dog. One animal per photo, head toward the camera.",
  },
  {
    question: 'Can I use a photo of a relative who has passed away?',
    answer:
      "Not under our current rules. We accept only photos of yourself, or of people who gave you written permission — and someone who has died can't give that. Pet photos are the exception: your animal is yours, so those are fine. If you want to mark the holiday for a person, the version that works is a photo of yourself in their honour.",
  },
  {
    question: 'How long does it take?',
    answer:
      "About a minute for the first version. If the clip doesn't land, rewrite the scene choice (person vs pet) rather than re-uploading a different photo — the locked prompt does most of the work.",
  },
  {
    question: 'What does it cost?',
    answer:
      'Free to try. Resolution and length limits are on the pricing page.',
  },
  {
    question: 'When should I post it?',
    answer:
      'Day of the Dead is November 1–2. Search interest peaks in the last week of October and falls off in November, so the clip wants to be published before October 31 to travel.',
  },
  {
    question: 'Is Día de los Muertos the same as Day of the Dead?',
    answer:
      'Yes — same holiday, same dates. Día de los Muertos is the Spanish name; Day of the Dead is the English one. Both return the same results here.',
  },
] as const;

/** FAQ subset for FAQPage JSON-LD (must match visible answers character-wise where shared). */
export const DOTD_FAQ_JSON_LD_ITEMS = [
  DOTD_FAQ_ITEMS[0],
  DOTD_FAQ_ITEMS[1],
  DOTD_FAQ_ITEMS[2],
  {
    question: 'When should I post a Day of the Dead AI video?',
    answer:
      'Day of the Dead is November 1–2. Search interest peaks in the last week of October and falls off in November, so publish before October 31.',
  },
  DOTD_FAQ_ITEMS[6],
] as const;

const PROMPT_IDEAS = [
  {
    title: 'Self portrait, classic',
    text: 'sugar skull makeup with marigold petals on the forehead, candlelit ofrenda behind, warm gold light, slow push-in',
  },
  {
    title: 'Catrina',
    text: 'Catrina costume with a black lace veil, papel picado overhead, dusk, soft haze',
  },
  {
    title: 'Couple',
    text: 'Catrina and Catrín outfits, candlelit street at night, marigold garlands, slow dolly',
  },
  {
    title: 'Dog',
    text: 'a dog standing in front of an ofrenda, marigold garlands, candles glowing, shallow depth of field',
  },
  {
    title: 'Cat',
    text: 'a cat with a small painted sugar skull on its forehead, marigolds around it, candlelight, close-up',
  },
  {
    title: 'Time transition',
    text: 'black-and-white portrait dissolving into gold marigold petals, slow fade',
  },
] as const;

const COMPARE_ROWS = [
  [
    'What you bring',
    'One photo + a written scene',
    'Footage or a stock clip, plus a photo',
  ],
  ['Time to first version', 'About a minute', 'An hour-plus'],
  ['Skills needed', 'None', 'Masking, keyframes, colour grading'],
  [
    'Makeup and costume',
    'Part of the prompt',
    'Real makeup, or an hour in Photoshop',
  ],
  ['Result', 'Same subject, holiday scene', 'Full control, full effort'],
] as const;

export function DayOfTheDeadSeoSections() {
  return (
    <div className="mx-auto max-w-3xl space-y-16 px-4 pb-20 text-left md:px-5">
      <section className="space-y-4">
        <h2 className="text-2xl font-semibold tracking-tight text-white/92 sm:text-3xl">
          What a Day of the Dead AI video is
        </h2>
        <p className="text-base leading-7 text-white/58">
          The holiday is about remembering — an ofrenda, marigolds, candlelight,
          sugar skulls, papel picado. A Día de los Muertos AI video takes a
          single photo and rebuilds that photo inside those elements: the face
          gets sugar-skull makeup, the background becomes a candlelit ofrenda,
          the light turns warm and gold.
        </p>
        <p className="text-base leading-7 text-white/58">
          The searches split in two. One half wants a clip or a picture to post
          — marigold animations, Catrina illustrations, a track to lay under it.
          The other half wants the tool. If you&apos;re in the second half, the
          generator at the top of this page is the whole job.
        </p>
      </section>

      <section className="space-y-6">
        <h2 className="text-2xl font-semibold tracking-tight text-white/92 sm:text-3xl">
          How to make a Day of the Dead AI video
        </h2>
        <div className="space-y-5">
          <div>
            <h3 className="text-lg font-medium text-white/85">
              1. Pick your photo — yourself, or your pet
            </h3>
            <p className="mt-2 text-base leading-7 text-white/58">
              One face, front-facing, eyes open, even light, at least 512 px on
              the short side. For a pet: one animal, head toward the camera,
              eyes visible, filling a decent part of the frame. One subject per
              generation — group shots don&apos;t work.
            </p>
          </div>
          <div>
            <h3 className="text-lg font-medium text-white/85">
              2. Choose person or pet
            </h3>
            <p className="mt-2 text-base leading-7 text-white/58">
              This page locks a holiday scene for each subject type. Pick Person
              or Pet so the makeup, ofrenda, and light match what you uploaded.
            </p>
          </div>
          <div>
            <h3 className="text-lg font-medium text-white/85">
              3. Pick 9:16 and generate
            </h3>
            <p className="mt-2 text-base leading-7 text-white/58">
              A single beat reads better than a long one. Export vertical, about
              8–15 seconds, 1080p when you can.
            </p>
          </div>
          <div>
            <h3 className="text-lg font-medium text-white/85">
              4. Add music you have the rights to
            </h3>
            <p className="mt-2 text-base leading-7 text-white/58">
              Use your own track or a licensed one. Don&apos;t pull the audio
              off someone else&apos;s video — that&apos;s the fastest way to get
              it taken down on TikTok or Reels.
            </p>
          </div>
        </div>
        <p className="text-sm font-medium text-[rgb(220,155,99)]">
          <a href="#generator" className="underline-offset-4 hover:underline">
            Try the generator on this page
          </a>
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold tracking-tight text-white/92 sm:text-3xl">
          Prompt ideas that work
        </h2>
        <p className="text-base leading-7 text-white/58">
          The generator on this page uses a locked holiday prompt. These ideas
          describe the look if you rebuild the scene elsewhere — change the
          details to match your photo.
        </p>
        <ul className="list-disc space-y-3 pl-5 text-base leading-7 text-white/58">
          {PROMPT_IDEAS.map((item) => (
            <li key={item.title}>
              <strong className="text-white/80">{item.title}:</strong>{' '}
              {item.text}
            </li>
          ))}
        </ul>
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold tracking-tight text-white/92 sm:text-3xl">
          Day of the Dead AI videos for pets
        </h2>
        <p className="text-base leading-7 text-white/58">
          Every November people set out food, water and a candle for a pet that
          has died — that part of the holiday is as old as the ofrenda itself,
          and it&apos;s the easiest version of this video to make. A pet photo
          has no likeness question attached: it&apos;s your animal, your photo.
        </p>
        <h3 className="text-lg font-medium text-white/85">
          Pet photos that work
        </h3>
        <ul className="list-disc space-y-2 pl-5 text-base leading-7 text-white/58">
          <li>The head takes up at least a third of the frame</li>
          <li>
            Eyes visible and looking toward the camera — not turned away, not
            blinking
          </li>
          <li>Daylight or a room lamp, not a flash at night</li>
          <li>One animal only</li>
        </ul>
        <h3 className="text-lg font-medium text-white/85">
          Pet photos that don&apos;t
        </h3>
        <ul className="list-disc space-y-2 pl-5 text-base leading-7 text-white/58">
          <li>A night shot where the eyes reflect light back</li>
          <li>A small animal somewhere in a large room</li>
          <li>Pet and owner together — pick one subject</li>
          <li>Blurry motion, or a head half out of frame</li>
        </ul>
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold tracking-tight text-white/92 sm:text-3xl">
          Doing it in a generator vs. editing it by hand
        </h2>
        <div className="overflow-x-auto rounded-xl border border-white/10">
          <table className="w-full min-w-[520px] text-left text-sm">
            <thead className="bg-white/[0.04] text-white/70">
              <tr>
                <th className="px-3 py-2 font-medium" />
                <th className="px-3 py-2 font-medium">
                  Image-to-video generator
                </th>
                <th className="px-3 py-2 font-medium">
                  Editing a holiday clip by hand
                </th>
              </tr>
            </thead>
            <tbody className="text-white/55">
              {COMPARE_ROWS.map((row) => (
                <tr key={row[0]} className="border-t border-white/8">
                  <td className="px-3 py-2 font-medium text-white/75">
                    {row[0]}
                  </td>
                  <td className="px-3 py-2">{row[1]}</td>
                  <td className="px-3 py-2">{row[2]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold tracking-tight text-white/92 sm:text-3xl">
          ¿Cómo hacer un video de Día de los Muertos con IA?
        </h2>
        <p className="text-base leading-7 text-white/58">
          Sube una foto tuya de frente, o una foto de tu mascota, elige persona
          o mascota en el generador, y elige formato vertical 9:16. El clip se
          genera en un minuto. Los cuatro pasos completos están arriba, en
          inglés. Solo se aceptan fotos propias o de tu mascota — no de otras
          personas sin permiso por escrito.
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold tracking-tight text-white/92 sm:text-3xl">
          Before you upload
        </h2>
        <h3 className="text-lg font-medium text-white/85">
          What makes a good source photo
        </h3>
        <ul className="list-disc space-y-2 pl-5 text-base leading-7 text-white/58">
          <li>One face or one animal, facing the camera</li>
          <li>Eyes open and visible</li>
          <li>Even light, no hard side shadows</li>
          <li>512 px minimum on the short side</li>
          <li>No group shots — one subject per generation</li>
        </ul>
        <h3 className="text-lg font-medium text-white/85">
          What you can and can&apos;t upload
        </h3>
        <ul className="list-disc space-y-2 pl-5 text-base leading-7 text-white/58">
          <li>
            Only photos of yourself, or of people who gave you written
            permission. Everyone in the photo must be 18 or older.
          </li>
          <li>
            Your own pet&apos;s photos are fine — that&apos;s what most of this
            page is about.
          </li>
          <li>
            No celebrities, public figures, or anyone else&apos;s likeness.
          </li>
          <li>No nudity, no sexual content, no violence, no hate content.</li>
          <li>Every clip is watermarked as AI-generated.</li>
        </ul>
        <p className="text-base leading-7 text-white/58">
          Uploads that break these rules are rejected and refunded. Full rules
          are in our{' '}
          <Link
            href="/terms-of-service"
            className="text-[rgb(220,155,99)] underline-offset-4 hover:underline"
          >
            Acceptable Use Policy
          </Link>
          .
        </p>
      </section>

      <section className="space-y-5">
        <h2 className="text-2xl font-semibold tracking-tight text-white/92 sm:text-3xl">
          Day of the Dead AI video FAQ
        </h2>
        {DOTD_FAQ_ITEMS.map((item) => (
          <div key={item.question}>
            <h3 className="text-lg font-medium text-white/85">
              {item.question}
            </h3>
            <p className="mt-2 text-base leading-7 text-white/58">
              {item.question === 'What does it cost?' ? (
                <>
                  Free to try. Resolution and length limits are on the{' '}
                  <Link
                    href="/pricing"
                    className="text-[rgb(220,155,99)] underline-offset-4 hover:underline"
                  >
                    pricing page
                  </Link>
                  .
                </>
              ) : (
                item.answer
              )}
            </p>
          </div>
        ))}
      </section>

      <section className="space-y-4 border-t border-white/10 pt-12">
        <ul className="list-disc space-y-2 pl-5 text-base leading-7 text-white/58">
          <li>{m['site.dotd.cta_tip1']()}</li>
          <li>{m['site.dotd.cta_tip2']()}</li>
          <li>{m['site.dotd.cta_tip3']()}</li>
        </ul>
        <h2 className="text-2xl font-semibold tracking-tight text-white/92 sm:text-3xl">
          {m['site.dotd.cta_title']()}
        </h2>
        <p className="text-base leading-7 text-white/58">
          {m['site.dotd.cta_desc']()}
        </p>
        <a
          href="#generator"
          className="inline-flex rounded-lg bg-[rgb(204,144,92)] px-4 py-2 text-sm font-semibold text-[rgb(247,246,243)]"
        >
          {m['site.dotd.add_photo']()}
        </a>
      </section>
    </div>
  );
}
