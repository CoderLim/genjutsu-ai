import { createFileRoute } from '@tanstack/react-router';

import { getAuth } from '@/core/auth';
import {
  GeneratorPriceChangedError,
  GeneratorPromptBlockedError,
  generateWithGenerator,
} from '@/modules/generator/service';
import {
  GeneratorInsufficientCreditsError,
  GeneratorTaskConflictError,
} from '@/modules/generator/billing';
import { enforceMinIntervalRateLimit } from '@/lib/rate-limit';
import { respData, respErr, respJson } from '@/lib/resp';

async function POST({ request }: { request: Request }) {
  const limited = enforceMinIntervalRateLimit(request, {
    intervalMs: 1000, keyPrefix: 'generator-generate',
  });
  if (limited) return limited;
  try {
    const session = await getAuth().api.getSession({ headers: request.headers });
    if (!session?.user) return respErr('Unauthorized', { status: 401 });
    const body = await request.json();
    return respData(await generateWithGenerator({
      generationId: body.generationId,
      userId: session.user.id,
      userEmail: session.user.email,
      rawState: body.state,
      pricingVersion: body.pricingVersion,
      maxAcceptedCredits: body.maxAcceptedCredits,
    }));
  } catch (error) {
    if (error instanceof GeneratorPriceChangedError) {
      return respJson(-1, error.message, {
        code: 'PRICE_CHANGED',
        credits: error.credits,
        pricingVersion: error.pricingVersion,
      }, { status: 409 });
    }
    if (error instanceof GeneratorInsufficientCreditsError) {
      return respJson(-1, error.message, {
        code: 'INSUFFICIENT_CREDITS',
        requiredCredits: error.requiredCredits,
        balance: error.balance,
      }, { status: 402 });
    }
    if (error instanceof GeneratorTaskConflictError) {
      return respJson(-1, error.message, {
        code: 'GENERATION_CONFLICT',
      }, { status: 409 });
    }
    if (error instanceof GeneratorPromptBlockedError) {
      return respErr(error.message, { status: 400 });
    }
    console.error('[generator] generate failed',
      error instanceof Error ? error.message : 'unknown');
    return respErr(
      error instanceof Error ? error.message : 'Generation failed',
      { status: 400 }
    );
  }
}

export const Route = createFileRoute('/api/generator/generate')({
  server: { handlers: { POST } },
});
