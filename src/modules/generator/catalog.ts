import type { GeneratorModel, MediaType } from './types';
import { ADDITIONAL_GENERATOR_MODELS } from './additional-models';

const IMAGE_MIME = ['image/jpeg', 'image/png', 'image/webp'] as const;
const VIDEO_MIME = ['video/mp4', 'video/quicktime'] as const;
const AUDIO_MIME = ['audio/mp4', 'audio/wav'] as const;
// Input+output reference-video per-second customer tariff.
const VIDEO_REFERENCE_RATES = { '480p': 12.75, '720p': 25.5, '1080p': 63.75, '4k': 127.5 };

// Public user-credit tariffs. These are product prices, NOT provider cost data.
// Per-second Seedance rates are based on 170 customer credits / provider USD,
// reviewed 2026-11-21; operators must recheck whenever upstream rates change.
const VIDEO_RATES = { '480p': 20.4, '720p': 40.8, '1080p': 102, '4k': 204 };

const baseVideoFields = {
  duration: { label: 'Duration', default: 5, min: 4, max: 15, step: 1 },
  resolution: {
    label: 'Resolution', default: '720p', options: ['480p', '720p', '1080p', '4k'],
  },
  aspectRatio: {
    label: 'Aspect Ratio', default: '9:16',
    options: ['16:9', '9:16', '4:3', '3:4', '1:1', '21:9'],
  },
  generateAudio: { label: 'Sound', default: true, options: [true, false] },
  outputCount: { label: 'Outputs', default: 1, options: [1] },
} as const;

const IMAGE_FIELDS = {
  aspectRatio: {
    label: 'Aspect Ratio', default: '1:1',
    options: ['1:1', '4:3', '3:4', '16:9', '9:16'],
  },
  outputCount: {
    label: 'Outputs', default: 1, options: [1, 2, 3, 4],
  },
  outputFormat: {
    label: 'Format', default: 'png', options: ['png', 'jpeg'],
  },
} as const;


// Nano Banana 2 / Pro public customer tariffs. Underlying Fal prices are
// $0.08/0.12/0.16 and $0.15/0.15/0.30 per output at 1K/2K/4K.
// Price * 170 customer credits/USD (rounded up) with no search/thinking extras.
const NANO_2_CREDITS = { '1K': 14, '2K': 21, '4K': 28 };
const NANO_PRO_CREDITS = { '1K': 26, '2K': 26, '4K': 51 };
const NANO_BASE_FIELDS = {
  aspectRatio: {
    label: 'Aspect Ratio', default: '1:1',
    options: ['1:1', '16:9', '9:16', '4:3', '3:4', '3:2', '2:3', '21:9'],
  },
  resolution: {
    label: 'Resolution', default: '1K', options: ['1K', '2K', '4K'],
  },
  outputCount: {
    label: 'Outputs', default: 1, options: [1, 2, 3, 4],
  },
  outputFormat: {
    label: 'Format', default: 'png', options: ['png', 'jpeg', 'webp'],
  },
} as const;

function nanoWorkflows() {
  return {
    'text-to-image': {
      label: 'Text to Image', slots: {}, fields: { ...NANO_BASE_FIELDS },
    },
    'image-to-image': {
      label: 'Image Edit',
      slots: {
        referenceImages: {
          min: 1, max: 14, accept: IMAGE_MIME, maxBytes: 12 * 1048576,
        },
      },
      fields: { ...NANO_BASE_FIELDS },
    },
  } as const;
}

