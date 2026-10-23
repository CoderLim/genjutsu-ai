import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type RefObject,
} from 'react';
import { CircleHelp, Download, LoaderCircle, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';

import { useSession } from '@/core/auth/client';
import {
  getHotelLobbyPresetClientDefaults,
  HOTEL_LOBBY_PRESET_ID,
  isHotelLobbyPresetId,
  type HotelLobbyPresetId,
} from '@/modules/hotel-lobby/presets';
import {
  estimateHotelLobbyCredits,
  HOTEL_LOBBY_MAX_VIDEO_EDGE_PX,
  HOTEL_LOBBY_MIN_VIDEO_EDGE_PX,
} from '@/modules/hotel-lobby/pricing';
import {
  createAsyncRequestGuard,
  deriveHotelLobbyTemplateGate,
  hotelLobbyTemplateMediaIdentity,
  shouldResetHotelLobbyTemplateMedia,
  withHotelLobbyTemplateRetryParam,
  type HotelLobbyTemplateMediaStatus,
} from '@/modules/hotel-lobby/template-gate';
import { hotelLobbyTemplateProxyUrl } from '@/modules/hotel-lobby/template-proxy-url';
import { ApiError, apiGet, apiPost, uploadToSignedUrl } from '@/lib/api-client';
import { trimVideoToFile } from '@/lib/trim-video';
import { cn } from '@/lib/utils';
import { m } from '@/paraglide/messages.js';
import { useCreditGate } from '@/hooks/use-credit-gate';
import { useUserCredits } from '@/hooks/use-user-credits';
import { InsufficientCreditsModal } from '@/components/credits/insufficient-credits-modal';
import { CloseIcon, FilmIcon, ImageModeIcon } from '@/components/icons';
import { HotelLobbyTrimBar } from '@/components/landing/hotel-lobby-trim-bar';
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

type VideoSource =
  | {
      kind: 'template';
      url: string;
      durationSeconds?: number;
    }
  | {
      kind: 'upload';
      file: File;
      url: string;
      durationSeconds: number;
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
};

type GenerationPoll = {
  status: 'processing' | 'completed' | 'failed';
  providerStatus: string;
  videoUrl: string | null;
  error?: string;
  reservedCredits?: number;
  refundedCredits?: number;
};

const MAX_VIDEO_BYTES = 80 * 1024 * 1024;
const MAX_IMAGE_BYTES = 12 * 1024 * 1024;
const MIN_REFERENCE_VIDEO_SECONDS = 3;
const MAX_REFERENCE_VIDEO_SECONDS = 15;

export type HotelLobbyPanelPresetId = HotelLobbyPresetId;

type PresetUiMeta = {
  presetId: HotelLobbyPresetId;
  enabled: boolean;
  templateAvailable: boolean;
  allowCustomVideo: boolean;
  allowTrim: boolean;
  aspectRatio: string;
  previewUrl: string;
  posterUrl: string;
  downloadPrefix: string;
  displayName: string;
  imageCount: { min: number; max: number };
  estimatedCredits: number | null;
};

function resolvePanelPresetId(value: string | undefined): HotelLobbyPresetId {
  return isHotelLobbyPresetId(value) ? value : HOTEL_LOBBY_PRESET_ID;
}

function templateMetaUrlFor(presetId: HotelLobbyPresetId) {
  return presetId === HOTEL_LOBBY_PRESET_ID
    ? '/api/hotel-lobby/template-meta'
    : `/api/hotel-lobby/template-meta?presetId=${encodeURIComponent(presetId)}`;
}

function isFullSourceClip(
  startSeconds: number,
  endSeconds: number,
  sourceSeconds: number
) {
  return startSeconds <= 0.05 && Math.abs(endSeconds - sourceSeconds) <= 0.2;
}

function createMediaItem(file: File): MediaItem {
  return {
    id: `${file.name}-${file.size}-${file.lastModified}-${Math.random()
      .toString(36)
      .slice(2, 8)}`,
    file,
    url: URL.createObjectURL(file),
  };
}

function readVideoMetadata(file: File): Promise<{
  duration: number;
  width: number;
  height: number;
}> {
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
      const width = video.videoWidth;
      const height = video.videoHeight;
      cleanup();
      if (!Number.isFinite(duration) || duration <= 0) {
        reject(new Error('Could not read video duration'));
        return;
      }
      if (
        !Number.isFinite(width) ||
        !Number.isFinite(height) ||
        width < 1 ||
        height < 1
      ) {
        reject(new Error('Could not read video resolution'));
        return;
      }
      resolve({ duration, width, height });
    };
    video.onerror = () => {
      cleanup();
      reject(new Error('Could not read video metadata'));
    };
    video.src = url;
  });
}

function assertClientVideoDimensions(width: number, height: number) {
  if (
    width < HOTEL_LOBBY_MIN_VIDEO_EDGE_PX ||
    height < HOTEL_LOBBY_MIN_VIDEO_EDGE_PX ||
    width > HOTEL_LOBBY_MAX_VIDEO_EDGE_PX ||
    height > HOTEL_LOBBY_MAX_VIDEO_EDGE_PX
  ) {
    throw new Error(
      `Reference video must be between ${HOTEL_LOBBY_MIN_VIDEO_EDGE_PX}×${HOTEL_LOBBY_MIN_VIDEO_EDGE_PX} and ${HOTEL_LOBBY_MAX_VIDEO_EDGE_PX}×${HOTEL_LOBBY_MAX_VIDEO_EDGE_PX} pixels`
    );
  }
}

function clampReferenceDuration(seconds: number) {
  return Math.min(
    MAX_REFERENCE_VIDEO_SECONDS,
    Math.max(MIN_REFERENCE_VIDEO_SECONDS, Math.round(seconds))
  );
}

