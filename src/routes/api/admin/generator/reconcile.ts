import { createFileRoute } from '@tanstack/react-router';

import { getAuth } from '@/core/auth';
import { hasPermission } from '@/modules/rbac/service';
import { reconcileGeneratorBatch } from '@/modules/generator/service';
import { respData, respErr } from '@/lib/resp';

async function POST({ request }: { request: Request }) {
  const session = await getAuth().api.getSession({ headers: request.headers });
  if (!session?.user) return respErr('Unauthorized', { status: 401 });
  if (!(await hasPermission(session.user.id, 'admin.*'))) {
    return respErr('Forbidden', { status: 403 });
  }
  try {
    const body = await request.json().catch(() => ({}));
    const limit = typeof body?.limit === 'number' && Number.isSafeInteger(body.limit)
      ? Math.max(1, Math.min(body.limit, 100)) : 25;
    const outcome = await reconcileGeneratorBatch(limit);
    return respData(outcome);
  } catch (error) {
    console.error('[generator] admin reconcile failed', error);
    return respErr('Unable to reconcile generator tasks', { status: 500 });
  }
}

export const Route = createFileRoute('/api/admin/generator/reconcile')({
  server: { handlers: { POST } },
});
