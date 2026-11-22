'use client';

import * as React from 'react';

export interface UseChatcnMediaEtaOptions {
  /** True while the job is generating. The estimate resets when a new run starts. */
  active: boolean;
  /** An estimate from the server. Wins over the measured one when present. */
  etaMs?: number;
}

/**
 * Time left for a generation job, in ms, from how fast `progress` (0 to 100) has moved so far.
 *
 * It waits for 2 s and 3 points of progress before guessing, smooths the rate so one slow step
 * does not double the estimate, and counts down once per second between progress updates. The
 * estimate never goes up by less than 5 s, so the label does not flicker between two values.
 */
export function useChatcnMediaEta(
  progress: number | undefined,
  { active, etaMs }: UseChatcnMediaEtaOptions
): number | undefined {
  const start = React.useRef<{ t: number; p: number } | null>(null);
  const rate = React.useRef<number | null>(null);
  const [estimate, setEstimate] = React.useState<{
    ms: number;
    at: number;
  } | null>(null);
  // Starts empty and reads the clock after mount: a render must not read it (Next.js prerender).
  const [now, setNow] = React.useState<number | null>(null);

  React.useEffect(() => {
    if (!active) {
      start.current = null;
      rate.current = null;
      setEstimate(null);
      return;
    }
    if (progress === undefined) return;
    const t = Date.now();
    if (!start.current) {
      start.current = { t, p: progress };
      return;
    }
    const dt = t - start.current.t;
    const dp = progress - start.current.p;
    if (dt < 2000 || dp < 3) return;
    const measured = dp / dt;
    // Exponential smoothing: new samples count for 30%.
    rate.current =
      rate.current === null ? measured : rate.current * 0.7 + measured * 0.3;
    const ms = Math.max(0, (100 - progress) / rate.current);
    setEstimate((prev) => {
      if (prev) {
        const shown = prev.ms - (t - prev.at);
        if (ms > shown && ms - shown < 5000) return prev;
      }
      return { ms, at: t };
    });
  }, [active, progress]);

  React.useEffect(() => {
    if (!active) return;
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [active]);

  if (!active) return undefined;
  if (etaMs !== undefined) return etaMs;
  if (!estimate) return undefined;
  return Math.max(0, estimate.ms - ((now ?? estimate.at) - estimate.at));
}
