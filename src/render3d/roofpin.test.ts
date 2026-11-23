/**
 * Ticket 070 H3, criterion 1: the facades stage's roof kit table (src/city/facades/roofkit.ts) is pinned to the tile city's and the buildings stage's (R-6).
 * Always (no GLB): each key list and number equals `dressing.ts`'; R8's two numbers equal `citymetrics.ts`'; the roof heights equal the buildings kit's (`src/city/buildings/kit.ts`, read by this test only);
 * `ROOF_ACCESS_CLEAR_M` is 1.2 (grammar rule 11; pinned, not compared: the old path never had it); `ROOF_DECK_M` is 0.5 for each of the six roof keys (RT) and `BILLBOARD_EDGE_M` is 0.28 (BB), each pinned, not compared
 * (Josh, 21 Nov 2026, Q24 answers 1 and 2); no key is in `DRESS_NUDGE_M`, `DRESS_FRONTS` or `BUILDING_FRONTS`, so every key's own front is +z (the exit's door: RD); each key's bounds equal the fixtures'
 * (`dressing.test.ts`' and `citymetrics.test.ts`', which hold the same numbers).
 * Inside `it.skipIf(!HAVE_GLB)`, read lazily as `partywallpin.test.ts` does: every key's bounds equal the converted GLB's within 0.005 m, and each of the six roof keys' deck (the top of the flat region inside its body,
 * 46 x 46 samples over the 4.40 m square the deck is) is at `ROOF_DECK_M` within 0.005 m.
 */
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import type { CalibrationKey } from "../core";
import { KIT } from "../city/buildings/kit";
import { DRESS_PER_BAY_MAX } from "../city/facades/dresskit";
import * as NEW from "../city/facades/roofkit";
import { CITY_BIG_ROOF_RUNS_MIN, CITY_CHECK } from "./citymetrics";
import * as OLD from "./dressing";
import { BUILDING_FRONTS } from "./models";

/** The bounds fixtures of `dressing.test.ts` and `citymetrics.test.ts` (width, height, depth), as they hold the roof keys. */
const FIXTURE: readonly (readonly [string, number, number, number])[] = [
  ["SM_Bld_Roof_Access_01", 2.758, 2.744, 2.851],
  ["SM_Prop_Billboard_Roof_01", 4.428, 3.063, 1.611],
  ...(["01", "02", "03", "04", "05", "06", "07"].map((n) => [`SM_Prop_Billboard_Sign_${n}`, 4.193, 2.028, 0.118]) as [string, number, number, number][]),
  ["SM_Prop_Roof_Aircon_01", 0.948, 0.592, 0.467],
  ["SM_Prop_Roof_Aircon_02", 1.586, 1.073, 0.798],
  ["SM_Prop_Roof_Aircon_03", 1.546, 1.05, 1.0],
  ["SM_Prop_SatDish_01", 1.21, 1.344, 0.682],
  ["SM_Prop_Vents_Exhaust_01", 0.868, 1.63, 2.727],
  ["SM_Prop_Vents_Straight_01", 0.868, 0.803, 2.5],
  ["SM_Prop_Water_Tower_01", 2.42, 5.509, 2.419],
];

const ROOF_KEYS: CalibrationKey[] = ["Roof_01", "Roof_02", "Roof_03", "Roof_Corner_01", "Roof_Corner_02", "Roof_Corner_03"].map((n) => `city-pack:SM_Bld_Apartment_${n}` as const);

