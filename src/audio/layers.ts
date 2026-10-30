/** Pure: the continuous layers (hum, flicker, charge whine, spark crackle) per frame from the SoundView. */
import type { BeatClock, SoundView } from "../core";
import { mulberry32 } from "./noise";
import { FLICKER_DB, HUM_DB, WHINE_DB, WHINE_HIGH_HZ, WHINE_LOW_HZ, dbToGain } from "./recipes";

export interface LayerState {
  /** Batteries seen at capacity on the previous frame. */
  full: ReadonlySet<string>;
  /** False until the first frame: batteries already full then do not tick. */
  seen: boolean;
}

export const initialLayerState = (): LayerState => ({ full: new Set(), seen: false });

export interface Layers {
  /** Linear gain of the hum: 0 when nothing is powered. */
  hum: number;
  /** Linear gain of the flicker buzz: > 0 exactly while the view is browned out. */
  flicker: number;
  /** True exactly when the hum is: some feed carries load. The beat sounds only then. */
  beatOn: boolean;
  whineOn: boolean;
  whineHz: number;
  /** Linear gain of the whine (0 when off). */
  whine: number;
  crackleOn: boolean;
  /** True on the one frame a battery's charge first reaches its capacity. */
  fullTick: boolean;
  next: LayerState;
}

/** Highest min(load / capacity, 1) over the feeds; a feed with no limit counts 0.5 while it carries load. */
export function humFraction(feeds: SoundView["feeds"]): number {
  let f = 0;
  for (const feed of feeds.values()) {
    if (!(feed.load > 0)) continue;
    const x = feed.capacity === null ? 0.5 : feed.capacity > 0 ? Math.min(feed.load / feed.capacity, 1) : 1;
    if (x > f) f = x;
  }
  return f;
}

export function layersFor(view: SoundView, prev: LayerState): Layers {
  const f = humFraction(view.feeds);
  let charging = false;
  let ratio = 0;
  let tick = false;
  const full = new Set<string>();
  for (const [id, b] of view.batteries) {
    const frac = b.capacity > 0 ? Math.min(Math.max(b.charge / b.capacity, 0), 1) : 0;
    if (b.charging) {
      charging = true;
      if (frac > ratio) ratio = frac;
    }
    if (b.capacity > 0 && b.charge >= b.capacity) {
      full.add(id);
      if (prev.seen && !prev.full.has(id)) tick = true;
    }
  }
  const hum = f > 0 ? dbToGain(HUM_DB) * Math.sqrt(f) : 0;
  return {
    hum,
    beatOn: hum > 0,
    flicker: view.brownout ? dbToGain(FLICKER_DB) : 0,
    whineOn: charging,
    whineHz: WHINE_LOW_HZ + (WHINE_HIGH_HZ - WHINE_LOW_HZ) * ratio,
    whine: charging ? dbToGain(WHINE_DB) : 0,
    crackleOn: view.sparking.size > 0,
    fullTick: tick,
    next: { full, seen: true },
  };
}

/** Most ticks one collect returns, whatever the horizon or gap (ticket 033). */
export const CRACKLE_MAX_PER_COLLECT = 3;

/** Schedules the crackle ticks: 4 to 9 a second, spaced by the seeded PRNG, the same for one line or five. */
export class Crackle {
  private rnd: () => number;
  private next: number | null = null;

  constructor(private readonly seed = 7) {
    this.rnd = mulberry32(seed);
  }

  /** Absolute times in [now, now + horizon) of the ticks to schedule. Off: nothing, and the schedule restarts. */
  collect(now: number, horizon: number, on: boolean): number[] {
    if (!on) {
      this.next = null;
      return [];
    }
    // First call, or a time gap (backgrounded tab, stall, suspended context): restart from now, never replay what was missed.
    if (this.next === null || this.next < now) this.next = now + this.gap();
    const out: number[] = [];
    while (this.next < now + horizon && out.length < CRACKLE_MAX_PER_COLLECT) {
      out.push(this.next);
      this.next += this.gap();
    }
    return out;
  }

  reset(): void {
    this.next = null;
    this.rnd = mulberry32(this.seed);
  }

  private gap(): number {
    return 1 / (4 + 5 * this.rnd());
  }
}

/**
 * Hands out the beats of a shared clock in a sliding window, each exactly once (ticket 032).
 * Pure: the clock and the time are arguments; it never reads one. State is two numbers.
 */
export class BeatScheduler {
  private last = -Infinity;
  private lastT = -Infinity;

  /** Beat times in [t, t + horizon) not returned before. A beat already past is skipped, never late. Off: nothing, and restarts. */
  collect(clock: BeatClock, t: number, horizon: number, on: boolean): number[] {
    if (!on || !Number.isFinite(t)) {
      this.reset();
      return [];
    }
    if (t < this.lastT) this.last = -Infinity; // the clock went backwards: start over
    this.lastT = t;
    const out: number[] = [];
    for (const b of clock.between(t, t + Math.max(0, horizon))) {
      if (b > this.last) {
        out.push(b);
        this.last = b;
      }
    }
    return out;
  }

  reset(): void {
    this.last = -Infinity;
    this.lastT = -Infinity;
  }
}
