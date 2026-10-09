import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type RefObject,
} from 'react';
import { Download, LoaderCircle, Play, Upload } from 'lucide-react';
import { toast } from 'sonner';

import { useSession } from '@/core/auth/client';
import { Link } from '@/core/i18n/navigation';
import { estimateGenjutsuCredits } from '@/modules/genjutsu/pricing';
import {
  ZOMBIE_HUG_PUBLIC_TEMPLATE_PATH,
  ZOMBIE_HUG_RESOLUTION,
  ZOMBIE_HUG_TEMPLATE_DURATION_SECONDS,
} from '@/modules/zombie-hug/prompt';
import { ApiError, apiGet, apiPost, uploadToSignedUrl } from '@/lib/api-client';
import { useUserCredits } from '@/hooks/use-user-credits';
import { CloseIcon, ImageModeIcon } from '@/components/icons';

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
  reservedCredits?: number;
  refundedCredits?: number;
};

const TEMPLATE_URL = '/api/zombie-hug/template';
const MAX_IMAGE_BYTES = 12 * 1024 * 1024;

function createMediaItem(file: File): MediaItem {
  return {
    id: `${file.name}-${file.size}-${file.lastModified}-${Math.random()
      .toString(36)
      .slice(2, 8)}`,
    file,
    url: URL.createObjectURL(file),
  };
}

function PersonSlot({
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
            aria-label={`Remove ${title}`}
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
              Upload photo
            </span>
            <span className="mt-1 block text-xs text-white/38">
              JPG, PNG or WebP · up to 12 MB
            </span>
          </span>
        </button>
      )}
    </div>
  );
}

