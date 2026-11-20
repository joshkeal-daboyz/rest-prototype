/**
 * Criterion 6, the proof that the move changed nothing: on the named cities (and 6 x 4 seeds 4 to 6) stage 1's layer deep-equals today's `tileCity` on the streets,
 * the blocks and every street cell's base role. HEAVY: builds `tileCity` once per city (16 cities), so the timeout is 120 s.
 * The `src/render3d/` import is test-only, the one the ticket allows.
 */
import { describe, expect, it } from "vitest";
import type { CityStreetRole } from "../../core";
import { tileCity, type TileRole } from "../../render3d/tilecity";
import { runCity } from "../stages";

const NAMED: { blocksX: number; blocksZ: number; seed: number }[] = [];
for (let seed = 1; seed <= 10; seed++) NAMED.push({ blocksX: 3, blocksZ: 3, seed });
for (let seed = 1; seed <= 6; seed++) NAMED.push({ blocksX: 6, blocksZ: 4, seed });

/** Today's `parking`, `buildout` and `parkingPlain` read as `parkingPlain`, and `kerbCut` as `pavement`. */
const BASE: Partial<Record<TileRole, CityStreetRole>> = {
  lane: "lane",
  parking: "parkingPlain",
  buildout: "parkingPlain",
  parkingPlain: "parkingPlain",
  junction: "junction",
  crossing: "crossing",
  pavement: "pavement",
  pavementCorner: "pavementCorner",
  kerbCut: "pavement",
};

describe("stage 1 equals today's tile city (criterion 6)", { timeout: 120_000 }, () => {
  it("covers the default city, 3 x 3 seeds 1 to 10 and 6 x 4 seeds 1 to 6", () => {
    expect(NAMED).toHaveLength(16);
  });
  for (const o of NAMED) {
    it(`${o.blocksX} x ${o.blocksZ} seed ${o.seed}: streets, blocks and street-cell roles are the same`, () => {
      const old = tileCity(o);
      const r = runCity(o, "streets");
      expect(r.ok).toBe(true);
      const layer = r.plan.layers.streets!;

      // the streets
      expect(layer.streets).toEqual(old.streets);

      // the blocks: id, bi, bj, bounds, type
      expect(layer.blocks).toEqual(old.blocks.map((b) => ({ id: b.id, bi: b.bi, bj: b.bj, i0: b.i0, i1: b.i1, j0: b.j0, j1: b.j1, type: b.type })));

      // every street cell's base role (a 2-cell piece covers its cell and the next along its street; lot and plaza cells are inside blocks)
      const want = new Map<string, { role: CityStreetRole; street: string | null }>();
      for (const c of old.cells) {
        const role = BASE[c.role];
        if (role === undefined) continue; // lotSurface, plaza: block cells, not the street's
        const own = c.street === null ? null : old.streets.find((s) => s.id === c.street)!;
        want.set(`${c.i},${c.j}`, { role, street: c.street });
        if (c.cells === 2) want.set(own!.axis === "x" ? `${c.i + 1},${c.j}` : `${c.i},${c.j + 1}`, { role, street: c.street });
      }
      const got = new Map(layer.cells.map((c) => [`${c.i},${c.j}`, { role: c.role, street: c.street }] as const));
      expect(got.size).toBe(layer.cells.length); // every street cell once
      expect(got).toEqual(want);
    });
  }
});
