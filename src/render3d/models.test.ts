import { describe, expect, it } from "vitest";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { BoxGeometry, DataTexture, Group, LinearFilter, Mesh, MeshStandardMaterial, NearestFilter, Object3D, Texture, type Material } from "three";
import { ASSET_MANIFEST_VERSION, type AssetEntry, type AssetManifest, type AssetWarning } from "../core";
import { POLE_HEIGHT, LOT_TYPES, LOT_TYPE_NAMES, type Lot } from "./kitunits";
import { BUILDING_EXCLUDE, MODEL_TABLE, atFront, WORLD_PER_METRE, buildingPlan, isManifest, lotGap, lotTypeOf, modelScale, planModels, poleYaw, sizeOf, type ModelChoice } from "./models";
import { NO_MODELS, loadModels, nearestTextures, type LoadDeps } from "./models3d";

// Hand-written manifests: no real asset, no real name's data, only sizes in metres.
function entry(name: string, size: readonly [number, number, number], warnings: AssetWarning[] = []): AssetEntry {
  return {
    name,
    source: `${name}.fbx`,
    bounds: { min: [-size[0] / 2, 0, -size[2] / 2], max: [size[0] / 2, size[1], size[2] / 2] },
    triangles: 100,
    textures: [],
    missingTextures: [],
    warnings,
  };
}
function manifest(packs: Record<string, AssetEntry[]>, version: number = ASSET_MANIFEST_VERSION): AssetManifest {
  return {
    version: version as typeof ASSET_MANIFEST_VERSION,
    generatedAt: "2026-01-01T00:00:00Z",
    blenderVersion: "5.0.0",
    packs: Object.entries(packs).map(([pack, assets]) => ({ pack, glb: `${pack}.glb`, atlas: null, assets, failures: [] })),
  };
}
const TABLE: readonly ModelChoice[] = [
  { slot: "pole", pack: "p", names: ["Pole9", "Pole4", "Gone"] },
  { slot: "lamp", pack: "p", names: ["Lamp"] },
  { slot: "building", pack: "b", names: ["Big", "Wide", "Odd"] },
];
const GOOD = manifest({
  p: [entry("Pole9", [0.5, 9, 1]), entry("Pole4", [0.3, 4, 0.3]), entry("Lamp", [0.3, 6, 0.3])],
  b: [entry("Big", [10, 8, 10]), entry("Wide", [20, 6, 5]), entry("Odd", [3, 3, 3], ["scale-suspect"])],
});

describe("planModels", () => {
  it("lists the usable entries per slot in table order", () => {
    const plan = planModels(GOOD, TABLE);
    expect(plan.pole!.map((p) => p.entry.name)).toEqual(["Pole9", "Pole4"]);
    expect(plan.pole![0]!.glb).toBe("p.glb");
    expect(plan.lamp!.map((p) => p.entry.name)).toEqual(["Lamp"]);
  });

  it("skips a name absent from the manifest and a scale-suspect entry", () => {
    const plan = planModels(GOOD, TABLE);
    expect(plan.pole!.map((p) => p.entry.name)).not.toContain("Gone");
    expect(plan.building!.map((p) => p.entry.name)).toEqual(["Big", "Wide"]);
  });

  it("gives null for a slot whose pack is absent or whose names are all unusable", () => {
    expect(planModels(manifest({ b: [entry("Big", [10, 8, 10])] }), TABLE)).toEqual({
      pole: null,
      lamp: null,
      building: [{ pack: "b", glb: "b.glb", entry: entry("Big", [10, 8, 10]), front: "+z", corner: false, family: "Big" }],
    });
    const allSuspect = manifest({ p: [entry("Lamp", [0.3, 600, 0.3], ["scale-suspect"])] });
    expect(planModels(allSuspect, TABLE).lamp).toBeNull();
    expect(planModels(manifest({}), TABLE)).toEqual({ pole: null, lamp: null, building: null });
  });

  it("the shipped table has one pole style, SM_Prop_Powerpole_01 only, and the loaded set has only that pole (041 C)", async () => {
    expect(MODEL_TABLE.filter((r) => r.slot === "pole").map((r) => r.names)).toEqual([["SM_Prop_Powerpole_01"]]);
    // With both pole models in a (fake) pack, every pole is still the one.
    const sizes = { SM_Prop_Powerpole_01: [0.8, 6.3, 2.6], SM_Prop_Powerpole_Single_01: [0.4, 6.3, 0.4] } as const;
    const m = manifest({ "apocalypse-power": Object.entries(sizes).map(([n, z]) => entry(n, z)) });
    const set = await loadModels({ fetchJson: async (): Promise<unknown> => m, loadGlb: async () => fakeGlb(Object.keys(sizes), sizes), info: () => {} });
    expect(set.pole!.map((p) => p.entry.name)).toEqual(["SM_Prop_Powerpole_01"]);
  });

  it("the shipped table names only models of three packs, none with a baked-in wire", () => {
    expect(new Set(MODEL_TABLE.map((r) => r.pack))).toEqual(new Set(["apocalypse-power", "simple-town", "town-pack"]));
    // `_Preset_` and `_Lines_` are the power pack's baked-in-wire models; the Town Pack's whole houses are `SM_Bld_House_Preset_NN` (ticket 048).
    for (const r of MODEL_TABLE) for (const n of r.names) expect(n).not.toMatch(r.pack === "town-pack" ? /_Lines?_/ : /_Preset_|_Lines?_/);
  });
});

