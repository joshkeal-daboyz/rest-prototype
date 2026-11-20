/**
 * Stage 2 on the named cities (default 3 x 3 seed 1, 3 x 3 seeds 1 to 10, 6 x 4 seeds 1 to 3): V3, V4, M4a, the parts and their edges, the picture, the digest pins, R-1 to R-7.
 * HEAVY: each city is built once, through a module-level cache. The `src/render3d/` import (the old `planBlocks`, for the criterion 4 report) is test-only.
 */
import { readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import type { CityLandLayer, CityPlan, CityStreetsLayer } from "../../core";
import { planBlocks as oldPlanBlocks } from "../../render3d/tilecity";
import { pictureProblems } from "../pipeline/picture";
import type { CityStageDef } from "../pipeline/types";
import { runCity } from "../stages";
import { streetsStage } from "../streets/stage";
import { evaluateLand, landVariety, laneCells, parkCells } from "./check";
import { LAND_LEGEND, landStage } from "./stage";

interface City {
  readonly blocksX: number;
  readonly blocksZ: number;
  readonly seed: number;
}
const NAMED: City[] = [];
for (let seed = 1; seed <= 10; seed++) NAMED.push({ blocksX: 3, blocksZ: 3, seed });
for (let seed = 1; seed <= 3; seed++) NAMED.push({ blocksX: 6, blocksZ: 4, seed });

const cache = new Map<string, ReturnType<typeof runCity>>();
function cityOf(o: City): ReturnType<typeof runCity> {
  const k = `${o.blocksX}x${o.blocksZ}:${o.seed}`;
  if (!cache.has(k)) cache.set(k, runCity(o, "land"));
  return cache.get(k)!;
}
const layersOf = (o: City): { streets: CityStreetsLayer; land: CityLandLayer; plan: CityPlan } => {
  const r = cityOf(o);
  if (!r.ok) throw new Error(`${o.blocksX}x${o.blocksZ} seed ${o.seed} failed: ${r.failure.reason}`);
  return { streets: r.plan.layers.streets!, land: r.plan.layers.land!, plan: r.plan };
};
const label = (o: City): string => `${o.blocksX} x ${o.blocksZ} seed ${o.seed}`;
const key = (i: number, j: number): string => `${i},${j}`;

describe("stage 2, land, on the named cities", { timeout: 120_000 }, () => {
  it("the default city is the 3 x 3 seed 1 city, and the named cities are 13", () => {
    expect(NAMED).toHaveLength(13);
    expect(runCity({}, "land").plan.digests.land).toBe(cityOf({ blocksX: 3, blocksZ: 3, seed: 1 }).plan.digests.land);
  });

  for (const o of NAMED) {
    describe(label(o), () => {
      it("returns ok, and V3, V4 and M4a hold (criteria 2 and 4)", () => {
        const { streets, land } = layersOf(o);
        const verdicts = evaluateLand(landVariety(land, streets.blocks));
        expect(verdicts.map((v) => [v.id, v.value])).toEqual([["V3", 0], ["V4", 0], ["M4a", 0]]);
      });

      it("every block cell is in exactly one part, lane or park, and no part, lane or park is outside its block (criterion 3)", () => {
        const { streets, land } = layersOf(o);
        const owner = new Map<string, string>();
        const put = (i: number, j: number, what: string): void => {
          expect(owner.has(key(i, j)), `cell ${i},${j} is both ${owner.get(key(i, j))} and ${what}`).toBe(false);
          owner.set(key(i, j), what);
        };
        for (const p of land.parts) for (let j = p.j0; j < p.j1; j++) for (let i = p.i0; i < p.i1; i++) put(i, j, `part ${p.id}`);
        for (const c of laneCells(land, streets.blocks)) put(c.i, c.j, "lane");
        for (const c of parkCells(land)) put(c.i, c.j, "park");
        for (const b of streets.blocks) {
          for (let j = b.j0; j < b.j1; j++) for (let i = b.i0; i < b.i1; i++) expect(owner.has(key(i, j)), `block cell ${i},${j} of ${b.id} has no use`).toBe(true);
        }
        const inBlock = new Set(streets.blocks.flatMap((b) => Array.from({ length: (b.i1 - b.i0) * (b.j1 - b.j0) }, (_, n) => key(b.i0 + (n % (b.i1 - b.i0)), b.j0 + Math.floor(n / (b.i1 - b.i0))))));
        expect([...owner.keys()].filter((k) => !inBlock.has(k))).toEqual([]);
      });

      it("every part's four edges are right: what lies beyond each side is a street, a lane or a park, and a strip has a street and a lane edge on its long sides", () => {
        const { streets, land } = layersOf(o);
        const lanes = new Set(laneCells(land, streets.blocks).map((c) => key(c.i, c.j)));
        const parks = new Set(parkCells(land).map((c) => key(c.i, c.j)));
        const blockOf = new Map(streets.blocks.map((b) => [b.id, b] as const));
        const beyond = (i: number, j: number, what: "street" | "lane" | "park"): boolean => {
          if (what === "lane") return lanes.has(key(i, j));
          if (what === "park") return parks.has(key(i, j));
          return !lanes.has(key(i, j)) && !parks.has(key(i, j)) && !land.parts.some((p) => i >= p.i0 && i < p.i1 && j >= p.j0 && j < p.j1);
        };
        for (const p of land.parts) {
          const b = blockOf.get(p.block)!;
          for (const [side, edge] of Object.entries(p.edges)) {
            // sample the cell just beyond the middle of the side
            const mi = Math.floor((p.i0 + p.i1 - 1) / 2);
            const mj = Math.floor((p.j0 + p.j1 - 1) / 2);
            const [i, j] = side === "+x" ? [p.i1, mj] : side === "-x" ? [p.i0 - 1, mj] : side === "+z" ? [mi, p.j1] : [mi, p.j0 - 1];
            expect(beyond(i, j, edge), `${p.id} ${side} is ${edge}`).toBe(true);
            if (edge === "street") {
              const onBoundary = side === "+x" ? p.i1 === b.i1 : side === "-x" ? p.i0 === b.i0 : side === "+z" ? p.j1 === b.j1 : p.j0 === b.j0;
              expect(onBoundary, `${p.id} ${side} street edge is on the block's boundary`).toBe(true);
            }
          }
          expect(p.shape).toBe(Math.min(p.i1 - p.i0, p.j1 - p.j0) === 2 ? "strip" : "court");
          if (p.shape === "strip") {
            const long = p.i1 - p.i0 === 2 ? (["-x", "+x"] as const) : (["-z", "+z"] as const);
            expect(long.map((s) => p.edges[s]).sort()).toEqual(["lane", "street"]);
          }
        }
      });

      it("every block's biome is town, and its treatment agrees with its parts, lane and park (criteria 3 and 5)", () => {
        const { streets, land } = layersOf(o);
        expect(land.blocks.map((b) => b.block)).toEqual(streets.blocks.map((b) => b.id));
        for (const b of land.blocks) {
          expect(b.biome).toBe("town");
          const parts = land.parts.filter((p) => p.block === b.block);
          const lanes = land.lanes.filter((l) => l.block === b.block);
          const parks = land.parks.filter((p) => p.block === b.block);
          expect({ court: [1, 0, 0], alley: [2, 1, 0], parkWhole: [0, 0, 1], parkHalf: [1, 0, 1] }[b.treatment]).toEqual([parts.length, lanes.length, parks.length]);
        }
      });

      it("the picture holds R-5: the lattice's size, every index in the legend, and each cell's legend matches the layer", () => {
        const { streets, land, plan } = layersOf(o);
        const pic = landStage.picture(plan);
        expect(pictureProblems(pic, streets.w, streets.h)).toEqual([]);
        expect(pic.legend).toBe(LAND_LEGEND);
        const lanes = new Set(laneCells(land, streets.blocks).map((c) => key(c.i, c.j)));
        const want = (i: number, j: number): string => {
          if (lanes.has(key(i, j))) return "lane";
          const park = land.parks.find((p) => i >= p.i0 && i < p.i1 && j >= p.j0 && j < p.j1);
          if (park) return park.kind === "whole" ? "whole park" : "half park";
          const part = land.parts.find((p) => i >= p.i0 && i < p.i1 && j >= p.j0 && j < p.j1);
          return part ? `${part.shape} part` : "street";
        };
        for (let j = 0; j < streets.h; j++) for (let i = 0; i < streets.w; i++) expect(pic.legend[pic.cells[j * streets.w + i]!]!.name).toBe(want(i, j));
      });
    });
  }

  it("R-4: the layer's digest is pinned on the default city, 3 x 3 seeds 2 and 3, and 6 x 4 seed 1", () => {
    const got = Object.fromEntries(
      [{ blocksX: 3, blocksZ: 3, seed: 1 }, { blocksX: 3, blocksZ: 3, seed: 2 }, { blocksX: 3, blocksZ: 3, seed: 3 }, { blocksX: 6, blocksZ: 4, seed: 1 }].map((o) => [label(o), cityOf(o).plan.digests.land] as const),
    );
    expect(got).toEqual({
      "3 x 3 seed 1": "d5091d7e",
      "3 x 3 seed 2": "6d1dae32",
      "3 x 3 seed 3": "3a8d0394",
      "6 x 4 seed 1": "ba20532c",
    });
  });

  it("R-4: a test double for the land stage leaves the streets digest equal to the standard run's", () => {
    const o = { blocksX: 3, blocksZ: 3, seed: 2 };
    const double: CityStageDef = { name: "land", run: () => ({ stage: "land", blocks: [], parts: [], lanes: [], parks: [] }), picture: landStage.picture } as unknown as CityStageDef;
    const doubled = runCity(o, "land", [streetsStage as unknown as CityStageDef, double]);
    expect(doubled.plan.digests.streets).toBe(cityOf(o).plan.digests.streets);
    expect(doubled.plan.digests.land).not.toBe(cityOf(o).plan.digests.land);
  });

  it("R-3: the stage's randomness is its own: the same city twice is the same layer, and another seed is another layer", () => {
    expect(runCity({ blocksX: 3, blocksZ: 3, seed: 2 }, "land").plan.digests.land).toBe(cityOf({ blocksX: 3, blocksZ: 3, seed: 2 }).plan.digests.land);
    expect(cityOf({ blocksX: 3, blocksZ: 3, seed: 2 }).plan.digests.land).not.toBe(cityOf({ blocksX: 3, blocksZ: 3, seed: 3 }).plan.digests.land);
  });

  it("R-1: the layer is frozen when the stage returns", () => {
    const { land } = layersOf(NAMED[0]!);
    expect(Object.isFrozen(land)).toBe(true);
    expect(Object.isFrozen(land.parts[0])).toBe(true);
    expect(() => {
      (land.parts as unknown as unknown[]).push(1);
    }).toThrow();
  });

  it("R-7: a 6 x 6 city (seed 1) ends ok or with a failure naming a rule, never an uncaught error", () => {
    const r = runCity({ blocksX: 6, blocksZ: 6, seed: 1 }, "land");
    if (!r.ok) {
      expect(r.failure.stage).toBe("land");
      expect(r.failure.reason).not.toMatch(/^bug:/);
      expect(r.failure.reason).toMatch(/^(V3|V4|M4a):/);
    } else expect(r.plan.layers.land!.blocks).toHaveLength(36);
  });

  it("R-7: no block count, block id or lattice size is written into the stage's code", () => {
    const dir = fileURLToPath(new URL(".", import.meta.url));
    for (const f of readdirSync(dir).filter((n) => n.endsWith(".ts") && !n.endsWith(".test.ts"))) {
      const text = readFileSync(dir + f, "utf8").replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
      expect(text, f).not.toMatch(/block:\d|blocksX|blocksZ|CITY_BLOCKS/);
    }
  });

  it("criterion 5: no stage reads the biome field yet (grep over src/city/)", () => {
    const root = fileURLToPath(new URL("..", import.meta.url));
    const walk = (dir: string): string[] =>
      readdirSync(dir, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(`${dir}${e.name}/`) : e.name.endsWith(".ts") && !e.name.endsWith(".test.ts") ? [`${dir}${e.name}`] : []));
    const files = walk(root);
    expect(files.length).toBeGreaterThan(10);
    const readers = files.filter((f) => /\.biome\b|\bbiome\s*[=!]==|\[\s*["']biome["']\s*\]/.test(readFileSync(f, "utf8")));
    expect(readers).toEqual([]);
  });

  it("R-6: the stage imports only src/core/ and src/city/, and no other stage's folder", () => {
    const dir = fileURLToPath(new URL(".", import.meta.url));
    for (const f of readdirSync(dir).filter((n) => n.endsWith(".ts") && !n.endsWith(".test.ts"))) {
      for (const m of readFileSync(dir + f, "utf8").matchAll(/from "([^"]+)"/g)) {
        const spec = m[1]!;
        expect(spec.startsWith("./") || spec.startsWith("../../core") || spec.startsWith("../pipeline/"), `${f} imports ${spec}`).toBe(true);
      }
    }
  });

  it("criterion 4 report: alleys, strips and parks per named city, the old planBlocks beside the new", () => {
    const rows: string[] = ["city | blocks | old alleys | old parks | old cuts breaking rule 4 | new alleys | strips | court parts | whole parks | half parks | needed alleys/parks"];
    for (const o of NAMED) {
      const { streets, land } = layersOf(o);
      const old = oldPlanBlocks(streets.blocks.map((b) => ({ id: b.id, type: b.type, w: b.i1 - b.i0, d: b.j1 - b.j0 })), o.seed);
      // the old planner cut each alley block at the middle of its long side: floor((len - 1) / 2) cells before the lane
      let oldBad = 0;
      for (const id of old.alleys) {
        const b = streets.blocks.find((x) => x.id === id)!;
        const len = Math.max(b.i1 - b.i0, b.j1 - b.j0);
        const before = Math.floor((len - 1) / 2);
        for (const side of [before, len - 1 - before]) if (side !== 2 && side < 6) oldBad++;
      }
      const m = landVariety(land, streets.blocks);
      rows.push(
        [
          label(o),
          streets.blocks.length,
          old.alleys.size,
          old.parks.size,
          oldBad === 0 ? "0" : `${oldBad} parts`,
          land.lanes.length,
          land.parts.filter((p) => p.shape === "strip").length,
          land.parts.filter((p) => p.shape === "court").length,
          land.parks.filter((p) => p.kind === "whole").length,
          land.parks.filter((p) => p.kind === "half").length,
          `${m.alleysNeeded}/${m.parksNeeded}`,
        ].join(" | "),
      );
    }
    console.log(rows.join("\n"));
    expect(rows).toHaveLength(NAMED.length + 1);
  });
});
