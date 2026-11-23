/**
 * Stage 7, H1b: the shopfront dressing (ticket 070 H1b; criteria 2 and 3). The tile city's `dressBlock` glass, awning, sign and ATM rules (src/render3d/dressing.ts) on H1's ground pieces. Pure: it reads `mass`,
 * `buildings` and the stage's own ground pieces, the typed-in tables of `dresskit.ts` and `kit.ts`, and the stage's `rand`.
 *
 * - **B1** a block is a building: one awning key, at most one blade sign, no fascia key twice, at most one ATM, per `CityBuilding`. **B2** a run is a chain of row neighbours (`runsOf`); `ATM_PER_RUN` is per run.
 * - **The bay frame.** A bay is a street ground piece. Every piece is worked out in its bay's frame (origin the mean of the bay's cell centres, +z the column's front, +x across, y up from the ground piece's base at 0),
 *   as `dressBlock` works in its lot frame, then turned by the column's yaw and raised by the ground piece's `y_m` (L1). A front-face piece's back lies on its host's bounds front: the ground piece below the first
 *   floor, the first floor piece from there up (`hostFront`).
 * - **W1** a column is as wide as its first floor piece's bounds; a bay spans its columns so measured. **LG** no L awning beside an L awning (the corner takes the building's flat key where it fits).
 * - **X1** a wrap (a corner's own glass, the L awning) stands on a shop corner whatever its second side faces; a single-face piece stands only where the column's front is a street side.
 * - **T1** a front-face piece reaches at most `CELL_M` past its column's front cell edge, an awning `CELL_M` - `AWNING_KERB_M`.
 * - **EP** (H2) a bay that spans an escape column is plain: no awning, no L awning, no fascia or blade sign, and not a "wanting" bay in the awning key's choice; its glass stays, and the escape takes its
 *   column's room first. With no escape columns this is H1b's dressing exactly. **C1** `DRESS_MAX` is not applied. **A1** is the check's.
 * Every choice is `rand("dress", slot, building id, column index ...)` through `unitOf`.
 */

import type { CityBuilding, CityBuildingRow, CityBuildingsLayer, CityCell, CityColumn, CityDressingKind, CityDressingPiece, CityGroundPiece, CityMassLayer, CityPlacement, CitySide, CityYaw, CalibrationKey } from "../../core";
import { CityStageError } from "../pipeline/error";
import type { StageRand } from "../pipeline/seeds";
import { CELL_M } from "./constants";
import {
  ATMS,
  ATM_PIER_M,
  ATM_PER_RUN,
  ATM_Y_M,
  AWNINGS,
  AWNING_BASE_M,
  AWNING_CORNER,
  AWNING_KERB_M,
  BLADE_INSET_M,
  DRESS_PER_BAY_MAX,
  FLOOR_HOST,
  GLASS_INSET_M,
  GLASS_SILL_M,
  GLASS_WRAP_DEPTH_M,
  P_ATM,
  P_AWNING,
  P_BLADE,
  P_SIGN,
  SIGNS_BLADE,
  SIGNS_FASCIA,
  SIGN_BASE_M,
  dressBounds,
  glassKeyOf,
} from "./dresskit";
import { makeCtx, type Ctx } from "./facts";
import { unitOf } from "./hash";
import { groundEntry } from "./kit";
import { SIDE_VEC, centreOf, keyOf, rotate } from "./place";

const EPS = 1e-9;
/** How far a front-face piece may reach past its column's front cell edge (T1), and an awning (T1). */
export const REACH_M = CELL_M;
export const AWNING_REACH_M = CELL_M - AWNING_KERB_M;
/** Half a cell: the front cell edge in a bay's frame. */
const HALF = CELL_M / 2;

export type BayKind = "shop" | "corner" | "door";

/** The inputs of a bay's frame: its ground piece, the first floor piece standing on each of its columns, and where the first floor starts. */
export interface BayInput {
  readonly g: CityGroundPiece;
  readonly yaw: CityYaw;
  /** The first floor piece over each of the bay's columns (`CityColumn.pieces[0].placement`), in the ground piece's cell order. */
  readonly floors: readonly CityPlacement[];
  /** The ground slot's `top_m`: where the first floor piece stands (the walk is at 0). */
  readonly topM: number;
}