describe("modelScale", () => {
  it("makes a 9 m pole and a 4 m pole, and a lamp post, POLE_HEIGHT tall", () => {
    for (const slot of ["pole", "lamp"] as const) {
      expect(sizeOf(entry("a", [0.5, 9, 1]))[1] * modelScale(entry("a", [0.5, 9, 1]), slot)).toBeCloseTo(POLE_HEIGHT, 9);
      expect(4 * modelScale(entry("b", [0.3, 4, 0.3]), slot)).toBeCloseTo(POLE_HEIGHT, 9);
    }
  });

  it("puts every building at WORLD_PER_METRE, whatever its size: it is never fitted to a lot", () => {
    for (const size of [[10, 8, 10], [1, 1, 1], [46, 10, 43], [20, 6, 5]] as const) {
      expect(modelScale(entry("B", size), "building")).toBe(WORLD_PER_METRE);
    }
    expect(modelScale.length).toBe(2);
  });

  it("lotTypeOf puts a 10 x 11 x 10 m model in small, an 11.6 x 16.7 x 11.8 m one in tall, and a 46 x 10 x 43 m one in none", () => {
    expect(lotTypeOf(entry("a", [10, 11, 10]))).toBe("small");
    expect(lotTypeOf(entry("b", [11.6, 16.7, 11.8]))).toBe("tall");
    expect(lotTypeOf(entry("c", [46, 10, 43]))).toBeNull();
  });

  it("lotTypeOf takes the first type, small to tall, whose frontage, depth and height cap hold the model", () => {
    const S = LOT_TYPES.small;
    const H = LOT_TYPES.house;
    expect(lotTypeOf(entry("s", [S.frontage, S.cap, S.depth]))).toBe("small");
    expect(lotTypeOf(entry("over", [S.frontage + 0.1, S.cap, S.depth]))).toBe("house");
    expect(lotTypeOf(entry("high", [10, H.cap + 0.1, 10]))).toBe("large");
    expect(lotTypeOf(entry("huge", [13, 20, 15]))).toBe("tall");
    expect(lotTypeOf(entry("none", [20, 20, 15]))).toBeNull();
  });

  it("lotTypeOf turns a quarter-turn front (+x or -x): the model's depth becomes its frontage", () => {
    const e = entry("deep", [18, 8, 11]);
    expect(lotTypeOf(e, "+z")).toBe("large");
    expect(lotTypeOf(e, "-x")).toBe("house");
    expect(lotTypeOf(e, "-z")).toBe("large");
  });

  it("buildingPlan groups the planned models by the lot type they fit and leaves out those that fit none", () => {
    const rows: [string, [number, number, number]][] = [["S", [10, 8, 10]], ["H", [15, 9, 17]], ["L", [22, 9, 25]], ["T", [12, 20, 14]], ["X", [46, 10, 43]]];
    const plan = buildingPlan(rows.map(([n, size]) => ({ pack: "b", glb: "b.glb", entry: entry(n, size), front: "+z" as const, corner: false as const, family: n })));
    expect(plan).toEqual({ small: ["S"], house: ["H"], large: ["L"], tall: ["T"] });
    expect(buildingPlan(null)).toEqual({ small: [], house: [], large: [], tall: [] });
  });

  it("the shipped table's names each land in a lot type, from the real manifest's sizes, when the packs are converted", () => {
    const file = "assets/private/out/manifest.json";
    if (!existsSync(file)) return;
    const m = JSON.parse(readFileSync(file, "utf8")) as AssetManifest;
    const plan = planModels(m);
    const all = plan.building ?? [];
    if (all.length === 0) return;
    const grouped = buildingPlan(all);
    // The table names only buildings that fit a lot (office_stepped_mesh, which fits none, is left out of it).
    // Models in BUILDING_EXCLUDE (the video rental store, 047) are left out on purpose.
    expect(all.filter((p) => !BUILDING_EXCLUDE.includes(`${p.pack}:${p.entry.name}`) && lotTypeOf(p.entry, p.front) === null).map((p) => p.entry.name)).toEqual([]);
    // Each type uses one style (ticket 048): the models of a type that did not reach POLYGON_MIN_FAMILIES are left out of its plan, never mixed in.
    const byName = new Map(all.map((p) => [p.entry.name, p] as const));
    for (const t of LOT_TYPE_NAMES) expect(new Set(grouped[t].map((n) => byName.get(n)!.fallback === true)).size, t).toBeLessThanOrEqual(1);
    for (const t of LOT_TYPE_NAMES) expect(grouped[t].length, t).toBeGreaterThanOrEqual(3);
  });

  it("turns a pole whose cross-arm lies along z a quarter turn more than the placeholder's", () => {
    expect(poleYaw(entry("arm", [0.8, 6, 2.6]), 0.3)).toBeCloseTo(0.3 + Math.PI / 2, 9);
    expect(poleYaw(entry("plain", [0.4, 6, 0.2]), 0.3)).toBeCloseTo(0.3, 9);
  });

  it("isManifest accepts only the current version", () => {
    expect(isManifest(GOOD)).toBe(true);
    expect(isManifest(manifest({}, 99))).toBe(false);
    expect(isManifest(null)).toBe(false);
    expect(isManifest("<html>")).toBe(false);
  });
});

