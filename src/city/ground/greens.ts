/**
 * Stage 8: the greens (ticket 070 I; GB; `fillGreen`'s trees and benches, tilecity.ts, style guide 19.4). On the pipeline a path is a straight run of two or more `greenPath` cells along x or z (a cell where two cross is on both). Its bench
 * stands in the `green` cell beside its middle cell (`floor(n / 2)` from its low end), on the higher side first, then the lower, facing the path, its pivot `BENCH_FROM_PATH_M` from the path's edge; a cell takes one bench at most.
 * A tree stands on every `green` cell (a court part's or a park's) whose `rand("green", "tree", i, j) % GREEN_TREE_ONE_IN` is 0 and that holds no bench, at the cell's middle, with a hashed quarter turn and a hashed key of `GREEN_TREES`.
 * Stage 3's paths are not re-laid. Props are in row-major order of their cell.
 */

import type { CityGroundProp, CityMassCell, CityMassLayer } from "../../core";
import { CityStageError } from "../pipeline/error";
import { BENCH_FROM_PATH_M, CELL_M, GREEN_TREE_ONE_IN } from "./constants";
import { cellKey } from "./geom";
import { GREEN_BENCH, GREEN_TREES } from "./kit";
import { makeProp } from "./props";
import { inc, type GroundStats } from "./stats";

/** The mass layer's rand: `rand(...)` is the stage's own hash. */
export type Rand = (...key: readonly (string | number)[]) => number;

interface GreenPath {
  readonly axis: "x" | "z";
  readonly cells: readonly { i: number; j: number }[];
}

/** The paths of the green: every maximal straight run of two or more `greenPath` cells, along x then along z, in row-major order of its first cell. */
export function greenPaths(mass: Pick<CityMassLayer, "cells">): GreenPath[] {
  const use = new Map(mass.cells.map((c) => [cellKey(c.i, c.j), c.use] as const));
  const useAt = (i: number, j: number): string | undefined => use.get(cellKey(i, j));
  const paths: GreenPath[] = [];
  for (const c of mass.cells) {
    if (c.use !== "greenPath") continue;
    if (useAt(c.i - 1, c.j) !== "greenPath") {
      let n = 0;
      while (useAt(c.i + n, c.j) === "greenPath") n++;
      if (n >= 2) paths.push({ axis: "x", cells: Array.from({ length: n }, (_, m) => ({ i: c.i + m, j: c.j })) });
    }
    if (useAt(c.i, c.j - 1) !== "greenPath") {
      let n = 0;
      while (useAt(c.i, c.j + n) === "greenPath") n++;
      if (n >= 2) paths.push({ axis: "z", cells: Array.from({ length: n }, (_, m) => ({ i: c.i, j: c.j + m })) });
    }
  }
  return paths;
}

/** The bench cell of a path and the way its bench faces: the cell beside the path's middle cell, the higher side first, then the lower, that is `green` and holds no bench yet; null when neither is free. */
export function benchOf(path: GreenPath, use: (i: number, j: number) => string | undefined, taken: ReadonlySet<string>): { cell: { i: number; j: number }; dx: number; dz: number } | null {
  const mid = path.cells[Math.floor(path.cells.length / 2)]!;
  for (const sgn of [1, -1]) {
    const cell = path.axis === "x" ? { i: mid.i, j: mid.j + sgn } : { i: mid.i + sgn, j: mid.j };
    if (use(cell.i, cell.j) !== "green" || taken.has(cellKey(cell.i, cell.j))) continue;
    return { cell, dx: path.axis === "x" ? 0 : -sgn, dz: path.axis === "x" ? -sgn : 0 };
  }
  return null;
}

/** The bench's turn: its own +z front toward the path. */
const benchYaw = (dx: number, dz: number): number => (dz > 0 ? 0 : dx > 0 ? 90 : dz < 0 ? 180 : 270);

/** The trees and benches of every green cell, in row-major order of their cell. */
export function layoutGreens(mass: Pick<CityMassLayer, "cells">, rand: Rand, stats: GroundStats): CityGroundProp[] {
  const cellOf = new Map<string, CityMassCell>(mass.cells.map((c) => [cellKey(c.i, c.j), c]));
  const use = (i: number, j: number): string | undefined => cellOf.get(cellKey(i, j))?.use;
  const host = (c: CityMassCell): string => {
    const h = c.part ?? c.opening;
    if (h === null) throw new CityStageError(`GB: the green cell (${c.i}, ${c.j}) has neither a part nor an opening`, [c]);
    return h;
  };
  const g = stats.greens;
  const taken = new Set<string>();
  const out: CityGroundProp[] = [];
  const paths = greenPaths(mass);
  g.paths = paths.length;
  for (const path of paths) {
    const bench = benchOf(path, use, taken);
    if (!bench) {
      g.pathsNoFreeCell++;
      continue;
    }
    const mc = cellOf.get(cellKey(bench.cell.i, bench.cell.j))!;
    out.push(
      makeProp({
        key: GREEN_BENCH,
        on: "green",
        block: mc.block,
        host: host(mc),
        line: null,
        x: (bench.cell.i + 0.5) * CELL_M + bench.dx * (CELL_M / 2 - BENCH_FROM_PATH_M),
        z: (bench.cell.j + 0.5) * CELL_M + bench.dz * (CELL_M / 2 - BENCH_FROM_PATH_M),
        yaw: benchYaw(bench.dx, bench.dz),
      }),
    );
    taken.add(cellKey(bench.cell.i, bench.cell.j));
    g.pathsBenched++;
    inc(g.byPlace, `${mc.part !== null ? "court" : "park"}:bench`);
  }
  for (const c of mass.cells) {
    if (c.use !== "green") continue;
    g.greenCells++;
    if (rand("green", "tree", c.i, c.j) % GREEN_TREE_ONE_IN !== 0) continue;
    g.hashedCells++;
    if (taken.has(cellKey(c.i, c.j))) continue;
    out.push(
      makeProp({
        key: GREEN_TREES[rand("green", "treekey", c.i, c.j) % GREEN_TREES.length]!,
        on: "green",
        block: c.block,
        host: host(c),
        line: null,
        x: (c.i + 0.5) * CELL_M,
        z: (c.j + 0.5) * CELL_M,
        yaw: ((rand("green", "treeyaw", c.i, c.j) >>> 8) % 4) * 90,
      }),
    );
    inc(g.byPlace, `${c.part !== null ? "court" : "park"}:tree`);
  }
  return out.sort((a, b) => a.cell.j - b.cell.j || a.cell.i - b.cell.i);
}
