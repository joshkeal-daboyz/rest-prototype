/**
 * Stage 7, H2b: the checks of the party-wall kit in `facades.walls` (ticket 070 H2b criterion 4), each a function of the facades layer, `buildings` and `mass` (the faces are read from `mass` and `buildings`, never from the layer), run
 * by the stage before it returns and by the tests on fixtures. A failure names its check and its cells:
 * - M7: every face of `partyFaces` carries at least one kit piece lying on it, and its widest bare stretch (PW4) is at most `BLANK_RUN_MAX_M`;
 * - PW1: a kit piece stands only on an exposed storey face of its column;
 * - PW2: a kit piece's back on the wall plane (within 1e-6 m), turned to its side, unscaled; PW3: a piece inside its faces' room (its base over the lower roof, its top under the taller roof's base) and inside the face's 5 m;
 * - PW5: a key of the kit's list for its kind, and no key twice running along the faces' order;
 * - PW6: a pipe key only as a `partyPipe` on a face; 16.11: no escape on a party face or on any side that is not open;
 * - H2b: the party pieces stand after their building's H2 pieces, in column, side, storey order.
 * It also measures what the report prints.
 */

import type { CalibrationKey, CityCell, CityFacadesLayer, CityWallPiece } from "../../core";
import type { GroundInput } from "./check";
import { CELL_M } from "./constants";
import { makeCtx } from "./facts";
import { BLANK_RUN_MAX_M, PARTY_PIPES, PARTY_WINDOW, PARTY_BOARDS, partyBounds, partyKindOf } from "./partykit";
import { PARTY_SIDES, YAW_OF_SIDE, type PartyFace, fitsRoom, scanParty } from "./party";
import { SIDE_VEC, centreOf, keyOf } from "./place";

export interface PartyFailure {
  readonly check: string;
  readonly reason: string;
  readonly cells: readonly CityCell[];
}

/** What the report prints (criterion 7); none of it is asserted. */
export interface PartyMetrics {
  /** Exposed storey faces. */
  readonly faces: number;
  /** Party walls (a column's side with a step): one or two faces each. */
  readonly walls: number;
  /** Walls by the step: one storey or two. */
  readonly byStep: Readonly<Record<"1" | "2", number>>;
  /** Walls by where (a blind cell included on either side). */
  readonly byWhere: Readonly<Record<"row" | "leg" | "blind", number>>;
  /** Storey faces of blind fronts above a lower roof, left undressed (U1). */
  readonly u1Faces: number;
  readonly pieces: number;
  readonly byKind: Readonly<Record<string, number>>;
  readonly byKey: Readonly<Record<string, number>>;
  /** The widest bare stretch over every face, metres (0 with no face). */
  readonly widestBare: number;
  /** Faces where no kit key fits at all (the pre-check found none). */
  readonly nothingFits: number;
  readonly pipe01: number;
}

export interface PartyReport {
  readonly failures: PartyFailure[];
  readonly metrics: PartyMetrics;
}

const TOL = 1e-6;
const short = (k: string): string => k.slice("city-pack:SM_".length);
const PIPES: ReadonlySet<CalibrationKey> = new Set(PARTY_PIPES);
const KIT_KINDS: ReadonlySet<string> = new Set(["partyBoard", "partyPipe", "partyWindow"]);
const faceKey = (c: CityCell, side: string, storey: number): string => `${c.i},${c.j}|${side}|${storey}`;

const emptyMetrics = (): PartyMetrics => ({ faces: 0, walls: 0, byStep: { "1": 0, "2": 0 }, byWhere: { row: 0, leg: 0, blind: 0 }, u1Faces: 0, pieces: 0, byKind: {}, byKey: {}, widestBare: 0, nothingFits: 0, pipe01: 0 });

