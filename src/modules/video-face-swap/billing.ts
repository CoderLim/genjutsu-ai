import { and, eq, inArray, isNotNull, lt, or } from 'drizzle-orm';

import { db } from '@/core/db';
import { aiTask } from '@/config/db/schema';
import { consume, getBalance, revoke } from '@/modules/credits/service';
import { rowsAffectedFromUpdate } from '@/lib/fal-query-error-cas';
import { getUuid } from '@/lib/hash';

import {
  VIDEO_FACE_SWAP_COMPLETING_CLAIM_TTL_MS,
  VIDEO_FACE_SWAP_CONSENT_VERSION,
  VIDEO_FACE_SWAP_MODEL,
  VIDEO_FACE_SWAP_PRICING_VERSION,
  VIDEO_FACE_SWAP_PROVIDER,
  VIDEO_FACE_SWAP_RECONCILE_BATCH_LIMIT,
  VIDEO_FACE_SWAP_RECONCILE_MIN_AGE_MS,
  VIDEO_FACE_SWAP_SCENE,
  VIDEO_FACE_SWAP_SUBMITTING_CLAIM_TTL_MS,
  type VideoFaceSwapResolution,
} from './constants';

/** Statuses that may atomically enter the refunding claim. */
export const VIDEO_FACE_SWAP_REFUNDABLE_STATUSES = [
  'reserved',
  'submitting',
  'submitted',
  'submission_unknown',
] as const;

export type VideoFaceSwapTaskStatus =
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

export class VideoFaceSwapInsufficientCreditsError extends Error {
  constructor(
    public requiredCredits: number,
    public balance: number
  ) {
    super('Insufficient credits');
    this.name = 'VideoFaceSwapInsufficientCreditsError';
  }
}

export class VideoFaceSwapGenerationConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'VideoFaceSwapGenerationConflictError';
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

