import {
  GANGNAM_STYLE_AI_ASPECT_RATIO,
  GANGNAM_STYLE_AI_DEFAULT_PROMPT,
  GANGNAM_STYLE_AI_MODE,
  GANGNAM_STYLE_AI_PRODUCT_ID,
  isGangnamStyleAiResolution,
  LEGACY_GANGNAM_STYLE_AI_PROMPTS,
} from './constants';

const ALLOWED_PROMPTS = new Set<string>([
  GANGNAM_STYLE_AI_DEFAULT_PROMPT,
  ...LEGACY_GANGNAM_STYLE_AI_PROMPTS,
]);

export class GangnamStyleAiPreflightError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'GangnamStyleAiPreflightError';
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

export function isAllowedGangnamStyleAiPrompt(value: unknown): value is string {
  return typeof value === 'string' && ALLOWED_PROMPTS.has(value);
}

export function assertGangnamStyleAiInputs(options: TaskOptions | null) {
  if (!options || options.product !== GANGNAM_STYLE_AI_PRODUCT_ID) {
    throw new GangnamStyleAiPreflightError(
      'Gangnam Style AI generation is missing its product binding'
    );
  }

  if (options.mode != null && options.mode !== GANGNAM_STYLE_AI_MODE) {
    throw new GangnamStyleAiPreflightError(
      'Gangnam Style AI only supports objects-swap'
    );
  }

  if (!isAllowedGangnamStyleAiPrompt(options.prompt)) {
    throw new GangnamStyleAiPreflightError(
      'Gangnam Style AI prompt does not match the fixed product prompt'
    );
  }

  if (options.aspectRatio !== GANGNAM_STYLE_AI_ASPECT_RATIO) {
    throw new GangnamStyleAiPreflightError(
      'Gangnam Style AI requires a fixed 16:9 aspect ratio'
    );
  }

  if (
    options.resolution != null &&
    !isGangnamStyleAiResolution(options.resolution)
  ) {
    throw new GangnamStyleAiPreflightError(
      'Gangnam Style AI only supports 480p and 720p'
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
    throw new GangnamStyleAiPreflightError(
      'Paid preview is no longer supported'
    );
  }

  if (options.useDefaultTemplate !== true) {
    throw new GangnamStyleAiPreflightError(
      'Gangnam Style AI must use the server-controlled template'
    );
  }

  if (imageKeys.length !== 3) {
    throw new GangnamStyleAiPreflightError(
      'Gangnam Style AI requires exactly three reference images'
    );
  }

  if (contentTypes.length !== 3 || contentLengths.length !== 3) {
    throw new GangnamStyleAiPreflightError(
      'Gangnam Style AI expects exactly three reference images (template is server-owned)'
    );
  }

  for (let i = 0; i < 3; i += 1) {
    const type = contentTypes[i];
    if (typeof type !== 'string' || !type.startsWith('image/')) {
      throw new GangnamStyleAiPreflightError(
        'Gangnam Style AI references must be images'
      );
    }
  }
}
