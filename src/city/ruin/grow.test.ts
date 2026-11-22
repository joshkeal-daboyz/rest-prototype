/**
 * Ticket 073 F1, criteria 2 to 8 on hand-made worlds: the slots of the kit table, trees and T-1 (B8), the vines, the switches, and T-1 and T-2 on the era. Fixtures place their own soil, obstacles, poles,
 * spans, drops, decks and slots, so each rule is proven apart from the named cities (stage 6 is empty until K2).
 */
import { describe, expect, it } from "vitest";
import type { CalibrationKey, CityEraPlan, CityRuinLayer, CityRuinPieceKind } from "../../core";
import { assertEraReadable } from "../pipeline/eras";
import { t1RuinTreeCovers, t2Failures } from "../pipeline/readable";
import { CityStageError } from "../pipeline/error";
import { stageRand, type StageRand } from "../pipeline/seeds";
import { CLEAR_M, ROOF_GAP_M, RUIN_ROOF_DEAD_TREES, RUIN_ROOF_GROWTH, RUIN_TREES_UNDER_SPANS, RUIN_VINE_06 } from "./constants";
import { cellKey, overlaps, rectAt } from "./geom";
import { fxWorld, district, emptyCircuit, obstacle, resolvedOf } from "./fixtures";
import { growRuin, type GrowOptions, type RuinPiece } from "./grow";
import { zeroRand } from "./fixtures";
import {
  EDGE_KEYS,
  GIANT_KEY,
  KIT,
  KIT_KEYS,
  LARGE_KEY,
  MOUND_KEY,
  OVERGROWTH_KEYS,
  ROOF_DEAD_KEYS,
  SAPLING_KEYS,
  TREE_VINE_KEYS,
  VINE_DROP_KEY,
  VINE_KEYS,
  VINE_POST_KEY,
  ruinBounds,
  ruinIsTree,
} from "./kit";
import { mix } from "./rng";
import { crownSized, layerOf } from "./stage";
import type { Deck, FaceSlot, HostSlot, Park, PostSlot, TreeSlot } from "./world";

const OPTS: GrowOptions = { circuit: emptyCircuit(), roofGrowth: false, roofDeadTrees: true, treesUnderSpans: false, vine06: true };
const real = stageRand("ruin", 7);
const rectOf = (p: RuinPiece) => rectAt(p.placement.x_m, p.placement.z_m, p.size.x_m, p.size.z_m);
const centre = (i: number): number => (i + 0.5) * 5;
const D = district("d1", 0.9);
const ofKind = (adds: readonly RuinPiece[], kind: CityRuinPieceKind): RuinPiece[] => adds.filter((a) => a.kind === kind);
const at = (p: RuinPiece): string => `${p.cell.i},${p.cell.j}`;

/** A plus of lane cells round one soil cell at (5, 5), with a pavement, a parking, a junction, a crossing and an open cell among them. */
function plusWorld(extra: Parameters<typeof fxWorld>[0] = {}) {
  const classes: [number, number, "lane" | "parking" | "junction" | "crossing" | "pavement" | "open"][] = [];
  for (let j = 2; j <= 8; j++) for (let i = 2; i <= 8; i++) classes.push([i, j, "lane"]);
  const set = (i: number, j: number, c: (typeof classes)[number][2]): void => {
    classes[classes.findIndex((x) => x[0] === i && x[1] === j)] = [i, j, c];
  };
  set(6, 5, "crossing");
  set(5, 6, "junction");
  set(4, 5, "pavement");
  set(5, 4, "parking");
  set(6, 6, "open");
  return fxWorld({ classes, soil: [[5, 5]], wallDir: (i, j) => (i === 4 && j === 5 ? [-1, 0] : null), ...extra });
}

