import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type RefObject,
} from 'react';
import { CircleHelp, Download } from 'lucide-react';
import { toast } from 'sonner';

import { useSession } from '@/core/auth/client';
import {
  IMAGE_TO_VIDEO_DEFAULT_RESOLUTION,
  IMAGE_TO_VIDEO_RESOLUTIONS,
  type ImageToVideoResolution,
} from '@/modules/image-to-video/constants';
import {
  IMAGE_TO_VIDEO_CUSTOM_PROMPT_MAX,
  JATAYU_PRESET_ID,
} from '@/modules/image-to-video/presets';
import { estimateImageToVideoCredits } from '@/modules/image-to-video/pricing';
import { JATAYU_EXPANDED_PROMPT } from '@/modules/image-to-video/prompts';
import { ApiError, apiGet, apiPost, uploadToSignedUrl } from '@/lib/api-client';
import { cn } from '@/lib/cn';
import {
  prepareReferenceImageFile,
  UploadFileReadError,
} from '@/lib/upload-file-preparation';
import { m } from '@/paraglide/messages.js';
import { useCreditGate } from '@/hooks/use-credit-gate';
import { useSingleImagePrepareGuard } from '@/hooks/use-image-prepare-guard';
import { useUserCredits } from '@/hooks/use-user-credits';
import { InsufficientCreditsModal } from '@/components/credits/insufficient-credits-modal';
import { CloseIcon, ImageModeIcon } from '@/components/icons';
import {
  JATAYU_DEMO_POSTER,
  JATAYU_DEMO_VIDEO,
  JATAYU_PAGE_PATH,
} from '@/components/landing/jatayu-video-prompt-content';
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

type PresetMeta = {
  id: string;
  previewUrl: string;
  posterUrl: string;
  defaultDuration: number;
  defaultResolution: ImageToVideoResolution;
  defaultAspectRatio: string;
  estimatedCredits: number;
  defaultPrompt?: string;
};

type PersistedGeneration = {
  userId: string;
  generationId: string;
  reservedCredits: number;
  presetId: string;
  generatePending?: boolean;
};

const MAX_IMAGE_BYTES = 12 * 1024 * 1024;
const PRESET_ID = JATAYU_PRESET_ID;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function activeGenerationKey(userId: string) {
  return `image-to-video:active:${PRESET_ID}:${userId}`;
}

function writeActiveGeneration(active: PersistedGeneration) {
  try {
    localStorage.setItem(
      activeGenerationKey(active.userId),
      JSON.stringify(active)
    );
  } catch {
    // ignore
  }
}

function clearActiveGeneration(userId: string) {
  try {
    localStorage.removeItem(activeGenerationKey(userId));
  } catch {
    // ignore
  }
}

function isClearGenerateFailure(code: unknown) {
  return (
    code === 'INSUFFICIENT_CREDITS' ||
    code === 'PROVIDER_SUBMIT_FAILED' ||
    code === 'GENERATION_CONFLICT' ||
    code === 'INVALID_INPUT' ||
    code === 'UNAUTHORIZED'
  );
}

function PhotoSlot(props: {
  item: MediaItem | null;
  inputRef: RefObject<HTMLInputElement | null>;
  disabled?: boolean;
  onPick: (file: File) => void;
  onRemove: () => void;
}) {
  const onChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (file) props.onPick(file);
  };

  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline justify-between gap-2">
        <p className="text-sm font-medium text-white/85">Your photo</p>
        <p className="text-[11px] text-white/40">JPG / PNG / WebP</p>
      </div>
      <div
        className={cn(
          'relative h-[168px] w-full overflow-hidden rounded-xl border border-dashed border-white/15 bg-black/35',
          props.disabled && 'opacity-60'
        )}
      >
        {props.item ? (
          <>
            <img
              src={props.item.url}
              alt=""
              className="size-full object-cover"
            />
            <button
              type="button"
              disabled={props.disabled}
              onClick={props.onRemove}
              className="absolute top-1.5 right-1.5 inline-flex size-7 items-center justify-center rounded-full border border-white/15 bg-black/55 text-white/85 backdrop-blur"
              aria-label="Remove photo"
            >
              <CloseIcon className="size-3.5" />
            </button>
          </>
        ) : (
          <button
            type="button"
            disabled={props.disabled}
            onClick={() => props.inputRef.current?.click()}
            className="flex size-full flex-col items-center justify-center gap-1.5 px-2 text-center text-white/55 transition hover:bg-white/[0.03] hover:text-white/75"
          >
            <ImageModeIcon className="size-6 opacity-70" />
            <span className="text-xs font-medium">Add photo</span>
          </button>
        )}
        <input
          ref={props.inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif,image/avif,.heic,.heif"
          className="hidden"
          onChange={onChange}
        />
      </div>
    </div>
  );
}

