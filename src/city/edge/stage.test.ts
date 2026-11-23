/**
 * Stage 4, sections D1 and D1b, on the 20 named runs (6 x 6 seeds 1 to 10, one-way off and on; the default city, 6 x 6 seed 1, first): the kerb cuts, the parking band from the block sides, its first pass (a best fit over
 * the city, and a whole park's own tile), the build-outs and trees, P1, P3 to P6, the supply band, the picture, the digest pins and R-1 to R-7 (the kerb line is D2's). HEAVY: each city is built once, through a module-level cache.
 *
 * R-2: the stage returns ok on all 20 named runs. Nothing is loosened and no city is pinned.
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { CITY_GROUND_VARIANT } from "../../core";
import type { CityBlock, CityEdgeLayer, CityLandLayer, CityMassLayer, CityOpening, CityPlanBlock, CityPlanRun, CityStreetsLayer } from "../../core";
import { pictureProblems } from "../pipeline/picture";
import { stageRand } from "../pipeline/seeds";
import type { CityStageDef } from "../pipeline/types";
import { landStage } from "../land/stage";
import { massStage } from "../mass/stage";
import { runCity } from "../stages";
import { NAMED, sharedCity } from "../testing/namedcities";
import { PLAN_BLOCKS_DEFAULT } from "../streets/constants";
import { streetsStage } from "../streets/stage";
import { bestFit, buildEdge } from "./band";
import { edgeFailures, edgeMetrics, edgeVerdicts, supplyOverDemand } from "./check";
import { kerbFailures } from "./kerbcheck";
import { BAYS_PER_100M_MAX, BAYS_PER_PARKING_TILE, BAY_TILES_PER_BLOCK_MIN, KERB_BAY_SHARE_MAX, PARK_SUPPLY_BAND, TILE_M } from "./constants";
import { EDGE_LEGEND, EDGE_LEGEND_OF_ROLE, edgeStage } from "./stage";

interface City {
  readonly blocksX: number;
  readonly blocksZ: number;
  readonly seed: number;
  /** One-way streets: on (the default) or off (`oneWayShare` 0). */
  readonly way: "on" | "off";
}
const label = (o: City): string => `${o.blocksX} x ${o.blocksZ} seed ${o.seed} one-way ${o.way}`;
const DEFAULT: City = { blocksX: 6, blocksZ: 6, seed: 1, way: "on" };
const optionsOf = (o: City): { blocksX: number; blocksZ: number; seed: number } => ({ blocksX: o.blocksX, blocksZ: o.blocksZ, seed: o.seed });

function cityOf(o: City): CityPlanRun {
  return sharedCity(o, "edge");
}
interface Layers {
  readonly streets: CityStreetsLayer;
  readonly land: CityLandLayer;
  readonly mass: CityMassLayer;
  readonly edge: CityEdgeLayer;
}
function layersOf(o: City): Layers {
  const r = cityOf(o);
  if (!r.ok) throw new Error(`${label(o)} failed at ${r.failure.stage}: ${r.failure.reason}`);
  const l = r.plan.layers;
  return { streets: l.streets!, land: l.land!, mass: l.mass!, edge: l.edge! };
}
const key = (i: number, j: number): string => `${i},${j}`;
const SIDES = ["-z", "+x", "+z", "-x"] as const;

