/**
 * Stage 7, H3: the checks of `facades.roofs` (ticket 070 H3 criterion 5), each a function of the facades layer, `buildings` and `mass` (and, for RC and RK, the layer's `dressing` and `walls`, read only), run by the stage after
 * H2b's checks and by the tests on fixtures. A failure names its check and its cells:
 * - R8: the share of buildings with at least one roof piece, and the share of B2 runs with a big prop (`ROOF_DRESSED_MIN`, `BIG_ROOF_RUNS_MIN`);
 * - M9b (the roof exit): wholly on the deck, its door (its own +z) the side opposite its column's front, not an open side and with a non-positive component along every open side's outward normal, its clear deck (RW) inside the deck with
 *   no other roof piece on it; RX: on a blind column wherever its building has a blind column that holds it, never on a corner column;
 * - deck (RE, RT, BB): every piece's footprint inside its column's deck (`ROOF_EDGE_M` in; `BILLBOARD_EDGE_M` for a billboard's two pieces), its base on the deck within 1e-6 m, no two footprints overlapping; RK: and clear of the
 *   party-wall pieces over its roof (the deck's side inset by the deepest, where deeper than `ROOF_EDGE_M`);
 * - roofs (criterion 2): the big prop on a mid roof only and one a building, a billboard whole (its structure and one face, one column) and one a run; RB: a billboard only on a mid column with a street front; NV (H1c): a `novelty` piece only with a key of `NOVELTY_KEYS`, on a mid column of a shop in `layer.shops`;
 *   small props off the big prop's column and at most `ROOF_SMALL_PER_BAY` a column; every key of its kind's list, and its turn;
 * - TC (H3b), the tower cap: a street block's water towers are at most floor(its buildings / `WATER_TOWER_PER_BUILDINGS`);
 * - cap (RC): a column's pieces, H1b's dressing, the escape's weight, H2's canopies and upper-wall props and the roof pieces together, at most `DRESS_PER_BAY_MAX` (no party-wall piece counts: PW7).
 * It also measures what the report prints.
 */

import type { CalibrationKey, CityCell, CityFacadesLayer, CityRoofPiece } from "../../core";
import type { GroundInput } from "./check";
import { runsOf } from "./dress";
import { DRESS_PER_BAY_MAX } from "./dresskit";
import { makeCtx } from "./facts";
import { NOVELTY_KEYS } from "./noveltykit";
import { OPPOSITE, SIDE_VEC, keyOf, rotate, sideOf } from "./place";
import {
  BIG_ROOF_KINDS,
  BIG_ROOF_RUNS_MIN,
  BILLBOARD_EDGE_M,
  BILLBOARD_FACES,
  BILLBOARD_SIGN_Y_M,
  BILLBOARD_STRUCTURE,
  ROOF_ACCESS,
  ROOF_EDGE_M,
  ROOF_DRESSED_MIN,
  ROOF_SMALL,
  ROOF_SMALL_PER_BAY,
  ROOF_WATER_TOWER,
  WATER_TOWER_PER_BUILDINGS,
  isTurnable,
  roofBounds,
} from "./roofkit";
import { NO_INSETS, clearDeckOf, columnLoads, deckOf, deckY, exitFits, footprintOf, roofInsets, streetMid, within } from "./roofs";

export interface RoofFailure {
  readonly check: string;
  readonly reason: string;
  readonly cells: readonly CityCell[];
}

/** What the report prints (criterion 8); none of it is asserted. */
export interface RoofMetrics {
  readonly buildings: number;
  readonly dressed: number;
  readonly runs: number;
  readonly bigRuns: number;
  readonly pieces: number;
  readonly byKind: Readonly<Record<string, number>>;
  readonly byKey: Readonly<Record<string, number>>;
  /** Big props (a billboard once) by the column's kind and by the building's storeys. */
  readonly bigByColumn: Readonly<Record<string, number>>;
  readonly bigByStoreys: Readonly<Record<string, number>>;
  /** The tallest top of a big prop (base plus bounds height; a billboard's face too), metres. */
  readonly tallestTop: number;
  /** Columns with one small prop, and with two. */
  readonly smallOne: number;
  readonly smallTwo: number;
  /** The most pieces a column holds with the roof pieces counted. */
  readonly maxPerColumn: number;
}

export interface RoofReport {
  readonly failures: RoofFailure[];
  readonly metrics: RoofMetrics;
}

