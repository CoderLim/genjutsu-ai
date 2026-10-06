import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type RefObject,
} from 'react';
import { Download, LoaderCircle, Play, RotateCcw, Upload } from 'lucide-react';
import { toast } from 'sonner';

import { useSession } from '@/core/auth/client';
import { Link } from '@/core/i18n/navigation';
import {
  CHUTTAMALLE_RESOLUTIONS,
  estimateChuttamalleCredits,
  type ChuttamalleResolution,
} from '@/modules/chuttamalle/pricing';
import { ApiError, apiGet, apiPost, uploadToSignedUrl } from '@/lib/api-client';
import { trimVideoToFile } from '@/lib/trim-video';
import { useUserCredits } from '@/hooks/use-user-credits';
import { CloseIcon, FilmIcon, ImageModeIcon } from '@/components/icons';
import { ChuttamalleTrimBar } from '@/components/landing/chuttamalle-trim-bar';

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

const TEMPLATE_URL = '/api/chuttamalle/template';
const TEMPLATE_FILE_URL = '/api/chuttamalle/template-file';
const MAX_VIDEO_BYTES = 80 * 1024 * 1024;
const MAX_IMAGE_BYTES = 12 * 1024 * 1024;
const MIN_REFERENCE_VIDEO_SECONDS = 5;
const MAX_REFERENCE_VIDEO_SECONDS = 15;

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
}: {
  title: string;
  note: string;
  item: MediaItem | null;
  onPick: (file: File | null) => void;
  onRemove: () => void;
  inputRef: RefObject<HTMLInputElement | null>;
  disabled: boolean;
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
        <div className="group relative aspect-[4/5] overflow-hidden rounded-2xl border border-white/10 bg-black/30">
          <img src={item.url} alt={title} className="size-full object-cover" />
          <button
            type="button"
            disabled={disabled}
            onClick={onRemove}
            aria-label={`Remove ${title.toLowerCase()}`}
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
          className="flex aspect-[4/5] w-full flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-white/14 bg-white/[0.025] text-center text-white/42 transition hover:border-[rgba(204,144,92,0.55)] hover:bg-[rgba(204,144,92,0.05)] hover:text-[rgb(220,155,99)] disabled:cursor-not-allowed disabled:opacity-50"
        >
          <ImageModeIcon className="size-6" />
          <span className="text-xs font-medium">Add photo</span>
        </button>
      )}
    </div>
  );
}

