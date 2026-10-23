import { createFileRoute } from '@tanstack/react-router';

import { getAuth } from '@/core/auth';
import {
  getKlingMotionControlTask,
  KlingMotionControlError,
} from '@/core/ai/kling-motion-control';
import { hasPermission } from '@/modules/rbac/service';
import { respData, respErr, respJson } from '@/lib/resp';

async function GET({
  request,
  params,
}: {
  request: Request;
  params: { taskId: string };
}) {
  try {
    const auth = getAuth();
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) {
      return respErr('Unauthorized', { status: 401 });
    }
    if (!(await hasPermission(session.user.id, 'admin.*'))) {
      return respErr('Forbidden', { status: 403 });
    }

    const task = await getKlingMotionControlTask(params.taskId);
    return respData(task, {
      headers: { 'cache-control': 'no-store' },
    });
  } catch (error) {
    console.error('kling motion-control status failed:', error);
    if (error instanceof KlingMotionControlError) {
      return respJson(
        -1,
        error.message,
        { providerCode: error.providerCode, providerPayload: error.payload },
        { status: error.status >= 400 && error.status <= 599 ? error.status : 502 }
      );
    }
    return respErr(
      error instanceof Error ? error.message : 'Failed to read Kling task',
      { status: 500 }
    );
  }
}

export const Route = createFileRoute(
  '/api/admin/kling-motion-control/status/$taskId'
)({
  server: { handlers: { GET } },
});
