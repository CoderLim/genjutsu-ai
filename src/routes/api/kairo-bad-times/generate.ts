import { createFileRoute } from '@tanstack/react-router';

import { classifyFalSubmitFailure } from '@/core/ai';
import { getAuth } from '@/core/auth';
import {
  assertKairoBadTimesGenerationId,
  assertKairoBadTimesTaskMatches,
  claimKairoBadTimesSubmission,
  getKairoBadTimesTaskById,
  KairoBadTimesGenerationConflictError,
  KairoBadTimesInsufficientCreditsError,
  markKairoBadTimesSubmissionUnknown,
  markKairoBadTimesSubmitted,
  refundKairoBadTimesGeneration,
  reserveKairoBadTimesGeneration,
} from '@/modules/kairo-bad-times/billing';
import {
  assertKairoBadTimesSubject,
  getKairoBadTimesModel,
  KAIRO_BAD_TIMES_CHARACTER_ORIENTATION,
  KAIRO_BAD_TIMES_KEEP_ORIGINAL_SOUND,
} from '@/modules/kairo-bad-times/constants';
import {
  estimateKairoBadTimesCredits,
  estimateKairoBadTimesProviderCost,
} from '@/modules/kairo-bad-times/pricing';
import {
  KairoBadTimesPreflightError,
  submitKairoBadTimes,
} from '@/modules/kairo-bad-times/service';
import {
  ensureKairoBadTimesTemplateInR2,
  resolveKairoBadTimesInputUrls,
  sealKairoBadTimesInput,
} from '@/modules/kairo-bad-times/storage';
import { probeKairoBadTimesDurationSeconds } from '@/modules/kairo-bad-times/video-metadata';
import { enforceMinIntervalRateLimit } from '@/lib/rate-limit';
import { respData, respErr, respJson } from '@/lib/resp';

function taskResponse(task: any) {
  return {
    generationId: task.id,
    requestId: task.taskId || null,
    status: task.status,
    reservedCredits: task.costCredits || 0,
  };
}

