import { BoxGeometry, Group, Mesh, Texture, Vector3, type Object3D } from "three";
import { describe, expect, it } from "vitest";
import type { Fault } from "../core";
import { createParticlePool, fxMeshes, fxTextures, newParticleInit, repairedFaults, sparkingCuts, type FxCut } from "./fx";

const fault = (id: string, at = "l1"): Fault => ({ id, at, kind: "damaged-cable" });

describe("081 FX2: the effects' pure parts", () => {
  it("fxTextures: a manifest listing two ids loads two URLs under game/fx/ and draws the other two, with one line; no manifest draws all four", async () => {
    const urls: string[] = [];
    const lines: string[] = [];
    const manifest = { version: 1, packs: [], fx: [{ id: "sparkle", image: "fx/a.png" }, { id: "smoke", image: "fx/b.png" }] };
    const got = await fxTextures({
      fetchJson: async () => manifest,
      loadTexture: async (url) => {
        urls.push(url);
        return new Texture();
      },
      dir: "d/",
      info: (m) => lines.push(m),
    });
    expect(urls.sort()).toEqual(["d/game/fx/a.png", "d/game/fx/b.png"]);
    expect(Object.keys(got).sort()).toEqual(["lightning", "smoke", "softSpot", "sparkle"]);
    expect(got.softSpot.name).toBe("fx-fallback:softSpot");
    expect(got.lightning.name).toBe("fx-fallback:lightning");
    expect(lines).toHaveLength(1);
    expect(lines[0]).toContain("softSpot, lightning");

    const none: string[] = [];
    const bare = await fxTextures({
      fetchJson: async () => {
        throw new Error("HTTP 404");
      },
      loadTexture: async () => new Texture(),
      info: (m) => none.push(m),
    });
    expect(Object.values(bare).every((t) => t.name.startsWith("fx-fallback:"))).toBe(true);
    expect(none).toHaveLength(1);
  });

  it("the pool: particles fall under gravity, die at their life, and a spawn on a full pool replaces the oldest", () => {
    const pool = createParticlePool(2);
    const init = newParticleInit();
    init.life = 1;
    init.y = 10;
    pool.spawn(init);
    pool.step(0.5, 10, 0);
    // v = -5 after 0.5 s, so y fell by 2.5.
    expect(pool.pos[1]).toBeCloseTo(7.5, 5);
    init.life = 0.4;
    init.y = 0;
    pool.spawn(init);
    expect(pool.count).toBe(2);
    pool.step(0.1, 10, 0);
    // Full: a third spawn takes the oldest (the first one, age 0.6).
    init.y = 99;
    init.life = 5;
    pool.spawn(init);
    expect(pool.count).toBe(2);
    expect(pool.pos[1]).toBe(99);
    pool.step(0.35, 0, 0);
    // The second (life 0.4) is past its life and gone; the replacement lives.
    expect(pool.count).toBe(1);
    expect(pool.life[0]).toBe(5);
  });

  it("fxMeshes: with the spark loaded and the shard missing, the spark's geometry is one unit long and the shard is null with one line", async () => {
    const entry = { name: "FX_Spark_01", source: "FX_Spark_01.fbx", bounds: { min: [-0.05, 0, -0.4], max: [0.05, 0.1, 0.4] }, triangles: 8, textures: [], missingTextures: [], warnings: [] };
    const manifest = { version: 1, generatedAt: "", blenderVersion: "", packs: [{ pack: "particle-fx-pack", glb: "particle-fx-pack.glb", atlas: null, assets: [entry], failures: [] }] };
    const lines: string[] = [];
    const got = await fxMeshes({
      fetchJson: async (url) => {
        if (url.endsWith("game/manifest.json")) throw new Error("HTTP 404");
        return manifest;
      },
      loadGlb: async (): Promise<Object3D> => {
        const root = new Group();
        const node = new Group();
        node.name = "FX_Spark_01";
        node.add(new Mesh(new BoxGeometry(0.1, 0.1, 0.8)));
        root.add(node);
        return root;
      },
      dir: "d/",
      info: (m) => lines.push(m),
    });
    expect(got.shard).toBeNull();
    expect(got.spark).not.toBeNull();
    got.spark!.computeBoundingBox();
    const size = got.spark!.boundingBox!.getSize(new Vector3());
    expect(size.z).toBeCloseTo(1, 5);
    expect(lines.filter((l) => l.includes("shard"))).toHaveLength(1);
  });

  it("sparkingCuts: a live cut sparks; an unreadable cut, and a cut whose fault is repaired, do not", () => {
    const cuts: FxCut[] = [
      { fault: "f1", line: "a" },
      { fault: "f2", line: "b" },
      { fault: "f3", line: "c" },
    ];
    // f1 is live (its line sparks); f2's line is not sparking (current does not reach it); f3 is repaired (no longer in the faults).
    const state = { faults: [fault("f1", "a"), fault("f2", "b")], sparking: new Set(["a", "c"]) };
    expect(sparkingCuts(state, cuts, () => true, [])).toEqual([0]);
    // While the Relight runs, a cut its line's fraction has not passed stays quiet.
    expect(sparkingCuts(state, cuts, (c) => c.line !== "a", [])).toEqual([]);
  });

  it("repairedFaults: a repair gives its id; an undo, a reset and a fuse that blows give none", () => {
    const f1 = fault("f1");
    const f2 = { id: "f2", at: "fb", kind: "blown-fuse" } as Fault;
    const before = { faults: [f1], parts: ["wire", "bulb"] as const };
    const after = { faults: [], parts: ["bulb"] as const };
    expect(repairedFaults(before, after, [])).toEqual(["f1"]);
    expect(repairedFaults(after, before, [])).toEqual([]);
    expect(repairedFaults(null, before, [])).toEqual([]);
    expect(repairedFaults(before, { faults: [f1, f2], parts: before.parts }, [])).toEqual([]);
  });
});