export function parseVideoFaceSwapTask(task: {
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

export async function getVideoFaceSwapTaskById(params: {
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
        eq(aiTask.scene, VIDEO_FACE_SWAP_SCENE)
      )
    )
    .limit(1);
  return task ?? null;
}

export async function getVideoFaceSwapTaskByGenerationId(generationId: string) {
  const [task] = await db()
    .select()
    .from(aiTask)
    .where(
      and(eq(aiTask.id, generationId), eq(aiTask.scene, VIDEO_FACE_SWAP_SCENE))
    )
    .limit(1);
  return task ?? null;
}

export function getVideoFaceSwapUploadBinding(task: {
  options?: string | null;
}) {
  const options = parseJson(task.options);
  if (!options) return null;
  const stagingVideoKey =
    typeof options.stagingVideoKey === 'string'
      ? options.stagingVideoKey
      : null;
  const stagingImageKey =
    typeof options.stagingImageKey === 'string'
      ? options.stagingImageKey
      : null;
  const videoContentType =
    typeof options.videoContentType === 'string'
      ? options.videoContentType
      : null;
  const imageContentType =
    typeof options.imageContentType === 'string'
      ? options.imageContentType
      : null;
  const videoContentLength = Number(options.videoContentLength);
  const imageContentLength = Number(options.imageContentLength);
  if (
    !stagingVideoKey ||
    !stagingImageKey ||
    !videoContentType ||
    !imageContentType ||
    !Number.isSafeInteger(videoContentLength) ||
    videoContentLength <= 0 ||
    !Number.isSafeInteger(imageContentLength) ||
    imageContentLength <= 0
  ) {
    return null;
  }
  return {
    stagingVideoKey,
    stagingImageKey,
    videoContentType,
    imageContentType,
    videoContentLength,
    imageContentLength,
  };
}

export async function ensureVideoFaceSwapInitiatedTask(params: {
  generationId: string;
  userId: string;
  stagingVideoKey: string;
  stagingImageKey: string;
  videoContentType: string;
  imageContentType: string;
  videoContentLength: number;
  imageContentLength: number;
  consentVersion?: string;
}) {
  const consentVersion =
    params.consentVersion || VIDEO_FACE_SWAP_CONSENT_VERSION;
  const existing = await getVideoFaceSwapTaskById({
    generationId: params.generationId,
    userId: params.userId,
  });
  if (existing) {
    const options = parseJson(existing.options);
    if (
      options?.stagingVideoKey !== params.stagingVideoKey ||
      options?.stagingImageKey !== params.stagingImageKey ||
      options?.videoContentType !== params.videoContentType ||
      options?.imageContentType !== params.imageContentType ||
      Number(options?.videoContentLength) !== params.videoContentLength ||
      Number(options?.imageContentLength) !== params.imageContentLength
    ) {
      throw new VideoFaceSwapGenerationConflictError(
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
      provider: VIDEO_FACE_SWAP_PROVIDER,
      model: VIDEO_FACE_SWAP_MODEL,
      prompt: '',
      options: JSON.stringify({
        stagingVideoKey: params.stagingVideoKey,
        stagingImageKey: params.stagingImageKey,
        videoContentType: params.videoContentType,
        imageContentType: params.imageContentType,
        videoContentLength: params.videoContentLength,
        imageContentLength: params.imageContentLength,
        consentVersion,
        displayName: 'Video Face Swap',
      }),
      status: 'initiated',
      taskId: null,
      taskInfo: null,
      taskResult: null,
      costCredits: 0,
      scene: VIDEO_FACE_SWAP_SCENE,
      creditId: null,
    });

  return getVideoFaceSwapTaskById(params);
}

export type VideoFaceSwapMatchSnapshot = {
  prompt: string;
  durationSeconds: number;
  billableSeconds: number;
  resolution: VideoFaceSwapResolution;
  sealedVideoKey: string;
  sealedImageKey: string;
  stagingVideoKey: string;
  stagingImageKey: string;
  pricingVersion: string;
  consentVersion: string;
  preview: boolean;
};

export function assertVideoFaceSwapTaskMatches(
  task: { prompt?: string | null; options?: string | null; status?: string },
  params: VideoFaceSwapMatchSnapshot
) {
  const options = parseJson(task.options);
  const same =
    (task.prompt || '') === params.prompt &&
    options?.sealedVideoKey === params.sealedVideoKey &&
    options?.sealedImageKey === params.sealedImageKey &&
    options?.stagingVideoKey === params.stagingVideoKey &&
    options?.stagingImageKey === params.stagingImageKey &&
    Number(options?.durationSeconds) === params.durationSeconds &&
    Number(options?.billableSeconds) === params.billableSeconds &&
    options?.resolution === params.resolution &&
    options?.pricingVersion === params.pricingVersion &&
    options?.consentVersion === params.consentVersion &&
    Boolean(options?.preview) === Boolean(params.preview);

  if (!same) {
    throw new VideoFaceSwapGenerationConflictError(
      'This generation ID is already bound to different inputs'
    );
  }
}

export async function reserveVideoFaceSwapGeneration(params: {
  generationId: string;
  userId: string;
  userEmail?: string;
  prompt: string;
  durationSeconds: number;
  billableSeconds: number;
  resolution: VideoFaceSwapResolution;
  sealedVideoKey: string;
  sealedImageKey: string;
  stagingVideoKey: string;
  stagingImageKey: string;
  providerCostUsd: number;
  credits: number;
  pricingVersion: string;
  consentVersion: string;
  preview: boolean;
}) {
  const existing = await getVideoFaceSwapTaskById({
    generationId: params.generationId,
    userId: params.userId,
  });

  const matchSnapshot: VideoFaceSwapMatchSnapshot = {
    prompt: params.prompt,
    durationSeconds: params.durationSeconds,
    billableSeconds: params.billableSeconds,
    resolution: params.resolution,
    sealedVideoKey: params.sealedVideoKey,
    sealedImageKey: params.sealedImageKey,
    stagingVideoKey: params.stagingVideoKey,
    stagingImageKey: params.stagingImageKey,
    pricingVersion: params.pricingVersion,
    consentVersion: params.consentVersion,
    preview: params.preview,
  };

  if (
    existing &&
    existing.status !== 'initiated' &&
    existing.status !== 'ready'
  ) {
    assertVideoFaceSwapTaskMatches(existing, matchSnapshot);
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
          eq(aiTask.scene, VIDEO_FACE_SWAP_SCENE)
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
      scene: VIDEO_FACE_SWAP_SCENE,
      description: 'Reserve credits for video face swap generation',
      metadata: JSON.stringify({
        generationId: params.generationId,
        model: VIDEO_FACE_SWAP_MODEL,
        resolution: params.resolution,
        durationSeconds: params.durationSeconds,
        billableSeconds: params.billableSeconds,
        providerCostUsd: params.providerCostUsd,
        pricingVersion: params.pricingVersion,
        preview: params.preview,
      }),
      tx,
    });

    if (!consumed.success || !consumed.consumedCredit) {
      return { task: null, insufficient: true };
    }

    const prior = parseJson(inside?.options);
    const options = {
      durationSeconds: params.durationSeconds,
      billableSeconds: params.billableSeconds,
      resolution: params.resolution,
      sealedVideoKey: params.sealedVideoKey,
      sealedImageKey: params.sealedImageKey,
      stagingVideoKey: params.stagingVideoKey,
      stagingImageKey: params.stagingImageKey,
      videoKey: params.sealedVideoKey,
      imageKeys: [params.sealedImageKey],
      pricingVersion: params.pricingVersion,
      consentVersion: params.consentVersion,
      preview: params.preview,
      kind: params.preview ? ('preview' as const) : ('full' as const),
      displayName: params.preview
        ? 'Video Face Swap Preview'
        : 'Video Face Swap',
      provider: VIDEO_FACE_SWAP_PROVIDER,
      model: VIDEO_FACE_SWAP_MODEL,
      videoContentType: prior?.videoContentType,
      imageContentType: prior?.imageContentType,
      videoContentLength: prior?.videoContentLength,
      imageContentLength: prior?.imageContentLength,
    };

    if (inside) {
      await tx
        .update(aiTask)
        .set({
          status: 'reserved',
          prompt: params.prompt,
          provider: VIDEO_FACE_SWAP_PROVIDER,
          model: VIDEO_FACE_SWAP_MODEL,
          options: JSON.stringify(options),
          taskInfo: JSON.stringify({
            providerCostUsd: params.providerCostUsd,
            pricingVersion: params.pricingVersion,
          }),
          costCredits: params.credits,
          creditId: consumed.consumedCredit.id,
        })
        .where(
          and(
            eq(aiTask.id, params.generationId),
            eq(aiTask.userId, params.userId),
            eq(aiTask.scene, VIDEO_FACE_SWAP_SCENE),
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
      provider: VIDEO_FACE_SWAP_PROVIDER,
      model: VIDEO_FACE_SWAP_MODEL,
      prompt: params.prompt,
      options: JSON.stringify(options),
      status: 'reserved',
      taskId: null,
      taskInfo: JSON.stringify({
        providerCostUsd: params.providerCostUsd,
        pricingVersion: params.pricingVersion,
      }),
      taskResult: null,
      costCredits: params.credits,
      scene: VIDEO_FACE_SWAP_SCENE,
      creditId: consumed.consumedCredit.id,
    };

    await tx.insert(aiTask).values(task);
    return { task, insufficient: false };
  });

  if (result.insufficient || !result.task) {
    const balance = await getBalance(params.userId);
    throw new VideoFaceSwapInsufficientCreditsError(params.credits, balance);
  }

  return result.task;
}

export async function claimVideoFaceSwapSubmission(params: {
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
        eq(aiTask.scene, VIDEO_FACE_SWAP_SCENE),
        eq(aiTask.status, 'reserved')
      )
    );

  const task = await getVideoFaceSwapTaskById(params);
  if (!task || task.status !== 'submitting') return false;
  return parseJson(task.taskResult)?.submissionClaim === claim;
}

