export const ZOMBIE_HUG_PRESET = 'zombie-hug' as const;
export const ZOMBIE_HUG_MODE = 'motion-transfer' as const;
export const ZOMBIE_HUG_IMAGE_COUNT = 2;
/** Template clip length used for list-rate credit estimates in the UI. */
export const ZOMBIE_HUG_TEMPLATE_DURATION_SECONDS = 24;

export const ZOMBIE_HUG_RESOLUTIONS = ['480p', '720p', '1080p'] as const;
export type ZombieHugResolution = (typeof ZOMBIE_HUG_RESOLUTIONS)[number];
/** @deprecated Prefer ZOMBIE_HUG_DEFAULT_RESOLUTION — kept for existing imports. */
export const ZOMBIE_HUG_RESOLUTION =
  '720p' as const satisfies ZombieHugResolution;
export const ZOMBIE_HUG_DEFAULT_RESOLUTION: ZombieHugResolution = '720p';

export const ZOMBIE_HUG_ASPECT_RATIOS = ['16:9', '9:16'] as const;
export type ZombieHugAspectRatio = (typeof ZOMBIE_HUG_ASPECT_RATIOS)[number];
/** Matches the primary motion template (854×480 landscape). */
export const ZOMBIE_HUG_DEFAULT_ASPECT_RATIO: ZombieHugAspectRatio = '16:9';

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

export const ZOMBIE_HUG_PROMPT = `Replace the gun-holding character in all relevant shots with the person from @image1.
Replace the second main character with the person from @image2, but with two different states depending on the scene:

State rules for @image2:
- In the earlier shots, @image2 should appear as an infected zombie version of the same person.
- In the later shots, @image2 should transition into the normal healthy human version of the same person.
- The zombie version and the human version must clearly be the same person, with consistent facial identity, hairstyle, and overall likeness.

Character mapping:
- @image1 = survivor / gun holder
- @image2 = infected loved one in the early shots, then restored human in the later shots`;

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
