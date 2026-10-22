import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type ReactNode,
  type RefObject,
} from 'react';
import { CircleHelp, Download } from 'lucide-react';
import { toast } from 'sonner';

import { useSession } from '@/core/auth/client';
import {
  ENZO_FERNANDEZ_AI_ASPECT_RATIO,
  ENZO_FERNANDEZ_AI_DEFAULT_PROMPT,
  ENZO_FERNANDEZ_AI_DEFAULT_RESOLUTION,
  ENZO_FERNANDEZ_AI_MODE,
  ENZO_FERNANDEZ_AI_PRODUCT_ID,
  ENZO_FERNANDEZ_AI_RESOLUTIONS,
  ENZO_FERNANDEZ_AI_TEMPLATE_DURATION_SECONDS,
  ENZO_FERNANDEZ_AI_TEMPLATE_PATH,
  ENZO_FERNANDEZ_AI_TEMPLATE_POSTER_PATH,
  type EnzoFernandezAiResolution,
} from '@/modules/enzo-fernandez-ai/constants';
import { estimateGenjutsuCreditsForProvider } from '@/modules/genjutsu/pricing';
import type { GenjutsuProvider } from '@/modules/genjutsu/types';
import { ApiError, apiGet, apiPost, uploadToSignedUrl } from '@/lib/api-client';
import { cn } from '@/lib/cn';
import { trimVideoToFile } from '@/lib/trim-video';
import { collectUploadDiagnostics } from '@/lib/upload-diagnostics';
import {
  classifyUploadFailure,
  uploadFailureUserMessage,
} from '@/lib/upload-failure';
import {
  prepareReferenceImageFile,
  UploadFileReadError,
} from '@/lib/upload-file-preparation';
import { resolveUploadStorageIndex } from '@/lib/upload-storage-index';
import { m } from '@/paraglide/messages.js';
import { useCreditGate } from '@/hooks/use-credit-gate';
import type { FixedTemplateMediaStatus } from '@/hooks/use-fixed-template-media';
import { useSingleImagePrepareGuard } from '@/hooks/use-image-prepare-guard';
import { useUserCredits } from '@/hooks/use-user-credits';
import { InsufficientCreditsModal } from '@/components/credits/insufficient-credits-modal';
import { ChevronDownIcon, CloseIcon, ImageModeIcon } from '@/components/icons';
import { FixedTemplatePreview } from '@/components/landing/FixedTemplatePreview';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

type MediaItem = {
  id: string;
  file: File;
  url: string;
};

type SignedUpload = {
  uploadUrl: string;
  uploadHeaders: Record<string, string>;
  storageKey: string;
  index: number;
};

type GenerationStart = {
  generationId: string;
  requestId: string | null;
  status: string;
  reservedCredits: number;
};

type GenerationPoll = {
  status: 'processing' | 'completed' | 'failed';
  providerStatus: string;
  videoUrl: string | null;
  error?: string;
  errorCode?: string;
  reservedCredits?: number;
  refundedCredits?: number;
  requiredCredits?: number;
  balance?: number;
};

/** Paid preview length — match homepage Genjutsu (Seedance editing floor). */
const PREVIEW_DURATION_SECONDS = 4;

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

type PersistedGeneration = {
  userId: string;
  generationId: string;
  resolution: EnzoFernandezAiResolution;
  reservedCredits: number;
  kind?: 'preview' | 'full';
};

const MAX_IMAGE_BYTES = 12 * 1024 * 1024;

const chipClass =
  'inline-flex h-7 max-w-full min-w-0 shrink-0 items-center gap-1 rounded-lg border border-transparent bg-[rgba(94,96,104,0.3)] px-2 text-[12px] font-medium text-secondary-foreground/88 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] backdrop-blur-2xl transition-all duration-200 hover:bg-[rgba(109,112,121,0.36)] disabled:cursor-not-allowed disabled:opacity-50';

const selectedOptionClass =
  'border-transparent bg-[rgba(120,87,60,0.9)] text-foreground shadow-[inset_0_1px_0_rgba(255,255,255,0.045)]';

const idleOptionClass =
  'border-transparent bg-transparent text-foreground/68 hover:bg-[rgba(98,71,51,0.28)] hover:text-foreground/88';

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

