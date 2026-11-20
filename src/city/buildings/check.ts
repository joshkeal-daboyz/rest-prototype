/**
 * The stage's own checks (ticket 070 F1), each a function of the layer and the mass, run by the stage before it returns and by the tests on fixtures:
 * rule 1 (every built cell in exactly one building; 2 to 4 consecutive columns of one row; the L), N1 (every non-blind cell shows its row's front), L1, lead and follow (N3, N4), M4c, R2 and R13.
 * A failure names its check and the cells.
 */

import type { CityBuildingsLayer, CityBuilding, CityBuiltCell, CityCell, CityLandLayer, CityMassLayer } from "../../core";
import { CITY_CHECK, CITY_STOREYS, COLOURWAY_POOL, STYLE_IDS, TERRACE_BAYS } from "./constants";
import { neighbourPairs } from "./draft";
import { leadRowIds, tightCornersOf } from "./group";
import { keyOf, positionsOf, rowsOfPart, showsFront, type RowDef } from "./rows";

export interface BuildingFailure {
  /** "rule 1", "N1", "L1", "N3", "M4c", "R2" or "R13". */
  readonly check: string;
  readonly reason: string;
  readonly cells: readonly CityCell[];
}

export type BuildingsInput = { readonly land: Pick<CityLandLayer, "parts">; readonly mass: Pick<CityMassLayer, "built"> };

