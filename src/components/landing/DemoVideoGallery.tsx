import { cn } from '@/lib/cn';

type DemoVideo = {
  src: string;
  poster: string;
  label: string;
  aspect: 'portrait' | 'landscape';
};

const DEMO_VIDEOS: DemoVideo[] = [
  {
    src: '/videos/demos/two-cats-dance.mp4',
    poster: '/videos/demos/two-cats-dance-poster.jpg',
    label: 'Two cats dance',
    aspect: 'portrait',
  },
  {
    src: '/videos/demos/car-drop.mp4',
    poster: '/videos/demos/car-drop-poster.jpg',
    label: 'Car drop',
    aspect: 'portrait',
  },
  {
    src: '/videos/demos/cat-to-dog.mp4',
    poster: '/videos/demos/cat-to-dog-poster.jpg',
    label: 'Cat to dog',
    aspect: 'portrait',
  },
  {
    src: '/videos/demos/demodemo.mp4',
    poster: '/videos/demos/demodemo-poster.jpg',
    label: 'Scene rewrite demo',
    aspect: 'landscape',
  },
  {
    src: '/videos/demos/jackson-cat.mp4',
    poster: '/videos/demos/jackson-cat-poster.jpg',
    label: 'Jackson cat',
    aspect: 'landscape',
  },
];

function DemoTile({ demo }: { demo: DemoVideo }) {
  return (
    <figure className="min-w-0">
      <div
        className={cn(
          'overflow-hidden rounded-xl border border-white/10 bg-black/40 shadow-[0_8px_24px_rgba(0,0,0,0.28)]',
          demo.aspect === 'portrait' ? 'aspect-9/16' : 'aspect-video'
        )}
      >
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
  );
}

export function DemoVideoGallery({ className }: { className?: string }) {
  const portraits = DEMO_VIDEOS.filter((d) => d.aspect === 'portrait');
  const landscapes = DEMO_VIDEOS.filter((d) => d.aspect === 'landscape');

  return (
    <div
      className={cn(
        'mt-5 space-y-2 sm:mt-6 sm:space-y-3 md:space-y-4',
        className
      )}
      aria-label="Demo videos"
    >
      <div className="grid grid-cols-3 gap-2 sm:gap-3 md:gap-4">
        {portraits.map((demo) => (
          <DemoTile key={demo.src} demo={demo} />
        ))}
      </div>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 sm:gap-3 md:gap-4">
        {landscapes.map((demo) => (
          <DemoTile key={demo.src} demo={demo} />
        ))}
      </div>
    </div>
  );
}
