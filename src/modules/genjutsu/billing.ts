import { and, eq, inArray } from 'drizzle-orm';

import { db } from '@/core/db';
import { aiTask } from '@/config/db/schema';
import {
  consume,
  CreditTransactionScene,
  getBalance,
  revoke,
} from '@/modules/credits/service';
import { getUuid } from '@/lib/hash';

import {
  type GenjutsuMode,
  type GenjutsuProvider,
  type GenjutsuResolution,
} from './service';

export const GENJUTSU_SCENE = 'genjutsu';

export type GenjutsuTaskStatus =
  | 'initiated'
  | 'sealing'
  | 'ready'
  | 'failed_preflight'
  | 'insufficient_credits'
  | 'reserving'
  | 'reserved'
  | 'submitting'
  | 'submitted'
  | 'refunding'
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

export class GenjutsuAttemptConflictError extends Error {
  constructor(
    public code:
      | 'GENERATION_INPUT_CONFLICT'
      | 'GENERATION_ALREADY_STARTED'
      | 'GENERATION_INPUT_NOT_READY',
    message: string
  ) {
    super(message);
    this.name = 'GenjutsuAttemptConflictError';
  }
}

function parseTaskOptions(task: { options?: string | null }) {
  if (!task.options) return null;
  try {
    return JSON.parse(task.options);
  } catch {
    return null;
  }
}

function parseTaskInfo(task: {
  taskInfo?: string | null;
}): Record<string, unknown> {
  if (!task.taskInfo) return {};
  try {
    const parsed = JSON.parse(task.taskInfo);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return {};
    }
    return parsed as Record<string, unknown>;
  } catch {
    return {};
  }
}

function mergeTaskInfo(
  task: { taskInfo?: string | null },
  patch: Record<string, unknown>
): string {
  return JSON.stringify({
    ...parseTaskInfo(task),
    ...patch,
  });
}

function assertAttemptMetadata(
  task: any,
  params: {
    mode: GenjutsuMode;
    provider: GenjutsuProvider;
    model: string;
    resolution: GenjutsuResolution;
    prompt: string;
  }
) {
  const options = parseTaskOptions(task);
  const matches =
    task.provider === params.provider &&
    task.model === params.model &&
    (task.prompt || '') === params.prompt &&
    options?.mode === params.mode &&
    options?.resolution === params.resolution &&
    options?.prompt === params.prompt;

  if (!matches) {
    throw new GenjutsuAttemptConflictError(
      'GENERATION_INPUT_CONFLICT',
      'This generation ID is already bound to different generation settings'
    );
  }
  return options;
}

function assertReusableUploadBinding(
  task: any,
  params: {
    mode: GenjutsuMode;
    provider: GenjutsuProvider;
    model: string;
    resolution: GenjutsuResolution;
    prompt: string;
    videoKey: string;
    imageKeys: string[];
    contentTypes: string[];
    contentLengths: number[];
  }
) {
  if (task.status !== 'initiated') {
    throw new GenjutsuAttemptConflictError(
      'GENERATION_ALREADY_STARTED',
      'This generation has already started and its upload inputs can no longer be changed'
    );
  }

  const options = assertAttemptMetadata(task, params);
  const imageKeys = Array.isArray(options?.imageKeys)
    ? options.imageKeys
    : null;
  const contentTypes = Array.isArray(options?.contentTypes)
    ? options.contentTypes
    : null;
  const contentLengths = Array.isArray(options?.contentLengths)
    ? options.contentLengths
    : null;

  if (!options?.videoKey) return task;

  const matches =
    options.videoKey === params.videoKey &&
    imageKeys !== null &&
    imageKeys.length === params.imageKeys.length &&
    imageKeys.every(
      (key: unknown, index: number) => key === params.imageKeys[index]
    ) &&
    contentTypes !== null &&
    contentTypes.length === params.contentTypes.length &&
    contentTypes.every(
      (value: unknown, index: number) => value === params.contentTypes[index]
    ) &&
    contentLengths !== null &&
    contentLengths.length === params.contentLengths.length &&
    contentLengths.every(
      (value: unknown, index: number) => value === params.contentLengths[index]
    );

  if (!matches) {
    throw new GenjutsuAttemptConflictError(
      'GENERATION_INPUT_CONFLICT',
      'This generation ID is already bound to different upload inputs'
    );
  }

  return task;
}

