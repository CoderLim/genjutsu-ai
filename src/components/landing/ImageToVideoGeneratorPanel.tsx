import {
  useCallback,
  useEffect,
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
  DAY_OF_THE_DEAD_PRESET_ID,
  type ImageToVideoPresetId,
  type ImageToVideoVariant,
} from '@/modules/image-to-video/presets';
import { estimateImageToVideoCredits } from '@/modules/image-to-video/pricing';
import { ApiError, apiGet, apiPost, uploadToSignedUrl } from '@/lib/api-client';
import { cn } from '@/lib/cn';
import {
  prepareReferenceImageFile,
  UploadFileReadError,
} from '@/lib/upload-file-preparation';
import { m } from '@/paraglide/messages.js';
import { useCreditGate } from '@/hooks/use-credit-gate';
import type { FixedTemplateMediaStatus } from '@/hooks/use-fixed-template-media';
import { useSingleImagePrepareGuard } from '@/hooks/use-image-prepare-guard';
import { useUserCredits } from '@/hooks/use-user-credits';
import { InsufficientCreditsModal } from '@/components/credits/insufficient-credits-modal';
import { CloseIcon, ImageModeIcon } from '@/components/icons';
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

type PresetMeta = {
  id: string;
  previewUrl: string;
  posterUrl: string;
  variants: ImageToVideoVariant[];
  defaultVariant: ImageToVideoVariant;
  defaultDuration: number;
  defaultResolution: '720p' | '1080p';
  defaultAspectRatio: string;
  estimatedCredits: number;
  displayName: string;
};

type PersistedGeneration = {
  userId: string;
  generationId: string;
  reservedCredits: number;
  presetId: string;
  variant: ImageToVideoVariant;
};

const MAX_IMAGE_BYTES = 12 * 1024 * 1024;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function activeGenerationKey(userId: string) {
  return `image-to-video:active:${userId}`;
}