export function ZombieHugGeneratorPanel() {
  const { data: session, isPending: sessionPending } = useSession();
  const creditsQuery = useUserCredits(Boolean(session?.user));

  const [survivorImage, setSurvivorImage] = useState<MediaItem | null>(null);
  const [lovedOneImage, setLovedOneImage] = useState<MediaItem | null>(null);
  const [templateUrl, setTemplateUrl] = useState(TEMPLATE_URL);
  const [phase, setPhase] = useState<
    'idle' | 'uploading' | 'starting' | 'generating' | 'saving'
  >('idle');
  const [providerStatus, setProviderStatus] = useState('');
  const [generationId, setGenerationId] = useState<string | null>(null);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [creditError, setCreditError] = useState<{
    required: number;
    balance: number;
  } | null>(null);

  const survivorInputRef = useRef<HTMLInputElement>(null);
  const lovedOneInputRef = useRef<HTMLInputElement>(null);

  const estimatedCredits = useMemo(
    () =>
      estimateGenjutsuCredits({
        durationSeconds: ZOMBIE_HUG_TEMPLATE_DURATION_SECONDS,
        resolution: ZOMBIE_HUG_RESOLUTION,
      }),
    []
  );

  const busy = phase !== 'idle';

  useEffect(() => {
    return () => {
      if (survivorImage) URL.revokeObjectURL(survivorImage.url);
      if (lovedOneImage) URL.revokeObjectURL(lovedOneImage.url);
    };
  }, [survivorImage, lovedOneImage]);

  const setImageAt = (slot: 'survivor' | 'lovedOne', file: File | null) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file');
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      toast.error('Images must be 12 MB or smaller');
      return;
    }

    const next = createMediaItem(file);
    if (slot === 'survivor') {
      setSurvivorImage((current) => {
        if (current) URL.revokeObjectURL(current.url);
        return next;
      });
    } else {
      setLovedOneImage((current) => {
        if (current) URL.revokeObjectURL(current.url);
        return next;
      });
    }
    setCreditError(null);
  };

  const clearImageAt = (slot: 'survivor' | 'lovedOne') => {
    if (slot === 'survivor') {
      setSurvivorImage((current) => {
        if (current) URL.revokeObjectURL(current.url);
        return null;
      });
    } else {
      setLovedOneImage((current) => {
        if (current) URL.revokeObjectURL(current.url);
        return null;
      });
    }
  };

  const pollUntilComplete = async (id: string) => {
    let consecutivePollErrors = 0;

    for (let attempt = 0; attempt < 240; attempt += 1) {
      await new Promise((resolve) => setTimeout(resolve, 2_500));

      let poll: GenerationPoll;
      try {
        poll = await apiGet<GenerationPoll>(
          `/api/genjutsu/status?generationId=${encodeURIComponent(id)}`
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
        setPhase('idle');
        await creditsQuery.refetch();
        toast.success('Your AI zombie hug video is ready');
        return;
      }

      if (poll.status === 'failed') {
        setPhase('idle');
        await creditsQuery.refetch();
        throw new Error(poll.error || 'Generation failed');
      }
    }

    throw new Error('Generation timed out. Check Creations in a few minutes.');
  };

  const generate = async () => {
    if (!session?.user) {
      window.location.href = `/sign-in?callbackUrl=${encodeURIComponent('/ai-zombie-hug#generator')}`;
      return;
    }
    if (!survivorImage || !lovedOneImage) {
      toast.error('Upload both photos: survivor and loved one');
      return;
    }

    // As on the homepage, the displayed estimate is informational only.
    // Higgsfield's server-side quote and credit reservation are authoritative.

    setResultUrl(null);
    setProviderStatus('');
    setCreditError(null);
    setPhase('uploading');

    const id = crypto.randomUUID();
    setGenerationId(id);

    try {
      const files = [survivorImage.file, lovedOneImage.file];
      const contentTypes = files.map(
        (file) => file.type || 'application/octet-stream'
      );
      const contentLengths = files.map((file) => file.size);

      const setup = await apiPost<UploadSetup>('/api/zombie-hug/upload-url', {
        generationId: id,
        contentTypes,
        contentLengths,
      });

      if (setup.uploads.length !== files.length) {
        throw new Error('Upload setup returned an incomplete file list');
      }

      const sortedUploads = [...setup.uploads].sort(
        (a, b) => a.index - b.index
      );
      for (let index = 0; index < sortedUploads.length; index += 1) {
        const upload = sortedUploads[index];
        await uploadToSignedUrl({
          url: upload.uploadUrl,
          file: files[index],
          headers: upload.uploadHeaders,
        });
      }

      setPhase('starting');
      const start = await apiPost<GenerationStart>('/api/zombie-hug/generate', {
        generationId: id,
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
          const required = Number(data.requiredCredits);
          const balance = Number(data.balance);
          if (
            Number.isFinite(required) &&
            required > 0 &&
            Number.isFinite(balance) &&
            balance >= 0
          ) {
            setCreditError({ required, balance });
            setPhase('idle');
            return;
          }
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
      ? 'Uploading photos…'
      : phase === 'starting'
        ? 'Starting Genjutsu…'
        : phase === 'generating'
          ? providerStatus
            ? `Generating · ${providerStatus}`
            : 'Generating…'
          : phase === 'saving'
            ? 'Saving your video…'
            : 'Generate';

  return (
    <div className="mx-auto w-full max-w-[1120px]">
      <div className="overflow-hidden rounded-[26px] border border-white/10 bg-[rgba(22,24,28,0.94)] shadow-[0_30px_90px_-30px_rgba(0,0,0,0.85)] backdrop-blur-2xl">
        <div className="grid gap-0 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="border-b border-white/8 p-4 sm:p-5 lg:border-r lg:border-b-0">
            <div className="mb-3 flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-white/90">
                  Motion template
                </p>
                <p className="mt-0.5 text-xs leading-5 text-white/40">
                  Fixed zombie hug performance · 9:16 · ~24 sec. You only upload
                  two photos.
                </p>
              </div>
              <span className="shrink-0 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-2.5 py-1 text-[10px] font-semibold text-emerald-200/90">
                Preset
              </span>
            </div>

            <div className="relative mx-auto aspect-[9/16] max-h-[420px] overflow-hidden rounded-2xl border border-white/10 bg-black">
              <video
                key={templateUrl}
                src={templateUrl}
                controls
                muted
                playsInline
                preload="metadata"
                className="size-full object-contain"
                onError={() => {
                  if (templateUrl !== ZOMBIE_HUG_PUBLIC_TEMPLATE_PATH) {
                    setTemplateUrl(ZOMBIE_HUG_PUBLIC_TEMPLATE_PATH);
                  }
                }}
              />
            </div>
            <p className="mt-3 text-center text-[11px] text-white/34">
              Trending · October 2026 ｜ 24 sec · 9:16 ｜ Ready in ~10 minutes
            </p>
          </div>

          <div className="p-4 sm:p-5">
            <div className="grid grid-cols-2 gap-3">
              <PersonSlot
                title="Survivor (@image1)"
                note="Uninfected / gun holder. Clear front-facing photo of you."
                item={survivorImage}
                inputRef={survivorInputRef}
                disabled={busy}
                onPick={(file) => setImageAt('survivor', file)}
                onRemove={() => clearImageAt('survivor')}
              />
              <PersonSlot
                title="Loved one (@image2)"
                note="Infected then restored. Same person in early zombie / later human shots."
                item={lovedOneImage}
                inputRef={lovedOneInputRef}
                disabled={busy}
                onPick={(file) => setImageAt('lovedOne', file)}
                onRemove={() => clearImageAt('lovedOne')}
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
                className="inline-flex h-8 shrink-0 items-center justify-center rounded-lg bg-emerald-500/90 px-3 text-xs font-semibold text-white transition hover:brightness-105"
              >
                Buy credits
              </Link>
            </div>
          ) : null}

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end sm:gap-3">
            <button
              type="button"
              disabled={busy || sessionPending}
              onClick={() => void generate()}
              className="inline-flex h-11 w-full min-w-[240px] items-center justify-center gap-2 rounded-xl bg-[linear-gradient(135deg,rgb(52,180,120),rgb(28,120,88))] px-5 text-sm font-semibold text-white shadow-[0_12px_32px_-12px_rgba(40,160,110,0.7)] transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-55 sm:w-auto"
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
                    : `Make my zombie hug video (~${estimatedCredits} credits)`}
              </span>
            </button>
          </div>
        </div>
      </div>

      {resultUrl ? (
        <div className="mt-5 overflow-hidden rounded-[24px] border border-white/10 bg-[rgba(18,20,24,0.94)] p-3 shadow-2xl sm:p-4">
          <div className="mb-3 flex items-center justify-between gap-3 px-1">
            <div>
              <p className="text-sm font-semibold text-white/90">Your video</p>
              <p className="mt-0.5 text-xs text-white/38">
                Higgsfield Genjutsu · motion transfer
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
                  ? `ai-zombie-hug-${generationId.slice(0, 8)}.mp4`
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
            className="mx-auto aspect-[9/16] max-h-[720px] w-full max-w-full rounded-2xl bg-black object-contain"
          />
        </div>
      ) : null}
    </div>
  );
}
