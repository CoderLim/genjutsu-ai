import {
  FLYING_CAR_AI_ASPECT_RATIO,
  FLYING_CAR_AI_DEFAULT_PROMPT,
  FLYING_CAR_AI_MODE,
  FLYING_CAR_AI_PRODUCT_ID,
  isFlyingCarAiResolution,
  LEGACY_FLYING_CAR_AI_PROMPTS,
} from './constants';

const ALLOWED_PROMPTS = new Set<string>([
  FLYING_CAR_AI_DEFAULT_PROMPT,
  ...LEGACY_FLYING_CAR_AI_PROMPTS,
]);

export class FlyingCarAiPreflightError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'FlyingCarAiPreflightError';
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

export function isAllowedFlyingCarAiPrompt(value: unknown): value is string {
  return typeof value === 'string' && ALLOWED_PROMPTS.has(value);
}

/**
 * Server-side product lock.
 *
 * Full run: fixed server R2 template (`useDefaultTemplate`), exactly one
 * reference image (the subject that replaces the car), fixed prompt + 3:4 aspect.
 *
 * Preview: same prompt/aspect/product, but client uploads a trimmed ≤4s
 * `useDefaultTemplate` must be false.
 */
export function assertFlyingCarAiInputs(options: TaskOptions | null) {
  if (!options || options.product !== FLYING_CAR_AI_PRODUCT_ID) {
    throw new FlyingCarAiPreflightError(
      'Flying Car AI generation is missing its product binding'
    );
  }

  if (options.mode != null && options.mode !== FLYING_CAR_AI_MODE) {
    throw new FlyingCarAiPreflightError(
      'Flying Car AI only supports objects-swap'
    );
  }

  if (!isAllowedFlyingCarAiPrompt(options.prompt)) {
    throw new FlyingCarAiPreflightError(
      'Flying Car AI prompt does not match the fixed product prompt'
    );
  }

  if (options.aspectRatio !== FLYING_CAR_AI_ASPECT_RATIO) {
    throw new FlyingCarAiPreflightError(
      'Flying Car AI requires a fixed 3:4 aspect ratio'
    );
  }

  if (
    options.resolution != null &&
    !isFlyingCarAiResolution(options.resolution)
  ) {
    throw new FlyingCarAiPreflightError(
      'Flying Car AI only supports 480p and 720p'
    );
  }

  const imageKeys = Array.isArray(options.imageKeys) ? options.imageKeys : [];
  const contentTypes = Array.isArray(options.contentTypes)
    ? options.contentTypes
    : [];
  const contentLengths = Array.isArray(options.contentLengths)
    ? options.contentLengths
    : [];
  if (options.preview === true) {
    throw new FlyingCarAiPreflightError('Paid preview is no longer supported');
  }

  if (options.useDefaultTemplate !== true) {
    throw new FlyingCarAiPreflightError(
      'Flying Car AI must use the server-controlled template'
    );
  }

  if (imageKeys.length !== 1) {
    throw new FlyingCarAiPreflightError(
      'Flying Car AI requires exactly one reference image'
    );
  }

  if (contentTypes.length !== 1 || contentLengths.length !== 1) {
    throw new FlyingCarAiPreflightError(
      'Flying Car AI expects exactly one reference image (template is server-owned)'
    );
  }

  const type = contentTypes[0];
  if (typeof type !== 'string' || !type.startsWith('image/')) {
    throw new FlyingCarAiPreflightError(
      'Flying Car AI reference must be an image'
    );
  }
}
