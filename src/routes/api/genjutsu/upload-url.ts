import { createFileRoute } from '@tanstack/react-router';

import { createHiggsfieldUploadUrl } from '@/modules/genjutsu/service';
import { enforceMinIntervalRateLimit } from '@/lib/rate-limit';
import { respData, respErr } from '@/lib/resp';

async function POST({ request }: { request: Request }) {
  const limited = enforceMinIntervalRateLimit(request, {
    intervalMs: 250,
    keyPrefix: 'genjutsu-upload-url',
  });
  if (limited) return limited;

  try {
    const body = await request.json().catch(() => ({}));
    const contentType =
      typeof body.contentType === 'string' ? body.contentType : '';

    return respData(await createHiggsfieldUploadUrl(contentType));
  } catch (error: any) {
    console.error('genjutsu upload-url failed:', error);
    return respErr(error?.message || 'Failed to create upload URL');
  }
}

export const Route = createFileRoute('/api/genjutsu/upload-url')({
  server: {
    handlers: { POST },
  },
});
