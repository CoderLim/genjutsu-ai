import { scanPromptWithWaffo } from '@/core/content-safety/waffo-scan';
import { getAllConfigs } from '@/modules/config/service';

import {
  buildGeneratorProviderRequest,
  classifyGeneratorSubmitError,
  getGeneratorProviderIdentity,
  queryGeneratorProvider,
  submitGeneratorProvider,
  type MediaReadUrls,
} from './adapters';
import {
  assertGeneratorTaskSignature,
  claimGeneratorCompletion,
  claimGeneratorSubmission,
  completeGeneratorTask,
  GENERATOR_SCENE,
  generatorRequestSignature,
  getGeneratorTask,
  listGeneratorReconcileTasks,
  markGeneratorSubmitted,
  markGeneratorSubmissionUnknown,
  parseTaskJson,
  recoverStaleGeneratorTask,
  refundGeneratorTask,
  reserveGeneratorTask,
  type GeneratorTask,
} from './billing';
import { getGeneratorModel, GENERATOR_MODELS } from './catalog';
import { probeGeneratorVideoDuration } from './media-metadata';
import { calculateGeneratorCredits } from './pricing';
import {
  assertGenerationId,
  deleteOrphanedSealedInputs,
  persistGeneratorResults,
  sealGeneratorInputs,
  signGeneratorReadUrl,
} from './storage';
import { getWorkflowSpec, type GeneratorInputs, type GeneratorState } from './types';
import { assertGeneratorReady } from './validation';

export class GeneratorPriceChangedError extends Error {
  constructor(public credits: number, public pricingVersion: string) {
    super('Credits have changed. Please confirm the current price.');
    this.name = 'GeneratorPriceChangedError';
  }
}

async function checkGeneratorPrompt(prompt: string) {
  const configs = await getAllConfigs();
  const merchantId = configs.waffo_merchant_id?.trim();
  const privateKey = configs.waffo_private_key?.trim();
  if (!merchantId || !privateKey) return;
  try {
    const verdict = await scanPromptWithWaffo({
      merchantId, privateKey, prompt, locale: 'en', semantic: 'enforce',
    });
    if (verdict.action === 'block' ||
      (verdict.action === 'review' && verdict.reasonCode !== 'service_degraded')) {
      throw new GeneratorPromptBlockedError();
    }
  } catch (error) {
    if (error instanceof GeneratorPromptBlockedError) throw error;
    // Match existing prompt-scan degradation policy, don't log private prompt.
    console.warn('[generator] content scan unavailable', error instanceof Error
      ? error.message : 'unknown');
  }
}

export class GeneratorPromptBlockedError extends Error {
  constructor() {
    super('This prompt does not meet our content guidelines.');
    this.name = 'GeneratorPromptBlockedError';
  }
}

function safeInputs(value: unknown): GeneratorInputs {
  const source = value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
  const array = (key: string) => {
    const item = source[key];
    if (!Array.isArray(item) || item.some(x => typeof x !== 'string')) {
      throw new Error('Invalid media inputs: ' + key);
    }
    return item as string[];
  };
  const single = (key: string) => {
    const item = source[key];
    if (item !== null && item !== undefined && typeof item !== 'string') {
      throw new Error('Invalid media input: ' + key);
    }
    return typeof item === 'string' ? item : null;
  };
  const allowed = new Set([
    'startFrame', 'endFrame', 'referenceImages', 'referenceVideos', 'referenceAudio',
  ]);
  if (Object.keys(source).some(key => !allowed.has(key))) {
    throw new Error('Unexpected media input field');
  }
  return {
    startFrame: single('startFrame'),
    endFrame: single('endFrame'),
    referenceImages: array('referenceImages'),
    referenceVideos: array('referenceVideos'),
    referenceAudio: array('referenceAudio'),
  };
}

export function parseGeneratorRequest(raw: unknown): GeneratorState {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    throw new Error('Invalid generation request');
  }
  const value = raw as Record<string, unknown>;
  const model = getGeneratorModel(String(value.modelId ?? ''));
  const prompt = value.prompt;
  if (typeof prompt !== 'string') throw new Error('Prompt must be a string');
  const workflow = value.workflow;
  if (typeof workflow !== 'string' || !model.workflows[workflow as GeneratorState['workflow']]) {
    throw new Error('Unsupported model workflow');
  }
  const params = value.params;
  if (!params || typeof params !== 'object' || Array.isArray(params)) {
    throw new Error('Invalid generator options');
  }
  return {
    mediaType: model.mediaType,
    modelId: model.id,
    workflow: workflow as GeneratorState['workflow'],
    prompt: prompt.trim(),
    inputs: safeInputs(value.inputs),
    params: params as GeneratorState['params'],
  };
}

async function readInputUrls(inputs: GeneratorInputs): Promise<MediaReadUrls> {
  async function maybe(key: string | null) {
    return key ? signGeneratorReadUrl(key) : undefined;
  }
  return {
    startFrame: await maybe(inputs.startFrame),
    endFrame: await maybe(inputs.endFrame),
    referenceImages: await Promise.all(inputs.referenceImages.map(signGeneratorReadUrl)),
    referenceVideos: await Promise.all(inputs.referenceVideos.map(signGeneratorReadUrl)),
    referenceAudio: await Promise.all(inputs.referenceAudio.map(signGeneratorReadUrl)),
  };
}

