import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { loadCityPuzzle } from "../core";
import { DEFAULT, sharedCity } from "../city/testing/namedcities";
import { jobFrame, loadCityView } from "./cityview";
import { WORLD_PER_METRE as S } from "./models";
import { TILE_M } from "./tilecity";

describe("the opening frame (081 E3)", () => {
  it("holds the job's places, run ends and the district's streets, and no more than one street past them", () => {
    const city = loadCityPuzzle(JSON.parse(readFileSync("puzzles/city/city-two-ways-round.city.json", "utf8")));
    const run = sharedCity(DEFAULT, "clean");
    const view = loadCityView(city, () => run);
    expect(view.district).toEqual(city.district);
    const plan = view.plan;
    const layer = plan.layers.circuit!;
    const streets = plan.layers.streets!;
    const f = jobFrame(view, layer, streets);
    const inside = (x: number, z: number): boolean => x * S >= f.minX && x * S <= f.maxX && z * S >= f.minY && z * S <= f.maxY;

    const poleOf = new Map(layer.poles.map((p) => [p.id, p] as const));
    const spanOf = new Map([...layer.spans, ...(layer.roofSpans ?? [])].map((s) => [s.id, s] as const));
    const roofOf = new Map((layer.roofs ?? []).map((r) => [r.id, r] as const));
    const pt = (id: string) => poleOf.get(id) ?? roofOf.get(id)!;
    for (const r of Object.values(view.converted.runs)) {
      for (const id of r.spans) for (const e of [spanOf.get(id)!.a, spanOf.get(id)!.b]) expect(inside(pt(e).x_m, pt(e).z_m)).toBe(true);
      const d = r.drop === undefined ? undefined : layer.drops.find((x) => x.building === r.drop);
      if (d) expect(inside(d.x_m, d.z_m)).toBe(true);
    }

    // The district with its four streets, in metres.
    let x0 = Infinity, z0 = Infinity, x1 = -Infinity, z1 = -Infinity;
    for (const b of streets.blocks.filter((k) => city.district.includes(k.id))) {
      for (const side of Object.values(b.sides)) {
        const st = streets.streets.find((s) => s.id === side.street)!;
        const lo = st.across0 * TILE_M;
        const hi = (st.across0 + st.bands.length) * TILE_M;
        if (st.axis === "x") (z0 = Math.min(z0, lo, b.j0 * TILE_M)), (z1 = Math.max(z1, hi, b.j1 * TILE_M)), (x0 = Math.min(x0, b.i0 * TILE_M)), (x1 = Math.max(x1, b.i1 * TILE_M));
        else (x0 = Math.min(x0, lo, b.i0 * TILE_M)), (x1 = Math.max(x1, hi, b.i1 * TILE_M)), (z0 = Math.min(z0, b.j0 * TILE_M)), (z1 = Math.max(z1, b.j1 * TILE_M));
      }
    }
    expect(inside(x0, z0) && inside(x1, z1)).toBe(true);
    // No pole in the frame lies more than one street (25 m) and the margin (16 m) past the district.
    for (const p of layer.poles) {
      if (!inside(p.x_m, p.z_m)) continue;
      expect(p.x_m).toBeGreaterThanOrEqual(x0 - 41);
      expect(p.x_m).toBeLessThanOrEqual(x1 + 41);
      expect(p.z_m).toBeGreaterThanOrEqual(z0 - 41);
      expect(p.z_m).toBeLessThanOrEqual(z1 + 41);
    }
    expect((f.maxX - f.minX) * (f.maxY - f.minY)).toBeLessThan(streets.w * TILE_M * S * streets.h * TILE_M * S);
  });
});
