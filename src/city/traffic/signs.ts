/**
 * Stage 9: the stop signs (ticket 070 TR1; ST; Josh, 21 Nov 2026, Q40 and Q43). One on each approach whose control is "stop", on its kerbside at the near-right corner, facing the inbound traffic.
 * - It stands on the arm's **pavement cell next to the near-right corner** (the corner cell's neighbour on the arm's side). Its post is `SIGN_KERB_M` from the cell's kerb-side edge (where a build-out is in front that edge is flush and is still the
 *   one measured from) and `SIGN_CORNER_M` from the cell's end that touches the corner.
 * - Where that cell is not a plain `pavement` cell (a kerb cut, a dropped kerb), it stands on the `pavementCorner` cell instead, at the same two distances from that cell's kerb-side edge and its far end.
 * - Its own +z front faces the side the approach comes from. Each sign is a group of its own, "<junction>|<n>" in approach order.
 */

import type { CityApproach, CityBayTile, CityCell, CityEdgeLayer, CityJunction, CityJunctionTraffic, CitySide, CityStreetsLayer, CityTrafficPiece } from "../../core";
import { SIDE_VEC, SIDE_YAW, cellRect, clearReasons, makePiece, type ClearCtx } from "./clear";
import { CELL_M, SIGN_CORNER_M, SIGN_KERB_M } from "./constants";
import { HEADING, nearRightOf, rectOf, rightOf, stepOf, type EdgeInfo } from "./control";

/** The place of an approach's stop sign: the cell it stands on, whether that is the corner fallback, and its pivot. */
export interface StopPlace {
  readonly cell: CityCell;
  readonly fallback: boolean;
  readonly x: number;
  readonly z: number;
}

export function stopPlace(j: Pick<CityJunction, "cells">, a: Pick<CityApproach, "arm">, info: EdgeInfo): StopPlace {
  const r = rectOf(j);
  const nr = nearRightOf(r, a.arm);
  const s = SIDE_VEC[a.arm];
  const arm = stepOf(nr.cell, a.arm);
  const plain = info.roleAt(arm) === "pavement" && !info.dipAt(arm);
  const cell = plain ? arm : nr.cell;
  const cr = cellRect(cell);
  const rt = rightOf(HEADING[a.arm]);
  const k = [-rt[0], -rt[1]] as const; // toward the carriageway
  // across the street: the cell's edge on the kerb side, the post SIGN_KERB_M in from it
  const across = (lo: number, hi: number, dir: number): number => (dir > 0 ? hi - SIGN_KERB_M : lo + SIGN_KERB_M);
  // along the street: SIGN_CORNER_M from the end that touches the corner (the end toward the junction), or from the far end on the corner cell itself
  const along = (lo: number, hi: number, dir: number): number => (plain ? (dir > 0 ? lo + SIGN_CORNER_M : hi - SIGN_CORNER_M) : dir > 0 ? hi - SIGN_CORNER_M : lo + SIGN_CORNER_M);
  const x = k[0] !== 0 ? across(cr.x0, cr.x1, k[0]) : along(cr.x0, cr.x1, s[0]);
  const z = k[1] !== 0 ? across(cr.z0, cr.z1, k[1]) : along(cr.z0, cr.z1, s[1]);
  return { cell, fallback: !plain, x, z };
}

/** The stop signs of one junction, in approach order. */
export function stopSigns(j: CityJunction, t: CityJunctionTraffic, info: EdgeInfo): CityTrafficPiece[] {
  const out: CityTrafficPiece[] = [];
  for (const a of t.approaches) {
    if (a.control !== "stop") continue;
    const p = stopPlace(j, a, info);
    out.push(makePiece({ kind: "stopSign", host: j.id, approach: a.id, group: `${j.id}|${out.length}`, grounded: true, street: p.fallback ? null : a.street, x: p.x, y: 0, z: p.z, yaw: SIDE_YAW[a.arm], cell: p.cell }));
  }
  return out;
}

// ---- the parking signs (ticket 070 TR1b; PK; Josh, 21 Nov 2026, Q44: "I will take all of the recommendations") ----
// One `SM_Prop_Sign_Parking_01` at the low end of each unbroken stretch of `CityBayTile`s along a block side. It stands on the walk cell across from the stretch's first band cell, `SIGN_KERB_M` in from that cell's kerb-side edge and
// `SIGN_CORNER_M` from the stretch's low end (the one distance along a street that Q43 gives), its own +z front facing the walk (away from the carriageway). Where CL refuses its place it is skipped, not moved, and counted with the reason.

/** An unbroken run of bay tiles on one side of a street, facing one block, low end first. */
export interface BayStretch {
  readonly street: string;
  readonly block: string;
  /** The axis the cells run along: "x" when the cells differ in `i`. */
  readonly along: "x" | "z";
  /** Every band cell of the stretch, low end first. */
  readonly cells: readonly CityCell[];
  /** The piece's host: "<street>|<block>|<i>,<j>" with the stretch's first cell. */
  readonly host: string;
}

