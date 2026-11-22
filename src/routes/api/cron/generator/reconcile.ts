import { createFileRoute } from '@tanstack/react-router';

import { envConfigs } from '@/config';
import { reconcileGeneratorBatch } from '@/modules/generator/service';
import { respData, respErr } from '@/lib/resp';

async function POST({ request }: { request: Request }) {
  const secret = envConfigs.cron_secret?.trim();
  if (!secret) return respErr('CRON_SECRET not configured', { status: 503 });
  const bearer = request.headers.get('authorization');
  if (bearer !== 'Bearer ' + secret &&
      request.headers.get('x-cron-secret') !== secret) {
    return respErr('Unauthorized', { status: 401 });
  }
  try {
    const batch = await reconcileGeneratorBatch();
    return respData({
      scanned: batch.scanned,
      completed: batch.outcomes.filter(item => item.status === 'completed').length,
      failed: batch.outcomes.filter(item => item.status === 'failed').length,
      processing: batch.outcomes.filter(item => item.status === 'processing').length,
      errors: batch.outcomes.filter(item => item.status === 'error').length,
    });
  } catch (error) {
    console.error('[generator] cron reconcile error', error);
    return respErr('Unable to reconcile generator jobs', { status: 500 });
  }
}

export const Route = createFileRoute('/api/cron/generator/reconcile')({
  server: { handlers: { POST } },
});
