/**
 * Stage 4, section D1, on the named cities (default 3 x 3 seed 1, 3 x 3 seeds 1 to 10, 6 x 4 seeds 1 to 3): the kerb cuts, the parking band with its first pass, the build-outs and trees, P1, P3 to P6, the supply band,
 * the picture, the digest pins and R-1 to R-7 (the kerb line is D2's). HEAVY: each city is built once, through a module-level cache.
 *
 * R-2: the stage returns ok on all 13 named cities. Nothing is loosened and no city is pinned.
 */
import { describe, expect, it } from "vitest";
import type { CityBlock, CityEdgeLayer, CityLandLayer, CityMassLayer, CityOpening, CityPlanRun, CityStreetsLayer } from "../../core";
import { pictureProblems } from "../pipeline/picture";
import { stageRand } from "../pipeline/seeds";
import type { CityStageDef } from "../pipeline/types";
import { landStage } from "../land/stage";
import { massStage } from "../mass/stage";
import { runCity } from "../stages";
import { streetsStage } from "../streets/stage";
import { buildEdge } from "./band";
import { edgeFailures, edgeMetrics, edgeVerdicts, supplyOverDemand } from "./check";
import { BAYS_PER_100M_MAX, BAYS_PER_PARKING_TILE, BAY_TILES_PER_BLOCK_MIN, PARK_SUPPLY_BAND, TILE_M } from "./constants";
import { EDGE_LEGEND, EDGE_LEGEND_OF_ROLE, edgeStage } from "./stage";

interface City {
  readonly blocksX: number;
  readonly blocksZ: number;
  readonly seed: number;
}
const NAMED: City[] = [];
for (let seed = 1; seed <= 10; seed++) NAMED.push({ blocksX: 3, blocksZ: 3, seed });
for (let seed = 1; seed <= 3; seed++) NAMED.push({ blocksX: 6, blocksZ: 4, seed });
const label = (o: City): string => `${o.blocksX} x ${o.blocksZ} seed ${o.seed}`;

