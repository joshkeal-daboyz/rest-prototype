/**
 * Ticket 070 I, criterion 5: the greens on the 20 named runs (GB), and a hand-worked 3 by 5 green.
 */
import { describe, expect, it } from "vitest";
import { stageRand } from "../pipeline/seeds";
import { GREEN_TREE_ONE_IN } from "./constants";
import { cellKey } from "./geom";
import { groundFailures } from "./groundcheck";
import { greenPaths, layoutGreens } from "./greens";
import { newStats } from "./stats";
import { NAMED, label, layersOf } from "./testcities";

describe("the greens on the 20 named runs (criterion 5)", { timeout: 120_000 }, () => {
  const seen = { courtBench: 0, parkBench: 0, courtTree: 0, parkTree: 0 };
  for (const o of NAMED) {
    it(`${label(o)}: GB holds, every path with a free green cell beside its middle has its bench, and the trees are exactly the hashed green cells less the bench cells`, () => {
      const l = layersOf(o);
      expect(groundFailures(l.ground, { mass: l.mass, edge: l.edge, facades: l.facades })).toEqual([]);
      const greens = l.ground.props.filter((p) => p.on === "green");
      const benches = greens.filter((p) => p.kind === "bench");
      const trees = greens.filter((p) => p.kind === "tree");
      expect(greens.length).toBe(benches.length + trees.length);
      const useAt = new Map(l.mass.cells.map((c) => [cellKey(c.i, c.j), c] as const));
      const benchCells = new Set(benches.map((p) => cellKey(p.cell.i, p.cell.j)));
      expect(benchCells.size).toBe(benches.length);
      // every path of two or more greenPath cells with a green cell beside its middle has a bench there
      const paths = greenPaths(l.mass);
      expect(paths.length).toBeGreaterThan(0);
      let withFree = 0;
      for (const path of paths) {
        const mid = path.cells[Math.floor(path.cells.length / 2)]!;
        const beside = [1, -1].map((s) => (path.axis === "x" ? { i: mid.i, j: mid.j + s } : { i: mid.i + s, j: mid.j })).filter((c) => useAt.get(cellKey(c.i, c.j))?.use === "green");
        if (beside.length === 0) continue;
        withFree++;
        expect(
          beside.some((c) => benchCells.has(cellKey(c.i, c.j))),
          `a path of ${path.cells.length} cells at ${mid.i},${mid.j} has a green cell beside its middle and no bench`,
        ).toBe(true);
      }
      expect(withFree).toBeGreaterThan(0);
      // the trees: exactly the hashed green cells less the bench cells
      const rand = stageRand("ground", o.seed);
      const want = l.mass.cells.filter((c) => c.use === "green" && rand("green", "tree", c.i, c.j) % GREEN_TREE_ONE_IN === 0 && !benchCells.has(cellKey(c.i, c.j))).map((c) => cellKey(c.i, c.j));
      expect(trees.map((p) => cellKey(p.cell.i, p.cell.j)).sort()).toEqual(want.sort());
      for (const p of [...benches, ...trees]) {
        const part = useAt.get(cellKey(p.cell.i, p.cell.j))!.part;
        if (p.kind === "bench") seen[part !== null ? "courtBench" : "parkBench"]++;
        else seen[part !== null ? "courtTree" : "parkTree"]++;
      }
    });
  }

  it("the named runs have trees and benches in court parts and in parks", () => {
    expect(seen.courtBench).toBeGreaterThan(0);
    expect(seen.parkBench).toBeGreaterThan(0);
    expect(seen.courtTree).toBeGreaterThan(0);
    expect(seen.parkTree).toBeGreaterThan(0);
  });
});

// ---- hand-worked: a 3 by 5 green, a path along z down its middle column ----

const green = (i: number, j: number, use = "green"): unknown => ({ i, j, block: "block:0:0", part: "p", use, opening: null });
/** Columns 0 to 2, rows 0 to 4: the path in column 1; the cell (2, 2) beside its middle is `use2`. */
const mass = (use2 = "green"): never => ({ cells: Array.from({ length: 15 }, (_, n) => (n % 3 === 1 ? green(1, Math.floor(n / 3), "greenPath") : green(n % 3, Math.floor(n / 3), n === 8 ? use2 : "green"))) }) as never;
/** Trees on (0, 0), (2, 2) and (0, 4): tree key 1 (Tree_02) and a quarter turn of 2 (180). */
const rand =
  (...k: readonly (string | number)[]): number => {
    if (k[1] === "tree") return (k[2] === 0 && k[3] === 0) || (k[2] === 2 && k[3] === 2) || (k[2] === 0 && k[3] === 4) ? 0 : 1;
    if (k[1] === "treekey") return 1;
    if (k[1] === "treeyaw") return 2 * 256;
    return 0;
  };

describe("a fixture 3 by 5 green with a long path, by hand (criterion 5)", () => {
  it("the path's bench stands in the green cell beside its middle cell, on the higher side first, 1.0 m from the path's edge, facing it", () => {
    const props = layoutGreens(mass(), rand, newStats());
    const bench = props.find((p) => p.kind === "bench")!;
    // the path (1, 0) to (1, 4), middle cell (1, 2); the higher side is column 2: the cell (2, 2), centre (12.5, 12.5); the path's edge is x = 10; the pivot is 1.0 m from it: 11.0
    expect(bench.cell).toEqual({ i: 2, j: 2 });
    expect(bench.placement.x_m).toBeCloseTo(11, 12);
    expect(bench.placement.z_m).toBe(12.5);
    expect(bench.placement.yaw_deg).toBe(270); // its own +z front toward -x, the path
    expect(bench.placement.key).toBe("city-pack:SM_Prop_ParkBench_01");
    expect(bench.on).toBe("green");
    expect(bench.host).toBe("p");
    expect(bench.line).toBeNull();
  });

  it("a tree stands at the middle of each hashed green cell that holds no bench, with its hashed key and turn; the bench cell has none", () => {
    const props = layoutGreens(mass(), rand, newStats());
    const trees = props.filter((p) => p.kind === "tree");
    expect(trees.map((p) => [p.cell.i, p.cell.j])).toEqual([
      [0, 0],
      [0, 4],
    ]);
    expect(trees.map((p) => [p.placement.x_m, p.placement.z_m])).toEqual([
      [2.5, 2.5],
      [2.5, 22.5],
    ]);
    for (const t of trees) {
      expect(t.placement.key).toBe("city-pack:SM_Env_Tree_02");
      expect(t.placement.yaw_deg).toBe(180);
    }
    // row-major by cell: tree (0,0), the bench (2,2), tree (0,4)
    expect(props.map((p) => p.kind)).toEqual(["tree", "bench", "tree"]);
  });

  it("where the higher side is not green the bench goes to the lower side and faces +x", () => {
    const props = layoutGreens(mass("apron"), rand, newStats());
    const bench = props.find((p) => p.kind === "bench")!;
    expect(bench.cell).toEqual({ i: 0, j: 2 });
    expect(bench.placement.x_m).toBeCloseTo(4, 12);
    expect(bench.placement.yaw_deg).toBe(90);
  });
});