describe("the slots of the kit table (criterion 3)", () => {
  const w = plusWorld();
  const run = growRuin(w, zeroRand, OPTS);
  const grownAt = (p: RuinPiece): number => Math.abs(p.cell.i - 5) + Math.abs(p.cell.j - 5);

  it("a patch on each eligible grown cell (carriageway, parking band, junction, open ground): an Env_Overgrowth_* piece, and none on the soil, a crossing or a pavement", () => {
    const patches = ofKind(run.adds, "patch");
    const cells = new Set(patches.map(at));
    expect(patches.length).toBe(cells.size);
    for (const p of patches) {
      expect(OVERGROWTH_KEYS).toContain(p.placement.key);
      expect(p.placement.key).not.toBe(MOUND_KEY);
      expect(grownAt(p)).toBeGreaterThan(0);
      expect(grownAt(p)).toBeLessThanOrEqual(3);
    }
    expect(cells.has("5,5")).toBe(false); // soil
    expect(cells.has("6,5")).toBe(false); // a crossing: only flat cover, and no overgrowth piece is flat enough
    expect(cells.has("4,5")).toBe(false); // a pavement takes clumps
    expect(cells.has("5,6")).toBe(true); // a junction
    expect(cells.has("5,4")).toBe(true); // a parking band
    expect(cells.has("6,6")).toBe(true); // open ground
    // 3 cells out: the diamond has 24 cells besides the soil, less the soil's crossing and pavement
    expect(cells.size).toBe(24 - 2);
    expect(run.stats["patch:mound"]).toBeUndefined();
    expect(run.stats["patch:overgrowth"]).toBe(22);
  });

  it("no overgrowth piece is flat enough for a crossing (0.15 m), so a crossing is never grown over", () => {
    for (const k of OVERGROWTH_KEYS) expect(KIT[k]!.h, k).toBeGreaterThanOrEqual(0.15);
    expect(ofKind(run.adds, "sapling").some((p) => at(p) === "6,5" || at(p) === "5,6")).toBe(false); // no sapling on a crossing or a junction either
    expect(ofKind(run.adds, "clump").some((p) => at(p) === "6,5" || at(p) === "5,6")).toBe(false);
  });

  it("the mound is not used where an Env_Overgrowth_* piece fits, and a cell a standing piece fills gets neither (a patch never lies under one)", () => {
    const blocked = plusWorld();
    obstacle(blocked.obstacles, centre(7), centre(5), 4.9, 4.9); // fills cell (7, 5)
    const r = growRuin(blocked, real, OPTS);
    expect(ofKind(r.adds, "patch").some((p) => at(p) === "7,5")).toBe(false);
    expect(r.stats["skippedFit:patch"]).toBeGreaterThanOrEqual(1); // (a patch also never lies under a sapling or clump placed before it, so a cell may lose its patch to its own tree)
    expect(r.adds.some((p) => p.placement.key === MOUND_KEY)).toBe(false);
    // and a patch may lie up to a standing piece: with every draw 0 the patch is Env_Overgrowth_01 at the cell's low corner (x 35 to 37.63); a piece standing from x 37.7 is beside it
    const beside = plusWorld();
    obstacle(beside.obstacles, 38.2, 27.5, 1, 1);
    expect(ofKind(growRuin(beside, zeroRand, OPTS).adds, "patch").some((p) => at(p) === "7,5")).toBe(true);
    const under = plusWorld();
    obstacle(under.obstacles, 36.2, 27.5, 1, 1); // inside where it would lie: every try is the same, so it is left out
    expect(ofKind(growRuin(under, zeroRand, OPTS).adds, "patch").some((p) => at(p) === "7,5")).toBe(false);
  });

  it("a clump on a grown pavement cell's wall line, off the cell's middle: the first Env_Overgrowth_Edge_* piece, flush with the wall", () => {
    const clumps = ofKind(run.adds, "clump");
    expect(clumps).toHaveLength(1);
    const c = clumps[0]!;
    expect(at(c)).toBe("4,5");
    expect(EDGE_KEYS).toContain(c.placement.key);
    const r = rectOf(c);
    expect(r.x0).toBeCloseTo(4 * 5, 1); // the wall is at the cell's -x edge
    expect(r.x1).toBeLessThan(centre(4)); // it does not cover the cell's middle
    expect(r.z0).toBeGreaterThanOrEqual(5 * 5);
    expect(r.z1).toBeLessThanOrEqual(6 * 5);
  });

  it("a clump falls back to a fern or bush where no edge piece fits, and still keeps off the middle", () => {
    const tight = plusWorld();
    obstacle(tight.obstacles, 4 * 5 + 0.5, centre(5), 0.9, 4.9, 1); // a furniture strip on the wall line: no edge strip fits beside it (0.3 m clear)
    const c = ofKind(growRuin(tight, real, OPTS).adds, "clump");
    for (const p of c) expect(rectOf(p).x1).toBeLessThan(centre(4));
    for (const p of c) expect(EDGE_KEYS).not.toContain(p.placement.key);
  });

  it("a sapling at its hashed spot in each grown cell but a junction or a crossing, inside its cell, clear of standing pieces", () => {
    const saplings = ofKind(run.adds, "sapling");
    const cells = new Set(saplings.map(at));
    expect(cells.has("5,6")).toBe(false);
    expect(cells.has("6,5")).toBe(false);
    expect(cells.has("5,5")).toBe(false); // soil takes nothing but its park trees and vines
    expect(cells.size).toBeGreaterThanOrEqual(24 - 3); // a clump on the pavement cell may stand where its sapling would
    expect(cells.size).toBeLessThanOrEqual(24 - 2);
    for (const p of saplings) {
      expect(SAPLING_KEYS).toContain(p.placement.key);
      const r = rectOf(p);
      expect(r.x0).toBeGreaterThanOrEqual(p.cell.i * 5 - 1e-6);
      expect(r.x1).toBeLessThanOrEqual((p.cell.i + 1) * 5 + 1e-6);
    }
  });

  it("the giant and the large tree in each park from wild 1/3, alone; none in a park of a district under 1/3", () => {
    const cells = new Set<number>();
    for (let j = 0; j < 5; j++) for (let i = 0; i < 5; i++) cells.add(cellKey(i, j));
    const park = (wild: number): Park => ({ id: "opening:p", block: "block:d1", district: "d1", wild, cells });
    const big = fxWorld({ w: 8, h: 8, parks: [park(0.9)] });
    const trees = ofKind(growRuin(big, real, OPTS).adds, "park-tree");
    expect(trees.map((t) => t.placement.key).sort()).toEqual([GIANT_KEY, LARGE_KEY].sort());
    expect(KIT[GIANT_KEY]).toMatchObject({ w: 12.604, h: 11.192, d: 13.12 });
    for (const t of trees) {
      const r = rectOf(t);
      expect(r.x0).toBeGreaterThanOrEqual(0);
      expect(r.x1).toBeLessThanOrEqual(25);
    }
    expect(ofKind(growRuin(fxWorld({ w: 8, h: 8, parks: [park(0.3)] }), real, OPTS).adds, "park-tree")).toHaveLength(0);
    expect(ofKind(growRuin(fxWorld({ w: 8, h: 8, parks: [park(1 / 3)] }), real, OPTS).adds, "park-tree")).toHaveLength(2);
  });

  it("a park too small for a giant's crown still takes its trunk: the trunk stands inside the park's cells, the crown reaches past them (F1b3)", () => {
    const cells = new Set<number>([cellKey(0, 0), cellKey(1, 0), cellKey(0, 1), cellKey(1, 1)]);
    const w2 = fxWorld({ parks: [{ id: "opening:s", block: "block:d1", district: "d1", wild: 0.9, cells }] });
    const trees = ofKind(growRuin(w2, real, OPTS).adds, "park-tree");
    expect(trees.map((t) => t.placement.key).sort()).toEqual([GIANT_KEY, LARGE_KEY].sort());
    for (const t of trees) {
      const r = rectOf(t);
      expect(r.x0).toBeGreaterThanOrEqual(0);
      expect(r.x1).toBeLessThanOrEqual(10);
    }
  });

  it("no key outside the kit anywhere in the layer, and no piece scaled (the size is the key's bounds, turned)", () => {
    for (const p of run.adds) {
      expect(KIT_KEYS.has(p.placement.key), p.placement.key).toBe(true);
      const k = KIT[p.placement.key]!;
      const quarter = Math.round(p.placement.yaw_deg / 90) % 2 !== 0;
      // a sapling or park tree is its trunk (F1b3); every other piece is its key's bounds, turned
      if (k.trunk !== undefined) expect(p.size).toEqual({ x_m: 2 * k.trunk.r_m, z_m: 2 * k.trunk.r_m, h_m: k.trunk.top_m });
      else expect(p.size).toEqual({ x_m: quarter ? k.d : k.w, z_m: quarter ? k.w : k.d, h_m: k.h });
      expect(p.id).toMatch(/^ruin:(patch|clump|sapling|park-tree|roof|vine|tree-vine):/);
    }
    expect(new Set(run.adds.map((p) => p.id)).size).toBe(run.adds.length);
  });
});

