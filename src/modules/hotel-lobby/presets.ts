import { envConfigs } from '@/config';

import type { HotelLobbyAspectRatio } from './pricing';
import { buildHotelLobbyPrompt, HotelLobbyPreflightError } from './prompt';

export const HOTEL_LOBBY_PRESET_ID = 'hotel-lobby' as const;
export const CRAZY_FROG_PRESET_ID = 'crazy-frog' as const;
export const RUMPELSTILTSKIN_PRESET_ID = 'rumpelstiltskin' as const;
export const BULIN_47_PRESET_ID = 'bulin-47' as const;

const DEFAULT_HOTEL_LOBBY_TEMPLATE_KEY = 'hotel-lobby/templates/default.mp4';
const CRAZY_FROG_TEMPLATE_KEY = 'hotel-lobby/templates/crazy-frog-v1.mp4';
const RUMPELSTILTSKIN_TEMPLATE_KEY =
  'hotel-lobby/templates/rumpelstiltskin-v1.mp4';
const BULIN_47_TEMPLATE_KEY = 'hotel-lobby/templates/bulin-47-v1.mp4';

function hotelLobbyTemplateVideoKey() {
  return (
    envConfigs.hotel_lobby_template_video_key?.trim() ||
    DEFAULT_HOTEL_LOBBY_TEMPLATE_KEY
  );
}

type HotelLobbyPresetDef = {
  id: string;
  version: number;
  /** Display name for My Creations / admin. */
  displayName: string;
  /** Credit ledger description while reserving. */
  creditDescription: string;
  templateVideoKey: string;
  /** Node-only seed from repo; Workers require the R2 key already present. */
  localTemplatePath?: string;
  previewUrl: string;
  posterUrl: string;
  downloadPrefix: string;
  imageCount: { min: number; max: number };
  allowCustomVideo: boolean;
  allowTrim: boolean;
  keepAudio: boolean;
  /** Stored in aiTask.options for admin/debug (not sent to Kling O3). */
  aspectRatio: HotelLobbyAspectRatio;
  enabled: boolean;
  promptFor: (imageCount: number) => string;
};

/**
 * Crazy Frog chase — Element1 = foreground lead (facing camera),
 * Element2 = chaser on the red vehicle behind.
 *
 * Same Kling O3 lesson as Hotel Lobby: short imperatives; "Use @Video1 only
 * for motion…"; explicit "do not keep the original …" on each role. Long
 * preserve-everything wording leaves original performers in place.
 */
export function buildCrazyFrogPrompt(imageCount: number) {
  if (imageCount !== 2) {
    throw new HotelLobbyPreflightError(
      'Crazy Frog requires exactly two reference images'
    );
  }
  return [
    'Use @Video1 only for motion, timing, gestures, camera, road, vehicle, and chase staging.',
    'Change the large foreground rider who faces the camera and points forward in @Video1 to be the person or character from @Element1 — do not keep the original foreground rider.',
    'Change the smaller person chasing behind on the red vehicle in @Video1 to be the person or character from @Element2 — do not keep the original chaser.',
    'Match each Element for face, hair, body, clothing, and species throughout the clip.',
    'Do not swap Element1 and Element2 or blend the two identities.',
  ].join(' ');
}

export function buildRumpelstiltskinPrompt(imageCount: number) {
  if (imageCount !== 1) {
    throw new HotelLobbyPreflightError(
      'Rumpelstiltskin requires exactly one reference image'
    );
  }
  return [
    'Use @Video1 only for motion, timing, gestures, camera, barn set, and tiptoe staging.',
    'Change the dancer in @Video1 who tiptoes and shushes to be the person or character from @Element1 — do not keep the original dancer.',
    'Match @Element1 for face, hair, body, clothing, and species throughout the clip.',
    'Keep the barn, shush gesture, camera path, and tiptoe timing from @Video1.',
  ].join(' ');
}

export function buildBulin47Prompt(imageCount: number) {
  if (imageCount !== 1) {
    throw new HotelLobbyPreflightError(
      'Bulin 47 requires exactly one reference image'
    );
  }
  return [
    'Use @Video1 only for motion, timing, gestures, camera, crowd, and freestyle staging.',
    'Change the freestyle performer in @Video1 to be the person or character from @Element1 — do not keep the original performer.',
    'Match @Element1 for face, hair, body, clothing, and species throughout the clip.',
    'Keep the freestyle moves, camera path, crowd, and timing from @Video1.',
  ].join(' ');
}

