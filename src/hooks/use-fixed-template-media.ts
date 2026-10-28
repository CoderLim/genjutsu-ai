import { useCallback, useMemo, useState } from 'react';

export type FixedTemplateMediaStatus = 'loading' | 'ready' | 'error';

/** HAVE_METADATA — enough to treat the fixed template as playable for gating. */
const HAVE_METADATA = 1;

/**
 * Track whether a fixed-template <video> could load media metadata.
 * Uses loadedmetadata (not play/autoplay) so a blocked autoplay is not an error.
 *
 * Cached / fast-path videos can already be HAVE_METADATA before React attaches
 * `onLoadedMetadata`, so callers should also call `syncFromVideo` from a ref
 * callback when the element mounts (and on detach → loading).
 */
export function useFixedTemplateMedia(src: string) {
  const [status, setStatus] = useState<FixedTemplateMediaStatus>('loading');
  const [retryNonce, setRetryNonce] = useState(0);

  const videoSrc = useMemo(() => {
    if (!src) return src;
    if (retryNonce <= 0) return src;
    const join = src.includes('?') ? '&' : '?';
    return `${src}${join}_retry=${retryNonce}`;
  }, [src, retryNonce]);

  const onLoadedMetadata = useCallback(() => {
    setStatus('ready');
  }, []);

  const syncFromVideo = useCallback((video: HTMLVideoElement | null) => {
    if (!video) {
      setStatus('loading');
      return;
    }
    if (video.readyState >= HAVE_METADATA) {
      setStatus('ready');
      return;
    }
    setStatus('loading');
  }, []);

  const onError = useCallback(() => {
    setStatus('error');
  }, []);

  const retry = useCallback(() => {
    setRetryNonce((n) => n + 1);
  }, []);

  return {
    status,
    videoSrc,
    onLoadedMetadata,
    syncFromVideo,
    onError,
    retry,
    isReady: status === 'ready',
    isError: status === 'error',
    isLoading: status === 'loading',
  };
}
