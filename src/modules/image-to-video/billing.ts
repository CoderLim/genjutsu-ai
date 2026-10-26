import { and, eq, inArray } from 'drizzle-orm';

import { db } from '@/core/db';
import { aiTask } from '@/config/db/schema';
import { consume, getBalance, revoke } from '@/modules/credits/service';
import { rowsAffectedFromUpdate } from '@/lib/fal-query-error-cas';
import { getUuid } from '@/lib/hash';

import {
  IMAGE_TO_VIDEO_MODEL,
  IMAGE_TO_VIDEO_PROVIDER,
  IMAGE_TO_VIDEO_SCENE,
  IMAGE_TO_VIDEO_SUBMITTING_CLAIM_TTL_MS,
  type ImageToVideoAspectRatio,
  type ImageToVideoResolution,
} from './constants';
import type { ImageToVideoPresetId, ImageToVideoVariant } from './presets';

export type ImageToVideoTaskStatus =
  | 'initiated'
  | 'ready'
  | 'reserved'
  | 'submitting'
  | 'submitted'
  | 'completing'
  | 'completed'
  | 'refunding'
  | 'refunded'
  | 'submission_unknown';

export class ImageToVideoInsufficientCreditsError extends Error {
  constructor(
    public requiredCredits: number,
    public balance: number
  ) {
    super('Insufficient credits');
    this.name = 'ImageToVideoInsufficientCreditsError';
  }
}

export class ImageToVideoGenerationConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ImageToVideoGenerationConflictError';
  }
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

