import { useId, type PointerEvent as ReactPointerEvent } from 'react';
import { LoaderCircle, Scissors } from 'lucide-react';

type HotelLobbyTrimBarProps = {
  durationSeconds: number;
  startSeconds: number;
  endSeconds: number;
  minClipSeconds: number;
  maxClipSeconds: number;
  disabled?: boolean;
  applying?: boolean;
  canApply?: boolean;
  onChange: (next: { startSeconds: number; endSeconds: number }) => void;
  onApply: () => void;
};

function formatClock(seconds: number) {
  const clamped = Math.max(0, seconds);
  const whole = Math.floor(clamped);
  const minutes = Math.floor(whole / 60);
  const rest = whole % 60;
  return `${minutes}:${String(rest).padStart(2, '0')}`;
}

export function HotelLobbyTrimBar({
  durationSeconds,
  startSeconds,
  endSeconds,
  minClipSeconds,
  maxClipSeconds,
  disabled,
  applying,
  canApply = true,
  onChange,
  onApply,
}: HotelLobbyTrimBarProps) {
  const labelId = useId();
  const clipLength = Math.max(0, endSeconds - startSeconds);
  const startPct =
    durationSeconds > 0 ? (startSeconds / durationSeconds) * 100 : 0;
  const endPct =
    durationSeconds > 0 ? (endSeconds / durationSeconds) * 100 : 100;
  const applyDisabled = Boolean(disabled || applying || !canApply);

  const updateFromClientX = (
    track: HTMLElement,
    clientX: number,
    handle: 'start' | 'end'
  ) => {
    const rect = track.getBoundingClientRect();
    if (rect.width <= 0 || durationSeconds <= 0) return;
    const ratio = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
    const time = ratio * durationSeconds;

    if (handle === 'start') {
      const maxStart = Math.max(0, endSeconds - minClipSeconds);
      const nextStart = Math.min(Math.max(0, time), maxStart);
      let nextEnd = endSeconds;
      if (nextEnd - nextStart > maxClipSeconds) {
        nextEnd = nextStart + maxClipSeconds;
      }
      onChange({ startSeconds: nextStart, endSeconds: nextEnd });
      return;
    }

    const minEnd = Math.min(durationSeconds, startSeconds + minClipSeconds);
    const nextEnd = Math.max(minEnd, Math.min(durationSeconds, time));
    let nextStart = startSeconds;
    if (nextEnd - nextStart > maxClipSeconds) {
      nextStart = nextEnd - maxClipSeconds;
    }
    onChange({ startSeconds: nextStart, endSeconds: nextEnd });
  };

  const bindHandle = (handle: 'start' | 'end') => ({
    onPointerDown: (event: ReactPointerEvent<HTMLButtonElement>) => {
      if (disabled || applying) return;
      event.preventDefault();
      const track = event.currentTarget.parentElement;
      if (!track) return;
      event.currentTarget.setPointerCapture(event.pointerId);

      const move = (clientX: number) =>
        updateFromClientX(track, clientX, handle);
      move(event.clientX);

      const onMove = (moveEvent: PointerEvent) => move(moveEvent.clientX);
      const onUp = () => {
        window.removeEventListener('pointermove', onMove);
        window.removeEventListener('pointerup', onUp);
      };
      window.addEventListener('pointermove', onMove);
      window.addEventListener('pointerup', onUp);
    },
  });

  return (
    <div className="mt-3 space-y-2">
      <div className="flex items-center justify-between gap-3 text-[11px] text-white/45">
        <span id={labelId}>Trim clip</span>
        <span className="text-white/55 tabular-nums">
          {formatClock(startSeconds)} – {formatClock(endSeconds)} ·{' '}
          {clipLength.toFixed(1)}s
        </span>
      </div>

      <div className="flex items-center gap-2">
        <div
          role="group"
          aria-labelledby={labelId}
          className={`relative h-9 min-w-0 flex-1 rounded-xl border border-white/10 bg-black/25 px-1 select-none ${
            disabled || applying ? 'opacity-50' : ''
          }`}
        >
          <div className="absolute inset-y-0 right-1 left-1 my-auto h-1.5 rounded-full bg-white/10" />
          <div
            className="absolute inset-y-0 my-auto h-1.5 rounded-full bg-[rgb(204,144,92)]/80"
            style={{
              left: `calc(${startPct}% + 4px)`,
              width: `calc(${Math.max(0, endPct - startPct)}% - 8px)`,
            }}
          />
          <button
            type="button"
            aria-label="Trim start"
            disabled={disabled || applying}
            className="absolute top-1/2 z-10 size-4 -translate-x-1/2 -translate-y-1/2 touch-none rounded-full border border-[rgb(220,155,99)] bg-[rgb(204,144,92)] shadow"
            style={{ left: `calc(${startPct}% + 4px)` }}
            {...bindHandle('start')}
          />
          <button
            type="button"
            aria-label="Trim end"
            disabled={disabled || applying}
            className="absolute top-1/2 z-10 size-4 -translate-x-1/2 -translate-y-1/2 touch-none rounded-full border border-[rgb(220,155,99)] bg-[rgb(204,144,92)] shadow"
            style={{ left: `calc(${endPct}% - 4px)` }}
            {...bindHandle('end')}
          />
        </div>

        <button
          type="button"
          disabled={applyDisabled}
          onClick={onApply}
          className="inline-flex h-9 shrink-0 items-center justify-center gap-1.5 rounded-xl border border-[rgba(204,144,92,0.35)] bg-[rgba(204,144,92,0.12)] px-3 text-xs font-semibold text-[rgb(220,155,99)] transition hover:bg-[rgba(204,144,92,0.2)] disabled:cursor-not-allowed disabled:opacity-45"
        >
          {applying ? (
            <LoaderCircle className="size-3.5 animate-spin" />
          ) : (
            <Scissors className="size-3.5" />
          )}
          {applying ? 'Trimming…' : 'Trim'}
        </button>
      </div>

      <p className="text-[10px] leading-4 text-white/30">
        Drag the handles, then click Trim. Credits follow the clipped length.
      </p>
    </div>
  );
}
