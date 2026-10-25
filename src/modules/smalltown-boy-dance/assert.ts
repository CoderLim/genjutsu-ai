import {
  isSmalltownResolution,
  LEGACY_SMALLTOWN_PROMPTS,
  SMALLTOWN_ASPECT_RATIO,
  SMALLTOWN_DEFAULT_PROMPT,
  SMALLTOWN_PRODUCT_ID,
} from './constants';

const ALLOWED_PROMPTS = new Set<string>([
  ...LEGACY_SMALLTOWN_PROMPTS,
  SMALLTOWN_DEFAULT_PROMPT,
]);

export class SmalltownBoyDancePreflightError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SmalltownBoyDancePreflightError';
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

/**
 * Server-side product lock: fixed server R2 template (useDefaultTemplate),
 * exactly two reference images (front then back), fixed prompt + 3:4 aspect.
 * Template identity comes from the trusted R2 key — not client size/name.
 *
 * Preview (`?showpreview=1`): client uploads a trimmed ≤4s template clip at
 * 480p plus the two images — `preview: true`, `useDefaultTemplate` omitted.
 */
export function assertSmalltownBoyDanceInputs(options: TaskOptions | null) {
  if (!options || options.product !== SMALLTOWN_PRODUCT_ID) {
    throw new SmalltownBoyDancePreflightError(
      'Smalltown Boy Dance generation is missing its product binding'
    );
  }

  if (
    typeof options.prompt !== 'string' ||
    !ALLOWED_PROMPTS.has(options.prompt)
  ) {
    throw new SmalltownBoyDancePreflightError(
      'Smalltown Boy Dance prompt does not match the fixed product prompt'
    );
  }

  if (options.aspectRatio !== SMALLTOWN_ASPECT_RATIO) {
    throw new SmalltownBoyDancePreflightError(
      'Smalltown Boy Dance requires a fixed 3:4 aspect ratio'
    );
  }

  if (
    options.resolution != null &&
    !isSmalltownResolution(options.resolution)
  ) {
    throw new SmalltownBoyDancePreflightError(
      'Smalltown Boy Dance only supports 480p and 720p'
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
      throw new SmalltownBoyDancePreflightError(
        'Smalltown Boy Dance preview must upload a trimmed template clip'
      );
    }
    if (typeof options.videoKey !== 'string' || !options.videoKey) {
      throw new SmalltownBoyDancePreflightError(
        'Smalltown Boy Dance preview is missing the trimmed template video'
      );
    }
    if (options.resolution != null && options.resolution !== '480p') {
      throw new SmalltownBoyDancePreflightError(
        'Smalltown Boy Dance preview must use 480p resolution'
      );
    }
    if (imageKeys.length !== 2) {
      throw new SmalltownBoyDancePreflightError(
        'Smalltown Boy Dance preview requires exactly two reference images (front and back)'
      );
    }
    // Index 0 = trimmed video; 1–2 = front + back images.
    if (contentTypes.length !== 3 || contentLengths.length !== 3) {
      throw new SmalltownBoyDancePreflightError(
        'Smalltown Boy Dance preview expects one trimmed video plus two reference images'
      );
    }
    const videoType = contentTypes[0];
    if (typeof videoType !== 'string' || !videoType.startsWith('video/')) {
      throw new SmalltownBoyDancePreflightError(
        'Smalltown Boy Dance preview source must be a video'
      );
    }
    for (let i = 1; i < 3; i += 1) {
      const type = contentTypes[i];
      if (typeof type !== 'string' || !type.startsWith('image/')) {
        throw new SmalltownBoyDancePreflightError(
          'Smalltown Boy Dance references must be images'
        );
      }
    }
    return;
  }

  if (options.useDefaultTemplate !== true) {
    throw new SmalltownBoyDancePreflightError(
      'Smalltown Boy Dance must use the server-controlled template'
    );
  }

  if (imageKeys.length !== 2) {
    throw new SmalltownBoyDancePreflightError(
      'Smalltown Boy Dance requires exactly two reference images (front and back)'
    );
  }

  if (contentTypes.length !== 2 || contentLengths.length !== 2) {
    throw new SmalltownBoyDancePreflightError(
      'Smalltown Boy Dance expects exactly two reference images (template is server-owned)'
    );
  }

  for (let i = 0; i < 2; i += 1) {
    const type = contentTypes[i];
    if (typeof type !== 'string' || !type.startsWith('image/')) {
      throw new SmalltownBoyDancePreflightError(
        'Smalltown Boy Dance references must be images'
      );
    }
  }
}
