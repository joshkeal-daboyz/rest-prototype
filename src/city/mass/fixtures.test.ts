/**
 * Stage 3 on typed-in fixtures (light): the failing fixtures the ticket names (a cell with opposite open sides, a part 3 deep, an opening's record removed, a block cell left with no use), the row-stretch
 * rule, a lane block (C2: whose parts open on the lane, and strict M5) and a plaza block. The fixtures are small blocks typed in here; the checks read only the layer, so each failure is made by editing a layer the planner produced.
 */
import { describe, expect, it } from "vitest";
import type { CityBlock, CityLandLayer, CityMassLayer, CityPart, CityStreetCell, CityStreetsLayer } from "../../core";
import { frontageShare, massFailures, stretchProblems } from "./check";
import { planMass } from "./plan";
import type { LotSite } from "./sites";

const block = (i0: number, i1: number, j0: number, j1: number): CityBlock => ({ id: "block:0:0", bi: 0, bj: 0, i0, i1, j0, j1, type: "medium" });
const part = (id: string, b: CityBlock, r: Pick<CityPart, "i0" | "i1" | "j0" | "j1">, edges: Partial<CityPart["edges"]> = {}): CityPart => ({
  id,
  block: b.id,
  ...r,
  shape: Math.min(r.i1 - r.i0, r.j1 - r.j0) === 2 ? "strip" : "court",
  edges: { "+x": "street", "-x": "street", "+z": "street", "-z": "street", ...edges },
});
const landOf = (parts: CityPart[], lanes: CityLandLayer["lanes"] = []): CityLandLayer => ({ stage: "land", blocks: [], parts, lanes, parks: [] });
const streetsOf = (blocks: CityBlock[], cells: CityStreetCell[] = []): Pick<CityStreetsLayer, "blocks" | "cells"> => ({ blocks, cells });
const layerOf = (p: ReturnType<typeof planMass>): CityMassLayer => ({ stage: "mass", cells: p.cells, built: p.built, openings: p.openings, courts: [], units: [] });
const ids = (l: ReturnType<typeof massFailures>): string[] => l.map((f) => f.id);

/** A court block, 16 by 11 cells at (2, 2), and its mass with no plaza; `rand` always 1, so the walk-through is the second place that fits. */
const BLOCK = block(2, 18, 2, 13);
const LAND = landOf([part("block:0:0", BLOCK, BLOCK)]);
const MASS = layerOf(planMass(streetsOf([BLOCK]), LAND, () => 1));

