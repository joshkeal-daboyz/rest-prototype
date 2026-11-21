/**
 * Ticket 070 H1c, criterion 1: the facades stage's novelty kit (src/city/facades/noveltykit.ts) is pinned to the tile city's keys and the manifest's bounds (R-6; this folder cannot import src/render3d/).
 * Always (no GLB): `NOVELTY_KEYS` equals `dressing.ts`' `NOVELTY_SIGNS`; each bound equals the fixture typed in here (`dressing.test.ts`' numbers); every `CityShopKind` has an entry, barber and hotel an empty one; 15 of the 17 keys are used
 * and the bowling pair are in no kind's list; `SIGN_KIND`'s keys are exactly `SIGNS_FASCIA` and `SIGNS_BLADE` (`dresskit.ts`). The three numbers of NP (`NOVELTY_CHANCE`, `NOVELTY_PER_RUN`, `NOVELTY_ROOF_SHARE`) are PROPOSED
 * ("per the discretion of the storefront agent") and not asserted.
 * Inside `it.skipIf(!HAVE_GLB)`, read lazily as `roofpin.test.ts` does: every one of the 17 keys' bounds equals the converted GLB's within 0.005 m.
 */
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import type { CalibrationKey, CityShopKind } from "../core";
import { SIGNS_BLADE, SIGNS_FASCIA } from "../city/facades/dresskit";
import * as NEW from "../city/facades/noveltykit";
import * as OLD from "./dressing";

/** The bounds of `dressing.test.ts`' fixture (width, height, depth). */
const FIXTURE: readonly (readonly [string, number, number, number])[] = [
  ["SM_Prop_LargeSign_Beer_01", 2.005, 3.333, 2.019],
  ["SM_Prop_LargeSign_Bottle_01", 1.8, 5.818, 1.8],
  ["SM_Prop_LargeSign_BowlingBall_01", 3.019, 3.174, 3.174],
  ["SM_Prop_LargeSign_BowlingPin_01", 1.631, 5.156, 1.631],
  ["SM_Prop_LargeSign_Burger_01", 3.715, 2.178, 3.717],
  ["SM_Prop_LargeSign_Coffee_01", 2.194, 1.346, 1.625],
  ["SM_Prop_LargeSign_Donut_01", 3.818, 1.355, 3.818],
  ["SM_Prop_LargeSign_Guitar_01", 2.098, 6.378, 0.377],
  ["SM_Prop_LargeSign_Hotdog_01", 1.411, 1.143, 3.926],
  ["SM_Prop_LargeSign_Icecream_01", 1.93, 5.04, 1.93],
  ["SM_Prop_LargeSign_Lollypop_01", 3.365, 6.36, 0.512],
  ["SM_Prop_LargeSign_Milkshake_01", 2.238, 4.699, 1.721],
  ["SM_Prop_LargeSign_Noodles_01", 2.948, 3.601, 2.515],
  ["SM_Prop_LargeSign_Pizza_01", 3.368, 0.562, 2.957],
  ["SM_Prop_LargeSign_Popcorn_01", 1.737, 2.797, 1.737],
  ["SM_Prop_LargeSign_Soda_01", 1.915, 5.595, 1.915],
  ["SM_Prop_LargeSign_Taco_01", 1.215, 2.223, 3.701],
];
const ALL_KINDS: readonly CityShopKind[] = ["pizza", "burger", "hotDog", "taco", "noodles", "cafe", "donut", "iceCream", "diner", "sweets", "bar", "liquorStore", "cornerStore", "musicShop", "barber", "hotel"];