/** A bay's frame (see the module comment): every number in metres, in the frame. */
export interface BayFrame {
  /** The frame's origin in the plan. */
  readonly ox: number;
  readonly oz: number;
  readonly yaw: CityYaw;
  /** The ground piece's level (L1): what a piece's frame height is raised by. */
  readonly yM: number;
  /** The ground piece's pivot in the frame. */
  readonly gx: number;
  readonly gz: number;
  /** The ground piece's bounds front, and the first floor piece's, in the frame. */
  readonly groundFront: number;
  readonly floorFront: number;
  /** Where the first floor starts in the frame (the slot's `top_m` less the level). */
  readonly topRel: number;
  /** The bay's span (W1): its columns' bounds widths, left to right. */
  readonly left: number;
  readonly right: number;
  /** The first column's width (W1). */
  readonly firstW: number;
}

const norm = (n: number): number => (n === 0 ? 0 : n);

/** The frame of a bay from the ground piece, the floor pieces over it and the slot's height. Pure maths on the tables. */
export function bayFrame(input: BayInput): BayFrame {
  const { g, yaw } = input;
  const ox = g.cells.reduce((s, c) => s + centreOf(c).x, 0) / g.cells.length;
  const oz = g.cells.reduce((s, c) => s + centreOf(c).z, 0) / g.cells.length;
  const toOwn = (x: number, z: number): { x: number; z: number } => rotate(-yaw, x - ox, z - oz);
  const gp = toOwn(g.placement.x_m, g.placement.z_m);
  const ge = groundEntry(g.placement.key);
  const hosts = input.floors.map((f) => {
    const e = FLOOR_HOST[f.key];
    if (!e) throw new Error(`${f.key} is not in the floor host table`);
    return e;
  });
  const fo = toOwn(input.floors[0]!.x_m, input.floors[0]!.z_m);
  let left = Infinity;
  let right = -Infinity;
  g.cells.forEach((c, n) => {
    const at = toOwn(centreOf(c).x, centreOf(c).z);
    left = Math.min(left, at.x - hosts[n]!.w / 2);
    right = Math.max(right, at.x + hosts[n]!.w / 2);
  });
  return {
    ox,
    oz,
    yaw,
    yM: g.placement.y_m,
    gx: gp.x,
    gz: gp.z,
    groundFront: gp.z + ge.d / 2,
    floorFront: fo.z + hosts[0]!.d / 2,
    topRel: input.topM - g.placement.y_m,
    left,
    right,
    firstW: hosts[0]!.w,
  };
}

/** The front face a front-face piece with its base at frame height `y` lies against: the ground piece below the first floor, the first floor piece from there up. */
export function hostFront(f: BayFrame, y: number): number {
  return y < f.topRel - EPS ? f.groundFront : f.floorFront;
}

/** A piece in a bay's frame: its pivot (x, z), its base height y, its bounds. */
export interface Local {
  readonly kind: CityDressingKind;
  readonly key: CalibrationKey;
  readonly wrap: boolean;
  readonly x: number;
  readonly y: number;
  readonly z: number;
}

/** The plan placement of a piece in a bay's frame: turned by the column's yaw about the frame's origin, raised by the ground piece's level (L1). */
export function placementOf(f: BayFrame, key: CalibrationKey, x: number, y: number, z: number): CityPlacement {
  const r = rotate(f.yaw, x, z);
  return { key, x_m: norm(f.ox + r.x), y_m: norm(y + f.yM), z_m: norm(f.oz + r.z), yaw_deg: f.yaw };
}

/** A front-face piece: back on its host's front, centred on `x` and clamped inside [left, right], base at `y`; null when wider than the bay or past `reach` beyond the front cell edge. */
export function onFace(f: BayFrame, key: CalibrationKey, x: number, y: number, reach: number = REACH_M): { x: number; z: number } | null {
  const e = dressBounds(key);
  if (e.w > f.right - f.left + EPS) return null;
  const xx = Math.min(Math.max(x, f.left + e.w / 2), f.right - e.w / 2);
  const z = hostFront(f, y) + e.d / 2;
  if (z + e.d / 2 - HALF > reach + EPS) return null;
  return { x: xx, z };
}

// ---- the bays of a building ----

export interface Bay {
  readonly g: CityGroundPiece;
  readonly kind: BayKind;
  /** The index of its first column in the building's cells. */
  readonly n: number;
  readonly col: CityColumn;
  readonly frame: BayFrame;
  /** The column's front is a street open side (X1: single-face pieces stand only there). */
  readonly frontStreet: boolean;
  /** The world height of the column's roof piece (a sign's cap). */
  readonly roofY: number;
}

/** The kind of bay a ground piece is, or null when it is no bay (a quiet building's pieces are not, except a shop corner; a door only on a street frontage). */
export function bayKindOf(g: CityGroundPiece): BayKind | null {
  if (g.kind === "shop" || g.kind === "shopDouble") return g.frontage === "street" ? "shop" : null;
  if (g.kind === "shopCorner") return "corner";
  if (g.kind === "door") return g.frontage === "street" ? "door" : null;
  return null;
}

