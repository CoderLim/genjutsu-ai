import {
  A2O_LITE_AI_ASPECT_RATIO,
  A2O_LITE_AI_DEFAULT_PROMPT,
  A2O_LITE_AI_MODE,
  A2O_LITE_AI_PRODUCT_ID,
  isA2oLiteAiResolution,
  LEGACY_A2O_LITE_AI_PROMPTS,
} from './constants';

const ALLOWED_PROMPTS = new Set<string>([
  A2O_LITE_AI_DEFAULT_PROMPT,
  ...LEGACY_A2O_LITE_AI_PROMPTS,
]);

export class A2oLiteAiPreflightError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'A2oLiteAiPreflightError';
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

export function isAllowedA2oLiteAiPrompt(value: unknown): value is string {
  return typeof value === 'string' && ALLOWED_PROMPTS.has(value);
}

export function assertA2oLiteAiInputs(options: TaskOptions | null) {
  if (!options || options.product !== A2O_LITE_AI_PRODUCT_ID) {
    throw new A2oLiteAiPreflightError(
      'A2O Lite AI generation is missing its product binding'
    );
  }

  if (options.mode != null && options.mode !== A2O_LITE_AI_MODE) {
    throw new A2oLiteAiPreflightError('A2O Lite AI only supports objects-swap');
  }

  if (!isAllowedA2oLiteAiPrompt(options.prompt)) {
    throw new A2oLiteAiPreflightError(
      'A2O Lite AI prompt does not match the fixed product prompt'
    );
  }

  if (options.aspectRatio !== A2O_LITE_AI_ASPECT_RATIO) {
    throw new A2oLiteAiPreflightError(
      'A2O Lite AI requires a fixed 16:9 aspect ratio'
    );
  }

  if (
    options.resolution != null &&
    !isA2oLiteAiResolution(options.resolution)
  ) {
    throw new A2oLiteAiPreflightError(
      'A2O Lite AI only supports 480p and 720p'
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
      throw new A2oLiteAiPreflightError(
        'A2O Lite AI preview must upload a trimmed template clip'
      );
    }
    if (typeof options.videoKey !== 'string' || !options.videoKey) {
      throw new A2oLiteAiPreflightError(
        'A2O Lite AI preview is missing the trimmed template video'
      );
    }
    if (options.resolution != null && options.resolution !== '480p') {
      throw new A2oLiteAiPreflightError(
        'A2O Lite AI preview must use 480p resolution'
      );
    }
    if (imageKeys.length !== 2) {
      throw new A2oLiteAiPreflightError(
        'A2O Lite AI preview requires exactly two reference images'
      );
    }
    if (contentTypes.length !== 3 || contentLengths.length !== 3) {
      throw new A2oLiteAiPreflightError(
        'A2O Lite AI preview expects one trimmed video plus two reference images'
      );
    }
    const videoType = contentTypes[0];
    if (typeof videoType !== 'string' || !videoType.startsWith('video/')) {
      throw new A2oLiteAiPreflightError(
        'A2O Lite AI preview source must be a video'
      );
    }
    for (let i = 1; i < 3; i += 1) {
      const type = contentTypes[i];
      if (typeof type !== 'string' || !type.startsWith('image/')) {
        throw new A2oLiteAiPreflightError(
          'A2O Lite AI references must be images'
        );
      }
    }
    return;
  }

  if (options.useDefaultTemplate !== true) {
    throw new A2oLiteAiPreflightError(
      'A2O Lite AI must use the server-controlled template'
    );
  }

  if (imageKeys.length !== 2) {
    throw new A2oLiteAiPreflightError(
      'A2O Lite AI requires exactly two reference images'
    );
  }

  if (contentTypes.length !== 2 || contentLengths.length !== 2) {
    throw new A2oLiteAiPreflightError(
      'A2O Lite AI expects exactly two reference images (template is server-owned)'
    );
  }

  for (let i = 0; i < 2; i += 1) {
    const type = contentTypes[i];
    if (typeof type !== 'string' || !type.startsWith('image/')) {
      throw new A2oLiteAiPreflightError(
        'A2O Lite AI references must be images'
      );
    }
  }
}
