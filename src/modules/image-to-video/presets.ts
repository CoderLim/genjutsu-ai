import {
  IMAGE_TO_VIDEO_DEFAULT_DURATION,
  IMAGE_TO_VIDEO_DEFAULT_RESOLUTION,
  type ImageToVideoAspectRatio,
  type ImageToVideoResolution,
} from './constants';
import {
  DAY_OF_THE_DEAD_PERSON_PROMPT,
  DAY_OF_THE_DEAD_PET_PROMPT,
  JATAYU_EXPANDED_PROMPT,
} from './prompts';

export const DAY_OF_THE_DEAD_PRESET_ID = 'day-of-the-dead' as const;
export const JATAYU_PRESET_ID = 'jatayu' as const;

export const IMAGE_TO_VIDEO_VARIANTS = ['person', 'pet'] as const;
export type ImageToVideoVariant = (typeof IMAGE_TO_VIDEO_VARIANTS)[number];

export type ImageToVideoPresetId =
  | typeof DAY_OF_THE_DEAD_PRESET_ID
  | typeof JATAYU_PRESET_ID;

export const IMAGE_TO_VIDEO_CUSTOM_PROMPT_MIN = 20;
export const IMAGE_TO_VIDEO_CUSTOM_PROMPT_MAX = 4000;

type ImageToVideoPresetDef = {
  id: ImageToVideoPresetId;
  version: number;
  displayName: string;
  creditDescription: string;
  previewUrl: string;
  posterUrl: string;
  downloadPrefix: string;
  variants: readonly ImageToVideoVariant[];
  defaultVariant: ImageToVideoVariant;
  defaultDuration: number;
  defaultResolution: ImageToVideoResolution;
  defaultAspectRatio: ImageToVideoAspectRatio;
  generateAudio: boolean;
  /** When true, generate may accept a client `prompt` override (validated). */
  allowCustomPrompt: boolean;
  enabled: boolean;
  promptFor: (variant: ImageToVideoVariant) => string;
};

const PRESETS: Record<ImageToVideoPresetId, ImageToVideoPresetDef> = {
  [DAY_OF_THE_DEAD_PRESET_ID]: {
    id: DAY_OF_THE_DEAD_PRESET_ID,
    version: 1,
    displayName: 'Day of the Dead AI Video',
    creditDescription: 'Reserve credits for Day of the Dead AI video',
    previewUrl: '/videos/day-of-the-dead-ai-video-demo.mp4',
    posterUrl: '/videos/day-of-the-dead-ai-video-demo-poster.jpg',
    downloadPrefix: 'day-of-the-dead',
    variants: IMAGE_TO_VIDEO_VARIANTS,
    defaultVariant: 'person',
    defaultDuration: IMAGE_TO_VIDEO_DEFAULT_DURATION,
    defaultResolution: IMAGE_TO_VIDEO_DEFAULT_RESOLUTION,
    // Demo + output match the landscape sample (not the engine-wide 9:16 default).
    defaultAspectRatio: '16:9',
    generateAudio: true,
    allowCustomPrompt: false,
    enabled: true,
    promptFor(variant) {
      if (variant === 'pet') return DAY_OF_THE_DEAD_PET_PROMPT;
      return DAY_OF_THE_DEAD_PERSON_PROMPT;
    },
  },
  [JATAYU_PRESET_ID]: {
    id: JATAYU_PRESET_ID,
    version: 1,
    displayName: 'Jatayu AI Video',
    creditDescription: 'Reserve credits for Jatayu AI video',
    previewUrl: '/videos/demos/jatayu-case-01.mp4',
    posterUrl: '/videos/demos/jatayu-case-01-poster.jpg',
    downloadPrefix: 'jatayu',
    variants: ['person'],
    defaultVariant: 'person',
    defaultDuration: IMAGE_TO_VIDEO_DEFAULT_DURATION,
    defaultResolution: IMAGE_TO_VIDEO_DEFAULT_RESOLUTION,
    defaultAspectRatio: '9:16',
    generateAudio: true,
    allowCustomPrompt: true,
    enabled: true,
    promptFor() {
      return JATAYU_EXPANDED_PROMPT;
    },
  },
};

export class ImageToVideoPreflightError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ImageToVideoPreflightError';
  }
}

export function isImageToVideoPresetId(
  value: unknown
): value is ImageToVideoPresetId {
  return value === DAY_OF_THE_DEAD_PRESET_ID || value === JATAYU_PRESET_ID;
}

export function isImageToVideoVariant(
  value: unknown
): value is ImageToVideoVariant {
  return value === 'person' || value === 'pet';
}

export function resolveImageToVideoPreset(
  presetId: unknown
): ImageToVideoPresetDef {
  if (!isImageToVideoPresetId(presetId)) {
    throw new ImageToVideoPreflightError('Unknown image-to-video preset');
  }
  const preset = PRESETS[presetId];
  if (!preset.enabled) {
    throw new ImageToVideoPreflightError('This preset is not available');
  }
  return preset;
}

export function resolveImageToVideoVariant(
  preset: ImageToVideoPresetDef,
  variant: unknown
): ImageToVideoVariant {
  if (variant == null || variant === '') return preset.defaultVariant;
  if (!isImageToVideoVariant(variant)) {
    throw new ImageToVideoPreflightError('Invalid subject variant');
  }
  if (!preset.variants.includes(variant)) {
    throw new ImageToVideoPreflightError(
      `This preset does not support the "${variant}" variant`
    );
  }
  return variant;
}

/**
 * Locked presets ignore client prompt. Custom-prompt presets accept a trimmed
 * override within length bounds; empty → preset default.
 */
export function resolveImageToVideoPrompt(
  preset: ImageToVideoPresetDef,
  variant: ImageToVideoVariant,
  customPrompt: unknown
): string {
  const fallback = preset.promptFor(variant);
  if (!preset.allowCustomPrompt) return fallback;
  if (typeof customPrompt !== 'string') return fallback;
  const trimmed = customPrompt.trim();
  if (!trimmed) return fallback;
  if (trimmed.length < IMAGE_TO_VIDEO_CUSTOM_PROMPT_MIN) {
    throw new ImageToVideoPreflightError(
      `Prompt must be at least ${IMAGE_TO_VIDEO_CUSTOM_PROMPT_MIN} characters`
    );
  }
  if (trimmed.length > IMAGE_TO_VIDEO_CUSTOM_PROMPT_MAX) {
    throw new ImageToVideoPreflightError(
      `Prompt must be at most ${IMAGE_TO_VIDEO_CUSTOM_PROMPT_MAX} characters`
    );
  }
  return trimmed;
}

export function getImageToVideoPresetPublicMeta(presetId: unknown) {
  const preset = resolveImageToVideoPreset(presetId);
  return {
    id: preset.id,
    version: preset.version,
    displayName: preset.displayName,
    previewUrl: preset.previewUrl,
    posterUrl: preset.posterUrl,
    variants: [...preset.variants],
    defaultVariant: preset.defaultVariant,
    defaultDuration: preset.defaultDuration,
    defaultResolution: preset.defaultResolution,
    defaultAspectRatio: preset.defaultAspectRatio,
    generateAudio: preset.generateAudio,
    allowCustomPrompt: preset.allowCustomPrompt,
    defaultPrompt: preset.promptFor(preset.defaultVariant),
  };
}
