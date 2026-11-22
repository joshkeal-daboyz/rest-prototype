/**
 * Stage 9: plan geometry on the lattice (cell (i, j) covers x in [i, i+1) * 5 m, z in [j, j+1) * 5 m; the quarter turns are three.js's: at 90 a piece's own +z faces +x), making a piece, and CL: what a piece keeps clear of
 * (ticket 070 TR1; grammar rules 5, 9 and 10). A copy of stage 8's rectangles and keep-out rules where it needs them, with its own stage 7 bounds (`facadebounds.ts`); this folder never imports another stage's folder (R-1).
 * - **Stage 8's props.** A grounded piece keeps `FURN_GAP_M` from every non-flat prop's footprint.
 * - **Stage 7's boxes** (AV, EL; as stage 8's): every dressing piece but glass, every escape, canopy, aircon and planter wall piece, and every face novelty sign is a box with a base. A piece taller than a box's base does not stand under it;
 *   a piece with a lift (an arm) is judged by its own interval against the box's.
 * - **Stage 5's buildings.** No piece's footprint overlaps a built cell.
 * - **Stage 6's points.** A grounded piece keeps `FURN_KEEP_M` from each (none today: the stage passes an empty list).
 * - **Build-out trees.** A grounded piece keeps `TREE_CLEAR_M` from each tree's centre.
 */

import type { CalibrationKey, CityCell, CityEdgeLayer, CityFacadesLayer, CityGroundLayer, CityMassLayer, CityPlacement, CitySide, CityTrafficPiece, CityTrafficPieceKind } from "../../core";
import { CityStageError } from "../pipeline/error";
import { CELL_M, EPS, FURN_GAP_M, FURN_KEEP_M, TOL, TREE_CLEAR_M } from "./constants";
import { AVOID_NOVELTY_BOUNDS, CODE_ESCAPE_D_M, CODE_ESCAPE_KEY, CODE_ESCAPE_W_M, avoidBounds } from "./facadebounds";
import { KEY_OF_KIND, MAST, boundsOf } from "./kit";

// ---- geometry ----

/** An axis-aligned rectangle on the ground, metres. */
export interface Rect {
  readonly x0: number;
  readonly x1: number;
  readonly z0: number;
  readonly z1: number;
}

/** The distance between two rectangles (0 where they touch or overlap). */
export const rectDist = (a: Rect, b: Rect): number => Math.hypot(Math.max(0, a.x0 - b.x1, b.x0 - a.x1), Math.max(0, a.z0 - b.z1, b.z0 - a.z1));

/** Do the two rectangles overlap, or lie closer than `margin` along both axes, by more than `TOL`? Footprints that only touch do not overlap. */
export const overlaps = (a: Rect, b: Rect, margin = 0): boolean => a.x0 < b.x1 + margin - TOL && b.x0 < a.x1 + margin - TOL && a.z0 < b.z1 + margin - TOL && b.z0 < a.z1 + margin - TOL;

/** Is `inner` inside `outer`, to within `TOL`? */
export const within = (inner: Rect, outer: Rect): boolean => inner.x0 >= outer.x0 - TOL && inner.x1 <= outer.x1 + TOL && inner.z0 >= outer.z0 - TOL && inner.z1 <= outer.z1 + TOL;

/** A bucket grid of rectangles by 5 m cell, so the tests look only at the neighbours. */
export class Grid<T extends Rect> {
  private readonly cells = new Map<string, T[]>();
  readonly items: T[] = [];

  add(r: T): void {
    this.items.push(r);
    for (let i = Math.floor(r.x0 / CELL_M); i <= Math.floor((r.x1 - 1e-9) / CELL_M); i++) {
      for (let j = Math.floor(r.z0 / CELL_M); j <= Math.floor((r.z1 - 1e-9) / CELL_M); j++) {
        const key = `${i},${j}`;
        const list = this.cells.get(key);
        if (list) list.push(r);
        else this.cells.set(key, [r]);
      }
    }
  }

