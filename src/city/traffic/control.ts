/**
 * Stage 9: how each junction is controlled (ticket 070 TR1; Josh, 21 Nov 2026, Q36 to Q40: "I will take all of the recommendations"), and the frame every piece's place is worked in.
 * - **DS.** Traffic keeps right. An approach is the arm of a junction as traffic meets it: its traffic heads the way the arm's side points away from (an arm on the junction's "-z" side carries traffic heading +z), its right is its heading's turned
 *   a quarter (heading (hx, hz), right (-hz, hx): three.js's, y up). Its **near-right corner** is the `pavementCorner` cell between its arm and the arm on its right; its **far-left corner** is the one diagonally across.
 * - **IN.** A two-way arm is inbound; a one-way arm is inbound when its street's `flow` points toward the junction.
 * - **SJ.** An inner crossroads of two two-way streets has signals. **AS.** Every other inner crossroads is an all-way stop: each inbound approach stops. **T.** The street that ends stops (its one arm, if inbound); the through street does not.
 *   **C.** A corner of the city has no control. A crossroads that is not inner (none exists) has none.
 */

import { CITY_GROUND_VARIANT, type CityApproach, type CityApproachControl, type CityCell, type CityEdgeLayer, type CityEdgeRole, type CityJunction, type CityJunctionControl, type CityJunctionTraffic, type CityPlanStreet, type CitySide, type CityStreetsLayer } from "../../core";
import { CELL_M } from "./constants";
import { SIDE_VEC } from "./clear";

/** The unit vector of the way traffic on an arm heads (into the junction): away from the side the arm leaves by. */
export const HEADING: Readonly<Record<CitySide, readonly [number, number]>> = { "+x": [-1, 0], "-x": [1, 0], "+z": [0, -1], "-z": [0, 1] };

/** The driver's right for a heading (traffic keeps right, DS; y up). */
export const rightOf = (h: readonly [number, number]): readonly [number, number] => [-h[1] || 0, h[0]];

/** The axis a side lies along. */
export const axisOfSide = (s: CitySide): "x" | "z" => (s === "+x" || s === "-x" ? "x" : "z");

/** A junction's carriageway rectangle: its cells' extent (inclusive cell bounds) and in metres. */
export interface JunctionRect {
  readonly i0: number;
  readonly i1: number;
  readonly j0: number;
  readonly j1: number;
  readonly x0: number;
  readonly x1: number;
  readonly z0: number;
  readonly z1: number;
}

export function rectOf(j: Pick<CityJunction, "cells">): JunctionRect {
  const is = j.cells.map((c) => c.i);
  const js = j.cells.map((c) => c.j);
  const i0 = Math.min(...is);
  const i1 = Math.max(...is);
  const j0 = Math.min(...js);
  const j1 = Math.max(...js);
  return { i0, i1, j0, j1, x0: i0 * CELL_M, x1: (i1 + 1) * CELL_M, z0: j0 * CELL_M, z1: (j1 + 1) * CELL_M };
}

/** A corner of the junction's walk square: the diagonal cell beyond the carriageway's corner, and the carriageway's corner point nearest it (the cell's kerb corner). */
export interface Corner {
  /** +1 when the cell is at larger x than the junction, -1 at smaller. */
  readonly sx: 1 | -1;
  readonly sz: 1 | -1;
  readonly cell: CityCell;
  /** The kerb corner, metres: the cell's corner point nearest the junction's carriageway. */
  readonly kx: number;
  readonly kz: number;
}

export function cornerOf(r: JunctionRect, sx: 1 | -1, sz: 1 | -1): Corner {
  return { sx, sz, cell: { i: sx > 0 ? r.i1 + 1 : r.i0 - 1, j: sz > 0 ? r.j1 + 1 : r.j0 - 1 }, kx: sx > 0 ? r.x1 : r.x0, kz: sz > 0 ? r.z1 : r.z0 };
}

