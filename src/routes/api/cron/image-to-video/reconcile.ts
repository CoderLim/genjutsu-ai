import { createFileRoute } from '@tanstack/react-router';

import { envConfigs } from '@/config';
import { reconcileImageToVideoBatch } from '@/modules/image-to-video/service';
import { respData, respErr } from '@/lib/resp';

/**
 * Cron-compatible reconcile sweep for image-to-video.
 *
 * Auth: `Authorization: Bearer <CRON_SECRET>` (or `x-cron-secret` header).
 * If CRON_SECRET is unset, this route returns 503 — code supports recovery,
 * but automatic scheduling is a deploy-time config (e.g. Cloudflare Cron
 * Triggers calling this URL). Shipping this file alone ≠ unattended recovery.
 */
function authorizeCron(request: Request): boolean {
  const secret = envConfigs.cron_secret?.trim();
  if (!secret) return false;

  const auth = request.headers.get('authorization');
  if (auth?.startsWith('Bearer ') && auth.slice(7) === secret) return true;

  const header = request.headers.get('x-cron-secret');
  return header === secret;
}

async function POST({ request }: { request: Request }) {
  try {
    if (!envConfigs.cron_secret?.trim()) {
      return respErr(
        'CRON_SECRET is not configured. Set it to enable scheduled reconcile.',
        { status: 503 }
      );
    }
    if (!authorizeCron(request)) {
      return respErr('Unauthorized', { status: 401 });
    }

    const batch = await reconcileImageToVideoBatch();
    return respData({
      scanned: batch.scanned,
      completed: batch.results.filter((r) => r.result.status === 'completed')
        .length,
      failed: batch.results.filter((r) => r.result.status === 'failed').length,
      processing: batch.results.filter((r) => r.result.status === 'processing')
        .length,
    });
  } catch (error: any) {
    console.error('cron image-to-video reconcile failed:', error);
    return respErr(error?.message || 'Reconcile failed', { status: 500 });
  }
}

export const Route = createFileRoute('/api/cron/image-to-video/reconcile')({
  server: {
    handlers: { POST },
  },
});
