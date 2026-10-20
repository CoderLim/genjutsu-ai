import {
  COLDPLAY_KISS_CAM_ASPECT_RATIO,
  COLDPLAY_KISS_CAM_DEFAULT_PROMPT,
  COLDPLAY_KISS_CAM_MODE,
  COLDPLAY_KISS_CAM_PRODUCT_ID,
  isColdplayKissCamResolution,
  LEGACY_COLDPLAY_KISS_CAM_PROMPTS,
} from './constants';

const ALLOWED_PROMPTS = new Set<string>([
  COLDPLAY_KISS_CAM_DEFAULT_PROMPT,
  ...LEGACY_COLDPLAY_KISS_CAM_PROMPTS,
]);

export class ColdplayKissCamPreflightError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ColdplayKissCamPreflightError';
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

export function isAllowedColdplayKissCamPrompt(
  value: unknown
): value is string {
  return typeof value === 'string' && ALLOWED_PROMPTS.has(value);
}

export function assertColdplayKissCamInputs(options: TaskOptions | null) {
  if (!options || options.product !== COLDPLAY_KISS_CAM_PRODUCT_ID) {
    throw new ColdplayKissCamPreflightError(
      'Coldplay Kiss Cam generation is missing its product binding'
    );
  }

  if (options.mode != null && options.mode !== COLDPLAY_KISS_CAM_MODE) {
    throw new ColdplayKissCamPreflightError(
      'Coldplay Kiss Cam only supports objects-swap'
    );
  }

  if (!isAllowedColdplayKissCamPrompt(options.prompt)) {
    throw new ColdplayKissCamPreflightError(
      'Coldplay Kiss Cam prompt does not match the fixed product prompt'
    );
  }

  if (options.aspectRatio !== COLDPLAY_KISS_CAM_ASPECT_RATIO) {
    throw new ColdplayKissCamPreflightError(
      'Coldplay Kiss Cam requires a fixed 9:16 aspect ratio'
    );
  }

  if (
    options.resolution != null &&
    !isColdplayKissCamResolution(options.resolution)
  ) {
    throw new ColdplayKissCamPreflightError(
      'Coldplay Kiss Cam only supports 480p and 720p'
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
      throw new ColdplayKissCamPreflightError(
        'Coldplay Kiss Cam preview must upload a trimmed template clip'
      );
    }
    if (typeof options.videoKey !== 'string' || !options.videoKey) {
      throw new ColdplayKissCamPreflightError(
        'Coldplay Kiss Cam preview is missing the trimmed template video'
      );
    }
    if (options.resolution != null && options.resolution !== '480p') {
      throw new ColdplayKissCamPreflightError(
        'Coldplay Kiss Cam preview must use 480p resolution'
      );
    }
    if (imageKeys.length !== 2) {
      throw new ColdplayKissCamPreflightError(
        'Coldplay Kiss Cam preview requires exactly two reference images'
      );
    }
    if (contentTypes.length !== 3 || contentLengths.length !== 3) {
      throw new ColdplayKissCamPreflightError(
        'Coldplay Kiss Cam preview expects one trimmed video plus two reference images'
      );
    }
    const videoType = contentTypes[0];
    if (typeof videoType !== 'string' || !videoType.startsWith('video/')) {
      throw new ColdplayKissCamPreflightError(
        'Coldplay Kiss Cam preview source must be a video'
      );
    }
    for (let i = 1; i < 3; i += 1) {
      const type = contentTypes[i];
      if (typeof type !== 'string' || !type.startsWith('image/')) {
        throw new ColdplayKissCamPreflightError(
          'Coldplay Kiss Cam references must be images'
        );
      }
    }
    return;
  }

  if (options.useDefaultTemplate !== true) {
    throw new ColdplayKissCamPreflightError(
      'Coldplay Kiss Cam must use the server-controlled template'
    );
  }

  if (imageKeys.length !== 2) {
    throw new ColdplayKissCamPreflightError(
      'Coldplay Kiss Cam requires exactly two reference images'
    );
  }

  if (contentTypes.length !== 2 || contentLengths.length !== 2) {
    throw new ColdplayKissCamPreflightError(
      'Coldplay Kiss Cam expects exactly two reference images (template is server-owned)'
    );
  }

  for (let i = 0; i < 2; i += 1) {
    const type = contentTypes[i];
    if (typeof type !== 'string' || !type.startsWith('image/')) {
      throw new ColdplayKissCamPreflightError(
        'Coldplay Kiss Cam references must be images'
      );
    }
  }
}
