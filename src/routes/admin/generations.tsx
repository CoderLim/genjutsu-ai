import { useEffect, useState } from 'react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { createFileRoute } from '@tanstack/react-router';
import { Film, Play } from 'lucide-react';

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
  uploadOs: string | null;
  uploadOnline: boolean | null;
  r2ObjectExists: boolean | null;
  r2ObjectSizeMatches: boolean | null;
  uploadRecovered: boolean | null;
  error: string | null;
  costCredits: number;
  providerCostUsd: number | null;
  sourceDurationSeconds: number | null;
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

function GenerationsPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [provider, setProvider] = useState('all');
  const [preview, setPreview] = useState<VideoPreview | null>(null);

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
          g.uploadBrowser ||
          g.uploadOs ? (
            <div className="text-muted-foreground mt-1 font-mono text-xs">
              {[
                g.uploadAttemptCount != null
                  ? `${g.uploadAttemptCount}x`
                  : null,
                g.uploadElapsedMs != null ? `${g.uploadElapsedMs}ms` : null,
                g.r2ObjectExists == null
                  ? null
                  : g.r2ObjectExists
                    ? g.r2ObjectSizeMatches === false
                      ? 'r2 size mismatch'
                      : 'r2 exists'
                    : 'r2 missing',
                g.uploadRecovered ? 'recovered' : null,
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
