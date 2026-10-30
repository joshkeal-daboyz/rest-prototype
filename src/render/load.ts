/** Pure: how a lamp's load shows as size, count and brightness. */

/** Loads above this look the same as this, so a load-5 lamp doesn't wash out its neighbours. */
export const LOAD_CAP = 3;

/** Load as an integer 1..LOAD_CAP. */
export function cappedLoad(load: number): number {
  const l = Math.round(load);
  return l < 1 ? 1 : l > LOAD_CAP ? LOAD_CAP : l;
}

/** Bulbs drawn in the lamp's cluster: 1, 2 or 3. */
export function bulbCount(load: number): number {
  return cappedLoad(load);
}

/** Radius of one bulb in px: a lone bulb is standard, cluster bulbs are a little smaller. */
export function bulbRadius(load: number): number {
  return cappedLoad(load) === 1 ? 7 : 6;
}

/** Light intensity multiplier: load 1 -> 1x, 2 -> 2x, 3 -> 3x, capped. */
export function brightness(load: number): number {
  return cappedLoad(load);
}

/** Light pool radius multiplier (1, 1.6, 2.2): intensity grows faster than reach so pools stay legible. */
export function poolRadiusScale(load: number): number {
  return 1 + 0.6 * (cappedLoad(load) - 1);
}

/** Pool disc alpha for a base alpha: scales with brightness, never above `max`. */
export function poolAlpha(base: number, load: number, max = 0.4): number {
  return Math.min(base * brightness(load), max);
}

/** Bulb centre offsets (px from the lamp's centre) for a cluster; writes 2*count numbers into `out`. */
export function bulbOffsets(load: number, out: Float64Array): number {
  const n = bulbCount(load);
  const r = bulbRadius(load);
  if (n === 1) {
    out[0] = 0;
    out[1] = 0;
  } else if (n === 2) {
    out[0] = -r;
    out[1] = 0;
    out[2] = r;
    out[3] = 0;
  } else {
    out[0] = -r;
    out[1] = r * 0.6;
    out[2] = r;
    out[3] = r * 0.6;
    out[4] = 0;
    out[5] = -r * 0.95;
  }
  return n;
}

/** Radius of a circle that contains the whole cluster (for captions, rings, hit room). */
export function clusterRadius(load: number): number {
  return cappedLoad(load) === 1 ? bulbRadius(load) : 2 * bulbRadius(load);
}
