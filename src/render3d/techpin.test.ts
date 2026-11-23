/**
 * Ticket 073 D1, criterion 8 and 7 (X-8, X-5): the tech pass's kit table (src/city/tech/kit.ts) and its copies of stage 7's and stage 8's numbers are pinned.
 * Always (no GLB): the kit's keys are unique and typed textured and not emissive; no key is one the kit drops (ad, neon, billboard frame, soda machine, doorway, the pole and light pieces); `Prop_Pipes_01` and the overhangs
 * are typed and never placed; the copies of stage 7's bounds (`s7bounds.ts`) equal stage 7's kit tables key by key, and the copied constants equal stage 8's and stage 7's.
 * Inside `it.skipIf(!HAVE_GLB)`, read lazily (a fresh checkout and CI have no GLB): every kit key's bounds equal `sci-fi-city-pack.glb`'s within 0.005 m; its front is its own +z (its back plane, the largest z-facing
 * plane, faces -z: read from the GLB's face directions, as the pre-check's kit probe did); none of its materials is emissive; and the converter's manifest lists it textured with no missing texture.
 */
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import * as GC from "../city/ground/constants";
import * as GFB from "../city/ground/facadebounds";
import { DRESS_BOUNDS } from "../city/facades/dresskit";
import { NOVELTY_BOUNDS } from "../city/facades/noveltykit";
import { PARTY_BOUNDS } from "../city/facades/partykit";
import { ROOF_BOUNDS, ROOF_DECK_M } from "../city/facades/roofkit";
import { CODE_ESCAPE, WALL_BOUNDS } from "../city/facades/wallkit";
import * as TC from "../city/tech/constants";
import * as TFB from "../city/tech/s7bounds";
import { TECH_KIT } from "../city/tech/kit";
import { isNeverUsed } from "./citymetrics";

const PACK = "sci-fi-city-pack";
const NAME = (key: string): string => key.slice(`${PACK}:`.length);

describe("the tech kit table (always)", () => {
  it("every key is a unique Sci-Fi City key, typed textured and not emissive, with a front of +z and sizes above zero", () => {
    expect(new Set(TECH_KIT.map((e) => e.key)).size).toBe(TECH_KIT.length);
    for (const e of TECH_KIT) {
      expect(e.key.startsWith(`${PACK}:SM_`), e.key).toBe(true);
      expect(e.textured, e.key).toBe(true);
      expect(e.emissive, e.key).toBe(false);
      expect(e.front, e.key).toBe("+z");
      expect(Math.min(e.w, e.h, e.d), e.key).toBeGreaterThan(0);
    }
  });

  it("the kit drops what the pre-check and the kit check dropped, and keeps the guide's never-used list out", () => {
    for (const e of TECH_KIT) {
      expect(/Sign_Ad_|Sign_Neon|Sign_Billboard|VendingMachine_Soda|Doorway|Powerpoll|Streetlight|Power_Pole/.test(e.key), e.key).toBe(false);
      expect(isNeverUsed(e.key), e.key).toBe(false);
    }
  });

  it("Prop_Pipes_01 and the two overhangs are typed and pinned and never placed; everything else is placed", () => {
    const unplaced = TECH_KIT.filter((e) => !e.placed).map((e) => NAME(e.key));
    expect(unplaced.sort()).toEqual(["SM_Prop_Overhang_01", "SM_Prop_Overhang_02", "SM_Prop_Pipes_01"]);
  });

  it("the kit has the slots the ticket's table names: 7 bolt-ons, 2 cameras, 7 talls, 2 overhangs, 10 signs, 2 shopfronts, 2 wall-line and 2 kerb-line pieces", () => {
    const n = (slot: string): number => TECH_KIT.filter((e) => e.slot === slot).length;
    expect([n("bolt-on"), n("camera"), n("tall"), n("overhang"), n("sign"), n("shopfront"), n("wall-line"), n("kerb-line")]).toEqual([7, 2, 7, 2, 10, 2, 2, 2]);
  });
});