/** True when the open side of the built cell on `side` is a street frontage. */
function streetOn(ctx: Ctx, c: CityCell, side: CitySide | null): boolean {
  return side !== null && (ctx.built.get(keyOf(c))?.open.find((o) => o.side === side)?.frontage ?? null) === "street";
}

/** The bays of one building, in column order, from its ground pieces. */
export function baysOf(ctx: Ctx, b: CityBuilding, ground: readonly CityGroundPiece[]): Bay[] {
  const out: Bay[] = [];
  const index = new Map(b.cells.map((c, n) => [keyOf(c), n] as const));
  for (const g of ground) {
    const kind = bayKindOf(g);
    if (kind === null) continue;
    const cols = g.cells.map((c) => {
      const col = ctx.col.get(keyOf(c));
      if (!col) throw new CityStageError(`H1b: the ground piece on (${c.i}, ${c.j}) has no column`, [c]);
      return col;
    });
    const col = cols[0]!;
    const floors = cols.map((c) => {
      const p = c.pieces[0];
      if (!p) throw new CityStageError(`H1b: the column (${c.i}, ${c.j}) has no first floor piece`, [c]);
      return p.placement;
    });
    const roof = col.pieces[col.pieces.length - 1];
    if (!roof) throw new CityStageError(`H1b: the column (${col.i}, ${col.j}) has no roof piece`, [col]);
    let frame: BayFrame;
    try {
      frame = bayFrame({ g, yaw: col.yaw, floors, topM: col.ground.top_m });
    } catch (e) {
      throw new CityStageError(`H1b: ${(e as Error).message} (column (${col.i}, ${col.j}))`, [col]);
    }
    out.push({ g, kind, n: index.get(keyOf(g.cells[0]!)) ?? 0, col, frame, frontStreet: streetOn(ctx, col, col.front), roofY: roof.placement.y_m });
  }
  return out.sort((p, q) => p.n - q.n);
}

// ---- runs (B2) ----

/**
 * B2: each building's run, a chain of row neighbours: consecutive buildings of one row (by the coordinate along the row) with no gap between them, taken in the row's order. An L is in both of its rows' lists;
 * its own run is its `rowId` row's.
 */
export function runsOf(buildings: Pick<CityBuildingsLayer, "rows" | "buildings">): Map<string, string> {
  const byId = new Map(buildings.buildings.map((b) => [b.id, b] as const));
  const out = new Map<string, string>();
  for (const r of buildings.rows as readonly CityBuildingRow[]) {
    const along = (c: CityCell): number => (r.front === "+z" || r.front === "-z" ? c.i : c.j);
    const list = r.buildings
      .map((id) => byId.get(id))
      .filter((b): b is CityBuilding => b !== undefined)
      .map((b) => {
        const cells = b.bend === null ? b.cells : b.rowId === r.id ? b.cells.slice(0, 2) : b.cells.slice(1, 3);
        const at = cells.map(along);
        return { b, lo: Math.min(...at), hi: Math.max(...at) };
      })
      .sort((p, q) => p.lo - q.lo);
    let cur = "";
    list.forEach((e, n) => {
      if (n === 0 || e.lo !== list[n - 1]!.hi + 1) cur = `${r.id}#${e.lo}`;
      if (e.b.bend !== null && e.b.rowId !== r.id) return;
      out.set(e.b.id, cur);
    });
  }
  return out;
}

// ---- the dressing ----

export interface DressStats {
  /** L awnings placed. */
  readonly lPlaced: number;
  /** Wanting corner bays that took the building's flat key instead of the L (it did not fit, or LG turned it away) and got it. */
  readonly cornerFlat: number;
  /** Wanting corner bays where the L would have fitted and LG turned it away. */
  readonly lgTurnedAway: number;
}

const RANK: Readonly<Record<CityDressingKind, number>> = { glass: 0, awning: 1, bladeSign: 2, fasciaSign: 3, atm: 4 };

/**
 * The dressing of every building, in `buildings.buildings` order, then by column, and in a column in `dressBlock`'s order (glass, awning, blade sign, fascia sign, ATM). `ground` is H1's layer, unchanged.
 * Fails with `CityStageError` where a bay has no frame (R-2).
 */
