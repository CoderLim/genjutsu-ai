import type { FieldValue, GeneratorModel, Workflow, WorkflowSpec } from './types';
import { createGeneratorState, updateGeneratorState } from './normalize';
import { calculateGeneratorCredits } from './pricing';

export type GeneratorModelFamily = {
  id: string;
  label: string;
  blurb: string;
  badge?: string;
  models: GeneratorModel[];
};

/** Product model families; workflow (image/video/reference) is a separate control. */
export function getGeneratorModelFamilyId(modelId: string): string {
  if (modelId === 'nano-banana-2' || modelId === 'nano-banana-pro')
    return 'nano-banana';
  if (
    modelId === 'photo-to-video-standard' ||
    modelId === 'text-to-video-standard' ||
    modelId === 'multi-image-to-video' ||
    modelId === 'all-in-one-video'
  ) return 'seedance';
  if (modelId === 'reference-to-video-pro' || modelId.startsWith('minimax-'))
    return 'minimax';
  if (modelId.startsWith('seedance-')) return 'seedance';
  if (modelId.startsWith('kling-')) return 'kling';
  if (modelId === 'text-to-image-fast' || modelId === 'image-edit-standard')
    return 'flux';
  // Future models should never be mislabeled as a generic tool category.
  return modelId;
}

const FAMILIES: Record<string, Pick<GeneratorModelFamily, 'label' | 'blurb' | 'badge'>> = {
  seedance: {
    label: 'Seedance',
    blurb: 'Multi-reference video creation',
  },
  'nano-banana': {
    label: 'Nano Banana',
    blurb: 'Multi-reference image edits',
  },
  flux: {
    label: 'FLUX',
    blurb: 'Fast image generation & edits',
  },
  minimax: {
    label: 'MiniMax',
    blurb: 'High-resolution images & video',
  },
  kling: {
    label: 'Kling',
    blurb: 'Cinematic video motion',
  },
};

const ORDER = ['seedance', 'nano-banana', 'minimax', 'kling', 'flux'];

export function groupGeneratorModels(models: readonly GeneratorModel[]): GeneratorModelFamily[] {
  const map = new Map<string, GeneratorModel[]>();
  for (const model of models) {
    const key = getGeneratorModelFamilyId(model.id);
    const list = map.get(key) ?? [];
    list.push(model);
    map.set(key, list);
  }
  return [...map.entries()]
    .sort(([a], [b]) => ORDER.indexOf(a) - ORDER.indexOf(b))
    .map(([id, familyModels]) => ({
      id, ...(FAMILIES[id] ?? {
        label: familyModels[0]?.name ?? id,
        blurb: '',
      }),
      models: familyModels,
    }));
}



/** One plain-language use case per actual model; never put workflows in the picker. */
const MODEL_SUMMARIES: Record<string, string> = {
  'photo-to-video-standard': 'Multi-reference video creation',
  'seedance-2-fast': 'Faster text & image to video',
  'seedance-2-mini': 'Lightweight video generation',
  'seedance-2.5': 'Text & image to video',
  'seedance-2.5-flash': 'Fast text & image to video',
  'minimax-h3': 'High-resolution video generation',
  'minimax-h3-turbo': 'Fast video generation',
  'minimax-h3-max-turbo': 'Fast frame-based video',
  'minimax-h3-max': 'Detailed frame-based video',
  'kling-4': 'Cinematic text & image to video',
  'kling-4-flash': 'Fast cinematic video creation',
  'kling-3-turbo': 'Quick text & image to video',
  'kling-3': 'Video creation with optional sound',
  'nano-banana-2': 'Multi-reference generation & edits',
  'nano-banana-pro': 'High-resolution image creation & edits',
  'minimax-h3-image': 'High-resolution generation & editing',
  'minimax-h3-image-highspeed': 'Fast generation & multi-image edits',
  'text-to-image-fast': 'Fast text-to-image generation',
  'image-edit-standard': 'Image editing with multiple references',
};

