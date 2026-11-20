/**
 * Stage 5, section F1, on typed-in land and mass layers (no city is built here): a court part and a strip close into buildings; the tight corner closes as one L; a row stretch of one cell fails rule 6
 * with its cell named; and a layer with a 5-cell building, a 1-cell building, a bent building away from a tight corner, or a cell in no building fails the stage's own check.
 */
import { describe, expect, it } from "vitest";
import type { CityBuildingsLayer, CityBuiltCell, CityCell, CityColumnKind, CityPart, CityPartEdge, CitySide } from "../../core";
import { CityStageError } from "../pipeline/error";
import { stageRand } from "../pipeline/seeds";
import { buildingFailures } from "./check";
import { buildBuildings } from "./stage";

const DELTA: Readonly<Record<CitySide, readonly [number, number]>> = { "-x": [-1, 0], "+x": [1, 0], "-z": [0, -1], "+z": [0, 1] };
const SIDES = ["-z", "+x", "+z", "-x"] as const;

interface Fixture {
  readonly part: CityPart;
  readonly built: CityBuiltCell[];
}

/** A w x h court part at the origin: ring 1 and ring 2 built (less `removed`), the interior open. Open sides, columns and partners are derived as the mass stage records them. */
function court(w: number, h: number, removed: readonly (readonly [number, number])[] = []): Fixture {
  const gone = new Set(removed.map(([i, j]) => `${i},${j}`));
  const dist = (i: number, j: number): [number, number] => [Math.min(i, w - 1 - i), Math.min(j, h - 1 - j)];
  const isBuilt = (i: number, j: number): boolean => i >= 0 && j >= 0 && i < w && j < h && Math.min(...dist(i, j)) <= 1 && !gone.has(`${i},${j}`);
  const built: CityBuiltCell[] = [];
  for (let j = 0; j < h; j++) {
    for (let i = 0; i < w; i++) {
      if (!isBuilt(i, j)) continue;
      const open = SIDES.filter((s) => !isBuilt(i + DELTA[s][0], j + DELTA[s][1])).map((side) => {
        const outside = i + DELTA[side][0] < 0 || j + DELTA[side][1] < 0 || i + DELTA[side][0] >= w || j + DELTA[side][1] >= h;
        return outside ? { side, faces: "street" as const, frontage: "street" as const } : { side, faces: "court" as const, frontage: "quiet" as const };
      });
      const column: CityColumnKind = open.length === 0 ? "blind" : open.length === 1 ? "mid" : "corner";
      const [di, dj] = dist(i, j);
      const d = Math.min(di, dj);
      let target: [number, number];
      if (d === 0) {
        target = di === 0 && dj === 0 ? [i + (i === 0 ? 1 : -1), j + (j === 0 ? 1 : -1)] : di === 0 ? [i + (i === 0 ? 1 : -1), j] : [i, j + (j === 0 ? 1 : -1)];
      } else if (di === 1 && dj === 1) {
        target = [i + (i === 1 ? -1 : 1), j + (j === 1 ? -1 : 1)];
      } else {
        target = di === 1 ? [i + (i === 1 ? -1 : 1), j] : [i, j + (j === 1 ? -1 : 1)];
      }
      built.push({ i, j, block: "block:0:0", part: "block:0:0", row: d === 0 ? "outer" : "inner", open, column, partner: isBuilt(target[0], target[1]) ? { i: target[0], j: target[1] } : null });
    }
  }
  const edges = { "+x": "street", "-x": "street", "+z": "street", "-z": "street" } as const satisfies Record<CitySide, CityPartEdge>;
  return { part: { id: "block:0:0", block: "block:0:0", i0: 0, i1: w, j0: 0, j1: h, shape: "court", edges }, built };
}

/** A 2 x h strip: the "-x" column on a street, the "+x" column on a lane. */
function strip(h: number): Fixture {
  const built: CityBuiltCell[] = [];
  for (let j = 0; j < h; j++) {
    for (const i of [0, 1]) {
      const open: CityBuiltCell["open"][number][] = [i === 0 ? { side: "-x", faces: "street", frontage: "street" } : { side: "+x", faces: "lane", frontage: "quiet" }];
      if (j === 0) open.unshift({ side: "-z", faces: "street", frontage: "street" });
      if (j === h - 1) open.push({ side: "+z", faces: "street", frontage: "street" });
      built.push({ i, j, block: "block:0:0", part: "block:0:0", row: "outer", open, column: open.length === 1 ? "mid" : "corner", partner: { i: 1 - i, j } });
    }
  }
  const edges = { "-x": "street", "+x": "lane", "-z": "street", "+z": "street" } as const satisfies Record<CitySide, CityPartEdge>;
  return { part: { id: "block:0:0", block: "block:0:0", i0: 0, i1: 2, j0: 0, j1: h, shape: "strip", edges }, built };
}

