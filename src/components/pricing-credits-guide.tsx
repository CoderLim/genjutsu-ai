import { Link } from '@/core/i18n/navigation';
import {
  listPricingCreditExamples,
  type PricingCreditExampleId,
} from '@/lib/pricing-credit-examples';
import { m } from '@/paraglide/messages.js';

const EXAMPLE_NAME_KEY = {
  'motion-transfer': 'site.pricing.example.motion_transfer',
  'object-swap': 'site.pricing.example.object_swap',
  'a2o-lite': 'site.pricing.example.a2o_lite',
} as const satisfies Record<
  PricingCreditExampleId,
  | 'site.pricing.example.motion_transfer'
  | 'site.pricing.example.object_swap'
  | 'site.pricing.example.a2o_lite'
>;

function exampleName(id: PricingCreditExampleId) {
  return m[EXAMPLE_NAME_KEY[id]]();
}

/** How credits work + example costs — SSR-friendly for Pricing SEO. */
export function PricingCreditsGuide() {
  const examples = listPricingCreditExamples();

  return (
    <div className="mx-auto mt-20 max-w-6xl space-y-16 px-4 sm:mt-24">
      <section aria-labelledby="how-credits-work-heading">
        <h2
          id="how-credits-work-heading"
          className="font-serif text-3xl font-normal tracking-tight sm:text-4xl"
        >
          {m['site.pricing.how.title']()}
        </h2>
        <p className="text-muted-foreground mt-4 max-w-2xl text-base leading-relaxed">
          {m['site.pricing.how.intro']()}
        </p>
        <ul className="mt-8 grid gap-6 sm:grid-cols-3">
          <li className="border-border/60 space-y-2 border-t pt-5">
            <h3 className="text-foreground text-base font-medium">
              {m['site.pricing.how.diff_title']()}
            </h3>
            <p className="text-muted-foreground text-sm leading-relaxed">
              {m['site.pricing.how.diff_body']()}
            </p>
          </li>
          <li className="border-border/60 space-y-2 border-t pt-5">
            <h3 className="text-foreground text-base font-medium">
              {m['site.pricing.how.before_title']()}
            </h3>
            <p className="text-muted-foreground text-sm leading-relaxed">
              {m['site.pricing.how.before_body']()}
            </p>
          </li>
          <li className="border-border/60 space-y-2 border-t pt-5">
            <h3 className="text-foreground text-base font-medium">
              {m['site.pricing.how.no_sub_title']()}
            </h3>
            <p className="text-muted-foreground text-sm leading-relaxed">
              {m['site.pricing.how.no_sub_body']()}
            </p>
          </li>
        </ul>
      </section>

      <section aria-labelledby="example-costs-heading">
        <h2
          id="example-costs-heading"
          className="font-serif text-3xl font-normal tracking-tight sm:text-4xl"
        >
          {m['site.pricing.examples.title']()}
        </h2>
        <p className="text-muted-foreground mt-4 max-w-2xl text-base leading-relaxed">
          {m['site.pricing.examples.intro']()}
        </p>

        <div className="border-border/70 mt-8 overflow-x-auto rounded-xl border">
          <table className="w-full min-w-[36rem] text-left text-sm">
            <caption className="sr-only">
              {m['site.pricing.examples.caption']()}
            </caption>
            <thead className="bg-muted/40 text-muted-foreground border-border/70 border-b">
              <tr>
                <th scope="col" className="px-4 py-3 font-medium">
                  {m['site.pricing.examples.col_tool']()}
                </th>
                <th scope="col" className="px-4 py-3 font-medium">
                  {m['site.pricing.examples.col_settings']()}
                </th>
                <th scope="col" className="px-4 py-3 font-medium">
                  {m['site.pricing.examples.col_credits']()}
                </th>
              </tr>
            </thead>
            <tbody>
              {examples.map((example) => (
                <tr
                  key={example.id}
                  className="border-border/50 border-b last:border-b-0"
                >
                  <th
                    scope="row"
                    className="text-foreground px-4 py-4 font-medium"
                  >
                    <Link
                      href={example.href}
                      className="underline-offset-4 hover:underline"
                    >
                      {exampleName(example.id)}
                    </Link>
                  </th>
                  <td className="text-muted-foreground px-4 py-4">
                    {m['site.pricing.examples.settings']({
                      duration: String(example.durationSeconds),
                      resolution: example.resolution,
                    })}
                    {example.preview
                      ? ` · ${m['site.pricing.examples.preview_settings']({
                          duration: String(example.preview.durationSeconds),
                          resolution: example.preview.resolution,
                        })}`
                      : null}
                  </td>
                  <td className="text-foreground px-4 py-4 tabular-nums">
                    <div className="flex flex-col gap-1">
                      <span>
                        {example.preview
                          ? m['site.pricing.examples.full_credits']({
                              count: example.credits.toLocaleString(),
                            })
                          : m['site.pricing.examples.credits_value']({
                              count: example.credits.toLocaleString(),
                            })}
                      </span>
                      {example.preview ? (
                        <span className="text-muted-foreground">
                          {m['site.pricing.examples.preview_credits']({
                            count: example.preview.credits.toLocaleString(),
                          })}
                        </span>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-muted-foreground mt-4 max-w-2xl text-sm leading-relaxed">
          {m['site.pricing.examples.footnote']()}
        </p>
      </section>

      <section aria-labelledby="pricing-faq-heading" className="pb-8">
        <h2
          id="pricing-faq-heading"
          className="font-serif text-3xl font-normal tracking-tight sm:text-4xl"
        >
          {m['site.pricing.faq.title']()}
        </h2>
        <dl className="mt-8 max-w-2xl space-y-6">
          {(
            [
              ['site.pricing.faq.q1', 'site.pricing.faq.a1'],
              ['site.pricing.faq.q2', 'site.pricing.faq.a2'],
              ['site.pricing.faq.q3', 'site.pricing.faq.a3'],
              ['site.pricing.faq.q4', 'site.pricing.faq.a4'],
            ] as const
          ).map(([qKey, aKey]) => (
            <div key={qKey}>
              <dt className="text-foreground text-base font-medium">
                {m[qKey]()}
              </dt>
              <dd className="text-muted-foreground mt-2 text-sm leading-relaxed">
                {m[aKey]()}
              </dd>
            </div>
          ))}
        </dl>
      </section>
    </div>
  );
}

export function getPricingFaqItems() {
  return [
    {
      question: m['site.pricing.faq.q1'](),
      answer: m['site.pricing.faq.a1'](),
    },
    {
      question: m['site.pricing.faq.q2'](),
      answer: m['site.pricing.faq.a2'](),
    },
    {
      question: m['site.pricing.faq.q3'](),
      answer: m['site.pricing.faq.a3'](),
    },
    {
      question: m['site.pricing.faq.q4'](),
      answer: m['site.pricing.faq.a4'](),
    },
  ];
}
