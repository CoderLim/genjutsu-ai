import {
  isSayItRightAiResolution,
  LEGACY_SAY_IT_RIGHT_AI_PROMPTS,
  SAY_IT_RIGHT_AI_ASPECT_RATIO,
  SAY_IT_RIGHT_AI_DEFAULT_PROMPT,
  SAY_IT_RIGHT_AI_MODE,
  SAY_IT_RIGHT_AI_PRODUCT_ID,
} from './constants';

const ALLOWED_PROMPTS = new Set<string>([
  SAY_IT_RIGHT_AI_DEFAULT_PROMPT,
  ...LEGACY_SAY_IT_RIGHT_AI_PROMPTS,
]);

export class SayItRightAiPreflightError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SayItRightAiPreflightError';
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

export function isAllowedSayItRightAiPrompt(value: unknown): value is string {
  return typeof value === 'string' && ALLOWED_PROMPTS.has(value);
}

/**
 * Server-side product lock.
 *
 * Full run: fixed server R2 template (`useDefaultTemplate`), exactly one
 * reference image (the pink-T lead to replace), fixed prompt + 9:16 aspect.
 */
export function assertSayItRightAiInputs(options: TaskOptions | null) {
  if (!options || options.product !== SAY_IT_RIGHT_AI_PRODUCT_ID) {
    throw new SayItRightAiPreflightError(
      'Say It Right AI generation is missing its product binding'
    );
  }

  if (options.mode != null && options.mode !== SAY_IT_RIGHT_AI_MODE) {
    throw new SayItRightAiPreflightError(
      'Say It Right AI only supports objects-swap'
    );
  }

  if (!isAllowedSayItRightAiPrompt(options.prompt)) {
    throw new SayItRightAiPreflightError(
      'Say It Right AI prompt does not match the fixed product prompt'
    );
  }

  if (options.aspectRatio !== SAY_IT_RIGHT_AI_ASPECT_RATIO) {
    throw new SayItRightAiPreflightError(
      'Say It Right AI requires a fixed 9:16 aspect ratio'
    );
  }

  if (
    options.resolution != null &&
    !isSayItRightAiResolution(options.resolution)
  ) {
    throw new SayItRightAiPreflightError(
      'Say It Right AI only supports 480p and 720p'
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
    throw new SayItRightAiPreflightError('Paid preview is no longer supported');
  }

  if (options.useDefaultTemplate !== true) {
    throw new SayItRightAiPreflightError(
      'Say It Right AI must use the server-controlled template'
    );
  }

  if (imageKeys.length !== 1) {
    throw new SayItRightAiPreflightError(
      'Say It Right AI requires exactly one reference image'
    );
  }

  if (contentTypes.length !== 1 || contentLengths.length !== 1) {
    throw new SayItRightAiPreflightError(
      'Say It Right AI expects exactly one reference image (template is server-owned)'
    );
  }

  const type = contentTypes[0];
  if (typeof type !== 'string' || !type.startsWith('image/')) {
    throw new SayItRightAiPreflightError(
      'Say It Right AI reference must be an image'
    );
  }
}
