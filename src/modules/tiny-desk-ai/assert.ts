import {
  buildTinyDeskAiPrompt,
  isTinyDeskAiImageCount,
  isTinyDeskAiResolution,
  LEGACY_TINY_DESK_AI_PROMPTS,
  TINY_DESK_AI_ASPECT_RATIO,
  TINY_DESK_AI_MAX_IMAGES,
  TINY_DESK_AI_MIN_IMAGES,
  TINY_DESK_AI_MODE,
  TINY_DESK_AI_PRODUCT_ID,
  TINY_DESK_AI_PROMPTS_BY_COUNT,
} from './constants';

const ALLOWED_PROMPTS = new Set<string>([
  ...Object.values(TINY_DESK_AI_PROMPTS_BY_COUNT),
  ...LEGACY_TINY_DESK_AI_PROMPTS,
]);

export class TinyDeskAiPreflightError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TinyDeskAiPreflightError';
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

export function isAllowedTinyDeskAiPrompt(value: unknown): value is string {
  return typeof value === 'string' && ALLOWED_PROMPTS.has(value);
}

function assertImageTypes(contentTypes: unknown[], startIndex: number) {
  for (let i = startIndex; i < contentTypes.length; i += 1) {
    const type = contentTypes[i];
    if (typeof type !== 'string' || !type.startsWith('image/')) {
      throw new TinyDeskAiPreflightError(
        'Tiny Desk AI references must be images'
      );
    }
  }
}

/**
 * Server-side product lock.
 *
 * Full run: fixed server R2 template (`useDefaultTemplate`), 1–5 contiguous
 * reference images (lead → backing L → backing R → harmony → sax), prompt must
 * match `buildTinyDeskAiPrompt(imageCount)`, fixed 9:16 aspect.
 *
 * Preview: trimmed ≤4s clip at 480p + the same 1–5 images.
 */
export function assertTinyDeskAiInputs(options: TaskOptions | null) {
  if (!options || options.product !== TINY_DESK_AI_PRODUCT_ID) {
    throw new TinyDeskAiPreflightError(
      'Tiny Desk AI generation is missing its product binding'
    );
  }

  if (options.mode != null && options.mode !== TINY_DESK_AI_MODE) {
    throw new TinyDeskAiPreflightError(
      'Tiny Desk AI only supports objects-swap'
    );
  }

  if (!isAllowedTinyDeskAiPrompt(options.prompt)) {
    throw new TinyDeskAiPreflightError(
      'Tiny Desk AI prompt does not match the fixed product prompt'
    );
  }

  if (options.aspectRatio !== TINY_DESK_AI_ASPECT_RATIO) {
    throw new TinyDeskAiPreflightError(
      'Tiny Desk AI requires a fixed 9:16 aspect ratio'
    );
  }

  if (
    options.resolution != null &&
    !isTinyDeskAiResolution(options.resolution)
  ) {
    throw new TinyDeskAiPreflightError(
      'Tiny Desk AI only supports 480p and 720p'
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

  if (
    !isTinyDeskAiImageCount(imageKeys.length) ||
    imageKeys.length < TINY_DESK_AI_MIN_IMAGES ||
    imageKeys.length > TINY_DESK_AI_MAX_IMAGES
  ) {
    throw new TinyDeskAiPreflightError(
      'Tiny Desk AI requires between 1 and 5 reference images'
    );
  }

  const expectedPrompt = buildTinyDeskAiPrompt(imageKeys.length);
  const isLegacySolo =
    imageKeys.length === 1 &&
    LEGACY_TINY_DESK_AI_PROMPTS.includes(
      options.prompt as (typeof LEGACY_TINY_DESK_AI_PROMPTS)[number]
    );
  if (options.prompt !== expectedPrompt && !isLegacySolo) {
    throw new TinyDeskAiPreflightError(
      'Tiny Desk AI prompt does not match the uploaded cast size'
    );
  }

  if (isPreview) {
    if (options.useDefaultTemplate === true) {
      throw new TinyDeskAiPreflightError(
        'Tiny Desk AI preview must upload a trimmed template clip'
      );
    }
    if (typeof options.videoKey !== 'string' || !options.videoKey) {
      throw new TinyDeskAiPreflightError(
        'Tiny Desk AI preview is missing the trimmed template video'
      );
    }
    if (options.resolution != null && options.resolution !== '480p') {
      throw new TinyDeskAiPreflightError(
        'Tiny Desk AI preview must use 480p resolution'
      );
    }
    const expectedLen = imageKeys.length + 1;
    if (
      contentTypes.length !== expectedLen ||
      contentLengths.length !== expectedLen
    ) {
      throw new TinyDeskAiPreflightError(
        'Tiny Desk AI preview expects one trimmed video plus 1–5 reference images'
      );
    }
    const videoType = contentTypes[0];
    if (typeof videoType !== 'string' || !videoType.startsWith('video/')) {
      throw new TinyDeskAiPreflightError(
        'Tiny Desk AI preview source must be a video'
      );
    }
    assertImageTypes(contentTypes, 1);
    return;
  }

  if (options.useDefaultTemplate !== true) {
    throw new TinyDeskAiPreflightError(
      'Tiny Desk AI must use the server-controlled template'
    );
  }

  if (
    contentTypes.length !== imageKeys.length ||
    contentLengths.length !== imageKeys.length
  ) {
    throw new TinyDeskAiPreflightError(
      'Tiny Desk AI expects 1–5 reference images (template is server-owned)'
    );
  }

  assertImageTypes(contentTypes, 0);
}
