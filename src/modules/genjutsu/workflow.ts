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

export function buildSeedanceWorkflowPrompt(input: {
  mode: GenjutsuMode;
  userPrompt?: string;
  imageCount: number;
}) {
  const userPrompt = input.userPrompt?.trim() || '';
  const references = imageReferences(input.imageCount);
  const primary = references[0] || '@Image1';
  const allReferences = references.join(', ') || '@Image1';

  if (input.mode === 'motion-transfer') {
    return [
      'Use @Video1 strictly as the motion, timing, pose, choreography, camera movement, and shot-composition reference.',
      `Use ${primary} as the primary replacement character or subject appearance reference.`,
      input.imageCount > 1
        ? `Use the additional references ${allReferences} only to keep the replacement subject, outfit, props, or scene visually consistent.`
        : '',
      'Preserve the action timing, body motion, gestures, camera movement, framing, and shot progression from @Video1 as closely as possible.',
      'Keep the replacement subject visually consistent throughout the video, including face, clothing, proportions, colors, and defining details from the image references.',
      'Do not copy the original subject identity or appearance from @Video1.',
      'Preserve the original environment unless the additional instruction explicitly requests a scene or style change.',
      userPrompt ? `Additional instruction: ${userPrompt}` : '',
    ]
      .filter(Boolean)
      .join('\n');
  }

  return [
    'Edit @Video1 instead of redesigning the whole shot.',
    `Use ${primary} as the primary replacement reference.`,
    input.imageCount > 1
      ? `Use ${allReferences} as supporting references for the target replacement only.`
      : '',
    'Replace only the requested target object, product, outfit, character, or subject.',
    'Preserve everything unrelated to the requested replacement from @Video1 as closely as possible: motion, camera movement, timing, background, composition, lighting, other people, and other objects.',
    'Integrate the replacement naturally with the original perspective, scale, occlusion, lighting, shadows, reflections, and motion.',
    'Do not regenerate or alter unrelated parts of the video.',
    userPrompt
      ? `Target replacement instruction: ${userPrompt}`
      : 'Target replacement instruction: replace the most prominent matching target in @Video1 with the primary image reference.',
  ]
    .filter(Boolean)
    .join('\n');
}
