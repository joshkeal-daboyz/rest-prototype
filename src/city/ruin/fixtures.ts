/**
 * Test support for stage 13 (ticket 073 F1): hand-made worlds, so each rule is proven on a fixture with hand-placed soil, obstacles, poles, spans, drops and slots. Imported by tests only, never by the stage.
 */
import type { CityDistrict, CityEraPlan, CityResolvedPlan, CityStreetsLayer } from "../../core";
import { resolveBefore } from "../pipeline/eras";
import { t2Failures, type CircuitPoints } from "../pipeline/readable";
import { ruinBounds, ruinIsTree } from "./kit";
import type { StageRand } from "../pipeline/seeds";
import { CELL_M } from "./constants";
import { cellKey, rectAt, RectIndex } from "./geom";
import { reachOf } from "./spread";
import type { CellClass, Obstacle, World } from "./world";

/** Every draw is 0: every roll passes, every pick is the first of its list, every position is the low end of its range. */
export const zeroRand: StageRand = () => 0;

export const district = (id: string, wild: number): CityDistrict => ({ id, blocks: [`block:${id}`], tech: 0, held: 0, wild });

export const emptyCircuit = (over: Partial<CircuitPoints> = {}): CircuitPoints => ({ poles: [], lights: [], lampPlaces: [], drops: [], lines: [], wires: [], ...over });

/** A minimal resolved plan: a streets layer (the given street cells, no blocks), no history, the given ruin adds. */
export function resolvedOf(w: number, h: number, streetCells: readonly (readonly [number, number])[], ruin: CityResolvedPlan["adds"]["ruin"] = []): CityResolvedPlan {
  const streets = { stage: "streets", w, h, cells: streetCells.map(([i, j]) => ({ i, j, role: "lane", street: null, band: 0 })), blocks: [] } as unknown as CityStreetsLayer;
  return { era: "ruin", plan: { layers: { streets } }, history: null, adds: { ruin }, states: [] } as unknown as CityResolvedPlan;
}

/** A world of `w` by `h` cells with the given parts over empty defaults. Cells in `classes` are what growth may cross (`[i, j, class]`); `soil` are `[i, j]` cells of district `d`. */
export function fxWorld(o: { w?: number; h?: number; d?: CityDistrict; classes?: readonly (readonly [number, number, CellClass])[]; soil?: readonly (readonly [number, number])[] } & Partial<Omit<World, "soil">> = {}): World {
  const w = o.w ?? 8;
  const h = o.h ?? 8;
  const d = o.d ?? district("d1", 0.9);
  const classOf = new Map<number, CellClass>();
  for (const [i, j, c] of o.classes ?? []) classOf.set(cellKey(i, j), c);
  const soilKeys = new Set<number>();
  const soil = (o.soil ?? []).map(([i, j]) => {
    soilKeys.add(cellKey(i, j));
    classOf.set(cellKey(i, j), classOf.get(cellKey(i, j)) ?? "open");
    return { i, j, district: d.id, wild: d.wild };
  });
  const resolved = o.resolved ?? resolvedOf(w, h, [...classOf.entries()].filter(([, c]) => c !== "open").map(([k]) => [Math.floor(k / 100000) - 1000, (k % 100000) - 1000] as const));
  const streets = resolved.plan.layers.streets!;
  const base: World = {
    w,
    h,
    resolved,
    streets,
    districts: [d],
    districtById: new Map([[d.id, d]]),
    built: new Set(),
    classOf,
    soil,
    soilKeys,
    wallDir: () => null,
    obstacles: new RectIndex<Obstacle>(),
    parks: [],
    decks: [],
    faces: [],
    hosts: [],
    posts: [],
    trees: [],
    standing: [],
  };
  const { w: _w, h: _h, d: _d, classes: _c, soil: _s, ...rest } = o;
  void _w, _h, _d, _c, _s;
  return { ...base, ...rest };
}

