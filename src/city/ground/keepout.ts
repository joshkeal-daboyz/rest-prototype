/**
 * Stage 8: what a prop keeps clear of (ticket 070 I; KO, AV, EL, DK, NL).
 * - **KO.** Stage 4's keep-outs, `tileKeepouts`' rectangles: every edge cell of role `kerbCut` or `pavementCorner`, and every pavement cell with `CITY_GROUND_VARIANT.pavementDip` (new on the split plan: a crossing lands there).
 *   No pavement prop and no lane bin comes within `FURN_KEEP_M` of one (Q28, answer 5: plaza, lot and green props are not tested).
 * - **AV.** Stage 7's reach: every dressing piece but glass, every wall piece of kind escape, canopy, aircon and planter, and every face novelty sign is a box (its kit bounds at its placement) with a base. A prop taller than a
 *   box's base does not overlap the box. The roof pieces and the party wall kit stand above a roof and are not read; the ground storeys are not boxes (GS).
 * - **EL** (Q28, answer 1). An escape's base is its lowest box (the drop ladder's foot), so nothing stands anywhere under an escape's footprint: every piece's rectangle, and the ladder's boxes' rectangles, take the escape's lowest base.
 * - **DK** (Q28, answer 2). The strip in front of a residents' door's column: 5 m along each of its open sides, out `FURN_KEEP_M` from the wall.
 * - **NL.** The stage places no lamp. `keepPoints` is what stage 6 will place (poles, lamp posts, nodes): today the stage passes none, and a fixture proves a point keeps a prop out.
 */

import { CITY_GROUND_VARIANT, type CalibrationKey, type CityCell, type CityFaceKind, type CityFacadesLayer, type CityEdgeLayer, type CityMassLayer } from "../../core";
import { CityStageError } from "../pipeline/error";
import { CELL_M, EPS, FURN_KEEP_M } from "./constants";
import { AVOID_NOVELTY_BOUNDS, CODE_ESCAPE_D_M, CODE_ESCAPE_KEY, CODE_ESCAPE_W_M, avoidBounds } from "./facadebounds";
import { Grid, SIDE_VEC, cellKey, overlaps, rectAt, rectDist, rotate, turned, type Rect } from "./geom";

/** A point stage 6 will place (a pole, a lamp post, a node), metres. */
export interface KeepPoint {
  readonly x_m: number;
  readonly z_m: number;
}

export type KoWhy = "kerbCut" | "pavementCorner" | "dip";
export interface KoRect extends Rect {
  readonly why: KoWhy;
  readonly cell: CityCell;
}

/** A box of stage 7: its footprint, `base` (the tile city's rule: the piece's own base; Infinity for a ladder box, which the tile city never saw) and `low` (EL: the escape's lowest box; the base for every other piece). */
export interface AvoidBox extends Rect {
  readonly base: number;
  readonly low: number;
  readonly src: string;
  readonly escape: boolean;
}

export interface DoorStrip extends Rect {
  readonly face: CityFaceKind;
  readonly cell: CityCell;
}

export interface KeepLayers {
  readonly mass: Pick<CityMassLayer, "built">;
  readonly edge: Pick<CityEdgeLayer, "cells" | "ground">;
  readonly facades: Pick<CityFacadesLayer, "ground" | "dressing" | "walls" | "novelty">;
}

export interface EscapeFacts {
  /** One per escape (a building's column). */
  readonly count: number;
  readonly street: number;
  readonly lane: number;
  /** Each escape's lowest base, metres. */
  readonly lowest: readonly number[];
}

export interface Keepouts {
  readonly ko: Grid<KoRect>;
  readonly avoid: Grid<AvoidBox>;
  readonly doors: Grid<DoorStrip>;
  readonly points: readonly KeepPoint[];
  readonly escapes: EscapeFacts;
  /** Residents' door columns, and the faces they open on, by kind. */
  readonly doorFaces: Readonly<Record<string, number>>;
}

/** Stage 4's keep-outs (KO). */
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

