/**
 * Stage 11: the boxes of stage 7 and stage 8 (ticket 073 D1). Everything the pass keeps clear of, from the layers before it, worked out once per city:
 * - **Stage 7's boxes** (`s7Boxes`): every dressing piece but glass, every wall piece (escapes with their ladder boxes, canopies, air-conditioners, planters, the party-wall kit), every face novelty sign and every roof piece,
 *   as a footprint with the height range it fills. The free-third test reads all of them; the pavement's AV and EL read the ones that can stand over a walk (`pav`), as stage 8's `buildAvoid` does.
 * - **Stage 8's keep-outs** (KO, DK): kerb cuts, corner cells and dips; a residents' door's strip.
 */

import { CITY_GROUND_VARIANT, type CalibrationKey, type CityCell, type CityEdgeLayer, type CityFaceKind, type CityFacadesLayer, type CityMassLayer } from "../../core";
import { CityStageError } from "../pipeline/error";
import { CELL_M, EPS, FURN_KEEP_M } from "./constants";
import { Grid, SIDE_VEC, cellKey, overlaps, rectAt, rectDist, rotate, turned, type Rect } from "./geom";
import { CODE_ESCAPE_D_M, CODE_ESCAPE_KEY, CODE_ESCAPE_W_M, s7Bounds } from "./s7bounds";

/** One box of stage 7: its footprint, the heights it fills, and what AV and EL need. */
export interface S7Box extends Rect {
  /** The bottom and top of the piece, metres over the walk. */
  readonly y0: number;
  readonly y1: number;
  /** AV's base: the piece's own base; Infinity for a ladder box (stage 8's rule). */
  readonly base: number;
  /** EL: an escape's lowest box (the drop ladder's foot); the base for every other piece. */
  readonly low: number;
  readonly src: string;
  readonly escape: boolean;
  /** True when a piece can stand over the walk (stage 8's AV reads it). */
  readonly pav: boolean;
}

export interface Ks {
  readonly facades: Pick<CityFacadesLayer, "ground" | "dressing" | "walls" | "novelty" | "roofs">;
}

/** Stage 7's boxes. Throws a `CityStageError` for a key that is in no copy of stage 7's bounds (R-6). */
export function s7Boxes(layers: Ks): Grid<S7Box> {
  const boxes = new Grid<S7Box>();
  const bounds = (key: CalibrationKey, what: string): { w: number; h: number; d: number } => {
    const e = s7Bounds(key);
    if (!e) throw new CityStageError(`R-6: the ${what} key ${key} is not in the tech stage's copy of stage 7's bounds`);
    return e;
  };
  const add = (r: Rect, y0: number, y1: number, src: string, pav: boolean, base = y0, low = y0, escape = false): void => {
    boxes.add({ ...r, y0, y1, base, low, src, escape, pav });
  };
  for (const p of layers.facades.dressing ?? []) {
    if (p.kind === "glass") continue;
    const e = bounds(p.placement.key, "dressing");
    add(rectAt(p.placement.x_m, p.placement.z_m, e.w, e.d, p.placement.yaw_deg), p.placement.y_m, p.placement.y_m + e.h, p.kind, true);
  }
  for (const p of layers.facades.novelty ?? []) {
    const e = bounds(p.placement.key, "novelty");
    add(rectAt(p.placement.x_m, p.placement.z_m, e.w, e.d, p.placement.yaw_deg), p.placement.y_m, p.placement.y_m + e.h, "novelty", true);
  }
  const groups = new Map<string, NonNullable<CityFacadesLayer["walls"]>[number][]>();
  for (const p of layers.facades.walls ?? []) {
    if (p.kind === "escape") {
      const g = `${p.building}|${cellKey(p.cell.i, p.cell.j)}`;
      const list = groups.get(g);
      if (list) list.push(p);
      else groups.set(g, [p]);
      continue;
    }
    const e = bounds(p.placement.key, "wall");
    const pav = p.kind === "canopy" || p.kind === "aircon" || p.kind === "planter";
    add(rectAt(p.placement.x_m, p.placement.z_m, e.w, e.d, p.placement.yaw_deg), p.placement.y_m, p.placement.y_m + e.h * p.scaleY, p.kind, pav);
  }
  for (const pieces of groups.values()) {
    let low = Infinity;
    for (const p of pieces) {
      low = Math.min(low, p.placement.y_m);
      for (const bx of p.boxes) low = Math.min(low, p.placement.y_m + bx.y_m - bx.h_m / 2);
    }
    for (const p of pieces) {
      const pl = p.placement;
      let rect: Rect;
      let top: number;
      if (pl.key === CODE_ESCAPE_KEY) {
        rect = rectAt(pl.x_m, pl.z_m, CODE_ESCAPE_W_M, CODE_ESCAPE_D_M, pl.yaw_deg);
        top = Math.max(pl.y_m, ...p.boxes.map((bx) => pl.y_m + bx.y_m + bx.h_m / 2));
      } else {
        const e = bounds(pl.key, "escape");
        rect = rectAt(pl.x_m, pl.z_m, e.w, e.d, pl.yaw_deg);
        top = pl.y_m + e.h * p.scaleY;
      }
      add(rect, pl.y_m, top, "escape", true, pl.y_m, low, true);
      if (pl.key !== CODE_ESCAPE_KEY) {
        for (const bx of p.boxes) {
          const c = rotate(pl.yaw_deg, bx.x_m, bx.z_m);
          const s = turned(bx.w_m, bx.d_m, pl.yaw_deg);
          add({ x0: pl.x_m + c.x - s.x / 2, x1: pl.x_m + c.x + s.x / 2, z0: pl.z_m + c.z - s.z / 2, z1: pl.z_m + c.z + s.z / 2 }, pl.y_m + bx.y_m - bx.h_m / 2, pl.y_m + bx.y_m + bx.h_m / 2, "escape", true, Infinity, low, true);
        }
      }
    }
  }
  for (const p of layers.facades.roofs ?? []) {
    const e = bounds(p.placement.key, "roof");
    add(rectAt(p.placement.x_m, p.placement.z_m, e.w, e.d, p.placement.yaw_deg), p.placement.y_m, p.placement.y_m + e.h, `roof:${p.kind}`, false);
  }
  return boxes;
}

