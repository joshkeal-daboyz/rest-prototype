/**
 * Ticket 054 B: each City Pack block in one of the colourway atlases, so neighbours differ. Fixtures only: the City Pack's names and sizes typed in as numbers from the converted manifest
 * (18 Nov 2026), fake GLBs made of boxes and `new Texture()`s with a name, a fake texture loader, no WebGL, no timers, no files. Nothing here reads assets/private/.
 */

import { describe, expect, it } from "vitest";
import { BoxGeometry, ClampToEdgeWrapping, Group, Mesh, MeshStandardMaterial, NearestFilter, Raycaster, RepeatWrapping, SRGBColorSpace, Texture, Vector3, type Material, type Object3D } from "three";
import { ASSET_MANIFEST_VERSION, type AssetColourway, type AssetEntry, type AssetManifest } from "../core";
import { COLOURWAY_POOL, STOP_SIGN_COLOURWAY, assignColourways, colourwayStart, isBaseAtlasName, isColourwayId } from "./colourway";
import { allStackKeys, createColourwayCache, loadModels, paintStack, stackGroup, type ModelSet } from "./models3d";
import type { Stack } from "./stacks";

// ---- fixtures ----
const SIZES: [string, number, number, number][] = [
  ["SM_Bld_Apartment_01", 5.0, 3.0, 5.196],
  ["SM_Bld_Apartment_02", 5.17, 3.0, 5.214],
  ["SM_Bld_Apartment_03", 5.281, 3.0, 5.497],
  ["SM_Bld_Apartment_Corner_01", 5.196, 3.0, 5.196],
  ["SM_Bld_Apartment_Corner_02", 5.214, 3.0, 5.214],
  ["SM_Bld_Apartment_Corner_03", 5.491, 3.0, 5.497],
  ["SM_Bld_Apartment_Door_01", 5.096, 3.0, 5.577],
  ["SM_Bld_Apartment_Door_02", 5.114, 3.0, 5.115],
  ["SM_Bld_Apartment_Roof_01", 5.31, 0.5, 5.918],
  ["SM_Bld_Apartment_Roof_02", 5.252, 0.744, 5.488],
  ["SM_Bld_Apartment_Roof_03", 5.31, 0.744, 5.624],
  ["SM_Bld_Apartment_Roof_Corner_01", 5.904, 0.5, 5.918],
  ["SM_Bld_Apartment_Roof_Corner_02", 5.611, 0.744, 5.624],
  ["SM_Bld_Apartment_Roof_Corner_03", 5.462, 0.744, 5.488],
  ["SM_Bld_Apartment_Stack_01", 5.0, 9.0, 5.196],
  ["SM_Bld_Apartment_Stack_02", 5.17, 9.0, 5.214],
  ["SM_Bld_Apartment_Stack_03", 5.281, 9.0, 5.497],
  ["SM_Bld_Shop_01", 5.0, 3.054, 5.536],
  ["SM_Bld_Shop_02", 5.0, 3.3, 5.425],
  ["SM_Bld_Shop_03", 10.087, 3.084, 5.493],
  ["SM_Bld_Shop_04", 5.106, 3.17, 5.886],
  ["SM_Bld_Shop_05", 5.108, 3.0, 5.224],
  ["SM_Bld_Shop_06", 5.175, 3.0, 5.877],
  ["SM_Bld_Shop_Corner_01", 5.377, 3.0, 5.471],
  ["SM_Bld_Shop_Corner_02", 5.332, 3.0, 5.332],
  ["SM_Bld_OfficeOld_Small_Base_01", 10.936, 6.0, 10.936],
  ["SM_Bld_OfficeOld_Small_Floor_01", 10.0, 3.193, 10.0],
  ["SM_Bld_OfficeOld_Small_Roof_01", 11.12, 4.215, 11.2],
  ["SM_Bld_OfficeOld_Large_Base_01", 15.936, 6.0, 15.936],
  ["SM_Bld_OfficeOld_Large_Floor_01", 15.0, 3.193, 15.0],
  ["SM_Bld_OfficeOld_Large_Roof_01", 16.087, 4.227, 16.123],
  ["SM_Bld_OfficeOctagon_Base_01", 20.781, 3.896, 20.781],
  ["SM_Bld_OfficeOctagon_Floor_01", 20.465, 3.0, 20.465],
  ["SM_Bld_OfficeOctagon_Roof_01", 20.465, 5.382, 20.465],
];
const entryOf = ([name, w, h, d]: [string, number, number, number], i: number): AssetEntry => ({
  name,
  source: `${name}.fbx`,
  bounds: { min: [-w / 2, 0, -d / 2], max: [w / 2, h, d / 2] },
  triangles: 100 + i,
  textures: [],
  missingTextures: [],
  warnings: [],
});
const ENTRIES = SIZES.map(entryOf);

