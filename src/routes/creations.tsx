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
import { m } from '@/paraglide/messages.js';
import { SiteFooter } from '@/components/landing/SiteFooter';
import { SiteHeader } from '@/components/landing/SiteHeader';
import { Badge } from '@/components/ui/badge';
import { Button, buttonVariants } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

interface Generation {
  id: string;
  prompt: string;
  status: string;
  mode: string | null;
  resolution: string | null;
  costCredits: number;
  videoUrl: string | null;
  createdAt: string;
  updatedAt: string;
}

interface GenerationStatus {
  status: string;
}

const PAGE_SIZE = 12;

function statusLabel(status: string) {
  if (status === 'completed') return m['creations.status.completed']();
  if (status === 'refunded' || status === 'insufficient_credits') {
    return m['creations.status.failed']();
  }
  if (
    status === 'initiated' ||
    status === 'reserving' ||
    status === 'reserved' ||
    status === 'submitting' ||
    status === 'submitted' ||
    status === 'submission_unknown' ||
    status === 'refunding'
  ) {
    return m['creations.status.processing']();
  }
  return m['creations.status.unknown']();
}

function statusVariant(status: string) {
  if (status === 'completed') return 'default' as const;
  if (status === 'refunded' || status === 'insufficient_credits') {
    return 'destructive' as const;
  }
  return 'secondary' as const;
}

function GenerationCard({
  generation,
  onRefresh,
  refreshing,
}: {
  generation: Generation;
  onRefresh: (id: string) => void;
  refreshing: boolean;
}) {
  const completed = generation.status === 'completed' && generation.videoUrl;
  const failed =
    generation.status === 'refunded' ||
    generation.status === 'insufficient_credits';

  return (
    <Card className="overflow-hidden py-0">
      <div className="bg-muted relative aspect-video overflow-hidden">
        {completed ? (
          <video
            src={generation.videoUrl || undefined}
            controls
            playsInline
            preload="metadata"
            className="size-full object-cover"
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
          className="absolute top-3 right-3"
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
            {generation.mode ? <span>{generation.mode}</span> : null}
            {generation.resolution ? <span>{generation.resolution}</span> : null}
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
          {completed ? (
            <a
              href={generation.videoUrl || undefined}
              target="_blank"
              rel="noreferrer"
              className={buttonVariants({ variant: 'outline' })}
            >
              <Play className="size-4" />
              {m['creations.view_video']()}
            </a>
          ) : failed ? (
            <Link href="/" className={buttonVariants({ variant: 'outline' })}>
              <Sparkles className="size-4" />
              {m['creations.create']()}
            </Link>
          ) : (
            <Button
              variant="outline"
              onClick={() => onRefresh(generation.id)}
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
    mutationFn: (generationId: string) =>
      apiGet<GenerationStatus>(
        `/api/genjutsu/status?generationId=${encodeURIComponent(generationId)}`
      ),
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
                  onRefresh={(id) => refreshMutation.mutate(id)}
                  refreshing={
                    refreshMutation.isPending &&
                    refreshMutation.variables === generation.id
                  }
                />
              ))}
            </div>

            {totalPages > 1 ? (
              <div className="mt-8 flex items-center justify-center gap-3">
                <Button
                  variant="outline"
                  disabled={page <= 1 || query.isFetching}
                  onClick={() =>
                    setPage((current) => Math.max(1, current - 1))
                  }
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
