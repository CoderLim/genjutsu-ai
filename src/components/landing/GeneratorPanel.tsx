import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type DragEvent,
  type ReactNode,
} from 'react';
import { CircleHelp } from 'lucide-react';
import { createPortal } from 'react-dom';
import { toast } from 'sonner';

import { useSession } from '@/core/auth/client';
import { estimateGenjutsuCredits } from '@/modules/genjutsu/pricing';
import {
  ApiError,
  apiGet,
  apiPost,
  SignedUploadError,
  uploadToSignedUrl,
} from '@/lib/api-client';
import { cn } from '@/lib/cn';
import {
  collectUploadDiagnostics,
  type UploadClientDiagnostics,
} from '@/lib/upload-diagnostics';
import { m } from '@/paraglide/messages.js';
import { useUserCredits } from '@/hooks/use-user-credits';
import {
  ChevronDownIcon,
  CloseIcon,
  FilmIcon,
  ImageModeIcon,
  MotionTransferIcon,
  ObjectsSwapIcon,
  PlusIcon,
} from '@/components/icons';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

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
  /** Present on validated source videos (seconds from browser metadata). */
  durationSeconds?: number;
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

const IMAGE_MAX = 8;
const MAX_SOURCE_VIDEO_BYTES = 200 * 1024 * 1024;
const MAX_REFERENCE_IMAGE_BYTES = 12 * 1024 * 1024;
// Seedance Objects Swap uses task=editing. Clips shorter than 4s are rejected
// by Seedance with a misleading "set aspect_ratio/duration to auto" error
// (Fal's generic reference-video floor is ~1.8s, but editing requires >= 4s).
// Keep the upload gate on that editing floor and match the UI "4–30s" hint.
const MIN_SOURCE_VIDEO_SECONDS = 4;
const MAX_SOURCE_VIDEO_SECONDS = 30;

function revokeItem(item: MediaItem | null) {
  if (item) URL.revokeObjectURL(item.url);
}

function revokeAll(items: MediaItem[]) {
  for (const item of items) URL.revokeObjectURL(item.url);
}

/** Read duration from a local video File via browser metadata. */
function readLocalVideoDurationSeconds(file: File): Promise<number> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const video = document.createElement('video');
    video.preload = 'metadata';
    const cleanup = () => {
      video.removeAttribute('src');
      video.load();
      URL.revokeObjectURL(url);
    };
    video.onloadedmetadata = () => {
      const duration = video.duration;
      cleanup();
      if (!Number.isFinite(duration) || duration <= 0) {
        reject(new Error('Could not read video duration'));
        return;
      }
      resolve(duration);
    };
    video.onerror = () => {
      cleanup();
      reject(new Error('Could not read video duration'));
    };
    video.src = url;
  });
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
        {title ? (
          <span className="text-foreground/78 text-center text-[10px] leading-snug font-medium">
            {title}
          </span>
        ) : null}
        {hint ? (
          <span className="text-foreground/44 text-center text-[9px] leading-tight">
            {hint}
          </span>
        ) : null}
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
      if (file.size <= 0 || file.size > MAX_SOURCE_VIDEO_BYTES) {
        toast.error('Source video must be 200 MB or smaller');
        return;
      }

      void (async () => {
        try {
          const durationSeconds = await readLocalVideoDurationSeconds(file);
          // See MIN_SOURCE_VIDEO_SECONDS: Seedance editing rejects <4s clips.
          if (
            durationSeconds < MIN_SOURCE_VIDEO_SECONDS ||
            durationSeconds > MAX_SOURCE_VIDEO_SECONDS
          ) {
            toast.error(
              `Source video must be ${MIN_SOURCE_VIDEO_SECONDS}–${MAX_SOURCE_VIDEO_SECONDS} seconds (got ${durationSeconds.toFixed(1)}s)`
            );
            return;
          }
          revokeItem(item);
          onChange({
            ...createMediaItem(file),
            durationSeconds,
          });
        } catch {
          toast.error(
            'Could not read video duration. Please use an MP4/MOV between 4 and 30 seconds.'
          );
        }
      })();
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
            hint="4–30s · no real people in the source video"
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

