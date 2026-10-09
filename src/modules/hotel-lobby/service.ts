import {
  AIMediaType,
  AITaskStatus,
  FalProvider,
  isFalPermanentQueryFailure,
} from '@/core/ai';
import { getConfig } from '@/modules/config/service';

import {
  assertH3LabDuration,
  assertHotelLobbyDuration,
  H3_LAB_MODEL,
  H3_MAX_PROMPT_LENGTH,
  H3_MAX_REFERENCE_IMAGES,
  HOTEL_LOBBY_ASPECT_RATIOS,
  HOTEL_LOBBY_MAX_PROMPT_LENGTH,
  HOTEL_LOBBY_MAX_REFERENCE_IMAGES,
  HOTEL_LOBBY_MODEL,
  HOTEL_LOBBY_RESOLUTIONS,
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

/**
 * Kling O3 prompt — reference video as @Video1 and subjects as @ElementN
 * (https://fal.ai/models/fal-ai/kling-video/o3/standard/video-to-video/edit).
 *
 * Keep this short and imperative like Fal's playground examples. Long
 * "preserve everything" wording tends to leave original performers in place
 * (especially for a second Element).
 */
export function buildHotelLobbyPrompt(imageCount: number) {
  if (imageCount === 1) {
    return [
      'Use @Video1 only for motion, timing, gestures, camera, framing, microphone, orange booth, and shot progression.',
      'Change every visible performer in @Video1 to be the subject from @Element1. Match face, hair, body, clothing, and species from @Element1 for the whole clip.',
      'Keep the booth, microphone, choreography, and background from @Video1. Do not add extra people.',
    ].join(' ');
  }

  if (imageCount === 2) {
    return [
      'Use @Video1 only for motion, timing, gestures, camera, framing, microphone, orange booth, and shot progression.',
      'Change the left performer in @Video1 to be the person or character from @Element1.',
      'Change the right performer in @Video1 to be the person or character from @Element2 — do not keep the original right performer.',
      'Match each side to its Element for face, hair, body, clothing, and species throughout the clip. Do not swap left/right or blend the two identities.',
      'Keep the booth, microphone, choreography, and background from @Video1.',
    ].join(' ');
  }

  throw new HotelLobbyPreflightError(
    'Hotel Lobby requires one or two reference images'
  );
}

function buildKlingElements(imageUrls: string[]) {
  return imageUrls.map((url) => ({
    frontal_image_url: url,
    // Kling requires at least one reference image per element; reuse frontal.
    reference_image_urls: [url],
  }));
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
  videoUrl: string;
  imageUrls: string[];
  maxReferenceImages?: number;
}) {
  const prompt = input.prompt.trim();
  if (!prompt) throw new HotelLobbyPreflightError('Prompt is required');
  if (prompt.length > HOTEL_LOBBY_MAX_PROMPT_LENGTH) {
    throw new HotelLobbyPreflightError(
      `Prompt is too long (max ${HOTEL_LOBBY_MAX_PROMPT_LENGTH} characters)`
    );
  }

  assertHotelLobbyDuration(input.duration);

  const maxReferenceImages =
    input.maxReferenceImages ?? HOTEL_LOBBY_MAX_REFERENCE_IMAGES;
  if (
    !Number.isInteger(maxReferenceImages) ||
    maxReferenceImages < 1 ||
    maxReferenceImages > HOTEL_LOBBY_MAX_REFERENCE_IMAGES
  ) {
    throw new HotelLobbyPreflightError('Invalid max reference-image count');
  }

  assertHttpUrl(input.videoUrl, 'Reference video URL');
  if (
    !Array.isArray(input.imageUrls) ||
    input.imageUrls.length < 1 ||
    input.imageUrls.length > maxReferenceImages
  ) {
    throw new HotelLobbyPreflightError(
      `Provide between 1 and ${maxReferenceImages} reference images`
    );
  }
  input.imageUrls.forEach((url, index) =>
    assertHttpUrl(url, `Reference image ${index + 1} URL`)
  );

  return {
    ...input,
    prompt,
    maxReferenceImages,
  };
}

export async function submitHotelLobby(input: {
  prompt: string;
  duration: number;
  videoUrl: string;
  imageUrls: string[];
  maxReferenceImages?: number;
  /** @deprecated Ignored — Kling O3 has no resolution / expansion options. */
  resolution?: HotelLobbyResolution;
  aspectRatio?: HotelLobbyAspectRatio;
  promptExpansionMode?: HotelLobbyPromptExpansionMode;
  enableSafetyChecker?: boolean;
}) {
  const normalized = validateHotelLobbyInput(input);
  const provider = await getFalProvider();

  const result = await provider.generate({
    params: {
      mediaType: AIMediaType.VIDEO,
      model: HOTEL_LOBBY_MODEL,
      prompt: normalized.prompt,
      options: {
        video_url: normalized.videoUrl,
        elements: buildKlingElements(normalized.imageUrls),
        keep_audio: true,
        shot_type: 'customize',
      },
    },
  });

  return {
    requestId: result.taskId,
    status: result.taskStatus,
  };
}