// A fake GLB: a Group with a root per name, each a box with a (smooth-filtered) texture, like a loaded pack's scene.
function fakeGlb(names: readonly string[], sizes: Record<string, readonly [number, number, number]> = {}): Group {
  const scene = new Group();
  for (const name of names) {
    const [w, h, d] = sizes[name] ?? [1, 1, 1];
    const root = new Group();
    root.name = name;
    const tex = new DataTexture(new Uint8Array([255, 0, 0, 255]), 1, 1);
    tex.magFilter = LinearFilter;
    tex.minFilter = LinearFilter;
    root.add(new Mesh(new BoxGeometry(w, h, d).translate(0, h / 2, 0), new MeshStandardMaterial({ map: tex })));
    scene.add(root);
  }
  return scene;
}

function deps(over: Partial<LoadDeps> = {}): LoadDeps & { said: string[] } {
  const said: string[] = [];
  return {
    fetchJson: async (): Promise<unknown> => GOOD,
    loadGlb: async (url) => fakeGlb(url.endsWith("p.glb") ? ["Pole9", "Pole4", "Lamp"] : ["Big", "Wide", "Odd"]),
    table: TABLE,
    dir: "/assets/private/out/",
    gamePack: false,
    info: (m) => said.push(m),
    said,
    ...over,
  } as LoadDeps & { said: string[] };
}

