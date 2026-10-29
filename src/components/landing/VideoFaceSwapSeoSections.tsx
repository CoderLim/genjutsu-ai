import { useEffect, useRef } from 'react';

import { Link } from '@/core/i18n/navigation';

const DEMO_BEFORE_SRC = '/videos/face-swap-demo-before.mp4';
const DEMO_AFTER_SRC = '/videos/face-swap-demo-after.mp4';
const DEMO_FACE_SRC = '/images/face-swap-demo-face.webp';

export function VideoFaceSwapEffectDemo() {
  const beforeRef = useRef<HTMLVideoElement>(null);
  const afterRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const before = beforeRef.current;
    const after = afterRef.current;
    if (!before || !after) return;

    const playBoth = () => {
      void before.play().catch(() => undefined);
      void after.play().catch(() => undefined);
    };

    const syncFromBefore = () => {
      if (Math.abs(after.currentTime - before.currentTime) > 0.15) {
        after.currentTime = before.currentTime;
      }
    };

    const onEnded = () => {
      before.currentTime = 0;
      after.currentTime = 0;
      playBoth();
    };

    before.addEventListener('timeupdate', syncFromBefore);
    before.addEventListener('ended', onEnded);
    after.addEventListener('ended', onEnded);
    playBoth();

    return () => {
      before.removeEventListener('timeupdate', syncFromBefore);
      before.removeEventListener('ended', onEnded);
      after.removeEventListener('ended', onEnded);
    };
  }, []);

  return (
    <div className="space-y-3">
      <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-black shadow-[0_24px_60px_-28px_rgba(0,0,0,0.85)]">
        <div className="grid grid-cols-2 gap-0">
          <div className="relative min-w-0">
            <video
              ref={beforeRef}
              src={DEMO_BEFORE_SRC}
              muted
              playsInline
              autoPlay
              loop
              preload="metadata"
              className="aspect-video w-full object-cover"
              aria-label="Original source video"
            />
            <span className="absolute bottom-2 left-2 rounded-md bg-black/65 px-2 py-0.5 text-[11px] font-medium tracking-wide text-white/80 backdrop-blur">
              Before
            </span>
          </div>
          <div className="relative min-w-0">
            <video
              ref={afterRef}
              src={DEMO_AFTER_SRC}
              muted
              playsInline
              autoPlay
              loop
              preload="metadata"
              className="aspect-video w-full object-cover"
              aria-label="Head swap result video"
            />
            <span className="absolute right-2 bottom-2 rounded-md bg-black/65 px-2 py-0.5 text-[11px] font-medium tracking-wide text-white/80 backdrop-blur">
              After
            </span>
          </div>
        </div>

        <div
          className="pointer-events-none absolute inset-y-0 left-1/2 z-10 w-px -translate-x-1/2 bg-white/25"
          aria-hidden
        />
        <div className="pointer-events-none absolute top-1/2 left-1/2 z-20 -translate-x-1/2 -translate-y-1/2">
          <div className="size-14 overflow-hidden rounded-full border-2 border-white/85 bg-black shadow-[0_8px_28px_rgba(0,0,0,0.55)] ring-2 ring-black/50 sm:size-[4.5rem]">
            <img
              src={DEMO_FACE_SRC}
              alt="Reference portrait used for the head swap"
              className="size-full object-cover"
              width={96}
              height={96}
              decoding="async"
            />
          </div>
        </div>
      </div>
      <p className="text-center text-xs text-white/40">
        Example result — source clip on the left, head swap on the right
      </p>
    </div>
  );
}

