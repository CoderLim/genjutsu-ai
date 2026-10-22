/**
 * Pure sequence / invalidate / isCurrent logic shared by production hooks
 * and unit tests (avoids testing a duplicate mock of the hook).
 */
export class ImagePrepareSequencer {
  private seq = 0;
  private mounted = true;
  /** Seq currently marked preparing, or null when idle. */
  private preparingSeq: number | null = null;

  begin(): {
    isCurrent: () => boolean;
    settle: () => void;
  } {
    const token = ++this.seq;
    this.preparingSeq = token;
    return {
      isCurrent: () => this.mounted && this.seq === token,
      settle: () => {
        if (this.preparingSeq === token) {
          this.preparingSeq = null;
        }
      },
    };
  }

  invalidate(): void {
    this.seq += 1;
    this.preparingSeq = null;
  }

  unmount(): void {
    this.mounted = false;
    this.seq += 1;
    this.preparingSeq = null;
  }

  isPreparing(): boolean {
    return this.mounted && this.preparingSeq != null;
  }

  /** Test / debug helper. */
  getSeq(): number {
    return this.seq;
  }
}

export class MultiSlotImagePrepareSequencer<Slot extends string> {
  private readonly slots: Record<Slot, ImagePrepareSequencer>;

  constructor(slotNames: readonly Slot[]) {
    this.slots = Object.fromEntries(
      slotNames.map((slot) => [slot, new ImagePrepareSequencer()])
    ) as Record<Slot, ImagePrepareSequencer>;
  }

  begin(slot: Slot) {
    return this.slots[slot].begin();
  }

  invalidate(slot: Slot): void {
    this.slots[slot].invalidate();
  }

  unmount(): void {
    for (const seq of Object.values(this.slots) as ImagePrepareSequencer[]) {
      seq.unmount();
    }
  }

  isPreparing(slot: Slot): boolean {
    return this.slots[slot].isPreparing();
  }

  isAnyPreparing(): boolean {
    return (Object.values(this.slots) as ImagePrepareSequencer[]).some((s) =>
      s.isPreparing()
    );
  }
}
