import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
} from 'react';
import { CircleHelp, Download } from 'lucide-react';
import { toast } from 'sonner';

import { useSession } from '@/core/auth/client';
import {
  KAIRO_BAD_TIMES_POSTER_PATH,
  KAIRO_BAD_TIMES_PREVIEW_PATH,
} from '@/modules/kairo-bad-times/constants';
import { ApiError, apiGet, apiPost, uploadToSignedUrl } from '@/lib/api-client';
import {
  friendlyKairoGenerationError,
  prepareKairoReferenceImage,
} from '@/lib/kairo-image-preflight';
import { cn } from '@/lib/utils';
import { m } from '@/paraglide/messages.js';
import { useCreditGate } from '@/hooks/use-credit-gate';
import { useUserCredits } from '@/hooks/use-user-credits';
import { InsufficientCreditsModal } from '@/components/credits/insufficient-credits-modal';
import { CloseIcon, ImageModeIcon } from '@/components/icons';
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

type UploadSetup = {
  uploads: SignedUpload[];
};

type GenerationStart = {
  generationId: string;
  requestId: string | null;
  status: string;
  reservedCredits: number;
  kind?: 'preview' | 'full';
};

type GenerationPoll = {
  status: 'processing' | 'completed' | 'failed';
  providerStatus: string;
  videoUrl: string | null;
  error?: string;
  reservedCredits?: number;
  requiredCredits?: number;
  balance?: number;
};

type TemplateMeta = {
  durationSeconds: number | null;
  billedDurationSeconds: number | null;
  estimatedCredits: number | null;
  previewDurationSeconds?: number | null;
  previewEstimatedCredits?: number | null;
  templateAvailable: boolean;
  previewUrl: string;
  posterUrl: string;
};

type PersistedGeneration = {
  userId: string;
  generationId: string;
  reservedCredits: number;
  kind?: 'preview' | 'full';
};

const MAX_ORIGINAL_IMAGE_BYTES = 40 * 1024 * 1024;
const STORAGE_KEY_PREFIX = 'kairo-bad-times:active-generation:';

