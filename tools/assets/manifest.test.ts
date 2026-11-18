import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { ASSET_MANIFEST_VERSION } from "../../src/core";
import { ManifestError, buildManifest, parsePackReport, readPriorPacks } from "./manifest";

const here = dirname(fileURLToPath(import.meta.url));
const fixture = (name: string): unknown => JSON.parse(readFileSync(join(here, "fixtures", name), "utf8")) as unknown;

const OUT = resolve("/repo/assets/private/out");
const opts = { manifestDir: OUT, generatedAt: "2026-11-12T00:00:00.000Z", blenderVersion: "4.2.3" };

describe("Manifest (buildManifest)", () => {
  it("has version ASSET_MANIFEST_VERSION, packs in name order, and each glb relative to the manifest with forward slashes", () => {
    const m = buildManifest(
      [
        { pack: "zeta-town", glbPath: join(OUT, "zeta-town.glb"), atlas: "Textures/Z.png", report: fixture("report-ok.json") },
        { pack: "alpha", glbPath: join(OUT, "sub", "alpha.glb"), atlas: null, report: fixture("report-ok.json") },
      ],
      opts,
    );
    expect(m.version).toBe(ASSET_MANIFEST_VERSION);
    expect(m.generatedAt).toBe("2026-11-12T00:00:00.000Z");
    expect(m.packs.map((p) => p.pack)).toEqual(["alpha", "zeta-town"]);
    expect(m.packs[0]?.glb).toBe("sub/alpha.glb");
    expect(m.packs[1]?.glb).toBe("zeta-town.glb");
    expect(m.packs[1]?.atlas).toBe("Textures/Z.png");
    expect(m.packs[0]?.atlas).toBeNull();
    expect(m.packs[1]?.assets.map((a) => a.name)).toEqual(["Fixture_Door", "Fixture_Pole"]);
    expect(m.packs[1]?.assets[1]?.warnings).toEqual(["no-uv"]);
    expect(m.packs[1]?.failures).toEqual([{ source: "Broken.fbx", error: "the file contains no meshes" }]);
    // The Blender that ran the conversion wins over the fallback.
    expect(m.blenderVersion).toBe("4.2.3 LTS");
  });

  it("is deterministic: the same inputs give the same manifest", () => {
    const inputs = [{ pack: "p", glbPath: join(OUT, "p.glb"), atlas: null, report: fixture("report-ok.json") }];
    expect(JSON.stringify(buildManifest(inputs, opts))).toBe(JSON.stringify(buildManifest(inputs, opts)));
  });

  it("a report with no bounds is an error naming the pack and the field", () => {
    const run = () =>
      buildManifest([{ pack: "town", glbPath: join(OUT, "town.glb"), atlas: null, report: fixture("report-missing-bounds.json") }], opts);
    expect(run).toThrow(ManifestError);
    expect(run).toThrow(/pack "town": assets\[0\]\.bounds/);
  });

  it("a non-numeric triangle count is an error naming the pack and the field", () => {
    expect(() => parsePackReport("town", fixture("report-bad-triangles.json"))).toThrow(/pack "town": assets\[0\]\.triangles/);
  });

  it("a duplicate asset name in a pack is an error naming the pack and the name", () => {
    expect(() => parsePackReport("town", fixture("report-duplicate.json"))).toThrow(
      /pack "town": assets\[1\]\.name: duplicate asset name "Fixture_Same"/,
    );
  });

  it("rejects an unknown warning, inverted bounds, and a report that is not an object", () => {
    const ok = fixture("report-ok.json") as { assets: Array<Record<string, unknown>> };
    const withWarning = { ...ok, assets: [{ ...ok.assets[0], warnings: ["shiny"] }] };
    expect(() => parsePackReport("p", withWarning)).toThrow(/warnings/);
    const inverted = { ...ok, assets: [{ ...ok.assets[0], bounds: { min: [1, 1, 1], max: [0, 0, 0] } }] };
    expect(() => parsePackReport("p", inverted)).toThrow(/min is above max/);
    expect(() => parsePackReport("p", [])).toThrow(/pack "p"/);
  });

  it("carries textures and missingTextures through from the report fixtures", () => {
    const mani = buildManifest([{ pack: "p", glbPath: join(OUT, "p.glb"), atlas: null, report: fixture("report-textures.json") }], opts);
    const assets = mani.packs[0]?.assets ?? [];
    expect(assets.map((a) => [a.name, a.textures, a.missingTextures, a.warnings])).toEqual([
      ["guess_mesh", ["Textures/Guess_a.png"], [], ["texture-guessed"]],
      ["lost_ref", [], ["nowhere.png"], ["missing-texture"]],
      ["plain_mesh", [], ["material:lambert1"], ["missing-texture"]],
    ]);
    expect(mani.packs[0]?.failures[0]?.error).toContain("an OBJ copy exists: Obj/fire_truck_mesh.obj");
  });

  it("a clean per-model pack fixture has no warnings, no missing textures, and no atlas", () => {
    const mani = buildManifest([{ pack: "clean", glbPath: join(OUT, "clean.glb"), atlas: null, report: fixture("report-clean-pack.json") }], opts);
    const pack = mani.packs[0];
    expect(pack?.atlas).toBeNull();
    expect(pack?.assets.length).toBe(3);
    for (const a of pack?.assets ?? []) {
      expect(a.warnings).toEqual([]);
      expect(a.missingTextures).toEqual([]);
      expect(a.textures.length).toBeGreaterThan(0);
    }
  });

  describe("texture fields are validated, naming the pack and the field", () => {
    const base = fixture("report-clean-pack.json") as { assets: Array<Record<string, unknown>> };
    const withAsset = (change: Record<string, unknown>) => ({ ...base, assets: [{ ...base.assets[0], ...change }] });

    it("textures or missingTextures missing, or not an array of strings", () => {
      for (const field of ["textures", "missingTextures"]) {
        const missing = { ...base, assets: [{ ...base.assets[0] }] };
        delete missing.assets[0]?.[field];
        expect(() => parsePackReport("p", missing), field).toThrow(new RegExp(`pack "p": assets\\[0\\]\\.${field}`));
        expect(() => parsePackReport("p", withAsset({ [field]: "Textures/a.png" })), field).toThrow(/must be an array of strings/);
        expect(() => parsePackReport("p", withAsset({ [field]: [3] })), field).toThrow(/must be an array of strings/);
      }
    });

    it("a textures entry that is absolute, has .., or has a backslash", () => {
      for (const bad of ["/abs/a.png", "C:/abs/a.png", "C:\\abs\\a.png", "../a.png", "Textures/../../a.png", "Textures\\a.png"]) {
        expect(() => parsePackReport("p", withAsset({ textures: [bad] })), bad).toThrow(/pack "p": assets\[0\]\.textures/);
      }
    });

    it("missing-texture in warnings with an empty missingTextures, or the other way round", () => {
      expect(() => parsePackReport("p", withAsset({ warnings: ["missing-texture"], missingTextures: [] }))).toThrow(
        /pack "p": assets\[0\]\.missingTextures/,
      );
      expect(() => parsePackReport("p", withAsset({ warnings: [], missingTextures: ["props.png"] }))).toThrow(/pack "p": assets\[0\]\.warnings/);
    });

    it("no-atlas is an unknown warning now", () => {
      expect(() => parsePackReport("p", withAsset({ warnings: ["no-atlas"] }))).toThrow(/unknown warning "no-atlas"/);
    });
  });

  it("no fixture uses the dropped no-atlas warning", () => {
    const dir = join(here, "fixtures");
    const files = readdirSync(dir).filter((n) => n.endsWith(".json"));
    expect(files.length).toBeGreaterThan(5);
    for (const n of files) expect(readFileSync(join(dir, n), "utf8"), n).not.toContain("no-atlas");
  });

  it("keeps packs from an earlier manifest unless this run converted the same name", () => {
    const first = buildManifest(
      [
        { pack: "a", glbPath: join(OUT, "a.glb"), atlas: null, report: fixture("report-ok.json") },
        { pack: "b", glbPath: join(OUT, "b.glb"), atlas: null, report: fixture("report-ok.json") },
      ],
      opts,
    );
    const prior = readPriorPacks(JSON.stringify(first));
    expect(prior.map((p) => p.pack)).toEqual(["a", "b"]);
    const again = buildManifest([{ pack: "b", glbPath: join(OUT, "b.glb"), atlas: "x.png", report: fixture("report-selftest.json") }], {
      ...opts,
      keep: prior,
    });
    expect(again.packs.map((p) => p.pack)).toEqual(["a", "b"]);
    expect(again.packs[1]?.atlas).toBe("x.png");
    expect(again.packs[1]?.assets).toHaveLength(11);
    expect(again.packs[0]?.assets[0]?.name).toBe("Fixture_Door");
  });

  describe("ticket 054 A: colourways", () => {
    const colourways = [
      { id: "01_A", image: "city-pack/colourways/PolygonCity_Texture_01_A.png", base: "PolygonCity_Texture", width: 1024, height: 1024 },
      { id: "02_A", image: "city-pack/colourways/PolygonCity_Texture_02_A.png", base: "PolygonCity_Texture", width: 1024, height: 1024 },
    ];
    const withColourways = (c: unknown) => {
      const first = buildManifest(
        [
          { pack: "a", glbPath: join(OUT, "a.glb"), atlas: null, report: fixture("report-ok.json") },
          { pack: "b", glbPath: join(OUT, "b.glb"), atlas: null, report: fixture("report-ok.json") },
        ],
        opts,
      );
      const raw = JSON.parse(JSON.stringify(first)) as { packs: Array<Record<string, unknown>> };
      raw.packs[0]!["colourways"] = c;
      return JSON.stringify(raw);
    };

    it("readPriorPacks keeps a pack's colourways, and buildManifest carries them across a re-convert of another pack", () => {
      const prior = readPriorPacks(withColourways(colourways));
      expect(prior[0]?.colourways).toEqual(colourways);
      expect(prior[1]).not.toHaveProperty("colourways");
      const again = buildManifest([{ pack: "b", glbPath: join(OUT, "b.glb"), atlas: null, report: fixture("report-ok.json") }], { ...opts, keep: [prior[0]!] });
      expect(again.packs[0]?.colourways).toEqual(colourways);
      expect(again.packs[1]).not.toHaveProperty("colourways");
    });

    it("a re-convert of the same pack replaces its entry, so its colourways are written again by the colourway step", () => {
      const prior = readPriorPacks(withColourways(colourways));
      const again = buildManifest([{ pack: "a", glbPath: join(OUT, "a.glb"), atlas: null, report: fixture("report-ok.json") }], { ...opts, keep: prior });
      expect(again.packs[0]).not.toHaveProperty("colourways");
    });

    it("a malformed colourways field is dropped (the pack is kept), never trusted", () => {
      for (const bad of ["x", [1], [{ ...colourways[0], width: 0 }], [{ ...colourways[0], image: "../x.png" }], [{ ...colourways[0], image: "C:/x.png" }], [colourways[0], colourways[0]], [{ id: "a" }]]) {
        const prior = readPriorPacks(withColourways(bad));
        expect(prior.map((p) => p.pack), JSON.stringify(bad)).toEqual(["a", "b"]);
        expect(prior[0], JSON.stringify(bad)).not.toHaveProperty("colourways");
      }
    });
  });

  it("readPriorPacks gives nothing for junk or another manifest version", () => {
    expect(readPriorPacks("not json")).toEqual([]);
    expect(readPriorPacks(JSON.stringify({ version: 99, packs: [] }))).toEqual([]);
    expect(readPriorPacks("[]")).toEqual([]);
  });

  describe("ticket 040: scale, per pack and per asset", () => {
    const ok = fixture("report-ok.json") as { scale?: number; assets: Array<Record<string, unknown>> };
    const run = (report: unknown) => buildManifest([{ pack: "town", glbPath: join(OUT, "town.glb"), atlas: null, report }], opts);
    const withAsset = (change: Record<string, unknown>) => ({ ...ok, assets: [{ ...ok.assets[0], ...change }] });

    it("buildManifest carries the pack's scale and each asset's scale from the report", () => {
      const m = run(ok);
      expect(m.packs[0]?.scale).toBe(100);
      expect(m.packs[0]?.assets.map((a) => [a.name, a.scale])).toEqual([
        ["Fixture_Door", 100],
        ["Fixture_Pole", 1],
      ]);
      const clean = buildManifest([{ pack: "c", glbPath: join(OUT, "c.glb"), atlas: null, report: fixture("report-clean-pack.json") }], opts);
      expect(clean.packs[0]?.scale).toBe(1);
      for (const a of clean.packs[0]?.assets ?? []) expect(a.scale).toBe(1);
    });

    it("a report with no pack scale is an error naming the pack and the field", () => {
      const noScale = { ...ok };
      delete noScale.scale;
      expect(() => run(noScale)).toThrow(ManifestError);
      expect(() => run(noScale)).toThrow(/pack "town": scale: missing/);
    });

    it("an asset with no scale is an error naming the pack and the field", () => {
      const asset = { ...ok.assets[0] };
      delete asset["scale"];
      expect(() => run({ ...ok, assets: [asset] })).toThrow(/pack "town": assets\[0\]\.scale: missing/);
    });

    it("a scale that is not a finite number above 0 is an error naming the pack and the field", () => {
      for (const bad of [0, -1, "10", null, [10], {}, true]) {
        expect(() => run(withAsset({ scale: bad })), JSON.stringify(bad)).toThrow(/pack "town": assets\[0\]\.scale: must be a finite number above 0/);
        expect(() => run({ ...ok, scale: bad }), JSON.stringify(bad)).toThrow(/pack "town": scale: must be a finite number above 0/);
      }
      // JSON cannot write NaN or Infinity, but a report read from JSON can still reach here as 1e999
      expect(() => run(withAsset({ scale: Number.POSITIVE_INFINITY }))).toThrow(/assets\[0\]\.scale/);
      expect(() => run({ ...ok, scale: Number.NaN })).toThrow(/pack "town": scale/);
    });

    it("the manifest written carries scale on every asset and pack, and a kept pack from before ticket 040 keeps loading without one", () => {
      const first = run(ok);
      const prior = readPriorPacks(JSON.stringify(first));
      expect(prior[0]?.scale).toBe(100);
      expect(prior[0]?.assets.map((a) => a.scale)).toEqual([100, 1]);
      // a manifest written before ticket 040: no scale anywhere
      const old = JSON.parse(JSON.stringify(first)) as { packs: Array<{ scale?: number; assets: Array<{ scale?: number }> }> };
      for (const p of old.packs) {
        delete p.scale;
        for (const a of p.assets) delete a.scale;
      }
      const loaded = readPriorPacks(JSON.stringify(old));
      expect(loaded.map((p) => p.pack)).toEqual(["town"]);
      expect(loaded[0]).not.toHaveProperty("scale");
      expect(loaded[0]?.assets[0]).not.toHaveProperty("scale");
      // and a bad scale in a prior manifest is not trusted
      old.packs[0]!.scale = -3;
      expect(readPriorPacks(JSON.stringify(old))).toEqual([]);
    });
  });
});
