/**
 * Stage 8: the pavement runs (ticket 070 I; RN and PF). A terrace run is a chain of row neighbours (consecutive buildings of one outer `CityBuildingRow`, no opening between) whose cells' front open side faces "street", with the pavement
 * cell one cell out across `front` in front of each. Only these pavements carry pavement props (16.5). A building whose cells do not all front a street ends the chain and is in no run; a building with only some of them is a failure of the
 * rule (R-2), as is a front cell that is not an edge cell of role `pavement`. The run's frame is the tile city's 5 m pavement frame: `s` along the street from `lo_m`, `t` from the wall edge to the kerb edge.
 * Stage 8 works the runs out itself from `buildings.rows`, `buildings.buildings` and `mass.built` (no stage folder imports another, R-1; stage 7's `runsOf` is not imported).
 */

import type { CityBuilding, CityBuildingsLayer, CityCell, CityEdgeLayer, CityMassLayer, CityPavementRun, CitySide } from "../../core";
import { CityStageError } from "../pipeline/error";
import { CELL_M } from "./constants";
import { SIDE_VEC, SIDE_YAW, cellKey } from "./geom";

/** A run with what the walk along it needs: the axis it runs along, which way its pavement lies, its length and the turn its props take. */
export interface RunGeo extends CityPavementRun {
  /** The axis the run runs along: "x" for a "-z" or "+z" front, "z" for a "-x" or "+x" front. */
  readonly along: "x" | "z";
  /** +1 when the pavement is at larger x or z than the wall (a "+x" or "+z" front), else -1. */
  readonly sgn: 1 | -1;
  /** `hi_m - lo_m`. */
  readonly len: number;
  /** Every prop of the run faces the street: the turn that brings its own +z onto the front. */
  readonly yaw: 0 | 90 | 180 | 270;
}

/** A typed run with its working fields (axis, side of the pavement, length, turn). */
export function geoOf(run: CityPavementRun): RunGeo {
  const sgn = run.side === "+z" || run.side === "+x" ? 1 : -1;
  return { ...run, along: run.side === "+z" || run.side === "-z" ? "x" : "z", sgn, len: run.hi_m - run.lo_m, yaw: SIDE_YAW[run.side] };
}

/** The typed fields of a run. */
export function plainRun(r: RunGeo): CityPavementRun {
  return { id: r.id, street: r.street, block: r.block, side: r.side, buildings: r.buildings, cells: r.cells, pavement: r.pavement, lo_m: r.lo_m, hi_m: r.hi_m, wall_m: r.wall_m, kerb_m: r.kerb_m };
}

/** The world point and the footprint (own width `w` along the run, depth `d` across it) at (`s`, `t`) of a run's frame. */
export function worldOf(run: RunGeo, s: number, t: number, w: number, d: number): { x: number; z: number; rect: { x0: number; x1: number; z0: number; z1: number } } {
  const u = run.lo_m + s;
  const a = run.wall_m + run.sgn * t;
  return run.along === "x"
    ? { x: u, z: a, rect: { x0: u - w / 2, x1: u + w / 2, z0: a - d / 2, z1: a + d / 2 } }
    : { x: a, z: u, rect: { x0: a - d / 2, x1: a + d / 2, z0: u - w / 2, z1: u + w / 2 } };
}

/** `s` and `t` of a world point in a run's frame. */
export const frameOf = (run: RunGeo, x: number, z: number): { s: number; t: number } => (run.along === "x" ? { s: x - run.lo_m, t: run.sgn * (z - run.wall_m) } : { s: z - run.lo_m, t: run.sgn * (x - run.wall_m) });

/** The runs of a city, in `buildings.rows` order, then along each row. */
export function buildRuns(mass: Pick<CityMassLayer, "built">, edge: Pick<CityEdgeLayer, "cells">, buildings: Pick<CityBuildingsLayer, "rows" | "buildings">): RunGeo[] {
  const builtAt = new Map(mass.built.map((c) => [cellKey(c.i, c.j), c] as const));
  const edgeAt = new Map(edge.cells.map((c) => [cellKey(c.i, c.j), c] as const));
  const byId = new Map<string, CityBuilding>(buildings.buildings.map((b) => [b.id, b]));
  const runs: RunGeo[] = [];
  for (const row of buildings.rows) {
    if (row.row !== "outer") continue;
    const front = row.front;
    const alongI = front === "+z" || front === "-z";
    const at = (c: CityCell): number => (alongI ? c.i : c.j);
    interface Item {
      readonly b: CityBuilding;
      readonly lo: number;
      readonly hi: number;
      readonly street: boolean;
    }
    const items: Item[] = [];
    for (const id of row.buildings) {
      const b = byId.get(id);
      if (!b) throw new CityStageError(`RN: row ${row.id} lists the building ${id}, which is not in the buildings layer`);
      const n = b.cells.filter((c) => builtAt.get(cellKey(c.i, c.j))?.open.some((o) => o.side === front && o.faces === "street")).length;
      if (n !== 0 && n !== b.cells.length) throw new CityStageError(`RN: building ${b.id} of row ${row.id} has ${n} of ${b.cells.length} cells fronting a street`, b.cells);
      const a = b.cells.map(at);
      items.push({ b, lo: Math.min(...a), hi: Math.max(...a), street: n > 0 });
    }
    items.sort((p, q) => p.lo - q.lo);
    let chain: Item[] = [];
    const flush = (): void => {
      if (chain.length === 0) return;
      const cells = chain.flatMap((x) => [...x.b.cells]).sort((p, q) => at(p) - at(q));
      const [vx, vz] = SIDE_VEC[front];
      const pavement = cells.map((c) => ({ i: c.i + vx, j: c.j + vz }));
      let street: string | null = null;
      for (const p of pavement) {
        const e = edgeAt.get(cellKey(p.i, p.j));
        if (!e || e.role !== "pavement") throw new CityStageError(`RN: the cell in front of (${p.i - vx}, ${p.j - vz}) on row ${row.id} is ${e ? e.role : "not a street cell"}, not pavement`, [p]);
        if (street !== null && e.street !== street) throw new CityStageError(`RN: run ${chain[0]!.b.id} fronts two streets (${street} and ${e.street})`, [p]);
        street = e.street;
      }
      const c0 = cells[0]!;
      const cN = cells[cells.length - 1]!;
      const lo = at(c0) * CELL_M;
      const hi = (at(cN) + 1) * CELL_M;
      const wall = front === "+z" ? (c0.j + 1) * CELL_M : front === "-z" ? c0.j * CELL_M : front === "+x" ? (c0.i + 1) * CELL_M : c0.i * CELL_M;
      const sgn = front === "+z" || front === "+x" ? 1 : -1;
      runs.push({
        id: `${street}|${chain[0]!.b.id}`,
        street: street!,
        block: row.block,
        side: front as CitySide,
        buildings: chain.map((x) => x.b.id),
        cells,
        pavement,
        lo_m: lo,
        hi_m: hi,
        wall_m: wall,
        kerb_m: wall + sgn * CELL_M,
        along: alongI ? "x" : "z",
        sgn,
        len: hi - lo,
        yaw: SIDE_YAW[front],
      });
      chain = [];
    };
    for (const it of items) {
      if (!it.street) {
        flush();
        continue;
      }
      if (chain.length > 0 && it.lo !== chain[chain.length - 1]!.hi + 1) flush();
      chain.push(it);
    }
    flush();
  }
  return runs;
}
