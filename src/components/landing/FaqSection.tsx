import type { ReactNode } from 'react';
import type { FaqItem } from '@/types/landing';

import { envConfigs } from '@/config';
import { cn } from '@/lib/cn';
import { m } from '@/paraglide/messages.js';
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
  description?: ReactNode;
};

export function FaqSection({
  items = FAQ_ITEMS,
  title = m['site.faq.title'](),
  className,
  description,
}: FaqSectionProps) {
  const supportEmail = envConfigs.app_support_email;

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
          {description ? (
            <p className="text-foreground/70 mx-auto mt-6 max-w-2xl text-base font-medium">
              {description}
            </p>
          ) : (
            <p className="text-foreground/70 mt-6 text-base font-medium">
              {m['site.faq.support']()}{' '}
              <a
                href={`mailto:${supportEmail}`}
                className="text-primary underline-offset-2 hover:underline"
              >
                {supportEmail}
              </a>
            </p>
          )}
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
