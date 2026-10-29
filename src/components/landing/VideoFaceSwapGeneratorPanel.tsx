import {
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
  VIDEO_FACE_SWAP_CONSENT_VERSION,
  VIDEO_FACE_SWAP_DEFAULT_RESOLUTION,
  VIDEO_FACE_SWAP_MAX_DURATION_SECONDS,
  VIDEO_FACE_SWAP_MAX_IMAGE_BYTES,
  VIDEO_FACE_SWAP_MAX_VIDEO_BYTES,
  VIDEO_FACE_SWAP_MIN_DURATION_SECONDS,
  VIDEO_FACE_SWAP_RESOLUTIONS,
  type VideoFaceSwapResolution,
} from '@/modules/video-face-swap/constants';
import { estimateVideoFaceSwapCredits } from '@/modules/video-face-swap/pricing';
import { ApiError, apiGet, apiPost, uploadToSignedUrl } from '@/lib/api-client';
import { cn } from '@/lib/cn';
import { m } from '@/paraglide/messages.js';
import { useCreditGate } from '@/hooks/use-credit-gate';
import { useUserCredits } from '@/hooks/use-user-credits';
import { InsufficientCreditsModal } from '@/components/credits/insufficient-credits-modal';
import {
  ChevronDownIcon,
  CloseIcon,
  FilmIcon,
  ImageModeIcon,
} from '@/components/icons';
import { Checkbox } from '@/components/ui/checkbox';
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
  durationSeconds?: number;
};