export async function markVideoFaceSwapSubmitted(params: {
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
        eq(aiTask.scene, VIDEO_FACE_SWAP_SCENE),
        eq(aiTask.status, 'submitting')
      )
    );
  return getVideoFaceSwapTaskById(params);
}

export async function markVideoFaceSwapSubmissionUnknown(params: {
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
        eq(aiTask.scene, VIDEO_FACE_SWAP_SCENE),
        eq(aiTask.status, 'submitting')
      )
    );
}

/** Promote stale submitting (process death) → submission_unknown. */
export async function promoteStaleVideoFaceSwapSubmitting(params: {
  generationId: string;
  userId: string;
  nowMs?: number;
  ttlMs?: number;
}) {
  const task = await getVideoFaceSwapTaskById(params);
  if (!task || task.status !== 'submitting') return null;

  const result = parseJson(task.taskResult);
  const claimedAt = result?.submittingClaimedAt;
  if (typeof claimedAt !== 'string') return null;

  const claimedMs = Date.parse(claimedAt);
  if (!Number.isFinite(claimedMs)) return null;

  const now = params.nowMs ?? Date.now();
  const ttl = params.ttlMs ?? VIDEO_FACE_SWAP_SUBMITTING_CLAIM_TTL_MS;
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
        eq(aiTask.scene, VIDEO_FACE_SWAP_SCENE),
        eq(aiTask.status, 'submitting')
      )
    );

  return getVideoFaceSwapTaskById(params);
}

/**
 * Atomic reopen: submission_unknown → submitted when a requestId is known.
 * Enables the normal claim → R2 → finalize path (do not fake submitted in memory).
 */
export async function promoteVideoFaceSwapSubmissionUnknownToSubmitted(params: {
  generationId: string;
  userId: string;
}) {
  const result = await db()
    .update(aiTask)
    .set({
      status: 'submitted',
      taskResult: null,
    })
    .where(
      and(
        eq(aiTask.id, params.generationId),
        eq(aiTask.userId, params.userId),
        eq(aiTask.scene, VIDEO_FACE_SWAP_SCENE),
        eq(aiTask.status, 'submission_unknown'),
        isNotNull(aiTask.taskId)
      )
    );
  if (rowsAffectedFromUpdate(result) <= 0) return null;
  return getVideoFaceSwapTaskById(params);
}

/**
 * Tasks eligible for unattended reconcile (age-gated). Caller must not
 * re-submit WaveSpeed — only poll / persist / refund via reconcile.
 */
