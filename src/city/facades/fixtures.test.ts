/**
 * Stage 7, section H1, criterion 4's failing fixtures. Each is built from the default city's layers (6 x 6 seed 1, one-way on), typed in from the run in the test (not pinned by hash), with one thing changed, and must
 * fail the named check. The unchanged layers must pass (the sanity test), so a fixture fails for its own change and nothing else.
 */
import { describe, expect, it } from "vitest";
import type { CalibrationKey, CityBuilding, CityBuiltCell, CityColumn, CityFacadesLayer, CityGroundPiece, CityMassLayer } from "../../core";
import { groundFailures } from "./check";
import { GROUND_GAP_MAX_M } from "./constants";
import { groundEntry } from "./kit";
import { factsOf, makeCtx } from "./facts";
import { centreOf, keyOf, ownBody, placeGround, rotate, SIDE_VEC } from "./place";
import { DEFAULT, layersOf } from "./testcities";

const k = (n: string): CalibrationKey => `city-pack:SM_Bld_${n}`;
const L = layersOf(DEFAULT);
const colAt = new Map<string, CityColumn>(L.buildings.columns!.map((c) => [keyOf(c), c] as const));
const builtAt = new Map<string, CityBuiltCell>(L.mass.built.map((b) => [keyOf(b), b] as const));
const useAt = new Map(L.mass.cells.map((c) => [keyOf(c), c.use] as const));
const buildingOf = new Map<string, CityBuilding>(L.buildings.buildings.map((b) => [b.id, b] as const));
const stallsAcross = (c: { i: number; j: number }): boolean => builtAt.get(keyOf(c))!.open.some((o) => useAt.get(`${c.i + SIDE_VEC[o.side].x},${c.j + SIDE_VEC[o.side].z}`) === "stalls");
const isRing2 = (b: CityBuilding): boolean => b.cells.every((c) => builtAt.get(keyOf(c))!.row === "inner");

const CTX = makeCtx(L.mass, L.buildings);
const fixture = (ground: readonly CityGroundPiece[]): CityFacadesLayer => ({ stage: "facades", ground });
const swap = (from: CityGroundPiece, to: CityGroundPiece): CityFacadesLayer => fixture(L.facades.ground.map((p) => (p === from ? to : p)));
const checksOf = (layer: CityFacadesLayer, mass: Pick<CityMassLayer, "cells" | "built"> = L.mass): Set<string> => new Set(groundFailures(layer, { mass, buildings: L.buildings }).map((f) => f.check));
const piece = (pred: (p: CityGroundPiece) => boolean): CityGroundPiece => {
  const p = L.facades.ground.find(pred);
  if (!p) throw new Error("the default city has no such piece");
  return p;
};
const colsOf = (p: CityGroundPiece): CityColumn[] => p.cells.map((c) => colAt.get(keyOf(c))!);
/** A piece of `key`, placed on `p`'s cells as the stage would, at level `y`. */
const placed = (p: CityGroundPiece, kind: CityGroundPiece["kind"], key: CalibrationKey, y: number): CityGroundPiece => {
  const first = colsOf(p)[0]!;
  const e = groundEntry(key);
  return { ...p, kind, placement: placeGround(key, p.cells, first.front, first.yaw, y), door_m: e.sill === null ? null : y + e.sill };
};
const styleN = (p: CityGroundPiece): string => buildingOf.get(p.building)!.style.slice(-2);

