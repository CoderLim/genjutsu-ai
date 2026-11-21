import {
  getWorkflowSpec,
  type CreditEstimate,
  type GeneratorModel,
  type GeneratorState,
  type FieldValue,
} from './types';
import { assertGeneratorDraft } from './validation';

function getKey(value: FieldValue | undefined, field: string): string {
  if (value === undefined) throw new Error('Missing pricing field ' + field);
  return String(value);
}

/**
 * Customer-facing credit quote. Pure, synchronous and safe for browser use.
 * Does NOT expose provider cost, upstream API secrets or profit multiplier.
 */
export function calculateGeneratorCredits(
  state: GeneratorState,
  model: GeneratorModel
): CreditEstimate {
  assertGeneratorDraft(state, model);
  getWorkflowSpec(model, state.workflow);

  const pricing = model.pricing;
  const params = state.params;
  const count = params.outputCount ?? 1;
  if (!Number.isInteger(count) || typeof count !== 'number' || count < 1) {
    throw new Error('Invalid output count');
  }

  let base: number;
  switch (pricing.rule.kind) {
    case 'fixed':
      base = pricing.rule.credits;
      break;
    case 'per-second': {
      const duration = params.duration;
      if (typeof duration !== 'number') throw new Error('Missing duration');
      const rate = pricing.rule.rates[getKey(params.resolution, 'resolution')];
      if (rate === undefined) throw new Error('Unsupported resolution rate');
      base = duration * rate;
      break;
    }
    case 'per-image': {
      const key = getKey(params.resolution ?? params.quality, 'resolution/quality');
      const rate = pricing.rule.rates[key];
      if (rate === undefined) throw new Error('Unsupported image rate');
      base = rate;
      break;
    }
    case 'matrix': {
      const key = pricing.rule.fields.map(f => getKey(params[f], f)).join('|');
      const rate = pricing.rule.creditsByCombination[key];
      if (rate === undefined) throw new Error('Unsupported pricing combination');
      base = rate;
      break;
    }
  }

  const extra = Math.max(
    0,
    state.inputs.referenceImages.length - (pricing.includedReferenceImages ?? Infinity)
  ) * (pricing.extraReferenceImageCredits ?? 0);
  let perOutput = base + extra;
  if (params.generateAudio === true) {
    perOutput *= pricing.audioMultiplier ?? 1;
  }
  if (params.fastMode === true) {
    perOutput *= pricing.fastMultiplier ?? 1;
  }

  // Round once after multiplying by the number of outputs.
  const total = perOutput * count;
  if (!Number.isFinite(total) || total <= 0) {
    throw new Error('Invalid generator pricing result');
  }

  return {
    credits: Math.max(1, Math.ceil(total - 1e-9)),
    precision: pricing.precision,
    pricingVersion: pricing.version,
  };
}
