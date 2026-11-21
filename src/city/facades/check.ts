/**
 * Stage 7, H1: the checks (ticket 070 H1 criterion 4), each a function of the facades layer, `buildings` and `mass`, run by the stage before it returns and by the tests on fixtures. A failure names its check and its cells:
 * - H1: the layer's shape (every ground slot filled once, in order; each piece's building, turn, frontage, kind and key);
 * - M1: the ground storey, front-aligned (D5): front and side planes on the cells' edges; the back plane too, except a deep key's, which may stand up to `OVERLAP_MAX_M` past it where every cell has a built partner behind;
 * - G1: no recess, no overreach on an open side;
 * - M6 and R9: a corner kind only on a corner column, its +z and -x faces on the column's two open sides;
 * - M8: no shop on a quiet front; a quiet building has exactly one door, or none when it has no door place, and then is on ring 2 (Q21 answer 3). The door places are read from the mass;
 * - R3: every ground piece on a street front is a shop, a double shop, a shop corner or the building's one door; a building has at most one door;
 * - S1: each piece's level (062's door numbers, the gap rule, the first floor's window sill);
 * - stall: no door on a column with an open side onto stalls.
 */

import type { CityBuildingsLayer, CityCell, CityFacadesLayer, CityGroundPiece, CityGroundPieceKind, CityMassLayer, CitySide } from "../../core";
import { CityStageError } from "../pipeline/error";
import { FRONTAGE_TOL_M, GROUND_GAP_MAX_M, LEVEL_EPS_M, LIFT_CLEAR_M, OVERLAP_MAX_M, RECESS_MAX_M, SILL_MAX_M, SILL_UNDER_M, WALL_JOINT_TOL_M } from "./constants";
import { columnFrontage, facesStalls, factsOf, makeCtx, type BuildingFacts } from "./facts";
import { DEEP_KEYS, DOUBLE_KEY, FIRST_FLOOR_SILL_M, GROUND_STYLES, groundOf, type GroundStyle } from "./kit";
import { bodyBoxOf, cellBox, cellsBox, keyOf, OPPOSITE, planeOf, rotate, sideOf, type Box } from "./place";

export interface GroundFailure {
  readonly check: string;
  readonly reason: string;
  readonly cells: readonly CityCell[];
}

/** The worst distances the checks measured, metres (reported by criterion 7, not asserted). */
export interface GroundWorst {
  /** M1: the largest distance of a front or side body plane from its cell edge (a back plane too, for a key that is not deep). */
  readonly m1: number;
  /** D5: the largest overrun of a deep key's back plane past the back edge (0 when there is none). */
  readonly backOver: number;
  /** G1: the deepest recess behind an open edge, and the furthest overreach past it (negative when every plane is inside). */
  readonly g1Recess: number;
  readonly g1Over: number;
}

export interface GroundReport {
  readonly failures: GroundFailure[];
  readonly worst: GroundWorst;
}

export type GroundInput = { readonly mass: Pick<CityMassLayer, "cells" | "built">; readonly buildings: Pick<CityBuildingsLayer, "rows" | "columns" | "buildings"> };

const DEEP: ReadonlySet<string> = new Set(DEEP_KEYS);
const CORNER_KINDS: ReadonlySet<CityGroundPieceKind> = new Set<CityGroundPieceKind>(["shopCorner", "doorCorner", "floorCorner"]);
const SHOP_KINDS: ReadonlySet<CityGroundPieceKind> = new Set<CityGroundPieceKind>(["shop", "shopDouble", "shopCorner"]);
const STREET_KINDS: ReadonlySet<CityGroundPieceKind> = new Set<CityGroundPieceKind>(["shop", "shopDouble", "shopCorner", "door"]);
const isDoor = (k: CityGroundPieceKind): boolean => k === "door" || k === "doorCorner";

const across = (front: CitySide): readonly [CitySide, CitySide] => (front === "+z" || front === "-z" ? ["-x", "+x"] : ["-z", "+z"]);
/** How far the body's plane on `side` stands out past the box's edge, metres (negative: behind it). */
const outward = (body: Box, box: Box, side: CitySide): number => (planeOf(body, side) - planeOf(box, side)) * (side === "+x" || side === "+z" ? 1 : -1);

/** The keys a kind may take in a style. */
export function keysOf(kind: CityGroundPieceKind, s: GroundStyle): readonly string[] {
  return s[kind];
}

