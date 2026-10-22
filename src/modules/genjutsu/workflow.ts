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
export const GAS_STATION_DANCE_AI_PRODUCT = 'gas-station-dance-ai' as const;
export const BURNING_BRIDGES_AI_PRODUCT = 'burning-bridges-ai' as const;

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
    value === GANGNAM_STYLE_AI_PRODUCT ||
    value === GAS_STATION_DANCE_AI_PRODUCT ||
    value === BURNING_BRIDGES_AI_PRODUCT
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

/**
 * Shared identity rules for both Object Swap and Motion Transfer.
 * Full-subject / reference-driven identity applies only in those scoped cases;
 * partial edits must not rewrite unassigned subjects. Defined once — do not
 * duplicate per mode.
 */
export const SEEDANCE_REFERENCE_IDENTITY_RULES = [
  'REFERENCE IDENTITY:',
  "For full person, character, or animal replacement, or reference-driven subject animation, use the assigned reference as the authoritative identity and appearance: preserve facial features, hairstyle, apparent age, body proportions, clothing, and distinctive identity traits. Do not retain or blend the original performer's identity with that reference subject; adapt source motion to its proportions; keep identity consistent across frames, cuts, and occlusions.",
  'For partial edits (clothing, accessories, props, background), modify only specified attributes or elements and preserve identities of subjects not explicitly assigned for replacement. Follow explicit reference-to-target mappings; multiple references may be different subjects or multiple views of one subject. Never blend unrelated identities.',
].join('\n');

const OBJECT_SWAP_RULES = [
  'OBJECT SWAP:',
  'Replace only specified targets with assigned references. Full-subject replacements (person, character, animal, or object) must use the complete reference appearance, not selected features; apply consistently across angles, close-ups, cuts, occlusions, and reappearances. A subject assigned to a reference is a replacement target. Preserve non-targets, motion, camera, timing, framing, and composition; integrate with original perspective, scale, lighting, and motion.',
].join('\n');

function motionTransferRules(video: string) {
  return [
    'MOTION TRANSFER:',
    `Use ${video} for motion, choreography, poses, camera, framing, timing, and shot progression. When a reference defines the performer, animate that reference subject rather than retaining the original performer's identity. Apply other reference-defined changes only as instructed. Keep referenced elements visually consistent; do not change motion, camera, timing, framing, or shot progression unless explicitly requested.`,
  ].join('\n');
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
  const mappingLine = referenceMappingLine(references);

  if (input.mode === 'motion-transfer') {
    const lines = [motionTransferRules(video), mappingLine];

    if (input.imageCount > 1) {
      lines.push(
        `Use the user instruction to determine how each reference relates to ${video}. Do not blend traits between unrelated references unless explicitly asked.`
      );
    }

    lines.push(SEEDANCE_REFERENCE_IDENTITY_RULES);

    if (userPrompt) {
      lines.push(`User instruction: ${userPrompt}`);
    } else if (input.imageCount > 1) {
      lines.push(
        'No explicit mapping was provided. Infer reference roles conservatively from visual correspondence. Preserve source motion, camera, timing, framing, and shot progression.'
      );
    } else {
      lines.push(
        `If a clear visual correspondence exists, use ${primary} to guide that element's appearance while preserving motion, camera, timing, framing, and shot progression from ${video}. Otherwise preserve the source appearance.`
      );
    }

    return lines.join('\n');
  }

  const taskInstruction = userPrompt
    ? userPrompt
    : input.imageCount > 1
      ? 'No explicit mapping was provided. Use visual correspondence conservatively. Only modify targets with a clear match to the references, and do not merge unrelated references.'
      : `Replace the most prominent matching target in ${video} with Reference 1.`;

  const lines = [
    `Edit ${video} by replacing only the targets specified in the task instruction with their assigned reference images.`,
    mappingLine,
  ];

  if (input.imageCount > 1) {
    lines.push(
      'Use the task instruction to map each reference to its target. Do not merge unrelated reference identities or assign a reference to an unspecified target.'
    );
  }

  lines.push(
    OBJECT_SWAP_RULES,
    SEEDANCE_REFERENCE_IDENTITY_RULES,
    'TASK INSTRUCTION:',
    taskInstruction
  );

  return lines.join('\n');
}
