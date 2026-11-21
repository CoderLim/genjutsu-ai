import { and, eq, inArray, isNotNull, lt, or } from 'drizzle-orm';

import { db } from '@/core/db';
import { aiTask } from '@/config/db/schema';
import { consume, getBalance, revoke } from '@/modules/credits/service';
import { getUuid } from '@/lib/hash';

import { assertGenerationId } from './storage';
import type { GeneratorState, CreditEstimate } from './types';

export const GENERATOR_SCENE = 'generic-generator';
const SUBMISSION_CLAIM_TTL_MS = 3 * 60 * 1000;
const COMPLETION_CLAIM_TTL_MS = 3 * 60 * 1000;
const REFUNDABLE = [
  'reserved', 'submitting', 'submitted', 'submission_unknown',
] as const;

export type GeneratorTask = typeof aiTask.$inferSelect;

export class GeneratorInsufficientCreditsError extends Error {
  constructor(public requiredCredits: number, public balance: number) {
    super('Insufficient credits');
    this.name = 'GeneratorInsufficientCreditsError';
  }
}
export class GeneratorTaskConflictError extends Error {
  constructor() {
    super('Generation ID is already bound to different inputs');
    this.name = 'GeneratorTaskConflictError';
  }
}

export function parseTaskJson(value?: string | null): Record<string, any> {
  try {
    const record = JSON.parse(value || 'null');
    return record && typeof record === 'object' && !Array.isArray(record)
      ? record : {};
  } catch { return {}; }
}

export function generatorRequestSignature(state: GeneratorState, version: string): string {
  // Keys have a fixed insertion order as a result of strict request validation.
  return JSON.stringify([
    state.mediaType, state.modelId, state.workflow, state.prompt,
    Object.keys(state.params).sort().map(k => [k, state.params[k]]),
    state.inputs.startFrame, state.inputs.endFrame,
    state.inputs.referenceImages, state.inputs.referenceVideos,
    state.inputs.referenceAudio, version,
  ]);
}

export async function getGeneratorTask(input: { generationId: string; userId: string }) {
  const [result] = await db()
    .select()
    .from(aiTask)
    .where(and(
      eq(aiTask.id, assertGenerationId(input.generationId)),
      eq(aiTask.userId, input.userId),
      eq(aiTask.scene, GENERATOR_SCENE)
    ))
    .limit(1);
  return result ?? null;
}

export async function getGeneratorTaskByRequestId(requestId: string) {
  const [result] = await db()
    .select()
    .from(aiTask)
    .where(and(
      eq(aiTask.scene, GENERATOR_SCENE),
      eq(aiTask.taskId, requestId)
    ))
    .limit(1);
  return result ?? null;
}

export function assertGeneratorTaskSignature(task: GeneratorTask, signature: string) {
  const options = parseTaskJson(task.options);
  if (options.signature !== signature) throw new GeneratorTaskConflictError();
}

export async function reserveGeneratorTask(input: {
  generationId: string;
  userId: string;
  userEmail?: string;
  state: GeneratorState;
  sealedState: GeneratorState;
  signature: string;
  quote: CreditEstimate;
  provider: string;
  providerModelId: string;
}) {
  const existing = await getGeneratorTask(input);
  if (existing) {
    assertGeneratorTaskSignature(existing, input.signature);
    return existing;
  }
  let insufficient = false;
  try {
    const result = await db().transaction(async (tx: any) => {
      // Insert before consuming: competing identical generation IDs cannot
      // both charge; the losing transaction rolls back on PK conflict.
      const task = {
        id: input.generationId,
        userId: input.userId,
        mediaType: input.state.mediaType,
        scene: GENERATOR_SCENE,
        provider: input.provider,
        model: input.providerModelId,
        prompt: input.state.prompt,
        status: 'reserved',
        options: JSON.stringify({
          signature: input.signature,
          modelId: input.state.modelId,
          workflow: input.state.workflow,
          params: input.state.params,
          inputs: input.sealedState.inputs,
          pricingVersion: input.quote.pricingVersion,
        }),
        taskResult: null,
        taskInfo: null,
        taskId: null,
        costCredits: input.quote.credits,
        creditId: null,
      };
      await tx.insert(aiTask).values(task);
      const charged = await consume({
        userId: input.userId,
        userEmail: input.userEmail,
        scene: GENERATOR_SCENE,
        credits: input.quote.credits,
        description: 'AI ' + input.state.mediaType + ' generation',
        metadata: JSON.stringify({
          generationId: input.generationId,
          modelId: input.state.modelId,
          pricingVersion: input.quote.pricingVersion,
        }),
        tx,
      });
      if (!charged.success || !charged.consumedCredit) {
        insufficient = true;
        throw new GeneratorInsufficientCreditsError(input.quote.credits, 0);
      }
      await tx.update(aiTask).set({
        creditId: charged.consumedCredit.id,
      }).where(and(
        eq(aiTask.id, input.generationId),
        eq(aiTask.userId, input.userId),
        eq(aiTask.scene, GENERATOR_SCENE)
      ));
      return getTaskFromTx(tx, input.generationId);
    });
    return result;
  } catch (error) {
    if (error instanceof GeneratorInsufficientCreditsError || insufficient) {
      throw new GeneratorInsufficientCreditsError(
        input.quote.credits, await getBalance(input.userId)
      );
    }
    // Concurrent inserts with the same ID: only the winner charged.
    const after = await getGeneratorTask(input);
    if (after) {
      assertGeneratorTaskSignature(after, input.signature);
      return after;
    }
    throw error;
  }
}

