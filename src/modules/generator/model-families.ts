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
  if (modelId === 'reference-to-video-pro') return 'minimax';
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
    blurb: 'MiniMax video models',
  },
};

const ORDER = ['seedance', 'nano-banana', 'flux', 'minimax'];

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
export function getGeneratorModelChoices(
  models: readonly GeneratorModel[]
): GeneratorModel[] {
  // An unverified/disabled model must not appear in either image or video
  // selection, even when the form runs in development mode.
  const enabledModels = models.filter(model => model.enabled);
  const seedance = enabledModels.filter(
    model => getGeneratorModelFamilyId(model.id) === 'seedance'
  );
  const representative = seedance.find(
    model => model.id === 'photo-to-video-standard'
  ) ?? seedance[0];
  return enabledModels.filter(model =>
    getGeneratorModelFamilyId(model.id) !== 'seedance' ||
    model.id === representative?.id
  );
}

export function generatorModelLabel(model: GeneratorModel): string {
  return getGeneratorModelFamilyId(model.id) === 'seedance'
    ? 'Seedance 2.0'
    : model.name;
}

export function isSameGeneratorModelChoice(
  candidate: GeneratorModel,
  selected: GeneratorModel
): boolean {
  if (getGeneratorModelFamilyId(candidate.id) === 'seedance') {
    return getGeneratorModelFamilyId(selected.id) === 'seedance';
  }
  return candidate.id === selected.id;
}

/**
 * A workflow selection can change internal backend profile without changing
 * the visible model. The UI submits the resolved modelId/workflow together.
 */
export function getGeneratorWorkflowChoices(
  models: readonly GeneratorModel[],
  active: GeneratorModel
): GeneratorWorkflowChoice[] {
  if (getGeneratorModelFamilyId(active.id) === 'seedance') {
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
