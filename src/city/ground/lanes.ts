/**
 * Stage 8: the lane bins (ticket 070 I; LB, Q28 answer 3; tilecity.ts' alley bins, 19.6, grammar rule 9). A bin stands in the lane cell, its back `FURN_WALL_M` from the wall of the built cell beside it, facing into the lane, at
 * `s = LANE_BIN_FIRST_M + n x ALLEY_BIN_EVERY_M` (12.5, 22.5, 32.5 m ...) from the lane's low end while `s <= length - CELL_M - 0.5`, on the + side for even n and the - side for odd. It is skipped, not moved, where the cell beside is not
 * built, where its pivot's cell is a `laneMouth`, or where KO, DK, EL or AV refuse it. A bin takes about 1.1 m of the lane's 5 m.
 */

import type { CityGroundProp, CityLandLayer, CityMassLayer, CityPlanBlock } from "../../core";
import { CityStageError } from "../pipeline/error";
import { ALLEY_BIN_EVERY_M, CELL_M, FURN_WALL_M, LANE_BIN_FIRST_M } from "./constants";
import { cellKey } from "./geom";
import { avoidVerdict, inDoorStrip, keepoutHit, type Keepouts } from "./keepout";
import { LANE_BINS, boundsOf } from "./kit";
import type { Unit } from "./pavement";
import { keyRect, makeProp } from "./props";
import { inc, type GroundStats } from "./stats";

/** A lane's host id, "<block>|<axis>|<at>". */
export const laneHost = (l: { block: string; axis: "x" | "z"; at: number }): string => `${l.block}|${l.axis}|${l.at}`;

/** The lane bins, `land.lanes` order, along each lane. */
export function layoutLanes(land: Pick<CityLandLayer, "lanes">, blocks: readonly Pick<CityPlanBlock, "id" | "i0" | "i1" | "j0" | "j1">[], mass: Pick<CityMassLayer, "cells" | "built">, keep: Keepouts, unit: Unit, stats: GroundStats): CityGroundProp[] {
  const useAt = new Map(mass.cells.map((c) => [cellKey(c.i, c.j), c.use] as const));
  const builtAt = new Set(mass.built.map((c) => cellKey(c.i, c.j)));
  const blockById = new Map(blocks.map((b) => [b.id, b] as const));
  const out: CityGroundProp[] = [];
  for (const lane of land.lanes) {
    const b = blockById.get(lane.block);
    if (!b) throw new CityStageError(`LB: the lane ${laneHost(lane)} is in a block that is not in the streets layer`);
    const alongZ = lane.axis === "z";
    const length = (alongZ ? b.j1 - b.j0 : b.i1 - b.i0) * CELL_M;
    const start = (alongZ ? b.j0 : b.i0) * CELL_M;
    const host = laneHost(lane);
    let n = 0;
    for (let s = LANE_BIN_FIRST_M; s <= length - CELL_M - 0.5; s += ALLEY_BIN_EVERY_M, n++) {
      stats.lane.tries++;
      const sign = n % 2 === 0 ? 1 : -1;
      const key = LANE_BINS[Math.floor(unit(host, "binkey", n) * LANE_BINS.length)]!;
      const e = boundsOf(key);
      const along = start + s;
      const cellAlong = Math.floor(along / CELL_M);
      const pivot = alongZ ? { i: lane.at, j: cellAlong } : { i: cellAlong, j: lane.at };
      const beside = alongZ ? { i: lane.at + sign, j: cellAlong } : { i: cellAlong, j: lane.at + sign };
      const use = useAt.get(cellKey(pivot.i, pivot.j));
      const wall = sign > 0 ? (lane.at + 1) * CELL_M : lane.at * CELL_M;
      const across = wall - sign * (FURN_WALL_M + e.d / 2);
      const yaw = alongZ ? (sign > 0 ? 270 : 90) : sign > 0 ? 180 : 0;
      const x = alongZ ? across : along;
      const z = alongZ ? along : across;
      const rect = keyRect(key, x, z, yaw);
      let why: string | null = null;
      if (!builtAt.has(cellKey(beside.i, beside.j))) why = `notBuilt:${useAt.get(cellKey(beside.i, beside.j)) ?? "street"}`;
      else if (use === "laneMouth") why = "mouth";
      else if (use !== "lane") why = `notLane:${use ?? "none"}`;
      else if (keepoutHit(keep, rect) !== null) why = "KO";
      else if (inDoorStrip(keep, rect)) why = "DK";
      else why = avoidVerdict(keep, rect, e.h, 0);
      if (why !== null) {
        inc(stats.lane.refused, why);
        continue;
      }
      stats.lane.placed++;
      out.push(makeProp({ key, on: "lane", block: lane.block, host, line: "wall", x, z, yaw }));
    }
  }
  return out;
}
