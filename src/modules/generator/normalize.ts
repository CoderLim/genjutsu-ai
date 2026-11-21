import {
  EMPTY_INPUTS,
  getWorkflowSpec,
  isFieldValueValid,
  type GeneratorInputs,
  type GeneratorModel,
  type GeneratorState,
  type Workflow,
} from './types';

/**
 * Stateless draft normalization. Unsupported values and excess media are
 * discarded immediately; no hidden draft cache or automatic undo is kept.
 */
export function createGeneratorState(model: GeneratorModel): GeneratorState {
  const workflow = model.defaultWorkflow;
  const spec = getWorkflowSpec(model, workflow);
  return {
    mediaType: model.mediaType,
    modelId: model.id,
    workflow,
    prompt: '',
    inputs: { ...EMPTY_INPUTS, referenceImages: [], referenceVideos: [], referenceAudio: [] },
    params: Object.fromEntries(
      Object.entries(spec.fields).map(([name, field]) => [name, field.default])
    ),
  };
}

function limitArray(values: string[], max: number) {
  return values.slice(0, max);
}

export function normalizeGeneratorState(
  previous: GeneratorState,
  model: GeneratorModel,
  requestedWorkflow: Workflow = previous.workflow
): GeneratorState {
  const workflow = model.workflows[requestedWorkflow]
    ? requestedWorkflow
    : model.defaultWorkflow;
  const spec = getWorkflowSpec(model, workflow);

  const inputs: GeneratorInputs = {
    startFrame: previous.inputs.startFrame ?? null,
    endFrame: previous.inputs.endFrame ?? null,
    referenceImages: [...previous.inputs.referenceImages],
    referenceVideos: [...previous.inputs.referenceVideos],
    referenceAudio: [...previous.inputs.referenceAudio],
  };

  // Only semantic-preserving image transitions, never e.g. a start frame
  // silently becoming a reference video for H3.
  if (previous.workflow !== workflow) {
    if (workflow === 'first-frame' && previous.workflow === 'all-in-one-reference') {
      inputs.startFrame = inputs.referenceImages[0] ?? null;
    } else if (
      workflow === 'all-in-one-reference' &&
      (previous.workflow === 'first-frame' || previous.workflow === 'start-end')
    ) {
      inputs.referenceImages = inputs.startFrame ? [inputs.startFrame] : [];
    }
  }

  if (!spec.slots.startFrame) inputs.startFrame = null;
  if (!spec.slots.endFrame) inputs.endFrame = null;
  if (!spec.slots.referenceImages) {
    inputs.referenceImages = [];
  } else {
    inputs.referenceImages = limitArray(
      inputs.referenceImages,
      spec.slots.referenceImages.max
    );
  }
  if (!spec.slots.referenceVideos) {
    inputs.referenceVideos = [];
  } else {
    inputs.referenceVideos = limitArray(
      inputs.referenceVideos,
      spec.slots.referenceVideos.max
    );
  }
  if (!spec.slots.referenceAudio) {
    inputs.referenceAudio = [];
  } else {
    inputs.referenceAudio = limitArray(
      inputs.referenceAudio,
      spec.slots.referenceAudio.max
    );
  }

  if (spec.maxCombinedReferences !== undefined) {
    let available = spec.maxCombinedReferences;
    inputs.referenceImages = inputs.referenceImages.slice(0, available);
    available -= inputs.referenceImages.length;
    inputs.referenceVideos = inputs.referenceVideos.slice(0, available);
    available -= inputs.referenceVideos.length;
    inputs.referenceAudio = inputs.referenceAudio.slice(0, available);
  }

  const params: GeneratorState['params'] = {};
  for (const [name, field] of Object.entries(spec.fields)) {
    const current = previous.params[name];
    params[name] = isFieldValueValid(current, field) ? current : field.default;
  }

  // Constrained fields are resolved after their controlling fields.
  // Configuration cycles are invalid; detect them instead of looping forever.
  const maxPasses = (spec.constraints?.length ?? 0) + 1;
  let stable = false;
  for (let pass = 0; pass < maxPasses; pass += 1) {
    let changed = false;
    for (const rule of spec.constraints ?? []) {
      if (params[rule.when.field] !== rule.when.equals) continue;
      if (!rule.allowedValues.includes(params[rule.field])) {
        const fallback = spec.fields[rule.field]?.default;
        const next = fallback !== undefined && rule.allowedValues.includes(fallback)
          ? fallback
          : rule.allowedValues[0];
        if (next === undefined) throw new Error('Empty constraint: ' + rule.field);
        params[rule.field] = next;
        changed = true;
      }
    }
    if (!changed) {
      stable = true;
      break;
    }
  }
  if (!stable) throw new Error('Conflicting generator field constraints');

  return {
    mediaType: model.mediaType,
    modelId: model.id,
    workflow,
    prompt: previous.prompt,
    inputs,
    params,
  };
}

export function updateGeneratorState(
  previous: GeneratorState,
  model: GeneratorModel,
  patch: Partial<Omit<GeneratorState, 'modelId' | 'mediaType'>> = {}
): GeneratorState {
  const next = {
    ...previous,
    ...patch,
    inputs: patch.inputs ? { ...previous.inputs, ...patch.inputs } : previous.inputs,
    params: patch.params ? { ...previous.params, ...patch.params } : previous.params,
  };
  return normalizeGeneratorState(next, model, patch.workflow ?? previous.workflow);
}