export const VIDEO_FACE_SWAP_FAQ_ITEMS = [
  {
    question: 'What is the difference between face swap and head swap?',
    answer:
      'This tool uses a head-swap model. It may change the face, hair and head outline, while trying to keep the original body, clothes and background. It is not a full-character replacement tool.',
  },
  {
    question: 'How many photos do I need?',
    answer:
      'One clear reference portrait, plus the video you want to edit. You do not need several reference angles for this tool.',
  },
  {
    question: 'How long can the video be?',
    answer:
      'Videos from 3 to 120 seconds are accepted, matching the provider billing range. Shorter clips are billed as 3 seconds; longer clips must be trimmed first.',
  },
  {
    question: 'What resolutions are available?',
    answer:
      '480p and 720p. The credit estimate depends on source duration and selected resolution.',
  },
  {
    question: 'Can I swap a face in a video with several cuts or people?',
    answer:
      'You can upload a video with cuts, but consistent identity across cuts or accurate selection of one person in a crowd is not guaranteed. A clear single-subject clip is recommended.',
  },
  {
    question: 'Can I change the clothes or the background too?',
    answer:
      'No. This tool is designed to replace the head while retaining the original body and scene. Use another Genjutsu AI editing workflow for broader changes.',
  },
  {
    question: 'Is video face swap free?',
    answer:
      'Generating a result uses prepaid Genjutsu AI credits. The estimated credit cost is displayed before you start.',
  },
  {
    question: 'Can I leave the page while the video processes?',
    answer:
      'Yes. Your job is recorded so you can return to check its status when processing has finished.',
  },
  {
    question: 'Can I use the output commercially?',
    answer:
      "Only when you have the necessary rights and consent, and your use complies with the site's terms, provider policy and applicable law. The tool itself does not grant rights to anyone's likeness or source footage.",
  },
  {
    question: 'Does it keep the original audio?',
    answer:
      "Audio behavior depends on the model's output. Check the result before publishing; we do not guarantee preservation of the original soundtrack.",
  },
] as const;

export function getVideoFaceSwapFaqSchemaItems() {
  return VIDEO_FACE_SWAP_FAQ_ITEMS.map((item) => ({
    question: item.question,
    answer: item.answer,
  }));
}

