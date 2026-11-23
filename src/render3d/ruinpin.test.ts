/**
 * Ticket 073 F1, criteria 9 and 10 (X-5, X-8): the ruin's kit table (src/city/ruin/kit.ts) is pinned.
 * Always (no GLB): the City Pack awning and canopy bounds and the roof keys' bounds the growth keeps clear of equal the facades kits', the deck numbers equal H3's, no entry is emissive, the giant tree is 12.6 x 11.19 x 13.12.
 * Inside `it.skipIf`, read lazily (a fresh checkout and CI have none of the assets): every kit key's bounds equal the converted Nature, Apocalypse ruin and Palm City GLBs' within 0.005 m; every kit key is on the converter's
 * textured list for its pack (a texture, none missing); the pieces the ticket leaves out for want of fit or a texture are what the ticket says they are.
 * The packs' materials carry their own emissive maps where they have any: the draw swaps every emissive material for a dark one (`models3d.ts`, "nothing is emissive"), so the table's `emissive: false` is the pass's side of X-5.
 */
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { CELL_M, ROOF_DECK_M, ROOF_EDGE_M } from "../city/ruin/constants";
import { CLEAN_ROOF_BOUNDS, CODE_ESCAPE_D_M, CODE_ESCAPE_KEY, CODE_ESCAPE_W_M, FACADE_BOUNDS, GIANT_KEY, HOST_BOUNDS, KIT, KIT_KEYS } from "../city/ruin/kit";
import { DRESS_BOUNDS } from "../city/facades/dresskit";
import { CODE_ESCAPE, CODE_ESCAPE_KEY as WALL_CODE_ESCAPE_KEY, WALL_BOUNDS } from "../city/facades/wallkit";
import * as ROOFS from "../city/facades/roofkit";
import { NOVELTY_BOUNDS } from "../city/facades/noveltykit";

describe("the ruin kit table: what needs no asset", () => {
  it("holds 38 keys from three packs, none emissive, the giant tree at 12.6 x 11.19 x 13.12", () => {
    expect(KIT_KEYS.size).toBe(38);
    for (const [k, e] of Object.entries(KIT)) {
      expect(["apocalypse-ruin:SM_", "nature-pack:SM_", "palm-city-pack:SM_"].some((p) => k.startsWith(p)), k).toBe(true);
      expect(e.emissive, k).toBe(false);
    }
    expect(KIT[GIANT_KEY]).toMatchObject({ w: 12.604, h: 11.192, d: 13.12 });
  });

  it("the awning and door canopy bounds equal the facades kit's (Shop_Cover_01 to _04, Cover_01 and _02)", () => {
    const want: Record<string, { w: number; h: number; d: number }> = {};
    for (const n of ["Bld_Shop_Cover_01", "Bld_Shop_Cover_02", "Bld_Shop_Cover_03", "Bld_Shop_Cover_04"]) want[`city-pack:SM_${n}`] = DRESS_BOUNDS[`city-pack:SM_${n}`]!;
    for (const n of ["Bld_Cover_01", "Bld_Cover_02"]) want[`city-pack:SM_${n}`] = WALL_BOUNDS[`city-pack:SM_${n}`]!;
    expect(Object.keys(HOST_BOUNDS).sort()).toEqual(Object.keys(want).sort());
    for (const [k, b] of Object.entries(want)) expect(HOST_BOUNDS[k as keyof typeof HOST_BOUNDS], k).toEqual({ w: b.w, h: b.h, d: b.d });
  });

  it("the facade bounds the growth keeps clear of equal the facades kit's: the non-glass dressing keys and the wall keys, and the code escape's key and footprint", () => {
    const want: Record<string, { w: number; h: number; d: number }> = {};
    for (const [k, b] of Object.entries(DRESS_BOUNDS)) if (!/_Glass$/.test(k)) want[k] = b;
    for (const [k, b] of Object.entries(WALL_BOUNDS)) want[k] = b;
    expect(Object.keys(FACADE_BOUNDS).sort()).toEqual(Object.keys(want).sort());
    for (const [k, b] of Object.entries(want)) expect(FACADE_BOUNDS[k as keyof typeof FACADE_BOUNDS], k).toEqual({ w: b.w, h: b.h, d: b.d });
    expect(CODE_ESCAPE_KEY).toBe(WALL_CODE_ESCAPE_KEY);
    expect([CODE_ESCAPE_W_M, CODE_ESCAPE_D_M]).toEqual([CODE_ESCAPE.w, CODE_ESCAPE.d]);
  });

  it("the City Pack roof keys' bounds equal the facades kit's: H3's nine roof keys and seven billboard faces, and H1c's seventeen novelty keys", () => {
    const want = { ...ROOFS.ROOF_BOUNDS, ...NOVELTY_BOUNDS };
    expect(Object.keys(CLEAN_ROOF_BOUNDS).sort()).toEqual(Object.keys(want).sort());
    for (const [k, b] of Object.entries(want)) expect(CLEAN_ROOF_BOUNDS[k as keyof typeof CLEAN_ROOF_BOUNDS], k).toEqual({ w: b.w, h: b.h, d: b.d });
  });

  it("the deck numbers equal H3's: the edge 0.3 m (RE), the deck 0.5 m over the roof piece (RT); the lattice cell is 5 m", () => {
    expect(ROOF_EDGE_M).toBe(ROOFS.ROOF_EDGE_M);
    expect(ROOF_DECK_M).toBe(ROOFS.ROOF_DECK_M);
    expect(CELL_M).toBe(5);
  });
});

