import { cn } from '@/lib/cn';

import { EXAMPLE_IMAGES } from './content';

export function GetInspired({ className }: { className?: string }) {
  return (
    <div className={cn('py-16', className)}>
      <div className="flex flex-col items-center gap-4">
        <h2 className="text-center text-4xl font-semibold">Get Inspired</h2>
        <p className="text-muted-foreground text-center lg:text-lg">
          Get inspired by what others are creating with Raphael
        </p>
      </div>

      <div className="container mx-auto mt-10 px-4 sm:mt-12">
        <div className="columns-2 gap-4 md:columns-3 lg:columns-4">
          {EXAMPLE_IMAGES.map((image) => (
            <button
              key={image.src}
              type="button"
              className={cn(
                'mb-4 w-full break-inside-avoid border-0 bg-transparent p-0 text-left',
                'cursor-pointer transition-transform hover:scale-[1.02]'
              )}
            >
              <div className="group relative overflow-hidden rounded-lg">
                <img
                  src={image.src}
                  alt={image.alt}
                  width={1024}
                  height={1516}
                  loading="lazy"
                  decoding="async"
                  className="h-auto w-full transition-transform duration-300 group-hover:scale-105"
                />
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
