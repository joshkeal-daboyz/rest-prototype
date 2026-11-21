/**
 * Stage 7, H2: the checks of `facades.walls` (ticket 070 H2 criterion 6), each a function of the facades layer, `buildings` and `mass`, run by the stage before it returns and by the tests on fixtures. A failure names
 * its check and its cells:
 * - H2: the layer's shape (the pieces in `cityplan.ts`' order, each on a column of its building, its face the column's front, its key from the right list, an escape's pieces one per storey or one code piece);
 * - hosts: an escape only on a `mid` column whose ground piece is not a `door`, of a building of at least `ESCAPE_MIN_BAYS` cells and 3 storeys, its face an open side (16.11: never a party wall); ET: with no open side onto stalls;
 * - escapeCheck: every storey has a platform, every deck within `ESCAPE_DECK_TOL_M` of its sill less `ESCAPE_DECK_BELOW_SILL_M`, every joint within `ESCAPE_JOINT_TOL_M`, the ladder's foot within `ESCAPE_GROUND_TOL_M` of the walk;
 * - R7: the share of EQ's street buildings with an escape is at least `TILE_CITY_R7_MIN` (quiet escapes are not counted); neighbour: no two consecutive buildings of one run both have an escape;
 * - EP: no awning, L awning or sign on a bay that spans an escape column;
 * - WP1 to WP3: a wall prop on storey 2 or higher, never on the escape column, at most `WALL_PROPS_PER_BLOCK` a building; never on a blind column (WP2); a canopy only over a `door` (WP3);
 * - cap: `DRESS_PER_BAY_MAX` a column, H1b's dressing and the escape's weight counted; attach: each piece's back on its host's front, its height, its centring, an escape's scale and room; reach: RQ.
 * It also measures what the report prints. R4, R5, R6 and the rest of H1b's checks are `dresscheck.ts`'s and run as they are.
 */

import type { CalibrationKey, CityCell, CityFacadesLayer, CityGroundPiece, CityWallPiece } from "../../core";
import type { GroundInput } from "./check";
import { CELL_M } from "./constants";
import { hostFront, runsOf } from "./dress";
import { DRESS_PER_BAY_MAX } from "./dresskit";
import { columnWidth, escapeCheck, escapeWeight, floorFront, floorOver, frameOfColumn, qualifiesBySize, toFrame, type EscapeReport } from "./escape";
import { type Ctx, facesStalls, makeCtx } from "./facts";
import { PARTY_WALL_KINDS } from "./partykit";
import { SIDE_VEC, keyOf } from "./place";
import { frameOfGround } from "./walls";
import {
  CODE_ESCAPE,
  CODE_ESCAPE_KEY,
  DOOR_CANOPIES,
  DOOR_CANOPY_Y_M,
  ESCAPES,
  ESCAPE_FIRST,
  ESCAPE_MID,
  ESCAPE_MIN_BAYS,
  ESCAPE_SCALE_Y,
  ESCAPE_TOP,
  PLANTER_LIFT_M,
  TILE_CITY_R7_MIN,
  WALL_ACS,
  WALL_AC_LIFT_M,
  WALL_AC_OFFSET_M,
  WALL_MIN_LEVEL,
  WALL_PLANTERS,
  WALL_PROPS_PER_BLOCK,
  wallBounds,
} from "./wallkit";

export interface WallFailure {
  readonly check: string;
  readonly reason: string;
  readonly cells: readonly CityCell[];
}

