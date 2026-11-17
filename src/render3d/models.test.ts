import { describe, expect, it } from "vitest";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { BoxGeometry, DataTexture, Group, LinearFilter, Mesh, MeshStandardMaterial, NearestFilter, Object3D, Texture, Vector3, type Material } from "three";
import { ASSET_MANIFEST_VERSION, loadPuzzle, type AssetEntry, type AssetManifest, type AssetWarning, type Puzzle } from "../core";
import { FOV_DEG, createCameraRig } from "./camera";
import { POLE_HEIGHT, wireLayout } from "./layout";
import {
  MODEL_TABLE,
  frontIsQuarter,
  frontYaw,
  NEIGHBOUR_GAP,
  atFront,
  WORLD_PER_METRE,
  buildingPlan,
  isManifest,
  lotGap,
  lotTypeOf,
  modelScale,
  pickBuildings,
  planModels,
  poleYaw,
  sizeOf,
  type ModelChoice,
} from "./models";
import { NO_MODELS, applyModels, buildingPlacements, loadModels, nearestTextures, type LoadDeps, type ModelSet } from "./models3d";
import { LOT_TYPES, LOT_TYPE_NAMES, townLayout, type Lot } from "./town";
import { createPicker } from "./pick";
import { buildScene } from "./scene";
import { stubTextSurface } from "./text";