/** The stretches of a plan, in `streets.streets` order and along each street. Two tiles are one stretch when they are on the same street, face the same block, lie in the same row of cells and touch end to end. */
export function bayStretches(streets: Pick<CityStreetsLayer, "streets">, edge: Pick<CityEdgeLayer, "tiles">): BayStretch[] {
  const byStreet = new Map<string, CityBayTile[]>();
  for (const t of edge.tiles) {
    const list = byStreet.get(t.street);
    if (list) list.push(t);
    else byStreet.set(t.street, [t]);
  }
  const out: BayStretch[] = [];
  for (const st of streets.streets) {
    const tiles = byStreet.get(st.id) ?? [];
    const rows = new Map<string, CityBayTile[]>();
    for (const t of tiles) {
      const alongX = t.cells[1].i !== t.cells[0].i;
      const key = `${t.block}|${alongX ? "x" : "z"}|${alongX ? t.cells[0].j : t.cells[0].i}`;
      const list = rows.get(key);
      if (list) list.push(t);
      else rows.set(key, [t]);
    }
    const found: { stretch: BayStretch; at: number; cross: number }[] = [];
    for (const list of rows.values()) {
      const alongX = list[0]!.cells[1].i !== list[0]!.cells[0].i;
      const pos = (c: CityCell): number => (alongX ? c.i : c.j);
      const sorted = [...list].sort((a, b) => pos(a.cells[0]) - pos(b.cells[0]));
      let run: CityCell[] = [];
      const flush = (block: string): void => {
        if (run.length === 0) return;
        const first = run[0]!;
        found.push({ stretch: { street: st.id, block, along: alongX ? "x" : "z", cells: run, host: `${st.id}|${block}|${first.i},${first.j}` }, at: pos(first), cross: alongX ? first.j : first.i });
        run = [];
      };
      for (const t of sorted) {
        if (run.length > 0 && pos(t.cells[0]) !== pos(run[run.length - 1]!) + 1) flush(t.block);
        run.push(...t.cells);
      }
      flush(sorted[0]!.block);
    }
    found.sort((a, b) => a.at - b.at || a.cross - b.cross);
    for (const f of found) out.push(f.stretch);
  }
  return out;
}

/** Where a stretch's sign stands: the walk cell it is on, the side of the street the walk lies on, its pivot and its turn. */
export interface ParkingPlace {
  readonly cell: CityCell;
  readonly side: CitySide;
  readonly x: number;
  readonly z: number;
  readonly yaw: 0 | 90 | 180 | 270;
}

/** The place of a stretch's sign, or null where the cell across from its first band cell is not exactly one plain `pavement` cell. */
export function parkingPlace(s: Pick<BayStretch, "along" | "cells">, info: EdgeInfo): ParkingPlace | null {
  const c = s.cells[0]!;
  const sides: readonly CitySide[] = s.along === "x" ? ["-z", "+z"] : ["-x", "+x"];
  const walks = sides.map((side) => ({ side, cell: stepOf(c, side) })).filter((q) => info.roleAt(q.cell) === "pavement");
  if (walks.length !== 1) return null;
  const { side, cell } = walks[0]!;
  const v = SIDE_VEC[side];
  const r = cellRect(cell);
  // across the street: the cell's edge toward the band, the post SIGN_KERB_M in from it; along it: SIGN_CORNER_M from the stretch's low end
  const lo = s.along === "x" ? c.i * CELL_M : c.j * CELL_M;
  const x = s.along === "x" ? lo + SIGN_CORNER_M : v[0] > 0 ? r.x0 + SIGN_KERB_M : r.x1 - SIGN_KERB_M;
  const z = s.along === "z" ? lo + SIGN_CORNER_M : v[1] > 0 ? r.z0 + SIGN_KERB_M : r.z1 - SIGN_KERB_M;
  return { cell, side, x, z, yaw: SIDE_YAW[side] };
}

/** The piece of a stretch. */
export function parkingPiece(s: BayStretch, p: ParkingPlace): CityTrafficPiece {
  return makePiece({ kind: "parkingSign", host: s.host, approach: null, group: `${s.host}|0`, grounded: true, street: s.street, x: p.x, y: 0, z: p.z, yaw: p.yaw, cell: p.cell });
}

/** One stretch that took no sign, and why: "noWalk" (no single plain pavement cell across from it), or the first thing CL named: "meter", "hydrant", "bollard", "busStop" and the other stage 8 kinds, "buildoutTree", "stage7", "building", "stage6Point". */
export interface ParkingSkip {
  readonly host: string;
  readonly reason: string;
}

/** A skip's reason from a `clearReasons` sentence. */
export function skipReasonOf(why: string): string {
  const prop = /stage 8 (\w+)$/.exec(why);
  if (prop) return prop[1]!;
  if (why.includes("build-out tree")) return "buildoutTree";
  if (why.includes("stage 7")) return "stage7";
  if (why.includes("stage 5")) return "building";
  if (why.includes("stage 6")) return "stage6Point";
  return why;
}

export interface ParkingResult {
  readonly stretches: number;
  readonly pieces: CityTrafficPiece[];
  readonly skipped: ParkingSkip[];
}

/** One sign per stretch of bay tiles where CL allows it; the rest are skipped and counted. */
export function parkingSigns(layers: { readonly streets: Pick<CityStreetsLayer, "streets">; readonly edge: Pick<CityEdgeLayer, "tiles"> }, ctx: ClearCtx, info: EdgeInfo): ParkingResult {
  const stretches = bayStretches(layers.streets, layers.edge);
  const pieces: CityTrafficPiece[] = [];
  const skipped: ParkingSkip[] = [];
  for (const s of stretches) {
    const place = parkingPlace(s, info);
    if (!place) {
      skipped.push({ host: s.host, reason: "noWalk" });
      continue;
    }
    const piece = parkingPiece(s, place);
    const why = clearReasons(ctx, piece);
    if (why.length > 0) skipped.push({ host: s.host, reason: skipReasonOf(why[0]!) });
    else pieces.push(piece);
  }
  return { stretches: stretches.length, pieces, skipped };
}
