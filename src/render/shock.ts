/**
 * Pure timing and geometry for the fuse-blow sequence: a shock streak travels
 * along a multi-line path (0.4 s), every line on it glows (0.3 s) with the lamps sparking from
 * 0.5 s, then the fuse pops (0.6 s).
 * Points are flat screen-space arrays; nothing here allocates per call.
 */

export const SHOCK_SECONDS = 0.4;
export const POP_SECONDS = 0.6;
/** Longest path (points) a sequence slot holds. */
export const MAX_PATH_POINTS = 48;
/** Length of the streak, as a fraction of the whole path. */
export const STREAK_FRACTION = 0.3;

export const PHASE_SHOCK = 0;
export const PHASE_POP = 1;
export const PHASE_DONE = 2;
/** Lines glowing together (after the run, before the pop). */
export const PHASE_GLOW = 3;

/** Run, glow, spark, pop: all times in seconds from the blow. */
export const LINE_GLOW_SECONDS = 0.3;
export const LINE_GLOW_RISE = 0.06;
export const LINE_GLOW_FALL = 0.1;
export const LAMP_SPARK_AT = 0.5;
export const LAMP_SPARK_SECONDS = 0.3;
/** Deduplicated glow lines per sequence slot. */
export const MAX_GLOW_LINES = 64;

/** Seconds the run takes: zero when there is no path (just pop). */
export function shockDuration(hasPath: boolean): number {
  return hasPath ? SHOCK_SECONDS : 0;
}

/** When the fuse pops: after the run and the line glow (0 with no path). */
export function popStart(hasPath: boolean): number {
  return hasPath ? SHOCK_SECONDS + LINE_GLOW_SECONDS : 0;
}

export function sequenceTotal(hasPath: boolean): number {
  return popStart(hasPath) + POP_SECONDS;
}

export function sequencePhase(age: number, hasPath: boolean): number {
  if (age < shockDuration(hasPath)) return PHASE_SHOCK;
  if (age < popStart(hasPath)) return PHASE_GLOW;
  return age < popStart(hasPath) + POP_SECONDS ? PHASE_POP : PHASE_DONE;
}

/** 0..1 through the run (1 when there is none). */
export function shockProgress(age: number, hasPath: boolean): number {
  const s = shockDuration(hasPath);
  if (s <= 0) return 1;
  const f = age / s;
  return f < 0 ? 0 : f > 1 ? 1 : f;
}

/** 0..1 through the pop, or -1 before it starts / after it ends. */
export function popFraction(age: number, hasPath: boolean): number {
  const a = age - popStart(hasPath);
  return a < 0 || a >= POP_SECONDS ? -1 : a / POP_SECONDS;
}

/** The fuse is drawn intact until the pop lands. */
export function fuseIntact(age: number, hasPath: boolean): boolean {
  return age < popStart(hasPath);
}

/**
 * Brightness of the lines on the fuse-to-lamp paths, 0..1: 0 until the run ends, rises over
 * LINE_GLOW_RISE, holds, falls over the last LINE_GLOW_FALL, 0 from the pop on.
 */
export function lineGlow(age: number): number {
  const a = age - SHOCK_SECONDS;
  if (a <= 0 || age >= SHOCK_SECONDS + LINE_GLOW_SECONDS) return 0;
  if (a < LINE_GLOW_RISE) return a / LINE_GLOW_RISE;
  const left = LINE_GLOW_SECONDS - a;
  return left < LINE_GLOW_FALL ? left / LINE_GLOW_FALL : 1;
}

/** Streaks are full until the run ends, then fade out as the glow rises. */
export function streakFade(age: number): number {
  const a = age - SHOCK_SECONDS;
  if (a <= 0) return 1;
  return a >= LINE_GLOW_RISE ? 0 : 1 - a / LINE_GLOW_RISE;
}

/** Spark burst level 0..1: 0 before LAMP_SPARK_AT, 1 at it, 0 by LAMP_SPARK_AT + LAMP_SPARK_SECONDS. */
export function lampSpark(age: number): number {
  const a = age - LAMP_SPARK_AT;
  if (a < 0 || a >= LAMP_SPARK_SECONDS) return 0;
  return 1 - a / LAMP_SPARK_SECONDS;
}

