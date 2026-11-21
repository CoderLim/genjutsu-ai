import { createFileRoute } from '@tanstack/react-router';

import { getGeneratorTaskByRequestId } from '@/modules/generator/billing';
import { reconcileGeneratorTask } from '@/modules/generator/service';
import { enforceMinIntervalRateLimit } from '@/lib/rate-limit';
import { respOk } from '@/lib/resp';

async function POST({ request }: { request: Request }) {
  const limited = enforceMinIntervalRateLimit(request, {
    intervalMs: 1000, keyPrefix: 'generator-webhook',
  });
  if (limited) return limited;
  try {
    const payload = await request.json().catch(() => ({}));
    const candidates = [
      payload?.request_id,
      payload?.requestId,
      payload?.id,
      payload?.data?.request_id,
      payload?.data?.id,
    ];
    const requestId = candidates.find(value =>
      typeof value === 'string' && value.length >= 6
    ) as string | undefined;
    if (!requestId) return respOk();
    const task = await getGeneratorTaskByRequestId(requestId);
    if (task) {
      // Provider status is always re-queried. Webhook body is never trusted.
      await reconcileGeneratorTask(task);
    }
  } catch (error) {
    console.warn('[generator] webhook reconcile failed', error);
  }
  return respOk();
}

export const Route = createFileRoute('/api/generator/webhook')({
  server: { handlers: { POST } },
});
