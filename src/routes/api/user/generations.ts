import { createFileRoute } from '@tanstack/react-router';
import { and, count, desc, eq, inArray, isNull, like, or } from 'drizzle-orm';

import { getAuth } from '@/core/auth';
import { db } from '@/core/db';
import { aiTask } from '@/config/db/schema';
import {
  generationMediaBasePath,
  LISTABLE_GENERATION_SCENES,
} from '@/modules/generations/scenes';
import { GENERATOR_SCENE } from '@/modules/generator/billing';
import { HOTEL_LOBBY_SCENE } from '@/modules/hotel-lobby/billing';
import { getLiveSessionHistory } from '@/modules/live-face-swap/history';
import { LIVE_FACE_SWAP_SCENE } from '@/modules/live-face-swap/pricing';
import { displayNameForHotelLobbyPresetId } from '@/modules/hotel-lobby/presets';
import { respErr, respPage } from '@/lib/resp';

function parseJson(value: string | null) {
  if (!value) return null;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function parsePositiveInt(value: string | null, fallback: number, max: number) {
  const parsed = Number.parseInt(value || '', 10);
  if (!Number.isFinite(parsed) || parsed < 1) return fallback;
  return Math.min(max, parsed);
}

async function GET({ request }: { request: Request }) {
  try {
    const auth = getAuth();
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) return respErr('Unauthorized', { status: 401 });

    const { searchParams } = new URL(request.url);
    const page = parsePositiveInt(searchParams.get('page'), 1, 100_000);
    const pageSize = parsePositiveInt(searchParams.get('pageSize'), 12, 48);
    const offset = (page - 1) * pageSize;

    const where = and(
      eq(aiTask.userId, session.user.id),
      isNull(aiTask.deletedAt),
      or(
        inArray(aiTask.scene, [...LISTABLE_GENERATION_SCENES]),
        // ONE creation per Live session, never one per 30s billing chunk.
        // New root records persist this exact marker in JSON options.
        and(
          eq(aiTask.scene, LIVE_FACE_SWAP_SCENE),
          like(aiTask.options, '%"kind":"live-session"%')
        )
      )
    );

    const [totalResult] = await db()
      .select({ count: count() })
      .from(aiTask)
      .where(where);

    const rows = await db()
      .select({
        id: aiTask.id,
        scene: aiTask.scene,
        mediaType: aiTask.mediaType,
        prompt: aiTask.prompt,
        status: aiTask.status,
        options: aiTask.options,
        costCredits: aiTask.costCredits,
        createdAt: aiTask.createdAt,
        updatedAt: aiTask.updatedAt,
        taskInfo: aiTask.taskInfo,
        taskResult: aiTask.taskResult,
      })
      .from(aiTask)
      .where(where)
      .orderBy(desc(aiTask.createdAt))
      .limit(pageSize)
      .offset(offset);

    const items = rows.map((row) => {
      if (row.scene === LIVE_FACE_SWAP_SCENE) {
        const liveSession = getLiveSessionHistory({
          status: row.status,
          taskInfo: row.taskInfo,
          taskResult: row.taskResult,
        });
        // Never expose video URLs, source faces, private taskInfo, provider
        // metadata or session tokens. Live sessions are NOT saved recordings.
        return {
          id: row.id,
          scene: LIVE_FACE_SWAP_SCENE,
          mediaType: 'video',
          prompt: '',
          status: row.status,
          mode: null,
          resolution: null,
          aspectRatio: null,
          duration: liveSession.billedSeconds,
          costCredits: liveSession.finalCredits ?? 0,
          sourceVideoUrl: null,
          videoUrl: null,
          liveSession,
          createdAt: row.createdAt,
          updatedAt: row.updatedAt,
        };
      }
      const options = parseJson(row.options);
      const hasSourceVideo =
        typeof options?.videoKey === 'string' && options.videoKey.length > 0;
      const mediaBase = generationMediaBasePath(row.scene);
      const presetDisplayName =
        row.scene === HOTEL_LOBBY_SCENE
          ? displayNameForHotelLobbyPresetId(options?.presetId) || 'Hotel Lobby'
          : null;
      const isGenerator = row.scene === GENERATOR_SCENE;
      const generatorParams = isGenerator ? options?.params : null;
      const mode = isGenerator && typeof options?.workflow === 'string'
        ? options.workflow
        : typeof options?.mode === 'string' ? options.mode : presetDisplayName;
      return {
        id: row.id,
        scene: row.scene,
        mediaType: row.mediaType,
        prompt: row.prompt,
        status: row.status,
        mode,
        resolution:
          typeof generatorParams?.resolution === 'string'
            ? generatorParams.resolution
            : typeof options?.resolution === 'string' ? options.resolution : null,
        aspectRatio:
          typeof generatorParams?.aspectRatio === 'string'
            ? generatorParams.aspectRatio
            : typeof options?.aspectRatio === 'string' ? options.aspectRatio : null,
        duration:
          typeof generatorParams?.duration === 'number'
            ? generatorParams.duration
            : typeof options?.duration === 'number' ? options.duration : null,
        costCredits: row.costCredits,
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

    return respPage(items, totalResult.count);
  } catch (error: any) {
    return respErr(error?.message || 'Failed to list generations');
  }
}

export const Route = createFileRoute('/api/user/generations')({
  server: {
    handlers: { GET },
  },
});
