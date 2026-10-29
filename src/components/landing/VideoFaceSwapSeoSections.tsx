import { Link } from '@/core/i18n/navigation';

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
      'This version accepts videos from 3 to 30 seconds. The limit is set for this tool and may change after additional testing.',
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
    <div className="mx-auto w-full max-w-3xl space-y-14 px-4 pt-14 pb-20 text-left text-[15px] leading-7 text-white/55 md:pt-20">
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
        <h2 className="font-serif text-2xl tracking-tight text-zinc-900 dark:text-zinc-50">
          How to swap a face in a video
        </h2>
        <ol className="list-decimal space-y-3 pl-5">
          <li>
            <strong>Upload your source video.</strong> Choose a 3–30 second clip
            with a clear main subject. Preview your original video before
            starting.
          </li>
          <li>
            <strong>Add one reference portrait.</strong> Use a sharp
            front-facing or three-quarter-view image of a person whose likeness
            you are authorized to use. Neutral lighting and an unobstructed face
            are recommended.
          </li>
          <li>
            <strong>Choose the output resolution.</strong> Select 480p for a
            lower-cost result or 720p for higher-resolution output. You can
            optionally add a short instruction, but it cannot guarantee which
            person is targeted in complex footage.
          </li>
          <li>
            <strong>Review credits and generate.</strong> We show the estimated
            credits before you submit. Once processing finishes, review the
            result and download your video.
          </li>
        </ol>
      </section>

      <section className="space-y-4">
        <h2 className="font-serif text-2xl tracking-tight text-zinc-900 dark:text-zinc-50">
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
        <h2 className="font-serif text-2xl tracking-tight text-zinc-900 dark:text-zinc-50">
          Video face swap vs. photo face swap
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[28rem] border-collapse text-sm">
            <thead>
              <tr className="border-b border-zinc-200 text-left dark:border-zinc-700">
                <th className="py-2 pr-3 font-medium" />
                <th className="py-2 pr-3 font-medium">Photo face swap</th>
                <th className="py-2 font-medium">
                  Video face swap (this tool)
                </th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-zinc-100 dark:border-zinc-800">
                <td className="py-2 pr-3 font-medium">Input</td>
                <td className="py-2 pr-3">Still images</td>
                <td className="py-2">One source video + one portrait</td>
              </tr>
              <tr className="border-b border-zinc-100 dark:border-zinc-800">
                <td className="py-2 pr-3 font-medium">Main challenge</td>
                <td className="py-2 pr-3">Face angle and lighting</td>
                <td className="py-2">
                  Moving faces, changing perspective and occlusion
                </td>
              </tr>
              <tr className="border-b border-zinc-100 dark:border-zinc-800">
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
        <h2 className="font-serif text-2xl tracking-tight text-zinc-900 dark:text-zinc-50">
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
        <h2 className="font-serif text-2xl tracking-tight text-zinc-900 dark:text-zinc-50">
          Specs at a glance
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[24rem] border-collapse text-sm">
            <tbody>
              {[
                ['Source video', '3–30 seconds per generation (site limit)'],
                ['Reference images', 'Exactly one portrait'],
                ['Output resolution', '480p or 720p'],
                ['Prompt', 'Optional guidance'],
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
                <tr
                  key={label}
                  className="border-b border-zinc-100 dark:border-zinc-800"
                >
                  <td className="py-2 pr-4 font-medium text-zinc-900 dark:text-zinc-100">
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
        <h2 className="font-serif text-2xl tracking-tight text-zinc-900 dark:text-zinc-50">
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
        <h2 className="font-serif text-2xl tracking-tight text-zinc-900 dark:text-zinc-50">
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
        <h2 className="font-serif text-2xl tracking-tight text-zinc-900 dark:text-zinc-50">
          FAQ
        </h2>
        <div className="space-y-5">
          {VIDEO_FACE_SWAP_FAQ_ITEMS.map((item) => (
            <div key={item.question}>
              <h3 className="font-medium text-zinc-900 dark:text-zinc-50">
                {item.question}
              </h3>
              <p className="mt-1">{item.answer}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="font-serif text-2xl tracking-tight text-zinc-900 dark:text-zinc-50">
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
