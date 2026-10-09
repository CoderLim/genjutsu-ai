import { memo, useEffect, useMemo, useState } from 'react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { createFileRoute } from '@tanstack/react-router';
import { Crown, Eye, Film, ImageIcon, Play } from 'lucide-react';

import {
  calculateGenjutsuCredits,
  estimateGenjutsuCredits,
  type GenjutsuBillableResolution,
} from '@/modules/genjutsu/pricing';
import { apiGet, type PageResult } from '@/lib/api-client';
import { formatDateTime } from '@/lib/time';
import { cn } from '@/lib/utils';
import { m } from '@/paraglide/messages.js';
import { DataTable, type Column } from '@/components/data-table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface GenerationInputMedia {
  index: number;
  kind: 'video' | 'image';
  contentType: string | null;
  contentLength: number | null;
  url: string;
}

interface GenerationUploadAttempt {
  attempt: number;
  elapsedMs: number;
  errorName: string | null;
  errorMessage: string | null;
  httpStatus: number | null;
}

interface Generation {
  id: string;
  userId: string;
  userName: string | null;
  userEmail: string;
  isPaid: boolean;
  scene: string;
  provider: string;
  model: string;
  prompt: string;
  mode: string | null;
  resolution: string | null;
  aspectRatio: string | null;
  status: string;
  attemptStage: string | null;
  taskId: string | null;
  providerStatus: string | null;
  failureStage: string | null;
  errorCode: string | null;
  providerCode: string | null;
  errorFileIndex: number | null;
  errorFileType: string | null;
  errorHttpStatus: number | null;
  uploadAttemptCount: number | null;
  uploadElapsedMs: number | null;
  uploadBrowser: string | null;
  uploadBrowserMajor: number | null;
  uploadOs: string | null;
  uploadOnline: boolean | null;
  uploadIsWebView: boolean | null;
  uploadInAppBrowser: string | null;
  uploadEffectiveType: string | null;
  uploadRttMs: number | null;
  uploadDownlinkMbps: number | null;
  uploadOrigin: string | null;
  uploadHost: string | null;
  uploadErrorName: string | null;
  uploadErrorMessage: string | null;
  uploadAttempts: GenerationUploadAttempt[];
  uploadCfCountry: string | null;
  uploadCfColo: string | null;
  uploadCfAsn: number | null;
  r2ObjectExists: boolean | null;
  r2ObjectSizeMatches: boolean | null;
  r2ObjectTypeMatches: boolean | null;
  r2InspectionStatus: string | null;
  r2InspectionError: string | null;
  uploadRecovered: boolean | null;
  uploadRetrySuccessCount: number | null;
  error: string | null;
  costCredits: number;
  providerCostUsd: number | null;
  sourceDurationSeconds: number | null;
  requiredCredits: number | null;
  estimatedCredits: number | null;
  inputMedia: GenerationInputMedia[];
  sourceVideoUrl: string | null;
  videoUrl: string | null;
  createdAt: string;
  updatedAt: string;
}

type PreviewView = 'before' | 'after';

interface VideoPreview {
  sourceUrl: string | null;
  resultUrl: string | null;
  view: PreviewView;
}

const PAGE_SIZE = 20;
const STATUSES = [
  'initiated',
  'sealing',
  'ready',
  'failed_preflight',
  'insufficient_credits',
  'reserving',
  'reserved',
  'submitting',
  'submitted',
  'completing',
  'completed',
  'submission_unknown',
  'refunding',
  'refunded',
] as const;

function statusVariant(status: string) {
  if (status === 'completed') return 'default';
  if (
    status === 'refunded' ||
    status === 'failed_preflight' ||
    status === 'submission_unknown'
  ) {
    return 'destructive';
  }
  return 'secondary';
}

function preferredThumbUrl(g: Generation) {
  return g.videoUrl || g.sourceVideoUrl || null;
}

function openPreviewFor(g: Generation): VideoPreview | null {
  if (!g.videoUrl && !g.sourceVideoUrl) return null;
  return {
    sourceUrl: g.sourceVideoUrl,
    resultUrl: g.videoUrl,
    view: g.videoUrl ? 'after' : 'before',
  };
}

