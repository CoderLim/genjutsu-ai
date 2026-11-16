import type { ReactNode } from 'react';

import { Link } from '@/core/i18n/navigation';

export const CHIPMUNKS_FAQ_ITEMS = [
  {
    question: 'Is the Chipmunks Dance new?',
    answer:
      'No. The routine was created in late April 2024 and posted again in April 2025. The much larger wave started in October 2026.',
  },
  {
    question: 'How many people do you need?',
    answer:
      'Three. Duos can do it by splitting the handoffs between two dancers. This page’s AI template maps all three dancers from three photos.',
  },
  {
    question: 'What song is it?',
    answer:
      'A chipmunk-voice cover of "You Spin Me Round (Like a Record)", listed on TikTok as "The Chipmunks".',
  },
  {
    question: 'Is it an official Alvin and the Chipmunks dance?',
    answer:
      "No. It's a fan routine named after the characters, made by creators, not by the films' rights holders.",
  },
  {
    question: 'Can I make it without filming?',
    answer:
      'Yes. Upload three photos on this page to restage the trio routine. Filming still works if your group is in the same place.',
  },
  {
    question: 'Why do all the videos look the same?',
    answer:
      'Because the order is fixed. Four handoffs, front position rotating in the same direction, all three rushing the camera at the end.',
  },
  {
    question: 'Do I need costumes?',
    answer:
      'No. Matching red, blue and green is enough for the reference to land.',
  },
] as const;

export const CHIPMUNKS_HOWTO_STEPS = [
  {
    name: 'Line up before you press record',
    text: 'Decide the order first — red, blue, green works, and so does left, centre, right. Keep the same order for the whole take. Phone at chest height, about 2.5 metres back, 9:16 vertical.',
  },
  {
    name: 'Stand shoulder to shoulder',
    text: 'A loose line looks accidental. Feet roughly shoulder-width, bodies angled a few degrees toward the camera, and leave half a step of space so nobody elbows anyone during the swap.',
  },
  {
    name: 'Handoff 1',
    text: 'The dancer in front takes a short solo — arms out, a small bounce — then steps back into the line while the next dancer slides forward. The step back and the slide forward happen on the same beat.',
  },
  {
    name: 'Handoffs 2 and 3',
    text: 'Same pattern, same spacing. Count them out loud on the first two run-throughs: four handoffs total, one per position change.',
  },
  {
    name: 'Handoff 4 and the finish',
    text: 'The last dancer gets the front, then all three rush the camera together. Shoot the finish wide enough that nobody leaves the frame.',
  },
] as const;

const MORE_LINKS = [
  { label: 'Can I Ride Dance AI', href: '/can-i-ride-dance-ai' },
  { label: 'Smalltown Boy dance', href: '/smalltown-boy-dance' },
  { label: 'A2O LITE NEON dance', href: '/a2o-lite-ai' },
  { label: 'Crazy Frog chase', href: '/crazy-frog-ai' },
  { label: 'Gangnam Style AI', href: '/gangnam-style-ai' },
  { label: 'Gas Station dance', href: '/gas-station-dance-ai' },
  { label: 'Hotel Lobby AI', href: '/hotel-lobby-ai' },
  { label: 'Shan Shen Bu', href: '/shan-shen-bu' },
  { label: 'Flying Car AI', href: '/flying-car-ai' },
  { label: 'Genjutsu prompt guide', href: '/genjutsu-prompts' },
  { label: 'Credit pricing', href: '/pricing' },
] as const;

const CHIPMUNKS_DANCE_AI_URL = 'https://chipmunksdanceai.net/';

const externalLinkClass =
  'font-medium text-[rgb(220,155,99)] underline-offset-4 hover:underline';

