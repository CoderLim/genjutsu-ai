import { createFileRoute } from '@tanstack/react-router';
import { and, count, desc, eq, isNull } from 'drizzle-orm';

import { aiTask } from '@/config/db/schema';
import { getAuth } from '@/core/auth';
import { db } from '@/core/db';
import { GENJUTSU_SCENE } from '@/modules/genjutsu/billing';
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
      eq(aiTask.scene, GENJUTSU_SCENE),
      eq(aiTask.userId, session.user.id),
      isNull(aiTask.deletedAt)
    );

    const [totalResult] = await db()
      .select({ count: count() })
      .from(aiTask)
      .where(where);

    const rows = await db()
      .select({
        id: aiTask.id,
        prompt: aiTask.prompt,
        status: aiTask.status,
        options: aiTask.options,
        costCredits: aiTask.costCredits,
        createdAt: aiTask.createdAt,
        updatedAt: aiTask.updatedAt,
      })
      .from(aiTask)
      .where(where)
      .orderBy(desc(aiTask.createdAt))
      .limit(pageSize)
      .offset(offset);

    const items = rows.map((row) => {
      const options = parseJson(row.options);
      return {
        id: row.id,
        prompt: row.prompt,
        status: row.status,
        mode: typeof options?.mode === 'string' ? options.mode : null,
        resolution:
          typeof options?.resolution === 'string' ? options.resolution : null,
        costCredits: row.costCredits,
        videoUrl:
          row.status === 'completed'
            ? `/api/genjutsu/result/${encodeURIComponent(row.id)}`
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