const sign = (v: number): 1 | -1 => (v > 0 ? 1 : -1);

/** The approach's near-right corner: the corner on its right on the side it comes from. */
export function nearRightOf(r: JunctionRect, arm: CitySide): Corner {
  const h = HEADING[arm];
  const rt = rightOf(h);
  return cornerOf(r, sign(-h[0] + rt[0]), sign(-h[1] + rt[1]));
}

/** The approach's far-left corner: diagonally across from its near-right one. */
export function farLeftOf(r: JunctionRect, arm: CitySide): Corner {
  const h = HEADING[arm];
  const rt = rightOf(h);
  return cornerOf(r, sign(h[0] - rt[0]), sign(h[1] - rt[1]));
}

/** IN: is traffic on this arm of `street` driving into the junction? */
export function isInbound(street: Pick<CityPlanStreet, "section" | "flow">, arm: CitySide): boolean {
  if (street.section === "twoWay") return true;
  const plus = arm === "-x" || arm === "-z";
  return street.flow === (plus ? "+" : "-");
}

/** The control of every junction of a streets layer, in `junctions` order, each with its approaches in `arms` order. */
export function buildControl(streets: Pick<CityStreetsLayer, "streets" | "junctions">): CityJunctionTraffic[] {
  const byId = new Map<string, CityPlanStreet>(streets.streets.map((s) => [s.id, s]));
  return streets.junctions.map((j) => {
    const meets = j.streets.map((q) => ({ street: byId.get(q.street)!, passes: q.passes }));
    const streetOf = (arm: CitySide): { street: CityPlanStreet; passes: boolean } => {
      const m = meets.find((q) => q.street.axis === axisOfSide(arm));
      if (!m) throw new Error(`junction ${j.id} has an arm ${arm} and no street along ${axisOfSide(arm)}`);
      return m;
    };
    const signals = j.kind === "crossroads" && j.inner && meets.every((m) => m.street.section === "twoWay");
    const allStop = j.kind === "crossroads" && j.inner && !signals;
    const approaches: CityApproach[] = j.arms.map((arm) => {
      const m = streetOf(arm);
      const inbound = isInbound(m.street, arm);
      let control: CityApproachControl = "none";
      if (inbound) {
        if (signals) control = "signal";
        else if (allStop) control = "stop";
        else if (j.kind === "T" && !m.passes) control = "stop";
      }
      return { id: `${j.id}|${arm}`, junction: j.id, street: m.street.id, arm, inbound, control };
    });
    const control: CityJunctionControl = signals ? "signals" : allStop ? "allStop" : approaches.some((a) => a.control === "stop") ? "stop" : "none";
    return { junction: j.id, control, approaches };
  });
}

/** The cell one step from a cell through a side. */
export const stepOf = (c: CityCell, side: CitySide): CityCell => ({ i: c.i + SIDE_VEC[side][0], j: c.j + SIDE_VEC[side][1] });

// ---- what the edge layer says of a cell ----

/** What the stage reads of stage 4's cells: a cell's role, and whether a crossing lands in front of it (a dropped kerb: the `pavementDip` bit). */
export interface EdgeInfo {
  roleAt(c: CityCell): CityEdgeRole | undefined;
  dipAt(c: CityCell): boolean;
}

export function edgeInfoOf(edge: Pick<CityEdgeLayer, "cells" | "ground">): EdgeInfo {
  const role = new Map<string, CityEdgeRole>(edge.cells.map((c) => [`${c.i},${c.j}`, c.role]));
  const dip = new Set<string>();
  for (const g of edge.ground ?? []) if (g.cells === 1 && g.role === "pavement" && (g.variant & CITY_GROUND_VARIANT.pavementDip) !== 0) dip.add(`${g.i},${g.j}`);
  return { roleAt: (c) => role.get(`${c.i},${c.j}`), dipAt: (c) => dip.has(`${c.i},${c.j}`) };
}