function redirectToSignIn() {
  const callbackUrl = encodeURIComponent(
    `${window.location.pathname}${window.location.search}`
  );
  window.location.href = `/sign-in?callbackUrl=${callbackUrl}`;
}

function PersonSlot({
  title,
  note,
  item,
  onPick,
  onRemove,
  inputRef,
  disabled,
  aspectClass = 'aspect-[4/5]',
  frameClassName,
}: {
  title: string;
  note: string;
  item: MediaItem | null;
  onPick: (file: File | null) => void;
  onRemove: () => void;
  inputRef: RefObject<HTMLInputElement | null>;
  disabled: boolean;
  aspectClass?: string;
  frameClassName?: string;
}) {
  return (
    <div className="min-w-0">
      <div className="mb-2">
        <p className="text-sm font-semibold text-white/90">{title}</p>
        <p className="mt-0.5 text-xs leading-5 text-white/40">{note}</p>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/*"
        className="hidden"
        onChange={(event: ChangeEvent<HTMLInputElement>) => {
          onPick(event.target.files?.[0] || null);
          event.target.value = '';
        }}
      />

      {item ? (
        <div
          className={cn(
            'group relative overflow-hidden rounded-2xl border border-white/10 bg-black/30',
            aspectClass,
            frameClassName
          )}
        >
          <img src={item.url} alt={title} className="size-full object-cover" />
          <button
            type="button"
            disabled={disabled}
            onClick={onRemove}
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
          className={cn(
            'flex w-full flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-white/14 bg-white/[0.025] text-center text-white/42 transition hover:border-[rgba(204,144,92,0.55)] hover:bg-[rgba(204,144,92,0.05)] hover:text-[rgb(220,155,99)] disabled:cursor-not-allowed disabled:opacity-50',
            aspectClass,
            frameClassName
          )}
        >
          <ImageModeIcon className="size-6" />
          <span className="text-xs font-medium">
            {m['site.common.add_photo']()}
          </span>
        </button>
      )}
    </div>
  );
}

export function HotelLobbyGeneratorPanel({
  presetId: presetIdProp = HOTEL_LOBBY_PRESET_ID,
}: {
  presetId?: HotelLobbyPanelPresetId;
} = {}) {
  const presetId = resolvePanelPresetId(presetIdProp);
  const clientDefaults = getHotelLobbyPresetClientDefaults(presetId);
  const { data: session, isPending: sessionPending } = useSession();
  const creditsQuery = useUserCredits(Boolean(session?.user));
  const creditGate = useCreditGate({
    balance: creditsQuery.data?.balance,
    email: session?.user?.email,
  });
  const videoInputRef = useRef<HTMLInputElement>(null);
  const firstImageInputRef = useRef<HTMLInputElement>(null);
  const secondImageInputRef = useRef<HTMLInputElement>(null);
  const mountedRef = useRef(true);
  const localUrlsRef = useRef<Set<string>>(new Set());
  const templateMetaRequestGuardRef = useRef(createAsyncRequestGuard());
  const templatePreviewUrlRef = useRef(clientDefaults.previewUrl);

  const previewVideoRef = useRef<HTMLVideoElement>(null);
  const resultPanelRef = useRef<HTMLDivElement>(null);
  const generationStartedAtRef = useRef<number | null>(null);
  const [video, setVideo] = useState<VideoSource | null>({
    kind: 'template',
    url: clientDefaults.previewUrl,
  });
  /** Independent of browser media — set only from template-meta. */
  const [r2TemplateAvailable, setR2TemplateAvailable] = useState<
    boolean | null
  >(null);
  const [templateMediaStatus, setTemplateMediaStatus] =
    useState<HotelLobbyTemplateMediaStatus>('loading');
  const templateMediaIdentityRef = useRef<string | null>(null);
  const [presetMeta, setPresetMeta] = useState<PresetUiMeta | null>(null);
  const [firstImage, setFirstImage] = useState<MediaItem | null>(null);
  const [secondImage, setSecondImage] = useState<MediaItem | null>(null);
  const [trimStart, setTrimStart] = useState(0);
  const [trimEnd, setTrimEnd] = useState(0);
  const [trimming, setTrimming] = useState(false);
  const [phase, setPhase] = useState<
    'idle' | 'uploading' | 'starting' | 'generating' | 'saving' | 'done'
  >('idle');
  const [providerStatus, setProviderStatus] = useState('');
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [generationId, setGenerationId] = useState<string | null>(null);
  const [progressPercent, setProgressPercent] = useState(0);

  const jobBusy = !['idle', 'done'].includes(phase);
  const busy = jobBusy || trimming;
  const allowCustomVideo =
    presetMeta?.allowCustomVideo ?? clientDefaults.allowCustomVideo;
  const allowTrim = presetMeta?.allowTrim ?? clientDefaults.allowTrim;
  const minImages = presetMeta?.imageCount.min ?? clientDefaults.imageCount.min;
  const maxImages = presetMeta?.imageCount.max ?? clientDefaults.imageCount.max;
  const presetEnabled = presetMeta?.enabled ?? clientDefaults.enabled;
  const aspectRatio = presetMeta?.aspectRatio ?? clientDefaults.aspectRatio;
  const previewUrl = presetMeta?.previewUrl ?? clientDefaults.previewUrl;
  templatePreviewUrlRef.current = previewUrl;
  const posterUrl = presetMeta?.posterUrl ?? clientDefaults.posterUrl;
  const downloadPrefix =
    presetMeta?.downloadPrefix ?? clientDefaults.downloadPrefix;
  const displayName = presetMeta?.displayName ?? clientDefaults.displayName;
  const isFixedTemplate = !allowCustomVideo;
  const usesDualSubjectCopy = isFixedTemplate && minImages >= 2;
  const previewAspectClass =
    aspectRatio === '9:16'
      ? 'aspect-[9/16]'
      : aspectRatio === '4:3'
        ? 'aspect-[4/3]'
        : 'aspect-video';
  // Keep fixed-template media pairs visually matched and capped so 9:16
  // doesn't dominate the viewport.
  const fixedMediaFrameClass =
    aspectRatio === '9:16'
      ? 'mx-auto max-w-[260px]'
      : aspectRatio === '4:3'
        ? 'mx-auto max-w-md'
        : 'w-full';
  const imageItems = (
    maxImages > 1 ? [firstImage, secondImage] : [firstImage]
  ).filter((item): item is MediaItem => Boolean(item));
  const sourceDuration =
    typeof video?.durationSeconds === 'number' &&
    Number.isFinite(video.durationSeconds) &&
    video.durationSeconds > 0
      ? video.durationSeconds
      : null;
  const hasKnownDuration = sourceDuration != null;
  const clipDurationSeconds = Math.max(0, trimEnd - trimStart);
  const billedDuration = hasKnownDuration
    ? clampReferenceDuration(clipDurationSeconds)
    : null;

  const estimateImageCount = Math.max(
    minImages,
    (firstImage ? 1 : 0) + (secondImage && maxImages > 1 ? 1 : 0)
  );

  const estimatedCredits = useMemo(() => {
    // Fixed templates: Kling price is duration-only. Prefer server template-meta
    // estimate so uploading photos does not clear the button label.
    if (
      isFixedTemplate &&
      typeof presetMeta?.estimatedCredits === 'number' &&
      presetMeta.estimatedCredits > 0
    ) {
      return presetMeta.estimatedCredits;
    }

    const durationForEstimate = isFixedTemplate
      ? sourceDuration != null
        ? clampReferenceDuration(sourceDuration)
        : null
      : billedDuration;
    if (!durationForEstimate) return null;

    try {
      return estimateHotelLobbyCredits({
        duration: durationForEstimate,
        imageCount: estimateImageCount,
        maxImages,
      });
    } catch {
      return null;
    }
  }, [
    billedDuration,
    sourceDuration,
    estimateImageCount,
    maxImages,
    isFixedTemplate,
    presetMeta?.estimatedCredits,
  ]);

  const inputsReady =
    Boolean(video) &&
    sourceDuration != null &&
    Boolean(firstImage) &&
    (minImages < 2 || Boolean(secondImage)) &&
    clipDurationSeconds >= MIN_REFERENCE_VIDEO_SECONDS &&
    clipDurationSeconds <= MAX_REFERENCE_VIDEO_SECONDS;
  const { fixedTemplateReady, showTemplateError } =
    deriveHotelLobbyTemplateGate({
      allowCustomVideo,
      r2Available: r2TemplateAvailable,
      mediaStatus: templateMediaStatus,
    });
  const canGenerate =
    presetEnabled &&
    inputsReady &&
    !busy &&
    !sessionPending &&
    fixedTemplateReady;

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      localUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
      localUrlsRef.current.clear();
    };
  }, []);

  // Soft elapsed progress while waiting on the provider (caps below 100%).
  useEffect(() => {
    if (!jobBusy) {
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
      // Asymptotic toward ~92% — Kling jobs often finish in 1–3 minutes.
      const next = Math.min(
        92,
        Math.round(8 + 84 * (1 - Math.exp(-elapsedSec / 50)))
      );
      setProgressPercent(next);
    };
    tick();
    const id = window.setInterval(tick, 400);
    return () => window.clearInterval(id);
  }, [jobBusy, resultUrl]);

  useEffect(() => {
    if (!jobBusy && !resultUrl) return;
    resultPanelRef.current?.scrollIntoView({
      behavior: 'smooth',
      block: 'nearest',
    });
  }, [jobBusy, resultUrl, generationId]);

  /**
   * Shared template-meta + optional video reload for initial preset load and Retry.
   * Uses a request guard so stale responses cannot overwrite newer Retry/preset work.
   */
  const loadTemplateMeta = useCallback(
    (mode: 'preset' | 'retry') => {
      const token = templateMetaRequestGuardRef.current.begin();
      const defaults = getHotelLobbyPresetClientDefaults(presetId);
      // Loading — do not inherit prior meta failure.
      setR2TemplateAvailable(null);

      if (mode === 'preset') {
        setPresetMeta(null);
        setVideo({ kind: 'template', url: defaults.previewUrl });
      } else {
        // Retry: bust video cache; keep uploaded photos / other inputs.
        setVideo({
          kind: 'template',
          url: withHotelLobbyTemplateRetryParam(templatePreviewUrlRef.current),
        });
      }

      void apiGet<{
        durationSeconds: number | null;
        estimatedCredits: number | null;
        templateAvailable: boolean;
        presetId: HotelLobbyPresetId;
        enabled: boolean;
        allowCustomVideo: boolean;
        allowTrim: boolean;
        aspectRatio: string;
        previewUrl: string;
        posterUrl: string;
        downloadPrefix: string;
        displayName: string;
        imageCount: { min: number; max: number };
      }>(templateMetaUrlFor(presetId))
        .then((data) => {
          if (!templateMetaRequestGuardRef.current.isCurrent(token)) return;
          const r2Ready = data.templateAvailable !== false;
          const nextMeta: PresetUiMeta = {
            presetId: isHotelLobbyPresetId(data.presetId)
              ? data.presetId
              : presetId,
            enabled: data.enabled !== false,
            templateAvailable: r2Ready,
            allowCustomVideo:
              typeof data.allowCustomVideo === 'boolean'
                ? data.allowCustomVideo
                : defaults.allowCustomVideo,
            allowTrim:
              typeof data.allowTrim === 'boolean'
                ? data.allowTrim
                : defaults.allowTrim,
            aspectRatio: data.aspectRatio || defaults.aspectRatio,
            previewUrl: data.previewUrl || defaults.previewUrl,
            posterUrl: data.posterUrl || defaults.posterUrl,
            downloadPrefix: data.downloadPrefix || defaults.downloadPrefix,
            displayName: data.displayName || defaults.displayName,
            imageCount: data.imageCount || defaults.imageCount,
            estimatedCredits: data.estimatedCredits,
          };
          setPresetMeta(nextMeta);
          // Never touch templateMediaStatus here — same URL must keep `ready`.
          setR2TemplateAvailable(r2Ready);
          setVideo((current) => {
            if (current?.kind !== 'template') return current;
            // Retry already set a cache-busted URL; keep it so media reloads.
            // Preset load (or meta URL change) adopts the canonical preview URL.
            const nextUrl =
              mode === 'retry' ? current.url : nextMeta.previewUrl;
            return {
              ...current,
              url: nextUrl,
              durationSeconds: !nextMeta.allowCustomVideo
                ? current.durationSeconds
                : typeof data.durationSeconds === 'number' &&
                    Number.isFinite(data.durationSeconds) &&
                    data.durationSeconds > 0
                  ? data.durationSeconds
                  : current.durationSeconds,
            };
          });
        })
        .catch(() => {
          if (!templateMetaRequestGuardRef.current.isCurrent(token)) return;
          // Fail closed for fixed templates — never fall back to custom-video UX.
          setPresetMeta({
            ...defaults,
            templateAvailable: false,
            estimatedCredits: null,
          });
          setR2TemplateAvailable(false);
          if (mode === 'preset' && !defaults.allowCustomVideo) {
            setVideo({ kind: 'template', url: defaults.previewUrl });
          }
        });
    },
    [presetId]
  );

  useEffect(() => {
    loadTemplateMeta('preset');
    return () => {
      templateMetaRequestGuardRef.current.invalidate();
    };
  }, [presetId, loadTemplateMeta]);

  // Reset media status only when template identity (preset + URL) changes.
  useEffect(() => {
    if (video?.kind !== 'template') {
      templateMediaIdentityRef.current = null;
      return;
    }
    const nextIdentity = hotelLobbyTemplateMediaIdentity(presetId, video.url);
    if (
      shouldResetHotelLobbyTemplateMedia({
        previousIdentity: templateMediaIdentityRef.current,
        nextIdentity,
      })
    ) {
      templateMediaIdentityRef.current = nextIdentity;
      setTemplateMediaStatus('loading');
    }
  }, [presetId, video]);

  useEffect(() => {
    if (video?.kind !== 'template') return;
    if (hasKnownDuration) return;
    // Fixed-template public previews get duration from the <video> element.
    if (isFixedTemplate) return;

    let cancelled = false;
    void apiGet<{ durationSeconds: number | null }>(
      templateMetaUrlFor(presetId)
    )
      .then((data) => {
        if (cancelled) return;
        const seconds = data.durationSeconds;
        if (
          typeof seconds !== 'number' ||
          !Number.isFinite(seconds) ||
          seconds <= 0
        )
          return;
        setVideo((current) =>
          current?.kind === 'template'
            ? { ...current, durationSeconds: seconds }
            : current
        );
      })
      .catch(() => {
        // Browser metadata / retry may still fill durationSeconds.
      });

    return () => {
      cancelled = true;
    };
  }, [video?.kind, video?.url, hasKnownDuration, presetId, isFixedTemplate]);

  useEffect(() => {
    if (sourceDuration == null) {
      setTrimStart(0);
      setTrimEnd(0);
      return;
    }
    setTrimStart(0);
    setTrimEnd(sourceDuration);
  }, [video?.url, sourceDuration]);

  const applyTrim = async () => {
    if (!video || sourceDuration == null || trimming) return;

    if (
      clipDurationSeconds < MIN_REFERENCE_VIDEO_SECONDS ||
      clipDurationSeconds > MAX_REFERENCE_VIDEO_SECONDS
    ) {
      toast.error(m['site.hotel.trim_error']());
      return;
    }

    if (isFullSourceClip(trimStart, trimEnd, sourceDuration)) {
      toast.message('Selection already covers the full reference video');
      return;
    }

    setTrimming(true);
    try {
      const sourceUrl =
        video.kind === 'template'
          ? hotelLobbyTemplateProxyUrl(presetId)
          : video.url;
      const trimmed = await trimVideoToFile({
        sourceUrl,
        startSeconds: trimStart,
        endSeconds: trimEnd,
      });

      if (trimmed.size <= 0 || trimmed.size > MAX_VIDEO_BYTES) {
        throw new Error('Trimmed clip must be 80 MB or smaller');
      }

      const url = URL.createObjectURL(trimmed);
      localUrlsRef.current.add(url);

      if (video.kind === 'upload') {
        URL.revokeObjectURL(video.url);
        localUrlsRef.current.delete(video.url);
      }

      setTemplateMediaStatus('ready');
      setVideo({
        kind: 'upload',
        file: trimmed,
        url,
        durationSeconds: clipDurationSeconds,
      });
      setResultUrl(null);
      setPhase('idle');
      toast.success(`Clipped to ${clipDurationSeconds.toFixed(1)}s`);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Could not trim this video'
      );
    } finally {
      setTrimming(false);
    }
  };

  const setImageAt = (slot: 'first' | 'second', file: File | null) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error(m['site.hotel.image_required']());
      return;
    }
    if (file.size <= 0 || file.size > MAX_IMAGE_BYTES) {
      toast.error(m['site.hotel.image_size']());
      return;
    }

    const next = createMediaItem(file);
    localUrlsRef.current.add(next.url);

    const setter = slot === 'first' ? setFirstImage : setSecondImage;
    const current = slot === 'first' ? firstImage : secondImage;
    if (current) {
      URL.revokeObjectURL(current.url);
      localUrlsRef.current.delete(current.url);
    }
    setter(next);
    setResultUrl(null);
    setPhase('idle');
  };

  const clearImageAt = (slot: 'first' | 'second') => {
    const setter = slot === 'first' ? setFirstImage : setSecondImage;
    const current = slot === 'first' ? firstImage : secondImage;
    if (current) {
      URL.revokeObjectURL(current.url);
      localUrlsRef.current.delete(current.url);
    }
    setter(null);
  };

  const replaceVideo = async (file: File | null) => {
    if (!file) return;
    if (!['video/mp4', 'video/quicktime'].includes(file.type)) {
      toast.error(m['site.hotel.video_type']());
      return;
    }
    if (file.size <= 0 || file.size > MAX_VIDEO_BYTES) {
      toast.error(m['site.hotel.video_size']());
      return;
    }

    try {
      const meta = await readVideoMetadata(file);
      const durationSeconds = meta.duration;
      if (
        durationSeconds < MIN_REFERENCE_VIDEO_SECONDS ||
        durationSeconds > MAX_REFERENCE_VIDEO_SECONDS
      ) {
        toast.error(m['site.hotel.video_duration']());
        return;
      }
      try {
        assertClientVideoDimensions(meta.width, meta.height);
      } catch (error) {
        toast.error(
          error instanceof Error
            ? error.message
            : 'Unsupported video resolution'
        );
        return;
      }

      const url = URL.createObjectURL(file);
      localUrlsRef.current.add(url);
      if (video?.kind === 'upload') {
        URL.revokeObjectURL(video.url);
        localUrlsRef.current.delete(video.url);
      }

      setVideo({
        kind: 'upload',
        file,
        url,
        durationSeconds,
      });
      setResultUrl(null);
      setPhase('idle');
    } catch {
      toast.error(m['site.hotel.video_unreadable']());
    }
  };

  const clearVideo = () => {
    if (!allowCustomVideo) return;
    if (video?.kind === 'upload') {
      URL.revokeObjectURL(video.url);
      localUrlsRef.current.delete(video.url);
    }
    setVideo(null);
    if (videoInputRef.current) videoInputRef.current.value = '';
  };

  const restoreTemplate = () => {
    if (video?.kind === 'upload') {
      URL.revokeObjectURL(video.url);
      localUrlsRef.current.delete(video.url);
    }
    // Re-check R2 meta + reload video. Do not clear uploaded photos.
    setResultUrl(null);
    setPhase('idle');
    loadTemplateMeta('retry');
  };

  const pollUntilComplete = async (id: string) => {
    let consecutivePollErrors = 0;

    for (let attempt = 0; attempt < 240; attempt += 1) {
      await new Promise((resolve) => setTimeout(resolve, 2_000));
      if (!mountedRef.current) return;

      let poll: GenerationPoll;
      try {
        poll = await apiGet<GenerationPoll>(
          `/api/hotel-lobby/status?generationId=${encodeURIComponent(id)}`
        );
        consecutivePollErrors = 0;
      } catch (error) {
        consecutivePollErrors += 1;
        if (consecutivePollErrors < 5) continue;
        throw error;
      }

      setProviderStatus(poll.providerStatus || '');
      if (poll.providerStatus === 'persisting') setPhase('saving');

      if (poll.status === 'completed' && poll.videoUrl) {
        setResultUrl(poll.videoUrl);
        setPhase('done');
        await creditsQuery.refetch();
        return;
      }

      if (poll.status === 'failed') {
        setPhase('idle');
        await creditsQuery.refetch();
        throw new Error(poll.error || 'Generation failed');
      }
    }

    setPhase('idle');
    throw new Error(m['site.hotel.running']());
  };

  const generate = async () => {
    creditGate.clear();

    if (!session?.user) {
      redirectToSignIn();
      return;
    }
    if (!presetEnabled) {
      toast.error(m['site.crazy.unavailable']());
      return;
    }
    if (!fixedTemplateReady) {
      toast.error(m['site.crazy.unavailable']());
      return;
    }
    if (!video || sourceDuration == null) {
      toast.error(
        usesDualSubjectCopy
          ? m['site.crazy.need_template']()
          : isFixedTemplate
            ? m['site.kling.need_template']()
            : m['site.hotel.need_video']()
      );
      return;
    }
    if (!firstImage) {
      toast.error(
        usesDualSubjectCopy
          ? m['site.crazy.need_first']()
          : isFixedTemplate
            ? m['site.kling.need_photo']()
            : m['site.hotel.need_first']()
      );
      return;
    }
    if (minImages >= 2 && !secondImage) {
      toast.error(
        usesDualSubjectCopy
          ? m['site.crazy.need_second']()
          : m['site.hotel.need_first']()
      );
      return;
    }
    if (
      clipDurationSeconds < MIN_REFERENCE_VIDEO_SECONDS ||
      clipDurationSeconds > MAX_REFERENCE_VIDEO_SECONDS
    ) {
      toast.error(m['site.hotel.trim_error']());
      return;
    }

    const requiredCredits = estimatedCredits;
    if (!requiredCredits) {
      toast.error(m['site.hotel.reading_duration']());
      return;
    }

    const balance = creditsQuery.data?.balance ?? 0;
    if (!creditsQuery.isPending && balance < requiredCredits) {
      creditGate.open({ requiredCredits, balance });
      return;
    }

    setResultUrl(null);
    setProviderStatus('');
    setPhase('uploading');

    const id = crypto.randomUUID();
    setGenerationId(id);

    const useFullTemplate =
      !allowCustomVideo ||
      (video.kind === 'template' &&
        isFullSourceClip(trimStart, trimEnd, sourceDuration));

    try {
      let referenceVideoFile: File | null = null;
      let uploadDurationSeconds = billedDuration;

      if (!useFullTemplate) {
        const sourceUrl =
          video.kind === 'template'
            ? hotelLobbyTemplateProxyUrl(presetId)
            : video.url;

        if (
          video.kind === 'upload' &&
          isFullSourceClip(trimStart, trimEnd, sourceDuration)
        ) {
          referenceVideoFile = video.file;
        } else {
          referenceVideoFile = await trimVideoToFile({
            sourceUrl,
            startSeconds: trimStart,
            endSeconds: trimEnd,
          });
        }

        if (
          !referenceVideoFile ||
          referenceVideoFile.size <= 0 ||
          referenceVideoFile.size > MAX_VIDEO_BYTES
        ) {
          throw new Error('Could not prepare the reference clip');
        }
      }

      const useDefaultTemplate = useFullTemplate;
      const filesForUpload = useDefaultTemplate
        ? imageItems.slice(0, maxImages).map((item) => item.file)
        : [
            referenceVideoFile as File,
            ...imageItems.slice(0, maxImages).map((item) => item.file),
          ];
      const contentTypes = filesForUpload.map(
        (file) => file.type || 'application/octet-stream'
      );
      const contentLengths = filesForUpload.map((file) => file.size);

      const setup = await apiPost<UploadSetup>('/api/hotel-lobby/upload-url', {
        generationId: id,
        presetId,
        useDefaultTemplate,
        contentTypes,
        contentLengths,
      });

      if (setup.uploads.length !== filesForUpload.length) {
        throw new Error('Upload setup returned an incomplete file list');
      }

      for (let index = 0; index < filesForUpload.length; index += 1) {
        const upload = setup.uploads[index];
        await uploadToSignedUrl({
          url: upload.uploadUrl,
          file: filesForUpload[index],
          headers: upload.uploadHeaders,
        });
      }

      const sortedUploads = [...setup.uploads].sort(
        (a, b) => a.index - b.index
      );
      const videoUpload = sortedUploads.find((item) => item.index === 0);
      const imageUploads = sortedUploads.filter((item) => item.index > 0);

      setPhase('starting');
      const start = await apiPost<GenerationStart>(
        '/api/hotel-lobby/generate',
        {
          generationId: id,
          presetId,
          useDefaultTemplate,
          videoKey: videoUpload?.storageKey,
          imageKeys: imageUploads.map((item) => item.storageKey),
          contentTypes,
          contentLengths,
          durationSeconds: uploadDurationSeconds,
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

      setPhase('generating');
      await pollUntilComplete(id);
    } catch (error) {
      if (error instanceof ApiError) {
        const data =
          error.data && typeof error.data === 'object'
            ? (error.data as Record<string, unknown>)
            : null;
        if (data?.code === 'INSUFFICIENT_CREDITS') {
          creditGate.open({
            requiredCredits: Number(data.requiredCredits) || requiredCredits,
            balance: Number(data.balance) || 0,
          });
          setPhase('idle');
          return;
        }
      }

      setPhase('idle');
      toast.error(
        error instanceof Error ? error.message : 'Generation failed to start'
      );
    }
  };

  const phaseLabel = isFixedTemplate
    ? m['site.common.generating']()
    : phase === 'uploading'
      ? 'Preparing clip…'
      : phase === 'starting'
        ? 'Starting…'
        : phase === 'generating'
          ? providerStatus
            ? `Generating · ${providerStatus}`
            : m['site.common.generating']()
          : phase === 'saving'
            ? m['site.common.saving']()
            : m['site.generator.generate']();

  return (
    <div className="mx-auto w-full max-w-[1120px]">
      <div className="overflow-hidden rounded-[26px] border border-white/10 bg-[rgba(30,23,19,0.92)] shadow-[0_30px_90px_-30px_rgba(0,0,0,0.85)] backdrop-blur-2xl">
        <div
          className={cn(
            'grid gap-0',
            isFixedTemplate
              ? 'lg:grid-cols-2 lg:items-start'
              : 'lg:grid-cols-[0.95fr_1.05fr]'
          )}
        >
          <div
            className={cn(
              'flex flex-col border-b border-white/8 p-4 sm:p-5 lg:border-r lg:border-b-0',
              isFixedTemplate && 'lg:h-auto'
            )}
          >
            <div className="mb-3 flex shrink-0 items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-white/90">
                  {usesDualSubjectCopy
                    ? m['site.crazy.reference']()
                    : isFixedTemplate
                      ? m['site.kling.fixed_reference']()
                      : m['site.hotel.reference']()}
                </p>
                <p className="mt-0.5 text-xs leading-5 text-white/40">
                  {usesDualSubjectCopy
                    ? m['site.crazy.reference_note']()
                    : isFixedTemplate
                      ? m['site.kling.fixed_reference_note']()
                      : m['site.hotel.reference_note']()}
                </p>
              </div>
              {video?.kind === 'template' ? (
                <span className="shrink-0 rounded-full border border-[rgba(204,144,92,0.18)] bg-[rgba(204,144,92,0.08)] px-2.5 py-1 text-[10px] font-semibold text-[rgb(220,155,99)]">
                  {m['site.hotel.preset']()}
                </span>
              ) : null}
            </div>

            {allowCustomVideo ? (
              <input
                ref={videoInputRef}
                type="file"
                accept="video/mp4,video/quicktime"
                className="hidden"
                onChange={(event: ChangeEvent<HTMLInputElement>) => {
                  void replaceVideo(event.target.files?.[0] || null);
                  event.target.value = '';
                }}
              />
            ) : null}

            {video ? (
              <div
                className={cn(
                  'flex min-h-0 flex-col',
                  !isFixedTemplate && 'flex-1 justify-center'
                )}
              >
                <div
                  className={cn(
                    'relative overflow-hidden rounded-2xl border border-[rgba(204,144,92,0.24)] bg-black',
                    previewAspectClass,
                    isFixedTemplate ? fixedMediaFrameClass : 'w-full'
                  )}
                >
                  <video
                    ref={previewVideoRef}
                    key={video.url}
                    src={video.url}
                    poster={isFixedTemplate ? posterUrl : undefined}
                    controls
                    muted
                    playsInline
                    preload="metadata"
                    className="size-full object-contain"
                    onLoadedMetadata={(event) => {
                      const seconds = event.currentTarget.duration;
                      if (!Number.isFinite(seconds) || seconds <= 0) return;
                      if (video.kind === 'template') {
                        setTemplateMediaStatus('ready');
                        setVideo((current) =>
                          current?.kind === 'template'
                            ? { ...current, durationSeconds: seconds }
                            : current
                        );
                      }
                    }}
                    onError={() => {
                      if (video.kind !== 'template') return;
                      setTemplateMediaStatus('error');
                      // Custom-video presets can drop a broken template slot;
                      // fixed templates keep the frame and show retry overlay.
                      if (allowCustomVideo) setVideo(null);
                    }}
                  />
                  {video.kind === 'template' && showTemplateError ? (
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/75 px-4 text-center">
                      <p className="text-sm text-white/75">
                        {m['site.common.template_unavailable']()}
                      </p>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={restoreTemplate}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-medium text-white/90 transition hover:bg-white/16 disabled:opacity-50"
                      >
                        <RotateCcw className="size-3.5" />
                        {m['site.common.template_retry']()}
                      </button>
                    </div>
                  ) : null}
                  {allowCustomVideo ? (
                    <button
                      type="button"
                      onClick={clearVideo}
                      disabled={busy}
                      aria-label={m['site.generator.video_remove']()}
                      className="absolute top-2 right-2 flex size-8 items-center justify-center rounded-full bg-black/70 text-white/80 backdrop-blur transition hover:bg-black/90 disabled:opacity-40"
                    >
                      <CloseIcon className="size-4" />
                    </button>
                  ) : null}
                </div>
                {allowTrim && sourceDuration != null ? (
                  <HotelLobbyTrimBar
                    durationSeconds={sourceDuration}
                    startSeconds={trimStart}
                    endSeconds={trimEnd}
                    minClipSeconds={MIN_REFERENCE_VIDEO_SECONDS}
                    maxClipSeconds={MAX_REFERENCE_VIDEO_SECONDS}
                    disabled={busy && !trimming}
                    applying={trimming}
                    canApply={
                      !isFullSourceClip(trimStart, trimEnd, sourceDuration) &&
                      clipDurationSeconds >= MIN_REFERENCE_VIDEO_SECONDS &&
                      clipDurationSeconds <= MAX_REFERENCE_VIDEO_SECONDS
                    }
                    onChange={({ startSeconds, endSeconds }) => {
                      setTrimStart(startSeconds);
                      setTrimEnd(endSeconds);
                      const preview = previewVideoRef.current;
                      if (preview) {
                        try {
                          preview.currentTime = startSeconds;
                        } catch {
                          // Ignore seek errors while metadata is still loading.
                        }
                      }
                    }}
                    onApply={() => {
                      void applyTrim();
                    }}
                  />
                ) : null}
              </div>
            ) : allowCustomVideo ? (
              <div className="space-y-2">
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => videoInputRef.current?.click()}
                  className="flex aspect-video w-full flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-[rgba(204,144,92,0.35)] bg-[rgba(204,144,92,0.04)] text-center transition hover:border-[rgba(204,144,92,0.62)] hover:bg-[rgba(204,144,92,0.07)] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <span className="flex size-12 items-center justify-center rounded-full bg-[rgba(204,144,92,0.12)] text-[rgb(220,155,99)]">
                    <FilmIcon className="size-6" />
                  </span>
                  <span>
                    <span className="block text-sm font-medium text-white/82">
                      {m['site.hotel.upload_video']()}
                    </span>
                    <span className="mt-1 block text-xs text-white/38">
                      MP4 or MOV · 3–15s · 720–3840px · up to 80 MB
                    </span>
                  </span>
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={restoreTemplate}
                  className="inline-flex items-center gap-1.5 text-xs font-medium text-[rgb(220,155,99)] transition hover:text-[rgb(235,174,119)] disabled:opacity-50"
                >
                  <RotateCcw className="size-3.5" />
                  {fixedTemplateReady || allowCustomVideo
                    ? m['site.hotel.restore']()
                    : m['site.hotel.retry']()}
                </button>
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-white/14 bg-white/[0.025] px-4 py-10 text-center text-sm text-white/45">
                {m['site.crazy.template_missing']()}
                <button
                  type="button"
                  disabled={busy}
                  onClick={restoreTemplate}
                  className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-[rgb(220,155,99)] transition hover:text-[rgb(235,174,119)] disabled:opacity-50"
                >
                  <RotateCcw className="size-3.5" />
                  {m['site.hotel.retry']()}
                </button>
              </div>
            )}
          </div>

          <div className="p-4 sm:p-5">
            <div
              className={cn(
                'grid gap-3',
                maxImages > 1
                  ? 'grid-cols-2'
                  : isFixedTemplate
                    ? 'grid-cols-1'
                    : 'max-w-sm grid-cols-1'
              )}
            >
              <PersonSlot
                title={
                  usesDualSubjectCopy
                    ? m['site.crazy.first']()
                    : isFixedTemplate
                      ? m['site.kling.fixed_photo']()
                      : m['site.hotel.first']()
                }
                note={
                  usesDualSubjectCopy
                    ? m['site.crazy.first_note']()
                    : isFixedTemplate
                      ? m['site.kling.fixed_photo_note']()
                      : m['site.hotel.first_note']()
                }
                item={firstImage}
                inputRef={firstImageInputRef}
                disabled={busy}
                onPick={(file) => setImageAt('first', file)}
                onRemove={() => clearImageAt('first')}
                aspectClass={
                  isFixedTemplate ? previewAspectClass : 'aspect-[4/5]'
                }
                frameClassName={
                  isFixedTemplate && maxImages === 1
                    ? fixedMediaFrameClass
                    : undefined
                }
              />
              {maxImages > 1 ? (
                <PersonSlot
                  title={
                    usesDualSubjectCopy
                      ? m['site.crazy.second']()
                      : m['site.hotel.second']()
                  }
                  note={
                    usesDualSubjectCopy
                      ? m['site.crazy.second_note']()
                      : m['site.hotel.second_note']()
                  }
                  item={secondImage}
                  inputRef={secondImageInputRef}
                  disabled={busy}
                  onPick={(file) => setImageAt('second', file)}
                  onRemove={() => clearImageAt('second')}
                  aspectClass={
                    isFixedTemplate ? previewAspectClass : 'aspect-[4/5]'
                  }
                />
              ) : null}
            </div>
          </div>
        </div>

        <div className="border-t border-white/8 p-4 sm:p-5">
          {!presetEnabled || showTemplateError ? (
            <p className="mb-3 text-center text-xs text-white/40 sm:text-left">
              {m['site.crazy.unavailable']()}
            </p>
          ) : null}
          <div className="ml-auto flex w-full flex-wrap items-end justify-end gap-x-3 gap-y-2 sm:w-auto">
            <div className="flex items-center gap-2">
              <div className="flex shrink-0 flex-col items-end gap-0.5 text-[11px] text-white/50 tabular-nums">
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
                        {m['site.hotel.estimate_tooltip']()}
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </span>
              </div>
              <button
                type="button"
                disabled={!canGenerate || Boolean(session?.user && busy)}
                onClick={() => {
                  if (!session?.user) {
                    redirectToSignIn();
                    return;
                  }
                  void generate();
                }}
                className={cn(
                  'relative inline-flex h-8 items-center justify-center gap-1.5 rounded-lg px-3.5 text-sm font-semibold tracking-wide shadow-none transition-all duration-200 active:scale-95',
                  canGenerate && !busy
                    ? 'cursor-pointer bg-[rgb(204,144,92)] text-[rgb(247,246,243)] hover:brightness-105'
                    : 'cursor-not-allowed bg-[rgba(126,128,132,0.28)] text-[rgb(237,234,222)]/38'
                )}
              >
                {busy ? (
                  <>
                    <LoaderCircle className="size-3.5 animate-spin" />
                    <span>{phaseLabel}</span>
                  </>
                ) : (
                  m['site.generator.generate']()
                )}
              </button>
            </div>
          </div>
          {!session?.user && !sessionPending ? (
            <p className="mt-3 text-right text-xs text-white/40">
              {m['site.common.signin_generate']()}
            </p>
          ) : null}
        </div>
      </div>

      {jobBusy || resultUrl ? (
        <div
          ref={resultPanelRef}
          id="generation-result"
          className="mt-5 scroll-mt-24 overflow-hidden rounded-[24px] border border-white/10 bg-[rgba(25,20,17,0.94)] shadow-2xl"
        >
          <div className="flex items-center justify-between gap-3 border-b border-white/8 px-4 py-3 sm:px-5">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-white/90">
                {resultUrl && !jobBusy
                  ? m['site.common.your_video']()
                  : m['site.generator.generating']()}
              </p>
              <p className="mt-0.5 truncate text-xs text-white/40">
                {resultUrl && !jobBusy
                  ? displayName
                  : phase === 'uploading' || phase === 'starting'
                    ? m['site.generator.starting']()
                    : providerStatus
                      ? `${displayName} · ${providerStatus}`
                      : m['site.generator.progress']({
                          resolution: displayName,
                        })}
              </p>
            </div>
            {resultUrl && !jobBusy ? (
              <div className="flex shrink-0 flex-wrap items-center gap-2">
                <a
                  href={
                    generationId
                      ? `/api/hotel-lobby/result/${encodeURIComponent(generationId)}?download=1`
                      : resultUrl
                  }
                  download={
                    generationId
                      ? `${downloadPrefix}-${generationId.slice(0, 8)}.mp4`
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

          {jobBusy ? (
            <div className="space-y-4 px-4 py-8 sm:px-5 sm:py-10">
              <div className="mx-auto flex max-w-md flex-col items-center gap-3">
                <span className="size-9 animate-spin rounded-full border-2 border-[rgb(204,144,92)] border-t-transparent" />
                <p className="text-center text-sm text-white/55">
                  {phase === 'uploading' || phase === 'starting'
                    ? m['site.generator.starting']()
                    : m['site.generator.progress']({
                        resolution: displayName,
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
                className={`mx-auto max-h-[720px] w-full max-w-full rounded-2xl bg-black object-contain ${previewAspectClass}`}
              />
              {generationId ? (
                <p className="mt-2 px-1 text-[10px] text-white/25">
                  {m['site.common.generation_id']({
                    id: generationId.slice(0, 8),
                  })}
                </p>
              ) : null}
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
