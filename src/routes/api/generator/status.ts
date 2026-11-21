import { createFileRoute } from '@tanstack/react-router';

import { getAuth } from '@/core/auth';
import { getGeneratorTask } from '@/modules/generator/billing';
import { reconcileGeneratorTask } from '@/modules/generator/service';
import { assertGenerationId } from '@/modules/generator/storage';
import { enforceMinIntervalRateLimit } from '@/lib/rate-limit';
import { respData, respErr } from '@/lib/resp';

async function GET({ request }: { request: Request }) {
  const limited = enforceMinIntervalRateLimit(request, {
    intervalMs: 1000, keyPrefix: 'generator-status',
  });
  if (limited) return limited;
  try {
    const session = await getAuth().api.getSession({ headers: request.headers });
    if (!session?.user) return respErr('Unauthorized', { status: 401 });
    const generationId = assertGenerationId(
      new URL(request.url).searchParams.get('generationId')
    );
    const task = await getGeneratorTask({
      generationId, userId: session.user.id,
    });
    if (!task) return respErr('Generation not found', { status: 404 });
    return respData(await reconcileGeneratorTask(task));
  } catch (error) {
    console.error('[generator] status failed', error);
    return respErr('Unable to check generation status', { status: 500 });
  }
}

export const Route = createFileRoute('/api/generator/status')({
  server: { handlers: { GET } },
});