function fieldMinimum(field: WorkflowSpec['fields'][string] | undefined): FieldValue | undefined {
  if (!field) return undefined;
  if (field.options?.length) {
    const numeric = field.options.filter((value): value is number => typeof value === 'number');
    return numeric.length ? Math.min(...numeric) : field.default;
  }
  return typeof field.default === 'number' ? (field.min ?? field.default) : field.default;
}

/** The same pricing calculator as Generate, sampled at valid minimum settings. */
export function getGeneratorStartingCredits(model: GeneratorModel): number | null {
  if (!model.enabled || model.pricing.precision !== 'exact') return null;
  let cheapest = Infinity;
  for (const [workflow, spec] of Object.entries(model.workflows)) {
    if (!spec) continue;
    // First-frame references do not have an extra price. All-in-One does
    // require at least one real reference even for a minimum-price preview.
    const minImages = Math.max(
      spec.slots.referenceImages?.min ?? 0,
      spec.requiresAnyReference && spec.slots.referenceImages ? 1 : 0
    );
    if (spec.requiresAnyReference && minImages === 0) continue;
    if ((spec.slots.referenceVideos?.min ?? 0) > 0 ||
        (spec.slots.referenceAudio?.min ?? 0) > 0) continue;

    const resolutionField = spec.fields.resolution;
    const resolutions = resolutionField?.options ?? [resolutionField?.default];
    const duration = fieldMinimum(spec.fields.duration);
    const outputCount = fieldMinimum(spec.fields.outputCount);
    for (const resolution of resolutions) {
      const params: Record<string, FieldValue> = {};
      if (resolution !== undefined) params.resolution = resolution;
      if (duration !== undefined) params.duration = duration;
      if (outputCount !== undefined) params.outputCount = outputCount;
      if (spec.fields.generateAudio?.options?.includes(false)) {
        params.generateAudio = false;
      }
      try {
        const state = updateGeneratorState(createGeneratorState(model), model, {
          workflow: workflow as Workflow,
          params,
          inputs: {
            startFrame: null,
            endFrame: null,
            referenceImages: Array.from({ length: minImages }, (_, i) => 'reference-' + i),
            referenceVideos: [],
            referenceAudio: [],
          },
        });
        cheapest = Math.min(cheapest, calculateGeneratorCredits(state, model).credits);
      } catch {
        // An incompatible parameter combination is not an available minimum.
      }
    }
  }
  return Number.isFinite(cheapest) ? cheapest : null;
}

function maxConfiguredNumber(model: GeneratorModel, field: 'duration' | 'outputCount') {
  const values = Object.values(model.workflows).flatMap((spec) => {
    const config = spec?.fields[field];
    if (!config) return [];
    if (config.options) return config.options.filter((value): value is number => typeof value === 'number');
    return typeof config.max === 'number' ? [config.max] :
      typeof config.default === 'number' ? [config.default] : [];
  });
  return values.length ? Math.max(...values) : null;
}

/** Only display limits explicitly present in the selected model's catalog. */
export function getGeneratorModelHighlights(model: GeneratorModel) {
  const resolutions = Object.values(model.workflows).flatMap(
    (spec) => spec?.fields.resolution?.options?.map(String) ?? []
  );
  const resolutionScore = (resolution: string) => {
    const match = /^(\d+(?:\.\d+)?)(k|p)$/i.exec(resolution);
    return match ? Number(match[1]) * (match[2].toLowerCase() === 'k' ? 1000 : 1) : -1;
  };
  const maxResolution = resolutions.sort((a, b) => resolutionScore(b) - resolutionScore(a))[0] ?? null;
  const maxReferenceImages = Math.max(0, ...Object.values(model.workflows).map(
    spec => spec?.slots.referenceImages?.max ?? 0
  ));
  const maxOutputs = maxConfiguredNumber(model, 'outputCount');
  const maxDuration = model.mediaType === 'video'
    ? maxConfiguredNumber(model, 'duration')
    : null;

  return {
    description: MODEL_SUMMARIES[model.id] ??
      (model.mediaType === 'image' ? 'Image generation & editing' : 'Video generation'),
    startingCredits: getGeneratorStartingCredits(model),
    // Video: e.g. 1080p, 4K. Image models with no resolution control
    // show a grounded reference/output limit instead of inventing a 4K claim.
    capability: maxResolution
      ? 'Up to ' + maxResolution.toUpperCase().replace('P', 'p')
      : maxReferenceImages > 1
        ? 'Up to ' + maxReferenceImages + ' refs'
        : maxOutputs !== null
          ? 'Up to ' + maxOutputs + ' outputs'
          : null,
    maxDuration,
  };
}