/** Stage 7's boxes (AV) with the escapes' lowest bases (EL). */
export function buildAvoid(mass: Pick<CityMassLayer, "built">, facades: Pick<CityFacadesLayer, "dressing" | "walls" | "novelty">): { avoid: Grid<AvoidBox>; escapes: EscapeFacts } {
  const avoid = new Grid<AvoidBox>();
  const boundsOf = (key: CalibrationKey, what: string): { w: number; d: number } => {
    const e = avoidBounds(key);
    if (!e) throw new CityStageError(`AV: the ${what} key ${key} is not in the stage's copy of stage 7's bounds`);
    return e;
  };
  for (const p of facades.dressing ?? []) {
    if (p.kind === "glass") continue;
    const e = boundsOf(p.placement.key, "dressing");
    avoid.add({ ...rectAt(p.placement.x_m, p.placement.z_m, e.w, e.d, p.placement.yaw_deg), base: p.placement.y_m, low: p.placement.y_m, src: p.kind, escape: false });
  }
  for (const p of facades.novelty ?? []) {
    const e = AVOID_NOVELTY_BOUNDS[p.placement.key];
    if (!e) throw new CityStageError(`AV: the novelty key ${p.placement.key} is not in the stage's copy of stage 7's bounds`, [p.cell]);
    avoid.add({ ...rectAt(p.placement.x_m, p.placement.z_m, e.w, e.d, p.placement.yaw_deg), base: p.placement.y_m, low: p.placement.y_m, src: "novelty", escape: false });
  }
  const builtAt = new Map<string, CityMassLayer["built"][number]>(mass.built.map((c) => [cellKey(c.i, c.j), c]));
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
    const e = boundsOf(p.placement.key, "wall");
    avoid.add({ ...rectAt(p.placement.x_m, p.placement.z_m, e.w, e.d, p.placement.yaw_deg), base: p.placement.y_m, low: p.placement.y_m, src: p.kind, escape: false });
  }
  const lowest: number[] = [];
  let street = 0;
  let lane = 0;
  for (const pieces of groups.values()) {
    const first = pieces[0]!;
    const face = builtAt.get(cellKey(first.cell.i, first.cell.j))?.open.find((o) => o.side === first.face)?.faces;
    if (face === "street") street++;
    if (face === "lane") lane++;
    const rects: { r: Rect; base: number }[] = [];
    let low = Infinity;
    for (const p of pieces) {
      const pl = p.placement;
      if (pl.key === CODE_ESCAPE_KEY) rects.push({ r: rectAt(pl.x_m, pl.z_m, CODE_ESCAPE_W_M, CODE_ESCAPE_D_M, pl.yaw_deg), base: pl.y_m });
      else {
        const e = boundsOf(pl.key, "escape");
        rects.push({ r: rectAt(pl.x_m, pl.z_m, e.w, e.d, pl.yaw_deg), base: pl.y_m });
      }
      low = Math.min(low, pl.y_m);
      for (const bx of p.boxes) {
        const c = rotate(pl.yaw_deg, bx.x_m, bx.z_m);
        const s = turned(bx.w_m, bx.d_m, pl.yaw_deg);
        const y0 = pl.y_m + bx.y_m - bx.h_m / 2;
        low = Math.min(low, y0);
        // a code-drawn escape's footprint already covers its boxes; a ladder box of a kit piece may stand outside its piece's bounds
        if (pl.key !== CODE_ESCAPE_KEY) rects.push({ r: { x0: pl.x_m + c.x - s.x / 2, x1: pl.x_m + c.x + s.x / 2, z0: pl.z_m + c.z - s.z / 2, z1: pl.z_m + c.z + s.z / 2 }, base: Infinity });
      }
    }
    lowest.push(low);
    for (const { r, base } of rects) avoid.add({ ...r, base, low, src: "escape", escape: true });
  }
  return { avoid, escapes: { count: groups.size, street, lane, lowest } };
}

/** The strips in front of residents' doors (DK). */
export function buildDoors(mass: Pick<CityMassLayer, "built">, facades: Pick<CityFacadesLayer, "ground">): { doors: Grid<DoorStrip>; faces: Record<string, number> } {
  const doors = new Grid<DoorStrip>();
  const faces: Record<string, number> = {};
  const builtAt = new Map<string, CityMassLayer["built"][number]>(mass.built.map((c) => [cellKey(c.i, c.j), c]));
  for (const g of facades.ground) {
    if (g.kind !== "door" && g.kind !== "doorCorner") continue;
    for (const c of g.cells) {
      const bc = builtAt.get(cellKey(c.i, c.j));
      if (!bc) continue;
      for (const o of bc.open) {
        faces[o.faces] = (faces[o.faces] ?? 0) + 1;
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
  return { doors, faces };
}

/** Everything a prop keeps clear of, from the layers before stage 8 and the keep points (NL). */
export function buildKeepouts(layers: KeepLayers, points: readonly KeepPoint[] = []): Keepouts {
  const { avoid, escapes } = buildAvoid(layers.mass, layers.facades);
  const { doors, faces } = buildDoors(layers.mass, layers.facades);
  return { ko: buildKo(layers.edge), avoid, doors, points, escapes, doorFaces: faces };
}

/** KO and NL: the kind of keep-out a footprint is within `FURN_KEEP_M` of, or null ("keep point" for a stage 6 point). */
export function keepoutHit(k: Keepouts, r: Rect): string | null {
  for (const q of k.ko.near(r, FURN_KEEP_M)) if (rectDist(r, q) < FURN_KEEP_M - EPS) return q.why;
  for (const p of k.points) if (rectDist(r, { x0: p.x_m, x1: p.x_m, z0: p.z_m, z1: p.z_m }) < FURN_KEEP_M - EPS) return "keepPoint";
  return null;
}

/** AV and EL: "AV" when a prop of height `h` lifted by `lift` is taller than the base of a stage 7 box it overlaps (the tile city's rule), "EL" when only the escape's lowered base (its drop ladder) says so, else null. */
export function avoidVerdict(k: Keepouts, r: Rect, h: number, lift: number): "AV" | "EL" | null {
  let el = false;
  for (const b of k.avoid.near(r)) {
    if (!overlaps(r, b)) continue;
    if (lift + h > b.base + EPS) return "AV";
    if (lift + h > b.low + EPS) el = true;
  }
  return el ? "EL" : null;
}

/** DK: does the footprint overlap a residents' door's strip? */
export function inDoorStrip(k: Keepouts, r: Rect): boolean {
  return k.doors.near(r).some((d) => overlaps(r, d));
}
