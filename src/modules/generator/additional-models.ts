/**
 * Model catalog entries under staged rollout. All payloads route through the
 * independent generator Fal adapter; no legacy Genjutsu business APIs.
 *
 * enabled=false is deliberate for tariff/parameter combinations which have
 * not been reconciled against our Fal account. A documented endpoint alone
 * is not sufficient justification for charging customer credits.
 */
import type { FieldSpec, GeneratorModel, WorkflowSpec } from './types';

const IMAGE_MIME = ['image/png', 'image/jpeg', 'image/webp'] as const;
const videoFrames = {
  startFrame: {
    min: 1, max: 1, accept: IMAGE_MIME, maxBytes: 12 * 1048576,
  },
};
const ASPECTS = ['16:9', '9:16', '1:1', '4:3', '3:4'] as const;
const VIDEO_ASPECTS = [...ASPECTS, '21:9'] as const;

type VideoOptions = {
  id: string;
  name: string;
  resolutions: readonly string[];
  duration: readonly [number, number];
  aspectRatios?: readonly string[];
  rate?: number; // customer credits/second, not the Fal unit price
  rates?: Record<string, number>; // tiered customer credit rate by resolution
  rateResolution?: string;
  audio?: boolean;
  startEnd?: boolean;
  promptExpansion?: boolean;
  frameMime?: readonly string[];
  // Only expose references with a separately documented provider endpoint.
  referenceImageLimit?: number;
};

function videoFields(options: VideoOptions): Record<string, FieldSpec> {
  const fields: Record<string, FieldSpec> = {
    duration: {
      label: 'Duration', default: Math.max(5, options.duration[0]),
      min: options.duration[0], max: options.duration[1], step: 1,
    },
    resolution: {
      label: 'Resolution',
      default: options.rateResolution ?? options.resolutions[0],
      options: options.resolutions,
    },
    aspectRatio: {
      label: 'Aspect Ratio',
      default: options.aspectRatios?.[0] ?? '16:9',
      options: options.aspectRatios ?? VIDEO_ASPECTS,
    },
    outputCount: { label: 'Outputs', default: 1, options: [1] },
  };
  if (options.audio) {
    fields.generateAudio = {
      label: 'Sound', default: true, options: [true, false],
    };
  }
  if (options.promptExpansion) {
    fields.promptExpansionMode = {
      label: 'Prompt Expansion',
      default: 'balanced',
      // The Fal H3 Max variants expose these three expansion modes.
      options: ['disabled', 'balanced', 'quality'],
    };
  }
  return fields;
}

function videoProfile(options: VideoOptions): GeneratorModel {
  const fields = videoFields(options);
  const frameSlots = {
    startFrame: {
      ...videoFrames.startFrame,
      accept: options.frameMime ?? IMAGE_MIME,
    },
  };
  // Image-to-video follows the uploaded frame's canvas. Fal ignores any
  // manually selected aspect ratio for those workflows.
  const frameFields = { ...fields };
  delete frameFields.aspectRatio;
  const textToVideo: WorkflowSpec = {
    label: 'Text to Video', slots: {}, fields,
  };
  const firstFrame: WorkflowSpec = {
    label: 'First Frame', slots: frameSlots, fields: frameFields,
  };
  const pricedRates = options.rates ??
    (options.rate !== undefined && options.rateResolution
      ? { [options.rateResolution]: options.rate }
      : null);
  const pricing = pricedRates === null
    ? {
        version: 'pending-fal-billing-2026-11',
        precision: 'estimate' as const,
        rule: { kind: 'fixed' as const, credits: 0 },
      }
    : {
        // Product price for customers, not an assertion about Fal's bill.
        version: '2026-11-21-' + options.id + '-v1',
        precision: 'exact' as const,
        rule: { kind: 'per-second' as const, rates: pricedRates },
      };
  return {
    id: options.id,
    name: options.name,
    mediaType: 'video',
    maxPromptChars: 3000,
    enabled: pricedRates !== null,
    defaultWorkflow: 'first-frame',
    pricing: options.id === 'minimax-h3' || options.id.startsWith('minimax-h3-max')
      ? { ...pricing, includedReferenceImages: 5, extraReferenceImageCredits: 14 }
      : pricing,
    workflows: {
      'first-frame': firstFrame,
      ...(options.startEnd ? {
        'start-end': {
          label: 'Start & End',
          slots: {
            ...frameSlots,
            endFrame: {
              min: 1, max: 1, accept: IMAGE_MIME, maxBytes: 12 * 1048576,
            },
          },
          fields: frameFields,
        },
      } : {}),
      // Text only is allowed in All-in-One. References are optional and
      // rendered only for versions with a documented reference endpoint.
      'all-in-one-reference': {
        label: 'All-in-One Reference',
        slots: options.referenceImageLimit
          ? {
              referenceImages: {
                min: 0, max: options.referenceImageLimit,
                accept: IMAGE_MIME, maxBytes: 12 * 1048576,
              },
            }
          : {},
        fields,
      },
      // Retain internal text mode for existing task snapshots; no separate
      // Text to Video entry is shown in the user-facing mode picker.
      'text-to-video': textToVideo,
    },
  };
}

const MINIMAX_IMAGE_FIELDS: Record<string, FieldSpec> = {
  aspectRatio: {
    label: 'Aspect Ratio', default: '1:1', options: ASPECTS,
  },
  resolution: {
    label: 'Resolution', default: '1K', options: ['1K', '2K', '4K'],
  },
  outputCount: { label: 'Outputs', default: 1, options: [1, 2, 3, 4] },
  outputFormat: { label: 'Format', default: 'png', options: ['png', 'jpeg', 'webp'] },
};