const rand = stageRand("buildings", 1);
const layerOf = (f: Fixture): CityBuildingsLayer => buildBuildings({ parts: [f.part] }, { built: f.built }, rand);
const inputOf = (f: Fixture) => ({ land: { parts: [f.part] }, mass: { built: f.built } });
const keys = (cells: readonly CityCell[]): string[] => cells.map((c) => `${c.i},${c.j}`);

/** The tight corner of criterion 1: a drive on the "-z" side and a frontage lot on the "-x" side, each starting 3 cells from the part corner (ring 1 has 3 cells each side, ring 2 has 2). */
const TIGHT: readonly (readonly [number, number])[] = [
  [3, 0],
  [4, 0],
  [3, 1],
  [4, 1],
  [0, 3],
  [0, 4],
  [1, 3],
  [1, 4],
];

describe("a typed-in court part", () => {
  const f = court(8, 8);
  const layer = layerOf(f);

  it("closes: every built cell is in one building of 2 to 4 columns, and every check holds", () => {
    expect(f.built.length).toBe(8 * 8 - 4 * 4);
    expect(buildingFailures(layer, inputOf(f))).toEqual([]);
    const cells = layer.buildings.flatMap((b) => keys(b.cells));
    expect(new Set(cells).size).toBe(cells.length);
    expect(cells.length).toBe(f.built.length);
    for (const b of layer.buildings) {
      expect(b.cells.length).toBeGreaterThanOrEqual(2);
      expect(b.cells.length).toBeLessThanOrEqual(4);
      expect(b.bend).toBeNull();
    }
  });

  it("every outer building leads and every inner building follows, with partner and back null exactly on the leaders", () => {
    for (const b of layer.buildings) {
      expect(b.row === "outer", b.id).toBe(b.partner === null);
      expect(b.row === "outer", b.id).toBe(b.back === null);
    }
    expect(layer.rows).toHaveLength(8);
  });

  it("is the same layer twice, and another seed another layer", () => {
    expect(layerOf(f)).toEqual(layer);
    const other = buildBuildings({ parts: [f.part] }, { built: f.built }, stageRand("buildings", 2));
    expect(other).not.toEqual(layer);
  });
});

describe("the tight corner (L1)", () => {
  const f = court(8, 8, TIGHT);
  const layer = layerOf(f);

  it("closes with one L of 3 cells, listed as the corner's two stretches and the corner, in both rows", () => {
    expect(buildingFailures(layer, inputOf(f))).toEqual([]);
    const ls = layer.buildings.filter((b) => b.bend !== null);
    expect(ls).toHaveLength(1);
    const l = ls[0]!;
    expect(keys(l.cells)).toEqual(["2,1", "1,1", "1,2"]);
    expect(l.rowId).toBe("block:0:0|inner|+z");
    expect(l.bend).toBe("block:0:0|inner|+x");
    expect(l.row).toBe("inner");
    expect(l.partner).not.toBeNull();
    expect(l.back).not.toBeNull();
    for (const id of [l.rowId, l.bend!]) expect(layer.rows.find((r) => r.id === id)!.buildings).toContain(l.id);
    // it follows the building that holds the ring-1 corner cell
    const holder = layer.buildings.find((b) => b.cells.some((c) => c.i === 0 && c.j === 0))!;
    expect(l.partner).toBe(holder.id);
    // no other building is bent, and every cell is in exactly one building
    expect(layer.buildings.filter((b) => b.bend !== null)).toHaveLength(1);
    const cells = layer.buildings.flatMap((b) => keys(b.cells));
    expect(new Set(cells).size).toBe(f.built.length);
  });

  it("the same corner with its blind cell in one row only fails: the stage's own check names the L and the 1-cell building", () => {
    const l = layer.buildings.find((b) => b.bend !== null)!;
    const straightZ = { ...l, id: `${l.id}|z`, bend: null, cells: l.cells.slice(0, 2) };
    const lone = { ...l, id: `${l.id}|x`, rowId: l.bend!, bend: null, row: "inner" as const, front: "+x" as const, cells: l.cells.slice(2) };
    const broken: CityBuildingsLayer = { ...layer, buildings: [...layer.buildings.filter((b) => b.id !== l.id), straightZ, lone] };
    const failures = buildingFailures(broken, inputOf(f));
    expect(failures.some((x) => x.check === "L1" && /tight corner/.test(x.reason))).toBe(true);
    expect(failures.some((x) => x.check === "rule 1" && /1 columns/.test(x.reason))).toBe(true);
  });
});

