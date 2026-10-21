import { envConfigs } from '@/config';

import type {
  GenjutsuMode,
  GenjutsuProductId,
  GenjutsuProvider,
  GenjutsuProviderTarget,
} from './types';

export type SeedanceTask = 'reference' | 'editing';

export const SMALLTOWN_BOY_DANCE_PRODUCT = 'smalltown-boy-dance' as const;
export const CRAZY_FROG_PRODUCT = 'crazy-frog' as const;
export const A2O_LITE_AI_PRODUCT = 'a2o-lite-ai' as const;
export const ENZO_FERNANDEZ_AI_PRODUCT = 'enzo-fernandez-ai' as const;
export const FLYING_CAR_AI_PRODUCT = 'flying-car-ai' as const;
export const COLDPLAY_KISS_CAM_PRODUCT = 'coldplay-kiss-cam' as const;
export const GANGNAM_STYLE_AI_PRODUCT = 'gangnam-style-ai' as const;

/** Keep inline to avoid a cycle with seedance-higgsfield.ts → workflow. */
const SEEDANCE_HIGGSFIELD_MODEL_ID =
  'bytedance/seedance-2.5/reference-to-video';
/** Dual-role swap must use video-edit — see seedance-higgsfield.ts. */
const SEEDANCE_HIGGSFIELD_EDIT_MODEL_ID = 'bytedance/seedance-2.5/video-edit';

export function isGenjutsuProductId(
  value: unknown
): value is GenjutsuProductId {
  return (
    value === SMALLTOWN_BOY_DANCE_PRODUCT ||
    value === CRAZY_FROG_PRODUCT ||
    value === A2O_LITE_AI_PRODUCT ||
    value === ENZO_FERNANDEZ_AI_PRODUCT ||
    value === FLYING_CAR_AI_PRODUCT ||
    value === COLDPLAY_KISS_CAM_PRODUCT ||
    value === GANGNAM_STYLE_AI_PRODUCT
  );
}

/** Objects-swap model pair for Higgsfield-hosted Seedance 2.5 video-edit. */
export function higgsfieldSeedanceObjectsSwapTarget(): GenjutsuProviderTarget {
  return {
    provider: 'seedance-higgsfield',
    model: SEEDANCE_HIGGSFIELD_EDIT_MODEL_ID,
  };
}

export function isSeedanceFamilyProvider(
  provider: string | null | undefined
): boolean {
  return (
    provider === 'seedance' ||
    provider === 'seedance-volcengine' ||
    provider === 'seedance-higgsfield' ||
    provider === 'seedance-seeapi' ||
    provider === 'seedance-wavespeed'
  );
}

