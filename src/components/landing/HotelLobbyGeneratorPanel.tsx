import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
} from 'react';
import {
  Download,
  LoaderCircle,
  Play,
  Sparkles,
  Upload,
} from 'lucide-react';
import { toast } from 'sonner';

import { useSession } from '@/core/auth/client';
import { Link } from '@/core/i18n/navigation';
import {
  estimateHotelLobbyCredits,
  HOTEL_LOBBY_ASPECT_RATIOS,
  HOTEL_LOBBY_MAX_DURATION_SECONDS,
  HOTEL_LOBBY_MIN_DURATION_SECONDS,
  HOTEL_LOBBY_RESOLUTIONS,
  type HotelLobbyAspectRatio,
  type HotelLobbyResolution,
} from '@/modules/hotel-lobby/pricing';
import {
  ApiError,
  apiGet,
  apiPost,
  uploadToSignedUrl,
} from '@/lib/api-client';
import { cn } from '@/lib/cn';
import { useUserCredits } from '@/hooks/use-user-credits';
import {
  CloseIcon,
  FilmIcon,
  ImageModeIcon,
  PlusIcon,
} from '@/components/icons';

type MediaItem = {
  id: string;
  file: File;
  url: string;
  durationSeconds?: number;
};

type SignedUpload = {
  uploadUrl: string;
  uploadHeaders: Record<string, string>;
  storageKey: string;
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
const MAX_IMAGES = 9;
const MIN_REFERENCE_VIDEO_SECONDS = 2;
const MAX_REFERENCE_VIDEO_SECONDS = 15;

const DEFAULT_PROMPT =
  'Replace the people in Video 1 with the matching subjects from the reference images. Preserve the original motion, timing, camera movement, framing, lighting, and hotel lobby scene.';

function createMediaItem(file: File): MediaItem {
  return {
    id: `${file.name}-${file.size}-${file.lastModified}-${Math.random()
      .toString(36)
      .slice(2, 8)}`,
    file,
    url: URL.createObjectURL(file),
  };
}

function readVideoDuration(file: File): Promise<number> {
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

function redirectToSignIn() {
  const callbackUrl = encodeURIComponent(
    `${window.location.pathname}${window.location.search}`
  );
  window.location.href = `/sign-in?callbackUrl=${callbackUrl}`;
}

function SettingSelect<T extends string>({
  label,
  value,
  values,
  onChange,
}: {
  label: string;
  value: T;
  values: readonly T[];
  onChange: (value: T) => void;
}) {
  return (
    <label className="flex min-w-0 flex-1 flex-col gap-1.5">
      <span className="text-[11px] font-medium text-white/45">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value as T)}
        className="h-9 rounded-xl border border-white/10 bg-black/20 px-3 text-sm text-white/85 outline-none transition focus:border-[rgb(204,144,92)]"
      >
        {values.map((item) => (
          <option key={item} value={item} className="bg-[rgb(32,25,21)]">
            {item}
          </option>
        ))}
      </select>
    </label>
  );
}

