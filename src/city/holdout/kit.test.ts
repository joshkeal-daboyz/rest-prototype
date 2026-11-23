/**
 * Ticket 073 E2, criterion 6 (X-5, dark and textured) and the kit table's shape. No GLB here: the table is pinned against the converted GLB and the converter's textured list by
 * `src/render3d/holdoutpin.test.ts`, inside `it.skipIf`.
 */
import { describe, expect, it } from "vitest";
import { CITY_HOLDOUT_PIECE_KINDS, type CityHoldoutPieceKind } from "../../core";
import { BARRICADE_KEY, CAMP_KEYS, CLUTTER_KEYS, CONTAINER_KEYS, EXCLUDED_KEYS, FARM_KEYS, IRRIGATOR_KEYS, KIT, KIT_KEYS, ROOF_KEYS, STALL_KEY, WATER_TOWER_KEY, holdoutBounds } from "./kit";
import { cellsOver, inside, overlaps, rectAt, RectIndex, turned } from "./geom";

describe("the kit table (X-8, X-5)", () => {
  it("holds the ticket's pieces: 6 picked camps (075: no orange Tent_02), the tower, 4 fields, 2 irrigators, the one stall, 6 picked containers, 17 clutter pieces, 1 picked roof item, the wall", () => {
    expect(CAMP_KEYS).toHaveLength(6);
    expect(FARM_KEYS).toHaveLength(4);
    expect(IRRIGATOR_KEYS).toHaveLength(2);
    expect(CONTAINER_KEYS).toHaveLength(6);
    expect(CLUTTER_KEYS).toHaveLength(5 + 2 + 10);
    expect(ROOF_KEYS.map((k) => k.split(":")[1])).toEqual(["SM_Prop_Solar_Panel_02"]);
    expect(KIT[STALL_KEY]!.kind).toBe("stall");
    expect(KIT[WATER_TOWER_KEY]!.kind).toBe("water-tower");
    expect(KIT[BARRICADE_KEY]!.kind).toBe("barricade");
    expect(KIT_KEYS.size).toBe(Object.keys(KIT).length);
  });

  it("every kind of CityHoldoutPieceKind has a key, and each key is a Sci-Fi Frontier key", () => {
    for (const k of CITY_HOLDOUT_PIECE_KINDS) expect(Object.values(KIT).some((e) => e.kind === (k as CityHoldoutPieceKind)), k).toBe(true);
    for (const k of Object.keys(KIT)) expect(k.startsWith("sci-fi-frontier-pack:SM_"), k).toBe(true);
  });

  it("nothing is emissive, and the keys the ticket excludes are absent: alien plants, sand, cliffs, weapons, characters, the cantina, the _Insert pieces, the flat greebles, the wide stalls and panels", () => {
    for (const e of Object.values(KIT)) expect(e.emissive).toBe(false);
    for (const k of EXCLUDED_KEYS) expect(KIT_KEYS.has(k), k).toBe(false);
    for (const k of Object.keys(KIT)) expect(k).not.toMatch(/Insert|Alien|Sand|Cliff|Weapon|Character|Cantina|Barricade|Road_Barrier|Wall_Large_01|Wall_Tower_01|Stall_01|Stall_03|Panel_03|Panel_04|Fabric_03|Plant/);
    const greebles = CLUTTER_KEYS.filter((k) => /Greeble/.test(k));
    expect(greebles.map((k) => k.slice(-2))).toEqual(["01", "05", "06", "07", "11", "15", "17", "19", "27", "31"]);
    for (const k of greebles) {
      const e = KIT[k]!;
      expect(Math.min(e.w, e.d), k).toBeGreaterThanOrEqual(0.5);
      expect(e.h, k).toBeGreaterThanOrEqual(0.45);
    }
  });

  it("the market stall and every container fit their place: the plaza is 10 m, a bay 3.33 by 5 m; the wall is a 5 m piece", () => {
    const s = KIT[STALL_KEY]!;
    expect(Math.max(s.w, s.d)).toBeLessThan(10);
    for (const k of CONTAINER_KEYS) {
      const c = KIT[k]!;
      expect(c.w, k).toBeLessThanOrEqual(10 / 3);
      expect(c.d, k).toBeLessThanOrEqual(5);
    }
    expect(KIT[BARRICADE_KEY]!.w).toBe(5);
  });

  it("holdoutBounds reads the table (width x, depth z, height) and knows no other key", () => {
    expect(holdoutBounds(STALL_KEY)).toEqual({ x_m: 5.231, z_m: 5.79, h_m: 2.937 });
    expect(holdoutBounds("city-pack:SM_Bld_Apartment_Roof_01")).toBeUndefined();
  });
});

describe("plan geometry", () => {
  it("rectangles: touching is not overlapping; a quarter turn swaps the extents; inside allows touching", () => {
    const a = rectAt(0, 0, 2, 2);
    expect(overlaps(a, rectAt(2, 0, 2, 2))).toBe(false);
    expect(overlaps(a, rectAt(1.9, 0, 2, 2))).toBe(true);
    expect(turned(2, 5, 90)).toEqual({ x: 5, z: 2 });
    expect(turned(2, 5, 180)).toEqual({ x: 2, z: 5 });
    expect(inside(rectAt(0, 0, 2, 2), rectAt(0, 0, 2, 2))).toBe(true);
    expect(cellsOver({ x0: 0, x1: 5, z0: 0, z1: 5 })).toEqual([{ i: 0, j: 0 }]);
    expect(cellsOver({ x0: 4.9, x1: 5.1, z0: 0, z1: 5 })).toHaveLength(2);
  });
  it("the index answers which tagged rectangles overlap a query, each once", () => {
    const idx = new RectIndex<string>();
    idx.add({ x0: 0, x1: 12, z0: 0, z1: 1 }, "long");
    idx.add({ x0: 30, x1: 31, z0: 30, z1: 31 }, "far");
    expect(idx.query({ x0: 4, x1: 11, z0: 0, z1: 2 }).map((e) => e.tag)).toEqual(["long"]);
    expect(idx.any({ x0: 29, x1: 32, z0: 29, z1: 32 })).toBe(true);
    expect(idx.any({ x0: 20, x1: 21, z0: 20, z1: 21 })).toBe(false);
  });
});
