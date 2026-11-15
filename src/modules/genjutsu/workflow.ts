import { envConfigs } from '@/config';

import {
  getProductGenjutsuModelProfile,
  HIGGSFIELD_GENJUTSU_MODELS,
  isKnownHiggsfieldGenjutsuModel,
} from './model-config';
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
export const SAY_IT_RIGHT_AI_PRODUCT = 'say-it-right-ai' as const;
export const DECK_THE_HALLS_DANCE_AI_PRODUCT =
  'deck-the-halls-dance-ai' as const;
export const ZOMBIE_HUG_PRODUCT = 'zombie-hug' as const;
export const TINY_DESK_AI_PRODUCT = 'tiny-desk-ai' as const;
export const SHAN_SHEN_BU_PRODUCT = 'shan-shen-bu' as const;
export const GLOW_STICK_PRODUCT = 'glow-stick' as const;
export const CHIPMUNKS_DANCE_PRODUCT = 'chipmunks-dance' as const;
export const BICEP_HEART_PRODUCT = 'bicep-heart' as const;
export const WASSUP_IN_A_MINUTE_AI_PRODUCT = 'wassup-in-a-minute-ai' as const;

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
    value === BURNING_BRIDGES_AI_PRODUCT ||
    value === SAY_IT_RIGHT_AI_PRODUCT ||
    value === DECK_THE_HALLS_DANCE_AI_PRODUCT ||
    value === ZOMBIE_HUG_PRODUCT ||
    value === TINY_DESK_AI_PRODUCT ||
    value === SHAN_SHEN_BU_PRODUCT ||
    value === GLOW_STICK_PRODUCT ||
    value === CHIPMUNKS_DANCE_PRODUCT ||
    value === BICEP_HEART_PRODUCT ||
    value === WASSUP_IN_A_MINUTE_AI_PRODUCT
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
 * The homepage price UI must receive the exact target for each mode.
 * Higgsfield Standard and Light have the same provider but different rates.
 * Never include provider credentials in this public configuration.
 */
export function resolveGenjutsuPublicPricingConfig() {
  const motion = resolveGenjutsuProviderTarget('motion-transfer');
  const objectSwap = resolveGenjutsuProviderTarget('objects-swap');
  return {
    genjutsu_motion_provider: motion.provider,
    genjutsu_motion_model: motion.model,
    genjutsu_object_swap_provider: objectSwap.provider,
    genjutsu_object_swap_model: objectSwap.model,
  };
}

/**
 * Explicit product model pins win. Unpinned products keep their existing mode
 * env routers and optional GENJUTSU_PRODUCT_PROVIDER override.
 */
export function resolveProductProviderTarget(
  product: string | null | undefined,
  mode: GenjutsuMode
): GenjutsuProviderTarget {
  // Explicit product-model pins take precedence over all env provider routers.
  // The homepage and unlisted products retain their existing env behavior.
  const modelProfile = getProductGenjutsuModelProfile(product);
  if (modelProfile) {
    return {
      provider: 'higgsfield',
      model: HIGGSFIELD_GENJUTSU_MODELS[modelProfile][mode],
    };
  }

  const productOverride = envConfigs.genjutsu_product_provider?.trim();
  if (productOverride && isGenjutsuProductId(product)) {
    return resolveGenjutsuProviderTargetForProvider(
      normalizeProvider(productOverride),
      mode
    );
  }

  return resolveGenjutsuProviderTarget(mode);
}

/**
 * Persisted product tasks were bound by the server when the attempt was created.
 * Allow known Standard/Light targets across subsequent env/profile changes.
 * This check is for Higgsfield Genjutsu product pages with Standard/Light pins.
 * Do not reuse it in Seedance-family product assert functions: those pages have
 * different provider/model contracts.
 */
export function isPersistedProductProviderTarget(
  provider: unknown,
  model: unknown,
  mode: GenjutsuMode
): boolean {
  if (typeof model !== 'string' || !model.trim()) return false;
  if (provider === 'higgsfield') {
    const configured =
      mode === 'motion-transfer'
        ? envConfigs.higgsfield_genjutsu_motion_model?.trim()
        : envConfigs.higgsfield_genjutsu_object_swap_model?.trim();
    return isKnownHiggsfieldGenjutsuModel(model, mode) || model === configured;
  }
  return false;
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
  return {
    provider: 'higgsfield',
    model:
      mode === 'motion-transfer'
        ? envConfigs.higgsfield_genjutsu_motion_model?.trim() ||
          HIGGSFIELD_GENJUTSU_MODELS.standard['motion-transfer']
        : envConfigs.higgsfield_genjutsu_object_swap_model?.trim() ||
          HIGGSFIELD_GENJUTSU_MODELS.standard['objects-swap'],
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
 *
 * Keep this block scene-agnostic. Role cues, shot beats, and product-specific
 * wardrobe live in the task / template prompt — not here.
 */
export const SEEDANCE_REFERENCE_IDENTITY_RULES = [
  'REFERENCE IDENTITY:',
  'When the task assigns a full person, character, or animal replacement, or reference-driven subject animation, treat it as a COMPLETE identity replacement — not a clothing tweak, partial face swap, or identity blend.',
  "The assigned reference is the sole authoritative identity and appearance: facial features (eye shape, nose, mouth, jawline, proportions), apparent age, hairstyle, hairline, skin tone, body proportions, clothing, and distinctive traits. Do not retain, carry over, average, or blend the original subject's identity with that reference. Adapt source motion and pose to the reference's proportions. Keep identity consistent across every frame, cut, angle, close-up, occlusion, and reappearance.",
  'Hard visibility still counts: profile views, partial occlusion, motion blur, far/small subjects, frame-edge crops, extreme expressions, hats/glasses, or back-of-head views. Do not skip an assigned subject because it is hard to see.',
  'When multiple references map to multiple subjects, follow the explicit mapping; never assign by original face similarity alone; never swap or merge assignments; do not leave any assigned subject unchanged.',
  'For partial edits (clothing, accessories, props, background), modify only specified attributes or elements and preserve identities of subjects not explicitly assigned for replacement. Follow explicit reference-to-target mappings; multiple references may be different subjects or multiple views of one subject. Never blend unrelated identities.',
].join('\n');

const OBJECT_SWAP_RULES = [
  'OBJECT SWAP:',
  'Replace only specified targets with assigned references. Full-subject replacements (person, character, animal, or object) must use the complete reference appearance, not selected features — for people/characters that means face, hair, age, body, and clothing together. Apply consistently across angles, close-ups, cuts, occlusions, and reappearances. A subject assigned to a reference is a replacement target and must visibly change. Preserve non-targets, motion, camera, timing, framing, and composition; integrate with original perspective, scale, lighting, and motion.',
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
        `Use the user instruction to determine how each reference relates to ${video}. Do not blend traits between unrelated references unless explicitly asked. Do not leave any explicitly assigned subject unchanged.`
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
      'Use the task instruction to map each reference to its target. Do not merge unrelated reference identities, assign a reference to an unspecified target, leave any assigned target unchanged, or map by original face similarity alone.'
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
