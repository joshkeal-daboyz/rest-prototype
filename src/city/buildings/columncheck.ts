/**
 * Stage 5, F2: the column checks (ticket 070 F2 criteria 2, 3 and 5), each a function of the layer and the mass, run by the stage before it returns and by the tests on fixtures: the shape of `columns` (one per built
 * cell, pieces covered once, one roof), M1 (lattice fit), M6 and R9 (corner turn; no corner key off a corner), M9a (roofs and the column's planes), G1 (no recess, no overreach on an open side).
 * A failure names its check and the cells.
 */

import type { CityBuildingsLayer, CityBuiltCell, CityCell, CityColumn, CityMassLayer, CitySide } from "../../core";
import type { BuildingFailure } from "./check";
import { BUILDING_STYLES, FRONTAGE_TOL_M, OVERLAP_MAX_M, RECESS_MAX_M, STOREY_ALIGN_TOL_M, WALL_JOINT_TOL_M } from "./constants";
import { CORNER_TURN, floorPlan, sidesKey } from "./columns";
import { kitOf } from "./kit";
import { bodyBoxOf, cellBox, planeOf, rotate, sideOf, type Box } from "./place";
import { keyOf, OPPOSITE } from "./rows";

/** The worst distances the checks measured, metres (reported by criterion 6, not asserted). */
export interface ColumnWorst {
  /** M1: the largest distance of a floor body plane from its cell edge. */
  readonly m1: number;
  /** G1: the deepest recess behind an open edge, and the furthest overreach past it (negative when every plane is inside). */
  readonly g1Recess: number;
  readonly g1Over: number;
  /** M9a: the largest disagreement of a column's planes. */
  readonly m9a: number;
}

export interface ColumnReport {
  readonly failures: BuildingFailure[];
  readonly worst: ColumnWorst;
}

export type ColumnsInput = { readonly mass: Pick<CityMassLayer, "built"> };

const ALL_CORNER_KEYS: ReadonlySet<string> = new Set(BUILDING_STYLES.flatMap((s) => [...s.floor.corner, ...s.roof.corner]));
const SIDES: readonly CitySide[] = ["+x", "-x", "+z", "-z"];

const acrossSides = (front: CitySide): readonly [CitySide, CitySide] => (front === "+z" || front === "-z" ? ["-x", "+x"] : ["-z", "+z"]);
/** How far the body's plane on `side` stands out past the cell's edge, metres (negative: behind it). */
const outward = (body: Box, cell: Box, side: CitySide): number => (planeOf(body, side) - planeOf(cell, side)) * (side === "+x" || side === "+z" ? 1 : -1);