/** A rand that draws `v` (0 to 1, to about 0.001) for every position draw and 0 for the rest: every pick is the first of its list, every roll passes. */
function spotRand(vx: number, vz = vx): StageRand {
  const find = (want: number): number => {
    for (let r = 0; r < 5_000_000; r++) if (Math.abs(mix(r) / 4294967296 - want) < 0.001) return r;
    throw new Error("no draw near " + want);
  };
  const rx = find(vx);
  const rz = find(vz);
  return (...key) => {
    const s = key.join(":");
    return s.endsWith(":spot:x") ? rx : s.endsWith(":spot:z") ? rz : 0;
  };
}

describe("trees: the crown is free, only the trunk is judged (F1b3; Josh, 22 Nov 2026)", () => {
  // one grown lane cell (6, 5) beside soil at (5, 5), cell x 30 to 35, z 25 to 30. With every draw 0 the sapling is Tree_Birch_01 (trunk r 0.11, crown 2.454 x 2.289, 4.547 m high) with its trunk
  // square at the cell's low corner: x 30.11, z 25.11, so its trunk's edge is at x 30.22 and its crown reaches x 31.3.
  const world = (extra: Parameters<typeof fxWorld>[0] = {}) => fxWorld({ d: district("d1", 0.2), classes: [[6, 5, "lane"]], soil: [[5, 5]], ...extra });
  const sapling = (r: ReturnType<typeof growRuin>): RuinPiece | undefined => ofKind(r.adds, "sapling")[0];
  const span = (zz: number) => emptyCircuit({ lines: [{ id: "span", a: { x_m: 0, z_m: zz }, b: { x_m: 80, z_m: zz } }] });
  const ON: GrowOptions = { ...OPTS, treesUnderSpans: true };

  it("a tall sapling beside a span is placed (B8 lifts the 3.2 m cap)", () => {
    const r = growRuin(world(), zeroRand, { ...ON, circuit: span(40) });
    const s = sapling(r);
    expect(s).toBeDefined();
    expect(KIT[s!.placement.key]!.h).toBeGreaterThan(3.2);
    expect(r.underSpanSpots).toHaveLength(0);
  });

  it("with the constant off (a test double: F1's crown-clear rule) a tree whose crown meets a span, a pole, a light or a lamp-post place is not placed, and nothing is listed under a span", () => {
    expect(sapling(growRuin(world(), zeroRand, { ...OPTS, circuit: span(25.5) }))).toBeUndefined();
    expect(growRuin(world(), zeroRand, { ...OPTS, circuit: span(25.5) }).underSpanSpots).toHaveLength(0);
    for (const key of ["poles", "lights", "lampPlaces"] as const) expect(sapling(growRuin(world(), zeroRand, { ...OPTS, circuit: emptyCircuit({ [key]: [{ id: "p", x_m: 31, z_m: 25.11 }] }) })), key).toBeUndefined();
    expect(RUIN_TREES_UNDER_SPANS).toBe(true); // as built it is on (Josh, F1-Q1: "Through any dead line"); the options turn it off here
  });

  it("on (as built): a sapling whose crown meets the span is placed, is listed once placed, counted as crownOverSpan, and the stage does not throw; t1RuinTreeCovers reports it from its full crown", () => {
    const w = world();
    const circuit = span(25.5);
    const r = growRuin(w, zeroRand, { ...ON, circuit });
    expect(sapling(r)).toBeDefined();
    expect(r.underSpanSpots).toHaveLength(1);
    expect(r.stats["crownOverSpan"]).toBe(1);
    const layer = layerOf(r.adds);
    const resolved = assertEraReadable(eraPlanOf(layer, w.resolved), "ruin", layer, { bounds: ruinBounds, isTree: ruinIsTree, circuit });
    const crowned = { ...resolved, adds: { ...resolved.adds, ruin: crownSized(layer.adds) } };
    expect(t1RuinTreeCovers(crowned, { bounds: ruinBounds, isTree: ruinIsTree, circuit }).map((f) => f.what)).toEqual(["canopyOverLine"]);
  });

  it("on: a crown over a pole, a street light or a lamp-post place is placed and counted in its own row; a trunk edge 0.2 m from one is not, 0.4 m is", () => {
    const rows = { poles: "crownOverPole", lights: "crownOverLight", lampPlaces: "crownOverLampPlace" } as const;
    for (const key of ["poles", "lights", "lampPlaces"] as const) {
      const at = (x: number) => growRuin(world(), zeroRand, { ...ON, circuit: emptyCircuit({ [key]: [{ id: "p", x_m: x, z_m: 25.11 }] }) });
      const far = at(31); // 0.78 m from the trunk's edge (30.22), 0.89 m from its pivot: under the crown's 1.23 m
      expect(sapling(far), key).toBeDefined();
      expect(far.stats[rows[key]], key).toBe(1);
      expect(sapling(at(30.42)), key).toBeUndefined(); // 0.2 m from the trunk's edge
      expect(sapling(at(30.62)), key).toBeDefined(); // 0.4 m
      expect(at(30.42).stats["refusedTrunk:circuit"], key).toBe(1);
    }
  });

  it("on: a park tree taller than 5.5 m whose crown covers a drop end is placed and counted in crownOverDropEnd, with its trunk clear; with the switch off it is not placed", () => {
    const cells = new Set<number>();
    for (let j = 0; j < 5; j++) for (let i = 0; i < 5; i++) cells.add(cellKey(i, j));
    const mk = () => fxWorld({ parks: [{ id: "opening:p", block: "block:d1", district: "d1", wild: 0.9, cells }] });
    const first = growRuin(mk(), real, ON);
    const giant = ofKind(first.adds, "park-tree").find((t) => t.placement.key === GIANT_KEY)!;
    expect(giant).toBeDefined();
    // the drop's wall point is 3 m from the giant's trunk: its first 2 m run under the 6.56 m crown
    const drop = emptyCircuit({ drops: [{ id: "d", wall: { x_m: giant.placement.x_m + 3, z_m: giant.placement.z_m }, out: { x_m: 0, z_m: 1 } }] });
    const on = growRuin(mk(), real, { ...ON, circuit: drop });
    expect(ofKind(on.adds, "park-tree").some((t) => t.placement.key === GIANT_KEY)).toBe(true);
    expect(on.stats["crownOverDropEnd"]).toBeGreaterThanOrEqual(1);
    const off = growRuin(mk(), real, { ...OPTS, circuit: drop });
    expect(off.stats["crownOverDropEnd"]).toBeUndefined();
  });

  it("on: a crown that passes over a building's cell and through its wall is placed and counted (crownIntoBuilding), the trunk outside it", () => {
    // a building cell at (5, 5) (x 25 to 30) beside the lane cell: a trunk at x about 30.5 has its edge 0.39 m from the wall and its crown (radius 1.23) reaches x 29.3
    const w = world({ built: new Set([cellKey(5, 5)]) });
    const r = growRuin(w, spotRand(0.08, 0.5), ON);
    const s = sapling(r);
    expect(s).toBeDefined();
    expect(s!.placement.x_m - 0.11).toBeGreaterThanOrEqual(30.3);
    expect(r.stats["crownIntoBuilding"]).toBe(1);
  });

  it("on: a crown over a fire escape's box or an awning (standing pieces) is placed; the trunk beside it is not clear of one", () => {
    const w = world();
    obstacle(w.obstacles, 31.5, 25.5, 1, 1, 3); // trunk edge 30.22, box from 31.0: 0.78 m away; the crown reaches 31.3
    expect(sapling(growRuin(w, zeroRand, ON))).toBeDefined();
    const bench = world();
    obstacle(bench.obstacles, 30.72, 25.11, 1, 1, 1); // box from 30.22: 0 m... a bench 0.2 m from the trunk's edge is its edge at 30.42
    expect(sapling(growRuin(bench, zeroRand, ON))).toBeUndefined();
    const ok = world();
    obstacle(ok.obstacles, 30.92, 25.11, 1, 1, 1); // box from 30.42... edge 30.22 plus 0.2
    expect(sapling(growRuin(ok, zeroRand, ON))).toBeUndefined();
    const far = world();
    obstacle(far.obstacles, 31.12, 25.11, 1, 1, 1); // box from 30.62: 0.4 m from the trunk's edge
    expect(sapling(growRuin(far, zeroRand, ON))).toBeDefined();
  });

  it("the trunk is never inside a building: a spot whose trunk stands inside or within 0.3 m of a building footprint is not placed", () => {
    const w = world({ built: new Set([cellKey(5, 5)]) }); // the trunk's edge is at x 30.0, the building's wall at 30
    const r = growRuin(w, zeroRand, ON);
    expect(sapling(r)).toBeUndefined();
    expect(r.stats["refusedTrunk:building"]).toBe(1);
    const inside = growRuin(world({ built: new Set([cellKey(6, 5)]) }), zeroRand, ON); // the whole cell is a building
    expect(sapling(inside)).toBeUndefined();
  });

  it("T-2 judges the trunk: a crown that covers the only street cell to a pole is placed, a trunk that closes it is refused and not listed", () => {
    const cells: [number, number, "lane" | "open"][] = Array.from({ length: 9 }, (_, n) => [n + 1, 5, "lane"] as [number, number, "lane"]);
    cells.push([5, 4, "open"]);
    const poles = [{ id: "a", x_m: centre(1), z_m: centre(5) }, { id: "b", x_m: centre(9), z_m: centre(5) }];
    const circuit = emptyCircuit({ poles, lines: [{ id: "s", a: { x_m: 0, z_m: centre(5) }, b: { x_m: 80, z_m: centre(5) } }] });
    const mk = () => fxWorld({ w: 12, h: 8, d: district("d1", 0.9), classes: cells, soil: [[5, 4]] });
    // trunks at the low corner of each cell: the crown (2.4 m wide, 4.5 m high) covers cell centres but the 0.22 m trunk does not
    const low = growRuin(mk(), zeroRand, { ...ON, circuit });
    const streetCells = cells.filter((c) => c[2] === "lane").map(([i, j]) => [i, j] as const);
    expect(ofKind(low.adds, "sapling").length).toBeGreaterThan(3);
    expect(t2Failures(resolvedOf(12, 8, streetCells, low.adds), { circuit })).toHaveLength(0);
    // trunks at the middle of each cell: option G refuses the ones that close the way
    const mid = growRuin(mk(), spotRand(0.5), { ...ON, circuit });
    expect(mid.stats["leftOutT2:sapling"]).toBeGreaterThan(0);
    expect(t2Failures(resolvedOf(12, 8, streetCells, mid.adds), { circuit })).toHaveLength(0);
    // an under-span spot is listed only once its tree is placed
    const ids = new Set(ofKind(mid.adds, "sapling").map((p) => p.id));
    for (const sp of mid.underSpanSpots) expect(ids.has(sp.id)).toBe(true);
    expect(mid.underSpanSpots.length).toBe(ofKind(mid.adds, "sapling").length + ofKind(mid.adds, "park-tree").length);
  });

  it("the giant's crown is a 6.56 m radius and is free: a span through the middle of its park does not stop it; it is listed and counted when placed", () => {
    const cells = new Set<number>();
    for (let j = 0; j < 5; j++) for (let i = 0; i < 5; i++) cells.add(cellKey(i, j));
    const mk = () => fxWorld({ parks: [{ id: "opening:p", block: "block:d1", district: "d1", wild: 0.9, cells }] }); // a run puts its own pieces in the world: one world a run
    expect(Math.max(KIT[GIANT_KEY]!.w, KIT[GIANT_KEY]!.d) / 2).toBeCloseTo(6.56, 2);
    const through = (_zz: number) => emptyCircuit({ lines: [3, 8, 12.5, 17, 22].map((zz) => ({ id: `s${zz}`, a: { x_m: -40, z_m: zz }, b: { x_m: 80, z_m: zz } })) }); // a span every 5 m: any 6.56 m crown meets one
    const r = growRuin(mk(), real, { ...ON, circuit: through(0) });
    const giant = ofKind(r.adds, "park-tree").find((t) => t.placement.key === GIANT_KEY)!;
    expect(giant).toBeDefined();
    expect(r.underSpanSpots.some((s) => s.key === GIANT_KEY)).toBe(true);
    expect(r.stats["crownOverSpan"]).toBeGreaterThanOrEqual(1);
    expect(Math.max(giant.size.x_m, giant.size.z_m)).toBeCloseTo(2.2, 6); // what is judged is the trunk
    // off: the crown-clear rule stands
    const off = growRuin(mk(), real, { ...OPTS, circuit: through(0) });
    expect(ofKind(off.adds, "park-tree").some((t) => t.placement.key === GIANT_KEY)).toBe(false);
    expect(off.underSpanSpots).toHaveLength(0);
  });
});