export function parseImageToVideoTask(task: {
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

export async function getImageToVideoTaskById(params: {
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
        eq(aiTask.scene, IMAGE_TO_VIDEO_SCENE)
      )
    )
    .limit(1);
  return task ?? null;
}

export async function getImageToVideoTaskByGenerationId(generationId: string) {
  const [task] = await db()
    .select()
    .from(aiTask)
    .where(
      and(eq(aiTask.id, generationId), eq(aiTask.scene, IMAGE_TO_VIDEO_SCENE))
    )
    .limit(1);
  return task ?? null;
}

export async function ensureImageToVideoInitiatedTask(params: {
  generationId: string;
  userId: string;
  presetId: ImageToVideoPresetId;
  variant: ImageToVideoVariant;
  stagingImageKey: string;
}) {
  const existing = await getImageToVideoTaskById({
    generationId: params.generationId,
    userId: params.userId,
  });
  if (existing) {
    const options = parseJson(existing.options);
    if (
      options?.presetId !== params.presetId ||
      options?.stagingImageKey !== params.stagingImageKey
    ) {
      throw new ImageToVideoGenerationConflictError(
        'This generation ID is already bound to different inputs'
      );
    }
    return existing;
  }

  await db()
    .insert(aiTask)
    .values({
      id: params.generationId,
      userId: params.userId,
      mediaType: 'video',
      provider: IMAGE_TO_VIDEO_PROVIDER,
      model: IMAGE_TO_VIDEO_MODEL,
      prompt: '',
      options: JSON.stringify({
        presetId: params.presetId,
        variant: params.variant,
        stagingImageKey: params.stagingImageKey,
      }),
      status: 'initiated',
      taskId: null,
      taskInfo: null,
      taskResult: null,
      costCredits: 0,
      scene: IMAGE_TO_VIDEO_SCENE,
      creditId: null,
    });

  return getImageToVideoTaskById(params);
}

export async function reserveImageToVideoGeneration(params: {
  generationId: string;
  userId: string;
  userEmail?: string;
  prompt: string;
  duration: number;
  resolution: ImageToVideoResolution;
  aspectRatio: ImageToVideoAspectRatio;
  generateAudio: boolean;
  sealedImageKey: string;
  stagingImageKey: string;
  providerCostUsd: number;
  credits: number;
  presetId: ImageToVideoPresetId;
  presetVersion: number;
  variant: ImageToVideoVariant;
  displayName: string;
  creditDescription?: string;
}) {
  const existing = await getImageToVideoTaskById({
    generationId: params.generationId,
    userId: params.userId,
  });

  if (
    existing &&
    existing.status !== 'initiated' &&
    existing.status !== 'ready'
  ) {
    const options = parseJson(existing.options);
    if (
      options?.sealedImageKey !== params.sealedImageKey ||
      options?.presetId !== params.presetId ||
      options?.variant !== params.variant ||
      (existing.prompt || '') !== params.prompt
    ) {
      throw new ImageToVideoGenerationConflictError(
        'This generation ID is already bound to different inputs'
      );
    }
    return existing;
  }

  const result = await db().transaction(async (tx: any) => {
    const [inside] = await tx
      .select()
      .from(aiTask)
      .where(
        and(
          eq(aiTask.id, params.generationId),
          eq(aiTask.userId, params.userId),
          eq(aiTask.scene, IMAGE_TO_VIDEO_SCENE)
        )
      )
      .limit(1);

    if (inside && inside.status !== 'initiated' && inside.status !== 'ready') {
      return { task: inside, insufficient: false };
    }

    const consumed = await consume({
      userId: params.userId,
      userEmail: params.userEmail,
      credits: params.credits,
      scene: IMAGE_TO_VIDEO_SCENE,
      description:
        params.creditDescription ||
        'Reserve credits for image-to-video generation',
      metadata: JSON.stringify({
        generationId: params.generationId,
        model: IMAGE_TO_VIDEO_MODEL,
        resolution: params.resolution,
        duration: params.duration,
        providerCostUsd: params.providerCostUsd,
        presetId: params.presetId,
        variant: params.variant,
      }),
      tx,
    });

    if (!consumed.success || !consumed.consumedCredit) {
      return { task: null, insufficient: true };
    }

    const options = {
      duration: params.duration,
      resolution: params.resolution,
      aspectRatio: params.aspectRatio,
      generateAudio: params.generateAudio,
      sealedImageKey: params.sealedImageKey,
      stagingImageKey: params.stagingImageKey,
      imageKeys: [params.sealedImageKey],
      presetId: params.presetId,
      presetVersion: params.presetVersion,
      variant: params.variant,
      displayName: params.displayName,
      provider: IMAGE_TO_VIDEO_PROVIDER,
      model: IMAGE_TO_VIDEO_MODEL,
    };

    if (inside) {
      await tx
        .update(aiTask)
        .set({
          status: 'reserved',
          prompt: params.prompt,
          provider: IMAGE_TO_VIDEO_PROVIDER,
          model: IMAGE_TO_VIDEO_MODEL,
          options: JSON.stringify(options),
          taskInfo: JSON.stringify({
            providerCostUsd: params.providerCostUsd,
          }),
          costCredits: params.credits,
          creditId: consumed.consumedCredit.id,
        })
        .where(
          and(
            eq(aiTask.id, params.generationId),
            eq(aiTask.userId, params.userId),
            eq(aiTask.scene, IMAGE_TO_VIDEO_SCENE),
            inArray(aiTask.status, ['initiated', 'ready'])
          )
        );
      const [updated] = await tx
        .select()
        .from(aiTask)
        .where(eq(aiTask.id, params.generationId))
        .limit(1);
      return { task: updated, insufficient: false };
    }

    const task = {
      id: params.generationId,
      userId: params.userId,
      mediaType: 'video',
      provider: IMAGE_TO_VIDEO_PROVIDER,
      model: IMAGE_TO_VIDEO_MODEL,
      prompt: params.prompt,
      options: JSON.stringify(options),
      status: 'reserved',
      taskId: null,
      taskInfo: JSON.stringify({
        providerCostUsd: params.providerCostUsd,
      }),
      taskResult: null,
      costCredits: params.credits,
      scene: IMAGE_TO_VIDEO_SCENE,
      creditId: consumed.consumedCredit.id,
    };

    await tx.insert(aiTask).values(task);
    return { task, insufficient: false };
  });

  if (result.insufficient || !result.task) {
    const balance = await getBalance(params.userId);
    throw new ImageToVideoInsufficientCreditsError(params.credits, balance);
  }

  return result.task;
}

export async function claimImageToVideoSubmission(params: {
  generationId: string;
  userId: string;
}) {
  const claim = getUuid();
  const claimedAt = new Date().toISOString();
  await db()
    .update(aiTask)
    .set({
      status: 'submitting',
      taskResult: JSON.stringify({
        submissionClaim: claim,
        submittingClaimedAt: claimedAt,
      }),
    })
    .where(
      and(
        eq(aiTask.id, params.generationId),
        eq(aiTask.userId, params.userId),
        eq(aiTask.scene, IMAGE_TO_VIDEO_SCENE),
        eq(aiTask.status, 'reserved')
      )
    );

  const task = await getImageToVideoTaskById(params);
  if (!task || task.status !== 'submitting') return false;
  return parseJson(task.taskResult)?.submissionClaim === claim;
}

export async function markImageToVideoSubmitted(params: {
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
        eq(aiTask.scene, IMAGE_TO_VIDEO_SCENE),
        eq(aiTask.status, 'submitting')
      )
    );
  return getImageToVideoTaskById(params);
}