const BASE_STEM = "PolygonCity_Texture";
const cwOf = (id: string): AssetColourway => ({ id, image: `city-pack/colourways/${BASE_STEM}_${id}.png`, base: BASE_STEM, width: 1024, height: 1024 });
/** The twelve files the converter exports, plus two that are not colourways of the wall atlas (never to be requested). */
const ALL_TWELVE = ["01_A", "01_B", "01_C", "02_A", "02_B", "02_C", "03_A", "03_B", "03_C", "04_A", "04_B", "04_C"];
const NOT_COLOURWAYS: AssetColourway[] = [
  { id: "Emissive_01", image: "city-pack/colourways/PolygonCity_Emissive_01.png", base: BASE_STEM, width: 1024, height: 1024 },
  { id: "BillboardAds", image: "city-pack/colourways/PolygonCity_BillboardAds.png", base: BASE_STEM, width: 1024, height: 1024 },
];
const POOL_IDS = COLOURWAY_POOL.filter((id) => id !== "base");

const manifestOf = (colourways?: readonly AssetColourway[]): AssetManifest => ({
  version: ASSET_MANIFEST_VERSION,
  generatedAt: "2026-01-01T00:00:00Z",
  blenderVersion: "5.0.0",
  packs: [{ pack: "city-pack", glb: "city-pack.glb", atlas: null, ...(colourways ? { colourways } : {}), assets: ENTRIES, failures: [] }],
});
const FULL = manifestOf([...ALL_TWELVE.map(cwOf), ...NOT_COLOURWAYS]);

/** The materials every fake piece shares: one wall atlas (the GLB's embedded image, named as the findings have it) and one pane of glass. */
function fixtureMaterials(): { atlas: MeshStandardMaterial; glass: MeshStandardMaterial; atlasMap: Texture } {
  const atlasMap = new Texture();
  atlasMap.name = BASE_STEM;
  atlasMap.flipY = false;
  atlasMap.colorSpace = SRGBColorSpace;
  atlasMap.wrapS = RepeatWrapping;
  atlasMap.wrapT = ClampToEdgeWrapping;
  const atlas = new MeshStandardMaterial({ map: atlasMap });
  const glass = new MeshStandardMaterial({ transparent: true, opacity: 0.4 });
  return { atlas, glass, atlasMap };
}

/** A GLB of one node per entry; each node holds two boxes, a wall (the atlas material) and a pane (glass). */
function glbOf(mats: { atlas: Material; glass: Material }): Object3D {
  const g = new Group();
  const geo = new BoxGeometry(1, 1, 1);
  for (const e of ENTRIES) {
    const n = new Group();
    n.name = e.name;
    n.add(new Mesh(geo, mats.atlas), new Mesh(geo, mats.glass));
    g.add(n);
  }
  return g;
}

