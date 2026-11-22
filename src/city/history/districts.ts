/**
 * The district rule (ticket 073 B; B pre-check rule A; B-Q1): the blocks, taken in a hashed order, each start a district of a hashed size (1 to 4 blocks) that grows one block at a time onto the free neighbour
 * across a street with the longest shared stretch of street, the least block id on a tie. Reads only the blocks' ids, order and `sides[*].across` (R-7: never `bi`, `bj` or a street's line).
 */

import type { CityPlanBlock } from "../../core";
import { stableHash } from "../pipeline/hash";
import { SIZE_EDGES } from "./constants";

/** The hash of one thing about one block or district: `history:<seed>:<what>:<id>` (R-3). */
export const historyHash = (seed: number, what: string, id: string): number => stableHash(`history:${seed}:${what}:${id}`);
/** The same, as a fraction in 0 (inclusive) to 1 (exclusive). */
export const historyUnit = (seed: number, what: string, id: string): number => historyHash(seed, what, id) / 4294967296;

/** How many blocks a district started at `id` aims for. */
export function sizeOf(seed: number, id: string): number {
  const u = historyUnit(seed, "size", id);
  return u < SIZE_EDGES[0] ? 1 : u < SIZE_EDGES[1] ? 2 : u < SIZE_EDGES[2] ? 3 : 4;
}

/** The blocks in the hashed order (`history:<seed>:order:<block id>`, ties by `streets.blocks` order). */
export function hashedOrder(blocks: readonly CityPlanBlock[], seed: number): CityPlanBlock[] {
  return blocks
    .map((b, k) => ({ b, k, h: historyHash(seed, "order", b.id) }))
    .sort((x, y) => x.h - y.h || x.k - y.k)
    .map((x) => x.b);
}

/** The blocks across a street from `b`, each with the cells of street it shares with `b`, summed over `b`'s sides. */
export function neighboursOf(b: CityPlanBlock): Map<string, number> {
  const out = new Map<string, number>();
  for (const side of Object.values(b.sides)) {
    for (const a of side.across) out.set(a.block, (out.get(a.block) ?? 0) + (a.span.hi - a.span.lo));
  }
  return out;
}

/** The districts as lists of block ids, each in `streets.blocks` order, the districts in the order of their first block in `streets.blocks`. */
export function groupBlocks(blocks: readonly CityPlanBlock[], seed: number): string[][] {
  const index = new Map(blocks.map((b, k) => [b.id, k] as const));
  const near = new Map(blocks.map((b) => [b.id, neighboursOf(b)] as const));
  const taken = new Set<string>();
  const groups: string[][] = [];
  for (const start of hashedOrder(blocks, seed)) {
    if (taken.has(start.id)) continue;
    const size = sizeOf(seed, start.id);
    const group = [start.id];
    taken.add(start.id);
    while (group.length < size) {
      // The free neighbour sharing the longest stretch of street with the district so far; the least block id on a tie.
      const share = new Map<string, number>();
      for (const g of group) for (const [n, len] of near.get(g)!) if (!taken.has(n) && index.has(n)) share.set(n, (share.get(n) ?? 0) + len);
      let best: string | null = null;
      for (const [n, len] of share) {
        if (best === null || len > share.get(best)! || (len === share.get(best)! && n < best)) best = n;
      }
      if (best === null) break;
      group.push(best);
      taken.add(best);
    }
    groups.push(group.sort((a, b) => index.get(a)! - index.get(b)!));
  }
  return groups.sort((a, b) => index.get(a[0]!)! - index.get(b[0]!)!);
}