const activeGenerationKey = (userId: string) =>
  `enzo_fernandez_ai_active_generation:${userId}`;

const sleep = (ms: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, ms));

function createMediaItem(file: File): MediaItem {
  return {
    id: `${file.name}-${file.size}-${file.lastModified}-${Math.random()
      .toString(36)
      .slice(2, 8)}`,
    file,
    url: URL.createObjectURL(file),
  };
}

function isLikenessRejectionMessage(message: string) {
  return /likeness|real people|cannot be processed/i.test(message);
}

function isPhotoQualityFailureMessage(message: string) {
  return /photos didn't work|front-facing shots/i.test(message);
}

function isProviderFailedMessage(message: string) {
  return /generation failed\. please try again later/i.test(message);
}

function generationFailureUiMessage(
  error?: string | null,
  errorCode?: string | null
) {
  if (
    errorCode === 'PROVIDER_LIKENESS_REJECTED' ||
    (error && isLikenessRejectionMessage(error))
  ) {
    return m['genjutsu.safety.face_rejected']();
  }
  if (
    errorCode === 'PROVIDER_CONTENT_SAFETY' ||
    (error && isPhotoQualityFailureMessage(error))
  ) {
    return m['genjutsu.error.photo_quality']();
  }
  // Localize only the generic fallback; passthrough specific provider copy.
  if (error && isProviderFailedMessage(error)) {
    return m['genjutsu.error.provider_failed']();
  }
  if (errorCode === 'PROVIDER_FAILED') {
    return error || m['genjutsu.error.provider_failed']();
  }
  return error || '';
}

function providerSubmitUiMessage(cause: unknown): string {
  const message =
    cause instanceof Error ? cause.message : m['site.generator.failed']();
  const data =
    cause instanceof ApiError && cause.data && typeof cause.data === 'object'
      ? (cause.data as Record<string, unknown>)
      : null;
  const code = typeof data?.code === 'string' ? data.code : undefined;

  if (
    code === 'PROVIDER_LIKENESS_REJECTED' ||
    isLikenessRejectionMessage(message)
  ) {
    return m['genjutsu.safety.face_rejected']();
  }
  if (
    code === 'PROVIDER_CONTENT_SAFETY' ||
    isPhotoQualityFailureMessage(message)
  ) {
    return m['genjutsu.error.photo_quality']();
  }
  if (isProviderFailedMessage(message)) {
    return m['genjutsu.error.provider_failed']();
  }
  if (code === 'PROVIDER_FAILED') {
    return message || m['genjutsu.error.provider_failed']();
  }
  return message;
}

