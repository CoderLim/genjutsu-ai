/**
 * Provider-specific business adapters for the *new* generator pipeline.
 * These call generic provider transports, never legacy generation services.
 */
import { AIMediaType, AITaskStatus, FalProvider, classifyFalSubmitFailure } from '@/core/ai';
import {
  assertWavespeedConfigured,
  classifyWavespeedSubmitFailure,
  getWavespeedPredictionStatus,
  submitWavespeedPrediction,
} from '@/core/ai/wavespeed';
import { envConfigs } from '@/config';
import { getConfig } from '@/modules/config/service';
import type { GeneratorState, Workflow } from './types';

export type ProviderResult = {
  status: 'processing' | 'completed' | 'failed' | 'query-error';
  providerStatus: string;
  outputUrls: string[];
  error?: string;
};

export type ProviderIdentity = {
  provider: 'wavespeed' | 'fal';
  providerModelId: string;
};

const MODEL_IDENTITIES: Record<string, ProviderIdentity> = {
  'multi-image-to-video': {
    provider: 'wavespeed',
    providerModelId: 'bytedance/seedance-2.0/text-to-video',
  },
  'text-to-video-standard': {
    provider: 'wavespeed',
    providerModelId: 'bytedance/seedance-2.0/text-to-video',
  },
  'photo-to-video-standard': {
    provider: 'wavespeed',
    providerModelId: 'bytedance/seedance-2.0/image-to-video',
  },
  'all-in-one-video': {
    provider: 'wavespeed',
    providerModelId: 'bytedance/seedance-2.0/reference-to-video',
  },
  'reference-to-video-pro': {
    provider: 'fal',
    providerModelId: 'minimax/h3/reference-to-video',
  },
  'nano-banana-2': { provider: 'fal', providerModelId: 'fal-ai/nano-banana-2' },
  'nano-banana-pro': { provider: 'fal', providerModelId: 'fal-ai/nano-banana-pro' },
  'text-to-image-fast': {
    provider: 'fal',
    providerModelId: 'fal-ai/flux-1/schnell',
  },
  'image-edit-standard': {
    provider: 'fal',
    providerModelId: 'fal-ai/flux-2/flash/edit',
  },
};

export class GeneratorProviderNotConfiguredError extends Error {
  constructor(provider: string) {
    super('Generation service is temporarily unavailable');
    this.name = 'GeneratorProviderNotConfiguredError';
  }
}

export function getGeneratorProviderIdentity(
  modelId: string, workflow?: Workflow
): ProviderIdentity {
  const identity = MODEL_IDENTITIES[modelId];
  if (!identity) throw new Error('Unknown generator adapter: ' + modelId);
  // Both UI workflows share one named model; Fal has separate queue endpoints
  // for generation and editing. The selected endpoint is sealed in task options.
  if ((modelId === 'nano-banana-2' || modelId === 'nano-banana-pro')
    && workflow === 'image-to-image') {
    return { ...identity, providerModelId: identity.providerModelId + '/edit' };
  }
  return identity;
}

async function getFal() {
  const key =
    (await getConfig('fal_api_key'))?.trim() || envConfigs.fal_api_key?.trim();
  if (!key) throw new GeneratorProviderNotConfiguredError('Fal');
  return new FalProvider({ apiKey: key });
}

/** Fail before reserving credits if the provider is unavailable. */
export async function assertGeneratorProviderConfigured(modelId: string): Promise<void> {
  const identity = getGeneratorProviderIdentity(modelId);
  if (identity.provider === 'wavespeed') {
    await assertWavespeedConfigured();
    return;
  }
  await getFal();
}

export type MediaReadUrls = {
  startFrame?: string;
  endFrame?: string;
  referenceImages: string[];
  referenceVideos: string[];
  referenceAudio: string[];
};

