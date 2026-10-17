import { createFileRoute } from '@tanstack/react-router';

import { getAuth } from '@/core/auth';
import { hasPermission } from '@/modules/rbac/service';
import { respData, respErr } from '@/lib/resp';

import {
  createKlingMotionUploadDescriptor,
  type KlingMotionUploadKind,
} from './-storage';

async function POST({ request }: { request: Request }) {
  try {
    const auth = getAuth();
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) {
      return respErr('Unauthorized', { status: 401 });
    }
    if (!(await hasPermission(session.user.id, 'admin.*'))) {
      return respErr('Forbidden', { status: 403 });
    }

    const body = await request.json().catch(() => ({}));
    const requestId = typeof body.requestId === 'string' ? body.requestId : '';
    const kind: KlingMotionUploadKind | null =
      body.kind === 'image' || body.kind === 'video' ? body.kind : null;
    const contentType =
      typeof body.contentType === 'string' ? body.contentType : '';
    const contentLength = Number(body.contentLength);

    if (!kind) {
      return respErr('kind must be image or video', { status: 400 });
    }

    const upload = await createKlingMotionUploadDescriptor({
      userId: session.user.id,
      requestId,
      kind,
      contentType,
      contentLength,
    });

    return respData(upload);
  } catch (error) {
    console.error('kling motion-control upload-url failed:', error);
    return respErr(
      error instanceof Error
        ? error.message
        : 'Failed to create Kling upload URL',
      { status: 400 }
    );
  }
}

export const Route = createFileRoute(
  '/api/admin/kling-motion-control/upload-url'
)({
  server: { handlers: { POST } },
});