/** What the report prints (criterion 9); none of it is asserted. */
export interface WallMetrics {
  readonly streetQualifying: number;
  readonly streetEscapes: number;
  readonly r7: number;
  readonly escapeShort: number;
  readonly quietSites: number;
  readonly quietEscapes: number;
  readonly packEscapes: number;
  readonly codeEscapes: number;
  readonly scaleMin: number;
  readonly scaleMax: number;
  readonly worstDeck: number;
  readonly worstJoint: number;
  readonly worstLadder: number;
  /** The longest drop ladder (the first piece's foot over the walk). */
  readonly longestDrop: number;
  readonly canopies: number;
  readonly aircons: number;
  readonly planters: number;
  readonly pieces: number;
  readonly escapePieces: number;
  readonly byKind: Readonly<Record<string, number>>;
  /** The furthest a piece's outer face stands past its column's front cell edge, by key and by the use of the cell across ("key | use"). */
  readonly reachByKeyUse: Readonly<Record<string, number>>;
  readonly maxPerColumn: number;
  /** Escapes whose column faces each other across one cell (pairs). */
  readonly facingPairs: number;
}

export interface WallReport {
  readonly failures: WallFailure[];
  readonly metrics: WallMetrics;
}

const TOL = 1e-6;
const GROUP: Readonly<Record<string, number>> = { escape: 0, canopy: 1, aircon: 2, planter: 2 };
const short = (k: string): string => k.slice("city-pack:SM_".length);
const AC: ReadonlySet<CalibrationKey> = new Set(WALL_ACS);
const PLANTER: ReadonlySet<CalibrationKey> = new Set(WALL_PLANTERS);
const CANOPY: ReadonlySet<CalibrationKey> = new Set(DOOR_CANOPIES);
const PACK: ReadonlySet<CalibrationKey> = new Set(ESCAPES);

const empty = (): WallMetrics => ({
  streetQualifying: 0,
  streetEscapes: 0,
  r7: 1,
  escapeShort: 0,
  quietSites: 0,
  quietEscapes: 0,
  packEscapes: 0,
  codeEscapes: 0,
  scaleMin: Infinity,
  scaleMax: -Infinity,
  worstDeck: 0,
  worstJoint: 0,
  worstLadder: 0,
  longestDrop: 0,
  canopies: 0,
  aircons: 0,
  planters: 0,
  pieces: 0,
  escapePieces: 0,
  byKind: {},
  reachByKeyUse: {},
  maxPerColumn: 0,
  facingPairs: 0,
});

