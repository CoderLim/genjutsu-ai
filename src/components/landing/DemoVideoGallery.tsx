import { cn } from '@/lib/cn';

type DemoVideo = {
  src: string;
  poster: string;
  label: string;
};

const DEMO_VIDEOS: DemoVideo[] = [
  {
    src: '/videos/demos/two-cats-dance.mp4',
    poster: '/videos/demos/two-cats-dance-poster.jpg',
    label: 'Two cats dance',
  },
  {
    src: '/videos/demos/car-drop.mp4',
    poster: '/videos/demos/car-drop-poster.jpg',
    label: 'Car drop',
  },
  {
    src: '/videos/demos/cat-to-dog.mp4',
    poster: '/videos/demos/cat-to-dog-poster.jpg',
    label: 'Cat to dog',
  },
];

export function DemoVideoGallery({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'mt-5 grid grid-cols-3 gap-2 sm:mt-6 sm:gap-3 md:gap-4',
        className
      )}
      aria-label="Demo videos"
    >
      {DEMO_VIDEOS.map((demo) => (
        <figure key={demo.src} className="min-w-0">
          <div className="aspect-9/16 overflow-hidden rounded-xl border border-white/10 bg-black/40 shadow-[0_8px_24px_rgba(0,0,0,0.28)]">
            <video
              className="size-full object-cover motion-reduce:hidden"
              autoPlay
              muted
              loop
              playsInline
              preload="metadata"
              poster={demo.poster}
              aria-label={demo.label}
            >
              <source src={demo.src} type="video/mp4" />
            </video>
            <img
              src={demo.poster}
              alt={demo.label}
              className="hidden size-full object-cover motion-reduce:block"
            />
          </div>
        </figure>
      ))}
    </div>
  );
}