/** A standing obstacle over a cell-sized rectangle, from base 0 to `top`. */
export function obstacle(index: RectIndex<Obstacle>, cx: number, cz: number, w: number, d: number, top = 2): void {
  const rect = rectAt(cx, cz, w, d);
  index.add(rect, { rect, base: 0, top });
}

/** The reach of a district in cells (the spread's own rounding), for a test that hand-works a fixture. */
export const reach = reachOf;
export const cellCentre = (i: number): number => (i + 0.5) * CELL_M;

/**
 * A hand-placed circuit laid on a real city (stage 6 is empty until K2), for the reports and the era-level fixtures: a pole beside every 25th pavement cell, a street light beside every 31st, a lamp-post place beside every 37th,
 * a drop on every 61st cell that fronts a building, and a span between consecutive poles under 60 m apart. A point an earlier pass's piece covers (T-1 judges every era's adds) is left out, and so is a pole an earlier pass's piece already
 * cuts off on foot (the hold-out was built with no circuit).
 */
export function handCircuit(base: CityEraPlan): CircuitPoints {
  const before = resolveBefore(base, "ruin");
  const earlier = [...(before.adds.tech ?? []), ...(before.adds.holdout ?? [])];
  const covered = (x: number, z: number, m: number): boolean => earlier.some((a) => Math.abs(x - a.placement.x_m) <= a.size.x_m / 2 + m && Math.abs(z - a.placement.z_m) <= a.size.z_m / 2 + m);
  const edge = base.plan.layers.edge!;
  const mass = base.plan.layers.mass!;
  const builtAt = new Set(mass.cells.filter((c) => c.use === "built").map((c) => cellKey(c.i, c.j)));
  const pave = edge.cells.filter((c) => c.role === "pavement");
  const at = (c: { i: number; j: number }, dx: number, dz: number) => ({ x_m: (c.i + 0.5) * CELL_M + dx, z_m: (c.j + 0.5) * CELL_M + dz });
  let poles = pave
    .filter((_, n) => n % 25 === 0)
    .map((c, n) => ({ id: `pole:${n}`, ...at(c, 1, 1) }))
    .filter((p) => !covered(p.x_m, p.z_m, 1));
  for (let round = 0; round < 8; round++) {
    const f = t2Failures(before, { bounds: ruinBounds, isTree: ruinIsTree, circuit: emptyCircuit({ poles }) });
    if (f.length === 0) break;
    const bad = new Set(f.map((x) => x.pole));
    poles = poles.filter((p) => !bad.has(p.id));
  }
  const lights = pave
    .filter((_, n) => n % 31 === 7)
    .map((c, n) => ({ id: `light:${n}`, ...at(c, -1.5, 1.5) }))
    .filter((p) => !covered(p.x_m, p.z_m, 1));
  const lampPlaces = pave
    .filter((_, n) => n % 37 === 11)
    .map((c, n) => ({ id: `lamp:${n}`, ...at(c, -1, -1) }))
    .filter((p) => !covered(p.x_m, p.z_m, 1));
  const drops = pave
    .filter((_, n) => n % 61 === 13)
    .flatMap((c, n) => {
      for (const [di, dj] of [[-1, 0], [1, 0], [0, -1], [0, 1]] as const) {
        if (!builtAt.has(cellKey(c.i + di, c.j + dj))) continue;
        const wall = at(c, di * 2.5, dj * 2.5);
        if ([0, 1, 2, 3].some((t) => covered(wall.x_m - di * t, wall.z_m - dj * t, 1))) return [];
        return [{ id: `drop:${n}`, wall, out: { x_m: -di, z_m: -dj } }];
      }
      return [];
    });
  const lines = poles
    .slice(1)
    .map((p, n) => ({ p, q: poles[n]! }))
    .filter(({ p, q }) => Math.hypot(p.x_m - q.x_m, p.z_m - q.z_m) < 60)
    .map(({ p, q }, n) => ({ id: `span:${n}`, a: { x_m: q.x_m, z_m: q.z_m }, b: { x_m: p.x_m, z_m: p.z_m } }));
  return emptyCircuit({ poles, lights, lampPlaces, drops, lines });
}