export function buildGeneratorProviderRequest(
  state: GeneratorState,
  media: MediaReadUrls
): Record<string, unknown> {
  const params = state.params;
  if (state.modelId === 'multi-image-to-video') {
    if (media.referenceImages.length < 1) throw new Error('Reference images required');
    if (media.referenceVideos.length || media.referenceAudio.length) {
      throw new Error('This model accepts images only; mixed references require verified billing');
    }
    return {
      prompt: state.prompt,
      reference_images: media.referenceImages,
      duration: params.duration,
      resolution: params.resolution,
      aspect_ratio: params.aspectRatio,
      generate_audio: params.generateAudio,
    };
  }

  if (state.modelId === 'text-to-video-standard') {
    return {
      prompt: state.prompt,
      duration: params.duration,
      resolution: params.resolution,
      aspect_ratio: params.aspectRatio,
      generate_audio: params.generateAudio,
    };
  }

  if (state.modelId === 'photo-to-video-standard') {
    if (!media.startFrame) throw new Error('Start frame is required');
    return {
      image: media.startFrame,
      ...(state.workflow === 'start-end' ? { last_image: media.endFrame } : {}),
      prompt: state.prompt,
      duration: params.duration,
      resolution: params.resolution,
      aspect_ratio: params.aspectRatio,
      generate_audio: params.generateAudio,
    };
  }

  if (state.modelId === 'all-in-one-video') {
    if (
      state.workflow === 'all-in-one-reference' &&
      !media.referenceImages.length &&
      !media.referenceVideos.length &&
      !media.referenceAudio.length
    ) throw new Error('Add at least one reference');
    return {
      prompt: state.prompt,
      ...(state.workflow === 'all-in-one-reference' ? {
        reference_images: media.referenceImages,
        reference_videos: media.referenceVideos,
        reference_audios: media.referenceAudio,
      } : {}),
      duration: params.duration,
      resolution: params.resolution,
      aspect_ratio: params.aspectRatio,
      generate_audio: params.generateAudio,
      enable_web_search: params.webSearch === true,
    };
  }

  if (state.modelId === 'reference-to-video-pro') {
    if (media.referenceVideos.length !== 1 ||
        media.referenceImages.length < 1) {
      throw new Error('H3 requires one video and at least one image');
    }
    return {
      prompt: state.prompt,
      reference_video_urls: media.referenceVideos,
      reference_image_urls: media.referenceImages,
      duration: params.duration,
      resolution: params.resolution,
      aspect_ratio: params.aspectRatio,
      prompt_expansion_mode: params.promptExpansionMode,
      enable_safety_checker: true,
    };
  }

  const sizeByAspectRatio: Record<string, string> = {
    '1:1': 'square_hd',
    '4:3': 'landscape_4_3',
    '3:4': 'portrait_4_3',
    '16:9': 'landscape_16_9',
    '9:16': 'portrait_16_9',
  };
  const size = sizeByAspectRatio[String(params.aspectRatio)];
  if (!size) throw new Error('Unsupported image aspect ratio');
  if (state.modelId === 'nano-banana-2' || state.modelId === 'nano-banana-pro') {
    if (state.workflow === 'image-to-image' && !media.referenceImages.length) {
      throw new Error('At least one reference image is required');
    }
    return {
      prompt: state.prompt,
      ...(state.workflow === 'image-to-image' ? { image_urls: media.referenceImages } : {}),
      aspect_ratio: params.aspectRatio,
      resolution: params.resolution,
      num_images: params.outputCount,
      output_format: params.outputFormat,
      // Omit optional web search and thinking: their incremental cost is not
      // included in the exact customer credit schedule.
    };
  }
  if (state.modelId === 'text-to-image-fast') {
    return {
      prompt: state.prompt,
      image_size: size,
      num_images: params.outputCount,
      output_format: params.outputFormat,
      enable_safety_checker: true,
    };
  }
  if (state.modelId === 'image-edit-standard') {
    return {
      prompt: state.prompt,
      image_urls: media.referenceImages,
      image_size: size,
      num_images: params.outputCount,
      output_format: params.outputFormat,
      enable_safety_checker: true,
    };
  }
  throw new Error('Unknown generator model');
}