describe("stage 4, edge, on the named cities", { timeout: 120_000 }, () => {
  it("the default city is the 6 x 6 seed 1 city, and the named runs are 20, the default first", () => {
    expect(NAMED[0]).toEqual(DEFAULT);
    const first = runCity({ blocksX: PLAN_BLOCKS_DEFAULT, blocksZ: PLAN_BLOCKS_DEFAULT }, "edge");
    expect(first.ok).toBe(true);
    expect(first.plan.digests.edge).toBe(cityOf(DEFAULT).plan.digests.edge);
  });

  for (const o of NAMED) {
    describe(label(o), () => {
      it("returns ok, and P1, P3, P4, P5 and P6 hold, with the supply in its band (criterion 8)", () => {
        const r = cityOf(o);
        if (!r.ok) throw new Error(`stage ${r.failure.stage}: ${r.failure.reason}`);
        const { streets, mass, edge } = layersOf(o);
        const m = edgeMetrics(edge, streets, mass, o);
        const verdicts = edgeVerdicts(m);
        // The numbers the report asks for (criterion 8).
        console.log(`D1b ${label(o)}: ${verdicts.map((v) => `${v.id}=${v.id === "P6" ? v.value.toFixed(2) : v.value}`).join(" ")} supply/demand=${supplyOverDemand(m).toFixed(3)} (${m.kerbBays}/${m.bayDemand.toFixed(1)}) blocks short=${edge.blocks.filter((b) => b.shortTiles > 0).length} first null=${edge.blocks.filter((b) => b.first === null).length} cuts=${edge.kerbCuts.length}`);
        expect(edgeFailures(edge, streets, mass, o)).toEqual([]);
        for (const v of verdicts) expect(v.pass, `${v.id} = ${v.value}`).toBe(true);
        expect(supplyOverDemand(m)).toBeGreaterThanOrEqual(PARK_SUPPLY_BAND.lo);
        expect(supplyOverDemand(m)).toBeLessThanOrEqual(PARK_SUPPLY_BAND.hi);
        expect(m.bays100m).toBeLessThanOrEqual(BAYS_PER_100M_MAX);
        expect(m.blocksWithoutBays).toBe(0);
      });

      it("the layer lists every street cell once, in stage 1's order, with the same street and band; only the roles are refined (criterion 5)", () => {
        const { streets, edge } = layersOf(o);
        expect(edge.cells).toHaveLength(streets.cells.length);
        const allowed: Record<string, readonly string[]> = {
          lane: ["lane"],
          junction: ["junction"],
          crossing: ["crossing"],
          pavementCorner: ["pavementCorner"],
          pavement: ["pavement", "kerbCut"],
          parkingPlain: ["parking", "buildout", "parkingPlain"],
        };
        streets.cells.forEach((c, n) => {
          const e = edge.cells[n]!;
          expect([e.i, e.j, e.street, e.band]).toEqual([c.i, c.j, c.street, c.band]);
          expect(allowed[c.role], `${c.role} at (${c.i}, ${c.j})`).toContain(e.role);
          if (c.role === "parkingPlain") expect(e.faces, `(${c.i}, ${c.j})`).not.toBeNull();
          else expect(e.faces).toBeNull();
        });
      });

      it("kerb cuts: every mouth cell of every opening has its cut on the pavement cell in front of it, on any street; a plaza, park or walk-through has none (criterion 7)", () => {
        const { streets, mass, edge } = layersOf(o);
        const roleAt = new Map(edge.cells.map((c) => [key(c.i, c.j), c.role] as const));
        const baseAt = new Map(streets.cells.map((c) => [key(c.i, c.j), c] as const));
        const cutOf = new Map(edge.kerbCuts.map((k) => [key(k.cell.i, k.cell.j), k] as const));
        expect(cutOf.size).toBe(edge.kerbCuts.length);
        let mouthCells = 0;
        const byId = new Map<string, CityOpening>(mass.openings.map((x) => [x.id, x] as const));
        for (const op of mass.openings) {
          if (op.kind === "plaza" || op.kind === "park" || op.kind === "walk") expect(op.mouth, op.id).toEqual([]);
          for (const m of op.mouth) {
            for (const c of m.cells) {
              mouthCells++;
              const near = [
                [1, 0],
                [-1, 0],
                [0, 1],
                [0, -1],
              ]
                .map(([di, dj]) => ({ i: c.i + di!, j: c.j + dj!, di: di!, dj: dj! }))
                .filter((n) => baseAt.get(key(n.i, n.j))?.role === "pavement" && baseAt.get(key(n.i, n.j))?.street === m.street);
              expect(near, `${op.id} mouth cell (${c.i}, ${c.j})`).toHaveLength(1);
              const n = near[0]!;
              const cut = cutOf.get(key(n.i, n.j));
              expect(cut, `${op.id} cut at (${n.i}, ${n.j})`).toBeDefined();
              expect(cut!.opening).toBe(op.id);
              expect(cut!.street).toBe(m.street);
              expect(roleAt.get(key(n.i, n.j))).toBe("kerbCut");
              const beyond = `${n.i + n.di},${n.j + n.dj}`;
              if (cut!.plain === null) expect(baseAt.get(beyond)?.role, `${op.id} beyond`).not.toBe("parkingPlain");
              else {
                expect(key(cut!.plain.i, cut!.plain.j)).toBe(beyond);
                expect(baseAt.get(beyond)?.role).toBe("parkingPlain");
                // the parking cell in front of a cut stays plain: never a bay, never a build-out
                expect(roleAt.get(beyond), `${op.id} plain`).toBe("parkingPlain");
              }
            }
          }
        }
        expect(edge.kerbCuts).toHaveLength(mouthCells);
        for (const k of edge.kerbCuts) expect(byId.get(k.opening)!.mouth.length).toBeGreaterThan(0);
        expect(edge.cells.filter((c) => c.role === "kerbCut")).toHaveLength(mouthCells);
        // a bare one-way street has no band: none of its cells is a bay, a build-out or plain parking
        const bare = new Set(streets.streets.filter((s) => s.section === "oneWayBare").map((s) => s.id));
        for (const c of edge.cells) if (c.street !== null && bare.has(c.street)) expect(["parking", "buildout", "parkingPlain"], `bare ${c.street} (${c.i}, ${c.j})`).not.toContain(c.role);
        for (const t of edge.tiles) expect(bare.has(t.street)).toBe(false);
      });

      it("the parking band: every parking-band cell is half a tile, a build-out, or plain in front of a cut or on an edge street's outer side; three bays a tile; build-out trees on build-outs (criteria 2 and 3)", () => {
        const { streets, edge } = layersOf(o);
        const roleAt = new Map(edge.cells.map((c) => [key(c.i, c.j), c.role] as const));
        const cutPlain = new Set(edge.kerbCuts.filter((k) => k.plain !== null).map((k) => key(k.plain!.i, k.plain!.j)));
        expect(edge.bays).toHaveLength(edge.tiles.length * BAYS_PER_PARKING_TILE);
        const inTile = new Set<string>();
        for (const t of edge.tiles) {
          for (const c of t.cells) {
            expect(roleAt.get(key(c.i, c.j))).toBe("parking");
            expect(inTile.has(key(c.i, c.j))).toBe(false);
            inTile.add(key(c.i, c.j));
          }
          expect(t.block).not.toBe("outer");
        }
        expect(edge.cells.filter((c) => c.role === "parking")).toHaveLength(inTile.size);
        for (const c of edge.cells) {
          if (c.faces === null) continue;
          if (c.role === "parkingPlain") expect(c.faces === "outer" || cutPlain.has(key(c.i, c.j)), `plain (${c.i}, ${c.j})`).toBe(true);
          if (c.faces === "outer") expect(c.role, `outer (${c.i}, ${c.j})`).toBe("parkingPlain");
        }
        // every build-out tree stands on a build-out, away from a crossing
        for (const t of edge.buildoutTrees) {
          expect(roleAt.get(key(t.cell.i, t.cell.j))).toBe("buildout");
          expect(t.x_m).toBeCloseTo((t.cell.i + 0.5) * TILE_M, 6);
          expect(t.z_m).toBeCloseTo((t.cell.j + 0.5) * TILE_M, 6);
        }
        expect(streets.streets.length).toBeGreaterThan(0);
      });

      it("the outer side of an edge street is found from `outer`: its parking cells stay plain and face outer, in no band state (criterion 2)", () => {
        const { streets, edge } = layersOf(o);
        const faces = new Map(edge.cells.map((c) => [key(c.i, c.j), c] as const));
        let outerCells = 0;
        for (const c of edge.cells) {
          if (c.faces !== "outer") continue;
          outerCells++;
          const s = streets.streets.find((x) => x.id === c.street)!;
          expect(s.outer, `${c.street}`).not.toBeNull();
          expect(c.role).toBe("parkingPlain");
        }
        // every edge street has parking cells that face outer, wherever it has a parking band on its outer side
        expect(outerCells).toBeGreaterThan(0);
        expect(faces.size).toBe(edge.cells.length);
      });

      it("every block is listed once with its quota from mass.units; none is short; its first tile is laid (criteria 8, 12)", () => {
        const { streets, mass, edge } = layersOf(o);
        expect(edge.blocks.map((b) => b.block)).toEqual(streets.blocks.map((b) => b.id));
        const shops = new Map(mass.units.map((u) => [u.block, u.shops] as const));
        const serving = new Map<string, number>();
        for (const t of edge.tiles) serving.set(t.serves, (serving.get(t.serves) ?? 0) + 1);
        for (const b of edge.blocks) {
          expect(b.wanted).toBe(Math.max(BAY_TILES_PER_BLOCK_MIN, Math.round(((shops.get(b.block) ?? 0) * (1 / 3)) / BAYS_PER_PARKING_TILE)));
          expect(serving.get(b.block) ?? 0).toBe(b.wanted - b.shortTiles);
          expect(b.first, b.block).not.toBeNull();
        }
      });

      it("the bands come from the block sides: the cells facing a block on a side's street are exactly the stretches its `across` entries span, so a T's far side has a gap with none (criterion 1)", () => {
        const { streets, edge } = layersOf(o);
        const facing = new Map<string, Set<number>>();
        for (const c of edge.cells) {
          if (c.faces === null || c.faces === "outer") continue;
          const s = streets.streets.find((x) => x.id === c.street)!;
          const k = `${c.faces}|${c.street}`;
          if (!facing.has(k)) facing.set(k, new Set());
          facing.get(k)!.add(s.axis === "x" ? c.i : c.j);
        }
        for (const b of streets.blocks) {
          for (const name of SIDES) {
            const side = b.sides[name];
            const got = facing.get(`${b.id}|${side.street}`) ?? new Set<number>();
            if (got.size === 0) continue; // the street has no parking band on this block's side
            const want = new Set<number>();
            const spans = side.across.length === 0 ? [side.span] : side.across.map((e) => e.span);
            for (const sp of spans) for (let a = sp.lo; a < sp.hi; a++) want.add(a);
            expect([...got].sort((p, q) => p - q), `${b.id} ${name}`).toEqual([...want].sort((p, q) => p - q));
          }
        }
      });

      it("P3's cap is the block side's: the tiles on all the stretches of one side never exceed floor(share x length / 2) (criterion 4)", () => {
        const { streets, edge } = layersOf(o);
        const profile = new Map(streets.streets.map((s) => [s.id, s.profile] as const));
        for (const b of streets.blocks) {
          for (const name of SIDES) {
            const side = b.sides[name];
            const len = side.span.hi - side.span.lo;
            const cap = Math.floor((KERB_BAY_SHARE_MAX[profile.get(side.street)!] * len) / 2 + 1e-9);
            const on = edge.tiles.filter((t) => t.block === b.id && t.street === side.street).length;
            expect(on, `${b.id} ${name}`).toBeLessThanOrEqual(cap);
          }
        }
      });

      it("a whole park's own kerb takes at most one tile, nothing else uses it, and it takes one only where nothing across served it (criterion 13)", () => {
        const { land, edge } = layersOf(o);
        for (const p of land.parks.filter((x) => x.kind === "whole")) {
          const mine = edge.blocks.find((b) => b.block === p.block)!;
          const onIt = edge.tiles.filter((t) => t.block === p.block);
          expect(onIt.every((t) => t.serves === p.block), `${p.block}: only the park's own tile`).toBe(true);
          expect(onIt.length, p.block).toBeLessThanOrEqual(1);
          expect(mine.first, p.block).not.toBeNull();
          expect(onIt.length === 1, p.block).toBe(mine.first === "own");
          if (mine.first === "across") expect(edge.tiles.some((t) => t.serves === p.block && t.block !== p.block), p.block).toBe(true);
        }
      });

      it("the picture: the lattice's size, every index in the legend, each cell matches the layer (R-5)", () => {
        const { streets, edge } = layersOf(o);
        const r = cityOf(o);
        const pic = edgeStage.picture(r.plan);
        expect(pic.stage).toBe("edge");
        expect(pictureProblems(pic, streets.w, streets.h)).toEqual([]);
        // (a dropped kerb, D2, is a pavement cell the picture marks with its own legend entry: see kerb.test.ts)
        const dropped = new Set((edge.ground ?? []).filter((g) => (g.variant & CITY_GROUND_VARIANT.pavementDip) !== 0).map((g) => key(g.i, g.j)));
        for (const c of edge.cells) expect(pic.cells[c.j * streets.w + c.i]).toBe(dropped.has(key(c.i, c.j)) ? EDGE_LEGEND.findIndex((e) => e.name === "dropped kerb") : EDGE_LEGEND_OF_ROLE[c.role]);
        for (const b of streets.blocks) for (let j = b.j0; j < b.j1; j++) for (let i = b.i0; i < b.i1; i++) expect(pic.cells[j * streets.w + i]).toBe(0);
        // the points: a tree on each build-out tree, and (D2) one per return's end
        expect(pic.points).toHaveLength(edge.buildoutTrees.length + edge.kerb!.reduce((n, p) => n + p.returns.length, 0));
      });
    });
  }

  it("the named runs include one-way streets with kerb cuts on them, and a bare one-way street with no band (criterion 7)", () => {
    let onOneWay = 0;
    let bare = 0;
    for (const o of NAMED.filter((x) => x.way === "on")) {
      const { streets, edge } = layersOf(o);
      const one = new Set(streets.streets.filter((s) => s.section === "oneWay").map((s) => s.id));
      onOneWay += edge.kerbCuts.filter((k) => one.has(k.street)).length;
      bare += streets.streets.filter((s) => s.section === "oneWayBare").length;
    }
    expect(onOneWay).toBeGreaterThan(0);
    expect(bare).toBeGreaterThan(0);
  });

  it("some block side has two stretches (a T's far side), and the bands on them share one cap (criteria 1 and 4)", () => {
    let twoStretch = 0;
    let shared = 0;
    // tiles on a stretch under 7 cells whose own cap floor(share x stretchLen / 2) would be 0: they can exist only if the cap counts over the whole side
    let onZeroCapStretch = 0;
    for (const o of NAMED) {
      const { streets, edge } = layersOf(o);
      const street = new Map(streets.streets.map((s) => [s.id, s] as const));
      for (const b of streets.blocks) {
        for (const name of SIDES) {
          const side = b.sides[name];
          const st = street.get(side.street)!;
          for (const e of side.across) {
            const own = Math.floor((KERB_BAY_SHARE_MAX[st.profile] * (e.span.hi - e.span.lo)) / 2 + 1e-9);
            if (own !== 0) continue;
            onZeroCapStretch += edge.tiles.filter((t) => {
              if (t.block !== b.id || t.street !== side.street) return false;
              const a = st.axis === "x" ? t.cells[0]!.i : t.cells[0]!.j;
              return a >= e.span.lo && a < e.span.hi;
            }).length;
          }
          if (side.across.length < 2) continue;
          const hit = side.across.map((e) => edge.tiles.filter((t) => t.block === b.id && t.street === side.street && (t.cells[0]!.i >= e.span.lo && t.cells[0]!.i < e.span.hi || t.cells[0]!.j >= e.span.lo && t.cells[0]!.j < e.span.hi)).length);
          twoStretch++;
          if (hit.filter((n) => n > 0).length >= 2) shared++;
        }
      }
    }
    expect(twoStretch).toBeGreaterThan(0);
    expect(onZeroCapStretch, "a tile on a stretch whose own per-stretch cap would be 0 (criterion 4: the cap counts over the whole block side)").toBeGreaterThan(0);
    console.log(`D1b: ${twoStretch} block sides with two or more stretches on the named runs, ${shared} of them with tiles on two stretches`);
  });

  it("the layers are frozen once the stage returns (R-1), and the earlier layers' digests are the standard run's with a test double for edge (R-4)", () => {
    const o = NAMED[0]!;
    const r = cityOf(o);
    const edge = layersOf(o).edge;
    expect(Object.isFrozen(edge)).toBe(true);
    expect(Object.isFrozen(edge.tiles)).toBe(true);
    expect(Object.isFrozen(edge.kerbCuts)).toBe(true);
    const double = {
      name: "edge",
      run: () => ({ stage: "edge", cells: [], kerbCuts: [], tiles: [], bays: [], buildoutTrees: [], blocks: [] }),
      picture: edgeStage.picture,
    } as unknown as CityStageDef;
    const d = runCity(optionsOf(o), "edge", [streetsStage as CityStageDef, landStage as CityStageDef, massStage as CityStageDef, double]);
    expect(d.ok).toBe(true);
    expect(d.plan.digests.streets).toBe(r.plan.digests.streets);
    expect(d.plan.digests.land).toBe(r.plan.digests.land);
    expect(d.plan.digests.mass).toBe(r.plan.digests.mass);
    expect(d.plan.digests.edge).not.toBe(r.plan.digests.edge);
  });

  it("the digest pins (R-4), moved by D1b (the split plan, the side-list bands, the cap per side, P1's floor, M, PB, the 6 x 6 named cities) and again by D2 (`ground` and `kerb` added to the layer; the streets', land's and mass's pins do not move): 6 x 6 seeds 1 (the default), 2, 3 and 8, one-way on", () => {
    const PINS: [number, string][] = [
      [1, "ac7cc850"],
      [2, "cb9855be"],
      [3, "d0e043ef"],
      [8, "7507ba04"],
    ];
    for (const [seed, pin] of PINS) expect(cityOf({ blocksX: 6, blocksZ: 6, seed, way: "on" }).plan.digests.edge, `seed ${seed}`).toBe(pin);
    // D2 moved edge's pins only: the three layers before it are as they were (D1b's pins, kept by their own stages' tests)
    const r = cityOf({ blocksX: 6, blocksZ: 6, seed: 1, way: "on" });
    expect(Object.keys(r.plan.digests)).toEqual(["streets", "land", "mass", "edge"]);
  });

  it("the stage always writes `ground` and `kerb` (D2, R-2): both are in every named run's layer, and a layer cut of either fails the stage's own check", () => {
    for (const o of NAMED) {
      const { edge, streets, mass } = layersOf(o);
      expect(edge.ground, label(o)).toBeDefined();
      expect(edge.kerb, label(o)).toBeDefined();
      expect(edge.ground!.length).toBe(edge.cells.length - edge.tiles.length);
      expect(kerbFailures(edge, streets, mass)).toEqual([]);
    }
  });

  it("the same city twice gives the same digest, and another seed another (R-3)", () => {
    const a = runCity({ blocksX: 6, blocksZ: 6, seed: 2 }, "edge");
    expect(a.plan.digests.edge).toBe(cityOf({ blocksX: 6, blocksZ: 6, seed: 2, way: "on" }).plan.digests.edge);
    expect(a.plan.digests.edge).not.toBe(cityOf({ blocksX: 6, blocksZ: 6, seed: 3, way: "on" }).plan.digests.edge);
  });

  it("the pre-check's park cases take their one tile on their own kerb (criterion 13): 6 x 6 seed 7 off (block 0:1), seed 3 on (4:2), seed 8 on (5:9, 5:11)", () => {
    const own = (seed: number, way: "on" | "off"): string[] =>
      layersOf({ blocksX: 6, blocksZ: 6, seed, way })
        .land.parks.filter((p) => p.kind === "whole")
        .map((p) => p.block)
        .filter((id) => layersOf({ blocksX: 6, blocksZ: 6, seed, way }).edge.blocks.find((b) => b.block === id)!.first === "own");
    expect(own(7, "off")).toContain("block:0:1");
    expect(own(3, "on")).toContain("block:4:2");
    expect(own(8, "on")).toEqual(expect.arrayContaining(["block:5:9", "block:5:11"]));
  });

  it("R-6: every file of edge imports only src/core and src/city (the pipeline's helpers and its own files), and none reads a clock, the DOM or Math.random", () => {
    for (const f of ["band.ts", "check.ts", "stage.ts", "constants.ts", "ground.ts", "kerbline.ts", "kerbcheck.ts", "index.ts"]) {
      const src = readFileSync(fileURLToPath(new URL(`./${f}`, import.meta.url)), "utf8");
      for (const m of src.matchAll(/from\s+"([^"]+)"/g)) {
        const path = m[1]!;
        expect(path.startsWith("./") || path === "../../core" || path.startsWith("../pipeline/"), `${f} imports ${path}`).toBe(true);
      }
      const code = src
        .split("\n")
        .filter((l) => !l.trim().startsWith("//") && !l.trim().startsWith("*") && !l.trim().startsWith("/*"))
        .join("\n");
      expect(code, f).not.toMatch(/Math\.random|Date\.now|performance\.now|\bdocument\b|\bwindow\b/);
    }
  });

  it("the grid lookups are gone: edge's code reads no block's rank fields and no street's line (criterion 9)", () => {
    for (const f of ["band.ts", "check.ts", "stage.ts", "constants.ts", "ground.ts", "kerbline.ts", "kerbcheck.ts"]) {
      const src = readFileSync(fileURLToPath(new URL(`./${f}`, import.meta.url)), "utf8");
      const code = src
        .split("\n")
        .filter((l) => !l.trim().startsWith("//") && !l.trim().startsWith("*") && !l.trim().startsWith("/*"))
        .join("\n");
      expect(code, f).not.toMatch(/\.(bi|bj|line)\b/);
      expect(code, f).not.toMatch(/\b(colsOf|rowsOf|blockIdAt|alongOf)\b/);
    }
  });
});

