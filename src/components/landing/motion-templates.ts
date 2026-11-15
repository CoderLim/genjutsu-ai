import {
  A2O_LITE_AI_TEMPLATE_PATH,
  A2O_LITE_AI_TEMPLATE_POSTER_PATH,
} from '@/modules/a2o-lite-ai/constants';
import {
  BURNING_BRIDGES_AI_TEMPLATE_DISPLAY_PATH,
  BURNING_BRIDGES_AI_TEMPLATE_POSTER_PATH,
} from '@/modules/burning-bridges-ai/constants';
import {
  CHIPMUNKS_DANCE_TEMPLATE_DISPLAY_PATH,
  CHIPMUNKS_DANCE_TEMPLATE_POSTER_PATH,
} from '@/modules/chipmunks-dance/constants';
import {
  COLDPLAY_KISS_CAM_TEMPLATE_PATH,
  COLDPLAY_KISS_CAM_TEMPLATE_POSTER_PATH,
} from '@/modules/coldplay-kiss-cam/constants';
import {
  CRAZY_FROG_TEMPLATE_PATH,
  CRAZY_FROG_TEMPLATE_POSTER_PATH,
} from '@/modules/crazy-frog/constants';
import {
  DECK_THE_HALLS_DANCE_AI_DUO_TEMPLATE_DISPLAY_PATH,
  DECK_THE_HALLS_DANCE_AI_DUO_TEMPLATE_POSTER_PATH,
} from '@/modules/deck-the-halls-dance-ai/constants';
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
  SHAN_SHEN_BU_TEMPLATE_PATH,
  SHAN_SHEN_BU_TEMPLATE_POSTER_PATH,
} from '@/modules/shan-shen-bu/constants';
import {
  SMALLTOWN_TEMPLATE_PATH,
  SMALLTOWN_TEMPLATE_POSTER_PATH,
} from '@/modules/smalltown-boy-dance/constants';
import { fixedTemplatePreviewPath } from '@/modules/templates/paths';
import {
  TINY_DESK_AI_TEMPLATE_DISPLAY_PATH,
  TINY_DESK_AI_TEMPLATE_POSTER_PATH,
} from '@/modules/tiny-desk-ai/constants';
import {
  WASSUP_IN_A_MINUTE_AI_TEMPLATE_DISPLAY_PATH,
  WASSUP_IN_A_MINUTE_AI_TEMPLATE_POSTER_PATH,
} from '@/modules/wassup-in-a-minute-ai/constants';

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
  /** Optional gallery CTA label (default: site.templates.use). */
  ctaLabelKey?: string;
};

export type MotionTemplate = MotionTemplateApply | MotionTemplateLink;

export function isMotionTemplateApply(
  template: MotionTemplate
): template is MotionTemplateApply {
  return !('href' in template && typeof template.href === 'string');
}

const DEFAULT_OBJECTS_RESOLUTION = '480p' as const;

/**
 * Homepage motion templates. Aspect follows the source clip
 * (portrait 9:16 / landscape 16:9) for gallery layout.
 * Dedicated product pages (Zombie Hug, Day of the Dead, Crazy Frog, …)
 * use `href` — Recreate on the homepage Genjutsu panel would use the
 * wrong provider/product.
 *
 * Order: newest first — prepend new templates at the top of this array.
 */
