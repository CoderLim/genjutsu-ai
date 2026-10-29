import { createFileRoute } from '@tanstack/react-router';

import { envConfigs } from '@/config';
import { reconcileVideoFaceSwapBatch } from '@/modules/video-face-swap/service';
import { respData, respErr } from '@/lib/resp';

/**
 * Cron-compatible reconcile sweep for video-face-swap.
 * Does not re-submit WaveSpeed jobs.
 */
async function POST({ request }: { request: Request }) {
  const expected = envConfigs.cron_secret?.trim();
  if (!expected) {
    return respErr('Cron secret is not configured', { status: 503 });
  }

  const auth = request.headers.get('authorization') || '';
  const bearer = auth.startsWith('Bearer ') ? auth.slice(7).trim() : '';
  const headerSecret = request.headers.get('x-cron-secret')?.trim() || '';
  if (bearer !== expected && headerSecret !== expected) {
    return respErr('Unauthorized', { status: 401 });
  }

  try {
    const url = new URL(request.url);
    const limitRaw = Number(url.searchParams.get('limit'));
    const limit = Number.isFinite(limitRaw) ? limitRaw : undefined;
    const result = await reconcileVideoFaceSwapBatch({ limit });
    return respData(result);
  } catch (error: any) {
    console.error('cron video-face-swap reconcile failed:', error);
    return respErr(error?.message || 'Reconcile failed', { status: 500 });
  }
}

export const Route = createFileRoute('/api/cron/video-face-swap/reconcile')({
  server: {
    handlers: { POST },
  },
});