function PhotoSlot(props: {
  item: MediaItem | null;
  inputRef: RefObject<HTMLInputElement | null>;
  disabled?: boolean;
  label: string;
  hint: string;
  onPick: (file: File) => void;
  onRemove: () => void;
}) {
  const onChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (file) props.onPick(file);
  };

  return (
    <div className="space-y-2">
      <div className="flex items-baseline justify-between gap-2">
        <p className="text-sm font-medium text-white/85">{props.label}</p>
        {props.hint ? (
          <p className="text-[11px] text-white/40">{props.hint}</p>
        ) : null}
      </div>
      <div
        className={cn(
          'relative aspect-[3/4] overflow-hidden rounded-2xl border border-dashed border-white/15 bg-black/35',
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
              className="absolute top-2 right-2 inline-flex size-8 items-center justify-center rounded-full border border-white/15 bg-black/55 text-white/85 backdrop-blur"
              aria-label="Remove photo"
            >
              <CloseIcon className="size-4" />
            </button>
          </>
        ) : (
          <button
            type="button"
            disabled={props.disabled}
            onClick={() => props.inputRef.current?.click()}
            className="flex size-full flex-col items-center justify-center gap-2 px-4 text-center text-white/55 transition hover:bg-white/[0.03] hover:text-white/75"
          >
            <ImageModeIcon className="size-7 opacity-70" />
            <span className="text-sm font-medium">
              {m['site.dotd.add_photo']()}
            </span>
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

function SegmentButton(props: {
  selected: boolean;
  onClick: () => void;
  children: ReactNode;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      disabled={props.disabled}
      onClick={props.onClick}
      className={cn(
        'rounded-lg px-3 py-1.5 text-xs font-medium transition',
        props.selected
          ? 'bg-[rgb(204,144,92)] text-[rgb(247,246,243)]'
          : 'bg-white/8 text-white/65 hover:bg-white/12',
        props.disabled && 'opacity-50'
      )}
    >
      {props.children}
    </button>
  );
}

export function ImageToVideoGeneratorPanel(props: {
  presetId?: ImageToVideoPresetId;
}) {
  const presetId = props.presetId ?? DAY_OF_THE_DEAD_PRESET_ID;
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
  const [variant, setVariant] = useState<ImageToVideoVariant>('person');
  const [photo, setPhoto] = useState<MediaItem | null>(null);
  const [phase, setPhase] = useState<
    'idle' | 'uploading' | 'starting' | 'generating' | 'locked'
  >('idle');
  const [jobError, setJobError] = useState('');
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [generationId, setGenerationId] = useState<string | null>(null);
  const [demoStatus, setDemoStatus] =
    useState<FixedTemplateMediaStatus>('loading');

  const busy = phase !== 'idle' && phase !== 'locked';
  // Demo video is preview-only — generate does not require it.
  const canGenerate =
    Boolean(photo) && !busy && !imagePrepare.isPreparing && !sessionPending;

  const estimatedCredits =
    meta?.estimatedCredits ??
    (() => {
      try {
        return estimateImageToVideoCredits({
          duration: 5,
          resolution: '720p',
        });
      } catch {
        return null;
      }
    })();

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const data = await apiGet<PresetMeta>(
          `/api/image-to-video/template-meta?presetId=${encodeURIComponent(presetId)}`
        );
        if (cancelled) return;
        setMeta(data);
        setVariant(data.defaultVariant);
      } catch {
        if (!cancelled) {
          toast.error(m['site.dotd.meta_failed']());
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [presetId]);

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
        const prepared = await prepareReferenceImageFile(file);
        if (!guard.isCurrent()) return;
        setPhoto((current) => {
          if (current) URL.revokeObjectURL(current.url);
          return {
            id: crypto.randomUUID(),
            file: prepared,
            url: URL.createObjectURL(prepared),
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
              localStorage.removeItem(activeGenerationKey(active.userId));
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
      if (active.userId !== userId || !active.generationId) {
        localStorage.removeItem(activeGenerationKey(userId));
        return;
      }
      const runId = ++generationRunRef.current;
      setGenerationId(active.generationId);
      if (active.variant === 'person' || active.variant === 'pet') {
        setVariant(active.variant);
      }
      setPhase('generating');
      void pollGeneration(active, runId);
    } catch {
      localStorage.removeItem(activeGenerationKey(userId));
    }
  }, [pollGeneration, session?.user?.id, phase]);

  const generate = async () => {
    if (!session?.user) {
      window.location.href = `/sign-in?callbackUrl=${encodeURIComponent('/day-of-the-dead-ai-video#generator')}`;
      return;
    }
    if (busy || imagePrepare.isPreparing || !photo) {
      if (!photo) toast.error(m['site.dotd.upload_required']());
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
        variant: ImageToVideoVariant;
      }>('/api/image-to-video/upload-url', {
        generationId: id,
        presetId,
        variant,
        contentType: photo.file.type || 'image/jpeg',
        contentLength: photo.file.size,
      });

      const upload = uploadRes.uploads[0];
      if (!upload) throw new Error('No upload URL returned');

      await uploadToSignedUrl({
        uploadUrl: upload.uploadUrl,
        uploadHeaders: upload.uploadHeaders,
        file: photo.file,
      });

      setPhase('starting');
      const started = await apiPost<GenerationStart>(
        '/api/image-to-video/generate',
        {
          generationId: id,
          presetId,
          variant,
          imageKey: upload.storageKey,
          contentType: photo.file.type || 'image/jpeg',
          contentLength: photo.file.size,
        }
      );

      const active: PersistedGeneration = {
        userId: session.user.id,
        generationId: started.generationId,
        reservedCredits: started.reservedCredits,
        presetId,
        variant,
      };
      localStorage.setItem(
        activeGenerationKey(session.user.id),
        JSON.stringify(active)
      );

      setPhase('generating');
      const runId = ++generationRunRef.current;
      void pollGeneration(active, runId);
    } catch (cause) {
      const apiData =
        cause instanceof ApiError &&
        cause.data &&
        typeof cause.data === 'object'
          ? (cause.data as Record<string, unknown>)
          : null;
      const insufficient = apiData?.code === 'INSUFFICIENT_CREDITS';
      const submissionUnknown = apiData?.code === 'SUBMISSION_UNKNOWN';

      if (cause instanceof ApiError && insufficient) {
        setPhase('idle');
        const requiredCredits = Number(apiData?.requiredCredits);
        const balance = Number(apiData?.balance);
        if (Number.isFinite(requiredCredits) && Number.isFinite(balance)) {
          creditGate.open({ requiredCredits, balance });
          setJobError('');
          return;
        }
      }

      if (submissionUnknown) {
        setPhase('locked');
        setJobError(
          cause instanceof Error
            ? cause.message
            : m['site.generator.submission_uncertain']()
        );
        return;
      }

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

  const previewUrl =
    meta?.previewUrl || '/videos/day-of-the-dead-ai-video-demo.mp4';
  const posterUrl =
    meta?.posterUrl || '/videos/day-of-the-dead-ai-video-demo-poster.jpg';
  const aspectClass =
    meta?.defaultAspectRatio === '16:9' ? 'aspect-video' : 'aspect-[9/16]';

  return (
    <div className="mx-auto w-full max-w-[1120px]">
      <div className="overflow-hidden rounded-[26px] border border-white/10 bg-[rgba(30,23,19,0.92)] shadow-[0_30px_90px_-30px_rgba(0,0,0,0.85)] backdrop-blur-2xl">
        <div className="border-b border-white/8 px-4 py-3 sm:px-5">
          <p className="text-xs font-medium tracking-wide text-[rgb(220,155,99)] uppercase">
            {m['site.dotd.panel_eyebrow']()}
          </p>
          <p className="mt-1 text-sm text-white/55">
            {m['site.dotd.panel_sub']()}
          </p>
        </div>

        <div className="grid gap-0 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="flex items-center justify-center border-b border-white/8 p-4 sm:p-5 lg:border-r lg:border-b-0">
            <FixedTemplatePreview
              src={previewUrl}
              poster={posterUrl}
              className={cn(
                'relative mx-auto max-h-[420px] w-full max-w-[260px] rounded-2xl border border-white/10',
                aspectClass
              )}
              objectFit="contain"
              autoPlay
              loop
              onStatusChange={setDemoStatus}
            />
          </div>

          <div className="space-y-4 p-4 sm:p-5">
            <div className="flex flex-wrap gap-2">
              {(meta?.variants ?? (['person', 'pet'] as const)).map((v) => (
                <SegmentButton
                  key={v}
                  selected={variant === v}
                  disabled={busy}
                  onClick={() => setVariant(v)}
                >
                  {v === 'pet'
                    ? m['site.dotd.variant_pet']()
                    : m['site.dotd.variant_person']()}
                </SegmentButton>
              ))}
            </div>
            <p className="text-[11px] leading-5 text-white/42">
              {variant === 'pet'
                ? m['site.dotd.upload_hint_pet']()
                : m['site.dotd.upload_hint_person']()}
            </p>
            <div className="mx-auto w-full max-w-xs">
              <PhotoSlot
                item={photo}
                inputRef={photoInputRef}
                disabled={busy}
                label={m['site.dotd.photo']()}
                hint={m['site.dotd.photo_hint']()}
                onPick={setPhotoFile}
                onRemove={clearPhoto}
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

          {demoStatus === 'error' ? (
            <p className="mb-3 text-xs text-white/40">
              {m['site.dotd.demo_unavailable']()}
            </p>
          ) : null}

          <div className="flex flex-wrap items-center justify-end gap-3">
            <div className="flex items-center gap-2">
              <div className="flex flex-col items-end gap-0.5 text-[11px] text-white/50 tabular-nums">
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
                onClick={() => void generate()}
                className={cn(
                  'relative inline-flex h-8 items-center justify-center rounded-lg px-3.5 text-sm font-semibold tracking-wide transition-all duration-200 active:scale-95',
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

      {busy || resultUrl ? (
        <div className="mt-6 overflow-hidden rounded-[22px] border border-white/10 bg-black/30 p-4 sm:p-5">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-sm font-semibold text-white/85">
              {resultUrl
                ? m['site.generator.result']()
                : m['site.common.generating']()}
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
          {resultUrl ? (
            <video
              key={resultUrl}
              src={resultUrl}
              controls
              playsInline
              className="mx-auto mt-4 max-h-[480px] w-full max-w-[280px] rounded-xl bg-black"
            />
          ) : (
            <p className="mt-3 text-sm text-white/45">
              {generationId
                ? m['site.dotd.generating_note']()
                : m['site.common.generating']()}
            </p>
          )}
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