async function POST({ request }: { request: Request }) {
  const limited = enforceMinIntervalRateLimit(request, {
    intervalMs: 1_500,
    keyPrefix: 'kairo-bad-times-generate',
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
    generationId = assertKairoBadTimesGenerationId(body.generationId);

    const imageKey =
      typeof body.imageKey === 'string' ? body.imageKey : undefined;
    const contentTypes = Array.isArray(body.contentTypes)
      ? body.contentTypes.filter(
          (value: unknown): value is string => typeof value === 'string'
        )
      : [];
    const contentLengths = Array.isArray(body.contentLengths)
      ? body.contentLengths.map((value: unknown) => Number(value))
      : [];

    if (
      !imageKey ||
      contentTypes.length !== 1 ||
      contentLengths.length !== 1 ||
      !Number.isFinite(contentLengths[0])
    ) {
      return respErr('Uploaded reference image is incomplete', {
        status: 400,
      });
    }

    if (body.preview === true) {
      return respErr('Paid preview is no longer supported', { status: 400 });
    }
    const subject = assertKairoBadTimesSubject(body.subject ?? 'human');

    const sealed = await sealKairoBadTimesInput({
      userId,
      generationId,
      imageKey,
      contentType: contentTypes[0],
      contentLength: contentLengths[0],
    });

    const templateVideoKey = await ensureKairoBadTimesTemplateInR2(subject);
    const providerInput = await resolveKairoBadTimesInputUrls({
      userId,
      generationId,
      imageKey: sealed.imageKey,
      templateVideoKey,
    });

    const duration = await probeKairoBadTimesDurationSeconds(
      providerInput.videoUrl
    );

    const providerCostUsd = estimateKairoBadTimesProviderCost({
      duration,
      subject,
    });
    const credits = estimateKairoBadTimesCredits({ duration, subject });

    const matchSnapshot = {
      imageKey: sealed.imageKey,
      templateVideoKey,
      duration,
      subject,
      characterOrientation: KAIRO_BAD_TIMES_CHARACTER_ORIENTATION,
      keepOriginalSound: KAIRO_BAD_TIMES_KEEP_ORIGINAL_SOUND,
      model: getKairoBadTimesModel(subject),
    };

    const existing = await getKairoBadTimesTaskById({
      generationId,
      userId,
    });
    if (existing) {
      assertKairoBadTimesTaskMatches(existing, matchSnapshot);
      return respData(taskResponse(existing));
    }

    const task = await reserveKairoBadTimesGeneration({
      generationId,
      userId,
      userEmail: session.user.email,
      ...matchSnapshot,
      providerCostUsd,
      credits,
      creditDescription: `Reserve credits for Kairo Bad Times ${subject} generation`,
    });

    if (task.status !== 'reserved') {
      return respData(taskResponse(task));
    }

    const claimed = await claimKairoBadTimesSubmission({
      generationId,
      userId,
    });
    if (!claimed) {
      const current = await getKairoBadTimesTaskById({ generationId, userId });
      if (!current) throw new Error('Kairo Bad Times generation disappeared');
      return respData(taskResponse(current));
    }

    let requestId: string | null = null;
    try {
      const result = await submitKairoBadTimes({
        duration,
        imageUrl: providerInput.imageUrl,
        videoUrl: providerInput.videoUrl,
        subject,
      });
      requestId = result.requestId;
    } catch (error: unknown) {
      const message =
        error instanceof Error
          ? error.message
          : 'Video generation submission failed';

      if (classifyFalSubmitFailure(message) === 'refund') {
        await refundKairoBadTimesGeneration({
          generationId,
          userId,
          providerStatus: 'submit_failed',
          error: message,
        });
        return respJson(
          -1,
          'Generation could not start. Credits were refunded.',
          { code: 'PROVIDER_SUBMIT_FAILED', generationId },
          { status: 502 }
        );
      }

      console.error('[ops] kairo-bad-times submission_unknown credits_held', {
        generationId,
        userId,
        error: message,
        hasRequestId: false,
      });
      await markKairoBadTimesSubmissionUnknown({
        generationId,
        userId,
        error: message,
      });
      return respJson(
        -1,
        'Generation submission result is uncertain. Credits remain reserved; do not retry this generation.',
        { code: 'SUBMISSION_UNKNOWN', generationId },
        { status: 502 }
      );
    }

    try {
      const submitted = await markKairoBadTimesSubmitted({
        generationId,
        userId,
        requestId,
      });

      return respData(
        submitted
          ? taskResponse(submitted)
          : {
              generationId,
              requestId,
              status: 'submitted',
              reservedCredits: credits,
            }
      );
    } catch (error: unknown) {
      const message =
        error instanceof Error
          ? error.message
          : 'Failed to bind Fal request id';

      console.error('[ops] kairo-bad-times bind_failed requestId_persisted', {
        generationId,
        userId,
        requestId,
        error: message,
        hasRequestId: true,
      });

      await markKairoBadTimesSubmissionUnknown({
        generationId,
        userId,
        requestId,
        error: `bind_failed: ${message}`,
      });

      return respJson(
        -1,
        'Generation was accepted by the provider but could not be bound locally. Credits remain reserved; do not retry this generation.',
        { code: 'SUBMISSION_UNKNOWN', generationId, requestId },
        { status: 502 }
      );
    }
  } catch (error: any) {
    if (error instanceof KairoBadTimesInsufficientCreditsError) {
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

    if (error instanceof KairoBadTimesGenerationConflictError) {
      return respJson(
        -1,
        error.message,
        { code: 'GENERATION_CONFLICT' },
        { status: 409 }
      );
    }

    if (error instanceof KairoBadTimesPreflightError) {
      return respErr(error.message, { status: 400 });
    }

    console.error('kairo-bad-times generate failed:', error);
    return respErr(error?.message || 'Failed to start generation', {
      status: 400,
    });
  }
}

export const Route = createFileRoute('/api/kairo-bad-times/generate')({
  server: {
    handlers: { POST },
  },
});