/** Every failure of `layer.ground` and the worst measured distances. No failures when every check holds. */
export function groundReport(layer: CityFacadesLayer, input: GroundInput): GroundReport {
  const failures: GroundFailure[] = [];
  const fail = (check: string, reason: string, cells: readonly CityCell[]): void => {
    failures.push({ check, reason, cells });
  };
  let m1 = 0;
  let backOver = 0;
  let g1Recess = -Infinity;
  let g1Over = -Infinity;
  const done = (): GroundReport => ({ failures, worst: { m1, backOver, g1Recess, g1Over } });
  const columns = input.buildings.columns;
  if (!columns) {
    fail("H1", "the buildings layer has no columns", []);
    return done();
  }
  const ctx = makeCtx(input.mass, input.buildings);
  const at = (c: CityCell): string => `(${c.i}, ${c.j})`;

  // The shape: every slot filled exactly once, in order.
  const covered = new Map<string, number>();
  const order = new Map<string, number>(columns.map((c, n) => [keyOf(c), n] as const));
  let last = -1;
  for (const p of layer.ground) {
    const first = order.get(keyOf(p.cells[0] ?? { i: NaN, j: NaN }));
    if (first === undefined) fail("H1", `a ${p.kind} piece is on ${p.cells.map(at).join(" ")}, which is no column`, p.cells);
    else {
      if (first < last) fail("H1", `the ${p.kind} piece on ${at(p.cells[0]!)} is out of order (columns order of its first cell)`, p.cells);
      last = first;
    }
    for (const c of p.cells) covered.set(keyOf(c), (covered.get(keyOf(c)) ?? 0) + 1);
  }
  for (const col of columns) {
    const n = covered.get(keyOf(col)) ?? 0;
    if (n !== 1) fail("H1", `the ground slot of ${at(col)} is filled ${n} times, not once`, [col]);
  }

  // Per building: its facts (D3, D1), and the doors it has.
  const doorsOf = new Map<string, CityGroundPiece[]>();
  for (const p of layer.ground) if (isDoor(p.kind)) (doorsOf.get(p.building) ?? doorsOf.set(p.building, []).get(p.building)!).push(p);
  const factsBy = new Map<string, BuildingFacts>();
  for (const b of input.buildings.buildings) {
    let facts: BuildingFacts;
    try {
      facts = factsOf(ctx, b);
    } catch (e) {
      if (e instanceof CityStageError) fail("D3", e.reason, e.cells);
      else throw e;
      continue;
    }
    factsBy.set(b.id, facts);
    const doors = doorsOf.get(b.id) ?? [];
    if (doors.length > 1) {
      fail("M8", `building ${b.id} has ${doors.length} doors, not at most one`, doors.flatMap((d) => d.cells));
      fail("R3", `building ${b.id} has ${doors.length} doors, not at most one`, doors.flatMap((d) => d.cells));
    }
    if (facts.frontage === "street") {
      const want = facts.mids.length > 0 ? 1 : 0;
      if (doors.length !== want) fail("R3", `street building ${b.id} has ${doors.length} doors, not ${want} (${facts.mids.length} mid columns)`, facts.cols);
    } else {
      const places = facts.doorCorners.length + facts.doorMids.length;
      if (places > 0 && doors.length !== 1) fail("M8", `quiet building ${b.id} has ${doors.length} doors, not exactly one (it has ${places} door places)`, facts.cols);
      if (places === 0 && doors.length > 0) fail("M8", `quiet building ${b.id} has a door and no door place`, doors.flatMap((d) => d.cells));
      if (places === 0 && !facts.ring2) fail("M8", `quiet building ${b.id} has no door place and is not on ring 2`, facts.cols);
      const d = doors[0];
      if (d !== undefined && places > 0) {
        const n = facts.cols.findIndex((c) => keyOf(c) === keyOf(d.cells[0]!));
        if (facts.doorCorners.length > 0 && !(d.kind === "doorCorner" && n === facts.doorCorners[0])) fail("M8", `quiet building ${b.id}: its door is not the corner door on the first quiet corner with no stalls (D1)`, d.cells);
        if (facts.doorCorners.length === 0 && !(d.kind === "door" && facts.doorMids.includes(n))) fail("M8", `quiet building ${b.id}: its door is not a residents' door on a mid column with no stalls (D1)`, d.cells);
      }
    }
  }

  for (const p of layer.ground) {
    const e = groundOf(p.placement.key);
    const label = `the ${p.kind} piece on ${p.cells.map(at).join(" ")}`;
    const bld = ctx.buildingOf.get(p.building);
    const facts = factsBy.get(p.building);
    const cols = p.cells.map((c) => ctx.col.get(keyOf(c)));
    if (!e || !bld || cols.some((c) => c === undefined)) {
      fail("H1", `${label} is ${e ? "" : `the key ${p.placement.key}, not in the ground kit table`}${bld ? "" : ` in the building ${p.building}, which is not in the layer`}${cols.some((c) => c === undefined) ? " on a cell with no column" : ""}`, p.cells);
      continue;
    }
    const cs = cols as NonNullable<(typeof cols)[number]>[];
    const first = cs[0]!;
    const style = GROUND_STYLES.find((s) => s.id === bld.style);
    if (!style) {
      fail("H1", `${label} is in the building ${bld.id}, whose style ${bld.style} is not in the ground kit table`, p.cells);
      continue;
    }

    // H1: shape, kind and key.
    if (cs.some((c) => c.building !== p.building)) fail("H1", `${label} names the building ${p.building}, not its column's`, p.cells);
    if (!keysOf(p.kind, style).includes(p.placement.key)) fail("H1", `${label} is the key ${p.placement.key}, which is not of its kind's list in ${style.id}`, p.cells);
    if (p.kind === "shopDouble") {
      const n = bld.cells.findIndex((c) => keyOf(c) === keyOf(first));
      const second = cs[1];
      if (cs.length !== 2 || n < 0 || !second || keyOf(bld.cells[n + 1] ?? { i: NaN, j: NaN }) !== keyOf(second) || cs.some((c) => c.kind !== "mid") || first.yaw !== second.yaw) {
        fail("H1", `${label} is not two consecutive mid columns of one building along its row, with one turn`, p.cells);
      }
      if (p.placement.key !== DOUBLE_KEY) fail("H1", `${label} is ${p.placement.key}, not the two-bay shop`, p.cells);
    } else if (cs.length !== 1 || p.placement.key === DOUBLE_KEY) fail("H1", `${label} covers ${cs.length} columns with ${p.placement.key}`, p.cells);
    for (const c of cs) {
      if (p.placement.yaw_deg !== c.yaw) fail("H1", `${label} is turned ${p.placement.yaw_deg}, its column's turn is ${c.yaw}`, p.cells);
      if (p.frontage !== columnFrontage(ctx, c)) fail("H1", `${label} has the frontage ${String(p.frontage)}, its column's is ${String(columnFrontage(ctx, c))}`, p.cells);
      const street = facts?.frontage === "street";
      const here = c.kind === "blind" ? ["floor"] : c.kind === "corner" ? (ctx.built.get(keyOf(c))!.open.some((o) => o.frontage === "street") ? ["shopCorner"] : street ? ["floorCorner"] : ["doorCorner", "floorCorner"]) : street ? ["shop", "shopDouble", "door"] : ["door", "floor"];
      if (facts && !here.includes(p.kind)) fail("H1", `${label} is on the ${c.kind} column ${at(c)} of a ${facts.frontage} building, which takes ${here.join(" or ")}`, p.cells);
    }

    // M6 and R9.
    const cornerKey = e.face !== null;
    if (CORNER_KINDS.has(p.kind) !== cs.every((c) => c.kind === "corner") || cornerKey !== CORNER_KINDS.has(p.kind)) {
      fail("M6", `${label} (${p.placement.key}) is ${CORNER_KINDS.has(p.kind) ? "a corner kind" : "not a corner kind"} on the ${first.kind} column ${at(first)}`, p.cells);
      fail("R9", `${label} (${p.placement.key}) is ${cornerKey ? "a corner key" : "a mid key"} on the ${first.kind} column ${at(first)}`, p.cells);
    }
    if (CORNER_KINDS.has(p.kind) && first.kind === "corner") {
      const open = ctx.built.get(keyOf(first))!.open.map((o) => o.side);
      const faces = [sideOf(rotate(p.placement.yaw_deg, 0, 1)), sideOf(rotate(p.placement.yaw_deg, -1, 0))].filter((s): s is CitySide => s !== null);
      if (faces.length !== 2 || faces[0] === faces[1] || !faces.every((s) => open.includes(s))) fail("M6", `${label} at ${p.placement.yaw_deg} puts its +z and -x faces on [${faces.join(", ")}], not on its open sides [${open.join(", ")}]`, p.cells);
    }

    // M1 and G1, on the body.
    const body = bodyBoxOf(p.placement);
    const box = cellsBox(cs);
    const back = OPPOSITE[first.front];
    const [s0, s1] = across(first.front);
    for (const s of [first.front, s0, s1]) {
      const d = Math.abs(planeOf(body, s) - planeOf(box, s));
      m1 = Math.max(m1, d);
      if (d > WALL_JOINT_TOL_M) fail("M1", `${label} has its ${s} body plane ${d.toFixed(3)} m off the cell edge (limit ${WALL_JOINT_TOL_M})`, p.cells);
    }
    const over = outward(body, box, back);
    if (!DEEP.has(p.placement.key)) {
      m1 = Math.max(m1, Math.abs(over));
      if (Math.abs(over) > WALL_JOINT_TOL_M) fail("M1", `${label} has its ${back} body plane ${Math.abs(over).toFixed(3)} m off the cell edge (limit ${WALL_JOINT_TOL_M})`, p.cells);
    } else {
      backOver = Math.max(backOver, over);
      if (over < -WALL_JOINT_TOL_M || over > OVERLAP_MAX_M + LEVEL_EPS_M) fail("M1", `${label}, a deep key, has its ${back} body plane ${over.toFixed(3)} m past the back edge (allowed ${-WALL_JOINT_TOL_M} to ${OVERLAP_MAX_M})`, p.cells);
      if (over > WALL_JOINT_TOL_M && cs.some((c) => ctx.built.get(keyOf(c))?.partner == null)) fail("M1", `${label}, a deep key, runs ${over.toFixed(3)} m past its back edge where the cell behind is not built`, p.cells);
    }
    for (const c of cs) {
      for (const o of ctx.built.get(keyOf(c))!.open) {
        const v = outward(body, cellBox(c), o.side);
        g1Recess = Math.max(g1Recess, -v);
        g1Over = Math.max(g1Over, v);
        if (-v > RECESS_MAX_M + FRONTAGE_TOL_M) fail("G1", `${label} stands ${(-v).toFixed(3)} m behind its open edge ${o.side} (limit ${RECESS_MAX_M + FRONTAGE_TOL_M})`, p.cells);
        if (v > OVERLAP_MAX_M + FRONTAGE_TOL_M) fail("G1", `${label} stands ${v.toFixed(3)} m past its open edge ${o.side} (limit ${OVERLAP_MAX_M + FRONTAGE_TOL_M})`, p.cells);
      }
    }

    // M8: no shop on a column whose open sides are all quiet. R3: a street piece is a shop or the door.
    if (SHOP_KINDS.has(p.kind) && cs.some((c) => ctx.built.get(keyOf(c))!.open.every((o) => o.frontage === "quiet"))) fail("M8", `${label} is a shop on a column whose open sides are all quiet`, p.cells);
    if (p.frontage === "street" && !STREET_KINDS.has(p.kind)) fail("R3", `${label} is on a street frontage and is not a shop, a shop corner or a door`, p.cells);

    // The stall rule.
    if (isDoor(p.kind) && cs.some((c) => facesStalls(ctx, c))) fail("stall", `${label} is a door on a column with an open side onto stalls`, p.cells);

    // S1: the level.
    const y = p.placement.y_m;
    const doorWant = e.sill === null ? null : y + e.sill;
    if ((doorWant === null) !== (p.door_m === null) || (doorWant !== null && Math.abs(doorWant - p.door_m!) > 1e-6)) fail("S1", `${label} has door_m ${String(p.door_m)}, its level and key give ${doorWant === null ? "none" : doorWant.toFixed(3)}`, p.cells);
    const door = p.door_m;
    if (door !== null && (door < -SILL_UNDER_M - LEVEL_EPS_M || door > SILL_MAX_M + LEVEL_EPS_M)) fail("S1", `${label}: its door sill is ${door.toFixed(3)} m over the walk (limit ${-SILL_UNDER_M} to ${SILL_MAX_M})`, p.cells);
    for (const c of cs) {
      const top = y + e.h;
      const ws = c.pieces[0] ? FIRST_FLOOR_SILL_M[c.pieces[0].placement.key] : undefined;
      if (top < c.ground.top_m - GROUND_GAP_MAX_M - LEVEL_EPS_M) fail("S1", `${label}: its top ${top.toFixed(3)} stops ${(c.ground.top_m - top).toFixed(3)} m short of the first floor (limit ${GROUND_GAP_MAX_M})`, p.cells);
      if (ws === undefined) fail("S1", `the first piece over ${at(c)} has no first-floor sill in the table`, [c]);
      else if (top > c.ground.top_m + ws - LIFT_CLEAR_M + LEVEL_EPS_M) fail("S1", `${label}: its top ${top.toFixed(3)} rises into the first floor's lowest sill (limit ${(c.ground.top_m + ws - LIFT_CLEAR_M).toFixed(3)})`, p.cells);
    }
  }
  return done();
}

/** Every failure of `layer.ground` against `buildings` and `mass`. Empty when every check holds. */
export function groundFailures(layer: CityFacadesLayer, input: GroundInput): GroundFailure[] {
  return groundReport(layer, input).failures;
}
