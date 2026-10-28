/**
 * Pure timing and geometry for the fuse-blow sequence: a shock streak travels
 * along a multi-line path (~0.4 s), then the fuse pops (~0.6 s).
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

/** Seconds the shock takes: zero when there is no path (just pop). */
export function shockDuration(hasPath: boolean): number {
  return hasPath ? SHOCK_SECONDS : 0;
}

export function sequenceTotal(hasPath: boolean): number {
  return shockDuration(hasPath) + POP_SECONDS;
}

export function sequencePhase(age: number, hasPath: boolean): number {
  const s = shockDuration(hasPath);
  if (age < s) return PHASE_SHOCK;
  return age < s + POP_SECONDS ? PHASE_POP : PHASE_DONE;
}

/** 0..1 through the shock (1 when there is none). */
export function shockProgress(age: number, hasPath: boolean): number {
  const s = shockDuration(hasPath);
  if (s <= 0) return 1;
  const f = age / s;
  return f < 0 ? 0 : f > 1 ? 1 : f;
}

/** 0..1 through the pop, or -1 before it starts / after it ends. */
export function popFraction(age: number, hasPath: boolean): number {
  const a = age - shockDuration(hasPath);
  return a < 0 || a >= POP_SECONDS ? -1 : a / POP_SECONDS;
}

/** The fuse is drawn intact until the pop lands. */
export function fuseIntact(age: number, hasPath: boolean): boolean {
  return age < shockDuration(hasPath);
}

/** Seconds the culprit's flare lasts, from the moment the streak arrives. */
export const CULPRIT_FLARE_SECONDS = 0.5;

/**
 * Culprit flare level 0..1: 0 until the streak arrives (end of the shock), full
 * on arrival, fading to 0 after CULPRIT_FLARE_SECONDS (before the pop finishes).
 * No path means no streak, so no flare.
 */
export function culpritFlare(age: number, hasPath: boolean): number {
  if (!hasPath) return 0;
  const a = age - shockDuration(true);
  if (a < 0 || a >= CULPRIT_FLARE_SECONDS) return 0;
  return 1 - a / CULPRIT_FLARE_SECONDS;
}

/** Branches (streaks) drawn per sequence slot; lamps beyond this still flare. */
export const MAX_BLOW_LAMPS = 8;
/** Lamps per slot that get a flare (>= MAX_BLOW_LAMPS). */
export const MAX_FLARE_LAMPS = 32;

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