/** Every failure of `layer.walls` and the numbers the report prints. */
export function wallReport(layer: CityFacadesLayer, input: GroundInput): WallReport {
  const failures: WallFailure[] = [];
  const fail = (check: string, reason: string, cells: readonly CityCell[]): void => {
    failures.push({ check, reason, cells });
  };
  const at = (c: CityCell): string => `(${c.i}, ${c.j})`;
  // PW7: the party-wall kinds are H2b's, judged by `partyFailures`
  const walls = layer.walls?.filter((p) => !PARTY_WALL_KINDS.includes(p.kind));
  if (!walls) {
    fail("H2", "the facades layer has no walls", []);
    return { failures, metrics: empty() };
  }
  if (!input.buildings.columns) {
    fail("H2", "the buildings layer has no columns", []);
    return { failures, metrics: empty() };
  }
  const ctx: Ctx = makeCtx(input.mass, input.buildings);
  const groundAt = new Map<string, CityGroundPiece>();
  for (const g of layer.ground) for (const c of g.cells) groundAt.set(keyOf(c), g);
  const buildingIndex = new Map(input.buildings.buildings.map((b, n) => [b.id, n] as const));
  const colIndex = new Map<string, number>();
  for (const b of input.buildings.buildings) b.cells.forEach((c, n) => colIndex.set(keyOf(c), n));

  // ---- the pieces, building by building ----
  type Mine = { escape: CityWallPiece[]; canopy: CityWallPiece[]; props: CityWallPiece[] };
  const byBuilding = new Map<string, Mine>();
  const mineOf = (id: string): Mine => byBuilding.get(id) ?? byBuilding.set(id, { escape: [], canopy: [], props: [] }).get(id)!;
  const metrics = { ...empty() };
  const byKind: Record<string, number> = {};
  const reachByKeyUse: Record<string, number> = {};
  const perColumn = new Map<string, number>();
  let lastOrder = -1;

  for (const p of walls) {
    const ck = keyOf(p.cell);
    const where = `the ${p.kind} piece ${short(p.placement.key)} on ${at(p.cell)}`;
    byKind[p.kind] = (byKind[p.kind] ?? 0) + 1;
    const bIdx = buildingIndex.get(p.building);
    const n = colIndex.get(ck);
    const col = ctx.col.get(ck);
    if (bIdx === undefined || n === undefined || !col || col.building !== p.building) {
      fail("H2", `${where} is on a column that is not in building ${p.building}`, [p.cell]);
      continue;
    }
    const group = GROUP[p.kind];
    if (group === undefined) {
      fail("H2", `${where} has the kind ${String(p.kind)}, which H2 does not place`, [p.cell]);
      continue;
    }
    const order = bIdx * 1e7 + group * 1e6 + (group === 0 ? p.storey : group === 1 ? n : p.storey * 1000 + n);
    if (order < lastOrder) fail("H2", `${where} is out of order (building order; its escape bottom up, its canopies along the row, its wall props storey by storey and along the row)`, [p.cell]);
    lastOrder = order;
    const mine = mineOf(p.building);
    if (group === 0) mine.escape.push(p);
    else if (group === 1) mine.canopy.push(p);
    else mine.props.push(p);
    if (p.face !== col.front) fail("H2", `${where}: its face ${p.face} is not its column's front ${col.front}`, [p.cell]);
    if (p.placement.yaw_deg !== col.yaw) fail("attach", `${where} is turned ${p.placement.yaw_deg}, not its column's ${col.yaw}`, [p.cell]);
    if (!ctx.built.get(ck)?.open.some((o) => o.side === p.face)) {
      if (group === 0) fail("hosts", `${where}: its face ${p.face} is not an open side (a party wall; 16.11)`, [p.cell]);
      else fail("WP2", `${where}: its face ${p.face} is not an open side`, [p.cell]);
    }
    if (p.scaleY !== 1 && group !== 0) fail("attach", `${where} is scaled ${p.scaleY}`, [p.cell]);
    if (group !== 0) perColumn.set(ck, (perColumn.get(ck) ?? 0) + 1);
  }

  // ---- the buildings ----
  const runOf = runsOf(input.buildings);
  const lastInRun = new Map<string, { id: string; esc: boolean }>();
  let streetQualifying = 0;
  let streetEscapes = 0;
  let quietSites = 0;
  let quietEscapes = 0;
  const escCols = new Map<string, CityWallPiece[]>();
  const escCells: { piece: CityWallPiece; street: boolean }[] = [];
  const dressOf = new Map<string, number>();
  for (const p of layer.dressing ?? []) dressOf.set(keyOf(p.cell), (dressOf.get(keyOf(p.cell)) ?? 0) + 1);

  const reach = (key: string, use: string, v: number): void => {
    const k = `${short(key)} | ${use}`;
    reachByKeyUse[k] = Math.max(reachByKeyUse[k] ?? -Infinity, v);
  };

  for (const b of input.buildings.buildings) {
    const first = b.cells.map((c) => ctx.col.get(keyOf(c))).find((c) => c !== undefined && c.kind !== "blind");
    const rowFront = first ? ctx.rowFront.get(first.rowId) : undefined;
    const street = first !== undefined && rowFront !== undefined && (ctx.built.get(keyOf(first))?.open.find((o) => o.side === rowFront)?.frontage ?? null) === "street";
    const mine = byBuilding.get(b.id) ?? { escape: [], canopy: [], props: [] };
    const qualifies = qualifiesBySize(b);
    const hasEscape = mine.escape.length > 0;
    if (qualifies) {
      if (street) streetQualifying++;
      else quietSites++;
    }
    if (hasEscape) {
      if (street) streetEscapes++;
      else quietEscapes++;
    }
    const run = runOf.get(b.id) ?? `solo:${b.id}`;
    const before = lastInRun.get(run);
    if (before && before.esc && hasEscape) fail("neighbour", `the buildings ${before.id} and ${b.id}, consecutive in the run ${run}, both have a fire escape`, b.cells);
    lastInRun.set(run, { id: b.id, esc: hasEscape });

    // ---- the escape ----
    if (hasEscape) {
      const cellsOf = new Set(mine.escape.map((p) => keyOf(p.cell)));
      const col = ctx.col.get(keyOf(mine.escape[0]!.cell))!;
      if (cellsOf.size > 1) fail("H2", `building ${b.id} has escape pieces on ${cellsOf.size} columns`, b.cells);
      if (!qualifies) fail("hosts", `building ${b.id} has an escape and ${b.cells.length} cells over ${b.storeys} storeys (needs ${ESCAPE_MIN_BAYS} cells and 3 storeys)`, b.cells);
      if (col.kind !== "mid") fail("hosts", `the escape of building ${b.id} is on ${at(col)}, a ${col.kind} column`, [col]);
      const gp = groundAt.get(keyOf(col));
      if (gp && gp.kind === "door") fail("hosts", `the escape of building ${b.id} is on ${at(col)}, a door column`, [col]);
      if (facesStalls(ctx, col)) fail("ET", `the escape of building ${b.id} is on ${at(col)}, whose open side faces a stalls cell (its ladder would come down among parked cars)`, [col]);
      escCols.set(keyOf(col), mine.escape);
      for (const p of mine.escape) escCells.push({ piece: p, street });
      const code = mine.escape.some((p) => p.placement.key === CODE_ESCAPE_KEY);
      if (code) {
        metrics.codeEscapes++;
        if (mine.escape.length !== 1) fail("H2", `building ${b.id}: a code-drawn escape is one piece, not ${mine.escape.length}`, [col]);
      } else {
        metrics.packEscapes++;
        const want = b.storeys - 1;
        if (mine.escape.length !== want) fail("escapeCheck", `building ${b.id}: the escape has ${mine.escape.length} pieces for ${want} storeys over the ground (a storey has no platform)`, [col]);
        mine.escape.forEach((p, j) => {
          const role = j === 0 ? ESCAPE_FIRST : j === mine.escape.length - 1 ? ESCAPE_TOP : ESCAPE_MID;
          if (!PACK.has(p.placement.key) || p.placement.key !== role) fail("H2", `building ${b.id}: escape piece ${j + 1} is ${short(p.placement.key)}, not ${short(role)}`, [col]);
          if (p.storey !== j + 1) fail("H2", `building ${b.id}: escape piece ${j + 1} serves storey ${p.storey}`, [col]);
          if (!(p.scaleY >= ESCAPE_SCALE_Y.min - 1e-9 && p.scaleY <= ESCAPE_SCALE_Y.max + 1e-9)) fail("attach", `building ${b.id}: escape piece ${j + 1} is scaled ${p.scaleY.toFixed(3)}, outside ${ESCAPE_SCALE_Y.min} to ${ESCAPE_SCALE_Y.max}`, [col]);
          metrics.scaleMin = Math.min(metrics.scaleMin, p.scaleY);
          metrics.scaleMax = Math.max(metrics.scaleMax, p.scaleY);
        });
      }
      const rep: EscapeReport | null = escapeCheck(col, mine.escape);
      if (rep) {
        metrics.worstDeck = Math.max(metrics.worstDeck, rep.worstDeck_m);
        metrics.worstJoint = Math.max(metrics.worstJoint, rep.worstJoint_m);
        if (rep.ladderFoot_m !== null) metrics.worstLadder = Math.max(metrics.worstLadder, Math.abs(rep.ladderFoot_m));
        if (!rep.ok) {
          const why: string[] = [];
          if (rep.missing.length > 0) why.push(`storeys ${rep.missing.map((m) => m + 1).join(", ")} have no platform`);
          if (rep.worstDeck_m > 0.05 + 1e-9) why.push(`a deck is ${rep.worstDeck_m.toFixed(3)} m off its sill (deck)`);
          if (rep.worstJoint_m > 0.02 + 1e-9) why.push(`a flight joint is ${rep.worstJoint_m.toFixed(3)} m off (joint)`);
          if (rep.ladderFoot_m !== null && Math.abs(rep.ladderFoot_m) > 0.02 + 1e-9) why.push(`the ladder's foot is ${rep.ladderFoot_m.toFixed(3)} m over the walk (ladder)`);
          fail("escapeCheck", `building ${b.id}: ${why.join("; ")}`, [col]);
        }
      }
      // attachment, room and reach (RQ), in the column's frame
      const f = frameOfColumn(col);
      const colW = columnWidth(col);
      const use = ctx.use.get(`${col.i + SIDE_VEC[col.front].x},${col.j + SIDE_VEC[col.front].z}`) ?? "none";
      let lo = Infinity;
      let hi = -Infinity;
      mine.escape.forEach((p) => {
        const e = p.placement.key === CODE_ESCAPE_KEY ? { w: CODE_ESCAPE.w, h: 0, d: CODE_ESCAPE.d } : wallBounds(p.placement.key);
        const r = toFrame(f, p.placement.x_m, p.placement.z_m);
        const host = floorOver(col, p.storey);
        if (!host) {
          fail("attach", `building ${b.id}: no floor piece over storey ${p.storey}`, [col]);
          return;
        }
        const back = r.z - e.d / 2;
        if (Math.abs(back - floorFront(f, host)) > TOL) fail("attach", `the escape piece ${short(p.placement.key)} of building ${b.id} has its back plane ${back.toFixed(4)} from its frame's front, not ${floorFront(f, host).toFixed(4)} (its host's face)`, [col]);
        const v = r.z + e.d / 2 - CELL_M / 2;
        reach(p.placement.key, use, v);
        if (v > CELL_M + TOL) fail("reach", `the escape piece ${short(p.placement.key)} of building ${b.id} reaches ${v.toFixed(3)} m past its column's front edge, over ${CELL_M}`, [col]);
        lo = Math.min(lo, r.x - e.w / 2);
        hi = Math.max(hi, r.x + e.w / 2);
      });
      if (hi - lo > colW + TOL) fail("attach", `the escape of building ${b.id} is ${(hi - lo).toFixed(3)} m wide in a column ${colW.toFixed(3)} m wide`, [col]);
      const lowest = mine.escape[0]!;
      const drop = lowest.boxes.filter((x) => x.kind === "ladderRail");
      if (drop.length > 0) metrics.longestDrop = Math.max(metrics.longestDrop, lowest.placement.y_m + Math.max(...drop.map((x) => x.y_m + x.h_m / 2)));
      const w = escapeWeight(col, mine.escape);
      perColumn.set(keyOf(col), (perColumn.get(keyOf(col)) ?? 0) + w);
    }

    // ---- canopies ----
    for (const p of mine.canopy) {
      const g = groundAt.get(keyOf(p.cell));
      const where = `the canopy ${short(p.placement.key)} on ${at(p.cell)}`;
      if (!CANOPY.has(p.placement.key)) fail("H2", `${where} is not a key of DOOR_CANOPIES`, [p.cell]);
      if (p.storey !== 0) fail("H2", `${where} serves storey ${p.storey}, not 0`, [p.cell]);
      if (!g || g.kind !== "door") {
        fail("WP3", `${where} is over a ${g ? g.kind : "missing"} piece, not a residents' door`, [p.cell]);
        continue;
      }
      let f;
      try {
        f = frameOfGround(ctx, g);
      } catch (e) {
        fail("H2", `${where}: ${(e as Error).message}`, [p.cell]);
        continue;
      }
      const e = wallBounds(p.placement.key);
      const r = toFrame(f, p.placement.x_m, p.placement.z_m);
      const y = p.placement.y_m - f.yM;
      if (Math.abs(y - DOOR_CANOPY_Y_M) > TOL) fail("attach", `${where} stands at height ${y.toFixed(4)} over its door's base, not ${DOOR_CANOPY_Y_M}`, [p.cell]);
      const back = r.z - e.d / 2;
      if (Math.abs(back - hostFront(f, y)) > TOL) fail("attach", `${where} has its back plane ${back.toFixed(4)} from its frame's front, not ${hostFront(f, y).toFixed(4)} (its host's face)`, [p.cell]);
      const lo = f.left + e.w / 2;
      const hi = f.right - e.w / 2;
      if (e.w > f.right - f.left + TOL || r.x < lo - TOL || r.x > hi + TOL) fail("attach", `${where} stands outside its bay's span`, [p.cell]);
      else if (Math.abs(r.x - Math.min(Math.max(f.gx, lo), hi)) > TOL) fail("attach", `${where} is at x ${r.x.toFixed(4)}, not centred on its door`, [p.cell]);
      const col = ctx.col.get(keyOf(p.cell))!;
      const v = r.z + e.d / 2 - CELL_M / 2;
      reach(p.placement.key, ctx.use.get(`${col.i + SIDE_VEC[col.front].x},${col.j + SIDE_VEC[col.front].z}`) ?? "none", v);
      if (v > CELL_M + TOL) fail("reach", `${where} reaches ${v.toFixed(3)} m past its column's front edge, over ${CELL_M}`, [p.cell]);
      metrics.canopies++;
    }

    // ---- wall props ----
    if (mine.props.length > WALL_PROPS_PER_BLOCK) fail("WP1", `building ${b.id} has ${mine.props.length} wall props, over ${WALL_PROPS_PER_BLOCK}`, b.cells);
    for (const p of mine.props) {
      const col = ctx.col.get(keyOf(p.cell))!;
      const where = `the ${p.kind} ${short(p.placement.key)} on ${at(p.cell)}`;
      const isAc = p.kind === "aircon";
      if (!(isAc ? AC : PLANTER).has(p.placement.key)) fail("H2", `${where} has a key that is not of its kind`, [p.cell]);
      if (col.kind === "blind") fail("WP2", `${where} is on a blind column`, [p.cell]);
      if (p.storey < WALL_MIN_LEVEL || p.storey > b.storeys - 1) fail("WP1", `${where} is on storey ${p.storey}, outside ${WALL_MIN_LEVEL} to ${b.storeys - 1}`, [p.cell]);
      const escHere = mine.escape.length > 0 && keyOf(mine.escape[0]!.cell) === keyOf(p.cell);
      if (escHere) fail("WP1", `${where} is on its building's escape column`, [p.cell]);
      const host = floorOver(col, p.storey);
      if (!host) {
        fail("attach", `${where}: no floor piece over storey ${p.storey}`, [p.cell]);
        continue;
      }
      const f = frameOfColumn(col);
      const e = wallBounds(p.placement.key);
      const r = toFrame(f, p.placement.x_m, p.placement.z_m);
      const half = columnWidth(col) / 2;
      const wantY = col.ground.top_m * p.storey + (isAc ? WALL_AC_LIFT_M : PLANTER_LIFT_M);
      if (Math.abs(p.placement.y_m - wantY) > TOL) fail("attach", `${where} stands at height ${p.placement.y_m.toFixed(4)}, not ${wantY.toFixed(4)} (storey ${p.storey} plus its lift)`, [p.cell]);
      const back = r.z - e.d / 2;
      if (Math.abs(back - floorFront(f, host)) > TOL) fail("attach", `${where} has its back plane ${back.toFixed(4)} from its frame's front, not ${floorFront(f, host).toFixed(4)} (its host's face)`, [p.cell]);
      const lo = -half + e.w / 2;
      const hi = half - e.w / 2;
      if (r.x < lo - TOL || r.x > hi + TOL) fail("attach", `${where} stands outside its column's span`, [p.cell]);
      if (isAc ? Math.abs(Math.abs(r.x) - Math.min(WALL_AC_OFFSET_M, hi)) > TOL : Math.abs(r.x) > TOL) fail("attach", `${where} is at x ${r.x.toFixed(4)}, off its centring`, [p.cell]);
      const v = r.z + e.d / 2 - CELL_M / 2;
      reach(p.placement.key, ctx.use.get(`${col.i + SIDE_VEC[col.front].x},${col.j + SIDE_VEC[col.front].z}`) ?? "none", v);
      if (v > CELL_M + TOL) fail("reach", `${where} reaches ${v.toFixed(3)} m past its column's front edge, over ${CELL_M}`, [p.cell]);
      if (isAc) metrics.aircons++;
      else metrics.planters++;
    }
  }

  // ---- R7 ----
  const r7 = streetQualifying === 0 ? 1 : streetEscapes / streetQualifying;
  if (r7 < TILE_CITY_R7_MIN - 1e-9) fail("R7", `the share of qualifying street buildings with a fire escape is ${r7.toFixed(3)}, under ${TILE_CITY_R7_MIN}`, []);

  // ---- EP: no awning or sign on a bay that spans an escape column ----
  for (const p of layer.dressing ?? []) {
    if (p.kind === "glass" || p.kind === "atm") continue;
    const g = groundAt.get(keyOf(p.cell));
    if (g && g.cells.some((c) => escCols.has(keyOf(c)))) fail("EP", `the ${p.kind} piece ${short(p.placement.key)} on ${at(p.cell)} stands on a bay that spans an escape column`, [p.cell]);
  }

  // ---- caps ----
  let maxPerColumn = 0;
  for (const [ck, n] of perColumn) {
    const total = n + (dressOf.get(ck) ?? 0);
    maxPerColumn = Math.max(maxPerColumn, total);
    const c = ctx.col.get(ck);
    if (total > DRESS_PER_BAY_MAX) fail("cap", `the column ${c ? at(c) : ck} has ${total} pieces, over ${DRESS_PER_BAY_MAX}`, c ? [c] : []);
  }

  // ---- escapes facing each other across one cell ----
  let facingPairs = 0;
  const frontCell = (p: CityWallPiece): string => `${p.cell.i + SIDE_VEC[p.face].x},${p.cell.j + SIDE_VEC[p.face].z}`;
  const firstOf = new Map<string, CityWallPiece>();
  for (const e of escCells) if (e.piece.storey === 1) firstOf.set(keyOf(e.piece.cell), e.piece);
  for (const p of firstOf.values()) {
    const across = `${p.cell.i + 2 * SIDE_VEC[p.face].x},${p.cell.j + 2 * SIDE_VEC[p.face].z}`;
    const q = firstOf.get(across);
    if (q && frontCell(q) === frontCell(p) && keyOf(p.cell) < keyOf(q.cell)) facingPairs++;
  }

  const escapePieces = walls.filter((p) => p.kind === "escape").length;
  return {
    failures,
    metrics: { ...metrics, streetQualifying, streetEscapes, r7, escapeShort: Math.max(0, Math.ceil(TILE_CITY_R7_MIN * streetQualifying - 1e-9) - streetEscapes), quietSites, quietEscapes, pieces: walls.length, escapePieces, byKind, reachByKeyUse, maxPerColumn, facingPairs },
  };
}

/** Every failure of `layer.walls`; none when every check holds. */
export function wallFailures(layer: CityFacadesLayer, input: GroundInput): WallFailure[] {
  return wallReport(layer, input).failures;
}
