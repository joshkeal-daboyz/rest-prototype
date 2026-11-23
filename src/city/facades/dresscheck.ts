/**
 * Stage 7, H1b: the checks (ticket 070 H1b criterion 4), each a function of the facades layer, `buildings` and `mass`, run by the stage before it returns and by the tests on fixtures. A failure names its check and its cells:
 * - H1b: the layer's shape (the pieces in `cityplan.ts`' order, each one on a column of its building, on a bay of the right kind, with its key from the right list);
 * - R4: every shop bay whose key has a glass key carries exactly that glass (share 1); no other piece is glass;
 * - R5: the share of shop bays with an awning on their column is at least `DRESS_R5_MIN`, and no building has two keys of `AWNINGS`; the L awning only on a shop corner;
 * - R6: the share of shop bays with a sign (fascia or blade) is at least `DRESS_R6_MIN`; the share of street buildings with an ATM is at least `DRESS_ATM_MIN` (A1);
 * - M8: no piece on a column with no street open side; a single-face piece's face is its column's front and a street side; a wrap only on a shop corner (X1);
 * - caps: `DRESS_PER_BAY_MAX` a column, one ATM and one blade sign a building, no fascia key twice in a building, one sign a bay, `ATM_PER_RUN` an ATM run, no blade sign on a bay with an awning;
 * - LG: no two L awnings on neighbouring columns (Josh, Q22 answer 3);
 * - attach: each piece's plane on its host, its centring, its height, its reach (T1: `REACH_M`, and `AWNING_REACH_M` for an awning) and a sign's roof cap.
 * It also measures what the report prints: the shares, the furthest reach by key, the neighbouring pieces' overlaps (W1), the mixed corners (X1). The overlaps are reported, never asserted.
 */

import type { CalibrationKey, CityCell, CityDressingPiece, CityFacadesLayer, CityGroundPiece, CitySide } from "../../core";
import { CityStageError } from "../pipeline/error";
import type { GroundInput } from "./check";
import {
  ATMS,
  ATM_PER_RUN,
  ATM_Y_M,
  AWNINGS,
  AWNING_BASE_M,
  AWNING_CORNER,
  BLADE_INSET_M,
  DRESS_ATM_MIN,
  DRESS_PER_BAY_MAX,
  DRESS_R4_MIN,
  DRESS_R5_MIN,
  DRESS_R6_MIN,
  GLASS_INSET_M,
  GLASS_SILL_M,
  GLASS_WRAP_DEPTH_M,
  SIGNS_BLADE,
  SIGNS_FASCIA,
  SIGN_BASE_M,
  dressBounds,
  glassKeyOf,
} from "./dresskit";
import { AWNING_REACH_M, REACH_M, baysOf, hostFront, runsOf, type Bay } from "./dress";
import { makeCtx, type Ctx } from "./facts";
import { SIDE_VEC, keyOf, rotate } from "./place";

export interface DressFailure {
  readonly check: string;
  readonly reason: string;
  readonly cells: readonly CityCell[];
}

/** One neighbouring pair's overlap in the plan, by key pair. */
export interface OverlapTally {
  n: number;
  /** Of those, the pairs that also overlap in height. */
  nHeight: number;
  max: number;
  maxHeight: number;
}

/** What the report prints (criterion 7); none of it is asserted. */
export interface DressMetrics {
  readonly shopBays: number;
  readonly glassKeyBays: number;
  readonly glassed: number;
  readonly awned: number;
  readonly signed: number;
  readonly mixedAwningBuildings: number;
  readonly streetBuildings: number;
  readonly atmBuildings: number;
  readonly pieces: number;
  readonly byKind: Readonly<Record<string, number>>;
  readonly byKey: Readonly<Record<string, number>>;
  /** Awning keys per building: how many buildings have 0, 1 or 2 or more flat keys, and the L's count. */
  readonly flatKeysPerBuilding: Readonly<Record<string, number>>;
  readonly lAwnings: number;
  readonly mixedCorners: number;
  readonly mixedQuietFront: number;
  /** The furthest a piece's outer face stands past its column's front cell edge, by key (T1). */
  readonly reachByKey: Readonly<Record<string, number>>;
  readonly overlaps: Readonly<Record<string, OverlapTally>>;
  readonly overlapPairs: number;
  readonly overlapPairsHeight: number;
  readonly maxOverlap: number;
  /** The largest overlap among pairs that also overlap in height (W1's stop line is 0.11 m). */
  readonly maxOverlapHeight: number;
  readonly runs: number;
  readonly runsWithAtm: number;
  readonly runsAtCap: number;
  readonly maxPerColumn: number;
}

