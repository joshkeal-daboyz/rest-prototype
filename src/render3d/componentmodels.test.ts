/** Ticket 081 D3: the picks table equals the note row for row; every key is in the converted manifest (lazy, skipped when absent). */
import { describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { CIRCUIT_COMPONENTS, type AssetManifest } from "../core";
import { COMPONENT_MODELS } from "./componentmodels";

describe("COMPONENT_MODELS", () => {
  it("equals docs/design/081-component-picks.md row for row", () => {
    const text = readFileSync(join(process.cwd(), "docs", "design", "081-component-picks.md"), "utf8");
    const rows = [...text.matchAll(/^\| (\w+) \| `([^`]+)` \| "([^"]+)" \|/gm)].map((m) => [m[1], m[2], m[3]]);
    expect(rows.map((r) => r[0])).toEqual([...CIRCUIT_COMPONENTS]);
    expect(Object.keys(COMPONENT_MODELS)).toEqual([...CIRCUIT_COMPONENTS]);
    for (const [c, key, words] of rows) {
      const p = COMPONENT_MODELS[c as keyof typeof COMPONENT_MODELS];
      expect({ component: p.component, key: p.key, words: p.words }).toEqual({ component: c, key, words });
    }
    expect(COMPONENT_MODELS.spring.key).toBe(COMPONENT_MODELS.junction.key);
  });

  const PATH = join(process.cwd(), "assets", "private", "out", "manifest.json");
  it.skipIf(!existsSync(PATH))("every non-null key is in the converted manifest (a pack not converted is skipped, and named)", () => {
    const m = JSON.parse(readFileSync(PATH, "utf8")) as AssetManifest;
    const packs = new Map(m.packs.map((p) => [p.pack, new Set(p.assets.map((a) => a.name))]));
    const missing: string[] = [];
    const skipped: string[] = [];
    for (const p of Object.values(COMPONENT_MODELS)) {
      if (p.key === null) continue;
      const [pack, name] = p.key.split(":");
      const names = packs.get(pack);
      if (!names) skipped.push(p.key);
      else if (!names.has(name)) missing.push(p.key);
    }
    if (skipped.length) console.info(`componentmodels.test: pack not converted, skipped: ${skipped.join(", ")}`);
    expect(missing).toEqual([]);
  });
});