describe("the novelty kit table equals the tile city's keys and the fixtures' bounds (070 H1c, criterion 1; Josh, Q26: \"Yes, all four\")", () => {
  it("NOVELTY_KEYS equals dressing.ts' NOVELTY_SIGNS (17 keys, in order)", () => {
    expect(NEW.NOVELTY_KEYS).toEqual(OLD.NOVELTY_SIGNS);
    expect(NEW.NOVELTY_KEYS).toHaveLength(17);
  });

  it("each key's bounds equal the fixture's (17 keys)", () => {
    expect(Object.keys(NEW.NOVELTY_BOUNDS).sort()).toEqual(FIXTURE.map(([k]) => `city-pack:${k}`).sort());
    for (const [k, w, h, d] of FIXTURE) expect(NEW.NOVELTY_BOUNDS[`city-pack:${k}`], k).toEqual({ w, h, d });
  });

  it("every shop kind has an entry (16), barber and hotel have none; 15 of the 17 keys are used and the bowling ball and pin are in no kind's list; every key listed is a novelty key", () => {
    expect(Object.keys(NEW.NOVELTY_BY_KIND).sort()).toEqual([...ALL_KINDS].sort());
    expect([...NEW.SHOP_KINDS].sort()).toEqual([...ALL_KINDS].sort());
    expect(NEW.NOVELTY_BY_KIND.barber).toEqual([]);
    expect(NEW.NOVELTY_BY_KIND.hotel).toEqual([]);
    const used = new Set(Object.values(NEW.NOVELTY_BY_KIND).flat());
    expect(used.size).toBe(15);
    for (const k of used) expect(NEW.NOVELTY_KEYS).toContain(k);
    expect(used.has("city-pack:SM_Prop_LargeSign_BowlingBall_01")).toBe(false);
    expect(used.has("city-pack:SM_Prop_LargeSign_BowlingPin_01")).toBe(false);
    // the table as Josh answered it
    expect(NEW.NOVELTY_BY_KIND.liquorStore).toEqual(["city-pack:SM_Prop_LargeSign_Bottle_01"]);
    expect(NEW.NOVELTY_BY_KIND.bar).toEqual(["city-pack:SM_Prop_LargeSign_Beer_01"]);
    expect(NEW.NOVELTY_BY_KIND.pizza).toEqual(["city-pack:SM_Prop_LargeSign_Pizza_01"]);
  });

  it("SIGN_KIND's keys are exactly H1b's SIGNS_FASCIA and SIGNS_BLADE (nine), and only the Entrance sign names no trade", () => {
    expect(Object.keys(NEW.SIGN_KIND).sort()).toEqual([...SIGNS_FASCIA, ...SIGNS_BLADE].sort());
    expect(Object.keys(NEW.SIGN_KIND)).toHaveLength(9);
    expect(Object.entries(NEW.SIGN_KIND).filter(([, v]) => v === null).map(([k]) => k)).toEqual(["city-pack:SM_Prop_Sign_Entrance_01"]);
    expect(NEW.FACE_QUARTER_DEG).toBe(90);
  });
});

// ---- the GLB, when this machine has it ----

interface Gltf {
  nodes: { name?: string; mesh?: number; children?: number[] }[];
  meshes: { primitives: { attributes: { POSITION: number }; indices?: number }[] }[];
  accessors: { bufferView: number; byteOffset?: number; count: number; componentType: number }[];
  bufferViews: { byteOffset?: number; byteStride?: number }[];
}
const CITY_GLB = join("assets", "private", "out", "city-pack.glb");
/** True when the converted City Pack is on this machine (a fresh checkout and CI have none). Only the file's presence is looked at here; it is read inside the test. */
const HAVE_GLB = existsSync(CITY_GLB);

describe("the novelty kit table equals the converted GLB (070 H1c, criterion 1; skipped without the GLB)", () => {
  it.skipIf(!HAVE_GLB)("every key's bounds (w, h, d) equal the GLB's within 0.005 m", { timeout: 120000 }, () => {
    const glb = readFileSync(CITY_GLB);
    const jsonLen = glb.readUInt32LE(12);
    const gltf = JSON.parse(glb.subarray(20, 20 + jsonLen).toString("utf8")) as Gltf;
    const bin = glb.subarray(20 + jsonLen + 8);
    const bad: string[] = [];
    for (const k of Object.keys(NEW.NOVELTY_BOUNDS) as CalibrationKey[]) {
      const name = k.slice("city-pack:".length);
      const root = gltf.nodes.find((q) => q.name === name);
      expect(root, name).toBeDefined();
      const min = [Infinity, Infinity, Infinity];
      const max = [-Infinity, -Infinity, -Infinity];
      const walk = (q: { mesh?: number; children?: number[] }): void => {
        for (const prim of q.mesh !== undefined ? gltf.meshes[q.mesh]!.primitives : []) {
          const a = gltf.accessors[prim.attributes.POSITION]!;
          const bv = gltf.bufferViews[a.bufferView]!;
          const base = (bv.byteOffset ?? 0) + (a.byteOffset ?? 0);
          for (let i = 0; i < a.count; i++) {
            for (let c = 0; c < 3; c++) {
              const v = bin.readFloatLE(base + i * (bv.byteStride ?? 12) + 4 * c);
              min[c] = Math.min(min[c]!, v);
              max[c] = Math.max(max[c]!, v);
            }
          }
        }
        for (const c of q.children ?? []) walk(gltf.nodes[c]!);
      };
      walk(root!);
      const t = NEW.NOVELTY_BOUNDS[k]!;
      for (const [n, want, got] of [["w", t.w, max[0]! - min[0]!], ["h", t.h, max[1]! - min[1]!], ["d", t.d, max[2]! - min[2]!]] as const) if (Math.abs(want - got) > 0.005) bad.push(`${k} ${n}: table ${want}, GLB ${got.toFixed(3)}`);
    }
    expect(bad).toEqual([]);
  });
});
