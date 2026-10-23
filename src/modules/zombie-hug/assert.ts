import {
  isZombieHugAspectRatio,
  isZombieHugResolution,
  LEGACY_ZOMBIE_HUG_PROMPTS,
  ZOMBIE_HUG_DEFAULT_PROMPT,
  ZOMBIE_HUG_MODE,
  ZOMBIE_HUG_PRODUCT_ID,
} from './constants';

const ALLOWED_PROMPTS = new Set<string>([
  ZOMBIE_HUG_DEFAULT_PROMPT,
  ...LEGACY_ZOMBIE_HUG_PROMPTS,
]);

export class ZombieHugPreflightError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ZombieHugPreflightError';
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

export function isAllowedZombieHugPrompt(value: unknown): value is string {
  return typeof value === 'string' && ALLOWED_PROMPTS.has(value);
}

export function assertZombieHugInputs(options: TaskOptions | null) {
  if (!options || options.product !== ZOMBIE_HUG_PRODUCT_ID) {
    throw new ZombieHugPreflightError(
      'Zombie Hug generation is missing its product binding'
    );
  }

  if (options.mode != null && options.mode !== ZOMBIE_HUG_MODE) {
    throw new ZombieHugPreflightError('Zombie Hug only supports objects-swap');
  }

  if (!isAllowedZombieHugPrompt(options.prompt)) {
    throw new ZombieHugPreflightError(
      'Zombie Hug prompt does not match the fixed product prompt'
    );
  }

  if (!isZombieHugAspectRatio(options.aspectRatio)) {
    throw new ZombieHugPreflightError(
      'Zombie Hug requires aspect ratio 16:9 or 9:16'
    );
  }

  if (
    options.resolution != null &&
    !isZombieHugResolution(options.resolution)
  ) {
    throw new ZombieHugPreflightError('Zombie Hug only supports 480p and 720p');
  }

  const imageKeys = Array.isArray(options.imageKeys) ? options.imageKeys : [];
  const contentTypes = Array.isArray(options.contentTypes)
    ? options.contentTypes
    : [];
  const contentLengths = Array.isArray(options.contentLengths)
    ? options.contentLengths
    : [];
  if (options.preview === true) {
    throw new ZombieHugPreflightError('Paid preview is no longer supported');
  }

  if (options.useDefaultTemplate !== true) {
    throw new ZombieHugPreflightError(
      'Zombie Hug must use the server-controlled template'
    );
  }

  if (imageKeys.length !== 2) {
    throw new ZombieHugPreflightError(
      'Zombie Hug requires exactly two reference images'
    );
  }

  if (contentTypes.length !== 2 || contentLengths.length !== 2) {
    throw new ZombieHugPreflightError(
      'Zombie Hug expects exactly two reference images (template is server-owned)'
    );
  }

  for (let i = 0; i < 2; i += 1) {
    const type = contentTypes[i];
    if (typeof type !== 'string' || !type.startsWith('image/')) {
      throw new ZombieHugPreflightError('Zombie Hug references must be images');
    }
  }
}
