import { createFileRoute } from '@tanstack/react-router';

import { getGenjutsuStatus } from '@/modules/genjutsu/service';
import { persistGenjutsuResultToR2 } from '@/modules/genjutsu/storage';
import {
  getGenjutsuTaskByRequestIdAnyUser,
  refundGenjutsuGeneration,
  settleGenjutsuGeneration,
} from '@/modules/genjutsu/billing';
import { respOk } from '@/lib/resp';

function readRequestId(payload: any, request: Request) {
  const url = new URL(request.url);
  const candidates = [
    payload?.request_id,
    payload?.requestId,
    payload?.id,
    payload?.data?.request_id,
    payload?.data?.requestId,
    url.searchParams.get('request_id'),
    url.searchParams.get('requestId'),
  ];
  return candidates.find(
    (value) => typeof value === 'string' && value.length >= 6
  ) as string | undefined;
}

async function POST({ request }: { request: Request }) {
  try {
    const payload = await request.json().catch(() => ({}));
    const requestId = readRequestId(payload, request);

    // Webhook delivery is only a wake-up signal. We never trust its status or
    // result fields; every state transition is verified against Higgsfield.
    if (!requestId) return respOk();

    const task = await getGenjutsuTaskByRequestIdAnyUser(requestId);
    if (!task) return respOk();

    const provider = await getGenjutsuStatus(requestId);

    if (provider.status === 'completed' && provider.videoUrl) {
      const durable = await persistGenjutsuResultToR2({
        generationId: task.id,
        userId: task.userId,
        sourceUrl: provider.videoUrl,
      });

      await settleGenjutsuGeneration({
        generationId: task.id,
        userId: task.userId,
        providerStatus: provider.providerStatus,
        videoKey: durable.videoKey,
      });
    } else if (provider.status === 'failed') {
      await refundGenjutsuGeneration({
        generationId: task.id,
        userId: task.userId,
        providerStatus: provider.providerStatus,
        error: provider.error || 'Generation failed',
      });
    }
  } catch (error) {
    // Ack malformed/early deliveries. Client polling is the recovery path and
    // a later provider webhook may arrive again.
    console.error('genjutsu webhook reconcile failed:', error);
  }

  return respOk();
}

export const Route = createFileRoute('/api/genjutsu/webhook')({
  server: {
    handlers: { POST },
  },
});