describe("the failing fixtures (criterion 4)", { timeout: 120_000 }, () => {
  it("sanity: the default city's own layers pass every check", () => {
    expect(groundFailures(L.facades, { mass: L.mass, buildings: L.buildings })).toEqual([]);
  });

  it("a ring-2 building given a shop piece fails M8", () => {
    const floor = piece((p) => p.kind === "floor" && p.frontage === "quiet" && isRing2(buildingOf.get(p.building)!));
    const bad = placed(floor, "shop", k("Shop_02"), -0.071);
    expect(checksOf(swap(floor, bad)).has("M8")).toBe(true);
  });

  it("a quiet building given a second door fails M8", () => {
    const door = piece((p) => p.kind === "door" && p.frontage === "quiet");
    const floor = piece((p) => p.kind === "floor" && p.building === door.building);
    const bad = placed(floor, "door", k("Apartment_Door_01"), -0.01);
    const c = checksOf(swap(floor, bad));
    expect(c.has("M8")).toBe(true);
    expect(c.has("R3")).toBe(true);
  });

  it("a residents' door on a ring-2 column across from a yard court's stalls fails the stall check", () => {
    const floor = piece((p) => p.kind === "floor" && colsOf(p).every((c) => stallsAcross(c)) && isRing2(buildingOf.get(p.building)!));
    const bad = placed(floor, "door", k("Apartment_Door_01"), -0.01);
    expect(checksOf(swap(floor, bad)).has("stall")).toBe(true);
  });

  it("a ground piece set 0.05 m back from its open edge fails G1", () => {
    const shop = piece((p) => p.kind === "shop");
    const col = colsOf(shop)[0]!;
    const fv = SIDE_VEC[col.front];
    const bad: CityGroundPiece = { ...shop, placement: { ...shop.placement, x_m: shop.placement.x_m - 0.05 * fv.x, z_m: shop.placement.z_m - 0.05 * fv.z } };
    const c = checksOf(swap(shop, bad));
    expect(c.has("G1")).toBe(true);
    expect(c.has("M1")).toBe(true);
  });

  it("a shop corner turned a quarter off fails M6", () => {
    const sc = piece((p) => p.kind === "shopCorner");
    const bad: CityGroundPiece = { ...sc, placement: { ...sc.placement, yaw_deg: (sc.placement.yaw_deg + 90) % 360 } };
    expect(checksOf(swap(sc, bad)).has("M6")).toBe(true);
  });

  it("a Shop_05 at y_m 0 (its door 0.361 m over the walk) fails the sill check", () => {
    const shop = piece((p) => p.kind === "shop");
    const bad = placed(shop, "shop", k("Shop_05"), 0);
    expect(bad.door_m).toBeCloseTo(0.361, 9);
    expect(checksOf(swap(shop, bad)).has("S1")).toBe(true);
  });

  it("a Shop_Corner_01 at y_m -0.020 (its top 0.020 m short of the first floor, past the gap limit; its door 0.139, inside the limits) fails the sill check on the gap alone", () => {
    const sc = piece((p) => p.kind === "shopCorner");
    const bad = placed(sc, "shopCorner", k("Shop_Corner_01"), -0.02);
    expect(bad.door_m).toBeCloseTo(0.139, 9);
    expect(0.02).toBeGreaterThan(GROUND_GAP_MAX_M);
    const fails = groundFailures(swap(sc, bad), { mass: L.mass, buildings: L.buildings });
    expect(fails.map((f) => f.check)).toEqual(["S1"]);
    expect(fails[0]!.reason).toMatch(/short of the first floor/);
    // and at the limit it passes: -0.010
    expect(groundFailures(swap(sc, placed(sc, "shopCorner", k("Shop_Corner_01"), -0.01)), { mass: L.mass, buildings: L.buildings })).toEqual([]);
  });

  it("a Shop_03 placed by its bounds' centre fails M1", () => {
    const dbl = piece((p) => p.kind === "shopDouble");
    const mid = { x: dbl.cells.reduce((s, c) => s + centreOf(c).x, 0) / 2, z: dbl.cells.reduce((s, c) => s + centreOf(c).z, 0) / 2 };
    const bad: CityGroundPiece = { ...dbl, placement: { ...dbl.placement, x_m: mid.x, z_m: mid.z } };
    expect(checksOf(swap(dbl, bad)).has("M1")).toBe(true);
  });

  it("a Shop_01 placed with its body centred front to back (its front plane 0.159 m behind the front edge) fails M1", () => {
    const s1 = piece((p) => p.kind === "shop" && p.placement.key === k("Shop_01"));
    const col = colsOf(s1)[0]!;
    const b = ownBody(groundEntry(k("Shop_01")));
    const own = rotate(col.yaw, (b.x0 + b.x1) / 2, (b.z0 + b.z1) / 2);
    const c = centreOf(col);
    const bad: CityGroundPiece = { ...s1, placement: { ...s1.placement, x_m: c.x - own.x, z_m: c.z - own.z } };
    const fails = groundFailures(swap(s1, bad), { mass: L.mass, buildings: L.buildings });
    expect(fails.some((f) => f.check === "M1" && /body plane 0\.159 m off/.test(f.reason))).toBe(true);
  });

  it("a deep shop on a column whose partner is set to null (its back an opening) fails M1's back allowance", () => {
    const deep = piece((p) => p.kind === "shop" && p.placement.key === k("Shop_01"));
    const cell = deep.cells[0]!;
    const built = L.mass.built.map((b) => (keyOf(b) === keyOf(cell) ? { ...b, partner: null } : b));
    const fails = groundFailures(L.facades, { mass: { cells: L.mass.cells, built }, buildings: L.buildings });
    expect(fails.some((f) => f.check === "M1" && /cell behind is not built/.test(f.reason))).toBe(true);
    expect(fails.every((f) => f.check === "M1")).toBe(true);
  });
});

