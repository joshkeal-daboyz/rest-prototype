/**
 * Test support for stage 13 (ticket 073 F1): hand-made worlds, so each rule is proven on a fixture with hand-placed soil, obstacles, poles, spans, drops and slots. Imported by tests only, never by the stage.
 */
import type { CityDistrict, CityResolvedPlan, CityStreetsLayer } from "../../core";
import type { CircuitPoints } from "../pipeline/readable";
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