describe("T-2 by option G in the growth (criterion 5)", () => {
  it("leaves out the patches and saplings that would seal a pole in, counts them, and what it places holds T-2 by the real check", () => {
    // a one-cell-wide street (lane cells, i 1 to 9, row 5) under soil at (5, 4); a pole at each end
    const cells: [number, number, "lane" | "open"][] = Array.from({ length: 9 }, (_, n) => [n + 1, 5, "lane"] as [number, number, "lane"]);
    cells.push([5, 4, "open"]);
    const circuit = emptyCircuit({ poles: [{ id: "a", x_m: centre(1), z_m: centre(5) }, { id: "b", x_m: centre(9), z_m: centre(5) }] });
    const w = fxWorld({ w: 12, h: 8, classes: cells, soil: [[5, 4]] });
    const r = growRuin(w, zeroRand, { ...OPTS, circuit });
    const closes = (p: RuinPiece) => Math.abs(centre(p.cell.i) - p.placement.x_m) <= p.size.x_m / 2 && Math.abs(centre(p.cell.j) - p.placement.z_m) <= p.size.z_m / 2;
    expect((r.stats["leftOutT2:patch"] ?? 0) + (r.stats["leftOutT2:sapling"] ?? 0)).toBeGreaterThan(0);
    // what is placed holds T-2 by the real check
    const streetCells = cells.filter((c) => c[2] === "lane").map(([i, j]) => [i, j] as const);
    expect(t2Failures(resolvedOf(12, 8, streetCells, r.adds), { circuit })).toHaveLength(0);
    // and a piece that closes no street cell is never left out: every placed piece on the street that covers its cell middle is at most one in the way round
    expect(r.adds.filter((p) => p.cell.j === 5 && closes(p)).length).toBeLessThanOrEqual(0);
    expect(r.adds.length).toBeGreaterThan(0);
  });
});

