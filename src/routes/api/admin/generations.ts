import { createFileRoute } from '@tanstack/react-router';
import { and, count, desc, eq, inArray, like, or, type SQL } from 'drizzle-orm';

import { getAuth } from '@/core/auth';
import { db } from '@/core/db';
import { aiTask, order, subscription, user } from '@/config/db/schema';
import {
  generationMediaBasePath,
  isListableGenerationScene,
  LISTABLE_GENERATION_SCENES,
} from '@/modules/generations/scenes';
import {
  calculateGenjutsuCredits,
  estimateGenjutsuCredits,
  type GenjutsuBillableResolution,
} from '@/modules/genjutsu/pricing';
import { estimateSeedanceProviderCost } from '@/modules/genjutsu/seedance';
import { HOTEL_LOBBY_SCENE } from '@/modules/hotel-lobby/billing';
import {
  estimateHotelLobbyCredits,
  HOTEL_LOBBY_RESOLUTIONS,
  type HotelLobbyResolution,
} from '@/modules/hotel-lobby/pricing';
import { hasPermission } from '@/modules/rbac/service';
import { respErr, respPage } from '@/lib/resp';

/** Mirrors getCurrentSubscription() — active-ish subscription counts as paid. */
const PAID_SUBSCRIPTION_STATUSES = [
  'active',
  'pending_cancel',
  'trialing',
] as const;

/** Paid = completed order, or an active-ish subscription. */
async function resolvePaidUserIds(userIds: string[]): Promise<Set<string>> {
  const paid = new Set<string>();
  if (userIds.length === 0) return paid;

  const [paidOrders, activeSubs] = await Promise.all([
    db()
      .selectDistinct({ userId: order.userId })
      .from(order)
      .where(and(inArray(order.userId, userIds), eq(order.status, 'paid'))),
    db()
      .selectDistinct({ userId: subscription.userId })
      .from(subscription)
      .where(
        and(
          inArray(subscription.userId, userIds),
          inArray(subscription.status, [...PAID_SUBSCRIPTION_STATUSES])
        )
      ),
  ]);

  for (const row of paidOrders) paid.add(row.userId);
  for (const row of activeSubs) paid.add(row.userId);
  return paid;
}

