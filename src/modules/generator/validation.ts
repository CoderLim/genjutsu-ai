import {
  getWorkflowSpec,
  isFieldValueValid,
  type GeneratorModel,
  type GeneratorState,
  type GeneratorInputs,
} from './types';

function getInputCount(inputs: GeneratorInputs, slot: keyof GeneratorInputs) {
  const value = inputs[slot];
  return Array.isArray(value) ? value.length : value ? 1 : 0;
}

/**
 * Strict (non-mutating) validation for client drafts and eventual server
 * submission. Does not replace authentication or sealed-file ownership checks.
 */
export function assertGeneratorDraft(
  state: GeneratorState,
  model: GeneratorModel
): void {
  if (state.modelId !== model.id || state.mediaType !== model.mediaType) {
    throw new Error('Generator model mismatch');
  }
  const spec = getWorkflowSpec(model, state.workflow);
  if (Object.keys(state.params).some((key) => !(key in spec.fields))) {
    throw new Error('Unsupported generator parameter');
  }
  for (const [fieldName, field] of Object.entries(spec.fields)) {
    if (!isFieldValueValid(state.params[fieldName], field)) {
      throw new Error('Invalid generator parameter: ' + fieldName);
    }
  }

  for (const rule of spec.constraints ?? []) {
    if (
      state.params[rule.when.field] === rule.when.equals &&
      !rule.allowedValues.includes(state.params[rule.field])
    ) {
      throw new Error('Unsupported parameter combination: ' + rule.field);
    }
  }

  for (const slot of [
    'startFrame', 'endFrame', 'referenceImages', 'referenceVideos', 'referenceAudio',
  ] as const) {
    const count = getInputCount(state.inputs, slot);
    const limit = spec.slots[slot];
    if (!limit && count > 0) throw new Error('Unsupported input slot: ' + slot);
    if (limit && count > limit.max) throw new Error('Too many files in ' + slot);
    if (slot === 'startFrame' || slot === 'endFrame') {
      if (typeof state.inputs[slot] === 'string' && !state.inputs[slot].trim()) {
        throw new Error('Invalid input slot: ' + slot);
      }
    } else if (state.inputs[slot].some((value) => typeof value !== 'string' || !value.trim())) {
      throw new Error('Invalid input slot: ' + slot);
    }
  }

  const count = state.inputs.referenceImages.length +
    state.inputs.referenceVideos.length + state.inputs.referenceAudio.length;
  if (spec.maxCombinedReferences !== undefined && count > spec.maxCombinedReferences) {
    throw new Error('Too many combined references');
  }
  if (spec.requiresAnyReference && count === 0) {
    throw new Error('At least one reference image or video is required');
  }
  if (state.inputs.referenceAudio.length > 0 &&
      !state.inputs.referenceImages.length && !state.inputs.referenceVideos.length) {
    throw new Error('Audio references require an image or video reference');
  }
}

export function assertGeneratorReady(
  state: GeneratorState,
  model: GeneratorModel
): void {
  if (!model.enabled) throw new Error('Model is not enabled');
  assertGeneratorDraft(state, model);

  const prompt = state.prompt.trim();
  const maxChars = model.maxPromptChars ?? 50_000;
  if (!prompt || prompt.length > maxChars) {
    throw new Error('Prompt must contain 1–' + maxChars + ' characters');
  }

  const spec = getWorkflowSpec(model, state.workflow);
  for (const [slot, limit] of Object.entries(spec.slots)) {
    if (getInputCount(state.inputs, slot as keyof GeneratorInputs) < limit.min) {
      throw new Error('Missing required input: ' + slot);
    }
  }
}
