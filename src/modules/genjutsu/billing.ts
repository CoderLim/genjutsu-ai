import { and, eq } from 'drizzle-orm';

import { db } from '@/core/db';
import { aiTask } from '@/config/db/schema';
import {
  consume,
  getBalance,
  revoke,
  CreditTransactionScene,
} from '@/modules/credits/service';
import { getGenjutsuModel, type GenjutsuMode, type GenjutsuResolution } from './service';

export const GENJUTSU_SCENE = 'genjutsu';

export type GenjutsuTaskStatus =
  | 'reserved'
  | 'submitting'
  | 'submitted'
  | 'completed'
  | 'submission_unknown'
  | 'refunded';

export class InsufficientCreditsError extends Error {
  constructor(
    public requiredCredits: number,
    public balance: number
  ) {
    super('Insufficient credits');
    this.name = 'InsufficientCreditsError';
  }
}

export function assertGenerationId(value: unknown): string {
  if (
    typeof value !== 'string' ||
    !/^[A-Za-z0-9_-]{8,128}$/.test(value)
  ) {
    throw new Error('Invalid generation ID');
  }
  return value;
}

export async function getGenjutsuTaskById(params: {
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
        eq(aiTask.scene, GENJUTSU_SCENE)
      )
    )
    .limit(1);
  return task ?? null;
}

export async function getGenjutsuTaskByRequestId(params: {
  requestId: string;
  userId: string;
}) {
  const [task] = await db()
    .select()
    .from(aiTask)
    .where(
      and(
        eq(aiTask.taskId, params.requestId),
        eq(aiTask.userId, params.userId),
        eq(aiTask.scene, GENJUTSU_SCENE)
      )
    )
    .limit(1);
  return task ?? null;
}

export async function reserveGenjutsuCredits(params: {
  generationId: string;
  userId: string;
  userEmail?: string;
  mode: GenjutsuMode;
  resolution: GenjutsuResolution;
  prompt: string;
  videoUrl: string;
  imageUrls: string[];
  providerCostUsd: number;
  credits: number;
  providerEstimate?: unknown;
}) {
  const existing = await getGenjutsuTaskById({
    generationId: params.generationId,
    userId: params.userId,
  });
  if (existing) return existing;

  const result = await db().transaction(async (tx: any) => {
    const [insideExisting] = await tx
      .select()
      .from(aiTask)
      .where(
        and(
          eq(aiTask.id, params.generationId),
          eq(aiTask.userId, params.userId),
          eq(aiTask.scene, GENJUTSU_SCENE)
        )
      )
      .limit(1);

    if (insideExisting) return { task: insideExisting, insufficient: false };

    const consumed = await consume({
      userId: params.userId,
      userEmail: params.userEmail,
      credits: params.credits,
      scene: CreditTransactionScene.GENJUTSU,
      description: 'Reserve credits for Genjutsu generation',
      metadata: JSON.stringify({
        generationId: params.generationId,
        mode: params.mode,
        resolution: params.resolution,
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
      provider: 'higgsfield',
      model: getGenjutsuModel(params.mode),
      prompt: params.prompt,
      options: JSON.stringify({
        mode: params.mode,
        resolution: params.resolution,
        videoUrl: params.videoUrl,
        imageUrls: params.imageUrls,
      }),
      status: 'reserved',
      taskId: null,
      taskInfo: JSON.stringify({
        providerCostUsd: params.providerCostUsd,
        providerEstimate: params.providerEstimate ?? null,
      }),
      taskResult: null,
      costCredits: params.credits,
      scene: GENJUTSU_SCENE,
      creditId: consumed.consumedCredit.id,
    };

    await tx.insert(aiTask).values(task);
    return { task, insufficient: false };
  });

  if (result.insufficient || !result.task) {
    const balance = await getBalance(params.userId);
    throw new InsufficientCreditsError(params.credits, balance);
  }

  return result.task;
}

function mutationCount(result: any): number | null {
  const candidates = [
    result?.rowsAffected,
    result?.rowCount,
    result?.changes,
    result?.affectedRows,
    result?.[0]?.affectedRows,
    result?.[0]?.rowCount,
    result?.[0]?.changes,
  ];
  const found = candidates.find((value) => typeof value === 'number');
  return typeof found === 'number' ? found : null;
}

export async function claimGenjutsuSubmission(params: {
  generationId: string;
  userId: string;
}) {
  const result = await db()
    .update(aiTask)
    .set({ status: 'submitting' })
    .where(
      and(
        eq(aiTask.id, params.generationId),
        eq(aiTask.userId, params.userId),
        eq(aiTask.scene, GENJUTSU_SCENE),
        eq(aiTask.status, 'reserved')
      )
    );

  const count = mutationCount(result);
  if (count == null) {
    throw new Error('Unable to verify Genjutsu submission claim');
  }
  return count === 1;
}

export async function markGenjutsuSubmitted(params: {
  generationId: string;
  userId: string;
  requestId: string;
}) {
  await db()
    .update(aiTask)
    .set({
      status: 'submitted',
      taskId: params.requestId,
    })
    .where(
      and(
        eq(aiTask.id, params.generationId),
        eq(aiTask.userId, params.userId),
        eq(aiTask.scene, GENJUTSU_SCENE)
      )
    );
}

export async function markGenjutsuSubmissionUnknown(params: {
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
        eq(aiTask.scene, GENJUTSU_SCENE)
      )
    );
}

export async function settleGenjutsuGeneration(params: {
  generationId: string;
  userId: string;
  providerStatus: string;
  videoUrl: string;
}) {
  await db()
    .update(aiTask)
    .set({
      status: 'completed',
      taskResult: JSON.stringify({
        providerStatus: params.providerStatus,
        videoUrl: params.videoUrl,
      }),
    })
    .where(
      and(
        eq(aiTask.id, params.generationId),
        eq(aiTask.userId, params.userId),
        eq(aiTask.scene, GENJUTSU_SCENE)
      )
    );
}

export async function refundGenjutsuGeneration(params: {
  generationId: string;
  userId: string;
  providerStatus?: string;
  error: string;
}) {
  const task = await getGenjutsuTaskById({
    generationId: params.generationId,
    userId: params.userId,
  });
  if (!task) return null;

  if (task.status === 'refunded') return task;

  if (task.creditId) {
    await revoke(task.creditId);
  }

  await db()
    .update(aiTask)
    .set({
      status: 'refunded',
      taskResult: JSON.stringify({
        providerStatus: params.providerStatus ?? null,
        error: params.error,
        refundedCredits: task.costCredits,
      }),
    })
    .where(
      and(
        eq(aiTask.id, params.generationId),
        eq(aiTask.userId, params.userId),
        eq(aiTask.scene, GENJUTSU_SCENE)
      )
    );

  return {
    ...task,
    status: 'refunded',
    taskResult: JSON.stringify({
      providerStatus: params.providerStatus ?? null,
      error: params.error,
      refundedCredits: task.costCredits,
    }),
  };
}

export function parseGenjutsuTaskInfo(task: {
  taskInfo?: string | null;
  taskResult?: string | null;
}) {
  const parse = (value?: string | null) => {
    if (!value) return null;
    try {
      return JSON.parse(value);
    } catch {
      return null;
    }
  };
  return {
    info: parse(task.taskInfo),
    result: parse(task.taskResult),
  };
}
