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
import { updateGeneratorState } from './normalize';

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

export const GENERATOR_REFERENCE_SLOTS = [
  'referenceImages', 'referenceVideos', 'referenceAudio',
] as const;
export type GeneratorReferenceSlot = (typeof GENERATOR_REFERENCE_SLOTS)[number];

export type GeneratorLocalFileMeta = { type: string; size: number; name?: string };

export type GeneratorMixedFileAssignment = {
  index: number;
  slot: GeneratorReferenceSlot;
};

/**
 * One visual upload control can accept several media types, but uploaded
 * assets must still be assigned to their separate provider slots.
 * Reject the entire batch if any file violates its own or the combined cap:
 * silently truncating a mixed batch would lose user-selected media.
 */
export function planGeneratorMixedReferenceFiles(
  spec: WorkflowSpec,
  inputs: GeneratorInputs,
  files: readonly GeneratorLocalFileMeta[]
): GeneratorMixedFileAssignment[] {
  const counts: Record<GeneratorReferenceSlot, number> = {
    referenceImages: inputs.referenceImages.length,
    referenceVideos: inputs.referenceVideos.length,
    referenceAudio: inputs.referenceAudio.length,
  };
  let total = counts.referenceImages + counts.referenceVideos + counts.referenceAudio;
  const planned: GeneratorMixedFileAssignment[] = [];

  files.forEach((file, index) => {
    const slot = GENERATOR_REFERENCE_SLOTS.find(
      name => spec.slots[name]?.accept.includes(file.type)
    );
    if (!slot) throw new Error('Unsupported reference file type: ' + (file.name ?? file.type));
    const rule = spec.slots[slot]!;
    if (!Number.isFinite(file.size) || file.size < 0 ||
        (rule.maxBytes !== undefined && file.size > rule.maxBytes)) {
      throw new Error('Reference file exceeds the size limit: ' + (file.name ?? file.type));
    }
    if (counts[slot] >= rule.max) {
      throw new Error('Maximum ' + rule.max + ' ' +
        (slot === 'referenceImages' ? 'images' : slot === 'referenceVideos' ? 'videos' : 'audio files'));
    }
    if (spec.maxCombinedReferences !== undefined &&
        total >= spec.maxCombinedReferences) {
      throw new Error('Maximum ' + spec.maxCombinedReferences + ' reference items in total');
    }
    counts[slot] += 1;
    total += 1;
    planned.push({ index, slot });
  });
  return planned;
}

/**
 * Short, stacked labels for the unified upload tile. Match the competitor's
 * presentation, but derive truthful limits from the currently selected model.
 * Unsupported media types are omitted, never shown as zero capacity.
 */
export function getGeneratorMixedReferenceTileLines(spec: WorkflowSpec): string[] {
  const lines: string[] = [];
  const images = spec.slots.referenceImages;
  if (images) lines.push('Max ' + images.max + ' img');

  const audio = spec.slots.referenceAudio;
  if (audio) lines.push(audio.maxTotalSeconds !== undefined
    ? audio.maxTotalSeconds + 's audio'
    : 'Max ' + audio.max + ' audio');

  const video = spec.slots.referenceVideos;
  if (video) lines.push(video.maxTotalSeconds !== undefined
    ? video.maxTotalSeconds + 's video'
    : 'Max ' + video.max + ' video');

  return lines;
}

/** Human-readable limits come from the selected workflow, never a hardcoded competitor value. */
export function describeGeneratorMixedReferences(spec: WorkflowSpec): string {
  const labels: string[] = [];
  for (const slot of GENERATOR_REFERENCE_SLOTS) {
    const rule = spec.slots[slot];
    if (!rule) continue;
    const suffix = slot === 'referenceImages' ? 'images (JPG / PNG / WebP)' :
      slot === 'referenceVideos' ? 'videos (MP4 / MOV)' : 'audio (M4A / WAV)';
    labels.push(rule.max + ' ' + suffix +
      (rule.maxTotalSeconds !== undefined ? ', ' + rule.maxTotalSeconds + 's total' : ''));
  }
  if (labels.length === 0) return '';
  const total = spec.maxCombinedReferences;
  return (total !== undefined ? 'Up to ' + total + ' items total: ' : 'Up to ') +
    labels.join(' · ');
}


/**
 * A model/workflow change can retain the same semantic image even though
 * the destination only accepts different MIME types or smaller files.
 * Filter browser-owned object URLs before the next quote / upload attempt.
 * A missing lookup means the local file cannot be uploaded and is dropped.
 */
export function filterGeneratorLocalMedia(
  state: GeneratorState,
  model: GeneratorModel,
  fileForUrl: (url: string) => GeneratorLocalFileMeta | undefined
): GeneratorState {
  const spec = getWorkflowSpec(model, state.workflow);
  const accepts = (slot: MediaSlot, url: string): boolean => {
    const limit = spec.slots[slot];
    const file = fileForUrl(url);
    return !!limit && !!file &&
      limit.accept.includes(file.type) &&
      Number.isFinite(file.size) && file.size >= 0 &&
      (limit.maxBytes === undefined || file.size <= limit.maxBytes);
  };
  const inputs: GeneratorInputs = {
    startFrame: state.inputs.startFrame &&
      accepts('startFrame', state.inputs.startFrame) ? state.inputs.startFrame : null,
    endFrame: state.inputs.endFrame &&
      accepts('endFrame', state.inputs.endFrame) ? state.inputs.endFrame : null,
    referenceImages: state.inputs.referenceImages.filter(
      url => accepts('referenceImages', url)
    ),
    referenceVideos: state.inputs.referenceVideos.filter(
      url => accepts('referenceVideos', url)
    ),
    referenceAudio: state.inputs.referenceAudio.filter(
      url => accepts('referenceAudio', url)
    ),
  };
  return updateGeneratorState(state, model, { inputs });
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

/**
 * Single source of truth for the segmented settings panel and its tests.
 * Choices depend on the *selected model/workflow*, and conditional constraints
 * may narrow them further when another setting changes.
 */
export function getGeneratorSettingChoices(
  spec: WorkflowSpec,
  params: Record<string, FieldValue>,
  name: string
): FieldValue[] {
  const field = spec.fields[name];
  if (!field || field.internal) return [];
  let candidates: FieldValue[];
  if (field.options) {
    candidates = [...field.options];
  } else if (
    typeof field.default === 'number' &&
    field.min !== undefined &&
    field.max !== undefined
  ) {
    const step = field.step ?? 1;
    if (!Number.isFinite(step) || step <= 0) return [];
    candidates = [];
    for (let value = field.min; value <= field.max + 1e-9; value += step) {
      candidates.push(Number(value.toFixed(6)));
    }
  } else {
    candidates = [];
  }
  return availableGeneratorFieldValues(spec, params, name, candidates);
}

/**
 * MiniMax H3 supports a Fast expansion mode, while Max variants expose only
 * disabled/balanced/quality. The UI must not render a switch that normalizes
 * every click back to the previous value.
 */
export function getGeneratorExpansionControls(spec: WorkflowSpec) {
  const modes = spec.fields.promptExpansionMode?.options ?? [];
  return {
    enhance: modes.includes('disabled') && modes.includes('balanced'),
    fast: modes.includes('fast'),
  };
}

/** Avoid accidental double charging with a fresh ID during a pending job. */
export function isGeneratorJobActive(job: {
  status: 'processing' | 'completed' | 'failed' | 'review';
} | null): boolean {
  return !!job && (job.status === 'processing' || job.status === 'review');
}