export interface DressReport {
  readonly failures: DressFailure[];
  readonly metrics: DressMetrics;
}

const TOL = 1e-6;
const RANK: Readonly<Record<string, number>> = { glass: 0, awning: 1, bladeSign: 2, fasciaSign: 3, atm: 4 };
const FASCIA: ReadonlySet<CalibrationKey> = new Set(SIGNS_FASCIA);
const BLADE: ReadonlySet<CalibrationKey> = new Set(SIGNS_BLADE);
const FLAT: ReadonlySet<CalibrationKey> = new Set(AWNINGS);
const L_KEY = AWNING_CORNER[0]!;

const empty = (): DressMetrics => ({
  shopBays: 0,
  glassKeyBays: 0,
  glassed: 0,
  awned: 0,
  signed: 0,
  mixedAwningBuildings: 0,
  streetBuildings: 0,
  atmBuildings: 0,
  pieces: 0,
  byKind: {},
  byKey: {},
  flatKeysPerBuilding: {},
  lAwnings: 0,
  mixedCorners: 0,
  mixedQuietFront: 0,
  reachByKey: {},
  overlaps: {},
  overlapPairs: 0,
  overlapPairsHeight: 0,
  maxOverlap: 0,
  maxOverlapHeight: 0,
  runs: 0,
  runsWithAtm: 0,
  runsAtCap: 0,
  maxPerColumn: 0,
});

const short = (k: string): string => k.slice("city-pack:SM_".length);

/** The shares are 1 when there is nothing to count. */
const share = (n: number, d: number): number => (d === 0 ? 1 : n / d);

/** A piece's box in the plan and in height, metres. */
function boxOf(p: CityDressingPiece): { x0: number; x1: number; z0: number; z1: number; y0: number; y1: number } {
  const e = dressBounds(p.placement.key);
  const c = [rotate(p.placement.yaw_deg, -e.w / 2, -e.d / 2), rotate(p.placement.yaw_deg, e.w / 2, -e.d / 2), rotate(p.placement.yaw_deg, -e.w / 2, e.d / 2), rotate(p.placement.yaw_deg, e.w / 2, e.d / 2)];
  return {
    x0: p.placement.x_m + Math.min(...c.map((v) => v.x)),
    x1: p.placement.x_m + Math.max(...c.map((v) => v.x)),
    z0: p.placement.z_m + Math.min(...c.map((v) => v.z)),
    z1: p.placement.z_m + Math.max(...c.map((v) => v.z)),
    y0: p.placement.y_m,
    y1: p.placement.y_m + e.h,
  };
}

