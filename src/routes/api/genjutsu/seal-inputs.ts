import { createFileRoute } from '@tanstack/react-router';

import { getAuth } from '@/core/auth';
import {
  assertGenerationId,
  claimGenjutsuSeal,
  getGenjutsuTaskById,
  markGenjutsuAttemptFailedPreflight,
  markGenjutsuAttemptReady,
  parseGenjutsuTaskInfo,
} from '@/modules/genjutsu/billing';
import {
  isGenjutsuE2EMockEnabled,
  sealGenjutsuE2EStorageObject,
} from '@/modules/genjutsu/e2e-mock';
import {
  getGenjutsuSealedInputKey,
  sealGenjutsuR2Inputs,
} from '@/modules/genjutsu/storage';
import { enforceMinIntervalRateLimit } from '@/lib/rate-limit';
import { respData, respErr, respJson } from '@/lib/resp';

function parseOptions(value: string | null | undefined) {
  if (!value) return null;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

async function POST({ request }: { request: Request }) {
  const limited = enforceMinIntervalRateLimit(request, {
    intervalMs: 750,
    keyPrefix: 'genjutsu-seal-inputs',
  });
  if (limited) return limited;

  let generationId: string | null = null;
  let userId: string | null = null;

  try {
    const auth = getAuth();
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) return respErr('Unauthorized', { status: 401 });
    userId = session.user.id;

    const body = await request.json().catch(() => ({}));
    generationId = assertGenerationId(body.generationId);

    let task = await getGenjutsuTaskById({ generationId, userId });
    if (!task) {
      return respJson(
        -1,
        'Generation attempt not found',
        { code: 'GENERATION_NOT_FOUND' },
        { status: 404 }
      );
    }

    const currentOptions = parseOptions(task.options);
    if (task.status === 'ready') {
      return respData({
        generationId,
        status: task.status,
        videoKey: currentOptions?.videoKey,
        imageKeys: currentOptions?.imageKeys,
      });
    }

    if (task.status !== 'initiated') {
      return respJson(
        -1,
        'Generation inputs can no longer be sealed',
        { code: 'GENERATION_ALREADY_STARTED' },
        { status: 409 }
      );
    }

    const videoKey =
      typeof currentOptions?.videoKey === 'string'
        ? currentOptions.videoKey
        : null;
    const imageKeys = Array.isArray(currentOptions?.imageKeys)
      ? currentOptions.imageKeys.filter(
          (value: unknown): value is string => typeof value === 'string'
        )
      : [];
    const contentTypes = Array.isArray(currentOptions?.contentTypes)
      ? currentOptions.contentTypes.filter(
          (value: unknown): value is string => typeof value === 'string'
        )
      : [];
    const contentLengths = Array.isArray(currentOptions?.contentLengths)
      ? currentOptions.contentLengths.map((value: unknown) => Number(value))
      : [];

    if (!videoKey || imageKeys.length < 1) {
      throw new Error('Generation upload inputs are not bound');
    }

    const claimed = await claimGenjutsuSeal({ generationId, userId });
    if (!claimed) {
      task = await getGenjutsuTaskById({ generationId, userId });
      const options = parseOptions(task?.options);
      if (task?.status === 'ready') {
        return respData({
          generationId,
          status: task.status,
          videoKey: options?.videoKey,
          imageKeys: options?.imageKeys,
        });
      }
      return respJson(
        -1,
        'Generation inputs are already being sealed',
        { code: 'GENERATION_SEAL_IN_PROGRESS' },
        { status: 409 }
      );
    }

    let sealed: { videoKey: string; imageKeys: string[] };
    if (isGenjutsuE2EMockEnabled()) {
      const sourceKeys = [videoKey, ...imageKeys];
      const sealedKeys = sourceKeys.map((sourceKey) =>
        getGenjutsuSealedInputKey({
          userId,
          generationId,
          stagingKey: sourceKey,
        })
      );
      sourceKeys.forEach((sourceKey, index) =>
        sealGenjutsuE2EStorageObject(sourceKey, sealedKeys[index])
      );
      sealed = {
        videoKey: sealedKeys[0],
        imageKeys: sealedKeys.slice(1),
      };
    } else {
      sealed = await sealGenjutsuR2Inputs({
        userId,
        generationId,
        videoKey,
        imageKeys,
        expectedContentTypes: contentTypes,
        expectedContentLengths: contentLengths,
      });
    }

    task = await markGenjutsuAttemptReady({
      generationId,
      userId,
      ...sealed,
    });
    if (!task || task.status !== 'ready') {
      throw new Error('Failed to finalize sealed generation inputs');
    }

    return respData({
      generationId,
      status: task.status,
      ...sealed,
    });
  } catch (error: any) {
    if (generationId && userId) {
      await markGenjutsuAttemptFailedPreflight({
        generationId,
        userId,
        stage: 'seal_inputs',
        errorCode: 'INPUT_SEAL_FAILED',
        error: error?.message || 'Failed to seal generation inputs',
      }).catch(() => undefined);
    }

    console.error('genjutsu seal-inputs failed:', error);
    return respErr(error?.message || 'Failed to seal generation inputs', {
      status: 400,
    });
  }
}

export const Route = createFileRoute('/api/genjutsu/seal-inputs')({
  server: {
    handlers: { POST },
  },
});
