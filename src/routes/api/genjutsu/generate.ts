import { createFileRoute } from '@tanstack/react-router';

import { getAuth } from '@/core/auth';
import {
  HiggsfieldHttpError,
  estimateGenjutsuProviderCost,
  submitGenjutsu,
  type GenjutsuMode,
  type GenjutsuResolution,
} from '@/modules/genjutsu/service';
import { calculateGenjutsuCredits } from '@/modules/genjutsu/pricing';
import { isGenjutsuE2EMockEnabled } from '@/modules/genjutsu/e2e-mock';
import {
  CreditTransactionScene,
  getBalance,
  grant,
} from '@/modules/credits/service';
import {
  InsufficientCreditsError,
  assertGenerationId,
  claimGenjutsuSubmission,
  getGenjutsuTaskById,
  markGenjutsuSubmitted,
  markGenjutsuSubmissionUnknown,
  parseGenjutsuTaskInfo,
  refundGenjutsuGeneration,
  reserveGenjutsuCredits,
} from '@/modules/genjutsu/billing';
import { enforceMinIntervalRateLimit } from '@/lib/rate-limit';
import { respData, respErr, respJson } from '@/lib/resp';

type GenerationInput = {
  mode: GenjutsuMode;
  resolution: GenjutsuResolution;
  prompt: string;
  videoUrl: string;
  imageUrls: string[];
};

function inputFromBody(body: any): GenerationInput {
  return {
    mode: body.mode as GenjutsuMode,
    resolution: body.resolution as GenjutsuResolution,
    prompt: typeof body.prompt === 'string' ? body.prompt : '',
    videoUrl: typeof body.videoUrl === 'string' ? body.videoUrl : '',
    imageUrls: Array.isArray(body.imageUrls) ? body.imageUrls : [],
  };
}

function inputFromTask(task: {
  options?: string | null;
  prompt?: string | null;
}): GenerationInput {
  if (!task.options) throw new Error('Generation input is missing');
  const parsed = JSON.parse(task.options);
  return {
    mode: parsed.mode as GenjutsuMode,
    resolution: parsed.resolution as GenjutsuResolution,
    prompt:
      typeof parsed.prompt === 'string'
        ? parsed.prompt
        : typeof task.prompt === 'string'
          ? task.prompt
          : '',
    videoUrl: typeof parsed.videoUrl === 'string' ? parsed.videoUrl : '',
    imageUrls: Array.isArray(parsed.imageUrls) ? parsed.imageUrls : [],
  };
}

function taskResponse(task: any) {
  const { info } = parseGenjutsuTaskInfo(task);
  return {
    generationId: task.id,
    requestId: task.taskId || null,
    status: task.status,
    reservedCredits: task.costCredits || 0,
    providerCostUsd:
      typeof info?.providerCostUsd === 'number' ? info.providerCostUsd : null,
  };
}

async function POST({ request }: { request: Request }) {
  const limited = enforceMinIntervalRateLimit(request, {
    intervalMs: 1_500,
    keyPrefix: 'genjutsu-generate',
  });
  if (limited) return limited;

  try {
    const auth = getAuth();
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) {
      return respErr('Unauthorized', { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const generationId = assertGenerationId(body.generationId);

    let task = await getGenjutsuTaskById({
      generationId,
      userId: session.user.id,
    });
    let input: GenerationInput;

    if (task) {
      if (task.status !== 'reserved') {
        return respData(taskResponse(task));
      }
      input = inputFromTask(task);
    } else {
      input = inputFromBody(body);

      // Same exact body that will be sent to generation is first sent to
      // Higgsfield's server-side estimate endpoint. Client-provided price or
      // credit values are intentionally ignored.
      const estimate = await estimateGenjutsuProviderCost(input);
      const credits = calculateGenjutsuCredits(estimate.providerCostUsd);

      if (isGenjutsuE2EMockEnabled()) {
        const balance = await getBalance(session.user.id);
        if (balance < credits) {
          await grant({
            userId: session.user.id,
            userEmail: session.user.email,
            credits: Math.max(1000 - balance, credits - balance),
            description: 'Genjutsu E2E test credits',
            scene: CreditTransactionScene.GENJUTSU_E2E,
          });
        }
      }

      task = await reserveGenjutsuCredits({
        generationId,
        userId: session.user.id,
        userEmail: session.user.email,
        ...input,
        providerCostUsd: estimate.providerCostUsd,
        credits,
        providerEstimate: estimate.payload,
      });

      if (task.status !== 'reserved') {
        return respData(taskResponse(task));
      }
    }

    // Only one request is allowed to transition reserved -> submitting.
    const claimed = await claimGenjutsuSubmission({
      generationId,
      userId: session.user.id,
    });
    if (!claimed) {
      const current = await getGenjutsuTaskById({
        generationId,
        userId: session.user.id,
      });
      if (!current) throw new Error('Generation reservation disappeared');
      return respData(taskResponse(current));
    }

    try {
      const result = await submitGenjutsu(input);

      await markGenjutsuSubmitted({
        generationId,
        userId: session.user.id,
        requestId: result.requestId,
      });

      const current = await getGenjutsuTaskById({
        generationId,
        userId: session.user.id,
      });

      return respData(
        current
          ? taskResponse(current)
          : {
              generationId,
              requestId: result.requestId,
              status: result.status,
              reservedCredits: task.costCredits || 0,
            }
      );
    } catch (error: any) {
      if (error instanceof HiggsfieldHttpError) {
        await refundGenjutsuGeneration({
          generationId,
          userId: session.user.id,
          providerStatus: `http_${error.status}`,
          error: error.message,
        });
        return respJson(
          -1,
          error.message || 'Higgsfield rejected the generation',
          {
            code: 'PROVIDER_REJECTED',
            generationId,
            refundedCredits: task.costCredits || 0,
          },
          { status: error.status >= 400 && error.status < 500 ? 400 : 502 }
        );
      }

      // A transport error can happen after Higgsfield accepted the request but
      // before we received request_id. Retrying automatically could create a
      // second billable generation, so keep the reservation and flag it.
      const message =
        error instanceof Error ? error.message : 'Unknown submission error';
      await markGenjutsuSubmissionUnknown({
        generationId,
        userId: session.user.id,
        error: message,
      });

      return respJson(
        -1,
        'Generation submission result is uncertain. Credits remain reserved; do not retry this generation.',
        { code: 'SUBMISSION_UNKNOWN', generationId },
        { status: 502 }
      );
    }
  } catch (error: any) {
    if (error instanceof InsufficientCreditsError) {
      return respJson(
        -1,
        `Insufficient credits: need ${error.requiredCredits}, balance ${error.balance}`,
        {
          code: 'INSUFFICIENT_CREDITS',
          requiredCredits: error.requiredCredits,
          balance: error.balance,
        },
        { status: 402 }
      );
    }

    console.error('genjutsu submit failed:', error);
    return respErr(error?.message || 'Failed to start generation', {
      status: 400,
    });
  }
}

export const Route = createFileRoute('/api/genjutsu/generate')({
  server: {
    handlers: { POST },
  },
});
