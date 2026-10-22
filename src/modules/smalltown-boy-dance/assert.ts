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
};

/**
 * Server-side product lock: fixed server R2 template (useDefaultTemplate),
 * exactly two reference images (front then back), fixed prompt + 3:4 aspect.
 * Template identity comes from the trusted R2 key — not client size/name.
 */
export function assertSmalltownBoyDanceInputs(options: TaskOptions | null) {
  if (!options || options.product !== SMALLTOWN_PRODUCT_ID) {
    throw new SmalltownBoyDancePreflightError(
      'Smalltown Boy Dance generation is missing its product binding'
    );
  }

  if (options.useDefaultTemplate !== true) {
    throw new SmalltownBoyDancePreflightError(
      'Smalltown Boy Dance must use the server-controlled template'
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
  if (imageKeys.length !== 2) {
    throw new SmalltownBoyDancePreflightError(
      'Smalltown Boy Dance requires exactly two reference images (front and back)'
    );
  }

  const contentTypes = Array.isArray(options.contentTypes)
    ? options.contentTypes
    : [];
  const contentLengths = Array.isArray(options.contentLengths)
    ? options.contentLengths
    : [];

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