async function getTaskFromTx(tx: any, generationId: string): Promise<GeneratorTask> {
  const [task] = await tx.select().from(aiTask)
    .where(and(eq(aiTask.id, generationId), eq(aiTask.scene, GENERATOR_SCENE)))
    .limit(1);
  if (!task) throw new Error('Generator task write failed');
  return task;
}

export async function claimGeneratorSubmission(input: {
  userId: string; generationId: string;
}) {
  const token = getUuid();
  await db().update(aiTask).set({
    status: 'submitting',
    taskResult: JSON.stringify({
      submissionClaim: token,
      submittingClaimedAt: new Date().toISOString(),
    }),
  }).where(and(
    eq(aiTask.id, input.generationId),
    eq(aiTask.userId, input.userId),
    eq(aiTask.scene, GENERATOR_SCENE),
    eq(aiTask.status, 'reserved')
  ));
  const task = await getGeneratorTask(input);
  return Boolean(task && task.status === 'submitting' &&
    parseTaskJson(task.taskResult).submissionClaim === token);
}

export async function markGeneratorSubmitted(input: {
  userId: string; generationId: string; requestId: string;
}) {
  await db().update(aiTask).set({
    taskId: input.requestId,
    status: 'submitted',
    taskResult: null,
  }).where(and(
    eq(aiTask.id, input.generationId), eq(aiTask.userId, input.userId),
    eq(aiTask.scene, GENERATOR_SCENE), eq(aiTask.status, 'submitting')
  ));
  return getGeneratorTask(input);
}

export async function markGeneratorSubmissionUnknown(input: {
  userId: string; generationId: string; message: string; requestId?: string;
}) {
  await db().update(aiTask).set({
    status: 'submission_unknown',
    ...(input.requestId ? { taskId: input.requestId } : {}),
    taskResult: JSON.stringify({
      error: input.message,
      requestId: input.requestId ?? null,
    }),
  }).where(and(
    eq(aiTask.id, input.generationId), eq(aiTask.userId, input.userId),
    eq(aiTask.scene, GENERATOR_SCENE),
    eq(aiTask.status, 'submitting')
  ));
}

export async function promoteGeneratorUnknown(input: {
  userId: string; generationId: string;
}) {
  await db().update(aiTask).set({
    status: 'submitted',
    taskResult: null,
  }).where(and(
    eq(aiTask.id, input.generationId), eq(aiTask.userId, input.userId),
    eq(aiTask.scene, GENERATOR_SCENE),
    eq(aiTask.status, 'submission_unknown'),
    isNotNull(aiTask.taskId)
  ));
  return getGeneratorTask(input);
}

export async function claimGeneratorCompletion(input: {
  userId: string; generationId: string;
}): Promise<boolean> {
  const token = getUuid();
  const current = await getGeneratorTask(input);
  if (!current || !['submitted', 'completing'].includes(current.status)) return false;
  if (current.status === 'completing') {
    const claimed = Date.parse(parseTaskJson(current.taskResult).completingClaimedAt || '');
    if (Number.isFinite(claimed) && Date.now() - claimed < COMPLETION_CLAIM_TTL_MS) {
      return false;
    }
  }
  // Lease claim CAS includes the previous taskResult so two status polls cannot
  // concurrently persist the same result, even if both saw an expired lease.
  const where = and(
    eq(aiTask.id, input.generationId), eq(aiTask.userId, input.userId),
    eq(aiTask.scene, GENERATOR_SCENE),
    eq(aiTask.status, current.status),
    current.taskResult === null
      ? undefined
      : eq(aiTask.taskResult, current.taskResult)
  );
  await db().update(aiTask).set({
    status: 'completing',
    taskResult: JSON.stringify({
      completionClaim: token, completingClaimedAt: new Date().toISOString(),
    }),
  }).where(where);

  const after = await getGeneratorTask(input);
  return Boolean(after && after.status === 'completing' &&
    parseTaskJson(after.taskResult).completionClaim === token);
}

