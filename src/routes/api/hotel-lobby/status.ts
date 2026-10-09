import { createFileRoute } from '@tanstack/react-router';

import { getAuth } from '@/core/auth';
import {
  assertHotelLobbyGenerationId,
  getHotelLobbyTaskById,
} from '@/modules/hotel-lobby/billing';
import { reconcileHotelLobbyGeneration } from '@/modules/hotel-lobby/reconcile';
import { enforceMinIntervalRateLimit } from '@/lib/rate-limit';
import { respData, respErr, respJson } from '@/lib/resp';

async function GET({ request }: { request: Request }) {
  const limited = enforceMinIntervalRateLimit(request, {
    intervalMs: 1_000,
    keyPrefix: 'hotel-lobby-status',
  });
  if (limited) return limited;

  try {
    const auth = getAuth();
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) return respErr('Unauthorized', { status: 401 });

    const generationId = assertHotelLobbyGenerationId(
      new URL(request.url).searchParams.get('generationId')
    );
    const task = await getHotelLobbyTaskById({
      generationId,
      userId: session.user.id,
    });

    if (!task) {
      return respJson(
        -1,
        'Generation not found',
        { code: 'GENERATION_NOT_FOUND' },
        { status: 404 }
      );
    }

    return respData(await reconcileHotelLobbyGeneration(task));
  } catch (error: any) {
    console.error('hotel-lobby status failed:', error);
    return respErr(error?.message || 'Failed to query generation status', {
      status: 400,
    });
  }
}

export const Route = createFileRoute('/api/hotel-lobby/status')({
  server: {
    handlers: { GET },
  },
});
