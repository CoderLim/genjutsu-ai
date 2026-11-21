import type { GeneratorModel, Workflow } from './types';

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
    blurb: 'Seedance 2.0 · Video generation',
  },
  'nano-banana': {
    label: 'Nano Banana',
    blurb: 'Nano Banana 2 & Pro · Images',
  },
  flux: {
    label: 'FLUX',
    blurb: 'FLUX.1 / FLUX.2',
  },
  minimax: {
    label: 'MiniMax',
    blurb: 'MiniMax video and image models',
  },
  kling: {
    label: 'Kling',
    blurb: 'Kling video models',
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
      { modelId: 'text-to-video-standard', workflow: 'text-to-video', label: 'Text to Video' },
      { modelId: 'multi-image-to-video', workflow: 'all-in-one-reference', label: 'Multi-Image' },
      { modelId: 'all-in-one-video', workflow: 'all-in-one-reference', label: 'All-in-One' },
    ];
    return choices.filter(choice => {
      const model = models.find(item => item.id === choice.modelId);
      return !!model?.workflows[choice.workflow];
    });
  }
  return Object.entries(active.workflows)
    .filter((entry): entry is [Workflow, NonNullable<typeof entry[1]>] => !!entry[1])
    .map(([workflow, spec]) => ({
      modelId: active.id,
      workflow,
      label: spec.label,
    }));
}
