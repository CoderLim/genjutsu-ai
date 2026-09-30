import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type DragEvent,
  type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';

import { cn } from '@/lib/cn';
import {
  ChevronDownIcon,
  CloseIcon,
  FilmIcon,
  ImageModeIcon,
  MotionTransferIcon,
  ObjectsSwapIcon,
  PlusIcon,
  ZapIcon,
} from '@/components/icons';

export type GeneratorMode = 'motion-transfer' | 'objects-swap';

type GeneratorPanelProps = {
  mode?: GeneratorMode;
  className?: string;
  /** Hide promo strip (used inside sticky expanded composer) */
  hidePromo?: boolean;
  /** Controlled mode — when set with onModeChange, parent owns the toggle */
  onModeChange?: (mode: GeneratorMode) => void;
};

type MediaItem = {
  id: string;
  file: File;
  url: string;
};

const RESOLUTIONS = ['480p', '720p', '1080p'] as const;
type Resolution = (typeof RESOLUTIONS)[number];

const MODE_OPTIONS: {
  id: GeneratorMode;
  label: string;
  icon: typeof MotionTransferIcon;
}[] = [
  {
    id: 'motion-transfer',
    label: 'Motion transfer',
    icon: MotionTransferIcon,
  },
  {
    id: 'objects-swap',
    label: 'Objects swap',
    icon: ObjectsSwapIcon,
  },
];

const chipClass =
  'inline-flex h-7 max-w-full min-w-0 shrink-0 items-center gap-1 rounded-lg border border-transparent bg-[rgba(94,96,104,0.3)] px-2 text-[12px] font-medium text-secondary-foreground/88 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] backdrop-blur-2xl transition-all duration-200 hover:bg-[rgba(109,112,121,0.36)]';

const selectedOptionClass =
  'border-transparent bg-[rgba(120,87,60,0.9)] text-foreground shadow-[inset_0_1px_0_rgba(255,255,255,0.045)]';

const idleOptionClass =
  'border-transparent bg-transparent text-foreground/68 hover:bg-[rgba(98,71,51,0.28)] hover:text-foreground/88';

function createMediaItem(file: File): MediaItem {
  return {
    id: `${file.name}-${file.size}-${file.lastModified}-${Math.random().toString(36).slice(2, 8)}`,
    file,
    url: URL.createObjectURL(file),
  };
}

const IMAGE_MAX = 30;

function revokeItem(item: MediaItem | null) {
  if (item) URL.revokeObjectURL(item.url);
}

function revokeAll(items: MediaItem[]) {
  for (const item of items) URL.revokeObjectURL(item.url);
}

