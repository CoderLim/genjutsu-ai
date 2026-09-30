import { createFileRoute } from '@tanstack/react-router';

import { getGenjutsuStatus } from '@/modules/genjutsu/service';
import { enforceMinIntervalRateLimit } from '@/lib/rate-limit';
import { respData, respErr } from '@/lib/resp';

async function GET({ request }: { request: Request }) {
  const limited = enforceMinIntervalRateLimit(request, {
    intervalMs: 1_000,
    keyPrefix: 'genjutsu-status',
  });
  if (limited) return limited;

  try {
    const { searchParams } = new URL(request.url);
    const requestId = searchParams.get('requestId') || '';
    return respData(await getGenjutsuStatus(requestId));
  } catch (error: any) {
    console.error('genjutsu status failed:', error);
    return respErr(error?.message || 'Failed to get generation status');
  }
}

export const Route = createFileRoute('/api/genjutsu/status')({
  server: {
    handlers: { GET },
  },
});