  /** Every item that may lie within `reach` metres of `r` (a superset; the caller tests). */
  near(r: Rect, reach = 0): T[] {
    const seen = new Set<T>();
    for (let i = Math.floor((r.x0 - reach) / CELL_M); i <= Math.floor((r.x1 + reach) / CELL_M); i++) {
      for (let j = Math.floor((r.z0 - reach) / CELL_M); j <= Math.floor((r.z1 + reach) / CELL_M); j++) for (const x of this.cells.get(`${i},${j}`) ?? []) seen.add(x);
    }
    return [...seen];
  }
}

/** The unit vector out of a cell through a side. */
export const SIDE_VEC: Readonly<Record<CitySide, readonly [number, number]>> = { "+x": [1, 0], "-x": [-1, 0], "+z": [0, 1], "-z": [0, -1] };

/** The turn, degrees, that brings a key's own +z front onto a side. */
export const SIDE_YAW: Readonly<Record<CitySide, 0 | 90 | 180 | 270>> = { "+z": 0, "+x": 90, "-z": 180, "-x": 270 };

/** The side a unit vector (one of the four axes) points through. */
export const sideOf = (dx: number, dz: number): CitySide => (dx > 0 ? "+x" : dx < 0 ? "-x" : dz > 0 ? "+z" : "-z");

/** The turn as a quarter count 0 to 3. */
export const quarterOf = (yaw: number): number => ((Math.round(yaw / 90) % 4) + 4) % 4;

/** The turn, degrees, as one of 0, 90, 180, 270. */
export const normYaw = (yaw: number): 0 | 90 | 180 | 270 => (quarterOf(yaw) * 90) as 0 | 90 | 180 | 270;

/** A footprint of w by d (own x by own z) after a quarter turn: world x then world z. */
export const turned = (w: number, d: number, yaw: number): { readonly x: number; readonly z: number } => (quarterOf(yaw) & 1 ? { x: d, z: w } : { x: w, z: d });

/** A point turned by `yaw` (a quarter): three.js's turn about y, x' = x cos + z sin, z' = -x sin + z cos, exact. */
export function rotate(yaw: number, x: number, z: number): { x: number; z: number } {
  const n = (v: number): number => (v === 0 ? 0 : v);
  switch (quarterOf(yaw)) {
    case 0:
      return { x: n(x), z: n(z) };
    case 1:
      return { x: n(z), z: n(-x) };
    case 2:
      return { x: n(-x), z: n(-z) };
    default:
      return { x: n(-z), z: n(x) };
  }
}

/** The rectangle of a w by d footprint (own axes) centred at (x, z) after a quarter turn. */
export function rectAt(x: number, z: number, w: number, d: number, yaw: number): Rect {
  const s = turned(w, d, yaw);
  return { x0: x - s.x / 2, x1: x + s.x / 2, z0: z - s.z / 2, z1: z + s.z / 2 };
}

/** The cell a point is in. */
export const cellOfPoint = (x: number, z: number): CityCell => ({ i: Math.floor(x / CELL_M), j: Math.floor(z / CELL_M) });

/** The rectangle of a cell. */
export const cellRect = (c: CityCell): Rect => ({ x0: c.i * CELL_M, x1: (c.i + 1) * CELL_M, z0: c.j * CELL_M, z1: (c.j + 1) * CELL_M });

export const cellKey = (i: number, j: number): string => `${i},${j}`;

// ---- making a piece ----

export interface PieceSpec {
  readonly kind: CityTrafficPieceKind;
  readonly host: string;
  readonly approach: string | null;
  readonly group: string;
  readonly grounded: boolean;
  readonly street: string | null;
  /** The pivot (the bounds' centre in x and z), metres, and the base height. */
  readonly x: number;
  readonly y: number;
  readonly z: number;
  readonly yaw: number;
  /** The cell to record; default the pivot's own. */
  readonly cell?: CityCell;
}

