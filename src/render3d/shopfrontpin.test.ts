/**
 * Ticket 070 H1b, criterion 1: the facades stage's dressing table (src/city/facades/dresskit.ts) is pinned to the tile city's numbers and, when the converted City Pack is on the machine, to the GLB (R-6).
 * Always (no GLB): each key list equals `dressing.ts`'; each number equals `dressing.ts`'; `CITY_CHECK.R4`, `CITY_CHECK.R5`, `CITY_ATM_BLOCKS_MIN` and `TILE_CITY_R6_MIN` equal the table's thresholds; each host width and front inset
 * equals the floor piece's `BODY_M` entry and its bounds in the old path's tables; `DRESS_NUDGE_M` and `DRESS_FRONTS` are empty and `BUILDING_FRONTS` names none of the 22 keys, so every key's own front is +z (the turn
 * rule in `cityplan.ts`). Inside `it.skipIf(!HAVE_GLB)`, read lazily as `groundpin.test.ts` does: every dressing key's bounds equal the converted GLB's within 0.005 m.
 */
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  ATMS,
  ATM_PIER_M,
  ATM_PER_RUN,
  ATM_Y_M,
  AWNINGS,
  AWNING_BASE_M,
  AWNING_CORNER,
  AWNING_KERB_M,
  BLADE_INSET_M,
  DRESS_ATM_MIN,
  DRESS_BOUNDS,
  DRESS_MAX,
  DRESS_PER_BAY_MAX,
  DRESS_R4_MIN,
  DRESS_R5_MIN,
  DRESS_R6_MIN,
  FLOOR_HOST,
  GLASS_INSET_M,
  GLASS_SILL_M,
  GLASS_WRAP_DEPTH_M,
  P_ATM,
  P_AWNING,
  P_BLADE,
  P_SIGN,
  SHOP_GLASS,
  SIGNS_BLADE,
  SIGNS_FASCIA,
  SIGN_BASE_M,
} from "../city/facades/dresskit";
import { FIRST_FLOOR_SILL_M, GROUND_KIT } from "../city/facades/kit";
import * as OLD from "./dressing";
import { BODY_M } from "./facade";
import { CITY_ATM_BLOCKS_MIN, CITY_CHECK } from "./citymetrics";
import { BUILDING_FRONTS } from "./models";
import { TILE_CITY_R6_MIN } from "./tilecity";

