/**
 * The timed breaker drawn (ticket 081 TB3; Josh, 26 Nov 2026: "Approve (Recommended)"): its ring, the "next" cue's gate and the flip pulse. Pure: no three, no DOM.
 * The ring reads by shape as well as colour: the closed share is thick and warm, the open share thin and dark, and the hand and the whole seconds say where the clock stands.
 */
import type { BreakerTimer } from "../core/schema";
import type { TimerReadout } from "../core/state";

/** The cue shows without hovering in the last this many seconds before a flip. */
export const TIMER_WARN_S = 3;
/** The flip pulse lasts this long, seconds. */
export const FLIP_PULSE_S = 0.6;

/** Angles are radians clockwise from the top (12 o'clock). */
export interface TimerRing {
  /** The closed share: from 0 to `closedEnd`. The open share runs from `closedEnd` to a full turn. */
  readonly closedEnd: number;
  /** Where the clock stands in the cycle. */
  readonly hand: number;
  /** The whole seconds to the next flip, or null before the first move. */
  readonly label: string | null;
}

/** The ring's arcs, the hand's angle and the label. `clock` is `GridState.clock` (null before the first move: the hand rests at `offset`, no number). */
export function timerRing(timer: BreakerTimer, readout: TimerReadout, clock: number | null): TimerRing {
  const cycle = timer.closed + timer.open;
  const into = readout.closed ? timer.closed - readout.next : timer.closed + (timer.open - readout.next);
  return {
    closedEnd: (timer.closed / cycle) * Math.PI * 2,
    hand: (Math.min(Math.max(into, 0), cycle) / cycle) * Math.PI * 2,
    label: clock === null ? null : String(Math.max(1, Math.ceil(readout.next - 1e-9))),
  };
}

/** Whether the "next" cue and number of timer `id` show: hovered, or (once the clock runs) within `TIMER_WARN_S` of its flip; every timer shows, as the preview is joint. */
export function timerNextShows(id: string, hover: string | null, timers: ReadonlyMap<string, TimerReadout>, clock: number | null): boolean {
  const r = timers.get(id);
  if (!r) return false;
  return hover === id || (clock !== null && r.next <= TIMER_WARN_S);
}

/**
 * The ids the control cue draws this frame, into `out` (cleared first): the hovered control (a timed one only when its next shows) and every unhovered timed breaker whose next shows.
 * Empty on a map without timers and no hover.
 */
export function cueIds(out: string[], hover: string | null, timers: ReadonlyMap<string, TimerReadout>, clock: number | null): string[] {
  out.length = 0;
  if (hover !== null && (!timers.has(hover) || timerNextShows(hover, hover, timers, clock))) out.push(hover);
  for (const id of timers.keys()) if (id !== hover && timerNextShows(id, hover, timers, clock)) out.push(id);
  return out;
}

/** Remembers each timed breaker's last position and when it flipped, so the icon pulses once. */
export interface FlipTracker {
  /** 0 when still, rising to 1 at a flip and falling to 0 over `FLIP_PULSE_S`. Never pulses on first sight, or while the clock is not running. */
  pulse(id: string, closed: boolean, clock: number | null, time: number): number;
}

export function createFlipTracker(): FlipTracker {
  const last = new Map<string, { closed: boolean; at: number }>();
  return {
    pulse(id, closed, clock, time) {
      const l = last.get(id);
      if (!l) last.set(id, { closed, at: -Infinity });
      else if (clock === null) {
        l.closed = closed;
        l.at = -Infinity;
      } else if (l.closed !== closed) {
        l.closed = closed;
        l.at = time;
      }
      const at = last.get(id)!.at;
      const t = (time - at) / FLIP_PULSE_S;
      return t >= 0 && t < 1 ? 1 - t : 0;
    },
  };
}
