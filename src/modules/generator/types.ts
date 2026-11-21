/**
 * Unified generator contracts. No imports from legacy generation modules.
 * This file is shared between the browser and the server.
 */
export type MediaType = 'image' | 'video';

export type Workflow =
  | 'text-to-image'
  | 'image-to-image'
  | 'text-to-video'
  | 'first-frame'
  | 'start-end'
  | 'all-in-one-reference'
  | 'reference-to-video';

export type MediaSlot =
  | 'startFrame'
  | 'endFrame'
  | 'referenceImages'
  | 'referenceVideos'
  | 'referenceAudio';

export type FieldValue = string | number | boolean;

/** Output metadata must match the selected image format (including WebP). */
export function generatorResultContentType(
  mediaType: MediaType,
  outputFormat: FieldValue | undefined
): string {
  if (mediaType === 'video') return 'video/mp4';
  if (outputFormat === 'webp') return 'image/webp';
  if (outputFormat === 'jpeg') return 'image/jpeg';
  return 'image/png';
}

export type FieldSpec = {
  label: string;
  /** Derived from uploaded media; not directly user-editable. */
  internal?: boolean;
  default: FieldValue;
  // For segmented controls, selectors and exact-value number choices.
  options?: readonly FieldValue[];
  // For continuous numbers when options is not supplied.
  min?: number;
  max?: number;
  step?: number;
};

export type MediaLimit = {
  min: number;
  max: number;
  accept: readonly string[];
  maxBytes?: number;
  minSeconds?: number;
  maxSeconds?: number;
};

export type ConditionalFieldRule = {
  when: { field: string; equals: FieldValue };
  field: string;
  allowedValues: readonly FieldValue[];
};

export type WorkflowSpec = {
  label: string;
  slots: Partial<Record<MediaSlot, MediaLimit>>;
  fields: Record<string, FieldSpec>;
  constraints?: readonly ConditionalFieldRule[];
  maxCombinedReferences?: number;
  requiresAnyReference?: boolean;
};

export type PricingRule =
  | {
      kind: 'fixed';
      credits: number;
    }
  | {
      kind: 'per-second';
      rates: Record<string, number>;
    }
  | {
      kind: 'per-image';
      rates: Record<string, number>;
    }
  | {
      kind: 'matrix';
      fields: readonly string[];
      creditsByCombination: Record<string, number>;
    };

export type PublicPricing = {
  version: string;
  /** Input-video tariffs can differ from output-only rates. */
  referenceVideoRates?: Record<string, number>;
  precision: 'exact' | 'estimate';
  rule: PricingRule;
  // All surcharges are customer credits, never provider costs.
  includedReferenceImages?: number;
  extraReferenceImageCredits?: number;
  audioMultiplier?: number;
  fastMultiplier?: number;
};

export type GeneratorModel = {
  id: string;
  name: string;
  mediaType: MediaType;
  maxPromptChars?: number;
  enabled: boolean;
  defaultWorkflow: Workflow;
  workflows: Partial<Record<Workflow, WorkflowSpec>>;
  pricing: PublicPricing;
};

export type GeneratorInputs = {
  startFrame: string | null;
  endFrame: string | null;
  referenceImages: string[];
  referenceVideos: string[];
  referenceAudio: string[];
};

export type GeneratorState = {
  mediaType: MediaType;
  modelId: string;
  workflow: Workflow;
  prompt: string;
  inputs: GeneratorInputs;
  params: Record<string, FieldValue>;
};

export type CreditEstimate = {
  credits: number;
  pricingVersion: string;
  precision: 'exact' | 'estimate';
};

export const EMPTY_INPUTS: GeneratorInputs = {
  startFrame: null,
  endFrame: null,
  referenceImages: [],
  referenceVideos: [],
  referenceAudio: [],
};

export function getWorkflowSpec(
  model: GeneratorModel,
  workflow: Workflow
): WorkflowSpec {
  const spec = model.workflows[workflow];
  if (!spec) throw new Error('Unsupported workflow: ' + workflow);
  return spec;
}

export function isFieldValueValid(value: unknown, field: FieldSpec): boolean {
  if (
    typeof value !== 'string' &&
    typeof value !== 'number' &&
    typeof value !== 'boolean'
  ) return false;
  if (typeof value === 'number' && !Number.isFinite(value)) return false;
  if (field.options) return field.options.includes(value);
  if (typeof field.default !== typeof value) return false;
  if (typeof value === 'number') {
    if (field.min !== undefined && value < field.min) return false;
    if (field.max !== undefined && value > field.max) return false;
    if (
      field.step !== undefined &&
      field.step > 0 &&
      Math.abs(
        (value - (field.min ?? 0)) / field.step -
          Math.round((value - (field.min ?? 0)) / field.step)
      ) > 1e-9
    ) return false;
  }
  return true;
}