export async function completeGeneratorTask(input: {
  userId: string; generationId: string; resultKeys: string[];
  providerStatus: string;
}) {
  if (!input.resultKeys.length) throw new Error('Cannot finalize empty generator output');
  await db().update(aiTask).set({
    status: 'completed',
    taskResult: JSON.stringify({
      resultKeys: input.resultKeys, providerStatus: input.providerStatus,
    }),
  }).where(and(
    eq(aiTask.id, input.generationId),
    eq(aiTask.userId, input.userId),
    eq(aiTask.scene, GENERATOR_SCENE),
    eq(aiTask.status, 'completing')
  ));
  return getGeneratorTask(input);
}

export async function refundGeneratorTask(input: {
  userId: string; generationId: string;
  reason: string; providerStatus?: string;
  allowedStatuses?: readonly (typeof REFUNDABLE)[number][];
}) {
  const token = getUuid();
  return db().transaction(async (tx: any) => {
    await tx.update(aiTask).set({
      status: 'refunding',
      taskResult: JSON.stringify({ refundClaim: token }),
    }).where(and(
      eq(aiTask.id, input.generationId), eq(aiTask.userId, input.userId),
      eq(aiTask.scene, GENERATOR_SCENE),
      inArray(aiTask.status, [...(input.allowedStatuses ?? REFUNDABLE)])
    ));

    const task = await getTaskFromTx(tx, input.generationId);
    if (task.status !== 'refunding' ||
        parseTaskJson(task.taskResult).refundClaim !== token) return null;

    if (task.creditId && task.costCredits > 0) {
      const restored = await revoke(task.creditId, tx);
      if (!restored) throw new Error('Unable to restore reserved generator credits');
    }
    await tx.update(aiTask).set({
      status: 'refunded',
      taskResult: JSON.stringify({
        error: input.reason,
        providerStatus: input.providerStatus ?? 'failed',
        refundedCredits: task.costCredits,
      }),
    }).where(and(
      eq(aiTask.id, input.generationId),
      eq(aiTask.userId, input.userId),
      eq(aiTask.scene, GENERATOR_SCENE),
      eq(aiTask.status, 'refunding')
    ));
    return getTaskFromTx(tx, input.generationId);
  });
}

export async function listGeneratorReconcileTasks(options?: {
  limit?: number; minAgeMs?: number;
}) {
  const max = Math.max(1, Math.min(100, options?.limit ?? 25));
  const cutoff = new Date(Date.now() - (options?.minAgeMs ?? 60_000));
  return db().select().from(aiTask).where(and(
    eq(aiTask.scene, GENERATOR_SCENE),
    lt(aiTask.updatedAt, cutoff),
    or(
      eq(aiTask.status, 'reserved'),
      eq(aiTask.status, 'submitting'),
      eq(aiTask.status, 'submitted'),
      eq(aiTask.status, 'completing'),
      and(eq(aiTask.status, 'submission_unknown'), isNotNull(aiTask.taskId))
    )
  )).orderBy(aiTask.updatedAt).limit(max);
}

export async function recoverStaleGeneratorTask(task: GeneratorTask) {
  if (task.status === 'reserved') {
    // No provider submission was claimed; reserve is safe to reverse.
    if (Date.now() - task.updatedAt.getTime() < 10 * 60 * 1000) return task;
    return await refundGeneratorTask({
      generationId: task.id, userId: task.userId,
      reason: 'Generation was not submitted',
      allowedStatuses: ['reserved'],
    });
  }
  if (task.status === 'submitting') {
    const claimed = Date.parse(parseTaskJson(task.taskResult).submittingClaimedAt || '');
    if (Number.isFinite(claimed) && Date.now() - claimed < SUBMISSION_CLAIM_TTL_MS) {
      return task;
    }
    await db().update(aiTask).set({
      status: 'submission_unknown',
      taskResult: JSON.stringify({
        error: 'Submission may have reached provider; review required',
        submittedAt: null,
      }),
    }).where(and(
      eq(aiTask.id, task.id), eq(aiTask.userId, task.userId),
      eq(aiTask.scene, GENERATOR_SCENE),
      eq(aiTask.status, 'submitting')
    ));
  }
  return getGeneratorTask({ generationId: task.id, userId: task.userId });
}