interface Run {
  set: ModelSet;
  mats: ReturnType<typeof fixtureMaterials>;
  requested: string[];
  lines: string[];
}
async function setOf(manifest: AssetManifest, opts: { fail?: readonly string[]; noLoader?: boolean; stackKeys?: boolean } = {}): Promise<Run> {
  const mats = fixtureMaterials();
  const requested: string[] = [];
  const lines: string[] = [];
  const set = await loadModels({
    fetchJson: async (): Promise<unknown> => manifest,
    loadGlb: async () => glbOf(mats),
    ...(opts.noLoader
      ? {}
      : {
          loadTexture: async (url: string): Promise<Texture> => {
            requested.push(url);
            if (opts.fail?.some((id) => url.endsWith(`_${id}.png`))) throw new Error("HTTP 404");
            return new Texture();
          },
        }),
    ...(opts.stackKeys === false ? {} : { stackKeys: allStackKeys() }),
    dir: "/out/",
    info: (m) => lines.push(m),
  });
  return { set, mats, requested, lines };
}

// ---- the pure assignment (criterion 6) ----

describe("COLOURWAY_POOL and the id rules", () => {
  it("is the base and seven colourways, no B tone, in the ticket's order", () => {
    expect(COLOURWAY_POOL).toEqual(["base", "01_C", "02_A", "02_C", "03_A", "03_C", "04_A", "04_C"]);
    expect(POOL_IDS.every((id) => isColourwayId(id) && !id.endsWith("_B"))).toBe(true);
  });

  it("accepts the twelve file ids and nothing that could climb out of the folder", () => {
    for (const id of ALL_TWELVE) expect(isColourwayId(id), id).toBe(true);
    for (const bad of ["../x", "base", "05_A", "02_D", "02_a", "Emissive_01", "", "02_A/../x"]) expect(isColourwayId(bad), bad).toBe(false);
  });

  it("knows the base atlas by its stem and by its numbered colourways, and nothing else", () => {
    expect(isBaseAtlasName("PolygonCity_Texture", BASE_STEM)).toBe(true);
    expect(isBaseAtlasName("PolygonCity_Texture.png", BASE_STEM)).toBe(true);
    expect(isBaseAtlasName("PolygonCity_Texture.001", BASE_STEM)).toBe(true);
    expect(isBaseAtlasName("PolygonCity_Texture_01_A", BASE_STEM)).toBe(true);
    for (const no of ["", "PolygonCity_Emissive_01", "PolygonCity_Texture_Emissive_01", "PolygonCity_BillboardAds", "Other", "XPolygonCity_Texture"]) expect(isBaseAtlasName(no, BASE_STEM), no).toBe(false);
  });
});

describe("assignColourways", () => {
  const blocks = [
    { key: "a", run: "r1" },
    { key: "b", run: "r1" },
    { key: "c", run: "r1" },
    { key: "d" },
    { key: "e", run: "r2" },
  ];

  it("is deterministic and gives one id per block, from `available`", () => {
    const a = assignColourways(blocks, COLOURWAY_POOL);
    expect(assignColourways(blocks, COLOURWAY_POOL)).toEqual(a);
    expect(a).toHaveLength(blocks.length);
    for (const id of a) expect(COLOURWAY_POOL).toContain(id);
  });

  it("gives every block the base when the base is all there is", () => {
    expect(assignColourways(blocks, ["base"])).toEqual(["base", "base", "base", "base", "base"]);
    expect(assignColourways(blocks, [])).toEqual(["base", "base", "base", "base", "base"]);
  });

  it("gives a stack on a lone lot the id its key hashes to, whatever block stands before it", () => {
    for (const n of [2, 5, 8]) {
      const avail = COLOURWAY_POOL.slice(0, n);
      for (const key of ["road-a:1:0", "road-b:-1:3", "x"]) expect(assignColourways([{ key: "other", run: "r" }, { key }], avail)[1]).toBe(avail[colourwayStart(key, n)]);
    }
  });

  it("steps on from an id a run-mate before it has, and only for the same run", () => {
    // Two blocks whose keys hash to the same start: in one run the second steps on, in two runs it does not.
    const n = 8;
    const keys = Array.from({ length: 200 }, (_, i) => `k${i}`);
    const first = keys[0]!;
    const twin = keys.find((k) => k !== first && colourwayStart(k, n) === colourwayStart(first, n))!;
    expect(twin).toBeDefined();
    const same = assignColourways([{ key: first, run: "r" }, { key: twin, run: "r" }], COLOURWAY_POOL);
    expect(same[1]).not.toBe(same[0]);
    const apart = assignColourways([{ key: first, run: "r" }, { key: twin, run: "s" }], COLOURWAY_POOL);
    expect(apart[1]).toBe(apart[0]);
  });

});

