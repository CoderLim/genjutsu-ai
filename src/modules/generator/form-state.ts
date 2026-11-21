import {
  getWorkflowSpec,
  type GeneratorInputs,
  type GeneratorModel,
  type GeneratorState,
  type FieldValue,
  type MediaSlot,
  type WorkflowSpec,
} from './types';
import { assertGeneratorReady } from './validation';

function countSlot(inputs: GeneratorInputs, slot: MediaSlot): number {
  const value = inputs[slot];
  return Array.isArray(value) ? value.length : value ? 1 : 0;
}

/**
 * Total reference limits apply across all three reference slots. Frames are
 * independent and do not consume this allowance.
 */
export function getGeneratorSlotCapacity(
  spec: WorkflowSpec,
  inputs: GeneratorInputs,
  slot: MediaSlot
): number {
  const rule = spec.slots[slot];
  if (!rule) return 0;

  let available = rule.max - countSlot(inputs, slot);
  if (
    spec.maxCombinedReferences !== undefined &&
    (slot === 'referenceImages' ||
      slot === 'referenceVideos' ||
      slot === 'referenceAudio')
  ) {
    const total =
      inputs.referenceImages.length +
      inputs.referenceVideos.length +
      inputs.referenceAudio.length;
    available = Math.min(available, spec.maxCombinedReferences - total);
  }
  return Math.max(0, available);
}

/** Optional slots must match validation, not the UI's visual mode. */
export function isGeneratorSlotOptional(
  spec: WorkflowSpec,
  slot: MediaSlot
): boolean {
  return (spec.slots[slot]?.min ?? 0) === 0;
}

export function generatorReadinessError(
  state: GeneratorState,
  model: GeneratorModel
): string | null {
  try {
    assertGeneratorReady(state, model);
    return null;
  } catch (error) {
    return error instanceof Error ? error.message : 'Please review your inputs';
  }
}

/** Unknown submissions with a provider ID can still be reconciled by polling. */
export function shouldPollGeneratorJob(job: {
  status: 'processing' | 'completed' | 'failed' | 'review';
  pollable?: boolean;
} | null): boolean {
  return !!job && (
    job.status === 'processing' ||
    (job.status === 'review' && job.pollable === true)
  );
}

export function workflowAcceptsAnyReference(model: GeneratorModel, workflow: GeneratorState['workflow']) {
  return getWorkflowSpec(model, workflow).requiresAnyReference === true;
}

/**
 * Hide incompatible choices in a capability-driven settings panel instead of
 * showing options that the normalizer will immediately reject.
 */
export function availableGeneratorFieldValues(
  spec: WorkflowSpec,
  params: Record<string, FieldValue>,
  fieldName: string,
  choices: readonly FieldValue[]
): FieldValue[] {
  return choices.filter(choice =>
    (spec.constraints ?? []).every(rule =>
      rule.field !== fieldName ||
      params[rule.when.field] !== rule.when.equals ||
      rule.allowedValues.includes(choice)
    )
  );
}