export function assertGenerationId(value: unknown): string {
  if (typeof value !== 'string' || !/^[A-Za-z0-9_-]{8,128}$/.test(value)) {
    throw new Error('Invalid generation ID');
  }
  return value;
}

export async function createGenjutsuAttempt(params: {
  generationId: string;
  userId: string;
  mode: GenjutsuMode;
  provider: GenjutsuProvider;
  model: string;
  resolution: GenjutsuResolution;
  prompt: string;
}) {
  const existing = await getGenjutsuTaskById({
    generationId: params.generationId,
    userId: params.userId,
  });
  if (existing) {
    assertAttemptMetadata(existing, params);
    if (existing.status !== 'initiated') {
      throw new GenjutsuAttemptConflictError(
        'GENERATION_ALREADY_STARTED',
        'This generation has already started'
      );
    }
    return existing;
  }

  const task = {
    id: params.generationId,
    userId: params.userId,
    mediaType: 'video',
    provider: params.provider,
    model: params.model,
    prompt: params.prompt,
    options: JSON.stringify({
      mode: params.mode,
      resolution: params.resolution,
      prompt: params.prompt,
    }),
    status: 'initiated',
    taskId: null,
    taskInfo: JSON.stringify({
      attemptStage: 'created',
      providerCostUsd: null,
      providerEstimate: null,
      sourceDurationSeconds: null,
    }),
    taskResult: null,
    costCredits: 0,
    scene: GENJUTSU_SCENE,
    creditId: null,
  };

  try {
    await db().insert(aiTask).values(task);
    return task;
  } catch (error) {
    const raced = await getGenjutsuTaskById({
      generationId: params.generationId,
      userId: params.userId,
    });
    if (raced) {
      assertAttemptMetadata(raced, params);
      if (raced.status !== 'initiated') {
        throw new GenjutsuAttemptConflictError(
          'GENERATION_ALREADY_STARTED',
          'This generation has already started'
        );
      }
      return raced;
    }
    throw error;
  }
}