/** Keeps the <video> DOM node stable across parent re-renders. */
const GenerationVideoThumb = memo(function GenerationVideoThumb({
  thumbUrl,
  onOpen,
}: {
  thumbUrl: string;
  onOpen: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label={m['admin.generations.open_video']()}
      className="group relative block size-16 overflow-hidden rounded-md bg-black"
    >
      <video
        src={thumbUrl}
        muted
        playsInline
        preload="metadata"
        className="size-full object-cover transition duration-200 group-hover:scale-[1.03]"
      />
      <span className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/0 transition group-hover:bg-black/30">
        <span className="bg-background/90 text-foreground flex size-7 items-center justify-center rounded-full opacity-0 shadow transition group-hover:opacity-100">
          <Play className="size-3.5 fill-current" />
        </span>
      </span>
    </button>
  );
});

function formatBytes(value: number | null) {
  if (value == null || !Number.isFinite(value) || value < 0) return '—';
  if (value < 1024) return `${value} B`;
  const units = ['KB', 'MB', 'GB'];
  let size = value / 1024;
  let unitIndex = 0;
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex += 1;
  }
  return `${size >= 100 ? size.toFixed(0) : size.toFixed(1)} ${units[unitIndex]}`;
}

function isBillableResolution(
  value: string | null | undefined
): value is GenjutsuBillableResolution {
  return value === '480p' || value === '720p' || value === '1080p';
}

/** Same list-rate estimate as GeneratorPanel on main (Higgsfield). */
function estimateCreditsFromSource(input: {
  durationSeconds: number | null | undefined;
  resolution: string | null | undefined;
  providerCostUsd?: number | null;
}): number | null {
  if (
    input.providerCostUsd != null &&
    Number.isFinite(input.providerCostUsd) &&
    input.providerCostUsd > 0
  ) {
    try {
      return calculateGenjutsuCredits(input.providerCostUsd);
    } catch {
      // fall through
    }
  }

  if (
    typeof input.durationSeconds !== 'number' ||
    !Number.isFinite(input.durationSeconds) ||
    input.durationSeconds <= 0 ||
    !isBillableResolution(input.resolution)
  ) {
    return null;
  }

  try {
    return estimateGenjutsuCredits({
      durationSeconds: input.durationSeconds,
      resolution: input.resolution,
    });
  } catch {
    return null;
  }
}

function CreditsCostCell({
  costCredits,
  estimatedCredits,
  providerCostUsd,
}: {
  costCredits: number;
  estimatedCredits: number | null;
  providerCostUsd: number | null;
}) {
  const estimate =
    estimatedCredits != null && estimatedCredits > 0 ? estimatedCredits : null;

  return (
    <div className="text-sm tabular-nums">
      {costCredits > 0 ? (
        <div>{costCredits.toLocaleString()} cr</div>
      ) : estimate != null ? (
        <div>
          {m['genjutsu.estimate.credits']({
            count: estimate.toLocaleString(),
          })}
        </div>
      ) : (
        <div>0 cr</div>
      )}
      {costCredits > 0 && estimate != null && estimate !== costCredits ? (
        <div className="text-muted-foreground text-xs">
          {m['genjutsu.estimate.credits']({
            count: estimate.toLocaleString(),
          })}
        </div>
      ) : (
        <div className="text-muted-foreground text-xs">
          {providerCostUsd == null ? '—' : `$${providerCostUsd.toFixed(4)}`}
        </div>
      )}
    </div>
  );
}

