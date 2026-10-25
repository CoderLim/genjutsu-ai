import { useSyncExternalStore } from 'react';

function readShowPaidPreview(): boolean {
  if (typeof window === 'undefined') return false;
  const params = new URLSearchParams(window.location.search);
  const raw =
    params.get('showpreview') ??
    params.get('showPreview') ??
    params.get('SHOWPREVIEW');
  if (raw == null) return false;
  const normalized = raw.trim().toLowerCase();
  return normalized === '1' || normalized === 'true' || normalized === 'yes';
}

function subscribe(onStoreChange: () => void) {
  if (typeof window === 'undefined') return () => {};
  const handler = () => onStoreChange();
  window.addEventListener('popstate', handler);
  window.addEventListener('hashchange', handler);
  return () => {
    window.removeEventListener('popstate', handler);
    window.removeEventListener('hashchange', handler);
  };
}

/**
 * Paid short Preview is hidden by default. Opt in with `?showpreview=1`
 * for cheaper smoke tests without exposing Preview to normal visitors.
 */
export function useShowPaidPreview(): boolean {
  return useSyncExternalStore(subscribe, readShowPaidPreview, () => false);
}