const cache = new Map<string, CityPlanRun>();
function cityOf(o: City): CityPlanRun {
  const k = `${o.blocksX}x${o.blocksZ}:${o.seed}`;
  if (!cache.has(k)) cache.set(k, runCity(o, "edge"));
  return cache.get(k)!;
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

describe("stage 4, edge, on the named cities", { timeout: 120_000 }, () => {
  it("the default city is the 3 x 3 seed 1 city, and the named cities are 13", () => {
    expect(NAMED).toHaveLength(13);
    const first = runCity({}, "edge");
    expect(first.ok).toBe(true);
    expect(first.plan.digests.edge).toBe(cityOf({ blocksX: 3, blocksZ: 3, seed: 1 }).plan.digests.edge);
  });

  for (const o of NAMED) {
    describe(label(o), () => {
      it("returns ok, and P1, P3, P4, P5 and P6 hold, with the supply in its band (criterion 4)", () => {
        const r = cityOf(o);
        if (!r.ok) throw new Error(`stage ${r.failure.stage}: ${r.failure.reason}`);
        const { streets, mass, edge } = layersOf(o);
        const m = edgeMetrics(edge, streets, mass, o);
        const verdicts = edgeVerdicts(m);
        // The numbers the report asks for (criterion 4).
        console.log(`D1 ${label(o)}: ${verdicts.map((v) => `${v.id}=${v.id === "P6" ? v.value.toFixed(2) : v.value}`).join(" ")} supply/demand=${supplyOverDemand(m).toFixed(3)} (${m.kerbBays}/${m.bayDemand.toFixed(1)}) cuts=${edge.kerbCuts.length}`);
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

      it("kerb cuts: every mouth cell of every opening has its cut on the pavement cell in front of it; a plaza, park or walk-through has none (criterion 1)", () => {
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

      it("every block is listed once with its quota from mass.units; none is short; its first tile is laid (criterion 2)", () => {
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

      it("the picture: the lattice's size, every index in the legend, each cell matches the layer (R-5)", () => {
        const { streets, edge } = layersOf(o);
        const r = cityOf(o);
        const pic = edgeStage.picture(r.plan);
        expect(pic.stage).toBe("edge");
        expect(pictureProblems(pic, streets.w, streets.h)).toEqual([]);
        const listed = new Set<number>();
        for (const c of edge.cells) {
          listed.add(c.j * streets.w + c.i);
          expect(pic.cells[c.j * streets.w + c.i]).toBe(EDGE_LEGEND_OF_ROLE[c.role]);
        }
        for (const b of streets.blocks) for (let j = b.j0; j < b.j1; j++) for (let i = b.i0; i < b.i1; i++) expect(pic.cells[j * streets.w + i]).toBe(0);
        expect(pic.points).toHaveLength(edge.buildoutTrees.length);
      });
    });
  }

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
    const d = runCity(o, "edge", [streetsStage as CityStageDef, landStage as CityStageDef, massStage as CityStageDef, double]);
    expect(d.ok).toBe(true);
    expect(d.plan.digests.streets).toBe(r.plan.digests.streets);
    expect(d.plan.digests.land).toBe(r.plan.digests.land);
    expect(d.plan.digests.mass).toBe(r.plan.digests.mass);
    expect(d.plan.digests.edge).not.toBe(r.plan.digests.edge);
  });

  it("the digest pins (R-4): the default city, 3 x 3 seeds 2 and 3, and 6 x 4 seed 1 (re-taken by D2)", () => {
    const PINS: [City, string][] = [
      [{ blocksX: 3, blocksZ: 3, seed: 1 }, "7a560cbf"],
      [{ blocksX: 3, blocksZ: 3, seed: 2 }, "14712633"],
      [{ blocksX: 3, blocksZ: 3, seed: 3 }, "4e6d0877"],
      [{ blocksX: 6, blocksZ: 4, seed: 1 }, "1ba13994"],
    ];
    for (const [o, pin] of PINS) expect(cityOf(o).plan.digests.edge, label(o)).toBe(pin);
  });

  it("the same city twice gives the same digest, and another seed another (R-3)", () => {
    const a = runCity({ blocksX: 3, blocksZ: 3, seed: 2 }, "edge");
    expect(a.plan.digests.edge).toBe(cityOf({ blocksX: 3, blocksZ: 3, seed: 2 }).plan.digests.edge);
    expect(a.plan.digests.edge).not.toBe(cityOf({ blocksX: 3, blocksZ: 3, seed: 3 }).plan.digests.edge);
  });

  it("6 x 6 (R-7): the run ends ok or with a failure, never an uncaught error", () => {
    const r = runCity({ blocksX: 6, blocksZ: 6, seed: 1 }, "edge");
    if (r.ok) expect(r.plan.layers.edge?.stage).toBe("edge");
    else expect(r.failure.reason.length).toBeGreaterThan(0);
    if (!r.ok) expect(r.failure.reason.startsWith("bug:")).toBe(false);
  });
});

describe("the failing and first-pass fixtures (criteria 2 and 4)", { timeout: 120_000 }, () => {
  const o: City = { blocksX: 3, blocksZ: 3, seed: 1 };

  it("P1 = 1 when one block's only serving tile is removed from the default city's edge layer", () => {
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

  it("the first pass gives the four-sided centre block a tile when its neighbours' quotas overflow onto its bands", () => {
    const { streets, land, mass } = layersOf(o);
    const centre = "block:1:1";
    const big: CityMassLayer = { ...mass, units: mass.units.map((u) => (u.block === centre ? u : { ...u, shops: 600 })) };
    const e = buildEdge(streets, land, big, o, stageRand("edge", o.seed));
    const kerb = streets.blocks.reduce((n, b) => n + 2 * (b.i1 - b.i0 + b.j1 - b.j0) * TILE_M, 0);
    const cap = Math.floor((BAYS_PER_100M_MAX * kerb) / 100 + 1e-9);
    // the neighbours ask for far more than the bands around them hold, so they overflow onto the centre block's own bands (where it comes last in the greedy order); the first pass served it before
    expect(e.tiles.filter((t) => t.block === centre && t.serves !== centre).length).toBeGreaterThanOrEqual(1);
    const mine = e.blocks.find((b) => b.block === centre)!;
    expect(mine.first).toBe("own");
    expect(e.tiles.filter((t) => t.serves === centre).length).toBeGreaterThanOrEqual(1);
    // the tile counts against the city's cap like any other
    expect(e.bays.length).toBeLessThanOrEqual(cap);
    // every block got its first tile in the first pass
    for (const b of e.blocks) expect(b.first, b.block).not.toBeNull();
  });

  it("a block whose own bands and across bands are all full gets no first tile, the layer is still built, and nothing throws", () => {
    // A 1 x 1 city: the block has four own bands and no neighbour. Typed-in drives on every building-line cell put a cut, and a plain cell, in front of every band cell.
    const r = runCity({ blocksX: 1, blocksZ: 1, seed: 1 }, "streets");
    expect(r.ok).toBe(true);
    const streets = r.plan.layers.streets!;
    const b: CityBlock = streets.blocks[0]!;
    const side = (id: string, street: string, cells: { i: number; j: number }[]): CityOpening => ({ id: `${b.id}/fx/${id}`, kind: "drive", block: b.id, cells, mouth: [{ street, cells }] });
    const row = (j: number): { i: number; j: number }[] => Array.from({ length: b.i1 - b.i0 }, (_, n) => ({ i: b.i0 + n, j }));
    const col = (i: number): { i: number; j: number }[] => Array.from({ length: b.j1 - b.j0 }, (_, n) => ({ i, j: b.j0 + n }));
    const mass: CityMassLayer = {
      stage: "mass",
      cells: [],
      built: [],
      openings: [side("top", "x:0", row(b.j0)), side("bottom", "x:1", row(b.j1 - 1)), side("left", "z:0", col(b.i0)), side("right", "z:1", col(b.i1 - 1))],
      courts: [],
      units: [{ block: b.id, columns: 0, shops: 30, homes: 0, lotsWanted: 0, lots: 0, stallsShort: 0 }],
    };
    const land: CityLandLayer = { stage: "land", blocks: [], parts: [], lanes: [], parks: [] };
    const e = buildEdge(streets, land, mass, { blocksX: 1, blocksZ: 1, seed: 1 }, stageRand("edge", 1));
    expect(e.tiles).toHaveLength(0);
    expect(e.blocks).toEqual([{ block: b.id, wanted: Math.round(30 / 3 / 3), first: null, shortTiles: Math.round(30 / 3 / 3) }]);
    expect(e.kerbCuts).toHaveLength(2 * (b.i1 - b.i0) + 2 * (b.j1 - b.j0));
    // the stage itself runs ok on it (D1 criterion 2): the short block is recorded, not thrown on
    const fixtureMass = { name: "mass", run: () => mass, picture: massStage.picture } as unknown as CityStageDef;
    const fixtureLand = { name: "land", run: () => land, picture: landStage.picture } as unknown as CityStageDef;
    const run = runCity({ blocksX: 1, blocksZ: 1, seed: 1 }, "edge", [streetsStage as CityStageDef, fixtureLand, fixtureMass, edgeStage as CityStageDef]);
    expect(run.ok ? "" : run.failure.reason).toBe("");
    expect(run.plan.layers.edge?.blocks[0]?.first).toBeNull();
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
