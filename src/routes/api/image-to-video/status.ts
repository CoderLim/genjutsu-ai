import { createFileRoute } from '@tanstack/react-router';

import { getAuth } from '@/core/auth';
import { assertImageToVideoGenerationId } from '@/modules/image-to-video/assert';
import { getImageToVideoTaskById } from '@/modules/image-to-video/billing';
import { reconcileImageToVideoGeneration } from '@/modules/image-to-video/service';
import { enforceMinIntervalRateLimit } from '@/lib/rate-limit';
import { respData, respErr, respJson } from '@/lib/resp';

async function GET({ request }: { request: Request }) {
  const limited = enforceMinIntervalRateLimit(request, {
    intervalMs: 1_000,
    keyPrefix: 'image-to-video-status',
  });
  if (limited) return limited;

  try {
    const auth = getAuth();
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) return respErr('Unauthorized', { status: 401 });

    const generationId = assertImageToVideoGenerationId(
      new URL(request.url).searchParams.get('generationId')
    );
    const task = await getImageToVideoTaskById({
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

    return respData(await reconcileImageToVideoGeneration(task));
  } catch (error: any) {
    console.error('image-to-video status failed:', error);
    return respErr(error?.message || 'Failed to query generation status', {
      status: 400,
    });
  }
}

export const Route = createFileRoute('/api/image-to-video/status')({
  server: {
    handlers: { GET },
  },
});