/** Every failure of `layer` against the land and mass it was built from. Empty when every check holds. */
export function buildingFailures(layer: CityBuildingsLayer, input: BuildingsInput): BuildingFailure[] {
  const out: BuildingFailure[] = [];
  const fail = (check: string, reason: string, cells: readonly CityCell[]): void => {
    out.push({ check, reason, cells });
  };
  const built = new Map<string, CityBuiltCell>(input.mass.built.map((b) => [keyOf(b), b] as const));
  const defs = new Map<string, RowDef>();
  const leads = new Set<string>();
  const tight = input.land.parts.flatMap((p) => {
    const rows = rowsOfPart(p);
    for (const r of rows) defs.set(r.id, r);
    for (const id of leadRowIds(p, rows, built)) leads.add(id);
    return tightCornersOf(p, rows, built);
  });
  const positions = positionsOf([...defs.values()]);
  const posOf = (id: string): ReadonlyMap<string, number> | undefined => positions.get(id);
  const byId = new Map<string, CityBuilding>();
  for (const b of layer.buildings) {
    if (byId.has(b.id)) fail("rule 1", `building ${b.id} is listed twice`, b.cells);
    byId.set(b.id, b);
  }

  // The rows: each is a row of its part, and lists exactly the buildings that stand in it.
  const rowIds = new Set<string>();
  const layerRow = new Map(layer.rows.map((r) => [r.id, r] as const));
  for (const r of layer.rows) {
    const def = defs.get(r.id);
    if (rowIds.has(r.id)) fail("rule 1", `row ${r.id} is listed twice`, []);
    rowIds.add(r.id);
    if (!def || def.block !== r.block || def.part !== r.part || def.row !== r.row || def.front !== r.front) {
      fail("rule 1", `row ${r.id} is not a row of its part`, []);
      continue;
    }
    for (const id of r.buildings) {
      const b = byId.get(id);
      if (!b || (b.rowId !== r.id && b.bend !== r.id)) fail("rule 1", `row ${r.id} lists ${id}, which does not stand in it`, b?.cells ?? []);
    }
  }
  for (const b of layer.buildings) {
    for (const id of b.bend ? [b.rowId, b.bend] : [b.rowId]) {
      const r = layerRow.get(id);
      if (!r || !r.buildings.includes(b.id)) fail("rule 1", `building ${b.id} is not listed in its row ${id}`, b.cells);
    }
  }

  // Every built cell is in exactly one building.
  const count = new Map<string, number>();
  const buildingOf = new Map<string, CityBuilding>();
  for (const b of layer.buildings) {
    for (const c of b.cells) {
      count.set(keyOf(c), (count.get(keyOf(c)) ?? 0) + 1);
      buildingOf.set(keyOf(c), b);
      if (!built.has(keyOf(c))) fail("rule 1", `building ${b.id} has a cell that is not built`, [c]);
    }
  }
  for (const c of input.mass.built) {
    const n = count.get(keyOf(c)) ?? 0;
    if (n !== 1) fail("rule 1", `built cell (${c.i}, ${c.j}) is in ${n} buildings, not 1`, [c]);
  }

  // Each building: its size, its row, N1, the L.
  const tightOf = new Map(tight.map((t) => [keyOf(t.corner), t] as const));
  const bentOk = new Set<string>();
  for (const b of layer.buildings) {
    const rowDef = defs.get(b.rowId);
    if (!rowDef) {
      fail("rule 1", `building ${b.id} is in no known row`, b.cells);
      continue;
    }
    if (b.row !== rowDef.row || b.front !== rowDef.front) fail("rule 1", `building ${b.id} does not carry its row's ring and front`, b.cells);
    if (b.bend !== null) {
      const t = tightOf.get(b.cells.length === 3 ? keyOf(b.cells[1]!) : "");
      const same = t !== undefined && t.rowZ.id === b.rowId && t.rowX.id === b.bend && t.cells.every((c, n) => keyOf(c) === keyOf(b.cells[n]!));
      if (!same) fail("L1", `building ${b.id} is bent but is not the L of a tight corner`, b.cells);
      else bentOk.add(keyOf(b.cells[1]!));
    } else {
      if (b.cells.length < TERRACE_BAYS.min || b.cells.length > TERRACE_BAYS.max) fail("rule 1", `building ${b.id} has ${b.cells.length} columns, not ${TERRACE_BAYS.min} to ${TERRACE_BAYS.max}`, b.cells);
      const pos = positions.get(b.rowId)!;
      const at = b.cells.map((c) => pos.get(keyOf(c)));
      if (at.some((x) => x === undefined) || at.some((x, n) => n > 0 && x !== at[n - 1]! + 1)) fail("rule 1", `building ${b.id} is not consecutive cells of its row`, b.cells);
    }
    // N1: every non-blind cell shows the front of the row it stands in (an L's last cell stands in its bend row).
    b.cells.forEach((c, n) => {
      const bc = built.get(keyOf(c));
      if (!bc) return;
      const rd = b.bend !== null && n === 2 ? defs.get(b.bend) : rowDef;
      if (!rd) return;
      if (bc.part !== b.part || bc.block !== b.block) fail("rule 1", `cell (${c.i}, ${c.j}) is not in the part of building ${b.id}`, [c]);
      if (bc.row !== rd.row) fail("N1", `cell (${c.i}, ${c.j}) is in a ${bc.row} row of the mass but ${b.id} puts it in a ${rd.row} row`, [c]);
      if (bc.column !== "blind" && !showsFront(bc, rd.front)) fail("N1", `cell (${c.i}, ${c.j}) does not show the front ${rd.front} of its row ${rd.id}`, [c]);
    });
  }
  for (const t of tight) if (!bentOk.has(keyOf(t.corner))) fail("L1", `the tight corner (${t.corner.i}, ${t.corner.j}) is not built as an L`, t.cells);

  // Lead and follow (N3, N4).
  const partnerUsed = new Map<string, string>();
  for (const b of layer.buildings) {
    const lead = leads.has(b.rowId);
    if (lead) {
      if (b.partner !== null || b.back !== null) fail("N3", `leading building ${b.id} has a partner or a back`, b.cells);
      continue;
    }
    if (b.partner === null || b.back === null) {
      fail("N3", `following building ${b.id} has no partner or no back`, b.cells);
      continue;
    }
    const p = byId.get(b.partner);
    if (!p || !leads.has(p.rowId)) {
      fail("N3", `the partner ${b.partner} of ${b.id} is not a leading building`, b.cells);
      continue;
    }
    const other = partnerUsed.get(b.partner);
    if (other !== undefined) fail("N3", `following buildings ${other} and ${b.id} share the partner ${b.partner}`, b.cells);
    partnerUsed.set(b.partner, b.id);
    // Column for column: the mass partners of its non-blind cells lie in its partner, or (an L) in two leaders, one of them its partner.
    const back = new Set<string>();
    for (const c of b.cells) {
      const bc = built.get(keyOf(c));
      if (!bc || bc.column === "blind") continue;
      const pb = bc.partner ? buildingOf.get(keyOf(bc.partner)) : undefined;
      if (!pb) fail("N3", `cell (${c.i}, ${c.j}) of ${b.id} has no partner building`, [c]);
      else back.add(pb.id);
    }
    if (b.bend === null) {
      if (back.size !== 1 || !back.has(b.partner)) fail("N3", `the cells of ${b.id} do not all back onto its partner ${b.partner}`, b.cells);
    } else {
      const corner = built.get(keyOf(b.cells[1]!));
      const holder = corner?.partner ? buildingOf.get(keyOf(corner.partner)) : undefined;
      if (!holder || holder.id !== b.partner) fail("N3", `the L ${b.id} does not follow the building that holds its ring-1 corner cell`, b.cells);
      if (!back.has(b.partner) || [...back].some((id) => !leads.has(byId.get(id)?.rowId ?? ""))) fail("N3", `the L ${b.id} does not back onto leading buildings`, b.cells);
    }
  }

  // The table: a style of the table, a colourway of the pool, 3 to 5 storeys.
  for (const b of layer.buildings) {
    if (!STYLE_IDS.includes(b.style)) fail("R2", `building ${b.id} has the style ${b.style}, which is not a row style`, b.cells);
    if (!COLOURWAY_POOL.includes(b.colourway)) fail("R13", `building ${b.id} has the colourway ${b.colourway}, which is not in the pool`, b.cells);
    if (!Number.isInteger(b.storeys) || b.storeys < CITY_STOREYS.min || b.storeys > CITY_STOREYS.max) fail("R2", `building ${b.id} has ${b.storeys} storeys, not ${CITY_STOREYS.min} to ${CITY_STOREYS.max}`, b.cells);
  }

  // M4c, cell by cell (N2): every built cell with a mass partner has its partner's storeys. A through building has its partner's style and colourway; another has a colourway that is not its partner's.
  for (const b of layer.buildings) {
    for (const c of b.cells) {
      const partner = built.get(keyOf(c))?.partner;
      const pb = partner ? buildingOf.get(keyOf(partner)) : undefined;
      if (pb && pb.storeys !== b.storeys) fail("M4c", `cell (${c.i}, ${c.j}) of ${b.id} has ${b.storeys} storeys but its partner's building ${pb.id} has ${pb.storeys}`, [c]);
    }
    const p = b.partner !== null ? byId.get(b.partner) : undefined;
    if (!p) continue;
    if (b.back === "through" && (b.style !== p.style || b.colourway !== p.colourway)) fail("M4c", `the through building ${b.id} is not in its partner ${p.id}'s style and colourway`, b.cells);
    if (b.back === "another" && b.colourway === p.colourway) fail("M4c", `the building ${b.id} stands behind another building but has its partner ${p.id}'s colourway`, b.cells);
  }

  // R2 and R13 over every pair of row neighbours.
  const pairs = neighbourPairs(layer.buildings, posOf);
  const badStyle = pairs.filter(([a, b]) => a.style === b.style || a.storeys === b.storeys);
  const badColour = pairs.filter(([a, b]) => a.colourway === b.colourway);
  const share = (bad: number): number => (pairs.length === 0 ? 1 : 1 - bad / pairs.length);
  if (share(badStyle.length) < CITY_CHECK.R2) {
    for (const [a, b] of badStyle) fail("R2", `row neighbours ${a.id} and ${b.id} share ${a.style === b.style ? "a style" : "a storey count"}${a.style === b.style && a.storeys === b.storeys ? " and a storey count" : ""}`, [...a.cells, ...b.cells]);
  }
  if (share(badColour.length) < CITY_CHECK.R13) for (const [a, b] of badColour) fail("R13", `row neighbours ${a.id} and ${b.id} share the colourway ${a.colourway}`, [...a.cells, ...b.cells]);
  return out;
}

/** The share of row-neighbour pairs that differ in style and storeys (R2), and in colourway (R13), and the pair count: what the report prints. */
export function neighbourShares(layer: CityBuildingsLayer, input: BuildingsInput): { pairs: number; r2: number; r13: number } {
  const defs: RowDef[] = input.land.parts.flatMap((p) => rowsOfPart(p));
  const positions = positionsOf(defs);
  const pairs = neighbourPairs(layer.buildings, (id) => positions.get(id));
  const frac = (bad: number): number => (pairs.length === 0 ? 1 : 1 - bad / pairs.length);
  return { pairs: pairs.length, r2: frac(pairs.filter(([a, b]) => a.style === b.style || a.storeys === b.storeys).length), r13: frac(pairs.filter(([a, b]) => a.colourway === b.colourway).length) };
}