function ModeToggle({
  mode,
  onChange,
}: {
  mode: GeneratorMode;
  onChange: (mode: GeneratorMode) => void;
}) {
  return (
    <div
      role="tablist"
      aria-label="Genjutsu mode"
      className="inline-flex w-full max-w-full items-center gap-0.5 rounded-xl border border-white/8 bg-[rgba(28,22,18,0.92)] p-1 sm:w-auto"
    >
      {MODE_OPTIONS.map((opt) => {
        const selected = mode === opt.id;
        const Icon = opt.icon;
        return (
          <button
            key={opt.id}
            type="button"
            role="tab"
            aria-selected={selected}
            onClick={() => onChange(opt.id)}
            className={cn(
              'inline-flex h-8 flex-1 items-center justify-center gap-1.5 rounded-[10px] px-3 text-[12px] font-medium whitespace-nowrap transition-all duration-200 sm:flex-none sm:px-3.5',
              selected
                ? 'bg-[rgba(72,58,48,0.95)] text-[rgb(237,234,222)] shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] ring-1 ring-white/10'
                : 'bg-transparent text-[rgb(168,157,151)] hover:text-[rgb(220,214,204)]'
            )}
          >
            <Icon className="size-3.5 shrink-0" />
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

function useDragHighlight() {
  const [dragging, setDragging] = useState(false);
  const onDragOver = (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragging(true);
  };
  const onDragLeave = (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragging(false);
  };
  return { dragging, setDragging, onDragOver, onDragLeave };
}

function MediaLightbox({
  item,
  kind,
  onClose,
}: {
  item: MediaItem;
  kind: 'video' | 'image';
  onClose: () => void;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  if (typeof document === 'undefined') return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[400] flex items-center justify-center p-4 sm:p-8"
      role="dialog"
      aria-modal="true"
      aria-label={kind === 'video' ? 'Video preview' : 'Image preview'}
    >
      <button
        type="button"
        aria-label="Close preview"
        className="absolute inset-0 bg-black/75 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative z-10 max-h-[88vh] max-w-[min(92vw,760px)]">
        <button
          type="button"
          aria-label="Close"
          onClick={onClose}
          className="absolute -top-3 -right-3 z-20 flex size-8 items-center justify-center rounded-full border border-white/15 bg-[rgba(41,30,23,0.95)] text-[rgb(237,234,222)] shadow-lg hover:bg-[rgba(60,44,34,0.98)]"
        >
          <CloseIcon className="size-4" />
        </button>
        {kind === 'video' ? (
          <video
            src={item.url}
            controls
            className="max-h-[88vh] w-auto max-w-full rounded-xl object-contain shadow-2xl"
          />
        ) : (
          <img
            src={item.url}
            alt={item.file.name}
            className="max-h-[88vh] w-auto max-w-full rounded-xl object-contain shadow-2xl"
          />
        )}
      </div>
    </div>,
    document.body
  );
}

function EmptyUploadButton({
  title,
  hint,
  icon,
  dragging,
  onClick,
  ariaLabel,
}: {
  title: string;
  hint: string;
  icon: ReactNode;
  dragging: boolean;
  onClick: () => void;
  ariaLabel: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={ariaLabel}
      className="relative block h-[96px] w-[148px] focus:ring-0 focus:outline-none sm:w-[168px]"
    >
      <span
        className={cn(
          'border-primary/35 bg-primary/5 hover:border-primary/45 absolute inset-0 flex flex-col items-center justify-center gap-1 border-2 border-dashed px-2 text-[rgb(204,144,92)] shadow-[0_22px_54px_-40px_rgba(0,0,0,0.85)] transition-all duration-200 hover:-translate-y-1',
          dragging && 'border-primary/55 bg-primary/10 -translate-y-1'
        )}
      >
        {icon}
        <span className="text-foreground/78 text-center text-[10px] leading-snug font-medium">
          {title}
        </span>
        <span className="text-foreground/44 text-center text-[9px] leading-tight">
          {hint}
        </span>
      </span>
    </button>
  );
}

function VideoUploadSlot({
  item,
  onChange,
}: {
  item: MediaItem | null;
  onChange: (item: MediaItem | null) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const { dragging, setDragging, onDragOver, onDragLeave } = useDragHighlight();

  const takeFile = useCallback(
    (list: FileList | File[] | null) => {
      if (!list || list.length === 0) return;
      const file = Array.from(list).find((f) => f.type.startsWith('video/'));
      if (!file) return;
      revokeItem(item);
      onChange(createMediaItem(file));
    },
    [item, onChange]
  );

  const clear = () => {
    revokeItem(item);
    onChange(null);
    setPreviewOpen(false);
    if (inputRef.current) inputRef.current.value = '';
  };

  return (
    <>
      <div
        className="relative shrink-0"
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setDragging(false);
          takeFile(e.dataTransfer.files);
        }}
      >
        <input
          ref={inputRef}
          type="file"
          className="hidden"
          accept="video/*"
          aria-label="Add a reference video to edit"
          onChange={(e: ChangeEvent<HTMLInputElement>) => {
            takeFile(e.target.files);
            e.target.value = '';
          }}
        />

        {item ? (
          <button
            type="button"
            onClick={() => setPreviewOpen(true)}
            aria-label="Preview reference video"
            className="group relative block h-[96px] w-[68px] overflow-hidden rounded-[4px] border border-[rgba(204,144,92,0.35)] shadow-[0_10px_28px_-12px_rgba(0,0,0,0.75)] focus:outline-none"
          >
            <video
              src={item.url}
              muted
              playsInline
              className="h-full w-full object-cover"
            />
            <span className="absolute inset-x-0 bottom-0 bg-black/55 px-1 py-0.5 text-[9px] font-medium text-white/90">
              Video
            </span>
            <span
              role="button"
              tabIndex={0}
              aria-label="Remove reference video"
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
                clear();
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.stopPropagation();
                  e.preventDefault();
                  clear();
                }
              }}
              className="absolute -top-1.5 -right-1.5 flex size-5 items-center justify-center rounded-full border border-[rgba(204,144,92,0.35)] bg-[rgba(41,30,23,0.92)] text-[rgb(204,144,92)] opacity-0 shadow-md transition-opacity group-hover:opacity-100"
            >
              <CloseIcon className="size-3" />
            </span>
          </button>
        ) : (
          <EmptyUploadButton
            title="Add a reference video to edit"
            hint="Video duration: 4-30 seconds"
            icon={<FilmIcon className="text-primary/78 size-5 shrink-0" />}
            dragging={dragging}
            onClick={() => inputRef.current?.click()}
            ariaLabel="Add a reference video to edit"
          />
        )}
      </div>
      {previewOpen && item ? (
        <MediaLightbox
          item={item}
          kind="video"
          onClose={() => setPreviewOpen(false)}
        />
      ) : null}
    </>
  );
}

function ImageUploadSlot({
  items,
  onChange,
}: {
  items: MediaItem[];
  onChange: (items: MediaItem[]) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [previewId, setPreviewId] = useState<string | null>(null);
  const { dragging, setDragging, onDragOver, onDragLeave } = useDragHighlight();
  const previewItem = items.find((i) => i.id === previewId) ?? null;
  const canAdd = items.length < IMAGE_MAX;

  const mergeFiles = useCallback(
    (list: FileList | File[] | null) => {
      if (!list || list.length === 0) return;
      const incoming = Array.from(list).filter((f) =>
        f.type.startsWith('image/')
      );
      if (incoming.length === 0) return;
      const room = IMAGE_MAX - items.length;
      if (room <= 0) return;
      onChange([
        ...items,
        ...incoming.slice(0, room).map((file) => createMediaItem(file)),
      ]);
    },
    [items, onChange]
  );

  const removeAt = (id: string) => {
    const target = items.find((i) => i.id === id);
    if (target) URL.revokeObjectURL(target.url);
    onChange(items.filter((i) => i.id !== id));
    if (previewId === id) setPreviewId(null);
    if (inputRef.current) inputRef.current.value = '';
  };

  return (
    <>
      <div
        className="relative flex shrink-0 flex-wrap gap-2"
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setDragging(false);
          mergeFiles(e.dataTransfer.files);
        }}
      >
        <input
          ref={inputRef}
          type="file"
          className="hidden"
          accept="image/*"
          multiple
          aria-label="Add your characters, products, or clothes"
          onChange={(e: ChangeEvent<HTMLInputElement>) => {
            mergeFiles(e.target.files);
            e.target.value = '';
          }}
        />

        {items.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setPreviewId(item.id)}
            aria-label={`Preview ${item.file.name}`}
            className="group relative block h-[96px] w-[68px] overflow-hidden rounded-[4px] border border-[rgba(204,144,92,0.35)] shadow-[0_10px_28px_-12px_rgba(0,0,0,0.75)] focus:outline-none"
          >
            <img
              src={item.url}
              alt={item.file.name}
              className="h-full w-full object-cover"
              draggable={false}
            />
            <span
              role="button"
              tabIndex={0}
              aria-label="Remove image"
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
                removeAt(item.id);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.stopPropagation();
                  e.preventDefault();
                  removeAt(item.id);
                }
              }}
              className="absolute -top-1.5 -right-1.5 flex size-5 items-center justify-center rounded-full border border-[rgba(204,144,92,0.35)] bg-[rgba(41,30,23,0.92)] text-[rgb(204,144,92)] opacity-0 shadow-md transition-opacity group-hover:opacity-100"
            >
              <CloseIcon className="size-3" />
            </span>
          </button>
        ))}

        {items.length === 0 ? (
          <EmptyUploadButton
            title="Add your characters, products, or clothes"
            hint="Up to 30 images"
            icon={<ImageModeIcon className="text-primary/78 size-5 shrink-0" />}
            dragging={dragging}
            onClick={() => inputRef.current?.click()}
            ariaLabel="Add your characters, products, or clothes"
          />
        ) : canAdd ? (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            aria-label="Add more images"
            className="relative block h-[96px] w-[68px] focus:ring-0 focus:outline-none"
          >
            <span
              className={cn(
                'border-primary/35 bg-primary/5 hover:border-primary/45 absolute inset-0 flex flex-col items-center justify-center gap-1 border-2 border-dashed text-[rgb(204,144,92)] transition-all duration-200',
                dragging && 'border-primary/55 bg-primary/10'
              )}
            >
              <PlusIcon className="text-primary/78 size-5" />
              <span className="text-foreground/44 text-[9px] leading-tight">
                {items.length}/{IMAGE_MAX}
              </span>
            </span>
          </button>
        ) : null}
      </div>
      {previewItem ? (
        <MediaLightbox
          item={previewItem}
          kind="image"
          onClose={() => setPreviewId(null)}
        />
      ) : null}
    </>
  );
}

