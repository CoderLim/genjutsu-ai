export type HotelLobbyTemplateMediaStatus = 'loading' | 'ready' | 'error';

/**
 * Derive fixed-template readiness from independent R2 meta + browser media
 * signals so async completions cannot overwrite each other.
 *
 * Custom-video presets are never blocked by the default template slot failing.
 */
export function deriveHotelLobbyTemplateGate(params: {
  allowCustomVideo: boolean;
  /** null = template-meta still in flight */
  r2Available: boolean | null;
  mediaStatus: HotelLobbyTemplateMediaStatus;
}): {
  /** Preview + Full may proceed for fixed-template presets */
  fixedTemplateReady: boolean;
  /** Show error overlay / unavailable copy (not while still loading) */
  showTemplateError: boolean;
} {
  if (params.allowCustomVideo) {
    return { fixedTemplateReady: true, showTemplateError: false };
  }

  const r2Failed = params.r2Available === false;
  const mediaFailed = params.mediaStatus === 'error';
  const r2Ok = params.r2Available === true;
  const mediaReady = params.mediaStatus === 'ready';

  return {
    fixedTemplateReady: r2Ok && mediaReady,
    showTemplateError: r2Failed || mediaFailed,
  };
}

/**
 * Reset browser media status only when the template identity changes
 * (preset and/or preview URL). Same URL after meta must not wipe `ready`.
 */
export function shouldResetHotelLobbyTemplateMedia(params: {
  previousIdentity: string | null;
  nextIdentity: string;
}): boolean {
  return params.previousIdentity !== params.nextIdentity;
}

export function hotelLobbyTemplateMediaIdentity(
  presetId: string,
  previewUrl: string
): string {
  return `${presetId}\0${previewUrl}`;
}
