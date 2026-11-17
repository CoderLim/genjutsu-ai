import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { Check, Copy } from 'lucide-react';
import { toast } from 'sonner';

import { Link } from '@/core/i18n/navigation';
import { cn } from '@/lib/cn';
import { JatayuGeneratorPanel } from '@/components/landing/JatayuGeneratorPanel';

import {
  buildJatayuGeneratorPrompt,
  JATAYU_DEMO_POSTER,
  JATAYU_DEMO_VIDEO,
  JATAYU_EXPANDED_PROMPT,
  JATAYU_FAQ_ITEMS,
  JATAYU_GENERATOR_DEFAULTS,
  JATAYU_NEGATIVE_PROMPT,
  JATAYU_ORIGINAL_PUBLIC_PROMPT,
  type JatayuFormatId,
} from './jatayu-video-prompt-content';

async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      const el = document.createElement('textarea');
      el.value = text;
      el.setAttribute('readonly', '');
      el.style.position = 'fixed';
      el.style.left = '-9999px';
      document.body.appendChild(el);
      el.select();
      const ok = document.execCommand('copy');
      document.body.removeChild(el);
      return ok;
    } catch {
      return false;
    }
  }
}

function CopyButton({
  text,
  label = 'Copy',
  onCopied,
  className,
}: {
  text: string;
  label?: string;
  onCopied?: () => void;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);

  return (
    <button
      type="button"
      className={cn(
        'inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-[rgb(204,144,92)] px-4 text-sm font-semibold text-[rgb(247,246,243)] transition hover:brightness-105',
        className
      )}
      onClick={async () => {
        const ok = await copyText(text);
        if (!ok) {
          toast.error('Could not copy — select the text and copy manually');
          return;
        }
        setCopied(true);
        onCopied?.();
        window.setTimeout(() => setCopied(false), 1800);
      }}
    >
      {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
      {copied ? 'Copied' : label}
    </button>
  );
}

function PromptBlock({
  text,
  footer,
  highlight,
  id,
  showCopy = true,
  quote,
}: {
  text: string;
  footer?: ReactNode;
  highlight?: boolean;
  id?: string;
  showCopy?: boolean;
  quote?: boolean;
}) {
  return (
    <div
      id={id}
      className={cn(
        'rounded-2xl border border-white/10 bg-black/25 p-4 transition-[box-shadow,background-color] duration-500 sm:p-5',
        quote && 'border-l-4 border-l-[rgba(204,144,92,0.55)]',
        highlight &&
          'bg-[rgba(204,144,92,0.12)] shadow-[0_0_0_2px_rgba(204,144,92,0.55)]'
      )}
    >
      <pre
        className={cn(
          'font-sans text-sm leading-7 whitespace-pre-wrap text-white/80 select-text sm:text-[15px]',
          quote && 'text-white/72 italic'
        )}
      >
        {text}
      </pre>
      {footer ? (
        <div className="mt-3 space-y-1.5 text-xs leading-5 text-white/40">
          {footer}
        </div>
      ) : null}
      {showCopy ? (
        <div className="mt-4">
          <CopyButton text={text} />
        </div>
      ) : null}
    </div>
  );
}

function OptionGroup<T extends string>({
  legend,
  name,
  value,
  onChange,
  options,
}: {
  legend: string;
  name: string;
  value: T;
  onChange: (next: T) => void;
  options: ReadonlyArray<{ id: T; label: string }>;
}) {
  const groupId = useId();
  return (
    <fieldset className="rounded-2xl border border-white/8 bg-white/[0.02] p-4">
      <legend className="px-1 text-sm font-semibold text-white/85">
        {legend}
      </legend>
      <div className="mt-3 space-y-2">
        {options.map((opt) => {
          const inputId = `${groupId}-${opt.id}`;
          return (
            <label
              key={opt.id}
              htmlFor={inputId}
              className="flex cursor-pointer items-center gap-2.5 text-sm text-white/70"
            >
              <input
                id={inputId}
                type="radio"
                name={name}
                checked={value === opt.id}
                onChange={() => onChange(opt.id)}
                className="accent-[rgb(204,144,92)]"
              />
              {opt.label}
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

function JatayuPromptGenerator() {
  const [format, setFormat] = useState<JatayuFormatId>(
    JATAYU_GENERATOR_DEFAULTS.format
  );
  const [distantBirds, setDistantBirds] = useState(
    JATAYU_GENERATOR_DEFAULTS.distantBirds
  );
  const [lightning, setLightning] = useState(
    JATAYU_GENERATOR_DEFAULTS.lightning
  );

  const prompt = buildJatayuGeneratorPrompt({
    format,
    distantBirds,
    lightning,
  });

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-3">
        <OptionGroup
          legend="Format"
          name="jatayu-format"
          value={format}
          onChange={setFormat}
          options={[
            { id: '9:16', label: '9:16' },
            { id: '1:1', label: '1:1' },
          ]}
        />
        <OptionGroup
          legend="Distant birds"
          name="jatayu-birds"
          value={distantBirds ? 'on' : 'off'}
          onChange={(next) => setDistantBirds(next === 'on')}
          options={[
            { id: 'on', label: 'On' },
            { id: 'off', label: 'Off' },
          ]}
        />
        <OptionGroup
          legend="Lightning in the sky"
          name="jatayu-lightning"
          value={lightning ? 'on' : 'off'}
          onChange={(next) => setLightning(next === 'on')}
          options={[
            { id: 'off', label: 'Off' },
            { id: 'on', label: 'On' },
          ]}
        />
      </div>

      <PromptBlock text={prompt} />

      <p className="text-sm leading-6 text-white/45">
        Built in your browser from the prompt above — nothing is stored, nothing
        to sign up for. If you want a different mood or a different scene,
        change the prompt yourself; this tool only adjusts these three details.
      </p>
    </div>
  );
}

export function JatayuVideoPromptSeoSections() {
  const masterRef = useRef<HTMLElement | null>(null);
  const [highlightMaster, setHighlightMaster] = useState(false);

  useEffect(() => {
    if (!highlightMaster) return;
    const t = window.setTimeout(() => setHighlightMaster(false), 2200);
    return () => window.clearTimeout(t);
  }, [highlightMaster]);

  const onHeroCopy = () => {
    toast.success('Prompt copied');
    setHighlightMaster(true);
    masterRef.current?.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
    });
  };

  return (
    <>
      <section className="mx-auto max-w-3xl px-4 pt-20 pb-10 text-center sm:pt-24 md:px-5">
        <h1 className="text-[34px] leading-[1.08] font-bold tracking-[-1.4px] text-white sm:text-[44px] md:text-[52px]">
          Jatayu AI Video Prompt (Free, Copy &amp; Paste)
        </h1>
        <p className="mx-auto mt-5 max-w-2xl text-left text-[15px] leading-7 text-white/62 sm:text-base">
          Turn a short rooftop clip into the Ramayana eagle scene. The setup
          spreading on Instagram right now: you stand in frame, and a giant
          golden-brown eagle rises behind you and spreads its wings. Below are
          two prompts — the original public version, reproduced word for word
          with its source, and our longer expanded version with camera and
          negative-prompt detail. Both are free to copy; no follow, no comment,
          no DM.
        </p>

        <div className="mt-7 flex flex-col items-center gap-2">
          <CopyButton
            text={JATAYU_EXPANDED_PROMPT}
            label="Copy Master Prompt"
            onCopied={onHeroCopy}
            className="h-11 px-6"
          />
        </div>
        <p className="mt-4 text-xs text-white/35">
          Updated 17 Nov 2026 · Original public prompt + our expanded version ·
          Nothing stored, no login
        </p>
      </section>

      <section className="mx-auto max-w-7xl px-4 pb-12 md:px-5">
        <JatayuGeneratorPanel />
      </section>

      <section
        ref={masterRef}
        id="master-prompt"
        className="scroll-mt-24 border-y border-white/7 bg-white/[0.018]"
      >
        <div className="mx-auto max-w-3xl px-4 py-14 md:px-5 md:py-16">
          <h2 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">
            The Jatayu AI Video Prompt (Expanded Version)
          </h2>
          <p className="mt-4 text-sm leading-7 text-white/50 sm:text-base">
            Paste this whole block into the prompt box. Keep the first sentence
            — it is what holds your face together across frames.
          </p>
          <div className="mt-6">
            <PromptBlock
              text={JATAYU_EXPANDED_PROMPT}
              highlight={highlightMaster}
            />
          </div>
          <p className="mt-6 text-sm leading-7 text-white/55 sm:text-[15px]">
            This is our expanded version. We wrote it; it is not copied from a
            creator post. It adds camera, lighting and negative detail to the
            same scene that is circulating, and it asks for an original eagle
            rather than a film design. We have not benchmarked it against the
            original — the original is below, so you can compare both.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-3xl px-4 py-14 md:px-5 md:py-16">
        <h2 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">
          The Original Public Prompt
        </h2>
        <p className="mt-4 text-sm leading-7 text-white/50 sm:text-base">
          Reproduced word for word from a public Google Flow creator post
          published 14 November 2026. Formatting only — no words changed.
        </p>
        <div className="mt-6">
          <PromptBlock
            text={JATAYU_ORIGINAL_PUBLIC_PROMPT}
            showCopy
            quote
            footer={
              <>
                <p>
                  Source: a public creator post on Threads (@meta.ai), 14 Nov
                  2026, 13:55 UTC.
                </p>
                <p>
                  Note: the phrase &quot;Ramayana movie style&quot; points at a
                  film look. If you would rather stay clear of any specific
                  film&apos;s character design, use the expanded version above,
                  which asks for an original eagle.
                </p>
              </>
            }
          />
        </div>
        <p className="mt-6 text-sm leading-7 text-white/45">
          Why publish this line at all: many Reels and YouTube posts only reveal
          the prompt after a follow or comment, and some top-ranked YouTube
          descriptions list tags with no prompt. Putting the original text and
          its source on the page builds trust those pages cannot match.
        </p>
      </section>

      <section className="border-y border-white/7 bg-white/[0.018]">
        <div className="mx-auto max-w-3xl px-4 py-14 md:px-5 md:py-16">
          <h2 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">
            Negative Prompt (Paste Into the Negative Box if Your Tool Has One)
          </h2>
          <div className="mt-6">
            <PromptBlock text={JATAYU_NEGATIVE_PROMPT} />
          </div>
          <p className="mt-4 text-sm leading-6 text-white/45">
            This targets the failure people actually hit — the face drifting
            between frames — not a different art style.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-3xl px-4 py-14 md:px-5 md:py-16">
        <h2 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">
          How to Make the Jatayu AI Video
        </h2>

        <div className="mt-10 space-y-10">
          <div>
            <h3 className="text-xl font-semibold text-white/90">
              Google Flow — the way the trend actually runs
            </h3>
            <ol className="mt-4 list-decimal space-y-3 pl-5 text-sm leading-7 text-white/55 sm:text-base">
              <li>
                Open Google Flow, create a new project, and choose Video +
                Ingredients (not plain text-to-video).
              </li>
              <li>
                Put two ingredients in: a few-second clip of yourself in frame
                (rooftop or open ground, facing the camera, small movement) plus
                an eagle reference image.
              </li>
              <li>
                Paste the expanded prompt into the prompt box and the negative
                prompt into the negative box.
              </li>
              <li>
                Set resolution to 720p and generate. If the first take is weak,
                run again and keep the one where the face holds on the first
                frame.
              </li>
              <li>
                Download, trim on your phone to 5–7 seconds, and hit the beat
                when both wings are fully open.
              </li>
            </ol>
          </div>

          <div>
            <h3 className="text-xl font-semibold text-white/90">
              Edits app — fastest on phone
            </h3>
            <ol className="mt-4 list-decimal space-y-3 pl-5 text-sm leading-7 text-white/55 sm:text-base">
              <li>
                Update Edits to the latest version, create a project, and import
                the same short clip.
              </li>
              <li>
                Open AI / image-to-video, upload an eagle reference image, and
                paste the expanded prompt.
              </li>
              <li>
                Set 9:16, push duration to the maximum, generate, and check the
                face on the first frame.
              </li>
              <li>
                Use the in-app music library (not film scores), then export at
                1080p.
              </li>
            </ol>
          </div>

          <div>
            <h3 className="text-xl font-semibold text-white/90">
              CapCut — if you want music and captions in one place
            </h3>
            <ol className="mt-4 list-decimal space-y-3 pl-5 text-sm leading-7 text-white/55 sm:text-base">
              <li>
                CapCut → image-to-video → import your short clip and add an
                eagle reference image.
              </li>
              <li>Paste the expanded prompt, choose 9:16, generate.</li>
              <li>
                On the timeline, add a royalty-free epic track and keep music
                around −18 dB.
              </li>
              <li>
                Keep on-screen text to 3–5 words (Jatayu / Ramayana) — no full
                voiceover — then export.
              </li>
            </ol>
          </div>
        </div>

        <p className="mt-8 text-sm leading-7 text-white/45">
          The Google Flow steps follow the public post linked above. The Edits
          and CapCut paths are compiled from public tutorials and have not been
          tested by us — app menus change, so match what you see on screen.
        </p>
      </section>

      <section className="border-y border-white/7 bg-white/[0.018]">
        <div className="mx-auto max-w-3xl px-4 py-14 md:px-5 md:py-16">
          <h2 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">
            Jatayu Video Prompt Generator
          </h2>
          <p className="mt-3 text-base text-white/55">
            Three options, one prompt. Still the same scene.
          </p>
          <div className="mt-8">
            <JatayuPromptGenerator />
          </div>
          <figure className="mt-10">
            <img
              src={JATAYU_DEMO_POSTER}
              alt="Jatayu video prompt generator with format, birds and lightning options"
              className="w-full rounded-2xl border border-white/10 object-cover opacity-90"
              loading="lazy"
            />
            <figcaption className="mt-2 text-center text-xs text-white/35">
              Jatayu video prompt generator with format, birds and lightning
              options
            </figcaption>
          </figure>
        </div>
      </section>

      <section className="mx-auto max-w-3xl px-4 py-14 md:px-5 md:py-16">
        <h2 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">
          FAQ
        </h2>
        <div className="mt-7 divide-y divide-white/7 rounded-2xl border border-white/8 bg-white/[0.02] px-5 sm:px-7">
          {JATAYU_FAQ_ITEMS.map((item) => (
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

      <section className="border-y border-white/7 bg-white/[0.018]">
        <div className="mx-auto max-w-3xl px-4 py-14 md:px-5 md:py-16">
          <h2 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">
            What It Looks Like
          </h2>
          <div className="mt-6 overflow-hidden rounded-[20px] border border-white/10 bg-black/30 p-2.5">
            <video
              src={JATAYU_DEMO_VIDEO}
              poster={JATAYU_DEMO_POSTER}
              title="Jatayu AI video made with Google Flow — eagle spreading its wings behind the subject at golden hour"
              controls
              playsInline
              preload="none"
              className="aspect-video w-full rounded-xl bg-black object-contain"
            />
          </div>
          <p className="mt-3 text-center text-xs text-white/35">
            Made with the public prompt above
          </p>
          <p className="mt-2 text-center text-xs text-white/30">
            Jatayu AI video made with Google Flow — eagle spreading its wings
            behind the subject at golden hour
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-3xl px-4 py-12 md:px-5 md:pb-16">
        <p className="text-sm leading-6 text-white/45">
          <Link
            href="/"
            className="text-[rgb(220,155,99)] underline-offset-4 hover:underline"
          >
            More viral AI video trends and prompts
          </Link>
        </p>
      </section>
    </>
  );
}
