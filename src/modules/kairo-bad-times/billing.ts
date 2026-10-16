import { and, eq, inArray } from 'drizzle-orm';

import { db } from '@/core/db';
import { aiTask } from '@/config/db/schema';
import { consume, getBalance, revoke } from '@/modules/credits/service';
import {
  applyAiTaskProviderQueryError,
  clearAiTaskProviderQueryErrors,
  rowsAffectedFromUpdate,
} from '@/lib/fal-query-error-cas';
import { getUuid } from '@/lib/hash';

import {
  KAIRO_BAD_TIMES_CHARACTER_ORIENTATION,
  KAIRO_BAD_TIMES_FIXED_PROMPT,
  KAIRO_BAD_TIMES_KEEP_ORIGINAL_SOUND,
  KAIRO_BAD_TIMES_MODEL,
  KAIRO_BAD_TIMES_PROVIDER,
  KAIRO_BAD_TIMES_SCENE,
} from './constants';

export { KAIRO_BAD_TIMES_SCENE, KAIRO_BAD_TIMES_PROVIDER };

export type KairoBadTimesTaskStatus =
  | 'reserved'
  | 'submitting'
  | 'submitted'
  | 'completing'
  | 'completed'
  | 'refunding'
  | 'refunded'
  | 'submission_unknown';

export class KairoBadTimesInsufficientCreditsError extends Error {
  constructor(
    public requiredCredits: number,
    public balance: number
  ) {
    super('Insufficient credits');
    this.name = 'KairoBadTimesInsufficientCreditsError';
  }
}

export class KairoBadTimesGenerationConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'KairoBadTimesGenerationConflictError';
  }
}

export function assertKairoBadTimesGenerationId(value: unknown): string {
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

export function parseKairoBadTimesTask(task: {
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

export async function getKairoBadTimesTaskById(params: {
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
        eq(aiTask.scene, KAIRO_BAD_TIMES_SCENE)
      )
    )
    .limit(1);
  return task ?? null;
}

export async function getKairoBadTimesTaskByGenerationId(generationId: string) {
  const [task] = await db()
    .select()
    .from(aiTask)
    .where(
      and(eq(aiTask.id, generationId), eq(aiTask.scene, KAIRO_BAD_TIMES_SCENE))
    )
    .limit(1);
  return task ?? null;
}

export async function getKairoBadTimesTaskByRequestIdAnyUser(
  requestId: string
) {
  const [task] = await db()
    .select()
    .from(aiTask)
    .where(
      and(eq(aiTask.taskId, requestId), eq(aiTask.scene, KAIRO_BAD_TIMES_SCENE))
    )
    .limit(1);
  return task ?? null;
}

function assertTaskMatches(
  task: any,
  params: {
    imageKey: string;
    templateVideoKey: string;
    duration: number;
    characterOrientation: typeof KAIRO_BAD_TIMES_CHARACTER_ORIENTATION;
    keepOriginalSound: boolean;
    model: string;
  }
) {
  const options = parseJson(task.options);
  const matches =
    (task.prompt || '') === KAIRO_BAD_TIMES_FIXED_PROMPT &&
    options?.imageKey === params.imageKey &&
    options?.templateVideoKey === params.templateVideoKey &&
    options?.duration === params.duration &&
    options?.characterOrientation === params.characterOrientation &&
    options?.keepOriginalSound === params.keepOriginalSound &&
    options?.model === params.model;

  if (!matches) {
    throw new KairoBadTimesGenerationConflictError(
      'This generation ID is already bound to different inputs'
    );
  }
}

export function assertKairoBadTimesTaskMatches(
  task: any,
  params: {
    imageKey: string;
    templateVideoKey: string;
    duration: number;
    characterOrientation: typeof KAIRO_BAD_TIMES_CHARACTER_ORIENTATION;
    keepOriginalSound: boolean;
    model: string;
  }
) {
  assertTaskMatches(task, params);
}

export async function reserveKairoBadTimesGeneration(params: {
  generationId: string;
  userId: string;
  userEmail?: string;
  imageKey: string;
  templateVideoKey: string;
  duration: number;
  kind?: 'preview' | 'full';
  providerCostUsd: number;
  credits: number;
  creditDescription?: string;
}) {
  const matchParams = {
    imageKey: params.imageKey,
    templateVideoKey: params.templateVideoKey,
    duration: params.duration,
    characterOrientation: KAIRO_BAD_TIMES_CHARACTER_ORIENTATION,
    keepOriginalSound: KAIRO_BAD_TIMES_KEEP_ORIGINAL_SOUND,
    model: KAIRO_BAD_TIMES_MODEL,
  };

  const existing = await getKairoBadTimesTaskById({
    generationId: params.generationId,
    userId: params.userId,
  });
  if (existing) {
    assertTaskMatches(existing, matchParams);
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
          eq(aiTask.scene, KAIRO_BAD_TIMES_SCENE)
        )
      )
      .limit(1);

    if (insideExisting) {
      assertTaskMatches(insideExisting, matchParams);
      return { task: insideExisting, insufficient: false };
    }

    const consumed = await consume({
      userId: params.userId,
      userEmail: params.userEmail,
      credits: params.credits,
      scene: KAIRO_BAD_TIMES_SCENE,
      description:
        params.creditDescription ||
        'Reserve credits for Kairo Bad Times generation',
      metadata: JSON.stringify({
        generationId: params.generationId,
        model: KAIRO_BAD_TIMES_MODEL,
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
      provider: KAIRO_BAD_TIMES_PROVIDER,
      model: KAIRO_BAD_TIMES_MODEL,
      prompt: KAIRO_BAD_TIMES_FIXED_PROMPT,
      options: JSON.stringify({
        imageKey: params.imageKey,
        templateVideoKey: params.templateVideoKey,
        duration: params.duration,
        kind: params.kind || 'full',
        characterOrientation: KAIRO_BAD_TIMES_CHARACTER_ORIENTATION,
        keepOriginalSound: KAIRO_BAD_TIMES_KEEP_ORIGINAL_SOUND,
        model: KAIRO_BAD_TIMES_MODEL,
      }),
      status: 'reserved',
      taskId: null,
      taskInfo: JSON.stringify({
        providerCostUsd: params.providerCostUsd,
      }),
      taskResult: null,
      costCredits: params.credits,
      scene: KAIRO_BAD_TIMES_SCENE,
      creditId: consumed.consumedCredit.id,
    };

    await tx.insert(aiTask).values(task);
    return { task, insufficient: false };
  });

  if (result.insufficient || !result.task) {
    const balance = await getBalance(params.userId);
    throw new KairoBadTimesInsufficientCreditsError(params.credits, balance);
  }

  return result.task;
}

export async function claimKairoBadTimesSubmission(params: {
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
        eq(aiTask.scene, KAIRO_BAD_TIMES_SCENE),
        eq(aiTask.status, 'reserved')
      )
    );

  const task = await getKairoBadTimesTaskById(params);
  if (!task || task.status !== 'submitting') return false;
  return parseJson(task.taskResult)?.submissionClaim === claim;
}

export async function markKairoBadTimesSubmitted(params: {
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
        eq(aiTask.scene, KAIRO_BAD_TIMES_SCENE),
        eq(aiTask.status, 'submitting')
      )
    );
  return getKairoBadTimesTaskById(params);
}

