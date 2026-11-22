import { useState } from 'react';
import { Play } from 'lucide-react';

import { cn } from '@/lib/utils';

function formatClock(seconds: number) {
  const total = Math.max(0, Math.floor(Number.isFinite(seconds) ? seconds : 0));
  const m = Math.floor(total / 60);
  const s = String(total % 60).padStart(2, '0');
  return `${String(m).padStart(2, '0')}:${s}`;
}

/**
 * Static video tile with centered play affordance and MM:SS duration,
 * matching the Raphael-style upload preview chrome.
 */
export function VideoThumbPreview({
  src,
  className,
}: {
  src: string;
  className?: string;
}) {
  const [duration, setDuration] = useState<number | null>(null);

  return (
    <div className={cn('relative size-full overflow-hidden', className)}>
      <video
        src={src}
        muted
        playsInline
        preload="metadata"
        className="size-full object-cover"
        onLoadedMetadata={(event) => {
          const next = event.currentTarget.duration;
          if (Number.isFinite(next) && next > 0) setDuration(next);
        }}
      />
      <span className="pointer-events-none absolute inset-0 bg-black/10">
        <span className="absolute top-1/2 left-1/2 flex size-8 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-white/75 bg-black/50 text-white shadow-[0_2px_8px_rgba(0,0,0,0.35)]">
          <Play className="ml-0.5 size-3.5 fill-current" />
        </span>
        {duration !== null ? (
          <span className="absolute right-1 bottom-1 rounded-full bg-black/80 px-1.5 py-0.5 text-[9px] font-medium tracking-wide text-white tabular-nums">
            {formatClock(duration)}
          </span>
        ) : null}
      </span>
    </div>
  );
}
