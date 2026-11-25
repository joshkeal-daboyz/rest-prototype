import { describe, expect, it } from "vitest";
import { dirname, join, resolve } from "node:path";
import { FX_SOURCE_DIR, FX_SOURCE_PACK } from "../../src/core";
import type { AssetEntry, AssetManifest } from "../../src/core";
import { buildGameManifest, planGame, runGame } from "./game";
import type { GameDeps } from "./game";
import { layout } from "./convert";
import type { RunResult } from "./convert";

const ROOT = resolve("/my repo/rest");
const L = layout(ROOT);
const GAME = join(L.out, "game");
const BLENDER = resolve("/opt/blender/blender");

const entry = (name: string, source: string, extra: Partial<AssetEntry> = {}): AssetEntry => ({
  name,
  source,
  bounds: { min: [-0.5, 0, -0.5], max: [0.5, 3, 0.5] },
  scale: 1,
  triangles: 12,
  textures: ["Textures/Atlas.png"],
  missingTextures: [],
  warnings: [],
  ...extra,
});

/** A full manifest: "town" with three models and one colourway pool entry, "city" with one. */
const FULL: AssetManifest = {
  version: 1,
  generatedAt: "2026-11-20T00:00:00.000Z",
  blenderVersion: "4.2.3",
  packs: [
    {
      pack: "city",
      glb: "city.glb",
      atlas: null,
      assets: [entry("Lamp", "Fbx/Lamp.fbx")],
      failures: [],
    },
    {
      pack: "town",
      glb: "town.glb",
      atlas: "Textures/Atlas.png",
      scale: 1,
      colourways: [
        { id: "02_A", image: "town/colourways/A.png", base: "Atlas", width: 4, height: 4 },
        { id: "03_B", image: "town/colourways/B.png", base: "Atlas", width: 4, height: 4 },
      ],
      assets: [entry("Hut", "Fbx/Hut.fbx"), entry("Pole", "Fbx/Props/Pole.fbx"), entry("Tower", "Fbx/Tower.fbx")],
      failures: [],
    },
  ],
};
const KEYS = ["town:Pole", "city:Lamp", "town:Hut"];

/** The report a faithful Blender gives for an include file: the full manifest's entries for the listed sources. */
function faithful(pack: string, include: string, tweak: (e: AssetEntry) => AssetEntry = (e) => e, full: AssetManifest = FULL): string {
  const wanted = new Set(include.split("\n").filter((l) => l !== ""));
  const assets = (full.packs.find((p) => p.pack === pack)?.assets ?? []).filter((e) => wanted.has(e.source)).map(tweak);
  return JSON.stringify({ blenderVersion: "4.2.3", scale: 1, assets, failures: [] });
}

const FX_DIR = join(L.inRoot, FX_SOURCE_PACK, ...FX_SOURCE_DIR.split("/").filter((x) => x !== ""));

function setup(tweak?: (e: AssetEntry) => AssetEntry, keys: string[] = KEYS, full: AssetManifest = FULL, fxFiles: string[] = []) {
  const files = new Map<string, string>([
    [BLENDER, ""],
    [L.manifest, JSON.stringify(full)],
    ...fxFiles.map((f): [string, string] => [join(FX_DIR, f), `png ${f}`]),
    [join(L.out, "town", "colourways", "A.png"), "png-a"],
    [join(L.out, "game", "old.glb"), "earlier game pack"],
  ]);
  const writes: string[] = [];
  const calls: string[][] = [];
  const dirs = new Set<string>([L.inRoot, join(L.inRoot, "town"), join(L.inRoot, "city"), join(L.inRoot, FX_SOURCE_PACK), GAME]);
  const under = (q: string, p: string) => q === p || q.startsWith(p + "\\") || q.startsWith(p + "/");
  const deps: GameDeps = {
    env: { BLENDER_PATH: BLENDER },
    platform: "linux",
    root: ROOT,
    exists: (p) => files.has(p) || dirs.has(p),
    listDir: (p) => [...new Set([...files.keys(), ...dirs].filter((q) => dirname(q) === p && q !== p).map((q) => q.slice(p.length + 1)))],
    isDirectory: (p) => dirs.has(p),
    readText: (p) => {
      const t = files.get(p);
      if (t === undefined) throw new Error(`ENOENT ${p}`);
      return t;
    },
    writeText: (p, t) => {
      writes.push(p);
      files.set(p, t);
    },
    readBytes: () => new Uint8Array(),
    copyFile: (from, to) => {
      writes.push(to);
      files.set(to, files.get(from) ?? "");
    },
    mkdirp: (p) => void dirs.add(p),
    remove: (p) => {
      for (const q of [...files.keys()]) if (under(q, p)) files.delete(q);
      for (const q of [...dirs]) if (under(q, p) && q !== GAME) dirs.delete(q);
    },
    rename: (from, to) => {
      writes.push(to);
      files.set(to, files.get(from) ?? "");
      files.delete(from);
    },
    fileSize: () => 1024 * 1024,
    keys: () => keys,
    colourwayIds: () => ["02_A"],
    run: (_command, args): Promise<RunResult> => {
      calls.push([...args]);
      if (args[0] === "--version") return Promise.resolve({ code: 0, stdout: "Blender 4.2.3 LTS\n", stderr: "" });
      const at = (flag: string) => args[args.indexOf(flag) + 1] as string;
      const pack = at("--in").split(/[\\/]/).pop() as string;
      files.set(at("--out"), "glb");
      files.set(at("--report"), faithful(pack, files.get(at("--include-file")) ?? "", tweak, full));
      return Promise.resolve({ code: 0, stdout: "", stderr: "" });
    },
    stdout: (t) => void (out += t),
    stderr: (t) => void (err += t),
    now: () => new Date("2026-11-24T10:00:00.000Z"),
  };
  let err = "";
  let out = "";
  return { deps, files, writes, calls, err: () => err, out: () => out };
}