describe("the no-door case, three fixtures (Q21 answer 3)", { timeout: 120_000 }, () => {
  it("a quiet building with a door place, its door replaced by floor (or floorCorner), fails M8", () => {
    const mid = piece((p) => p.kind === "door" && p.frontage === "quiet");
    const corner = piece((p) => p.kind === "doorCorner");
    const midFloor = placed(mid, "floor", k(`Apartment_${styleN(mid)}`), 0);
    const cornerFloor = placed(corner, "floorCorner", k(`Apartment_Corner_${styleN(corner)}`), 0);
    for (const [from, to] of [[mid, midFloor], [corner, cornerFloor]] as const) {
      const fails = groundFailures(swap(from, to), { mass: L.mass, buildings: L.buildings });
      expect(fails.some((f) => f.check === "M8" && /not exactly one/.test(f.reason))).toBe(true);
    }
  });

  /** A quiet building on ring 2 with no door place: its pieces have no door. */
  const doorless = (): CityBuilding => {
    const have = new Set(L.facades.ground.filter((p) => p.kind === "door" || p.kind === "doorCorner").map((p) => p.building));
    const b = L.buildings.buildings.find((x) => !have.has(x.id) && isRing2(x) && factsOf(CTX, x).frontage === "quiet");
    if (!b) throw new Error("the default city has no doorless building");
    return b;
  };

  it("the default city has a doorless ring-2 building, and the unchanged layer passes", () => {
    const b = doorless();
    expect(isRing2(b)).toBe(true);
    expect(checksOf(L.facades).size).toBe(0);
  });

  it("a doorless ring-2 building, with the stalls cell across one of its mid columns' open side set to aisle (so that column is a door place), fails M8, the layer unchanged", () => {
    const b = doorless();
    const mid = b.cells.map((c) => colAt.get(keyOf(c))!).find((c) => c.kind === "mid" && stallsAcross(c))!;
    const o = builtAt.get(keyOf(mid))!.open[0]!;
    const across = `${mid.i + SIDE_VEC[o.side].x},${mid.j + SIDE_VEC[o.side].z}`;
    expect(useAt.get(across)).toBe("stalls");
    const cells = L.mass.cells.map((c) => (keyOf(c) === across ? { ...c, use: "aisle" as const } : c));
    const fails = groundFailures(L.facades, { mass: { cells, built: L.mass.built }, buildings: L.buildings });
    expect(fails.some((f) => f.check === "M8" && /not exactly one/.test(f.reason))).toBe(true);
  });

  it("a doorless building moved to an outer row (its cells' row set to outer in the fixture's mass) fails M8's ring-2 hold", () => {
    const b = doorless();
    const mine = new Set(b.cells.map(keyOf));
    const built = L.mass.built.map((c) => (mine.has(keyOf(c)) ? { ...c, row: "outer" as const } : c));
    const fails = groundFailures(L.facades, { mass: { cells: L.mass.cells, built }, buildings: L.buildings });
    expect(fails.some((f) => f.check === "M8" && /not on ring 2/.test(f.reason))).toBe(true);
  });
});
