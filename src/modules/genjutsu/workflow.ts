import { envConfigs } from '@/config';

import type {
  GenjutsuMode,
  GenjutsuProvider,
  GenjutsuProviderTarget,
} from './types';

export type SeedanceTask = 'reference' | 'editing';

function normalizeProvider(value: string | undefined): GenjutsuProvider {
  const normalized = value?.trim().toLowerCase();
  if (normalized === 'seedance-volcengine') return 'seedance-volcengine';
  if (normalized === 'seedance') return 'seedance';
  return 'higgsfield';
}

export function getSeedanceTask(mode: GenjutsuMode): SeedanceTask {
  return mode === 'objects-swap' ? 'editing' : 'reference';
}

export function resolveGenjutsuProviderTarget(
  mode: GenjutsuMode
): GenjutsuProviderTarget {
  const provider = normalizeProvider(
    mode === 'motion-transfer'
      ? envConfigs.genjutsu_motion_provider
      : envConfigs.genjutsu_object_swap_provider
  );

  if (provider === 'seedance-volcengine') {
    return {
      provider,
      model:
        envConfigs.seedance_volcengine_model?.trim() ||
        'doubao-seedance-2-5-260628',
    };
  }

  if (provider === 'seedance') {
    return {
      provider,
      model:
        envConfigs.seedance_genjutsu_model?.trim() ||
        'bytedance/seedance-2.5/us/reference-to-video',
    };
  }

  return {
    provider,
    model:
      mode === 'motion-transfer'
        ? envConfigs.higgsfield_genjutsu_motion_model?.trim() ||
          'higgsfield/genjutsu/motion-transfer/v1.0'
        : envConfigs.higgsfield_genjutsu_object_swap_model?.trim() ||
          'higgsfield/genjutsu/object-swap/v1.0',
  };
}

type SeedanceReferenceTokens = {
  video: string;
  images: string[];
};

function defaultReferenceTokens(imageCount: number): SeedanceReferenceTokens {
  return {
    video: '@Video1',
    images: Array.from(
      { length: imageCount },
      (_, index) => `@Image${index + 1}`
    ),
  };
}

function referenceMappings(references: string[]) {
  return references
    .map((reference, index) => `Reference ${index + 1} = ${reference}`)
    .join(', ');
}

function buildReferenceRules(input: {
  video: string;
  references: string[];
  imageCount: number;
}) {
  const mappings =
    referenceMappings(input.references) ||
    `Reference 1 = ${input.references[0] || '@Image1'}`;

  if (input.imageCount <= 1) {
    return [`Reference 1 maps to ${input.references[0] || '@Image1'}.`];
  }

  return [
    `Reference labels map to provider images as follows: ${mappings}.`,
    'The reference images may represent different elements, different roles, or multiple views of the same element.',
    `Use the user instruction to determine how each reference should be used in relation to ${input.video}.`,
    'Do not blend, merge, or transfer visual traits between unrelated references unless the user explicitly asks for that.',
  ];
}

export function buildSeedanceWorkflowPrompt(input: {
  mode: GenjutsuMode;
  userPrompt?: string;
  imageCount: number;
  references?: SeedanceReferenceTokens;
}) {
  const userPrompt = input.userPrompt?.trim() || '';
  const tokens = input.references ?? defaultReferenceTokens(input.imageCount);
  if (tokens.images.length < input.imageCount) {
    throw new Error('Seedance prompt reference tokens are incomplete');
  }

  const video = tokens.video;
  const references = tokens.images.slice(0, input.imageCount);
  const primary = references[0] || '@Image1';
  const referenceRules = buildReferenceRules({
    video,
    references,
    imageCount: input.imageCount,
  });

  if (input.mode === 'motion-transfer') {
    return [
      `Use ${video} as the source of motion, timing, poses, choreography, camera movement, framing, shot composition, and shot progression.`,
      ...referenceRules,
      input.imageCount === 1
        ? `Use ${primary} as a visual reference according to the user instruction.`
        : 'The references may define characters, products, wardrobe, props, locations, environments, visual appearance, or multiple views of the same element.',
      `Preserve the motion, timing, camera movement, framing, and shot progression of ${video} as closely as possible.`,
      'Rebuild only the characters, products, wardrobe, props, locations, environments, or visual appearance requested by the user and reference images.',
      'Keep all referenced elements visually consistent throughout the video.',
      'Do not change motion, camera behavior, timing, framing, or shot progression unless the user explicitly requests it.',
      userPrompt
        ? `User instruction: ${userPrompt}`
        : input.imageCount > 1
          ? 'No explicit mapping was provided. Infer reference roles conservatively from visual correspondence. References may describe different elements or multiple views of the same element. Preserve the source motion, camera, timing, framing, and shot progression.'
          : `Use ${primary} as the visual reference for the primary appearance transformation while preserving the motion, camera, timing, framing, and shot progression from ${video}.`,
    ]
      .filter(Boolean)
      .join('\n');
  }

  return [
    `Edit ${video} instead of redesigning the whole shot.`,
    ...referenceRules,
    input.imageCount === 1
      ? `Use ${primary} as the replacement reference.`
      : 'The references may control different requested targets or provide multiple views of the same target.',
    'Replace only the requested characters, products, wardrobe, props, objects, locations, environments, or other visual elements.',
    `Preserve everything unrelated to the requested replacements from ${video} as closely as possible: motion, camera movement, timing, framing, composition, background, lighting, unrelated people, and unrelated objects.`,
    'Integrate every replacement naturally with the original perspective, scale, occlusion, lighting, shadows, reflections, and motion.',
    `Do not regenerate or alter unrelated parts of ${video}.`,
    userPrompt
      ? `Target replacement instruction: ${userPrompt}`
      : input.imageCount > 1
        ? 'No explicit mapping was provided. Use visual correspondence conservatively. Only modify targets with a clear match to the references, and do not merge unrelated references.'
        : `Target replacement instruction: replace the most prominent matching target in ${video} with Reference 1.`,
  ]
    .filter(Boolean)
    .join('\n');
}