export function publicGeneratorTask(task: GeneratorTask) {
  const result = parseTaskJson(task.taskResult);
  const keys: string[] = Array.isArray(result.resultKeys)
    ? result.resultKeys.filter((value: unknown): value is string => typeof value === 'string')
    : [];
  const status = task.status === 'completed' ? 'completed'
    : task.status === 'refunded' || task.status === 'failed_preflight'
      ? 'failed'
      : task.status === 'submission_unknown' ? 'review' : 'processing';

  return {
    generationId: task.id,
    status,
    taskStatus: task.status,
    credits: task.costCredits,
    mediaType: task.mediaType,
    model: parseTaskJson(task.options).modelId,
    resultUrls: status === 'completed'
      ? keys.map((_, index) =>
          '/api/generator/result/' + encodeURIComponent(task.id) + '?index=' + index)
      : [],
    error: typeof result.error === 'string' && status !== 'completed'
      ? result.error : null,
  };
}

export async function generateWithGenerator(input: {
  generationId: string;
  userId: string;
  userEmail?: string;
  rawState: unknown;
  pricingVersion: string;
  maxAcceptedCredits: number;
}) {
  const generationId = assertGenerationId(input.generationId);
  const state = parseGeneratorRequest(input.rawState);
  const model = getGeneratorModel(state.modelId);
  assertGeneratorReady(state, model);
  const requestedSignature = generatorRequestSignature(state, input.pricingVersion);

  let task = await getGeneratorTask({ generationId, userId: input.userId });
  if (task) {
    assertGeneratorTaskSignature(task, requestedSignature);
  } else {
    const quote = calculateGeneratorCredits(state, model);
    if (input.pricingVersion !== quote.pricingVersion ||
      !Number.isSafeInteger(input.maxAcceptedCredits) ||
      input.maxAcceptedCredits < quote.credits) {
      throw new GeneratorPriceChangedError(quote.credits, quote.pricingVersion);
    }

    await checkGeneratorPrompt(state.prompt);
    const spec = getWorkflowSpec(model, state.workflow);
    const sealed = await sealGeneratorInputs({
      inputs: state.inputs,
      userId: input.userId,
      generationId,
      slots: spec.slots,
    });
    try {
      // Verify duration of all bounded reference videos before consuming credits.
      for (const slot of ['referenceVideos'] as const) {
        const limit = spec.slots[slot];
        if (!limit || (limit.minSeconds === undefined && limit.maxSeconds === undefined)) continue;
        for (const key of sealed.inputs[slot]) {
          const seconds = await probeGeneratorVideoDuration(await signGeneratorReadUrl(key));
          if ((limit.minSeconds !== undefined && seconds < limit.minSeconds) ||
              (limit.maxSeconds !== undefined && seconds > limit.maxSeconds)) {
            throw new Error('Reference video must be between ' +
              limit.minSeconds + ' and ' + limit.maxSeconds + ' seconds');
          }
        }
      }
      task = await reserveGeneratorTask({
        generationId, userId: input.userId, userEmail: input.userEmail,
        state, sealedState: { ...state, inputs: sealed.inputs },
        signature: requestedSignature, quote,
        ...getGeneratorProviderIdentity(state.modelId),
      });
      // A concurrent request can have won and bound different sealed keys.
      const retained = parseTaskJson(task.options).inputs as GeneratorInputs;
      const saved = new Set([
        retained?.startFrame, retained?.endFrame,
        ...(retained?.referenceImages ?? []),
        ...(retained?.referenceVideos ?? []),
        ...(retained?.referenceAudio ?? []),
      ]);
      await deleteOrphanedSealedInputs(sealed.created.filter(key => !saved.has(key)));
    } catch (error) {
      await deleteOrphanedSealedInputs(sealed.created);
      throw error;
    }
  }

  if (task.status !== 'reserved') return publicGeneratorTask(task);

  const claimed = await claimGeneratorSubmission({ generationId, userId: input.userId });
  if (!claimed) {
    task = await getGeneratorTask({ generationId, userId: input.userId });
    return publicGeneratorTask(task!);
  }

  // Provider input comes only from immutable, server-sealed R2 keys.
  const snapshot = parseTaskJson(task.options);
  const sealedInputs = snapshot.inputs as GeneratorInputs;
  const sealedState: GeneratorState = {
    ...state, inputs: sealedInputs,
    prompt: task.prompt,
    params: snapshot.params,
    workflow: snapshot.workflow,
  };
  const identity = getGeneratorProviderIdentity(state.modelId);

  // Failures before any network submission are definitively refundable:
  // an expired R2 URL or invalid provider payload must never be parked as
  // submission_unknown with the user's credits held.
  let readUrls: MediaReadUrls;
  try {
    readUrls = await readInputUrls(sealedInputs);
    buildGeneratorProviderRequest(sealedState, readUrls);
  } catch (error) {
    await refundGeneratorTask({
      generationId, userId: input.userId,
      reason: error instanceof Error ? error.message : 'Unable to prepare provider inputs',
    });
    return publicGeneratorTask((await getGeneratorTask({
      generationId, userId: input.userId,
    }))!);
  }

  let requestId: string | undefined;
  try {
    const started = await submitGeneratorProvider(sealedState, readUrls);
    requestId = started.requestId;
    if (!requestId) throw new Error('Provider returned no request ID');
    const updated = await markGeneratorSubmitted({
      generationId, userId: input.userId, requestId,
    });
    if (!updated || updated.status !== 'submitted') {
      throw new Error('Unable to bind provider request ID');
    }
    return publicGeneratorTask(updated);
  } catch (error) {
    // A request ID means upstream accepted the job even if DB write failed:
    // never refund or automatically submit a second request in this case.
    if (requestId) {
      try {
        await markGeneratorSubmissionUnknown({
          generationId, userId: input.userId, requestId,
          message: 'Provider request needs reconciliation',
        });
      } catch (persistError) {
        console.error('[generator] unable to save provider request ID', {
          generationId, error: persistError,
        });
      }
    } else if (classifyGeneratorSubmitError(error, identity.provider) === 'refund') {
      await refundGeneratorTask({
        generationId, userId: input.userId,
        reason: error instanceof Error ? error.message : 'Provider rejected request',
      });
    } else {
      await markGeneratorSubmissionUnknown({
        generationId, userId: input.userId,
        message: 'Provider submission status is uncertain; please contact support',
      });
    }
    const current = await getGeneratorTask({ generationId, userId: input.userId });
    if (!current) throw error;
    return publicGeneratorTask(current);
  }
}

