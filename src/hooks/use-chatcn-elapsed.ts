import * as React from 'react';

const NBSP = ' ';

/**
 * Formats a duration the chatcn way: numerals, a non-breaking space before the unit.
 * `precise` (the default) keeps a decimal under 10 s and milliseconds under 1 s, for finished
 * steps. Turn it off for live counters and "Thought for 12 s", which read in whole seconds.
 */
export function formatChatcnDuration(
  ms: number,
  { precise = true }: { precise?: boolean } = {}
) {
  const safe = Math.max(0, ms);
  if (precise && safe < 1000)
    return `${Math.max(1, Math.round(safe))}${NBSP}ms`;
  const s = safe / 1000;
  if (precise && s < 10) return `${s.toFixed(1)}${NBSP}s`;
  if (s < 60) return `${precise ? Math.round(s) : Math.floor(s)}${NBSP}s`;
  const totalS = Math.floor(s);
  const h = Math.floor(totalS / 3600);
  const m = Math.floor((totalS % 3600) / 60);
  const rest = totalS % 60;
  if (h > 0) return `${h}${NBSP}h ${m}${NBSP}m`;
  return `${m}${NBSP}m ${rest}${NBSP}s`;
}

/** Spoken form for live regions: "12 seconds", "2 minutes 4 seconds". */
export function speakChatcnDuration(ms: number) {
  const totalS = Math.max(1, Math.round(ms / 1000));
  const m = Math.floor(totalS / 60);
  const s = totalS % 60;
  const part = (n: number, unit: string) => `${n} ${unit}${n === 1 ? '' : 's'}`;
  if (m === 0) return part(s, 'second');
  return s === 0
    ? part(m, 'minute')
    : `${part(m, 'minute')} ${part(s, 'second')}`;
}

export interface UseChatcnElapsedOptions {
  /** True while the timed work is happening. */
  running: boolean;
  /** Epoch ms when the work started. Measured from the first `running` render when omitted. */
  startedAt?: number;
  /** Final duration from the runtime. Wins over the measured one once `running` is false. */
  durationMs?: number;
}

export interface UseChatcnElapsedResult {
  /** Live elapsed ms while running, the final duration afterwards, `undefined` when unknown. */
  ms: number | undefined;
  running: boolean;
}

/**
 * Elapsed time for a step, a run or a reasoning block.
 *
 * Ticks once per second, aligned to the start time so the counter turns over exactly at 1 s,
 * 2 s and so on, never at random offsets. A counter that changes faster only adds noise.
 */
export function useChatcnElapsed({
  running,
  startedAt,
  durationMs,
}: UseChatcnElapsedOptions): UseChatcnElapsedResult {
  const [autoStart, setAutoStart] = React.useState<number>();
  const [measured, setMeasured] = React.useState<number>();
  // Starts empty and reads the clock after mount: a render must not read it (Next.js prerender).
  const [now, setNow] = React.useState<number | null>(null);
  const start = startedAt ?? autoStart;

  // Record our own start when the caller gives none. A new run (running again) starts over.
  React.useEffect(() => {
    if (!running) return;
    if (startedAt === undefined) setAutoStart((prev) => prev ?? Date.now());
    setMeasured(undefined);
    setNow(Date.now());
  }, [running, startedAt]);

  // Freeze the measured duration when the work stops.
  const wasRunning = React.useRef(running);
  React.useEffect(() => {
    if (wasRunning.current && !running && start !== undefined) {
      setMeasured(Date.now() - start);
      setAutoStart(undefined);
    }
    wasRunning.current = running;
  }, [running, start]);

  React.useEffect(() => {
    if (!running || start === undefined) return;
    let id: number;
    const schedule = () => {
      const elapsed = Date.now() - start;
      // Next whole-second boundary, plus a few ms so rounding never shows the old second.
      const wait = 1000 - (((elapsed % 1000) + 1000) % 1000) + 8;
      id = window.setTimeout(() => {
        setNow(Date.now());
        schedule();
      }, wait);
    };
    schedule();
    return () => window.clearTimeout(id);
  }, [running, start]);

  if (running)
    return {
      ms: start === undefined ? undefined : Math.max(0, (now ?? start) - start),
      running,
    };
  return { ms: durationMs ?? measured, running };
}
