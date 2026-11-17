import {
  GTA_5_GOODBYE_AI_VIDEO_ASPECT_RATIO,
  GTA_5_GOODBYE_AI_VIDEO_DEFAULT_PROMPT,
  GTA_5_GOODBYE_AI_VIDEO_MODE,
  GTA_5_GOODBYE_AI_VIDEO_PRODUCT_ID,
  isGta5GoodbyeAiVideoResolution,
  LEGACY_GTA_5_GOODBYE_AI_VIDEO_PROMPTS,
} from './constants';

const ALLOWED_PROMPTS = new Set<string>([
  GTA_5_GOODBYE_AI_VIDEO_DEFAULT_PROMPT,
  ...LEGACY_GTA_5_GOODBYE_AI_VIDEO_PROMPTS,
]);

export class Gta5GoodbyeAiVideoPreflightError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'Gta5GoodbyeAiVideoPreflightError';
  }
}

type TaskOptions = {
  product?: unknown;
  mode?: unknown;
  prompt?: unknown;
  imageKeys?: unknown;
  contentTypes?: unknown;
  contentLengths?: unknown;
  useDefaultTemplate?: unknown;
  aspectRatio?: unknown;
  resolution?: unknown;
  preview?: unknown;
  videoKey?: unknown;
};

export function isAllowedGta5GoodbyeAiVideoPrompt(
  value: unknown
): value is string {
  return typeof value === 'string' && ALLOWED_PROMPTS.has(value);
}

/**
 * Server-side product lock.
 *
 * Full run: fixed server R2 template (`useDefaultTemplate`), exactly one
 * reference image (the woman to replace), fixed prompt + 9:16 aspect.
 *
 * Preview: same prompt/aspect/product, but client uploads a trimmed ≤4s
 * template clip at 480p plus the one image — `preview: true`,
 * `useDefaultTemplate` must be false.
 */
export function assertGta5GoodbyeAiVideoInputs(options: TaskOptions | null) {
  if (!options || options.product !== GTA_5_GOODBYE_AI_VIDEO_PRODUCT_ID) {
    throw new Gta5GoodbyeAiVideoPreflightError(
      'GTA 5 Goodbye AI Video generation is missing its product binding'
    );
  }

  if (options.mode != null && options.mode !== GTA_5_GOODBYE_AI_VIDEO_MODE) {
    throw new Gta5GoodbyeAiVideoPreflightError(
      'GTA 5 Goodbye AI Video only supports objects-swap'
    );
  }

  if (!isAllowedGta5GoodbyeAiVideoPrompt(options.prompt)) {
    throw new Gta5GoodbyeAiVideoPreflightError(
      'GTA 5 Goodbye AI Video prompt does not match the fixed product prompt'
    );
  }

  if (options.aspectRatio !== GTA_5_GOODBYE_AI_VIDEO_ASPECT_RATIO) {
    throw new Gta5GoodbyeAiVideoPreflightError(
      'GTA 5 Goodbye AI Video requires a fixed 9:16 aspect ratio'
    );
  }

  if (
    options.resolution != null &&
    !isGta5GoodbyeAiVideoResolution(options.resolution)
  ) {
    throw new Gta5GoodbyeAiVideoPreflightError(
      'GTA 5 Goodbye AI Video only supports 480p and 720p'
    );
  }

  const imageKeys = Array.isArray(options.imageKeys) ? options.imageKeys : [];
  const contentTypes = Array.isArray(options.contentTypes)
    ? options.contentTypes
    : [];
  const contentLengths = Array.isArray(options.contentLengths)
    ? options.contentLengths
    : [];
  const isPreview = options.preview === true;

  if (isPreview) {
    if (options.useDefaultTemplate === true) {
      throw new Gta5GoodbyeAiVideoPreflightError(
        'GTA 5 Goodbye AI Video preview must upload a trimmed template clip'
      );
    }
    if (typeof options.videoKey !== 'string' || !options.videoKey) {
      throw new Gta5GoodbyeAiVideoPreflightError(
        'GTA 5 Goodbye AI Video preview is missing the trimmed template video'
      );
    }
    if (options.resolution != null && options.resolution !== '480p') {
      throw new Gta5GoodbyeAiVideoPreflightError(
        'GTA 5 Goodbye AI Video preview must use 480p resolution'
      );
    }
    if (imageKeys.length !== 1) {
      throw new Gta5GoodbyeAiVideoPreflightError(
        'GTA 5 Goodbye AI Video preview requires exactly one reference image'
      );
    }
    if (contentTypes.length !== 2 || contentLengths.length !== 2) {
      throw new Gta5GoodbyeAiVideoPreflightError(
        'GTA 5 Goodbye AI Video preview expects one trimmed video plus one reference image'
      );
    }
    const videoType = contentTypes[0];
    if (typeof videoType !== 'string' || !videoType.startsWith('video/')) {
      throw new Gta5GoodbyeAiVideoPreflightError(
        'GTA 5 Goodbye AI Video preview source must be a video'
      );
    }
    const imageType = contentTypes[1];
    if (typeof imageType !== 'string' || !imageType.startsWith('image/')) {
      throw new Gta5GoodbyeAiVideoPreflightError(
        'GTA 5 Goodbye AI Video reference must be an image'
      );
    }
    return;
  }

  if (options.useDefaultTemplate !== true) {
    throw new Gta5GoodbyeAiVideoPreflightError(
      'GTA 5 Goodbye AI Video must use the server-controlled template'
    );
  }

  if (imageKeys.length !== 1) {
    throw new Gta5GoodbyeAiVideoPreflightError(
      'GTA 5 Goodbye AI Video requires exactly one reference image'
    );
  }

  if (contentTypes.length !== 1 || contentLengths.length !== 1) {
    throw new Gta5GoodbyeAiVideoPreflightError(
      'GTA 5 Goodbye AI Video expects exactly one reference image (template is server-owned)'
    );
  }

  const type = contentTypes[0];
  if (typeof type !== 'string' || !type.startsWith('image/')) {
    throw new Gta5GoodbyeAiVideoPreflightError(
      'GTA 5 Goodbye AI Video reference must be an image'
    );
  }
}
