/** Ticket 081 D3: the picks table equals the note row for row; every key is in the converted manifest (lazy, skipped when absent). */
import { describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { CIRCUIT_COMPONENTS, CIRCUIT_SCENERY, type AssetManifest } from "../core";
import { COMPONENT_MODELS, SCENERY_MODELS } from "./componentmodels";

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
    // The Removed list: each row is a pick Josh took away, and the table marks it (the row above stays as the history of his first pick).
    const removed = text.slice(text.indexOf("## Removed"));
    const gone = [...removed.matchAll(/^[|] `([a-zA-Z]+)` [|].*"([^"]+)" [|]/gm)].map((m) => [m[1], m[2]]);
    expect(gone).toEqual([["lampBuilding", "Remove it (Recommended)"]]);
    for (const c of CIRCUIT_COMPONENTS) expect(COMPONENT_MODELS[c].removed?.words, c).toBe(gone.find((g) => g[0] === c)?.[1]);
    // The Scenery table: one row per piece; the pick's backticked key is the model, and `POWER_LINE` means null ("Keep POWER_LINE").
    const scenery = [...text.matchAll(/^\| `(\w+)` \| ([^|]+) \| "([^"]+)" \|/gm)].map((m) => ({ piece: m[1]!, pick: /`([^`]+)`/.exec(m[2]!)![1]!, words: m[3]! }));
    expect(scenery.map((r) => r.piece)).toEqual([...CIRCUIT_SCENERY]);
    expect(Object.keys(SCENERY_MODELS)).toEqual([...CIRCUIT_SCENERY]);
    for (const r of scenery) {
      const p = SCENERY_MODELS[r.piece as keyof typeof SCENERY_MODELS];
      expect({ key: p.key, words: p.words }).toEqual({ key: r.pick === "POWER_LINE" ? null : r.pick, words: r.words });
    }
  });

  const PATH = join(process.cwd(), "assets", "private", "out", "manifest.json");
  it.skipIf(!existsSync(PATH))("every non-null key is in the converted manifest (a pack not converted is skipped, and named)", () => {
    const m = JSON.parse(readFileSync(PATH, "utf8")) as AssetManifest;
    const packs = new Map(m.packs.map((p) => [p.pack, new Set(p.assets.map((a) => a.name))]));
    const missing: string[] = [];
    const skipped: string[] = [];
    for (const p of [...Object.values(COMPONENT_MODELS), ...Object.values(SCENERY_MODELS)]) {
      if (p.key === null) continue;
      const [pack = "", name = ""] = p.key.split(":");
      const names = packs.get(pack);
      if (!names) skipped.push(p.key);
      else if (!names.has(name)) missing.push(p.key);
    }
    if (skipped.length) console.info(`componentmodels.test: pack not converted, skipped: ${skipped.join(", ")}`);
    expect(missing).toEqual([]);
  });
});
