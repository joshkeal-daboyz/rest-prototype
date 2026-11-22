/**
 * Stage 13, section F1: the spread (GD; F1-Q3). From every soil cell growth spreads cell by cell to its four neighbours, up to `round(wild x REACH_FACTOR)` cells (half up), `wild` being the soil's district's. Pure.
 * A grown cell takes the district of the nearest soil that reaches it (a tie: the least district id), and so that district's `wild` sets its chances.
 */

import { REACH_FACTOR } from "./constants";
import { cellKey } from "./geom";

/** A soil cell: where growth starts. */
export interface SoilSource {
  readonly i: number;
  readonly j: number;
  /** Its district's id and `wild`. */
  readonly district: string;
  readonly wild: number;
}

/** The cells a soil of this `wild` reaches: `round(wild x REACH_FACTOR)`, half up. A district under 1/6 reaches 0. */
export const reachOf = (wild: number): number => Math.floor(wild * REACH_FACTOR + 0.5);

export interface Grown {
  /** The district whose soil reached the cell first (nearest; a tie, the least id). */
  readonly district: string;
  /** How many cells from that soil. */
  readonly dist: number;
}

/**
 * Every cell reached from `sources`, over the cells `passable` allows (never a building). A source's own cell is reached at distance 0 (it is in the result; the caller leaves soil cells out of what it
 * grows). Keyed by `cellKey`.
 */
export function spread(sources: readonly SoilSource[], passable: (i: number, j: number) => boolean): Map<number, Grown> {
  const best = new Map<number, Grown>();
  const offer = (k: number, district: string, dist: number): void => {
    const at = best.get(k);
    if (at === undefined || dist < at.dist || (dist === at.dist && district < at.district)) best.set(k, { district, dist });
  };
  for (const s of sources) {
    const reach = reachOf(s.wild);
    offer(cellKey(s.i, s.j), s.district, 0);
    if (reach === 0) continue;
    const seen = new Set<number>([cellKey(s.i, s.j)]);
    let frontier: [number, number][] = [[s.i, s.j]];
    for (let d = 1; d <= reach; d++) {
      const next: [number, number][] = [];
      for (const [i, j] of frontier) {
        for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
          const ni = i + di;
          const nj = j + dj;
          const k = cellKey(ni, nj);
          if (seen.has(k) || !passable(ni, nj)) continue;
          seen.add(k);
          offer(k, s.district, d);
          next.push([ni, nj]);
        }
      }
      frontier = next;
    }
  }
  return best;
}
