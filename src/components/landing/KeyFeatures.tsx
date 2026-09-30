import {
  CircleDollarSign,
  Flashlight,
  Languages,
  Palette,
  Shield,
  WandSparkles,
  type LucideIcon,
} from 'lucide-react';

import { cn } from '@/lib/cn';

import { FEATURE_CARDS } from './content';

const FEATURE_ICONS: LucideIcon[] = [
  CircleDollarSign,
  WandSparkles,
  Languages,
  Flashlight,
  Shield,
  Palette,
];

export function KeyFeatures({ className }: { className?: string }) {
  return (
    <section id="feature" className={cn('py-16', className)}>
      <div className="container mx-auto px-4">
        <h2 className="text-foreground mb-2 text-3xl font-bold tracking-tight text-pretty lg:text-4xl">
          Key Features of Raphael AI Image Generator
        </h2>
        <p className="text-foreground/80 mb-8 max-w-xl lg:max-w-none lg:text-lg">
          Experience the next generation of AI image generation with the Raphael
          AI Image Generator — powerful, free and privacy-focused.
        </p>

        <div className="grid min-h-[200px] gap-10 md:min-h-[300px] md:grid-cols-2 lg:grid-cols-3">
          {FEATURE_CARDS.map((feature, index) => {
            const Icon = FEATURE_ICONS[index] ?? CircleDollarSign;
            return (
              <div
                key={feature.title}
                className="flex min-h-[150px] flex-col md:min-h-[200px]"
              >
                <div className="border-primary mb-5 flex size-16 items-center justify-center rounded-full border">
                  <Icon className="text-primary size-8" aria-hidden="true" />
                </div>
                <h3 className="text-foreground mb-2 line-clamp-2 text-2xl font-bold">
                  {feature.title}
                </h3>
                <p className="text-foreground/80 line-clamp-4 leading-relaxed">
                  {feature.description}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
