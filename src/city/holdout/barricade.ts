/**
 * Stage 12, section E2, the "barricade" step: `Bld_Wall_02` lines across a held district's street mouths, last of all (option C; ticket 073 E2-Q2, E2-Q3). Pure.
 *
 * - **A street mouth** of a district is a junction arm such that the junction has an arm one of the district's blocks fronts, and the arm has none of the district's blocks on either side (the ring reading).
 * - **The line** runs across the arm at its crossing line, from the middle of the junction square's first ring cell to the middle of its last, through the cells' middles: `Bld_Wall_02` pieces end to end.
 * - **Always one way in.** A district's hashed-first mouth is never barricaded (by any district).
 * - **Option C.** A candidate, in hashed order, is placed only if with it standing (and the stage 9 pieces under it removed) `t1Failures` and `t2Failures` on everything placed so far are still empty; otherwise it is
 *   skipped. A placement rule, not a loosened check: `assertEraReadable` still runs on the whole layer at the end and throws.
 * - **It removes the stage 9 piece under it** (a traffic piece whose footprint its wall meets): one `remove` each, never two for one piece. It keeps clear of every other piece on the ground.
 */

import type { CityChange, CityDistrict, CityEraPiece, CityHoldoutPieceKind, CityResolvedPlan, CitySide, CityTrafficPiece } from "../../core";
import { swappedOf } from "../pipeline/resolve";
import { t1Failures, t2Failures, type ReadableOptions } from "../pipeline/readable";
import type { StageRand } from "../pipeline/seeds";
import { BAND_MID, CELL_M, CLEAN_GAP_M, P_BARRICADE } from "./constants";
import { cellKey, cellOfPoint, rectAt, turned, type Rect } from "./geom";
import { BARRICADE_KEY, KIT } from "./kit";
import { drawsOf } from "./rng";
import { meetsFacade, type JunctionRing, type World } from "./world";

type HoldoutPiece = CityEraPiece<CityHoldoutPieceKind>;

/** One street mouth of a district. */
export interface Mouth {
  readonly key: string;
  readonly junction: JunctionRing;
  readonly arm: CitySide;
}

const SIDES: readonly CitySide[] = ["+x", "-x", "+z", "-z"];

/** The cells just beside an arm's street, beyond the junction square: the blocks on its two sides. */
function beside(j: JunctionRing, arm: CitySide): readonly [number, number][] {
  switch (arm) {
    case "+x":
      return [[j.i1 + 1, j.j0 - 2], [j.i1 + 1, j.j1 + 1]];
    case "-x":
      return [[j.i0 - 2, j.j0 - 2], [j.i0 - 2, j.j1 + 1]];
    case "+z":
      return [[j.i0 - 2, j.j1 + 1], [j.i1 + 1, j.j1 + 1]];
    case "-z":
      return [[j.i0 - 2, j.j0 - 2], [j.i1 + 1, j.j0 - 2]];
  }
}

/** The street mouths of a district, in junction order (the streets layer's), each junction's arms in their listed order. */
export function mouthsOf(world: World, district: CityDistrict): Mouth[] {
  const mine = new Set(district.blocks);
  const out: Mouth[] = [];
  for (const j of world.junctions) {
    const fronts = world.junctionBlocks.get(j.id);
    if (fronts === undefined || !district.blocks.some((b) => fronts.has(b))) continue;
    for (const arm of j.arms) {
      const sides = beside(j, arm).map(([i, q]) => world.massAt.get(cellKey(i, q))?.block);
      if (sides.some((b) => b !== undefined && mine.has(b))) continue;
      out.push({ key: `${j.id}|${arm}`, junction: j, arm });
    }
  }
  return out;
}

/** The wall pieces of a mouth's line: their centres and turn. The line runs through the middles of the junction square's ring cells on the arm's side. */
export function wallLine(j: JunctionRing, arm: CitySide): { readonly yaw: 0 | 90; readonly centres: readonly (readonly [number, number])[] } {
  const alongX = arm === "+z" || arm === "-z";
  // the line's fixed coordinate, and its extent along the other axis (ring cells lo to hi, inclusive)
  const fixed = arm === "+x" ? j.i1 : arm === "-x" ? j.i0 - 1 : arm === "+z" ? j.j1 : j.j0 - 1;
  const lo = alongX ? j.i0 - 1 : j.j0 - 1;
  const hi = alongX ? j.i1 : j.j1;
  const start = (lo + 0.5) * CELL_M;
  const n = hi - lo;
  const centres: (readonly [number, number])[] = [];
  for (let k = 0; k < n; k++) {
    const along = start + CELL_M / 2 + k * CELL_M;
    const across = (fixed + 0.5) * CELL_M;
    centres.push(alongX ? [along, across] : [across, along]);
  }
  return { yaw: alongX ? 0 : 90, centres };
}

/** A district's mouths in hashed order: the first is always open. */
function hashedMouths(world: World, rand: StageRand, d: CityDistrict): Mouth[] {
  const { h } = drawsOf(rand);
  return mouthsOf(world, d).sort((a, b) => h("mouth", d.id, a.key) - h("mouth", d.id, b.key) || (a.key < b.key ? -1 : 1));
}

/** The mouths no district barricades: the hashed-first mouth of each district at the barricade band. */
export function protectedMouths(world: World, rand: StageRand): ReadonlySet<string> {
  const out = new Set<string>();
  for (const d of world.districts) {
    if (d.held < BAND_MID) continue;
    const first = hashedMouths(world, rand, d)[0];
    if (first !== undefined) out.add(first.key);
  }
  return out;
}

