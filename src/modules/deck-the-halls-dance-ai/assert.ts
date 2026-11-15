import {
  DECK_THE_HALLS_DANCE_AI_ASPECT_RATIO,
  DECK_THE_HALLS_DANCE_AI_DEFAULT_CAST_MODE,
  DECK_THE_HALLS_DANCE_AI_DUO_PROMPT,
  DECK_THE_HALLS_DANCE_AI_MODE,
  DECK_THE_HALLS_DANCE_AI_PRODUCT_ID,
  DECK_THE_HALLS_DANCE_AI_SOLO_PROMPT,
  getDeckTheHallsDanceAiCastModeForPrompt,
  getDeckTheHallsDanceAiImageCount,
  getDeckTheHallsDanceAiPrompt,
  isDeckTheHallsDanceAiCastMode,
  isDeckTheHallsDanceAiResolution,
  LEGACY_DECK_THE_HALLS_DANCE_AI_PROMPTS,
  type DeckTheHallsDanceAiCastMode,
} from './constants';

const ALLOWED_PROMPTS = new Set<string>([
  DECK_THE_HALLS_DANCE_AI_SOLO_PROMPT,
  DECK_THE_HALLS_DANCE_AI_DUO_PROMPT,
  ...LEGACY_DECK_THE_HALLS_DANCE_AI_PROMPTS,
]);

export class DeckTheHallsDanceAiPreflightError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DeckTheHallsDanceAiPreflightError';
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
  /** Persisted cast mode (`solo` | `duo`) via upload-url `preset`. */
  preset?: unknown;
};

export function isAllowedDeckTheHallsDanceAiPrompt(
  value: unknown
): value is string {
  return typeof value === 'string' && ALLOWED_PROMPTS.has(value);
}

export function resolveDeckTheHallsDanceAiCastMode(
  options: TaskOptions | null | undefined
): DeckTheHallsDanceAiCastMode {
  if (isDeckTheHallsDanceAiCastMode(options?.preset)) {
    return options.preset;
  }
  const fromPrompt = getDeckTheHallsDanceAiCastModeForPrompt(options?.prompt);
  if (fromPrompt) return fromPrompt;
  return DECK_THE_HALLS_DANCE_AI_DEFAULT_CAST_MODE;
}

/**
 * Server-side product lock.
 *
 * Full run: fixed server R2 template (`useDefaultTemplate`), 1 image (solo) or
 * 2 images (duo), fixed prompt for that cast + 9:16 aspect.
 * Preview: trimmed ≤4s clip at 480p + the cast's reference image(s).
 */