export function buildDressing(
  mass: Pick<CityMassLayer, "cells" | "built">,
  buildings: Pick<CityBuildingsLayer, "rows" | "columns" | "buildings">,
  ground: readonly CityGroundPiece[],
  rand: StageRand,
  /** H2, EP: the cell key of each escape column and what its escape counts against the column's cap. Empty: H1b's dressing. */
  escapes: ReadonlyMap<string, number> = new Map(),
): { dressing: CityDressingPiece[]; stats: DressStats } {
  const ctx = makeCtx(mass, buildings);
  const groundOf = new Map<string, CityGroundPiece[]>();
  for (const g of ground) (groundOf.get(g.building) ?? groundOf.set(g.building, []).get(g.building)!).push(g);
  const runOf = runsOf(buildings);
  const atmUsed = new Map<string, number>();
  const lCells = new Set<string>();
  const out: CityDressingPiece[] = [];
  let lPlaced = 0;
  let cornerFlat = 0;
  let lgTurnedAway = 0;

  const unit = (...salt: (string | number)[]): number => unitOf(rand("dress", ...salt));
  const pickOf = <T>(xs: readonly T[], ...salt: (string | number)[]): T | undefined => (xs.length === 0 ? undefined : xs[Math.min(xs.length - 1, Math.floor(unit(...salt) * xs.length))]);
  const rotated = <T>(xs: readonly T[], ...salt: (string | number)[]): T[] => {
    if (xs.length === 0) return [];
    const s = Math.min(xs.length - 1, Math.floor(unit(...salt) * xs.length));
    return [...xs.slice(s), ...xs.slice(0, s)];
  };

  for (const b of buildings.buildings) {
    const bays = baysOf(ctx, b, groundOf.get(b.id) ?? []);
    const shopBays = bays.filter((x) => x.kind !== "door");
    const doorBays = bays.filter((x) => x.kind === "door");
    const placed: { n: number; piece: CityDressingPiece }[] = [];
    const perColumn = new Map<number, number>();
    b.cells.forEach((c, n) => {
      const w = escapes.get(keyOf(c));
      if (w !== undefined && w <= DRESS_PER_BAY_MAX) perColumn.set(n, w);
    });
    const plain = (bay: Bay): boolean => !bay.g.cells.some((c) => escapes.has(keyOf(c)));

    const emit = (bay: Bay, kind: CityDressingKind, key: CalibrationKey, wrap: boolean, x: number, y: number, z: number): boolean => {
      if ((perColumn.get(bay.n) ?? 0) + 1 > DRESS_PER_BAY_MAX) return false;
      perColumn.set(bay.n, (perColumn.get(bay.n) ?? 0) + 1);
      placed.push({
        n: bay.n,
        piece: { kind, building: b.id, cell: { i: bay.g.cells[0]!.i, j: bay.g.cells[0]!.j }, face: bay.col.front, wrap, placement: placementOf(bay.frame, key, x, y, z) },
      });
      return true;
    };

    // ---- glass: every shop bay whose key has a glass key ----
    const glassTop = new Map<Bay, number>();
    for (const bay of shopBays) {
      const key = glassKeyOf(bay.g.placement.key);
      if (key === null) continue;
      const e = dressBounds(key);
      const wrap = e.d > GLASS_WRAP_DEPTH_M;
      if (!wrap && !bay.frontStreet) continue;
      const z = wrap ? bay.frame.gz : bay.frame.groundFront - GLASS_INSET_M + e.d / 2;
      if (emit(bay, "glass", key, wrap, bay.frame.gx, GLASS_SILL_M, z)) glassTop.set(bay, GLASS_SILL_M + e.h);
    }

    // ---- awnings: one flat key for the building, on each shop bay by chance; the L on a wanting corner where it fits ----
    const awningOf = new Map<Bay, number>();
    const flatY = (bay: Bay): number => Math.max(AWNING_BASE_M, glassTop.get(bay) ?? 0);
    const tryFlat = (key: CalibrationKey, bay: Bay): { x: number; z: number } | null => (bay.frontStreet ? onFace(bay.frame, key, bay.frame.gx, flatY(bay), AWNING_REACH_M) : null);
    const wanting = shopBays.filter((x) => plain(x) && unit("awning", b.id, x.n) < P_AWNING);
    let best: CalibrationKey | null = null;
    let bestN = -1;
    for (const key of rotated(AWNINGS, "awningkey", b.id)) {
      const n = wanting.filter((x) => tryFlat(key, x) !== null).length;
      if (n > bestN) {
        best = key;
        bestN = n;
      }
      if (n === wanting.length) break;
    }
    for (const bay of wanting) {
      let done = false;
      if (bay.kind === "corner") {
        const key = AWNING_CORNER[0]!;
        const e = dressBounds(key);
        const fits = e.w <= bay.frame.firstW + EPS && bay.frame.gz + e.d / 2 - HALF <= AWNING_REACH_M + EPS;
        const c = bay.g.cells[0]!;
        const beside = (Object.values(SIDE_VEC) as readonly { x: number; z: number }[]).some((v) => lCells.has(keyOf({ i: c.i + v.x, j: c.j + v.z })));
        if (fits && beside) lgTurnedAway++;
        if (fits && !beside && emit(bay, "awning", key, true, bay.frame.gx, flatY(bay), bay.frame.gz)) {
          lCells.add(keyOf(c));
          lPlaced++;
          awningOf.set(bay, flatY(bay));
          done = true;
        }
      }
      if (!done && best !== null) {
        const at = tryFlat(best, bay);
        if (at !== null && emit(bay, "awning", best, false, at.x, flatY(bay), at.z)) {
          awningOf.set(bay, flatY(bay));
          if (bay.kind === "corner") cornerFlat++;
        }
      }
    }

    // ---- signs: at most one blade sign, on an awning-less bay; a fascia sign by chance, no key twice ----
    const usedSigns = new Set<CalibrationKey>();
    const awnTop = new Map<Bay, number>();
    for (const p of placed) {
      if (p.piece.kind !== "awning") continue;
      const bay = shopBays.find((x) => x.n === p.n);
      if (bay) awnTop.set(bay, p.piece.placement.y_m - bay.frame.yM + dressBounds(p.piece.placement.key).h);
    }
    const signY = (bay: Bay): number => awnTop.get(bay) ?? Math.max(SIGN_BASE_M, glassTop.get(bay) ?? 0);
    const roofCapOk = (bay: Bay, y: number, h: number): boolean => y + bay.frame.yM + h <= bay.roofY + EPS;
    let bladeBay: Bay | null = null;
    if (unit("blade", b.id) < P_BLADE) bladeBay = pickOf(shopBays.filter((x) => plain(x) && !awningOf.has(x) && x.frontStreet), "bladebay", b.id) ?? null;
    if (bladeBay) {
      for (const key of rotated(SIGNS_BLADE, "bladekey", b.id)) {
        const y = Math.max(signY(bladeBay), SIGN_BASE_M);
        const e = dressBounds(key);
        if (!roofCapOk(bladeBay, y, e.h)) continue;
        const at = onFace(bladeBay.frame, key, bladeBay.frame.left + BLADE_INSET_M + e.w / 2, y);
        if (at && emit(bladeBay, "bladeSign", key, false, at.x, y, at.z)) {
          usedSigns.add(key);
          break;
        }
      }
    }
    for (const bay of shopBays) {
      if (bay === bladeBay || !plain(bay) || !bay.frontStreet || unit("sign", b.id, bay.n) >= P_SIGN) continue;
      for (const key of rotated(SIGNS_FASCIA, "signkey", b.id, bay.n)) {
        if (usedSigns.has(key)) continue;
        const y = signY(bay);
        const e = dressBounds(key);
        if (!roofCapOk(bay, y, e.h)) continue;
        const at = onFace(bay.frame, key, bay.frame.gx, y);
        if (at && emit(bay, "fasciaSign", key, false, at.x, y, at.z)) {
          usedSigns.add(key);
          break;
        }
      }
    }

    // ---- ATM: at most one per building and `ATM_PER_RUN` per run, beside a residents' door on a street frontage ----
    const run = runOf.get(b.id) ?? `solo:${b.id}`;
    if ((atmUsed.get(run) ?? 0) < ATM_PER_RUN && unit("atm", b.id) < P_ATM) {
      for (const bay of doorBays) {
        const key = ATMS[0]!;
        const e = dressBounds(key);
        const side = unit("atmside", b.id, bay.n) < 0.5 ? -1 : 1;
        const x = bay.frame.gx + side * (groundEntry(bay.g.placement.key).w / 2 - e.w / 2 - ATM_PIER_M);
        const at = onFace(bay.frame, key, x, ATM_Y_M);
        if (at && emit(bay, "atm", key, false, at.x, ATM_Y_M, at.z)) {
          atmUsed.set(run, (atmUsed.get(run) ?? 0) + 1);
          break;
        }
      }
    }

    placed.sort((p, q) => p.n - q.n || RANK[p.piece.kind] - RANK[q.piece.kind]);
    for (const p of placed) out.push(p.piece);
  }
  return { dressing: out, stats: { lPlaced, cornerFlat, lgTurnedAway } };
}
