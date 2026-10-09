import { and, eq, isNull } from 'drizzle-orm';

import { FAL_QUERY_PERMANENT_ERROR_THRESHOLD } from '@/core/ai';
import { db } from '@/core/db';
import { aiTask } from '@/config/db/schema';

/**
 * D1 has no real transactions / FOR UPDATE (see withSqliteCompat in
 * create-db.ts). These helpers use compare-and-swap on the exact prior
 * `taskResult` string and verify after write, with retry on contention.
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

    if (!task || task.status !== 'submitted') {
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

      await db()
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

      const [after] = await db()
        .select()
        .from(aiTask)
        .where(eq(aiTask.id, params.generationId))
        .limit(1);

      if (
        after?.status === 'submission_unknown' &&
        after.taskResult === nextResult
      ) {
        return { count, unresolved: true };
      }

      if (after?.status === 'submission_unknown') {
        const parked = parseJson(after.taskResult);
        const parkedCount =
          typeof parked?.queryPermanentErrorCount === 'number'
            ? parked.queryPermanentErrorCount
            : count;
        return { count: parkedCount, unresolved: true };
      }

      continue;
    }

    const nextResult = JSON.stringify({
      ...existing,
      queryPermanentErrorCount: count,
      lastQueryError: errorMessage,
      providerStatus: params.providerStatus,
      stage: 'provider_query',
    });

    await db()
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

    const [after] = await db()
      .select()
      .from(aiTask)
      .where(eq(aiTask.id, params.generationId))
      .limit(1);

    if (after?.status === 'submitted' && after.taskResult === nextResult) {
      return { count, unresolved: false };
    }

    if (after?.status === 'submission_unknown') {
      const parked = parseJson(after.taskResult);
      const parkedCount =
        typeof parked?.queryPermanentErrorCount === 'number'
          ? parked.queryPermanentErrorCount
          : count;
      return { count: parkedCount, unresolved: true };
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

    if (!task || task.status !== 'submitted') return;

    const previousResult =
      typeof task.taskResult === 'string' ? task.taskResult : null;
    const existing = parseJson(previousResult);
    if (!existing?.queryPermanentErrorCount && !existing?.lastQueryError) {
      return;
    }

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

    const [after] = await db()
      .select()
      .from(aiTask)
      .where(eq(aiTask.id, params.generationId))
      .limit(1);

    if (!after || after.status !== 'submitted') return;
    if (after.taskResult == null) return;

    const next = parseJson(after.taskResult);
    if (!next?.queryPermanentErrorCount && !next?.lastQueryError) return;
  }
}