describe("vines (criterion 6)", () => {
  const face = (over: Partial<FaceSlot> = {}): FaceSlot => ({ id: "3,3,+z", cell: { i: 3, j: 3 }, side: "+z", district: "d1", wild: 0.9, roofY: 12, escape: false, novelty: false, ...over });
  const vines = (r: ReturnType<typeof growRuin>): RuinPiece[] => ofKind(r.adds, "vine");
  const grow1 = (faces: FaceSlot[], circuit = emptyCircuit(), rand: StageRand = zeroRand) => growRuin(fxWorld({ faces }), rand, { ...OPTS, circuit });

  it("a vine hangs from the roof edge of an open face: a sheet or a drape, never the post wrap, flush with the wall, its top at the roof edge", () => {
    const v = vines(grow1([face()]));
    expect(v).toHaveLength(1);
    expect(v[0]!.placement.key).not.toBe(VINE_POST_KEY);
    expect(VINE_KEYS).toContain(v[0]!.placement.key);
    expect(v[0]!.cell).toEqual({ i: 3, j: 3 });
    const r = rectOf(v[0]!);
    expect(r.z0).toBeCloseTo(20, 1); // the +z wall of cell (3, 3) is at z = 20
    expect(v[0]!.placement.y_m + v[0]!.size.h_m).toBeCloseTo(12, 6);
    expect(v[0]!.placement.yaw_deg).toBe(0);
  });

  it("none on a face with a fire escape or a face novelty sign", () => {
    expect(vines(grow1([face({ escape: true })]))).toHaveLength(0);
    expect(vines(grow1([face({ novelty: true })]))).toHaveLength(0);
  });

  it("beside a drop only Env_Vines_08, where it fits; any other key never stands on a drop face", () => {
    // the drop's wall point is in the right of the face (x 19), so the narrow drape fits to its left
    const beside = emptyCircuit({ drops: [{ id: "d", wall: { x_m: 19.2, z_m: 20 }, out: { x_m: 0, z_m: 1 } }] });
    const v = vines(grow1([face()], beside));
    expect(v).toHaveLength(1);
    expect(v[0]!.placement.key).toBe(VINE_DROP_KEY);
    expect(rectOf(v[0]!).x1).toBeLessThan(19.2 - 0.15);
    // with the drop's first 2 m under where the drape would stand, nothing is placed (and no other key stands in its place)
    const under = emptyCircuit({ drops: [{ id: "d", wall: { x_m: 16, z_m: 20 }, out: { x_m: 0, z_m: 1 } }] });
    expect(vines(grow1([face()], under))).toHaveLength(0);
    for (const seed of [1, 2, 3, 4, 5, 6]) for (const p of vines(grow1([face()], beside, stageRand("ruin", seed)))) expect(p.placement.key).toBe(VINE_DROP_KEY);
    for (const seed of [1, 2, 3, 4, 5, 6]) for (const p of vines(grow1([face()], under, stageRand("ruin", seed)))) expect(rectOf(p).x0 > 16.2 || rectOf(p).x1 < 15.8).toBe(true); // clear of the drop
  });

  it("a drape that stands out over a drop's first 2 m is not placed, and a sheet on a face with no drop is", () => {
    const under = emptyCircuit({ drops: [{ id: "d", wall: { x_m: 16, z_m: 20 }, out: { x_m: 0, z_m: 1 } }] });
    expect(vines(grow1([face()], under))).toHaveLength(0);
    expect(vines(grow1([face()]))).toHaveLength(1);
  });

  it("a vine on an awning with no sign, a drape over the edge; none on an awning with a fascia or blade sign", () => {
    const host = (over: Partial<HostSlot> = {}): HostSlot => ({ id: "awning:3,3,+z:175,203", cell: { i: 3, j: 3 }, side: "+z", district: "d1", wild: 0.9, x: 17.5, z: 21.7, size: { x_m: 4.7, z_m: 3.2 }, top: 4.6, signed: false, ...over });
    const run = (h: HostSlot) => growRuin(fxWorld({ hosts: [h] }), zeroRand, OPTS);
    const v = vines(run(host()));
    expect(v).toHaveLength(1);
    expect(v[0]!.placement.y_m + v[0]!.size.h_m).toBeCloseTo(4.6, 6); // hangs from the awning's top
    expect(rectOf(v[0]!).z1).toBeLessThanOrEqual(21.7 + 1.6 + 1e-6); // no further out than the awning's edge
    expect(rectOf(v[0]!).z0).toBeGreaterThanOrEqual(20 - 1e-6); // never behind the wall
    expect(vines(run(host({ signed: true })))).toHaveLength(0);
  });

  it("Env_Vines_06 wraps a traffic post: placed on a post clear of every circuit point, never on a circuit pole, light or lamp post", () => {
    const post: PostSlot = { id: "signalMast:j|0", x: 12.5, z: 12.5, district: "d1", wild: 0.9 };
    const run = (circuit = emptyCircuit()) => vines(growRuin(fxWorld({ posts: [post] }), zeroRand, { ...OPTS, circuit }));
    const v = run();
    expect(v).toHaveLength(1);
    expect(v[0]!.placement.key).toBe(VINE_POST_KEY);
    expect(v[0]!.placement.y_m).toBe(0);
    expect(run(emptyCircuit({ poles: [{ id: "p", x_m: 12.8, z_m: 12.5 }] }))).toHaveLength(0);
    expect(run(emptyCircuit({ lights: [{ id: "l", x_m: 12.5, z_m: 12.9 }] }))).toHaveLength(0);
    expect(run(emptyCircuit({ lampPlaces: [{ id: "k", x_m: 12.2, z_m: 12.5 }] }))).toHaveLength(0);
  });

  it("a tree-vine hangs from a standing tree only: a clean ground tree or a placed sapling, never a wall; a tree that is not placed has none", () => {
    const tree: TreeSlot = { id: "tree:100,100", x: 10, z: 10, radius: 1.5, h: 4, district: "d1", wild: 0.9 };
    const v = ofKind(growRuin(fxWorld({ trees: [tree] }), zeroRand, OPTS).adds, "tree-vine");
    expect(v).toHaveLength(1);
    expect(TREE_VINE_KEYS).toContain(v[0]!.placement.key);
    expect(Math.hypot(v[0]!.placement.x_m - 10, v[0]!.placement.z_m - 10)).toBeLessThanOrEqual(1.5);
    // a placed sapling gets one (the late step), an under-span sapling that is not placed gets none
    const grown = (zz: number, on: boolean) => growRuin(fxWorld({ d: district("d1", 0.2), classes: [[6, 5, "lane"]], soil: [[5, 5]] }), zeroRand, { ...OPTS, treesUnderSpans: on, circuit: emptyCircuit({ lines: [{ id: "s", a: { x_m: 0, z_m: zz }, b: { x_m: 80, z_m: zz } }] }) });
    expect(ofKind(grown(40, true).adds, "tree-vine").map((p) => p.id)).toEqual(["ruin:tree-vine:ruin:sapling:6,5"]);
    expect(ofKind(grown(25.5, false).adds, "tree-vine")).toHaveLength(0); // the switch off keeps the under-span tree out, so it has no vine
    // and no Tree_Vines_* is ever a wall vine; no Env_Vines_* is ever a tree-vine
    const all = growRuin(fxWorld({ faces: [face()], trees: [tree] }), zeroRand, OPTS).adds;
    for (const p of all) {
      if (p.kind === "vine") expect(TREE_VINE_KEYS).not.toContain(p.placement.key);
      if (p.kind === "tree-vine") expect(VINE_KEYS).not.toContain(p.placement.key);
    }
  });
});