function sleep(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function createMediaItem(file: File): MediaItem {
  return {
    id: crypto.randomUUID(),
    file,
    url: URL.createObjectURL(file),
  };
}

function activeGenerationKey(userId: string) {
  return `${STORAGE_KEY_PREFIX}${userId}`;
}

export function KairoBadTimesGeneratorPanel({
  className,
}: {
  className?: string;
}) {
  const { data: session, isPending: sessionPending } = useSession();
  const userId = session?.user?.id ?? null;
  const creditsQuery = useUserCredits();
  const creditGate = useCreditGate({
    balance: creditsQuery.data?.balance,
    email: session?.user?.email,
  });

  const [photo, setPhoto] = useState<MediaItem | null>(null);
  const [templateMeta, setTemplateMeta] = useState<TemplateMeta | null>(null);
  const [templateMetaError, setTemplateMetaError] = useState('');
  const [phase, setPhase] = useState<
    'idle' | 'uploading' | 'starting' | 'generating' | 'locked'
  >('idle');
  const [generationId, setGenerationId] = useState<string | null>(null);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [resultKind, setResultKind] = useState<'preview' | 'full'>('full');
  const [jobError, setJobError] = useState('');
  const [progressPercent, setProgressPercent] = useState(0);

  const photoInputRef = useRef<HTMLInputElement>(null);
  const photoUrlRef = useRef<string | null>(null);
  const generationRunRef = useRef(0);
  const resultPanelRef = useRef<HTMLDivElement>(null);

  const busy = phase !== 'idle' && phase !== 'locked';
  const templateAvailable = templateMeta?.templateAvailable === true;
  const estimatedCredits = templateMeta?.estimatedCredits ?? null;
  const previewEstimatedCredits = templateMeta?.previewEstimatedCredits ?? null;

  useEffect(() => {
    apiGet<TemplateMeta>('/api/kairo-bad-times/template-meta')
      .then((data) => {
        setTemplateMeta(data);
        setTemplateMetaError(
          data.templateAvailable ? '' : m['site.kairo.template_unavailable']()
        );
      })
      .catch(() => {
        setTemplateMeta({
          durationSeconds: null,
          billedDurationSeconds: null,
          estimatedCredits: null,
          previewDurationSeconds: null,
          previewEstimatedCredits: null,
          templateAvailable: false,
          previewUrl: KAIRO_BAD_TIMES_PREVIEW_PATH,
          posterUrl: KAIRO_BAD_TIMES_POSTER_PATH,
        });
        setTemplateMetaError(m['site.kairo.template_unavailable']());
      });
  }, []);

  useEffect(() => {
    photoUrlRef.current = photo?.url ?? null;
  }, [photo]);

  useEffect(() => {
    return () => {
      if (photoUrlRef.current) URL.revokeObjectURL(photoUrlRef.current);
    };
  }, []);

  const pollUntilComplete = useCallback(
    async (activeGenerationId: string, reservedCredits: number) => {
      const runId = ++generationRunRef.current;
      let delayMs = 2_000;

      for (let attempt = 0; attempt < 240; attempt += 1) {
        await sleep(delayMs);
        if (generationRunRef.current !== runId) return;

        let polled: GenerationPoll;
        try {
          polled = await apiGet<GenerationPoll>(
            `/api/kairo-bad-times/status?generationId=${encodeURIComponent(activeGenerationId)}`
          );
        } catch {
          delayMs = Math.min(8_000, Math.ceil(delayMs * 1.25));
          continue;
        }

        if (polled.providerStatus === 'submission_unknown') {
          setPhase('locked');
          setJobError(friendlyKairoGenerationError(polled.error || m['site.generator.pending']()));
          return;
        }

        if (polled.status === 'completed' && polled.videoUrl) {
          if (userId) {
            localStorage.removeItem(activeGenerationKey(userId));
          }
          setResultUrl(polled.videoUrl);
          setJobError('');
          setPhase('idle');
          void creditsQuery.refetch();
          return;
        }

        if (polled.status === 'failed') {
          if (userId) {
            localStorage.removeItem(activeGenerationKey(userId));
          }
          setPhase('idle');
          const requiredCredits = Number(polled.requiredCredits);
          const balance = Number(polled.balance);
          if (
            polled.providerStatus === 'insufficient_credits' &&
            Number.isFinite(requiredCredits) &&
            Number.isFinite(balance)
          ) {
            creditGate.open({ requiredCredits, balance });
            setJobError('');
            return;
          }
          setJobError(friendlyKairoGenerationError(polled.error || m['site.generator.failed']()));
          void creditsQuery.refetch();
          return;
        }

        delayMs = Math.min(8_000, Math.ceil(delayMs * 1.15));
        void reservedCredits;
      }

      setPhase('idle');
      setJobError(m['site.generator.failed']());
    },
    [creditGate, creditsQuery, userId]
  );

  useEffect(() => {
    if (!userId || busy || resultUrl) return;
    const raw = localStorage.getItem(activeGenerationKey(userId));
    if (!raw) return;
    try {
      const persisted = JSON.parse(raw) as PersistedGeneration;
      if (
        persisted.userId !== userId ||
        typeof persisted.generationId !== 'string'
      ) {
        return;
      }
      setGenerationId(persisted.generationId);
      setResultKind(persisted.kind === 'preview' ? 'preview' : 'full');
      setPhase('generating');
      void pollUntilComplete(
        persisted.generationId,
        persisted.reservedCredits || 0
      );
    } catch {
      localStorage.removeItem(activeGenerationKey(userId));
    }
  }, [busy, pollUntilComplete, resultUrl, userId]);

  useEffect(() => {
    if (!busy || resultUrl) {
      if (resultUrl) setProgressPercent(100);
      else setProgressPercent(0);
      return;
    }
    const started = Date.now();
    const tick = () => {
      const elapsedSec = (Date.now() - started) / 1000;
      setProgressPercent(
        Math.min(92, Math.round(10 + 82 * (1 - Math.exp(-elapsedSec / 70))))
      );
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

  const canGenerate = Boolean(
    photo && templateAvailable && !busy && !sessionPending
  );

  const setPhotoFile = (file: File | null) => {
    if (!file) return;
    const mime = file.type.split(';', 1)[0]?.trim().toLowerCase() || '';
    if (!mime.startsWith('image/')) {
      toast.error(m['site.kairo.image_type']());
      return;
    }
    if (file.size > MAX_ORIGINAL_IMAGE_BYTES) {
      toast.error('Please choose a photo smaller than 40 MB.');
      return;
    }
    setPhoto((current) => {
      if (current) URL.revokeObjectURL(current.url);
      return createMediaItem(file);
    });
    creditGate.clear();
    setJobError('');
  };

  const onPickPhoto = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;
    event.target.value = '';
    setPhotoFile(file);
  };

  const clearPhoto = () => {
    setPhoto((current) => {
      if (current) URL.revokeObjectURL(current.url);
      return null;
    });
  };

  const startGeneration = async (kind: 'preview' | 'full' = 'full') => {
    if (!photo) {
      toast.error(m['site.kairo.need_photo']());
      return;
    }
    if (!templateAvailable) {
      toast.error(m['site.kairo.template_unavailable']());
      return;
    }
    if (!userId) {
      const callbackUrl = encodeURIComponent(
        `${window.location.pathname}${window.location.search}`
      );
      window.location.href = `/sign-in?callbackUrl=${callbackUrl}`;
      return;
    }

    setJobError('');
    setResultUrl(null);
    setResultKind(kind);
    setPhase('uploading');
    const id = crypto.randomUUID();
    setGenerationId(id);

    try {
      // Decode and resize before signing/uploading or reserving paid credits.
      const uploadFile = await prepareKairoReferenceImage(photo.file);
      const contentTypes = [uploadFile.type];
      const contentLengths = [uploadFile.size];

      const setup = await apiPost<UploadSetup>(
        '/api/kairo-bad-times/upload-url',
        {
          generationId: id,
          contentTypes,
          contentLengths,
        }
      );

      if (setup.uploads.length !== 1) {
        throw new Error('Upload setup returned an incomplete file list');
      }

      const upload = setup.uploads[0];
      await uploadToSignedUrl({
        url: upload.uploadUrl,
        file: uploadFile,
        headers: upload.uploadHeaders,
      });

      setPhase('starting');
      const start = await apiPost<GenerationStart>(
        '/api/kairo-bad-times/generate',
        {
          generationId: id,
          imageKey: upload.storageKey,
          contentTypes,
          contentLengths,
          preview: kind === 'preview' || undefined,
        }
      );

      await creditsQuery.refetch();

      if (
        start.status === 'refunded' ||
        start.status === 'submission_unknown'
      ) {
        throw new Error(
          start.status === 'submission_unknown'
            ? 'Submission result is uncertain. Please contact support before retrying.'
            : 'Generation could not be started'
        );
      }

      localStorage.setItem(
        activeGenerationKey(userId),
        JSON.stringify({
          userId,
          generationId: id,
          reservedCredits: start.reservedCredits || 0,
          kind,
        } satisfies PersistedGeneration)
      );

      setPhase('generating');
      await pollUntilComplete(id, start.reservedCredits || 0);
    } catch (error) {
      setPhase('idle');
      // Submission can fail after a successful reserve/refund transaction.
      void creditsQuery.refetch();
      if (error instanceof ApiError) {
        const data =
          error.data && typeof error.data === 'object'
            ? (error.data as Record<string, unknown>)
            : null;
        if (
          data?.code === 'INSUFFICIENT_CREDITS' &&
          typeof data.requiredCredits === 'number' &&
          typeof data.balance === 'number'
        ) {
          creditGate.open({
            requiredCredits: data.requiredCredits,
            balance: data.balance,
          });
          return;
        }
        const friendlyMessage = friendlyKairoGenerationError(error.message);
        setJobError(friendlyMessage);
        toast.error(friendlyMessage);
        return;
      }
      const message =
        error instanceof Error ? error.message : 'Generation failed';
      const friendlyMessage = friendlyKairoGenerationError(message);
      setJobError(friendlyMessage);
      toast.error(friendlyMessage);
    }
  };

  const previewUrl = templateMeta?.previewUrl || KAIRO_BAD_TIMES_PREVIEW_PATH;
  const posterUrl = templateMeta?.posterUrl || KAIRO_BAD_TIMES_POSTER_PATH;

  return (
    <div className={cn('mx-auto w-full max-w-[1120px]', className)}>
      <div className="overflow-hidden rounded-[26px] border border-white/10 bg-[rgba(30,23,19,0.92)] shadow-[0_30px_90px_-30px_rgba(0,0,0,0.85)] backdrop-blur-2xl">
        <div className="grid gap-0 lg:grid-cols-2 lg:items-stretch">
          <div className="flex flex-col border-b border-white/8 p-4 sm:p-5 lg:border-r lg:border-b-0">
            <p className="mb-2 text-xs font-medium tracking-wide text-white/45 uppercase">
              {m['site.kairo.template_label']()}
            </p>
            {/*
              Cap width so 9:16 stays within one viewport (240 * 16/9 ≈ 427px).
            */}
            <div className="relative mx-auto aspect-[9/16] w-full max-w-[min(100%,240px)] overflow-hidden rounded-2xl border border-white/10 bg-black">
              <video
                key={previewUrl}
                src={previewUrl}
                poster={posterUrl}
                controls
                playsInline
                preload="metadata"
                className="size-full object-cover"
              />
            </div>
            <p className="mt-2 text-center text-xs text-white/38">
              {m['site.kairo.template_note']()}
            </p>
          </div>

          <div className="flex min-h-0 flex-col p-4 sm:p-5 lg:h-full">
            <p className="mb-2 shrink-0 text-xs font-medium tracking-wide text-white/45 uppercase">
              {m['site.kairo.photo_label']()}
            </p>
            <input
              ref={photoInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif,image/avif"
              className="hidden"
              onChange={onPickPhoto}
            />
            {photo ? (
              <div className="relative aspect-[3/4] min-h-0 flex-1 overflow-hidden rounded-2xl border border-white/10 bg-black lg:aspect-auto">
                <img
                  src={photo.url}
                  alt={m['site.kairo.photo_label']()}
                  className="size-full object-cover"
                />
                <button
                  type="button"
                  onClick={clearPhoto}
                  disabled={busy}
                  aria-label={m['site.common.remove_item']({
                    name: m['site.kairo.photo_label'](),
                  })}
                  className="absolute top-2 right-2 flex size-8 items-center justify-center rounded-full bg-black/70 text-white/80 backdrop-blur transition hover:bg-black/90 disabled:opacity-40"
                >
                  <CloseIcon className="size-4" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                disabled={busy}
                onClick={() => photoInputRef.current?.click()}
                className="flex aspect-[3/4] w-full flex-1 flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-white/18 bg-white/[0.03] text-center transition hover:border-white/35 hover:bg-white/[0.05] disabled:cursor-not-allowed disabled:opacity-50 lg:aspect-auto lg:min-h-[280px]"
              >
                <span className="flex size-11 items-center justify-center rounded-full bg-white/8 text-white/70">
                  <ImageModeIcon className="size-5" />
                </span>
                <span>
                  <span className="block text-sm font-medium text-white/78">
                    {m['site.kairo.upload_photo']()}
                  </span>
                  <span className="mt-1 block text-xs text-white/38">
                    {m['site.kairo.photo_note']()}
                  </span>
                </span>
              </button>
            )}
          </div>
        </div>

        <div className="border-t border-white/8 p-4 sm:p-5">
          {templateMetaError ? (
            <div className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
              {templateMetaError}
            </div>
          ) : null}
          {jobError ? (
            <div className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
              {jobError}
            </div>
          ) : null}

          <div className="ml-auto flex w-full flex-wrap items-end justify-end gap-x-3 gap-y-2 sm:w-auto">
            <div className="flex items-center gap-2">
              <div className="flex flex-col items-end gap-0.5 text-[11px] text-white/55 tabular-nums">
                <span className="text-[10px] whitespace-nowrap text-white/45">
                  {m['site.kairo.preview_spec']()}
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
                onClick={() => void startGeneration('preview')}
                className={cn(
                  'inline-flex h-8 items-center justify-center rounded-lg border px-3 text-sm font-semibold transition-all duration-200 active:scale-95',
                  canGenerate
                    ? 'cursor-pointer border-[rgba(204,144,92,0.65)] text-[rgb(237,234,222)] hover:bg-white/10'
                    : 'cursor-not-allowed border-white/10 text-[rgb(237,234,222)]/38'
                )}
                title={m['site.kairo.preview_help']()}
              >
                {m['site.generator.preview']()}
              </button>
            </div>
            <div
              className="hidden h-8 w-px shrink-0 self-end bg-white/15 sm:block"
              aria-hidden
            />
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
                        className="inline-flex size-4 cursor-pointer items-center justify-center rounded-full text-current/70 transition-colors hover:text-current"
                        aria-label={m['genjutsu.estimate.help_aria']()}
                      >
                        <CircleHelp className="size-3.5" aria-hidden />
                      </TooltipTrigger>
                      <TooltipContent
                        side="top"
                        align="end"
                        className="max-w-[240px] text-left leading-snug"
                      >
                        {m['site.kairo.estimate_tooltip']()}
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </span>
              </div>
              <button
                type="button"
                disabled={!canGenerate}
                onClick={() => void startGeneration('full')}
                className={cn(
                  'relative inline-flex h-8 items-center justify-center rounded-lg bg-[rgb(204,144,92)] px-3.5 text-sm font-semibold tracking-wide shadow-none transition-all duration-200 active:scale-95',
                  canGenerate
                    ? 'cursor-pointer text-[rgb(247,246,243)] hover:brightness-105'
                    : 'cursor-not-allowed bg-[rgba(126,128,132,0.28)] text-[rgb(237,234,222)]/38'
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
                  ? resultKind === 'preview'
                    ? m['site.generator.preview_result']()
                    : m['site.common.your_video']()
                  : m['site.generator.generating']()}
              </p>
              <p className="mt-0.5 truncate text-xs text-white/40">
                {resultUrl && !busy
                  ? m['site.kairo.result_label']()
                  : phase === 'uploading' || phase === 'starting'
                    ? m['site.generator.starting']()
                    : m['site.kairo.generating_hint']()}
              </p>
            </div>
            {resultUrl && !busy ? (
              <div className="flex shrink-0 items-center gap-2">
                {resultKind === 'preview' ? (
                  <button
                    type="button"
                    disabled={!canGenerate}
                    onClick={() => void startGeneration('full')}
                    className="inline-flex h-9 items-center rounded-lg border border-[rgba(204,144,92,0.6)] px-3 text-xs font-semibold text-[rgb(237,234,222)] transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {m['site.generator.generate_full']()}
                  </button>
                ) : null}
                <a
                  href={
                    generationId
                      ? `/api/kairo-bad-times/result/${encodeURIComponent(generationId)}?download=1`
                      : resultUrl
                  }
                  download={
                    generationId
                      ? `kairo-bad-times-${resultKind === 'preview' ? 'preview-' : ''}${generationId.slice(0, 8)}.mp4`
                      : undefined
                  }
                  className="inline-flex h-9 items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 text-xs font-medium text-white/70 transition hover:bg-white/10 hover:text-white"
                >
                  <Download className="size-3.5" />
                  {m['site.common.download']()}
                </a>
              </div>
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
                  {m['site.kairo.generating_hint']()}
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
                className="mx-auto aspect-[9/16] max-h-[min(70vh,720px)] w-full max-w-[min(100%,420px)] rounded-2xl bg-black object-contain"
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
