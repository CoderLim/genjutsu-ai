import { AIMediaType, AITaskStatus, FalProvider } from '@/core/ai';
import { getConfig } from '@/modules/config/service';

import {
  HOTEL_LOBBY_ASPECT_RATIOS,
  HOTEL_LOBBY_MAX_REFERENCE_IMAGES,
  HOTEL_LOBBY_MODEL,
  HOTEL_LOBBY_RESOLUTIONS,
  assertHotelLobbyDuration,
  type HotelLobbyAspectRatio,
  type HotelLobbyResolution,
} from './pricing';

export type HotelLobbyPromptExpansionMode =
  | 'disabled'
  | 'fast'
  | 'balanced'
  | 'quality';

const PROMPT_EXPANSION_MODES = new Set<HotelLobbyPromptExpansionMode>([
  'disabled',
  'fast',
  'balanced',
  'quality',
]);

export class HotelLobbyPreflightError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'HotelLobbyPreflightError';
  }
}

async function getFalProvider() {
  const apiKey = (await getConfig('fal_api_key'))?.trim();
  if (!apiKey) {
    throw new HotelLobbyPreflightError(
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
    throw new HotelLobbyPreflightError(`${label} is not a valid URL`);
  }
}

export function validateHotelLobbyInput(input: {
  prompt: string;
  duration: number;
  resolution: HotelLobbyResolution;
  aspectRatio: HotelLobbyAspectRatio;
  promptExpansionMode: HotelLobbyPromptExpansionMode;
  videoUrl: string;
  imageUrls: string[];
}) {
  const prompt = input.prompt.trim();
  if (!prompt) throw new HotelLobbyPreflightError('Prompt is required');
  if (prompt.length > 4000) {
    throw new HotelLobbyPreflightError('Prompt is too long');
  }

  assertHotelLobbyDuration(input.duration);

  if (!HOTEL_LOBBY_RESOLUTIONS.includes(input.resolution)) {
    throw new HotelLobbyPreflightError('Unsupported MiniMax H3 resolution');
  }
  if (!HOTEL_LOBBY_ASPECT_RATIOS.includes(input.aspectRatio)) {
    throw new HotelLobbyPreflightError('Unsupported aspect ratio');
  }
  if (!PROMPT_EXPANSION_MODES.has(input.promptExpansionMode)) {
    throw new HotelLobbyPreflightError('Unsupported prompt expansion mode');
  }

  assertHttpUrl(input.videoUrl, 'Reference video URL');
  if (
    !Array.isArray(input.imageUrls) ||
    input.imageUrls.length < 1 ||
    input.imageUrls.length > HOTEL_LOBBY_MAX_REFERENCE_IMAGES
  ) {
    throw new HotelLobbyPreflightError(
      'Provide between 1 and 9 reference images'
    );
  }
  input.imageUrls.forEach((url, index) =>
    assertHttpUrl(url, `Reference image ${index + 1} URL`)
  );

  return { ...input, prompt };
}

export async function submitHotelLobby(input: {
  prompt: string;
  duration: number;
  resolution: HotelLobbyResolution;
  aspectRatio: HotelLobbyAspectRatio;
  promptExpansionMode: HotelLobbyPromptExpansionMode;
  videoUrl: string;
  imageUrls: string[];
}) {
  const normalized = validateHotelLobbyInput(input);
  const provider = await getFalProvider();

  const result = await provider.generate({
    params: {
      mediaType: AIMediaType.VIDEO,
      model: HOTEL_LOBBY_MODEL,
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

export async function getHotelLobbyProviderStatus(requestId: string) {
  if (!/^[A-Za-z0-9._:-]{6,200}$/.test(requestId.trim())) {
    throw new HotelLobbyPreflightError('Invalid request ID');
  }

  const provider = await getFalProvider();
  const result = await provider.query?.({
    taskId: requestId,
    model: HOTEL_LOBBY_MODEL,
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
