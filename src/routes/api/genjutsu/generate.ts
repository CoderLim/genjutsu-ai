import { createFileRoute } from '@tanstack/react-router';

import {
  submitGenjutsu,
  type GenjutsuMode,
  type GenjutsuResolution,
} from '@/modules/genjutsu/service';
import { enforceMinIntervalRateLimit } from '@/lib/rate-limit';
import { respData, respErr } from '@/lib/resp';

async function POST({ request }: { request: Request }) {
  const limited = enforceMinIntervalRateLimit(request, {
    intervalMs: 10_000,
    keyPrefix: 'genjutsu-generate',
  });
  if (limited) return limited;

  try {
    const body = await request.json().catch(() => ({}));

    const result = await submitGenjutsu({
      mode: body.mode as GenjutsuMode,
      resolution: body.resolution as GenjutsuResolution,
      prompt: typeof body.prompt === 'string' ? body.prompt : '',
      videoUrl: typeof body.videoUrl === 'string' ? body.videoUrl : '',
      imageUrls: Array.isArray(body.imageUrls) ? body.imageUrls : [],
    });

    return respData(result);
  } catch (error: any) {
    console.error('genjutsu submit failed:', error);
    return respErr(error?.message || 'Failed to start generation');
  }
}

export const Route = createFileRoute('/api/genjutsu/generate')({
  server: {
    handlers: { POST },
  },
});
