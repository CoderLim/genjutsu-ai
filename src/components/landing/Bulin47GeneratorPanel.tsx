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
  BULIN_47_DEFAULT_PROMPT,
  BULIN_47_DEFAULT_RESOLUTION,
  BULIN_47_MODE,
  BULIN_47_RESOLUTIONS,
  BULIN_47_TEMPLATE_DURATION_SECONDS,
  BULIN_47_TEMPLATE_PATH,
  BULIN_47_TEMPLATE_POSTER_PATH,
  loadBulin47TemplateFile,
  type Bulin47Resolution,
} from '@/modules/bulin-47/constants';
import {
  estimateGenjutsuCreditsForProvider,
  getSmallestSufficientCreditPack,
  type GenjutsuCreditPack,
} from '@/modules/genjutsu/pricing';
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
import { usePublicConfig } from '@/hooks/use-public-config';
import { useUserCredits } from '@/hooks/use-user-credits';
import { ChevronDownIcon, CloseIcon, ImageModeIcon } from '@/components/icons';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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

type CreditGateState = {
  balance: number;
  requiredCredits: number;
};

type PersistedGeneration = {
  userId: string;
  generationId: string;
  resolution: Bulin47Resolution;
  reservedCredits: number;
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
  `bulin_47_active_generation:${userId}`;

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

function formatCreditPackPrice(pack: GenjutsuCreditPack) {
  return new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency: (pack.currency || 'usd').toUpperCase(),
  }).format(pack.priceCents / 100);
}

function isLikenessRejectionMessage(message: string) {
  return /likeness|real people|cannot be processed/i.test(message);
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
  if (code === 'PROVIDER_FAILED') {
    return m['genjutsu.error.provider_failed']();
  }
  return message;
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
  title,
  note,
  item,
  inputRef,
  disabled,
  onPick,
  onRemove,
}: {
  title: string;
  note: string;
  item: MediaItem | null;
  inputRef: RefObject<HTMLInputElement | null>;
  disabled: boolean;
  onPick: (file: File) => void;
  onRemove: () => void;
}) {
  return (
    <div>
      <p className="text-sm font-semibold text-white/90">{title}</p>
      <p className="mt-0.5 text-xs leading-5 text-white/40">{note}</p>
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
        <div className="relative mt-3 aspect-[3/4] overflow-hidden rounded-2xl border border-white/10 bg-black">
          <img src={item.url} alt={title} className="size-full object-cover" />
          <button
            type="button"
            onClick={onRemove}
            disabled={disabled}
            aria-label={m['site.common.remove_item']({ name: title })}
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
          className="mt-3 flex aspect-[3/4] w-full flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-white/18 bg-white/[0.03] text-center transition hover:border-white/35 hover:bg-white/[0.05] disabled:cursor-not-allowed disabled:opacity-50"
        >
          <span className="flex size-11 items-center justify-center rounded-full bg-white/8 text-white/70">
            <ImageModeIcon className="size-5" />
          </span>
          <span>
            <span className="block text-sm font-medium text-white/78">
              {m['site.bulin.upload_photo']()}
            </span>
            <span className="mt-1 block text-xs text-white/38">
              {m['site.bulin.photo_hint']()}
            </span>
          </span>
        </button>
      )}
    </div>
  );
}