type SignedUpload = {
  role: 'video' | 'image';
  uploadUrl: string;
  uploadHeaders: Record<string, string>;
  storageKey: string;
  uploadMode?: string;
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

type PersistedGeneration = {
  userId: string;
  generationId: string;
  reservedCredits: number;
  generatePending?: boolean;
};

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

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function activeKey(userId: string) {
  return `video-face-swap:active:${userId}`;
}

function writeActive(active: PersistedGeneration) {
  try {
    localStorage.setItem(activeKey(active.userId), JSON.stringify(active));
  } catch {
    // ignore
  }
}

function clearActive(userId: string) {
  try {
    localStorage.removeItem(activeKey(userId));
  } catch {
    // ignore
  }
}

function readActive(userId: string): PersistedGeneration | null {
  try {
    const raw = localStorage.getItem(activeKey(userId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PersistedGeneration;
    if (
      !parsed ||
      parsed.userId !== userId ||
      typeof parsed.generationId !== 'string'
    ) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function newId() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID().replace(/-/g, '').slice(0, 16);
  }
  return `vfs${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

function isAllowedVideoFaceSwapVideo(file: File) {
  const type = (file.type || '').toLowerCase();
  if (
    type === 'video/mp4' ||
    type === 'video/quicktime' ||
    type === 'video/webm' ||
    type.includes('mp4')
  ) {
    return true;
  }
  return /\.(mp4|mov|webm)$/i.test(file.name);
}

function videoFaceSwapUploadContentType(file: File) {
  const type = (file.type || '').toLowerCase();
  if (
    type === 'video/mp4' ||
    type === 'video/quicktime' ||
    type === 'video/webm'
  ) {
    return type;
  }
  if (/\.mov$/i.test(file.name)) return 'video/quicktime';
  if (/\.webm$/i.test(file.name)) return 'video/webm';
  return 'video/mp4';
}

async function readVideoDurationSeconds(file: File): Promise<number> {
  const url = URL.createObjectURL(file);
  return await new Promise<number>((resolve, reject) => {
    const video = document.createElement('video');
    video.preload = 'metadata';
    const cleanup = () => {
      video.removeAttribute('src');
      video.load();
      URL.revokeObjectURL(url);
    };
    video.onloadedmetadata = () => {
      const value = video.duration;
      cleanup();
      if (!Number.isFinite(value) || value <= 0) {
        reject(new Error('Could not read video duration'));
        return;
      }
      resolve(value);
    };
    video.onerror = () => {
      cleanup();
      reject(new Error('Could not read video metadata'));
    };
    video.src = url;
  });
}

/** Fixed frame so empty state isn’t tiny and filled media can’t stretch the panel. */
const SLOT_FRAME = 'h-[260px] w-full sm:h-[300px] lg:h-[320px]';

function VideoSlot(props: {
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
    <div className="w-full">
      <input
        ref={props.inputRef}
        type="file"
        accept="video/mp4,video/quicktime,video/webm,.mp4,.mov,.webm"
        className="hidden"
        onChange={onChange}
      />
      {props.item ? (
        <div
          className={cn(
            'relative overflow-hidden rounded-2xl border border-white/10 bg-black',
            SLOT_FRAME
          )}
        >
          <video
            src={props.item.url}
            controls
            playsInline
            muted
            className="absolute inset-0 size-full object-contain"
          />
          <button
            type="button"
            onClick={props.onRemove}
            disabled={props.disabled}
            aria-label="Remove source video"
            className="absolute top-2 right-2 z-10 flex size-8 items-center justify-center rounded-full bg-black/70 text-white/80 backdrop-blur transition hover:bg-black/90 disabled:opacity-40"
          >
            <CloseIcon className="size-4" />
          </button>
          {props.item.durationSeconds != null ? (
            <span className="absolute bottom-2 left-2 z-10 rounded-md bg-black/65 px-2 py-0.5 text-[11px] text-white/75 backdrop-blur">
              ~{props.item.durationSeconds.toFixed(1)}s
            </span>
          ) : null}
        </div>
      ) : (
        <button
          type="button"
          disabled={props.disabled}
          onClick={() => props.inputRef.current?.click()}
          className={cn(
            'flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-white/18 bg-white/[0.03] text-center transition hover:border-white/35 hover:bg-white/[0.05] disabled:cursor-not-allowed disabled:opacity-50',
            SLOT_FRAME
          )}
        >
          <span className="flex size-11 items-center justify-center rounded-full bg-white/8 text-white/70">
            <FilmIcon className="size-5" />
          </span>
          <span>
            <span className="block text-sm font-medium text-white/78">
              Source video
            </span>
            <span className="mt-1 block text-xs text-white/38">
              MP4 / MOV / WebM · 3–120s · ≤100 MB
            </span>
          </span>
        </button>
      )}
    </div>
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
    <div className="w-full">
      <input
        ref={props.inputRef}
        type="file"
        accept="image/jpeg,image/png"
        className="hidden"
        onChange={onChange}
      />
      {props.item ? (
        <div
          className={cn(
            'relative overflow-hidden rounded-2xl border border-white/10 bg-black',
            SLOT_FRAME
          )}
        >
          <img
            src={props.item.url}
            alt="Head reference"
            className="absolute inset-0 size-full object-contain"
          />
          <button
            type="button"
            onClick={props.onRemove}
            disabled={props.disabled}
            aria-label="Remove head photo"
            className="absolute top-2 right-2 z-10 flex size-8 items-center justify-center rounded-full bg-black/70 text-white/80 backdrop-blur transition hover:bg-black/90 disabled:opacity-40"
          >
            <CloseIcon className="size-4" />
          </button>
        </div>
      ) : (
        <button
          type="button"
          disabled={props.disabled}
          onClick={() => props.inputRef.current?.click()}
          className={cn(
            'flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-white/18 bg-white/[0.03] text-center transition hover:border-white/35 hover:bg-white/[0.05] disabled:cursor-not-allowed disabled:opacity-50',
            SLOT_FRAME
          )}
        >
          <span className="flex size-11 items-center justify-center rounded-full bg-white/8 text-white/70">
            <ImageModeIcon className="size-5" />
          </span>
          <span>
            <span className="block text-sm font-medium text-white/78">
              Head photo
            </span>
            <span className="mt-1 block text-xs text-white/38">
              One JPG/PNG · ≤12 MB
            </span>
          </span>
        </button>
      )}
    </div>
  );
}

export function VideoFaceSwapGeneratorPanel() {
  const { data: session, isPending: sessionPending } = useSession();
  const userId = session?.user?.id;
  const creditsQuery = useUserCredits(Boolean(session?.user));
  const creditGate = useCreditGate({
    balance: creditsQuery.data?.balance,
  });

  const [sourceVideo, setSourceVideo] = useState<MediaItem | null>(null);
  const [headPhoto, setHeadPhoto] = useState<MediaItem | null>(null);
  const [resolution, setResolution] = useState<VideoFaceSwapResolution>(
    VIDEO_FACE_SWAP_DEFAULT_RESOLUTION
  );
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [consent, setConsent] = useState(false);
  const [consentAttention, setConsentAttention] = useState(false);
  const [busy, setBusy] = useState(false);
  const [phase, setPhase] = useState<
    'idle' | 'uploading' | 'starting' | 'generating'
  >('idle');
  const [jobError, setJobError] = useState('');
  const [statusText, setStatusText] = useState<string | null>(null);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [activeGenerationId, setActiveGenerationId] = useState<string | null>(
    null
  );
  const [submissionUnknown, setSubmissionUnknown] = useState(false);
  const [progressPercent, setProgressPercent] = useState(0);

  const videoInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const settingsRef = useRef<HTMLDivElement>(null);
  const consentRef = useRef<HTMLLabelElement>(null);
  const resultPanelRef = useRef<HTMLDivElement>(null);
  const pollAbortRef = useRef(0);

  const estimatedCredits = useMemo(() => {
    const duration = sourceVideo?.durationSeconds;
    if (
      duration == null ||
      duration < VIDEO_FACE_SWAP_MIN_DURATION_SECONDS ||
      duration > VIDEO_FACE_SWAP_MAX_DURATION_SECONDS
    ) {
      return null;
    }
    try {
      return estimateVideoFaceSwapCredits({
        durationSeconds: duration,
        resolution,
      });
    } catch {
      return null;
    }
  }, [sourceVideo?.durationSeconds, resolution]);

  const mediaReady = Boolean(sourceVideo?.file && headPhoto?.file);
  const canGenerate =
    mediaReady &&
    estimatedCredits != null &&
    !busy &&
    !submissionUnknown &&
    !sessionPending;
  const consentPending = mediaReady && !consent;

  useEffect(() => {
    return () => {
      if (sourceVideo?.url) URL.revokeObjectURL(sourceVideo.url);
      if (headPhoto?.url) URL.revokeObjectURL(headPhoto.url);
    };
  }, [sourceVideo?.url, headPhoto?.url]);

  useEffect(() => {
    if (!settingsOpen) return;
    const onPointerDown = (event: MouseEvent) => {
      if (!settingsRef.current?.contains(event.target as Node)) {
        setSettingsOpen(false);
      }
    };
    document.addEventListener('mousedown', onPointerDown);
    return () => document.removeEventListener('mousedown', onPointerDown);
  }, [settingsOpen]);

  useEffect(() => {
    if (!userId) return;
    const active = readActive(userId);
    if (!active) return;
    setActiveGenerationId(active.generationId);
    void resumePoll(active.generationId, active.reservedCredits, resolution);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  useEffect(() => {
    if (!busy) {
      setProgressPercent(0);
      return;
    }
    setProgressPercent(8);
    const timer = window.setInterval(() => {
      setProgressPercent((value) => {
        if (value >= 92) return value;
        return value + Math.max(1, Math.round((94 - value) * 0.08));
      });
    }, 1200);
    return () => window.clearInterval(timer);
  }, [busy]);

  async function resumePoll(
    generationId: string,
    reservedCredits: number,
    resolutionLabel: VideoFaceSwapResolution = resolution
  ) {
    const token = ++pollAbortRef.current;
    setBusy(true);
    setPhase('generating');
    setJobError('');
    setSubmissionUnknown(false);
    setStatusText(m['site.generator.generating']());
    try {
      for (let i = 0; i < 180; i += 1) {
        if (token !== pollAbortRef.current) return;
        const poll = await apiGet<GenerationPoll>(
          `/api/video-face-swap/status?generationId=${encodeURIComponent(generationId)}`
        );
        if (poll.providerStatus === 'submission_unknown') {
          setSubmissionUnknown(true);
          setJobError(
            poll.error ||
              'Submission result is uncertain. Credits remain reserved — do not retry. Contact support.'
          );
          if (userId) clearActive(userId);
          return;
        }
        if (poll.status === 'completed' && poll.videoUrl) {
          setResultUrl(poll.videoUrl);
          setProgressPercent(100);
          setStatusText(null);
          if (userId) clearActive(userId);
          requestAnimationFrame(() => {
            resultPanelRef.current?.scrollIntoView({
              behavior: 'smooth',
              block: 'start',
            });
          });
          return;
        }
        if (poll.status === 'failed') {
          setJobError(
            poll.error ||
              (poll.refundedCredits
                ? `Generation failed. ${poll.refundedCredits} credits were refunded.`
                : 'Generation failed.')
          );
          if (userId) clearActive(userId);
          return;
        }
        setStatusText(
          m['site.generator.progress']({
            resolution: resolutionLabel,
          })
        );
        await sleep(2500);
      }
      setJobError('Still processing. Refresh later — your job is saved.');
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : 'Failed to poll status';
      setJobError(message);
    } finally {
      if (token === pollAbortRef.current) {
        setBusy(false);
        setPhase('idle');
      }
    }
  }

  async function onPickVideo(file: File) {
    if (!isAllowedVideoFaceSwapVideo(file)) {
      toast.error('Please upload an MP4, MOV, or WebM video');
      return;
    }
    if (file.size > VIDEO_FACE_SWAP_MAX_VIDEO_BYTES) {
      toast.error(m['site.generator.video_size_error']());
      return;
    }
    try {
      const durationSeconds = await readVideoDurationSeconds(file);
      if (
        durationSeconds < VIDEO_FACE_SWAP_MIN_DURATION_SECONDS ||
        durationSeconds > VIDEO_FACE_SWAP_MAX_DURATION_SECONDS
      ) {
        toast.error(
          m['site.generator.video_duration_error']({
            min: String(VIDEO_FACE_SWAP_MIN_DURATION_SECONDS),
            max: String(VIDEO_FACE_SWAP_MAX_DURATION_SECONDS),
            actual: durationSeconds.toFixed(1),
          })
        );
        return;
      }
      if (sourceVideo?.url) URL.revokeObjectURL(sourceVideo.url);
      setSourceVideo({
        id: newId(),
        file,
        url: URL.createObjectURL(file),
        durationSeconds,
      });
      setResultUrl(null);
      setJobError('');
      setSubmissionUnknown(false);
    } catch {
      toast.error('Could not read that video. Try another MP4, MOV, or WebM.');
    }
  }

  async function onPickImage(file: File) {
    if (!/^image\/(jpeg|jpg|png)$/i.test(file.type)) {
      toast.error('Please upload a JPG or PNG portrait');
      return;
    }
    if (file.size > VIDEO_FACE_SWAP_MAX_IMAGE_BYTES) {
      toast.error(
        m['site.generator.image_size_error']({ name: file.name || 'Portrait' })
      );
      return;
    }
    if (headPhoto?.url) URL.revokeObjectURL(headPhoto.url);
    setHeadPhoto({
      id: newId(),
      file,
      url: URL.createObjectURL(file),
    });
    setResultUrl(null);
    setJobError('');
    setSubmissionUnknown(false);
  }

  async function onGenerate() {
    if (sessionPending) return;
    if (!userId) {
      toast.error(m['site.common.signin_generate']());
      window.location.href = '/sign-in';
      return;
    }
    if (!sourceVideo || !headPhoto) {
      toast.error('Upload a source video and one head photo');
      return;
    }
    if (!consent) {
      setConsentAttention(true);
      consentRef.current?.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
      });
      toast.error(
        'Check the box to confirm you have rights to edit this media'
      );
      return;
    }

    const requiredCredits = estimatedCredits;
    if (requiredCredits == null) {
      toast.error('Could not estimate credits for this video');
      return;
    }
    const balance = creditsQuery.data?.balance;
    if (typeof balance === 'number' && balance < requiredCredits) {
      creditGate.open({ requiredCredits, balance });
      return;
    }

    const generationId = newId();
    setBusy(true);
    setPhase('uploading');
    setResultUrl(null);
    creditGate.clear();
    setJobError('');
    setSubmissionUnknown(false);
    setActiveGenerationId(generationId);
    setSettingsOpen(false);

    writeActive({
      userId,
      generationId,
      reservedCredits: requiredCredits,
      generatePending: true,
    });

    try {
      const videoFile = sourceVideo.file;

      const setup = await apiPost<{ uploads: SignedUpload[] }>(
        '/api/video-face-swap/upload-url',
        {
          generationId,
          videoContentType: videoFaceSwapUploadContentType(videoFile),
          videoContentLength: videoFile.size,
          imageContentType: headPhoto.file.type || 'image/jpeg',
          imageContentLength: headPhoto.file.size,
          consentVersion: VIDEO_FACE_SWAP_CONSENT_VERSION,
        }
      );

      const videoUpload = setup.uploads.find((u) => u.role === 'video');
      const imageUpload = setup.uploads.find((u) => u.role === 'image');
      if (!videoUpload || !imageUpload) {
        throw new Error('Upload URLs were incomplete');
      }

      await uploadToSignedUrl({
        url: videoUpload.uploadUrl,
        headers: videoUpload.uploadHeaders,
        file: videoFile,
      });
      await uploadToSignedUrl({
        url: imageUpload.uploadUrl,
        headers: imageUpload.uploadHeaders,
        file: headPhoto.file,
      });

      setPhase('starting');
      const started = await apiPost<GenerationStart>(
        '/api/video-face-swap/generate',
        {
          generationId,
          videoKey: videoUpload.storageKey,
          imageKey: imageUpload.storageKey,
          videoContentType: videoFaceSwapUploadContentType(videoFile),
          videoContentLength: videoFile.size,
          imageContentType: headPhoto.file.type || 'image/jpeg',
          imageContentLength: headPhoto.file.size,
          resolution,
          consentVersion: VIDEO_FACE_SWAP_CONSENT_VERSION,
        }
      );

      writeActive({
        userId,
        generationId,
        reservedCredits: started.reservedCredits || requiredCredits,
      });

      if (started.status === 'submission_unknown') {
        setSubmissionUnknown(true);
        setJobError(
          'Submission result is uncertain. Credits remain reserved — do not retry. Contact support.'
        );
        clearActive(userId);
        return;
      }

      await resumePoll(
        generationId,
        started.reservedCredits || requiredCredits,
        resolution
      );
      void creditsQuery.refetch();
    } catch (error: unknown) {
      if (error instanceof ApiError) {
        const apiData =
          error.data && typeof error.data === 'object'
            ? (error.data as Record<string, unknown>)
            : null;
        const code = typeof apiData?.code === 'string' ? apiData.code : '';
        if (code === 'INSUFFICIENT_CREDITS') {
          const needed = Number(apiData?.requiredCredits);
          const available = Number(apiData?.balance);
          if (Number.isFinite(needed) && Number.isFinite(available)) {
            creditGate.open({
              requiredCredits: needed,
              balance: available,
            });
            setJobError('');
          } else {
            creditGate.open({
              requiredCredits,
              balance:
                typeof creditsQuery.data?.balance === 'number'
                  ? creditsQuery.data.balance
                  : 0,
            });
            setJobError('');
          }
          clearActive(userId);
        } else if (code === 'SUBMISSION_UNKNOWN') {
          setSubmissionUnknown(true);
          setJobError(
            'Submission result is uncertain. Credits remain reserved — do not retry. Contact support.'
          );
          clearActive(userId);
        } else {
          creditGate.clear();
          toast.error(error.message);
          setJobError(error.message);
          clearActive(userId);
        }
      } else {
        creditGate.clear();
        const message =
          error instanceof Error ? error.message : 'Generation failed';
        toast.error(message);
        setJobError(message);
        setActiveGenerationId(null);
        clearActive(userId);
      }
    } finally {
      setBusy(false);
      setPhase('idle');
    }
  }

  return (
    <div className="mx-auto w-full max-w-[1120px]">
      <div className="overflow-hidden rounded-[26px] border border-white/10 bg-[rgba(30,23,19,0.92)] shadow-[0_30px_90px_-30px_rgba(0,0,0,0.85)] backdrop-blur-2xl">
        <div className="grid gap-0 lg:grid-cols-2">
          <div className="border-b border-white/8 p-4 sm:p-5 lg:border-r lg:border-b-0">
            <p className="mb-2 text-xs font-medium tracking-wide text-white/45 uppercase">
              Source video
            </p>
            <VideoSlot
              item={sourceVideo}
              inputRef={videoInputRef}
              disabled={busy}
              onPick={(file) => void onPickVideo(file)}
              onRemove={() => {
                if (sourceVideo?.url) URL.revokeObjectURL(sourceVideo.url);
                setSourceVideo(null);
              }}
            />
          </div>

          <div className="p-4 sm:p-5">
            <p className="mb-2 text-xs font-medium tracking-wide text-white/45 uppercase">
              Head photo
            </p>
            <PhotoSlot
              item={headPhoto}
              inputRef={imageInputRef}
              disabled={busy}
              onPick={(file) => void onPickImage(file)}
              onRemove={() => {
                if (headPhoto?.url) URL.revokeObjectURL(headPhoto.url);
                setHeadPhoto(null);
              }}
            />
          </div>
        </div>

        <div className="border-t border-white/8 p-4 sm:p-5">
          {jobError ? (
            <div
              className={cn(
                'mb-4 rounded-xl border px-4 py-3 text-sm',
                submissionUnknown
                  ? 'border-amber-500/30 bg-amber-500/10 text-amber-300'
                  : 'border-red-500/30 bg-red-500/10 text-red-400'
              )}
            >
              {jobError}
              {activeGenerationId ? (
                <span className="mt-1 block text-xs opacity-70">
                  Job {activeGenerationId.slice(0, 8)}
                </span>
              ) : null}
            </div>
          ) : null}

          <div className="relative flex flex-wrap items-end gap-1.5 sm:gap-2">
            <div className="relative" ref={settingsRef}>
              <button
                type="button"
                aria-expanded={settingsOpen}
                aria-haspopup="dialog"
                disabled={busy}
                onClick={() => setSettingsOpen((value) => !value)}
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
                        {VIDEO_FACE_SWAP_RESOLUTIONS.map((value) => (
                          <SegmentButton
                            key={value}
                            selected={resolution === value}
                            onClick={() => setResolution(value)}
                          >
                            {value}
                          </SegmentButton>
                        ))}
                      </OptionRow>
                    </section>
                  </div>
                </FloatingPanel>
              ) : null}
            </div>

            <div className="ml-auto flex w-full flex-col items-end gap-2.5 sm:w-auto">
              <label
                ref={consentRef}
                className={cn(
                  'flex max-w-[min(100%,22rem)] cursor-pointer items-start gap-2.5',
                  busy && 'pointer-events-none opacity-60'
                )}
              >
                <Checkbox
                  checked={consent}
                  disabled={busy}
                  aria-invalid={consentAttention || undefined}
                  onCheckedChange={(checked) => {
                    const next = checked === true;
                    setConsent(next);
                    if (next) setConsentAttention(false);
                  }}
                  className={cn(
                    'mt-0.5 size-[18px] shrink-0 rounded-[5px] border-white/40 bg-transparent shadow-none dark:bg-transparent',
                    'data-checked:border-[rgb(204,144,92)] data-checked:bg-[rgb(204,144,92)] data-checked:text-[rgb(247,246,243)]',
                    'focus-visible:border-[rgb(204,144,92)] focus-visible:ring-[rgb(204,144,92)]/35',
                    (consentAttention || consentPending) &&
                      !consent &&
                      'border-amber-400/90 ring-2 ring-amber-400/35'
                  )}
                />
                <span
                  className={cn(
                    'min-w-0 text-left text-[12px] leading-snug',
                    consentAttention && !consent
                      ? 'text-amber-100/95'
                      : 'text-white/55'
                  )}
                >
                  I confirm I have the rights to edit this video and portrait
                  {consentAttention && !consent ? (
                    <span className="mt-0.5 block text-[11px] text-amber-200/80">
                      Check this to unlock Generate
                    </span>
                  ) : null}
                </span>
              </label>

              <div className="flex w-full flex-wrap items-end justify-end gap-x-3 gap-y-2">
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
                            {m['genjutsu.estimate.tooltip']()}
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </span>
                  </div>
                  <button
                    type="button"
                    disabled={!canGenerate}
                    onClick={() => void onGenerate()}
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
                  ? 'Head swap result'
                  : phase === 'uploading' || phase === 'starting'
                    ? m['site.generator.starting']()
                    : statusText ||
                      m['site.generator.progress']({
                        resolution,
                      })}
              </p>
            </div>
            {resultUrl && !busy ? (
              <div className="flex shrink-0 items-center gap-2">
                <a
                  href={`${resultUrl}${resultUrl.includes('?') ? '&' : '?'}download=1`}
                  className="inline-flex h-9 items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 text-xs font-medium text-white/70 transition hover:bg-white/10 hover:text-white"
                >
                  <Download className="size-3.5" />
                  Download
                </a>
              </div>
            ) : null}
          </div>

          <div className="p-4 sm:p-5">
            {resultUrl && !busy ? (
              <video
                key={resultUrl}
                src={resultUrl}
                controls
                playsInline
                className="mx-auto aspect-video max-h-[720px] w-full max-w-full rounded-2xl bg-black object-contain"
              />
            ) : (
              <div className="flex flex-col items-center gap-4 py-10">
                <span className="size-9 animate-spin rounded-full border-2 border-[rgb(204,144,92)] border-t-transparent" />
                <div
                  className="mx-auto h-1.5 w-full max-w-md overflow-hidden rounded-full bg-white/10"
                  aria-hidden
                >
                  <div
                    className="h-full rounded-full bg-[rgb(204,144,92)] transition-[width] duration-500 ease-out"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
              </div>
            )}
          </div>
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