// ---- paintStack (criterion 7) ----

describe("paintStack", () => {
  /** One stack of two pieces off one fixture root, cloned the way `stackGroup` clones, with a second base-atlas material named as the Shop corner's. */
  function fixture() {
    const mats = fixtureMaterials();
    const alt = new Texture();
    alt.name = `${BASE_STEM}_01_A`;
    alt.flipY = true;
    alt.colorSpace = SRGBColorSpace;
    const altMat = new MeshStandardMaterial({ map: alt });
    const other = new MeshStandardMaterial({ map: Object.assign(new Texture(), { name: "SomethingElse" }) });
    const root = new Group();
    const geo = new BoxGeometry(1, 1, 1);
    root.add(new Mesh(geo, mats.atlas), new Mesh(geo, altMat), new Mesh(geo, mats.glass), new Mesh(geo, other));
    const roots = new Map([["city-pack:SM_Bld_Apartment_01" as const, root]]);
    const stack = { style: "apartment-01", pieces: [{ key: "city-pack:SM_Bld_Apartment_01", x: 0, y: 0, z: 0, yaw: 0 }, { key: "city-pack:SM_Bld_Apartment_01", x: 5, y: 0, z: 0, yaw: 0 }] } as unknown as Stack;
    const tex = new Texture();
    tex.name = `${BASE_STEM}_02_A`;
    tex.userData["colourwayBase"] = BASE_STEM;
    const set = { colourways: new Map([["02_A", tex], ["03_A", Object.assign(new Texture(), { name: `${BASE_STEM}_03_A`, userData: { colourwayBase: BASE_STEM } })]]) };
    return { ...mats, altMat, other, root, roots, stack, tex, set };
  }
  const meshesOf = (o: Object3D): Mesh[] => {
    const out: Mesh[] = [];
    o.traverse((c) => {
      if ((c as Mesh).isMesh) out.push(c as Mesh);
    });
    return out;
  };
  const rootMaterials = (root: Object3D): Material[] => meshesOf(root).map((m) => m.material as Material);

  it("replaces a base-atlas material, and the `_01_A` one, by a clone whose map is the colourway's, with the source map's sampling", () => {
    const f = fixture();
    const g = stackGroup(f.stack, f.roots);
    paintStack(g, "02_A", f.set, createColourwayCache());
    const [wall, alt] = meshesOf(g);
    for (const [m, source] of [[wall!, f.atlas], [alt!, f.altMat]] as const) {
      const mat = m.material as MeshStandardMaterial;
      expect(mat).not.toBe(source);
      const map = mat.map!;
      expect(map).not.toBe(source.map);
      expect(map.source, "the colourway's image, shared").toBe(f.tex.source);
      expect(map.flipY).toBe(source.map!.flipY);
      expect(map.colorSpace).toBe(source.map!.colorSpace);
      expect(map.wrapS).toBe(source.map!.wrapS);
      expect(map.wrapT).toBe(source.map!.wrapT);
      expect(map.channel).toBe(source.map!.channel);
      expect(map.magFilter).toBe(NearestFilter);
      expect(map.minFilter).toBe(NearestFilter);
      expect(map.generateMipmaps).toBe(false);
      expect(map.name).toBe(f.tex.name);
      // Nothing else of the material moves, and no emissive map is ever set.
      expect(mat.emissiveMap).toBeNull();
      expect(mat.color.getHex()).toBe(source.color.getHex());
    }
  });

  it("leaves glass, a mapless material and a map that is not the base atlas as the very same objects", () => {
    const f = fixture();
    const g = stackGroup(f.stack, f.roots);
    paintStack(g, "02_A", f.set, createColourwayCache());
    for (const mesh of meshesOf(g).filter((_, i) => i % 4 >= 2)) expect([f.glass, f.other]).toContain(mesh.material);
    const kept = meshesOf(g).map((m) => m.material);
    expect(kept[2]).toBe(f.glass);
    expect(kept[3]).toBe(f.other);
  });

  it("shares one clone between two blocks in the same colourway, and makes another for another colourway", () => {
    const f = fixture();
    const cache = createColourwayCache();
    const a = stackGroup(f.stack, f.roots);
    const b = stackGroup(f.stack, f.roots);
    const c = stackGroup(f.stack, f.roots);
    paintStack(a, "02_A", f.set, cache);
    paintStack(b, "02_A", f.set, cache);
    paintStack(c, "03_A", f.set, cache);
    const wall = (g: Object3D): Material => meshesOf(g)[0]!.material as Material;
    expect(wall(a)).toBe(wall(b));
    expect(wall(c)).not.toBe(wall(a));
    expect((wall(c) as MeshStandardMaterial).map!.name).toBe(`${BASE_STEM}_03_A`);
    // Every piece of one stack shares it too: the materials grow by sources x ids, not by blocks or pieces.
    expect(new Set(meshesOf(a).filter((_, i) => i % 4 === 0).map((m) => m.material)).size).toBe(1);
    expect(cache.materials.get("02_A")!.size).toBe(2);
  });

  it("never writes the cached root: its materials, maps and their uuids are as they were", () => {
    const f = fixture();
    const before = rootMaterials(f.root);
    const uuids = before.map((m) => ((m as MeshStandardMaterial).map?.uuid ?? "none") + m.uuid);
    const maps = before.map((m) => (m as MeshStandardMaterial).map ?? null);
    const g = stackGroup(f.stack, f.roots);
    paintStack(g, "02_A", f.set, createColourwayCache());
    const after = rootMaterials(f.root);
    after.forEach((m, i) => {
      expect(m).toBe(before[i]);
      expect((m as MeshStandardMaterial).map ?? null).toBe(maps[i]);
      expect(((m as MeshStandardMaterial).map?.uuid ?? "none") + m.uuid).toBe(uuids[i]);
    });
    expect(f.atlas.map).toBe(f.atlasMap);
  });

  it("replaces nothing for the base, for an id that did not load, and for a set with no colourways", () => {
    const f = fixture();
    const cache = createColourwayCache();
    const g = stackGroup(f.stack, f.roots);
    const was = meshesOf(g).map((m) => m.material);
    paintStack(g, "base", f.set, cache);
    paintStack(g, "04_C", f.set, cache);
    paintStack(g, "02_A", {}, cache);
    expect(meshesOf(g).map((m) => m.material)).toEqual(was);
    meshesOf(g).forEach((m, i) => expect(m.material).toBe(was[i]));
    expect(cache.materials.size).toBe(0);
    expect(cache.textures.size).toBe(0);
  });

  it("leaves picking as it was: nothing in a painted group takes a ray", () => {
    const f = fixture();
    const g = stackGroup(f.stack, f.roots);
    paintStack(g, "02_A", f.set, createColourwayCache());
    g.updateMatrixWorld(true);
    const rc = new Raycaster(new Vector3(0, 10, 0), new Vector3(0, -1, 0));
    expect(rc.intersectObject(g, true)).toEqual([]);
  });

  it("frees only what it made: disposing the cache leaves the loaded colourway and the root as they are", () => {
    const f = fixture();
    const cache = createColourwayCache();
    paintStack(stackGroup(f.stack, f.roots), "02_A", f.set, cache);
    let disposed = 0;
    f.tex.addEventListener("dispose", () => disposed++);
    f.atlasMap.addEventListener("dispose", () => disposed++);
    cache.dispose();
    expect(disposed).toBe(0);
    expect(cache.materials.size).toBe(0);
  });
});