export type GeneratorWorkflowChoice = {
  modelId: string;
  workflow: Workflow;
  label: string;
};

/**
 * A model entry selects a model, not a particular generation mode.
 * Seedance currently uses multiple backend catalog profiles; collapse them to
 * one visual model while retaining their original API and pricing boundaries.
 */
const SEEDANCE_BASE_IDS = new Set([
  'photo-to-video-standard',
  'text-to-video-standard',
  'multi-image-to-video',
  'all-in-one-video',
]);

/** Collapse only the original Seedance 2.0 workflow profiles. */
export function getGeneratorModelChoices(
  models: readonly GeneratorModel[],
  includeDisabled = false
): GeneratorModel[] {
  const available = includeDisabled ? models : models.filter(model => model.enabled);
  const base = available.filter(model => SEEDANCE_BASE_IDS.has(model.id));
  const representative = base.find(model => model.id === 'photo-to-video-standard') ?? base[0];
  return available.filter(model =>
    !SEEDANCE_BASE_IDS.has(model.id) || model.id === representative?.id
  );
}

export function generatorModelLabel(model: GeneratorModel): string {
  return SEEDANCE_BASE_IDS.has(model.id) ? 'Seedance 2.0' : model.name;
}

export function isSameGeneratorModelChoice(
  candidate: GeneratorModel,
  selected: GeneratorModel
): boolean {
  if (SEEDANCE_BASE_IDS.has(candidate.id)) {
    return SEEDANCE_BASE_IDS.has(selected.id);
  }
  return candidate.id === selected.id;
}

export function getGeneratorWorkflowChoices(
  models: readonly GeneratorModel[],
  active: GeneratorModel
): GeneratorWorkflowChoice[] {
  if (SEEDANCE_BASE_IDS.has(active.id)) {
    const choices: GeneratorWorkflowChoice[] = [
      { modelId: 'photo-to-video-standard', workflow: 'first-frame', label: 'First Frame' },
      { modelId: 'photo-to-video-standard', workflow: 'start-end', label: 'Start & End' },
      { modelId: 'all-in-one-video', workflow: 'all-in-one-reference', label: 'All-in-One Reference' },
    ];
    return choices.filter(choice => {
      const model = models.find(item => item.id === choice.modelId);
      return !!model?.workflows[choice.workflow];
    });
  }
  // Raphael-style video picker offers at most three intent modes. Text-only
  // generation lives in All-in-One Reference with optional media.
  const videoModes: Workflow[] = ['first-frame', 'start-end', 'all-in-one-reference'];
  const supported: Array<[Workflow, WorkflowSpec | undefined]> =
    active.mediaType === 'video'
      ? videoModes.map(workflow => [workflow, active.workflows[workflow]])
      : Object.entries(active.workflows).map(
          ([workflow, spec]) => [workflow as Workflow, spec]
        );
  return supported
    .filter((entry): entry is [Workflow, NonNullable<typeof entry[1]>] => !!entry[1])
    .map(([workflow, spec]) => ({
      modelId: active.id,
      workflow,
      label: workflow === 'all-in-one-reference' ? 'All-in-One Reference' : spec.label,
    }));
}
