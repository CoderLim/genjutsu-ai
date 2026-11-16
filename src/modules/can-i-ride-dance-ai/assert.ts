import {
  CAN_I_RIDE_DANCE_AI_ASPECT_RATIO,
  CAN_I_RIDE_DANCE_AI_DEFAULT_CAST_MODE,
  CAN_I_RIDE_DANCE_AI_DUO_PROMPT,
  CAN_I_RIDE_DANCE_AI_MODE,
  CAN_I_RIDE_DANCE_AI_PRODUCT_ID,
  CAN_I_RIDE_DANCE_AI_SOLO_PROMPT,
  getCanIRideDanceAiCastModeForPrompt,
  getCanIRideDanceAiImageCount,
  getCanIRideDanceAiPrompt,
  isCanIRideDanceAiCastMode,
  isCanIRideDanceAiResolution,
  LEGACY_CAN_I_RIDE_DANCE_AI_PROMPTS,
  type CanIRideDanceAiCastMode,
} from './constants';

const ALLOWED_PROMPTS = new Set<string>([
  CAN_I_RIDE_DANCE_AI_SOLO_PROMPT,
  CAN_I_RIDE_DANCE_AI_DUO_PROMPT,
  ...LEGACY_CAN_I_RIDE_DANCE_AI_PROMPTS,
]);

export class CanIRideDanceAiPreflightError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CanIRideDanceAiPreflightError';
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

export function isAllowedCanIRideDanceAiPrompt(
  value: unknown
): value is string {
  return typeof value === 'string' && ALLOWED_PROMPTS.has(value);
}

export function resolveCanIRideDanceAiCastMode(
  options: TaskOptions | null | undefined
): CanIRideDanceAiCastMode {
  if (isCanIRideDanceAiCastMode(options?.preset)) {
    return options.preset;
  }
  const fromPrompt = getCanIRideDanceAiCastModeForPrompt(options?.prompt);
  if (fromPrompt) return fromPrompt;
  return CAN_I_RIDE_DANCE_AI_DEFAULT_CAST_MODE;
}

/**
 * Server-side product lock.
 *
 * Full run: fixed server R2 template (`useDefaultTemplate`), 1 image (solo) or
 * 2 images (duo), fixed prompt for that cast + 9:16 aspect.
 * Preview: trimmed ≤4s clip at 480p + the cast's reference image(s).
 */
export function assertCanIRideDanceAiInputs(options: TaskOptions | null) {
  if (!options || options.product !== CAN_I_RIDE_DANCE_AI_PRODUCT_ID) {
    throw new CanIRideDanceAiPreflightError(
      'Can I Ride Dance AI generation is missing its product binding'
    );
  }

  if (options.mode != null && options.mode !== CAN_I_RIDE_DANCE_AI_MODE) {
    throw new CanIRideDanceAiPreflightError(
      'Can I Ride Dance AI only supports objects-swap'
    );
  }

  if (!isAllowedCanIRideDanceAiPrompt(options.prompt)) {
    throw new CanIRideDanceAiPreflightError(
      'Can I Ride Dance AI prompt does not match the fixed product prompt'
    );
  }

  const castMode = resolveCanIRideDanceAiCastMode(options);
  if (options.prompt !== getCanIRideDanceAiPrompt(castMode)) {
    throw new CanIRideDanceAiPreflightError(
      'Can I Ride Dance AI prompt does not match the selected cast mode'
    );
  }

  if (options.aspectRatio !== CAN_I_RIDE_DANCE_AI_ASPECT_RATIO) {
    throw new CanIRideDanceAiPreflightError(
      'Can I Ride Dance AI requires a fixed 9:16 aspect ratio'
    );
  }

  if (
    options.resolution != null &&
    !isCanIRideDanceAiResolution(options.resolution)
  ) {
    throw new CanIRideDanceAiPreflightError(
      'Can I Ride Dance AI only supports 480p and 720p'
    );
  }

  const imageKeys = Array.isArray(options.imageKeys) ? options.imageKeys : [];
  const contentTypes = Array.isArray(options.contentTypes)
    ? options.contentTypes
    : [];
  const contentLengths = Array.isArray(options.contentLengths)
    ? options.contentLengths
    : [];
  const expectedImages = getCanIRideDanceAiImageCount(castMode);
  const isPreview = options.preview === true;

  if (isPreview) {
    if (options.useDefaultTemplate === true) {
      throw new CanIRideDanceAiPreflightError(
        'Can I Ride Dance AI preview must upload a trimmed template clip'
      );
    }
    if (typeof options.videoKey !== 'string' || !options.videoKey) {
      throw new CanIRideDanceAiPreflightError(
        'Can I Ride Dance AI preview is missing the trimmed template video'
      );
    }
    if (options.resolution != null && options.resolution !== '480p') {
      throw new CanIRideDanceAiPreflightError(
        'Can I Ride Dance AI preview must use 480p resolution'
      );
    }
    if (imageKeys.length !== expectedImages) {
      throw new CanIRideDanceAiPreflightError(
        castMode === 'duo'
          ? 'Can I Ride Dance AI duo preview requires exactly two reference images'
          : 'Can I Ride Dance AI solo preview requires exactly one reference image'
      );
    }
    const expectedUploads = expectedImages + 1;
    if (
      contentTypes.length !== expectedUploads ||
      contentLengths.length !== expectedUploads
    ) {
      throw new CanIRideDanceAiPreflightError(
        castMode === 'duo'
          ? 'Can I Ride Dance AI duo preview expects one trimmed video plus two reference images'
          : 'Can I Ride Dance AI solo preview expects one trimmed video plus one reference image'
      );
    }
    const videoType = contentTypes[0];
    if (typeof videoType !== 'string' || !videoType.startsWith('video/')) {
      throw new CanIRideDanceAiPreflightError(
        'Can I Ride Dance AI preview source must be a video'
      );
    }
    for (let i = 1; i < expectedUploads; i += 1) {
      const imageType = contentTypes[i];
      if (typeof imageType !== 'string' || !imageType.startsWith('image/')) {
        throw new CanIRideDanceAiPreflightError(
          'Can I Ride Dance AI reference must be an image'
        );
      }
    }
    return;
  }

  if (options.useDefaultTemplate !== true) {
    throw new CanIRideDanceAiPreflightError(
      'Can I Ride Dance AI must use the server-controlled template'
    );
  }

  if (imageKeys.length !== expectedImages) {
    throw new CanIRideDanceAiPreflightError(
      castMode === 'duo'
        ? 'Can I Ride Dance AI duo requires exactly two reference images'
        : 'Can I Ride Dance AI solo requires exactly one reference image'
    );
  }

  if (
    contentTypes.length !== expectedImages ||
    contentLengths.length !== expectedImages
  ) {
    throw new CanIRideDanceAiPreflightError(
      castMode === 'duo'
        ? 'Can I Ride Dance AI duo expects exactly two reference images (template is server-owned)'
        : 'Can I Ride Dance AI solo expects exactly one reference image (template is server-owned)'
    );
  }

  for (const type of contentTypes) {
    if (typeof type !== 'string' || !type.startsWith('image/')) {
      throw new CanIRideDanceAiPreflightError(
        'Can I Ride Dance AI reference must be an image'
      );
    }
  }
}
