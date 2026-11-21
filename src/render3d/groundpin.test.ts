/**
 * Ticket 070 H1, criterion 1: the facades stage's ground kit table (src/city/facades/kit.ts) and thresholds (src/city/facades/constants.ts) are pinned to the old path's numbers and, when the converted City Pack is on the
 * machine, to the GLB (R-6). Always (no GLB): every entry's insets equal `BODY_M`; every sill equals `DOOR_SILLS`; every corner key's face equals `OPEN_SIDE_MEASURED`; every window sill equals `WINDOW_SILL_M`; the kind lists
 * equal `STACK_STYLES`'; the thresholds equal the old path's (`GROUND_GAP_MAX_M` is Decided, Josh, 20 Nov 2026, Q21 answer 1); the corner doors equal the pre-check's D4 table; M2 with D5's back allowance. Inside
 * `it.skipIf(!HAVE_GLB)`, read lazily: every entry's bounds equal the GLB's within 0.005 m, and the corner doors' insets, second face and sill re-measure to the table's values.
 */
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import type { CalibrationKey } from "../core";
import {
  FRONTAGE_TOL_M,
  GROUND_GAP_MAX_M,
  LIFT_CLEAR_M,
  OVERLAP_MAX_M,
  RECESS_MAX_M,
  SILL_MAX_M,
  SILL_UNDER_M,
  WALL_JOINT_TOL_M,
} from "../city/facades/constants";
import { DEEP_KEYS, DOUBLE_KEY, FIRST_FLOOR_SILL_M, GROUND_KIT, GROUND_STYLES, groundEntry } from "../city/facades/kit";
import { ownBody } from "../city/facades/place";
import { WALL_JOINT_TOL_M as BUILDINGS_WALL_JOINT_TOL_M } from "../city/buildings/constants";
import { measureBodyPlane, measureOpenSide, BODY_M, OPEN_SIDE_MEASURED } from "./facade";
import { WINDOW_SILL_M } from "./escapes";
import { FRONTAGE_TOL_M as OLD_FRONTAGE_TOL_M, OVERLAP_MAX_M as OLD_OVERLAP_MAX_M, RECESS_MAX_M as OLD_RECESS_MAX_M } from "./frontage";
import { DOOR_SILLS, LIFT_CLEAR_M as OLD_LIFT_CLEAR_M, measureDoor, SILL_MAX_M as OLD_SILL_MAX_M, SILL_UNDER_M as OLD_SILL_UNDER_M } from "./sills";
import { STACK_STYLES } from "./stacks";

const k = (name: string): CalibrationKey => `city-pack:${name}`;