/** The first box over [`y0`, `y1`) that overlaps the footprint (touching is not overlapping), or null. */
export function boxHit(boxes: Grid<S7Box>, r: Rect, y0: number, y1: number): S7Box | null {
  for (const b of boxes.near(r)) if (overlaps(r, b) && b.y0 < y1 - EPS && b.y1 > y0 + EPS) return b;
  return null;
}

/** AV and EL (stage 8's `avoidVerdict`): "AV" when a piece of height `h` is taller than the base of a pavement box it overlaps, "EL" when only an escape's lowered base says so, else null. */
export function avoidVerdict(boxes: Grid<S7Box>, r: Rect, h: number): "AV" | "EL" | null {
  let el = false;
  for (const b of boxes.near(r)) {
    if (!b.pav || !overlaps(r, b)) continue;
    if (h > b.base + EPS) return "AV";
    if (h > b.low + EPS) el = true;
  }
  return el ? "EL" : null;
}

// ---- stage 4's keep-outs and the residents' doors ----

export type KoWhy = "kerbCut" | "pavementCorner" | "dip";
export interface KoRect extends Rect {
  readonly why: KoWhy;
  readonly cell: CityCell;
}
export interface DoorStrip extends Rect {
  readonly face: CityFaceKind;
  readonly cell: CityCell;
}

/** KO: every edge cell of role `kerbCut` or `pavementCorner`, and every pavement cell with the dip variant. */
export function buildKo(edge: Pick<CityEdgeLayer, "cells" | "ground">): Grid<KoRect> {
  const ko = new Grid<KoRect>();
  const variant = new Map<string, number>();
  for (const g of edge.ground ?? []) if (g.cells === 1) variant.set(cellKey(g.i, g.j), g.variant);
  for (const c of edge.cells) {
    const dip = c.role === "pavement" && ((variant.get(cellKey(c.i, c.j)) ?? 0) & CITY_GROUND_VARIANT.pavementDip) !== 0;
    const why: KoWhy | null = c.role === "kerbCut" ? "kerbCut" : c.role === "pavementCorner" ? "pavementCorner" : dip ? "dip" : null;
    if (why) ko.add({ x0: c.i * CELL_M, x1: (c.i + 1) * CELL_M, z0: c.j * CELL_M, z1: (c.j + 1) * CELL_M, why, cell: { i: c.i, j: c.j } });
  }
  return ko;
}

/** DK: the strip in front of a residents' door's column: 5 m along each of its open sides, out `FURN_KEEP_M` from the wall. */
export function buildDoors(mass: Pick<CityMassLayer, "built">, facades: Pick<CityFacadesLayer, "ground">): Grid<DoorStrip> {
  const doors = new Grid<DoorStrip>();
  const builtAt = new Map(mass.built.map((c) => [cellKey(c.i, c.j), c] as const));
  for (const g of facades.ground) {
    if (g.kind !== "door" && g.kind !== "doorCorner") continue;
    for (const c of g.cells) {
      const bc = builtAt.get(cellKey(c.i, c.j));
      if (!bc) continue;
      for (const o of bc.open) {
        const [vx, vz] = SIDE_VEC[o.side];
        const x0 = c.i * CELL_M;
        const z0 = c.j * CELL_M;
        const r: Rect =
          vx === 1
            ? { x0: x0 + CELL_M, x1: x0 + CELL_M + FURN_KEEP_M, z0, z1: z0 + CELL_M }
            : vx === -1
              ? { x0: x0 - FURN_KEEP_M, x1: x0, z0, z1: z0 + CELL_M }
              : vz === 1
                ? { x0, x1: x0 + CELL_M, z0: z0 + CELL_M, z1: z0 + CELL_M + FURN_KEEP_M }
                : { x0, x1: x0 + CELL_M, z0: z0 - FURN_KEEP_M, z1: z0 };
        doors.add({ ...r, face: o.faces, cell: { i: c.i, j: c.j } });
      }
    }
  }
  return doors;
}

/** The kind of KO within `FURN_KEEP_M` of a footprint, or null. */
export function koHit(ko: Grid<KoRect>, r: Rect): KoWhy | null {
  for (const q of ko.near(r, FURN_KEEP_M)) if (rectDist(r, q) < FURN_KEEP_M - EPS) return q.why;
  return null;
}

/** DK: does the footprint overlap a residents' door's strip? */
export const inDoorStrip = (doors: Grid<DoorStrip>, r: Rect): boolean => doors.near(r).some((d) => overlaps(r, d));
