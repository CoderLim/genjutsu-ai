import { useId, useMemo, useState, type ChangeEvent } from 'react';
import { ImagePlus, Plus, Trash2, Upload } from 'lucide-react';

import { cn } from '@/lib/utils';
import {
  MediaViewer,
  type MediaItem,
} from '@/components/ui/chatcn/media-gallery';

import { VideoThumbPreview } from './VideoThumbPreview';

type Props = {
  label: string;
  urls: string[];
  max: number;
  accept: readonly string[];
  onFiles: (files: File[]) => void;
  onRemove: (url: string) => void;
  /** Compact dashed slot matching Raphael composer reference box */
  variant?: 'default' | 'composer';
  optional?: boolean;
  /** Visible secondary line for optional reference uploads (e.g. Up to 14). */
  hint?: string;
};

function mediaKindFromAccept(
  accept: readonly string[]
): 'image' | 'video' | 'audio' {
  if (accept.some((type) => type.startsWith('video/'))) return 'video';
  if (accept.some((type) => type.startsWith('audio/'))) return 'audio';
  return 'image';
}

export function MediaUploader({
  label,
  urls,
  max,
  accept,
  onFiles,
  onRemove,
  variant = 'default',
  optional = false,
  hint,
}: Props) {
  const canAdd = urls.length < max;
  // "Reference Optional" can appear for several slots at once. Labels must
  // always target their own file input, even with duplicate visible text.
  const inputId = useId();
  const kind = mediaKindFromAccept(accept);
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);

  const viewerItems = useMemo<MediaItem[]>(() => {
    if (kind === 'audio') return [];
    return urls.map((src, index) => ({
      id: `${label}:${index}:${src}`,
      kind,
      src,
      alt: label,
    }));
  }, [kind, label, urls]);

  function openPreview(url: string) {
    const index = viewerItems.findIndex((item) => item.src === url);
    if (index >= 0) setViewerIndex(index);
  }

  function onInputChange(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    event.target.value = '';
    if (files.length > 0) onFiles(files);
  }

  const fileInput = (
    <input
      id={inputId}
      type="file"
      accept={accept.join(',')}
      multiple={max > 1}
      onChange={onInputChange}
      className="sr-only"
      disabled={!canAdd}
    />
  );

  const viewer =
    viewerIndex !== null && viewerItems.length > 0 ? (
      <MediaViewer
        items={viewerItems}
        index={viewerIndex}
        open
        onIndexChange={setViewerIndex}
        onOpenChange={(open) => {
          if (!open) setViewerIndex(null);
        }}
      />
    ) : null;

  if (variant === 'composer') {
    const preview = urls[0];

    return (
      <div className="relative shrink-0">
        {preview ? (
          <div className="relative h-24 w-[68px] overflow-hidden rounded-lg border border-[rgba(20,17,18,0.086)] bg-[rgba(20,17,18,0.03)]">
            {kind === 'audio' ? (
              <div className="flex h-full items-center justify-center p-1 text-center text-[10px] text-[rgba(18,15,16,0.55)]">
                Audio
              </div>
            ) : (
              <button
                type="button"
                onClick={() => openPreview(preview)}
                aria-label={`Preview ${label}`}
                className="size-full cursor-zoom-in"
              >
                {kind === 'video' ? (
                  <VideoThumbPreview src={preview} />
                ) : (
                  <img
                    src={preview}
                    alt={label}
                    className="h-full w-full object-cover"
                  />
                )}
              </button>
            )}
            <button
              type="button"
              aria-label={'Remove ' + label}
              onClick={(event) => {
                event.stopPropagation();
                onRemove(preview);
              }}
              className="absolute top-1 right-1 z-10 rounded-full bg-black/70 p-1 text-white"
            >
              <Trash2 className="size-3" />
            </button>
            {canAdd && max > 1 ? (
              <label
                htmlFor={inputId}
                className="absolute inset-x-0 bottom-0 z-10 cursor-pointer bg-black/50 py-0.5 text-center text-[9px] font-medium text-white"
              >
                +{max - urls.length}
              </label>
            ) : null}
          </div>
        ) : (
          <label
            htmlFor={inputId}
            className={cn(
              'flex h-24 w-[68px] cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-[rgba(20,17,18,0.22)] bg-transparent text-center transition hover:border-[rgba(20,17,18,0.4)] hover:bg-[rgba(20,17,18,0.02)]',
              !canAdd && 'pointer-events-none opacity-50'
            )}
          >
            <Plus
              className="size-5 text-[rgba(18,15,16,0.45)]"
              strokeWidth={1.75}
            />
            <span className="px-1 text-[10px] leading-tight font-medium text-[rgba(18,15,16,0.55)]">
              {hint ? (
                <>
                  <span className="block">{label}</span>
                  <span className="mt-0.5 block">{hint}</span>
                </>
              ) : optional ? (
                label + ' (optional)'
              ) : (
                label
              )}
            </span>
          </label>
        )}
        {fileInput}
        {urls.length > 1 ? (
          <div className="mt-1 flex max-w-[140px] flex-wrap gap-1">
            {urls.slice(1).map((url) => (
              <div
                key={url}
                className="relative size-8 overflow-hidden rounded border"
              >
                {kind === 'audio' ? (
                  <span className="flex size-full items-center justify-center text-[10px]">
                    Audio
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => openPreview(url)}
                    aria-label={`Preview ${label}`}
                    className="size-full cursor-zoom-in"
                  >
                    {kind === 'video' ? (
                      <VideoThumbPreview src={url} />
                    ) : (
                      <img
                        src={url}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    )}
                  </button>
                )}
                <button
                  type="button"
                  aria-label="Remove"
                  onClick={(event) => {
                    event.stopPropagation();
                    onRemove(url);
                  }}
                  className="absolute inset-0 z-10 flex items-center justify-center bg-black/50 text-white opacity-0 transition hover:opacity-100"
                >
                  <Trash2 className="size-3" />
                </button>
              </div>
            ))}
          </div>
        ) : null}
        {viewer}
      </div>
    );
  }

  return (
    <section className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <label htmlFor={inputId} className="text-sm font-medium">
          {label}
        </label>
        <span className="text-muted-foreground text-xs">
          {urls.length}/{max}
        </span>
      </div>
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
        {urls.map((url) => (
          <div
            key={url}
            className="bg-muted relative aspect-square overflow-hidden rounded-xl border"
          >
            {kind === 'audio' ? (
              <div className="flex h-full items-center justify-center p-2 text-center text-xs">
                Audio reference
              </div>
            ) : (
              <button
                type="button"
                onClick={() => openPreview(url)}
                aria-label={`Preview ${label}`}
                className="size-full cursor-zoom-in"
              >
                {kind === 'video' ? (
                  <VideoThumbPreview src={url} />
                ) : (
                  <img
                    src={url}
                    alt={label + ' reference'}
                    className="h-full w-full object-cover"
                  />
                )}
              </button>
            )}
            <button
              type="button"
              aria-label={'Remove ' + label}
              onClick={(event) => {
                event.stopPropagation();
                onRemove(url);
              }}
              className="absolute top-1 right-1 z-10 rounded-full bg-black/70 p-1.5 text-white"
            >
              <Trash2 className="size-3.5" />
            </button>
          </div>
        ))}
        {canAdd ? (
          <label
            htmlFor={inputId}
            className="text-muted-foreground hover:text-foreground hover:bg-muted flex aspect-square cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border border-dashed p-2 text-center transition"
          >
            {urls.length > 0 ? (
              <Upload className="size-5" />
            ) : (
              <ImagePlus className="size-6" />
            )}
            <span className="text-xs">Add {label}</span>
          </label>
        ) : null}
      </div>
      {fileInput}
      {viewer}
    </section>
  );
}
