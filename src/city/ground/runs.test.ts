/**
 * Ticket 070 I, criterion 2: RN on the 20 named runs, and a hand-worked fixture row.
 */
import { describe, expect, it } from "vitest";
import { CityStageError } from "../pipeline/error";
import { SIDE_VEC, cellKey } from "./geom";
import { buildRuns } from "./runs";
import { NAMED, label, layersOf } from "./testcities";

describe("RN on the 20 named runs (criterion 2)", { timeout: 120_000 }, () => {
  for (const o of NAMED) {
    it(`${label(o)}: every run is a chain of row neighbours of one outer street-fronting row, its frame is its cells' edges, and every street-front outer cell is in exactly one run`, () => {
      const { streets, mass, edge, buildings, ground } = layersOf(o);
      const builtAt = new Map(mass.built.map((c) => [cellKey(c.i, c.j), c] as const));
      const edgeAt = new Map(edge.cells.map((c) => [cellKey(c.i, c.j), c] as const));
      const byId = new Map(buildings.buildings.map((b) => [b.id, b] as const));
      const rowOf = new Map(buildings.rows.map((r) => [r.id, r] as const));
      const blockOf = new Map(streets.blocks.map((b) => [b.id, b] as const));
      const inRun = new Map<string, number>();
      expect(ground.runs.length).toBeGreaterThan(100);
      for (const run of ground.runs) {
        const first = byId.get(run.buildings[0]!)!;
        const row = rowOf.get(first.rowId)!;
        expect(row.row).toBe("outer");
        expect(row.front).toBe(run.side);
        expect(run.block).toBe(row.block);
        expect(run.id).toBe(`${run.street}|${run.buildings[0]}`);
        // every building of the run is in the row, consecutive: no gap along the row
        for (const id of run.buildings) expect(row.buildings).toContain(id);
        const along = (c: { i: number; j: number }): number => (run.side === "+z" || run.side === "-z" ? c.i : c.j);
        run.cells.forEach((c, n) => {
          if (n > 0) expect(along(c), `${run.id} has a gap`).toBe(along(run.cells[n - 1]!) + 1);
          // the cell's front open side faces a street
          expect(builtAt.get(cellKey(c.i, c.j))!.open.some((x) => x.side === run.side && x.faces === "street"), `${run.id} ${c.i},${c.j}`).toBe(true);
          inRun.set(cellKey(c.i, c.j), (inRun.get(cellKey(c.i, c.j)) ?? 0) + 1);
          // the pavement cell is the cell in front and an edge cell of role pavement on the run's street
          const [vx, vz] = SIDE_VEC[run.side];
          expect(run.pavement[n]).toEqual({ i: c.i + vx, j: c.j + vz });
          const e = edgeAt.get(cellKey(c.i + vx, c.j + vz))!;
          expect(e.role).toBe("pavement");
          expect(e.street).toBe(run.street);
        });
        expect(run.pavement).toHaveLength(run.cells.length);
        // the frame: lo and hi are the cells' edges, wall the built cells' front cell edge, kerb a cell out
        const c0 = run.cells[0]!;
        const cN = run.cells[run.cells.length - 1]!;
        expect(run.lo_m).toBe(along(c0) * 5);
        expect(run.hi_m).toBe((along(cN) + 1) * 5);
        const wall = run.side === "+z" ? (c0.j + 1) * 5 : run.side === "-z" ? c0.j * 5 : run.side === "+x" ? (c0.i + 1) * 5 : c0.i * 5;
        expect(run.wall_m).toBe(wall);
        expect(run.kerb_m).toBe(wall + (run.side === "+z" || run.side === "+x" ? 5 : -5));
        // no run lies on an edge street's outer side: the street in front of the run is its block's own street on that side, and the pavement cell touches the block's cell (the inner pavement)
        expect(blockOf.get(run.block)!.sides[run.side].street, `${run.id} is not on its block's own street`).toBe(run.street);
      }
      // every street-front outer cell is in exactly one run
      let n = 0;
      for (const row of buildings.rows) {
        if (row.row !== "outer") continue;
        for (const id of row.buildings) {
          for (const c of byId.get(id)!.cells) {
            if (builtAt.get(cellKey(c.i, c.j))!.open.some((x) => x.side === row.front && x.faces === "street")) {
              expect(inRun.get(cellKey(c.i, c.j)), `${c.i},${c.j} of ${row.id}`).toBe(1);
              n++;
            }
          }
        }
      }
      expect(n).toBe([...inRun.values()].length);
    });
  }
});

