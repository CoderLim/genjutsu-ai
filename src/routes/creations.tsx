import { useState } from 'react';
import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { createFileRoute } from '@tanstack/react-router';
import { Film, LoaderCircle, Play, RefreshCw, Sparkles } from 'lucide-react';

import { useSession } from '@/core/auth/client';
import { Link } from '@/core/i18n/navigation';
import { apiGet, type PageResult } from '@/lib/api-client';
import { formatDateTime } from '@/lib/time';
import { cn } from '@/lib/utils';
import { m } from '@/paraglide/messages.js';
import { SiteFooter } from '@/components/landing/SiteFooter';
import { SiteHeader } from '@/components/landing/SiteHeader';
import { Badge } from '@/components/ui/badge';
import { Button, buttonVariants } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface Generation {
  id: string;
  scene: string;
  prompt: string;
  status: string;
  mode: string | null;
  resolution: string | null;
  aspectRatio: string | null;
  duration: number | null;
  costCredits: number;
  sourceVideoUrl: string | null;
  videoUrl: string | null;
  createdAt: string;
  updatedAt: string;
}

interface GenerationStatus {
  status: string;
}

interface VideoPreview {
  url: string;
  title: string;
}

const PAGE_SIZE = 12;

function statusLabel(status: string) {
  if (status === 'completed') return m['creations.status.completed']();
  if (
    status === 'refunded' ||
    status === 'failed_preflight' ||
    status === 'insufficient_credits'
  ) {
    return m['creations.status.failed']();
  }
  if (
    status === 'initiated' ||
    status === 'sealing' ||
    status === 'ready' ||
    status === 'reserving' ||
    status === 'reserved' ||
    status === 'submitting' ||
    status === 'submitted' ||
    status === 'completing' ||
    status === 'submission_unknown' ||
    status === 'refunding'
  ) {
    return m['creations.status.processing']();
  }
  return m['creations.status.unknown']();
}

function statusVariant(status: string) {
  if (status === 'completed') return 'default' as const;
  if (
    status === 'refunded' ||
    status === 'failed_preflight' ||
    status === 'insufficient_credits'
  ) {
    return 'destructive' as const;
  }
  return 'secondary' as const;
}

function VideoThumb({
  src,
  label,
  onOpen,
  className,
}: {
  src: string;
  label: string;
  onOpen: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label={m['creations.open_video']()}
      className={cn(
        'group relative block size-full overflow-hidden bg-black text-left',
        className
      )}
    >
      <video
        src={src}
        muted
        playsInline
        preload="metadata"
        className="size-full object-cover transition duration-200 group-hover:scale-[1.02]"
      />
      <span className="pointer-events-none absolute inset-x-0 bottom-0 bg-linear-to-t from-black/70 to-transparent px-2 py-1.5 text-[11px] font-medium text-white">
        {label}
      </span>
      <span className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/0 transition group-hover:bg-black/25">
        <span className="bg-background/90 text-foreground flex size-9 items-center justify-center rounded-full opacity-0 shadow transition group-hover:opacity-100">
          <Play className="size-4 fill-current" />
        </span>
      </span>
    </button>
  );
}

