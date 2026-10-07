import { useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react';
import { Download, LoaderCircle, Play, Upload } from 'lucide-react';
import { toast } from 'sonner';

import { useSession } from '@/core/auth/client';
import { Link } from '@/core/i18n/navigation';
import {
  estimateH3LabCredits,
  H3_MAX_PROMPT_LENGTH,
  H3_MAX_REFERENCE_IMAGES,
  HOTEL_LOBBY_ASPECT_RATIOS,
  HOTEL_LOBBY_RESOLUTIONS,
  type HotelLobbyAspectRatio,
  type HotelLobbyResolution,
} from '@/modules/hotel-lobby/pricing';
import { ApiError, apiGet, apiPost, uploadToSignedUrl } from '@/lib/api-client';
import { cn } from '@/lib/utils';
import { useUserCredits } from '@/hooks/use-user-credits';
import { Button, buttonVariants } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

type PromptExpansionMode = 'disabled' | 'fast' | 'balanced' | 'quality';

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
};

type GenerationPoll = {
  status: 'processing' | 'completed' | 'failed';
  providerStatus: string;
  videoUrl: string | null;
  error?: string;
};

const MAX_VIDEO_BYTES = 80 * 1024 * 1024;
const MAX_IMAGE_BYTES = 12 * 1024 * 1024;
const MIN_REFERENCE_VIDEO_SECONDS = 5;
const MAX_REFERENCE_VIDEO_SECONDS = 15;

const PROMPT_EXPANSION_MODES: PromptExpansionMode[] = [
  'disabled',
  'fast',
  'balanced',
  'quality',
];

/** Default prompt matching Hotel Lobby 2-image preset — editable for lab tests. */
export const DEFAULT_H3_LAB_PROMPT = [
  'Use Video 1 as the exact performance reference for motion, timing, gestures, camera, framing, microphone position, orange booth, lighting, and shot progression.',
  'Replace the left performer in Video 1 with Image 1 and the right performer with Image 2.',
  'Keep each replacement identity, face, hair, clothing, body proportions, and species consistent with its matching image throughout the clip.',
  'Preserve the original booth, hanging microphone, choreography, timing, camera, composition, and background as closely as possible.',
  'Do not swap the two identities, blend them together, add extra people, or alter unrelated parts of the shot.',
].join('\n');

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

