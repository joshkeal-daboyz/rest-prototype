/**
 * Ticket 070 F2, criterion 1: the buildings stage's kit table (src/city/buildings/kit.ts) is pinned to the old path's numbers and, when the converted City Pack is on the machine, to the GLB (R-6).
 * Always (no GLB): every entry's insets equal `BODY_M`; every corner key's face equals `OPEN_SIDE_MEASURED`; each style's three-storey key equals `STACK_STYLES`'; the thresholds equal the old path's; every floor key's
 * body is 5.00 x 5.00 m within 0.02 (M2). Inside `it.skipIf(!HAVE_GLB)`, read lazily: every entry's bounds equal the GLB's within 0.005 m, and its pivot is the bounds' centre in x and z, base at y 0.
 */
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { BUILDING_STYLES, FRONTAGE_TOL_M, OVERLAP_MAX_M, RECESS_MAX_M, STOREY_ALIGN_TOL_M, WALL_JOINT_TOL_M } from "../city/buildings/constants";
import { KIT } from "../city/buildings/kit";
import { ownBody } from "../city/buildings/place";
import { BODY_M, OPEN_SIDE_MEASURED } from "./facade";
import { FRONTAGE_TOL_M as OLD_FRONTAGE_TOL_M, OVERLAP_MAX_M as OLD_OVERLAP_MAX_M, RECESS_MAX_M as OLD_RECESS_MAX_M } from "./frontage";
import { STACK_STYLES, STOREY_ALIGN_TOL_M as OLD_STOREY_ALIGN_TOL_M } from "./stacks";

describe("the kit table equals the old path's numbers (070 F2, criterion 1)", () => {
  it("the table has 15 keys: for each of the three apartment styles, a mid floor, a corner floor, a three-storey piece, a mid roof and a corner roof", () => {
    expect(KIT).toHaveLength(15);
    expect(new Set(KIT.map((e) => e.key)).size).toBe(15);
    for (const s of BUILDING_STYLES) {
      const keys = [...s.floor.mid, ...s.floor.corner, ...s.floor.stack3, ...s.roof.mid, ...s.roof.corner];
      expect(keys, s.id).toHaveLength(5);
      for (const k of keys) expect(KIT.some((e) => e.key === k), `${s.id} ${k}`).toBe(true);
    }
  });

  it("every entry's insets equal BODY_M's", () => {
    for (const e of KIT) {
      const b = BODY_M[e.key];
      expect(b, e.key).toBeDefined();
      expect(e.body, e.key).toEqual({ front: b!.front, back: b!.back, nx: b!.nx, px: b!.px });
    }
  });

  it("every corner key's second face equals OPEN_SIDE_MEASURED's; a key that is not a corner has none", () => {
    for (const e of KIT) {
      if (e.corner) expect(e.face, e.key).toBe(OPEN_SIDE_MEASURED[e.key]!.open);
      else {
        expect(e.face, e.key).toBeNull();
        expect(OPEN_SIDE_MEASURED[e.key], e.key).toBeUndefined();
      }
    }
    expect(KIT.filter((e) => e.corner)).toHaveLength(6);
  });

  it("each style's three-storey key (and every other key by role) equals STACK_STYLES'", () => {
    for (const mine of BUILDING_STYLES) {
      const old = STACK_STYLES.find((s) => s.id === mine.id)!;
      expect(mine.floor.stack3, mine.id).toEqual(old.floor.stack3);
      expect(mine.floor.mid, mine.id).toEqual(old.floor.mid);
      expect(mine.floor.corner, mine.id).toEqual(old.floor.corner);
      expect(mine.roof.mid, mine.id).toEqual(old.roof.mid);
      expect(mine.roof.corner, mine.id).toEqual(old.roof.corner);
      expect(mine.pitch_m.floor, mine.id).toBe(old.pitch_m.floor);
      expect(mine.pitch_m.base, mine.id).toBe(old.pitch_m.base);
    }
  });

  it("the thresholds equal the old path's: STOREY_ALIGN_TOL_M, OVERLAP_MAX_M, RECESS_MAX_M and FRONTAGE_TOL_M; M1's is the grammar's 0.02", () => {
    expect(STOREY_ALIGN_TOL_M).toBe(OLD_STOREY_ALIGN_TOL_M);
    expect(OVERLAP_MAX_M).toBe(OLD_OVERLAP_MAX_M);
    expect(RECESS_MAX_M).toBe(OLD_RECESS_MAX_M);
    expect(FRONTAGE_TOL_M).toBe(OLD_FRONTAGE_TOL_M);
    expect(WALL_JOINT_TOL_M).toBe(0.02);
  });

  it("M2: every floor key's body (bounds less insets) is 5.00 x 5.00 m within 0.02", () => {
    for (const e of KIT.filter((x) => x.role !== "roof")) {
      const b = ownBody(e);
      expect(Math.abs(b.x1 - b.x0 - 5), `${e.key} across`).toBeLessThanOrEqual(0.02);
      expect(Math.abs(b.z1 - b.z0 - 5), `${e.key} deep`).toBeLessThanOrEqual(0.02);
    }
  });

  it("a roof's body is wider and deeper than 5 m by what its cornice's lowest tier carries (P4: reported, not an M2 failure), and every piece is taller than 0", () => {
    for (const e of KIT.filter((x) => x.role === "roof")) {
      const b = ownBody(e);
      expect(b.x1 - b.x0, e.key).toBeGreaterThan(5);
      expect(b.x1 - b.x0, e.key).toBeLessThan(5.1);
      expect(b.z1 - b.z0, e.key).toBeGreaterThan(5);
      expect(b.z1 - b.z0, e.key).toBeLessThan(5.12);
    }
    for (const e of KIT) expect(e.h, e.key).toBeGreaterThan(0);
  });
});