function isLikenessRejectionMessage(message: string) {
  return /images and videos cannot contain real people|likenesses of real people|real people|private information that cannot be processed|human face|真人|肖像/i.test(
    message
  );
}

function likenessRejectionUiMessage(cause: unknown): string {
  const code =
    cause instanceof ApiError &&
    cause.data &&
    typeof cause.data === 'object' &&
    'code' in cause.data
      ? String((cause.data as { code?: unknown }).code)
      : '';
  const message =
    cause instanceof ApiError
      ? cause.message
      : cause instanceof Error
        ? cause.message
        : typeof cause === 'string'
          ? cause
          : '';

  if (
    code === 'PROVIDER_LIKENESS_REJECTED' ||
    isLikenessRejectionMessage(message)
  ) {
    return m['genjutsu.safety.face_rejected']();
  }
  return message;
}

function generationFailureUiMessage(error?: string | null) {
  if (error && isLikenessRejectionMessage(error)) {
    return m['genjutsu.safety.face_rejected']();
  }
  return error || '';
}

function classifyUploadFailure(cause: unknown) {
  if (cause instanceof SignedUploadError) {
    if (cause.httpStatus != null) {
      return {
        errorCode: 'UPLOAD_HTTP_ERROR' as const,
        httpStatus: cause.httpStatus,
        diagnostics: cause.diagnostics,
      };
    }
    if (cause.cause instanceof Error && cause.cause.name === 'AbortError') {
      return {
        errorCode: 'UPLOAD_ABORTED' as const,
        httpStatus: null,
        diagnostics: cause.diagnostics,
      };
    }
    return {
      errorCode: 'UPLOAD_NETWORK_ERROR' as const,
      httpStatus: null,
      diagnostics: cause.diagnostics,
    };
  }

  if (
    cause instanceof ApiError &&
    Number.isInteger(cause.code) &&
    cause.code >= 400 &&
    cause.code <= 599
  ) {
    return {
      errorCode: 'UPLOAD_HTTP_ERROR' as const,
      httpStatus: cause.code,
      diagnostics: null as UploadClientDiagnostics | null,
    };
  }

  if (cause instanceof Error && cause.name === 'AbortError') {
    return {
      errorCode: 'UPLOAD_ABORTED' as const,
      httpStatus: null,
      diagnostics: null as UploadClientDiagnostics | null,
    };
  }

  return {
    errorCode: 'UPLOAD_NETWORK_ERROR' as const,
    httpStatus: null,
    diagnostics: null as UploadClientDiagnostics | null,
  };
}

async function reportUploadFailure(params: {
  generationId: string;
  fileIndex: number;
  cause: unknown;
}) {
  const failure = classifyUploadFailure(params.cause);
  return apiPost<{
    generationId: string;
    status: string;
    recorded: boolean;
    recovered: boolean;
    r2ObjectExists: boolean | null;
    r2ObjectSizeMatches: boolean | null;
    r2ObjectTypeMatches: boolean | null;
  }>('/api/genjutsu/attempt-failure', {
    generationId: params.generationId,
    fileIndex: params.fileIndex,
    errorCode: failure.errorCode,
    httpStatus: failure.httpStatus,
    diagnostics: failure.diagnostics,
  });
}

async function reportUploadRetrySucceeded(params: {
  generationId: string;
  fileIndex: number;
  attemptCount: number;
  uploadElapsedMs: number;
}) {
  return apiPost('/api/genjutsu/attempt-failure', {
    generationId: params.generationId,
    fileIndex: params.fileIndex,
    event: 'retry_succeeded',
    diagnostics: collectUploadDiagnostics({
      attemptCount: params.attemptCount,
      uploadElapsedMs: params.uploadElapsedMs,
    }),
  });
}