export function HotelLobbyGeneratorPanel() {
  const { data: session, isPending: sessionPending } = useSession();
  const creditsQuery = useUserCredits(Boolean(session?.user));
  const videoInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const mountedRef = useRef(true);
  const mediaUrlsRef = useRef<Set<string>>(new Set());

  const [video, setVideo] = useState<MediaItem | null>(null);
  const [images, setImages] = useState<MediaItem[]>([]);
  const [prompt, setPrompt] = useState(DEFAULT_PROMPT);
  const [duration, setDuration] = useState(5);
  const [resolution, setResolution] =
    useState<HotelLobbyResolution>('480P');
  const [aspectRatio, setAspectRatio] =
    useState<HotelLobbyAspectRatio>('16:9');
  const [phase, setPhase] = useState<
    'idle' | 'uploading' | 'starting' | 'generating' | 'saving' | 'done'
  >('idle');
  const [providerStatus, setProviderStatus] = useState('');
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [generationId, setGenerationId] = useState<string | null>(null);
  const [creditError, setCreditError] = useState<{
    required: number;
    balance: number;
  } | null>(null);

  const busy = !['idle', 'done'].includes(phase);
  const estimatedCredits = useMemo(() => {
    if (images.length < 1) return null;
    try {
      return estimateHotelLobbyCredits({
        duration,
        resolution,
        imageCount: images.length,
      });
    } catch {
      return null;
    }
  }, [duration, images.length, resolution]);

  useEffect(() => {
    return () => {
      mountedRef.current = false;
      mediaUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
      mediaUrlsRef.current.clear();
    };
  }, []);

  const replaceVideo = async (file: File | null) => {
    if (!file) return;
    if (!session?.user) {
      redirectToSignIn();
      return;
    }
    if (!file.type.startsWith('video/')) {
      toast.error('Please choose a video file');
      return;
    }
    if (file.size <= 0 || file.size > MAX_VIDEO_BYTES) {
      toast.error('Reference video must be 80 MB or smaller');
      return;
    }

    try {
      const durationSeconds = await readVideoDuration(file);
      if (
        durationSeconds < MIN_REFERENCE_VIDEO_SECONDS ||
        durationSeconds > MAX_REFERENCE_VIDEO_SECONDS
      ) {
        toast.error('Reference video must be between 2 and 15 seconds');
        return;
      }

      const next = {
        ...createMediaItem(file),
        durationSeconds,
      };
      mediaUrlsRef.current.add(next.url);
      if (video) {
        URL.revokeObjectURL(video.url);
        mediaUrlsRef.current.delete(video.url);
      }
      setVideo(next);
      setResultUrl(null);
      setPhase('idle');
    } catch {
      toast.error('Could not read this video. Try MP4, MOV, or WebM.');
    }
  };

  const addImages = (list: FileList | null) => {
    if (!list?.length) return;
    if (!session?.user) {
      redirectToSignIn();
      return;
    }

    const room = MAX_IMAGES - images.length;
    const accepted = Array.from(list)
      .filter((file) => file.type.startsWith('image/'))
      .slice(0, room)
      .filter((file) => {
        if (file.size <= 0 || file.size > MAX_IMAGE_BYTES) {
          toast.error(`${file.name} must be 12 MB or smaller`);
          return false;
        }
        return true;
      })
      .map(createMediaItem);

    if (accepted.length) {
      accepted.forEach((item) => mediaUrlsRef.current.add(item.url));
      setImages((current) => [...current, ...accepted]);
      setResultUrl(null);
      setPhase('idle');
    }
  };

  const removeImage = (id: string) => {
    setImages((current) => {
      const target = current.find((item) => item.id === id);
      if (target) {
        URL.revokeObjectURL(target.url);
        mediaUrlsRef.current.delete(target.url);
      }
      return current.filter((item) => item.id !== id);
    });
  };

  const clearVideo = () => {
    if (video) {
      URL.revokeObjectURL(video.url);
      mediaUrlsRef.current.delete(video.url);
    }
    setVideo(null);
    if (videoInputRef.current) videoInputRef.current.value = '';
  };

  const pollUntilComplete = async (id: string) => {
    for (let attempt = 0; attempt < 240; attempt += 1) {
      await new Promise((resolve) => setTimeout(resolve, 2_000));
      if (!mountedRef.current) return;

      const poll = await apiGet<GenerationPoll>(
        `/api/hotel-lobby/status?generationId=${encodeURIComponent(id)}`
      );
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
    throw new Error(
      'Generation is still running. You can check your creations again later.'
    );
  };

  const generate = async () => {
    setCreditError(null);

    if (!session?.user) {
      redirectToSignIn();
      return;
    }
    if (!video) {
      toast.error('Add a 2–15s reference video first');
      return;
    }
    if (images.length < 1) {
      toast.error('Add at least one reference image');
      return;
    }
    if (!prompt.trim()) {
      toast.error('Add a prompt describing the replacement');
      return;
    }

    const requiredCredits =
      estimatedCredits ??
      estimateHotelLobbyCredits({
        duration,
        resolution,
        imageCount: images.length,
      });
    const balance = creditsQuery.data?.balance ?? 0;

    if (!creditsQuery.isPending && balance < requiredCredits) {
      setCreditError({ required: requiredCredits, balance });
      return;
    }

    setResultUrl(null);
    setProviderStatus('');
    setPhase('uploading');

    const id = crypto.randomUUID();
    setGenerationId(id);
    const files = [video.file, ...images.map((item) => item.file)];
    const contentTypes = files.map((file) => file.type);
    const contentLengths = files.map((file) => file.size);

    try {
      const setup = await apiPost<UploadSetup>('/api/hotel-lobby/upload-url', {
        generationId: id,
        contentTypes,
        contentLengths,
      });

      if (setup.uploads.length !== files.length) {
        throw new Error('Upload setup returned an incomplete file list');
      }

      for (let index = 0; index < files.length; index += 1) {
        const upload = setup.uploads[index];
        await uploadToSignedUrl({
          url: upload.uploadUrl,
          file: files[index],
          headers: upload.uploadHeaders,
        });
      }

      setPhase('starting');
      const start = await apiPost<GenerationStart>(
        '/api/hotel-lobby/generate',
        {
          generationId: id,
          prompt: prompt.trim(),
          duration,
          resolution,
          aspectRatio,
          promptExpansionMode: 'disabled',
          videoKey: setup.uploads[0].storageKey,
          imageKeys: setup.uploads.slice(1).map((item) => item.storageKey),
          contentTypes,
          contentLengths,
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
          setCreditError({
            required: Number(data.requiredCredits) || requiredCredits,
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

  const phaseLabel =
    phase === 'uploading'
      ? 'Uploading references…'
      : phase === 'starting'
        ? 'Starting MiniMax H3…'
        : phase === 'generating'
          ? providerStatus
            ? `Generating · ${providerStatus}`
            : 'Generating…'
          : phase === 'saving'
            ? 'Saving your video…'
            : 'Generate video';

  return (
    <div className="mx-auto w-full max-w-[1120px]">
      <div className="overflow-hidden rounded-[26px] border border-white/10 bg-[rgba(30,23,19,0.92)] shadow-[0_30px_90px_-30px_rgba(0,0,0,0.85)] backdrop-blur-2xl">
        <div className="grid gap-0 lg:grid-cols-[1.06fr_0.94fr]">
          <div className="border-b border-white/8 p-4 sm:p-5 lg:border-r lg:border-b-0">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-white/90">
                  Reference video
                </p>
                <p className="mt-0.5 text-xs text-white/42">
                  2–15s · motion, timing, camera and scene
                </p>
              </div>
              {video?.durationSeconds ? (
                <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] text-white/55">
                  {video.durationSeconds.toFixed(1)}s
                </span>
              ) : null}
            </div>

            <input
              ref={videoInputRef}
              type="file"
              accept="video/mp4,video/quicktime,video/webm,video/*"
              className="hidden"
              onChange={(event: ChangeEvent<HTMLInputElement>) => {
                void replaceVideo(event.target.files?.[0] || null);
                event.target.value = '';
              }}
            />

            {video ? (
              <div className="group relative aspect-video overflow-hidden rounded-2xl border border-[rgba(204,144,92,0.28)] bg-black">
                <video
                  src={video.url}
                  controls
                  playsInline
                  preload="metadata"
                  className="size-full object-contain"
                />
                <button
                  type="button"
                  onClick={clearVideo}
                  disabled={busy}
                  aria-label="Remove reference video"
                  className="absolute top-2 right-2 flex size-8 items-center justify-center rounded-full bg-black/70 text-white/80 backdrop-blur transition hover:bg-black/90 disabled:opacity-40"
                >
                  <CloseIcon className="size-4" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                disabled={busy || sessionPending}
                onClick={() =>
                  session?.user
                    ? videoInputRef.current?.click()
                    : redirectToSignIn()
                }
                className="flex aspect-video w-full flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-[rgba(204,144,92,0.35)] bg-[rgba(204,144,92,0.04)] text-center transition hover:border-[rgba(204,144,92,0.62)] hover:bg-[rgba(204,144,92,0.07)] disabled:cursor-not-allowed disabled:opacity-50"
              >
                <span className="flex size-12 items-center justify-center rounded-full bg-[rgba(204,144,92,0.12)] text-[rgb(220,155,99)]">
                  <FilmIcon className="size-6" />
                </span>
                <span>
                  <span className="block text-sm font-medium text-white/82">
                    Add reference video
                  </span>
                  <span className="mt-1 block text-xs text-white/38">
                    MP4, MOV or WebM · up to 80 MB
                  </span>
                </span>
              </button>
            )}
          </div>

          <div className="flex min-w-0 flex-col p-4 sm:p-5">
            <div className="mb-3">
              <p className="text-sm font-semibold text-white/90">
                Reference images
              </p>
              <p className="mt-0.5 text-xs text-white/42">
                Up to 9 images · people, outfits, objects or style references
              </p>
            </div>

            <input
              ref={imageInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(event: ChangeEvent<HTMLInputElement>) => {
                addImages(event.target.files);
                event.target.value = '';
              }}
            />

            <div className="grid min-h-[174px] grid-cols-4 gap-2 sm:grid-cols-5 lg:grid-cols-4 xl:grid-cols-5">
              {images.map((item, index) => (
                <div
                  key={item.id}
                  className="group relative aspect-[3/4] overflow-hidden rounded-xl border border-white/10 bg-black/30"
                >
                  <img
                    src={item.url}
                    alt={`Reference ${index + 1}`}
                    className="size-full object-cover"
                  />
                  <span className="absolute bottom-1.5 left-1.5 rounded bg-black/65 px-1.5 py-0.5 text-[9px] font-medium text-white/80">
                    Image {index + 1}
                  </span>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => removeImage(item.id)}
                    aria-label={`Remove reference image ${index + 1}`}
                    className="absolute top-1.5 right-1.5 flex size-6 items-center justify-center rounded-full bg-black/70 text-white/80 opacity-0 transition group-hover:opacity-100 disabled:hidden"
                  >
                    <CloseIcon className="size-3.5" />
                  </button>
                </div>
              ))}

              {images.length < MAX_IMAGES ? (
                <button
                  type="button"
                  disabled={busy || sessionPending}
                  onClick={() =>
                    session?.user
                      ? imageInputRef.current?.click()
                      : redirectToSignIn()
                  }
                  className={cn(
                    'flex aspect-[3/4] flex-col items-center justify-center gap-1.5 rounded-xl border border-dashed border-white/14 bg-white/[0.025] text-white/45 transition',
                    'hover:border-[rgba(204,144,92,0.5)] hover:bg-[rgba(204,144,92,0.05)] hover:text-[rgb(220,155,99)]',
                    'disabled:cursor-not-allowed disabled:opacity-50'
                  )}
                >
                  {images.length === 0 ? (
                    <ImageModeIcon className="size-5" />
                  ) : (
                    <PlusIcon className="size-5" />
                  )}
                  <span className="text-[10px]">
                    {images.length === 0 ? 'Add images' : 'Add more'}
                  </span>
                </button>
              ) : null}
            </div>

            <p className="mt-2 text-right text-[10px] text-white/30">
              {images.length}/{MAX_IMAGES}
            </p>
          </div>
        </div>

        <div className="border-t border-white/8 p-4 sm:p-5">
          <label className="block">
            <span className="mb-2 block text-sm font-semibold text-white/90">
              Prompt
            </span>
            <textarea
              value={prompt}
              disabled={busy}
              onChange={(event) => setPrompt(event.target.value)}
              rows={3}
              placeholder="Example: Replace the two people in Video 1 with Image 1 and Image 2."
              className="min-h-[88px] w-full resize-y rounded-2xl border border-white/10 bg-black/18 px-4 py-3 text-sm leading-6 text-white/82 outline-none transition placeholder:text-white/25 focus:border-[rgba(204,144,92,0.6)] disabled:opacity-60"
            />
          </label>

          <div className="mt-4 grid gap-3 sm:grid-cols-[1.2fr_1fr_1fr]">
            <label className="flex min-w-0 flex-1 flex-col gap-1.5">
              <span className="text-[11px] font-medium text-white/45">
                Duration
              </span>
              <div className="flex h-9 items-center gap-3 rounded-xl border border-white/10 bg-black/20 px-3">
                <input
                  type="range"
                  min={HOTEL_LOBBY_MIN_DURATION_SECONDS}
                  max={HOTEL_LOBBY_MAX_DURATION_SECONDS}
                  step={1}
                  value={duration}
                  disabled={busy}
                  onChange={(event) => setDuration(Number(event.target.value))}
                  className="min-w-0 flex-1 accent-[rgb(204,144,92)]"
                />
                <span className="w-7 text-right text-xs font-medium tabular-nums text-white/75">
                  {duration}s
                </span>
              </div>
            </label>

            <SettingSelect
              label="Resolution"
              value={resolution}
              values={HOTEL_LOBBY_RESOLUTIONS}
              onChange={setResolution}
            />
            <SettingSelect
              label="Aspect ratio"
              value={aspectRatio}
              values={HOTEL_LOBBY_ASPECT_RATIOS}
              onChange={setAspectRatio}
            />
          </div>

          {creditError ? (
            <div className="mt-4 flex flex-col gap-3 rounded-xl border border-amber-400/20 bg-amber-400/[0.06] px-4 py-3 text-sm sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-medium text-amber-100/90">
                  Not enough credits
                </p>
                <p className="mt-0.5 text-xs text-amber-100/55">
                  Need {creditError.required.toLocaleString()} · balance{' '}
                  {creditError.balance.toLocaleString()}
                </p>
              </div>
              <Link
                href="/pricing"
                className="inline-flex h-8 shrink-0 items-center justify-center rounded-lg bg-[rgb(204,144,92)] px-3 text-xs font-semibold text-white transition hover:brightness-105"
              >
                Buy credits
              </Link>
            </div>
          ) : null}

          <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2 text-xs text-white/38">
              <Sparkles className="size-3.5 text-[rgb(204,144,92)]" />
              <span>MiniMax H3 · safety checker enabled</span>
              {creditsQuery.data ? (
                <>
                  <span className="text-white/18">•</span>
                  <span>
                    {creditsQuery.data.balance.toLocaleString()} credits
                  </span>
                </>
              ) : null}
            </div>

            <button
              type="button"
              disabled={busy || sessionPending}
              onClick={() => void generate()}
              className="inline-flex h-11 min-w-[190px] items-center justify-center gap-2 rounded-xl bg-[linear-gradient(135deg,rgb(222,151,92),rgb(189,111,64))] px-5 text-sm font-semibold text-white shadow-[0_12px_32px_-12px_rgba(218,134,75,0.7)] transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-55"
            >
              {busy ? (
                <LoaderCircle className="size-4 animate-spin" />
              ) : session?.user ? (
                <Play className="size-4 fill-current" />
              ) : (
                <Upload className="size-4" />
              )}
              <span>
                {session?.user
                  ? busy
                    ? phaseLabel
                    : estimatedCredits
                      ? `Generate · ~${estimatedCredits} credits`
                      : 'Generate video'
                  : 'Sign in to generate'}
              </span>
            </button>
          </div>
        </div>
      </div>

      {resultUrl ? (
        <div className="mt-5 overflow-hidden rounded-[24px] border border-white/10 bg-[rgba(25,20,17,0.94)] p-3 shadow-2xl sm:p-4">
          <div className="mb-3 flex items-center justify-between gap-3 px-1">
            <div>
              <p className="text-sm font-semibold text-white/90">Your video</p>
              <p className="mt-0.5 text-xs text-white/38">
                MiniMax H3 · {duration}s · {resolution}
              </p>
            </div>
            <a
              href={resultUrl}
              download
              className="inline-flex h-9 items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 text-xs font-medium text-white/70 transition hover:bg-white/10 hover:text-white"
            >
              <Download className="size-3.5" />
              Download
            </a>
          </div>
          <video
            src={resultUrl}
            controls
            autoPlay
            playsInline
            className="aspect-video w-full rounded-2xl bg-black object-contain"
          />
          {generationId ? (
            <p className="mt-2 px-1 text-[10px] text-white/25">
              Generation {generationId.slice(0, 8)}
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