function normalizeProvider(value: string | undefined): GenjutsuProvider {
  const normalized = value?.trim().toLowerCase();
  if (normalized === 'seedance-volcengine') return 'seedance-volcengine';
  if (normalized === 'seedance-higgsfield') return 'seedance-higgsfield';
  if (normalized === 'seedance-seeapi') return 'seedance-seeapi';
  if (normalized === 'seedance-wavespeed') return 'seedance-wavespeed';
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

  if (provider === 'seedance-seeapi') {
    return {
      provider,
      model: envConfigs.seedance_seeapi_model?.trim() || 'seedance-2-5',
    };
  }

  if (provider === 'seedance-wavespeed') {
    return {
      provider,
      model:
        mode === 'objects-swap'
          ? envConfigs.seedance_wavespeed_edit_model?.trim() ||
            'bytedance/seedance-2.5/video-edit'
          : envConfigs.seedance_wavespeed_motion_model?.trim() ||
            'bytedance/seedance-2.5/motion-control',
    };
  }

  if (provider === 'seedance-higgsfield') {
    const configured = envConfigs.seedance_higgsfield_model?.trim();
    return {
      provider,
      model:
        configured ||
        (mode === 'objects-swap'
          ? SEEDANCE_HIGGSFIELD_EDIT_MODEL_ID
          : SEEDANCE_HIGGSFIELD_MODEL_ID),
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

/**
 * Product pages (Crazy Frog / Smalltown) share the homepage mode env routers
 * (`GENJUTSU_MOTION_PROVIDER` / `GENJUTSU_OBJECT_SWAP_PROVIDER`). Optional
 * `GENJUTSU_PRODUCT_PROVIDER` overrides only allowlisted product pages.
 */
export function resolveProductProviderTarget(
  product: string | null | undefined,
  mode: GenjutsuMode
): GenjutsuProviderTarget {
  const productOverride = envConfigs.genjutsu_product_provider?.trim();
  if (productOverride && isGenjutsuProductId(product)) {
    return resolveGenjutsuProviderTargetForProvider(
      normalizeProvider(productOverride),
      mode
    );
  }

  return resolveGenjutsuProviderTarget(mode);
}

/** Resolve the objects-swap model pair for an already-persisted provider. */
export function resolveObjectsSwapTargetForProvider(
  provider: GenjutsuProvider
): GenjutsuProviderTarget {
  return resolveGenjutsuProviderTargetForProvider(provider, 'objects-swap');
}

function resolveGenjutsuProviderTargetForProvider(
  provider: GenjutsuProvider,
  mode: GenjutsuMode
): GenjutsuProviderTarget {
  if (provider === 'seedance-seeapi') {
    return {
      provider,
      model: envConfigs.seedance_seeapi_model?.trim() || 'seedance-2-5',
    };
  }
  if (provider === 'seedance-wavespeed') {
    return {
      provider,
      model:
        mode === 'objects-swap'
          ? envConfigs.seedance_wavespeed_edit_model?.trim() ||
            'bytedance/seedance-2.5/video-edit'
          : envConfigs.seedance_wavespeed_motion_model?.trim() ||
            'bytedance/seedance-2.5/motion-control',
    };
  }
  if (provider === 'seedance-volcengine') {
    return {
      provider,
      model:
        envConfigs.seedance_volcengine_model?.trim() ||
        'doubao-seedance-2-5-260628',
    };
  }
  if (provider === 'seedance-higgsfield') {
    return {
      provider,
      model:
        mode === 'objects-swap'
          ? SEEDANCE_HIGGSFIELD_EDIT_MODEL_ID
          : SEEDANCE_HIGGSFIELD_MODEL_ID,
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
  return resolveGenjutsuProviderTarget(mode);
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

function referenceMappingLine(references: string[]) {
  if (references.length <= 1) {
    return `Reference 1 maps to ${references[0] || '@Image1'}.`;
  }

  return `Reference labels map to provider images as follows: ${referenceMappings(references)}.`;
}

function buildReferenceRules(input: {
  video: string;
  references: string[];
  imageCount: number;
}) {
  if (input.imageCount <= 1) {
    return [referenceMappingLine(input.references)];
  }

  return [
    referenceMappingLine(input.references),
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
      'Apply only the character, product, wardrobe, prop, location, environment, or visual-appearance changes clearly indicated by the user instruction and references.',
      'Keep all referenced elements visually consistent throughout the video.',
      'Do not change motion, camera behavior, timing, framing, or shot progression unless the user explicitly requests it.',
      userPrompt
        ? `User instruction: ${userPrompt}`
        : input.imageCount > 1
          ? 'No explicit mapping was provided. Infer reference roles conservatively from visual correspondence. References may describe different elements or multiple views of the same element. Preserve the source motion, camera, timing, framing, and shot progression.'
          : `If a clear visual correspondence exists, use ${primary} to guide that element's appearance while preserving the motion, camera, timing, framing, and shot progression from ${video}. Otherwise preserve the source appearance.`,
    ]
      .filter(Boolean)
      .join('\n');
  }

  const taskInstruction = userPrompt
    ? userPrompt
    : input.imageCount > 1
      ? 'No explicit mapping was provided. Use visual correspondence conservatively. Only modify targets with a clear match to the references, and do not merge unrelated references.'
      : `Replace the most prominent matching target in ${video} with Reference 1.`;

  return [
    `Edit ${video} by replacing only the targets specified in the task instruction with their assigned reference images.`,
    'REFERENCE MAPPING:',
    'Use the task instruction to determine which reference image belongs to which target.',
    'Different references may represent different targets or multiple views of the same target.',
    'Do not merge unrelated reference identities or assign a reference to an unspecified target.',
    referenceMappingLine(references),
    'REPLACEMENT:',
    'When an entire person, character, animal, or object is requested to be replaced, use the assigned reference for its complete visible appearance, not just selected features or accessories.',
    'Apply the same replacement consistently whenever that target appears, including different camera angles, close-ups, camera cuts, occlusions, and reappearances.',
    'When the instruction requests only a specific attribute, such as clothing or a prop, modify only that attribute.',
    'PRESERVATION:',
    'Preserve the original motion, timing, camera movement, framing, composition, and all elements that are not designated as replacement targets.',
    'A subject explicitly assigned to a reference image is a replacement target, not an unrelated element to preserve.',
    'Integrate replacements with the original perspective, scale, lighting, shadows, reflections, and motion.',
    'TASK INSTRUCTION:',
    taskInstruction,
  ].join('\n');
}