const puzzle: Puzzle = loadPuzzle(JSON.parse(readFileSync("puzzles/09-shrine-circuit.json", "utf8")));

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

  it("the shipped table has one pole style, SM_Prop_Powerpole_01 only, and every intermediate pole is that model (041 C)", async () => {
    expect(MODEL_TABLE.filter((r) => r.slot === "pole").map((r) => r.names)).toEqual([["SM_Prop_Powerpole_01"]]);
    // With both pole models in a (fake) pack, every pole is still the one.
    const sizes = { SM_Prop_Powerpole_01: [0.8, 6.3, 2.6], SM_Prop_Powerpole_Single_01: [0.4, 6.3, 0.4] } as const;
    const m = manifest({ "apocalypse-power": Object.entries(sizes).map(([n, z]) => entry(n, z)) });
    const set = await loadModels({ fetchJson: async (): Promise<unknown> => m, loadGlb: async () => fakeGlb(Object.keys(sizes), sizes), info: () => {} });
    expect(set.pole!.map((p) => p.entry.name)).toEqual(["SM_Prop_Powerpole_01"]);
    const b = buildScene(puzzle, { text: stubTextSurface });
    const applied = applyModels(b, set);
    const poles = b.slots.models.children.filter((c) => c.name.startsWith("model:SM_Prop_Powerpole"));
    expect(poles).toHaveLength(b.slots.poles.spots.length);
    expect(poles.length).toBeGreaterThan(0);
    expect(poles.every((c) => c.name === "model:SM_Prop_Powerpole_01")).toBe(true);
    applied.remove();
    b.dispose();
  });

  it("the shipped table names only models of two packs, none with a baked-in wire", () => {
    expect(new Set(MODEL_TABLE.map((r) => r.pack))).toEqual(new Set(["apocalypse-power", "simple-town"]));
    for (const r of MODEL_TABLE) for (const n of r.names) expect(n).not.toMatch(/_Preset_|_Lines?_/);
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
    const placed = new Set(Object.values(grouped).flat());
    // The table names only buildings that fit a lot (office_stepped_mesh, which fits none, is left out of it).
    expect(all.filter((p) => !placed.has(p.entry.name)).map((p) => p.entry.name)).toEqual([]);
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

// A model set as loadModels would make it for the shrine map, from the fake GLB.
async function fakeSet(): Promise<ModelSet> {
  const sizes = { Pole9: [0.5, 9, 1], Pole4: [0.3, 4, 0.3], Lamp: [0.3, 6, 0.3], Big: [10, 8, 10], Wide: [20, 6, 5] } as const;
  return loadModels(deps({ loadGlb: async (url) => fakeGlb(url.endsWith("p.glb") ? ["Pole9", "Pole4", "Lamp"] : ["Big", "Wide"], sizes) }));
}

function visibleMeshCount(root: Object3D, test: (o: Object3D) => boolean): number {
  let n = 0;
  root.traverse((o) => {
    if (test(o)) n++;
  });
  return n;
}

// A model set that covers every lot type with three or more models each, from the fake GLB: sizes in metres.
const FULL_SIZES: Record<string, readonly [number, number, number]> = {
  Pole9: [0.5, 9, 1],
  Pole4: [0.3, 4, 0.3],
  Lamp: [0.3, 6, 0.3],
  S1: [10, 8, 10],
  S2: [11, 10, 12],
  S3: [9, 6, 11],
  H1: [14, 10, 16],
  H2: [15, 12, 18],
  H3: [12, 9, 17],
  L1: [22, 10, 25],
  L2: [24, 12, 27],
  L3: [20, 9, 24],
  T1: [12, 20, 14],
  T2: [13, 24, 15],
  T3: [11, 27, 13],
  // 18 m wide but 11 m deep: with a quarter-turn front it is 11 m across the road, so it fits a house lot.
  Q1: [18, 8, 11],
};
const BUILDING_NAMES = Object.keys(FULL_SIZES).filter((n) => !["Pole9", "Pole4", "Lamp"].includes(n));
const FULL_TABLE: readonly ModelChoice[] = [
  { slot: "pole", pack: "p", names: ["Pole9", "Pole4"] },
  { slot: "lamp", pack: "p", names: ["Lamp"] },
  { slot: "building", pack: "b", names: ["S1", "S2", "S3", "H1", "H2", "H3", "L1", "L2", "L3", "T1", "T2", "T3"] },
  { slot: "building", pack: "b", names: ["Q1"] },
];
// Q1 is 18 m wide and 11 m deep with its door on its -x face (yaw +pi/2); every other fake model has no entry, so its door is +z.
const FULL_FRONTS = { Q1: { front: "-x" as const } };
const FULL = manifest({
  p: ["Pole9", "Pole4", "Lamp"].map((n) => entry(n, FULL_SIZES[n]!)),
  b: BUILDING_NAMES.map((n) => entry(n, FULL_SIZES[n]!)),
});
async function fullSet(): Promise<ModelSet> {
  return loadModels(
    deps({
      table: FULL_TABLE,
      fronts: FULL_FRONTS,
      fetchJson: async (): Promise<unknown> => FULL,
      loadGlb: async (url) => fakeGlb(url.endsWith("p.glb") ? ["Pole9", "Pole4", "Lamp"] : BUILDING_NAMES, FULL_SIZES),
    }),
  );
}

const mapFiles = [...readdirSync("puzzles").filter((f) => f.endsWith(".json")), "lamp-row.grid.json"].map((f) => join("puzzles", f)).filter((f, i, all) => existsSync(f) && all.indexOf(f) === i);
const maps: { name: string; puzzle: Puzzle }[] = mapFiles.map((f) => ({ name: f, puzzle: loadPuzzle(JSON.parse(readFileSync(f, "utf8"))) }));

describe("buildings stand at one scale and inside their lots (every map)", () => {
  it("has maps", () => {
    expect(maps.length).toBeGreaterThan(60);
  });

  it("gives every building clone WORLD_PER_METRE on all axes and yaw lot.yaw + front, its scaled, turned bounds inside the lot", async () => {
    const set = await fullSet();
    const planned = new Map(set.building!.map((m) => [m.entry.name, m] as const));
    let clones = 0;
    const fronts = new Set<string>();
    for (const { name, puzzle: pz } of maps) {
      const lots = townLayout(pz).lots;
      const placements = buildingPlacements(lots, set.building);
      expect(placements, name).toHaveLength(lots.length);
      for (const p of placements) {
        const lot = lots[p.lot]!;
        const m = planned.get(p.model.entry.name)!;
        expect(p.scale).toBe(WORLD_PER_METRE);
        expect(p.yaw).toBeCloseTo(lot.yaw + frontYaw(m.front), 9);
        expect(lotTypeOf(m.entry, m.front)).toBe(lot.type);
        fronts.add(m.front);
        // Turned by `front`, the model's frontage and depth are across and away from the road, in the lot's own frame.
        const [w, h, d] = sizeOf(m.entry);
        const quarter = frontIsQuarter(m.front);
        // Setback (041 C): the clone's front face is against its lot's front edge, not centred, so every building shares the lot's setback.
        const along = (p.x - lot.x) * Math.sin(lot.yaw) + (p.z - lot.z) * Math.cos(lot.yaw);
        const sideways = (p.x - lot.x) * Math.cos(lot.yaw) - (p.z - lot.z) * Math.sin(lot.yaw);
        expect(along + ((quarter ? w : d) * p.scale) / 2, `${name} ${lot.key} front face`).toBeCloseTo(lot.d / 2, 9);
        expect(along).toBeGreaterThanOrEqual(-1e-9);
        expect(Math.abs(sideways), `${name} ${lot.key} not sideways`).toBeLessThan(1e-9);
        expect((quarter ? d : w) * p.scale, `${name} ${lot.key}`).toBeLessThanOrEqual(lot.w + 1e-9);
        expect((quarter ? w : d) * p.scale, `${name} ${lot.key}`).toBeLessThanOrEqual(lot.d + 1e-9);
        expect(h * p.scale).toBeLessThanOrEqual(lot.hMax + 1e-9);
        clones++;
      }
    }
    expect(clones).toBeGreaterThan(5000);
    expect(fronts.has("-x")).toBe(true);
  });
});

describe("pickBuildings: no copy beside itself", () => {
  it("is deterministic and picks a model of the lot's own type", async () => {
    const set = await fullSet();
    const plan = buildingPlan(set.building);
    for (const t of LOT_TYPE_NAMES) expect(plan[t].length, t).toBeGreaterThanOrEqual(3);
    for (const { name, puzzle: pz } of maps.filter((m) => /09-|56-/.test(m.name))) {
      const lots = townLayout(pz).lots;
      const a = pickBuildings(lots, plan);
      expect(pickBuildings(lots, plan), name).toEqual(a);
      lots.forEach((l, i) => expect(plan[l.type], name).toContain(a[i]));
    }
  });

  // Ticket 042 A: the picker is greedy, in lot order. A lot never takes a model one of its earlier neighbours has while a free one exists; with three
  // models and three earlier neighbours (one each) none is free and that lot repeats one. facing.test.ts holds the strict check on a set shaped like the real one.
  it("gives a lot a model none of its earlier neighbours has whenever one is free, on every map", async () => {
    const set = await fullSet();
    const plan = buildingPlan(set.building);
    let pairs = 0;
    for (const { name, puzzle: pz } of maps) {
      const lots = townLayout(pz).lots;
      const names = pickBuildings(lots, plan);
      for (let j = 0; j < lots.length; j++) {
        const o = lots[j]!;
        const earlier: number[] = [];
        for (let i = 0; i < j; i++) {
          const l = lots[i]!;
          if (o.type === l.type && Math.hypot(o.x - l.x, o.z - l.z) <= 9 && lotGap(l, o) <= NEIGHBOUR_GAP) earlier.push(i);
        }
        const taken = new Set(earlier.map((i) => names[i]));
        if (taken.size >= plan[o.type].length) continue;
        pairs += earlier.length;
        expect(taken.has(names[j]!), `${name} ${o.key} beside ${earlier.map((i) => lots[i]!.key).join(", ")}`).toBe(false);
      }
    }
    expect(pairs).toBeGreaterThan(1000);
  });

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

describe("applyModels", () => {
  it("puts a clone at every intermediate pole and on every lot, and hides the placeholders", async () => {
    const b = buildScene(puzzle, { text: stubTextSurface });
    const spots = b.slots.poles.spots.length;
    const lots = townLayout(puzzle).lots;
    expect(spots).toBeGreaterThan(2);
    expect(lots.length).toBeGreaterThan(50);
    expect(b.slots.blocks.list).toBe(lots);
    const applied = applyModels(b, await fullSet());
    const clones = b.slots.models.children;
    expect(clones).toHaveLength(spots + lots.length);
    expect(clones.every((c) => c.name.startsWith("model:"))).toBe(true);
    expect(b.slots.poles.placeholders.every((o) => !o.visible)).toBe(true);
    expect(LOT_TYPE_NAMES.every((t) => !b.slots.blocks.byType[t].visible)).toBe(true);
    // Every pole clone stands at its spot and is POLE_HEIGHT tall.
    b.scene.updateMatrixWorld(true);
    for (let i = 0; i < spots; i++) {
      const s = b.slots.poles.spots[i]!;
      const c = clones[i]!;
      expect(c.position.x).toBeCloseTo(s.x, 9);
      expect(c.position.z).toBeCloseTo(s.z, 9);
      expect(c.scale.y * (c.name === "model:Pole9" ? 9 : 4)).toBeCloseTo(POLE_HEIGHT, 6);
    }
    // Every building clone is at one scale on every axis, at its lot, turned lot.yaw + front.
    lots.forEach((lot, i) => {
      const c = clones[spots + i]!;
      expect(c.scale.x).toBe(WORLD_PER_METRE);
      expect(c.scale.y).toBe(WORLD_PER_METRE);
      expect(c.scale.z).toBe(WORLD_PER_METRE);
      const front = c.name === "model:Q1" ? Math.PI / 2 : 0;
      // Against the lot's front edge: the model's footprint depth across the road, from the fake model's size.
      const [mw, , md] = FULL_SIZES[c.name.slice(6)]!;
      const depth = (front ? mw : md) * WORLD_PER_METRE;
      expect(c.position.x).toBeCloseTo(atFront(lot, depth).x, 9);
      expect(c.position.z).toBeCloseTo(atFront(lot, depth).z, 9);
      expect(c.rotation.y).toBeCloseTo(lot.yaw + front, 9);
    });
    applied.remove();
    expect(b.slots.models.children).toHaveLength(0);
    expect(b.slots.poles.placeholders.every((o) => o.visible)).toBe(true);
    expect(LOT_TYPE_NAMES.every((t) => b.slots.blocks.byType[t].visible)).toBe(true);
    b.dispose();
  });

  it("keeps the placeholders of a lot type that has no model and hides those of the types that have one", async () => {
    const b = buildScene(puzzle, { text: stubTextSurface });
    const set = await fullSet();
    const rest = { ...set, building: set.building!.filter((m) => lotTypeOf(m.entry, m.front) !== "tall") };
    const applied = applyModels(b, rest);
    expect(b.slots.blocks.byType.tall.visible).toBe(true);
    for (const t of ["small", "house", "large"] as const) expect(b.slots.blocks.byType[t].visible, t).toBe(false);
    const talls = b.slots.blocks.list.filter((l) => l.type === "tall").length;
    expect(talls).toBeGreaterThan(0);
    expect(b.slots.models.children).toHaveLength(b.slots.poles.spots.length + b.slots.blocks.list.length - talls);
    applied.remove();
    b.dispose();
  });

  it("puts a clone on every lamp's post and keeps its head, light, pool, halo, flare and star", async () => {
    const b = buildScene(puzzle, { text: stubTextSurface });
    const lamps = puzzle.nodes.filter((n) => n.type === "lamp");
    const kinds = (g: Object3D): Record<string, number> => {
      const out: Record<string, number> = {};
      for (const c of g.children) out[c.type] = (out[c.type] ?? 0) + 1;
      return out;
    };
    const before = b.slots.lamps.map((l) => kinds(l.group));
    const applied = applyModels(b, await fakeSet());
    expect(b.slots.lamps).toHaveLength(lamps.length);
    b.slots.lamps.forEach((l, i) => {
      expect(l.post.visible).toBe(false);
      const after = kinds(l.group);
      // The same children as before plus one group (the clone); nothing the lamp lights with was removed.
      expect(after["Group"]).toBe((before[i]!["Group"] ?? 0) + 1);
      for (const k of ["Mesh", "PointLight", "Sprite"]) expect(after[k]).toBe(before[i]![k]);
      const clone = l.group.children.find((c) => c.name.startsWith("model:"))!;
      expect(clone.name).toBe("model:Lamp");
      expect(6 * clone.scale.y).toBeCloseTo(POLE_HEIGHT, 6);
    });
    applied.remove();
    expect(b.slots.lamps.every((l) => l.post.visible)).toBe(true);
    b.dispose();
  });

  it("sets every map texture on the scene's clones to NearestFilter, even for a set that skipped loadModels", async () => {
    const b = buildScene(puzzle, { text: stubTextSurface });
    const scene = fakeGlb(["Pole9", "Lamp", "Big"], { Pole9: [0.5, 9, 1], Lamp: [0.3, 6, 0.3], Big: [10, 8, 10] });
    const m = (name: string, entryOf: AssetEntry): ModelSet["pole"] => [{ pack: "p", glb: "p.glb", entry: entryOf, front: "+z", corner: false, family: name, root: scene.getObjectByName(name)! }];
    const set: ModelSet = {
      pole: m("Pole9", entry("Pole9", [0.5, 9, 1])),
      lamp: m("Lamp", entry("Lamp", [0.3, 6, 0.3])),
      building: m("Big", entry("Big", [10, 8, 10])),
    };
    for (const g of ["Pole9", "Lamp", "Big"]) expect(textures(scene.getObjectByName(g)!)[0]!.magFilter).toBe(LinearFilter);
    applyModels(b, set);
    expect(b.slots.models.children.length).toBeGreaterThan(0);
    for (const c of b.slots.models.children) expectNearest(c);
    for (const l of b.slots.lamps) expectNearest(l.group.children.find((c) => c.name.startsWith("model:"))!);
    b.dispose();
  });

  it("leaves a slot with no models as the placeholders, and an empty set changes nothing", async () => {
    const b = buildScene(puzzle, { text: stubTextSurface });
    const set = await fakeSet();
    applyModels(b, { ...set, pole: null, building: null });
    expect(b.slots.poles.placeholders.every((o) => o.visible)).toBe(true);
    expect(b.slots.blocks.placeholder.visible).toBe(true);
    expect(b.slots.models.children).toHaveLength(0);
    expect(b.slots.lamps.every((l) => !l.post.visible)).toBe(true);
    const c = buildScene(puzzle, { text: stubTextSurface });
    applyModels(c, NO_MODELS);
    expect(c.slots.models.children).toHaveLength(0);
    expect(c.slots.lamps.every((l) => l.post.visible)).toBe(true);
    expect(visibleMeshCount(c.scene, (o) => !o.visible)).toBe(visibleMeshCount(buildScene(puzzle, { text: stubTextSurface }).scene, (o) => !o.visible));
    b.dispose();
    c.dispose();
  });

  it("a session's dispose does not dispose the cached geometry or textures, and a second map reuses them", async () => {
    const set = await fakeSet();
    let disposed = 0;
    const mark = (o: Object3D): void => {
      o.traverse((x) => {
        const mesh = x as Mesh;
        if (!mesh.geometry) return;
        mesh.geometry.addEventListener("dispose", () => disposed++);
        (mesh.material as MeshStandardMaterial).addEventListener("dispose", () => disposed++);
        (mesh.material as MeshStandardMaterial).map?.addEventListener("dispose", () => disposed++);
      });
    };
    for (const slot of ["pole", "lamp", "building"] as const) for (const m of set[slot]!) mark(m.root);
    const a = buildScene(puzzle, { text: stubTextSurface });
    applyModels(a, set);
    a.dispose();
    expect(disposed).toBe(0);
    // The cache still works for the next session (another map).
    const next = loadPuzzle(JSON.parse(readFileSync("puzzles/01-first-light.json", "utf8")));
    const b = buildScene(next, { text: stubTextSurface });
    applyModels(b, set);
    expect(b.slots.models.children.length).toBeGreaterThan(0);
    b.dispose();
    expect(disposed).toBe(0);
  });

  it("leaves picking as it was: models are never hit, and every node and wire is still found", async () => {
    const W = 1280;
    const H = 720;
    const rig = createCameraRig(puzzle, W, H, { top: 120, bottom: 90 });
    const b = buildScene(puzzle, { text: stubTextSurface });
    b.setViewport(W, H, FOV_DEG);
    const picker = createPicker(b.scene, rig.camera, rig.size);
    applyModels(b, await fakeSet());
    b.scene.updateMatrixWorld(true);
    const px = (p: Vector3): { x: number; y: number } => {
      const v = p.clone().project(rig.camera);
      return { x: ((v.x + 1) / 2) * W, y: ((1 - v.y) / 2) * H };
    };
    const nodes: Object3D[] = [];
    b.scene.traverse((o) => {
      if (o.userData["pickKind"] === "node") nodes.push(o);
    });
    expect(nodes).toHaveLength(puzzle.nodes.length);
    for (const o of nodes) {
      const p = px(o.getWorldPosition(new Vector3()));
      expect(picker.hitTest(p.x, p.y)).toBe(o.userData["pickId"]);
    }
    for (const r of wireLayout(puzzle)) {
      const p = px(new Vector3(r.mid.x, r.mid.y, r.mid.z));
      expect(picker.hitTest(p.x, p.y), r.id).toBe(r.id);
    }
    // A fresh picker built on the model scene finds the same things, and no clone carries a pick tag or answers a ray.
    b.slots.models.traverse((o) => expect(o.userData["pickKind"]).toBeUndefined());
    const g = px(new Vector3(2, 0, 3.5));
    expect(picker.hitTest(g.x, g.y)).toBeNull();
    for (const o of [...b.slots.models.children, ...b.slots.lamps.flatMap((l) => l.group.children.filter((c) => c.name.startsWith("model:")))]) {
      o.traverse((x) => {
        if ((x as Mesh).isMesh) expect(x.raycast.length).toBe(0);
      });
    }
    b.dispose();
  });

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

  it("the sources of the models import only core, layout, the 2D city helpers (for the position hash) and three", () => {
    for (const f of ["src/render3d/models.ts"]) {
      const imports = [...readFileSync(f, "utf8").matchAll(/from\s+"([^"]+)"/g)].map((m) => m[1]!);
      for (const i of imports) expect(["../core", "../render/city", "./layout", "./town"], `${f}: ${i}`).toContain(i);
    }
    const imports3d = [...readFileSync("src/render3d/models3d.ts", "utf8").matchAll(/from\s+"([^"]+)"/g)].map((m) => m[1]!);
    for (const i of imports3d) expect(i, i).not.toMatch(/\.\.\/(grid|night|play|ui)\b/);
  });
});

describe("atFront: every building stands against the front edge of its lot (041 B review, setback)", () => {
  const distToRoad = (r: { ax: number; az: number; bx: number; bz: number }, x: number, z: number): number => {
    const vx = r.bx - r.ax;
    const vz = r.bz - r.az;
    const t = Math.max(0, Math.min(1, ((x - r.ax) * vx + (z - r.az) * vz) / (vx * vx + vz * vz)));
    return Math.hypot(x - (r.ax + vx * t), z - (r.az + vz * t));
  };

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

  it("puts the front face of every body, whatever its depth, the same distance from the road: the lot's own setback, on 09 and 56", () => {
    for (const f of ["09-shrine-circuit", "56-whole-ward"]) {
      const pz = loadPuzzle(JSON.parse(readFileSync(`puzzles/${f}.json`, "utf8")));
      const town = townLayout(pz);
      const roads = new Map(town.roads.map((r) => [r.id, r] as const));
      for (const lot of town.lots) {
        const road = roads.get(lot.street)!;
        const frontEdge = { x: lot.x + Math.sin(lot.yaw) * (lot.d / 2), z: lot.z + Math.cos(lot.yaw) * (lot.d / 2) };
        // The lot's front faces its road: the front edge is nearer the road's centreline than the lot's centre.
        expect(distToRoad(road, frontEdge.x, frontEdge.z), `${f} ${lot.key} faces its road`).toBeLessThan(distToRoad(road, lot.x, lot.z));
        for (const depth of [0.8 * lot.d, 0.9 * lot.d, lot.d]) {
          const at = atFront(lot, depth);
          const faceX = at.x + Math.sin(lot.yaw) * (depth / 2);
          const faceZ = at.z + Math.cos(lot.yaw) * (depth / 2);
          expect(faceX).toBeCloseTo(frontEdge.x, 9);
          expect(faceZ).toBeCloseTo(frontEdge.z, 9);
        }
      }
    }
  });
});