// Avoid reusing the legacy Genjutsu model/product routing and env pins.
export const GENERATOR_MODELS: readonly GeneratorModel[] = [
  {
    id: 'photo-to-video-standard',
    name: 'Seedance 2.0 · Photo to Video',
    mediaType: 'video',
    enabled: true,
    defaultWorkflow: 'first-frame',
    pricing: {
      version: '2026-11-21-v1',
      precision: 'exact',
      rule: { kind: 'per-second', rates: VIDEO_RATES },
    },
    workflows: {
      'first-frame': {
        label: 'First Frame',
        slots: {
          startFrame: { min: 1, max: 1, accept: IMAGE_MIME, maxBytes: 12 * 1048576 },
        },
        fields: { ...baseVideoFields },
      },
      'start-end': {
        label: 'Start & End',
        slots: {
          startFrame: { min: 1, max: 1, accept: IMAGE_MIME, maxBytes: 12 * 1048576 },
          endFrame: { min: 1, max: 1, accept: IMAGE_MIME, maxBytes: 12 * 1048576 },
        },
        fields: { ...baseVideoFields },
      },
    },
  },
  {
    id: 'text-to-video-standard',
    name: 'Seedance 2.0 · Text to Video',
    mediaType: 'video',
    enabled: true,
    defaultWorkflow: 'text-to-video',
    pricing: {
      version: '2026-11-21-v1',
      precision: 'exact',
      rule: { kind: 'per-second', rates: VIDEO_RATES },
    },
    workflows: {
      'text-to-video': {
        label: 'Text to Video',
        slots: {},
        fields: { ...baseVideoFields },
      },
    },
  },
  {
    id: 'multi-image-to-video',
    name: 'Seedance 2.0 · Multi-Image',
    mediaType: 'video',
    enabled: true,
    defaultWorkflow: 'all-in-one-reference',
    // Image-only reference subset. Adding reference videos changes billing to
    // output+input seconds, so mixed video/audio stays preview-only.
    pricing: {
      version: '2026-11-21-v1',
      precision: 'exact',
      rule: { kind: 'per-second', rates: VIDEO_RATES },
    },
    workflows: {
      'all-in-one-reference': {
        label: 'Multi-Image Reference',
        slots: {
          referenceImages: {
            min: 1, max: 9, accept: IMAGE_MIME, maxBytes: 12 * 1048576,
          },
        },
        fields: { ...baseVideoFields },
      },
    },
  },
  {
    id: 'all-in-one-video',
    name: 'Seedance 2.0 · All-in-One',
    mediaType: 'video',
    enabled: true,
    defaultWorkflow: 'all-in-one-reference',
    pricing: {
      version: '2026-11-21-reference-video-v2',
      precision: 'exact',
      referenceVideoRates: VIDEO_REFERENCE_RATES,
      rule: { kind: 'per-second', rates: VIDEO_RATES },
    },
    workflows: {
      'all-in-one-reference': {
        label: 'All-in-One Reference',
        // References are optional: without any uploaded media, the composer
        // routes this intent to text-to-video instead.
        maxCombinedReferences: 12,
        slots: {
          referenceImages: { min: 0, max: 9, accept: IMAGE_MIME, maxBytes: 12 * 1048576 },
          referenceVideos: { min: 0, max: 3, accept: VIDEO_MIME, maxBytes: 80 * 1048576, minSeconds: 0.1, maxSeconds: 15 },
          referenceAudio: { min: 0, max: 3, accept: AUDIO_MIME, maxBytes: 20 * 1048576, minSeconds: 0.1, maxSeconds: 15 },
        },
        fields: {
          ...baseVideoFields,
          inputVideoSeconds: { label: 'Input video duration', default: 0, internal: true, min: 0, max: 15, step: 1 },
          webSearch: { label: 'Web Search', default: false, options: [false, true] },
        },
      },
      'text-to-video': {
        label: 'Text to Video', slots: {},
        fields: { ...baseVideoFields },
      },
    },
  },
  {
    id: 'reference-to-video-pro',
    name: 'MiniMax H3',
    mediaType: 'video',
    maxPromptChars: 7000,
    enabled: false,
    defaultWorkflow: 'reference-to-video',
    pricing: {
      version: '2026-11-21-h3-draft',
      precision: 'estimate',
      rule: {
        kind: 'per-second',
        rates: { '480P': 8.5, '768P': 10.2, '2K': 22.1, '4K': 27.2 },
      },
      includedReferenceImages: 5,
      extraReferenceImageCredits: 13.6,
    },
    workflows: {
      'reference-to-video': {
        label: 'Reference to Video',
        slots: {
          referenceImages: { min: 1, max: 9, accept: IMAGE_MIME, maxBytes: 12 * 1048576 },
          referenceVideos: { min: 1, max: 1, accept: VIDEO_MIME, maxBytes: 80 * 1048576, minSeconds: 5, maxSeconds: 15 },
        },
        fields: {
          duration: { label: 'Duration', default: 8, min: 5, max: 15, step: 1 },
          resolution: {
            label: 'Resolution', default: '768P',
            options: ['480P', '768P', '2K', '4K'],
          },
          aspectRatio: {
            label: 'Aspect Ratio', default: '16:9',
            options: ['adaptive', '21:9', '16:9', '4:3', '1:1', '3:4', '9:16'],
          },
          promptExpansionMode: {
            label: 'Prompt Expansion', default: 'disabled',
            options: ['disabled', 'fast', 'balanced', 'quality'],
          },
          outputCount: { label: 'Outputs', default: 1, options: [1] },
        },
      },
    },
  },
  {
    id: 'nano-banana-2',
    name: 'Nano Banana 2',
    mediaType: 'image',
    enabled: true,
    defaultWorkflow: 'text-to-image',
    pricing: {
      version: '2026-11-21-nano2-1',
      precision: 'exact',
      rule: { kind: 'matrix', fields: ['resolution'], creditsByCombination: NANO_2_CREDITS },
    },
    workflows: nanoWorkflows(),
  },
  {
    id: 'nano-banana-pro',
    name: 'Nano Banana Pro',
    mediaType: 'image',
    enabled: true,
    defaultWorkflow: 'text-to-image',
    pricing: {
      version: '2026-11-21-nanopro-1',
      precision: 'exact',
      rule: { kind: 'matrix', fields: ['resolution'], creditsByCombination: NANO_PRO_CREDITS },
    },
    workflows: nanoWorkflows(),
  },
  {
    id: 'text-to-image-fast',
    name: 'FLUX.1 Schnell',
    mediaType: 'image',
    enabled: true,
    defaultWorkflow: 'text-to-image',
    pricing: {
      version: '2026-11-21-v1',
      precision: 'exact',
      rule: { kind: 'fixed', credits: 4 },
    },
    workflows: {
      'text-to-image': {
        label: 'Text to Image', slots: {}, fields: IMAGE_FIELDS,
      },
    },
  },
  {
    id: 'image-edit-standard',
    name: 'FLUX.2 Flash',
    mediaType: 'image',
    enabled: true,
    defaultWorkflow: 'image-to-image',
    pricing: {
      version: '2026-11-21-v1',
      precision: 'exact',
      rule: { kind: 'fixed', credits: 9 },
      includedReferenceImages: 1,
      extraReferenceImageCredits: 2,
    },
    workflows: {
      'image-to-image': {
        label: 'Image to Image',
        slots: {
          referenceImages: { min: 1, max: 4, accept: IMAGE_MIME, maxBytes: 12 * 1048576 },
        },
        fields: IMAGE_FIELDS,
      },
    },
  },
  ...ADDITIONAL_GENERATOR_MODELS,
];

/** Public catalog includes only launch-ready, server-wired models. */
export function listGeneratorModels(mediaType?: MediaType) {
  return GENERATOR_MODELS.filter((item) =>
    item.enabled && (!mediaType || item.mediaType === mediaType)
  );
}

export function getGeneratorModel(modelId: string) {
  const model = GENERATOR_MODELS.find((item) => item.id === modelId && item.enabled);
  if (!model) throw new Error('Model is not enabled');
  return model;
}
