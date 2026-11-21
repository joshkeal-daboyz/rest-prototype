/**
 * The finaliser of the stage's sub-seeded hash (R-3): FNV-1a's low bits are weak on short strings, so a murmur-style finaliser follows it. A copy of the buildings stage's (this folder cannot import it, R-1).
 * Every choice of this stage is `rand(...key)` (the stage's own `facades:<seed>:<key>` hash) through `indexOf`.
 */
export function finalise(hash: number): number {
  let h = hash;
  h ^= h >>> 16;
  h = Math.imul(h, 0x7feb352d);
  h ^= h >>> 15;
  h = Math.imul(h, 0x846ca68b);
  h ^= h >>> 16;
  return h >>> 0;
}

/** An index in [0, count) from a hash: the finaliser, modulo `count` (0 with no choice). */
export function indexOf(hash: number, count: number): number {
  return count < 1 ? 0 : finalise(hash) % count;
}
