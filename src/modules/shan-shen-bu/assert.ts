import {
  isShanShenBuResolution,
  LEGACY_SHAN_SHEN_BU_PROMPTS,
  SHAN_SHEN_BU_ASPECT_RATIO,
  SHAN_SHEN_BU_DEFAULT_PROMPT,
  SHAN_SHEN_BU_MODE,
  SHAN_SHEN_BU_PRODUCT_ID,
} from './constants';

const ALLOWED_PROMPTS = new Set<string>([
  SHAN_SHEN_BU_DEFAULT_PROMPT,
  ...LEGACY_SHAN_SHEN_BU_PROMPTS,
]);

export class ShanShenBuPreflightError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ShanShenBuPreflightError';
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

export function isAllowedShanShenBuPrompt(value: unknown): value is string {
  return typeof value === 'string' && ALLOWED_PROMPTS.has(value);
}

/**
 * Server-side product lock.
 *
 * Full run: fixed server R2 template (`useDefaultTemplate`), exactly one
 * reference image (the subject that replaces the elderly man), fixed prompt + 9:16 aspect.
 *
 * Preview: same prompt/aspect/product, but client uploads a trimmed ≤4s
 * template clip at 480p plus the one image — `preview: true`,
 * `useDefaultTemplate` must be false.
 */
export function assertShanShenBuInputs(options: TaskOptions | null) {
  if (!options || options.product !== SHAN_SHEN_BU_PRODUCT_ID) {
    throw new ShanShenBuPreflightError(
      'Shan Shen Bu generation is missing its product binding'
    );
  }

  if (options.mode != null && options.mode !== SHAN_SHEN_BU_MODE) {
    throw new ShanShenBuPreflightError(
      'Shan Shen Bu only supports objects-swap'
    );
  }

  if (!isAllowedShanShenBuPrompt(options.prompt)) {
    throw new ShanShenBuPreflightError(
      'Shan Shen Bu prompt does not match the fixed product prompt'
    );
  }

  if (options.aspectRatio !== SHAN_SHEN_BU_ASPECT_RATIO) {
    throw new ShanShenBuPreflightError(
      'Shan Shen Bu requires a fixed 9:16 aspect ratio'
    );
  }

  if (
    options.resolution != null &&
    !isShanShenBuResolution(options.resolution)
  ) {
    throw new ShanShenBuPreflightError(
      'Shan Shen Bu only supports 480p and 720p'
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
      throw new ShanShenBuPreflightError(
        'Shan Shen Bu preview must upload a trimmed template clip'
      );
    }
    if (typeof options.videoKey !== 'string' || !options.videoKey) {
      throw new ShanShenBuPreflightError(
        'Shan Shen Bu preview is missing the trimmed template video'
      );
    }
    if (options.resolution != null && options.resolution !== '480p') {
      throw new ShanShenBuPreflightError(
        'Shan Shen Bu preview must use 480p resolution'
      );
    }
    if (imageKeys.length !== 1) {
      throw new ShanShenBuPreflightError(
        'Shan Shen Bu preview requires exactly one reference image'
      );
    }
    if (contentTypes.length !== 2 || contentLengths.length !== 2) {
      throw new ShanShenBuPreflightError(
        'Shan Shen Bu preview expects one trimmed video plus one reference image'
      );
    }
    const videoType = contentTypes[0];
    if (typeof videoType !== 'string' || !videoType.startsWith('video/')) {
      throw new ShanShenBuPreflightError(
        'Shan Shen Bu preview source must be a video'
      );
    }
    const imageType = contentTypes[1];
    if (typeof imageType !== 'string' || !imageType.startsWith('image/')) {
      throw new ShanShenBuPreflightError(
        'Shan Shen Bu reference must be an image'
      );
    }
    return;
  }

  if (options.useDefaultTemplate !== true) {
    throw new ShanShenBuPreflightError(
      'Shan Shen Bu must use the server-controlled template'
    );
  }

  if (imageKeys.length !== 1) {
    throw new ShanShenBuPreflightError(
      'Shan Shen Bu requires exactly one reference image'
    );
  }

  if (contentTypes.length !== 1 || contentLengths.length !== 1) {
    throw new ShanShenBuPreflightError(
      'Shan Shen Bu expects exactly one reference image (template is server-owned)'
    );
  }

  const type = contentTypes[0];
  if (typeof type !== 'string' || !type.startsWith('image/')) {
    throw new ShanShenBuPreflightError(
      'Shan Shen Bu reference must be an image'
    );
  }
}
