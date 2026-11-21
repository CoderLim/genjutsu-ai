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


/**
 * Fal endpoints are selected by workflow, *not* by a client-provided endpoint.
 * A missing endpoint deliberately blocks submission instead of silently
 * substituting a different model (notably H3 Turbo, still unverified).
 */
export const ADDITIONAL_FAL_ENDPOINTS: Record<
  string, Partial<Record<'text-to-video' | 'first-frame' | 'text-to-image' | 'image-to-image', string>>
> = {
  'seedance-2-fast': {
    'text-to-video': 'bytedance/seedance-2.0/fast/text-to-video',
    'first-frame': 'bytedance/seedance-2.0/fast/image-to-video',
  },
  'seedance-2-mini': {
    'text-to-video': 'bytedance/seedance-2.0/mini/text-to-video',
    'first-frame': 'bytedance/seedance-2.0/mini/image-to-video',
  },
  'seedance-2.5': {
    'text-to-video': 'bytedance/seedance-2.5/text-to-video',
    'first-frame': 'bytedance/seedance-2.5/image-to-video',
  },
  'seedance-2.5-flash': {
    'text-to-video': 'bytedance/seedance-2.5/flash/text-to-video',
    'first-frame': 'bytedance/seedance-2.5/flash/image-to-video',
  },
  'minimax-h3': {
    'text-to-video': 'minimax/h3/text-to-video',
    'first-frame': 'minimax/h3/image-to-video',
  },
  'minimax-h3-max-turbo': {
    'text-to-video': 'minimax/h3-max-turbo/text-to-video',
    'first-frame': 'minimax/h3-max-turbo/image-to-video',
  },
  'minimax-h3-max': {
    'text-to-video': 'minimax/h3-max/text-to-video',
    'first-frame': 'minimax/h3-max/image-to-video',
  },
  'kling-4': {
    'text-to-video': 'kling/v4/text-to-video',
    'first-frame': 'kling/v4/image-to-video',
  },
  'kling-4-flash': {
    'text-to-video': 'kling/v4/flash/text-to-video',
    'first-frame': 'kling/v4/flash/image-to-video',
  },
  'kling-3-turbo': {
    'text-to-video': 'fal-ai/kling-video/v3/turbo/standard/text-to-video',
    'first-frame': 'fal-ai/kling-video/v3/turbo/standard/image-to-video',
  },
  'kling-3': {
    'text-to-video': 'fal-ai/kling-video/v3/pro/text-to-video',
    'first-frame': 'fal-ai/kling-video/v3/pro/image-to-video',
  },
  'minimax-h3-image': {
    'text-to-image': 'minimax/h3-image/text-to-image',
    'image-to-image': 'minimax/h3-image/edit',
  },
  'minimax-h3-image-highspeed': {
    'text-to-image': 'minimax/h3-image/highspeed/text-to-image',
    'image-to-image': 'minimax/h3-image/highspeed/edit',
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
  const extra = ADDITIONAL_FAL_ENDPOINTS[modelId];
  if (extra) {
    const apiWorkflow = workflow === 'start-end' ? 'first-frame' : workflow;
    const endpoint = apiWorkflow ? extra[apiWorkflow as keyof typeof extra]
      : extra['first-frame'] ?? extra['text-to-image'];
    if (!endpoint) throw new Error('Unsupported Fal model/workflow endpoint');
    return { provider: 'fal', providerModelId: endpoint };
  }
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


function minimaxCustomImageSize(params: Record<string, string | number | boolean>) {
  const dimensions: Record<string, number> = { '1K': 1024, '2K': 2048, '4K': 3840 };
  const width = dimensions[String(params.resolution)];
  if (!width) throw new Error('Invalid image resolution');
  const aspect = String(params.aspectRatio).split(':').map(Number);
  if (aspect.length !== 2 || aspect.some(x => !Number.isFinite(x) || x <= 0)) {
    throw new Error('Invalid image aspect ratio');
  }
  // For 4K landscape, use the conventional width; rotate for portrait.
  let w = width, h = Math.round(width * aspect[1] / aspect[0] / 32) * 32;
  if (h > width) {
    h = width;
    w = Math.round(width * aspect[0] / aspect[1] / 32) * 32;
  }
  // Fal requires at least 655,360 pixels. At 1K, 16:9 and 9:16 would
  // otherwise be only 1024 x 576, so increase both sides together.
  const minPixels = 655360;
  if (w * h < minPixels) {
    const scale = Math.sqrt(minPixels / (w * h));
    w = Math.ceil(w * scale / 32) * 32;
    h = Math.ceil(h * scale / 32) * 32;
  }
  return { width: w, height: h };
}

export function buildGeneratorProviderRequest(
  state: GeneratorState,
  media: MediaReadUrls
): Record<string, unknown> {
  const params = state.params;
  if (ADDITIONAL_FAL_ENDPOINTS[state.modelId]) {
    const id = state.modelId;
    if (id.startsWith('minimax-h3-image')) {
      if (state.workflow === 'image-to-image' && !media.referenceImages.length) {
        throw new Error('Reference image required');
      }
      return {
        prompt: state.prompt,
        image_size: minimaxCustomImageSize(params),
        num_images: params.outputCount,
        output_format: params.outputFormat,
        ...(state.workflow === 'image-to-image'
          ? { image_urls: media.referenceImages } : {}),
      };
    }
    const hasImage = state.workflow === 'first-frame' || state.workflow === 'start-end';
    if (hasImage && !media.startFrame) throw new Error('Start frame required');
    if (state.workflow === 'start-end' && !media.endFrame) {
      throw new Error('End frame required');
    }
    const base = {
      prompt: state.prompt,
      duration: params.duration,
      resolution: params.resolution,
    };
    if (id.startsWith('kling-4')) {
      return {
        ...base,
        ...(hasImage
          ? {
              start_image_url: media.startFrame,
              ...(state.workflow === 'start-end' ? { end_image_url: media.endFrame } : {}),
            }
          : { aspect_ratio: params.aspectRatio }),
        // Kling 4 uses its own per-shot defaults. Do not send WaveSpeed keys.
      };
    }
    if (id.startsWith('kling-3')) {
      return {
        prompt: state.prompt,
        duration: String(params.duration),
        ...(hasImage
          ? {
              start_image_url: media.startFrame,
              ...(state.workflow === 'start-end' ? { end_image_url: media.endFrame } : {}),
            }
          : { aspect_ratio: params.aspectRatio }),
        ...(id === 'kling-3' ? { generate_audio: params.generateAudio } : {}),
      };
    }
    if (id === 'minimax-h3' || id.startsWith('minimax-h3-max')) {
      return {
        ...base,
        ...(hasImage ? {
          image_url: media.startFrame,
          ...(state.workflow === 'start-end'
            ? { end_image_url: media.endFrame }
            : {}),
        } : { aspect_ratio: params.aspectRatio }),
        prompt_expansion_mode: params.promptExpansionMode,
        enable_safety_checker: true,
      };
    }
    // Seedance Fast/Mini/2.5 use fal's image_url, not WaveSpeed's
    // legacy image property.
    return {
      ...base,
      ...(hasImage ? {
        image_url: media.startFrame,
        ...(state.workflow === 'start-end' ? { end_image_url: media.endFrame } : {}),
      } : { aspect_ratio: params.aspectRatio }),
      generate_audio: params.generateAudio,
    };
  }

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
  const sizeByAspectRatio: Record<string, string> = {
    '1:1': 'square_hd',
    '4:3': 'landscape_4_3',
    '3:4': 'portrait_4_3',
    '16:9': 'landscape_16_9',
    '9:16': 'portrait_16_9',
  };
  const size = sizeByAspectRatio[String(params.aspectRatio)];
  if (!size) throw new Error('Unsupported image aspect ratio');
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
