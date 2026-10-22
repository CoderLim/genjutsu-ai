import { useEffect, useRef } from 'react';

/**
 * Per-slot sequence guard for async image preparation.
 * Invalidating a slot (or unmount) makes in-flight prepares no-ops so they
 * cannot write state or leak object URLs after delete/replace/unmount.
 */
export function useImagePrepareGuard<Slot extends string>(
  slots: readonly Slot[]
) {
  const seqRef = useRef<Record<Slot, number>>(
    Object.fromEntries(slots.map((slot) => [slot, 0])) as Record<Slot, number>
  );
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      for (const slot of Object.keys(seqRef.current) as Slot[]) {
        seqRef.current[slot] += 1;
      }
    };
  }, []);

  const invalidate = (slot: Slot) => {
    seqRef.current[slot] += 1;
  };

  const begin = (slot: Slot) => {
    const seq = ++seqRef.current[slot];
    return {
      isCurrent: () => mountedRef.current && seqRef.current[slot] === seq,
    };
  };

  return { begin, invalidate };
}

/** Single-slot variant (one photo panels). */
export function useSingleImagePrepareGuard() {
  const { begin, invalidate } = useImagePrepareGuard(['photo'] as const);
  return {
    begin: () => begin('photo'),
    invalidate: () => invalidate('photo'),
  };
}

/**
 * Multi-image merge guard (homepage ImageUploadSlot).
 * Bump generation to drop in-flight batches; callers must revoke any
 * MediaItems already created when isCurrent() becomes false.
 */
export function useImageMergePrepareGuard() {
  const generationRef = useRef(0);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      generationRef.current += 1;
    };
  }, []);

  const invalidate = () => {
    generationRef.current += 1;
  };

  const begin = () => {
    const generation = ++generationRef.current;
    return {
      isCurrent: () =>
        mountedRef.current && generationRef.current === generation,
    };
  };

  return { begin, invalidate };
}