describe("P1 to P6's checks read the side list (criteria 5 and 8)", { timeout: 120_000 }, () => {
  it("P1 = 1 when one block's only serving tile is removed from the default city's edge layer", () => {
    const o = DEFAULT;
    const { streets, mass, edge } = layersOf(o);
    expect(edgeVerdicts(edgeMetrics(edge, streets, mass, o)).find((v) => v.id === "P1")!.value).toBe(0);
    const count = new Map<string, number>();
    for (const t of edge.tiles) count.set(t.serves, (count.get(t.serves) ?? 0) + 1);
    const only = edge.tiles.find((t) => count.get(t.serves) === 1);
    expect(only, "a block with exactly one serving tile").toBeDefined();
    const at = edge.tiles.indexOf(only!);
    const gone = new Set(only!.cells.map((c) => key(c.i, c.j)));
    const cut: CityEdgeLayer = {
      ...edge,
      tiles: edge.tiles.filter((t) => t !== only),
      bays: edge.bays.filter((_, n) => Math.floor(n / BAYS_PER_PARKING_TILE) !== at),
      cells: edge.cells.map((c) => (gone.has(key(c.i, c.j)) ? { ...c, role: "buildout" as const } : c)),
    };
    expect(cut.bays).toHaveLength(edge.bays.length - BAYS_PER_PARKING_TILE);
    const p1 = edgeVerdicts(edgeMetrics(cut, streets, mass, o)).find((v) => v.id === "P1")!;
    expect(p1.value).toBe(1);
    expect(p1.pass).toBe(false);
    expect(edgeFailures(cut, streets, mass, o)[0]!.reason.startsWith("P1:")).toBe(true);
  });

  it("`adjacent` reads the side list: a bay serving a block listed across the street is not far; one serving an unrelated block is", () => {
    const o = DEFAULT;
    const { streets, mass, edge } = layersOf(o);
    const base = edgeMetrics(edge, streets, mass, o).bayServedFar;
    expect(base).toBe(0);
    const bay = edge.bays.find((b) => b.block !== "outer")!;
    const host: CityPlanBlock = streets.blocks.find((b) => b.id === bay.block)!;
    const across = new Set<string>();
    for (const n of SIDES) for (const e of host.sides[n].across) across.add(e.block);
    const near = [...across][0]!;
    const unrelated = streets.blocks.find((b) => b.id !== host.id && !across.has(b.id) && !b.sides["-x"].across.concat(b.sides["+x"].across, b.sides["-z"].across, b.sides["+z"].across).some((e) => e.block === host.id))!;
    const withServes = (serves: string): CityEdgeLayer => ({ ...edge, bays: edge.bays.map((b) => (b === bay ? { ...b, serves } : b)) });
    expect(edgeMetrics(withServes(near), streets, mass, o).bayServedFar).toBe(0);
    expect(edgeMetrics(withServes(unrelated.id), streets, mass, o).bayServedFar).toBe(1);
  });

  it("the band scan runs only inside each street's own span: a street that ends in a T counts no bad band cell beyond it, on every named run", () => {
    let ending = 0;
    for (const o of NAMED) {
      const { streets, mass, edge } = layersOf(o);
      for (const s of streets.streets) if (s.span.hi - s.span.lo < (s.axis === "x" ? streets.w : streets.h)) ending++;
      expect(edgeMetrics(edge, streets, mass, o).badBandCells, label(o)).toBe(0);
    }
    expect(ending).toBeGreaterThan(0);
  });
});