/** Every failure of the party-wall kit in `layer.walls` and the numbers the report prints. */
export function partyReport(layer: CityFacadesLayer, input: GroundInput): PartyReport {
  const failures: PartyFailure[] = [];
  const fail = (check: string, reason: string, cells: readonly CityCell[]): void => {
    failures.push({ check, reason, cells });
  };
  const walls = layer.walls;
  if (!walls) {
    fail("H2b", "the facades layer has no walls", []);
    return { failures, metrics: emptyMetrics() };
  }
  if (!input.buildings.columns) {
    fail("H2b", "the buildings layer has no columns", []);
    return { failures, metrics: emptyMetrics() };
  }
  const ctx = makeCtx(input.mass, input.buildings);
  const { faces, u1 } = scanParty(input.mass, input.buildings);
  const faceAt = new Map<string, PartyFace>(faces.map((f) => [faceKey(f.cell, f.side, f.storey), f] as const));
  const buildingIndex = new Map(input.buildings.buildings.map((b, n) => [b.id, n] as const));
  const colIndex = new Map<string, number>();
  for (const b of input.buildings.buildings) b.cells.forEach((c, n) => colIndex.set(keyOf(c), n));
  const at = (c: CityCell): string => `(${c.i}, ${c.j})`;

  // ---- the pieces ----
  const onFace = new Map<string, CityWallPiece[]>();
  const byKind: Record<string, number> = {};
  const byKey: Record<string, number> = {};
  let pieces = 0;
  let pipe01 = 0;
  let lastBuilding = -1;
  let lastParty = -1;
  let partyBuilding = -1;
  for (const p of walls) {
    const ck = keyOf(p.cell);
    const where = `the ${p.kind} piece ${short(p.placement.key)} on ${at(p.cell)} side ${p.face}`;
    const bIdx = buildingIndex.get(p.building);
    const col = ctx.col.get(ck);
    if (bIdx !== undefined) {
      if (bIdx < lastBuilding) fail("H2b", `${where} is out of building order`, [p.cell]);
      lastBuilding = Math.max(lastBuilding, bIdx);
    }
    const kit = KIT_KINDS.has(p.kind);
    // PW6: a pipe key stands only as a partyPipe (the face is checked below)
    if (PIPES.has(p.placement.key) && p.kind !== "partyPipe") fail("PW6", `${where}: a pipe key stands only as a party-wall pipe run`, [p.cell]);
    // 16.11: an escape never on a party face or a side that is not open
    if (p.kind === "escape") {
      const open = ctx.built.get(ck)?.open.some((o) => o.side === p.face) ?? false;
      const party = [...faceAt.values()].some((f) => keyOf(f.cell) === ck && f.side === p.face);
      if (party || !open) fail("16.11", `${where}: a fire escape stands on ${party ? "a party wall" : "a side that is not open"} (16.11)`, [p.cell]);
      continue;
    }
    if (!kit) {
      if (bIdx !== undefined && bIdx === partyBuilding) fail("H2b", `${where} follows its building's party-wall pieces (H2's pieces come first)`, [p.cell]);
      continue;
    }
    pieces++;
    byKind[p.kind] = (byKind[p.kind] ?? 0) + 1;
    byKey[short(p.placement.key)] = (byKey[short(p.placement.key)] ?? 0) + 1;
    if (p.placement.key === PARTY_PIPES[0]) pipe01++;
    if (bIdx === undefined || !col || col.building !== p.building) {
      fail("H2b", `${where} is on a column that is not in building ${p.building}`, [p.cell]);
      continue;
    }
    partyBuilding = bIdx;
    const order = (colIndex.get(ck) ?? 0) * 1e5 + PARTY_SIDES.indexOf(p.face) * 1e3 + p.storey;
    if (bIdx * 1e9 + order < lastParty) fail("H2b", `${where} is out of order (by column along the row, then side, then bottom up)`, [p.cell]);
    lastParty = Math.max(lastParty, bIdx * 1e9 + order);
    // the kit: the key's kind
    if (partyKindOf(p.placement.key) !== p.kind) {
      fail("PW5", `${where}: its key is not a key of the ${p.kind} list`, [p.cell]);
      continue;
    }
    if (p.kind === "partyPipe" && !PIPES.has(p.placement.key)) fail("PW6", `${where}: not a pipe key of the kit`, [p.cell]);
    // PW1: every storey it covers is an exposed face
    const covered: PartyFace[] = [];
    for (let s = p.storey; s < p.storey + p.span; s++) {
      const f = faceAt.get(faceKey(p.cell, p.face, s));
      if (!f) fail(p.kind === "partyPipe" ? "PW6" : "PW1", `${where}: storey ${s} of its column's side ${p.face} is not an exposed party-wall face`, [p.cell]);
      else {
        covered.push(f);
        (onFace.get(faceKey(p.cell, p.face, s)) ?? onFace.set(faceKey(p.cell, p.face, s), []).get(faceKey(p.cell, p.face, s))!).push(p);
      }
    }
    if (covered.length !== p.span) continue;
    // PW2: turned to its side, its back on the cell edge, unscaled, no boxes
    const e = partyBounds(p.placement.key);
    const v = SIDE_VEC[p.face];
    if (p.placement.yaw_deg !== YAW_OF_SIDE[p.face]) fail("PW2", `${where} is turned ${p.placement.yaw_deg}, not ${YAW_OF_SIDE[p.face]}`, [p.cell]);
    const c = centreOf(p.cell);
    const back = p.placement.x_m * v.x + p.placement.z_m * v.z - e.d / 2;
    const plane = c.x * v.x + c.z * v.z + CELL_M / 2;
    if (Math.abs(back - plane) > TOL) fail("PW2", `${where} has its back ${back.toFixed(4)} along its side's normal, not on the wall plane ${plane.toFixed(4)} (attachment)`, [p.cell]);
    if (p.scaleY !== 1 || p.boxes.length > 0) fail("PW2", `${where} is scaled or carries boxes`, [p.cell]);
    // PW3: across inside the face's 5 m; up inside the room of the faces it covers
    const t = v.x !== 0 ? p.placement.z_m : p.placement.x_m;
    const t0 = (v.x !== 0 ? c.z : c.x) - CELL_M / 2;
    if (t - e.w / 2 < t0 - TOL || t + e.w / 2 > t0 + CELL_M + TOL) fail("PW3", `${where} stands ${(t - e.w / 2 - t0).toFixed(3)} to ${(t + e.w / 2 - t0).toFixed(3)} m along its face, outside its 5 m`, [p.cell]);
    const first = covered[0]!;
    const last = covered[covered.length - 1]!;
    if (p.placement.y_m < first.lo_m - TOL) fail("PW3", `${where} has its base at ${p.placement.y_m.toFixed(3)} m, under ${first.lo_m.toFixed(3)} m (it sinks into the lower roof)`, [p.cell]);
    if (p.placement.y_m + e.h > last.hi_m + TOL) fail("PW3", `${where} has its top at ${(p.placement.y_m + e.h).toFixed(3)} m, over ${last.hi_m.toFixed(3)} m (past the taller roof's base)`, [p.cell]);
  }

  // ---- the faces ----
  let widest = 0;
  let nothingFits = 0;
  let prev: { key: CalibrationKey; piece: CityWallPiece } | null = null;
  for (const f of faces) {
    const mine = onFace.get(faceKey(f.cell, f.side, f.storey)) ?? [];
    const where = `the party wall at ${at(f.cell)} side ${f.side} storey ${f.storey} of building ${f.building}`;
    const room = f.hi_m - f.lo_m;
    if (![...PARTY_BOARDS, PARTY_WINDOW, ...PARTY_PIPES].some((k) => fitsRoom(k, room))) nothingFits++;
    if (mine.length === 0) {
      fail("M7", `${where} carries no kit piece (a bare wall above the lower roof)`, [f.cell]);
      prev = null;
      continue;
    }
    // PW4: the widest bare stretch along the face
    const c = centreOf(f.cell);
    const horizontal = SIDE_VEC[f.side].x !== 0;
    const t0 = (horizontal ? c.z : c.x) - CELL_M / 2;
    const spans = mine
      .map((p) => {
        const t = horizontal ? p.placement.z_m : p.placement.x_m;
        const w = partyBounds(p.placement.key).w;
        return [Math.max(t0, t - w / 2), Math.min(t0 + CELL_M, t + w / 2)] as const;
      })
      .sort((a, b) => a[0] - b[0]);
    let reach = t0;
    let gap = 0;
    for (const [a, b] of spans) {
      gap = Math.max(gap, a - reach);
      reach = Math.max(reach, b);
    }
    gap = Math.max(gap, t0 + CELL_M - reach);
    widest = Math.max(widest, gap);
    if (gap > BLANK_RUN_MAX_M + TOL) fail("M7", `${where} has a bare stretch of ${gap.toFixed(3)} m, over ${BLANK_RUN_MAX_M}`, [f.cell]);
    // PW5: no key twice running (a pipe over two faces is one piece)
    const piece = mine[0]!;
    if (prev && prev.piece !== piece && prev.key === piece.placement.key) fail("PW5", `${where} has the key ${short(piece.placement.key)}, as the face just before it`, [f.cell]);
    prev = { key: piece.placement.key, piece };
  }

  /** The lowest face of each wall. */
  const lowest = faces.filter((f) => f.storey === f.lowerStoreys);
  const metrics: PartyMetrics = {
    faces: faces.length,
    walls: lowest.length,
    byStep: { "1": lowest.filter((f) => f.storeys - f.lowerStoreys === 1).length, "2": lowest.filter((f) => f.storeys - f.lowerStoreys === 2).length },
    byWhere: { row: lowest.filter((f) => f.where === "row").length, leg: lowest.filter((f) => f.where === "leg").length, blind: lowest.filter((f) => f.where === "blind").length },
    u1Faces: u1.length,
    pieces,
    byKind,
    byKey,
    widestBare: widest,
    nothingFits,
    pipe01,
  };
  return { failures, metrics };
}

/** Every failure of the party-wall kit (the report's list without its numbers). */
export const partyFailures = (layer: CityFacadesLayer, input: GroundInput): PartyFailure[] => partyReport(layer, input).failures;