export async function reconcileGeneratorTask(task: GeneratorTask) {
  const identity = { generationId: task.id, userId: task.userId };
  if (task.status === 'submitting' || task.status === 'reserved') {
    const recovered = await recoverStaleGeneratorTask(task);
    return publicGeneratorTask(recovered ?? task);
  }
  if (task.status === 'submission_unknown' && task.taskId) {
    const reopened = await (await import('./billing')).promoteGeneratorUnknown(identity);
    if (!reopened || reopened.status !== 'submitted') {
      return publicGeneratorTask(reopened ?? task);
    }
    task = reopened;
  }
  if (task.status !== 'submitted' && task.status !== 'completing') {
    return publicGeneratorTask(task);
  }
  if (!task.taskId) {
    // Do not resubmit or refund without knowing whether upstream accepted.
    return publicGeneratorTask(task);
  }

  const options = parseTaskJson(task.options);
  const modelId = String(options.modelId ?? '');
  const registered = GENERATOR_MODELS.find(model => model.id === modelId);
  if (!registered) {
    console.error('[generator] model removed while request pending', { id: task.id });
    return publicGeneratorTask(task);
  }

  let provider;
  try {
    provider = await queryGeneratorProvider({
      modelId, requestId: task.taskId,
      mediaType: task.mediaType as 'image' | 'video',
    });
  } catch (error) {
    console.warn('[generator] status query failed', { id: task.id, error });
    return publicGeneratorTask(task);
  }

  if (provider.status === 'failed') {
    await refundGeneratorTask({
      ...identity, providerStatus: provider.providerStatus,
      reason: provider.error || 'Provider generation failed',
    });
    return publicGeneratorTask((await getGeneratorTask(identity))!);
  }

  if (provider.status !== 'completed') return publicGeneratorTask(task);
  const claimed = await claimGeneratorCompletion(identity);
  if (!claimed) {
    return publicGeneratorTask((await getGeneratorTask(identity))!);
  }

  try {
    const type = task.mediaType === 'image'
      ? String(options.params?.outputFormat) === 'png'
        ? 'image/png' : 'image/jpeg'
      : 'video/mp4';
    const keys = await persistGeneratorResults({
      ...identity,
      outputUrls: provider.outputUrls,
      mediaType: task.mediaType as 'image' | 'video',
      contentType: type,
    });
    const updated = await completeGeneratorTask({
      ...identity, resultKeys: keys,
      providerStatus: provider.providerStatus,
    });
    return publicGeneratorTask(updated!);
  } catch (error) {
    // Provider succeeded. Never refund due to a temporary storage error.
    console.error('[generator] result persistence failed', {
      id: task.id, error,
    });
    return publicGeneratorTask((await getGeneratorTask(identity))!);
  }
}

export async function reconcileGeneratorBatch(limit = 25) {
  const tasks = await listGeneratorReconcileTasks({ limit });
  const outcomes: Array<{ generationId: string; status: string }> = [];
  for (const task of tasks) {
    try {
      const result = await reconcileGeneratorTask(task);
      outcomes.push({ generationId: task.id, status: result.status });
    } catch (error) {
      console.error('[generator] cron reconcile failed', { id: task.id, error });
      outcomes.push({ generationId: task.id, status: 'error' });
    }
  }
  return {
    scanned: tasks.length,
    outcomes,
  };
}