export async function bindGenjutsuUploadInputs(params: {
  generationId: string;
  userId: string;
  mode: GenjutsuMode;
  provider: GenjutsuProvider;
  model: string;
  resolution: GenjutsuResolution;
  prompt: string;
  videoKey: string;
  imageKeys: string[];
  contentTypes: string[];
  contentLengths: number[];
}) {
  return db().transaction(async (tx: any) => {
    const [task] = await tx
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

    if (!task) throw new Error('Generation attempt not found');
    assertReusableUploadBinding(task, params);

    const currentOptions = parseTaskOptions(task) || {};
    if (currentOptions.videoKey) return task;

    const nextOptions = JSON.stringify({
      ...currentOptions,
      videoKey: params.videoKey,
      imageKeys: params.imageKeys,
      contentTypes: params.contentTypes,
      contentLengths: params.contentLengths,
    });

    await tx
      .update(aiTask)
      .set({
        options: nextOptions,
        taskInfo: mergeTaskInfo(task, {
          attemptStage: 'upload_requested',
          providerCostUsd: null,
          providerEstimate: null,
          sourceDurationSeconds: null,
        }),
      })
      .where(
        and(
          eq(aiTask.id, params.generationId),
          eq(aiTask.userId, params.userId),
          eq(aiTask.scene, GENJUTSU_SCENE),
          eq(aiTask.status, 'initiated'),
          eq(aiTask.options, task.options)
        )
      );

    const [bound] = await tx
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

    if (!bound) throw new Error('Generation attempt disappeared');
    return assertReusableUploadBinding(bound, params);
  });
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

export async function getGenjutsuTaskByGenerationId(generationId: string) {
  const [task] = await db()
    .select()
    .from(aiTask)
    .where(and(eq(aiTask.id, generationId), eq(aiTask.scene, GENJUTSU_SCENE)))
    .limit(1);
  return task ?? null;
}

export async function claimGenjutsuSeal(params: {
  generationId: string;
  userId: string;
}) {
  const sealClaim = getUuid();
  await db()
    .update(aiTask)
    .set({
      status: 'sealing',
      taskResult: JSON.stringify({ sealClaim }),
    })
    .where(
      and(
        eq(aiTask.id, params.generationId),
        eq(aiTask.userId, params.userId),
        eq(aiTask.scene, GENJUTSU_SCENE),
        eq(aiTask.status, 'initiated')
      )
    );

  const current = await getGenjutsuTaskById(params);
  if (!current || current.status !== 'sealing' || !current.taskResult) {
    return false;
  }

  try {
    return JSON.parse(current.taskResult)?.sealClaim === sealClaim;
  } catch {
    return false;
  }
}

export async function markGenjutsuAttemptReady(params: {
  generationId: string;
  userId: string;
  videoKey: string;
  imageKeys: string[];
}) {
  const task = await getGenjutsuTaskById(params);
  if (!task) throw new Error('Generation attempt not found');
  const options = parseTaskOptions(task);
  if (!options) throw new Error('Generation attempt options are invalid');

  await db()
    .update(aiTask)
    .set({
      status: 'ready',
      options: JSON.stringify({
        ...options,
        stagingVideoKey: options.videoKey,
        stagingImageKeys: options.imageKeys,
        videoKey: params.videoKey,
        imageKeys: params.imageKeys,
      }),
      taskInfo: mergeTaskInfo(task, {
        attemptStage: 'sealed',
        providerCostUsd: null,
        providerEstimate: null,
        sourceDurationSeconds: null,
      }),
      taskResult: null,
    })
    .where(
      and(
        eq(aiTask.id, params.generationId),
        eq(aiTask.userId, params.userId),
        eq(aiTask.scene, GENJUTSU_SCENE),
        eq(aiTask.status, 'sealing')
      )
    );

  return getGenjutsuTaskById(params);
}

export async function markGenjutsuAttemptFailedPreflight(params: {
  generationId: string;
  userId: string;
  stage: string;
  error: string;
  errorCode?: string;
}) {
  await db()
    .update(aiTask)
    .set({
      status: 'failed_preflight',
      taskResult: JSON.stringify({
        stage: params.stage,
        errorCode: params.errorCode ?? null,
        error: params.error,
      }),
    })
    .where(
      and(
        eq(aiTask.id, params.generationId),
        eq(aiTask.userId, params.userId),
        eq(aiTask.scene, GENJUTSU_SCENE),
        inArray(aiTask.status, ['initiated', 'sealing', 'ready'])
      )
    );
}

export async function markGenjutsuUploadFailed(params: {
  generationId: string;
  userId: string;
  errorCode: 'UPLOAD_HTTP_ERROR' | 'UPLOAD_NETWORK_ERROR' | 'UPLOAD_ABORTED';
  error: string;
  fileIndex: number;
  fileType: 'video' | 'image';
  httpStatus?: number | null;
  attemptCount?: number | null;
  uploadElapsedMs?: number | null;
  online?: boolean | null;
  visibilityState?: string | null;
  browser?: string | null;
  browserMajor?: number | null;
  os?: string | null;
  isWebView?: boolean | null;
  inAppBrowser?: string | null;
  effectiveType?: string | null;
  rttMs?: number | null;
  downlinkMbps?: number | null;
  origin?: string | null;
  uploadHost?: string | null;
  errorName?: string | null;
  errorMessage?: string | null;
  attempts?: Array<{
    attempt: number;
    elapsedMs: number;
    errorName: string | null;
    errorMessage: string | null;
    httpStatus: number | null;
  }> | null;
  cfCountry?: string | null;
  cfColo?: string | null;
  cfAsn?: number | null;
  r2ObjectExists?: boolean | null;
  r2ObjectSizeMatches?: boolean | null;
  r2ObjectTypeMatches?: boolean | null;
  r2InspectionStatus?: 'ok' | 'missing' | 'error' | 'skipped' | null;
  r2InspectionError?: string | null;
  recovered?: boolean;
}) {
  await db()
    .update(aiTask)
    .set({
      status: 'failed_preflight',
      taskResult: JSON.stringify({
        stage: 'upload',
        errorCode: params.errorCode,
        error: params.error,
        fileIndex: params.fileIndex,
        fileType: params.fileType,
        httpStatus: params.httpStatus ?? null,
        attemptCount: params.attemptCount ?? null,
        uploadElapsedMs: params.uploadElapsedMs ?? null,
        online: params.online ?? null,
        visibilityState: params.visibilityState ?? null,
        browser: params.browser ?? null,
        browserMajor: params.browserMajor ?? null,
        os: params.os ?? null,
        isWebView: params.isWebView ?? null,
        inAppBrowser: params.inAppBrowser ?? null,
        effectiveType: params.effectiveType ?? null,
        rttMs: params.rttMs ?? null,
        downlinkMbps: params.downlinkMbps ?? null,
        origin: params.origin ?? null,
        uploadHost: params.uploadHost ?? null,
        errorName: params.errorName ?? null,
        errorMessage: params.errorMessage ?? null,
        attempts: params.attempts ?? [],
        cfCountry: params.cfCountry ?? null,
        cfColo: params.cfColo ?? null,
        cfAsn: params.cfAsn ?? null,
        r2ObjectExists: params.r2ObjectExists ?? null,
        r2ObjectSizeMatches: params.r2ObjectSizeMatches ?? null,
        r2ObjectTypeMatches: params.r2ObjectTypeMatches ?? null,
        r2InspectionStatus: params.r2InspectionStatus ?? null,
        r2InspectionError: params.r2InspectionError ?? null,
        recovered: params.recovered ?? false,
      }),
    })
    .where(
      and(
        eq(aiTask.id, params.generationId),
        eq(aiTask.userId, params.userId),
        eq(aiTask.scene, GENJUTSU_SCENE),
        eq(aiTask.status, 'initiated')
      )
    );

  return getGenjutsuTaskById({
    generationId: params.generationId,
    userId: params.userId,
  });
}

export type GenjutsuUploadObservation = {
  kind: 'head_recovered' | 'retry_succeeded';
  fileIndex: number;
  fileType: 'video' | 'image';
  attemptCount?: number | null;
  uploadElapsedMs?: number | null;
  online?: boolean | null;
  visibilityState?: string | null;
  browser?: string | null;
  os?: string | null;
  errorName?: string | null;
  r2ObjectExists?: boolean | null;
  r2ObjectSizeMatches?: boolean | null;
  r2ObjectTypeMatches?: boolean | null;
  r2InspectionStatus?: 'ok' | 'missing' | 'error' | 'skipped' | null;
  r2InspectionError?: string | null;
  recovered?: boolean;
};

export async function recordGenjutsuUploadObservation(params: {
  generationId: string;
  userId: string;
  observation: GenjutsuUploadObservation;
}) {
  const task = await getGenjutsuTaskById({
    generationId: params.generationId,
    userId: params.userId,
  });
  if (!task || task.status !== 'initiated') return task;

  const info = parseTaskInfo(task);
  const patch: Record<string, unknown> = {};

  if (params.observation.kind === 'head_recovered') {
    patch.uploadRecovery = {
      fileIndex: params.observation.fileIndex,
      fileType: params.observation.fileType,
      attemptCount: params.observation.attemptCount ?? null,
      uploadElapsedMs: params.observation.uploadElapsedMs ?? null,
      online: params.observation.online ?? null,
      visibilityState: params.observation.visibilityState ?? null,
      browser: params.observation.browser ?? null,
      os: params.observation.os ?? null,
      errorName: params.observation.errorName ?? null,
      r2ObjectExists: true,
      r2ObjectSizeMatches: true,
      r2ObjectTypeMatches: true,
      r2InspectionStatus: 'ok',
      recovered: true,
      at: Date.now(),
    };
  } else {
    const existing = Array.isArray(info.uploadRetrySuccesses)
      ? info.uploadRetrySuccesses.filter(
          (item): item is Record<string, unknown> =>
            !!item && typeof item === 'object' && !Array.isArray(item)
        )
      : [];
    existing.push({
      fileIndex: params.observation.fileIndex,
      fileType: params.observation.fileType,
      attemptCount: params.observation.attemptCount ?? null,
      uploadElapsedMs: params.observation.uploadElapsedMs ?? null,
      online: params.observation.online ?? null,
      visibilityState: params.observation.visibilityState ?? null,
      browser: params.observation.browser ?? null,
      os: params.observation.os ?? null,
      at: Date.now(),
    });
    patch.uploadRetrySuccesses = existing.slice(-9);
  }

  await db()
    .update(aiTask)
    .set({
      taskInfo: mergeTaskInfo(task, patch),
    })
    .where(
      and(
        eq(aiTask.id, params.generationId),
        eq(aiTask.userId, params.userId),
        eq(aiTask.scene, GENJUTSU_SCENE),
        eq(aiTask.status, 'initiated')
      )
    );

  return getGenjutsuTaskById({
    generationId: params.generationId,
    userId: params.userId,
  });
}

export function getGenjutsuUploadBinding(task: { options?: string | null }) {
  const options = parseTaskOptions(task);
  if (!options || typeof options.videoKey !== 'string') return null;

  const imageKeys = Array.isArray(options.imageKeys)
    ? options.imageKeys.filter(
        (value: unknown): value is string => typeof value === 'string'
      )
    : [];
  const contentTypes = Array.isArray(options.contentTypes)
    ? options.contentTypes.filter(
        (value: unknown): value is string => typeof value === 'string'
      )
    : [];
  const contentLengths = Array.isArray(options.contentLengths)
    ? options.contentLengths.map((value: unknown) => Number(value))
    : [];

  return {
    videoKey: options.videoKey as string,
    imageKeys,
    contentTypes,
    contentLengths,
  };
}

export async function recordGenjutsuProviderStatusError(params: {
  generationId: string;
  userId: string;
  providerStatus: string;
  error: string;
}) {
  await db()
    .update(aiTask)
    .set({
      taskResult: JSON.stringify({
        providerStatus: params.providerStatus,
        error: params.error,
        statusPollError: true,
      }),
    })
    .where(
      and(
        eq(aiTask.id, params.generationId),
        eq(aiTask.userId, params.userId),
        eq(aiTask.scene, GENJUTSU_SCENE),
        eq(aiTask.status, 'submitted')
      )
    );
}

export async function markGenjutsuAttemptInsufficient(params: {
  generationId: string;
  userId: string;
  requiredCredits: number;
  balance: number;
}) {
  await db()
    .update(aiTask)
    .set({
      status: 'insufficient_credits',
      taskResult: JSON.stringify({
        requiredCredits: params.requiredCredits,
        balance: params.balance,
        reason: 'insufficient_credits',
      }),
    })
    .where(
      and(
        eq(aiTask.id, params.generationId),
        eq(aiTask.userId, params.userId),
        eq(aiTask.scene, GENJUTSU_SCENE),
        inArray(aiTask.status, ['initiated', 'ready', 'reserving'])
      )
    );
}

export async function getGenjutsuTaskByRequestIdAnyUser(requestId: string) {
  const [task] = await db()
    .select()
    .from(aiTask)
    .where(and(eq(aiTask.taskId, requestId), eq(aiTask.scene, GENJUTSU_SCENE)))
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
  provider: GenjutsuProvider;
  model: string;
  resolution: GenjutsuResolution;
  prompt: string;
  videoKey?: string;
  imageKeys?: string[];
  videoUrl?: string;
  imageUrls?: string[];
  providerCostUsd: number;
  credits: number;
  providerEstimate?: unknown;
  sourceDurationSeconds?: number;
}) {
  const hasStorageInput =
    typeof params.videoKey === 'string' &&
    params.videoKey.length > 0 &&
    Array.isArray(params.imageKeys) &&
    params.imageKeys.length > 0;
  const hasLegacyUrlInput =
    typeof params.videoUrl === 'string' &&
    params.videoUrl.length > 0 &&
    Array.isArray(params.imageUrls) &&
    params.imageUrls.length > 0;

  if (!hasStorageInput && !hasLegacyUrlInput) {
    throw new Error('Genjutsu generation input is missing');
  }

  const existing = await getGenjutsuTaskById({
    generationId: params.generationId,
    userId: params.userId,
  });
  if (existing && existing.status !== 'ready') return existing;

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

    if (insideExisting && insideExisting.status !== 'ready') {
      return { task: insideExisting, insufficient: false };
    }

    let reservationClaim: string | null = null;
    if (insideExisting) {
      reservationClaim = getUuid();
      await tx
        .update(aiTask)
        .set({
          status: 'reserving',
          taskResult: JSON.stringify({ reservationClaim }),
        })
        .where(
          and(
            eq(aiTask.id, params.generationId),
            eq(aiTask.userId, params.userId),
            eq(aiTask.scene, GENJUTSU_SCENE),
            eq(aiTask.status, 'ready')
          )
        );

      const [claimed] = await tx
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

      let claimedToken: string | null = null;
      if (claimed?.taskResult) {
        try {
          claimedToken =
            JSON.parse(claimed.taskResult)?.reservationClaim ?? null;
        } catch {
          claimedToken = null;
        }
      }

      if (
        !claimed ||
        claimed.status !== 'reserving' ||
        claimedToken !== reservationClaim
      ) {
        return { task: claimed ?? insideExisting, insufficient: false };
      }
    }

    const consumed = await consume({
      userId: params.userId,
      userEmail: params.userEmail,
      credits: params.credits,
      scene: CreditTransactionScene.GENJUTSU,
      description: 'Reserve credits for Genjutsu generation',
      metadata: JSON.stringify({
        generationId: params.generationId,
        mode: params.mode,
        provider: params.provider,
        model: params.model,
        resolution: params.resolution,
        providerCostUsd: params.providerCostUsd,
      }),
      tx,
    });

    if (!consumed.success || !consumed.consumedCredit) {
      if (insideExisting) {
        await tx
          .update(aiTask)
          .set({
            status: 'insufficient_credits',
            taskResult: JSON.stringify({
              requiredCredits: params.credits,
              reason: 'insufficient_credits',
            }),
          })
          .where(
            and(
              eq(aiTask.id, params.generationId),
              eq(aiTask.userId, params.userId),
              eq(aiTask.scene, GENJUTSU_SCENE),
              eq(aiTask.status, 'reserving')
            )
          );
      }
      return { task: null, insufficient: true };
    }

    const task = {
      id: params.generationId,
      userId: params.userId,
      mediaType: 'video',
      provider: params.provider,
      model: params.model,
      prompt: params.prompt,
      options: JSON.stringify({
        mode: params.mode,
        resolution: params.resolution,
        prompt: params.prompt,
        ...(hasStorageInput
          ? {
              videoKey: params.videoKey,
              imageKeys: params.imageKeys,
            }
          : {
              videoUrl: params.videoUrl,
              imageUrls: params.imageUrls,
            }),
      }),
      status: 'reserved',
      taskId: null,
      taskInfo: mergeTaskInfo(insideExisting || {}, {
        providerCostUsd: params.providerCostUsd,
        providerEstimate: params.providerEstimate ?? null,
        sourceDurationSeconds:
          typeof params.sourceDurationSeconds === 'number'
            ? params.sourceDurationSeconds
            : null,
      }),
      taskResult: null,
      costCredits: params.credits,
      scene: GENJUTSU_SCENE,
      creditId: consumed.consumedCredit.id,
    };

    if (insideExisting) {
      await tx
        .update(aiTask)
        .set({
          provider: task.provider,
          model: task.model,
          prompt: task.prompt,
          options: task.options,
          status: task.status,
          taskId: task.taskId,
          taskInfo: task.taskInfo,
          taskResult: task.taskResult,
          costCredits: task.costCredits,
          creditId: task.creditId,
        })
        .where(
          and(
            eq(aiTask.id, params.generationId),
            eq(aiTask.userId, params.userId),
            eq(aiTask.scene, GENJUTSU_SCENE),
            eq(aiTask.status, 'reserving')
          )
        );
    } else {
      await tx.insert(aiTask).values(task);
    }
    return { task, insufficient: false };
  });

  if (result.insufficient || !result.task) {
    const balance = await getBalance(params.userId);
    throw new InsufficientCreditsError(params.credits, balance);
  }

  return result.task;
}