/** Seconds a lamp's flare lasts, from the moment it starts sparking. */
export const CULPRIT_FLARE_SECONDS = 0.5;

/** Rays per lamp spark burst. */
export const SPARK_RAYS = 12;

function hashUnit(n: number): number {
  const s = Math.sin(n * 12.9898 + 78.233) * 43758.5453;
  return s - Math.floor(s);
}

/**
 * One spark ray of lamp number `lampIndex` at sequence `age`, as offsets from the lamp centre:
 * out[0..3] = x0, y0, x1, y1 (tail then head). Deterministic from the indices, no randomness.
 * Returns false (out untouched) outside the spark window.
 */
export function sparkRay(lampIndex: number, ray: number, age: number, out: Float64Array): boolean {
  const a = age - LAMP_SPARK_AT;
  if (a < 0 || a >= LAMP_SPARK_SECONDS) return false;
  const f = a / LAMP_SPARK_SECONDS;
  const seed = lampIndex * 17.3 + ray * 3.7;
  const angle = ((ray + hashUnit(seed) * 0.8) / SPARK_RAYS) * Math.PI * 2;
  const speed = 22 + hashUnit(seed + 1.1) * 26;
  const g = f > 0.3 ? f - 0.3 : 0;
  const head = 8 + speed * (1 - (1 - f) * (1 - f));
  const tail = 8 + speed * (1 - (1 - g) * (1 - g));
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  out[0] = c * tail;
  out[1] = s * tail;
  out[2] = c * head;
  out[3] = s * head;
  return true;
}

/**
 * Collects the distinct line indices on all lamps' paths into `out` (capacity `cap`), each once,
 * in path order. `lampLines` holds `stride` slots per lamp from lamp `first`; `lampLineN` the counts.
 * Extras past `cap` are dropped. Returns how many were written. Setup-time only (linear dedupe).
 */
export function collectGlowLines(
  lampLines: ArrayLike<number>,
  lampLineN: ArrayLike<number>,
  first: number,
  count: number,
  stride: number,
  out: Int32Array,
  cap: number,
): number {
  let n = 0;
  for (let k = 0; k < count; k++) {
    const lamp = first + k;
    for (let j = 0; j < lampLineN[lamp]!; j++) {
      const li = lampLines[lamp * stride + j]!;
      let seen = false;
      for (let q = 0; q < n; q++) {
        if (out[q] === li) {
          seen = true;
          break;
        }
      }
      if (seen) continue;
      if (n >= cap) return n;
      out[n++] = li;
    }
  }
  return n;
}

/** Branches (streaks) drawn per sequence slot; lamps beyond this still flare. */
export const MAX_BLOW_LAMPS = 8;
/** Lamps per slot that get a flare (>= MAX_BLOW_LAMPS). */
export const MAX_FLARE_LAMPS = 32;

export const LAMP_STREAK_AND_FLARE = 0;
export const LAMP_FLARE_ONLY = 1;
export const LAMP_DROPPED = 2;

/** What the lamp at `index` (0-based, payload order) gets: streak + flare, flare only, or nothing. */
export function lampTreatment(index: number): number {
  if (index < MAX_BLOW_LAMPS) return LAMP_STREAK_AND_FLARE;
  return index < MAX_FLARE_LAMPS ? LAMP_FLARE_ONLY : LAMP_DROPPED;
}

/**
 * Seconds after the sequence starts when a streak reaches the end of a path of
 * `pathLength`, given every streak moves at the speed that takes the longest
 * path `longestLength` SHOCK_SECONDS. A zero-length path arrives at 0.
 */
export function arrivalTime(pathLength: number, longestLength: number): number {
  if (!(pathLength > 0) || !(longestLength > 0)) return 0;
  return SHOCK_SECONDS * Math.min(pathLength / longestLength, 1);
}

