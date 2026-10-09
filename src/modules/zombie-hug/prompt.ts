export const ZOMBIE_HUG_PRESET = 'zombie-hug' as const;
export const ZOMBIE_HUG_MODE = 'motion-transfer' as const;
export const ZOMBIE_HUG_RESOLUTION = '720p' as const;
export const ZOMBIE_HUG_IMAGE_COUNT = 2;
/** Template clip length used for list-rate credit estimates in the UI. */
export const ZOMBIE_HUG_TEMPLATE_DURATION_SECONDS = 24;

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