export function ChuttamalleGeneratorPanel() {
  const { data: session, isPending: sessionPending } = useSession();
  const creditsQuery = useUserCredits(Boolean(session?.user));
  const videoInputRef = useRef<HTMLInputElement>(null);
  const firstImageInputRef = useRef<HTMLInputElement>(null);
  const secondImageInputRef = useRef<HTMLInputElement>(null);
  const mountedRef = useRef(true);
  const localUrlsRef = useRef<Set<string>>(new Set());

  const previewVideoRef = useRef<HTMLVideoElement>(null);
  const [video, setVideo] = useState<VideoSource | null>({
    kind: 'template',
    url: TEMPLATE_URL,
  });
  const [templateAvailable, setTemplateAvailable] = useState(true);
  const [firstImage, setFirstImage] = useState<MediaItem | null>(null);
  const [secondImage, setSecondImage] = useState<MediaItem | null>(null);
  const [resolution, setResolution] = useState<ChuttamalleResolution>('480P');
  const [trimStart, setTrimStart] = useState(0);
  const [trimEnd, setTrimEnd] = useState(0);
  const [trimming, setTrimming] = useState(false);
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

  const busy = !['idle', 'done'].includes(phase) || trimming;
  const imageItems = [firstImage, secondImage].filter(
    (item): item is MediaItem => Boolean(item)
  );
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

  const estimatedCredits = useMemo(() => {
    if (!billedDuration) return null;
    const imageCount = Math.max(
      1,
      (firstImage ? 1 : 0) + (secondImage ? 1 : 0)
    );
    try {
      return estimateChuttamalleCredits({
        duration: billedDuration,
        resolution,
        imageCount,
      });
    } catch {
      return null;
    }
  }, [billedDuration, firstImage, secondImage, resolution]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      localUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
      localUrlsRef.current.clear();
    };
  }, []);

  useEffect(() => {
    if (video?.kind !== 'template') return;
    if (hasKnownDuration) return;

    let cancelled = false;
    void apiGet<{ durationSeconds: number }>('/api/chuttamalle/template-meta')
      .then((data) => {
        if (cancelled) return;
        const seconds = data.durationSeconds;
        if (!Number.isFinite(seconds) || seconds <= 0) return;
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
  }, [video?.kind, video?.url, hasKnownDuration]);

  useEffect(() => {
    if (sourceDuration == null) {
      setTrimStart(0);
      setTrimEnd(0);
      return;
    }
    // Long templates (e.g. full song clips) default to the first billable window.
    setTrimStart(0);
    setTrimEnd(Math.min(sourceDuration, MAX_REFERENCE_VIDEO_SECONDS));
  }, [video?.url, sourceDuration]);

  const applyTrim = async () => {
    if (!video || sourceDuration == null || trimming) return;

    if (
      clipDurationSeconds < MIN_REFERENCE_VIDEO_SECONDS - 0.1 ||
      clipDurationSeconds > MAX_REFERENCE_VIDEO_SECONDS + 0.2
    ) {
      toast.error('Trim the clip to between 5 and 15 seconds');
      return;
    }

    if (isFullSourceClip(trimStart, trimEnd, sourceDuration)) {
      toast.message('Selection already covers the full reference video');
      return;
    }

    setTrimming(true);
    try {
      const sourceUrl =
        video.kind === 'template' ? TEMPLATE_FILE_URL : video.url;
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

      setTemplateAvailable(true);
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
      toast.error('Please choose an image file');
      return;
    }
    if (file.size <= 0 || file.size > MAX_IMAGE_BYTES) {
      toast.error('Reference images must be 12 MB or smaller');
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
      toast.error('Use an MP4 or MOV reference video');
      return;
    }
    if (file.size <= 0 || file.size > MAX_VIDEO_BYTES) {
      toast.error('Reference video must be 80 MB or smaller');
      return;
    }

    try {
      const durationSeconds = await readVideoDuration(file);
      if (
        durationSeconds < MIN_REFERENCE_VIDEO_SECONDS - 0.1 ||
        durationSeconds > MAX_REFERENCE_VIDEO_SECONDS + 0.2
      ) {
        toast.error('Reference video must be between 5 and 15 seconds');
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
      toast.error('Could not read this video. Try MP4 or MOV.');
    }
  };

  const clearVideo = () => {
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
    setTemplateAvailable(true);
    setVideo({ kind: 'template', url: TEMPLATE_URL });
    setResultUrl(null);
    setPhase('idle');
  };

  const pollUntilComplete = async (id: string) => {
    let consecutivePollErrors = 0;

    for (let attempt = 0; attempt < 240; attempt += 1) {
      await new Promise((resolve) => setTimeout(resolve, 2_000));
      if (!mountedRef.current) return;

      let poll: GenerationPoll;
      try {
        poll = await apiGet<GenerationPoll>(
          `/api/chuttamalle/status?generationId=${encodeURIComponent(id)}`
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
    throw new Error(
      'Generation is still running. Keep this generation ID before starting another job.'
    );
  };

  const generate = async () => {
    setCreditError(null);

    if (!session?.user) {
      redirectToSignIn();
      return;
    }
    if (!video || sourceDuration == null) {
      toast.error('Use the preset template or upload a reference video');
      return;
    }
    if (!firstImage) {
      toast.error('Add the first person photo');
      return;
    }
    if (
      clipDurationSeconds < MIN_REFERENCE_VIDEO_SECONDS - 0.1 ||
      clipDurationSeconds > MAX_REFERENCE_VIDEO_SECONDS + 0.2
    ) {
      toast.error('Trim the clip to between 5 and 15 seconds');
      return;
    }
    if (!estimatedCredits) {
      toast.error(
        'Still reading the reference video length. Try again in a moment.'
      );
      return;
    }

    const requiredCredits = estimatedCredits;
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

    const useFullTemplate =
      video.kind === 'template' &&
      isFullSourceClip(trimStart, trimEnd, sourceDuration);

    try {
      let referenceVideoFile: File | null = null;
      if (!useFullTemplate) {
        if (
          video.kind === 'upload' &&
          isFullSourceClip(trimStart, trimEnd, sourceDuration)
        ) {
          referenceVideoFile = video.file;
        } else {
          const sourceUrl =
            video.kind === 'template' ? TEMPLATE_FILE_URL : video.url;
          referenceVideoFile = await trimVideoToFile({
            sourceUrl,
            startSeconds: trimStart,
            endSeconds: trimEnd,
          });
        }
      }

      const useDefaultTemplate = useFullTemplate;
      const files = useDefaultTemplate
        ? imageItems.map((item) => item.file)
        : [referenceVideoFile as File, ...imageItems.map((item) => item.file)];
      const contentTypes = files.map(
        (file) => file.type || 'application/octet-stream'
      );
      const contentLengths = files.map((file) => file.size);

      const setup = await apiPost<UploadSetup>('/api/chuttamalle/upload-url', {
        generationId: id,
        useDefaultTemplate,
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

      const sortedUploads = [...setup.uploads].sort(
        (a, b) => a.index - b.index
      );
      const videoUpload = sortedUploads.find((item) => item.index === 0);
      const imageUploads = sortedUploads.filter((item) => item.index > 0);

      setPhase('starting');
      const start = await apiPost<GenerationStart>(
        '/api/chuttamalle/generate',
        {
          generationId: id,
          useDefaultTemplate,
          resolution,
          videoKey: videoUpload?.storageKey,
          imageKeys: imageUploads.map((item) => item.storageKey),
          contentTypes,
          contentLengths,
          durationSeconds: billedDuration,
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
      ? 'Preparing clip…'
      : phase === 'starting'
        ? 'Starting MiniMax H3…'
        : phase === 'generating'
          ? providerStatus
            ? `Generating · ${providerStatus}`
            : 'Generating…'
          : phase === 'saving'
            ? 'Saving your video…'
            : 'Generate';

  return (
    <div className="mx-auto w-full max-w-[1120px]">
      <div className="overflow-hidden rounded-[26px] border border-white/10 bg-[rgba(30,23,19,0.92)] shadow-[0_30px_90px_-30px_rgba(0,0,0,0.85)] backdrop-blur-2xl">
        <div className="grid gap-0 lg:grid-cols-[0.95fr_1.05fr]">
          <div className="border-b border-white/8 p-4 sm:p-5 lg:border-r lg:border-b-0">
            <div className="mb-3 flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-white/90">
                  Reference performance
                </p>
                <p className="mt-0.5 text-xs leading-5 text-white/40">
                  The Chuttamalle preset is loaded by default. Trim below, or
                  remove it to use your own 5–15s motion reference.
                </p>
              </div>
              {video?.kind === 'template' ? (
                <span className="shrink-0 rounded-full border border-[rgba(204,144,92,0.18)] bg-[rgba(204,144,92,0.08)] px-2.5 py-1 text-[10px] font-semibold text-[rgb(220,155,99)]">
                  Preset
                </span>
              ) : null}
            </div>

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

            {video ? (
              <div>
                <div className="relative aspect-video overflow-hidden rounded-2xl border border-[rgba(204,144,92,0.24)] bg-black">
                  <video
                    ref={previewVideoRef}
                    key={video.url}
                    src={video.url}
                    controls
                    muted
                    playsInline
                    preload="metadata"
                    className="size-full object-contain"
                    onLoadedMetadata={(event) => {
                      const seconds = event.currentTarget.duration;
                      if (!Number.isFinite(seconds) || seconds <= 0) return;
                      if (video.kind === 'template') {
                        setVideo((current) =>
                          current?.kind === 'template'
                            ? { ...current, durationSeconds: seconds }
                            : current
                        );
                      }
                    }}
                    onError={() => {
                      if (video.kind === 'template') {
                        setTemplateAvailable(false);
                        setVideo(null);
                      }
                    }}
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
                {sourceDuration != null ? (
                  <ChuttamalleTrimBar
                    durationSeconds={sourceDuration}
                    startSeconds={trimStart}
                    endSeconds={trimEnd}
                    minClipSeconds={MIN_REFERENCE_VIDEO_SECONDS}
                    maxClipSeconds={MAX_REFERENCE_VIDEO_SECONDS}
                    disabled={busy && !trimming}
                    applying={trimming}
                    canApply={
                      !isFullSourceClip(trimStart, trimEnd, sourceDuration) &&
                      clipDurationSeconds >=
                        MIN_REFERENCE_VIDEO_SECONDS - 0.1 &&
                      clipDurationSeconds <= MAX_REFERENCE_VIDEO_SECONDS + 0.2
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
            ) : (
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
                      Upload reference video
                    </span>
                    <span className="mt-1 block text-xs text-white/38">
                      MP4 or MOV · 5–15s · up to 80 MB
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
                  {templateAvailable
                    ? 'Use preset template'
                    : 'Retry preset template'}
                </button>
              </div>
            )}
          </div>

          <div className="p-4 sm:p-5">
            <div className="grid grid-cols-2 gap-3">
              <PersonSlot
                title="First person"
                note="Required · left performer, or a photo containing both subjects."
                item={firstImage}
                inputRef={firstImageInputRef}
                disabled={busy}
                onPick={(file) => setImageAt('first', file)}
                onRemove={() => clearImageAt('first')}
              />
              <PersonSlot
                title="Second person"
                note="Optional · right performer when using separate photos."
                item={secondImage}
                inputRef={secondImageInputRef}
                disabled={busy}
                onPick={(file) => setImageAt('second', file)}
                onRemove={() => clearImageAt('second')}
              />
            </div>
          </div>
        </div>

        <div className="border-t border-white/8 p-4 sm:p-5">
          {creditError ? (
            <div className="mb-4 flex flex-col gap-3 rounded-xl border border-amber-400/20 bg-amber-400/[0.06] px-4 py-3 text-sm sm:flex-row sm:items-center sm:justify-between">
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

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end sm:gap-3">
            <select
              value={resolution}
              disabled={busy}
              aria-label="Resolution"
              onChange={(event) =>
                setResolution(event.target.value as ChuttamalleResolution)
              }
              className="h-11 w-full rounded-xl border border-white/10 bg-black/20 px-3 text-sm text-white/85 transition outline-none focus:border-[rgb(204,144,92)] disabled:opacity-60 sm:w-[140px]"
            >
              {CHUTTAMALLE_RESOLUTIONS.map((item) => (
                <option key={item} value={item} className="bg-[rgb(32,25,21)]">
                  {item}
                </option>
              ))}
            </select>

            <button
              type="button"
              disabled={busy || sessionPending}
              onClick={() => void generate()}
              className="inline-flex h-11 w-full min-w-[240px] items-center justify-center gap-2 rounded-xl bg-[linear-gradient(135deg,rgb(222,151,92),rgb(189,111,64))] px-5 text-sm font-semibold text-white shadow-[0_12px_32px_-12px_rgba(218,134,75,0.7)] transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-55 sm:w-auto"
            >
              {busy ? (
                <LoaderCircle className="size-4 animate-spin" />
              ) : session?.user ? (
                <Play className="size-4 fill-current" />
              ) : (
                <Upload className="size-4" />
              )}
              <span>
                {!session?.user
                  ? 'Sign in to generate'
                  : busy
                    ? phaseLabel
                    : estimatedCredits
                      ? `Generate (~${estimatedCredits} credits)`
                      : 'Generate'}
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
                MiniMax H3 · {resolution} · 16:9
              </p>
            </div>
            <a
              href={
                generationId
                  ? `/api/chuttamalle/result/${encodeURIComponent(generationId)}?download=1`
                  : resultUrl
              }
              download={
                generationId
                  ? `chuttamalle-${generationId.slice(0, 8)}.mp4`
                  : undefined
              }
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
            className="mx-auto aspect-video max-h-[720px] w-full max-w-full rounded-2xl bg-black object-contain"
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
