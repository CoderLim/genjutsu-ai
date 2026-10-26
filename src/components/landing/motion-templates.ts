import {
  A2O_LITE_AI_TEMPLATE_PATH,
  A2O_LITE_AI_TEMPLATE_POSTER_PATH,
} from '@/modules/a2o-lite-ai/constants';
import {
  BURNING_BRIDGES_AI_TEMPLATE_DISPLAY_PATH,
  BURNING_BRIDGES_AI_TEMPLATE_POSTER_PATH,
} from '@/modules/burning-bridges-ai/constants';
import {
  COLDPLAY_KISS_CAM_TEMPLATE_PATH,
  COLDPLAY_KISS_CAM_TEMPLATE_POSTER_PATH,
} from '@/modules/coldplay-kiss-cam/constants';
import {
  CRAZY_FROG_TEMPLATE_PATH,
  CRAZY_FROG_TEMPLATE_POSTER_PATH,
} from '@/modules/crazy-frog/constants';
import {
  ENZO_FERNANDEZ_AI_TEMPLATE_PATH,
  ENZO_FERNANDEZ_AI_TEMPLATE_POSTER_PATH,
} from '@/modules/enzo-fernandez-ai/constants';
import {
  FLYING_CAR_AI_TEMPLATE_PATH,
  FLYING_CAR_AI_TEMPLATE_POSTER_PATH,
} from '@/modules/flying-car-ai/constants';
import { buildHotelLobbyPrompt } from '@/modules/hotel-lobby/prompt';
import {
  KAIRO_BAD_TIMES_POSTER_PATH,
  KAIRO_BAD_TIMES_PREVIEW_PATH,
} from '@/modules/kairo-bad-times/constants';
import {
  SMALLTOWN_TEMPLATE_PATH,
  SMALLTOWN_TEMPLATE_POSTER_PATH,
} from '@/modules/smalltown-boy-dance/constants';
import { fixedTemplatePreviewPath } from '@/modules/templates/paths';
import {
  TINY_DESK_AI_TEMPLATE_DISPLAY_PATH,
  TINY_DESK_AI_TEMPLATE_POSTER_PATH,
} from '@/modules/tiny-desk-ai/constants';

type MotionTemplateBase = {
  id: string;
  /** Paraglide message key */
  titleKey: string;
  poster: string;
  sourceVideo: string;
  /** Card preview aspect. */
  aspect: 'portrait' | 'landscape';
};

/** Fills the homepage Genjutsu generator (video + prompt + mode). */
type MotionTemplateApply = MotionTemplateBase & {
  href?: undefined;
  prompt: string;
  mode: 'motion-transfer' | 'objects-swap';
  resolution: '480p' | '720p' | '1080p';
};

/** Opens a dedicated product page (wrong provider if applied on homepage). */
type MotionTemplateLink = MotionTemplateBase & {
  href: string;
};

export type MotionTemplate = MotionTemplateApply | MotionTemplateLink;

export function isMotionTemplateApply(
  template: MotionTemplate
): template is MotionTemplateApply {
  return !('href' in template && typeof template.href === 'string');
}

const DEFAULT_OBJECTS_RESOLUTION = '720p' as const;

/**
 * Homepage motion templates. Aspect follows the source clip
 * (portrait 9:16 / landscape 16:9) for gallery layout.
 * Dedicated product pages (Zombie Hug, Day of the Dead, Crazy Frog, …)
 * use `href` — Recreate on the homepage Genjutsu panel would use the
 * wrong provider/product.
 */
