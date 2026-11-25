/** Pure animation helpers the city view uses (moved unchanged from the 2D map, ticket 081 X1a). */

/** Cheap deterministic hash to [0, 1). */
export function hash01(n: number): number {
  const s = Math.sin(n * 12.9898 + 78.233) * 43758.5453;
  return s - Math.floor(s);
}

/** Brownout flicker, 0.15..1, jumpy and uneven per lamp (`seed`). */
export function flicker(timeSeconds: number, seed: number): number {
  const step = Math.floor(timeSeconds * 11 + seed * 3.7);
  const r = hash01(step * 1.31 + seed * 17.1);
  return r < 0.35 ? 0.15 + r * 0.6 : 0.55 + r * 0.45;
}

export function clamp01(v: number): number {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}