describe("the dressing table equals the old path's numbers (070 H1b, criterion 1)", () => {
  it("each key list equals dressing.ts' (awnings, the L awning, fascia signs, blade signs, the ATM, the shop glass)", () => {
    expect(AWNINGS).toEqual(OLD.AWNINGS);
    expect(AWNING_CORNER).toEqual(OLD.AWNING_CORNER);
    expect(SIGNS_FASCIA).toEqual(OLD.SIGNS_FASCIA);
    expect(SIGNS_BLADE).toEqual(OLD.SIGNS_BLADE);
    expect(ATMS).toEqual(OLD.ATMS);
    expect(SHOP_GLASS).toEqual(OLD.SHOP_GLASS);
  });

  it("each chance, cap and attachment number equals dressing.ts'", () => {
    expect([P_AWNING, P_SIGN, P_BLADE, P_ATM, ATM_PER_RUN, DRESS_PER_BAY_MAX, DRESS_MAX]).toEqual([OLD.P_AWNING, OLD.P_SIGN, OLD.P_BLADE, OLD.P_ATM, OLD.ATM_PER_RUN, OLD.DRESS_PER_BAY_MAX, OLD.DRESS_MAX]);
    expect([GLASS_INSET_M, GLASS_SILL_M, GLASS_WRAP_DEPTH_M, AWNING_BASE_M, SIGN_BASE_M, AWNING_KERB_M, ATM_Y_M, ATM_PIER_M, BLADE_INSET_M]).toEqual([
      OLD.GLASS_INSET_M,
      OLD.GLASS_SILL_M,
      OLD.GLASS_WRAP_DEPTH_M,
      OLD.AWNING_BASE_M,
      OLD.SIGN_BASE_M,
      OLD.AWNING_KERB_M,
      OLD.ATM_Y_M,
      OLD.ATM_PIER_M,
      OLD.BLADE_INSET_M,
    ]);
  });

  it("R4, R5, R6's floor and the ATM share equal the old path's: CITY_CHECK.R4 and R5, TILE_CITY_R6_MIN (Josh, 18 Nov 2026) and CITY_ATM_BLOCKS_MIN", () => {
    expect(DRESS_R4_MIN).toBe(CITY_CHECK.R4);
    expect(DRESS_R5_MIN).toBe(CITY_CHECK.R5);
    expect(DRESS_R6_MIN).toBe(TILE_CITY_R6_MIN);
    expect(DRESS_ATM_MIN).toBe(CITY_ATM_BLOCKS_MIN);
    expect(DRESS_R6_MIN).toBe(0.45);
  });

  it("the table holds the 22 dressing keys, once each: the seven glass, the five awnings, the six fascia signs, the three blade signs and the ATM", () => {
    const all = [...SHOP_GLASS, ...AWNINGS, ...AWNING_CORNER, ...SIGNS_FASCIA, ...SIGNS_BLADE, ...ATMS];
    expect(all).toHaveLength(22);
    expect(new Set(all).size).toBe(22);
    expect(Object.keys(DRESS_BOUNDS).sort()).toEqual([...all].sort());
    for (const [k, b] of Object.entries(DRESS_BOUNDS)) {
      expect(b.w, k).toBeGreaterThan(0);
      expect(b.h, k).toBeGreaterThan(0);
      expect(b.d, k).toBeGreaterThanOrEqual(0);
    }
  });

  it("each host's width and depth equal the floor piece's bounds in the ground kit (a three-storey piece: its mid floor's), and its front inset equals BODY_M's; the table has the nine keys of FIRST_FLOOR_SILL_M", () => {
    expect(Object.keys(FLOOR_HOST).sort()).toEqual(Object.keys(FIRST_FLOOR_SILL_M).sort());
    for (const [k, h] of Object.entries(FLOOR_HOST)) {
      const kitKey = k.replace("Apartment_Stack_", "Apartment_");
      const e = GROUND_KIT.find((x) => x.key === kitKey);
      expect(e, k).toBeDefined();
      expect(h.w, k).toBe(e!.w);
      expect(h.d, k).toBe(e!.d);
      expect(h.front, k).toBe(BODY_M[k as keyof typeof BODY_M]!.front);
    }
  });

  it("every key's own front is +z: DRESS_NUDGE_M and DRESS_FRONTS are empty and BUILDING_FRONTS names none of the 22 keys", () => {
    expect(Object.keys(OLD.DRESS_NUDGE_M)).toEqual([]);
    expect(Object.keys(OLD.DRESS_FRONTS)).toEqual([]);
    const names = Object.keys(DRESS_BOUNDS);
    for (const k of Object.keys(BUILDING_FRONTS)) expect(names, k).not.toContain(k);
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

/** The bounds of every vertex of the node called `name` and its children in the converted City Pack, read lazily. */
function glbBounds(names: readonly string[]): Map<string, { w: number; h: number; d: number }> {
  const glb = readFileSync(CITY_GLB);
  const jsonLen = glb.readUInt32LE(12);
  const gltf = JSON.parse(glb.subarray(20, 20 + jsonLen).toString("utf8")) as Gltf;
  const bin = glb.subarray(20 + jsonLen + 8);
  const out = new Map<string, { w: number; h: number; d: number }>();
  for (const name of names) {
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
          const at = base + i * (bv.byteStride ?? 12);
          for (let c = 0; c < 3; c++) {
            const v = bin.readFloatLE(at + c * 4);
            min[c] = Math.min(min[c]!, v);
            max[c] = Math.max(max[c]!, v);
          }
        }
      }
      for (const c of q.children ?? []) walk(gltf.nodes[c]!);
    };
    walk(root!);
    out.set(name, { w: max[0]! - min[0]!, h: max[1]! - min[1]!, d: max[2]! - min[2]! });
  }
  return out;
}

describe("the dressing table equals the converted GLB (070 H1b, criterion 1; skipped without the GLB)", () => {
  it.skipIf(!HAVE_GLB)("every dressing key's bounds (w, h, d) equal the GLB's within 0.005 m", { timeout: 120000 }, () => {
    const keys = Object.keys(DRESS_BOUNDS);
    const found = glbBounds(keys.map((k) => k.slice("city-pack:".length)));
    const bad: string[] = [];
    for (const k of keys) {
      const b = found.get(k.slice("city-pack:".length))!;
      const t = DRESS_BOUNDS[k as keyof typeof DRESS_BOUNDS]!;
      for (const [n, want, got] of [["w", t.w, b.w], ["h", t.h, b.h], ["d", t.d, b.d]] as const) if (Math.abs(want - got) > 0.005) bad.push(`${k} ${n}: table ${want}, GLB ${got.toFixed(3)}`);
    }
    expect(bad).toEqual([]);
  });

  it.skipIf(!HAVE_GLB)("every host's width and depth equal the GLB's within 0.005 m", { timeout: 120000 }, () => {
    const keys = Object.keys(FLOOR_HOST);
    const found = glbBounds(keys.map((k) => k.slice("city-pack:".length)));
    const bad: string[] = [];
    for (const k of keys) {
      const b = found.get(k.slice("city-pack:".length))!;
      const t = FLOOR_HOST[k as keyof typeof FLOOR_HOST]!;
      if (Math.abs(t.w - b.w) > 0.005) bad.push(`${k} w: table ${t.w}, GLB ${b.w.toFixed(3)}`);
      if (Math.abs(t.d - b.d) > 0.005) bad.push(`${k} d: table ${t.d}, GLB ${b.d.toFixed(3)}`);
    }
    expect(bad).toEqual([]);
  });
});