// ---- the lazy load (criteria 8 and 9) ----

describe("loadModels and the colourways", () => {
  it("requests only the pool's seven ids, each once, never a B tone, an emissive map or the billboard, and says how many loaded", async () => {
    const r = await setOf(FULL);
    expect(r.requested.slice().sort()).toEqual(POOL_IDS.map((id) => `/out/city-pack/colourways/${BASE_STEM}_${id}.png`).sort());
    expect(new Set(r.requested).size).toBe(r.requested.length);
    for (const url of r.requested) expect(url).not.toMatch(/_B\.png|Emissive|Billboard|_01_A\.png/);
    expect([...r.set.colourways!.keys()].sort()).toEqual(POOL_IDS.slice().sort());
    expect(r.lines.filter((l) => l.includes("colourways:"))).toEqual(["3D models: city-pack colourways: 7 of 7 loaded"]);
    for (const [id, tex] of r.set.colourways!) expect(tex.userData["colourwayBase"], id).toBe(BASE_STEM);
  });

  it("fetches nothing and sets no `colourways` when the manifest lists none, there is no loader, or stack pieces were not asked for", async () => {
    for (const r of [await setOf(manifestOf()), await setOf(manifestOf([])), await setOf(FULL, { noLoader: true }), await setOf(FULL, { stackKeys: false })]) {
      expect(r.requested).toEqual([]);
      expect(r.set.colourways).toBeUndefined();
      expect("colourways" in r.set).toBe(false);
      expect(r.lines.some((l) => l.includes("colourways"))).toBe(false);
    }
  });

  it("fetches nothing when no stack piece loaded", async () => {
    const requested: string[] = [];
    const set = await loadModels({
      fetchJson: async (): Promise<unknown> => FULL,
      loadGlb: async () => {
        throw new Error("HTTP 404");
      },
      loadTexture: async (url) => {
        requested.push(url);
        return new Texture();
      },
      stackKeys: allStackKeys(),
      info: () => {},
    });
    expect(requested).toEqual([]);
    expect(set.colourways).toBeUndefined();
  });

  it("drops one failing id with one line and uses the others", async () => {
    const r = await setOf(FULL, { fail: ["03_A"] });
    expect(r.set.colourways!.has("03_A")).toBe(false);
    expect(r.set.colourways!.size).toBe(6);
    expect(r.lines.filter((l) => l.includes("could not be loaded"))).toHaveLength(1);
    expect(r.lines.some((l) => l.includes("6 of 7 loaded"))).toBe(true);
  });

  it("leaves the set with no colourways when every load fails", async () => {
    const r = await setOf(FULL, { fail: POOL_IDS });
    expect(r.set.colourways).toBeUndefined();
    expect(r.set.stack!.length).toBeGreaterThan(0);
    expect(r.lines.some((l) => l.includes("0 of 7 loaded"))).toBe(true);
  });

  it("asks for a pool id the manifest does not list no more than it has", async () => {
    const r = await setOf(manifestOf(["02_A", "04_C", "03_B"].map(cwOf)));
    expect(r.requested.slice().sort()).toEqual([`/out/city-pack/colourways/${BASE_STEM}_02_A.png`, `/out/city-pack/colourways/${BASE_STEM}_04_C.png`]);
    expect(r.lines.some((l) => l.includes("2 of 7 loaded"))).toBe(true);
  });
});