describe("the roof kit table equals the old path's numbers (070 H3, criterion 1)", () => {
  it("each key list equals dressing.ts' (small props, tower, exit housing, billboard structure and faces)", () => {
    expect(NEW.ROOF_SMALL).toEqual(OLD.ROOF_SMALL);
    expect(NEW.ROOF_WATER_TOWER).toBe(OLD.ROOF_WATER_TOWER);
    expect(NEW.ROOF_ACCESS).toBe(OLD.ROOF_ACCESS);
    expect(NEW.BILLBOARD_STRUCTURE).toBe(OLD.BILLBOARD_STRUCTURE);
    expect(NEW.BILLBOARD_FACES).toEqual(OLD.BILLBOARD_FACES);
    // the dish is the only small key that keeps facing the street
    expect(NEW.ROOF_SMALL.filter((k) => !NEW.isTurnable(k))).toEqual(["city-pack:SM_Prop_SatDish_01"]);
  });

  it("each chance and number equals dressing.ts': P_ROOF_SMALL, P_ROOF_LARGE, P_ROOF_SECOND, ROOF_SMALL_PER_BAY, ROOF_EDGE_M, BILLBOARD_SIGN_Y_M, and the cap DRESS_PER_BAY_MAX", () => {
    expect(NEW.P_ROOF_SMALL).toBe(OLD.P_ROOF_SMALL);
    expect(NEW.P_ROOF_LARGE).toBe(OLD.P_ROOF_LARGE);
    expect(NEW.P_ROOF_SECOND).toBe(OLD.P_ROOF_SECOND);
    expect(NEW.ROOF_SMALL_PER_BAY).toBe(OLD.ROOF_SMALL_PER_BAY);
    expect(NEW.ROOF_EDGE_M).toBe(OLD.ROOF_EDGE_M);
    expect(NEW.BILLBOARD_SIGN_Y_M).toBe(OLD.BILLBOARD_SIGN_Y_M);
    expect(DRESS_PER_BAY_MAX).toBe(OLD.DRESS_PER_BAY_MAX);
    expect(NEW.ROOF_EDGE_M).toBe(0.3);
  });

  it("R8's two numbers equal citymetrics.ts' CITY_CHECK.R8 and CITY_BIG_ROOF_RUNS_MIN (0.9 and 0.5), and the big kinds are the water tower, the exit, the billboard and the novelty sign", () => {
    expect(NEW.ROOF_DRESSED_MIN).toBe(CITY_CHECK.R8);
    expect(NEW.BIG_ROOF_RUNS_MIN).toBe(CITY_BIG_ROOF_RUNS_MIN);
    expect(NEW.ROOF_DRESSED_MIN).toBe(0.9);
    expect(NEW.BIG_ROOF_RUNS_MIN).toBe(0.5);
    expect([...NEW.BIG_ROOF_KINDS]).toEqual(["waterTower", "exit", "billboard", "novelty"]);
  });

  it("the roof keys' heights equal the buildings kit's bounds heights (all six roof keys)", () => {
    const roofs = KIT.filter((e) => e.role === "roof");
    expect(roofs).toHaveLength(6);
    expect(Object.keys(NEW.ROOF_KEY_H_M).sort()).toEqual(roofs.map((e) => e.key).sort());
    for (const e of roofs) expect(NEW.ROOF_KEY_H_M[e.key], e.key).toBe(e.h);
  });

  it("ROOF_ACCESS_CLEAR_M is 1.2 (grammar rule 11; 068's Interfaces), pinned: the old path never had it", () => {
    expect(NEW.ROOF_ACCESS_CLEAR_M).toBe(1.2);
  });

  it("ROOF_DECK_M is 0.5 for each of Roof_01, _02, _03, Roof_Corner_01, _02, _03 (RT; Josh, 21 Nov 2026, Q24 answer 1: \"Yes\"), pinned", () => {
    expect(NEW.ROOF_DECK_M).toBe(0.5);
    expect(Object.keys(NEW.ROOF_DECK_BY_KEY).sort()).toEqual([...ROOF_KEYS].sort());
    for (const k of ROOF_KEYS) {
      expect(NEW.ROOF_DECK_BY_KEY[k], k).toBe(0.5);
      expect(NEW.deckHeight(k), k).toBe(0.5);
    }
  });

  it("BILLBOARD_EDGE_M is 0.28 (BB; Josh, 21 Nov 2026, Q24 answer 2: \"Yes\"), pinned, and the billboard's 4.428 m fits the 4.44 m deck it leaves and not the 4.40 m one", () => {
    expect(NEW.BILLBOARD_EDGE_M).toBe(0.28);
    const w = NEW.roofBounds(NEW.BILLBOARD_STRUCTURE).w;
    expect(w).toBeLessThanOrEqual(5 - 2 * NEW.BILLBOARD_EDGE_M);
    expect(w).toBeGreaterThan(5 - 2 * NEW.ROOF_EDGE_M);
  });

  it("WATER_TOWER_PER_BUILDINGS is 16 (H3b: Josh, 21 Nov 2026, Q25 answer 2, \"Yes to all\"), pinned: the old path has no water-tower cap", () => {
    expect(NEW.WATER_TOWER_PER_BUILDINGS).toBe(16);
  });

  it("no roof key is in DRESS_NUDGE_M, DRESS_FRONTS or BUILDING_FRONTS, so every key's own front is +z (the exit's door, RD: the GLB's recessed face)", () => {
    expect(Object.keys(OLD.DRESS_NUDGE_M)).toEqual([]);
    expect(Object.keys(OLD.DRESS_FRONTS)).toEqual([]);
    for (const [k] of FIXTURE) {
      const key = `city-pack:${k}`;
      expect(Object.keys(OLD.DRESS_NUDGE_M), key).not.toContain(key);
      expect(Object.keys(OLD.DRESS_FRONTS), key).not.toContain(key);
      expect(Object.keys(BUILDING_FRONTS), key).not.toContain(key);
    }
  });

  it("each key's bounds equal the fixtures' (14 keys)", () => {
    expect(Object.keys(NEW.ROOF_BOUNDS).sort()).toEqual(FIXTURE.map(([k]) => `city-pack:${k}`).sort());
    for (const [k, w, h, d] of FIXTURE) expect(NEW.ROOF_BOUNDS[`city-pack:${k}`], k).toEqual({ w, h, d });
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

function readGlb(): { gltf: Gltf; bin: Buffer } {
  const glb = readFileSync(CITY_GLB);
  const jsonLen = glb.readUInt32LE(12);
  return { gltf: JSON.parse(glb.subarray(20, 20 + jsonLen).toString("utf8")) as Gltf, bin: glb.subarray(20 + jsonLen + 8) };
}

/** The vertices of every primitive of the node called `name` and its children, and its triangles (index triples into them), read lazily. */
function glbMesh(gltf: Gltf, bin: Buffer, name: string): { pos: number[][]; tris: number[][] } {
  const root = gltf.nodes.find((q) => q.name === name);
  expect(root, name).toBeDefined();
  const pos: number[][] = [];
  const tris: number[][] = [];
  const walk = (q: { mesh?: number; children?: number[] }): void => {
    for (const prim of q.mesh !== undefined ? gltf.meshes[q.mesh]!.primitives : []) {
      const a = gltf.accessors[prim.attributes.POSITION]!;
      const bv = gltf.bufferViews[a.bufferView]!;
      const base = (bv.byteOffset ?? 0) + (a.byteOffset ?? 0);
      const first = pos.length;
      for (let i = 0; i < a.count; i++) {
        const at = base + i * (bv.byteStride ?? 12);
        pos.push([bin.readFloatLE(at), bin.readFloatLE(at + 4), bin.readFloatLE(at + 8)]);
      }
      if (prim.indices === undefined) continue;
      const ia = gltf.accessors[prim.indices]!;
      const ibv = gltf.bufferViews[ia.bufferView]!;
      const ibase = (ibv.byteOffset ?? 0) + (ia.byteOffset ?? 0);
      const size = ia.componentType === 5125 ? 4 : ia.componentType === 5123 ? 2 : 1;
      const at = (i: number): number => first + (size === 4 ? bin.readUInt32LE(ibase + i * 4) : size === 2 ? bin.readUInt16LE(ibase + i * 2) : bin.readUInt8(ibase + i));
      for (let i = 0; i + 2 < ia.count; i += 3) tris.push([at(i), at(i + 1), at(i + 2)]);
    }
    for (const c of q.children ?? []) walk(gltf.nodes[c]!);
  };
  walk(root!);
  return { pos, tris };
}

describe("the roof kit table equals the converted GLB (070 H3, criterion 1; skipped without the GLB)", () => {
  it.skipIf(!HAVE_GLB)("every key's bounds (w, h, d) equal the GLB's within 0.005 m", { timeout: 120000 }, () => {
    const { gltf, bin } = readGlb();
    const bad: string[] = [];
    for (const k of Object.keys(NEW.ROOF_BOUNDS) as CalibrationKey[]) {
      const { pos } = glbMesh(gltf, bin, k.slice("city-pack:".length));
      const min = [Infinity, Infinity, Infinity];
      const max = [-Infinity, -Infinity, -Infinity];
      for (const p of pos) for (let c = 0; c < 3; c++) {
        min[c] = Math.min(min[c]!, p[c]!);
        max[c] = Math.max(max[c]!, p[c]!);
      }
      const t = NEW.ROOF_BOUNDS[k]!;
      for (const [n, want, got] of [["w", t.w, max[0]! - min[0]!], ["h", t.h, max[1]! - min[1]!], ["d", t.d, max[2]! - min[2]!]] as const) if (Math.abs(want - got) > 0.005) bad.push(`${k} ${n}: table ${want}, GLB ${got.toFixed(3)}`);
    }
    expect(bad).toEqual([]);
  });

  it.skipIf(!HAVE_GLB)("each of the six roof keys' deck (the top of the flat region inside its body, 46 x 46 samples over the 4.40 m square) is at ROOF_DECK_M within 0.005 m (RT)", { timeout: 120000 }, () => {
    const { gltf, bin } = readGlb();
    const bad: string[] = [];
    for (const e of KIT.filter((q) => q.role === "roof")) {
      const { pos, tris } = glbMesh(gltf, bin, e.key.slice("city-pack:".length));
      expect(tris.length, e.key).toBeGreaterThan(0);
      // the body's centre in the piece's own frame (the pivot is the bounds' centre), and the deck: 4.40 m square about it (the cell less ROOF_EDGE_M on every side)
      const cx = (-e.w / 2 + e.body.nx + (e.w / 2 - e.body.px)) / 2;
      const cz = (-e.d / 2 + e.body.back + (e.d / 2 - e.body.front)) / 2;
      const half = 5 / 2 - NEW.ROOF_EDGE_M;
      const N = 46;
      let worst = 0;
      let missed = 0;
      for (let a = 0; a < N; a++) {
        for (let c = 0; c < N; c++) {
          const x = cx - half + (2 * half * a) / (N - 1);
          const z = cz - half + (2 * half * c) / (N - 1);
          let top = -Infinity;
          for (const [i0, i1, i2] of tris) {
            const p0 = pos[i0!]!;
            const p1 = pos[i1!]!;
            const p2 = pos[i2!]!;
            if (x < Math.min(p0[0]!, p1[0]!, p2[0]!) - 1e-6 || x > Math.max(p0[0]!, p1[0]!, p2[0]!) + 1e-6 || z < Math.min(p0[2]!, p1[2]!, p2[2]!) - 1e-6 || z > Math.max(p0[2]!, p1[2]!, p2[2]!) + 1e-6) continue;
            const det = (p1[2]! - p2[2]!) * (p0[0]! - p2[0]!) + (p2[0]! - p1[0]!) * (p0[2]! - p2[2]!);
            if (Math.abs(det) < 1e-12) continue;
            const l0 = ((p1[2]! - p2[2]!) * (x - p2[0]!) + (p2[0]! - p1[0]!) * (z - p2[2]!)) / det;
            const l1 = ((p2[2]! - p0[2]!) * (x - p2[0]!) + (p0[0]! - p2[0]!) * (z - p2[2]!)) / det;
            const l2 = 1 - l0 - l1;
            if (l0 < -1e-6 || l1 < -1e-6 || l2 < -1e-6) continue;
            top = Math.max(top, l0 * p0[1]! + l1 * p1[1]! + l2 * p2[1]!);
          }
          if (top === -Infinity) missed++;
          else worst = Math.max(worst, Math.abs(top - NEW.ROOF_DECK_M));
        }
      }
      if (missed > 0) bad.push(`${e.key}: ${missed} of ${N * N} samples hit no triangle`);
      if (worst > 0.005) bad.push(`${e.key}: the deck is up to ${worst.toFixed(3)} m from ${NEW.ROOF_DECK_M}`);
    }
    expect(bad).toEqual([]);
  });
});