export async function claimGenjutsuSubmission(params: {
  generationId: string;
  userId: string;
}) {
  const claimToken = getUuid();

  await db()
    .update(aiTask)
    .set({
      status: 'submitting',
      taskResult: JSON.stringify({ submissionClaim: claimToken }),
    })
    .where(
      and(
        eq(aiTask.id, params.generationId),
        eq(aiTask.userId, params.userId),
        eq(aiTask.scene, GENJUTSU_SCENE),
        eq(aiTask.status, 'reserved')
      )
    );

  // Verify ownership of the state transition by reading back the unique claim
  // token. This is portable across Drizzle drivers whose mutation result
  // shapes expose affected-row counts differently.
  const current = await getGenjutsuTaskById(params);
  if (!current || current.status !== 'submitting' || !current.taskResult) {
    return false;
  }

  try {
    const parsed = JSON.parse(current.taskResult);
    return parsed?.submissionClaim === claimToken;
  } catch {
    return false;
  }
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
      taskResult: null,
    })
    .where(
      and(
        eq(aiTask.id, params.generationId),
        eq(aiTask.userId, params.userId),
        eq(aiTask.scene, GENJUTSU_SCENE),
        eq(aiTask.status, 'submitting')
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
        eq(aiTask.scene, GENJUTSU_SCENE),
        eq(aiTask.status, 'submitting')
      )
    );
}

