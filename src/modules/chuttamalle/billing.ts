import { and, eq, inArray } from 'drizzle-orm';

import { FAL_QUERY_PERMANENT_ERROR_THRESHOLD } from '@/core/ai';
import { db } from '@/core/db';
import { aiTask } from '@/config/db/schema';
import { consume, getBalance, revoke } from '@/modules/credits/service';
import { getUuid } from '@/lib/hash';

import type { ChuttamalleAspectRatio, ChuttamalleResolution } from './pricing';
import type { ChuttamallePromptExpansionMode } from './service';

export const CHUTTAMALLE_SCENE = 'chuttamalle';
export const CHUTTAMALLE_PROVIDER = 'fal';

export type ChuttamalleTaskStatus =
  | 'reserved'
  | 'submitting'
  | 'submitted'
  | 'completing'
  | 'completed'
  | 'refunding'
  | 'refunded'
  | 'submission_unknown';

export class ChuttamalleInsufficientCreditsError extends Error {
  constructor(
    public requiredCredits: number,
    public balance: number
  ) {
    super('Insufficient credits');
    this.name = 'ChuttamalleInsufficientCreditsError';
  }
}

export class ChuttamalleGenerationConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ChuttamalleGenerationConflictError';
  }
}

export function assertChuttamalleGenerationId(value: unknown): string {
  if (typeof value !== 'string' || !/^[A-Za-z0-9_-]{8,128}$/.test(value)) {
    throw new Error('Invalid generation ID');
  }
  return value;
}

function parseJson(value: string | null | undefined) {
  if (!value) return null;
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? (parsed as Record<string, any>)
      : null;
  } catch {
    return null;
  }
}

export function parseChuttamalleTask(task: {
  options?: string | null;
  taskInfo?: string | null;
  taskResult?: string | null;
}) {
  return {
    options: parseJson(task.options),
    info: parseJson(task.taskInfo),
    result: parseJson(task.taskResult),
  };
}

export async function getChuttamalleTaskById(params: {
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
        eq(aiTask.scene, CHUTTAMALLE_SCENE)
      )
    )
    .limit(1);
  return task ?? null;
}

export async function getChuttamalleTaskByGenerationId(generationId: string) {
  const [task] = await db()
    .select()
    .from(aiTask)
    .where(
      and(eq(aiTask.id, generationId), eq(aiTask.scene, CHUTTAMALLE_SCENE))
    )
    .limit(1);
  return task ?? null;
}

function assertTaskMatches(
  task: any,
  params: {
    prompt: string;
    duration: number;
    resolution: ChuttamalleResolution;
    aspectRatio: ChuttamalleAspectRatio;
    promptExpansionMode: ChuttamallePromptExpansionMode;
    videoKey: string;
    imageKeys: string[];
  }
) {
  const options = parseJson(task.options);
  const imageKeys = Array.isArray(options?.imageKeys) ? options.imageKeys : [];
  const matches =
    (task.prompt || '') === params.prompt &&
    options?.duration === params.duration &&
    options?.resolution === params.resolution &&
    options?.aspectRatio === params.aspectRatio &&
    options?.promptExpansionMode === params.promptExpansionMode &&
    options?.videoKey === params.videoKey &&
    imageKeys.length === params.imageKeys.length &&
    imageKeys.every(
      (value: unknown, index: number) => value === params.imageKeys[index]
    );

  if (!matches) {
    throw new ChuttamalleGenerationConflictError(
      'This generation ID is already bound to different inputs'
    );
  }
}

export async function reserveChuttamalleGeneration(params: {
  generationId: string;
  userId: string;
  userEmail?: string;
  model: string;
  prompt: string;
  duration: number;
  resolution: ChuttamalleResolution;
  aspectRatio: ChuttamalleAspectRatio;
  promptExpansionMode: ChuttamallePromptExpansionMode;
  videoKey: string;
  imageKeys: string[];
  providerCostUsd: number;
  credits: number;
}) {
  const existing = await getChuttamalleTaskById({
    generationId: params.generationId,
    userId: params.userId,
  });
  if (existing) {
    assertTaskMatches(existing, params);
    return existing;
  }

  const result = await db().transaction(async (tx: any) => {
    const [insideExisting] = await tx
      .select()
      .from(aiTask)
      .where(
        and(
          eq(aiTask.id, params.generationId),
          eq(aiTask.userId, params.userId),
          eq(aiTask.scene, CHUTTAMALLE_SCENE)
        )
      )
      .limit(1);

    if (insideExisting) {
      assertTaskMatches(insideExisting, params);
      return { task: insideExisting, insufficient: false };
    }

    const consumed = await consume({
      userId: params.userId,
      userEmail: params.userEmail,
      credits: params.credits,
      scene: CHUTTAMALLE_SCENE,
      description: 'Reserve credits for Chuttamalle AI generation',
      metadata: JSON.stringify({
        generationId: params.generationId,
        model: params.model,
        resolution: params.resolution,
        duration: params.duration,
        providerCostUsd: params.providerCostUsd,
      }),
      tx,
    });

    if (!consumed.success || !consumed.consumedCredit) {
      return { task: null, insufficient: true };
    }

    const task = {
      id: params.generationId,
      userId: params.userId,
      mediaType: 'video',
      provider: CHUTTAMALLE_PROVIDER,
      model: params.model,
      prompt: params.prompt,
      options: JSON.stringify({
        duration: params.duration,
        resolution: params.resolution,
        aspectRatio: params.aspectRatio,
        promptExpansionMode: params.promptExpansionMode,
        videoKey: params.videoKey,
        imageKeys: params.imageKeys,
      }),
      status: 'reserved',
      taskId: null,
      taskInfo: JSON.stringify({
        providerCostUsd: params.providerCostUsd,
      }),
      taskResult: null,
      costCredits: params.credits,
      scene: CHUTTAMALLE_SCENE,
      creditId: consumed.consumedCredit.id,
    };

    await tx.insert(aiTask).values(task);
    return { task, insufficient: false };
  });

  if (result.insufficient || !result.task) {
    const balance = await getBalance(params.userId);
    throw new ChuttamalleInsufficientCreditsError(params.credits, balance);
  }

  return result.task;
}