function parseJson(value: string | null) {
  if (!value) return null;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function isBillableResolution(
  value: unknown
): value is GenjutsuBillableResolution {
  return value === '480p' || value === '720p' || value === '1080p';
}

/**
 * Best-effort credit estimate for admin display — mirrors GeneratorPanel /
 * generate.ts list-rate fallback when the task never reached reservation.
 */
function isHotelLobbyResolution(value: unknown): value is HotelLobbyResolution {
  return (
    typeof value === 'string' &&
    (HOTEL_LOBBY_RESOLUTIONS as readonly string[]).includes(value)
  );
}

function resolveEstimatedCredits(input: {
  scene: string;
  provider: string;
  providerCostUsd: number | null;
  sourceDurationSeconds: number | null;
  duration: number | null;
  resolution: unknown;
  imageCount: number;
  requiredCredits: number | null;
  costCredits: number | null;
}): number | null {
  if (input.requiredCredits != null && input.requiredCredits > 0) {
    return input.requiredCredits;
  }
  if (input.costCredits != null && input.costCredits > 0) {
    return input.costCredits;
  }

  if (input.providerCostUsd != null && input.providerCostUsd > 0) {
    try {
      return calculateGenjutsuCredits(input.providerCostUsd);
    } catch {
      // fall through to list-rate estimate
    }
  }

  if (input.scene === HOTEL_LOBBY_SCENE) {
    if (
      !isHotelLobbyResolution(input.resolution) ||
      input.duration == null ||
      !Number.isInteger(input.duration)
    ) {
      return null;
    }
    try {
      return estimateHotelLobbyCredits({
        duration: input.duration,
        resolution: input.resolution,
        imageCount: Math.max(1, input.imageCount),
      });
    } catch {
      return null;
    }
  }

  if (
    !isBillableResolution(input.resolution) ||
    input.sourceDurationSeconds == null ||
    !Number.isFinite(input.sourceDurationSeconds) ||
    input.sourceDurationSeconds <= 0
  ) {
    return null;
  }

  try {
    if (input.provider === 'seedance') {
      const quote = estimateSeedanceProviderCost({
        resolution: input.resolution,
        sourceDurationSeconds: input.sourceDurationSeconds,
      });
      return calculateGenjutsuCredits(quote.providerCostUsd);
    }

    return estimateGenjutsuCredits({
      durationSeconds: input.sourceDurationSeconds,
      resolution: input.resolution,
    });
  } catch {
    return null;
  }
}

async function GET({ request }: { request: Request }) {
  try {
    const auth = getAuth();
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) return respErr('Unauthorized');

    const isAdmin = await hasPermission(session.user.id, 'admin.*');
    if (!isAdmin) return respErr('Forbidden');

    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
    const pageSize = Math.min(
      100,
      Math.max(1, parseInt(searchParams.get('pageSize') || '20'))
    );
    const offset = (page - 1) * pageSize;
    const search = searchParams.get('search')?.trim();
    const status = searchParams.get('status')?.trim();
    const provider = searchParams.get('provider')?.trim();
    const scene = searchParams.get('scene')?.trim();
    const userId = searchParams.get('userId')?.trim();

    const conditions: SQL[] = [
      scene && isListableGenerationScene(scene)
        ? eq(aiTask.scene, scene)
        : inArray(aiTask.scene, [...LISTABLE_GENERATION_SCENES]),
    ];
    if (status && status !== 'all') conditions.push(eq(aiTask.status, status));
    if (provider && provider !== 'all') {
      conditions.push(eq(aiTask.provider, provider));
    }
    if (userId) conditions.push(eq(aiTask.userId, userId));
    if (search) {
      conditions.push(
        or(
          like(aiTask.id, `%${search}%`),
          like(aiTask.taskId, `%${search}%`),
          like(aiTask.model, `%${search}%`),
          like(aiTask.prompt, `%${search}%`),
          like(user.email, `%${search}%`),
          like(user.name, `%${search}%`)
        )!
      );
    }

    const where = and(...conditions);

    const [totalResult] = await db()
      .select({ count: count() })
      .from(aiTask)
      .innerJoin(user, eq(aiTask.userId, user.id))
      .where(where);

    const rows = await db()
      .select({
        id: aiTask.id,
        userId: aiTask.userId,
        userName: user.name,
        userEmail: user.email,
        scene: aiTask.scene,
        provider: aiTask.provider,
        model: aiTask.model,
        prompt: aiTask.prompt,
        status: aiTask.status,
        taskId: aiTask.taskId,
        options: aiTask.options,
        taskInfo: aiTask.taskInfo,
        taskResult: aiTask.taskResult,
        costCredits: aiTask.costCredits,
        createdAt: aiTask.createdAt,
        updatedAt: aiTask.updatedAt,
      })
      .from(aiTask)
      .innerJoin(user, eq(aiTask.userId, user.id))
      .where(where)
      .orderBy(desc(aiTask.createdAt))
      .limit(pageSize)
      .offset(offset);

    const items = rows.map((row) => {
      const options = parseJson(row.options);
      const info = parseJson(row.taskInfo);
      const result = parseJson(row.taskResult);
      const recovery =
        info?.uploadRecovery &&
        typeof info.uploadRecovery === 'object' &&
        !Array.isArray(info.uploadRecovery)
          ? (info.uploadRecovery as Record<string, unknown>)
          : null;
      const hasSourceVideo =
        typeof options?.videoKey === 'string' && options.videoKey.length > 0;
      const imageKeys = Array.isArray(options?.imageKeys)
        ? options.imageKeys.filter(
            (value: unknown): value is string => typeof value === 'string'
          )
        : [];
      const contentTypes = Array.isArray(options?.contentTypes)
        ? options.contentTypes
        : [];
      const contentLengths = Array.isArray(options?.contentLengths)
        ? options.contentLengths
        : [];
      const inputMedia = [
        ...(hasSourceVideo
          ? [
              {
                index: 0,
                kind: 'video' as const,
                contentType:
                  typeof contentTypes[0] === 'string' ? contentTypes[0] : null,
                contentLength:
                  typeof contentLengths[0] === 'number'
                    ? contentLengths[0]
                    : null,
                url: `/api/admin/generations/${encodeURIComponent(row.id)}/media?index=0`,
              },
            ]
          : []),
        ...imageKeys.map((_, imageIndex) => ({
          index: imageIndex + 1,
          kind: 'image' as const,
          contentType:
            typeof contentTypes[imageIndex + 1] === 'string'
              ? contentTypes[imageIndex + 1]
              : null,
          contentLength:
            typeof contentLengths[imageIndex + 1] === 'number'
              ? contentLengths[imageIndex + 1]
              : null,
          url: `/api/admin/generations/${encodeURIComponent(row.id)}/media?index=${imageIndex + 1}`,
        })),
      ];
      const mediaBase = generationMediaBasePath(row.scene);
      const duration =
        typeof options?.duration === 'number' ? options.duration : null;
      const sourceDurationSeconds =
        typeof info?.sourceDurationSeconds === 'number'
          ? info.sourceDurationSeconds
          : duration;
      return {
        id: row.id,
        userId: row.userId,
        userName: row.userName,
        userEmail: row.userEmail,
        scene: row.scene,
        provider: row.provider,
        model: row.model,
        prompt: row.prompt,
        mode:
          typeof options?.mode === 'string'
            ? options.mode
            : row.scene === HOTEL_LOBBY_SCENE
              ? 'Hotel Lobby'
              : null,
        resolution:
          typeof options?.resolution === 'string' ? options.resolution : null,
        aspectRatio:
          typeof options?.aspectRatio === 'string' ? options.aspectRatio : null,
        status: row.status,
        attemptStage:
          typeof info?.attemptStage === 'string' ? info.attemptStage : null,
        taskId: row.taskId,
        providerStatus:
          typeof result?.providerStatus === 'string'
            ? result.providerStatus
            : null,
        failureStage: typeof result?.stage === 'string' ? result.stage : null,
        errorCode:
          typeof result?.errorCode === 'string' ? result.errorCode : null,
        errorFileIndex:
          typeof result?.fileIndex === 'number'
            ? result.fileIndex
            : typeof recovery?.fileIndex === 'number'
              ? recovery.fileIndex
              : null,
        errorFileType:
          typeof result?.fileType === 'string'
            ? result.fileType
            : typeof recovery?.fileType === 'string'
              ? recovery.fileType
              : null,
        errorHttpStatus:
          typeof result?.httpStatus === 'number' ? result.httpStatus : null,
        uploadAttemptCount:
          typeof result?.attemptCount === 'number'
            ? result.attemptCount
            : typeof recovery?.attemptCount === 'number'
              ? recovery.attemptCount
              : null,
        uploadElapsedMs:
          typeof result?.uploadElapsedMs === 'number'
            ? result.uploadElapsedMs
            : typeof recovery?.uploadElapsedMs === 'number'
              ? recovery.uploadElapsedMs
              : null,
        uploadBrowser:
          typeof result?.browser === 'string'
            ? result.browser
            : typeof recovery?.browser === 'string'
              ? recovery.browser
              : null,
        uploadBrowserMajor:
          typeof result?.browserMajor === 'number' ? result.browserMajor : null,
        uploadOs:
          typeof result?.os === 'string'
            ? result.os
            : typeof recovery?.os === 'string'
              ? recovery.os
              : null,
        uploadOnline:
          typeof result?.online === 'boolean'
            ? result.online
            : typeof recovery?.online === 'boolean'
              ? recovery.online
              : null,
        uploadIsWebView:
          typeof result?.isWebView === 'boolean' ? result.isWebView : null,
        uploadInAppBrowser:
          typeof result?.inAppBrowser === 'string' ? result.inAppBrowser : null,
        uploadEffectiveType:
          typeof result?.effectiveType === 'string'
            ? result.effectiveType
            : null,
        uploadRttMs: typeof result?.rttMs === 'number' ? result.rttMs : null,
        uploadDownlinkMbps:
          typeof result?.downlinkMbps === 'number' ? result.downlinkMbps : null,
        uploadOrigin: typeof result?.origin === 'string' ? result.origin : null,
        uploadHost:
          typeof result?.uploadHost === 'string' ? result.uploadHost : null,
        uploadErrorName:
          typeof result?.errorName === 'string' ? result.errorName : null,
        uploadErrorMessage:
          typeof result?.errorMessage === 'string' ? result.errorMessage : null,
        uploadAttempts: Array.isArray(result?.attempts) ? result.attempts : [],
        uploadCfCountry:
          typeof result?.cfCountry === 'string' ? result.cfCountry : null,
        uploadCfColo: typeof result?.cfColo === 'string' ? result.cfColo : null,
        uploadCfAsn: typeof result?.cfAsn === 'number' ? result.cfAsn : null,
        r2ObjectExists:
          typeof result?.r2ObjectExists === 'boolean'
            ? result.r2ObjectExists
            : typeof recovery?.r2ObjectExists === 'boolean'
              ? recovery.r2ObjectExists
              : null,
        r2ObjectSizeMatches:
          typeof result?.r2ObjectSizeMatches === 'boolean'
            ? result.r2ObjectSizeMatches
            : typeof recovery?.r2ObjectSizeMatches === 'boolean'
              ? recovery.r2ObjectSizeMatches
              : null,
        r2ObjectTypeMatches:
          typeof result?.r2ObjectTypeMatches === 'boolean'
            ? result.r2ObjectTypeMatches
            : typeof recovery?.r2ObjectTypeMatches === 'boolean'
              ? recovery.r2ObjectTypeMatches
              : null,
        r2InspectionStatus:
          typeof result?.r2InspectionStatus === 'string'
            ? result.r2InspectionStatus
            : typeof recovery?.r2InspectionStatus === 'string'
              ? recovery.r2InspectionStatus
              : null,
        r2InspectionError:
          typeof result?.r2InspectionError === 'string'
            ? result.r2InspectionError
            : typeof recovery?.r2InspectionError === 'string'
              ? recovery.r2InspectionError
              : null,
        uploadRecovered:
          typeof result?.recovered === 'boolean'
            ? result.recovered
            : recovery?.recovered === true
              ? true
              : null,
        uploadRetrySuccessCount: Array.isArray(info?.uploadRetrySuccesses)
          ? info.uploadRetrySuccesses.length
          : null,
        error:
          typeof result?.providerError === 'string'
            ? result.providerError
            : typeof result?.error === 'string'
              ? result.error
              : null,
        providerCode:
          typeof result?.providerCode === 'string' ? result.providerCode : null,
        costCredits: row.costCredits,
        providerCostUsd:
          typeof info?.providerCostUsd === 'number'
            ? info.providerCostUsd
            : null,
        sourceDurationSeconds,
        requiredCredits:
          typeof result?.requiredCredits === 'number'
            ? result.requiredCredits
            : null,
        estimatedCredits: resolveEstimatedCredits({
          scene: row.scene,
          provider: row.provider,
          providerCostUsd:
            typeof info?.providerCostUsd === 'number'
              ? info.providerCostUsd
              : null,
          sourceDurationSeconds:
            typeof info?.sourceDurationSeconds === 'number'
              ? info.sourceDurationSeconds
              : null,
          duration,
          resolution: options?.resolution,
          imageCount: imageKeys.length,
          requiredCredits:
            typeof result?.requiredCredits === 'number'
              ? result.requiredCredits
              : null,
          costCredits: row.costCredits,
        }),
        inputMedia,
        sourceVideoUrl: hasSourceVideo
          ? `${mediaBase}/source/${encodeURIComponent(row.id)}`
          : null,
        videoUrl:
          row.status === 'completed'
            ? `${mediaBase}/result/${encodeURIComponent(row.id)}`
            : null,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
      };
    });

    const paidUserIds = await resolvePaidUserIds(
      Array.from(new Set(rows.map((row) => row.userId)))
    );
    const itemsWithPaid = items.map((item) => ({
      ...item,
      isPaid: paidUserIds.has(item.userId),
    }));

    return respPage(itemsWithPaid, totalResult.count);
  } catch (error: any) {
    return respErr(error.message || 'Internal error');
  }
}

export const Route = createFileRoute('/api/admin/generations')({
  server: {
    handlers: { GET },
  },
});