export const MOTION_TEMPLATES: MotionTemplate[] = [
  {
    id: 'zombie-hug',
    titleKey: 'site.templates.zombie_hug',
    poster: '/readme/zombie-hug.jpg',
    // Same R2 template as /ai-zombie-hug (default 16:9).
    sourceVideo: fixedTemplatePreviewPath({
      product: 'zombie-hug',
      aspect: '16:9',
    }),
    href: '/ai-zombie-hug',
    aspect: 'landscape',
  },
  {
    id: 'day-of-the-dead',
    titleKey: 'site.templates.day_of_the_dead',
    poster: '/videos/day-of-the-dead-ai-video-demo-poster.jpg',
    sourceVideo: '/videos/day-of-the-dead-ai-video-demo.mp4',
    href: '/day-of-the-dead-ai-video',
    aspect: 'landscape',
  },
  {
    id: 'tiny-desk-ai',
    titleKey: 'site.templates.tiny_desk_ai',
    poster: TINY_DESK_AI_TEMPLATE_POSTER_PATH,
    sourceVideo: TINY_DESK_AI_TEMPLATE_DISPLAY_PATH,
    href: '/tiny-desk-ai',
    aspect: 'portrait',
  },
  {
    id: 'coldplay-kiss-cam',
    titleKey: 'site.templates.coldplay_kiss_cam',
    poster: COLDPLAY_KISS_CAM_TEMPLATE_POSTER_PATH,
    sourceVideo: COLDPLAY_KISS_CAM_TEMPLATE_PATH,
    href: '/coldplay-kiss-cam',
    aspect: 'portrait',
  },
  {
    id: 'burning-bridges-ai',
    titleKey: 'site.templates.burning_bridges_ai',
    poster: BURNING_BRIDGES_AI_TEMPLATE_POSTER_PATH,
    sourceVideo: BURNING_BRIDGES_AI_TEMPLATE_DISPLAY_PATH,
    href: '/burning-bridges-ai',
    aspect: 'landscape',
  },
  {
    id: 'enzo-fernandez-ai',
    titleKey: 'site.templates.enzo_fernandez_ai',
    poster: ENZO_FERNANDEZ_AI_TEMPLATE_POSTER_PATH,
    sourceVideo: ENZO_FERNANDEZ_AI_TEMPLATE_PATH,
    href: '/enzo-fernandez-ai',
    aspect: 'landscape',
  },
  {
    id: 'flying-car-ai',
    titleKey: 'site.templates.flying_car_ai',
    poster: FLYING_CAR_AI_TEMPLATE_POSTER_PATH,
    sourceVideo: FLYING_CAR_AI_TEMPLATE_PATH,
    href: '/flying-car-ai',
    aspect: 'portrait',
  },
  {
    id: 'a2o-lite-ai',
    titleKey: 'site.templates.a2o_lite_ai',
    poster: A2O_LITE_AI_TEMPLATE_POSTER_PATH,
    sourceVideo: A2O_LITE_AI_TEMPLATE_PATH,
    href: '/a2o-lite-ai',
    aspect: 'landscape',
  },
  {
    id: 'crazy-frog',
    titleKey: 'site.templates.crazy_frog',
    poster: CRAZY_FROG_TEMPLATE_POSTER_PATH,
    sourceVideo: CRAZY_FROG_TEMPLATE_PATH,
    href: '/crazy-frog-ai',
    aspect: 'landscape',
  },
  {
    id: 'smalltown-boy-dance',
    titleKey: 'site.templates.smalltown_boy_dance',
    poster: SMALLTOWN_TEMPLATE_POSTER_PATH,
    sourceVideo: SMALLTOWN_TEMPLATE_PATH,
    href: '/smalltown-boy-dance',
    aspect: 'portrait',
  },
  {
    id: 'kairo-bad-times',
    titleKey: 'site.templates.kairo_bad_times',
    poster: KAIRO_BAD_TIMES_POSTER_PATH,
    sourceVideo: KAIRO_BAD_TIMES_PREVIEW_PATH,
    href: '/kairo-bad-times',
    aspect: 'portrait',
  },
  {
    id: 'bulin-47',
    titleKey: 'site.templates.bulin_47',
    poster: '/videos/bulin47-tpl-poster.jpg',
    sourceVideo: fixedTemplatePreviewPath({ product: 'bulin-47' }),
    href: '/bulin-47-ai',
    aspect: 'portrait',
  },
  {
    id: 'rumpelstiltskin',
    titleKey: 'site.templates.rumpelstiltskin',
    poster: '/videos/rumpelstiltskin-tpl-poster.jpg',
    sourceVideo: fixedTemplatePreviewPath({ product: 'rumpelstiltskin' }),
    href: '/ai-rumpelstiltskin',
    aspect: 'landscape',
  },
  {
    id: 'hotel-lobby',
    titleKey: 'site.templates.hotel_lobby',
    poster: '/readme/hotel-lobby.jpg',
    // Homepage Use template: public static like cat-to-dog. Product page still uses R2.
    sourceVideo: '/videos/hotel-lobby-tpl.mp4',
    prompt: buildHotelLobbyPrompt(2),
    mode: 'objects-swap',
    resolution: '720p',
    aspect: 'landscape',
  },
  {
    id: 'say-it-right-dance',
    titleKey: 'site.templates.say_it_right_dance',
    poster: '/videos/say-it-right-dance-tpl-poster.jpg',
    sourceVideo: '/videos/say-it-right-dance-tpl.mp4',
    href: '/say-it-right-ai',
    prompt: [
      'Replace the entire foreground dancer wearing a bright pink T-shirt and purple backpack in the source video with the person from Reference 1.',
      '',
      'This is a COMPLETE PERSON REPLACEMENT, not a clothing change, partial face swap, or identity blend.',
      '',
      'IDENTITY PRIORITY:',
      "Reference 1 is the sole source of the replacement person's identity and physical appearance.",
      '',
      'Recreate their recognizable facial features, eye shape, nose, mouth, jawline, facial proportions, apparent age, natural hairstyle, hairline, skin tone, body proportions, and clothing according to Reference 1.',
      '',
      "The original dancer's face, hairstyle, apparent age, body appearance, and clothing must not carry over into the replacement.",
      '',
      "Do not blend or average the original dancer's identity with Reference 1.",
      '',
      'VIDEO PRESERVATION:',
      'Use the source video only for dance movements, body poses, camera movement, framing, timing, perspective, lighting, and the surrounding environment.',
      '',
      "Adapt the replacement person's appearance and proportions naturally to the source movements. Prioritize recognizable identity over preserving the original dancer's silhouette.",
      '',
      'Maintain the same replacement identity consistently throughout every frame, including head turns, expressions, and partial occlusions.',
      '',
      'Preserve all other people and the background unchanged.',
      '',
      'Ignore unrelated background objects and handheld props appearing only in Reference 1.',
    ].join('\n'),
    mode: 'objects-swap',
    resolution: DEFAULT_OBJECTS_RESOLUTION,
    aspect: 'portrait',
  },
  {
    id: 'unforgettable-ai-car',
    titleKey: 'site.templates.unforgettable_ai_car',
    poster: '/videos/unforgettable-ai-car-tpl-poster.jpg',
    sourceVideo: '/videos/unforgettable-ai-car-tpl.mp4',
    prompt:
      'Replace the card-holding person in @Video 1 with the adult in @Image 1 — face, hair, build, outfit, and accessories. Keep the car, setting, camera path, and reveal timing. Show exactly two cards: 2 and 4, reading 24 left to right — do not mirror. Same identity before and after the lens clears. No duplicates, no new scenes.',
    mode: 'objects-swap',
    resolution: DEFAULT_OBJECTS_RESOLUTION,
    aspect: 'landscape',
  },
  {
    id: 'cat-to-dog',
    titleKey: 'site.templates.cat_to_dog',
    poster: '/videos/cat-to-dog-tpl-poster.jpg',
    sourceVideo: '/videos/cat-to-dog-tpl.mp4',
    prompt:
      'Replace the cat in @Video 1 with the subject in @Image 1. Keep the original motion, camera path, lighting, and timing. Use only this authorized likeness.',
    mode: 'objects-swap',
    resolution: DEFAULT_OBJECTS_RESOLUTION,
    aspect: 'portrait',
  },
  {
    id: 'cat-fight',
    titleKey: 'site.templates.cat_fight',
    poster: '/videos/cat-fight-tpl-poster.jpg',
    sourceVideo: '/videos/cat-fight-tpl.mp4',
    prompt:
      'Replace the cats in @Video 1 with the subject in @Image 1. Keep the fight choreography, camera path, and timing. Use only this authorized likeness.',
    mode: 'objects-swap',
    resolution: DEFAULT_OBJECTS_RESOLUTION,
    aspect: 'landscape',
  },
  {
    id: 'bruce-li-dog',
    titleKey: 'site.templates.bruce_li_dog',
    poster: '/videos/bruce-li-dog-tpl-poster.jpg',
    sourceVideo: '/videos/bruce-li-dog-tpl.mp4',
    prompt:
      'Replace the dog in @Video 1 with the subject in @Image 1. Keep the kung-fu moves, camera path, and timing. Use only this authorized likeness.',
    mode: 'objects-swap',
    resolution: DEFAULT_OBJECTS_RESOLUTION,
    aspect: 'portrait',
  },
  {
    id: 'cat-jackson',
    titleKey: 'site.templates.cat_jackson',
    poster: '/videos/cat-jackson-tpl-poster.jpg',
    sourceVideo: '/videos/cat-jackson-tpl.mp4',
    prompt:
      'Replace the dancing cat in @Video 1 with the subject in @Image 1. Keep the dance moves, camera path, and timing. Use only this authorized likeness.',
    mode: 'objects-swap',
    resolution: DEFAULT_OBJECTS_RESOLUTION,
    aspect: 'landscape',
  },
  {
    id: 'car-drop',
    titleKey: 'site.templates.car_drop',
    poster: '/videos/car-drop-tpl-poster.jpg',
    sourceVideo: '/videos/car-drop-tpl.mp4',
    prompt:
      'Replace the car in @Video 1 with the subject in @Image 1. Keep the drop motion, camera path, and timing. Use only this authorized likeness.',
    mode: 'objects-swap',
    resolution: DEFAULT_OBJECTS_RESOLUTION,
    aspect: 'portrait',
  },
  {
    id: 'two-cats-dance',
    titleKey: 'site.templates.two_cats_dance',
    poster: '/videos/two-cats-dance-tpl-poster.jpg',
    sourceVideo: '/videos/two-cats-dance-tpl.mp4',
    prompt:
      'Replace the cats in @Video 1 with the subject in @Image 1. Keep the dance moves, camera path, and timing. Use only this authorized likeness.',
    mode: 'objects-swap',
    resolution: DEFAULT_OBJECTS_RESOLUTION,
    aspect: 'portrait',
  },
  {
    id: 'dog-two-girl-dance',
    titleKey: 'site.templates.dog_two_girl_dance',
    poster: '/videos/dog-two-girl-dance-tpl-poster.jpg',
    sourceVideo: '/videos/dog-two-girl-dance-tpl.mp4',
    prompt:
      'Replace the puppy in @Video 1 with the animal in @Image 1. Keep the two girls dancing, camera path, and timing. Use only this authorized likeness.',
    mode: 'objects-swap',
    resolution: DEFAULT_OBJECTS_RESOLUTION,
    aspect: 'portrait',
  },
  {
    id: 'long-trival',
    titleKey: 'site.templates.long_trival',
    poster: '/videos/long-trival-tpl-poster.jpg',
    sourceVideo: '/videos/long-trival-tpl.mp4',
    prompt: [
      'Replace the three main characters in the source video with the people from the assigned reference images.',
      '',
      'REFERENCE MAPPING:',
      '',
      'Reference 1 replaces the opening dancer.',
      'Reference 2 replaces the selfie character.',
      'Reference 3 replaces the character stepping out of the car.',
      '',
      'Each replacement character must retain the identity, facial features, hairstyle, clothing, and body proportions of their assigned reference.',
      '',
      'Do not mix identities or swap character assignments.',
      '',
      'Preserve the original movements, camera angles, scene transitions, vehicles, lighting, and timing.',
    ].join('\n'),
    mode: 'objects-swap',
    resolution: DEFAULT_OBJECTS_RESOLUTION,
    aspect: 'portrait',
  },
  {
    id: 'dog-kick-bottle',
    titleKey: 'site.templates.dog_kick_bottle',
    poster: '/videos/dog-kick-bottle-tpl-poster.jpg',
    sourceVideo: '/videos/dog-kick-bottle-tpl.mp4',
    prompt:
      'Replace the dog in @Video 1 with the subject in @Image 1. Keep the bottle-kick motion, camera path, lighting, and timing. Use only this authorized likeness.',
    mode: 'objects-swap',
    resolution: DEFAULT_OBJECTS_RESOLUTION,
    aspect: 'landscape',
  },
  {
    id: '3-meters-above-the-sky',
    titleKey: 'site.templates.3_meters_above_the_sky',
    poster: '/videos/3-meters-above-the-sky-tpl-poster.jpg',
    sourceVideo: '/videos/3-meters-above-the-sky-tpl.mp4',
    prompt: `Character 1 @Image 1
Character 2 @Image 2

UNDER NO CIRCUMSTANCES CHANGE THE CHARACTERS' IDENTITIES! THEY MUST LOOK EXACTLY LIKE THEIR REFERENCES! DO NOT ALTER THEIR FACIAL PROPORTIONS OR HAIRSTYLES!`,
    mode: 'motion-transfer',
    resolution: '720p',
    aspect: 'portrait',
  },
];

/** Gallery card + Use template share the same sourceVideo URL. */
export function getMotionTemplatePreviewSrc(template: MotionTemplate): string {
  return template.sourceVideo;
}
