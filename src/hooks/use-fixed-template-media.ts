import { useCallback, useEffect, useMemo, useState } from 'react';

export type FixedTemplateMediaStatus = 'loading' | 'ready' | 'error';

/**
 * Track whether a fixed-template <video> could load media metadata.
 * Uses loadedmetadata (not play/autoplay) so a blocked autoplay is not an error.
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

  useEffect(() => {
    setStatus('loading');
  }, [videoSrc]);

  const onLoadedMetadata = useCallback(() => {
    setStatus('ready');
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
    onError,
    retry,
    isReady: status === 'ready',
    isError: status === 'error',
    isLoading: status === 'loading',
  };
}