// ---- hand-worked fixture: a row of three buildings broken by a drive ----

const street = { side: "+z", faces: "street", frontage: "street" } as const;
const built = (i: number, open = [street]): unknown => ({ i, j: 1, block: "block:0:0", part: "p", row: "outer", open, column: "mid", partner: null });
const building = (first: number, count: number): unknown => ({ id: `row|${first},1`, block: "block:0:0", part: "p", rowId: "row", row: "outer", front: "+z", cells: Array.from({ length: count }, (_, k) => ({ i: first + k, j: 1 })) });
const pavementCell = (i: number): unknown => ({ i, j: 2, role: "pavement", street: "x:1", band: 0, faces: "block:0:0" });

describe("a fixture row of three buildings broken by a drive gives two runs (criterion 2, by hand)", () => {
  // cells i = 2, 3 | 4, 5 | (6: the drive) | 7, 8, on row j = 1 fronting +z; the pavement is row j = 2
  const mass = { built: [2, 3, 4, 5, 7, 8].map((i) => built(i)) } as never;
  const edge = { cells: [2, 3, 4, 5, 6, 7, 8].map(pavementCell) } as never;
  const buildings = {
    rows: [{ id: "row", block: "block:0:0", part: "p", row: "outer", front: "+z", buildings: ["row|2,1", "row|4,1", "row|7,1"] }],
    buildings: [building(2, 2), building(4, 2), building(7, 2)],
  } as never;

  it("the first two buildings are one run and the third is its own; the ends are the cells' edges", () => {
    const runs = buildRuns(mass, edge, buildings);
    expect(runs.map((r) => r.id)).toEqual(["x:1|row|2,1", "x:1|row|7,1"]);
    const [a, b] = runs;
    // run 1: cells i 2 to 5, so 10 m to 30 m along x; the wall is the front edge of row j = 1 (10 m), the kerb a cell out (15 m)
    expect([a!.lo_m, a!.hi_m, a!.wall_m, a!.kerb_m, a!.len]).toEqual([10, 30, 10, 15, 20]);
    expect(a!.buildings).toEqual(["row|2,1", "row|4,1"]);
    expect(a!.cells.map((c) => c.i)).toEqual([2, 3, 4, 5]);
    expect(a!.pavement).toEqual([2, 3, 4, 5].map((i) => ({ i, j: 2 })));
    // run 2: cells 7 and 8, 35 m to 45 m
    expect([b!.lo_m, b!.hi_m, b!.wall_m, b!.kerb_m, b!.len]).toEqual([35, 45, 10, 15, 10]);
    expect(b!.side).toBe("+z");
    expect(a!.yaw).toBe(0);
    expect(a!.along).toBe("x");
  });

  it("a building whose cells do not front a street ends the chain and is in no run", () => {
    const quiet = { side: "+z", faces: "lane", frontage: "quiet" } as const;
    const m = { built: [2, 3, 4, 5, 7, 8].map((i) => built(i, i === 4 || i === 5 ? [quiet as never] : [street])) } as never;
    const runs = buildRuns(m, edge, buildings);
    expect(runs.map((r) => [r.lo_m, r.hi_m])).toEqual([
      [10, 20],
      [35, 45],
    ]);
  });

  it("a building with only some cells on a street fails the stage naming RN", () => {
    const quiet = { side: "+z", faces: "lane", frontage: "quiet" } as const;
    const m = { built: [2, 3, 4, 5, 7, 8].map((i) => built(i, i === 5 ? [quiet as never] : [street])) } as never;
    expect(() => buildRuns(m, edge, buildings)).toThrow(CityStageError);
    expect(() => buildRuns(m, edge, buildings)).toThrow(/RN/);
  });

  it("a front cell that is not pavement fails the stage naming RN", () => {
    const e = { cells: [2, 3, 4, 5, 6, 7, 8].map((i) => ({ ...(pavementCell(i) as object), role: i === 3 ? "kerbCut" : "pavement" })) } as never;
    expect(() => buildRuns(mass, e, buildings)).toThrow(/RN/);
  });
});