/** A piece of the kit: its key and size from the kit, its cell from its pivot unless the spec names one. */
export function makePiece(s: PieceSpec): CityTrafficPiece {
  const key = KEY_OF_KIND[s.kind];
  if (!key) throw new Error(`${s.kind} has no key in the traffic kit yet`);
  const e = boundsOf(key);
  const yaw = normYaw(s.yaw);
  const size = turned(e.w, e.d, yaw);
  const placement: CityPlacement = { key, x_m: s.x, y_m: s.y, z_m: s.z, yaw_deg: yaw };
  return { kind: s.kind, host: s.host, approach: s.approach, group: s.group, grounded: s.grounded, street: s.street, cell: s.cell ?? cellOfPoint(s.x, s.z), placement, size: { x_m: size.x, z_m: size.z, h_m: e.h } };
}

/** A piece's rectangle in plan: its bounds after the turn. */
export const pieceRect = (p: CityTrafficPiece): Rect => ({ x0: p.placement.x_m - p.size.x_m / 2, x1: p.placement.x_m + p.size.x_m / 2, z0: p.placement.z_m - p.size.z_m / 2, z1: p.placement.z_m + p.size.z_m / 2 });

/** A mast's pole axis in plan: its pivot plus the kit's axis offset, turned. */
export function poleOf(p: CityTrafficPiece): { x: number; z: number } {
  const o = rotate(p.placement.yaw_deg, MAST.axis.x, MAST.axis.z);
  return { x: p.placement.x_m + o.x, z: p.placement.z_m + o.z };
}

/** The footprint CL and the place check use: a mast's is its pole's foot (not the lamp hook's bounds); every other piece's is its bounds. */
export function footOf(p: CityTrafficPiece): Rect {
  if (p.kind !== "signalMast") return pieceRect(p);
  const c = poleOf(p);
  return rectAt(c.x, c.z, MAST.foot.w, MAST.foot.d, p.placement.yaw_deg);
}

/** The cell a piece stands in: a mast's is its pole's, every other piece's its pivot's. */
export const standCell = (p: CityTrafficPiece): CityCell => {
  if (p.kind !== "signalMast") return cellOfPoint(p.placement.x_m, p.placement.z_m);
  const c = poleOf(p);
  return cellOfPoint(c.x, c.z);
};

// ---- CL ----

/** A point stage 6 will place (a pole, a lamp post, a node), metres. */
export interface KeepPoint {
  readonly x_m: number;
  readonly z_m: number;
}

/** A box of stage 7: its footprint, `base`, `top` (Infinity for an escape piece), the tile city's rule base (Infinity for a ladder box) and `low` (EL: the escape's lowest box; the base for every other piece). */
export interface AvoidBox extends Rect {
  readonly base: number;
  readonly top: number;
  readonly low: number;
  readonly escape: boolean;
}

export interface PropBox extends Rect {
  readonly kind: string;
}

export interface TreeAt {
  readonly x_m: number;
  readonly z_m: number;
}

export interface ClearInput {
  readonly mass: Pick<CityMassLayer, "built">;
  readonly edge: Pick<CityEdgeLayer, "cells" | "ground" | "buildoutTrees">;
  readonly facades: Pick<CityFacadesLayer, "dressing" | "walls" | "novelty">;
  readonly ground: Pick<CityGroundLayer, "props">;
  /** What stage 6 will place (poles, lamp posts, nodes). Empty until K. */
  readonly keepPoints?: readonly KeepPoint[];
}

export interface ClearCtx {
  readonly avoid: Grid<AvoidBox>;
  readonly props: Grid<PropBox>;
  readonly built: Grid<Rect>;
  readonly trees: readonly TreeAt[];
  readonly points: readonly KeepPoint[];
}

