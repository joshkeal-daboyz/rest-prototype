import { describe, expect, it } from "vitest";
import { FX_MESHES, FX_TEXTURES } from "../../src/core";
import type { AssetManifest, AssetPack } from "../../src/core";
import { checkGamePack, checkLimits, outsideRepo, zipPlan } from "./package";
import { runItch } from "./run";
import type { ItchDeps } from "./run";

const KEYS = ["city-pack:Wall_A", "city-pack:Lamp_B"];
const sparkName = FX_MESHES.spark.split(":")[1] as string;
const shardName = FX_MESHES.shard.split(":")[1] as string;

function entry(name: string): AssetPack["assets"][number] {
  return { name } as AssetPack["assets"][number];
}

function manifest(over: { names?: string[]; colourways?: string[]; fx?: string[]; from?: string } = {}): AssetManifest {
  const names = over.names ?? ["Wall_A", "Lamp_B"];
  const city = {
    pack: "city-pack",
    glb: "city-pack.glb",
    assets: names.map(entry),
    colourways: (over.colourways ?? ["02_A"]).map((id) => ({ id, image: `city-pack/colourways/${id}.png` })),
  } as unknown as AssetPack;
  const fx = { pack: "particle-fx-pack", glb: "particle-fx-pack.glb", assets: [entry(sparkName), entry(shardName)] } as unknown as AssetPack;
  return {
    game: { keys: KEYS, from: over.from ?? "T1" },
    fx: (over.fx ?? Object.keys(FX_TEXTURES)).map((id) => ({ id, image: `fx/${id}.png` })),
    generatedAt: "T2",
    packs: [city, fx],
  } as unknown as AssetManifest;
}
const full = { generatedAt: "T1", packs: [] } as unknown as AssetManifest;
const allThere = (): boolean => true;

describe("the game-pack check (083 C1)", () => {
  it("a complete pack gives no problem, and a broken one lists every kind, not the first", () => {
    expect(checkGamePack(manifest(), full, KEYS, ["02_A"], allThere)).toEqual([]);
    const broken = manifest({ names: ["Wall_A"], colourways: [], fx: ["sparkle", "softSpot", "lightning"], from: "OLD" });
    const kinds = checkGamePack(broken, full, KEYS, ["02_A"], (f) => f !== "city-pack.glb").map((p) => p.kind);
    expect(new Set(kinds)).toEqual(new Set(["missing-key", "missing-colourway", "missing-fx", "missing-file", "stale"]));
    expect(checkGamePack(null, full, KEYS, [], allThere).map((p) => p.kind)).toEqual(["no-game-pack"]);
  });
});

function deps(over: { game: AssetManifest | null; fullM: AssetManifest | null }): { d: ItchDeps; calls: string[] } {
  const calls: string[] = [];
  const errors: string[] = [];
  const slash = (p: string): string => p.split("\\").join("/");
  const isGame = (p: string): boolean => slash(p).endsWith("game/manifest.json");
  const d: ItchDeps = {
    topLevel: "/top",
    platform: "linux",
    version: "0.1.0",
    sha: "abc",
    realpathExisting: (p) => p,
    exists: (p) => (isGame(p) ? over.game !== null : slash(p).endsWith("out/manifest.json") ? over.fullM !== null : true),
    readText: (p) => JSON.stringify(isGame(p) ? over.game : over.fullM),
    listFiles: () => (calls.push("list"), []),
    readFile: () => Buffer.alloc(0),
    mkdirp: () => void calls.push("mkdirp"),
    rename: () => void calls.push("rename"),
    writeZipFile: () => (calls.push("write"), 0),
    runNode: () => (calls.push("spawn"), Promise.resolve(0)),
    keys: () => KEYS,
    colourways: () => ["02_A"],
    stdout: () => undefined,
    stderr: (t) => void errors.push(t),
  };
  (d as unknown as { errors: string[] }).errors = errors;
  return { d, calls };
}

describe("it fails loudly (083 C2)", () => {
  it("a stale pack exits 1, prints the problem and the fix, and spawns and writes nothing", async () => {
    const { d, calls } = deps({ game: manifest({ from: "OLD" }), fullM: full });
    const code = await runItch(d, []);
    const text = (d as unknown as { errors: string[] }).errors.join("");
    expect(code).toBe(1);
    expect(text).toContain("the game pack is not ready (1 problem(s))");
    expect(text).toContain("Run npm run assets:game, then npm run build:itch again.");
    expect(calls).toEqual([]);
  });
});

describe("the zip plan (083 C3)", () => {
  const build = [{ path: "index.html", bytes: 10 }, { path: "assets/index-1.js", bytes: 20 }];
  const gameFile = { path: "assets/private/out/game/manifest.json", bytes: 5 };
  const cal = { path: "assets/private/calibration/fronts.json", bytes: 3 };

  it("puts the build at the root, the game pack and calibration under their paths, sorted, and refuses full packs", () => {
    const ok = zipPlan(build, [gameFile], cal);
    expect(ok.problems).toEqual([]);
    expect(ok.files.map((f) => f.path)).toEqual(["assets/index-1.js", "assets/private/calibration/fronts.json", "assets/private/out/game/manifest.json", "index.html"]);
    const bad = zipPlan(build, [{ path: "assets/private/out/city-pack.glb", bytes: 1 }, { path: "assets/private/out/manifest.json", bytes: 1 }, { path: "..\\x", bytes: 1 }], null);
    expect(bad.problems.map((p) => p.kind)).toEqual(["outside-plan", "outside-plan", "outside-plan"]);
    expect(bad.files.map((f) => f.path)).toEqual(["assets/index-1.js", "index.html"]);
    expect(zipPlan([{ path: "app.js", bytes: 1 }], [], null).problems).toHaveLength(1);
  });

  it("1,001 files, or one file over 200 MB, is a limit problem", () => {
    const many = Array.from({ length: 1001 }, (_, i) => ({ path: `f${i}`, bytes: 1 }));
    expect(checkLimits(many).map((p) => p.kind)).toEqual(["limit"]);
    expect(checkLimits([{ path: "big.bin", bytes: 200 * 1024 * 1024 + 1 }]).map((p) => p.kind)).toEqual(["limit"]);
    expect(checkLimits(build)).toEqual([]);
  });
});

describe("nothing reaches the repo (083 C5)", () => {
  it("the output folder must be outside the checkout, through .. and case on win32", () => {
    expect(outsideRepo("D:\\rest-itch", "D:\\rest-prototype", "win32")).toBe(true);
    expect(outsideRepo("D:\\rest-prototype", "D:\\rest-prototype", "win32")).toBe(false);
    expect(outsideRepo("d:\\REST-prototype\\dist-itch", "D:\\rest-prototype", "win32")).toBe(false);
    expect(outsideRepo("D:\\rest-itch\\..\\rest-prototype\\x", "D:\\rest-prototype", "win32")).toBe(false);
    expect(outsideRepo("/top/dist", "/top", "linux")).toBe(false);
    expect(outsideRepo("/top-itch", "/top", "linux")).toBe(true);
  });
});
