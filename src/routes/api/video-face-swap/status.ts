import { createFileRoute } from '@tanstack/react-router';

import { getAuth } from '@/core/auth';
import { assertVideoFaceSwapGenerationId } from '@/modules/video-face-swap/assert';
import { getVideoFaceSwapTaskById } from '@/modules/video-face-swap/billing';
import { reconcileVideoFaceSwapGeneration } from '@/modules/video-face-swap/service';
import { enforceMinIntervalRateLimit } from '@/lib/rate-limit';
import { respData, respErr, respJson } from '@/lib/resp';

async function GET({ request }: { request: Request }) {
  const limited = enforceMinIntervalRateLimit(request, {
    intervalMs: 1_000,
    keyPrefix: 'video-face-swap-status',
  });
  if (limited) return limited;

  try {
    const auth = getAuth();
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) return respErr('Unauthorized', { status: 401 });

    const generationId = assertVideoFaceSwapGenerationId(
      new URL(request.url).searchParams.get('generationId')
    );
    const task = await getVideoFaceSwapTaskById({
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

    return respData(await reconcileVideoFaceSwapGeneration(task));
  } catch (error: any) {
    console.error('video-face-swap status failed:', error);
    return respErr(error?.message || 'Failed to query generation status', {
      status: 400,
    });
  }
}

export const Route = createFileRoute('/api/video-face-swap/status')({
  server: {
    handlers: { GET },
  },
});
