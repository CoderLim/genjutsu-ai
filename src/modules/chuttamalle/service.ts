import { AIMediaType, AITaskStatus, FalProvider } from '@/core/ai';
import { getConfig } from '@/modules/config/service';

import {
  assertChuttamalleDuration,
  CHUTTAMALLE_ASPECT_RATIOS,
  CHUTTAMALLE_MAX_REFERENCE_IMAGES,
  CHUTTAMALLE_MODEL,
  CHUTTAMALLE_RESOLUTIONS,
  type ChuttamalleAspectRatio,
  type ChuttamalleResolution,
} from './pricing';

export type ChuttamallePromptExpansionMode =
  | 'disabled'
  | 'fast'
  | 'balanced'
  | 'quality';

const PROMPT_EXPANSION_MODES = new Set<ChuttamallePromptExpansionMode>([
  'disabled',
  'fast',
  'balanced',
  'quality',
]);

export class ChuttamallePreflightError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ChuttamallePreflightError';
  }
}

export function buildChuttamallePrompt(imageCount: number) {
  if (imageCount === 1) {
    return [
      'Use Video 1 as the exact performance reference for motion, timing, gestures, dance choreography, camera, framing, lighting, and shot progression.',
      'Image 1 contains the replacement subject or pair. Replace the performers in Video 1 with the subject or subjects from Image 1 while preserving their left-to-right order when two people are visible.',
      'Keep identity, face, hair, clothing, body proportions, and species consistent with Image 1 throughout the clip.',
      'Preserve the original scene, choreography, timing, camera, composition, and background as closely as possible.',
      'Do not introduce extra people, props, scene changes, camera moves, or unrelated visual changes.',
    ].join('\n');
  }

  if (imageCount === 2) {
    return [
      'Use Video 1 as the exact performance reference for motion, timing, gestures, dance choreography, camera, framing, lighting, and shot progression.',
      'Replace the left performer in Video 1 with Image 1 and the right performer with Image 2.',
      'Keep each replacement identity, face, hair, clothing, body proportions, and species consistent with its matching image throughout the clip.',
      'Preserve the original scene, choreography, timing, camera, composition, and background as closely as possible.',
      'Do not swap the two identities, blend them together, add extra people, or alter unrelated parts of the shot.',
    ].join('\n');
  }

  throw new ChuttamallePreflightError(
    'Chuttamalle requires one or two reference images'
  );
}

async function getFalProvider() {
  const apiKey = (await getConfig('fal_api_key'))?.trim();
  if (!apiKey) {
    throw new ChuttamallePreflightError(
      'Fal API key is not configured. Set it in Admin → Settings → AI → Fal.'
    );
  }
  return new FalProvider({ apiKey });
}

function assertHttpUrl(value: string, label: string) {
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:' && url.protocol !== 'http:') {
      throw new Error();
    }
  } catch {
    throw new ChuttamallePreflightError(`${label} is not a valid URL`);
  }
}

export function validateChuttamalleInput(input: {
  prompt: string;
  duration: number;
  resolution: ChuttamalleResolution;
  aspectRatio: ChuttamalleAspectRatio;
  promptExpansionMode: ChuttamallePromptExpansionMode;
  videoUrl: string;
  imageUrls: string[];
}) {
  const prompt = input.prompt.trim();
  if (!prompt) throw new ChuttamallePreflightError('Prompt is required');
  if (prompt.length > 4000) {
    throw new ChuttamallePreflightError('Prompt is too long');
  }

  assertChuttamalleDuration(input.duration);

  if (!CHUTTAMALLE_RESOLUTIONS.includes(input.resolution)) {
    throw new ChuttamallePreflightError('Unsupported MiniMax H3 resolution');
  }
  if (!CHUTTAMALLE_ASPECT_RATIOS.includes(input.aspectRatio)) {
    throw new ChuttamallePreflightError('Unsupported aspect ratio');
  }
  if (!PROMPT_EXPANSION_MODES.has(input.promptExpansionMode)) {
    throw new ChuttamallePreflightError('Unsupported prompt expansion mode');
  }

  assertHttpUrl(input.videoUrl, 'Reference video URL');
  if (
    !Array.isArray(input.imageUrls) ||
    input.imageUrls.length < 1 ||
    input.imageUrls.length > CHUTTAMALLE_MAX_REFERENCE_IMAGES
  ) {
    throw new ChuttamallePreflightError('Provide one or two reference images');
  }
  input.imageUrls.forEach((url, index) =>
    assertHttpUrl(url, `Reference image ${index + 1} URL`)
  );

  return { ...input, prompt };
}

export async function submitChuttamalle(input: {
  prompt: string;
  duration: number;
  resolution: ChuttamalleResolution;
  aspectRatio: ChuttamalleAspectRatio;
  promptExpansionMode: ChuttamallePromptExpansionMode;
  videoUrl: string;
  imageUrls: string[];
}) {
  const normalized = validateChuttamalleInput(input);
  const provider = await getFalProvider();

  const result = await provider.generate({
    params: {
      mediaType: AIMediaType.VIDEO,
      model: CHUTTAMALLE_MODEL,
      prompt: normalized.prompt,
      options: {
        duration: normalized.duration,
        resolution: normalized.resolution,
        enable_safety_checker: true,
        sync_mode: false,
        prompt_expansion_mode: normalized.promptExpansionMode,
        aspect_ratio: normalized.aspectRatio,
        reference_image_urls: normalized.imageUrls,
        reference_video_urls: [normalized.videoUrl],
      },
    },
  });

  return {
    requestId: result.taskId,
    status: result.taskStatus,
  };
}

export async function getChuttamalleProviderStatus(requestId: string) {
  if (!/^[A-Za-z0-9._:-]{6,200}$/.test(requestId.trim())) {
    throw new ChuttamallePreflightError('Invalid request ID');
  }

  const provider = await getFalProvider();
  const result = await provider.query?.({
    taskId: requestId,
    model: CHUTTAMALLE_MODEL,
    mediaType: AIMediaType.VIDEO,
  });

  if (!result) throw new Error('Fal status lookup is unavailable');

  if (result.taskStatus === AITaskStatus.SUCCESS) {
    const videoUrl = result.taskInfo?.videos?.[0]?.videoUrl;
    if (!videoUrl) {
      return {
        status: 'failed' as const,
        providerStatus: 'completed',
        videoUrl: null,
        error: 'Fal completed the request without a video URL',
      };
    }
    return {
      status: 'completed' as const,
      providerStatus: 'completed',
      videoUrl,
    };
  }

  if (
    result.taskStatus === AITaskStatus.FAILED ||
    result.taskStatus === AITaskStatus.CANCELED
  ) {
    const payload = result.taskResult as Record<string, unknown> | undefined;
    const error =
      (typeof payload?.error === 'string' && payload.error) ||
      (typeof payload?.message === 'string' && payload.message) ||
      'MiniMax H3 generation failed';
    return {
      status: 'failed' as const,
      providerStatus: result.taskStatus,
      videoUrl: null,
      error,
    };
  }

  return {
    status: 'processing' as const,
    providerStatus: result.taskStatus,
    videoUrl: null,
  };
}