describe("the switches (criterion 7)", () => {
  it("are exported with the values the ticket says: roof growth on and trees under spans on (Josh, 22 Nov 2026), dead trees on, the post vine on", () => {
    expect(RUIN_ROOF_GROWTH).toBe(true);
    expect(RUIN_ROOF_DEAD_TREES).toBe(true);
    expect(RUIN_TREES_UNDER_SPANS).toBe(true);
    expect(RUIN_VINE_06).toBe(true);
  });

  const deck = (i: number, j: number, taken: ReturnType<typeof rectAt>[] = []): Deck => ({
    building: `b${i}`,
    district: "d1",
    wild: 0.9,
    i,
    j,
    rect: { x0: i * 5 + 0.3, x1: (i + 1) * 5 - 0.3, z0: j * 5 + 0.3, z1: (j + 1) * 5 - 0.3 },
    y: 12.5,
    taken,
  });
  const decks = Array.from({ length: 24 }, (_, n) => deck(n % 6, Math.floor(n / 6), n % 2 === 0 ? [rectAt((n % 6) * 5 + 1.2, Math.floor(n / 6) * 5 + 1.2, 1.5, 1.2)] : []));
  const mixed = () => fxWorld({ decks, classes: [[1, 5, "lane"], [2, 5, "lane"]], soil: [[0, 5]] });

  it("as built (roof growth off) the layer has no roof add, and every other add is the same as with it on", () => {
    const off = growRuin(mixed(), real, { ...OPTS, roofGrowth: false });
    const on = growRuin(mixed(), real, { ...OPTS, roofGrowth: true });
    expect(ofKind(off.adds, "roof")).toHaveLength(0);
    expect(ofKind(on.adds, "roof").length).toBeGreaterThan(0);
    expect(on.adds.filter((p) => p.kind !== "roof")).toEqual(off.adds);
  });

  it("with it on, roof pieces stand on the deck inside the cell less 0.3 m, at most 2 to a column, 0.1 m clear of H3's pieces and of each other", () => {
    const on = growRuin(mixed(), real, { ...OPTS, roofGrowth: true });
    const roofs = ofKind(on.adds, "roof");
    const byCol = new Map<string, RuinPiece[]>();
    for (const p of roofs) byCol.set(at(p), [...(byCol.get(at(p)) ?? []), p]);
    for (const [col, list] of byCol) {
      expect(list.length, col).toBeLessThanOrEqual(2);
      const d = decks.find((q) => `${q.i},${q.j}` === col)!;
      for (const p of list) {
        const r = rectOf(p);
        expect(p.placement.y_m).toBe(12.5);
        expect(r.x0).toBeGreaterThanOrEqual(d.rect.x0 - 1e-6);
        expect(r.x1).toBeLessThanOrEqual(d.rect.x1 + 1e-6);
        expect(r.z0).toBeGreaterThanOrEqual(d.rect.z0 - 1e-6);
        expect(r.z1).toBeLessThanOrEqual(d.rect.z1 + 1e-6);
        for (const t of d.taken) expect(overlaps({ x0: t.x0 - ROOF_GAP_M + 1e-6, x1: t.x1 + ROOF_GAP_M - 1e-6, z0: t.z0 - ROOF_GAP_M + 1e-6, z1: t.z1 + ROOF_GAP_M - 1e-6 }, r)).toBe(false);
      }
      if (list.length === 2) {
        const [a, b] = list.map(rectOf) as [ReturnType<typeof rectAt>, ReturnType<typeof rectAt>];
        expect(overlaps({ x0: a.x0 - ROOF_GAP_M + 1e-6, x1: a.x1 + ROOF_GAP_M - 1e-6, z0: a.z0 - ROOF_GAP_M + 1e-6, z1: a.z1 + ROOF_GAP_M - 1e-6 }, b)).toBe(false);
      }
    }
  });

  it("roof pieces, a Tree_Dead_* included, never sit within 0.3 m of a rooftop pole or have a footprint that meets a rooftop line in plan", () => {
    const bigDecks = [deck(0, 0), deck(1, 0)];
    const poles = [{ id: "rp", x_m: 2.5, z_m: 2.5 }];
    const lines = [{ id: "rl", a: { x_m: 5.4, z_m: 0 }, b: { x_m: 5.4, z_m: 30 } }];
    for (const seed of [1, 2, 3, 4, 5, 6, 7, 8]) {
      const r = growRuin(fxWorld({ decks: bigDecks }), stageRand("ruin", seed), { ...OPTS, roofGrowth: true, circuit: emptyCircuit({ poles, lines }) });
      for (const p of ofKind(r.adds, "roof")) {
        const rc = rectOf(p);
        const dx = 2.5 - Math.max(rc.x0, Math.min(2.5, rc.x1));
        const dz = 2.5 - Math.max(rc.z0, Math.min(2.5, rc.z1));
        expect(Math.hypot(dx, dz), p.id).toBeGreaterThan(0.3);
        expect(rc.x0 <= 5.4 && rc.x1 >= 5.4, p.id).toBe(false);
      }
    }
    // with no pole or line the same decks take pieces: the limit is what keeps them off
    let n = 0;
    for (const seed of [1, 2, 3, 4, 5, 6, 7, 8]) n += ofKind(growRuin(fxWorld({ decks: bigDecks }), stageRand("ruin", seed), { ...OPTS, roofGrowth: true }).adds, "roof").length;
    expect(n).toBeGreaterThan(0);
  });

  it("with roof dead trees off the layer has no Tree_Dead_* and every other add is the same", () => {
    // a deck whose low corner is taken (so no overgrowth fits where every draw says) and every draw 0 but the filler's key and position: the filler is a dead tree
    let rDead = 0;
    while (mix(rDead) % 3 !== 1) rDead++;
    let rMid = 0;
    while (mix(rMid) / 4294967296 < 0.3 || mix(rMid) / 4294967296 > 0.7) rMid++;
    const rand: StageRand = (...key) => {
      const s = key.join(":");
      if (s.includes(":key:1:")) return rDead;
      if (s.includes(":pos:1:")) return rMid;
      return 0;
    };
    const w = () => fxWorld({ decks: [deck(0, 0, [rectAt(0.3 + 0.3, 0.3 + 0.3, 0.6, 0.6)])] });
    const on = growRuin(w(), rand, { ...OPTS, roofGrowth: true });
    const dead = ofKind(on.adds, "roof").filter((p) => ROOF_DEAD_KEYS.includes(p.placement.key));
    expect(dead.length).toBeGreaterThan(0);
    const off = growRuin(w(), rand, { ...OPTS, roofGrowth: true, roofDeadTrees: false });
    expect(off.adds.some((p) => ROOF_DEAD_KEYS.includes(p.placement.key))).toBe(false);
    expect(off.adds).toEqual(on.adds.filter((p) => !ROOF_DEAD_KEYS.includes(p.placement.key)));
  });

  it("with the post vine off the layer has no Env_Vines_06 and every other add is the same", () => {
    const posts: PostSlot[] = Array.from({ length: 6 }, (_, n) => ({ id: `signalMast:g${n}`, x: 10 + n * 6, z: 12, district: "d1", wild: 0.9 }));
    const faces: FaceSlot[] = Array.from({ length: 6 }, (_, n) => ({ id: `${n},3,+z`, cell: { i: n, j: 3 }, side: "+z", district: "d1", wild: 0.9, roofY: 12, escape: false, novelty: false }));
    const mk = () => fxWorld({ posts, faces });
    const on = growRuin(mk(), zeroRand, OPTS);
    expect(on.adds.filter((p) => p.placement.key === VINE_POST_KEY).length).toBeGreaterThan(0);
    const off = growRuin(mk(), zeroRand, { ...OPTS, vine06: false });
    expect(off.adds.some((p) => p.placement.key === VINE_POST_KEY)).toBe(false);
    expect(off.adds).toEqual(on.adds.filter((p) => p.placement.key !== VINE_POST_KEY));
  });
});