/** Every failure of `layer.columns` and the worst measured distances. No failures when every check holds. */
export function columnReport(layer: CityBuildingsLayer, input: ColumnsInput): ColumnReport {
  const failures: BuildingFailure[] = [];
  const fail = (check: string, reason: string, cells: readonly CityCell[]): void => {
    failures.push({ check, reason, cells });
  };
  let m1 = 0;
  let g1Recess = -Infinity;
  let g1Over = -Infinity;
  let m9a = 0;
  const columns = layer.columns;
  if (!columns) {
    fail("F2", "the buildings layer has no columns", []);
    return { failures, worst: { m1, g1Recess, g1Over, m9a } };
  }
  const built = input.mass.built;
  if (columns.length !== built.length) fail("F2", `${columns.length} columns for ${built.length} built cells`, []);
  const buildingOf = new Map(layer.buildings.map((b) => [b.id, b] as const));
  const rowOf = new Map(layer.rows.map((r) => [r.id, r] as const));

  columns.forEach((col: CityColumn, n) => {
    const cell: CityBuiltCell | undefined = built[n];
    if (!cell || keyOf(cell) !== keyOf(col)) {
      fail("F2", `column ${n} is (${col.i}, ${col.j}), not the built cell in its place`, [col]);
      return;
    }
    const b = buildingOf.get(col.building);
    const style = b ? BUILDING_STYLES.find((s) => s.id === b.style) : undefined;
    if (!b || !style) {
      fail("F2", `column (${col.i}, ${col.j}) names the building ${col.building}, which has no style`, [col]);
      return;
    }
    if (col.kind !== cell.column) fail("F2", `column (${col.i}, ${col.j}) is ${col.kind} but the mass says ${cell.column}`, [col]);
    const open = cell.open.map((o) => o.side);

    // The turn (criterion 2).
    if (col.ground.kind !== col.kind || col.ground.yaw !== col.yaw || col.ground.y_m !== 0 || col.ground.top_m !== style.pitch_m.base) fail("F2", `the ground slot of (${col.i}, ${col.j}) is not its column's kind and turn`, [col]);
    if (col.kind === "mid" && !(open.length === 1 && col.front === open[0] && col.side === null)) fail("F2", `mid column (${col.i}, ${col.j}) does not front its one open side`, [col]);
    if (col.kind === "blind" && !(col.front === b.front && col.side === null)) fail("F2", `blind column (${col.i}, ${col.j}) does not front its building's front`, [col]);
    const row = rowOf.get(col.rowId);
    if (!row || (col.kind !== "blind" && col.front !== row.front && col.side !== row.front)) fail("F2", `column (${col.i}, ${col.j}) does not show the front of its row ${col.rowId}`, [col]);

    // The pieces (criterion 3).
    const corner = col.kind === "corner";
    const want = floorPlan(corner, b.storeys);
    const floors = col.pieces.filter((p) => p.role !== "roof");
    const roofs = col.pieces.filter((p) => p.role === "roof");
    const roof = roofs[0];
    if (roofs.length !== 1 || col.pieces[col.pieces.length - 1]?.role !== "roof") fail("M9a", `column (${col.i}, ${col.j}) has ${roofs.length} roof pieces, not exactly one, last`, [col]);
    if (floors.length !== want.length || floors.some((p, k) => p.role !== want[k]!.role || p.storey !== want[k]!.storey || p.span !== (p.role === "floor3" ? 3 : 1))) {
      fail("F2", `column (${col.i}, ${col.j}) does not cover storeys 1 to ${b.storeys - 1} once each, bottom up`, [col]);
    }
    for (const p of col.pieces) {
      const keys = p.role === "roof" ? (corner ? style.roof.corner : style.roof.mid) : p.role === "floor3" ? style.floor.stack3 : corner ? style.floor.corner : style.floor.mid;
      if (!kitOf(p.placement.key) || !keys.includes(p.placement.key)) fail("F2", `a ${p.role} of (${col.i}, ${col.j}) is ${p.placement.key}, which is not its building's ${corner ? "corner" : "mid"} key`, [col]);
      const y = style.pitch_m.floor * p.storey;
      if (p.placement.y_m !== y) fail("F2", `a ${p.role} of (${col.i}, ${col.j}) stands at y ${p.placement.y_m}, not ${y}`, [col]);
    }

    // R9: no corner key on a mid or blind column.
    for (const p of col.pieces) {
      const isCornerKey = ALL_CORNER_KEYS.has(p.placement.key);
      if (isCornerKey !== corner) fail("R9", `${isCornerKey ? "a corner key" : "a mid key"} ${p.placement.key} stands on the ${col.kind} column (${col.i}, ${col.j})`, [col]);
    }

    // M6: on a corner column the ground slot's and every piece's own +z and -x faces are on the column's two open sides.
    if (corner) {
      const turn = open.length === 2 ? CORNER_TURN[sidesKey(open[0]!, open[1]!)] : undefined;
      if (!turn || turn.front !== col.front || turn.side !== col.side || turn.yaw !== col.yaw) fail("M6", `corner column (${col.i}, ${col.j}) is not turned as its open sides [${open.join(", ")}] force`, [col]);
      const turns: (readonly [string, number])[] = [["the ground slot", col.ground.yaw], ...col.pieces.map((p) => [`the ${p.role}`, p.placement.yaw_deg] as const)];
      for (const [label, yaw] of turns) {
        const faces = [sideOf(rotate(yaw, 0, 1)), sideOf(rotate(yaw, -1, 0))].filter((s): s is CitySide => s !== null);
        if (faces.length !== 2 || faces[0] === faces[1] || !faces.every((s) => open.includes(s))) fail("M6", `${label} of (${col.i}, ${col.j}) at ${yaw} puts its +z and -x faces on [${faces.join(", ")}], not on its open sides [${open.join(", ")}]`, [col]);
      }
    }
    // M9a: a piece's turn is its column's.
    for (const p of col.pieces) if (p.placement.yaw_deg !== col.yaw) fail("M9a", `a ${p.role} of (${col.i}, ${col.j}) is turned ${p.placement.yaw_deg}, its column's turn is ${col.yaw}`, [col]);

    // M1 and G1, on every floor piece's body.
    const edges = cellBox(col);
    for (const p of floors) {
      if (!kitOf(p.placement.key)) continue;
      const body = bodyBoxOf(p.placement);
      for (const s of SIDES) {
        const d = Math.abs(planeOf(body, s) - planeOf(edges, s));
        m1 = Math.max(m1, d);
        if (d > WALL_JOINT_TOL_M) fail("M1", `a ${p.role} of (${col.i}, ${col.j}) has its ${s} body plane ${d.toFixed(3)} m off the cell edge (limit ${WALL_JOINT_TOL_M})`, [col]);
      }
      for (const s of open) {
        const o = outward(body, edges, s);
        g1Recess = Math.max(g1Recess, -o);
        g1Over = Math.max(g1Over, o);
        if (-o > RECESS_MAX_M + FRONTAGE_TOL_M) fail("G1", `a ${p.role} of (${col.i}, ${col.j}) stands ${(-o).toFixed(3)} m behind its open edge ${s} (limit ${RECESS_MAX_M + FRONTAGE_TOL_M})`, [col]);
        if (o > OVERLAP_MAX_M + FRONTAGE_TOL_M) fail("G1", `a ${p.role} of (${col.i}, ${col.j}) stands ${o.toFixed(3)} m past its open edge ${s} (limit ${OVERLAP_MAX_M + FRONTAGE_TOL_M})`, [col]);
      }
    }

    // M9a: `storeyAlignment`'s rule: every floor's back plane and sides, and the roof's back plane and reference plane, against the column's first floor body.
    const first = floors.find((p) => kitOf(p.placement.key));
    if (first && roof && kitOf(roof.placement.key)) {
      const ref = bodyBoxOf(first.placement);
      const back = OPPOSITE[col.front];
      const [s0, s1] = acrossSides(col.front);
      const planes: [string, number, number][] = [];
      for (const p of floors) {
        if (!kitOf(p.placement.key)) continue;
        const f = bodyBoxOf(p.placement);
        for (const s of [back, s0, s1]) planes.push([`a ${p.role}'s ${s} plane`, planeOf(f, s), planeOf(ref, s)]);
      }
      const r = bodyBoxOf(roof.placement);
      planes.push(["the roof's back plane", planeOf(r, back), planeOf(ref, back)]);
      if (corner && col.side !== null) planes.push(["the roof's outer flank", planeOf(r, col.side), planeOf(ref, col.side)]);
      else {
        const alongX = s0 === "-x";
        planes.push(["the roof's centre", alongX ? (r.x0 + r.x1) / 2 : (r.z0 + r.z1) / 2, alongX ? (ref.x0 + ref.x1) / 2 : (ref.z0 + ref.z1) / 2]);
      }
      for (const [name, got, at] of planes) {
        const d = Math.abs(got - at);
        m9a = Math.max(m9a, d);
        if (d > STOREY_ALIGN_TOL_M) fail("M9a", `${name} of (${col.i}, ${col.j}) is ${d.toFixed(3)} m off the column's floor body (limit ${STOREY_ALIGN_TOL_M})`, [col]);
      }
    }
  });
  return { failures, worst: { m1, g1Recess, g1Over, m9a } };
}

/** Every failure of `layer.columns` against the mass. Empty when every check holds. */
export function columnFailures(layer: CityBuildingsLayer, input: ColumnsInput): BuildingFailure[] {
  return columnReport(layer, input).failures;
}
