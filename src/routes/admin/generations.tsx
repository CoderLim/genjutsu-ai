import { useEffect, useState } from 'react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { createFileRoute } from '@tanstack/react-router';

import { apiGet, type PageResult } from '@/lib/api-client';
import { formatDateTime } from '@/lib/time';
import { m } from '@/paraglide/messages.js';
import { DataTable, type Column } from '@/components/data-table';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
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
  taskId: string | null;
  costCredits: number;
  providerCostUsd: number | null;
  sourceDurationSeconds: number | null;
  createdAt: string;
  updatedAt: string;
}

const PAGE_SIZE = 20;
const STATUSES = [
  'initiated',
  'insufficient_credits',
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
  if (status === 'refunded' || status === 'submission_unknown') {
    return 'destructive';
  }
  return 'secondary';
}

function GenerationsPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [provider, setProvider] = useState('all');

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

  const columns: Column<Generation>[] = [
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
      header: m['admin.generations.generation'](),
      cell: (g) => (
        <div className="max-w-[220px]">
          <div className="font-mono text-xs">{g.id}</div>
          {g.prompt ? (
            <div
              className="text-muted-foreground mt-1 truncate text-xs"
              title={g.prompt}
            >
              {g.prompt}
            </div>
          ) : null}
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
      header: m['admin.generations.provider'](),
      cell: (g) => (
        <div className="max-w-[220px] text-sm">
          <div className="font-medium">{g.provider}</div>
          <div className="text-muted-foreground truncate text-xs" title={g.model}>
            {g.model}
          </div>
        </div>
      ),
    },
    {
      header: m['admin.generations.status'](),
      cell: (g) => (
        <Badge variant={statusVariant(g.status)}>{g.status}</Badge>
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
      header: m['admin.generations.duration'](),
      className: 'w-[90px]',
      cell: (g) =>
        g.sourceDurationSeconds == null
          ? '—'
          : `${g.sourceDurationSeconds.toFixed(1)}s`,
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
    </div>
  );
}

export const Route = createFileRoute('/admin/generations')({
  component: GenerationsPage,
});
