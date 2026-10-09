import { and, eq, isNull } from 'drizzle-orm';

import { FAL_QUERY_PERMANENT_ERROR_THRESHOLD } from '@/core/ai';
import { db } from '@/core/db';
import { aiTask } from '@/config/db/schema';

/**
 * D1 has no real transactions / FOR UPDATE (see withSqliteCompat in
 * create-db.ts). These helpers compare-and-swap on the exact prior
 * `taskResult` string and judge success via UPDATE rows-affected — never
 * via a post-write SELECT (that can mis-count under concurrent writers).
 */

const CAS_MAX_ATTEMPTS = 5;

/** Exported for unit tests — next consecutive permanent-error count. */
export function nextQueryPermanentErrorCount(
  taskResult: string | null | undefined
): number {
  const existing = parseJson(taskResult) ?? {};
  const previous =
    typeof existing.queryPermanentErrorCount === 'number'
      ? existing.queryPermanentErrorCount
      : 0;
  return previous + 1;
}

export function shouldParkQueryErrorsAsUnknown(count: number) {
  return count >= FAL_QUERY_PERMANENT_ERROR_THRESHOLD;
}

/** Normalize dialect-specific UPDATE result shapes to rows written. */
export function rowsAffectedFromUpdate(result: unknown): number {
  if (result == null) return 0;
  if (typeof result !== 'object') return 0;
  const r = result as Record<string, unknown>;
  const meta = r.meta;
  if (meta && typeof meta === 'object') {
    const changes = (meta as Record<string, unknown>).changes;
    if (typeof changes === 'number') return changes;
  }
  if (typeof r.changes === 'number') return r.changes;
  if (typeof r.rowsAffected === 'number') return r.rowsAffected;
  if (typeof r.rowCount === 'number') return r.rowCount;
  if (typeof r.affectedRows === 'number') return r.affectedRows;
  return 0;
}

function parseJson(value: string | null | undefined) {
  if (!value) return null;
  try {
    return JSON.parse(value) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function taskResultCasClause(previous: string | null) {
  return previous == null
    ? isNull(aiTask.taskResult)
    : eq(aiTask.taskResult, previous);
}

export async function applyAiTaskProviderQueryError(params: {
  scene: string;
  generationId: string;
  userId: string;
  error: string;
  providerStatus: string;
}): Promise<{ count: number; unresolved: boolean }> {
  const errorMessage =
    params.error ||
    'Provider status lookup failed permanently. Credits remain reserved.';

  for (let attempt = 0; attempt < CAS_MAX_ATTEMPTS; attempt += 1) {
    const [task] = await db()
      .select()
      .from(aiTask)
      .where(
        and(
          eq(aiTask.id, params.generationId),
          eq(aiTask.userId, params.userId),
          eq(aiTask.scene, params.scene)
        )
      )
      .limit(1);

    if (!task) {
      return { count: 0, unresolved: false };
    }

    if (task.status === 'submission_unknown') {
      const parked = parseJson(task.taskResult);
      const parkedCount =
        typeof parked?.queryPermanentErrorCount === 'number'
          ? parked.queryPermanentErrorCount
          : 0;
      return { count: parkedCount, unresolved: true };
    }

    if (task.status !== 'submitted') {
      return { count: 0, unresolved: false };
    }

    const previousResult =
      typeof task.taskResult === 'string' ? task.taskResult : null;
    const existing = parseJson(previousResult) ?? {};
    const count = nextQueryPermanentErrorCount(previousResult);

    if (shouldParkQueryErrorsAsUnknown(count)) {
      const nextResult = JSON.stringify({
        error: errorMessage,
        providerStatus: params.providerStatus,
        stage: 'provider_query',
        queryPermanentErrorCount: count,
      });

      const result = await db()
        .update(aiTask)
        .set({
          status: 'submission_unknown',
          taskResult: nextResult,
        })
        .where(
          and(
            eq(aiTask.id, params.generationId),
            eq(aiTask.userId, params.userId),
            eq(aiTask.scene, params.scene),
            eq(aiTask.status, 'submitted'),
            taskResultCasClause(previousResult)
          )
        );

      if (rowsAffectedFromUpdate(result) > 0) {
        return { count, unresolved: true };
      }

      // Lost CAS — another writer moved the row; re-read on next attempt.
      continue;
    }

    const nextResult = JSON.stringify({
      ...existing,
      queryPermanentErrorCount: count,
      lastQueryError: errorMessage,
      providerStatus: params.providerStatus,
      stage: 'provider_query',
    });

    const result = await db()
      .update(aiTask)
      .set({ taskResult: nextResult })
      .where(
        and(
          eq(aiTask.id, params.generationId),
          eq(aiTask.userId, params.userId),
          eq(aiTask.scene, params.scene),
          eq(aiTask.status, 'submitted'),
          taskResultCasClause(previousResult)
        )
      );

    if (rowsAffectedFromUpdate(result) > 0) {
      return { count, unresolved: false };
    }
  }

  // Contended — keep submitted so the next poll can retry.
  return { count: 0, unresolved: false };
}

export async function clearAiTaskProviderQueryErrors(params: {
  scene: string;
  generationId: string;
  userId: string;
}) {
  const [task] = await db()
    .select()
    .from(aiTask)
    .where(
      and(
        eq(aiTask.id, params.generationId),
        eq(aiTask.userId, params.userId),
        eq(aiTask.scene, params.scene)
      )
    )
    .limit(1);

  if (!task || task.status !== 'submitted') return;

  const previousResult =
    typeof task.taskResult === 'string' ? task.taskResult : null;
  const existing = parseJson(previousResult);
  if (!existing?.queryPermanentErrorCount && !existing?.lastQueryError) {
    return;
  }

  // Single CAS attempt: if another writer already changed taskResult, do not
  // retry against the new value — that would erase a concurrent error bump.
  await db()
    .update(aiTask)
    .set({ taskResult: null })
    .where(
      and(
        eq(aiTask.id, params.generationId),
        eq(aiTask.userId, params.userId),
        eq(aiTask.scene, params.scene),
        eq(aiTask.status, 'submitted'),
        taskResultCasClause(previousResult)
      )
    );
}
