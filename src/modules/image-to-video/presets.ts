import {
  IMAGE_TO_VIDEO_DEFAULT_ASPECT_RATIO,
  IMAGE_TO_VIDEO_DEFAULT_DURATION,
  IMAGE_TO_VIDEO_DEFAULT_RESOLUTION,
  type ImageToVideoAspectRatio,
  type ImageToVideoResolution,
} from './constants';
import {
  DAY_OF_THE_DEAD_PERSON_PROMPT,
  DAY_OF_THE_DEAD_PET_PROMPT,
} from './prompts';

export const DAY_OF_THE_DEAD_PRESET_ID = 'day-of-the-dead' as const;

export const IMAGE_TO_VIDEO_VARIANTS = ['person', 'pet'] as const;
export type ImageToVideoVariant = (typeof IMAGE_TO_VIDEO_VARIANTS)[number];

export type ImageToVideoPresetId = typeof DAY_OF_THE_DEAD_PRESET_ID;

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
    defaultAspectRatio: IMAGE_TO_VIDEO_DEFAULT_ASPECT_RATIO,
    generateAudio: true,
    enabled: true,
    promptFor(variant) {
      if (variant === 'pet') return DAY_OF_THE_DEAD_PET_PROMPT;
      return DAY_OF_THE_DEAD_PERSON_PROMPT;
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
  return value === DAY_OF_THE_DEAD_PRESET_ID;
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
  };
}