function InsufficientCreditsModal({
  gate,
  pack,
  checkoutLoading,
  onClose,
  onBuy,
}: {
  gate: CreditGateState | null;
  pack: GenjutsuCreditPack | null;
  checkoutLoading: boolean;
  onClose: () => void;
  onBuy: () => void;
}) {
  if (!gate) return null;

  const deficit = Math.max(0, gate.requiredCredits - gate.balance);

  return (
    <Dialog
      open={Boolean(gate)}
      onOpenChange={(open) => {
        if (!open && !checkoutLoading) onClose();
      }}
    >
      <DialogContent
        showCloseButton={!checkoutLoading}
        overlayClassName="z-[490] bg-black/75 backdrop-blur-sm"
        className="z-[500] w-full max-w-[420px] gap-0 rounded-2xl border border-white/10 bg-[rgb(31,24,20)] p-5 text-[rgb(237,234,222)] shadow-2xl sm:max-w-[420px] sm:p-6"
      >
        <DialogHeader className="gap-1.5 pr-8 text-left">
          <DialogTitle className="text-lg font-semibold tracking-tight">
            {m['genjutsu.credits.insufficient_title']()}
          </DialogTitle>
          <DialogDescription className="text-sm leading-6 text-white/55">
            {m['genjutsu.credits.insufficient_description']({
              count: gate.requiredCredits.toLocaleString(),
            })}
          </DialogDescription>
        </DialogHeader>

        <div className="mt-5 rounded-xl border border-white/8 bg-black/15 px-4 py-3 text-sm">
          <div className="flex items-center justify-between py-1 text-white/58">
            <span>{m['genjutsu.credits.balance']()}</span>
            <span className="tabular-nums">
              {gate.balance.toLocaleString()}
            </span>
          </div>
          <div className="flex items-center justify-between py-1 text-white/58">
            <span>{m['genjutsu.credits.required']()}</span>
            <span className="tabular-nums">
              {gate.requiredCredits.toLocaleString()}
            </span>
          </div>
          <div className="my-2 h-px bg-white/8" />
          <div className="flex items-center justify-between py-1 font-medium">
            <span>{m['genjutsu.credits.need_label']()}</span>
            <span className="text-[rgb(220,155,99)] tabular-nums">
              {m['genjutsu.credits.need_more']({
                count: deficit.toLocaleString(),
              })}
            </span>
          </div>
        </div>

        <button
          type="button"
          disabled={checkoutLoading}
          onClick={onBuy}
          className="mt-5 inline-flex h-10 w-full items-center justify-center rounded-xl bg-[rgb(204,144,92)] px-4 text-sm font-semibold text-[rgb(247,246,243)] transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-55"
        >
          {checkoutLoading
            ? m['genjutsu.credits.opening_checkout']()
            : pack
              ? m['genjutsu.credits.buy_pack']({
                  count: pack.credits.toLocaleString(),
                  price: formatCreditPackPrice(pack),
                })
              : m['genjutsu.credits.view_packs']()}
        </button>

        <button
          type="button"
          disabled={checkoutLoading}
          onClick={onClose}
          className="mt-2 inline-flex h-9 w-full items-center justify-center rounded-lg text-sm text-white/45 transition-colors hover:bg-white/5 hover:text-white/70 disabled:pointer-events-none disabled:opacity-40"
        >
          {m['genjutsu.credits.maybe_later']()}
        </button>
      </DialogContent>
    </Dialog>
  );
}

