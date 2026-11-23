/**
 * Stage 12, section E2: the pass's draws. The stage's own `rand` is FNV-1a over a key; two keys that differ only in a digit before the end give strongly related numbers (a roof deck's slot 0 and slot 1 never
 * both rolled low), so every draw is passed through a murmur3-style finaliser before it is used. Pure and stateless: the same key always gives the same number.
 */
import type { StageRand } from "../pipeline/seeds";

const UNIT = 4294967296;

/** The murmur3 32-bit finaliser. */
export function mix(x: number): number {
  let h = x >>> 0;
  h ^= h >>> 16;
  h = Math.imul(h, 0x85ebca6b);
  h ^= h >>> 13;
  h = Math.imul(h, 0xc2b2ae35);
  h ^= h >>> 16;
  return h >>> 0;
}

export interface Draws {
  /** An integer in 0 to 2^32 - 1. */
  readonly h: (...key: readonly (string | number)[]) => number;
  /** A number in 0 to 1 (never 1). */
  readonly u: (...key: readonly (string | number)[]) => number;
  /** One of the list, by the draw. */
  readonly pick: <T>(list: readonly T[], ...key: readonly (string | number)[]) => T;
}

export function drawsOf(rand: StageRand): Draws {
  const h = (...key: readonly (string | number)[]): number => mix(rand(...key));
  return { h, u: (...key) => h(...key) / UNIT, pick: (list, ...key) => list[h(...key) % list.length]! };
}