export function H3LabPanel() {
  const { data: session, isPending: sessionPending } = useSession();
  const creditsQuery = useUserCredits();
  const localUrlsRef = useRef<Set<string>>(new Set());
  const mountedRef = useRef(true);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const replaceImageInputRef = useRef<HTMLInputElement>(null);
  const replaceImageIndexRef = useRef<number | null>(null);

  const [video, setVideo] = useState<MediaItem | null>(null);
  const [videoDuration, setVideoDuration] = useState<number | null>(null);
  const [images, setImages] = useState<MediaItem[]>([]);
  const [prompt, setPrompt] = useState(DEFAULT_H3_LAB_PROMPT);
  const [resolution, setResolution] = useState<HotelLobbyResolution>('768P');
  const [aspectRatio, setAspectRatio] = useState<HotelLobbyAspectRatio>('16:9');
  const [promptExpansionMode, setPromptExpansionMode] =
    useState<PromptExpansionMode>('disabled');
  const [durationMode, setDurationMode] = useState<'auto' | 'manual'>('auto');
  const [manualDuration, setManualDuration] = useState(8);
  const [enableSafetyChecker, setEnableSafetyChecker] = useState(true);

  const [phase, setPhase] = useState<
    'idle' | 'uploading' | 'starting' | 'generating' | 'saving' | 'done'
  >('idle');
  const [providerStatus, setProviderStatus] = useState('');
  const [generationId, setGenerationId] = useState<string | null>(null);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [creditError, setCreditError] = useState<{
    required: number;
    balance: number;
  } | null>(null);

  const busy = phase !== 'idle' && phase !== 'done';

  const billedDuration = useMemo(() => {
    if (durationMode === 'manual') return manualDuration;
    if (videoDuration == null) return null;
    return clampReferenceDuration(videoDuration);
  }, [durationMode, manualDuration, videoDuration]);

  const estimatedCredits = useMemo(() => {
    if (billedDuration == null || images.length < 1) return null;
    try {
      return estimateH3LabCredits({
        duration: billedDuration,
        resolution,
        imageCount: images.length,
      });
    } catch {
      return null;
    }
  }, [billedDuration, images.length, resolution]);

  useEffect(() => {
    mountedRef.current = true;
    const urls = localUrlsRef.current;
    return () => {
      mountedRef.current = false;
      for (const url of urls) URL.revokeObjectURL(url);
      urls.clear();
    };
  }, []);

  const revokeItem = (item: MediaItem | null) => {
    if (!item) return;
    URL.revokeObjectURL(item.url);
    localUrlsRef.current.delete(item.url);
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

      revokeItem(video);
      const item = createMediaItem(file);
      localUrlsRef.current.add(item.url);
      setVideo(item);
      setVideoDuration(durationSeconds);
      setManualDuration(clampReferenceDuration(durationSeconds));
      setResultUrl(null);
      setPhase('idle');
    } catch {
      toast.error('Could not read this video. Try MP4 or MOV.');
    }
  };

  const validateImageFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      toast.error('Use a JPEG, PNG, or WebP image');
      return false;
    }
    if (file.size <= 0 || file.size > MAX_IMAGE_BYTES) {
      toast.error('Reference image must be 12 MB or smaller');
      return false;
    }
    return true;
  };

  const addImages = (fileList: FileList | null) => {
    if (!fileList?.length) return;
    const remaining = H3_MAX_REFERENCE_IMAGES - images.length;
    if (remaining <= 0) {
      toast.error(`At most ${H3_MAX_REFERENCE_IMAGES} reference images`);
      return;
    }

    const next: MediaItem[] = [];
    for (const file of Array.from(fileList).slice(0, remaining)) {
      if (!validateImageFile(file)) continue;
      const item = createMediaItem(file);
      localUrlsRef.current.add(item.url);
      next.push(item);
    }
    if (next.length === 0) return;

    setImages((current) => [...current, ...next]);
    setResultUrl(null);
    setPhase('idle');
  };

  const replaceImageAt = (index: number, file: File | null) => {
    if (!file || !validateImageFile(file)) return;
    const item = createMediaItem(file);
    localUrlsRef.current.add(item.url);
    setImages((current) => {
      const copy = [...current];
      const previous = copy[index];
      if (previous) revokeItem(previous);
      copy[index] = item;
      return copy;
    });
    setResultUrl(null);
    setPhase('idle');
  };

  const clearImageAt = (index: number) => {
    setImages((current) => {
      const previous = current[index];
      if (previous) revokeItem(previous);
      return current.filter((_, i) => i !== index);
    });
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
    if (!video || videoDuration == null) {
      toast.error('Upload a 5–15s reference video');
      return;
    }
    if (images.length < 1) {
      toast.error('Add at least one reference image');
      return;
    }
    if (images.length > H3_MAX_REFERENCE_IMAGES) {
      toast.error(`At most ${H3_MAX_REFERENCE_IMAGES} reference images`);
      return;
    }
    if (!prompt.trim()) {
      toast.error('Prompt is required');
      return;
    }
    if (billedDuration == null || !estimatedCredits) {
      toast.error('Could not estimate credits for these settings');
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

    try {
      const files = [video.file, ...images.map((item) => item.file)];
      const contentTypes = files.map(
        (file) => file.type || 'application/octet-stream'
      );
      const contentLengths = files.map((file) => file.size);

      const setup = await apiPost<UploadSetup>('/api/h3-lab/upload-url', {
        generationId: id,
        useDefaultTemplate: false,
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
      const start = await apiPost<GenerationStart>('/api/h3-lab/generate', {
        generationId: id,
        useDefaultTemplate: false,
        prompt: prompt.trim(),
        resolution,
        aspectRatio,
        promptExpansionMode,
        enableSafetyChecker,
        durationMode,
        durationSeconds: billedDuration,
        videoKey: videoUpload?.storageKey,
        imageKeys: imageUploads.map((item) => item.storageKey),
        contentTypes,
        contentLengths,
      });

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
      ? 'Uploading…'
      : phase === 'starting'
        ? 'Starting MiniMax H3…'
        : phase === 'generating'
          ? providerStatus
            ? `Generating · ${providerStatus}`
            : 'Generating…'
          : phase === 'saving'
            ? 'Saving…'
            : 'Generate';

  const selectClass =
    'h-9 w-full rounded-lg border border-border bg-background px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-50';

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6">
      <div className="grid gap-6 lg:grid-cols-2">
        <section className="border-border bg-card space-y-3 rounded-xl border p-4">
          <div>
            <h2 className="text-sm font-semibold">Reference video</h2>
            <p className="text-muted-foreground mt-0.5 text-xs">
              Required · MP4/MOV · 5–15s · ≤80 MB
            </p>
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
            <div className="border-border relative aspect-video overflow-hidden rounded-lg border bg-black">
              <video
                src={video.url}
                controls
                muted
                playsInline
                preload="metadata"
                className="size-full object-contain"
              />
              <Button
                type="button"
                variant="secondary"
                size="xs"
                className="absolute top-2 right-2"
                disabled={busy}
                onClick={() => {
                  revokeItem(video);
                  setVideo(null);
                  setVideoDuration(null);
                  if (videoInputRef.current) videoInputRef.current.value = '';
                }}
              >
                Remove
              </Button>
            </div>
          ) : (
            <button
              type="button"
              disabled={busy}
              onClick={() => videoInputRef.current?.click()}
              className="border-border text-muted-foreground hover:bg-muted/40 flex aspect-video w-full flex-col items-center justify-center gap-2 rounded-lg border border-dashed text-sm transition disabled:opacity-50"
            >
              <Upload className="size-5" />
              Upload reference video
            </button>
          )}
          {videoDuration != null ? (
            <p className="text-muted-foreground text-xs">
              Source duration: {videoDuration.toFixed(2)}s
            </p>
          ) : null}
        </section>

        <section className="border-border bg-card space-y-3 rounded-xl border p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold">Reference images</h2>
              <p className="text-muted-foreground mt-0.5 text-xs">
                1–{H3_MAX_REFERENCE_IMAGES} images · JPEG/PNG/WebP · ≤12 MB each
                · prompt as Image 1…Image N
              </p>
            </div>
            <p className="text-muted-foreground shrink-0 text-xs">
              {images.length}/{H3_MAX_REFERENCE_IMAGES}
            </p>
          </div>
          <input
            ref={imageInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            className="hidden"
            onChange={(event: ChangeEvent<HTMLInputElement>) => {
              addImages(event.target.files);
              event.target.value = '';
            }}
          />
          <input
            ref={replaceImageInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={(event: ChangeEvent<HTMLInputElement>) => {
              const index = replaceImageIndexRef.current;
              replaceImageIndexRef.current = null;
              if (index != null) {
                replaceImageAt(index, event.target.files?.[0] || null);
              }
              event.target.value = '';
            }}
          />
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
            {images.map((item, index) => (
              <div key={item.id} className="space-y-1">
                <p className="text-muted-foreground text-[11px] font-medium">
                  Image {index + 1}
                </p>
                <div className="border-border bg-muted relative aspect-square overflow-hidden rounded-lg border">
                  <img
                    src={item.url}
                    alt=""
                    className="size-full object-cover"
                  />
                  <div className="absolute inset-x-0 bottom-0 flex gap-1 bg-black/55 p-1">
                    <Button
                      type="button"
                      variant="secondary"
                      size="xs"
                      className="flex-1"
                      disabled={busy}
                      onClick={() => {
                        replaceImageIndexRef.current = index;
                        replaceImageInputRef.current?.click();
                      }}
                    >
                      Replace
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      size="xs"
                      disabled={busy}
                      onClick={() => clearImageAt(index)}
                    >
                      ×
                    </Button>
                  </div>
                </div>
              </div>
            ))}
            {images.length < H3_MAX_REFERENCE_IMAGES ? (
              <button
                type="button"
                disabled={busy}
                onClick={() => imageInputRef.current?.click()}
                className="border-border text-muted-foreground hover:bg-muted/40 flex aspect-square flex-col items-center justify-center gap-1 self-end rounded-lg border border-dashed text-xs transition disabled:opacity-50"
              >
                <Upload className="size-4" />
                Add
              </button>
            ) : null}
          </div>
        </section>
      </div>

      <section className="border-border bg-card space-y-3 rounded-xl border p-4">
        <div className="flex items-center justify-between gap-3">
          <Label htmlFor="h3-lab-prompt">Prompt</Label>
          <Button
            type="button"
            variant="ghost"
            size="xs"
            disabled={busy}
            onClick={() => setPrompt(DEFAULT_H3_LAB_PROMPT)}
          >
            Reset default
          </Button>
        </div>
        <Textarea
          id="h3-lab-prompt"
          value={prompt}
          disabled={busy}
          rows={8}
          onChange={(event) => setPrompt(event.target.value)}
          className="min-h-40 font-mono text-xs"
        />
        <p className="text-muted-foreground text-xs">
          {prompt.trim().length} / {H3_MAX_PROMPT_LENGTH} characters
        </p>
      </section>

      <section className="border-border bg-card grid gap-4 rounded-xl border p-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="space-y-1.5">
          <Label htmlFor="h3-lab-resolution">Resolution</Label>
          <select
            id="h3-lab-resolution"
            className={selectClass}
            value={resolution}
            disabled={busy}
            onChange={(event) =>
              setResolution(event.target.value as HotelLobbyResolution)
            }
          >
            {HOTEL_LOBBY_RESOLUTIONS.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="h3-lab-aspect">Aspect ratio</Label>
          <select
            id="h3-lab-aspect"
            className={selectClass}
            value={aspectRatio}
            disabled={busy}
            onChange={(event) =>
              setAspectRatio(event.target.value as HotelLobbyAspectRatio)
            }
          >
            {HOTEL_LOBBY_ASPECT_RATIOS.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="h3-lab-expand">Prompt expansion</Label>
          <select
            id="h3-lab-expand"
            className={selectClass}
            value={promptExpansionMode}
            disabled={busy}
            onChange={(event) =>
              setPromptExpansionMode(event.target.value as PromptExpansionMode)
            }
          >
            {PROMPT_EXPANSION_MODES.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="h3-lab-duration-mode">Duration</Label>
          <select
            id="h3-lab-duration-mode"
            className={selectClass}
            value={durationMode}
            disabled={busy}
            onChange={(event) =>
              setDurationMode(event.target.value as 'auto' | 'manual')
            }
          >
            <option value="auto">Auto from video</option>
            <option value="manual">Manual (5–15s)</option>
          </select>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="h3-lab-duration">
            {durationMode === 'manual' ? 'Output seconds' : 'Billed seconds'}
          </Label>
          {durationMode === 'manual' ? (
            <select
              id="h3-lab-duration"
              className={selectClass}
              value={manualDuration}
              disabled={busy}
              onChange={(event) =>
                setManualDuration(Number(event.target.value))
              }
            >
              {Array.from({ length: 11 }, (_, i) => i + 5).map((seconds) => (
                <option key={seconds} value={seconds}>
                  {seconds}s
                </option>
              ))}
            </select>
          ) : (
            <div
              id="h3-lab-duration"
              className="border-border text-muted-foreground flex h-9 items-center rounded-lg border px-2.5 text-sm"
            >
              {billedDuration != null ? `${billedDuration}s` : '—'}
            </div>
          )}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="h3-lab-safety">Safety checker</Label>
          <label
            htmlFor="h3-lab-safety"
            className="border-border flex h-9 items-center gap-2 rounded-lg border px-2.5 text-sm"
          >
            <input
              id="h3-lab-safety"
              type="checkbox"
              checked={enableSafetyChecker}
              disabled={busy}
              onChange={(event) => setEnableSafetyChecker(event.target.checked)}
            />
            enable_safety_checker
          </label>
        </div>
      </section>

      {creditError ? (
        <div className="flex flex-col gap-3 rounded-xl border border-amber-500/30 bg-amber-500/5 px-4 py-3 text-sm sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-medium">Not enough credits</p>
            <p className="text-muted-foreground mt-0.5 text-xs">
              Need {creditError.required.toLocaleString()} · balance{' '}
              {creditError.balance.toLocaleString()}
            </p>
          </div>
          <Link href="/pricing" className={cn(buttonVariants({ size: 'sm' }))}>
            Buy credits
          </Link>
        </div>
      ) : null}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-muted-foreground text-xs">
          Balance:{' '}
          {creditsQuery.isPending
            ? '…'
            : (creditsQuery.data?.balance ?? 0).toLocaleString()}{' '}
          credits
          {estimatedCredits != null
            ? ` · estimate ~${estimatedCredits.toLocaleString()}`
            : ''}
          {generationId ? ` · id ${generationId.slice(0, 8)}` : ''}
        </p>
        <Button
          type="button"
          size="lg"
          disabled={busy || sessionPending}
          onClick={() => void generate()}
          className="min-w-[220px]"
        >
          {busy ? (
            <LoaderCircle className="size-4 animate-spin" />
          ) : session?.user ? (
            <Play className="size-4 fill-current" />
          ) : (
            <Upload className="size-4" />
          )}
          {!session?.user
            ? 'Sign in to generate'
            : busy
              ? phaseLabel
              : estimatedCredits
                ? `Generate (~${estimatedCredits} credits)`
                : 'Generate'}
        </Button>
      </div>

      {resultUrl ? (
        <section className="border-border bg-card space-y-3 rounded-xl border p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold">Result</h2>
              <p className="text-muted-foreground mt-0.5 text-xs">
                MiniMax H3 · {resolution} · {aspectRatio}
                {billedDuration != null ? ` · ${billedDuration}s` : ''}
              </p>
            </div>
            <a
              href={
                generationId
                  ? `/api/hotel-lobby/result/${encodeURIComponent(generationId)}?download=1`
                  : resultUrl
              }
              download={
                generationId
                  ? `h3-lab-${generationId.slice(0, 8)}.mp4`
                  : undefined
              }
              className={cn(buttonVariants({ variant: 'outline', size: 'sm' }))}
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
            className="mx-auto aspect-video max-h-[720px] w-full rounded-lg bg-black object-contain"
          />
        </section>
      ) : null}
    </div>
  );
}