export async function markImageToVideoSubmissionUnknown(params: {
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
        eq(aiTask.scene, IMAGE_TO_VIDEO_SCENE),
        eq(aiTask.status, 'submitting')
      )
    );
}

/** Promote stale submitting (process death) → submission_unknown. */
export async function promoteStaleImageToVideoSubmitting(params: {
  generationId: string;
  userId: string;
  nowMs?: number;
  ttlMs?: number;
}) {
  const task = await getImageToVideoTaskById(params);
  if (!task || task.status !== 'submitting') return null;

  const result = parseJson(task.taskResult);
  const claimedAt = result?.submittingClaimedAt;
  if (typeof claimedAt !== 'string') return null;

  const claimedMs = Date.parse(claimedAt);
  if (!Number.isFinite(claimedMs)) return null;

  const now = params.nowMs ?? Date.now();
  const ttl = params.ttlMs ?? IMAGE_TO_VIDEO_SUBMITTING_CLAIM_TTL_MS;
  if (now - claimedMs < ttl) return null;

  await db()
    .update(aiTask)
    .set({
      status: 'submission_unknown',
      taskResult: JSON.stringify({
        error:
          'Submission claim expired before upstream bind (possible process interruption). Credits remain reserved; contact support before retrying.',
        submittingClaimedAt: claimedAt,
        stalePromotedAt: new Date(now).toISOString(),
        ...(task.taskId ? { requestId: task.taskId } : {}),
      }),
    })
    .where(
      and(
        eq(aiTask.id, params.generationId),
        eq(aiTask.userId, params.userId),
        eq(aiTask.scene, IMAGE_TO_VIDEO_SCENE),
        eq(aiTask.status, 'submitting')
      )
    );

  return getImageToVideoTaskById(params);
}

export async function claimImageToVideoCompletion(params: {
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
        eq(aiTask.scene, IMAGE_TO_VIDEO_SCENE),
        eq(aiTask.status, 'submitted')
      )
    );

  if (rowsAffectedFromUpdate(result) > 0) return 'claimed';

  const current = await getImageToVideoTaskById(params);
  if (current?.status === 'completing') return 'already_completing';
  return 'unavailable';
}

export async function finalizeImageToVideoGeneration(params: {
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
        eq(aiTask.scene, IMAGE_TO_VIDEO_SCENE),
        eq(aiTask.status, 'completing')
      )
    );

  return getImageToVideoTaskById(params);
}

export async function refundImageToVideoGeneration(params: {
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
          eq(aiTask.scene, IMAGE_TO_VIDEO_SCENE),
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
          eq(aiTask.scene, IMAGE_TO_VIDEO_SCENE)
        )
      )
      .limit(1);

    if (!task || task.status !== 'refunding') return null;
    const result = parseJson(task.taskResult);
    if (result?.refundClaim !== claim) return null;

    if (task.creditId && task.costCredits && task.costCredits > 0) {
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
          eq(aiTask.scene, IMAGE_TO_VIDEO_SCENE),
          eq(aiTask.status, 'refunding')
        )
      );

    const [updated] = await tx
      .select()
      .from(aiTask)
      .where(eq(aiTask.id, params.generationId))
      .limit(1);
    return updated ?? null;
  });
}

export function readSubmittingClaimedAt(
  taskResult: string | null | undefined
): string | null {
  const parsed = parseJson(taskResult);
  return typeof parsed?.submittingClaimedAt === 'string'
    ? parsed.submittingClaimedAt
    : null;
}
