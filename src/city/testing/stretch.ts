/**
 * Ticket 078 A: the longest-stretch log. Off unless REST_STRETCH_LOG names a file. When on, an unref'd interval timer samples the event loop; the longest gap between two samples is the longest stretch
 * the worker went without answering vitest. `stop` appends one line per test file: file, longest gap in ms, and the test or hook running when the gap began. Test support only (node built-ins only).
 */
import { appendFileSync } from "node:fs";
import { performance } from "node:perf_hooks";

export const SAMPLE_MS = 50;

/** Starts the log for one test file. `nameOf` says what is running now (called at every sample). With REST_STRETCH_LOG unset it starts no timer and `stop` writes nothing. */
export function startStretchLog(
  file: string,
  nameOf: () => string | undefined = () => undefined,
  env: Readonly<Record<string, string | undefined>> = process.env,
): { readonly stop: () => void } {
  const out = env["REST_STRETCH_LOG"];
  if (!out) return { stop: () => undefined };
  let last = performance.now();
  let lastName = nameOf() ?? "(hook)";
  let worst = 0;
  let worstName = lastName;
  const sample = (): void => {
    const now = performance.now();
    if (now - last > worst) {
      worst = now - last;
      worstName = lastName;
    }
    last = now;
    lastName = nameOf() ?? "(hook)";
  };
  const timer = setInterval(sample, SAMPLE_MS);
  timer.unref();
  let stopped = false;
  return {
    stop: () => {
      if (stopped) return;
      stopped = true;
      clearInterval(timer);
      sample();
      appendFileSync(out, `${file}\t${Math.round(worst)}\t${worstName}\n`);
    },
  };
}
