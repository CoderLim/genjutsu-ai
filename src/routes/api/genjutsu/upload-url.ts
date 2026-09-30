import { createFileRoute } from '@tanstack/react-router';

import { getAuth } from '@/core/auth';
import { createHiggsfieldUploadUrl } from '@/modules/genjutsu/service';
import { enforceMinIntervalRateLimit } from '@/lib/rate-limit';
import { respData, respErr } from '@/lib/resp';

async function POST({ request }: { request: Request }) {
  const limited = enforceMinIntervalRateLimit(request, {
    intervalMs: 1_000,
    keyPrefix: 'genjutsu-upload-url',
  });
  if (limited) return limited;

  try {
    const auth = getAuth();
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) {
      return respErr('Unauthorized', { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const contentTypes = Array.isArray(body.contentTypes)
      ? body.contentTypes.filter(
          (value: unknown): value is string => typeof value === 'string'
        )
      : typeof body.contentType === 'string'
        ? [body.contentType]
        : [];

    if (contentTypes.length < 1 || contentTypes.length > 9) {
      return respErr('Provide between 1 and 9 upload content types', {
        status: 400,
      });
    }

    const uploads = [];
    for (const contentType of contentTypes) {
      uploads.push(await createHiggsfieldUploadUrl(contentType));
    }

    return respData({ uploads });
  } catch (error: any) {
    console.error('genjutsu upload-url failed:', error);
    return respErr(error?.message || 'Failed to create upload URL', {
      status: 400,
    });
  }
}

export const Route = createFileRoute('/api/genjutsu/upload-url')({
  server: {
    handlers: { POST },
  },
});