function Section({
  id,
  title,
  children,
  tone = 'plain',
}: {
  id?: string;
  title: string;
  children: ReactNode;
  tone?: 'plain' | 'band';
}) {
  const inner = (
    <div className="mx-auto max-w-5xl px-4 py-14 md:px-5 md:py-20">
      <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
        {title}
      </h2>
      <div className="mt-5 max-w-3xl space-y-4 text-sm leading-7 text-white/48 sm:text-base">
        {children}
      </div>
    </div>
  );

  if (tone === 'band') {
    return (
      <section id={id} className="border-y border-white/7 bg-white/[0.018]">
        {inner}
      </section>
    );
  }

  return <section id={id}>{inner}</section>;
}

export function ChipmunksDanceSeoSections() {
  return (
    <div className="text-left">
      <Section id="what-is" title="What Is the Chipmunks Dance?" tone="band">
        <p>
          It&apos;s a three-person dance — always exactly three. The three
          dancers hold a tight line, and the front position keeps changing
          hands: one steps up for a short solo, slides back into the line, and
          the next one takes the front. Eight seconds of choreography is really
          four handoffs and a finish.
        </p>
        <p>
          The name is a casting joke. Three people, in red, blue and green,
          moving to a squeaky chipmunk vocal reads instantly as Alvin, Simon and
          Theodore — you don&apos;t need costumes for people to get it. It
          isn&apos;t an official Alvin and the Chipmunks routine and no one
          involved with the films made it; it&apos;s a fan dance that borrowed
          the characters&apos; format.
        </p>
      </Section>

      <Section id="origin" title="Where the Trend Came From">
        <p>
          <strong className="font-medium text-white/70">
            Late April 2024 — the trio that made it.
          </strong>{' '}
          The routine is credited to the ICM Triplets (@icm_triplets). Their
          post carried the note dc: us (dance credit: us) and the tags
          #thechipmunks, #thechipettes and #rightround. TikTok lists the audio
          as &quot;You Spin Me Round (Like A Record)&quot; by The Chipmunks.
        </p>
        <p>
          <strong className="font-medium text-white/70">
            April 2025 — the follow-up.
          </strong>{' '}
          A year later the same trio posted it again, captioned &quot;Here I
          come&quot;, tagged #alvin, #simon and #theodore. Dancers who copied it
          started crediting them by name, which is when the choreography settled
          into the version people use now.
        </p>
        <p>
          <strong className="font-medium text-white/70">
            October 2026 — the comeback.
          </strong>{' '}
          In mid-October the dance jumped out of dance accounts. Siblings,
          roommates and friend groups filmed it, usually in red, blue and green.
          One of the versions that carried the wave was posted on 17 October by
          @athenaa_c with her two siblings.
        </p>
        <p>
          <strong className="font-medium text-white/70">
            Late October 2026 — Halloween.
          </strong>{' '}
          The routine comes with a group costume built in, so trios used it as
          their costume reveal in the run-up to 31 October. That is why search
          interest kept climbing after the first spike instead of fading.
        </p>
      </Section>

      <Section
        id="how-to"
        title="How to Do the Chipmunks Dance: Step by Step"
        tone="band"
      >
        {CHIPMUNKS_HOWTO_STEPS.map((step) => (
          <div key={step.name}>
            <h3 className="text-base font-semibold text-white/78 sm:text-lg">
              {step.name}
            </h3>
            <p className="mt-2">{step.text}</p>
          </div>
        ))}
        <p>
          <strong className="font-medium text-white/70">
            One-take checklist.
          </strong>{' '}
          Mark the floor with tape or shoes, run the handoffs twice with no
          music, then film three takes and keep the cleanest.
        </p>
      </Section>

      <Section id="chipmunks-dance-ai" title="Make a Chipmunks Dance AI Video">
        <p>
          If your trio is in three different cities, or nobody has time to
          rehearse, you can build the routine from photos instead of filming.
          Duos who film in person can still split the four handoffs and drop the
          third solo — the AI path on this page maps the full three-person
          template. If you want a page built only for this trend, there&apos;s
          also{' '}
          <a
            href={CHIPMUNKS_DANCE_AI_URL}
            target="_blank"
            rel="noopener noreferrer"
            className={externalLinkClass}
          >
            Chipmunks Dance AI
          </a>
          .
        </p>
        <p>
          <strong className="font-medium text-white/70">
            Step 1: Upload three photos.
          </strong>{' '}
          One clear, front-facing shot per dancer — left, center (front spot),
          and right from the opening line-up. Face and upper body visible, even
          light, no sunglasses or heavy filters.
        </p>
        <p>
          <strong className="font-medium text-white/70">
            Step 2: Keep the trio template.
          </strong>{' '}
          The three positions are locked on this page, so the roles map the same
          way every run.
        </p>
        <p>
          <strong className="font-medium text-white/70">
            Step 3: Generate and download.
          </strong>{' '}
          The MP4 is silent by design. Add the sound where you post it, from
          that app&apos;s licensed music library.
        </p>
        <p>
          <strong className="font-medium text-white/70">
            Who you can upload.
          </strong>{' '}
          Only yourself and people who have explicitly agreed. Never upload a
          photo of a stranger, a child, or the actors and characters from the
          films — that&apos;s a permission problem and, in many countries, a
          legal one.
        </p>
      </Section>

      <Section id="song" title="The Song Behind the Trend" tone="band">
        <p>
          The audio is a chipmunk-voice cover of &quot;You Spin Me Round (Like a
          Record)&quot;, the 1984 Dead or Alive single, credited on TikTok as
          &quot;The Chipmunks&quot;. The sped-up, high-pitched version is what
          makes the dance recognisable in half a second — a clean recording of
          the original doesn&apos;t land the same way.
        </p>
        <p>
          This page doesn&apos;t bundle the track. Videos download silent, and
          you attach the sound inside TikTok, Reels or Shorts, where the licence
          and the available versions are handled by the platform and vary by
          country.
        </p>
      </Section>

      <Section id="costume" title="The Red, Blue and Green Casting">
        <p>
          You don&apos;t need official merchandise to make the reference land:
        </p>
        <ul className="list-disc space-y-2 pl-5">
          <li>
            <strong className="font-medium text-white/70">
              Three colours, one per person.
            </strong>{' '}
            Red, blue and green in that order is the reading everyone
            recognises.
          </li>
          <li>
            <strong className="font-medium text-white/70">
              Hoodies and sweaters beat costumes.
            </strong>{' '}
            The line-up reads better in plain colour blocks than in plush ears
            and tails.
          </li>
          <li>
            <strong className="font-medium text-white/70">
              Chipettes are an option.
            </strong>{' '}
            A second trio in pink, purple and green is the standard way to
            double the line-up — and it&apos;s what a lot of Halloween posts
            did.
          </li>
          <li>
            <strong className="font-medium text-white/70">
              No costumes at all still works.
            </strong>{' '}
            Matching colours on three friends is enough; the joke is the trio,
            not the fur.
          </li>
        </ul>
      </Section>

      <section id="faq" className="border-y border-white/7 bg-white/[0.018]">
        <div className="mx-auto max-w-5xl px-4 py-14 md:px-5 md:py-20">
          <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
            Chipmunks Dance FAQ
          </h2>
          <div className="mt-7 divide-y divide-white/7 rounded-2xl border border-white/8 bg-white/[0.02] px-5 sm:px-7">
            {CHIPMUNKS_FAQ_ITEMS.map((item) => (
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
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-14 md:px-5 md:pb-16">
        <div className="rounded-[26px] border border-white/8 bg-white/[0.02] p-6 sm:p-8">
          <h2 className="text-2xl font-semibold tracking-tight">
            More Dance Trends
          </h2>
          <div className="mt-5 flex flex-wrap gap-3">
            {MORE_LINKS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="rounded-full border border-white/10 bg-white/[0.03] px-4 py-2 text-sm text-white/70 transition hover:border-[rgba(204,144,92,0.35)] hover:text-[rgb(220,155,99)]"
              >
                {item.label}
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-4 pb-12 md:px-5">
        <p className="border-t border-white/8 pt-8 text-sm text-white/40">
          Independent inspired tool; not affiliated with Bagdasarian
          Productions, the Chipmunks characters or the recording rights holders.
        </p>
      </section>
    </div>
  );
}