describe("the game pack's plan (ticket 082 B)", () => {
  it("groups the keys by pack into each pack's sorted FBX source list, and leaves out packs with no key", () => {
    const plan = planGame(FULL, KEYS);
    expect(plan.problems).toEqual([]);
    expect(plan.packs).toEqual([
      { pack: "city", sources: ["Fbx/Lamp.fbx"], names: ["Lamp"] },
      { pack: "town", sources: ["Fbx/Hut.fbx", "Fbx/Props/Pole.fbx"], names: ["Hut", "Pole"] },
    ]);
  });

  it("refuses a key the manifest lacks (listing every one) and a scale-suspect model, exits 1 and writes nothing", async () => {
    const suspect: AssetManifest = { ...FULL, packs: FULL.packs.map((p) => (p.pack === "city" ? { ...p, assets: [entry("Lamp", "Fbx/Lamp.fbx", { warnings: ["scale-suspect"] })] } : p)) };
    expect(planGame(suspect, ["city:Lamp"]).problems).toHaveLength(1);
    const s = setup(undefined, ["town:Hut", "town:Ghost", "nowhere:Thing"]);
    expect(await runGame(s.deps)).toBe(1);
    expect(s.err()).toContain("town:Ghost");
    expect(s.err()).toContain("nowhere:Thing");
    expect(s.writes).toEqual([]);
    expect(s.calls).toEqual([]);
  });
});

describe("the game manifest (ticket 082 B)", () => {
  it("is cut from the full manifest: game keys and from, only the included models, glb beside it, only the used colourways", async () => {
    const s = setup();
    expect(await runGame(s.deps)).toBe(0);
    const m = JSON.parse(s.files.get(join(GAME, "manifest.json")) ?? "null") as AssetManifest;
    expect(m.game).toEqual({ keys: ["city:Lamp", "town:Hut", "town:Pole"], from: FULL.generatedAt });
    expect(m.packs.map((p) => [p.pack, p.glb, p.assets.map((a) => a.name)])).toEqual([
      ["city", "city.glb", ["Lamp"]],
      ["town", "town.glb", ["Hut", "Pole"]],
    ]);
    expect(m.packs[1]?.colourways?.map((c) => c.id)).toEqual(["02_A"]);
    expect(s.files.has(join(GAME, "town", "colourways", "A.png"))).toBe(true);
    expect(s.files.has(join(GAME, "town", "colourways", "B.png"))).toBe(false);
    expect(s.files.has(join(GAME, "old.glb"))).toBe(false);
    const built = buildGameManifest({ full: FULL, plan: planGame(FULL, KEYS), keys: KEYS, colourwayIds: ["02_A"], generatedAt: m.generatedAt, blenderVersion: m.blenderVersion });
    expect(built).toEqual(m);
  });

  it("fails the run when a converted model's bounds differ by more than 0.001 m, moving nothing and keeping the earlier game pack", async () => {
    const s = setup((e) => (e.name === "Pole" ? { ...e, bounds: { min: e.bounds.min, max: [0.5, 3.01, 0.5] } } : e));
    expect(await runGame(s.deps)).toBe(1);
    expect(s.err()).toContain("Pole");
    expect(s.files.get(join(GAME, "old.glb"))).toBe("earlier game pack");
    expect(s.files.has(join(GAME, "manifest.json"))).toBe(false);
    expect(s.files.has(join(GAME, "town.glb"))).toBe(false);
  });
});