export async function claimChuttamalleSubmission(params: {
  generationId: string;
  userId: string;
}) {
  const claim = getUuid();
  await db()
    .update(aiTask)
    .set({
      status: 'submitting',
      taskResult: JSON.stringify({ submissionClaim: claim }),
    })
    .where(
      and(
        eq(aiTask.id, params.generationId),
        eq(aiTask.userId, params.userId),
        eq(aiTask.scene, CHUTTAMALLE_SCENE),
        eq(aiTask.status, 'reserved')
      )
    );

  const task = await getChuttamalleTaskById(params);
  if (!task || task.status !== 'submitting') return false;
  return parseJson(task.taskResult)?.submissionClaim === claim;
}

export async function markChuttamalleSubmitted(params: {
  generationId: string;
  userId: string;
  requestId: string;
}) {
  await db()
    .update(aiTask)
    .set({
      status: 'submitted',
      taskId: params.requestId,
      taskResult: null,
    })
    .where(
      and(
        eq(aiTask.id, params.generationId),
        eq(aiTask.userId, params.userId),
        eq(aiTask.scene, CHUTTAMALLE_SCENE),
        eq(aiTask.status, 'submitting')
      )
    );
  return getChuttamalleTaskById(params);
}

export async function markChuttamalleSubmissionUnknown(params: {
  generationId: string;
  userId: string;
  error: string;
}) {
  await db()
    .update(aiTask)
    .set({
      status: 'submission_unknown',
      taskResult: JSON.stringify({ error: params.error }),
    })
    .where(
      and(
        eq(aiTask.id, params.generationId),
        eq(aiTask.userId, params.userId),
        eq(aiTask.scene, CHUTTAMALLE_SCENE),
        eq(aiTask.status, 'submitting')
      )
    );
}

/**
 * Atomically bump consecutive permanent Fal status-lookup errors.
 * If the threshold is reached, park as submission_unknown in the same
 * transaction so a concurrent successful clear cannot race past us.
 */
export async function applyChuttamalleProviderQueryError(params: {
  generationId: string;
  userId: string;
  error: string;
  providerStatus: string;
}): Promise<{ count: number; unresolved: boolean }> {
  const errorMessage =
    params.error ||
    'Provider status lookup failed permanently. Credits remain reserved.';

  return db().transaction(async (tx: any) => {
    const lockedQuery = tx
      .select()
      .from(aiTask)
      .where(
        and(
          eq(aiTask.id, params.generationId),
          eq(aiTask.userId, params.userId),
          eq(aiTask.scene, CHUTTAMALLE_SCENE)
        )
      )
      .limit(1);
    const [task] = await (lockedQuery.for
      ? lockedQuery.for('update')
      : lockedQuery);

    if (!task || task.status !== 'submitted') {
      return { count: 0, unresolved: false };
    }

    const existing = parseJson(task.taskResult) ?? {};
    const previous =
      typeof existing.queryPermanentErrorCount === 'number'
        ? existing.queryPermanentErrorCount
        : 0;
    const count = previous + 1;

    if (count >= FAL_QUERY_PERMANENT_ERROR_THRESHOLD) {
      await tx
        .update(aiTask)
        .set({
          status: 'submission_unknown',
          taskResult: JSON.stringify({
            error: errorMessage,
            providerStatus: params.providerStatus,
            stage: 'provider_query',
            queryPermanentErrorCount: count,
          }),
        })
        .where(
          and(
            eq(aiTask.id, params.generationId),
            eq(aiTask.userId, params.userId),
            eq(aiTask.scene, CHUTTAMALLE_SCENE),
            eq(aiTask.status, 'submitted')
          )
        );
      return { count, unresolved: true };
    }

    await tx
      .update(aiTask)
      .set({
        taskResult: JSON.stringify({
          ...existing,
          queryPermanentErrorCount: count,
          lastQueryError: errorMessage,
          providerStatus: params.providerStatus,
          stage: 'provider_query',
        }),
      })
      .where(
        and(
          eq(aiTask.id, params.generationId),
          eq(aiTask.userId, params.userId),
          eq(aiTask.scene, CHUTTAMALLE_SCENE),
          eq(aiTask.status, 'submitted')
        )
      );

    return { count, unresolved: false };
  });
}