export const MOTION_TEMPLATES: MotionTemplate[] = [
  {
    id: 'deck-the-halls-dance',
    titleKey: 'site.templates.deck_the_halls_dance',
    poster: DECK_THE_HALLS_DANCE_AI_DUO_TEMPLATE_POSTER_PATH,
    sourceVideo: DECK_THE_HALLS_DANCE_AI_DUO_TEMPLATE_DISPLAY_PATH,
    href: '/deck-the-halls-dance-ai',
    aspect: 'portrait',
  },
  {
    id: 'throwing-flame',
    titleKey: 'site.templates.throwing_flame',
    poster: '/videos/throwing-flame-tpl-poster.jpg',
    sourceVideo: '/videos/throwing-flame-tpl.mp4',
    prompt: 'Replace the girl in @Video 1 with @Image 1',
    mode: 'objects-swap',
    resolution: DEFAULT_OBJECTS_RESOLUTION,
    aspect: 'portrait',
  },
  {
    id: 'wassup-in-a-minute-ai',
    titleKey: 'site.templates.wassup_in_a_minute_ai',
    poster: WASSUP_IN_A_MINUTE_AI_TEMPLATE_POSTER_PATH,
    sourceVideo: WASSUP_IN_A_MINUTE_AI_TEMPLATE_DISPLAY_PATH,
    href: '/wassup-in-a-minute-ai',
    aspect: 'landscape',
  },
  {
    id: 'bicep-heart',
    titleKey: 'site.templates.bicep_heart',
    poster: '/videos/bicep-heart-tpl-poster.jpg',
    // Link card only — product page uses Genjutsu Light objects-swap.
    sourceVideo: '/videos/bicep-heart-tpl.mp4',
    href: '/bicep-heart-ai',
    aspect: 'portrait',
  },
  {
    id: 'chipmunks-dance',
    titleKey: 'site.templates.chipmunks_dance',
    poster: CHIPMUNKS_DANCE_TEMPLATE_POSTER_PATH,
    sourceVideo: CHIPMUNKS_DANCE_TEMPLATE_DISPLAY_PATH,
    href: '/chipmunks-dance',
    aspect: 'portrait',
  },
  {
    id: 'glow-stick',
    titleKey: 'site.templates.glow_stick',
    poster: '/videos/glow-stick-tpl-poster.jpg',
    sourceVideo: fixedTemplatePreviewPath({ product: 'glow-stick' }),
    href: '/glow-stick-ai',
    aspect: 'portrait',
  },
  {
    id: 'closing-door-prank',
    titleKey: 'site.templates.closing_door_prank',
    poster: '/videos/closing-door-prank-tpl-poster.jpg',
    sourceVideo: '/videos/closing-door-prank-tpl.mp4',
    prompt: [
      // Generic COMPLETE / IDENTITY PRIORITY / hard-visibility rules live in
      // buildSeedanceWorkflowPrompt (REFERENCE IDENTITY). Keep this task
      // scene-specific: who to find, how to map, and the gag beats.
      'ORIGINAL SUBJECT CUES (identify who to replace; do NOT copy these looks onto the replacements):',
      '- Person A: adult by the white interior door — dark navy long sleeve, dark pants, dark baseball cap (often with a white NY logo), hand on the door, then peeks / laughs.',
      '- Person B: small child / toddler who runs from the far room through the doorway toward the camera — light hair, light pajamas or light shirt — then reacts in the foreground.',
      '',
      'ROLE MAPPING (same two identities for the whole clip):',
      '- Person A → @Image 1 (door closer / peeker).',
      '- Person B → @Image 2 (runner / foreground reactor).',
      '',
      'SHOT BEAT (same two people throughout):',
      '1) Person A waits by the open white door; Person B runs toward the doorway across the tiled floor.',
      '2) Person A swings the door shut as Person B approaches (door motion blur OK).',
      '3) Door opens / Person A peeks; playful reaction with Person B in the foreground.',
      '',
      'Preserve camera path, doorway framing, door swing, home interior, lighting, backpack on the floor, and timing. Use only these authorized likenesses.',
    ].join('\n'),
    mode: 'objects-swap',
    resolution: DEFAULT_OBJECTS_RESOLUTION,
    aspect: 'portrait',
  },
  {
    id: 'having-it-all',
    titleKey: 'site.templates.having_it_all',
    poster: '/videos/having-it-all-tpl-poster.jpg',
    sourceVideo: '/videos/having-it-all-tpl.mp4',
    prompt: [
      // Generic COMPLETE / hard-visibility rules live in buildSeedanceWorkflowPrompt.
      // Keep this task scene-specific: who to find across night/day cuts.
      'ORIGINAL SUBJECT CUES (identify who to replace; do NOT copy these looks onto the replacements):',
      '- Person A: adult man in the car — wavy brown hair, light beard/stubble, dark blazer over a white collared shirt; driver-seat close-ups at night (alone) and driver seat in daytime couple shots.',
      '- Person B: adult woman in the passenger seat — long dark free-flowing hair, light beige/grey top; only in daytime couple / dancing shots.',
      '',
      'ROLE MAPPING (same two identities for the whole clip):',
      '- Person A → @Image 1 in EVERY shot where the man appears — night lonely driving, night shouting / money / fist beats, AND daytime driving with the woman.',
      '- Person B → @Image 2 in EVERY daytime couple shot (passenger seat, laughing, dancing, arms up).',
      "Night solo shots still use @Image 1 only — do not invent a second person. Do not keep the original man's wavy brown hair, beard, eye color, or blazer look, and do not keep the original woman's long free hair or beige top when they differ from the references.",
      '',
      'SHOT STRUCTURE (same pair across cuts):',
      '1) Night: Person A alone in the driver seat — sad close-up, then high-emotion beats (fist, shout, money in the cabin, face buried on the wheel).',
      '2) Day: Person A driving + Person B passenger — warm golden light, laughter, passenger dancing with motion blur.',
      'Intercut night and day; both people must stay their assigned reference identities whenever they reappear.',
      '',
      'Preserve camera path, car interior, night bokeh / dashboard glow, daytime golden light, money props, transitions, and timing. Use only these authorized likenesses.',
    ].join('\n'),
    mode: 'objects-swap',
    resolution: DEFAULT_OBJECTS_RESOLUTION,
    aspect: 'landscape',
  },
  {
    id: 'shan-shen-bu',
    titleKey: 'site.templates.shan_shen_bu',
    poster: SHAN_SHEN_BU_TEMPLATE_POSTER_PATH,
    sourceVideo: SHAN_SHEN_BU_TEMPLATE_PATH,
    href: '/shan-shen-bu',
    aspect: 'portrait',
  },
  {
    id: 'night-slide',
    titleKey: 'site.templates.night_slide',
    poster: '/videos/night-slide-tpl-poster.jpg',
    sourceVideo: '/videos/night-slide-tpl.mp4',
    prompt: [
      'Replace the girl in @Video 1 with the subject in @Image 1 — face, hair, build, outfit, and accessories.',
      '',
      'SHOT STRUCTURE (same person in both shots):',
      '1) Wide / full-body night street shot — the girl by the lamppost under the streetlight.',
      '2) Close-up of the same girl smiling under the streetlight.',
      '',
      'The two shots are linked by a horizontal slide transition (camera/subject slide with motion blur). Keep one continuous identity across both shots — do not change who the person is between wide and close-up.',
      '',
      'Preserve the slide transition, camera path, night lighting, sidewalk, lamppost, and timing. Use only this authorized likeness.',
    ].join('\n'),
    mode: 'objects-swap',
    resolution: DEFAULT_OBJECTS_RESOLUTION,
    aspect: 'portrait',
  },
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
    // Width-limited gallery CTA — full "Outstanding…" phrase does not fit.
    ctaLabelKey: 'site.templates.tiny_desk_ai_cta',
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
    resolution: DEFAULT_OBJECTS_RESOLUTION,
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
    resolution: DEFAULT_OBJECTS_RESOLUTION,
    aspect: 'portrait',
  },
];

/** Gallery card + Use template share the same sourceVideo URL. */
export function getMotionTemplatePreviewSrc(template: MotionTemplate): string {
  return template.sourceVideo;
}