describe("loadModels falls back to the placeholders", () => {
  it("loads every usable model when all is well, and says nothing", async () => {
    const d = deps();
    const set = await loadModels(d);
    expect(set.pole!.map((m) => m.entry.name)).toEqual(["Pole9", "Pole4"]);
    expect(set.lamp!.map((m) => m.root.name)).toEqual(["Lamp"]);
    expect(set.building!.map((m) => m.entry.name)).toEqual(["Big", "Wide"]);
    expect(d.said).toEqual([]);
  });

  const failures: [string, Partial<LoadDeps>][] = [
    ["the fetch rejects", { fetchJson: () => Promise.reject(new TypeError("Failed to fetch")) }],
    ["the manifest is a 404", { fetchJson: () => Promise.reject(new Error("HTTP 404")) }],
    ["the body is not JSON", { fetchJson: () => Promise.reject(new SyntaxError("Unexpected token <")) }],
    ["the body is JSON of another shape", { fetchJson: async () => "<html></html>" }],
    ["the version is wrong", { fetchJson: async () => manifest({ p: [entry("Lamp", [0.3, 6, 0.3])] }, 2) }],
    ["the manifest is malformed under its version", { fetchJson: async () => ({ version: ASSET_MANIFEST_VERSION, packs: [null] }) }],
    ["every GLB fails to load", { loadGlb: () => Promise.reject(new Error("bad glb")) }],
  ];
  it.each(failures)("resolves to no models, with one line, when %s", async (_why, over) => {
    const d = deps(over);
    const set = await loadModels(d);
    expect(set.pole).toBeNull();
    expect(set.lamp).toBeNull();
    expect(set.building).toBeNull();
    expect(d.said.length).toBeGreaterThanOrEqual(1);
    expect(d.said.length).toBeLessThanOrEqual(2);
  });

  it("drops only the pack whose GLB fails to load", async () => {
    const d = deps({ loadGlb: async (url) => (url.endsWith("b.glb") ? Promise.reject(new Error("nope")) : fakeGlb(["Pole9", "Pole4", "Lamp"])) });
    const set = await loadModels(d);
    expect(set.pole).not.toBeNull();
    expect(set.lamp).not.toBeNull();
    expect(set.building).toBeNull();
    expect(d.said.join("\n")).toContain("b.glb");
  });

  it("drops only a choice whose root is missing from its GLB", async () => {
    const d = deps({ loadGlb: async (url) => fakeGlb(url.endsWith("p.glb") ? ["Pole4", "Lamp"] : ["Big", "Wide"]) });
    const set = await loadModels(d);
    expect(set.pole!.map((m) => m.entry.name)).toEqual(["Pole4"]);
    expect(set.lamp).not.toBeNull();
    expect(d.said.join("\n")).toContain("Pole9");
  });

  it("never rejects, even if a dependency throws synchronously", async () => {
    const set = await loadModels(deps({ fetchJson: () => { throw new Error("sync"); } }));
    expect(set).toEqual(NO_MODELS);
  });

  it("asks for the manifest and each used GLB under the folder it is given, and only the packs the plan uses", async () => {
    const urls: string[] = [];
    await loadModels(deps({ dir: "/site/assets/private/out/", fetchJson: async (u): Promise<unknown> => (urls.push(u), GOOD), loadGlb: async (u) => (urls.push(u), fakeGlb(["Pole9", "Lamp", "Big"])) }));
    expect(urls.sort()).toEqual(["/site/assets/private/out/b.glb", "/site/assets/private/out/manifest.json", "/site/assets/private/out/p.glb"]);
    const only: string[] = [];
    await loadModels(deps({ table: [{ slot: "lamp", pack: "p", names: ["Lamp"] }], fetchJson: async (u): Promise<unknown> => (only.push(u), GOOD), loadGlb: async (u) => (only.push(u), fakeGlb(["Lamp"])) }));
    expect(only.some((u) => u.endsWith("b.glb"))).toBe(false);
  });

  it("sets every texture of a loaded model to NearestFilter", async () => {
    const set = await loadModels(deps());
    for (const slot of ["pole", "lamp", "building"] as const) for (const m of set[slot]!) expectNearest(m.root);
  });
});

function textures(root: Object3D): Texture[] {
  const out: Texture[] = [];
  root.traverse((o) => {
    const mat = (o as Mesh).material as Material | Material[] | undefined;
    if (!mat) return;
    for (const m of Array.isArray(mat) ? mat : [mat]) for (const v of Object.values(m)) if (v instanceof Texture) out.push(v);
  });
  return out;
}
function expectNearest(root: Object3D): void {
  const list = textures(root);
  expect(list.length).toBeGreaterThan(0);
  for (const t of list) {
    expect(t.magFilter).toBe(NearestFilter);
    expect(t.minFilter).toBe(NearestFilter);
  }
}

describe("pickBuildings: no copy beside itself", () => {
  it("lotGap is the distance between two footprints: 0 when they touch, the clear gap when they do not", () => {
    const lot = (x: number, z: number, yaw = 0): Lot => ({ x, z, w: 2, d: 2, yaw, type: "small", hMax: 2, key: `${x},${z}`, street: "r" } as Lot);
    expect(lotGap(lot(0, 0), lot(2, 0))).toBeCloseTo(0, 9);
    expect(lotGap(lot(0, 0), lot(2.5, 0))).toBeCloseTo(0.5, 9);
    expect(lotGap(lot(0, 0), lot(0, 3.25))).toBeCloseTo(1.25, 9);
    expect(lotGap(lot(0, 0), lot(1, 1))).toBe(0);
    // A square turned 45 degrees reaches sqrt(2) along its diagonal, so the gap to a lot whose near edge is at x = 2 is 2 - sqrt(2).
    expect(lotGap(lot(0, 0, Math.PI / 4), lot(3, 0))).toBeCloseTo(2 - Math.SQRT2, 9);
  });
});

