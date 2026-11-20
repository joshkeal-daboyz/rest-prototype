/**
 * The finaliser of `colourway.ts`'s `colourwayStart`, moved as a function of a number (N5): FNV-1a's low bits are weak on short strings, so a murmur-style finaliser follows it.
 * Every choice of this stage is `rand(...key)` (the stage's own sub-seeded hash, R-3) through `finalise`. `stylepin.test.ts` pins it equal to `colourwayStart` on typed-in keys.
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

/** A fraction in [0, 1) from a hash. */
export function fractionOf(hash: number): number {
  return finalise(hash) / 4294967296;
}
