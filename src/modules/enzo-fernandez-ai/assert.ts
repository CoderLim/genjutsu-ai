import {
  ENZO_FERNANDEZ_AI_ASPECT_RATIO,
  ENZO_FERNANDEZ_AI_DEFAULT_PROMPT,
  ENZO_FERNANDEZ_AI_MODE,
  ENZO_FERNANDEZ_AI_PRODUCT_ID,
  isEnzoFernandezAiResolution,
  LEGACY_ENZO_FERNANDEZ_AI_PROMPTS,
} from './constants';

const ALLOWED_PROMPTS = new Set<string>([
  ENZO_FERNANDEZ_AI_DEFAULT_PROMPT,
  ...LEGACY_ENZO_FERNANDEZ_AI_PROMPTS,
]);

export class EnzoFernandezAiPreflightError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'EnzoFernandezAiPreflightError';
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

export function isAllowedEnzoFernandezAiPrompt(
  value: unknown
): value is string {
  return typeof value === 'string' && ALLOWED_PROMPTS.has(value);
}

/**
 * Server-side product lock.
 *
 * Full run: fixed server R2 template (`useDefaultTemplate`), exactly one
 * reference image (the woman to replace), fixed prompt + 4:3 aspect.
 *
 * Preview: same prompt/aspect/product, but client uploads a trimmed ≤4s
 * template clip at 480p plus the one image — `preview: true`,
 * `useDefaultTemplate` must be false.
 */
export function assertEnzoFernandezAiInputs(options: TaskOptions | null) {
  if (!options || options.product !== ENZO_FERNANDEZ_AI_PRODUCT_ID) {
    throw new EnzoFernandezAiPreflightError(
      'Enzo Fernandez AI generation is missing its product binding'
    );
  }

  if (options.mode != null && options.mode !== ENZO_FERNANDEZ_AI_MODE) {
    throw new EnzoFernandezAiPreflightError(
      'Enzo Fernandez AI only supports objects-swap'
    );
  }

  if (!isAllowedEnzoFernandezAiPrompt(options.prompt)) {
    throw new EnzoFernandezAiPreflightError(
      'Enzo Fernandez AI prompt does not match the fixed product prompt'
    );
  }

  if (options.aspectRatio !== ENZO_FERNANDEZ_AI_ASPECT_RATIO) {
    throw new EnzoFernandezAiPreflightError(
      'Enzo Fernandez AI requires a fixed 4:3 aspect ratio'
    );
  }

  if (
    options.resolution != null &&
    !isEnzoFernandezAiResolution(options.resolution)
  ) {
    throw new EnzoFernandezAiPreflightError(
      'Enzo Fernandez AI only supports 480p and 720p'
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
      throw new EnzoFernandezAiPreflightError(
        'Enzo Fernandez AI preview must upload a trimmed template clip'
      );
    }
    if (typeof options.videoKey !== 'string' || !options.videoKey) {
      throw new EnzoFernandezAiPreflightError(
        'Enzo Fernandez AI preview is missing the trimmed template video'
      );
    }
    if (options.resolution != null && options.resolution !== '480p') {
      throw new EnzoFernandezAiPreflightError(
        'Enzo Fernandez AI preview must use 480p resolution'
      );
    }
    if (imageKeys.length !== 1) {
      throw new EnzoFernandezAiPreflightError(
        'Enzo Fernandez AI preview requires exactly one reference image'
      );
    }
    if (contentTypes.length !== 2 || contentLengths.length !== 2) {
      throw new EnzoFernandezAiPreflightError(
        'Enzo Fernandez AI preview expects one trimmed video plus one reference image'
      );
    }
    const videoType = contentTypes[0];
    if (typeof videoType !== 'string' || !videoType.startsWith('video/')) {
      throw new EnzoFernandezAiPreflightError(
        'Enzo Fernandez AI preview source must be a video'
      );
    }
    const imageType = contentTypes[1];
    if (typeof imageType !== 'string' || !imageType.startsWith('image/')) {
      throw new EnzoFernandezAiPreflightError(
        'Enzo Fernandez AI reference must be an image'
      );
    }
    return;
  }

  if (options.useDefaultTemplate !== true) {
    throw new EnzoFernandezAiPreflightError(
      'Enzo Fernandez AI must use the server-controlled template'
    );
  }

  if (imageKeys.length !== 1) {
    throw new EnzoFernandezAiPreflightError(
      'Enzo Fernandez AI requires exactly one reference image'
    );
  }

  if (contentTypes.length !== 1 || contentLengths.length !== 1) {
    throw new EnzoFernandezAiPreflightError(
      'Enzo Fernandez AI expects exactly one reference image (template is server-owned)'
    );
  }

  const type = contentTypes[0];
  if (typeof type !== 'string' || !type.startsWith('image/')) {
    throw new EnzoFernandezAiPreflightError(
      'Enzo Fernandez AI reference must be an image'
    );
  }
}