const TOL = 1e-6;
const short = (k: string): string => k.slice("city-pack:SM_".length);
const BIG: ReadonlySet<string> = new Set(["waterTower", "exit", "billboard", "novelty"]);
const KEYS: Readonly<Record<string, readonly CalibrationKey[]>> = {
  small: ROOF_SMALL,
  waterTower: [ROOF_WATER_TOWER],
  exit: [ROOF_ACCESS],
  billboard: [BILLBOARD_STRUCTURE],
  billboardFace: BILLBOARD_FACES,
  novelty: NOVELTY_KEYS,
};

const emptyMetrics = (): RoofMetrics => ({ buildings: 0, dressed: 0, runs: 0, bigRuns: 0, pieces: 0, byKind: {}, byKey: {}, bigByColumn: {}, bigByStoreys: {}, tallestTop: 0, smallOne: 0, smallTwo: 0, maxPerColumn: 0 });

/** Every failure of `layer.roofs` and the numbers the report prints. */
export function roofReport(layer: CityFacadesLayer, input: GroundInput): RoofReport {
  const failures: RoofFailure[] = [];
  const fail = (check: string, reason: string, cells: readonly CityCell[]): void => {
    failures.push({ check, reason, cells });
  };
  const roofs = layer.roofs;
  if (!roofs) {
    fail("H3", "the facades layer has no roofs", []);
    return { failures, metrics: emptyMetrics() };
  }
  if (!input.buildings.columns) {
    fail("H3", "the buildings layer has no columns", []);
    return { failures, metrics: emptyMetrics() };
  }
  const ctx = makeCtx(input.mass, input.buildings);
  const insets = roofInsets(layer.walls ?? []);
  const loads = columnLoads(layer, input.buildings);
  const runOf = runsOf(input.buildings);
  /** NV (H1c): the cells of every shop, a novelty piece's column must be one of them. */
  const shopCells = new Set((layer.shops ?? []).flatMap((s) => s.cells.map((c) => keyOf(c))));
  const at = (c: CityCell): string => `(${c.i}, ${c.j})`;
  const buildingIndex = new Map(input.buildings.buildings.map((b, n) => [b.id, n] as const));
  const colIndex = new Map<string, number>();
  for (const b of input.buildings.buildings) b.cells.forEach((c, n) => colIndex.set(keyOf(c), n));

  const byKind: Record<string, number> = {};
  const byKey: Record<string, number> = {};
  const bigByColumn: Record<string, number> = {};
  const bigByStoreys: Record<string, number> = {};
  let tallestTop = 0;
  let lastOrder = -1;
  /** Pieces by column, for overlaps, the cap and the small-prop rules. */
  const perCol = new Map<string, CityRoofPiece[]>();
  const perBuilding = new Map<string, CityRoofPiece[]>();

  for (const p of roofs) {
    const ck = keyOf(p.cell);
    const where = `the ${p.kind} piece ${short(p.placement.key)} on ${at(p.cell)}`;
    byKind[p.kind] = (byKind[p.kind] ?? 0) + 1;
    byKey[short(p.placement.key)] = (byKey[short(p.placement.key)] ?? 0) + 1;
    const bIdx = buildingIndex.get(p.building);
    const n = colIndex.get(ck);
    const col = ctx.col.get(ck);
    if (bIdx === undefined || n === undefined || !col || col.building !== p.building) {
      fail("H3", `${where} is on a column that is not in building ${p.building}`, [p.cell]);
      continue;
    }
    if (p.kind === "novelty" && (!NOVELTY_KEYS.includes(p.placement.key) || col.kind !== "mid" || !shopCells.has(ck))) {
      fail("roofs", `${where}: NV, a novelty sign stands only with a novelty key on a mid column of a shop`, [p.cell]);
      continue;
    }
    const list = KEYS[p.kind];
    if (!list || !list.includes(p.placement.key)) {
      fail("roofs", `${where} is not a key of the ${p.kind} list`, [p.cell]);
      continue;
    }
    (perCol.get(ck) ?? perCol.set(ck, []).get(ck)!).push(p);
    (perBuilding.get(p.building) ?? perBuilding.set(p.building, []).get(p.building)!).push(p);

    // the order: building by building, in a building its big prop first (a billboard's structure, then its face), then its small props by column, a column's left half first
    const rank = p.kind === "small" ? 1e6 + n * 10 : p.kind === "billboardFace" ? 1 : 0;
    const order = bIdx * 1e7 + rank;
    if (order < lastOrder) fail("H3", `${where} is out of order (building order; its big prop first, then its small props by column)`, [p.cell]);
    lastOrder = order;

    // the turn: the column's, plus a half-turn for the exit always and a turnable small prop by hash
    const rel = ((((p.placement.yaw_deg - col.yaw) % 360) + 360) % 360) as number;
    const turnOk = p.kind === "exit" ? rel === 180 : p.kind === "small" ? rel === 0 || (rel === 180 && isTurnable(p.placement.key)) : p.kind === "novelty" ? rel === 0 || rel === 90 : rel === 0;
    if (!turnOk) fail(p.kind === "exit" ? "M9b" : "roofs", `${where} is turned ${p.placement.yaw_deg} against its column's ${col.yaw}`, [p.cell]);
    const facing = sideOf(rotate(p.placement.yaw_deg, 0, 1));
    if (facing !== p.facing) fail("roofs", `${where} says it faces ${p.facing} and its turn faces ${String(facing)}`, [p.cell]);

    // the deck: its footprint, its base, RK
    const billboard = p.kind === "billboard" || p.kind === "billboardFace";
    const plain = deckOf(col, NO_INSETS, billboard ? BILLBOARD_EDGE_M : ROOF_EDGE_M);
    const deck = deckOf(col, insets, billboard ? BILLBOARD_EDGE_M : ROOF_EDGE_M);
    const f = footprintOf(col, p.placement);
    if (!within(f, plain)) fail("deck", `${where}: its footprint (${f.x0.toFixed(3)} to ${f.x1.toFixed(3)} across, ${f.z0.toFixed(3)} to ${f.z1.toFixed(3)} front to back) is outside its deck (${plain.left.toFixed(3)} to ${plain.right.toFixed(3)}, ${plain.back.toFixed(3)} to ${plain.front.toFixed(3)})`, [p.cell]);
    else if (!within(f, deck)) fail("RK", `${where}: its footprint stands over a party-wall piece's reach (the deck, inset by it, is ${deck.left.toFixed(3)} to ${deck.right.toFixed(3)}, ${deck.back.toFixed(3)} to ${deck.front.toFixed(3)})`, [p.cell]);
    const base = deckY(col) + (p.kind === "billboardFace" ? BILLBOARD_SIGN_Y_M : 0);
    if (Math.abs(p.placement.y_m - base) > TOL) fail("deck", `${where}: its base ${p.placement.y_m} is not the deck's ${base}`, [p.cell]);

    if (BIG.has(p.kind)) {
      const b = input.buildings.buildings[bIdx]!;
      bigByColumn[col.kind] = (bigByColumn[col.kind] ?? 0) + 1;
      bigByStoreys[String(b.storeys)] = (bigByStoreys[String(b.storeys)] ?? 0) + 1;
    }
    if (BIG.has(p.kind) || p.kind === "billboardFace") tallestTop = Math.max(tallestTop, p.placement.y_m + roofBounds(p.placement.key).h);
  }

  // ---- no two footprints overlap ----
  for (const [ck, ps] of perCol) {
    const col = ctx.col.get(ck)!;
    const fs = ps.map((p) => footprintOf(col, p.placement));
    for (let a = 0; a < ps.length; a++) {
      for (let b = a + 1; b < ps.length; b++) {
        const x = Math.min(fs[a]!.x1, fs[b]!.x1) - Math.max(fs[a]!.x0, fs[b]!.x0);
        const z = Math.min(fs[a]!.z1, fs[b]!.z1) - Math.max(fs[a]!.z0, fs[b]!.z0);
        if (x > TOL && z > TOL) fail("deck", `the ${ps[a]!.kind} piece ${short(ps[a]!.placement.key)} and the ${ps[b]!.kind} piece ${short(ps[b]!.placement.key)} on ${at(col)} overlap`, [col]);
      }
    }
  }

  // ---- the buildings: the roofs' rules, RB, M9b, RX ----
  const billboardsOfRun = new Map<string, number>();
  for (const b of input.buildings.buildings) {
    const mine = perBuilding.get(b.id) ?? [];
    const cols = b.cells.map((c) => ctx.col.get(keyOf(c))!);
    const bigs = mine.filter((p) => BIG.has(p.kind));
    if (bigs.length > 1) fail("roofs", `building ${b.id} has ${bigs.length} big roof props, over one`, bigs.map((p) => p.cell));
    const bigCells = new Set(bigs.map((p) => keyOf(p.cell)));
    for (const p of bigs) {
      const col = ctx.col.get(keyOf(p.cell))!;
      if (col.kind === "corner") fail("roofs", `the ${p.kind} piece ${short(p.placement.key)} stands on the corner column ${at(col)}: a big prop is only on a mid roof`, [col]);
    }
    // a billboard is its structure and one face, on one column, facing its column's front
    const structures = mine.filter((p) => p.kind === "billboard");
    const faces = mine.filter((p) => p.kind === "billboardFace");
    if (structures.length !== faces.length || structures.some((s) => !faces.some((q) => keyOf(q.cell) === keyOf(s.cell) && q.facing === s.facing))) {
      fail("roofs", `building ${b.id}'s billboard is not one structure and one face on one column`, structures.map((p) => p.cell));
    }
    for (const s of structures) {
      const col = ctx.col.get(keyOf(s.cell))!;
      const run = runOf.get(b.id) ?? b.id;
      billboardsOfRun.set(run, (billboardsOfRun.get(run) ?? 0) + 1);
      if (!streetMid(ctx, col)) fail("RB", `the billboard on ${at(col)} of building ${b.id} is not on a mid column with a street front`, [col]);
      if (s.facing !== col.front) fail("roofs", `the billboard on ${at(col)} faces ${s.facing}, not its column's front ${col.front}`, [col]);
      // the face stands in front of its structure
      const face = faces.find((q) => keyOf(q.cell) === keyOf(s.cell));
      if (face) {
        const fs = footprintOf(col, s.placement);
        const ff = footprintOf(col, face.placement);
        if (Math.abs(ff.x0 + ff.x1 - fs.x0 - fs.x1) > 2 * TOL || Math.abs(ff.z0 - fs.z1) > TOL) fail("roofs", `the billboard's face on ${at(col)} is not in front of its structure`, [col]);
      }
    }
    // small props: off the big prop's column, at most ROOF_SMALL_PER_BAY a column
    const smalls = new Map<string, number>();
    for (const p of mine.filter((q) => q.kind === "small")) {
      const k = keyOf(p.cell);
      smalls.set(k, (smalls.get(k) ?? 0) + 1);
      if (bigCells.has(k)) fail("roofs", `the small prop ${short(p.placement.key)} stands on ${at(p.cell)}, the column of the building's big prop`, [p.cell]);
    }
    for (const [k, c] of smalls) if (c > ROOF_SMALL_PER_BAY) fail("roofs", `the column ${k} has ${c} small props, over ${ROOF_SMALL_PER_BAY}`, [ctx.col.get(k)!]);

    // M9b and RX
    for (const p of mine.filter((q) => q.kind === "exit")) {
      const col = ctx.col.get(keyOf(p.cell))!;
      const open = ctx.built.get(keyOf(col))?.open ?? [];
      if (p.facing !== OPPOSITE[col.front]) fail("M9b", `${where(p)}: its door faces ${p.facing}, not the side opposite its column's front ${col.front}`, [col]);
      if (open.some((o) => o.side === p.facing)) fail("M9b", `${where(p)}: its door faces ${p.facing}, an open side of its column`, [col]);
      const dv = SIDE_VEC[p.facing];
      for (const o of open) {
        const ov = SIDE_VEC[o.side];
        if (dv.x * ov.x + dv.z * ov.z > 0) fail("M9b", `${where(p)}: its door's normal points along the open side ${o.side}`, [col]);
      }
      const deck = deckOf(col, insets, ROOF_EDGE_M);
      if (!within(footprintOf(col, p.placement), deck)) fail("M9b", `${where(p)}: it does not stand wholly on its deck`, [col]);
      const clear = clearDeckOf(col, p.placement);
      if (!within({ x0: clear.left, x1: clear.right, z0: clear.back, z1: clear.front }, deck)) fail("M9b", `${where(p)}: its clear deck is not inside the deck`, [col]);
      for (const q of perCol.get(keyOf(col)) ?? []) {
        if (q === p) continue;
        const f = footprintOf(col, q.placement);
        if (Math.min(f.x1, clear.right) - Math.max(f.x0, clear.left) > TOL && Math.min(f.z1, clear.front) - Math.max(f.z0, clear.back) > TOL) fail("M9b", `${where(p)}: the ${q.kind} piece ${short(q.placement.key)} stands on its clear deck`, [col]);
      }
      if (col.kind === "corner") fail("RX", `${where(p)} stands on a corner column`, [col]);
      else if (col.kind !== "blind" && cols.some((c) => c.kind === "blind" && exitFits(deckOf(c, insets, ROOF_EDGE_M)))) fail("RX", `${where(p)} stands on a mid column of building ${b.id}, which has a blind column that holds it`, [col]);
    }
  }
  for (const [run, c] of billboardsOfRun) if (c > 1) fail("roofs", `the run ${run} has ${c} billboards, over one`, []);
  function where(p: CityRoofPiece): string {
    return `the exit on ${at(p.cell)} of building ${p.building}`;
  }

  // ---- the cap (RC) ----
  let maxPerColumn = 0;
  for (const [ck, c] of loads) maxPerColumn = Math.max(maxPerColumn, c + (perCol.get(ck)?.length ?? 0));
  for (const [ck, ps] of perCol) {
    const total = (loads.get(ck) ?? 0) + ps.length;
    maxPerColumn = Math.max(maxPerColumn, total);
    if (total > DRESS_PER_BAY_MAX) fail("cap", `the column ${at(ctx.col.get(ck)!)} has ${total} pieces, over ${DRESS_PER_BAY_MAX}`, [ctx.col.get(ck)!]);
  }

  // ---- TC, the tower cap (H3b): a street block's water towers are at most floor(its buildings / WATER_TOWER_PER_BUILDINGS) ----
  const blockOf = new Map(input.buildings.buildings.map((b) => [b.id, b.block] as const));
  const inBlock = new Map<string, number>();
  for (const b of input.buildings.buildings) inBlock.set(b.block, (inBlock.get(b.block) ?? 0) + 1);
  const towersOf = new Map<string, CityRoofPiece[]>();
  for (const p of roofs) if (p.kind === "waterTower" && blockOf.has(p.building)) (towersOf.get(blockOf.get(p.building)!) ?? towersOf.set(blockOf.get(p.building)!, []).get(blockOf.get(p.building)!)!).push(p);
  for (const [block, ps] of towersOf) {
    const cap = Math.floor((inBlock.get(block) ?? 0) / WATER_TOWER_PER_BUILDINGS);
    if (ps.length > cap) fail("TC", `the block ${block} has ${ps.length} water towers, over its cap of ${cap} (one for every ${WATER_TOWER_PER_BUILDINGS} of its ${inBlock.get(block) ?? 0} buildings), at ${ps.map((q) => at(q.cell)).join(", ")}`, ps.map((q) => q.cell));
  }

  // ---- R8 ----
  const hasRoof = new Set(roofs.map((p) => p.building));
  const dressed = input.buildings.buildings.filter((b) => hasRoof.has(b.id)).length;
  const runs = new Set(input.buildings.buildings.map((b) => runOf.get(b.id) ?? b.id));
  const bigRuns = new Set(roofs.filter((p) => BIG_ROOF_KINDS.includes(p.kind)).map((p) => runOf.get(p.building) ?? p.building));
  const total = input.buildings.buildings.length;
  if (total > 0 && dressed / total < ROOF_DRESSED_MIN - 1e-9) fail("R8", `the share of buildings with a roof piece is ${(dressed / total).toFixed(3)}, under ${ROOF_DRESSED_MIN}`, []);
  if (runs.size > 0 && bigRuns.size / runs.size < BIG_ROOF_RUNS_MIN - 1e-9) fail("R8", `the share of runs with a big roof prop is ${(bigRuns.size / runs.size).toFixed(3)}, under ${BIG_ROOF_RUNS_MIN}`, []);

  let smallOne = 0;
  let smallTwo = 0;
  const smallPerCol = new Map<string, number>();
  for (const p of roofs) if (p.kind === "small") smallPerCol.set(keyOf(p.cell), (smallPerCol.get(keyOf(p.cell)) ?? 0) + 1);
  for (const c of smallPerCol.values()) if (c === 1) smallOne++;
  else smallTwo++;

  return {
    failures,
    metrics: { buildings: total, dressed, runs: runs.size, bigRuns: bigRuns.size, pieces: roofs.length, byKind, byKey, bigByColumn, bigByStoreys, tallestTop, smallOne, smallTwo, maxPerColumn },
  };
}

/** Every failure of `layer.roofs` against `buildings`, `mass`, `dressing` and `walls`. Empty when every check holds. */
export function roofFailures(layer: CityFacadesLayer, input: GroundInput): RoofFailure[] {
  return roofReport(layer, input).failures;
}