describe("the full pack is untouched (ticket 082 B)", () => {
  it("writes only under out/game/ and never the full manifest or the full GLBs", async () => {
    const s = setup();
    const before = s.files.get(L.manifest);
    expect(await runGame(s.deps)).toBe(0);
    expect(s.writes.length).toBeGreaterThan(0);
    for (const w of s.writes) expect(w.startsWith(GAME + "\\") || w.startsWith(GAME + "/")).toBe(true);
    expect(s.files.get(L.manifest)).toBe(before);
    const outGlbs = s.calls.filter((a) => a.includes("--out")).map((a) => a[a.indexOf("--out") + 1] as string);
    for (const o of outGlbs) expect(o.startsWith(GAME)).toBe(true);
  });
});

describe("the particle textures and meshes in the game pack (ticket 081 FX1)", () => {
  const PNGS = ["PolygonParticles_Sparkle.png", "PolygonParticles_Soft_Spot.png", "PolygonParticles_Lightning_02.png", "PolygonParticles_Smoke_01.png"];
  const ids = ["sparkle", "softSpot", "lightning", "smoke"];
  const manifestOf = (s: ReturnType<typeof setup>) => JSON.parse(s.files.get(join(GAME, "manifest.json")) ?? "null") as AssetManifest;
  /** FULL plus a particle pack holding the spark and (optionally) the shard. */
  const withParticles = (shard: boolean): AssetManifest => ({
    ...FULL,
    packs: [
      ...FULL.packs,
      {
        pack: "particle-fx-pack",
        glb: "particle-fx-pack.glb",
        atlas: null,
        assets: [entry("FX_Spark_01", "Source Files/FBX/FX_Spark_01.fbx"), ...(shard ? [entry("FX_Shard_Rock_Small_01", "Source Files/FBX/FX_Shard_Rock_Small_01.fbx")] : [])],
        failures: [],
      },
    ],
  });

  it("copies the four particle PNGs under out/game/fx/ and lists them in the manifest's fx, in FX_TEXTURES order", async () => {
    const s = setup(undefined, KEYS, FULL, [...PNGS].reverse());
    expect(await runGame(s.deps)).toBe(0);
    for (const f of PNGS) expect(s.files.get(join(GAME, "fx", f))).toBe("png " + f);
    expect(manifestOf(s).fx).toEqual(ids.map((id, i) => ({ id, image: "fx/" + PNGS[i] })));
  });

  it("still writes the game pack when textures are missing: fx lists only the files found and one line names the others and the folder", async () => {
    const s = setup(undefined, KEYS, FULL, PNGS.slice(0, 2));
    expect(await runGame(s.deps)).toBe(0);
    expect(manifestOf(s).fx?.map((x) => x.id)).toEqual(["sparkle", "softSpot"]);
    const line = s.out().split("\n").filter((l) => l.includes("textures missing"));
    expect(line).toHaveLength(1);
    expect(line[0]).toContain(PNGS[2]);
    expect(line[0]).toContain(PNGS[3]);
    expect(line[0]).toContain(FX_DIR);
    expect(s.files.has(join(GAME, "town.glb"))).toBe(true);
  });

  it("cuts a particle mesh the full manifest holds into the plan and game.keys, and names one it lacks in one line, without failing", async () => {
    const s = setup(undefined, KEYS, withParticles(false));
    expect(await runGame(s.deps)).toBe(0);
    const m = manifestOf(s);
    expect(m.game?.keys).toContain("particle-fx-pack:FX_Spark_01");
    expect(m.game?.keys).not.toContain("particle-fx-pack:FX_Shard_Rock_Small_01");
    const fxPack = m.packs.find((p) => p.pack === "particle-fx-pack");
    expect(fxPack?.assets.map((a) => a.name)).toEqual(["FX_Spark_01"]);
    const line = s.out().split("\n").filter((l) => l.includes("particle meshes left out"));
    expect(line).toHaveLength(1);
    expect(line[0]).toContain("FX_Shard_Rock_Small_01");
    expect(line[0]).toContain("assets:convert particle-fx-pack");
  });
});