function GenerationCard({
  generation,
  onRefresh,
  refreshing,
  onPreview,
}: {
  generation: Generation;
  onRefresh: (generation: Generation) => void;
  refreshing: boolean;
  onPreview: (preview: VideoPreview) => void;
}) {
  const completed = generation.status === 'completed' && generation.videoUrl;
  const failed =
    generation.status === 'refunded' ||
    generation.status === 'failed_preflight' ||
    generation.status === 'insufficient_credits';
  const sourceUrl = generation.sourceVideoUrl;
  const resultUrl = generation.videoUrl;

  return (
    <Card className="overflow-hidden py-0">
      <div className="bg-muted relative aspect-video overflow-hidden">
        {completed && sourceUrl && resultUrl ? (
          <div className="grid size-full grid-cols-2">
            <VideoThumb
              src={sourceUrl}
              label={m['creations.source_video']()}
              onOpen={() =>
                onPreview({
                  url: sourceUrl,
                  title: m['creations.source_video'](),
                })
              }
            />
            <VideoThumb
              src={resultUrl}
              label={m['creations.generated_video']()}
              onOpen={() =>
                onPreview({
                  url: resultUrl,
                  title: m['creations.generated_video'](),
                })
              }
            />
          </div>
        ) : completed && resultUrl ? (
          <VideoThumb
            src={resultUrl}
            label={m['creations.generated_video']()}
            onOpen={() =>
              onPreview({
                url: resultUrl,
                title: m['creations.generated_video'](),
              })
            }
          />
        ) : failed && sourceUrl ? (
          <VideoThumb
            src={sourceUrl}
            label={m['creations.source_video']()}
            onOpen={() =>
              onPreview({
                url: sourceUrl,
                title: m['creations.source_video'](),
              })
            }
          />
        ) : (
          <div className="text-muted-foreground flex size-full flex-col items-center justify-center gap-3 p-6 text-center">
            {failed ? (
              <Film className="size-9 opacity-60" />
            ) : (
              <LoaderCircle className="size-9 animate-spin opacity-60" />
            )}
            <span className="text-sm font-medium">
              {statusLabel(generation.status)}
            </span>
          </div>
        )}
        <Badge
          variant={statusVariant(generation.status)}
          className="absolute top-3 right-3 z-10"
        >
          {statusLabel(generation.status)}
        </Badge>
      </div>

      <CardContent className="space-y-4 p-4">
        <div className="min-w-0">
          <h2
            className="line-clamp-2 min-h-10 text-sm font-semibold"
            title={generation.prompt || undefined}
          >
            {generation.prompt || m['creations.untitled']()}
          </h2>
          <div className="text-muted-foreground mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs">
            <span>
              {generation.scene === 'hotel-lobby'
                ? m['creations.scene.hotel_lobby']()
                : m['creations.scene.genjutsu']()}
            </span>
            {generation.mode ? <span>{generation.mode}</span> : null}
            {generation.resolution ? (
              <span>{generation.resolution}</span>
            ) : null}
            {generation.aspectRatio ? (
              <span>{generation.aspectRatio}</span>
            ) : null}
            {generation.duration != null ? (
              <span>{generation.duration}s</span>
            ) : null}
            <span>
              {m['creations.credits']({ count: generation.costCredits })}
            </span>
          </div>
        </div>

        <div className="text-muted-foreground flex items-center justify-between gap-3 text-xs">
          <span>{formatDateTime(generation.createdAt)}</span>
          <span className="font-mono">{generation.id.slice(0, 8)}</span>
        </div>

        <div className="flex gap-2">
          {completed && resultUrl ? (
            <Button
              variant="outline"
              onClick={() =>
                onPreview({
                  url: resultUrl,
                  title: m['creations.generated_video'](),
                })
              }
            >
              <Play className="size-4" />
              {m['creations.view_video']()}
            </Button>
          ) : failed ? (
            <Link href="/" className={buttonVariants({ variant: 'outline' })}>
              <Sparkles className="size-4" />
              {m['creations.create']()}
            </Link>
          ) : (
            <Button
              variant="outline"
              onClick={() => onRefresh(generation)}
              disabled={refreshing}
            >
              <RefreshCw
                className={refreshing ? 'size-4 animate-spin' : 'size-4'}
              />
              {refreshing
                ? m['creations.refreshing']()
                : m['creations.refresh_status']()}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function CreationsPage() {
  const [page, setPage] = useState(1);
  const [preview, setPreview] = useState<VideoPreview | null>(null);
  const { data: session, isPending: sessionPending } = useSession();
  const queryClient = useQueryClient();
  const userId = session?.user?.id;

  const query = useQuery({
    queryKey: ['user-generations', userId, page],
    queryFn: () =>
      apiGet<PageResult<Generation>>(
        `/api/user/generations?page=${page}&pageSize=${PAGE_SIZE}`
      ),
    enabled: Boolean(userId),
    placeholderData: keepPreviousData,
  });

  const refreshMutation = useMutation({
    mutationFn: (generation: Generation) => {
      const statusPath =
        generation.scene === 'hotel-lobby'
          ? `/api/hotel-lobby/status?generationId=${encodeURIComponent(generation.id)}`
          : `/api/genjutsu/status?generationId=${encodeURIComponent(generation.id)}`;
      return apiGet<GenerationStatus>(statusPath);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-generations', userId] });
    },
  });

  const total = query.data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="bg-background text-foreground flex min-h-screen flex-col">
      <SiteHeader />
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-10 md:px-5 md:py-14">
        <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              {m['creations.title']()}
            </h1>
            <p className="text-muted-foreground mt-2 max-w-2xl text-sm md:text-base">
              {m['creations.description']()}
            </p>
          </div>
          {userId ? (
            <Link href="/" className={buttonVariants()}>
              <Sparkles className="size-4" />
              {m['creations.create']()}
            </Link>
          ) : null}
        </div>

        {sessionPending ? (
          <div className="text-muted-foreground flex min-h-64 items-center justify-center">
            <LoaderCircle className="size-6 animate-spin" />
          </div>
        ) : !userId ? (
          <Card className="mx-auto max-w-xl">
            <CardContent className="flex flex-col items-center gap-4 p-8 text-center md:p-10">
              <Film className="text-muted-foreground size-10" />
              <div>
                <h2 className="text-xl font-semibold">
                  {m['creations.sign_in_title']()}
                </h2>
                <p className="text-muted-foreground mt-2 text-sm">
                  {m['creations.sign_in_description']()}
                </p>
              </div>
              <Link href="/sign-in" className={buttonVariants()}>
                {m['creations.sign_in']()}
              </Link>
            </CardContent>
          </Card>
        ) : query.isPending ? (
          <div className="text-muted-foreground flex min-h-64 items-center justify-center">
            <LoaderCircle className="size-6 animate-spin" />
          </div>
        ) : query.isError ? (
          <Card>
            <CardContent className="p-8 text-center">
              <p className="text-destructive text-sm">
                {m['creations.load_error']()}
              </p>
              <Button
                className="mt-4"
                variant="outline"
                onClick={() => query.refetch()}
              >
                <RefreshCw className="size-4" />
                {m['creations.refresh_status']()}
              </Button>
            </CardContent>
          </Card>
        ) : total === 0 ? (
          <Card>
            <CardContent className="flex min-h-72 flex-col items-center justify-center gap-4 p-8 text-center">
              <Film className="text-muted-foreground size-12" />
              <div>
                <h2 className="text-xl font-semibold">
                  {m['creations.empty_title']()}
                </h2>
                <p className="text-muted-foreground mt-2 text-sm">
                  {m['creations.empty_description']()}
                </p>
              </div>
              <Link href="/" className={buttonVariants()}>
                <Sparkles className="size-4" />
                {m['creations.create']()}
              </Link>
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {(query.data?.items ?? []).map((generation) => (
                <GenerationCard
                  key={generation.id}
                  generation={generation}
                  onPreview={setPreview}
                  onRefresh={(item) => refreshMutation.mutate(item)}
                  refreshing={
                    refreshMutation.isPending &&
                    refreshMutation.variables?.id === generation.id
                  }
                />
              ))}
            </div>

            {totalPages > 1 ? (
              <div className="mt-8 flex items-center justify-center gap-3">
                <Button
                  variant="outline"
                  disabled={page <= 1 || query.isFetching}
                  onClick={() => setPage((current) => Math.max(1, current - 1))}
                >
                  {m['creations.previous']()}
                </Button>
                <span className="text-muted-foreground text-sm">
                  {m['creations.page']({ page, pages: totalPages })}
                </span>
                <Button
                  variant="outline"
                  disabled={page >= totalPages || query.isFetching}
                  onClick={() =>
                    setPage((current) => Math.min(totalPages, current + 1))
                  }
                >
                  {m['creations.next']()}
                </Button>
              </div>
            ) : null}
          </>
        )}
      </main>
      <SiteFooter />

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
          <DialogHeader className="px-4 pt-4 pr-12">
            <DialogTitle>{preview?.title}</DialogTitle>
          </DialogHeader>
          {preview ? (
            <video
              key={preview.url}
              src={preview.url}
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

export const Route = createFileRoute('/creations')({
  head: () => ({
    meta: [
      { title: 'My Creations — Genjutsu AI' },
      {
        name: 'description',
        content:
          'View your Genjutsu AI video generations and their current status.',
      },
    ],
  }),
  component: CreationsPage,
});