describe("the copies of stage 7's and stage 8's numbers equal the originals (always)", () => {
  it("s7bounds.ts: the 15 dressing, 8 wall and 17 novelty keys, the 4 party-wall keys and the roof keys equal the facades kit tables", () => {
    for (const [k, v] of Object.entries(TFB.AVOID_DRESS_BOUNDS)) expect(DRESS_BOUNDS[k as keyof typeof DRESS_BOUNDS], k).toEqual(v);
    for (const [k, v] of Object.entries(TFB.AVOID_WALL_BOUNDS)) expect(WALL_BOUNDS[k as keyof typeof WALL_BOUNDS], k).toEqual(v);
    for (const [k, v] of Object.entries(TFB.AVOID_NOVELTY_BOUNDS)) expect(NOVELTY_BOUNDS[k as keyof typeof NOVELTY_BOUNDS], k).toEqual(v);
    expect(Object.keys(TFB.AVOID_DRESS_BOUNDS).sort()).toEqual(Object.keys(GFB.AVOID_DRESS_BOUNDS).sort());
    expect(Object.keys(TFB.PARTY_BOUNDS).sort()).toEqual(Object.keys(PARTY_BOUNDS).sort());
    for (const [k, v] of Object.entries(TFB.PARTY_BOUNDS)) expect(PARTY_BOUNDS[k as keyof typeof PARTY_BOUNDS], k).toEqual(v);
    expect(Object.keys(TFB.ROOF_BOUNDS).sort()).toEqual(Object.keys(ROOF_BOUNDS).sort());
    for (const [k, v] of Object.entries(TFB.ROOF_BOUNDS)) expect(ROOF_BOUNDS[k as keyof typeof ROOF_BOUNDS], k).toEqual(v);
    expect(TFB.CODE_ESCAPE_KEY).toBe(GFB.CODE_ESCAPE_KEY);
    expect(TFB.CODE_ESCAPE_W_M).toBe(CODE_ESCAPE.w);
    expect(TFB.CODE_ESCAPE_D_M).toBe(CODE_ESCAPE.d);
  });

  it("the tech constants equal stage 8's rule 10 numbers and stage 7's roof deck", () => {
    for (const k of ["CELL_M", "FURN_KERB_M", "FURN_WALL_M", "FURN_PITCH_M", "FURN_KEEP_M", "FURN_CORNER_M", "FURN_MAX_H_M", "FURN_GAP_M", "EPS", "TOL"] as const) expect(TC[k], k).toBe(GC[k]);
    expect(TC.ROOF_DECK_M).toBe(ROOF_DECK_M);
  });
});

// ---- the GLB, when this machine has it ----

interface Gltf {
  nodes: { name?: string; mesh?: number; children?: number[] }[];
  meshes: { primitives: { attributes: { POSITION: number }; indices?: number; material?: number }[] }[];
  accessors: { bufferView: number; byteOffset?: number; count: number; componentType: number }[];
  bufferViews: { byteOffset?: number; byteStride?: number }[];
  materials?: { emissiveFactor?: number[]; emissiveTexture?: unknown; extensions?: Record<string, unknown> }[];
}

const GLB = join("assets", "private", "out", `${PACK}.glb`);
const MANIFEST = join("assets", "private", "out", "manifest.json");
/** True when the converted Sci-Fi City pack is on this machine. Only the files' presence is looked at here; they are read inside the tests. */
const HAVE_GLB = existsSync(GLB) && existsSync(MANIFEST);

function readGlb(): { gltf: Gltf; bin: Buffer } {
  const glb = readFileSync(GLB);
  const jsonLen = glb.readUInt32LE(12);
  return { gltf: JSON.parse(glb.subarray(20, 20 + jsonLen).toString("utf8")) as Gltf, bin: glb.subarray(20 + jsonLen + 8) };
}

/** The triangles (as three xyz points) of the node `name` and its children. */
function triangles(gltf: Gltf, bin: Buffer, name: string): { tris: number[][][]; materials: (number | undefined)[] } {
  const root = gltf.nodes.find((q) => q.name === name);
  expect(root, name).toBeDefined();
  const tris: number[][][] = [];
  const materials: (number | undefined)[] = [];
  const read = (index: number, comps: number): number[][] => {
    const a = gltf.accessors[index]!;
    const bv = gltf.bufferViews[a.bufferView]!;
    const base = (bv.byteOffset ?? 0) + (a.byteOffset ?? 0);
    const size = a.componentType === 5126 || a.componentType === 5125 ? 4 : a.componentType === 5123 ? 2 : 1;
    const out: number[][] = [];
    for (let i = 0; i < a.count; i++) {
      const at = base + i * (bv.byteStride ?? size * comps);
      const v: number[] = [];
      for (let c = 0; c < comps; c++) v.push(a.componentType === 5126 ? bin.readFloatLE(at + 4 * c) : a.componentType === 5125 ? bin.readUInt32LE(at + 4 * c) : a.componentType === 5123 ? bin.readUInt16LE(at + 2 * c) : bin.readUInt8(at + c));
      out.push(v);
    }
    return out;
  };
  const walk = (q: { mesh?: number; children?: number[] }): void => {
    for (const prim of q.mesh !== undefined ? gltf.meshes[q.mesh]!.primitives : []) {
      const P = read(prim.attributes.POSITION, 3);
      const I = prim.indices !== undefined ? read(prim.indices, 1).map((v) => v[0]!) : P.map((_, k) => k);
      for (let k = 0; k + 2 < I.length; k += 3) tris.push([P[I[k]!]!, P[I[k + 1]!]!, P[I[k + 2]!]!]);
      materials.push(prim.material);
    }
    for (const c of q.children ?? []) walk(gltf.nodes[c]!);
  };
  walk(root!);
  return { tris, materials };
}

