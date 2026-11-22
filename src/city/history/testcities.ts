/**
 * Test support for stage 10 (ticket 073 B): the named cities run through stage 1 only (history reads nothing else), once per test file, and a hand-built fixture city. Imported by tests only, never by the stage.
 */
import type { CityPlan, CityPlanBlock, CityPlanRun, CitySide } from "../../core";
import type { CityStageDef } from "../pipeline/types";
import { runCity } from "../stages";
import { streetsStage, streetsStageWith } from "../streets/stage";

export interface City {
  readonly blocksX: number;
  readonly blocksZ: number;
  readonly seed: number;
  readonly way: "on" | "off";
}

/** The 20 named runs: 6 x 6 seeds 1 to 10, one-way off and on. */
export const NAMED: readonly City[] = (["on", "off"] as const).flatMap((way) => Array.from({ length: 10 }, (_, n) => ({ blocksX: 6, blocksZ: 6, seed: n + 1, way })));
export const DEFAULT: City = { blocksX: 6, blocksZ: 6, seed: 1, way: "on" };
/** The four pin cities: 6 x 6 seeds 1, 2, 3 and 8, one-way on. */
export const PINNED: readonly City[] = [1, 2, 3, 8].map((seed) => ({ blocksX: 6, blocksZ: 6, seed, way: "on" as const }));
export const label = (o: City): string => `${o.blocksX} x ${o.blocksZ} seed ${o.seed} one-way ${o.way}`;

const cache = new Map<string, CityPlanRun>();
/** The city run through stage 1 only. */
export function streetsOf(o: City): CityPlanRun {
  const k = `${o.blocksX}x${o.blocksZ}:${o.seed}:${o.way}`;
  if (!cache.has(k)) {
    const stage = (o.way === "on" ? streetsStage : streetsStageWith(0)) as unknown as CityStageDef;
    cache.set(k, runCity({ blocksX: o.blocksX, blocksZ: o.blocksZ, seed: o.seed }, "streets", [stage]));
  }
  return cache.get(k)!;
}

export function planOf(o: City): CityPlan {
  const r = streetsOf(o);
  if (!r.ok) throw new Error(`${label(o)} failed at ${r.failure.stage}: ${r.failure.reason}`);
  return r.plan;
}

// ---- the hand-worked fixture: 3 x 3 blocks, one inner ----
//
// Block (c, r) is "block:<c>:<r>"; `streets.blocks` lists them column by column ((0,0), (0,1), (0,2), (1,0), ...). Columns are 10, 25 and 40 cells wide, rows 10, 20 and 30 tall, with a 5 cell street between.
// So two blocks side by side (+x) share their row's height (10, 20 or 30), and two stacked (+z) share their column's width (10, 25 or 40).

export const FIXTURE_W = [10, 25, 40] as const;
export const FIXTURE_H = [10, 20, 30] as const;
const STREET = 5;

export function fixtureBlocks(): CityPlanBlock[] {
  const x0 = [0, 1, 2].map((c) => FIXTURE_W.slice(0, c).reduce((a, w) => a + w + STREET, 0));
  const y0 = [0, 1, 2].map((r) => FIXTURE_H.slice(0, r).reduce((a, h) => a + h + STREET, 0));
  const id = (c: number, r: number): string => `block:${c}:${r}`;
  const out: CityPlanBlock[] = [];
  for (let c = 0; c < 3; c++) {
    for (let r = 0; r < 3; r++) {
      const i0 = x0[c]!;
      const i1 = i0 + FIXTURE_W[c]!;
      const j0 = y0[r]!;
      const j1 = j0 + FIXTURE_H[r]!;
      const side = (s: CitySide, across: string | null, span: { lo: number; hi: number }, shared: { lo: number; hi: number }): CityPlanBlock["sides"][CitySide] => ({
        side: s,
        street: `street:${s}`,
        span,
        across: across ? [{ block: across, span: shared }] : [],
        junctions: [],
      });
      const rowSpan = { lo: j0, hi: j1 };
      const colSpan = { lo: i0, hi: i1 };
      out.push({
        id: id(c, r),
        bi: c,
        bj: r,
        i0,
        i1,
        j0,
        j1,
        type: "medium",
        sides: {
          "-x": side("-x", c > 0 ? id(c - 1, r) : null, rowSpan, rowSpan),
          "+x": side("+x", c < 2 ? id(c + 1, r) : null, rowSpan, rowSpan),
          "-z": side("-z", r > 0 ? id(c, r - 1) : null, colSpan, colSpan),
          "+z": side("+z", r < 2 ? id(c, r + 1) : null, colSpan, colSpan),
        },
      });
    }
  }
  return out;
}