describe("nearestTextures", () => {
  it("nearestTextures is idempotent and handles a mesh with a material array", () => {
    const g = fakeGlb(["A"]);
    const mesh = g.children[0]!.children[0] as Mesh;
    mesh.material = [mesh.material as Material, new MeshStandardMaterial()];
    nearestTextures(g);
    nearestTextures(g);
    expectNearest(g);
  });
});

// Nothing private may reach a bundle: no import, no new URL, no ?url or ?raw of anything under assets/private,
// and nothing the pipeline writes may sit in public/.
function sourceFiles(dir: string): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) out.push(...sourceFiles(p));
    else if (p.endsWith(".ts")) out.push(p);
  }
  return out;
}

describe("nothing private is bundled", () => {
  const needle = "assets" + "/private";
  // `import.meta.env` is not an import; `import x`, `import {`, `import(` and `from "..."` are.
  const bundled = /\bimport\b(?!\.meta\b)|\bfrom\s+["']|\bnew\s+URL\s*\(|\?url\b|\?raw\b|\brequire\s*\(|import\.meta\.glob/;

  it("no source file imports, new URL()s, ?url's, ?raw's or globs anything under assets/private", () => {
    const hits: string[] = [];
    for (const f of sourceFiles("src")) {
      if (f.endsWith("models.test.ts")) continue;
      readFileSync(f, "utf8")
        .split(/\r?\n/)
        .forEach((line, i) => {
          if (line.includes(needle) && bundled.test(line)) hits.push(`${f}:${i + 1}: ${line.trim()}`);
        });
    }
    expect(hits).toEqual([]);
  });

  it("the loader builds its URLs as strings at runtime", () => {
    const src = readFileSync("src/render3d/models3d.ts", "utf8");
    expect(src).toContain("BASE_URL");
    expect(src).not.toMatch(/\bnew\s+URL\s*\(/);
  });

  it("public/ holds no GLB, FBX, image or manifest from the pipeline", () => {
    if (!existsSync("public")) return;
    const bad = (dir: string): string[] =>
      readdirSync(dir).flatMap((n) => {
        const p = join(dir, n);
        if (statSync(p).isDirectory()) return bad(p);
        return /\.(glb|gltf|fbx|png|jpe?g|tga|bmp|tiff?|webp)$/i.test(n) || n === "manifest.json" ? [p] : [];
      });
    expect(bad("public")).toEqual([]);
  });

  it("the sources of the models import only core, kitunits, the 2D city helpers (for the position hash) and three", () => {
    for (const f of ["src/render3d/models.ts"]) {
      const imports = [...readFileSync(f, "utf8").matchAll(/from\s+"([^"]+)"/g)].map((m) => m[1]!);
      for (const i of imports) expect(["../core", "../render/city", "./kitunits", "./layout", "./town"], `${f}: ${i}`).toContain(i);
    }
    const imports3d = [...readFileSync("src/render3d/models3d.ts", "utf8").matchAll(/from\s+"([^"]+)"/g)].map((m) => m[1]!);
    for (const i of imports3d) expect(i, i).not.toMatch(/\.\.\/(grid|night|play|ui)\b/);
  });
});

describe("atFront: every building stands against the front edge of its lot (041 B review, setback)", () => {
  it("moves a shallow body toward its road by (lot depth - body depth) / 2, and leaves one as deep as the lot where it is", () => {
    const lot = { x: 5, z: 7, w: 2, d: 4, yaw: Math.PI / 2, type: "small", hMax: 2, key: "k", street: "r", side: 1 } as unknown as Lot;
    // yaw PI/2 turns the lot's front to +x.
    expect(atFront(lot, 4)).toEqual({ x: 5, z: 7 });
    const a = atFront(lot, 2.5);
    expect(a.x).toBeCloseTo(5 + 0.75, 12);
    expect(a.z).toBeCloseTo(7, 12);
    // The front face of a body of depth 2.5 is then at the lot's front edge.
    expect(a.x + 2.5 / 2).toBeCloseTo(5 + 4 / 2, 12);
  });
});