/** Internal H3 lab — MiniMax H3 reference-to-video (unchanged payload). */
export function validateH3LabInput(input: {
  prompt: string;
  duration: number;
  resolution: HotelLobbyResolution;
  aspectRatio: HotelLobbyAspectRatio;
  promptExpansionMode: HotelLobbyPromptExpansionMode;
  videoUrl: string;
  imageUrls: string[];
  enableSafetyChecker?: boolean;
  maxReferenceImages?: number;
}) {
  const prompt = input.prompt.trim();
  if (!prompt) throw new HotelLobbyPreflightError('Prompt is required');
  if (prompt.length > H3_MAX_PROMPT_LENGTH) {
    throw new HotelLobbyPreflightError(
      `Prompt is too long (max ${H3_MAX_PROMPT_LENGTH} characters)`
    );
  }

  assertH3LabDuration(input.duration);

  if (!HOTEL_LOBBY_RESOLUTIONS.includes(input.resolution)) {
    throw new HotelLobbyPreflightError('Unsupported MiniMax H3 resolution');
  }
  if (!HOTEL_LOBBY_ASPECT_RATIOS.includes(input.aspectRatio)) {
    throw new HotelLobbyPreflightError('Unsupported aspect ratio');
  }
  if (!PROMPT_EXPANSION_MODES.has(input.promptExpansionMode)) {
    throw new HotelLobbyPreflightError('Unsupported prompt expansion mode');
  }

  const maxReferenceImages =
    input.maxReferenceImages ?? H3_MAX_REFERENCE_IMAGES;
  if (
    !Number.isInteger(maxReferenceImages) ||
    maxReferenceImages < 1 ||
    maxReferenceImages > H3_MAX_REFERENCE_IMAGES
  ) {
    throw new HotelLobbyPreflightError('Invalid max reference-image count');
  }

  assertHttpUrl(input.videoUrl, 'Reference video URL');
  if (
    !Array.isArray(input.imageUrls) ||
    input.imageUrls.length < 1 ||
    input.imageUrls.length > maxReferenceImages
  ) {
    throw new HotelLobbyPreflightError(
      `Provide between 1 and ${maxReferenceImages} reference images`
    );
  }
  input.imageUrls.forEach((url, index) =>
    assertHttpUrl(url, `Reference image ${index + 1} URL`)
  );

  return {
    ...input,
    prompt,
    enableSafetyChecker: input.enableSafetyChecker !== false,
    maxReferenceImages,
  };
}

export async function submitH3Lab(input: {
  prompt: string;
  duration: number;
  resolution: HotelLobbyResolution;
  aspectRatio: HotelLobbyAspectRatio;
  promptExpansionMode: HotelLobbyPromptExpansionMode;
  videoUrl: string;
  imageUrls: string[];
  enableSafetyChecker?: boolean;
  maxReferenceImages?: number;
}) {
  const normalized = validateH3LabInput(input);
  const provider = await getFalProvider();

  const result = await provider.generate({
    params: {
      mediaType: AIMediaType.VIDEO,
      model: H3_LAB_MODEL,
      prompt: normalized.prompt,
      options: {
        duration: normalized.duration,
        resolution: normalized.resolution,
        enable_safety_checker: normalized.enableSafetyChecker,
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

export async function getHotelLobbyProviderStatus(
  requestId: string,
  model: string = HOTEL_LOBBY_MODEL
) {
  if (!/^[A-Za-z0-9._:-]{6,200}$/.test(requestId.trim())) {
    throw new HotelLobbyPreflightError('Invalid request ID');
  }

  const provider = await getFalProvider();
  const result = await provider.query?.({
    taskId: requestId,
    model,
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
      (typeof result.taskInfo?.errorMessage === 'string' &&
        result.taskInfo.errorMessage) ||
      (typeof payload?.message === 'string' && payload.message) ||
      'Video generation failed';

    // Permanent status/result lookup failures are not confirmed model fails —
    // hold credits for manual recovery instead of auto-refunding.
    if (isFalPermanentQueryFailure(result.taskInfo)) {
      return {
        status: 'unresolved' as const,
        providerStatus: result.taskInfo?.status || 'QUERY_PERMANENT_ERROR',
        videoUrl: null,
        error,
      };
    }

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