describe("the tech kit equals the converted Sci-Fi City GLB (skipped without it)", () => {
  it.skipIf(!HAVE_GLB)("every kit key's bounds (w, h, d) equal the GLB's within 0.005 m, with its base at y 0 and its pivot at the centre in x and z", { timeout: 120000 }, () => {
    const { gltf, bin } = readGlb();
    const bad: string[] = [];
    for (const e of TECH_KIT) {
      const { tris } = triangles(gltf, bin, NAME(e.key));
      const min = [Infinity, Infinity, Infinity];
      const max = [-Infinity, -Infinity, -Infinity];
      for (const t of tris) for (const p of t) for (let c = 0; c < 3; c++) {
        min[c] = Math.min(min[c]!, p[c]!);
        max[c] = Math.max(max[c]!, p[c]!);
      }
      for (const [n, want, got] of [["w", e.w, max[0]! - min[0]!], ["h", e.h, max[1]! - min[1]!], ["d", e.d, max[2]! - min[2]!]] as const) {
        if (Math.abs(want - got) > 0.005) bad.push(`${e.key} ${n}: table ${want}, GLB ${got.toFixed(3)}`);
      }
      if (Math.abs(min[1]!) > 0.005) bad.push(`${e.key} base ${min[1]!.toFixed(3)}`);
      if (Math.abs(min[0]! + max[0]!) > 0.01 || Math.abs(min[2]! + max[2]!) > 0.01) bad.push(`${e.key} pivot is not at the centre in x and z`);
    }
    expect(bad).toEqual([]);
  });

  it.skipIf(!HAVE_GLB)("every kit key's front is its own +z: its back plane (the largest z-facing plane) faces -z, or it is symmetric; a shopfront panel faces only +z", { timeout: 120000 }, () => {
    const { gltf, bin } = readGlb();
    const bad: string[] = [];
    for (const e of TECH_KIT) {
      const { tris } = triangles(gltf, bin, NAME(e.key));
      const plane = { pos: new Map<string, number>(), neg: new Map<string, number>() };
      for (const [a, b, c] of tris) {
        const u = [b![0]! - a![0]!, b![1]! - a![1]!, b![2]! - a![2]!];
        const v = [c![0]! - a![0]!, c![1]! - a![1]!, c![2]! - a![2]!];
        const n = [u[1]! * v[2]! - u[2]! * v[1]!, u[2]! * v[0]! - u[0]! * v[2]!, u[0]! * v[1]! - u[1]! * v[0]!];
        const len = Math.hypot(n[0]!, n[1]!, n[2]!);
        if (len < 1e-12 || Math.abs(n[2]!) < Math.abs(n[0]!) || Math.abs(n[2]!) < Math.abs(n[1]!)) continue;
        const side = n[2]! > 0 ? plane.pos : plane.neg;
        const at = ((a![2]! + b![2]! + c![2]!) / 3).toFixed(2);
        side.set(at, (side.get(at) ?? 0) + len / 2);
      }
      const big = (m: Map<string, number>): number => Math.max(0, ...m.values());
      if (e.slot === "shopfront") {
        // a shopfront panel is one-sided: every z-facing face looks out of its own +z (the pre-check's probe), so it is seen from the street and hides what is behind it
        if (big(plane.neg) > 0.02 || big(plane.pos) < 1) bad.push(`${e.key}: a shopfront faces only +z (largest +z plane ${big(plane.pos).toFixed(2)} m2, largest -z plane ${big(plane.neg).toFixed(2)} m2)`);
      } else if (big(plane.neg) < big(plane.pos) - 0.02) bad.push(`${e.key}: largest +z plane ${big(plane.pos).toFixed(2)} m2, largest -z plane ${big(plane.neg).toFixed(2)} m2`);
    }
    expect(bad).toEqual([]);
  });

  it.skipIf(!HAVE_GLB)("no kit key has an emissive material, and the converter's manifest lists each textured with no missing texture (X-5)", { timeout: 120000 }, () => {
    const { gltf, bin } = readGlb();
    const bad: string[] = [];
    for (const e of TECH_KIT) {
      const { materials } = triangles(gltf, bin, NAME(e.key));
      expect(materials.length, e.key).toBeGreaterThan(0);
      for (const m of materials) {
        const mat = m === undefined ? undefined : gltf.materials?.[m];
        if (mat === undefined) continue;
        if ((mat.emissiveFactor ?? [0, 0, 0]).some((v) => v > 0)) bad.push(`${e.key} has an emissive factor`);
        if (mat.emissiveTexture !== undefined) bad.push(`${e.key} has an emissive texture`);
        if (mat.extensions && "KHR_materials_emissive_strength" in mat.extensions) bad.push(`${e.key} has an emissive strength`);
      }
    }
    const manifest = JSON.parse(readFileSync(MANIFEST, "utf8")) as { packs: { pack: string; assets: { name: string; textures: unknown[]; missingTextures: unknown[] }[] }[] };
    const pack = manifest.packs.find((p) => p.pack === PACK)!;
    for (const e of TECH_KIT) {
      const a = pack.assets.find((x) => x.name === NAME(e.key));
      if (!a) bad.push(`${e.key} is not in the manifest`);
      else if (a.textures.length === 0 || a.missingTextures.length > 0) bad.push(`${e.key} is not textured`);
    }
    expect(bad).toEqual([]);
  });
});
