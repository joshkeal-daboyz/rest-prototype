/**
 * Where a pole line stands (CK1, CK3): which pavement of a street carries the poles, and the plan point of a position along a pavement. Pure.
 */

import { CITY_GROUND_VARIANT, type CityBlockSide, type CityCell, type CityEdgeLayer, type CityPlanStreet, type CitySide, type CityStreetsLayer } from "../../core";
import { CELL_M, POLE_FROM_KERB_M } from "./constants";

export type Pavement = "lo" | "hi";

export const cellKey = (i: number, j: number): string => `${i},${j}`;

/** The pavement a block side faces: a block's +z or +x side faces its street's lo pavement, its -z or -x side the hi pavement. */
export const sidePavement = (side: CitySide): Pavement => (side === "+z" || side === "+x" ? "lo" : "hi");

export const oppositeSide = (side: CitySide): CitySide => (side === "+x" ? "-x" : side === "-x" ? "+x" : side === "+z" ? "-z" : "+z");

/** A side's own axis: the street along a "+z" or "-z" side runs along x. */
export const sideAxis = (side: CitySide): "x" | "z" => (side === "+z" || side === "-z" ? "x" : "z");

/** The across coordinate of a pole on this pavement (z for an x street): `POLE_FROM_KERB_M` from the carriageway's edge. */
export const acrossOf = (st: CityPlanStreet, p: Pavement): number => (p === "lo" ? st.carriage.lo_m - POLE_FROM_KERB_M : st.carriage.hi_m + POLE_FROM_KERB_M);

/** The cell row (x street) or column (z street) of a pavement. */
export const cellAcross = (st: CityPlanStreet, p: Pavement): number => (p === "lo" ? st.across0 : st.across0 + st.bands.length - 1);

/** The plan point of `along` metres (on the street's axis) on a pavement's pole line. */
export function pointOf(st: CityPlanStreet, p: Pavement, along: number): { readonly x_m: number; readonly z_m: number } {
  const a = acrossOf(st, p);
  return st.axis === "x" ? { x_m: along, z_m: a } : { x_m: a, z_m: along };
}

/** The pavement cell holding `along` metres of a street's pavement. */
export function cellAt(st: CityPlanStreet, p: Pavement, along: number): CityCell {
  const k = Math.floor(along / CELL_M);
  return st.axis === "x" ? { i: k, j: cellAcross(st, p) } : { i: cellAcross(st, p), j: k };
}

/** What stage 6 reads of the cells: the edge layer's role, and the ground record's variant bits. */
export interface CellIndex {
  readonly role: ReadonlyMap<string, string>;
  readonly variant: ReadonlyMap<string, number>;
  /** The street's cells with a parking role, one per street (any), for CK1. */
  readonly parking: ReadonlyMap<string, CityCell>;
}

const PARKING_ROLES: ReadonlySet<string> = new Set(["parking", "parkingPlain", "buildout"]);

export function indexCells(edge: CityEdgeLayer): CellIndex {
  const role = new Map<string, string>();
  const variant = new Map<string, number>();
  const parking = new Map<string, CityCell>();
  for (const c of edge.cells) {
    role.set(cellKey(c.i, c.j), c.role);
    if (c.street !== null && PARKING_ROLES.has(c.role) && !parking.has(c.street)) parking.set(c.street, { i: c.i, j: c.j });
  }
  for (const g of edge.ground ?? []) variant.set(cellKey(g.i, g.j), g.variant);
  return { role, variant, parking };
}

/** CK3: a pole stands only on a pavement cell that is no kerb cut, corner or dip. A `pavementFlush` cell is allowed. */
export function allowedCell(ix: CellIndex, c: CityCell): boolean {
  const k = cellKey(c.i, c.j);
  return ix.role.get(k) === "pavement" && ((ix.variant.get(k) ?? 0) & CITY_GROUND_VARIANT.pavementDip) === 0;
}

/**
 * CK1: the one pavement a street carries its poles on.
 * - an edge street: its inner pavement, the one facing blocks;
 * - a street with a parking band: the pavement not next to it (read from its edge cells, not from `bands`' order);
 * - a bare street: the traffic's left (lo on an x street flowing "+", hi on "-"; hi on a z street flowing "+", lo on "-").
 */
export function polePavement(st: CityPlanStreet, ix: CellIndex): Pavement {
  if (st.outer !== null) return st.outer === "-z" || st.outer === "-x" ? "hi" : "lo";
  const park = ix.parking.get(st.id);
  if (park !== undefined) {
    const idx = st.axis === "x" ? park.j : park.i;
    return idx < st.across0 + (st.bands.length - 1) / 2 ? "hi" : "lo";
  }
  const plus = st.flow === "+";
  return st.axis === "x" ? (plus ? "lo" : "hi") : plus ? "hi" : "lo";
}

/** The along-axis metres of a block side's span ends. */
export const spanM = (s: CityBlockSide): { readonly lo: number; readonly hi: number } => ({ lo: s.span.lo * CELL_M, hi: s.span.hi * CELL_M });

export const streetsById = (l: CityStreetsLayer): ReadonlyMap<string, CityPlanStreet> => new Map(l.streets.map((s) => [s.id, s] as const));