export async function listVideoFaceSwapTasksNeedingReconcile(params?: {
  limit?: number;
  minAgeMs?: number;
  nowMs?: number;
}) {
  const limit = Math.min(
    Math.max(1, params?.limit ?? VIDEO_FACE_SWAP_RECONCILE_BATCH_LIMIT),
    100
  );
  const minAgeMs = params?.minAgeMs ?? VIDEO_FACE_SWAP_RECONCILE_MIN_AGE_MS;
  const cutoff = new Date((params?.nowMs ?? Date.now()) - minAgeMs);

  return db()
    .select()
    .from(aiTask)
    .where(
      and(
        eq(aiTask.scene, VIDEO_FACE_SWAP_SCENE),
        lt(aiTask.updatedAt, cutoff),
        or(
          eq(aiTask.status, 'submitted'),
          eq(aiTask.status, 'completing'),
          and(eq(aiTask.status, 'submission_unknown'), isNotNull(aiTask.taskId))
        )
      )
    )
    .orderBy(aiTask.updatedAt)
    .limit(limit);
}

export async function claimVideoFaceSwapCompletion(params: {
  generationId: string;
  userId: string;
  nowMs?: number;
  ttlMs?: number;
}): Promise<'claimed' | 'already_completing' | 'unavailable'> {
  const claim = getUuid();
  const claimedAt = new Date(params.nowMs ?? Date.now()).toISOString();
  const fromSubmitted = await db()
    .update(aiTask)
    .set({
      status: 'completing',
      taskResult: JSON.stringify({
        completionClaim: claim,
        completingClaimedAt: claimedAt,
      }),
    })
    .where(
      and(
        eq(aiTask.id, params.generationId),
        eq(aiTask.userId, params.userId),
        eq(aiTask.scene, VIDEO_FACE_SWAP_SCENE),
        eq(aiTask.status, 'submitted')
      )
    );

  if (rowsAffectedFromUpdate(fromSubmitted) > 0) return 'claimed';

  const current = await getVideoFaceSwapTaskById(params);
  if (!current) return 'unavailable';
  if (current.status === 'completed') return 'unavailable';
  if (current.status !== 'completing') return 'unavailable';

  const priorClaimedAt = readCompletingClaimedAt(current.taskResult);
  const priorMs = priorClaimedAt ? Date.parse(priorClaimedAt) : NaN;
  const now = params.nowMs ?? Date.now();
  const ttl = params.ttlMs ?? VIDEO_FACE_SWAP_COMPLETING_CLAIM_TTL_MS;
  const leaseExpired = !Number.isFinite(priorMs) || now - priorMs >= ttl;

  if (leaseExpired) {
    // Atomic reclaim: refresh lease so a hung Worker does not block persist.
    const reclaimed = await db()
      .update(aiTask)
      .set({
        status: 'completing',
        taskResult: JSON.stringify({
          completionClaim: claim,
          completingClaimedAt: new Date(now).toISOString(),
          completionReclaimedAt: new Date(now).toISOString(),
        }),
      })
      .where(
        and(
          eq(aiTask.id, params.generationId),
          eq(aiTask.userId, params.userId),
          eq(aiTask.scene, VIDEO_FACE_SWAP_SCENE),
          eq(aiTask.status, 'completing')
        )
      );
    if (rowsAffectedFromUpdate(reclaimed) > 0) return 'claimed';
  }

  // Fresh lease held by another worker — still OK to run idempotent persist.
  return 'already_completing';
}

export async function finalizeVideoFaceSwapGeneration(params: {
  generationId: string;
  userId: string;
  providerStatus: string;
  videoKey: string;
}) {
  if (!params.videoKey) {
    throw new Error('Cannot finalize video-face-swap without a video key');
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
        eq(aiTask.scene, VIDEO_FACE_SWAP_SCENE),
        eq(aiTask.status, 'completing')
      )
    );

  return getVideoFaceSwapTaskById(params);
}

export async function refundVideoFaceSwapGeneration(params: {
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
          eq(aiTask.scene, VIDEO_FACE_SWAP_SCENE),
          inArray(aiTask.status, [...VIDEO_FACE_SWAP_REFUNDABLE_STATUSES])
        )
      );

    const [task] = await tx
      .select()
      .from(aiTask)
      .where(
        and(
          eq(aiTask.id, params.generationId),
          eq(aiTask.userId, params.userId),
          eq(aiTask.scene, VIDEO_FACE_SWAP_SCENE)
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
          eq(aiTask.scene, VIDEO_FACE_SWAP_SCENE),
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

export function readCompletingClaimedAt(
  taskResult: string | null | undefined
): string | null {
  const parsed = parseJson(taskResult);
  return typeof parsed?.completingClaimedAt === 'string'
    ? parsed.completingClaimedAt
    : null;
}
