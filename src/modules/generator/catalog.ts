import type { GeneratorModel, MediaType } from './types';

const IMAGE_MIME = ['image/jpeg', 'image/png', 'image/webp'] as const;
const VIDEO_MIME = ['video/mp4', 'video/quicktime'] as const;
const AUDIO_MIME = ['audio/mpeg', 'audio/mp4', 'audio/wav'] as const;

// Public user-credit tariffs. These are product prices, NOT provider cost data.
// Per-second Seedance rates are based on 170 customer credits / provider USD,
// reviewed 2026-11-21; operators must recheck whenever upstream rates change.
const VIDEO_RATES = { '480p': 20.4, '720p': 40.8, '1080p': 102 };

const baseVideoFields = {
  duration: { label: 'Duration', default: 5, min: 4, max: 15, step: 1 },
  resolution: {
    label: 'Resolution', default: '720p', options: ['480p', '720p', '1080p'],
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

// Avoid reusing the legacy Genjutsu model/product routing and env pins.
export const GENERATOR_MODELS: readonly GeneratorModel[] = [
  {
    id: 'seedance-2-i2v',
    name: 'Seedance 2.0 · Photo to Video',
    mediaType: 'video', providerName: 'WaveSpeed',
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
    id: 'seedance-2-t2v',
    name: 'Seedance 2.0 · Text to Video',
    mediaType: 'video', providerName: 'WaveSpeed',
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
    id: 'seedance-2-reference',
    name: 'Seedance 2.0 · All-in-One',
    mediaType: 'video', providerName: 'WaveSpeed',
    // Reference video/audio pricing and server-side duration probes are not
    // yet release-gated; keep disabled to avoid misquoting video-reference costs.
    enabled: false,
    defaultWorkflow: 'all-in-one-reference',
    pricing: {
      version: '2026-11-21-reference-draft',
      precision: 'estimate',
      rule: { kind: 'per-second', rates: VIDEO_RATES },
    },
    workflows: {
      'all-in-one-reference': {
        label: 'All-in-One Reference',
        slots: {
          referenceImages: { min: 0, max: 9, accept: IMAGE_MIME, maxBytes: 12 * 1048576 },
          referenceVideos: { min: 0, max: 3, accept: VIDEO_MIME, maxBytes: 80 * 1048576 },
          referenceAudio: { min: 0, max: 3, accept: AUDIO_MIME, maxBytes: 20 * 1048576 },
        },
        fields: {
          ...baseVideoFields,
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
    id: 'h3-reference',
    name: 'MiniMax H3 · Reference to Video',
    mediaType: 'video', providerName: 'Fal',
    enabled: true,
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
    id: 'flux-schnell',
    name: 'FLUX.1 Schnell · Text to Image',
    mediaType: 'image', providerName: 'Fal',
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
    id: 'flux2-flash-edit',
    name: 'FLUX.2 Flash · Image Edit',
    mediaType: 'image', providerName: 'Fal',
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