describe("the ground kit table equals the old path's numbers (070 H1, criterion 1)", () => {
  it("the table has 18 keys: the six shops, the two residents' doors, the two shop corners, the two corner doors, and each style's mid floor and corner floor", () => {
    expect(GROUND_KIT).toHaveLength(18);
    expect(new Set(GROUND_KIT.map((e) => e.key)).size).toBe(18);
    expect(GROUND_KIT.slice(0, 12).map((e) => e.key.slice("city-pack:SM_Bld_".length))).toEqual([
      "Shop_01",
      "Shop_02",
      "Shop_04",
      "Shop_05",
      "Shop_06",
      "Shop_03",
      "Apartment_Door_01",
      "Apartment_Door_02",
      "Shop_Corner_01",
      "Shop_Corner_02",
      "Apartment_Door_Corner_01",
      "Apartment_Door_Corner_02",
    ]);
  });

  it("every entry's insets equal BODY_M's where BODY_M has the key (the two corner doors are in no old table: D4)", () => {
    let seen = 0;
    for (const e of GROUND_KIT) {
      const b = BODY_M[e.key];
      if (!b) {
        expect(e.key, "only the corner doors lack a BODY_M entry").toMatch(/Door_Corner/);
        continue;
      }
      seen++;
      expect(e.body, e.key).toEqual({ front: b.front, back: b.back, nx: b.nx, px: b.px });
    }
    expect(seen).toBe(16);
  });

  it("every sill equals DOOR_SILLS' where it has the key; a key with no door entry (Shop_06) and the floors have none", () => {
    for (const e of GROUND_KIT) {
      const d = DOOR_SILLS[e.key];
      if (d) expect(e.sill, e.key).toBe(d.sill_m);
      else expect(e.sill === null || /Door_Corner/.test(e.key), e.key).toBe(true);
    }
    expect(groundEntry(k("SM_Bld_Shop_06")).sill).toBeNull();
    expect(DOOR_SILLS[k("SM_Bld_Shop_06")]).toBeUndefined();
  });

  it("every corner key's face equals OPEN_SIDE_MEASURED's where that table has the key (the corner doors: -x, D4); a key that is not a corner has none", () => {
    for (const e of GROUND_KIT) {
      const m = OPEN_SIDE_MEASURED[e.key];
      if (m) expect(e.face, e.key).toBe(m.open);
      else if (/Door_Corner/.test(e.key)) expect(e.face, e.key).toBe("-x");
      else {
        expect(e.face, e.key).toBeNull();
      }
    }
    expect(GROUND_KIT.filter((e) => e.face !== null)).toHaveLength(7);
  });

  it("every floor key's window sill equals WINDOW_SILL_M's; FIRST_FLOOR_SILL_M is the first storey of each style's mid, corner and three-storey piece", () => {
    for (const e of GROUND_KIT) {
      if (e.windowSill === null) continue;
      const w = WINDOW_SILL_M[e.key];
      expect(e.windowSill, e.key).toBe(Array.isArray(w) ? w[0] : w);
    }
    expect(Object.keys(FIRST_FLOOR_SILL_M)).toHaveLength(9);
    for (const [key, v] of Object.entries(FIRST_FLOOR_SILL_M)) {
      const w = WINDOW_SILL_M[key as keyof typeof WINDOW_SILL_M];
      expect(v, key).toBe(Array.isArray(w) ? w[0] : w);
    }
  });

  it("the kind lists equal STACK_STYLES': base.mid (with Shop_03 last), base.door, base.corner, floor.mid, floor.corner, and the base pitch 3", () => {
    expect(GROUND_STYLES).toHaveLength(3);
    for (const mine of GROUND_STYLES) {
      const old = STACK_STYLES.find((s) => s.id === mine.id)!;
      expect([...mine.shop, ...mine.shopDouble], mine.id).toEqual(old.base.mid);
      expect(mine.shopDouble, mine.id).toEqual([DOUBLE_KEY]);
      expect(mine.door, mine.id).toEqual(old.base.door);
      expect(mine.shopCorner, mine.id).toEqual(old.base.corner);
      expect(mine.floor, mine.id).toEqual(old.floor.mid);
      expect(mine.floorCorner, mine.id).toEqual(old.floor.corner);
      expect(old.pitch_m.base, mine.id).toBe(3);
      for (const key of [...mine.shop, ...mine.shopDouble, ...mine.door, ...mine.shopCorner, ...mine.doorCorner, ...mine.floor, ...mine.floorCorner]) expect(GROUND_KIT.some((e) => e.key === key), key).toBe(true);
    }
  });

  it("the thresholds equal the old path's: SILL_MAX_M, SILL_UNDER_M, LIFT_CLEAR_M, OVERLAP_MAX_M, RECESS_MAX_M and FRONTAGE_TOL_M; M1's is the grammar's 0.02; GROUND_GAP_MAX_M is 0.01 (Decided)", () => {
    expect(SILL_MAX_M).toBe(OLD_SILL_MAX_M);
    expect(SILL_UNDER_M).toBe(OLD_SILL_UNDER_M);
    expect(LIFT_CLEAR_M).toBe(OLD_LIFT_CLEAR_M);
    expect(OVERLAP_MAX_M).toBe(OLD_OVERLAP_MAX_M);
    expect(RECESS_MAX_M).toBe(OLD_RECESS_MAX_M);
    expect(FRONTAGE_TOL_M).toBe(OLD_FRONTAGE_TOL_M);
    expect(WALL_JOINT_TOL_M).toBe(0.02);
    expect(WALL_JOINT_TOL_M).toBe(BUILDINGS_WALL_JOINT_TOL_M);
    expect(GROUND_GAP_MAX_M).toBe(0.01);
    expect(SILL_MAX_M).toBe(0.15);
  });

  it("the corner doors' entries equal D4's table: insets (front, back, -x, +x), body 5.000 x 5.000, second face -x, sill, height 3.000", () => {
    const d1 = groundEntry(k("SM_Bld_Apartment_Door_Corner_01"));
    const d2 = groundEntry(k("SM_Bld_Apartment_Door_Corner_02"));
    expect(d1.body).toEqual({ front: 0.529, back: 0.048, nx: 0.529, px: 0.048 });
    expect(d2.body).toEqual({ front: 0.058, back: 0.057, nx: 0.058, px: 0.057 });
    for (const [e, sill] of [[d1, 0.029], [d2, 0.206]] as const) {
      const b = ownBody(e);
      expect(b.x1 - b.x0, e.key).toBeCloseTo(5, 2);
      expect(b.z1 - b.z0, e.key).toBeCloseTo(5, 2);
      expect(e.face, e.key).toBe("-x");
      expect(e.sill, e.key).toBe(sill);
      expect(e.h, e.key).toBe(3);
    }
  });

  it("M2 with D5's allowance: every key is 5.00 m wide within 0.02 (10.00 for Shop_03), at least 4.98 deep; a key not on the deep list is at most 5.02 deep; a deep key at most 5.60; the keys deeper than 5.02 are exactly the deep list", () => {
    const deeper: string[] = [];
    for (const e of GROUND_KIT) {
      const b = ownBody(e);
      const w = b.x1 - b.x0;
      const d = b.z1 - b.z0;
      expect(Math.abs(w - (e.key === DOUBLE_KEY ? 10 : 5)), `${e.key} across`).toBeLessThanOrEqual(0.02);
      expect(d, `${e.key} deep`).toBeGreaterThanOrEqual(4.98);
      if (DEEP_KEYS.includes(e.key)) expect(d, `${e.key} deep`).toBeLessThanOrEqual(5 + OVERLAP_MAX_M);
      else expect(d, `${e.key} deep`).toBeLessThanOrEqual(5.02);
      if (d > 5.02) deeper.push(e.key);
    }
    expect(deeper.sort()).toEqual([...DEEP_KEYS].sort());
    expect(DEEP_KEYS).toHaveLength(6);
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

/** The mesh (every primitive of the node called `name` and its children) of the converted City Pack, read lazily. */
function glbMeshes(names: readonly string[]): Map<string, { pos: number[]; idx: number[] }> {
  const glb = readFileSync(CITY_GLB);
  const jsonLen = glb.readUInt32LE(12);
  const gltf = JSON.parse(glb.subarray(20, 20 + jsonLen).toString("utf8")) as Gltf;
  const bin = glb.subarray(20 + jsonLen + 8);
  const out = new Map<string, { pos: number[]; idx: number[] }>();
  for (const name of names) {
    const root = gltf.nodes.find((q) => q.name === name);
    expect(root, name).toBeDefined();
    const pos: number[] = [];
    const idx: number[] = [];
    const walk = (q: { mesh?: number; children?: number[] }): void => {
      for (const prim of q.mesh !== undefined ? gltf.meshes[q.mesh]!.primitives : []) {
        const a = gltf.accessors[prim.attributes.POSITION]!;
        const bv = gltf.bufferViews[a.bufferView]!;
        const base = (bv.byteOffset ?? 0) + (a.byteOffset ?? 0);
        const first = pos.length / 3;
        for (let i = 0; i < a.count; i++) {
          const at = base + i * (bv.byteStride ?? 12);
          pos.push(bin.readFloatLE(at), bin.readFloatLE(at + 4), bin.readFloatLE(at + 8));
        }
        const ia = gltf.accessors[prim.indices!]!;
        const ib = gltf.bufferViews[ia.bufferView]!;
        const at0 = (ib.byteOffset ?? 0) + (ia.byteOffset ?? 0);
        for (let i = 0; i < ia.count; i++) idx.push(first + (ia.componentType === 5125 ? bin.readUInt32LE(at0 + i * 4) : bin.readUInt16LE(at0 + i * 2)));
      }
      for (const c of q.children ?? []) walk(gltf.nodes[c]!);
    };
    walk(root!);
    out.set(name, { pos, idx });
  }
  return out;
}

const boundsOf = (pos: readonly number[]): { w: number; h: number; d: number; centreX: number; centreZ: number; minY: number } => {
  const min = [Infinity, Infinity, Infinity];
  const max = [-Infinity, -Infinity, -Infinity];
  for (let i = 0; i < pos.length; i++) {
    const c = i % 3;
    min[c] = Math.min(min[c]!, pos[i]!);
    max[c] = Math.max(max[c]!, pos[i]!);
  }
  return { w: max[0]! - min[0]!, h: max[1]! - min[1]!, d: max[2]! - min[2]!, centreX: (max[0]! + min[0]!) / 2, centreZ: (max[2]! + min[2]!) / 2, minY: min[1]! };
};

describe("the ground kit table equals the converted GLB (070 H1, criterion 1; skipped without the GLB)", () => {
  it.skipIf(!HAVE_GLB)("every entry's bounds (w, h, d) equal the GLB's within 0.005 m, and its pivot is the bounds' centre in x and z with the base at y 0", { timeout: 120000 }, () => {
    const names = GROUND_KIT.map((e) => e.key.slice("city-pack:".length));
    const meshes = glbMeshes(names);
    const bad: string[] = [];
    for (const e of GROUND_KIT) {
      const b = boundsOf(meshes.get(e.key.slice("city-pack:".length))!.pos);
      for (const [n, want, got] of [["w", e.w, b.w], ["h", e.h, b.h], ["d", e.d, b.d]] as const) if (Math.abs(want - got) > 0.005) bad.push(`${e.key} ${n}: table ${want}, GLB ${got.toFixed(3)}`);
      if (Math.abs(b.centreX) > 0.005 || Math.abs(b.centreZ) > 0.005 || Math.abs(b.minY) > 0.005) bad.push(`${e.key}: pivot is not the bounds' centre at the base`);
    }
    expect(bad).toEqual([]);
  });

  it.skipIf(!HAVE_GLB)("the corner doors' insets (measureBodyPlane, the ground rule), second face (measureOpenSide) and sill (measureDoor) re-measure to the table's values within 0.005 m", { timeout: 120000 }, () => {
    const keys = ["SM_Bld_Apartment_Door_Corner_01", "SM_Bld_Apartment_Door_Corner_02"];
    const meshes = glbMeshes(keys);
    const bad: string[] = [];
    for (const name of keys) {
      const e = groundEntry(`city-pack:${name}`);
      const m = meshes.get(name)!;
      for (const [face, want] of [["+z", e.body.front], ["-z", e.body.back], ["-x", e.body.nx], ["+x", e.body.px]] as const) {
        const got = measureBodyPlane(m.pos, m.idx, face, "ground");
        if (!got || Math.abs(got.offset - want) > 0.005) bad.push(`${name} ${face}: measured ${got ? got.offset.toFixed(3) : "none"}, table ${want}`);
      }
      const open = measureOpenSide(m.pos, m.idx);
      if (open !== e.face) bad.push(`${name}: open side ${String(open)}, table ${String(e.face)}`);
      const door = measureDoor({ pos: m.pos, idx: m.idx }, "+z");
      if (!door || Math.abs(door.sill_m - e.sill!) > 0.005) bad.push(`${name}: sill ${door ? door.sill_m : "none"}, table ${e.sill}`);
    }
    expect(bad).toEqual([]);
  });
});
