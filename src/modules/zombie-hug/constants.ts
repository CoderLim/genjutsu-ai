import type { GenjutsuMode } from '@/modules/genjutsu/types';
import { ZOMBIE_HUG_PRODUCT } from '@/modules/genjutsu/workflow';

export const ZOMBIE_HUG_PRODUCT_ID = ZOMBIE_HUG_PRODUCT;
/** @deprecated Prefer ZOMBIE_HUG_PRODUCT_ID — kept for existing imports. */
export const ZOMBIE_HUG_PRESET = ZOMBIE_HUG_PRODUCT_ID;

export const ZOMBIE_HUG_MODE: GenjutsuMode = 'objects-swap';
export const ZOMBIE_HUG_IMAGE_COUNT = 2;

export const ZOMBIE_HUG_RESOLUTIONS = ['480p', '720p'] as const;
export type ZombieHugResolution = (typeof ZOMBIE_HUG_RESOLUTIONS)[number];
/** @deprecated Prefer ZOMBIE_HUG_DEFAULT_RESOLUTION — kept for existing imports. */
export const ZOMBIE_HUG_RESOLUTION =
  '720p' as const satisfies ZombieHugResolution;
export const ZOMBIE_HUG_DEFAULT_RESOLUTION: ZombieHugResolution = '720p';

export const ZOMBIE_HUG_ASPECT_RATIOS = ['16:9', '9:16'] as const;
export type ZombieHugAspectRatio = (typeof ZOMBIE_HUG_ASPECT_RATIOS)[number];
export const ZOMBIE_HUG_DEFAULT_ASPECT_RATIO: ZombieHugAspectRatio = '16:9';

/**
 * Preview plays the same R2 object seal uses (signed via API).
 * Pass aspect so landscape / portrait templates stay distinct.
 */
export function getZombieHugTemplateApiPath(
  aspectRatio: ZombieHugAspectRatio = ZOMBIE_HUG_DEFAULT_ASPECT_RATIO
) {
  return `/api/genjutsu/template?product=${ZOMBIE_HUG_PRODUCT_ID}&aspect=${encodeURIComponent(aspectRatio)}`;
}

/** Landscape template length used for list-rate credit estimates. */
export const ZOMBIE_HUG_TEMPLATE_DURATION_SECONDS = 15;
/** Portrait template (`zombie-hug-tpl-9x16.mp4`) length. */
export const ZOMBIE_HUG_TEMPLATE_DURATION_SECONDS_9X16 = 15;

export function getZombieHugTemplateDurationSeconds(
  aspectRatio: ZombieHugAspectRatio = ZOMBIE_HUG_DEFAULT_ASPECT_RATIO
) {
  return aspectRatio === '9:16'
    ? ZOMBIE_HUG_TEMPLATE_DURATION_SECONDS_9X16
    : ZOMBIE_HUG_TEMPLATE_DURATION_SECONDS;
}

export function isZombieHugResolution(
  value: unknown
): value is ZombieHugResolution {
  return (
    typeof value === 'string' &&
    (ZOMBIE_HUG_RESOLUTIONS as readonly string[]).includes(value)
  );
}

export function isZombieHugAspectRatio(
  value: unknown
): value is ZombieHugAspectRatio {
  return (
    typeof value === 'string' &&
    (ZOMBIE_HUG_ASPECT_RATIOS as readonly string[]).includes(value)
  );
}

/**
 * Logical references only. `buildSeedanceWorkflowPrompt` maps
 * Reference 1/2 onto the active provider's image tokens.
 */
export const ZOMBIE_HUG_DEFAULT_PROMPT = [
  'In the original source video, identify the two main characters by their roles and distinctive visual cues:',
  '',
  'Person A: the gun-holding survivor. Replace Person A with Reference 1.',
  '',
  'Person B: the second main character (the loved one). Replace Person B with Reference 2, with two states depending on the scene:',
  '- In the earlier shots, Reference 2 should appear as an infected zombie version of the same person.',
  '- In the later shots, Reference 2 should transition into the normal healthy human version of the same person.',
  '- The zombie version and the human version must clearly be the same person, with consistent facial identity, hairstyle, and overall likeness.',
  '',
  'These cues identify the ORIGINAL characters only; they are NOT appearance instructions for the replacements.',
  '',
  "Replace BOTH original people completely with their assigned reference people. Reference 1 controls Person A's visible face, hair, clothing, and accessories; Reference 2 controls Person B's visible face, hair, clothing, and accessories across both the infected and restored states. Where a reference does not show an outfit detail, create a coherent appearance that matches that reference rather than copying the original person's distinctive look.",
  '',
  "Do not retain the original characters' faces, hairstyles, or distinctive accessories when they differ from their assigned references.",
  '',
  'Keep both replacements consistent through close-ups, two-person shots, occlusions, turns, camera cuts, and the cold-to-warm scene transition. Once assigned, track each person by identity and continuity. Never swap the two assignments, merge their identities, or apply one reference to both people.',
  '',
  'Preserve the source motion, timing, camera work, environment, and emotional beat of the standoff-to-embrace. Both original people must be visibly replaced; do not leave either person unchanged.',
].join('\n');

/** @deprecated Prefer ZOMBIE_HUG_DEFAULT_PROMPT — kept for existing imports. */
export const ZOMBIE_HUG_PROMPT = ZOMBIE_HUG_DEFAULT_PROMPT;

/**
 * Higgsfield-era prompts (with `@Image` tokens) remain accepted so in-flight
 * attempts can still seal/generate after the Seedance rewrite.
 */
export const LEGACY_ZOMBIE_HUG_PROMPTS = [
  `Replace the gun-holding character in all relevant shots with the person from @Image 1.
Replace the second main character with the person from @Image 2, but with two different states depending on the scene:

State rules for @Image 2:
- In the earlier shots, @Image 2 should appear as an infected zombie version of the same person.
- In the later shots, @Image 2 should transition into the normal healthy human version of the same person.
- The zombie version and the human version must clearly be the same person, with consistent facial identity, hairstyle, and overall likeness.

Character mapping:
- @Image 1 = survivor / gun holder
- @Image 2 = infected loved one in the early shots, then restored human in the later shots`,
] as const;

export const ZOMBIE_HUG_PUBLIC_TEMPLATE_PATH = '/videos/zombie-hug-tpl.mp4';
export const ZOMBIE_HUG_PUBLIC_TEMPLATE_PATH_9X16 =
  '/videos/zombie-hug-tpl-9x16.mp4';

export function getZombieHugPublicTemplatePath(
  aspectRatio: ZombieHugAspectRatio = ZOMBIE_HUG_DEFAULT_ASPECT_RATIO
) {
  return aspectRatio === '9:16'
    ? ZOMBIE_HUG_PUBLIC_TEMPLATE_PATH_9X16
    : ZOMBIE_HUG_PUBLIC_TEMPLATE_PATH;
}