export async function markKairoBadTimesSubmissionUnknown(params: {
  generationId: string;
  userId: string;
  error: string;
  requestId?: string;
}) {
  await db()
    .update(aiTask)
    .set({
      status: 'submission_unknown',
      ...(params.requestId ? { taskId: params.requestId } : {}),
      taskResult: JSON.stringify({
        error: params.error,
        ...(params.requestId ? { requestId: params.requestId } : {}),
      }),
    })
    .where(
      and(
        eq(aiTask.id, params.generationId),
        eq(aiTask.userId, params.userId),
        eq(aiTask.scene, KAIRO_BAD_TIMES_SCENE),
        eq(aiTask.status, 'submitting')
      )
    );
}

export async function applyKairoBadTimesProviderQueryError(params: {
  generationId: string;
  userId: string;
  error: string;
  providerStatus: string;
}): Promise<{ count: number; unresolved: boolean }> {
  return applyAiTaskProviderQueryError({
    scene: KAIRO_BAD_TIMES_SCENE,
    ...params,
  });
}

export async function clearKairoBadTimesProviderQueryErrors(params: {
  generationId: string;
  userId: string;
}) {
  await clearAiTaskProviderQueryErrors({
    scene: KAIRO_BAD_TIMES_SCENE,
    ...params,
  });
}

export async function claimKairoBadTimesCompletion(params: {
  generationId: string;
  userId: string;
}): Promise<'claimed' | 'already_completing' | 'unavailable'> {
  const claim = getUuid();
  const result = await db()
    .update(aiTask)
    .set({
      status: 'completing',
      taskResult: JSON.stringify({ completionClaim: claim }),
    })
    .where(
      and(
        eq(aiTask.id, params.generationId),
        eq(aiTask.userId, params.userId),
        eq(aiTask.scene, KAIRO_BAD_TIMES_SCENE),
        eq(aiTask.status, 'submitted')
      )
    );

  if (rowsAffectedFromUpdate(result) > 0) return 'claimed';

  const current = await getKairoBadTimesTaskById(params);
  if (current?.status === 'completing') return 'already_completing';
  return 'unavailable';
}

export async function finalizeKairoBadTimesGeneration(params: {
  generationId: string;
  userId: string;
  providerStatus: string;
  videoKey: string;
}) {
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
        eq(aiTask.scene, KAIRO_BAD_TIMES_SCENE),
        eq(aiTask.status, 'completing')
      )
    );

  return getKairoBadTimesTaskById(params);
}

export async function refundKairoBadTimesGeneration(params: {
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
          eq(aiTask.scene, KAIRO_BAD_TIMES_SCENE),
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
          eq(aiTask.scene, KAIRO_BAD_TIMES_SCENE)
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

    // Never mark a generation refunded unless its consumed credits were restored.
    // Throwing rolls back both the refund claim and any partial credit updates.
    if (!task.creditId || !(await revoke(task.creditId, tx))) {
      throw new Error('Failed to restore Kairo Bad Times credits');
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
          eq(aiTask.scene, KAIRO_BAD_TIMES_SCENE),
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
          eq(aiTask.scene, KAIRO_BAD_TIMES_SCENE)
        )
      )
      .limit(1);

    return updated ?? null;
  });
}