export interface BarricadeStats {
  /** Street mouths of districts at the barricade band, and those that rolled a barricade (candidates). */
  mouths: number;
  candidates: number;
  placed: number;
  skippedT1: number;
  skippedT2: number;
  /** Skipped because a wall would meet a piece it may not remove, or because another barricade already held the arm. */
  skippedOverlap: number;
  skippedTaken: number;
  /** Candidates left open because the district's first mouth, or another district's, is always open. */
  protectedOpen: number;
  /** Stage 9 pieces removed. */
  trafficRemoves: number;
  /** Walls in a line, smallest and largest. */
  wallsMin: number;
  wallsMax: number;
}

export interface BarricadeResult {
  readonly adds: readonly HoldoutPiece[];
  readonly changes: readonly CityChange[];
  readonly stats: BarricadeStats;
}

/**
 * Places the barricades. `base` is the plan resolved with the settle step's layer; `options` carries the kit's bounds and the circuit. Each accepted candidate becomes part of the plan the next is judged on.
 */
export function placeBarricades(world: World, rand: StageRand, base: CityResolvedPlan, options: ReadableOptions): BarricadeResult {
  const { h, u } = drawsOf(rand);
  const stats: BarricadeStats = { mouths: 0, candidates: 0, placed: 0, skippedT1: 0, skippedT2: 0, skippedOverlap: 0, skippedTaken: 0, protectedOpen: 0, trafficRemoves: 0, wallsMin: Infinity, wallsMax: 0 };
  const swapped = swappedOf(base);
  const opts: ReadableOptions = { ...options, swapped: options.swapped ?? swapped };

  // ---- the candidates, in hashed order ----
  const protectedKeys = new Set<string>();
  const cands: { district: CityDistrict; mouth: Mouth; order: number }[] = [];
  for (const d of world.districts) {
    if (d.held < BAND_MID) continue;
    const ms = hashedMouths(world, rand, d);
    stats.mouths += ms.length;
    if (ms.length === 0) continue;
    protectedKeys.add(ms[0]!.key);
    for (const m of ms.slice(1)) {
      if (u("barricade", "p", d.id, m.key) < P_BARRICADE * d.held) cands.push({ district: d, mouth: m, order: h("barricade", "order", d.id, m.key) });
    }
  }
  cands.sort((a, b) => a.order - b.order || (a.district.id + a.mouth.key < b.district.id + b.mouth.key ? -1 : 1));
  stats.candidates = cands.length;

  const adds: HoldoutPiece[] = [];
  const changes: CityChange[] = [];
  const removed = new Set<CityTrafficPiece>();
  const done = new Set<string>();
  const baseTraffic = base.plan.layers.traffic;
  const k = KIT[BARRICADE_KEY]!;

  const variantOf = (walls: readonly HoldoutPiece[], gone: ReadonlySet<CityTrafficPiece>): CityResolvedPlan => {
    const layers = baseTraffic === undefined ? base.plan.layers : { ...base.plan.layers, traffic: { ...baseTraffic, pieces: baseTraffic.pieces.filter((p) => !gone.has(p)) } };
    return { ...base, plan: { ...base.plan, layers }, adds: { ...base.adds, holdout: [...(base.adds.holdout ?? []), ...adds, ...walls] } };
  };

  for (const c of cands) {
    const key = c.mouth.key;
    if (protectedKeys.has(key)) {
      stats.protectedOpen++;
      continue;
    }
    if (done.has(key)) {
      stats.skippedTaken++;
      continue;
    }
    const line = wallLine(c.mouth.junction, c.mouth.arm);
    const t = turned(k.w, k.d, line.yaw);
    const walls: HoldoutPiece[] = line.centres.map(([x, z], n) => ({
      id: `holdout:barricade:${key}:${n}`,
      kind: "barricade",
      district: c.district.id,
      cell: cellOfPoint(x, z),
      placement: { key: BARRICADE_KEY, x_m: x, y_m: 0, z_m: z, yaw_deg: line.yaw },
      size: { x_m: t.x, z_m: t.z, h_m: k.h },
    }));
    stats.wallsMin = Math.min(stats.wallsMin, walls.length);
    stats.wallsMax = Math.max(stats.wallsMax, walls.length);

    // What the walls stand on: traffic pieces are removed; anything else on the ground blocks the line.
    const under = new Set<CityTrafficPiece>();
    let blocked = false;
    for (const w of walls) {
      const r: Rect = rectAt(w.placement.x_m, w.placement.z_m, w.size.x_m, w.size.z_m);
      if (meetsFacade(world, r, w.placement.y_m, w.placement.y_m + w.size.h_m, CLEAN_GAP_M)) blocked = true;
      for (const hit of world.obstacles.query(r)) {
        if (hit.tag.piece === null) blocked = true;
        else if (!removed.has(hit.tag.piece)) under.add(hit.tag.piece);
      }
    }
    if (blocked) {
      stats.skippedOverlap++;
      continue;
    }

    // Option C: T-1 and T-2 must still hold with the walls standing and the pieces under them gone.
    const gone = new Set([...removed, ...under]);
    const variant = variantOf(walls, gone);
    const t1 = t1Failures(variant, opts);
    if (t1.length > 0) {
      stats.skippedT1++;
      continue;
    }
    const t2 = t2Failures(variant, opts);
    if (t2.length > 0) {
      stats.skippedT2++;
      continue;
    }

    adds.push(...walls);
    done.add(key);
    stats.placed++;
    for (const p of under) {
      removed.add(p);
      const e = world.traffic.find((x) => x.piece === p);
      if (e !== undefined) {
        changes.push({ ref: { list: "traffic.pieces", index: e.index, key: p.placement.key }, op: "remove" });
        stats.trafficRemoves++;
      }
    }
  }
  if (stats.wallsMin === Infinity) stats.wallsMin = 0;
  return { adds, changes, stats };
}

/** The sides of a junction square, for tests. */
export const ARM_SIDES = SIDES;