describe("the first pass as a best fit (criterion 12)", () => {
  it("(a) block A (candidates Y, then Z) before block B (candidate Y only), each band with room for one tile: with M, A takes Z and B takes Y", () => {
    // states: 0 = Y, 1 = Z; each on its own side with cap 1
    const m = bestFit([[0, 1], [0]], [1, 1], [0, 1], [1, 1]);
    expect(m).toEqual([1, 0]);
    // block by block, A would take Y and B would get none
    const sequential = ((): (number | null)[] => {
      const left = [1, 1];
      return [[0, 1], [0]].map((cs) => {
        for (const s of cs) if (left[s]! > 0) return (left[s]!--, s);
        return null;
      });
    })();
    expect(sequential).toEqual([0, null]);
  });

  it("(b) where every block's own band has room, each takes its own band before any across, and own bands are taken in the candidate order", () => {
    // block 0: own 0, across 2; block 1: own 1, across 2 (state 2 has room for both, but own comes first)
    expect(bestFit([[0, 2], [1, 2]], [1, 1, 2], [0, 1, 2], [1, 1, 2])).toEqual([0, 1]);
    // two own bands: the first in the list wins
    expect(bestFit([[0, 1]], [1, 1], [0, 1], [1, 1])).toEqual([0]);
  });

  it("(c) a block with no candidate gets null, and the others are still served", () => {
    expect(bestFit([[], [0]], [1], [0], [1])).toEqual([null, 0]);
  });

  it("the side's cap holds all its states together, and a state with no room takes nobody", () => {
    // two states on one side with cap 1 in all: only one of two blocks is served
    expect(bestFit([[0], [1]], [1, 1], [0, 0], [1]).filter((x) => x !== null)).toHaveLength(1);
    // a state with capacity 0 (a side too short for a tile) serves nobody
    expect(bestFit([[0]], [0], [0], [1])).toEqual([null]);
  });

  it("a whole park whose only server is a short side across (cap 0) takes its tile on its own band; with room across it takes it there and none on its own (criterion 13)", () => {
    // candidates: the band across (state 0), then the park's own kerb (state 1)
    expect(bestFit([[0, 1]], [0, 1], [0, 1], [0, 1])).toEqual([1]);
    expect(bestFit([[0, 1]], [1, 1], [0, 1], [1, 1])).toEqual([0]);
    expect(Math.floor((KERB_BAY_SHARE_MAX.street * 6) / 2)).toBe(0);
  });

  it("it is a maximum matching: on 300 typed-in random small instances no assignment serves more blocks, and every capacity holds", () => {
    let seed = 12345;
    const rnd = (n: number): number => {
      seed = (seed * 1103515245 + 12345) & 0x7fffffff;
      return seed % n;
    };
    for (let round = 0; round < 300; round++) {
      const B = 1 + rnd(5);
      const S = 1 + rnd(4);
      const T = 1 + rnd(3);
      const stateSide = Array.from({ length: S }, () => rnd(T));
      const stateCap = Array.from({ length: S }, () => rnd(3));
      const sideCap = Array.from({ length: T }, () => rnd(3));
      const cands = Array.from({ length: B }, () => [...new Set(Array.from({ length: rnd(4) }, () => rnd(S)))]);
      const got = bestFit(cands, stateCap, stateSide, sideCap);
      const load = new Array<number>(S).fill(0);
      const sload = new Array<number>(T).fill(0);
      got.forEach((s, b) => {
        if (s === null) return;
        expect(cands[b]).toContain(s);
        load[s]!++;
        sload[stateSide[s]!]!++;
      });
      load.forEach((l, s) => expect(l).toBeLessThanOrEqual(stateCap[s]!));
      sload.forEach((l, t) => expect(l).toBeLessThanOrEqual(sideCap[t]!));
      const best = (b: number, l: number[], sl: number[]): number => {
        if (b === B) return 0;
        let r = best(b + 1, l, sl);
        for (const s of cands[b]!) {
          if (l[s]! < stateCap[s]! && sl[stateSide[s]!]! < sideCap[stateSide[s]!]!) {
            l[s]!++;
            sl[stateSide[s]!]!++;
            r = Math.max(r, 1 + best(b + 1, l, sl));
            l[s]!--;
            sl[stateSide[s]!]!--;
          }
        }
        return r;
      };
      expect(got.filter((x) => x !== null).length, `round ${round}`).toBe(best(0, new Array<number>(S).fill(0), new Array<number>(T).fill(0)));
    }
  });
});

