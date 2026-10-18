import { useEffect } from 'react';
import { RotateCcw } from 'lucide-react';

import { cn } from '@/lib/cn';
import { m } from '@/paraglide/messages.js';
import {
  useFixedTemplateMedia,
  type FixedTemplateMediaStatus,
} from '@/hooks/use-fixed-template-media';

type FixedTemplatePreviewProps = {
  src: string;
  poster?: string;
  /** Outer frame (aspect, borders). */
  className?: string;
  videoClassName?: string;
  /** object-cover vs object-contain */
  objectFit?: 'contain' | 'cover';
  /** Opt-in; blocked autoplay must not mark the template as failed. */
  autoPlay?: boolean;
  loop?: boolean;
  onStatusChange?: (status: FixedTemplateMediaStatus) => void;
};

/**
 * Fixed-template product preview — same R2-backed URL as generate.
 * Gates callers via onStatusChange; shows retry when media fails to load.
 */
export function FixedTemplatePreview({
  src,
  poster,
  className,
  videoClassName,
  objectFit = 'contain',
  autoPlay = false,
  loop = false,
  onStatusChange,
}: FixedTemplatePreviewProps) {
  const media = useFixedTemplateMedia(src);

  useEffect(() => {
    onStatusChange?.(media.status);
  }, [media.status, onStatusChange]);

  return (
    <div className={cn('relative overflow-hidden bg-black', className)}>
      <video
        key={media.videoSrc}
        src={media.videoSrc}
        poster={poster}
        controls
        muted
        playsInline
        autoPlay={autoPlay}
        loop={loop}
        preload="metadata"
        className={cn(
          'size-full',
          objectFit === 'cover' ? 'object-cover' : 'object-contain',
          videoClassName
        )}
        onLoadedMetadata={media.onLoadedMetadata}
        onError={media.onError}
      />
      {media.isError ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/75 px-4 text-center">
          <p className="text-sm text-white/75">
            {m['site.common.template_unavailable']()}
          </p>
          <button
            type="button"
            onClick={media.retry}
            className="inline-flex items-center gap-1.5 rounded-lg border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-medium text-white/90 transition hover:bg-white/16"
          >
            <RotateCcw className="size-3.5" />
            {m['site.common.template_retry']()}
          </button>
        </div>
      ) : null}
    </div>
  );
}
