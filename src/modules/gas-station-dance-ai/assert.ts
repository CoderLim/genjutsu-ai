import {
  GAS_STATION_DANCE_AI_ASPECT_RATIO,
  GAS_STATION_DANCE_AI_DEFAULT_PROMPT,
  GAS_STATION_DANCE_AI_MODE,
  GAS_STATION_DANCE_AI_PRODUCT_ID,
  isGasStationDanceAiResolution,
  LEGACY_GAS_STATION_DANCE_AI_PROMPTS,
} from './constants';

const ALLOWED_PROMPTS = new Set<string>([
  GAS_STATION_DANCE_AI_DEFAULT_PROMPT,
  ...LEGACY_GAS_STATION_DANCE_AI_PROMPTS,
]);

export class GasStationDanceAiPreflightError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'GasStationDanceAiPreflightError';
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

export function isAllowedGasStationDanceAiPrompt(
  value: unknown
): value is string {
  return typeof value === 'string' && ALLOWED_PROMPTS.has(value);
}

export function assertGasStationDanceAiInputs(options: TaskOptions | null) {
  if (!options || options.product !== GAS_STATION_DANCE_AI_PRODUCT_ID) {
    throw new GasStationDanceAiPreflightError(
      'Gas Station Dance AI generation is missing its product binding'
    );
  }

  if (options.mode != null && options.mode !== GAS_STATION_DANCE_AI_MODE) {
    throw new GasStationDanceAiPreflightError(
      'Gas Station Dance AI only supports objects-swap'
    );
  }

  if (!isAllowedGasStationDanceAiPrompt(options.prompt)) {
    throw new GasStationDanceAiPreflightError(
      'Gas Station Dance AI prompt does not match the fixed product prompt'
    );
  }

  if (options.aspectRatio !== GAS_STATION_DANCE_AI_ASPECT_RATIO) {
    throw new GasStationDanceAiPreflightError(
      'Gas Station Dance AI requires a fixed 9:16 aspect ratio'
    );
  }

  if (
    options.resolution != null &&
    !isGasStationDanceAiResolution(options.resolution)
  ) {
    throw new GasStationDanceAiPreflightError(
      'Gas Station Dance AI only supports 480p and 720p'
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
      throw new GasStationDanceAiPreflightError(
        'Gas Station Dance AI preview must upload a trimmed template clip'
      );
    }
    if (typeof options.videoKey !== 'string' || !options.videoKey) {
      throw new GasStationDanceAiPreflightError(
        'Gas Station Dance AI preview is missing the trimmed template video'
      );
    }
    if (options.resolution != null && options.resolution !== '480p') {
      throw new GasStationDanceAiPreflightError(
        'Gas Station Dance AI preview must use 480p resolution'
      );
    }
    if (imageKeys.length !== 3) {
      throw new GasStationDanceAiPreflightError(
        'Gas Station Dance AI preview requires exactly three reference images'
      );
    }
    if (contentTypes.length !== 4 || contentLengths.length !== 4) {
      throw new GasStationDanceAiPreflightError(
        'Gas Station Dance AI preview expects one trimmed video plus three reference images'
      );
    }
    const videoType = contentTypes[0];
    if (typeof videoType !== 'string' || !videoType.startsWith('video/')) {
      throw new GasStationDanceAiPreflightError(
        'Gas Station Dance AI preview source must be a video'
      );
    }
    for (let i = 1; i < 4; i += 1) {
      const type = contentTypes[i];
      if (typeof type !== 'string' || !type.startsWith('image/')) {
        throw new GasStationDanceAiPreflightError(
          'Gas Station Dance AI references must be images'
        );
      }
    }
    return;
  }

  if (options.useDefaultTemplate !== true) {
    throw new GasStationDanceAiPreflightError(
      'Gas Station Dance AI must use the server-controlled template'
    );
  }

  if (imageKeys.length !== 3) {
    throw new GasStationDanceAiPreflightError(
      'Gas Station Dance AI requires exactly three reference images'
    );
  }

  if (contentTypes.length !== 3 || contentLengths.length !== 3) {
    throw new GasStationDanceAiPreflightError(
      'Gas Station Dance AI expects exactly three reference images (template is server-owned)'
    );
  }

  for (let i = 0; i < 3; i += 1) {
    const type = contentTypes[i];
    if (typeof type !== 'string' || !type.startsWith('image/')) {
      throw new GasStationDanceAiPreflightError(
        'Gas Station Dance AI references must be images'
      );
    }
  }
}
