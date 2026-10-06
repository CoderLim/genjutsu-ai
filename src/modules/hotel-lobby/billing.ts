import { and, eq, inArray } from 'drizzle-orm';

import { db } from '@/core/db';
import { aiTask } from '@/config/db/schema';
import {
  consume,
  getBalance,
  revoke,
} from '@/modules/credits/service';
import { getUuid } from '@/lib/hash';

import type {
  HotelLobbyAspectRatio,
  HotelLobbyResolution,
} from './pricing';
import type { HotelLobbyPromptExpansionMode } from './service';

export const HOTEL_LOBBY_SCENE = 'hotel-lobby';
export const HOTEL_LOBBY_PROVIDER = 'fal';

export type HotelLobbyTaskStatus =
  | 'reserved'
  | 'submitting'
  | 'submitted'
  | 'completing'
  | 'completed'
  | 'refunding'
  | 'refunded'
  | 'submission_unknown';

export class HotelLobbyInsufficientCreditsError extends Error {
  constructor(
    public requiredCredits: number,
    public balance: number
  ) {
    super('Insufficient credits');
    this.name = 'HotelLobbyInsufficientCreditsError';
  }
}

export class HotelLobbyGenerationConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'HotelLobbyGenerationConflictError';
  }
}

export function assertHotelLobbyGenerationId(value: unknown): string {
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

export function parseHotelLobbyTask(task: {
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

export async function getHotelLobbyTaskById(params: {
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
        eq(aiTask.scene, HOTEL_LOBBY_SCENE)
      )
    )
    .limit(1);
  return task ?? null;
}

function assertTaskMatches(
  task: any,
  params: {
    prompt: string;
    duration: number;
    resolution: HotelLobbyResolution;
    aspectRatio: HotelLobbyAspectRatio;
    promptExpansionMode: HotelLobbyPromptExpansionMode;
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
    throw new HotelLobbyGenerationConflictError(
      'This generation ID is already bound to different inputs'
    );
  }
}

export async function reserveHotelLobbyGeneration(params: {
  generationId: string;
  userId: string;
  userEmail?: string;
  model: string;
  prompt: string;
  duration: number;
  resolution: HotelLobbyResolution;
  aspectRatio: HotelLobbyAspectRatio;
  promptExpansionMode: HotelLobbyPromptExpansionMode;
  videoKey: string;
  imageKeys: string[];
  providerCostUsd: number;
  credits: number;
}) {
  const existing = await getHotelLobbyTaskById({
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
          eq(aiTask.scene, HOTEL_LOBBY_SCENE)
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
      scene: HOTEL_LOBBY_SCENE,
      description: 'Reserve credits for Hotel Lobby AI generation',
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
      provider: HOTEL_LOBBY_PROVIDER,
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
      scene: HOTEL_LOBBY_SCENE,
      creditId: consumed.consumedCredit.id,
    };

    await tx.insert(aiTask).values(task);
    return { task, insufficient: false };
  });

  if (result.insufficient || !result.task) {
    const balance = await getBalance(params.userId);
    throw new HotelLobbyInsufficientCreditsError(params.credits, balance);
  }

  return result.task;
}

export async function claimHotelLobbySubmission(params: {
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
        eq(aiTask.scene, HOTEL_LOBBY_SCENE),
        eq(aiTask.status, 'reserved')
      )
    );

  const task = await getHotelLobbyTaskById(params);
  if (!task || task.status !== 'submitting') return false;
  return parseJson(task.taskResult)?.submissionClaim === claim;
}

export async function markHotelLobbySubmitted(params: {
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
        eq(aiTask.scene, HOTEL_LOBBY_SCENE),
        eq(aiTask.status, 'submitting')
      )
    );
  return getHotelLobbyTaskById(params);
}

export async function markHotelLobbySubmissionUnknown(params: {
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
        eq(aiTask.scene, HOTEL_LOBBY_SCENE),
        eq(aiTask.status, 'submitting')
      )
    );
}

export async function settleHotelLobbyGeneration(params: {
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
        eq(aiTask.scene, HOTEL_LOBBY_SCENE),
        eq(aiTask.status, 'submitted')
      )
    );

  const claimed = await getHotelLobbyTaskById(params);
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
        eq(aiTask.scene, HOTEL_LOBBY_SCENE),
        eq(aiTask.status, 'completing')
      )
    );

  return getHotelLobbyTaskById(params);
}

export async function refundHotelLobbyGeneration(params: {
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
          eq(aiTask.scene, HOTEL_LOBBY_SCENE),
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
          eq(aiTask.scene, HOTEL_LOBBY_SCENE)
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
          eq(aiTask.scene, HOTEL_LOBBY_SCENE),
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
          eq(aiTask.scene, HOTEL_LOBBY_SCENE)
        )
      )
      .limit(1);

    return updated ?? null;
  });
}