function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <div className="text-foreground/55 mb-1.5 px-1 text-[10px] font-medium">
      {children}
    </div>
  );
}

function OptionRow({ children }: { children: ReactNode }) {
  return (
    <div className="flex gap-1 rounded-[11px] bg-[rgba(72,52,38,0.2)] p-1 shadow-[inset_0_1px_0_rgba(255,255,255,0.015)]">
      {children}
    </div>
  );
}

function SegmentButton({
  selected,
  onClick,
  children,
}: {
  selected: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'relative flex h-7 min-w-0 flex-1 items-center justify-center overflow-visible rounded-[9px] px-2 text-[13px] font-medium transition-all duration-200',
        selected ? selectedOptionClass : idleOptionClass
      )}
    >
      {children}
    </button>
  );
}

function FloatingPanel({ children }: { children: ReactNode }) {
  return (
    <div className="animate-in fade-in slide-in-from-bottom-1 absolute bottom-full left-0 z-[1000] mb-2 w-[min(calc(100vw-2rem),280px)] max-w-[calc(100vw-1rem)] duration-200">
      <div className="overflow-y-hidden rounded-[20px] bg-[rgba(41,30,23,0.992)] p-2.5 shadow-[0_40px_80px_-12px_rgba(0,0,0,0.66)] backdrop-blur-2xl">
        {children}
      </div>
    </div>
  );
}