export function JatayuGeneratorPanel() {
  const { data: session, isPending: sessionPending } = useSession();
  const creditsQuery = useUserCredits(Boolean(session?.user));
  const creditGate = useCreditGate({
    balance: creditsQuery.data?.balance,
    email: session?.user?.email,
  });

  const photoInputRef = useRef<HTMLInputElement>(null);
  const imagePrepare = useSingleImagePrepareGuard();
  const generationRunRef = useRef(0);

  const [meta, setMeta] = useState<PresetMeta | null>(null);
  const [photo, setPhoto] = useState<MediaItem | null>(null);
  const [prompt, setPrompt] = useState(JATAYU_EXPANDED_PROMPT);
  const [resolution, setResolution] = useState<ImageToVideoResolution>(
    IMAGE_TO_VIDEO_DEFAULT_RESOLUTION
  );
  const [phase, setPhase] = useState<
    'idle' | 'uploading' | 'starting' | 'generating' | 'locked'
  >('idle');
  const [jobError, setJobError] = useState('');
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [generationId, setGenerationId] = useState<string | null>(null);

  const busy =
    phase === 'uploading' || phase === 'starting' || phase === 'generating';
  const locked = phase === 'locked';
  const canGenerate =
    Boolean(photo) &&
    prompt.trim().length >= 20 &&
    phase === 'idle' &&
    !imagePrepare.isPreparing &&
    !sessionPending;

  const duration = meta?.defaultDuration ?? 5;
  const estimatedCredits = (() => {
    try {
      return estimateImageToVideoCredits({ duration, resolution });
    } catch {
      return meta?.estimatedCredits ?? null;
    }
  })();

  const previewUrl = meta?.previewUrl || JATAYU_DEMO_VIDEO;
  const posterUrl = meta?.posterUrl || JATAYU_DEMO_POSTER;
  const displayVideoUrl = resultUrl || previewUrl;
  /** Demo asset is landscape; generated Jatayu clips are 9:16. */
  const previewIsPortrait = Boolean(resultUrl);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const data = await apiGet<PresetMeta>(
          `/api/image-to-video/template-meta?presetId=${encodeURIComponent(PRESET_ID)}`
        );
        if (cancelled) return;
        setMeta(data);
        if (data.defaultPrompt?.trim()) {
          setPrompt(data.defaultPrompt);
        }
        if (
          data.defaultResolution === '480p' ||
          data.defaultResolution === '720p' ||
          data.defaultResolution === '1080p'
        ) {
          setResolution(data.defaultResolution);
        }
      } catch {
        if (!cancelled) {
          toast.error('Could not load generator settings');
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const setPhotoFile = (file: File) => {
    const type = file.type?.toLowerCase() || '';
    if (
      type &&
      !type.startsWith('image/') &&
      !/\.(jpe?g|png|webp|gif|avif|heic|heif)$/i.test(file.name)
    ) {
      toast.error(m['site.dotd.image_type']());
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      toast.error(m['site.dotd.image_size']());
      return;
    }

    const guard = imagePrepare.begin();
    void (async () => {
      try {
        const prepared = await prepareReferenceImageFile({
          file,
          maxBytes: MAX_IMAGE_BYTES,
          product: 'image-to-video',
        });
        if (!guard.isCurrent()) return;
        const nextFile = prepared.file;
        setPhoto((current) => {
          if (current) URL.revokeObjectURL(current.url);
          return {
            id: crypto.randomUUID(),
            file: nextFile,
            url: URL.createObjectURL(nextFile),
          };
        });
      } catch (cause) {
        if (!guard.isCurrent()) return;
        toast.error(
          cause instanceof UploadFileReadError
            ? cause.message
            : m['site.generator.image_replace_failed']()
        );
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
            `/api/image-to-video/status?generationId=${encodeURIComponent(active.generationId)}`
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
              clearActiveGeneration(active.userId);
              setPhase('idle');
              setJobError(m['site.dotd.generation_missing']());
              return;
            }
          }

          delayMs = Math.min(5_000, Math.ceil(delayMs * 1.2));
          continue;
        }

        notFoundCount = 0;

        if (polled.providerStatus === 'submission_unknown') {
          setPhase('locked');
          setJobError(
            polled.error || m['site.generator.submission_uncertain']()
          );
          return;
        }

        if (polled.status === 'completed' && polled.videoUrl) {
          if (generationRunRef.current !== runId) return;
          clearActiveGeneration(active.userId);
          setResultUrl(polled.videoUrl);
          setJobError('');
          setPhase('idle');
          void creditsQuery.refetch();
          return;
        }

        if (polled.status === 'failed') {
          if (
            polled.providerStatus === 'submission_unknown' ||
            (typeof polled.reservedCredits === 'number' &&
              polled.reservedCredits > 0 &&
              !polled.refundedCredits)
          ) {
            setPhase('locked');
            setJobError(
              polled.error || m['site.generator.submission_uncertain']()
            );
            return;
          }

          clearActiveGeneration(active.userId);
          setPhase('idle');
          const requiredCredits = Number(polled.requiredCredits);
          const balance = Number(polled.balance);
          if (
            Number.isFinite(requiredCredits) &&
            Number.isFinite(balance) &&
            polled.errorCode === 'INSUFFICIENT_CREDITS'
          ) {
            creditGate.open({ requiredCredits, balance });
            setJobError('');
            return;
          }
          creditGate.clear();
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
    [creditGate, creditsQuery]
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
        active.presetId !== PRESET_ID
      ) {
        clearActiveGeneration(userId);
        return;
      }
      const runId = ++generationRunRef.current;
      setGenerationId(active.generationId);
      setPhase('generating');
      void pollGeneration(active, runId);
    } catch {
      clearActiveGeneration(userId);
    }
  }, [pollGeneration, session?.user?.id, phase]);

  const generate = async () => {
    if (!session?.user) {
      window.location.href = `/sign-in?callbackUrl=${encodeURIComponent(`${JATAYU_PAGE_PATH}#generator`)}`;
      return;
    }

    try {
      const raw = localStorage.getItem(activeGenerationKey(session.user.id));
      if (raw) {
        const active = JSON.parse(raw) as PersistedGeneration;
        if (active.generationId && active.userId === session.user.id) {
          setGenerationId(active.generationId);
          setPhase('generating');
          const runId = ++generationRunRef.current;
          void pollGeneration(active, runId);
          toast.error(m['site.generator.still_processing']());
          return;
        }
      }
    } catch {
      // ignore
    }

    if (
      locked ||
      busy ||
      imagePrepare.isPreparing ||
      !photo ||
      phase !== 'idle'
    ) {
      if (!photo && phase === 'idle') {
        toast.error('Upload a photo first');
      }
      return;
    }

    const trimmedPrompt = prompt.trim();
    if (trimmedPrompt.length < 20) {
      toast.error('Prompt is too short');
      return;
    }

    setResultUrl(null);
    creditGate.clear();
    setJobError('');
    setPhase('uploading');

    const id = crypto.randomUUID().replace(/-/g, '');
    setGenerationId(id);

    try {
      const uploadRes = await apiPost<{
        uploads: SignedUpload[];
        presetId: string;
      }>('/api/image-to-video/upload-url', {
        generationId: id,
        presetId: PRESET_ID,
        variant: 'person',
        contentType: photo.file.type || 'image/jpeg',
        contentLength: photo.file.size,
      });

      const upload = uploadRes.uploads[0];
      if (!upload) throw new Error('No upload URL returned');

      await uploadToSignedUrl({
        url: upload.uploadUrl,
        headers: upload.uploadHeaders,
        file: photo.file,
      });

      setPhase('starting');

      const pendingActive: PersistedGeneration = {
        userId: session.user.id,
        generationId: id,
        reservedCredits: 0,
        presetId: PRESET_ID,
        generatePending: true,
      };
      writeActiveGeneration(pendingActive);

      let started: GenerationStart;
      try {
        started = await apiPost<GenerationStart>(
          '/api/image-to-video/generate',
          {
            generationId: id,
            presetId: PRESET_ID,
            variant: 'person',
            prompt: trimmedPrompt,
            resolution,
            duration,
            imageKey: upload.storageKey,
            contentType: photo.file.type || 'image/jpeg',
            contentLength: photo.file.size,
          }
        );
      } catch (generateCause) {
        const apiData =
          generateCause instanceof ApiError &&
          generateCause.data &&
          typeof generateCause.data === 'object'
            ? (generateCause.data as Record<string, unknown>)
            : null;
        const code = apiData?.code;

        if (code === 'INSUFFICIENT_CREDITS') {
          clearActiveGeneration(session.user.id);
          setPhase('idle');
          const requiredCredits = Number(apiData?.requiredCredits);
          const balance = Number(apiData?.balance);
          if (Number.isFinite(requiredCredits) && Number.isFinite(balance)) {
            creditGate.open({ requiredCredits, balance });
            setJobError('');
            return;
          }
          creditGate.clear();
          const message =
            generateCause instanceof Error
              ? generateCause.message
              : m['site.generator.failed_unexpected']();
          toast.error(message);
          setJobError(message);
          return;
        }

        if (code === 'SUBMISSION_UNKNOWN') {
          writeActiveGeneration({
            ...pendingActive,
            generatePending: false,
          });
          setPhase('locked');
          setJobError(
            generateCause instanceof Error
              ? generateCause.message
              : m['site.generator.submission_uncertain']()
          );
          return;
        }

        if (isClearGenerateFailure(code)) {
          clearActiveGeneration(session.user.id);
          setPhase('idle');
          creditGate.clear();
          const message =
            generateCause instanceof Error
              ? generateCause.message
              : m['site.generator.failed_unexpected']();
          toast.error(message);
          setJobError(message);
          return;
        }

        writeActiveGeneration({
          ...pendingActive,
          generatePending: false,
        });
        setPhase('generating');
        setJobError(m['site.generator.still_processing']());
        const runId = ++generationRunRef.current;
        void pollGeneration(
          { ...pendingActive, generatePending: false },
          runId
        );
        return;
      }

      const active: PersistedGeneration = {
        userId: session.user.id,
        generationId: started.generationId,
        reservedCredits: started.reservedCredits,
        presetId: PRESET_ID,
        generatePending: false,
      };
      writeActiveGeneration(active);

      setPhase('generating');
      const runId = ++generationRunRef.current;
      void pollGeneration(active, runId);
    } catch (cause) {
      clearActiveGeneration(session.user.id);
      setPhase('idle');
      creditGate.clear();
      const message =
        cause instanceof Error
          ? cause.message
          : m['site.generator.failed_unexpected']();
      toast.error(message);
      setJobError(message);
    }
  };

  return (
    <div id="generator" className="mx-auto w-full max-w-[1120px] scroll-mt-24">
      <div className="overflow-hidden rounded-[26px] border border-white/10 bg-[rgba(30,23,19,0.92)] shadow-[0_30px_90px_-30px_rgba(0,0,0,0.85)] backdrop-blur-2xl">
        <div className="border-b border-white/8 px-4 py-3 sm:px-5">
          <p className="text-xs font-medium tracking-wide text-[rgb(220,155,99)] uppercase">
            Try it here
          </p>
          <p className="mt-1 text-sm text-white/55">
            Upload a selfie, edit the prompt, generate a vertical Jatayu clip.
          </p>
        </div>

        <div className="grid gap-0 lg:grid-cols-[minmax(0,420px)_minmax(0,1fr)]">
          <div className="flex flex-col gap-3 border-b border-white/8 p-3 sm:p-4 lg:border-r lg:border-b-0">
            <PhotoSlot
              item={photo}
              inputRef={photoInputRef}
              disabled={busy || locked}
              onPick={setPhotoFile}
              onRemove={clearPhoto}
            />

            <div className="space-y-1.5">
              <div className="flex items-baseline justify-between gap-2">
                <label
                  htmlFor="jatayu-prompt"
                  className="text-sm font-medium text-white/85"
                >
                  Prompt
                </label>
                <span className="text-[11px] text-white/40 tabular-nums">
                  {prompt.length}/{IMAGE_TO_VIDEO_CUSTOM_PROMPT_MAX}
                </span>
              </div>
              <textarea
                id="jatayu-prompt"
                value={prompt}
                disabled={busy || locked}
                maxLength={IMAGE_TO_VIDEO_CUSTOM_PROMPT_MAX}
                onChange={(e) => setPrompt(e.target.value)}
                rows={5}
                className="h-[132px] max-h-[160px] min-h-[112px] w-full resize-y rounded-xl border border-white/10 bg-black/35 px-3 py-2 text-sm leading-5 text-white/80 outline-none placeholder:text-white/30 focus:border-[rgba(204,144,92,0.45)]"
              />
            </div>

            <div className="space-y-1.5">
              <p className="text-sm font-medium text-white/85">Resolution</p>
              <div className="flex flex-wrap gap-1.5">
                {IMAGE_TO_VIDEO_RESOLUTIONS.map((opt) => (
                  <button
                    key={opt}
                    type="button"
                    disabled={busy || locked}
                    onClick={() => setResolution(opt)}
                    className={cn(
                      'rounded-lg px-2.5 py-1 text-xs font-medium transition',
                      resolution === opt
                        ? 'bg-[rgb(204,144,92)] text-[rgb(247,246,243)]'
                        : 'bg-white/8 text-white/65 hover:bg-white/12',
                      (busy || locked) && 'opacity-50'
                    )}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            </div>

            {jobError ? (
              <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
                {jobError}
              </div>
            ) : null}

            <div className="mt-auto flex flex-wrap items-center justify-between gap-3 border-t border-white/8 pt-3">
              <div className="flex flex-col gap-0.5 text-[11px] text-white/50 tabular-nums">
                <span className="text-[10px] text-white/45">
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
                        className="inline-flex size-4 items-center justify-center rounded-full text-current/70"
                        aria-label={m['genjutsu.estimate.help_aria']()}
                      >
                        <CircleHelp className="size-3.5" aria-hidden />
                      </TooltipTrigger>
                      <TooltipContent
                        side="top"
                        align="start"
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
                onClick={() => void generate()}
                className={cn(
                  'relative inline-flex h-10 items-center justify-center rounded-xl px-5 text-sm font-semibold tracking-wide transition-all duration-200 active:scale-95',
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

            {!session?.user && !sessionPending ? (
              <p className="text-xs text-white/40">
                {m['site.common.signin_generate']()}
              </p>
            ) : null}
          </div>

          <div className="flex flex-col justify-center p-4 sm:p-5">
            <div className="mb-3 flex items-center justify-between gap-3">
              <h3 className="text-sm font-semibold text-white/85">
                {resultUrl
                  ? m['site.generator.result']()
                  : busy
                    ? m['site.common.generating']()
                    : 'Example result'}
              </h3>
              {resultUrl ? (
                <a
                  href={`${resultUrl}${resultUrl.includes('?') ? '&' : '?'}download=1`}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-white/15 bg-white/8 px-3 py-1.5 text-xs font-medium text-white/85 hover:bg-white/12"
                >
                  <Download className="size-3.5" />
                  {m['site.common.download']()}
                </a>
              ) : null}
            </div>

            <div
              className={cn(
                'relative mx-auto w-full',
                previewIsPortrait ? 'max-w-[260px]' : 'max-w-[520px]'
              )}
            >
              <video
                key={displayVideoUrl}
                src={displayVideoUrl}
                poster={resultUrl ? undefined : posterUrl}
                controls
                playsInline
                autoPlay={!resultUrl}
                muted={!resultUrl}
                loop={!resultUrl}
                preload={resultUrl ? 'metadata' : 'none'}
                className={cn(
                  'w-full rounded-2xl border border-white/10 bg-black object-contain',
                  previewIsPortrait ? 'aspect-[9/16]' : 'aspect-video'
                )}
              />
              {busy && !resultUrl ? (
                <div className="absolute inset-0 flex items-center justify-center rounded-2xl bg-black/45 text-sm text-white/80 backdrop-blur-[1px]">
                  {generationId
                    ? m['site.dotd.generating_note']()
                    : m['site.common.generating']()}
                </div>
              ) : null}
            </div>

            {!resultUrl && !busy ? (
              <p className="mt-3 text-center text-xs text-white/35">
                Demo plays until you generate your own clip
              </p>
            ) : null}
          </div>
        </div>
      </div>

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
