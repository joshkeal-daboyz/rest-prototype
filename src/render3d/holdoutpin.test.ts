/**
 * Ticket 073 E2, criteria 6 and 7 (X-5, X-8): the hold-out's kit table (src/city/holdout/kit.ts) is pinned.
 * Always (no GLB): the City Pack roof keys' bounds the pass keeps clear of equal the facades kit's (`roofkit.ts`' and `noveltykit.ts`'), the deck numbers equal H3's, no entry is emissive, the keys are the ticket's.
 * Inside `it.skipIf`, read lazily (a fresh checkout and CI have none of the assets): every kit key's bounds equal the converted Sci-Fi Frontier GLB's within 0.005 m; every kit key is on the converter's textured list
 * (a texture, none missing); the excluded pieces that do not fit are over their place (the roof deck, the plaza).
 * The pack's materials carry the pack's own emissive map: the draw swaps every emissive material for a dark one (`models3d.ts`, "nothing is emissive"), so the table's `emissive: false` is the pass's side of X-5.
 */
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { CELL_M, ROOF_DECK_M, ROOF_EDGE_M } from "../city/holdout/constants";
import { CLEAN_ROOF_BOUNDS, CLUTTER_KEYS, CODE_ESCAPE_D_M, CODE_ESCAPE_KEY, CODE_ESCAPE_W_M, FACADE_BOUNDS, KIT, PARTY_BOUNDS, KIT_KEYS } from "../city/holdout/kit";
import * as ROOFS from "../city/facades/roofkit";
import { NOVELTY_BOUNDS } from "../city/facades/noveltykit";
import { DRESS_BOUNDS } from "../city/facades/dresskit";
import { PARTY_BOUNDS as FACADES_PARTY_BOUNDS } from "../city/facades/partykit";
import { CODE_ESCAPE, CODE_ESCAPE_KEY as WALL_CODE_ESCAPE_KEY, WALL_BOUNDS } from "../city/facades/wallkit";

describe("the hold-out kit table: what needs no asset", () => {
  it("holds 44 Sci-Fi Frontier keys, none emissive", () => {
    expect(KIT_KEYS.size).toBe(44);
    for (const [k, e] of Object.entries(KIT)) {
      expect(k.startsWith("sci-fi-frontier-pack:SM_"), k).toBe(true);
      expect(e.emissive, k).toBe(false);
    }
    expect(CLUTTER_KEYS).toHaveLength(17);
  });

  it("the City Pack roof keys' bounds equal the facades kit's: H3's nine roof keys and seven billboard faces, and H1c's seventeen novelty keys", () => {
    const want = { ...ROOFS.ROOF_BOUNDS, ...NOVELTY_BOUNDS };
    expect(Object.keys(CLEAN_ROOF_BOUNDS).sort()).toEqual(Object.keys(want).sort());
    for (const [k, b] of Object.entries(want)) expect(CLEAN_ROOF_BOUNDS[k as keyof typeof CLEAN_ROOF_BOUNDS], k).toEqual({ w: b.w, h: b.h, d: b.d });
  });

  it("the facade bounds the pass keeps clear of equal the facades kit's: the non-glass dressing keys and the wall keys, and the code escape's key and footprint", () => {
    const want: Record<string, { w: number; h: number; d: number }> = {};
    for (const [k, b] of Object.entries(DRESS_BOUNDS)) if (!/_Glass$/.test(k)) want[k] = b;
    for (const [k, b] of Object.entries(WALL_BOUNDS)) want[k] = b;
    expect(Object.keys(FACADE_BOUNDS).sort()).toEqual(Object.keys(want).sort());
    for (const [k, b] of Object.entries(want)) expect(FACADE_BOUNDS[k as keyof typeof FACADE_BOUNDS], k).toEqual({ w: b.w, h: b.h, d: b.d });
    expect(CODE_ESCAPE_KEY).toBe(WALL_CODE_ESCAPE_KEY);
    expect([CODE_ESCAPE_W_M, CODE_ESCAPE_D_M]).toEqual([CODE_ESCAPE.w, CODE_ESCAPE.d]);
  });

  it("the party-wall bounds the roof items keep clear of equal the facades kit's: the window and the two pipe runs (the boards are in the roof table)", () => {
    const want = Object.entries(FACADES_PARTY_BOUNDS).filter(([k]) => !/Billboard_Sign/.test(k));
    expect(Object.keys(PARTY_BOUNDS).sort()).toEqual(want.map(([k]) => k).sort());
    for (const [k, b] of want) expect(PARTY_BOUNDS[k as keyof typeof PARTY_BOUNDS], k).toEqual({ w: b.w, h: b.h, d: b.d });
    for (const k of Object.keys(FACADES_PARTY_BOUNDS).filter((x) => /Billboard_Sign/.test(x))) expect(CLEAN_ROOF_BOUNDS[k as keyof typeof CLEAN_ROOF_BOUNDS], k).toBeDefined();
  });

  it("the deck numbers equal H3's: the edge 0.3 m (RE), the deck 0.5 m over the roof piece (RT); the lattice cell is 5 m", () => {
    expect(ROOF_EDGE_M).toBe(ROOFS.ROOF_EDGE_M);
    expect(ROOF_DECK_M).toBe(ROOFS.ROOF_DECK_M);
    expect(ROOF_EDGE_M).toBe(0.3);
    expect(ROOF_DECK_M).toBe(0.5);
    expect(CELL_M).toBe(5);
  });

  it("the three roof items fit the 4.40 m deck; the ticket's other panels and fabric do not (their bounds are in the converter's report, checked below)", () => {
    const deck = CELL_M - 2 * ROOF_EDGE_M;
    for (const [k, e] of Object.entries(KIT)) if (e.kind === "roof") expect(Math.max(e.w, e.d), k).toBeLessThanOrEqual(deck);
  });
});