function ResolutionPanel({
  resolution,
  onResolution,
}: {
  resolution: Resolution;
  onResolution: (v: Resolution) => void;
}) {
  return (
    <div className="space-y-2">
      <section className="p-1">
        <SectionLabel>Resolution</SectionLabel>
        <OptionRow>
          {RESOLUTIONS.map((n) => (
            <SegmentButton
              key={n}
              selected={resolution === n}
              onClick={() => onResolution(n)}
            >
              {n}
            </SegmentButton>
          ))}
        </OptionRow>
      </section>
    </div>
  );
}

type GenerationStatus = 'idle' | 'generating' | 'done';

type GenerationResult = {
  id: string;
  mode: GeneratorMode;
  resolution: Resolution;
  prompt: string;
  /** Mock preview — uses the uploaded source video until real API is wired */
  previewUrl: string;
  imageCount: number;
  createdAt: number;
};

function ResultPanel({
  status,
  result,
  onDismiss,
}: {
  status: GenerationStatus;
  result: GenerationResult | null;
  onDismiss: () => void;
}) {
  if (status === 'idle') return null;

  const modeLabel =
    result?.mode === 'objects-swap' ? 'Objects swap' : 'Motion transfer';

  return (
    <div
      id="generation-result"
      className="mt-4 scroll-mt-24 overflow-hidden rounded-xl border border-white/8 bg-[rgba(41,30,23,0.92)] shadow-[0_24px_64px_-40px_rgba(0,0,0,0.68)]"
    >
      <div className="flex items-center justify-between gap-3 border-b border-white/8 px-4 py-3">
        <div className="min-w-0">
          <p className="text-sm font-medium text-[rgb(237,234,222)]">
            {status === 'generating' ? 'Generating…' : 'Result'}
          </p>
          {result ? (
            <p className="mt-0.5 truncate text-[11px] text-white/45">
              {modeLabel} · {result.resolution} · {result.imageCount} reference
              {result.imageCount === 1 ? '' : 's'}
              {result.prompt ? ` · ${result.prompt}` : ''}
            </p>
          ) : (
            <p className="mt-0.5 text-[11px] text-white/45">
              Mock run — no API yet. Preview uses your uploaded video.
            </p>
          )}
        </div>
        {status === 'done' ? (
          <button
            type="button"
            aria-label="Dismiss result"
            onClick={onDismiss}
            className="inline-flex size-8 shrink-0 items-center justify-center rounded-lg text-white/45 hover:bg-white/8 hover:text-white"
          >
            <CloseIcon className="size-4" />
          </button>
        ) : null}
      </div>

      <div className="relative flex min-h-[220px] items-center justify-center bg-black/35 p-3 sm:min-h-[320px] sm:p-4">
        {status === 'generating' ? (
          <div className="flex flex-col items-center gap-3 py-10">
            <span className="border-primary size-9 animate-spin rounded-full border-2 border-t-transparent" />
            <p className="text-sm text-white/55">
              Running Genjutsu ({result?.resolution ?? '…'})…
            </p>
          </div>
        ) : result ? (
          <video
            key={result.id}
            src={result.previewUrl}
            controls
            playsInline
            className="max-h-[min(70vh,520px)] w-full rounded-lg object-contain"
          />
        ) : null}
      </div>

      {status === 'done' && result ? (
        <div className="flex flex-wrap items-center gap-2 border-t border-white/8 px-4 py-3">
          <a
            href={result.previewUrl}
            download={`genjutsu-${result.mode}-${result.resolution}.mp4`}
            className="inline-flex h-8 items-center rounded-lg bg-[rgb(204,144,92)] px-3 text-sm font-semibold text-[rgb(247,246,243)] hover:brightness-105"
          >
            Download
          </a>
          <span className="text-[11px] text-white/40">
            Placeholder preview (source video) — wire Higgsfield API next
          </span>
        </div>
      ) : null}
    </div>
  );
}

