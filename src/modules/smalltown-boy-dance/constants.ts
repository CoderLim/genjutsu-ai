import type { HiggsfieldSeedanceAspectRatio } from '@/modules/genjutsu/seedance-higgsfield';
import type {
  GenjutsuMode,
  GenjutsuResolution,
} from '@/modules/genjutsu/types';
import { SMALLTOWN_BOY_DANCE_PRODUCT } from '@/modules/genjutsu/workflow';

export const SMALLTOWN_PRODUCT_ID = SMALLTOWN_BOY_DANCE_PRODUCT;

export const SMALLTOWN_MODE: GenjutsuMode = 'objects-swap';

/** Preview plays the same R2 object seal uses (signed via API). */
export const SMALLTOWN_TEMPLATE_PATH = `/api/genjutsu/template?product=${SMALLTOWN_PRODUCT_ID}`;
export const SMALLTOWN_TEMPLATE_POSTER_PATH =
  '/videos/smalltown-boy-dance-tpl-poster.jpg';

/** ffprobe duration of public/videos/smalltown-boy-dance-tpl.mp4 */
export const SMALLTOWN_TEMPLATE_DURATION_SECONDS = 21.455238;

export const SMALLTOWN_ASPECT_RATIO: HiggsfieldSeedanceAspectRatio = '3:4';

/** First ship: hide 1080p — credit cost exceeds the largest single pack. */
export const SMALLTOWN_RESOLUTIONS = ['480p', '720p'] as const;
export type SmalltownResolution = (typeof SMALLTOWN_RESOLUTIONS)[number];
export const SMALLTOWN_DEFAULT_RESOLUTION: GenjutsuResolution = '720p';

export function isSmalltownResolution(
  value: unknown
): value is SmalltownResolution {
  return value === '480p' || value === '720p';
}

/**
 * Fixed dual-role prompt. Template has shot cuts where camera-depth roles swap:
 * shot 1 = person A near + person B far; later shot = B near + A far.
 * @Image 1 / @Image 2 bind to those two character identities for the whole clip,
 * not to whatever happens to be nearest the camera in a given frame.
 */
export const SMALLTOWN_DEFAULT_PROMPT = [
  'Use @Video 1 only for motion, timing, gestures, choreography, camera cuts, depth, and staging.',
  '@Video 1 has two distinct dancers who keep their identities across shots even when camera depth swaps: in the opening shot one dancer is near the camera and the other is farther back; in a later shot the farther dancer moves near the camera and the opening near-camera dancer is farther back.',
  'Map @Image 1 to the dancer who is near the camera in the opening shot of @Video 1. Keep that same person as @Image 1 in every later shot, including when they stand farther back.',
  'Map @Image 2 to the dancer who is farther back in the opening shot of @Video 1. Keep that same person as @Image 2 in every later shot, including when they stand near the camera.',
  'Always show two different people: never put @Image 1 on both dancers, never put @Image 2 on both dancers, and never clone or blend the two identities.',
  'Match each Image for face, hair, body, clothing, and species on its assigned dancer only.',
].join(' ');

/**
 * Exact fixed prompts previously stored on in-flight tasks. Match is strict
 * equality; do not loosen with includes/startsWith.
 */
export const LEGACY_SMALLTOWN_PROMPTS = [
  [
    'Use @Video1 only for motion, timing, gestures, choreography, camera cuts, depth, and staging.',
    '@Video1 has two distinct dancers who keep their identities across shots even when camera depth swaps: in the opening shot one dancer is near the camera and the other is farther back; in a later shot the farther dancer moves near the camera and the opening near-camera dancer is farther back.',
    'Map @Image1 to the dancer who is near the camera in the opening shot of @Video1. Keep that same person as @Image1 in every later shot, including when they stand farther back.',
    'Map @Image2 to the dancer who is farther back in the opening shot of @Video1. Keep that same person as @Image2 in every later shot, including when they stand near the camera.',
    'Always show two different people: never put @Image1 on both dancers, never put @Image2 on both dancers, and never clone or blend the two identities.',
    'Match each Image for face, hair, body, clothing, and species on its assigned dancer only.',
  ].join(' '),
] as const;
