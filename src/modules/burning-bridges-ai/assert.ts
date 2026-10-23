import {
  BURNING_BRIDGES_AI_ASPECT_RATIO,
  BURNING_BRIDGES_AI_DEFAULT_PROMPT,
  BURNING_BRIDGES_AI_MODE,
  BURNING_BRIDGES_AI_PRODUCT_ID,
  isBurningBridgesAiResolution,
  LEGACY_BURNING_BRIDGES_AI_PROMPTS,
} from './constants';

const ALLOWED_PROMPTS = new Set<string>([
  BURNING_BRIDGES_AI_DEFAULT_PROMPT,
  ...LEGACY_BURNING_BRIDGES_AI_PROMPTS,
]);

export class BurningBridgesAiPreflightError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'BurningBridgesAiPreflightError';
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

export function isAllowedBurningBridgesAiPrompt(
  value: unknown
): value is string {
  return typeof value === 'string' && ALLOWED_PROMPTS.has(value);
}

/**
 * Server-side product lock.
 *
 * Full run: fixed server R2 template (`useDefaultTemplate`), exactly one
 * reference image (the lead to replace), fixed prompt + 16:9 aspect.
 *
 * Preview: same prompt/aspect/product, but client uploads a trimmed ≤4s
 * `useDefaultTemplate` must be false.
 */
export function assertBurningBridgesAiInputs(options: TaskOptions | null) {
  if (!options || options.product !== BURNING_BRIDGES_AI_PRODUCT_ID) {
    throw new BurningBridgesAiPreflightError(
      'Burning Bridges AI generation is missing its product binding'
    );
  }

  if (options.mode != null && options.mode !== BURNING_BRIDGES_AI_MODE) {
    throw new BurningBridgesAiPreflightError(
      'Burning Bridges AI only supports objects-swap'
    );
  }

  if (!isAllowedBurningBridgesAiPrompt(options.prompt)) {
    throw new BurningBridgesAiPreflightError(
      'Burning Bridges AI prompt does not match the fixed product prompt'
    );
  }

  if (options.aspectRatio !== BURNING_BRIDGES_AI_ASPECT_RATIO) {
    throw new BurningBridgesAiPreflightError(
      'Burning Bridges AI requires a fixed 16:9 aspect ratio'
    );
  }

  if (
    options.resolution != null &&
    !isBurningBridgesAiResolution(options.resolution)
  ) {
    throw new BurningBridgesAiPreflightError(
      'Burning Bridges AI only supports 480p and 720p'
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
    throw new BurningBridgesAiPreflightError(
      'Paid preview is no longer supported'
    );
  }

  if (options.useDefaultTemplate !== true) {
    throw new BurningBridgesAiPreflightError(
      'Burning Bridges AI must use the server-controlled template'
    );
  }

  if (imageKeys.length !== 1) {
    throw new BurningBridgesAiPreflightError(
      'Burning Bridges AI requires exactly one reference image'
    );
  }

  if (contentTypes.length !== 1 || contentLengths.length !== 1) {
    throw new BurningBridgesAiPreflightError(
      'Burning Bridges AI expects exactly one reference image (template is server-owned)'
    );
  }

  const type = contentTypes[0];
  if (typeof type !== 'string' || !type.startsWith('image/')) {
    throw new BurningBridgesAiPreflightError(
      'Burning Bridges AI reference must be an image'
    );
  }
}