/** Every failure of `layer.dressing` and the numbers the report prints. */
export function dressReport(layer: CityFacadesLayer, input: GroundInput): DressReport {
  const failures: DressFailure[] = [];
  const fail = (check: string, reason: string, cells: readonly CityCell[]): void => {
    failures.push({ check, reason, cells });
  };
  const at = (c: CityCell): string => `(${c.i}, ${c.j})`;
  const dressing = layer.dressing;
  if (!dressing) {
    fail("H1b", "the facades layer has no dressing", []);
    return { failures, metrics: empty() };
  }
  if (!input.buildings.columns) {
    fail("H1b", "the buildings layer has no columns", []);
    return { failures, metrics: empty() };
  }
  const ctx: Ctx = makeCtx(input.mass, input.buildings);

  // The bays of every building, from H1's ground pieces.
  const groundOf = new Map<string, CityGroundPiece[]>();
  const firstOf = new Map<string, CityGroundPiece>();
  for (const g of layer.ground) {
    (groundOf.get(g.building) ?? groundOf.set(g.building, []).get(g.building)!).push(g);
    firstOf.set(keyOf(g.cells[0]!), g);
  }
  const bayAt = new Map<string, Bay>();
  const colIndex = new Map<string, number>();
  const buildingIndex = new Map(input.buildings.buildings.map((b, n) => [b.id, n] as const));
  for (const b of input.buildings.buildings) {
    b.cells.forEach((c, n) => colIndex.set(keyOf(c), n));
    try {
      for (const bay of baysOf(ctx, b, groundOf.get(b.id) ?? [])) bayAt.set(keyOf(bay.g.cells[0]!), bay);
    } catch (e) {
      if (e instanceof CityStageError) fail("H1b", e.reason, e.cells);
      else throw e;
    }
  }

  // Index the pieces by cell.
  const glassAt = new Map<string, CityDressingPiece>();
  const awningAt = new Map<string, CityDressingPiece>();
  const signAt = new Map<string, CityDressingPiece[]>();
  const perColumn = new Map<string, number>();
  type PerBuilding = { flat: Set<CalibrationKey>; blade: number; fascia: Map<CalibrationKey, number>; atm: number };
  const perBuilding = new Map<string, PerBuilding>();
  const byBuilding = (id: string): PerBuilding => perBuilding.get(id) ?? perBuilding.set(id, { flat: new Set(), blade: 0, fascia: new Map(), atm: 0 }).get(id)!;
  const reachByKey: Record<string, number> = {};
  const byKind: Record<string, number> = {};
  const byKey: Record<string, number> = {};
  let lAwnings = 0;
  let lastOrder = -1;
  let maxPerColumn = 0;

  for (const p of dressing) {
    const ck = keyOf(p.cell);
    const where = `the ${p.kind} piece ${short(p.placement.key)} on ${at(p.cell)}`;
    byKind[p.kind] = (byKind[p.kind] ?? 0) + 1;
    byKey[short(p.placement.key)] = (byKey[short(p.placement.key)] ?? 0) + 1;
    const bIdx = buildingIndex.get(p.building);
    const n = colIndex.get(ck);
    const col = ctx.col.get(ck);
    if (bIdx === undefined || n === undefined || !col || col.building !== p.building) {
      fail("H1b", `${where} is on a column that is not in building ${p.building}`, [p.cell]);
      continue;
    }
    const order = bIdx * 1000 + n * 10 + (RANK[p.kind] ?? 9);
    if (order < lastOrder) fail("H1b", `${where} is out of order (building order, then column, then glass, awning, blade sign, fascia sign, ATM)`, [p.cell]);
    lastOrder = order;
    const count = (perColumn.get(ck) ?? 0) + 1;
    perColumn.set(ck, count);
    maxPerColumn = Math.max(maxPerColumn, count);
    if (count > DRESS_PER_BAY_MAX) fail("cap", `${where}: the column has ${count} pieces, over ${DRESS_PER_BAY_MAX}`, [p.cell]);

    // M8: a street open side on the column, and the face.
    const built = ctx.built.get(ck);
    if (!built || !built.open.some((o) => o.frontage === "street")) {
      fail("M8", `${where} stands on a column with no street open side`, [p.cell]);
      continue;
    }
    const g = firstOf.get(ck);
    const bay = bayAt.get(ck);
    if (!g || !bay) {
      fail("H1b", `${where} is on a ${g ? g.kind : "missing"} ground piece, which is no bay`, [p.cell]);
      continue;
    }
    if (p.face !== col.front) fail("M8", `${where}: its face ${p.face} is not its column's front ${col.front}`, [p.cell]);
    if (!p.wrap && !bay.frontStreet) fail("M8", `${where} is a single-face piece on a column whose front ${col.front} is not a street side`, [p.cell]);
    if (p.wrap && g.kind !== "shopCorner") fail("M8", `${where} is a wrap on a ${g.kind}, not a shop corner`, [p.cell]);
    if (p.placement.yaw_deg !== col.yaw) fail("attach", `${where} is turned ${p.placement.yaw_deg}, not its column's ${col.yaw}`, [p.cell]);

    // The kind against the bay and the key.
    const key = p.placement.key;
    const pb = byBuilding(p.building);
    const isShop = bay.kind !== "door";
    const e = (() => {
      try {
        return dressBounds(key);
      } catch {
        return null;
      }
    })();
    if (!e) {
      fail("H1b", `${where} is a key that is not in the dressing table`, [p.cell]);
      continue;
    }
    switch (p.kind) {
      case "glass":
        if (!isShop || glassKeyOf(g.placement.key) !== key) fail("R4", `${where} is not the glass of its ${g.kind} ${short(g.placement.key)}`, [p.cell]);
        if (p.wrap !== e.d > GLASS_WRAP_DEPTH_M) fail("H1b", `${where}: wrap is ${String(p.wrap)} for a glass ${e.d} m deep`, [p.cell]);
        if (glassAt.has(ck)) fail("R4", `${where}: the bay has two glass pieces`, [p.cell]);
        glassAt.set(ck, p);
        break;
      case "awning":
        if (!isShop || !(FLAT.has(key) || key === L_KEY) || p.wrap !== (key === L_KEY)) fail("R5", `${where} is not a flat awning on a shop bay or the L awning as a wrap`, [p.cell]);
        if (awningAt.has(ck)) fail("R5", `${where}: the bay has two awnings`, [p.cell]);
        awningAt.set(ck, p);
        if (key === L_KEY) {
          lAwnings++;
          if (g.kind !== "shopCorner") fail("R5", `${where}: the L awning is not on a shop corner`, [p.cell]);
        } else pb.flat.add(key);
        break;
      case "fasciaSign":
      case "bladeSign": {
        const list = p.kind === "fasciaSign" ? FASCIA : BLADE;
        if (!isShop || !list.has(key) || p.wrap) fail("R6", `${where} is not a ${p.kind} key on a shop bay`, [p.cell]);
        (signAt.get(ck) ?? signAt.set(ck, []).get(ck)!).push(p);
        if (p.kind === "bladeSign") pb.blade++;
        else pb.fascia.set(key, (pb.fascia.get(key) ?? 0) + 1);
        break;
      }
      case "atm":
        if (bay.kind !== "door" || key !== ATMS[0] || p.wrap) fail("M8", `${where} is not an ATM on a residents' door on a street frontage`, [p.cell]);
        pb.atm++;
        break;
      default:
        fail("H1b", `${where} has the kind ${String(p.kind)}`, [p.cell]);
    }
  }

  // The caps per building and per run.
  const runOf = runsOf(input.buildings);
  const atmByRun = new Map<string, number>();
  let mixedAwningBuildings = 0;
  const flatKeysPerBuilding: Record<string, number> = {};
  for (const b of input.buildings.buildings) {
    const pb = perBuilding.get(b.id);
    const nFlat = pb?.flat.size ?? 0;
    const lHere = dressing.some((p) => p.building === b.id && p.placement.key === L_KEY);
    const bucket = nFlat === 0 ? (lHere ? "L only" : "none") : nFlat === 1 ? "one" : "two or more";
    flatKeysPerBuilding[bucket] = (flatKeysPerBuilding[bucket] ?? 0) + 1;
    if (!pb) continue;
    if (nFlat > 1) {
      mixedAwningBuildings++;
      fail("R5", `building ${b.id} has ${nFlat} keys of flat awnings`, b.cells);
    }
    if (pb.blade > 1) fail("cap", `building ${b.id} has ${pb.blade} blade signs`, b.cells);
    for (const [k, n] of pb.fascia) if (n > 1) fail("cap", `building ${b.id} has the fascia sign ${short(k)} ${n} times`, b.cells);
    if (pb.atm > 1) fail("cap", `building ${b.id} has ${pb.atm} ATMs`, b.cells);
    const run = runOf.get(b.id) ?? `solo:${b.id}`;
    atmByRun.set(run, (atmByRun.get(run) ?? 0) + pb.atm);
  }
  for (const [run, n] of atmByRun) if (n > ATM_PER_RUN) fail("cap", `the run ${run} has ${n} ATMs, over ${ATM_PER_RUN}`, []);
  for (const [ck, list] of signAt) {
    if (list.length > 1) fail("cap", `the bay on ${ck} has ${list.length} signs`, [list[0]!.cell]);
    if (list.some((p) => p.kind === "bladeSign") && awningAt.has(ck)) fail("cap", `the bay on ${ck} has a blade sign and an awning`, [list[0]!.cell]);
  }

  // LG: no two L awnings on neighbouring columns.
  for (const p of dressing) {
    if (p.placement.key !== L_KEY) continue;
    for (const v of Object.values(SIDE_VEC) as readonly { x: number; z: number }[]) {
      const n = awningAt.get(keyOf({ i: p.cell.i + v.x, j: p.cell.j + v.z }));
      if (n && n.placement.key === L_KEY) fail("LG", `the L awnings on ${at(p.cell)} and ${at(n.cell)} are on neighbouring columns`, [p.cell, n.cell]);
    }
  }

  // Attachment: the plane, the centring, the height, the reach and the roof cap.
  for (const p of dressing) {
    const ck = keyOf(p.cell);
    const bay = bayAt.get(ck);
    const col = ctx.col.get(ck);
    if (!bay || !col) continue;
    const f = bay.frame;
    const where = `the ${p.kind} piece ${short(p.placement.key)} on ${at(p.cell)}`;
    const e = dressBounds(p.placement.key);
    const r = rotate(-f.yaw, p.placement.x_m - f.ox, p.placement.z_m - f.oz);
    const x = r.x;
    const z = r.z;
    const y = p.placement.y_m - f.yM;
    const bad = (why: string): void => fail("attach", `${where} ${why}`, [p.cell]);
    const glass = glassAt.get(ck);
    const glassTop = glass ? GLASS_SILL_M + dressBounds(glass.placement.key).h : 0;
    // height
    let wantY: number;
    if (p.kind === "glass") wantY = GLASS_SILL_M;
    else if (p.kind === "awning") wantY = Math.max(AWNING_BASE_M, glassTop);
    else if (p.kind === "atm") wantY = ATM_Y_M;
    else {
      const a = awningAt.get(ck);
      wantY = a ? a.placement.y_m - f.yM + dressBounds(a.placement.key).h : Math.max(SIGN_BASE_M, glassTop);
    }
    if (Math.abs(y - wantY) > TOL) bad(`stands at height ${y.toFixed(4)} in its frame, not ${wantY.toFixed(4)}`);
    // plane and centring
    if (p.wrap) {
      if (Math.abs(x - f.gx) > TOL || Math.abs(z - f.gz) > TOL) bad(`is a wrap whose pivot is not its corner shop's (off by ${(x - f.gx).toFixed(4)}, ${(z - f.gz).toFixed(4)})`);
    } else {
      const back = z - e.d / 2;
      const want = p.kind === "glass" ? f.groundFront - GLASS_INSET_M : hostFront(f, y);
      if (Math.abs(back - want) > TOL) bad(`has its back plane ${back.toFixed(4)} from its frame's front, not ${want.toFixed(4)} (its host's face)`);
      if (e.w > f.right - f.left + TOL && p.kind !== "glass") bad(`is ${e.w} m wide in a bay ${(f.right - f.left).toFixed(3)} m wide`);
      const lo = f.left + e.w / 2;
      const hi = f.right - e.w / 2;
      if (p.kind !== "glass" && (x < lo - TOL || x > hi + TOL)) bad(`stands outside its bay's span (x ${x.toFixed(4)}, not in ${lo.toFixed(4)} to ${hi.toFixed(4)})`);
      const centred = p.kind === "glass" ? f.gx : p.kind === "awning" || p.kind === "fasciaSign" ? Math.min(Math.max(f.gx, lo), hi) : p.kind === "bladeSign" ? Math.min(Math.max(f.left + BLADE_INSET_M + e.w / 2, lo), hi) : null;
      if (centred !== null && Math.abs(x - centred) > TOL) bad(`is at x ${x.toFixed(4)}, not ${centred.toFixed(4)}`);
    }
    // T1: the reach past the front cell edge
    const reach = z + e.d / 2 - 2.5;
    const k = short(p.placement.key);
    reachByKey[k] = Math.max(reachByKey[k] ?? -Infinity, reach);
    if (reach > REACH_M + TOL) bad(`reaches ${reach.toFixed(3)} m past its column's front edge, over ${REACH_M}`);
    if (p.kind === "awning" && reach > AWNING_REACH_M + TOL) bad(`reaches ${reach.toFixed(3)} m past its column's front edge, over ${AWNING_REACH_M} for an awning`);
    // a sign's top stays under its column's roof piece
    if ((p.kind === "fasciaSign" || p.kind === "bladeSign") && p.placement.y_m + e.h > bay.roofY + TOL) bad(`has its top at ${(p.placement.y_m + e.h).toFixed(3)} m, over its column's roof at ${bay.roofY.toFixed(3)} m`);
  }

  // R4, R5, R6 and the counts (A1 for the ATM).
  let shopBays = 0;
  let glassKeyBays = 0;
  let glassed = 0;
  let awned = 0;
  let signed = 0;
  let mixedCorners = 0;
  let mixedQuietFront = 0;
  for (const g of layer.ground) {
    if (g.kind !== "shop" && g.kind !== "shopDouble" && g.kind !== "shopCorner") continue;
    shopBays++;
    const ck = keyOf(g.cells[0]!);
    const gk = glassKeyOf(g.placement.key);
    if (gk !== null) {
      glassKeyBays++;
      if (glassAt.get(ck)?.placement.key === gk) glassed++;
      else fail("R4", `the ${g.kind} on ${at(g.cells[0]!)} (${short(g.placement.key)}) has no ${short(gk)}`, g.cells);
    }
    if (awningAt.has(ck)) awned++;
    if (signAt.has(ck)) signed++;
    if (g.kind === "shopCorner") {
      const col = ctx.col.get(ck);
      const open = ctx.built.get(ck)?.open ?? [];
      const front = open.find((o) => o.side === col?.front)?.frontage;
      const side = open.find((o) => o.side === (col?.side as CitySide | null))?.frontage;
      if (col && front !== undefined && side !== undefined && front !== side) {
        mixedCorners++;
        if (front !== "street") mixedQuietFront++;
      }
    }
  }
  if (share(glassed, glassKeyBays) < DRESS_R4_MIN - 1e-9) fail("R4", `the glass share ${share(glassed, glassKeyBays).toFixed(3)} is under ${DRESS_R4_MIN}`, []);
  if (share(awned, shopBays) < DRESS_R5_MIN - 1e-9) fail("R5", `the awning share ${share(awned, shopBays).toFixed(3)} is under ${DRESS_R5_MIN}`, []);
  if (share(signed, shopBays) < DRESS_R6_MIN - 1e-9) fail("R6", `the signed share ${share(signed, shopBays).toFixed(3)} is under ${DRESS_R6_MIN}`, []);
  let streetBuildings = 0;
  let atmBuildings = 0;
  for (const b of input.buildings.buildings) {
    const first = b.cells.map((c) => ctx.col.get(keyOf(c))).find((c) => c !== undefined && c.kind !== "blind");
    const front = first ? ctx.rowFront.get(first.rowId) : undefined;
    const street = first !== undefined && front !== undefined && (ctx.built.get(keyOf(first))?.open.find((o) => o.side === front)?.frontage ?? null) === "street";
    if (!street) continue;
    streetBuildings++;
    if ((perBuilding.get(b.id)?.atm ?? 0) > 0) atmBuildings++;
  }
  if (share(atmBuildings, streetBuildings) < DRESS_ATM_MIN - 1e-9) fail("R6", `the ATM share ${share(atmBuildings, streetBuildings).toFixed(3)} of street buildings is under ${DRESS_ATM_MIN}`, []);

  // Overlaps between pieces of neighbouring columns (W1; reported, never asserted).
  const colOfCell = new Map<string, string>();
  for (const g of layer.ground) for (const c of g.cells) colOfCell.set(keyOf(c), keyOf(g.cells[0]!));
  const byCol = new Map<string, CityDressingPiece[]>();
  for (const p of dressing) (byCol.get(keyOf(p.cell)) ?? byCol.set(keyOf(p.cell), []).get(keyOf(p.cell))!).push(p);
  const overlaps: Record<string, OverlapTally> = {};
  let overlapPairs = 0;
  let overlapPairsHeight = 0;
  let maxOverlap = 0;
  let maxOverlapHeight = 0;
  const seen = new Set<string>();
  for (const [ck, list] of byCol) {
    const g = firstOf.get(ck);
    if (!g) continue;
    const nbrs = new Set<string>();
    for (const c of g.cells) for (const v of Object.values(SIDE_VEC) as readonly { x: number; z: number }[]) {
      const n = colOfCell.get(keyOf({ i: c.i + v.x, j: c.j + v.z }));
      if (n !== undefined && n !== ck) nbrs.add(n);
    }
    for (const n of nbrs) {
      const pk = [ck, n].sort().join("|");
      if (seen.has(pk)) continue;
      seen.add(pk);
      for (const p of list) {
        for (const q of byCol.get(n) ?? []) {
          const A = boxOf(p);
          const B = boxOf(q);
          const ox = Math.min(A.x1, B.x1) - Math.max(A.x0, B.x0);
          const oz = Math.min(A.z1, B.z1) - Math.max(A.z0, B.z0);
          if (ox <= TOL || oz <= TOL) continue;
          const depth = Math.min(ox, oz);
          const height = Math.min(A.y1, B.y1) - Math.max(A.y0, B.y0) > TOL;
          const name = [short(p.placement.key), short(q.placement.key)].sort().join(" + ");
          const t = overlaps[name] ?? (overlaps[name] = { n: 0, nHeight: 0, max: 0, maxHeight: 0 });
          t.n++;
          t.max = Math.max(t.max, depth);
          overlapPairs++;
          maxOverlap = Math.max(maxOverlap, depth);
          if (height) {
            t.nHeight++;
            t.maxHeight = Math.max(t.maxHeight, depth);
            overlapPairsHeight++;
            maxOverlapHeight = Math.max(maxOverlapHeight, depth);
          }
        }
      }
    }
  }

  const runs = new Set<string>();
  for (const b of input.buildings.buildings) runs.add(runOf.get(b.id) ?? `solo:${b.id}`);
  return {
    failures,
    metrics: {
      shopBays,
      glassKeyBays,
      glassed,
      awned,
      signed,
      mixedAwningBuildings,
      streetBuildings,
      atmBuildings,
      pieces: dressing.length,
      byKind,
      byKey,
      flatKeysPerBuilding,
      lAwnings,
      mixedCorners,
      mixedQuietFront,
      reachByKey,
      overlaps,
      overlapPairs,
      overlapPairsHeight,
      maxOverlap,
      maxOverlapHeight,
      runs: runs.size,
      runsWithAtm: [...atmByRun.values()].filter((n) => n > 0).length,
      runsAtCap: [...atmByRun.values()].filter((n) => n >= ATM_PER_RUN).length,
      maxPerColumn,
    },
  };
}

/** Every failure of `layer.dressing`; none when every check holds. */
export function dressFailures(layer: CityFacadesLayer, input: GroundInput): DressFailure[] {
  return dressReport(layer, input).failures;
}