function redirectToSignIn() {
  const callbackUrl = encodeURIComponent(
    `${window.location.pathname}${window.location.search}`
  );
  window.location.href = `/sign-in?callbackUrl=${callbackUrl}`;
}

function ImageUploadSlot({
  items,
  onChange,
  signedIn,
}: {
  items: MediaItem[];
  onChange: (items: MediaItem[]) => void;
  signedIn: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [previewId, setPreviewId] = useState<string | null>(null);
  const { dragging, setDragging, onDragOver, onDragLeave } = useDragHighlight();
  const previewItem = items.find((i) => i.id === previewId) ?? null;
  const canAdd = items.length < IMAGE_MAX;

  const openPicker = useCallback(() => {
    if (!signedIn) {
      redirectToSignIn();
      return;
    }
    inputRef.current?.click();
  }, [signedIn]);

  const mergeFiles = useCallback(
    (list: FileList | File[] | null) => {
      if (!list || list.length === 0) return;
      if (!signedIn) {
        redirectToSignIn();
        return;
      }

      const incoming = Array.from(list).filter((f) =>
        f.type.startsWith('image/')
      );
      if (incoming.length === 0) return;
      const room = IMAGE_MAX - items.length;
      if (room <= 0) return;

      const accepted = incoming
        .slice(0, room)
        .filter((file) => {
          if (file.size <= 0 || file.size > MAX_REFERENCE_IMAGE_BYTES) {
            toast.error(`"${file.name}" must be 12 MB or smaller`);
            return false;
          }
          return true;
        })
        .map((file) => createMediaItem(file));

      if (accepted.length > 0) {
        onChange([...items, ...accepted]);
      }
    },
    [items, onChange, signedIn]
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
          aria-label="Add products, clothes, objects, or scenes"
          onChange={(e: ChangeEvent<HTMLInputElement>) => {
            mergeFiles(e.target.files);
            e.target.value = '';
          }}
        />

        {items.map((item, index) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setPreviewId(item.id)}
            aria-label={`Preview Reference ${index + 1}: ${item.file.name}`}
            className="group relative block h-[96px] w-[68px] overflow-hidden rounded-[4px] border border-[rgba(204,144,92,0.35)] shadow-[0_10px_28px_-12px_rgba(0,0,0,0.75)] focus:outline-none"
          >
            <img
              src={item.url}
              alt={item.file.name}
              className="h-full w-full object-cover"
              draggable={false}
            />
            <span className="absolute inset-x-0 bottom-0 bg-black/60 px-1 py-0.5 text-center text-[8px] font-medium text-white/90">
              Reference {index + 1}
            </span>
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
            title="Add products, clothes, objects, or scenes"
            hint={m['genjutsu.safety.upload_hint']()}
            icon={<ImageModeIcon className="text-primary/78 size-5 shrink-0" />}
            dragging={dragging}
            onClick={openPicker}
            ariaLabel="Add products, clothes, objects, or scenes"
          />
        ) : canAdd ? (
          <button
            type="button"
            onClick={openPicker}
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
  previewUrl: string;
  imageCount: number;
  createdAt: number;
  reservedCredits?: number;
};

type SignedUpload = {
  uploadUrl: string;
  uploadHeaders: Record<string, string>;
  storageKey?: string;
  publicUrl?: string;
};

type GenerationStart = {
  generationId: string;
  requestId: string | null;
  status: string;
  reservedCredits: number;
  providerCostUsd?: number | null;
};

type GenerationPoll = {
  status: 'processing' | 'completed' | 'failed';
  providerStatus: string;
  videoUrl: string | null;
  error?: string;
  reservedCredits?: number;
  refundedCredits?: number;
};

type PersistedGeneration = {
  userId: string;
  generationId: string;
  draft: GenerationResult;
  reservedCredits: number;
};

const sleep = (ms: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, ms));

const activeGenerationKey = (userId: string) =>
  `genjutsu_active_generation:${userId}`;

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
              {result.reservedCredits
                ? ` · ${result.reservedCredits} credits`
                : ''}
              {result.prompt ? ` · ${result.prompt}` : ''}
            </p>
          ) : (
            <p className="mt-0.5 text-[11px] text-white/45">
              Uploading references and starting generation…
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
              Uploading references and running Genjutsu (
              {result?.resolution ?? '…'})…
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
            Generated with Genjutsu AI
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
  const { data: session } = useSession();
  const creditsQuery = useUserCredits(Boolean(session?.user));
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
  const [error, setError] = useState('');
  const [needsCredits, setNeedsCredits] = useState(false);

  const settingsRef = useRef<HTMLDivElement>(null);
  const generationRunRef = useRef(0);

  useEffect(() => {
    setSettingsOpen(false);
  }, [mode]);

  useEffect(() => {
    return () => {
      generationRunRef.current += 1;
      revokeItem(video);
      revokeAll(images);
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
      ? images.length > 1
        ? 'e.g. Replace the man with Reference 1 and the phone with Reference 2 (optional)...'
        : 'Describe what to swap in the video (optional)...'
      : images.length > 1
        ? 'e.g. Use Reference 1 for the main character and Reference 2 for the outfit (optional)...'
        : 'Describe the new scene, style, product, or object (optional)...';

  const pollGeneration = useCallback(
    async (active: PersistedGeneration, runId: number) => {
      let delayMs = 1_500;
      let notFoundCount = 0;

      for (let attempt = 0; attempt < 90; attempt += 1) {
        await sleep(delayMs);
        if (generationRunRef.current !== runId) return;

        let polled: GenerationPoll;
        try {
          polled = await apiGet<GenerationPoll>(
            `/api/genjutsu/status?generationId=${encodeURIComponent(active.generationId)}`
          );
        } catch (cause) {
          const data =
            cause instanceof ApiError &&
            cause.data &&
            typeof cause.data === 'object'
              ? (cause.data as Record<string, unknown>)
              : null;

          if (data?.code === 'GENERATION_NOT_FOUND') {
            notFoundCount += 1;
            // A lost /generate response can race the server-side estimate.
            // Wait generously before concluding the paid request never began.
            if (notFoundCount >= 15) {
              localStorage.removeItem(activeGenerationKey(active.userId));
              setStatus('idle');
              setResult(null);
              setError(
                'Generation was not accepted by the server. No active paid job was found.'
              );
              return;
            }
          }

          // A transient status request must not unlock Generate while a paid
          // provider job may still be running. Keep the persisted job and try
          // again on the next poll.
          delayMs = Math.min(5_000, Math.ceil(delayMs * 1.2));
          continue;
        }

        notFoundCount = 0;

        if (
          polled.providerStatus === 'initiated' ||
          polled.providerStatus === 'sealing' ||
          polled.providerStatus === 'ready'
        ) {
          // These states are definitively before credit reservation/provider
          // submission. Never turn a page refresh into a paid generation.
          localStorage.removeItem(activeGenerationKey(active.userId));
          setStatus('idle');
          setResult(null);
          setNeedsCredits(false);
          setError(
            polled.providerStatus === 'ready'
              ? 'Upload completed, but generation was not started. Click Generate to try again.'
              : 'The previous upload did not finish starting a generation. Click Generate to try again.'
          );
          return;
        }

        if (
          typeof polled.reservedCredits === 'number' &&
          polled.reservedCredits > 0 &&
          polled.reservedCredits !== active.reservedCredits
        ) {
          active.reservedCredits = polled.reservedCredits;
          localStorage.setItem(
            activeGenerationKey(active.userId),
            JSON.stringify(active)
          );
          setResult({
            ...active.draft,
            reservedCredits: polled.reservedCredits,
          });
        }

        if (polled.providerStatus === 'submission_unknown') {
          setError(
            polled.error ||
              'The provider submission result is uncertain. This generation remains locked to avoid a duplicate charge.'
          );
          return;
        }

        if (polled.status === 'completed' && polled.videoUrl) {
          if (generationRunRef.current !== runId) return;
          localStorage.removeItem(activeGenerationKey(active.userId));
          setResult({
            ...active.draft,
            reservedCredits: active.reservedCredits,
            previewUrl: polled.videoUrl,
          });
          setError('');
          setStatus('done');
          return;
        }

        if (polled.status === 'failed') {
          localStorage.removeItem(activeGenerationKey(active.userId));
          setStatus('idle');
          setResult(null);
          setNeedsCredits(polled.providerStatus === 'insufficient_credits');
          const uiError =
            generationFailureUiMessage(polled.error) ||
            `Generation failed (${polled.providerStatus})`;
          setError(uiError);
          return;
        }

        delayMs = Math.min(5_000, Math.ceil(delayMs * 1.2));
      }

      // Do not return to idle here: the provider job can still be running and
      // enabling Generate would make a second paid generation too easy.
      setError(
        'Generation is still processing. This job remains reserved; refresh the page to resume checking it.'
      );
    },
    []
  );

  useEffect(() => {
    const userId = session?.user?.id;
    if (!userId || status !== 'idle') return;

    try {
      const raw = localStorage.getItem(activeGenerationKey(userId));
      if (!raw) return;

      const active = JSON.parse(raw) as PersistedGeneration;
      if (
        active.userId !== userId ||
        !active.generationId ||
        !active.draft ||
        !Number.isFinite(active.reservedCredits)
      ) {
        localStorage.removeItem(activeGenerationKey(userId));
        return;
      }

      const runId = ++generationRunRef.current;
      setError('');
      setNeedsCredits(false);
      setResult({
        ...active.draft,
        reservedCredits: active.reservedCredits,
      });
      setStatus('generating');
      void pollGeneration(active, runId);
    } catch {
      localStorage.removeItem(activeGenerationKey(userId));
    }
  }, [pollGeneration, session?.user?.id, status]);

  const canGenerate =
    Boolean(video && images.length > 0) && status !== 'generating';

  const estimatedCredits = useMemo(() => {
    const durationSeconds = video?.durationSeconds;
    if (
      typeof durationSeconds !== 'number' ||
      !Number.isFinite(durationSeconds) ||
      durationSeconds <= 0
    ) {
      return null;
    }
    try {
      return estimateGenjutsuCredits({
        durationSeconds,
        resolution,
      });
    } catch {
      return null;
    }
  }, [resolution, video?.durationSeconds]);

  const estimateExceedsBalance =
    estimatedCredits != null &&
    typeof creditsQuery.data?.balance === 'number' &&
    creditsQuery.data.balance < estimatedCredits;

  const handleGenerate = async () => {
    if (!video || images.length === 0 || status === 'generating') return;

    if (!session?.user) {
      redirectToSignIn();
      return;
    }

    const runId = ++generationRunRef.current;
    const generationId =
      typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : `gen-${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
    const draft: GenerationResult = {
      id: generationId,
      mode,
      resolution,
      prompt: prompt.trim(),
      previewUrl: '',
      imageCount: images.length,
      createdAt: Date.now(),
    };

    setError('');
    setNeedsCredits(false);
    setResult(draft);
    setStatus('generating');

    requestAnimationFrame(() => {
      document
        .getElementById('generation-result')
        ?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    });

    try {
      await apiPost('/api/genjutsu/attempt', {
        generationId,
        mode,
        resolution,
        prompt: prompt.trim(),
      });

      const media = [video, ...images];
      const contentTypes = media.map(
        (item, index) =>
          item.file.type || (index === 0 ? 'video/mp4' : 'image/jpeg')
      );
      const contentLengths = media.map((item) => item.file.size);
      const uploadBatch = await apiPost<{ uploads: SignedUpload[] }>(
        '/api/genjutsu/upload-url',
        {
          generationId,
          mode,
          resolution,
          prompt: prompt.trim(),
          contentTypes,
          contentLengths,
        }
      );

      if (uploadBatch.uploads.length !== media.length) {
        throw new Error('Storage returned an incomplete upload batch');
      }

      for (let index = 0; index < media.length; index += 1) {
        const upload = uploadBatch.uploads[index];
        if (!upload) throw new Error('Missing storage upload URL');
        try {
          const uploaded = await uploadToSignedUrl({
            url: upload.uploadUrl,
            file: media[index].file,
            headers: upload.uploadHeaders,
          });
          if (uploaded.attemptCount > 1) {
            await reportUploadRetrySucceeded({
              generationId,
              fileIndex: index,
              attemptCount: uploaded.attemptCount,
              uploadElapsedMs: uploaded.uploadElapsedMs,
            }).catch(() => undefined);
          }
        } catch (cause) {
          const report = await reportUploadFailure({
            generationId,
            fileIndex: index,
            cause,
          }).catch(() => null);
          if (report?.recovered) {
            continue;
          }
          throw cause;
        }
      }

      if (generationRunRef.current !== runId) return;

      await apiPost('/api/genjutsu/seal-inputs', {
        generationId,
      });

      // Persist before the paid POST. A refresh may reconcile an already-paid
      // job, but must never auto-start a still-unpaid ready attempt.
      const active: PersistedGeneration = {
        userId: session.user.id,
        generationId,
        draft,
        reservedCredits: 0,
      };
      localStorage.setItem(
        activeGenerationKey(session.user.id),
        JSON.stringify(active)
      );

      const started = await apiPost<GenerationStart>('/api/genjutsu/generate', {
        generationId,
      });

      active.generationId = started.generationId;
      active.reservedCredits = started.reservedCredits;
      localStorage.setItem(
        activeGenerationKey(session.user.id),
        JSON.stringify(active)
      );
      setResult({
        ...draft,
        reservedCredits: started.reservedCredits,
      });

      await pollGeneration(active, runId);
    } catch (cause) {
      if (generationRunRef.current !== runId) return;

      const apiData =
        cause instanceof ApiError &&
        cause.data &&
        typeof cause.data === 'object'
          ? (cause.data as Record<string, unknown>)
          : null;
      const insufficient = apiData?.code === 'INSUFFICIENT_CREDITS';
      const submissionUnknown = apiData?.code === 'SUBMISSION_UNKNOWN';

      if (cause instanceof ApiError && !submissionUnknown) {
        // The server returned a definitive structured error, so there is no
        // live paid request to resume (or it has already been refunded).
        localStorage.removeItem(activeGenerationKey(session.user.id));
        setStatus('idle');
        setResult(null);
        setNeedsCredits(insufficient);
        const likenessRejected =
          apiData?.code === 'PROVIDER_LIKENESS_REJECTED' ||
          (typeof cause.message === 'string' &&
            isLikenessRejectionMessage(cause.message));
        const uiMessage = likenessRejected
          ? likenessRejectionUiMessage(cause)
          : cause.message;
        if (likenessRejected) toast.error(uiMessage);
        setError(uiMessage);
        return;
      }

      // Network failure or SUBMISSION_UNKNOWN: the paid POST may have reached
      // the configured provider. Keep the generation locked and reconcile by generationId.
      const raw = localStorage.getItem(activeGenerationKey(session.user.id));
      if (raw) {
        try {
          const active = JSON.parse(raw) as PersistedGeneration;
          setNeedsCredits(false);
          setResult({
            ...active.draft,
            reservedCredits: active.reservedCredits,
          });
          setStatus('generating');
          setError(
            submissionUnknown
              ? cause instanceof Error
                ? cause.message
                : 'Generation submission result is uncertain.'
              : 'Connection lost while starting generation. Checking the existing job before allowing another submission.'
          );
          void pollGeneration(active, runId);
          return;
        } catch {
          localStorage.removeItem(activeGenerationKey(session.user.id));
        }
      }

      setStatus('idle');
      setResult(null);
      setNeedsCredits(insufficient);
      setError(
        cause instanceof Error
          ? cause.message
          : 'Generation failed unexpectedly'
      );
    }
  };

  return (
    <div
      className={cn(
        'relative z-[120] mx-auto w-full max-w-[1180px] sm:rounded-2xl sm:shadow-[0_28px_72px_-42px_rgba(0,0,0,0.72)]',
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
            <ImageUploadSlot
              items={images}
              onChange={setImages}
              signedIn={Boolean(session?.user)}
            />
          </div>

          <div className="relative flex min-w-0 flex-1 flex-col">
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder={placeholder}
              rows={3}
              className="placeholder:text-muted-foreground/70 min-h-[96px] w-full resize-none border-0 bg-transparent p-0 text-sm leading-relaxed text-[rgb(237,234,222)] shadow-none outline-none sm:min-h-[124px] sm:text-[14px]"
            />

            <div className="mt-auto flex items-end justify-between gap-3 pb-1 text-[11px] text-white/45">
              {images.length > 1 ? (
                <span className="max-w-[75%] leading-snug">
                  Use Reference 1, Reference 2, etc. to map each image to a
                  target.
                </span>
              ) : (
                <span />
              )}
              <span className="shrink-0 tabular-nums">
                {prompt.length} / 2,000
              </span>
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

          <div className="ml-auto flex w-full items-center justify-end gap-2 sm:w-auto">
            {estimatedCredits != null ? (
              <div
                className={cn(
                  'flex shrink-0 items-center gap-1 text-[12px] tabular-nums',
                  estimateExceedsBalance
                    ? 'text-[rgb(220,120,90)]'
                    : 'text-white/50'
                )}
              >
                <span>
                  {m['genjutsu.estimate.credits']({
                    count: estimatedCredits.toLocaleString(),
                  })}
                </span>
                <TooltipProvider delay={200}>
                  <Tooltip>
                    <TooltipTrigger
                      type="button"
                      className="inline-flex size-4 items-center justify-center rounded-full text-current/70 transition-colors hover:text-current"
                      aria-label={m['genjutsu.estimate.help_aria']()}
                    >
                      <CircleHelp className="size-3.5" aria-hidden />
                    </TooltipTrigger>
                    <TooltipContent
                      side="top"
                      align="end"
                      className="max-w-[240px] text-left leading-snug"
                    >
                      {m['genjutsu.estimate.tooltip']()}
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            ) : null}
            <button
              type="button"
              disabled={!canGenerate}
              onClick={handleGenerate}
              className={cn(
                'relative inline-flex h-8 flex-1 items-center justify-center rounded-lg px-3.5 text-sm font-semibold tracking-wide shadow-none transition-all duration-200 active:scale-95 sm:w-auto sm:flex-none',
                canGenerate
                  ? 'bg-[rgb(204,144,92)] text-[rgb(247,246,243)] hover:brightness-105'
                  : 'bg-[rgba(126,128,132,0.28)] text-[rgb(237,234,222)]/38'
              )}
            >
              {status === 'generating' ? 'Generating…' : 'Generate'}
            </button>
          </div>
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

      {error ? (
        <div
          role="alert"
          className="mt-3 rounded-xl border border-red-400/20 bg-red-950/25 px-4 py-3 text-sm text-red-100/90"
        >
          <p className="font-medium">Generation failed</p>
          <p className="mt-1 text-xs text-red-100/65">{error}</p>
          {needsCredits ? (
            <a
              href="/pricing"
              className="mt-2 inline-flex text-xs font-semibold text-red-50 underline underline-offset-2"
            >
              Buy credits
            </a>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
