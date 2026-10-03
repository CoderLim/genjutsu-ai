import { createFileRoute } from '@tanstack/react-router';
import { and, count, desc, eq, like, or, type SQL } from 'drizzle-orm';

import { getAuth } from '@/core/auth';
import { db } from '@/core/db';
import { aiTask, user } from '@/config/db/schema';
import { GENJUTSU_SCENE } from '@/modules/genjutsu/billing';
import { hasPermission } from '@/modules/rbac/service';
import { respErr, respPage } from '@/lib/resp';

function parseJson(value: string | null) {
  if (!value) return null;
  try {
    return JSON.parse(value);
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
    const userId = searchParams.get('userId')?.trim();

    const conditions: SQL[] = [eq(aiTask.scene, GENJUTSU_SCENE)];
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
      return {
        id: row.id,
        userId: row.userId,
        userName: row.userName,
        userEmail: row.userEmail,
        provider: row.provider,
        model: row.model,
        prompt: row.prompt,
        mode: typeof options?.mode === 'string' ? options.mode : null,
        resolution:
          typeof options?.resolution === 'string' ? options.resolution : null,
        status: row.status,
        taskId: row.taskId,
        providerStatus:
          typeof result?.providerStatus === 'string'
            ? result.providerStatus
            : null,
        error: typeof result?.error === 'string' ? result.error : null,
        costCredits: row.costCredits,
        providerCostUsd:
          typeof info?.providerCostUsd === 'number'
            ? info.providerCostUsd
            : null,
        sourceDurationSeconds:
          typeof info?.sourceDurationSeconds === 'number'
            ? info.sourceDurationSeconds
            : null,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
      };
    });

    return respPage(items, totalResult.count);
  } catch (error: any) {
    return respErr(error.message || 'Internal error');
  }
}

export const Route = createFileRoute('/api/admin/generations')({
  server: {
    handlers: { GET },
  },
});