describe("the failing and first-pass fixtures (criterion 12 (c))", { timeout: 120_000 }, () => {
  it("a block whose own bands and across bands are all full gets no first tile, the layer is still built, and nothing throws", () => {
    // A 1 x 1 city: the block has four own bands and no neighbour. Typed-in drives on every building-line cell put a cut, and a plain cell, in front of every band cell.
    const r = runCity({ blocksX: 1, blocksZ: 1, seed: 1 }, "streets");
    expect(r.ok).toBe(true);
    const streets = r.plan.layers.streets!;
    const b: CityBlock = streets.blocks[0]!;
    const side = (id: string, street: string, cells: { i: number; j: number }[]): CityOpening => ({ id: `${b.id}/fx/${id}`, kind: "drive", block: b.id, cells, mouth: [{ street, cells }] });
    const row = (j: number): { i: number; j: number }[] => Array.from({ length: b.i1 - b.i0 }, (_, n) => ({ i: b.i0 + n, j }));
    const col = (i: number): { i: number; j: number }[] => Array.from({ length: b.j1 - b.j0 }, (_, n) => ({ i, j: b.j0 + n }));
    const sideStreet = (name: "-z" | "+z" | "-x" | "+x"): string => (streets.blocks[0] as CityPlanBlock).sides[name].street;
    const mass: CityMassLayer = {
      stage: "mass",
      cells: [],
      built: [],
      openings: [side("top", sideStreet("-z"), row(b.j0)), side("bottom", sideStreet("+z"), row(b.j1 - 1)), side("left", sideStreet("-x"), col(b.i0)), side("right", sideStreet("+x"), col(b.i1 - 1))],
      courts: [],
      units: [{ block: b.id, columns: 0, shops: 30, homes: 0, lotsWanted: 0, lots: 0, stallsShort: 0 }],
    };
    const land: CityLandLayer = { stage: "land", blocks: [], parts: [], lanes: [], parks: [] };
    const e = buildEdge(streets, land, mass, { blocksX: 1, blocksZ: 1, seed: 1 }, stageRand("edge", 1));
    expect(e.tiles).toHaveLength(0);
    expect(e.blocks).toEqual([{ block: b.id, wanted: Math.round(30 / 3 / 3), first: null, shortTiles: Math.round(30 / 3 / 3) }]);
    expect(e.kerbCuts).toHaveLength(2 * (b.i1 - b.i0) + 2 * (b.j1 - b.j0));
    // the short block is recorded, not thrown on (D1 criterion 2); the stage is run on it below
    const fixtureMass = { name: "mass", run: () => mass, picture: massStage.picture } as unknown as CityStageDef;
    const fixtureLand = { name: "land", run: () => land, picture: landStage.picture } as unknown as CityStageDef;
    const run = runCity({ blocksX: 1, blocksZ: 1, seed: 1 }, "edge", [streetsStage as CityStageDef, fixtureLand, fixtureMass, edgeStage as CityStageDef]);
    // D2: this typed-in mass has drives along every whole side and no built cell beside any of them, so no return has a wall plane to end on: the stage stops on that rule (D2's), and never on P1 (the short block is recorded, not thrown on)
    expect(run.ok ? "" : run.failure.reason).toMatch(/^return ends on the wall plane/);
    expect(e.blocks[0]?.first).toBeNull();
    // and P1 says so, from the layer, while the stage's own failure list lets the short block through
    expect(edgeFailures(e, streets, mass, { blocksX: 1, blocksZ: 1 }, true).filter((f) => f.id === "P1")).toHaveLength(0);
    expect(edgeFailures(e, streets, mass, { blocksX: 1, blocksZ: 1 }).some((f) => f.id === "P1")).toBe(true);
    expect(edgeVerdicts(edgeMetrics(e, streets, mass, { blocksX: 1, blocksZ: 1 })).find((v) => v.id === "P1")!.value).toBeGreaterThan(0);
  });

  it("the legend names the eight kinds of 18.5 and the cut (criterion 5)", () => {
    const names = EDGE_LEGEND.map((e) => e.name);
    for (const n of ["bay", "build-out", "plain", "kerb cut", "pavement", "crossing", "junction", "lane"]) expect(names).toContain(n);
  });
});
