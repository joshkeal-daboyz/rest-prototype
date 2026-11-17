import { describe, expect, it } from "vitest";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { BoxGeometry, DataTexture, Group, LinearFilter, Mesh, MeshStandardMaterial, NearestFilter, Object3D, Texture, Vector3, type Material } from "three";
import { ASSET_MANIFEST_VERSION, loadPuzzle, type AssetEntry, type AssetManifest, type AssetWarning, type Puzzle } from "../core";
import { FOV_DEG, createCameraRig } from "./camera";
import { POLE_HEIGHT, blockLayout, wireLayout } from "./layout";
import {
  MODEL_TABLE,
  WORLD_PER_METRE,
  buildingYaw,
  isManifest,
  modelScale,
  planModels,
  poleYaw,
  sizeOf,
  type ModelChoice,
} from "./models";
import { NO_MODELS, applyModels, loadModels, nearestTextures, type LoadDeps, type ModelSet } from "./models3d";
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
      building: [{ pack: "b", glb: "b.glb", entry: entry("Big", [10, 8, 10]) }],
    });
    const allSuspect = manifest({ p: [entry("Lamp", [0.3, 600, 0.3], ["scale-suspect"])] });
    expect(planModels(allSuspect, TABLE).lamp).toBeNull();
    expect(planModels(manifest({}), TABLE)).toEqual({ pole: null, lamp: null, building: null });
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

  it("puts a 10 x 10 x 8 m building at metres x WORLD_PER_METRE in a lot that holds it, and never grows it", () => {
    const e = entry("Big", [10, 8, 10]);
    const s = modelScale(e, "building", { w: 3, d: 3 });
    expect(s).toBeCloseTo(WORLD_PER_METRE, 9);
    expect(10 * s).toBeCloseTo(10 * WORLD_PER_METRE, 9);
    expect(modelScale(e, "building", { w: 50, d: 50 })).toBeCloseTo(WORLD_PER_METRE, 9);
    expect(modelScale(e, "building")).toBeCloseTo(WORLD_PER_METRE, 9);
  });

  it("shrinks a building to a lot that does not hold it, keeping its aspect", () => {
    const e = entry("Big", [10, 8, 10]);
    const s = modelScale(e, "building", { w: 0.9, d: 1.8 });
    expect(10 * s).toBeCloseTo(0.9, 9);
    expect(8 * s).toBeCloseTo(0.72, 9);
    const tall = entry("Wide", [20, 6, 5]);
    // A quarter turn lets the 20 m side lie along the lot's long side: the larger fit wins.
    const lot = { w: 0.8, d: 2 };
    expect(buildingYaw(tall, lot)).toBeCloseTo(Math.PI / 2, 9);
    expect(20 * modelScale(tall, "building", lot)).toBeCloseTo(2, 9);
    expect(buildingYaw(tall, { w: 2, d: 0.8 })).toBe(0);
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

describe("applyModels", () => {
  it("puts a clone at every intermediate pole and every footprint and city block, and hides the placeholders", async () => {
    const b = buildScene(puzzle, { text: stubTextSurface });
    const spots = b.slots.poles.spots.length;
    const blocks = blockLayout(puzzle).blocks;
    expect(spots).toBeGreaterThan(5);
    expect(blocks.length).toBeGreaterThan(50);
    expect(blocks.some((k) => k.kind === "building")).toBe(true);
    expect(blocks.some((k) => k.kind === "city")).toBe(true);
    expect(blocks.some((k) => k.kind === "place")).toBe(false);
    const applied = applyModels(b, await fakeSet());
    const clones = b.slots.models.children;
    expect(clones).toHaveLength(spots + blocks.length);
    expect(clones.every((c) => c.name.startsWith("model:"))).toBe(true);
    expect(b.slots.poles.placeholders.every((o) => !o.visible)).toBe(true);
    expect(b.slots.blocks.placeholder.visible).toBe(false);
    // Every pole clone stands at its spot and is POLE_HEIGHT tall.
    b.scene.updateMatrixWorld(true);
    for (let i = 0; i < spots; i++) {
      const s = b.slots.poles.spots[i]!;
      const c = clones[i]!;
      expect(c.position.x).toBeCloseTo(s.x, 9);
      expect(c.position.z).toBeCloseTo(s.z, 9);
      expect(c.scale.y * (c.name === "model:Pole9" ? 9 : 4)).toBeCloseTo(POLE_HEIGHT, 6);
    }
    // No building is bigger than its lot, whichever way it is turned.
    blocks.forEach((blk, i) => {
      const c = clones[spots + i]!;
      const e = c.name === "model:Big" ? [10, 10] : [20, 5];
      const turned = Math.abs(Math.sin(c.rotation.y)) > 0.5;
      expect(e[0]! * c.scale.x).toBeLessThanOrEqual((turned ? blk.d : blk.w) + 1e-9);
      expect(e[1]! * c.scale.x).toBeLessThanOrEqual((turned ? blk.w : blk.d) + 1e-9);
      expect(c.scale.x).toBeLessThanOrEqual(WORLD_PER_METRE + 1e-9);
    });
    applied.remove();
    expect(b.slots.models.children).toHaveLength(0);
    expect(b.slots.poles.placeholders.every((o) => o.visible)).toBe(true);
    expect(b.slots.blocks.placeholder.visible).toBe(true);
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
    const m = (name: string, entryOf: AssetEntry): ModelSet["pole"] => [{ pack: "p", glb: "p.glb", entry: entryOf, root: scene.getObjectByName(name)! }];
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
      for (const i of imports) expect(["../core", "./layout"], `${f}: ${i}`).toContain(i);
    }
    const imports3d = [...readFileSync("src/render3d/models3d.ts", "utf8").matchAll(/from\s+"([^"]+)"/g)].map((m) => m[1]!);
    for (const i of imports3d) expect(i, i).not.toMatch(/\.\.\/(grid|night|play|ui)\b/);
  });
});