/** Clear query-error counters after a healthy Fal status read. */
export async function clearChuttamalleProviderQueryErrors(params: {
  generationId: string;
  userId: string;
}) {
  await db().transaction(async (tx: any) => {
    const lockedQuery = tx
      .select()
      .from(aiTask)
      .where(
        and(
          eq(aiTask.id, params.generationId),
          eq(aiTask.userId, params.userId),
          eq(aiTask.scene, CHUTTAMALLE_SCENE)
        )
      )
      .limit(1);
    const [task] = await (lockedQuery.for
      ? lockedQuery.for('update')
      : lockedQuery);

    if (!task || task.status !== 'submitted') return;

    const existing = parseJson(task.taskResult);
    if (!existing?.queryPermanentErrorCount && !existing?.lastQueryError) {
      return;
    }

    await tx
      .update(aiTask)
      .set({ taskResult: null })
      .where(
        and(
          eq(aiTask.id, params.generationId),
          eq(aiTask.userId, params.userId),
          eq(aiTask.scene, CHUTTAMALLE_SCENE),
          eq(aiTask.status, 'submitted')
        )
      );
  });
}

export async function settleChuttamalleGeneration(params: {
  generationId: string;
  userId: string;
  providerStatus: string;
  videoKey: string;
}) {
  const claim = getUuid();
  await db()
    .update(aiTask)
    .set({
      status: 'completing',
      taskResult: JSON.stringify({ completionClaim: claim }),
    })
    .where(
      and(
        eq(aiTask.id, params.generationId),
        eq(aiTask.userId, params.userId),
        eq(aiTask.scene, CHUTTAMALLE_SCENE),
        eq(aiTask.status, 'submitted')
      )
    );

  const claimed = await getChuttamalleTaskById(params);
  if (
    !claimed ||
    claimed.status !== 'completing' ||
    parseJson(claimed.taskResult)?.completionClaim !== claim
  ) {
    return claimed;
  }

  await db()
    .update(aiTask)
    .set({
      status: 'completed',
      taskResult: JSON.stringify({
        providerStatus: params.providerStatus,
        videoKey: params.videoKey,
      }),
    })
    .where(
      and(
        eq(aiTask.id, params.generationId),
        eq(aiTask.userId, params.userId),
        eq(aiTask.scene, CHUTTAMALLE_SCENE),
        eq(aiTask.status, 'completing')
      )
    );

  return getChuttamalleTaskById(params);
}

export async function refundChuttamalleGeneration(params: {
  generationId: string;
  userId: string;
  providerStatus?: string;
  error: string;
}) {
  const claim = getUuid();

  return db().transaction(async (tx: any) => {
    await tx
      .update(aiTask)
      .set({
        status: 'refunding',
        taskResult: JSON.stringify({ refundClaim: claim }),
      })
      .where(
        and(
          eq(aiTask.id, params.generationId),
          eq(aiTask.userId, params.userId),
          eq(aiTask.scene, CHUTTAMALLE_SCENE),
          inArray(aiTask.status, ['reserved', 'submitting', 'submitted'])
        )
      );

    const [task] = await tx
      .select()
      .from(aiTask)
      .where(
        and(
          eq(aiTask.id, params.generationId),
          eq(aiTask.userId, params.userId),
          eq(aiTask.scene, CHUTTAMALLE_SCENE)
        )
      )
      .limit(1);

    if (
      !task ||
      task.status !== 'refunding' ||
      parseJson(task.taskResult)?.refundClaim !== claim
    ) {
      return task ?? null;
    }

    if (task.creditId) {
      await revoke(task.creditId, tx);
    }

    await tx
      .update(aiTask)
      .set({
        status: 'refunded',
        taskResult: JSON.stringify({
          providerStatus: params.providerStatus || 'failed',
          error: params.error,
          refundedCredits: task.costCredits || 0,
        }),
      })
      .where(
        and(
          eq(aiTask.id, params.generationId),
          eq(aiTask.userId, params.userId),
          eq(aiTask.scene, CHUTTAMALLE_SCENE),
          eq(aiTask.status, 'refunding')
        )
      );

    const [updated] = await tx
      .select()
      .from(aiTask)
      .where(
        and(
          eq(aiTask.id, params.generationId),
          eq(aiTask.userId, params.userId),
          eq(aiTask.scene, CHUTTAMALLE_SCENE)
        )
      )
      .limit(1);

    return updated ?? null;
  });
}
