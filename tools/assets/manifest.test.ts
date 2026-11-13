import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
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
    expect(again.packs[1]?.assets).toHaveLength(2);
    expect(again.packs[0]?.assets[0]?.name).toBe("Fixture_Door");
  });

  it("readPriorPacks gives nothing for junk or another manifest version", () => {
    expect(readPriorPacks("not json")).toEqual([]);
    expect(readPriorPacks(JSON.stringify({ version: 99, packs: [] }))).toEqual([]);
    expect(readPriorPacks("[]")).toEqual([]);
  });
});
