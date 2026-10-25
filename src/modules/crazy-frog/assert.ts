import {
  CRAZY_FROG_ASPECT_RATIO,
  CRAZY_FROG_DEFAULT_PROMPT,
  CRAZY_FROG_PRODUCT_ID,
  isCrazyFrogResolution,
  LEGACY_CRAZY_FROG_PROMPTS,
} from './constants';

const ALLOWED_PROMPTS = new Set<string>([
  ...LEGACY_CRAZY_FROG_PROMPTS,
  CRAZY_FROG_DEFAULT_PROMPT,
]);

export class CrazyFrogPreflightError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CrazyFrogPreflightError';
  }
}

type TaskOptions = {
  product?: unknown;
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

function assertSharedCrazyFrogLocks(options: TaskOptions) {
  if (
    typeof options.prompt !== 'string' ||
    !ALLOWED_PROMPTS.has(options.prompt)
  ) {
    throw new CrazyFrogPreflightError(
      'Crazy Frog prompt does not match the fixed product prompt'
    );
  }

  if (options.aspectRatio !== CRAZY_FROG_ASPECT_RATIO) {
    throw new CrazyFrogPreflightError(
      'Crazy Frog requires a fixed 4:3 aspect ratio'
    );
  }

  if (
    options.resolution != null &&
    !isCrazyFrogResolution(options.resolution)
  ) {
    throw new CrazyFrogPreflightError('Crazy Frog only supports 480p and 720p');
  }
}

/**
 * Server-side product lock.
 *
 * Full run: fixed server R2 template (`useDefaultTemplate`), exactly two
 * reference images (lead then chaser), fixed prompt + 4:3 aspect.
 *
 * Preview: same prompt/aspect/product, but client uploads a trimmed ≤4s
 * template clip at 480p (homepage Genjutsu preview semantics) plus the two
 * images — `preview: true`, `useDefaultTemplate` must be false.
 */
export function assertCrazyFrogInputs(options: TaskOptions | null) {
  if (!options || options.product !== CRAZY_FROG_PRODUCT_ID) {
    throw new CrazyFrogPreflightError(
      'Crazy Frog generation is missing its product binding'
    );
  }

  assertSharedCrazyFrogLocks(options);

  const isPreview = options.preview === true;
  const imageKeys = Array.isArray(options.imageKeys) ? options.imageKeys : [];
  const contentTypes = Array.isArray(options.contentTypes)
    ? options.contentTypes
    : [];
  const contentLengths = Array.isArray(options.contentLengths)
    ? options.contentLengths
    : [];

  if (isPreview) {
    if (options.useDefaultTemplate === true) {
      throw new CrazyFrogPreflightError(
        'Crazy Frog preview must upload a trimmed template clip'
      );
    }
    if (typeof options.videoKey !== 'string' || !options.videoKey) {
      throw new CrazyFrogPreflightError(
        'Crazy Frog preview is missing the trimmed template video'
      );
    }
    if (options.resolution != null && options.resolution !== '480p') {
      throw new CrazyFrogPreflightError(
        'Crazy Frog preview must use 480p resolution'
      );
    }
    if (imageKeys.length !== 2) {
      throw new CrazyFrogPreflightError(
        'Crazy Frog preview requires exactly two reference images (lead and chaser)'
      );
    }
    // Index 0 = trimmed video; 1–2 = lead + chaser images.
    if (contentTypes.length !== 3 || contentLengths.length !== 3) {
      throw new CrazyFrogPreflightError(
        'Crazy Frog preview expects one trimmed video plus two reference images'
      );
    }
    const videoType = contentTypes[0];
    if (typeof videoType !== 'string' || !videoType.startsWith('video/')) {
      throw new CrazyFrogPreflightError(
        'Crazy Frog preview source must be a video'
      );
    }
    for (let i = 1; i < 3; i += 1) {
      const type = contentTypes[i];
      if (typeof type !== 'string' || !type.startsWith('image/')) {
        throw new CrazyFrogPreflightError(
          'Crazy Frog references must be images'
        );
      }
    }
    return;
  }

  if (options.useDefaultTemplate !== true) {
    throw new CrazyFrogPreflightError(
      'Crazy Frog must use the server-controlled template'
    );
  }

  if (imageKeys.length !== 2) {
    throw new CrazyFrogPreflightError(
      'Crazy Frog requires exactly two reference images (lead and chaser)'
    );
  }

  if (contentTypes.length !== 2 || contentLengths.length !== 2) {
    throw new CrazyFrogPreflightError(
      'Crazy Frog expects exactly two reference images (template is server-owned)'
    );
  }

  for (let i = 0; i < 2; i += 1) {
    const type = contentTypes[i];
    if (typeof type !== 'string' || !type.startsWith('image/')) {
      throw new CrazyFrogPreflightError('Crazy Frog references must be images');
    }
  }
}