// ---- the GLB and the converter's report, when this machine has them ----

interface Gltf {
  nodes: { name?: string; mesh?: number; children?: number[] }[];
  meshes: { primitives: { attributes: { POSITION: number } }[] }[];
  accessors: { bufferView: number; byteOffset?: number; count: number }[];
  bufferViews: { byteOffset?: number; byteStride?: number }[];
}
interface Report {
  assets: { name: string; bounds: { min: number[]; max: number[] }; textures: string[]; missingTextures: string[] }[];
}

const GLB = join("assets", "private", "out", "sci-fi-frontier-pack.glb");
const REPORT = join("assets", "private", "out", "reports", "sci-fi-frontier-pack.json");
const HAVE_GLB = existsSync(GLB);
const HAVE_REPORT = existsSync(REPORT);
const nameOf = (k: string): string => k.slice("sci-fi-frontier-pack:".length);

/** The bounds of every vertex of the node called `name` and its children in the converted pack, read lazily. */
function glbBounds(names: readonly string[]): Map<string, { w: number; h: number; d: number }> {
  const glb = readFileSync(GLB);
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

describe("the hold-out kit table equals the converted Sci-Fi Frontier GLB (skipped without the assets)", () => {
  it.skipIf(!HAVE_GLB)("every kit key's bounds (w, h, d) equal the GLB's within 0.005 m", { timeout: 300000 }, () => {
    const keys = Object.keys(KIT);
    const found = glbBounds(keys.map(nameOf));
    const bad: string[] = [];
    for (const k of keys) {
      const b = found.get(nameOf(k))!;
      const t = KIT[k as keyof typeof KIT]!;
      for (const [n, want, got] of [["w", t.w, b.w], ["h", t.h, b.h], ["d", t.d, b.d]] as const) if (Math.abs(want - got) > 0.005) bad.push(`${k} ${n}: table ${want}, GLB ${got.toFixed(3)}`);
    }
    expect(bad).toEqual([]);
  });

  it.skipIf(!HAVE_REPORT)("every kit key is on the converter's textured list: a texture, none missing (X-5)", () => {
    const report = JSON.parse(readFileSync(REPORT, "utf8")) as Report;
    const byName = new Map(report.assets.map((a) => [a.name, a] as const));
    for (const k of Object.keys(KIT)) {
      const a = byName.get(nameOf(k));
      expect(a, k).toBeDefined();
      expect(a!.textures.length, k).toBeGreaterThan(0);
      expect(a!.missingTextures, k).toEqual([]);
    }
  });

  it.skipIf(!HAVE_REPORT)("the pieces the ticket leaves out for want of fit are over their place: the two long stalls over the 10 m plaza, the other panels and the third fabric over the 4.40 m deck", () => {
    const report = JSON.parse(readFileSync(REPORT, "utf8")) as Report;
    const size = (name: string): { w: number; d: number } => {
      const a = report.assets.find((x) => x.name === name)!;
      return { w: a.bounds.max[0]! - a.bounds.min[0]!, d: a.bounds.max[2]! - a.bounds.min[2]! };
    };
    for (const n of ["SM_Bld_Market_Stall_01", "SM_Bld_Market_Stall_03"]) expect(Math.max(size(n).w, size(n).d), n).toBeGreaterThan(10);
    const deck = CELL_M - 2 * ROOF_EDGE_M;
    for (const n of ["SM_Prop_Solar_Panel_03", "SM_Prop_Solar_Panel_04", "SM_Prop_Fabric_03"]) expect(Math.max(size(n).w, size(n).d), n).toBeGreaterThan(deck);
  });
});