// ---- the stop sign's own colourway (ticket 070 TR2, criterion 5) ----

describe("loadModels and the sign colourways (070 TR2)", () => {
  const signRun = async (signColourways: readonly string[], opts: { manifest?: AssetManifest; stackKeys?: boolean } = {}): Promise<Run> => {
    const mats = fixtureMaterials();
    const requested: string[] = [];
    const lines: string[] = [];
    const set = await loadModels({
      fetchJson: async (): Promise<unknown> => opts.manifest ?? FULL,
      loadGlb: async () => glbOf(mats),
      loadTexture: async (url: string): Promise<Texture> => {
        requested.push(url);
        return new Texture();
      },
      ...(opts.stackKeys === false ? {} : { stackKeys: allStackKeys() }),
      signColourways,
      dir: "/out/",
      info: (m) => lines.push(m),
    });
    return { set, mats, requested, lines };
  };

  it("exports the stop sign's colourway, which is not in the pool", () => {
    expect(STOP_SIGN_COLOURWAY).toBe("01_A");
    expect(COLOURWAY_POOL).not.toContain(STOP_SIGN_COLOURWAY);
    expect(isColourwayId(STOP_SIGN_COLOURWAY)).toBe(true);
  });

  it("with [\"01_A\"] requests exactly one more texture, lands it in signColourways and not in colourways, and the pool's line still says 7 of 7", async () => {
    const base = await setOf(FULL);
    const r = await signRun(["01_A"]);
    const extra = r.requested.filter((u) => !base.requested.includes(u));
    expect(extra).toEqual([`/out/city-pack/colourways/${BASE_STEM}_01_A.png`]);
    expect(r.requested).toHaveLength(base.requested.length + 1);
    expect([...r.set.signColourways!.keys()]).toEqual(["01_A"]);
    expect(r.set.signColourways!.get("01_A")!.userData["colourwayBase"]).toBe(BASE_STEM);
    expect(r.set.colourways!.has("01_A")).toBe(false);
    expect([...r.set.colourways!.keys()].sort()).toEqual(POOL_IDS.slice().sort());
    expect(r.lines.filter((l) => l.includes("city-pack colourways:"))).toEqual(["3D models: city-pack colourways: 7 of 7 loaded"]);
    expect(r.lines.filter((l) => l.includes("sign colourways"))).toEqual(["3D models: city-pack sign colourways: 1 of 1 loaded"]);
  });

  it("asks for nothing more without the option, and fetches no sign colourway when no stack piece was asked for", async () => {
    const r = await setOf(FULL);
    expect(r.requested.some((u) => u.endsWith("_01_A.png"))).toBe(false);
    expect(r.set.signColourways).toBeUndefined();
    expect("signColourways" in r.set).toBe(false);
    const none = await signRun(["01_A"], { stackKeys: false });
    expect(none.requested).toEqual([]);
    expect(none.set.signColourways).toBeUndefined();
  });

  it("refuses a pool id and a path with one line each and fetches nothing more", async () => {
    const base = await setOf(FULL);
    for (const id of ["02_A", "../x"]) {
      const r = await signRun([id]);
      expect(r.requested.slice().sort(), id).toEqual(base.requested.slice().sort());
      expect(r.set.signColourways, id).toBeUndefined();
      expect(r.lines.filter((l) => l.includes("sign colourway")), id).toHaveLength(1);
      expect(r.lines.filter((l) => l.includes("not a colourway id outside the pool")), id).toHaveLength(1);
    }
  });

  it("drops a sign colourway the manifest does not list or that fails to load, with the pool untouched", async () => {
    const unlisted = await signRun(["01_A"], { manifest: manifestOf(["02_A", "04_C"].map(cwOf)) });
    expect(unlisted.set.signColourways).toBeUndefined();
    expect(unlisted.lines.some((l) => l.includes("sign colourways: 0 of 1 loaded"))).toBe(true);
    expect(unlisted.set.colourways!.size).toBe(2);
  });
});
