import { useId, type ChangeEvent } from 'react';
import { Music2, Plus, Trash2 } from 'lucide-react';

import type { GeneratorReferenceSlot } from '@/modules/generator/form-state';
import { cn } from '@/lib/utils';

export type MixedReferenceItem = {
  url: string;
  slot: GeneratorReferenceSlot;
};

type Props = {
  items: MixedReferenceItem[];
  accept: readonly string[];
  canAdd: boolean;
  limitLines: readonly string[];
  onFiles: (files: File[]) => void;
  onRemove: (slot: GeneratorReferenceSlot, url: string) => void;
};

/**
 * One picker for All-in-One image / video / audio references.
 * Each thumbnail still remembers its own provider media slot.
 */
export function MixedReferenceUploader({
  items, accept, canAdd, limitLines, onFiles, onRemove,
}: Props) {
  const inputId = useId();

  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    event.target.value = '';
    if (files.length) onFiles(files);
  }

  return (
    <div className="flex min-w-0 shrink-0 items-start gap-2">
      <div className="shrink-0">
        <label
          htmlFor={inputId}
          aria-label={'Add references: ' + limitLines.join(', ')}
          className={cn(
            'flex h-24 w-[86px] cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-[rgba(20,17,18,0.24)] bg-transparent px-1 text-center transition hover:border-[rgba(20,17,18,0.44)] hover:bg-[rgba(20,17,18,0.02)]',
            !canAdd && 'pointer-events-none opacity-50'
          )}
        >
          <Plus className="size-5 text-[rgba(18,15,16,0.5)]" strokeWidth={1.75} />
          <span className="flex flex-col text-[10px] leading-tight font-medium text-[rgba(18,15,16,0.65)]">
            {limitLines.map(line => (
              <span key={line}>{line}</span>
            ))}
          </span>
        </label>
        <input
          id={inputId}
          type="file"
          accept={accept.join(',')}
          multiple
          disabled={!canAdd}
          className="sr-only"
          onChange={handleChange}
        />
      </div>

      {items.length > 0 ? (
        <div className="flex max-w-[230px] min-w-0 gap-1.5 overflow-x-auto pb-1">
          {items.map(({ url, slot }) => (
            <div
              key={url}
              className="relative h-24 w-[68px] shrink-0 overflow-hidden rounded-lg border border-[rgba(20,17,18,0.09)] bg-[rgba(20,17,18,0.04)]"
            >
              {slot === 'referenceVideos' ? (
                <video src={url} preload="metadata" muted className="size-full object-cover" />
              ) : slot === 'referenceAudio' ? (
                <div className="flex size-full flex-col items-center justify-center gap-1 text-[10px] text-[rgba(18,15,16,0.62)]">
                  <Music2 className="size-5" />
                  Audio
                </div>
              ) : (
                <img src={url} alt="Image reference" className="size-full object-cover" />
              )}
              <button
                type="button"
                aria-label={'Remove ' + (slot === 'referenceImages' ? 'image' : slot === 'referenceVideos' ? 'video' : 'audio') + ' reference'}
                onClick={() => onRemove(slot, url)}
                className="absolute right-1 top-1 rounded-full bg-black/70 p-1 text-white hover:bg-black/90"
              >
                <Trash2 className="size-3" />
              </button>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