export function GeneratorPanel({
  mode: modeProp,
  className,
  hidePromo: _hidePromo = false,
  onModeChange,
}: GeneratorPanelProps) {
  const [internalMode, setInternalMode] =
    useState<GeneratorMode>('motion-transfer');
  const mode = modeProp ?? internalMode;

  const setMode = (next: GeneratorMode) => {
    if (onModeChange) onModeChange(next);
    if (modeProp === undefined) setInternalMode(next);
  };

  const [prompt, setPrompt] = useState('');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [resolution, setResolution] = useState<Resolution>('720p');
  const [video, setVideo] = useState<MediaItem | null>(null);
  const [images, setImages] = useState<MediaItem[]>([]);
  const [status, setStatus] = useState<GenerationStatus>('idle');
  const [result, setResult] = useState<GenerationResult | null>(null);

  const settingsRef = useRef<HTMLDivElement>(null);
  const generateTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setSettingsOpen(false);
  }, [mode]);

  useEffect(() => {
    return () => {
      revokeItem(video);
      revokeAll(images);
      if (generateTimerRef.current) clearTimeout(generateTimerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- revoke only on unmount
  }, []);

  useEffect(() => {
    if (!settingsOpen) return;
    const onPointerDown = (e: PointerEvent) => {
      if (!settingsRef.current?.contains(e.target as Node)) {
        setSettingsOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSettingsOpen(false);
    };
    document.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('keydown', onKey);
    };
  }, [settingsOpen]);

  const placeholder =
    mode === 'objects-swap'
      ? 'Describe what to swap in the video (optional)...'
      : 'Describe the new scene or character (optional)...';

  const canGenerate =
    Boolean(video && images.length > 0) && status !== 'generating';
  const creditCost =
    resolution === '1080p' ? 20 : resolution === '720p' ? 12 : 8;

  const handleGenerate = () => {
    if (!video || images.length === 0 || status === 'generating') return;

    const draft: GenerationResult = {
      id: `${Date.now()}`,
      mode,
      resolution,
      prompt: prompt.trim(),
      previewUrl: video.url,
      imageCount: images.length,
      createdAt: Date.now(),
    };

    setResult(draft);
    setStatus('generating');

    requestAnimationFrame(() => {
      document
        .getElementById('generation-result')
        ?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    });

    if (generateTimerRef.current) clearTimeout(generateTimerRef.current);
    generateTimerRef.current = setTimeout(() => {
      setStatus('done');
    }, 2200);
  };

  return (
    <div
      className={cn(
        'relative z-[120] mx-auto w-full max-w-[1128px] sm:rounded-2xl sm:shadow-[0_28px_72px_-42px_rgba(0,0,0,0.72)]',
        className
      )}
    >
      <div className="rounded-xl border border-white/8 bg-[rgba(94,78,67,0.88)] px-2 py-2 shadow-[0_24px_64px_-40px_rgba(0,0,0,0.68)] sm:p-3 sm:pb-1">
        <div className="mb-2 flex items-center justify-between gap-2 border-b border-white/8 pb-2">
          <ModeToggle mode={mode} onChange={setMode} />
        </div>

        <div className="flex min-h-[124px] flex-col items-stretch gap-2 sm:min-h-[144px] sm:flex-row sm:gap-3">
          <div className="flex shrink-0 flex-wrap gap-2 self-start pt-1 sm:pt-2">
            <VideoUploadSlot item={video} onChange={setVideo} />
            <ImageUploadSlot items={images} onChange={setImages} />
          </div>

          <div className="relative flex min-w-0 flex-1 flex-col">
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder={placeholder}
              rows={3}
              className="placeholder:text-muted-foreground/70 min-h-[96px] w-full resize-none border-0 bg-transparent p-0 text-sm leading-relaxed text-[rgb(237,234,222)] shadow-none outline-none sm:min-h-[124px] sm:text-[14px]"
            />

            <div className="mt-auto flex items-center justify-end pb-1 text-[11px] text-white/45">
              <span className="tabular-nums">{prompt.length} / 2,000</span>
            </div>
          </div>
        </div>

        <div className="relative mt-1 flex flex-wrap items-center gap-1.5 border-t border-white/8 pt-2 pb-2 sm:gap-2">
          <div className="relative" ref={settingsRef}>
            <button
              type="button"
              aria-expanded={settingsOpen}
              aria-haspopup="dialog"
              onClick={() => setSettingsOpen((v) => !v)}
              className={cn(
                chipClass,
                'gap-1',
                settingsOpen && 'bg-[rgba(109,112,121,0.42)]'
              )}
            >
              <span className="text-foreground/90 font-medium">
                {resolution}
              </span>
              <ChevronDownIcon
                className={cn(
                  'ml-0.5 size-3.5 opacity-60 transition-transform duration-200',
                  settingsOpen && 'rotate-180'
                )}
              />
            </button>

            {settingsOpen ? (
              <FloatingPanel>
                <ResolutionPanel
                  resolution={resolution}
                  onResolution={setResolution}
                />
              </FloatingPanel>
            ) : null}
          </div>

          <button
            type="button"
            disabled={!canGenerate}
            onClick={handleGenerate}
            className={cn(
              'relative ml-auto inline-flex h-8 w-full items-center justify-center rounded-lg px-3.5 text-sm font-semibold tracking-wide shadow-none transition-all duration-200 active:scale-95 sm:w-auto',
              canGenerate
                ? 'bg-[rgb(204,144,92)] text-[rgb(247,246,243)] hover:brightness-105'
                : 'bg-[rgba(126,128,132,0.28)] text-[rgb(237,234,222)]/38'
            )}
          >
            {status === 'generating' ? 'Generating…' : 'Generate'}
            <span className="ml-1.5 inline-flex items-center gap-0.5 text-[11px] font-medium opacity-80">
              <ZapIcon className="size-3" />
              {creditCost}
            </span>
          </button>
        </div>
      </div>

      <ResultPanel
        status={status}
        result={result}
        onDismiss={() => {
          setStatus('idle');
          setResult(null);
        }}
      />
    </div>
  );
}
