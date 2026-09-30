import type { FaqItem } from '@/types/landing';

import { cn } from '@/lib/cn';
import { FAQ_ITEMS } from '@/components/landing/content';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';

type FaqSectionProps = {
  items?: FaqItem[];
  title?: string;
  className?: string;
};

export function FaqSection({
  items = FAQ_ITEMS,
  title = 'Frequently Asked Questions — Free AI Image Generator',
  className,
}: FaqSectionProps) {
  return (
    <section id="faq" className={cn('py-16', className)}>
      <div className="container mx-auto px-4">
        <div className="text-center">
          <span
            className={cn(
              'inline-flex items-center rounded-full border border-transparent',
              'bg-primary text-primary-foreground px-2.5 py-0.5 text-xs font-medium',
              'hover:bg-primary/80'
            )}
          >
            FAQ
          </span>
          <h2 className="text-foreground mt-4 text-3xl font-bold tracking-tight sm:text-4xl">
            {title}
          </h2>
          <p className="text-foreground/70 mt-6 text-base font-medium">
            Have another question? Contact us at{' '}
            <a
              href="mailto:support@raphael.app"
              className="text-primary underline-offset-2 hover:underline"
            >
              support@raphael.app
            </a>
          </p>
        </div>

        <Accordion
          multiple
          className="mx-auto mt-14 grid gap-8 md:grid-cols-2 md:gap-12"
        >
          {items.map((item, index) => {
            const value = `faq-${index + 1}`;
            return (
              <AccordionItem
                key={value}
                value={value}
                className="border-none not-last:border-b-0"
              >
                <div className="flex gap-4">
                  <span
                    className={cn(
                      'mt-2.5 flex size-6 shrink-0 items-center justify-center',
                      'border-primary text-primary rounded-sm border font-mono text-xs'
                    )}
                  >
                    {index + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <AccordionTrigger
                      className={cn(
                        'cursor-pointer items-center py-2 hover:no-underline',
                        'text-foreground text-left text-xl font-bold'
                      )}
                    >
                      {item.question}
                    </AccordionTrigger>
                    <AccordionContent className="text-foreground/70 pb-0 text-base leading-relaxed">
                      {item.answer}
                    </AccordionContent>
                  </div>
                </div>
              </AccordionItem>
            );
          })}
        </Accordion>
      </div>
    </section>
  );
}