// ---- the GLBs and the converter's reports, when this machine has them ----

interface Gltf {
  nodes: { name?: string; mesh?: number; children?: number[] }[];
  meshes: { primitives: { attributes: { POSITION: number } }[] }[];
  accessors: { bufferView: number; byteOffset?: number; count: number }[];
  bufferViews: { byteOffset?: number; byteStride?: number }[];
}
interface Report {
  assets: { name: string; bounds: { min: number[]; max: number[] }; textures: string[]; missingTextures: string[] }[];
}

const OUT = join("assets", "private", "out");
const PACKS = ["nature-pack", "apocalypse-ruin", "palm-city-pack"] as const;
const packOf = (k: string): string => k.slice(0, k.indexOf(":"));
const nameOf = (k: string): string => k.slice(k.indexOf(":") + 1);
const haveGlb = (p: string): boolean => existsSync(join(OUT, `${p}.glb`));
const haveReport = (p: string): boolean => existsSync(join(OUT, "reports", `${p}.json`));
const keysOfPack = (p: string): string[] => Object.keys(KIT).filter((k) => packOf(k) === p);

/** The bounds of every vertex of the node called `name` and its children in the converted pack, read lazily. */
function glbBounds(path: string, names: readonly string[]): Map<string, { w: number; h: number; d: number }> {
  const glb = readFileSync(path);
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

describe("the ruin kit table equals the converted GLBs (skipped without the assets)", () => {
  for (const pack of PACKS) {
    it.skipIf(!haveGlb(pack))(`${pack}: every kit key's bounds (w, h, d) equal the GLB's within 0.005 m`, { timeout: 300000 }, () => {
      const keys = keysOfPack(pack);
      expect(keys.length).toBeGreaterThan(0);
      const found = glbBounds(join(OUT, `${pack}.glb`), keys.map(nameOf));
      const bad: string[] = [];
      for (const k of keys) {
        const b = found.get(nameOf(k))!;
        const t = KIT[k as keyof typeof KIT]!;
        for (const [n, want, got] of [["w", t.w, b.w], ["h", t.h, b.h], ["d", t.d, b.d]] as const) if (Math.abs(want - got) > 0.005) bad.push(`${k} ${n}: table ${want}, GLB ${got.toFixed(3)}`);
      }
      expect(bad).toEqual([]);
    });

    it.skipIf(!haveReport(pack))(`${pack}: every kit key is on the converter's textured list: a texture, none missing (X-5)`, () => {
      const report = JSON.parse(readFileSync(join(OUT, "reports", `${pack}.json`), "utf8")) as Report;
      const byName = new Map(report.assets.map((a) => [a.name, a] as const));
      for (const k of keysOfPack(pack)) {
        const a = byName.get(nameOf(k));
        expect(a, k).toBeDefined();
        expect(a!.textures.length, k).toBeGreaterThan(0);
        expect(a!.missingTextures, k).toEqual([]);
      }
    });
  }

  it.skipIf(!haveReport("nature-pack") || !haveReport("apocalypse-ruin"))("the pieces the ticket leaves out are what it says: Plant_Bush_Leaves_03 has a missing texture, Plant_Grass_01 zero bounds, Env_Overgrowth_03 and _10 are over a 5 m cell, no overgrowth piece is under 0.15 m", () => {
    const nature = JSON.parse(readFileSync(join(OUT, "reports", "nature-pack.json"), "utf8")) as Report;
    const ruin = JSON.parse(readFileSync(join(OUT, "reports", "apocalypse-ruin.json"), "utf8")) as Report;
    const size = (r: Report, name: string): { w: number; h: number; d: number } => {
      const a = r.assets.find((x) => x.name === name)!;
      return { w: a.bounds.max[0]! - a.bounds.min[0]!, h: a.bounds.max[1]! - a.bounds.min[1]!, d: a.bounds.max[2]! - a.bounds.min[2]! };
    };
    expect(nature.assets.find((x) => x.name === "SM_Plant_Bush_Leaves_03")!.missingTextures.length).toBeGreaterThan(0);
    for (const v of Object.values(size(nature, "SM_Plant_Grass_01"))) expect(v).toBeLessThan(0.01); // zero bounds: a 3 mm sliver
    for (const n of ["SM_Env_Overgrowth_03", "SM_Env_Overgrowth_10"]) expect(Math.max(size(ruin, n).w, size(ruin, n).d), n).toBeGreaterThan(CELL_M);
    for (const n of ruin.assets.map((a) => a.name).filter((n) => /^SM_Env_Overgrowth_\d\d$/.test(n))) expect(size(ruin, n).h, n).toBeGreaterThanOrEqual(0.15);
  });
});
