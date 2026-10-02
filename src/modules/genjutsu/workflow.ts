import { envConfigs } from '@/config';

import type {
  GenjutsuMode,
  GenjutsuProvider,
  GenjutsuProviderTarget,
} from './types';

export type SeedanceTask = 'reference' | 'editing';

function normalizeProvider(value: string | undefined): GenjutsuProvider {
  return value?.trim().toLowerCase() === 'seedance' ? 'seedance' : 'higgsfield';
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

function imageReferences(imageCount: number) {
  return Array.from({ length: imageCount }, (_, index) => `@Image${index + 1}`);
}

function referenceMappings(imageCount: number) {
  const references = imageReferences(imageCount);
  return references
    .map((reference, index) => `Reference ${index + 1} = ${reference}`)
    .join(', ');
}

export function buildSeedanceWorkflowPrompt(input: {
  mode: GenjutsuMode;
  userPrompt?: string;
  imageCount: number;
}) {
  const userPrompt = input.userPrompt?.trim() || '';
  const references = imageReferences(input.imageCount);
  const primary = references[0] || '@Image1';
  const mappings = referenceMappings(input.imageCount) || 'Reference 1 = @Image1';
  const multiReferenceRules =
    input.imageCount > 1
      ? [
          `Reference labels map to provider images as follows: ${mappings}.`,
          'The reference images may represent different characters, products, wardrobe items, props, objects, or visual elements. Do not assume they are alternate views of the same subject.',
          'Use the user instruction to determine which reference belongs to which target in @Video1. Apply each reference only to its matching target.',
          'Do not blend, merge, or transfer visual traits between unrelated references unless the user explicitly asks for that.',
        ]
      : [
          'Reference 1 maps to @Image1.',
        ];

  if (input.mode === 'motion-transfer') {
    return [
      'Use @Video1 strictly as the motion, timing, pose, choreography, camera movement, and shot-composition reference.',
      ...multiReferenceRules,
      input.imageCount === 1
        ? `Use ${primary} as the replacement character or subject appearance reference.`
        : 'When several references are provided, preserve each referenced target independently according to the user instruction.',
      'Preserve the action timing, body motion, gestures, camera movement, framing, and shot progression from @Video1 as closely as possible.',
      'Keep each replaced subject visually consistent throughout the video, including face or character design, clothing, proportions, colors, products, props, and other defining details from its assigned reference.',
      'Do not copy the original replaced subject identity or appearance from @Video1.',
      'Preserve the original environment and unrelated subjects unless the user instruction explicitly requests a scene, style, or target change.',
      userPrompt
        ? `User instruction: ${userPrompt}`
        : input.imageCount > 1
          ? 'No explicit mapping was provided. Infer roles conservatively from visual correspondence and modify only clearly matching targets; never merge unrelated references.'
          : '',
    ]
      .filter(Boolean)
      .join('\n');
  }

  return [
    'Edit @Video1 instead of redesigning the whole shot.',
    ...multiReferenceRules,
    input.imageCount === 1
      ? `Use ${primary} as the replacement reference.`
      : 'When several references are provided, each may control a different requested target.',
    'Replace only the requested target objects, products, outfits, characters, subjects, or other visual elements.',
    'Preserve everything unrelated to the requested replacements from @Video1 as closely as possible: motion, camera movement, timing, background, composition, lighting, other people, and other objects.',
    'Integrate every replacement naturally with the original perspective, scale, occlusion, lighting, shadows, reflections, and motion.',
    'Do not regenerate or alter unrelated parts of the video.',
    userPrompt
      ? `Target replacement instruction: ${userPrompt}`
      : input.imageCount > 1
        ? 'No explicit mapping was provided. Infer roles conservatively from visual correspondence and replace only clearly matching targets; never merge unrelated references.'
        : 'Target replacement instruction: replace the most prominent matching target in @Video1 with Reference 1.',
  ]
    .filter(Boolean)
    .join('\n');
}