/** Distance the common streak head has travelled along any path at `age` (shared speed). */
export function headDistance(age: number, longestLength: number): number {
  if (!(age > 0) || !(longestLength > 0)) return 0;
  return longestLength * Math.min(age / SHOCK_SECONDS, 1);
}

/** Streak length (same units as path lengths) for a sequence whose longest path is `longestLength`. */
export function streakLength(longestLength: number): number {
  return longestLength * STREAK_FRACTION;
}

/** Lamp flare 0..1: 0 before `arrive`, 1 on arrival, fading to 0 over CULPRIT_FLARE_SECONDS. */
export function lampFlare(age: number, arrive: number): number {
  const a = age - arrive;
  if (a < 0 || a >= CULPRIT_FLARE_SECONDS) return 0;
  return 1 - a / CULPRIT_FLARE_SECONDS;
}

export interface BlowTarget {
  id: string | null;
  path: readonly string[];
}

/** The lamps to shock: `lamps` when the payload carries it, else the single culprit (old payloads). */
export function blowTargets(p: {
  culprit: string | null;
  path: readonly string[];
  lamps?: readonly { id: string; path: readonly string[] }[];
}): readonly BlowTarget[] {
  if (p.lamps !== undefined) return p.lamps;
  return [{ id: p.culprit, path: p.path }];
}

export function polylineLength(xs: ArrayLike<number>, ys: ArrayLike<number>, n: number): number {
  let total = 0;
  for (let i = 1; i < n; i++) total += Math.hypot(xs[i]! - xs[i - 1]!, ys[i]! - ys[i - 1]!);
  return total;
}

/** Point at fraction `f` (0..1) of the path's length. Writes out[0], out[1]. */
export function pointAlong(xs: ArrayLike<number>, ys: ArrayLike<number>, n: number, f: number, out: Float64Array): void {
  if (n <= 0) {
    out[0] = 0;
    out[1] = 0;
    return;
  }
  if (n === 1) {
    out[0] = xs[0]!;
    out[1] = ys[0]!;
    return;
  }
  const total = polylineLength(xs, ys, n);
  let d = (f < 0 ? 0 : f > 1 ? 1 : f) * total;
  for (let i = 1; i < n; i++) {
    const seg = Math.hypot(xs[i]! - xs[i - 1]!, ys[i]! - ys[i - 1]!);
    if (d <= seg || i === n - 1) {
      const k = seg > 0 ? Math.min(d / seg, 1) : 0;
      out[0] = xs[i - 1]! + (xs[i]! - xs[i - 1]!) * k;
      out[1] = ys[i - 1]! + (ys[i]! - ys[i - 1]!) * k;
      return;
    }
    d -= seg;
  }
}

/**
 * The piece of the path between fractions f0 and f1, as flat x,y pairs in `out`
 * (needs 2 * (n + 2) slots). Returns the number of points written.
 */
export function sliceVertices(
  xs: ArrayLike<number>,
  ys: ArrayLike<number>,
  n: number,
  f0: number,
  f1: number,
  out: Float64Array,
): number {
  if (n < 2) return 0;
  const total = polylineLength(xs, ys, n);
  const d0 = Math.max(0, Math.min(1, f0)) * total;
  const d1 = Math.max(0, Math.min(1, f1)) * total;
  if (d1 <= d0) return 0;
  let m = 0;
  let acc = 0;
  for (let i = 1; i < n; i++) {
    const ax = xs[i - 1]!;
    const ay = ys[i - 1]!;
    const bx = xs[i]!;
    const by = ys[i]!;
    const seg = Math.hypot(bx - ax, by - ay);
    const s = acc;
    const e = acc + seg;
    acc = e;
    if (seg <= 0 || e < d0 || s > d1) continue;
    const t0 = Math.max(0, (d0 - s) / seg);
    const t1 = Math.min(1, (d1 - s) / seg);
    if (m === 0) {
      out[0] = ax + (bx - ax) * t0;
      out[1] = ay + (by - ay) * t0;
      m = 1;
    }
    out[m * 2] = ax + (bx - ax) * t1;
    out[m * 2 + 1] = ay + (by - ay) * t1;
    m++;
  }
  return m;
}
