import type { GeneratorModel, MediaType } from './types';

/**
 * Preview fixtures only. No model is enabled for paid submission until the
 * independent generator upload/billing/provider/reconcile path is implemented.
 *
 * These are NOT the main site's existing product model bindings.
 * Demo pricing is illustrative, not official API pricing.
 */
export const GENERATOR_PREVIEW_MODELS: readonly GeneratorModel[] = [
  {
    id: 'demo-video',
    name: 'Video Model · UI Preview',
    mediaType: 'video',
    providerName: 'Preview',
    enabled: false,
    defaultWorkflow: 'first-frame',
    pricing: {
      version: 'demo-only',
      precision: 'estimate',
      rule: {
        kind: 'per-second',
        rates: { '480p': 8, '720p': 16 },
      },
      includedReferenceImages: 2,
      extraReferenceImageCredits: 2,
      audioMultiplier: 1.2,
    },
    workflows: {
      'first-frame': {
        label: 'First Frame',
        slots: {
          startFrame: {
            min: 1, max: 1, accept: ['image/jpeg', 'image/png', 'image/webp'],
          },
        },
        fields: {
          duration: { label: 'Duration', default: 4, options: [4, 6, 8, 10] },
          resolution: { label: 'Resolution', default: '480p', options: ['480p', '720p'] },
          aspectRatio: { label: 'Aspect Ratio', default: '16:9', options: ['16:9', '9:16', '1:1'] },
          outputCount: { label: 'Outputs', default: 1, options: [1] },
          generateAudio: { label: 'Sound', default: false, options: [true, false] },
        },
        constraints: [
          {
            when: { field: 'resolution', equals: '720p' },
            field: 'duration',
            allowedValues: [4, 6],
          },
        ],
      },
      'start-end': {
        label: 'Start & End',
        slots: {
          startFrame: {
            min: 1, max: 1, accept: ['image/jpeg', 'image/png', 'image/webp'],
          },
          endFrame: {
            min: 1, max: 1, accept: ['image/jpeg', 'image/png', 'image/webp'],
          },
        },
        fields: {
          duration: { label: 'Duration', default: 4, options: [4, 6] },
          resolution: { label: 'Resolution', default: '480p', options: ['480p', '720p'] },
          aspectRatio: { label: 'Aspect Ratio', default: '16:9', options: ['16:9', '9:16'] },
          outputCount: { label: 'Outputs', default: 1, options: [1] },
        },
      },
      'all-in-one-reference': {
        label: 'All-in-One Reference',
        slots: {
          referenceImages: {
            min: 1, max: 5, accept: ['image/jpeg', 'image/png', 'image/webp'],
          },
        },
        fields: {
          duration: { label: 'Duration', default: 4, options: [4, 6] },
          resolution: { label: 'Resolution', default: '480p', options: ['480p', '720p'] },
          aspectRatio: { label: 'Aspect Ratio', default: '16:9', options: ['16:9', '9:16'] },
          outputCount: { label: 'Outputs', default: 1, options: [1] },
        },
      },
    },
  },
  {
    id: 'h3-reference-preview',
    name: 'MiniMax H3 · Reference-to-Video Preview',
    mediaType: 'video',
    providerName: 'Fal (preview configuration)',
    enabled: false,
    defaultWorkflow: 'reference-to-video',
    // This is ONLY an illustrative local quote. See the provider for real rates.
    pricing: {
      version: 'h3-preview-only',
      precision: 'estimate',
      rule: {
        kind: 'per-second',
        rates: { '480P': 8, '768P': 12, '2K': 20, '4K': 26 },
      },
      includedReferenceImages: 5,
      extraReferenceImageCredits: 14,
    },
    workflows: {
      'reference-to-video': {
        label: 'Reference to Video',
        slots: {
          referenceVideos: {
            min: 1, max: 1,
            accept: ['video/mp4', 'video/quicktime'],
          },
          referenceImages: {
            min: 1, max: 9,
            accept: ['image/jpeg', 'image/png', 'image/webp'],
          },
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
    id: 'demo-image',
    name: 'Image Model · UI Preview',
    mediaType: 'image',
    providerName: 'Preview',
    enabled: false,
    defaultWorkflow: 'text-to-image',
    pricing: {
      version: 'demo-only',
      precision: 'estimate',
      rule: { kind: 'per-image', rates: { '1K': 6, '2K': 10, '4K': 18 } },
    },
    workflows: {
      'text-to-image': {
        label: 'Text to Image',
        slots: {},
        fields: {
          resolution: { label: 'Resolution', default: '1K', options: ['1K', '2K', '4K'] },
          aspectRatio: { label: 'Aspect Ratio', default: '1:1', options: ['1:1', '16:9', '9:16'] },
          outputCount: { label: 'Outputs', default: 1, options: [1, 2, 3, 4] },
          outputFormat: { label: 'Format', default: 'png', options: ['png', 'webp'] },
        },
      },
      'image-to-image': {
        label: 'Image to Image',
        slots: {
          referenceImages: {
            min: 1, max: 6, accept: ['image/jpeg', 'image/png', 'image/webp'],
          },
        },
        fields: {
          resolution: { label: 'Resolution', default: '1K', options: ['1K', '2K', '4K'] },
          aspectRatio: { label: 'Aspect Ratio', default: '1:1', options: ['1:1', '16:9', '9:16'] },
          outputCount: { label: 'Outputs', default: 1, options: [1, 2, 3, 4] },
          outputFormat: { label: 'Format', default: 'png', options: ['png', 'webp'] },
        },
      },
    },
  },
];

export function getPreviewModel(mediaType: MediaType): GeneratorModel {
  const result = GENERATOR_PREVIEW_MODELS.find((model) => model.mediaType === mediaType);
  if (!result) throw new Error('Missing generator preview model');
  return result;
}

/** Public endpoint must NEVER return untested preview models. */
export function listEnabledGeneratorModels(
  mediaType?: MediaType
): GeneratorModel[] {
  return GENERATOR_PREVIEW_MODELS.filter(
    (model) => model.enabled && (!mediaType || model.mediaType === mediaType)
  );
}