const PRESETS = {
  [HOTEL_LOBBY_PRESET_ID]: {
    id: HOTEL_LOBBY_PRESET_ID,
    version: 1,
    displayName: 'Hotel Lobby',
    creditDescription: 'Reserve credits for Hotel Lobby AI generation',
    get templateVideoKey() {
      return hotelLobbyTemplateVideoKey();
    },
    previewUrl: '/api/genjutsu/template?product=hotel-lobby',
    posterUrl: '/readme/hotel-lobby.jpg',
    localTemplatePath: 'public/videos/hotel-lobby-tpl.mp4',
    downloadPrefix: 'hotel-lobby',
    imageCount: { min: 1, max: 2 },
    allowCustomVideo: true,
    allowTrim: true,
    keepAudio: true,
    aspectRatio: '16:9',
    enabled: true,
    promptFor: buildHotelLobbyPrompt,
  },
  [CRAZY_FROG_PRESET_ID]: {
    id: CRAZY_FROG_PRESET_ID,
    version: 1,
    displayName: 'Crazy Frog',
    creditDescription: 'Reserve credits for Crazy Frog AI generation',
    templateVideoKey: CRAZY_FROG_TEMPLATE_KEY,
    localTemplatePath: 'public/videos/crazy-frog-tpl.mp4',
    // Legacy hotel-lobby preset only — page preview uses genjutsu crazy-frog product.
    previewUrl: '/api/genjutsu/template?product=crazy-frog',
    posterUrl: '/videos/crazy-frog-tpl-poster.jpg',
    downloadPrefix: 'crazy-frog',
    imageCount: { min: 2, max: 2 },
    allowCustomVideo: false,
    allowTrim: false,
    keepAudio: true,
    aspectRatio: '4:3',
    // Migrated to genjutsu + seedance-higgsfield (/crazy-frog-ai). Keep preset
    // for admin display of legacy hotel-lobby rows; do not accept new submits.
    enabled: false,
    promptFor: buildCrazyFrogPrompt,
  },
  [RUMPELSTILTSKIN_PRESET_ID]: {
    id: RUMPELSTILTSKIN_PRESET_ID,
    version: 1,
    displayName: 'Rumpelstiltskin',
    creditDescription: 'Reserve credits for Rumpelstiltskin AI generation',
    templateVideoKey: RUMPELSTILTSKIN_TEMPLATE_KEY,
    localTemplatePath: 'public/videos/rumpelstiltskin-tpl.mp4',
    previewUrl: '/api/genjutsu/template?product=rumpelstiltskin',
    posterUrl: '/videos/rumpelstiltskin-tpl-poster.jpg',
    downloadPrefix: 'rumpelstiltskin',
    imageCount: { min: 1, max: 1 },
    allowCustomVideo: false,
    allowTrim: false,
    keepAudio: true,
    aspectRatio: '16:9',
    enabled: true,
    promptFor: buildRumpelstiltskinPrompt,
  },
  [BULIN_47_PRESET_ID]: {
    id: BULIN_47_PRESET_ID,
    version: 1,
    displayName: 'Bulin 47',
    creditDescription: 'Reserve credits for Bulin 47 AI generation',
    templateVideoKey: BULIN_47_TEMPLATE_KEY,
    localTemplatePath: 'public/videos/bulin47-tpl.mp4',
    previewUrl: '/api/genjutsu/template?product=bulin-47',
    posterUrl: '/videos/bulin47-tpl-poster.jpg',
    downloadPrefix: 'bulin-47',
    imageCount: { min: 1, max: 1 },
    allowCustomVideo: false,
    allowTrim: false,
    keepAudio: true,
    aspectRatio: '9:16',
    enabled: true,
    promptFor: buildBulin47Prompt,
  },
} as const satisfies Record<string, HotelLobbyPresetDef>;

export type HotelLobbyPresetId = keyof typeof PRESETS;

export type HotelLobbyPreset = (typeof PRESETS)[HotelLobbyPresetId];

const PRESET_IDS = Object.keys(PRESETS) as HotelLobbyPresetId[];

export function isHotelLobbyPresetId(
  value: unknown
): value is HotelLobbyPresetId {
  return (
    typeof value === 'string' &&
    (PRESET_IDS as readonly string[]).includes(value)
  );
}

/**
 * Resolve a client-supplied preset. Missing/empty → hotel-lobby (legacy).
 * Unknown or disabled IDs throw HotelLobbyPreflightError.
 */
export function resolveHotelLobbyPreset(
  value: unknown,
  options?: { requireEnabled?: boolean }
): HotelLobbyPreset {
  const requireEnabled = options?.requireEnabled !== false;

  if (value == null || value === '') {
    return PRESETS[HOTEL_LOBBY_PRESET_ID];
  }

  if (!isHotelLobbyPresetId(value)) {
    throw new HotelLobbyPreflightError('Unknown generation preset');
  }

  const preset = PRESETS[value];
  if (requireEnabled && !preset.enabled) {
    throw new HotelLobbyPreflightError(
      `${preset.displayName} is not available yet`
    );
  }
  return preset;
}

/** Public meta for the generator UI (no secrets). */
export function getHotelLobbyPresetPublicMeta(preset: HotelLobbyPreset) {
  return {
    presetId: preset.id,
    version: preset.version,
    displayName: preset.displayName,
    previewUrl: preset.previewUrl,
    posterUrl: preset.posterUrl,
    downloadPrefix: preset.downloadPrefix,
    imageCount: preset.imageCount,
    allowCustomVideo: preset.allowCustomVideo,
    allowTrim: preset.allowTrim,
    keepAudio: preset.keepAudio,
    aspectRatio: preset.aspectRatio,
    enabled: preset.enabled,
  };
}

/** Client-safe static defaults when template-meta is unavailable. */
export function getHotelLobbyPresetClientDefaults(
  presetId: HotelLobbyPresetId
) {
  return getHotelLobbyPresetPublicMeta(PRESETS[presetId]);
}

export function displayNameForHotelLobbyPresetId(
  presetId: unknown
): string | null {
  if (!isHotelLobbyPresetId(presetId)) return null;
  return PRESETS[presetId].displayName;
}

/** Missing presetId on older tasks → Hotel Lobby. */
export function normalizeStoredPresetId(value: unknown): HotelLobbyPresetId {
  if (isHotelLobbyPresetId(value)) return value;
  return HOTEL_LOBBY_PRESET_ID;
}

export function localTemplatePathForPreset(
  presetId: HotelLobbyPresetId
): string | undefined {
  const preset = PRESETS[presetId];
  return 'localTemplatePath' in preset ? preset.localTemplatePath : undefined;
}