describe("T-1 and T-2 on the era (criterion 8)", () => {
  const w = plusWorld();
  const forced: RuinPiece = {
    id: "ruin:patch:forced",
    kind: "patch",
    district: "d1",
    cell: { i: 3, j: 3 },
    placement: { key: OVERGROWTH_KEYS[0]!, x_m: 17.5, y_m: 0, z_m: 17.5, yaw_deg: 0 },
    size: { x_m: 2.631, z_m: 3.769, h_m: 1.289 },
  };
  const readable = (circuit: ReturnType<typeof emptyCircuit>) => ({ bounds: ruinBounds, isTree: ruinIsTree, circuit });

  it("a forced add that covers a pole throws CityStageError naming T-1", () => {
    const layer = layerOf([forced]);
    const circuit = emptyCircuit({ poles: [{ id: "p", x_m: 17.5, z_m: 17.5 }] });
    expect(() => assertEraReadable(eraPlanOf(layer, w.resolved), "ruin", layer, readable(circuit))).toThrow(CityStageError);
    expect(() => assertEraReadable(eraPlanOf(layer, w.resolved), "ruin", layer, readable(circuit))).toThrow(/T-1/);
  });

  it("a forced add that seals a pole in throws naming T-2", () => {
    const cells = [3, 4, 5, 6, 7].map((i) => [i, 3] as [number, number]);
    const r = resolvedOf(10, 6, cells);
    const circuit = emptyCircuit({ poles: [{ id: "a", x_m: centre(3), z_m: centre(3) }, { id: "b", x_m: centre(7), z_m: centre(3) }] });
    const sealing: RuinPiece = { ...forced, placement: { ...forced.placement, x_m: centre(5), z_m: centre(3) } };
    const layer = layerOf([sealing]);
    expect(() => assertEraReadable(eraPlanOf(layer, r), "ruin", layer, readable(circuit))).toThrow(/T-2/);
    const fine = layerOf([]);
    expect(() => assertEraReadable(eraPlanOf(fine, r), "ruin", fine, readable(circuit))).not.toThrow();
  });

  it("under F1's isTree a Tree_Vines_* strand and a Tree_Dead_* snag are not canopies, and a birch is", () => {
    const strand = TREE_VINE_KEYS[3]!; // 0.33 x 0.99: no crown
    const dead = ROOF_DEAD_KEYS[0]!;
    expect(ruinIsTree(strand)).toBe(false);
    expect(ruinIsTree(dead)).toBe(false);
    expect(ruinIsTree(SAPLING_KEYS[0]!)).toBe(true);
    expect(ruinIsTree(GIANT_KEY)).toBe(true);
    // in the ruin T-1 judges neither; t1RuinTreeCovers lists the birch's crown over the span and not the snag's
    const circuit = emptyCircuit({ lines: [{ id: "s", a: { x_m: 0, z_m: 22 }, b: { x_m: 80, z_m: 22 } }] });
    const at22 = (key: CalibrationKey, h: number, x: number): RuinPiece => ({ ...forced, id: `ruin:t:${key}`, kind: "sapling", placement: { key, x_m: x, y_m: 0, z_m: 21.5, yaw_deg: 0 }, size: { x_m: KIT[key]!.w, z_m: KIT[key]!.d, h_m: h } });
    const snag = layerOf([at22(dead, KIT[dead]!.h, 17.5)]);
    const rs = assertEraReadable(eraPlanOf(snag, w.resolved), "ruin", snag, readable(circuit));
    expect(t1RuinTreeCovers(rs, readable(circuit))).toHaveLength(0);
    const birch = layerOf([at22(SAPLING_KEYS[0]!, KIT[SAPLING_KEYS[0]!]!.h, 17.5)]);
    const rb = assertEraReadable(eraPlanOf(birch, w.resolved), "ruin", birch, readable(circuit));
    expect(t1RuinTreeCovers(rb, readable(circuit)).map((f) => f.what)).toEqual(["canopyOverLine"]);
    void CLEAR_M;
  });
});

/** The minimal era plan `assertEraReadable` resolves: the world's resolved plan (its streets layer), a history layer and the layer under test. */
function eraPlanOf(layer: CityRuinLayer, resolved: ReturnType<typeof fxWorld>["resolved"]): CityEraPlan {
  return { plan: resolved.plan, layers: { history: { stage: "history", districts: [] } }, digests: {} } as unknown as CityEraPlan;
}