describe("stage 3 on fixtures", () => {
  it("a court block is laid whole: it passes every check, with one walk-through and no plaza", () => {
    expect(massFailures(MASS, [BLOCK], LAND)).toEqual([]);
    expect(MASS.openings.map((o) => o.kind)).toEqual(["walk"]);
    expect(MASS.cells).toHaveLength(16 * 11);
    // four block corners, and the four columns that flank the walk-through (two in each ring)
    expect(MASS.built.filter((b) => b.column === "corner")).toHaveLength(8);
    expect(MASS.built.filter((b) => b.column === "blind")).toHaveLength(4);
    expect(frontageShare(MASS).share).toBeGreaterThan(0.9);
  });

  it("failing fixture, M3: a cell with opposite open sides (its back turned into the apron)", () => {
    const cells = MASS.cells.map((c) => (c.i === 8 && c.j === 3 ? { ...c, use: "apron" as const, opening: null } : c));
    const failures = massFailures({ ...MASS, cells }, [BLOCK], LAND);
    const m3 = failures.find((f) => f.id === "M3" && /opposite/.test(f.reason));
    expect(m3?.cells).toEqual([expect.objectContaining({ i: 8, j: 2 })]);
  });

  it("failing fixture, M4b: a part 3 deep has one ring-2 row shared by two outer rows", () => {
    const b = block(2, 18, 2, 5);
    const land = landOf([part("block:0:0", b, b)]);
    const mass = layerOf(planMass(streetsOf([b]), land, () => 1));
    expect(ids(massFailures(mass, [b], land))).toContain("M4b");
    expect(massFailures(mass, [b], land).find((f) => f.id === "M4b")?.reason).toMatch(/3 deep/);
  });

  it("failing fixture, M5 and G2: an opening's record removed fails at that opening", () => {
    const walk = MASS.openings.find((o) => o.kind === "walk")!;
    const failures = massFailures({ ...MASS, openings: MASS.openings.filter((o) => o !== walk) }, [BLOCK], LAND);
    expect(ids(failures)).toContain("M5");
    expect(failures.find((f) => f.id === "M5")?.reason).toMatch(/no recorded opening owns it/);
    expect(failures.find((f) => f.id === "M5")?.cells[0]).toEqual(expect.objectContaining({ i: walk.cells[0]!.i, j: walk.cells[0]!.j }));
    expect(ids(failures)).toContain("G2");
  });

  it("failing fixture, G3: a block cell left with no use", () => {
    const failures = massFailures({ ...MASS, cells: MASS.cells.filter((c) => !(c.i === 9 && c.j === 7)) }, [BLOCK], LAND);
    expect(failures.find((f) => f.id === "G3")?.reason).toMatch(/cell \(9, 7\).*no use/);
  });

  it("failing fixture, G2: a block side's back edge neither built nor a recorded opening", () => {
    const cells = MASS.cells.map((c) => (c.i === 5 && c.j === 2 ? { ...c, use: "apron" as const } : c));
    expect(ids(massFailures({ ...MASS, cells }, [BLOCK], LAND))).toContain("G2");
  });

  it("failing fixture, R1: a frontage with too much of it open fails the floor", () => {
    const cells = MASS.cells.map((c) => (c.j === 2 && c.i >= 3 && c.i <= 12 ? { ...c, use: "walk" as const, opening: "x" } : c));
    expect(frontageShare({ cells }).share).toBeLessThan(0.88);
    expect(ids(massFailures({ ...MASS, cells }, [BLOCK], LAND))).toContain("R1");
  });

  it("M5's row stretch: a stretch of one cell between a corner and an opening fails; an opening at the row's end, and one opening's cells together, do not", () => {
    const p = { i0: 0, i1: 10, j0: 0, j1: 10 };
    const at = (m: Record<string, string>) => (i: number, j: number): string | null => m[`${i},${j}`] ?? null;
    expect(stretchProblems(p, at({}))).toEqual([]);
    // an opening one cell from the corner on the top row of ring 1
    expect(stretchProblems(p, at({ "1,0": "walk" })).length).toBeGreaterThan(0);
    // two different openings with no cell between them
    expect(stretchProblems(p, at({ "4,0": "walk", "5,0": "plaza" })).length).toBeGreaterThan(0);
    // one opening of two cells, 2 or more cells from each corner
    expect(stretchProblems(p, at({ "4,0": "walk", "4,1": "walk" }))).toEqual([]);
    // a plaza in the corner: it starts at the row's end
    expect(stretchProblems(p, at({ "0,0": "plaza", "1,0": "plaza", "0,1": "plaza", "1,1": "plaza" }))).toEqual([]);
  });

  it("a plaza is 2 x 2 in a part's corner: its neighbours are corner columns that face it as street frontage", () => {
    const rand = (...key: readonly (string | number)[]): number => (key[0] === "plaza" || key[0] === "plazacorner" ? 0 : 1);
    const mass = layerOf(planMass(streetsOf([BLOCK]), LAND, rand));
    expect(massFailures(mass, [BLOCK], LAND)).toEqual([]);
    const plaza = mass.openings.find((o) => o.kind === "plaza")!;
    expect(plaza.cells.map((c) => `${c.i},${c.j}`).sort()).toEqual(["2,2", "2,3", "3,2", "3,3"]);
    const beside = mass.built.find((b) => b.i === 4 && b.j === 2)!;
    expect(beside.column).toBe("corner");
    expect(beside.open.map((o) => [o.side, o.faces, o.frontage])).toEqual([["-x", "plaza", "street"], ["-z", "street", "street"]]);
    const inner = mass.built.find((b) => b.i === 4 && b.j === 3)!;
    expect(inner.column).toBe("corner");
    expect(inner.open.map((o) => [o.side, o.faces, o.frontage])).toEqual([["-x", "plaza", "street"], ["+z", "court", "quiet"]]);
  });

  it("a lane block: two parts, each opening on the lane (a frontage lot, a court); two lane openings, each with its own mouth street; no walk-through", () => {
    const b = block(2, 16, 2, 11);
    const land = landOf([part("block:0:0/a", b, { i0: 2, i1: 8, j0: 2, j1: 11 }, { "+x": "lane" }), part("block:0:0/b", b, { i0: 9, i1: 16, j0: 2, j1: 11 }, { "-x": "lane" })], [{ block: b.id, axis: "z", at: 8 }]);
    const cells: CityStreetCell[] = [
      { i: 8, j: 1, role: "pavement", street: "x:0", band: 0 },
      { i: 8, j: 11, role: "pavement", street: "x:1", band: 0 },
    ];
    // part a is 6 wide, so its interior has no room for a court: a frontage lot on the lane; part b is 7 wide: a court on the lane
    const lots: LotSite[] = [
      { part: "block:0:0/a", block: b.id, serves: b.id, kind: "frontLot", side: "+x", t: 3 },
      { part: "block:0:0/b", block: b.id, serves: b.id, kind: "court", side: "-x", t: 3 },
    ];
    const mass = layerOf(planMass(streetsOf([b], cells), land, () => 1, lots));
    expect(massFailures(mass, [b], land)).toEqual([]);
    const onLane = mass.openings.filter((o) => o.kind === "drive" || o.kind === "frontLot");
    expect(onLane.map((o) => [o.id, o.kind, o.mouth])).toEqual([
      ["block:0:0/a/lot/0", "frontLot", null],
      ["block:0:0/b/drive/0", "drive", null],
    ]);
    const lanes = mass.openings.filter((o) => o.kind === "lane");
    expect(lanes.map((o) => [o.id, o.mouth!.street, o.mouth!.cells])).toEqual([
      ["block:0:0/lane/a", "x:0", [{ i: 8, j: 2 }]],
      ["block:0:0/lane/b", "x:1", [{ i: 8, j: 10 }]],
    ]);
    expect(lanes.reduce((n, o) => n + o.cells.length, 0)).toBe(9);
    expect(mass.cells.find((c) => c.i === 8 && c.j === 2)!.use).toBe("laneMouth");
    expect(mass.cells.find((c) => c.i === 8 && c.j === 5)!.use).toBe("lane");
    expect(mass.openings.some((o) => o.kind === "walk")).toBe(false);
    const rowOne = mass.built.find((c) => c.i === 7 && c.j === 8)!;
    expect(rowOne.open.map((o) => [o.side, o.faces, o.frontage])).toEqual([["+x", "lane", "quiet"]]);
    const corner = mass.built.find((c) => c.i === 7 && c.j === 2)!;
    expect(corner.column).toBe("corner");
    expect(corner.open.map((o) => [o.side, o.faces])).toEqual([["+x", "lane"], ["-z", "street"]]);
  });

  it("failing fixture, M5 strict: a lane part's interior with no drive onto it touches no opening (C1's lane exemption is gone)", () => {
    const b = block(2, 16, 2, 11);
    const land = landOf([part("block:0:0/a", b, { i0: 2, i1: 8, j0: 2, j1: 11 }, { "+x": "lane" }), part("block:0:0/b", b, { i0: 9, i1: 16, j0: 2, j1: 11 }, { "-x": "lane" })], [{ block: b.id, axis: "z", at: 8 }]);
    const cells: CityStreetCell[] = [
      { i: 8, j: 1, role: "pavement", street: "x:0", band: 0 },
      { i: 8, j: 11, role: "pavement", street: "x:1", band: 0 },
    ];
    const mass = layerOf(planMass(streetsOf([b], cells), land, () => 1));
    const faults = massFailures(mass, [b], land).filter((f) => f.id === "M5");
    expect(faults.map((f) => f.reason)).toEqual(["M5: the interior of part block:0:0/a touches no opening", "M5: the interior of part block:0:0/b touches no opening"]);
  });

  it("a lane whose mouth has no street beyond it stops the stage (M5), naming the cell", () => {
    const b = block(2, 16, 2, 11);
    const land = landOf([part("block:0:0/a", b, { i0: 2, i1: 8, j0: 2, j1: 11 }, { "+x": "lane" }), part("block:0:0/b", b, { i0: 9, i1: 16, j0: 2, j1: 11 }, { "-x": "lane" })], [{ block: b.id, axis: "z", at: 8 }]);
    expect(() => planMass(streetsOf([b]), land, () => 1)).toThrow(/M5: the lane of block:0:0 has no street beyond its mouth at \(8, 1\)/);
  });

  it("a block cell no part, lane or park covers stops the stage (G3), naming the cell", () => {
    const land = landOf([part("block:0:0", BLOCK, { i0: 2, i1: 18, j0: 2, j1: 12 })]);
    expect(() => planMass(streetsOf([BLOCK]), land, () => 1)).toThrow(/G3: cell \(2, 12\) of block:0:0 is in no part, lane or park/);
  });

  it("a 6 by 6 court part has no place for a walk-through, so the stage stops (M5) rather than leave its interior shut in", () => {
    const b = block(2, 8, 2, 8);
    expect(() => planMass(streetsOf([b]), landOf([part("block:0:0", b, b)]), () => 1)).toThrow(/M5: part block:0:0 has an interior and no place for a walk-through/);
  });
});
