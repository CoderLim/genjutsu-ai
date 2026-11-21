import { ImagePlus, Trash2, Upload } from 'lucide-react';
import type { ChangeEvent } from 'react';

type Props = {
  label: string;
  urls: string[];
  max: number;
  accept: readonly string[];
  onFiles: (files: File[]) => void;
  onRemove: (url: string) => void;
};

export function MediaUploader({
  label,
  urls,
  max,
  accept,
  onFiles,
  onRemove,
}: Props) {
  const canAdd = urls.length < max;
  const inputId = 'media-upload-' + label.replace(/[^a-z0-9]/gi, '-').toLowerCase();

  function onInputChange(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    event.target.value = '';
    if (files.length > 0) onFiles(files);
  }

  return (
    <section className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <label htmlFor={inputId} className="text-sm font-medium">{label}</label>
        <span className="text-muted-foreground text-xs">{urls.length}/{max}</span>
      </div>
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
        {urls.map((url) => (
          <div key={url} className="bg-muted relative aspect-square overflow-hidden rounded-xl border">
            {accept.some(type => type.startsWith('video/')) ? (
              <video src={url} className="h-full w-full object-cover" preload="metadata" muted />
            ) : accept.some(type => type.startsWith('audio/')) ? (
              <div className="flex h-full items-center justify-center p-2 text-center text-xs">Audio reference</div>
            ) : (
              <img src={url} alt={label + ' reference'} className="h-full w-full object-cover" />
            )}
            <button
              type="button"
              aria-label={'Remove ' + label}
              onClick={() => onRemove(url)}
              className="absolute top-1 right-1 rounded-full bg-black/70 p-1.5 text-white"
            >
              <Trash2 className="size-3.5" />
            </button>
          </div>
        ))}
        {canAdd ? (
          <label
            htmlFor={inputId}
            className="text-muted-foreground hover:text-foreground hover:bg-muted flex aspect-square cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border border-dashed p-2 text-center transition"
          >
            {urls.length > 0 ? <Upload className="size-5" /> : <ImagePlus className="size-6" />}
            <span className="text-xs">Add {label}</span>
          </label>
        ) : null}
      </div>
      <input
        id={inputId}
        type="file"
        accept={accept.join(',')}
        multiple={max > 1}
        onChange={onInputChange}
        className="sr-only"
        disabled={!canAdd}
      />
    </section>
  );
}