/** Stage 7's boxes (AV) with the escapes' lowest bases (EL); the same set as stage 8's, with each box's top. */
function buildAvoid(facades: Pick<CityFacadesLayer, "dressing" | "walls" | "novelty">): Grid<AvoidBox> {
  const avoid = new Grid<AvoidBox>();
  const boundsFor = (key: CalibrationKey, what: string): { w: number; h: number; d: number } => {
    const e = avoidBounds(key);
    if (!e) throw new CityStageError(`AV: the ${what} key ${key} is not in the stage's copy of stage 7's bounds`);
    return e;
  };
  for (const p of facades.dressing ?? []) {
    if (p.kind === "glass") continue;
    const e = boundsFor(p.placement.key, "dressing");
    avoid.add({ ...rectAt(p.placement.x_m, p.placement.z_m, e.w, e.d, p.placement.yaw_deg), base: p.placement.y_m, top: p.placement.y_m + e.h, low: p.placement.y_m, escape: false });
  }
  for (const p of facades.novelty ?? []) {
    const e = AVOID_NOVELTY_BOUNDS[p.placement.key];
    if (!e) throw new CityStageError(`AV: the novelty key ${p.placement.key} is not in the stage's copy of stage 7's bounds`, [p.cell]);
    avoid.add({ ...rectAt(p.placement.x_m, p.placement.z_m, e.w, e.d, p.placement.yaw_deg), base: p.placement.y_m, top: p.placement.y_m + e.h, low: p.placement.y_m, escape: false });
  }
  const groups = new Map<string, NonNullable<CityFacadesLayer["walls"]>[number][]>();
  for (const p of facades.walls ?? []) {
    if (p.kind === "escape") {
      const g = `${p.building}|${cellKey(p.cell.i, p.cell.j)}`;
      const list = groups.get(g);
      if (list) list.push(p);
      else groups.set(g, [p]);
      continue;
    }
    if (p.kind !== "canopy" && p.kind !== "aircon" && p.kind !== "planter") continue;
    const e = boundsFor(p.placement.key, "wall");
    avoid.add({ ...rectAt(p.placement.x_m, p.placement.z_m, e.w, e.d, p.placement.yaw_deg), base: p.placement.y_m, top: p.placement.y_m + e.h, low: p.placement.y_m, escape: false });
  }
  for (const pieces of groups.values()) {
    const rects: { r: Rect; base: number }[] = [];
    let low = Infinity;
    for (const p of pieces) {
      const pl = p.placement;
      if (pl.key === CODE_ESCAPE_KEY) rects.push({ r: rectAt(pl.x_m, pl.z_m, CODE_ESCAPE_W_M, CODE_ESCAPE_D_M, pl.yaw_deg), base: pl.y_m });
      else {
        const e = boundsFor(pl.key, "escape");
        rects.push({ r: rectAt(pl.x_m, pl.z_m, e.w, e.d, pl.yaw_deg), base: pl.y_m });
      }
      low = Math.min(low, pl.y_m);
      for (const bx of p.boxes) {
        const c = rotate(pl.yaw_deg, bx.x_m, bx.z_m);
        const s = turned(bx.w_m, bx.d_m, pl.yaw_deg);
        low = Math.min(low, pl.y_m + bx.y_m - bx.h_m / 2);
        // a code-drawn escape's footprint already covers its boxes; a ladder box of a kit piece may stand outside its piece's bounds
        if (pl.key !== CODE_ESCAPE_KEY) rects.push({ r: { x0: pl.x_m + c.x - s.x / 2, x1: pl.x_m + c.x + s.x / 2, z0: pl.z_m + c.z - s.z / 2, z1: pl.z_m + c.z + s.z / 2 }, base: Infinity });
      }
    }
    for (const { r, base } of rects) avoid.add({ ...r, base, top: Infinity, low, escape: true });
  }
  return avoid;
}

/** Everything a piece keeps clear of, from the layers before stage 9 and the keep points. */
export function buildClear(input: ClearInput): ClearCtx {
  const props = new Grid<PropBox>();
  for (const p of input.ground.props) {
    if (p.flat) continue;
    props.add({ x0: p.placement.x_m - p.size.x_m / 2, x1: p.placement.x_m + p.size.x_m / 2, z0: p.placement.z_m - p.size.z_m / 2, z1: p.placement.z_m + p.size.z_m / 2, kind: p.kind });
  }
  const built = new Grid<Rect>();
  for (const c of input.mass.built) built.add(cellRect(c));
  return { avoid: buildAvoid(input.facades), props, built, trees: input.edge.buildoutTrees ?? [], points: input.keepPoints ?? [] };
}