async function reportUploadFailure(params: {
  generationId: string;
  fileIndex: number;
  cause: unknown;
  file?: File | null;
}) {
  const failure = classifyUploadFailure(params.cause, { file: params.file });
  if (!failure) {
    // Upload path should always yield a classified error; keep reporting safe.
    return apiPost<{ recovered: boolean }>('/api/genjutsu/attempt-failure', {
      generationId: params.generationId,
      fileIndex: params.fileIndex,
      errorCode: 'UPLOAD_NETWORK_ERROR',
      httpStatus: null,
      diagnostics: null,
    });
  }
  return apiPost<{ recovered: boolean }>('/api/genjutsu/attempt-failure', {
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

function PhotoSlot({
  item,
  inputRef,
  disabled,
  label,
  hint,
  hideCopy = false,
  onPick,
  onRemove,
}: {
  item: MediaItem | null;
  inputRef: RefObject<HTMLInputElement | null>;
  disabled: boolean;
  label: string;
  hint: string;
  hideCopy?: boolean;
  onPick: (file: File) => void;
  onRemove: () => void;
}) {
  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif,image/avif"
        className="hidden"
        onChange={(event: ChangeEvent<HTMLInputElement>) => {
          const file = event.target.files?.[0] || null;
          if (file) onPick(file);
          event.target.value = '';
        }}
      />
      {item ? (
        <div className="relative aspect-[3/4] overflow-hidden rounded-2xl border border-white/10 bg-black">
          <img src={item.url} alt={label} className="size-full object-cover" />
          <button
            type="button"
            onClick={onRemove}
            disabled={disabled}
            aria-label={m['site.common.remove_item']({ name: label })}
            className="absolute top-2 right-2 flex size-8 items-center justify-center rounded-full bg-black/70 text-white/80 backdrop-blur transition hover:bg-black/90 disabled:opacity-40"
          >
            <CloseIcon className="size-4" />
          </button>
        </div>
      ) : (
        <button
          type="button"
          disabled={disabled}
          onClick={() => inputRef.current?.click()}
          aria-label={label}
          className="flex aspect-[3/4] w-full flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-white/18 bg-white/[0.03] text-center transition hover:border-white/35 hover:bg-white/[0.05] disabled:cursor-not-allowed disabled:opacity-50"
        >
          <span className="flex size-11 items-center justify-center rounded-full bg-white/8 text-white/70">
            <ImageModeIcon className="size-5" />
          </span>
          {!hideCopy && (label || hint) ? (
            <span>
              {label ? (
                <span className="block text-sm font-medium text-white/78">
                  {label}
                </span>
              ) : null}
              {hint ? (
                <span className="mt-1 block text-xs text-white/38">{hint}</span>
              ) : null}
            </span>
          ) : null}
        </button>
      )}
    </div>
  );
}

export function EnzoFernandezAiGeneratorPanel({
  creditProvider,
}: {
  creditProvider: GenjutsuProvider;
}) {
  const { data: session, isPending: sessionPending } = useSession();
  const creditsQuery = useUserCredits(Boolean(session?.user));
  const [photo, setPhoto] = useState<MediaItem | null>(null);
  const [resolution, setResolution] = useState<EnzoFernandezAiResolution>(
    ENZO_FERNANDEZ_AI_DEFAULT_RESOLUTION
  );
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [phase, setPhase] = useState<
    'idle' | 'uploading' | 'starting' | 'generating' | 'locked'
  >('idle');
  const [generationId, setGenerationId] = useState<string | null>(null);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [resultKind, setResultKind] = useState<'preview' | 'full' | null>(null);
  const [jobError, setJobError] = useState('');
  const [progressPercent, setProgressPercent] = useState(0);
  const [templateStatus, setTemplateStatus] =
    useState<FixedTemplateMediaStatus>('loading');
  const creditGate = useCreditGate({
    balance: creditsQuery.data?.balance,
    email: session?.user?.email,
  });
  const templateReady = templateStatus === 'ready';

  const photoInputRef = useRef<HTMLInputElement>(null);
  const photoUrlRef = useRef<string | null>(null);
  const generationRunRef = useRef(0);
  const settingsRef = useRef<HTMLDivElement>(null);
  const generationStartedAtRef = useRef<number | null>(null);
  const resultPanelRef = useRef<HTMLDivElement>(null);

  const estimatedCredits = useMemo(() => {
    return estimateGenjutsuCreditsForProvider({
      provider: creditProvider,
      durationSeconds: ENZO_FERNANDEZ_AI_TEMPLATE_DURATION_SECONDS,
      resolution,
      aspectRatio: ENZO_FERNANDEZ_AI_ASPECT_RATIO,
    });
  }, [creditProvider, resolution]);

  const previewEstimatedCredits = useMemo(() => {
    return estimateGenjutsuCreditsForProvider({
      provider: creditProvider,
      durationSeconds: PREVIEW_DURATION_SECONDS,
      resolution: '480p',
      aspectRatio: ENZO_FERNANDEZ_AI_ASPECT_RATIO,
    });
  }, [creditProvider]);

  const busy =
    phase === 'uploading' ||
    phase === 'starting' ||
    phase === 'generating' ||
    phase === 'locked';

  // Soft elapsed progress while waiting on the provider (caps below 100%).
  useEffect(() => {
    if (!busy) {
      if (resultUrl) setProgressPercent(100);
      else setProgressPercent(0);
      generationStartedAtRef.current = null;
      return;
    }

    if (generationStartedAtRef.current == null) {
      generationStartedAtRef.current = Date.now();
    }

    const tick = () => {
      const started = generationStartedAtRef.current ?? Date.now();
      const elapsedSec = (Date.now() - started) / 1000;
      // Asymptotic toward ~92% over ~3 minutes — Seedance jobs vary a lot.
      const next = Math.min(
        92,
        Math.round(8 + 84 * (1 - Math.exp(-elapsedSec / 55)))
      );
      setProgressPercent(next);
    };
    tick();
    const id = window.setInterval(tick, 400);
    return () => window.clearInterval(id);
  }, [busy, resultUrl]);

  useEffect(() => {
    if (!busy && !resultUrl) return;
    resultPanelRef.current?.scrollIntoView({
      behavior: 'smooth',
      block: 'nearest',
    });
  }, [busy, resultUrl, generationId]);

  useEffect(() => {
    if (!settingsOpen) return;
    const onPointerDown = (event: MouseEvent) => {
      if (
        settingsRef.current &&
        !settingsRef.current.contains(event.target as Node)
      ) {
        setSettingsOpen(false);
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setSettingsOpen(false);
    };
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [settingsOpen]);

  useEffect(() => {
    photoUrlRef.current = photo?.url ?? null;
  }, [photo]);

  useEffect(() => {
    return () => {
      if (photoUrlRef.current) URL.revokeObjectURL(photoUrlRef.current);
    };
  }, []);

  const imagePrepare = useSingleImagePrepareGuard();

  const setPhotoFile = (file: File | null) => {
    if (!file) return;
    const mime = file.type.split(';', 1)[0]?.trim().toLowerCase() || '';
    if (!mime.startsWith('image/')) {
      toast.error(m['site.enzo.image_type']());
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      toast.error(m['site.enzo.image_size']());
      return;
    }

    const guard = imagePrepare.begin();
    void (async () => {
      try {
        const prepared = await prepareReferenceImageFile({
          file,
          maxBytes: MAX_IMAGE_BYTES,
        });
        if (!guard.isCurrent()) return;
        const next = createMediaItem(prepared.file);
        if (!guard.isCurrent()) {
          URL.revokeObjectURL(next.url);
          return;
        }
        setPhoto((current) => {
          if (current) URL.revokeObjectURL(current.url);
          return next;
        });
        creditGate.clear();
        setJobError('');
      } catch (cause) {
        if (!guard.isCurrent()) return;
        toast.error(m['site.generator.image_replace_failed']());
      } finally {
        guard.settle();
      }
    })();
  };

  const clearPhoto = () => {
    imagePrepare.invalidate();
    setPhoto((current) => {
      if (current) URL.revokeObjectURL(current.url);
      return null;
    });
  };

  const pollGeneration = useCallback(
    async (active: PersistedGeneration, runId: number) => {
      let delayMs = 1_500;
      let notFoundCount = 0;

      for (let attempt = 0; attempt < 364; attempt += 1) {
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
            if (notFoundCount >= 15) {
              localStorage.removeItem(activeGenerationKey(active.userId));
              setPhase('idle');
              setJobError(
                'Generation was not accepted by the server. No active paid job was found.'
              );
              return;
            }
          }

          delayMs = Math.min(5_000, Math.ceil(delayMs * 1.2));
          continue;
        }

        notFoundCount = 0;

        // Homepage semantics: pre-reserve states are unlocked on refresh —
        // never auto-charge a still-unpaid ready/initiated attempt.
        if (
          polled.providerStatus === 'initiated' ||
          polled.providerStatus === 'sealing' ||
          polled.providerStatus === 'ready'
        ) {
          localStorage.removeItem(activeGenerationKey(active.userId));
          setPhase('idle');
          creditGate.clear();
          setJobError(
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
        }

        if (polled.providerStatus === 'submission_unknown') {
          setPhase('locked');
          setJobError(polled.error || m['site.generator.pending']());
          return;
        }

        if (polled.status === 'completed' && polled.videoUrl) {
          if (generationRunRef.current !== runId) return;
          localStorage.removeItem(activeGenerationKey(active.userId));
          setResultUrl(polled.videoUrl);
          setJobError('');
          setPhase('idle');
          void creditsQuery.refetch();
          return;
        }

        if (polled.status === 'failed') {
          localStorage.removeItem(activeGenerationKey(active.userId));
          setPhase('idle');
          const insufficient = polled.providerStatus === 'insufficient_credits';
          const requiredCredits = Number(polled.requiredCredits);
          const balance = Number(polled.balance);

          if (
            insufficient &&
            Number.isFinite(requiredCredits) &&
            Number.isFinite(balance)
          ) {
            creditGate.open({ requiredCredits, balance });
            setJobError('');
            return;
          }

          creditGate.clear();
          setJobError(
            generationFailureUiMessage(polled.error, polled.errorCode) ||
              m['site.generator.failed_status']({
                status: polled.providerStatus,
              })
          );
          return;
        }

        delayMs = Math.min(5_000, Math.ceil(delayMs * 1.2));
      }

      setPhase('locked');
      setJobError(m['site.generator.still_processing']());
    },
    [creditGate.clear, creditGate.open, creditsQuery]
  );

  useEffect(() => {
    const userId = session?.user?.id;
    if (!userId || phase !== 'idle') return;

    try {
      const raw = localStorage.getItem(activeGenerationKey(userId));
      if (!raw) return;

      const active = JSON.parse(raw) as PersistedGeneration;
      if (
        active.userId !== userId ||
        !active.generationId ||
        !Number.isFinite(active.reservedCredits)
      ) {
        localStorage.removeItem(activeGenerationKey(userId));
        return;
      }

      const runId = ++generationRunRef.current;
      setJobError('');
      creditGate.clear();
      setGenerationId(active.generationId);
      setResultKind(active.kind === 'preview' ? 'preview' : 'full');
      if (active.resolution === '480p' || active.resolution === '720p') {
        setResolution(active.resolution);
      }
      setPhase('generating');
      void pollGeneration(active, runId);
    } catch {
      localStorage.removeItem(activeGenerationKey(userId));
    }
  }, [pollGeneration, session?.user?.id, phase]);

  const generate = async (kind: 'preview' | 'full' = 'full') => {
    if (!session?.user) {
      window.location.href = `/sign-in?callbackUrl=${encodeURIComponent('/enzo-fernandez-ai#generator')}`;
      return;
    }
    if (busy) return;
    if (imagePrepare.isPreparing) {
      toast.error(m['site.generator.image_preparing']());
      return;
    }
    if (!templateReady) {
      toast.error(m['site.common.template_unavailable']());
      return;
    }
    if (!photo) {
      toast.error(m['site.enzo.upload_required']());
      return;
    }

    const isPreview = kind === 'preview';
    const targetResolution: EnzoFernandezAiResolution = isPreview
      ? '480p'
      : resolution;

    setResultUrl(null);
    setResultKind(kind);
    creditGate.clear();
    setJobError('');
    setPhase('uploading');

    const id =
      typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : `gen-${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
    setGenerationId(id);
    const runId = ++generationRunRef.current;
    const prompt = ENZO_FERNANDEZ_AI_DEFAULT_PROMPT;

    try {
      await apiPost('/api/genjutsu/attempt', {
        generationId: id,
        mode: ENZO_FERNANDEZ_AI_MODE,
        resolution: targetResolution,
        prompt,
        product: ENZO_FERNANDEZ_AI_PRODUCT_ID,
      });

      let media: File[];
      if (isPreview) {
        let clipFile: File;
        let durationSeconds: number;
        try {
          clipFile = await trimVideoToFile({
            sourceUrl: ENZO_FERNANDEZ_AI_TEMPLATE_PATH,
            startSeconds: 0,
            endSeconds: PREVIEW_DURATION_SECONDS,
            fileName: 'enzo-fernandez-ai-preview.mp4',
            accurate: true,
          });
          durationSeconds = await readLocalVideoDurationSeconds(clipFile);
        } catch (cause) {
          console.error('Enzo Fernandez AI preview preparation failed:', cause);
          throw new Error(m['site.generator.preview_trim_failed']());
        }
        if (
          durationSeconds < PREVIEW_DURATION_SECONDS - 0.01 ||
          durationSeconds > PREVIEW_DURATION_SECONDS + 0.2
        ) {
          throw new Error(m['site.generator.preview_trim_failed']());
        }
        media = [clipFile, photo.file];
      } else {
        // Server seals the fixed R2 template; client only uploads the photo.
        media = [photo.file];
      }
      const contentTypes = media.map(
        (file, index) =>
          file.type || (isPreview && index === 0 ? 'video/mp4' : 'image/jpeg')
      );
      const contentLengths = media.map((file) => file.size);

      const uploadBatch = await apiPost<{ uploads: SignedUpload[] }>(
        '/api/genjutsu/upload-url',
        {
          generationId: id,
          mode: ENZO_FERNANDEZ_AI_MODE,
          resolution: targetResolution,
          prompt,
          product: ENZO_FERNANDEZ_AI_PRODUCT_ID,
          preview: isPreview || undefined,
          contentTypes,
          contentLengths,
        }
      );

      if (uploadBatch.uploads.length !== media.length) {
        throw new Error(m['site.generator.upload_incomplete']());
      }

      const sortedUploads = [...uploadBatch.uploads].sort(
        (a, b) => a.index - b.index
      );

      for (let index = 0; index < sortedUploads.length; index += 1) {
        const upload = sortedUploads[index];
        if (!upload) throw new Error(m['site.generator.upload_url_missing']());
        const storageIndex = resolveUploadStorageIndex(upload, index);
        try {
          const uploaded = await uploadToSignedUrl({
            url: upload.uploadUrl,
            file: media[index],
            headers: upload.uploadHeaders,
          });
          if (uploaded.attemptCount > 1) {
            await reportUploadRetrySucceeded({
              generationId: id,
              fileIndex: storageIndex,
              attemptCount: uploaded.attemptCount,
              uploadElapsedMs: uploaded.uploadElapsedMs,
            }).catch(() => undefined);
          }
        } catch (cause) {
          const report = await reportUploadFailure({
            generationId: id,
            fileIndex: storageIndex,
            cause,
            file: media[index],
          }).catch(() => null);
          if (report?.recovered) continue;
          throw cause;
        }
      }

      if (generationRunRef.current !== runId) return;

      await apiPost('/api/genjutsu/seal-inputs', {
        generationId: id,
      });

      const active: PersistedGeneration = {
        userId: session.user.id,
        generationId: id,
        resolution: targetResolution,
        reservedCredits: 0,
        kind,
      };
      localStorage.setItem(
        activeGenerationKey(session.user.id),
        JSON.stringify(active)
      );

      setPhase('starting');
      const started = await apiPost<GenerationStart>('/api/genjutsu/generate', {
        generationId: id,
      });

      active.generationId = started.generationId;
      active.reservedCredits = started.reservedCredits || 0;
      localStorage.setItem(
        activeGenerationKey(session.user.id),
        JSON.stringify(active)
      );

      await creditsQuery.refetch();

      if (started.status === 'submission_unknown') {
        setPhase('locked');
        setJobError(m['site.generator.submission_uncertain']());
        return;
      }

      setPhase('generating');
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
        localStorage.removeItem(activeGenerationKey(session.user.id));
        setPhase('idle');

        if (insufficient) {
          const requiredCredits = Number(apiData?.requiredCredits);
          const balance = Number(apiData?.balance);
          if (Number.isFinite(requiredCredits) && Number.isFinite(balance)) {
            creditGate.open({ requiredCredits, balance });
            setJobError('');
            return;
          }
        }

        creditGate.clear();
        const uiMessage = providerSubmitUiMessage(cause);
        toast.error(uiMessage);
        setJobError(uiMessage);
        return;
      }

      const raw = localStorage.getItem(activeGenerationKey(session.user.id));
      if (raw) {
        try {
          const active = JSON.parse(raw) as PersistedGeneration;
          creditGate.clear();
          setPhase('generating');
          setJobError(
            submissionUnknown
              ? cause instanceof Error
                ? cause.message
                : m['site.generator.submission_uncertain']()
              : m['site.generator.connection_lost']()
          );
          void pollGeneration(active, runId);
          return;
        } catch {
          localStorage.removeItem(activeGenerationKey(session.user.id));
        }
      }

      setPhase('idle');
      creditGate.clear();
      setJobError(
        uploadFailureUserMessage({
          cause,
          fallback: m['site.generator.failed_unexpected'](),
          androidNetworkHint: m['site.generator.upload_android_network_hint'](),
        })
      );
    }
  };

  const canGenerate =
    Boolean(photo) &&
    templateReady &&
    !busy &&
    !imagePrepare.isPreparing &&
    !sessionPending;

  return (
    <div className="mx-auto w-full max-w-[1120px]">
      <div className="overflow-hidden rounded-[26px] border border-white/10 bg-[rgba(30,23,19,0.92)] shadow-[0_30px_90px_-30px_rgba(0,0,0,0.85)] backdrop-blur-2xl">
        <div className="grid gap-0 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="flex items-center justify-center border-b border-white/8 p-4 sm:p-5 lg:border-r lg:border-b-0">
            <FixedTemplatePreview
              src={ENZO_FERNANDEZ_AI_TEMPLATE_PATH}
              poster={ENZO_FERNANDEZ_AI_TEMPLATE_POSTER_PATH}
              className="relative mx-auto aspect-[4/3] max-h-[420px] w-full rounded-2xl border border-white/10"
              objectFit="contain"
              autoPlay
              loop
              onStatusChange={setTemplateStatus}
            />
          </div>

          <div className="flex items-center justify-center p-4 sm:p-5">
            <div className="mx-auto w-full max-w-xs">
              <PhotoSlot
                item={photo}
                inputRef={photoInputRef}
                disabled={busy}
                label={m['site.enzo.photo']()}
                hint=""
                hideCopy
                onPick={(file) => setPhotoFile(file)}
                onRemove={() => clearPhoto()}
              />
            </div>
          </div>
        </div>

        <div className="border-t border-white/8 p-4 sm:p-5">
          {jobError ? (
            <div className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
              {jobError}
            </div>
          ) : null}

          <div className="relative flex flex-wrap items-center gap-1.5 sm:gap-2">
            <div className="relative" ref={settingsRef}>
              <button
                type="button"
                aria-expanded={settingsOpen}
                aria-haspopup="dialog"
                disabled={busy}
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
                  <div className="space-y-2">
                    <section className="p-1">
                      <SectionLabel>
                        {m['site.generator.resolution']()}
                      </SectionLabel>
                      <OptionRow>
                        {ENZO_FERNANDEZ_AI_RESOLUTIONS.map((n) => (
                          <SegmentButton
                            key={n}
                            selected={resolution === n}
                            onClick={() => setResolution(n)}
                          >
                            {n}
                          </SegmentButton>
                        ))}
                      </OptionRow>
                    </section>
                  </div>
                </FloatingPanel>
              ) : null}
            </div>

            <div className="ml-auto flex w-full flex-wrap items-end justify-end gap-x-3 gap-y-2 sm:w-auto">
              <div className="flex items-center gap-2">
                <div className="flex flex-col items-end gap-0.5 text-[11px] text-white/55 tabular-nums">
                  <span className="text-[10px] whitespace-nowrap text-white/45">
                    {m['site.generator.preview_spec']()}
                  </span>
                  <span>
                    {previewEstimatedCredits != null
                      ? m['genjutsu.estimate.credits']({
                          count: previewEstimatedCredits.toLocaleString(),
                        })
                      : '—'}
                  </span>
                </div>
                <button
                  type="button"
                  disabled={!canGenerate}
                  onClick={() => void generate('preview')}
                  className={cn(
                    'inline-flex h-8 items-center justify-center rounded-lg border px-3 text-sm font-semibold transition-all duration-200 active:scale-95',
                    canGenerate
                      ? 'cursor-pointer border-[rgba(204,144,92,0.65)] text-[rgb(237,234,222)] hover:bg-white/10'
                      : 'cursor-not-allowed border-white/10 text-[rgb(237,234,222)]/38'
                  )}
                  title={m['site.generator.preview_help']()}
                >
                  {m['site.generator.preview']()}
                </button>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex shrink-0 flex-col items-end gap-0.5 text-[11px] text-white/50 tabular-nums">
                  <span className="text-[10px] whitespace-nowrap text-white/45">
                    {m['site.generator.full_video']()}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    {estimatedCredits != null
                      ? m['genjutsu.estimate.credits']({
                          count: estimatedCredits.toLocaleString(),
                        })
                      : '—'}
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
                  </span>
                </div>
                <button
                  type="button"
                  disabled={!canGenerate}
                  onClick={() => void generate('full')}
                  className={cn(
                    'relative inline-flex h-8 items-center justify-center rounded-lg px-3.5 text-sm font-semibold tracking-wide shadow-none transition-all duration-200 active:scale-95',
                    canGenerate
                      ? 'bg-[rgb(204,144,92)] text-[rgb(247,246,243)] hover:brightness-105'
                      : 'bg-[rgba(126,128,132,0.28)] text-[rgb(237,234,222)]/38'
                  )}
                >
                  {busy
                    ? m['site.common.generating']()
                    : m['site.generator.generate']()}
                </button>
              </div>
            </div>
          </div>

          {!session?.user && !sessionPending ? (
            <p className="mt-3 text-xs text-white/40">
              {m['site.common.signin_generate']()}
            </p>
          ) : null}
        </div>
      </div>

      {busy || resultUrl ? (
        <div
          ref={resultPanelRef}
          id="generation-result"
          className="mt-5 scroll-mt-24 overflow-hidden rounded-[24px] border border-white/10 bg-[rgba(30,23,19,0.92)] shadow-2xl"
        >
          <div className="flex items-center justify-between gap-3 border-b border-white/8 px-4 py-3 sm:px-5">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-white/90">
                {resultUrl && !busy
                  ? m['site.common.your_video']()
                  : m['site.generator.generating']()}
              </p>
              <p className="mt-0.5 truncate text-xs text-white/40">
                {resultUrl && !busy
                  ? resultKind === 'preview'
                    ? m['site.generator.preview_result']()
                    : m['site.enzo.provider_label']()
                  : phase === 'uploading' || phase === 'starting'
                    ? m['site.generator.starting']()
                    : m['site.generator.progress']({
                        resolution:
                          resultKind === 'preview' ? '480p' : resolution,
                      })}
              </p>
            </div>
            {resultUrl && !busy ? (
              <a
                href={
                  generationId
                    ? `/api/genjutsu/result/${encodeURIComponent(generationId)}?download=1`
                    : resultUrl
                }
                download={
                  generationId
                    ? `enzo-fernandez-ai-${resultKind === 'preview' ? 'preview-' : ''}${generationId.slice(0, 8)}.mp4`
                    : undefined
                }
                className="inline-flex h-9 shrink-0 items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 text-xs font-medium text-white/70 transition hover:bg-white/10 hover:text-white"
              >
                <Download className="size-3.5" />
                {m['site.common.download']()}
              </a>
            ) : (
              <span className="shrink-0 text-xs font-medium text-white/45 tabular-nums">
                {progressPercent}%
              </span>
            )}
          </div>

          {busy ? (
            <div className="space-y-4 px-4 py-8 sm:px-5 sm:py-10">
              <div className="mx-auto flex max-w-md flex-col items-center gap-3">
                <span className="size-9 animate-spin rounded-full border-2 border-[rgb(204,144,92)] border-t-transparent" />
                <p className="text-center text-sm text-white/55">
                  {m['site.generator.progress']({
                    resolution: resultKind === 'preview' ? '480p' : resolution,
                  })}
                </p>
              </div>
              <div
                className="mx-auto h-1.5 w-full max-w-md overflow-hidden rounded-full bg-white/10"
                role="progressbar"
                aria-valuenow={progressPercent}
                aria-valuemin={0}
                aria-valuemax={100}
              >
                <div
                  className="h-full rounded-full bg-[rgb(204,144,92)] transition-[width] duration-500 ease-out"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>
          ) : resultUrl ? (
            <div className="bg-black/35 p-3 sm:p-4">
              <video
                src={resultUrl}
                controls
                autoPlay
                playsInline
                className="mx-auto aspect-video max-h-[720px] w-full max-w-full rounded-2xl bg-black object-contain"
              />
            </div>
          ) : null}
        </div>
      ) : null}

      <InsufficientCreditsModal
        gate={creditGate.gate}
        pack={creditGate.recommendedPack}
        checkoutLoading={creditGate.checkoutLoading}
        onClose={creditGate.clear}
        onBuy={() => void creditGate.buy()}
      />
    </div>
  );
}
