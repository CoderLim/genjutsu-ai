import { createFileRoute } from '@tanstack/react-router';

import { getAuth } from '@/core/auth';
import {
  assertGenerationId,
  createGenjutsuAttempt,
  GenjutsuAttemptConflictError,
} from '@/modules/genjutsu/billing';
import { resolveGenjutsuProviderTarget } from '@/modules/genjutsu/service';
import { enforceMinIntervalRateLimit } from '@/lib/rate-limit';
import { respData, respErr, respJson } from '@/lib/resp';

async function POST({ request }: { request: Request }) {
  const limited = enforceMinIntervalRateLimit(request, {
    intervalMs: 750,
    keyPrefix: 'genjutsu-attempt',
  });
  if (limited) return limited;

  try {
    const auth = getAuth();
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) return respErr('Unauthorized', { status: 401 });

    const body = await request.json().catch(() => ({}));
    const generationId = assertGenerationId(body.generationId);
    const mode = body.mode;
    const resolution = body.resolution;
    const prompt = typeof body.prompt === 'string' ? body.prompt : '';

    if (mode !== 'motion-transfer' && mode !== 'objects-swap') {
      return respErr('Invalid Genjutsu mode', { status: 400 });
    }
    if (
      resolution !== '480p' &&
      resolution !== '720p' &&
      resolution !== '1080p'
    ) {
      return respErr('Invalid Genjutsu resolution', { status: 400 });
    }

    const target = resolveGenjutsuProviderTarget(mode);
    const task = await createGenjutsuAttempt({
      generationId,
      userId: session.user.id,
      mode,
      resolution,
      prompt,
      ...target,
    });

    return respData({
      generationId: task.id,
      status: task.status,
    });
  } catch (error: any) {
    if (error instanceof GenjutsuAttemptConflictError) {
      return respJson(-1, error.message, { code: error.code }, { status: 409 });
    }
    console.error('genjutsu attempt failed:', error);
    return respErr(error?.message || 'Failed to create generation attempt', {
      status: 400,
    });
  }
}

export const Route = createFileRoute('/api/genjutsu/attempt')({
  server: {
    handlers: { POST },
  },
});