function minimaxImage(id: string, name: string): GeneratorModel {
  // Fixed customer credit tiers. Fal bills actual text+image tokens, so a
  // per-reference surcharge gives room for up to 16 large input images.
  const highspeed = id.endsWith('highspeed');
  return {
    id, name, mediaType: 'image', enabled: true,
    defaultWorkflow: 'text-to-image',
    pricing: {
      version: highspeed ? '2026-11-21-h3-image-highspeed-v1' : '2026-11-21-h3-image-v1',
      precision: 'exact',
      rule: {
        kind: 'matrix',
        fields: ['resolution'],
        creditsByCombination: highspeed
          ? { '1K': 12, '2K': 18, '4K': 42 }
          : { '1K': 8, '2K': 12, '4K': 24 },
      },
      includedReferenceImages: 1,
      extraReferenceImageCredits: highspeed ? 8 : 5,
    },
    workflows: {
      'text-to-image': {
        label: 'Text to Image', slots: {}, fields: MINIMAX_IMAGE_FIELDS,
      },
      'image-to-image': {
        label: 'Image Edit',
        slots: {
          referenceImages: {
            min: 1, max: 16, accept: IMAGE_MIME, maxBytes: 12 * 1048576,
          },
        },
        fields: MINIMAX_IMAGE_FIELDS,
      },
    },
  };
}

export const ADDITIONAL_GENERATOR_MODELS: readonly GeneratorModel[] = [
  videoProfile({
    id: 'seedance-2-fast', name: 'Seedance 2.0 Fast',
    resolutions: ['480p', '720p'], duration: [4, 15], audio: true,
    rates: { '480p': 19, '720p': 42 }, startEnd: true, referenceImageLimit: 9,
  }),
  videoProfile({
    id: 'seedance-2-mini', name: 'Seedance 2.0 Mini',
    resolutions: ['480p', '720p'], duration: [4, 15], audio: true,
    rates: { '480p': 13, '720p': 27 }, startEnd: true, referenceImageLimit: 9,
  }),
  videoProfile({
    id: 'seedance-2.5', name: 'Seedance 2.5',
    resolutions: ['480p', '720p'], duration: [4, 30], audio: true,
    rates: { '480p': 38, '720p': 81 }, startEnd: true, referenceImageLimit: 30,
  }),
  videoProfile({
    id: 'seedance-2.5-flash', name: 'Seedance 2.5 Flash',
    resolutions: ['480p', '720p'], duration: [4, 30], audio: true,
    rates: { '480p': 25, '720p': 53 }, startEnd: true, referenceImageLimit: 10,
  }),
  videoProfile({
    id: 'minimax-h3', name: 'MiniMax H3',
    // Base H3 endpoints accept 768P / 2K / 4K; there is no 480P tier.
    resolutions: ['768P', '2K', '4K'], duration: [5, 15],
    rates: { '768P': 11, '2K': 23, '4K': 28 },
    startEnd: true, referenceImageLimit: 9,
  }),
  // Fal has a base H3 endpoint but no verified, distinct H3 Turbo endpoint.
  // Do not misroute requests to the base H3 while calling it Turbo.
  videoProfile({
    id: 'minimax-h3-turbo', name: 'MiniMax H3 Turbo',
    resolutions: ['480P', '768P'], duration: [4, 12],
  }),
  // Fal's H3 Max pricing is per video second; keep rollout to 768P,
  // sound-on and a customer tariff with room above the published unit rate.
  videoProfile({
    id: 'minimax-h3-max-turbo', name: 'MiniMax H3 Max Turbo',
    resolutions: ['768P'], duration: [5, 15],
    rateResolution: '768P', rate: 10, startEnd: true, promptExpansion: true,
    referenceImageLimit: 9,
  }),
  videoProfile({
    id: 'minimax-h3-max', name: 'MiniMax H3 Max',
    resolutions: ['768P'], duration: [5, 15],
    rateResolution: '768P', rate: 16, startEnd: true, promptExpansion: true,
    referenceImageLimit: 9,
  }),
  videoProfile({
    id: 'kling-4', name: 'Kling 4.0',
    resolutions: ['720p', '1080p'], duration: [3, 30],
    rates: { '720p': 27, '1080p': 40 }, startEnd: true, referenceImageLimit: 10,
  }),
  videoProfile({
    id: 'kling-4-flash', name: 'Kling 4.0 Flash',
    resolutions: ['720p'], duration: [3, 20],
    rates: { '720p': 17 }, referenceImageLimit: 10, // Fal 4.0 Flash does not accept an end frame.
  }),
  videoProfile({
    id: 'kling-3-turbo', name: 'Kling 3.0 Turbo',
    resolutions: ['720p'], duration: [3, 15],
    aspectRatios: ['16:9', '9:16', '1:1'],
    frameMime: ['image/png', 'image/jpeg'],
    rates: { '720p': 20 }, // Fal V3 Turbo Standard accepts one image only.
  }),
  videoProfile({
    id: 'kling-3', name: 'Kling 3.0',
    resolutions: ['1080p'], duration: [3, 15], audio: true,
    aspectRatios: ['16:9', '9:16', '1:1'],
    rates: { '1080p': 29 }, startEnd: true,
  }),
  minimaxImage('minimax-h3-image', 'MiniMax H3 Image'),
  minimaxImage('minimax-h3-image-highspeed', 'MiniMax H3 Image Highspeed'),
];
