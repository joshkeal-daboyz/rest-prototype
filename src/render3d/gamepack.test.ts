import { describe, expect, it } from "vitest";
import { Group } from "three";
import { ASSET_MANIFEST_VERSION, type AssetEntry, type AssetManifest } from "../core";
import type { ModelChoice } from "./models";
import { loadModels } from "./models3d";

// Fixtures only: no real GLB or manifest (CI has no assets).
function entry(name: string): AssetEntry {
  return { name, source: `${name}.fbx`, bounds: { min: [-0.5, 0, -0.5], max: [0.5, 5, 0.5] }, triangles: 10, textures: [], missingTextures: [], warnings: [] };
}
function manifest(names: readonly string[], game?: boolean): AssetManifest {
  return { version: ASSET_MANIFEST_VERSION, ...(game ? { game: { keys: names.map((n) => `p:${n}`), from: "2026-01-01T00:00:00Z" } } : {}), generatedAt: "2026-01-01T00:00:00Z", blenderVersion: "5.0.0", packs: [{ pack: "p", glb: "p.glb", atlas: null, assets: names.map(entry), failures: [] }] };
}
const TABLE: readonly ModelChoice[] = [{ slot: "pole", pack: "p", names: ["PoleA"] }];

function run(game: AssetManifest) {
  const urls: string[] = [];
  const said: string[] = [];
  const full = manifest(["PoleA", "Lamp", "Extra"]);
  const root = new Group();
  root.add(Object.assign(new Group(), { name: "PoleA" }));
  return loadModels({
    dir: "/out/",
    table: TABLE,
    dressKeys: ["p:Lamp"],
    fetchJson: async (u) => (urls.push(u), u.endsWith("/game/manifest.json") ? game : full),
    loadGlb: async (u) => {
      urls.push(u);
      const g = new Group();
      for (const n of ["PoleA", "Lamp"]) g.add(Object.assign(new Group(), { name: n }));
      return g;
    },
    info: (m) => said.push(m),
  }).then((set) => ({ set, urls, said }));
}

describe("the game pack", () => {
  it("is used when it covers every key asked for: every GLB from game/, the full manifest never fetched", async () => {
    const { set, urls, said } = await run(manifest(["PoleA", "Lamp"], true));
    expect(urls.filter((u) => u.endsWith(".glb"))).toEqual(["/out/game/p.glb"]);
    expect(urls.some((u) => u === "/out/manifest.json")).toBe(false);
    expect(set.pole?.map((m) => m.entry.name)).toEqual(["PoleA"]);
    expect(said).toEqual([]);
  });

  it("is never used in part: lacking one asked-for key, the full GLBs load and one line names the key", async () => {
    const { urls, said } = await run(manifest(["PoleA"], true));
    expect(urls.filter((u) => u.endsWith(".glb"))).toEqual(["/out/p.glb"]);
    expect(said).toHaveLength(1);
    expect(said[0]).toContain("p:Lamp");
    expect(said[0]).toContain("npm run assets:game");
  });
});