export async function settleGenjutsuGeneration(params: {
  generationId: string;
  userId: string;
  providerStatus: string;
  videoKey?: string;
  videoUrl?: string;
  providerUsage?: unknown;
}) {
  if (!params.videoKey && !params.videoUrl) {
    throw new Error('Completed Genjutsu generation is missing a result');
  }

  await db()
    .update(aiTask)
    .set({
      status: 'completed',
      taskResult: JSON.stringify({
        providerStatus: params.providerStatus,
        ...(params.videoKey ? { videoKey: params.videoKey } : {}),
        ...(params.videoUrl ? { videoUrl: params.videoUrl } : {}),
        ...(params.providerUsage != null
          ? { providerUsage: params.providerUsage }
          : {}),
      }),
    })
    .where(
      and(
        eq(aiTask.id, params.generationId),
        eq(aiTask.userId, params.userId),
        eq(aiTask.scene, GENJUTSU_SCENE),
        eq(aiTask.status, 'submitted')
      )
    );

  return getGenjutsuTaskById({
    generationId: params.generationId,
    userId: params.userId,
  });
}

export async function refundGenjutsuGeneration(params: {
  generationId: string;
  userId: string;
  providerStatus?: string;
  error: string;
}) {
  return db().transaction(async (tx: any) => {
    const [task] = await tx
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

    if (!task) return null;
    if (task.status === 'refunded' || task.status === 'completed') return task;

    const refundableStatuses = [
      'reserved',
      'submitting',
      'submitted',
      'submission_unknown',
    ];
    if (!refundableStatuses.includes(task.status)) return task;

    const refundClaim = getUuid();
    await tx
      .update(aiTask)
      .set({
        status: 'refunding',
        taskResult: JSON.stringify({ refundClaim }),
      })
      .where(
        and(
          eq(aiTask.id, params.generationId),
          eq(aiTask.userId, params.userId),
          eq(aiTask.scene, GENJUTSU_SCENE),
          inArray(aiTask.status, refundableStatuses)
        )
      );

    const [claimed] = await tx
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

    let claimedToken: string | null = null;
    if (claimed?.taskResult) {
      try {
        claimedToken = JSON.parse(claimed.taskResult)?.refundClaim ?? null;
      } catch {
        claimedToken = null;
      }
    }

    if (
      !claimed ||
      claimed.status !== 'refunding' ||
      claimedToken !== refundClaim
    ) {
      return claimed ?? task;
    }

    if (claimed.creditId) {
      await revoke(claimed.creditId, tx);
    }

    const taskResult = JSON.stringify({
      providerStatus: params.providerStatus ?? null,
      error: params.error,
      refundedCredits: claimed.costCredits,
    });

    await tx
      .update(aiTask)
      .set({
        status: 'refunded',
        taskResult,
      })
      .where(
        and(
          eq(aiTask.id, params.generationId),
          eq(aiTask.userId, params.userId),
          eq(aiTask.scene, GENJUTSU_SCENE),
          eq(aiTask.status, 'refunding')
        )
      );

    return {
      ...claimed,
      status: 'refunded',
      taskResult,
    };
  });
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