// ---- the real geometry ----

interface Gltf {
  nodes: { name?: string; mesh?: number; children?: number[] }[];
  meshes: { primitives: { attributes: { POSITION: number } }[] }[];
  accessors: { bufferView: number; byteOffset?: number; count: number }[];
  bufferViews: { byteOffset?: number; byteStride?: number }[];
}

const CITY_GLB = join("assets", "private", "out", "city-pack.glb");
/** True when the converted City Pack is on this machine (a fresh checkout and CI have none). Only the file's presence is looked at here; it is read inside the test. */
const HAVE_GLB = existsSync(CITY_GLB);

/** The bounds (min and max of every vertex of the node called `name` and its children), read lazily from the GLB. */
function glbBounds(names: readonly string[]): Map<string, { min: number[]; max: number[] }> {
  const glb = readFileSync(CITY_GLB);
  const jsonLen = glb.readUInt32LE(12);
  const gltf = JSON.parse(glb.subarray(20, 20 + jsonLen).toString("utf8")) as Gltf;
  const bin = glb.subarray(20 + jsonLen + 8);
  const out = new Map<string, { min: number[]; max: number[] }>();
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
            const v = bin.readFloatLE(at + 4 * c);
            min[c] = Math.min(min[c]!, v);
            max[c] = Math.max(max[c]!, v);
          }
        }
      }
      for (const c of q.children ?? []) walk(gltf.nodes[c]!);
    };
    walk(root!);
    out.set(name, { min, max });
  }
  return out;
}

describe("the kit table equals the converted GLB (070 F2, criterion 1; skipped without the GLB)", () => {
  it.skipIf(!HAVE_GLB)("every entry's bounds (w, h, d) equal the GLB's within 0.005 m, and its pivot is the bounds' centre in x and z with the base at y 0", { timeout: 120000 }, () => {
    const names = KIT.map((e) => e.key.slice("city-pack:".length));
    const bounds = glbBounds(names);
    const bad: string[] = [];
    for (const e of KIT) {
      const b = bounds.get(e.key.slice("city-pack:".length))!;
      const got = [b.max[0]! - b.min[0]!, b.max[1]! - b.min[1]!, b.max[2]! - b.min[2]!];
      const want = [e.w, e.h, e.d];
      want.forEach((w, n) => {
        if (Math.abs(w - got[n]!) > 0.005) bad.push(`${e.key} ${"whd"[n]}: table ${w}, GLB ${got[n]!.toFixed(3)}`);
      });
      if (Math.abs((b.max[0]! + b.min[0]!) / 2) > 0.005 || Math.abs((b.max[2]! + b.min[2]!) / 2) > 0.005 || Math.abs(b.min[1]!) > 0.005) bad.push(`${e.key}: pivot is not the bounds' centre at the base`);
    }
    expect(bad).toEqual([]);
  });
});
