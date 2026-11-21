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
import type { GeneratorState } from './types';

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
  'seedance-2-multiimage': {
    provider: 'wavespeed',
    providerModelId: 'bytedance/seedance-2.0/text-to-video',
  },
  'seedance-2-t2v': {
    provider: 'wavespeed',
    providerModelId: 'bytedance/seedance-2.0/text-to-video',
  },
  'seedance-2-i2v': {
    provider: 'wavespeed',
    providerModelId: 'bytedance/seedance-2.0/image-to-video',
  },
  'seedance-2-reference': {
    provider: 'wavespeed',
    providerModelId: 'bytedance/seedance-2.0/reference-to-video',
  },
  'h3-reference': {
    provider: 'fal',
    providerModelId: 'minimax/h3/reference-to-video',
  },
  'flux-schnell': {
    provider: 'fal',
    providerModelId: 'fal-ai/flux-1/schnell',
  },
  'flux2-flash-edit': {
    provider: 'fal',
    providerModelId: 'fal-ai/flux-2/flash/edit',
  },
};

export class GeneratorProviderNotConfiguredError extends Error {
  constructor(provider: string) {
    super(provider + ' API key is not configured');
    this.name = 'GeneratorProviderNotConfiguredError';
  }
}

export function getGeneratorProviderIdentity(modelId: string): ProviderIdentity {
  const identity = MODEL_IDENTITIES[modelId];
  if (!identity) throw new Error('Unknown generator adapter: ' + modelId);
  return identity;
}

async function getFal() {
  const key =
    (await getConfig('fal_api_key'))?.trim() || envConfigs.fal_api_key?.trim();
  if (!key) throw new GeneratorProviderNotConfiguredError('Fal');
  return new FalProvider({ apiKey: key });
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
  if (state.modelId === 'seedance-2-multiimage') {
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

  if (state.modelId === 'seedance-2-t2v') {
    return {
      prompt: state.prompt,
      duration: params.duration,
      resolution: params.resolution,
      aspect_ratio: params.aspectRatio,
      generate_audio: params.generateAudio,
    };
  }

  if (state.modelId === 'seedance-2-i2v') {
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

  if (state.modelId === 'seedance-2-reference') {
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

  if (state.modelId === 'h3-reference') {
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
  if (state.modelId === 'flux-schnell') {
    return {
      prompt: state.prompt,
      image_size: size,
      num_images: params.outputCount,
      output_format: params.outputFormat,
      enable_safety_checker: true,
    };
  }
  if (state.modelId === 'flux2-flash-edit') {
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
  const identity = getGeneratorProviderIdentity(state.modelId);
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
}): Promise<ProviderResult> {
  const identity = getGeneratorProviderIdentity(input.modelId);
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
      error: String(result.taskInfo?.errorMessage || 'Fal generation failed'),
    };
  }
  return { status: 'processing', providerStatus, outputUrls: [] };
}