export function VideoFaceSwapSeoSections() {
  return (
    <div className="mx-auto w-full max-w-3xl space-y-14 px-4 pt-8 pb-20 text-left text-[15px] leading-7 text-white/55 md:pt-12">
      <section className="space-y-4">
        <h2 className="text-2xl font-semibold tracking-tight text-white/90 sm:text-3xl">
          What a video face swap actually takes
        </h2>
        <p>
          A photo face swap changes a still image. Video adds head turns,
          changing light, expressions, and camera movement. A convincing result
          needs more than placing a static face over each frame.
        </p>
        <p>
          Genjutsu AI&apos;s Video Face Swap tool uses a source clip and one
          reference portrait. Under the hood, it performs a head swap: the face,
          hair and overall head shape can change, while the model aims to
          preserve the original body movement, clothing and background. Results
          depend on the source footage and the quality of the portrait.
        </p>
        <p>
          Start with a clip where the subject is clearly visible. A well-lit,
          steady shot usually gives the model more useful information than a
          heavily blurred or obstructed face.
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold tracking-tight text-white/90">
          How to swap a face in a video
        </h2>
        <ol className="list-decimal space-y-3 pl-5">
          <li>
            <strong>Upload your source video.</strong> Choose a 3–120 second
            MP4, MOV, or WebM clip with a clear main subject. Preview your
            original video before starting.
          </li>
          <li>
            <strong>Add one reference portrait.</strong> Use a sharp
            front-facing or three-quarter-view image of a person whose likeness
            you are authorized to use. Neutral lighting and an unobstructed face
            are recommended.
          </li>
          <li>
            <strong>Choose the output resolution.</strong> Select 480p for a
            lower-cost result or 720p for higher-resolution output. Multi-person
            or multi-cut footage may not target the person you expect.
          </li>
          <li>
            <strong>Review credits and generate.</strong> We show the estimated
            credits before you submit. Once processing finishes, review the
            result and download your video.
          </li>
        </ol>
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold tracking-tight text-white/90">
          Why keeping the original performance matters
        </h2>
        <p>
          You have already captured the movement, timing, and framing you want.
          Head swap works from that performance rather than asking you to
          describe a brand-new dance or camera move. The model attempts to adapt
          the replacement head to the original head movement, lighting and
          perspective.
        </p>
        <p>
          There are limits: fast cuts, strong motion blur, hands covering the
          face and scenes with multiple people can reduce consistency. If an
          individual shot matters, review the output carefully before
          publishing.
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold tracking-tight text-white/90">
          Video face swap vs. photo face swap
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[28rem] border-collapse text-sm">
            <thead>
              <tr className="border-b border-white/12 text-left text-white/70">
                <th className="py-2 pr-3 font-medium" />
                <th className="py-2 pr-3 font-medium">Photo face swap</th>
                <th className="py-2 font-medium">
                  Video face swap (this tool)
                </th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-white/8">
                <td className="py-2 pr-3 font-medium">Input</td>
                <td className="py-2 pr-3">Still images</td>
                <td className="py-2">One source video + one portrait</td>
              </tr>
              <tr className="border-b border-white/8">
                <td className="py-2 pr-3 font-medium">Main challenge</td>
                <td className="py-2 pr-3">Face angle and lighting</td>
                <td className="py-2">
                  Moving faces, changing perspective and occlusion
                </td>
              </tr>
              <tr className="border-b border-white/8">
                <td className="py-2 pr-3 font-medium">Output</td>
                <td className="py-2 pr-3">A single edited image</td>
                <td className="py-2">A processed video</td>
              </tr>
              <tr>
                <td className="py-2 pr-3 font-medium">Best for</td>
                <td className="py-2 pr-3">Avatars, still-image memes</td>
                <td className="py-2">
                  Short skits, dances and personal video projects
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <p>
          If you only need to change a face in a single photo, choose a photo
          editor. Use this tool when the material you want to edit is already a
          video.
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold tracking-tight text-white/90">
          What changes — and what stays
        </h2>
        <p>
          <strong>Changes:</strong> the subject&apos;s head appearance,
          including facial features, hairstyle and head shape, based on your
          authorized reference portrait.
        </p>
        <p>
          <strong>Designed to stay:</strong> the original body pose, clothing,
          surrounding scene and framing. This is a goal of the model, not a
          frame-perfect guarantee. For full-character replacement, outfit
          changes or scene edits, explore Genjutsu AI&apos;s other video editing
          workflows instead.
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold tracking-tight text-white/90">
          Specs at a glance
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[24rem] border-collapse text-sm">
            <tbody>
              {[
                ['Source video', '3–120 seconds · MP4 / MOV / WebM · ≤100 MB'],
                ['Reference images', 'Exactly one portrait'],
                ['Output resolution', '480p or 720p (default 480p)'],
                [
                  'Multi-shot input',
                  'Accepted; cross-shot identity consistency is not guaranteed',
                ],
                [
                  'Multiple people',
                  'No precise target-person selection guaranteed',
                ],
                ['Price', 'Prepaid credits, shown before generation'],
                [
                  'Processing time',
                  'Varies by video length and provider queue',
                ],
                ['Page language', 'English at initial launch'],
              ].map(([label, value]) => (
                <tr key={label} className="border-b border-white/8">
                  <td className="py-2 pr-4 font-medium text-white/80">
                    {label}
                  </td>
                  <td className="py-2">{value}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold tracking-tight text-white/90">
          Consent, likeness and responsible use
        </h2>
        <p>
          Use only video and portraits you own or have permission to edit.
          Obtain the necessary consent before changing a real person&apos;s
          likeness in a video. Do not create deceptive impersonations,
          misleading endorsements or content intended to make others believe
          someone said or did something they did not. Follow the site&apos;s
          Terms of Service and the model provider&apos;s policies.
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold tracking-tight text-white/90">
          What people use video head swaps for
        </h2>
        <p>
          Creators experiment with their own authorized portraits in dance
          clips, skits, personal storytelling and short-form video. Teams can
          use authorized footage to prototype fictional or consented character
          appearances without reshooting the original body movement. Always
          review the result and get the necessary rights before sharing or
          commercial use.
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold tracking-tight text-white/90">
          FAQ
        </h2>
        <div className="space-y-5">
          {VIDEO_FACE_SWAP_FAQ_ITEMS.map((item) => (
            <div key={item.question}>
              <h3 className="font-medium text-white/88">{item.question}</h3>
              <p className="mt-1">{item.answer}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-2xl font-semibold tracking-tight text-white/90">
          Related tools
        </h2>
        <ul className="list-disc space-y-1 pl-5">
          <li>
            <Link href="/" className="underline underline-offset-2">
              Video to video editing on Genjutsu AI
            </Link>
          </li>
          <li>
            <Link
              href="/hotel-lobby-ai"
              className="underline underline-offset-2"
            >
              Hotel Lobby motion templates
            </Link>
          </li>
          <li>
            <Link href="/tiny-desk-ai" className="underline underline-offset-2">
              Tiny Desk AI performance videos
            </Link>
          </li>
        </ul>
      </section>
    </div>
  );
}
