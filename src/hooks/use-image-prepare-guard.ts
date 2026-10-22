import { useCallback, useEffect, useRef, useState } from 'react';

import {
  ImagePrepareSequencer,
  MultiSlotImagePrepareSequencer,
} from '@/lib/image-prepare-sequencer';

/**
 * Per-slot sequence guard + preparing flags for async image preparation.
 * Invalidating a slot (or unmount) makes in-flight prepares no-ops so they
 * cannot write state or leak object URLs after delete/replace/unmount.
 */
export function useImagePrepareGuard<Slot extends string>(
  slots: readonly Slot[]
) {
  const sequencerRef = useRef<MultiSlotImagePrepareSequencer<Slot> | null>(
    null
  );
  if (!sequencerRef.current) {
    sequencerRef.current = new MultiSlotImagePrepareSequencer(slots);
  }
  const sequencer = sequencerRef.current;

  const [preparingVersion, setPreparingVersion] = useState(0);
  const bump = useCallback(() => setPreparingVersion((v) => v + 1), []);

  useEffect(() => {
    return () => {
      sequencer.unmount();
    };
  }, [sequencer]);

  const invalidate = useCallback(
    (slot: Slot) => {
      sequencer.invalidate(slot);
      bump();
    },
    [bump, sequencer]
  );

  const begin = useCallback(
    (slot: Slot) => {
      const guard = sequencer.begin(slot);
      bump();
      return {
        isCurrent: guard.isCurrent,
        settle: () => {
          guard.settle();
          bump();
        },
      };
    },
    [bump, sequencer]
  );

  // preparingVersion forces re-render when prepare flags change.
  void preparingVersion;

  const isPreparing = useCallback(
    (slot: Slot) => sequencer.isPreparing(slot),
    [sequencer, preparingVersion]
  );

  const isAnyPreparing = sequencer.isAnyPreparing();

  return { begin, invalidate, isPreparing, isAnyPreparing };
}

/** Single-slot variant (one photo panels). */
export function useSingleImagePrepareGuard() {
  const { begin, invalidate, isAnyPreparing } = useImagePrepareGuard([
    'photo',
  ] as const);
  return {
    begin: () => begin('photo'),
    invalidate: () => invalidate('photo'),
    isPreparing: isAnyPreparing,
  };
}

/**
 * Multi-image merge guard (homepage ImageUploadSlot).
 * Bump generation to drop in-flight batches; callers must revoke any
 * MediaItems already created when isCurrent() becomes false.
 */
export function useImageMergePrepareGuard() {
  const sequencerRef = useRef(new ImagePrepareSequencer());
  const [preparingVersion, setPreparingVersion] = useState(0);
  const bump = useCallback(() => setPreparingVersion((v) => v + 1), []);

  useEffect(() => {
    return () => {
      sequencerRef.current.unmount();
    };
  }, []);

  const invalidate = useCallback(() => {
    sequencerRef.current.invalidate();
    bump();
  }, [bump]);

  const begin = useCallback(() => {
    const guard = sequencerRef.current.begin();
    bump();
    return {
      isCurrent: guard.isCurrent,
      settle: () => {
        guard.settle();
        bump();
      },
    };
  }, [bump]);

  void preparingVersion;
  const isPreparing = sequencerRef.current.isPreparing();

  return { begin, invalidate, isPreparing };
}