describe("a row stretch of one cell fails rule 6", () => {
  it("names the cell", () => {
    // Ring 1 of the "-z" side is cells 0 to 2, then 4, then 6 to 9: the cell (4, 0) stands alone, whichever row the corners join.
    const f = court(10, 8, [
      [3, 0],
      [5, 0],
    ]);
    let error: unknown;
    try {
      layerOf(f);
    } catch (e) {
      error = e;
    }
    expect(error).toBeInstanceOf(CityStageError);
    const e = error as CityStageError;
    expect(e.reason).toMatch(/^rule 6:/);
    expect(keys(e.cells)).toEqual(["4,0"]);
  });

  it("a built cell that shows no front of its row fails N1", () => {
    const f = court(8, 8);
    const built = f.built.map((b) => (b.i === 3 && b.j === 0 ? { ...b, open: [] as CityBuiltCell["open"] } : b));
    expect(() => buildBuildings({ parts: [f.part] }, { built }, rand)).toThrow(/^N1:/);
  });
});

describe("a typed-in strip", () => {
  const f = strip(10);
  const layer = layerOf(f);

  it("closes: the row on the street leads, the other follows, column for column", () => {
    expect(buildingFailures(layer, inputOf(f))).toEqual([]);
    const lead = layer.buildings.filter((b) => b.partner === null);
    const follow = layer.buildings.filter((b) => b.partner !== null);
    expect(lead.every((b) => b.front === "-x")).toBe(true);
    expect(follow.every((b) => b.front === "+x")).toBe(true);
    expect(lead).toHaveLength(follow.length);
    for (const b of follow) expect(keys(layer.buildings.find((x) => x.id === b.partner)!.cells).map((k) => k.split(",")[1])).toEqual(keys(b.cells).map((k) => k.split(",")[1]));
  });
});

describe("a layer the stage's own check refuses", () => {
  const f = court(8, 8);
  const layer = layerOf(f);
  const input = inputOf(f);
  const withBuildings = (change: (b: CityBuildingsLayer["buildings"][number], n: number) => CityBuildingsLayer["buildings"][number]): CityBuildingsLayer => ({ ...layer, buildings: layer.buildings.map(change) });

  it("a 5-cell building", () => {
    const lead = layer.buildings.filter((x) => x.partner === null);
    const target = lead.find((x) => x.cells.length === 4) ?? lead[0]!;
    const rowCells = lead.filter((x) => x.rowId === target.rowId).flatMap((x) => x.cells);
    const five = withBuildings((b) => (b.id === target.id ? { ...b, cells: rowCells.slice(0, 5) } : b));
    expect(five.buildings.find((x) => x.id === target.id)!.cells).toHaveLength(5);
    expect(buildingFailures(five, input).some((x) => x.check === "rule 1" && /5 columns/.test(x.reason))).toBe(true);
  });

  it("a 1-cell building, and the cell it left in no building", () => {
    const two = layer.buildings.find((b) => b.cells.length === 2)!;
    const failures = buildingFailures(
      withBuildings((b) => (b.id === two.id ? { ...b, cells: b.cells.slice(0, 1) } : b)),
      input,
    );
    expect(failures.some((x) => x.check === "rule 1" && /1 columns/.test(x.reason))).toBe(true);
    expect(failures.some((x) => x.check === "rule 1" && /is in 0 buildings/.test(x.reason))).toBe(true);
  });

  it("a bent building away from a tight corner", () => {
    const lead = layer.buildings.find((b) => b.partner === null)!;
    const other = layer.rows.find((r) => r.id !== lead.rowId)!;
    const failures = buildingFailures(
      withBuildings((b) => (b.id === lead.id ? { ...b, bend: other.id } : b)),
      input,
    );
    expect(failures.some((x) => x.check === "L1" && /not the L of a tight corner/.test(x.reason))).toBe(true);
  });

  it("a cell in no building", () => {
    const failures = buildingFailures({ ...layer, buildings: layer.buildings.slice(1) }, input);
    expect(failures.some((x) => x.check === "rule 1" && /is in 0 buildings/.test(x.reason))).toBe(true);
  });
});