/** The keep-outs of an input, built once per input object (the layers are frozen, so the fixtures reuse them). */
const CTX = new WeakMap<object, ClearCtx>();
export function clearOf(input: ClearInput): ClearCtx {
  let c = CTX.get(input);
  if (!c) {
    c = buildClear(input);
    CTX.set(input, c);
  }
  return c;
}

/** AV and EL for a footprint standing from `lo` to `hi` above the surface: "AV" under or inside a stage 7 box, "EL" where only an escape's lowered base (its drop ladder) says so, else null. */
export function avoidVerdict(ctx: ClearCtx, r: Rect, lo: number, hi: number): "AV" | "EL" | null {
  let el = false;
  for (const b of ctx.avoid.near(r)) {
    if (!overlaps(r, b)) continue;
    if (lo < b.top - EPS && hi > b.base + EPS) return "AV";
    if (lo < b.top - EPS && hi > b.low + EPS) el = true;
  }
  return el ? "EL" : null;
}

/** The reasons a piece is not clear of what was placed before it (empty when it is clear). */
export function clearReasons(ctx: ClearCtx, p: CityTrafficPiece): string[] {
  const out: string[] = [];
  const y0 = p.placement.y_m;
  const y1 = y0 + p.size.h_m;
  const foot = footOf(p);
  const box = (r: Rect, lo: number, hi: number, what: string): void => {
    const av = avoidVerdict(ctx, r, lo, hi);
    if (av !== null) out.push(`${what} stands under or in a stage 7 piece (${av === "EL" ? "EL: a fire escape's drop ladder" : "AV"})`);
  };
  box(foot, y0, y1, p.kind);
  if (p.kind === "signalMast") box(pieceRect(p), y0 + MAST.hookY, y1, "the mast's lamp hook");
  const hit = (g: Grid<Rect>, r: Rect): boolean => g.near(r).some((b) => overlaps(r, b));
  if (hit(ctx.built, p.kind === "signalMast" ? pieceRect(p) : foot)) out.push(`${p.kind} enters a stage 5 building`);
  if (p.grounded) {
    for (const q of ctx.props.near(foot, FURN_GAP_M)) if (overlaps(foot, q, FURN_GAP_M)) out.push(`${p.kind} is within ${FURN_GAP_M} m of a stage 8 ${q.kind}`);
    for (const k of ctx.points) if (rectDist(foot, { x0: k.x_m, x1: k.x_m, z0: k.z_m, z1: k.z_m }) < FURN_KEEP_M - EPS) out.push(`${p.kind} is within ${FURN_KEEP_M} m of a stage 6 point`);
    for (const t of ctx.trees) if (rectDist(foot, { x0: t.x_m, x1: t.x_m, z0: t.z_m, z1: t.z_m }) < TREE_CLEAR_M - EPS) out.push(`${p.kind} is within ${TREE_CLEAR_M} m of a build-out tree`);
  }
  return out;
}

/** The closest a grounded piece's footprint lies to a stage 8 prop's footprint (for the report): Infinity where none is within `reach`. */
export function closestProp(ctx: ClearCtx, p: CityTrafficPiece, reach = 6): number {
  const foot = footOf(p);
  let best = Infinity;
  for (const q of ctx.props.near(foot, reach)) best = Math.min(best, rectDist(foot, q));
  return best;
}

/** The closest a piece's footprint lies to a stage 7 box whose base is below the piece's top (for the report): Infinity where none is within `reach`. */
export function closestBox(ctx: ClearCtx, p: CityTrafficPiece, reach = 6): number {
  const foot = footOf(p);
  const top = p.placement.y_m + p.size.h_m;
  let best = Infinity;
  for (const b of ctx.avoid.near(foot, reach)) if (b.base < top) best = Math.min(best, rectDist(foot, b));
  return best;
}
