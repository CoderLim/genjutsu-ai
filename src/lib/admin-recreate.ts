const STORAGE_KEY = 'genjutsu:admin-recreate-v1';

export type AdminRecreateMode = 'motion-transfer' | 'objects-swap';
export type AdminRecreateResolution = '480p' | '720p' | '1080p';

const MODES = new Set<AdminRecreateMode>(['motion-transfer', 'objects-swap']);
const RESOLUTIONS = new Set<AdminRecreateResolution>(['480p', '720p', '1080p']);

export type AdminRecreatePayload = {
  mode: AdminRecreateMode;
  prompt: string;
  resolution: AdminRecreateResolution;
  videoUrl: string | null;
  imageUrls: string[];
};

function isMode(value: unknown): value is AdminRecreateMode {
  return typeof value === 'string' && MODES.has(value as AdminRecreateMode);
}

function isResolution(value: unknown): value is AdminRecreateResolution {
  return (
    typeof value === 'string' &&
    RESOLUTIONS.has(value as AdminRecreateResolution)
  );
}

function parsePayload(raw: unknown): AdminRecreatePayload | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const data = raw as Record<string, unknown>;

  const mode = isMode(data.mode) ? data.mode : 'motion-transfer';
  const prompt = typeof data.prompt === 'string' ? data.prompt : '';
  const resolution = isResolution(data.resolution) ? data.resolution : '480p';
  const videoUrl =
    typeof data.videoUrl === 'string' && data.videoUrl.length > 0
      ? data.videoUrl
      : null;
  const imageUrls = Array.isArray(data.imageUrls)
    ? data.imageUrls.filter(
        (value): value is string =>
          typeof value === 'string' && value.length > 0
      )
    : [];

  return { mode, prompt, resolution, videoUrl, imageUrls };
}

export function writeAdminRecreate(payload: AdminRecreatePayload): void {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch {
    // Quota / private mode — recreate simply won't apply on the homepage.
  }
}

/** Read and clear the recreate payload once. Returns null when absent/invalid. */
export function consumeAdminRecreate(): AdminRecreatePayload | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    sessionStorage.removeItem(STORAGE_KEY);
    if (!raw) return null;
    return parsePayload(JSON.parse(raw));
  } catch {
    try {
      sessionStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
    return null;
  }
}
