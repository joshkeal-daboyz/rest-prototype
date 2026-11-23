/**
 * A1 criterion 6, kept by A4 (criterion 1) and by L2a for the old lattice functions: on the named cities (and 6 x 4 seeds 4 to 6) `layStreets` equals what today's `tileCity` gave, on the streets,
 * the blocks and every street cell's base role. The old city is gone from this file: its values are one digest per city in `oldpath.fixture.ts`, taken at b42b65f (ticket 070 L2a).
 */
import { describe, expect, it } from "vitest";
import { canonicalJson } from "../pipeline/digest";
import { stableHash } from "../pipeline/hash";
import { clampBlocks, layStreets } from "./layout";
import { OLD_LATTICE_DIGESTS } from "./oldpath.fixture";

const NAMED: { blocksX: number; blocksZ: number; seed: number }[] = [];
for (let seed = 1; seed <= 10; seed++) NAMED.push({ blocksX: 3, blocksZ: 3, seed });
for (let seed = 1; seed <= 6; seed++) NAMED.push({ blocksX: 6, blocksZ: 4, seed });

const h = (v: unknown): number => stableHash(canonicalJson(v));

describe("the old lattice (layStreets) equals today's tile city (A1 criterion 6, A4 criterion 1)", () => {
  it("covers the default city, 3 x 3 seeds 1 to 10 and 6 x 4 seeds 1 to 6", () => {
    expect(NAMED).toHaveLength(16);
    expect(Object.keys(OLD_LATTICE_DIGESTS)).toHaveLength(16);
  });
  for (const o of NAMED) {
    it(`${o.blocksX} x ${o.blocksZ} seed ${o.seed}: streets, blocks and street-cell roles are the same`, () => {
      const want = OLD_LATTICE_DIGESTS[`${o.blocksX}x${o.blocksZ}s${o.seed}`]!;
      const layer = layStreets(o.seed, clampBlocks(o.blocksX), clampBlocks(o.blocksZ));

      // the streets
      expect(h(layer.streets)).toBe(want.streets);

      // the blocks: id, bi, bj, bounds, type
      expect(h(layer.blocks.map((b) => ({ id: b.id, bi: b.bi, bj: b.bj, i0: b.i0, i1: b.i1, j0: b.j0, j1: b.j1, type: b.type })))).toBe(want.blocks);

      // every street cell's base role, once per cell
      const got = new Map(layer.cells.map((c) => [`${c.i},${c.j}`, [c.role, c.street]] as const));
      expect(got.size).toBe(layer.cells.length);
      expect(h([...got.entries()].sort((a, b) => (a[0] < b[0] ? -1 : 1)))).toBe(want.cells);
    });
  }
});
