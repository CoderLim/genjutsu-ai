import { useEffect, useState } from 'react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { createFileRoute } from '@tanstack/react-router';
import { Eye, Film, ImageIcon, Play } from 'lucide-react';

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
  provider: string;
  model: string;
  prompt: string;
  mode: string | null;
  resolution: string | null;
  status: string;
  attemptStage: string | null;
  taskId: string | null;
  providerStatus: string | null;
  failureStage: string | null;
  errorCode: string | null;
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

function UploadedMediaCard({
  media,
  label,
}: {
  media: GenerationInputMedia;
  label: string;
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
        <div className="border-t px-3 py-2 text-xs text-destructive">
          Media could not be loaded (the R2 object may be missing or unavailable).
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

function GenerationsPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [provider, setProvider] = useState('all');
  const [preview, setPreview] = useState<VideoPreview | null>(null);
  const [detail, setDetail] = useState<Generation | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, status, provider]);

  const query = useQuery({
    queryKey: ['admin-generations', page, debouncedSearch, status, provider],
    queryFn: () => {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: String(PAGE_SIZE),
      });
      if (debouncedSearch) params.set('search', debouncedSearch);
      if (status !== 'all') params.set('status', status);
      if (provider !== 'all') params.set('provider', provider);
      return apiGet<PageResult<Generation>>(
        `/api/admin/generations?${params.toString()}`
      );
    },
    placeholderData: keepPreviousData,
  });

  const activePreviewUrl =
    preview?.view === 'after'
      ? preview.resultUrl || preview.sourceUrl
      : preview?.sourceUrl || preview?.resultUrl;
  const canToggle = Boolean(preview?.sourceUrl) && Boolean(preview?.resultUrl);

  const columns: Column<Generation>[] = [
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
          <button
            type="button"
            onClick={() => setPreview(openPreviewFor(g))}
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
      },
    },
    {
      header: m['admin.generations.user'](),
      cell: (g) => (
        <div className="min-w-[180px]">
          <div className="font-medium">{g.userName || '—'}</div>
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
            {g.resolution || '—'}
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
          {g.errorCode ? (
            <div className="text-muted-foreground mt-1 font-mono text-xs">
              {g.errorCode}
              {g.errorFileType
                ? ` · ${g.errorFileType}${g.errorFileIndex != null ? ` #${g.errorFileIndex}` : ''}`
                : ''}
              {g.errorHttpStatus != null ? ` · HTTP ${g.errorHttpStatus}` : ''}
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
        <div className="text-sm tabular-nums">
          <div>{g.costCredits.toLocaleString()} cr</div>
          <div className="text-muted-foreground text-xs">
            {g.providerCostUsd == null
              ? '—'
              : `$${g.providerCostUsd.toFixed(4)}`}
          </div>
        </div>
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
          onClick={() => setDetail(g)}
        >
          <Eye className="mr-1 size-3.5" />
          {m['admin.generations.view']()}
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold">{m['admin.generations.title']()}</h1>
        <p className="text-muted-foreground">
          {m['admin.generations.description']()}
        </p>
      </div>

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
                  <div className="mt-1 font-medium">{detail.userName || '—'}</div>
                  <div className="text-muted-foreground break-all text-xs">
                    {detail.userEmail}
                  </div>
                </div>
                <div>
                  <div className="text-muted-foreground text-xs">
                    {m['admin.generations.identifiers']()}
                  </div>
                  <div className="mt-1 break-all font-mono text-xs">
                    generation: {detail.id}
                  </div>
                  <div className="text-muted-foreground mt-1 break-all font-mono text-xs">
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
                </div>
                <div>
                  <div className="text-muted-foreground text-xs">
                    {m['admin.generations.mode']()}
                  </div>
                  <div className="mt-1">{detail.mode || '—'}</div>
                  <div className="text-muted-foreground text-xs">
                    {m['admin.generations.requested_resolution']()}:{' '}
                    {detail.resolution || '—'}
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
                  <div className="text-muted-foreground mt-1 text-xs">
                    stage: {detail.attemptStage || '—'}
                  </div>
                </div>
                <div>
                  <div className="text-muted-foreground text-xs">
                    {m['admin.generations.cost']()}
                  </div>
                  <div className="mt-1 tabular-nums">
                    {detail.costCredits.toLocaleString()} cr
                  </div>
                  <div className="text-muted-foreground text-xs tabular-nums">
                    {detail.providerCostUsd == null
                      ? '—'
                      : `${detail.providerCostUsd.toFixed(4)}`}
                  </div>
                </div>
                <div>
                  <div className="text-muted-foreground text-xs">
                    {m['admin.generations.duration']()}
                  </div>
                  <div className="mt-1 font-mono">
                    {detail.sourceDurationSeconds == null
                      ? '—'
                      : `${detail.sourceDurationSeconds.toFixed(2)}s`}
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
                <div className="bg-muted/40 mt-2 whitespace-pre-wrap break-words rounded-lg border p-3 text-sm">
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
                      <div className="text-muted-foreground text-xs">Client</div>
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
                      <div className="text-muted-foreground text-xs">Network</div>
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
                      <div className="mt-1 break-all font-mono text-xs">
                        origin: {detail.uploadOrigin || '—'}
                      </div>
                      <div className="text-muted-foreground mt-1 break-all font-mono text-xs">
                        host: {detail.uploadHost || '—'}
                      </div>
                    </div>

                    <div>
                      <div className="text-muted-foreground text-xs">Cloudflare edge</div>
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

                  <div className="rounded-md bg-muted/40 p-3 font-mono text-xs">
                    <div>
                      error:{' '}
                      {[
                        detail.uploadErrorName,
                        detail.uploadErrorMessage,
                      ]
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
                              <td className="px-3 py-2">{attempt.elapsedMs}ms</td>
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