export function Bulin47GeneratorPanel() {
  const { data: session, isPending: sessionPending } = useSession();
  const creditsQuery = useUserCredits(Boolean(session?.user));
  const { data: publicConfig } = usePublicConfig();

  const [photo, setPhoto] = useState<MediaItem | null>(null);
  const [resolution, setResolution] = useState<Bulin47Resolution>(
    BULIN_47_DEFAULT_RESOLUTION
  );
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [phase, setPhase] = useState<
    'idle' | 'uploading' | 'starting' | 'generating' | 'locked'
  >('idle');
  const [generationId, setGenerationId] = useState<string | null>(null);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [jobError, setJobError] = useState('');
  const [creditGate, setCreditGate] = useState<CreditGateState | null>(null);
  const [checkoutLoading, setCheckoutLoading] = useState(false);

  const photoInputRef = useRef<HTMLInputElement>(null);
  const photoUrlRef = useRef<string | null>(null);
  const generationRunRef = useRef(0);
  const settingsRef = useRef<HTMLDivElement>(null);

  const rawProvider = publicConfig?.genjutsu_object_swap_provider;
  const pricingProvider =
    rawProvider === 'higgsfield' ||
    rawProvider === 'seedance' ||
    rawProvider === 'seedance-volcengine'
      ? rawProvider
      : null;

  const estimatedCredits = useMemo(() => {
    if (!pricingProvider) return null;
    return estimateGenjutsuCreditsForProvider({
      provider: pricingProvider,
      durationSeconds: BULIN_47_TEMPLATE_DURATION_SECONDS,
      resolution,
    });
  }, [pricingProvider, resolution]);

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

  const busy =
    phase === 'uploading' ||
    phase === 'starting' ||
    phase === 'generating' ||
    phase === 'locked';

  useEffect(() => {
    photoUrlRef.current = photo?.url ?? null;
  }, [photo]);

  useEffect(() => {
    return () => {
      if (photoUrlRef.current) URL.revokeObjectURL(photoUrlRef.current);
    };
  }, []);

  useEffect(() => {
    if (!creditGate || typeof creditsQuery.data?.balance !== 'number') return;
    const balance = creditsQuery.data.balance;
    if (balance >= creditGate.requiredCredits) {
      setCreditGate(null);
      return;
    }
    if (balance !== creditGate.balance) {
      setCreditGate((current) => (current ? { ...current, balance } : current));
    }
  }, [creditGate, creditsQuery.data?.balance]);

  const setPhotoFile = (file: File | null) => {
    if (!file) return;
    const mime = file.type.split(';', 1)[0]?.trim().toLowerCase() || '';
    if (!mime.startsWith('image/')) {
      toast.error(m['site.bulin.image_type']());
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      toast.error(m['site.bulin.image_size']());
      return;
    }

    const next = createMediaItem(file);
    setPhoto((current) => {
      if (current) URL.revokeObjectURL(current.url);
      return next;
    });
    setCreditGate(null);
    setJobError('');
  };

  const clearPhoto = () => {
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
          setCreditGate(null);
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
            setCreditGate({ requiredCredits, balance });
            setJobError('');
            return;
          }

          setCreditGate(null);
          setJobError(
            polled.error ||
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
    [creditsQuery]
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
      setCreditGate(null);
      setGenerationId(active.generationId);
      if (
        active.resolution === '480p' ||
        active.resolution === '720p' ||
        active.resolution === '1080p'
      ) {
        setResolution(active.resolution);
      }
      setPhase('generating');
      void pollGeneration(active, runId);
    } catch {
      localStorage.removeItem(activeGenerationKey(userId));
    }
  }, [pollGeneration, session?.user?.id, phase]);

  const generate = async () => {
    if (!session?.user) {
      window.location.href = `/sign-in?callbackUrl=${encodeURIComponent('/bulin-47-ai#generator')}`;
      return;
    }
    if (busy) return;
    if (!photo) {
      toast.error(m['site.bulin.upload_required']());
      return;
    }

    setResultUrl(null);
    setCreditGate(null);
    setJobError('');
    setPhase('uploading');

    const id =
      typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : `gen-${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
    setGenerationId(id);
    const runId = ++generationRunRef.current;
    const prompt = BULIN_47_DEFAULT_PROMPT;

    try {
      await apiPost('/api/genjutsu/attempt', {
        generationId: id,
        mode: BULIN_47_MODE,
        resolution,
        prompt,
      });

      const templateFile = await loadBulin47TemplateFile();
      const media = [templateFile, photo.file];
      const contentTypes = media.map(
        (file, index) => file.type || (index === 0 ? 'video/mp4' : 'image/jpeg')
      );
      const contentLengths = media.map((file) => file.size);

      const uploadBatch = await apiPost<{ uploads: SignedUpload[] }>(
        '/api/genjutsu/upload-url',
        {
          generationId: id,
          mode: BULIN_47_MODE,
          resolution,
          prompt,
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
        try {
          const uploaded = await uploadToSignedUrl({
            url: upload.uploadUrl,
            file: media[index],
            headers: upload.uploadHeaders,
          });
          if (uploaded.attemptCount > 1) {
            await reportUploadRetrySucceeded({
              generationId: id,
              fileIndex: index,
              attemptCount: uploaded.attemptCount,
              uploadElapsedMs: uploaded.uploadElapsedMs,
            }).catch(() => undefined);
          }
        } catch (cause) {
          const report = await reportUploadFailure({
            generationId: id,
            fileIndex: index,
            cause,
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
        resolution,
        reservedCredits: 0,
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
            setCreditGate({ requiredCredits, balance });
            setJobError('');
            return;
          }
        }

        setCreditGate(null);
        const uiMessage = providerSubmitUiMessage(cause);
        if (
          apiData?.code === 'PROVIDER_LIKENESS_REJECTED' ||
          (typeof cause.message === 'string' &&
            isLikenessRejectionMessage(cause.message))
        ) {
          toast.error(uiMessage);
        }
        setJobError(uiMessage);
        return;
      }

      const raw = localStorage.getItem(activeGenerationKey(session.user.id));
      if (raw) {
        try {
          const active = JSON.parse(raw) as PersistedGeneration;
          setCreditGate(null);
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
      setCreditGate(null);
      setJobError(
        cause instanceof Error
          ? cause.message
          : m['site.generator.failed_unexpected']()
      );
    }
  };

  const recommendedCreditPack = useMemo(
    () =>
      creditGate
        ? getSmallestSufficientCreditPack({
            balance: creditGate.balance,
            requiredCredits: creditGate.requiredCredits,
            email: session?.user?.email,
          })
        : null,
    [creditGate, session?.user?.email]
  );

  const handleBuyCredits = async () => {
    if (!creditGate || checkoutLoading) return;

    if (!recommendedCreditPack) {
      const pricingWindow = window.open('/pricing', '_blank');
      if (pricingWindow) {
        pricingWindow.opener = null;
      } else {
        window.location.href = '/pricing';
      }
      return;
    }

    const checkoutWindow = window.open('', '_blank');
    if (checkoutWindow) checkoutWindow.opener = null;

    setCheckoutLoading(true);
    try {
      const redirect = `${window.location.pathname}${window.location.search}${window.location.hash}`;
      const checkout = await apiPost<{ checkout_url?: string }>(
        '/api/payment/checkout',
        {
          product_id: recommendedCreditPack.id,
          redirect,
        }
      );

      if (!checkout.checkout_url) {
        throw new Error(m['site.generator.checkout_url_missing']());
      }

      if (checkoutWindow && !checkoutWindow.closed) {
        checkoutWindow.location.href = checkout.checkout_url;
      } else {
        window.location.href = checkout.checkout_url;
      }
    } catch (cause) {
      if (checkoutWindow && !checkoutWindow.closed) checkoutWindow.close();
      toast.error(
        cause instanceof Error
          ? cause.message
          : m['genjutsu.credits.checkout_failed']()
      );
    } finally {
      setCheckoutLoading(false);
    }
  };

  const canGenerate = Boolean(photo) && !busy && !sessionPending;

  return (
    <div className="mx-auto w-full max-w-[1120px]">
      <div className="overflow-hidden rounded-[26px] border border-white/10 bg-[rgba(22,24,28,0.94)] shadow-[0_30px_90px_-30px_rgba(0,0,0,0.85)] backdrop-blur-2xl">
        <div className="grid gap-0 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="flex items-center justify-center border-b border-white/8 p-4 sm:p-5 lg:border-r lg:border-b-0">
            <div className="relative mx-auto aspect-[9/16] max-h-[420px] w-full overflow-hidden rounded-2xl border border-white/10 bg-black">
              <video
                src={BULIN_47_TEMPLATE_PATH}
                poster={BULIN_47_TEMPLATE_POSTER_PATH}
                controls
                muted
                playsInline
                preload="metadata"
                className="size-full object-contain"
              />
            </div>
          </div>

          <div className="p-4 sm:p-5">
            <div className="mx-auto max-w-xs">
              <PhotoSlot
                title={m['site.bulin.photo_title']()}
                note={m['site.bulin.photo_note']()}
                item={photo}
                inputRef={photoInputRef}
                disabled={busy}
                onPick={setPhotoFile}
                onRemove={clearPhoto}
              />
            </div>
          </div>
        </div>

        <div className="border-t border-white/8 p-4 sm:p-5">
          {jobError ? (
            <div className="mb-4 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-white/60">
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
                <span className="text-white/35">·</span>
                <span className="text-foreground/90 font-medium">
                  {m['site.generator.objects']()}
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
                        {BULIN_47_RESOLUTIONS.map((n) => (
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

            <div className="ml-auto flex w-full items-center justify-end gap-2 sm:w-auto">
              {estimatedCredits != null ? (
                <div className="flex shrink-0 items-center gap-1 text-[12px] text-white/50 tabular-nums">
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
                onClick={() => void generate()}
                className={cn(
                  'relative inline-flex h-8 flex-1 items-center justify-center rounded-lg px-3.5 text-sm font-semibold tracking-wide shadow-none transition-all duration-200 active:scale-95 sm:w-auto sm:flex-none',
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

          {!session?.user && !sessionPending ? (
            <p className="mt-3 text-xs text-white/40">
              {m['site.common.signin_generate']()}
            </p>
          ) : null}
        </div>
      </div>

      {resultUrl ? (
        <div className="mt-5 overflow-hidden rounded-[24px] border border-white/10 bg-[rgba(18,20,24,0.94)] p-3 shadow-2xl sm:p-4">
          <div className="mb-3 flex items-center justify-between gap-3 px-1">
            <div>
              <p className="text-sm font-semibold text-white/90">
                {m['site.common.your_video']()}
              </p>
              <p className="mt-0.5 text-xs text-white/38">
                {m['site.bulin.provider_label']()}
              </p>
            </div>
            <a
              href={
                generationId
                  ? `/api/genjutsu/result/${encodeURIComponent(generationId)}?download=1`
                  : resultUrl
              }
              download={
                generationId
                  ? `bulin-47-ai-${generationId.slice(0, 8)}.mp4`
                  : undefined
              }
              className="inline-flex h-9 items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 text-xs font-medium text-white/70 transition hover:bg-white/10 hover:text-white"
            >
              <Download className="size-3.5" />
              {m['site.common.download']()}
            </a>
          </div>
          <video
            src={resultUrl}
            controls
            autoPlay
            playsInline
            className="mx-auto aspect-[9/16] max-h-[720px] w-full max-w-full rounded-2xl bg-black object-contain"
          />
        </div>
      ) : null}

      <InsufficientCreditsModal
        gate={creditGate}
        pack={recommendedCreditPack}
        checkoutLoading={checkoutLoading}
        onClose={() => setCreditGate(null)}
        onBuy={() => void handleBuyCredits()}
      />
    </div>
  );
}
