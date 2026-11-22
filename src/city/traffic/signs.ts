/**
 * Stage 9: the stop signs (ticket 070 TR1; ST; Josh, 21 Nov 2026, Q40 and Q43). One on each approach whose control is "stop", on its kerbside at the near-right corner, facing the inbound traffic.
 * - It stands on the arm's **pavement cell next to the near-right corner** (the corner cell's neighbour on the arm's side). Its post is `SIGN_KERB_M` from the cell's kerb-side edge (where a build-out is in front that edge is flush and is still the
 *   one measured from) and `SIGN_CORNER_M` from the cell's end that touches the corner.
 * - Where that cell is not a plain `pavement` cell (a kerb cut, a dropped kerb), it stands on the `pavementCorner` cell instead, at the same two distances from that cell's kerb-side edge and its far end.
 * - Its own +z front faces the side the approach comes from. Each sign is a group of its own, "<junction>|<n>" in approach order.
 */

import type { CityApproach, CityCell, CityJunction, CityJunctionTraffic, CityTrafficPiece } from "../../core";
import { SIDE_VEC, SIDE_YAW, cellRect, makePiece } from "./clear";
import { SIGN_CORNER_M, SIGN_KERB_M } from "./constants";
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
