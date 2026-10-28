/** Pure: the fuse load bar's fill fraction, colour step and tick positions. */

export const FUSE_BAR_WIDTH = 40;
export const FUSE_BAR_HEIGHT = 5;
/** Bar top, px below the fuse box's centre (under the `LvN Fuse` caption). */
export const FUSE_BAR_TOP = 30;
/** Past this many units the ticks would crowd into a smear, so they are left off. */
export const FUSE_BAR_MAX_TICKS = 12;

/** Colour steps: 0 green (plenty of room), 1 amber (getting close), 2 alarm (at the limit). */
export type FuseBarStep = 0 | 1 | 2;

/** Fill fraction 0..1 for `load` against `rating`. No rating (or a non-positive one) has no bar: 0. */
export function fuseFill(load: number, rating: number | undefined): number {
  if (rating === undefined || !(rating > 0) || !(load > 0)) return 0;
  const f = load / rating;
  return f > 1 ? 1 : f;
}

/** Colour step for a fill fraction: alarm only at the limit, amber from 60% up. */
export function fuseStep(fill: number): FuseBarStep {
  return fill >= 1 ? 2 : fill >= 0.6 ? 1 : 0;
}

/** X offsets (px from the bar's left edge) of the dividers between units: rating-1 of them. Empty when too many. */
export function fuseTickOffsets(rating: number, width = FUSE_BAR_WIDTH): Float32Array {
  const n = Math.floor(rating);
  if (!(n > 1) || n > FUSE_BAR_MAX_TICKS) return new Float32Array(0);
  const out = new Float32Array(n - 1);
  for (let k = 1; k < n; k++) out[k - 1] = (width * k) / n;
  return out;
}
