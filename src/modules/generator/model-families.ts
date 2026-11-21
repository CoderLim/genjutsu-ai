import type { GeneratorModel } from './types';

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
  if (modelId === 'reference-to-video-pro') return 'video-preview';
  return 'image-tools';
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
  'image-tools': {
    label: 'Image Tools',
    blurb: 'Additional image models',
  },
  'video-preview': {
    label: 'Video Preview',
    blurb: 'Models under evaluation',
  },
};

const ORDER = ['seedance', 'nano-banana', 'image-tools', 'video-preview'];

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
      id, ...(FAMILIES[id] ?? { label: 'Other Models', blurb: 'Available models' }),
      models: familyModels,
    }));
}
