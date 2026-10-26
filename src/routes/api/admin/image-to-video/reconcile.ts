import { createFileRoute } from '@tanstack/react-router';

import { getAuth } from '@/core/auth';
import { reconcileImageToVideoBatch } from '@/modules/image-to-video/service';
import { hasPermission } from '@/modules/rbac/service';
import { respData, respErr } from '@/lib/resp';

/**
 * Ops entry: manually sweep stale image-to-video tasks (submitted /
 * completing / submission_unknown+requestId). Does not re-submit WaveSpeed.
 *
 * This is NOT automatic unattended recovery by itself — pair with cron
 * (`/api/cron/image-to-video/reconcile`) after deploy-time scheduling.
 */
async function POST({ request }: { request: Request }) {
  try {
    const auth = getAuth();
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) return respErr('Unauthorized', { status: 401 });

    const isAdmin = await hasPermission(session.user.id, 'admin.*');
    if (!isAdmin) return respErr('Forbidden', { status: 403 });

    let limit: number | undefined;
    let minAgeMs: number | undefined;
    try {
      const body = (await request.json()) as {
        limit?: unknown;
        minAgeMs?: unknown;
      };
      if (typeof body.limit === 'number' && Number.isFinite(body.limit)) {
        limit = body.limit;
      }
      if (typeof body.minAgeMs === 'number' && Number.isFinite(body.minAgeMs)) {
        minAgeMs = body.minAgeMs;
      }
    } catch {
      // empty body is fine
    }

    const batch = await reconcileImageToVideoBatch({ limit, minAgeMs });
    return respData({
      scanned: batch.scanned,
      results: batch.results.map((row) => ({
        generationId: row.generationId,
        userId: row.userId,
        beforeStatus: row.beforeStatus,
        status: row.result.status,
        providerStatus: row.result.providerStatus,
        error: row.result.error,
        refundedCredits: row.result.refundedCredits,
      })),
    });
  } catch (error: any) {
    console.error('admin image-to-video reconcile failed:', error);
    return respErr(error?.message || 'Reconcile failed', { status: 500 });
  }
}

export const Route = createFileRoute('/api/admin/image-to-video/reconcile')({
  server: {
    handlers: { POST },
  },
});