export async function submitGeneratorProvider(
  state: GeneratorState,
  media: MediaReadUrls
) {
  const identity = getGeneratorProviderIdentity(state.modelId, state.workflow);
  const body = buildGeneratorProviderRequest(state, media);
  if (identity.provider === 'wavespeed') {
    await assertWavespeedConfigured();
    return submitWavespeedPrediction(identity.providerModelId, body);
  }
  const fal = await getFal();
  const result = await fal.generate({
    params: {
      mediaType: state.mediaType === 'image'
        ? AIMediaType.IMAGE : AIMediaType.VIDEO,
      model: identity.providerModelId,
      prompt: state.prompt,
      options: body,
    },
  });
  if (!result.taskId) throw new Error('Fal did not return a request ID');
  return { requestId: result.taskId, status: 'processing' };
}

export function classifyGeneratorSubmitError(
  error: unknown, provider: ProviderIdentity['provider']
): 'refund' | 'uncertain' {
  if (error instanceof GeneratorProviderNotConfiguredError) return 'refund';
  if (provider === 'wavespeed') return classifyWavespeedSubmitFailure(error);
  return classifyFalSubmitFailure(
    error instanceof Error ? error.message : String(error)
  );
}

export async function queryGeneratorProvider(input: {
  modelId: string; requestId: string; mediaType: 'image' | 'video';
  workflow?: Workflow;
}): Promise<ProviderResult> {
  const identity = getGeneratorProviderIdentity(input.modelId, input.workflow);
  if (identity.provider === 'wavespeed') {
    const result = await getWavespeedPredictionStatus(input.requestId);
    if (result.status === 'completed') {
      return {
        status: 'completed',
        providerStatus: result.providerStatus,
        outputUrls: [result.videoUrl],
      };
    }
    if (result.status === 'failed') {
      return {
        status: 'failed',
        providerStatus: result.providerStatus,
        outputUrls: [],
        error: result.error,
      };
    }
    return { status: 'processing', providerStatus: result.providerStatus, outputUrls: [] };
  }

  const fal = await getFal();
  const result = await fal.query({
    taskId: input.requestId,
    model: identity.providerModelId,
    mediaType: input.mediaType === 'image'
      ? AIMediaType.IMAGE : AIMediaType.VIDEO,
  });
  const providerStatus = String(result.taskInfo?.status || result.taskStatus || 'processing');
  if (result.taskStatus === AITaskStatus.SUCCESS) {
    const images = result.taskInfo?.images as
      | Array<{ imageUrl?: string }> | undefined;
    const videos = result.taskInfo?.videos as
      | Array<{ videoUrl?: string }> | undefined;
    const urls = input.mediaType === 'image'
      ? (images ?? []).map(x => x.imageUrl).filter((x): x is string => !!x)
      : (videos ?? []).map(x => x.videoUrl).filter((x): x is string => !!x);
    if (!urls.length) {
      return {
        status: 'query-error', providerStatus,
        outputUrls: [],
        error: 'Provider reported success with no downloadable output',
      };
    }
    return { status: 'completed', providerStatus, outputUrls: urls };
  }
  if (result.taskStatus === AITaskStatus.FAILED) {
    // Fal HTTP 4xx status/result lookup is not proof that generation failed.
    const kind = String(result.taskInfo?.status ?? '');
    if (kind === 'QUERY_PERMANENT_ERROR' || kind === 'RESULT_FETCH_PERMANENT_ERROR') {
      return { status: 'query-error', providerStatus, outputUrls: [], error: 'Provider query needs review' };
    }
    return {
      status: 'failed', providerStatus, outputUrls: [],
      error: String(result.taskInfo?.errorMessage || 'Generation failed'),
    };
  }
  return { status: 'processing', providerStatus, outputUrls: [] };
}
