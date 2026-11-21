/**
 * Ticket 070 H2b, criterion 1: the facades stage's party-wall kit table (src/city/facades/partykit.ts) is pinned to the tile city's and the buildings stage's (R-6).
 * Always (no GLB): the board keys equal `dressing.ts`' `BILLBOARD_FACES` and their bounds `dressing.test.ts`' fixture's; the floor keys' insets equal `BODY_M` and the buildings kit's; the roof heights equal the buildings kit's
 * (`src/city/buildings/kit.ts`, read by this test only); `BLANK_RUN_MAX_M` is Josh's 2.1 (Q23, Decided); and no kit key is in `DRESS_NUDGE_M` or `DRESS_FRONTS` or `BUILDING_FRONTS`, so every key's own front is +z.
 * Inside `it.skipIf(!HAVE_GLB)`, read lazily as `escapepin.test.ts` does: every kit key's bounds equal the converted GLB's within 0.005 m.
 */
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { KIT } from "../city/buildings/kit";
import * as NEW from "../city/facades/partykit";
import * as OLD from "./dressing";
import { BODY_M } from "./facade";
import { BUILDING_FRONTS } from "./models";

describe("the party-wall kit table equals the old path's numbers (070 H2b, criterion 1)", () => {
  it("the board keys are dressing.ts' BILLBOARD_FACES, and their bounds are dressing.test.ts' fixture's 4.193 by 2.028 by 0.118", () => {
    expect(NEW.PARTY_BOARDS).toEqual(OLD.BILLBOARD_FACES);
    for (const b of OLD.BILLBOARD_FACES) expect(NEW.PARTY_BOUNDS[b], b).toEqual({ w: 4.193, h: 2.028, d: 0.118 });
  });

  it("the window's and the pipes' keys and bounds are the pre-check's (measured from the GLB); the table holds ten keys once each, and Pipe_Present_02 is not in it", () => {
    expect(NEW.PARTY_WINDOW).toBe("city-pack:SM_Prop_Window_01");
    expect(NEW.PARTY_PIPES).toEqual(["city-pack:SM_Prop_Pipe_Present_01", "city-pack:SM_Prop_Pipe_Present_03"]);
    expect(NEW.PARTY_BOUNDS[NEW.PARTY_WINDOW]).toEqual({ w: 1.303, h: 2.313, d: 0.37 });
    expect(NEW.PARTY_BOUNDS[NEW.PARTY_PIPES[0]!]).toEqual({ w: 4.459, h: 7.046, d: 0.498 });
    expect(NEW.PARTY_BOUNDS[NEW.PARTY_PIPES[1]!]).toEqual({ w: 2.828, h: 4.243, d: 0.498 });
    expect(NEW.PARTY_KEYS).toHaveLength(10);
    expect(new Set(NEW.PARTY_KEYS).size).toBe(10);
    expect(Object.keys(NEW.PARTY_BOUNDS).sort()).toEqual([...NEW.PARTY_KEYS].sort());
    expect(NEW.PARTY_KEYS).not.toContain("city-pack:SM_Prop_Pipe_Present_02");
  });

  it("the floor keys' side and back insets equal BODY_M's and the buildings kit's (all nine floor keys)", () => {
    const floors = KIT.filter((e) => e.role !== "roof");
    expect(floors).toHaveLength(9);
    expect(Object.keys(NEW.PARTY_BODY_M).sort()).toEqual(floors.map((e) => e.key).sort());
    for (const e of floors) {
      const b = BODY_M[e.key]!;
      expect(NEW.PARTY_BODY_M[e.key], e.key).toEqual({ back: b.back, nx: b.nx, px: b.px });
      expect(NEW.PARTY_BODY_M[e.key], e.key).toEqual({ back: e.body.back, nx: e.body.nx, px: e.body.px });
    }
  });

  it("the roof keys' heights equal the buildings kit's bounds heights (all six roof keys)", () => {
    const roofs = KIT.filter((e) => e.role === "roof");
    expect(roofs).toHaveLength(6);
    expect(Object.keys(NEW.PARTY_ROOF_H_M).sort()).toEqual(roofs.map((e) => e.key).sort());
    for (const e of roofs) expect(NEW.PARTY_ROOF_H_M[e.key], e.key).toBe(e.h);
  });

  it("BLANK_RUN_MAX_M is Josh's 2.1 m (21 Nov 2026, Q23: \"Yes, 2.1m\"), Decided", () => {
    expect(NEW.BLANK_RUN_MAX_M).toBe(2.1);
  });

  it("every key's own front is +z: DRESS_NUDGE_M and DRESS_FRONTS are empty and BUILDING_FRONTS names no kit key", () => {
    expect(Object.keys(OLD.DRESS_NUDGE_M)).toEqual([]);
    expect(Object.keys(OLD.DRESS_FRONTS)).toEqual([]);
    for (const k of Object.keys(BUILDING_FRONTS)) expect(NEW.PARTY_KEYS, k).not.toContain(k);
    for (const k of NEW.PARTY_KEYS) {
      expect(Object.keys(OLD.DRESS_NUDGE_M), k).not.toContain(k);
      expect(Object.keys(OLD.DRESS_FRONTS), k).not.toContain(k);
    }
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

describe("the party-wall kit table equals the converted GLB (070 H2b, criterion 1; skipped without the GLB)", () => {
  it.skipIf(!HAVE_GLB)("every kit key's bounds (w, h, d) equal the GLB's within 0.005 m", { timeout: 120000 }, () => {
    const keys = Object.keys(NEW.PARTY_BOUNDS);
    const found = glbBounds(keys.map((k) => k.slice("city-pack:".length)));
    const bad: string[] = [];
    for (const k of keys) {
      const b = found.get(k.slice("city-pack:".length))!;
      const t = NEW.PARTY_BOUNDS[k as keyof typeof NEW.PARTY_BOUNDS]!;
      for (const [n, want, got] of [["w", t.w, b.w], ["h", t.h, b.h], ["d", t.d, b.d]] as const) if (Math.abs(want - got) > 0.005) bad.push(`${k} ${n}: table ${want}, GLB ${got.toFixed(3)}`);
    }
    expect(bad).toEqual([]);
  });
});