function UploadedMediaCard({
  media,
  label,
  onDuration,
}: {
  media: GenerationInputMedia;
  label: string;
  onDuration?: (seconds: number) => void;
}) {
  const [dimensions, setDimensions] = useState<string | null>(null);
  const [duration, setDuration] = useState<number | null>(null);
  const [loadError, setLoadError] = useState(false);

  return (
    <div className="overflow-hidden rounded-lg border">
      <div className="bg-muted/30 flex items-center justify-between gap-3 border-b px-3 py-2">
        <div className="flex min-w-0 items-center gap-2 text-sm font-medium">
          {media.kind === 'video' ? (
            <Film className="size-4 shrink-0" />
          ) : (
            <ImageIcon className="size-4 shrink-0" />
          )}
          <span className="truncate">{label}</span>
        </div>
        <span className="text-muted-foreground text-xs">
          {formatBytes(media.contentLength)}
        </span>
      </div>

      <div className="bg-black">
        {media.kind === 'video' ? (
          <video
            src={media.url}
            controls
            playsInline
            preload="metadata"
            className="aspect-video max-h-[420px] w-full object-contain"
            onLoadedMetadata={(event) => {
              setLoadError(false);
              const video = event.currentTarget;
              if (video.videoWidth > 0 && video.videoHeight > 0) {
                setDimensions(`${video.videoWidth}×${video.videoHeight}`);
              }
              if (Number.isFinite(video.duration) && video.duration > 0) {
                setDuration(video.duration);
                onDuration?.(video.duration);
              }
            }}
            onError={() => setLoadError(true)}
          />
        ) : (
          <img
            src={media.url}
            alt={label}
            loading="lazy"
            className="max-h-[420px] w-full object-contain"
            onLoad={(event) => {
              setLoadError(false);
              const image = event.currentTarget;
              if (image.naturalWidth > 0 && image.naturalHeight > 0) {
                setDimensions(`${image.naturalWidth}×${image.naturalHeight}`);
              }
            }}
            onError={() => setLoadError(true)}
          />
        )}
      </div>

      {loadError ? (
        <div className="text-destructive border-t px-3 py-2 text-xs">
          Media could not be loaded (the R2 object may be missing or
          unavailable).
        </div>
      ) : null}

      <div className="grid grid-cols-2 gap-x-4 gap-y-2 p-3 text-xs sm:grid-cols-3">
        <div>
          <div className="text-muted-foreground">
            {m['admin.generations.file_type']()}
          </div>
          <div className="mt-0.5 font-mono">{media.contentType || '—'}</div>
        </div>
        <div>
          <div className="text-muted-foreground">
            {m['admin.generations.actual_resolution']()}
          </div>
          <div className="mt-0.5 font-mono">{dimensions || '—'}</div>
        </div>
        {media.kind === 'video' ? (
          <div>
            <div className="text-muted-foreground">
              {m['admin.generations.duration']()}
            </div>
            <div className="mt-0.5 font-mono">
              {duration == null ? '—' : `${duration.toFixed(2)}s`}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

/**
 * Owns list/query state only. Kept out of dialog state so opening View /
 * preview does not rebuild the table (and remount every <video> thumb).
 */
const GenerationsTable = memo(function GenerationsTable({
  onOpenPreview,
  onOpenDetail,
}: {
  onOpenPreview: (preview: VideoPreview) => void;
  onOpenDetail: (generation: Generation) => void;
}) {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [provider, setProvider] = useState('all');
  const [scene, setScene] = useState('all');

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, status, provider, scene]);

  const query = useQuery({
    queryKey: [
      'admin-generations',
      page,
      debouncedSearch,
      status,
      provider,
      scene,
    ],
    queryFn: () => {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: String(PAGE_SIZE),
      });
      if (debouncedSearch) params.set('search', debouncedSearch);
      if (status !== 'all') params.set('status', status);
      if (provider !== 'all') params.set('provider', provider);
      if (scene !== 'all') params.set('scene', scene);
      return apiGet<PageResult<Generation>>(
        `/api/admin/generations?${params.toString()}`
      );
    },
    placeholderData: keepPreviousData,
  });

  const columns = useMemo<Column<Generation>[]>(
    () => [
      {
        header: m['admin.generations.video'](),
        className: 'w-[120px]',
        cell: (g) => {
          const thumbUrl = preferredThumbUrl(g);
          if (!thumbUrl) {
            return (
              <div className="bg-muted text-muted-foreground flex size-16 items-center justify-center rounded-md">
                <Film className="size-5 opacity-60" />
              </div>
            );
          }
          return (
            <GenerationVideoThumb
              thumbUrl={thumbUrl}
              onOpen={() => {
                const next = openPreviewFor(g);
                if (next) onOpenPreview(next);
              }}
            />
          );
        },
      },
      {
        header: m['admin.generations.user'](),
        cell: (g) => (
          <div className="min-w-[180px]">
            <div className="flex items-center gap-1.5 font-medium">
              <span className="truncate">{g.userName || '—'}</span>
              {g.isPaid ? (
                <Crown
                  className="size-3.5 shrink-0 text-amber-500"
                  aria-label={m['admin.generations.paid_user']()}
                />
              ) : null}
            </div>
            <div className="text-muted-foreground text-xs">{g.userEmail}</div>
          </div>
        ),
      },
      {
        header: m['admin.generations.mode'](),
        cell: (g) => (
          <div className="text-sm">
            <div>{g.mode || '—'}</div>
            <div className="text-muted-foreground text-xs">
              {[g.resolution, g.aspectRatio].filter(Boolean).join(' · ') || '—'}
            </div>
            <div className="text-muted-foreground mt-1 text-[11px]">
              {g.scene === 'hotel-lobby'
                ? m['admin.generations.scene.hotel_lobby']()
                : m['admin.generations.scene.genjutsu']()}
            </div>
          </div>
        ),
      },
      {
        header: m['admin.generations.status'](),
        cell: (g) => (
          <div className="max-w-[260px]">
            <Badge variant={statusVariant(g.status)}>{g.status}</Badge>
            {g.attemptStage ? (
              <div className="text-muted-foreground mt-1 text-xs">
                stage: {g.attemptStage}
              </div>
            ) : null}
            {g.failureStage ? (
              <div className="text-muted-foreground mt-1 text-xs">
                failed at: {g.failureStage}
              </div>
            ) : null}
            {g.errorCode || g.providerCode ? (
              <div className="text-muted-foreground mt-1 font-mono text-xs">
                {[g.errorCode, g.providerCode].filter(Boolean).join(' · ')}
                {g.errorFileType
                  ? ` · ${g.errorFileType}${g.errorFileIndex != null ? ` #${g.errorFileIndex}` : ''}`
                  : ''}
                {g.errorHttpStatus != null
                  ? ` · HTTP ${g.errorHttpStatus}`
                  : ''}
              </div>
            ) : null}
            {g.uploadAttemptCount != null ||
            g.uploadElapsedMs != null ||
            g.r2ObjectExists != null ||
            g.r2InspectionStatus ||
            g.uploadRecovered ||
            g.uploadRetrySuccessCount ||
            g.uploadBrowser ||
            g.uploadOs ? (
              <div
                className="text-muted-foreground mt-1 font-mono text-xs"
                title={g.r2InspectionError || undefined}
              >
                {[
                  g.uploadAttemptCount != null
                    ? `${g.uploadAttemptCount}x`
                    : null,
                  g.uploadElapsedMs != null ? `${g.uploadElapsedMs}ms` : null,
                  g.r2InspectionStatus === 'error'
                    ? 'r2 inspect error'
                    : g.r2InspectionStatus === 'skipped'
                      ? 'r2 inspect skipped'
                      : g.r2ObjectExists == null
                        ? null
                        : g.r2ObjectExists
                          ? g.r2ObjectSizeMatches === false
                            ? 'r2 size mismatch'
                            : g.r2ObjectTypeMatches === false
                              ? 'r2 type mismatch'
                              : 'r2 exists'
                          : 'r2 missing',
                  g.uploadRecovered ? 'recovered' : null,
                  g.uploadRetrySuccessCount
                    ? `retry-ok ${g.uploadRetrySuccessCount}`
                    : null,
                  [g.uploadBrowser, g.uploadOs].filter(Boolean).join('/'),
                  g.uploadOnline == null
                    ? null
                    : g.uploadOnline
                      ? 'online'
                      : 'offline',
                ]
                  .filter(Boolean)
                  .join(' · ')}
              </div>
            ) : null}
            {g.error ? (
              <div
                className="text-muted-foreground mt-1 truncate text-xs"
                title={g.error}
              >
                {g.error}
              </div>
            ) : g.providerStatus ? (
              <div className="text-muted-foreground mt-1 text-xs">
                {g.providerStatus}
              </div>
            ) : null}
          </div>
        ),
      },
      {
        header: m['admin.generations.cost'](),
        className: 'w-[130px]',
        cell: (g) => (
          <CreditsCostCell
            costCredits={g.costCredits}
            estimatedCredits={g.estimatedCredits}
            providerCostUsd={g.providerCostUsd}
          />
        ),
      },
      {
        header: m['admin.generations.created_at'](),
        cell: (g) => (
          <span className="text-muted-foreground text-sm">
            {formatDateTime(g.createdAt)}
          </span>
        ),
      },
      {
        header: '',
        className: 'w-[92px]',
        cell: (g) => (
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => onOpenDetail(g)}
          >
            <Eye className="mr-1 size-3.5" />
            {m['admin.generations.view']()}
          </Button>
        ),
      },
    ],
    [onOpenDetail, onOpenPreview]
  );

  return (
    <Card>
      <CardContent>
        <DataTable
          columns={columns}
          data={query.data?.items ?? []}
          total={query.data?.total ?? 0}
          page={page}
          pageSize={PAGE_SIZE}
          onPageChange={setPage}
          rowKey={(g) => g.id}
          emptyText={m['admin.generations.empty']()}
          search={search}
          onSearchChange={setSearch}
          searchPlaceholder={m['admin.generations.search_placeholder']()}
          toolbar={
            <div className="flex gap-2">
              <Select
                value={scene}
                onValueChange={(value) => setScene(value || 'all')}
              >
                <SelectTrigger className="h-8 w-[140px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">
                    {m['admin.generations.all_scenes']()}
                  </SelectItem>
                  <SelectItem value="genjutsu">
                    {m['admin.generations.scene.genjutsu']()}
                  </SelectItem>
                  <SelectItem value="hotel-lobby">
                    {m['admin.generations.scene.hotel_lobby']()}
                  </SelectItem>
                </SelectContent>
              </Select>
              <Select
                value={provider}
                onValueChange={(value) => setProvider(value || 'all')}
              >
                <SelectTrigger className="h-8 w-[130px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">
                    {m['admin.generations.all_providers']()}
                  </SelectItem>
                  <SelectItem value="seedance">Seedance</SelectItem>
                  <SelectItem value="higgsfield">Higgsfield</SelectItem>
                  <SelectItem value="fal">Fal</SelectItem>
                </SelectContent>
              </Select>
              <Select
                value={status}
                onValueChange={(value) => setStatus(value || 'all')}
              >
                <SelectTrigger className="h-8 w-[170px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">
                    {m['admin.generations.all_statuses']()}
                  </SelectItem>
                  {STATUSES.map((item) => (
                    <SelectItem key={item} value={item}>
                      {item}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          }
          onRefresh={() => query.refetch()}
          loading={query.isFetching}
        />
      </CardContent>
    </Card>
  );
});

function GenerationsPage() {
  const [preview, setPreview] = useState<VideoPreview | null>(null);
  const [detail, setDetail] = useState<Generation | null>(null);
  const [probedSourceDuration, setProbedSourceDuration] = useState<
    number | null
  >(null);

  useEffect(() => {
    setProbedSourceDuration(null);
  }, [detail?.id]);

  const detailEstimatedCredits = useMemo(() => {
    if (!detail) return null;
    if (detail.estimatedCredits != null && detail.estimatedCredits > 0) {
      return detail.estimatedCredits;
    }
    return estimateCreditsFromSource({
      durationSeconds: detail.sourceDurationSeconds ?? probedSourceDuration,
      resolution: detail.resolution,
      providerCostUsd: detail.providerCostUsd,
    });
  }, [detail, probedSourceDuration]);

  const activePreviewUrl =
    preview?.view === 'after'
      ? preview.resultUrl || preview.sourceUrl
      : preview?.sourceUrl || preview?.resultUrl;
  const canToggle = Boolean(preview?.sourceUrl) && Boolean(preview?.resultUrl);

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold">{m['admin.generations.title']()}</h1>
        <p className="text-muted-foreground">
          {m['admin.generations.description']()}
        </p>
      </div>

      <GenerationsTable onOpenPreview={setPreview} onOpenDetail={setDetail} />

      <Dialog
        open={Boolean(detail)}
        onOpenChange={(open) => {
          if (!open) setDetail(null);
        }}
      >
        <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-6xl">
          <DialogHeader>
            <DialogTitle>{m['admin.generations.details']()}</DialogTitle>
          </DialogHeader>

          {detail ? (
            <div className="space-y-6">
              <div className="grid gap-4 rounded-lg border p-4 text-sm md:grid-cols-2 xl:grid-cols-4">
                <div>
                  <div className="text-muted-foreground text-xs">User</div>
                  <div className="mt-1 flex items-center gap-1.5 font-medium">
                    <span>{detail.userName || '—'}</span>
                    {detail.isPaid ? (
                      <Crown
                        className="size-3.5 shrink-0 text-amber-500"
                        aria-label={m['admin.generations.paid_user']()}
                      />
                    ) : null}
                  </div>
                  <div className="text-muted-foreground text-xs break-all">
                    {detail.userEmail}
                  </div>
                </div>
                <div>
                  <div className="text-muted-foreground text-xs">
                    {m['admin.generations.identifiers']()}
                  </div>
                  <div className="mt-1 font-mono text-xs break-all">
                    generation: {detail.id}
                  </div>
                  <div className="text-muted-foreground mt-1 font-mono text-xs break-all">
                    request: {detail.taskId || '—'}
                  </div>
                </div>
                <div>
                  <div className="text-muted-foreground text-xs">
                    {m['admin.generations.provider']()}
                  </div>
                  <div className="mt-1">{detail.provider || '—'}</div>
                  <div className="text-muted-foreground text-xs">
                    {detail.model || '—'}
                  </div>
                  <div className="text-muted-foreground mt-1 text-xs">
                    {detail.scene === 'hotel-lobby'
                      ? m['admin.generations.scene.hotel_lobby']()
                      : m['admin.generations.scene.genjutsu']()}
                  </div>
                </div>
                <div>
                  <div className="text-muted-foreground text-xs">
                    {m['admin.generations.mode']()}
                  </div>
                  <div className="mt-1">{detail.mode || '—'}</div>
                  <div className="text-muted-foreground text-xs">
                    {m['admin.generations.requested_resolution']()}:{' '}
                    {[detail.resolution, detail.aspectRatio]
                      .filter(Boolean)
                      .join(' · ') || '—'}
                  </div>
                </div>
                <div>
                  <div className="text-muted-foreground text-xs">
                    {m['admin.generations.status']()}
                  </div>
                  <div className="mt-1">
                    <Badge variant={statusVariant(detail.status)}>
                      {detail.status}
                    </Badge>
                  </div>
                  {detail.status === 'submission_unknown' ? (
                    <div className="text-destructive mt-1 text-xs">
                      {m['admin.generations.submission_unknown_hint']()}
                    </div>
                  ) : null}
                  <div className="text-muted-foreground mt-1 text-xs">
                    stage: {detail.attemptStage || '—'}
                  </div>
                </div>
                <div>
                  <div className="text-muted-foreground text-xs">
                    {m['admin.generations.cost']()}
                  </div>
                  <div className="mt-1">
                    <CreditsCostCell
                      costCredits={detail.costCredits}
                      estimatedCredits={detailEstimatedCredits}
                      providerCostUsd={detail.providerCostUsd}
                    />
                  </div>
                </div>
                <div>
                  <div className="text-muted-foreground text-xs">
                    {m['admin.generations.duration']()}
                  </div>
                  <div className="mt-1 font-mono">
                    {(detail.sourceDurationSeconds ?? probedSourceDuration) ==
                    null
                      ? '—'
                      : `${(detail.sourceDurationSeconds ??
                          probedSourceDuration)!.toFixed(2)}s`}
                  </div>
                </div>
                <div>
                  <div className="text-muted-foreground text-xs">
                    {m['admin.generations.timeline']()}
                  </div>
                  <div className="mt-1 text-xs">
                    {formatDateTime(detail.createdAt)}
                  </div>
                  <div className="text-muted-foreground mt-1 text-xs">
                    updated {formatDateTime(detail.updatedAt)}
                  </div>
                </div>
              </div>

              <div>
                <div className="text-sm font-medium">
                  {m['admin.generations.prompt']()}
                </div>
                <div className="bg-muted/40 mt-2 rounded-lg border p-3 text-sm break-words whitespace-pre-wrap">
                  {detail.prompt || '—'}
                </div>
              </div>

              {detail.uploadAttemptCount != null ||
              detail.uploadErrorMessage ||
              detail.uploadBrowser ||
              detail.uploadOs ||
              detail.uploadHost ||
              detail.uploadCfCountry ? (
                <div className="space-y-3 rounded-lg border p-4 text-sm">
                  <div className="font-medium">Upload diagnostics</div>

                  <div className="grid gap-x-6 gap-y-3 md:grid-cols-2 xl:grid-cols-4">
                    <div>
                      <div className="text-muted-foreground text-xs">
                        Client
                      </div>
                      <div className="mt-1 font-mono text-xs">
                        {[
                          detail.uploadBrowser
                            ? `${detail.uploadBrowser}${detail.uploadBrowserMajor != null ? ` ${detail.uploadBrowserMajor}` : ''}`
                            : null,
                          detail.uploadOs,
                          detail.uploadIsWebView ? 'WebView' : null,
                          detail.uploadInAppBrowser
                            ? `in-app: ${detail.uploadInAppBrowser}`
                            : null,
                        ]
                          .filter(Boolean)
                          .join(' · ') || '—'}
                      </div>
                    </div>

                    <div>
                      <div className="text-muted-foreground text-xs">
                        Network
                      </div>
                      <div className="mt-1 font-mono text-xs">
                        {[
                          detail.uploadOnline == null
                            ? null
                            : detail.uploadOnline
                              ? 'online'
                              : 'offline',
                          detail.uploadEffectiveType,
                          detail.uploadRttMs != null
                            ? `RTT ${detail.uploadRttMs}ms`
                            : null,
                          detail.uploadDownlinkMbps != null
                            ? `${detail.uploadDownlinkMbps} Mbps`
                            : null,
                        ]
                          .filter(Boolean)
                          .join(' · ') || '—'}
                      </div>
                    </div>

                    <div>
                      <div className="text-muted-foreground text-xs">Route</div>
                      <div className="mt-1 font-mono text-xs break-all">
                        origin: {detail.uploadOrigin || '—'}
                      </div>
                      <div className="text-muted-foreground mt-1 font-mono text-xs break-all">
                        host: {detail.uploadHost || '—'}
                      </div>
                    </div>

                    <div>
                      <div className="text-muted-foreground text-xs">
                        Cloudflare edge
                      </div>
                      <div className="mt-1 font-mono text-xs">
                        {[
                          detail.uploadCfCountry,
                          detail.uploadCfColo,
                          detail.uploadCfAsn != null
                            ? `AS${detail.uploadCfAsn}`
                            : null,
                        ]
                          .filter(Boolean)
                          .join(' · ') || '—'}
                      </div>
                    </div>
                  </div>

                  <div className="bg-muted/40 rounded-md p-3 font-mono text-xs">
                    <div>
                      error:{' '}
                      {[detail.uploadErrorName, detail.uploadErrorMessage]
                        .filter(Boolean)
                        .join(' · ') || '—'}
                    </div>
                    <div className="text-muted-foreground mt-1">
                      total:{' '}
                      {[
                        detail.uploadAttemptCount != null
                          ? `${detail.uploadAttemptCount} attempts`
                          : null,
                        detail.uploadElapsedMs != null
                          ? `${detail.uploadElapsedMs}ms`
                          : null,
                        detail.r2InspectionStatus
                          ? `R2 ${detail.r2InspectionStatus}`
                          : null,
                      ]
                        .filter(Boolean)
                        .join(' · ') || '—'}
                    </div>
                  </div>

                  {detail.uploadAttempts.length ? (
                    <div className="overflow-x-auto rounded-md border">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-muted/50">
                          <tr>
                            <th className="px-3 py-2 font-medium">Attempt</th>
                            <th className="px-3 py-2 font-medium">Elapsed</th>
                            <th className="px-3 py-2 font-medium">Status</th>
                            <th className="px-3 py-2 font-medium">Error</th>
                          </tr>
                        </thead>
                        <tbody>
                          {detail.uploadAttempts.map((attempt) => (
                            <tr key={attempt.attempt} className="border-t">
                              <td className="px-3 py-2">#{attempt.attempt}</td>
                              <td className="px-3 py-2">
                                {attempt.elapsedMs}ms
                              </td>
                              <td className="px-3 py-2">
                                {attempt.httpStatus != null
                                  ? `HTTP ${attempt.httpStatus}`
                                  : 'network'}
                              </td>
                              <td className="px-3 py-2">
                                {[attempt.errorName, attempt.errorMessage]
                                  .filter(Boolean)
                                  .join(' · ') || '—'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : null}
                </div>
              ) : null}

              <div className="space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="text-sm font-medium">
                    {m['admin.generations.input_media']()}
                  </div>
                  <div className="text-muted-foreground text-xs">
                    {detail.inputMedia.length} file
                    {detail.inputMedia.length === 1 ? '' : 's'}
                  </div>
                </div>

                {detail.inputMedia.length ? (
                  <div className="grid gap-4 lg:grid-cols-2">
                    {detail.inputMedia.map((media) => (
                      <UploadedMediaCard
                        key={media.index}
                        media={media}
                        label={
                          media.kind === 'video'
                            ? m['admin.generations.source_video']()
                            : m['admin.generations.reference_image']({
                                index: media.index,
                              })
                        }
                        onDuration={
                          media.kind === 'video'
                            ? setProbedSourceDuration
                            : undefined
                        }
                      />
                    ))}
                  </div>
                ) : (
                  <div className="text-muted-foreground rounded-lg border p-4 text-sm">
                    No uploaded media metadata is available for this record.
                  </div>
                )}
              </div>

              {detail.videoUrl ? (
                <div className="space-y-2">
                  <div className="text-sm font-medium">
                    {m['admin.generations.generated_video']()}
                  </div>
                  <video
                    src={detail.videoUrl}
                    controls
                    playsInline
                    preload="metadata"
                    className="max-h-[560px] w-full rounded-lg bg-black object-contain"
                  />
                </div>
              ) : null}
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(preview)}
        onOpenChange={(open) => {
          if (!open) setPreview(null);
        }}
      >
        <DialogContent
          className="overflow-hidden p-0 sm:max-w-4xl"
          showCloseButton
        >
          <DialogHeader className="space-y-3 px-4 pt-4 pr-12">
            <DialogTitle>
              {preview?.view === 'before'
                ? m['admin.generations.before']()
                : m['admin.generations.after']()}
            </DialogTitle>
            {canToggle ? (
              <div className="bg-muted flex w-fit gap-1 rounded-lg p-1">
                <Button
                  type="button"
                  size="sm"
                  variant={preview?.view === 'before' ? 'default' : 'ghost'}
                  className={cn(
                    'h-7 px-3',
                    preview?.view !== 'before' && 'text-muted-foreground'
                  )}
                  onClick={() =>
                    setPreview((current) =>
                      current ? { ...current, view: 'before' } : current
                    )
                  }
                >
                  {m['admin.generations.before']()}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={preview?.view === 'after' ? 'default' : 'ghost'}
                  className={cn(
                    'h-7 px-3',
                    preview?.view !== 'after' && 'text-muted-foreground'
                  )}
                  onClick={() =>
                    setPreview((current) =>
                      current ? { ...current, view: 'after' } : current
                    )
                  }
                >
                  {m['admin.generations.after']()}
                </Button>
              </div>
            ) : null}
          </DialogHeader>
          {activePreviewUrl ? (
            <video
              key={`${preview?.view}-${activePreviewUrl}`}
              src={activePreviewUrl}
              controls
              autoPlay
              playsInline
              className="max-h-[75vh] w-full bg-black object-contain"
            />
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}

export const Route = createFileRoute('/admin/generations')({
  component: GenerationsPage,
});