export function assertDeckTheHallsDanceAiInputs(options: TaskOptions | null) {
  if (!options || options.product !== DECK_THE_HALLS_DANCE_AI_PRODUCT_ID) {
    throw new DeckTheHallsDanceAiPreflightError(
      'Deck the Halls Dance AI generation is missing its product binding'
    );
  }

  if (options.mode != null && options.mode !== DECK_THE_HALLS_DANCE_AI_MODE) {
    throw new DeckTheHallsDanceAiPreflightError(
      'Deck the Halls Dance AI only supports objects-swap'
    );
  }

  if (!isAllowedDeckTheHallsDanceAiPrompt(options.prompt)) {
    throw new DeckTheHallsDanceAiPreflightError(
      'Deck the Halls Dance AI prompt does not match the fixed product prompt'
    );
  }

  const castMode = resolveDeckTheHallsDanceAiCastMode(options);
  if (options.prompt !== getDeckTheHallsDanceAiPrompt(castMode)) {
    throw new DeckTheHallsDanceAiPreflightError(
      'Deck the Halls Dance AI prompt does not match the selected cast mode'
    );
  }

  if (options.aspectRatio !== DECK_THE_HALLS_DANCE_AI_ASPECT_RATIO) {
    throw new DeckTheHallsDanceAiPreflightError(
      'Deck the Halls Dance AI requires a fixed 9:16 aspect ratio'
    );
  }

  if (
    options.resolution != null &&
    !isDeckTheHallsDanceAiResolution(options.resolution)
  ) {
    throw new DeckTheHallsDanceAiPreflightError(
      'Deck the Halls Dance AI only supports 480p and 720p'
    );
  }

  const imageKeys = Array.isArray(options.imageKeys) ? options.imageKeys : [];
  const contentTypes = Array.isArray(options.contentTypes)
    ? options.contentTypes
    : [];
  const contentLengths = Array.isArray(options.contentLengths)
    ? options.contentLengths
    : [];
  const expectedImages = getDeckTheHallsDanceAiImageCount(castMode);
  const isPreview = options.preview === true;

  if (isPreview) {
    if (options.useDefaultTemplate === true) {
      throw new DeckTheHallsDanceAiPreflightError(
        'Deck the Halls Dance AI preview must upload a trimmed template clip'
      );
    }
    if (typeof options.videoKey !== 'string' || !options.videoKey) {
      throw new DeckTheHallsDanceAiPreflightError(
        'Deck the Halls Dance AI preview is missing the trimmed template video'
      );
    }
    if (options.resolution != null && options.resolution !== '480p') {
      throw new DeckTheHallsDanceAiPreflightError(
        'Deck the Halls Dance AI preview must use 480p resolution'
      );
    }
    if (imageKeys.length !== expectedImages) {
      throw new DeckTheHallsDanceAiPreflightError(
        castMode === 'duo'
          ? 'Deck the Halls Dance AI duo preview requires exactly two reference images'
          : 'Deck the Halls Dance AI solo preview requires exactly one reference image'
      );
    }
    const expectedUploads = expectedImages + 1;
    if (
      contentTypes.length !== expectedUploads ||
      contentLengths.length !== expectedUploads
    ) {
      throw new DeckTheHallsDanceAiPreflightError(
        castMode === 'duo'
          ? 'Deck the Halls Dance AI duo preview expects one trimmed video plus two reference images'
          : 'Deck the Halls Dance AI solo preview expects one trimmed video plus one reference image'
      );
    }
    const videoType = contentTypes[0];
    if (typeof videoType !== 'string' || !videoType.startsWith('video/')) {
      throw new DeckTheHallsDanceAiPreflightError(
        'Deck the Halls Dance AI preview source must be a video'
      );
    }
    for (let i = 1; i < expectedUploads; i += 1) {
      const imageType = contentTypes[i];
      if (typeof imageType !== 'string' || !imageType.startsWith('image/')) {
        throw new DeckTheHallsDanceAiPreflightError(
          'Deck the Halls Dance AI reference must be an image'
        );
      }
    }
    return;
  }

  if (options.useDefaultTemplate !== true) {
    throw new DeckTheHallsDanceAiPreflightError(
      'Deck the Halls Dance AI must use the server-controlled template'
    );
  }

  if (imageKeys.length !== expectedImages) {
    throw new DeckTheHallsDanceAiPreflightError(
      castMode === 'duo'
        ? 'Deck the Halls Dance AI duo requires exactly two reference images'
        : 'Deck the Halls Dance AI solo requires exactly one reference image'
    );
  }

  if (
    contentTypes.length !== expectedImages ||
    contentLengths.length !== expectedImages
  ) {
    throw new DeckTheHallsDanceAiPreflightError(
      castMode === 'duo'
        ? 'Deck the Halls Dance AI duo expects exactly two reference images (template is server-owned)'
        : 'Deck the Halls Dance AI solo expects exactly one reference image (template is server-owned)'
    );
  }

  for (const type of contentTypes) {
    if (typeof type !== 'string' || !type.startsWith('image/')) {
      throw new DeckTheHallsDanceAiPreflightError(
        'Deck the Halls Dance AI reference must be an image'
      );
    }
  }
}
