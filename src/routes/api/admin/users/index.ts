import { createFileRoute } from '@tanstack/react-router';
import { and, count, desc, like, or, type SQL } from 'drizzle-orm';

import { getAuth } from '@/core/auth';
import { db } from '@/core/db';
import { user } from '@/config/db/schema';
import { getBalances } from '@/modules/credits/service';
import { hasPermission } from '@/modules/rbac/service';
import { respErr, respPage } from '@/lib/resp';

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
    const search = searchParams.get('search');

    const conditions: SQL[] = [];
    if (search) {
      conditions.push(
        or(like(user.email, `%${search}%`), like(user.name, `%${search}%`))!
      );
    }
    const where = conditions.length > 0 ? and(...conditions) : undefined;

    const database = db();

    const [totalResult] = await database
      .select({ count: count() })
      .from(user)
      .where(where);
    const total = totalResult.count;

    const users = await database
      .select({
        id: user.id,
        name: user.name,
        email: user.email,
        image: user.image,
        createdAt: user.createdAt,
        utmSource: user.utmSource,
        ip: user.ip,
      })
      .from(user)
      .where(where)
      .orderBy(desc(user.createdAt))
      .limit(pageSize)
      .offset(offset);

    const balances = await getBalances(
      users.map((u) => u.id),
      database
    );
    const withCredits = users.map((u) => ({
      ...u,
      credits: balances.get(u.id) ?? 0,
    }));

    return respPage(withCredits, total);
  } catch (error: any) {
    return respErr(error.message || 'Internal error');
  }
}

export const Route = createFileRoute('/api/admin/users/')({
  server: {
    handlers: { GET },
  },
});
