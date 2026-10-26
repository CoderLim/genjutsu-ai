import { createFileRoute } from '@tanstack/react-router';

import { getAuth } from '@/core/auth';
import {
  createKlingMotionControlTask,
  KlingMotionControlError,
  type KlingCharacterOrientation,
  type KlingMotionMode,
  type KlingMotionModel,
} from '@/core/ai/kling-motion-control';
import { hasPermission } from '@/modules/rbac/service';
import { respData, respErr, respJson } from '@/lib/resp';

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
    const modelName = body.modelName as KlingMotionModel | undefined;
    const mode = body.mode as KlingMotionMode;
    const characterOrientation =
      body.characterOrientation as KlingCharacterOrientation;

    const task = await createKlingMotionControlTask({
      imageUrl: typeof body.imageUrl === 'string' ? body.imageUrl : '',
      videoUrl: typeof body.videoUrl === 'string' ? body.videoUrl : '',
      prompt: typeof body.prompt === 'string' ? body.prompt : '',
      modelName,
      mode,
      characterOrientation,
      keepOriginalSound: body.keepOriginalSound !== false,
      watermarkEnabled: body.watermarkEnabled === true,
      externalTaskId:
        typeof body.externalTaskId === 'string' ? body.externalTaskId : undefined,
    });

    return respData(task);
  } catch (error) {
    console.error('kling motion-control generate failed:', error);
    if (error instanceof KlingMotionControlError) {
      return respJson(
        -1,
        error.message,
        { providerCode: error.providerCode, providerPayload: error.payload },
        { status: error.status >= 400 && error.status <= 599 ? error.status : 502 }
      );
    }
    return respErr(
      error instanceof Error ? error.message : 'Failed to start Kling task',
      { status: 500 }
    );
  }
}

export const Route = createFileRoute(
  '/api/admin/kling-motion-control/generate'
)({
  server: { handlers: { POST } },
});
