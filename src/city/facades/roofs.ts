/**
 * Stage 7, H3: the roofs placed (ticket 070 H3; grammar rule 11 and M9b; readings RE, RT, BB, RB, RX, RD, RW, HC, RC and RK; NV: no novelty sign). The tile city's rooftop items (`dressBlock`'s big roof prop and small roof props,
 * src/render3d/dressing.ts) and 068's roof exit, on stage 5's roof pieces. Pure: it reads `mass`, `buildings`, H1b's `dressing`, H2's and H2b's `walls` (only to count a column's pieces against the cap and to keep clear of
 * the party-wall kit) and the stage's `rand`; the kit is `roofkit.ts`.
 * - **B1/B2** a block is a building and a run is `runsOf`'s chain: the big prop's draw and every salt are per building, `RunUsed`'s billboard is per run, threaded along each run in `buildings.buildings` order.
 * - **Frame.** Every piece is worked out in its column's own frame (origin the cell's centre, +z the column's front), then turned by the column's yaw (plus a half-turn: the exit always, a turnable small prop by hash).
 * - **RE** the deck is the cell less `ROOF_EDGE_M` on every side, 4.40 m square. **BB** a billboard's two pieces stand `BILLBOARD_EDGE_M` in. **RK** a side of the deck under a party-wall piece is inset by the deepest such piece's depth where
 *   that is more than `ROOF_EDGE_M`. **RT** every base is the roof piece's base plus `ROOF_DECK_M`.
 * - **The big prop** (at most one a building, by `P_ROOF_LARGE`): the kinds water tower, roof exit and billboard tried in a hashed rotation (NV), each over the building's mid-roof columns (mid and blind) in a hashed rotation, the exit's blind
 *   columns first (RX); the first kind and column that fits the deck (HC: no height cap) and the column's room (RC) is taken. A billboard only on a mid column with a street front (RB), at most one a run.
 * - **The exit** (RD, RW): its back on the deck's front edge, turned a half-turn so its door faces the column's back, with `ROOF_ACCESS_CLEAR_M` of deck in front of the door, as wide as the housing.
 * - **The small props**: each roof column without the big prop, by `P_ROOF_SMALL`, one or two (`P_ROOF_SECOND`) in its left and right halves, at a hashed spot.
 * - **RC** a piece is placed only where the column has room left after H1b's dressing, the escape's weight, H2's canopies and upper-wall props and the roof pieces already placed (a billboard counts as two; no party-wall piece counts, PW7).
 */

import type { CalibrationKey, CityBuilding, CityBuildingsLayer, CityCell, CityColumn, CityFacadesLayer, CityMassLayer, CityPlacement, CityRoofPiece, CitySide, CityWallPiece, CityWallPieceKind } from "../../core";
import { CityStageError } from "../pipeline/error";
import type { StageRand } from "../pipeline/seeds";
import { CELL_M } from "./constants";
import { runsOf } from "./dress";
import { DRESS_PER_BAY_MAX } from "./dresskit";
import { escapeWeight } from "./escape";
import { type Ctx, makeCtx } from "./facts";
import { indexOf, unitOf } from "./hash";
import { PARTY_WALL_KINDS, partyBounds } from "./partykit";
import { OPPOSITE, SIDE_VEC, centreOf, keyOf, rotate, sideOf } from "./place";
import {
  BILLBOARD_EDGE_M,
  BILLBOARD_FACES,
  BILLBOARD_SIGN_Y_M,
  BILLBOARD_STRUCTURE,
  P_ROOF_LARGE,
  P_ROOF_SECOND,
  P_ROOF_SMALL,
  ROOF_ACCESS,
  ROOF_ACCESS_CLEAR_M,
  ROOF_DECK_M,
  ROOF_EDGE_M,
  ROOF_SMALL,
  ROOF_SMALL_PER_BAY,
  ROOF_WATER_TOWER,
  WATER_TOWER_PER_BUILDINGS,
  isTurnable,
  roofBounds,
} from "./roofkit";

export const EPS = 1e-9;
const norm = (n: number): number => (n === 0 ? 0 : n);
const HALF = CELL_M / 2;

/** A rectangle in a column's own frame (x across, z toward its front), metres. */
export interface Rect {
  readonly left: number;
  readonly right: number;
  readonly back: number;
  readonly front: number;
}

/** What RK found over one side of a roof cell: the deepest party-wall piece's depth, and its kind. */
export interface Inset {
  readonly depth: number;
  readonly kind: CityWallPieceKind;
}
/** RK: for each roof cell, by the plan side a party-wall piece stands over (the side facing the taller column), the deepest piece where its depth is more than `ROOF_EDGE_M`. */
export type RoofInsets = ReadonlyMap<string, ReadonlyMap<CitySide, Inset>>;

export const NO_INSETS: RoofInsets = new Map();

/** RK's insets from the walls: a party-wall piece on side `s` of a taller column stands over the lower cell across `s`, on that cell's side opposite `s`. */
export function roofInsets(walls: readonly CityWallPiece[]): RoofInsets {
  const out = new Map<string, Map<CitySide, Inset>>();
  for (const p of walls) {
    if (!PARTY_WALL_KINDS.includes(p.kind)) continue;
    const depth = partyBounds(p.placement.key).d;
    if (depth <= ROOF_EDGE_M + EPS) continue;
    const v = SIDE_VEC[p.face];
    const lower = keyOf({ i: p.cell.i + v.x, j: p.cell.j + v.z });
    const side = OPPOSITE[p.face];
    const sides = out.get(lower) ?? out.set(lower, new Map()).get(lower)!;
    const old = sides.get(side);
    if (!old || depth > old.depth) sides.set(side, { depth, kind: p.kind });
  }
  return out;
}

/** The plan side a column's own frame side points at. */
const planSide = (yaw: number, fx: number, fz: number): CitySide => {
  const r = rotate(yaw, fx, fz);
  return sideOf(r)!;
};

/**
 * A column's deck in its own frame: the cell less `edge` on every side, a side under a party-wall piece inset by that piece's depth where deeper (RK; the insets are 0 where the depth is no more than `ROOF_EDGE_M`).
 * `edge` is `ROOF_EDGE_M`, or `BILLBOARD_EDGE_M` for a billboard's two pieces.
 */
export function deckOf(col: Pick<CityColumn, "i" | "j" | "yaw">, insets: RoofInsets, edge: number): Rect {
  const at = insets.get(keyOf(col));
  const e = (fx: number, fz: number): number => Math.max(edge, at?.get(planSide(col.yaw, fx, fz))?.depth ?? 0);
  return { left: -HALF + e(-1, 0), right: HALF - e(1, 0), back: -HALF + e(0, -1), front: HALF - e(0, 1) };
}

/** The placement of a roof piece: its pivot (`fx`, `fz`) in the column's frame, its base at `y_m`, turned by the column's yaw plus `extra` (0 or 180). */
export function placeOnRoof(col: Pick<CityColumn, "i" | "j" | "yaw">, key: CalibrationKey, fx: number, fz: number, y_m: number, extra: 0 | 180): CityPlacement {
  const c = centreOf(col);
  const r = rotate(col.yaw, fx, fz);
  return { key, x_m: norm(c.x + r.x), y_m: norm(y_m), z_m: norm(c.z + r.z), yaw_deg: (col.yaw + extra) % 360 };
}

/** A placed roof piece's footprint in its column's frame (its bounds about its pivot, the quarter turns relative to the column swapping width and depth), and its base. */
export function footprintOf(col: Pick<CityColumn, "i" | "j" | "yaw">, p: CityPlacement): { x0: number; x1: number; z0: number; z1: number; y: number } {
  const c = centreOf(col);
  const r = rotate(-col.yaw, p.x_m - c.x, p.z_m - c.z);
  const e = roofBounds(p.key);
  const quarter = ((((Math.round((p.yaw_deg - col.yaw) / 90) % 4) + 4) % 4) & 1) === 1;
  const w = quarter ? e.d : e.w;
  const d = quarter ? e.w : e.d;
  return { x0: r.x - w / 2, x1: r.x + w / 2, z0: r.z - d / 2, z1: r.z + d / 2, y: p.y_m };
}

/** The roof piece of a column (its last piece): throws when it has none. */
export function roofPieceOf(col: CityColumn): CityColumn["pieces"][number] {
  const roof = col.pieces[col.pieces.length - 1];
  if (!roof || roof.role !== "roof") throw new CityStageError(`H3: the column (${col.i}, ${col.j}) has no roof piece`, [col]);
  return roof;
}

/** RT: the deck's base height over a column: its roof piece's base (3 x `storeys`) plus `ROOF_DECK_M`. */
export const deckY = (col: CityColumn): number => roofPieceOf(col).placement.y_m + ROOF_DECK_M;

/** RC: what each column already holds against `DRESS_PER_BAY_MAX`: H1b's dressing, the escape's weight, H2's canopies and upper-wall props. No party-wall piece counts (PW7). */
export function columnLoads(layer: Pick<CityFacadesLayer, "dressing" | "walls">, buildings: Pick<CityBuildingsLayer, "columns">): Map<string, number> {
  const loads = new Map<string, number>();
  const add = (k: string, n: number): void => void loads.set(k, (loads.get(k) ?? 0) + n);
  for (const p of layer.dressing ?? []) add(keyOf(p.cell), 1);
  const colAt = new Map((buildings.columns ?? []).map((c) => [keyOf(c), c] as const));
  const escapes = new Map<string, CityWallPiece[]>();
  for (const p of layer.walls ?? []) {
    if (PARTY_WALL_KINDS.includes(p.kind)) continue;
    if (p.kind === "escape") (escapes.get(keyOf(p.cell)) ?? escapes.set(keyOf(p.cell), []).get(keyOf(p.cell))!).push(p);
    else add(keyOf(p.cell), 1);
  }
  for (const [k, ps] of escapes) {
    const col = colAt.get(k);
    if (col) add(k, escapeWeight(col, ps));
  }
  return loads;
}

export const within = (r: { x0: number; x1: number; z0: number; z1: number }, d: Rect): boolean => r.x0 >= d.left - EPS && r.x1 <= d.right + EPS && r.z0 >= d.back - EPS && r.z1 <= d.front + EPS;
const fitsSize = (w: number, depth: number, d: Rect): boolean => w <= d.right - d.left + EPS && depth <= d.front - d.back + EPS;

/**
 * The clear deck in front of an exit's door, in its column's frame (RW): as wide as its housing, `ROOF_ACCESS_CLEAR_M` deep from the door face, the door being the housing's own +z turned by its turn from the column's
 * (a half-turn: toward the column's back, so the clear deck lies between the housing and the back edge).
 */
export function clearDeckOf(col: Pick<CityColumn, "i" | "j" | "yaw">, exit: CityPlacement): Rect {
  const f = footprintOf(col, exit);
  const dir = rotate(exit.yaw_deg - col.yaw, 0, 1);
  if (dir.z === 1) return { left: f.x0, right: f.x1, back: f.z1, front: f.z1 + ROOF_ACCESS_CLEAR_M };
  if (dir.z === -1) return { left: f.x0, right: f.x1, back: f.z0 - ROOF_ACCESS_CLEAR_M, front: f.z0 };
  if (dir.x === 1) return { left: f.x1, right: f.x1 + ROOF_ACCESS_CLEAR_M, back: f.z0, front: f.z1 };
  return { left: f.x0 - ROOF_ACCESS_CLEAR_M, right: f.x0, back: f.z0, front: f.z1 };
}

/** Whether an exit (housing and clear deck, as wide as the housing) fits a deck: RX's "holds it". */
export function exitFits(deck: Rect): boolean {
  const e = roofBounds(ROOF_ACCESS);
  return fitsSize(e.w, e.d + ROOF_ACCESS_CLEAR_M, deck);
}

/** What the stage counted while it chose (reported, never asserted beyond what the ticket pins). */
export interface RoofStats {
  /** Buildings whose `P_ROOF_LARGE` draw succeeded. */
  drawn: number;
  /** Drawn buildings that placed no big prop at all (no kind fit any column). */
  noBig: number;
  /** Big props placed, by kind. */
  placed: Record<"waterTower" | "exit" | "billboard", number>;
  /** Exits placed, by column kind. */
  exitOn: Record<"blind" | "mid", number>;
  /** Buildings where the kind was reached in the rotation and no column took it, by kind (the rotation fell through). */
  fellThrough: Record<"waterTower" | "exit" | "billboard", number>;
  /** Billboard kind reached with the run's billboard already placed. */
  billboardRunCap: number;
  /** Billboard tries (a column that would hold it on the plain deck) RB turned away, by the column's kind. */
  rbTurned: Record<"blind" | "mid" | "corner", number>;
  /** Tries that fit a plain deck and not the RK-inset one, by kind ("small" for a small prop). */
  rkTurned: Record<"waterTower" | "exit" | "billboard" | "small", number>;
  /** Tries the cap (RC) turned away, by kind. */
  capTurned: Record<"waterTower" | "exit" | "billboard" | "small", number>;
  /** Roof columns that drew a small prop, with one or with two. */
  smallColumns: { one: number; two: number };
  /** H3b: water towers placed before the cap (TS's candidates), and the freed roofs (candidates the cap gave up). */
  towerCandidates: number;
  freed: number;
  /** H3b (TF): bare runs (no big roof item left) that have a freed roof, those whose ranked freed roof took an exit, and the freed roofs by what they took (an exit on a blind or a mid column, none). */
  bareRuns: number;
  bareRunsToppedUp: number;
  freedTook: { exitBlind: number; exitMid: number; none: number };
}

const emptyStats = (): RoofStats => ({
  drawn: 0,
  noBig: 0,
  placed: { waterTower: 0, exit: 0, billboard: 0 },
  exitOn: { blind: 0, mid: 0 },
  fellThrough: { waterTower: 0, exit: 0, billboard: 0 },
  billboardRunCap: 0,
  rbTurned: { blind: 0, mid: 0, corner: 0 },
  rkTurned: { waterTower: 0, exit: 0, billboard: 0, small: 0 },
  capTurned: { waterTower: 0, exit: 0, billboard: 0, small: 0 },
  smallColumns: { one: 0, two: 0 },
  towerCandidates: 0,
  freed: 0,
  bareRuns: 0,
  bareRunsToppedUp: 0,
  freedTook: { exitBlind: 0, exitMid: 0, none: 0 },
});

type Big = "tower" | "exit" | "billboard";
const NAME: Readonly<Record<Big, "waterTower" | "exit" | "billboard">> = { tower: "waterTower", exit: "exit", billboard: "billboard" };

/** `xs` rotated to start at a hashed index: a deterministic order that tries every element once. */
function rotated<T>(xs: readonly T[], hash: number): T[] {
  if (xs.length === 0) return [];
  const s = Math.min(xs.length - 1, Math.floor(unitOf(hash) * xs.length));
  return [...xs.slice(s), ...xs.slice(0, s)];
}

/** RB: a mid column whose front is an open side with street frontage (street, park edge, plaza). */
export function streetMid(ctx: Ctx, col: CityColumn): boolean {
  return col.kind === "mid" && ctx.built.get(keyOf(col))?.open.find((o) => o.side === col.front)?.frontage === "street";
}

/** What one building keeps between the passes of `buildRoofs`: its columns, its big prop's piece group and column, and whether that prop is a water tower candidate (TS). */
interface Held {
  readonly b: CityBuilding;
  readonly cols: CityColumn[];
  readonly run: string;
  /** The hashed column order of the big prop's try (`largecol`), over the building's non-corner columns. */
  readonly order: number[];
  /** The big prop's pieces (a billboard's structure and face) and its column's index, once placed. */
  big: CityRoofPiece[];
  bigN: number;
  tower: boolean;
}

/** TS's order: the hashed rank ascending, ties by building id. */
const byRank = (p: { h: Held; rank: number }, q: { h: Held; rank: number }): number => p.rank - q.rank || (p.h.b.id < q.h.b.id ? -1 : p.h.b.id > q.h.b.id ? 1 : 0);

/**
 * The roof pieces of every building, in `buildings.buildings` order: in a building its big prop first (a billboard: its structure, then its face), then its small props by column along the row, in a column the first then the
 * second (the left half, then the right). `layer` is H1b's and H2's output (read only). Fails with `CityStageError` where a column has no roof piece (R-2).
 *
 * Four passes (H3b): (1) every building's big prop, H3's kind loop, each water tower held as a candidate; (2) TX and TS, each street block keeps at most floor(n / `towerPer`) of its candidates, ranked by the hash, and a freed roof
 * gives its tower and that column's load back; (3) TF, in each bare run with a freed roof (a run with no big roof item left) the run's first freed roof, ranked by the hash, tries the roof exit; (4) every building's small props.
 * With `towerPer` 1 the cap holds every candidate and the layer is H3's exactly.
 */
export function buildRoofs(
  mass: Pick<CityMassLayer, "cells" | "built">,
  buildings: Pick<CityBuildingsLayer, "rows" | "columns" | "buildings">,
  layer: Pick<CityFacadesLayer, "dressing" | "walls">,
  rand: StageRand,
  towerPer: number = WATER_TOWER_PER_BUILDINGS,
): { roofs: CityRoofPiece[]; stats: RoofStats } {
  const ctx = makeCtx(mass, buildings);
  const insets = roofInsets(layer.walls ?? []);
  const load = columnLoads(layer, buildings);
  const runOf = runsOf(buildings);
  const billboards = new Map<string, number>();
  const stats = emptyStats();
  const cellOf = (col: CityColumn): CityCell => ({ i: col.i, j: col.j });
  const room = (col: CityColumn, n: number): boolean => (load.get(keyOf(col)) ?? 0) + n <= DRESS_PER_BAY_MAX;
  const addLoad = (col: CityColumn, n: number): void => void load.set(keyOf(col), (load.get(keyOf(col)) ?? 0) + n);
  const piece = (h: Held, kind: CityRoofPiece["kind"], col: CityColumn, facing: CitySide, placement: CityPlacement): CityRoofPiece => ({ kind, building: h.b.id, cell: cellOf(col), facing, placement });

  /** The roof exit on a column (RD, RW, RK), or null; counts what RK turned away. */
  const exitGroup = (h: Held, col: CityColumn): CityRoofPiece[] | null => {
    const e = roofBounds(ROOF_ACCESS);
    const deck = deckOf(col, insets, ROOF_EDGE_M);
    if (exitFits(deck)) return [piece(h, "exit", col, OPPOSITE[col.front], placeOnRoof(col, ROOF_ACCESS, (deck.left + deck.right) / 2, deck.front - e.d / 2, deckY(col), 180))];
    if (exitFits(deckOf(col, NO_INSETS, ROOF_EDGE_M))) stats.rkTurned.exit++;
    return null;
  };
  /** RX: the exit tries the building's blind columns first, then its mid columns, each in the hashed rotation. */
  const exitTries = (h: Held): number[] => [...h.order.filter((n) => h.cols[n]!.kind === "blind"), ...h.order.filter((n) => h.cols[n]!.kind !== "blind")];

  const helds: Held[] = buildings.buildings.map((b) => {
    const cols = b.cells.map((c) => {
      const col = ctx.col.get(keyOf(c));
      if (!col) throw new CityStageError(`H3: building ${b.id} has the cell (${c.i}, ${c.j}), which has no column`, [c]);
      return col;
    });
    const roofCols = cols.map((c, n) => ({ c, n })).filter(({ c }) => c.kind !== "corner").map(({ n }) => n);
    return { b, cols, run: runOf.get(b.id) ?? b.id, order: rotated(roofCols, rand("roof", "largecol", b.id)), big: [], bigN: -1, tower: false };
  });

  // ---- pass 1: the big roof prop, at most one per building, chosen before the small ones so it takes its column ----
  for (const h of helds) {
    const { b, cols, run, order } = h;
    if (unitOf(rand("roof", "large", b.id)) >= P_ROOF_LARGE) continue;
    stats.drawn++;
    const kinds = rotated<Big>(["tower", "exit", "billboard"], rand("roof", "largekind", b.id));
    let done = false;
    for (const kind of kinds) {
      if (done) break;
      if (kind === "billboard" && (billboards.get(run) ?? 0) > 0) {
        stats.billboardRunCap++;
        continue;
      }
      const tries = kind === "exit" ? exitTries(h) : order;
      const face = kind === "billboard" ? BILLBOARD_FACES[indexOf(rand("roof", "face", b.id), BILLBOARD_FACES.length)]! : null;
      for (const n of tries) {
        const col = cols[n]!;
        const y = deckY(col);
        let group: CityRoofPiece[] | null = null;
        if (kind === "tower") {
          const e = roofBounds(ROOF_WATER_TOWER);
          const deck = deckOf(col, insets, ROOF_EDGE_M);
          if (fitsSize(e.w, e.d, deck)) group = [piece(h, "waterTower", col, col.front, placeOnRoof(col, ROOF_WATER_TOWER, (deck.left + deck.right) / 2, deck.front - e.d / 2, y, 0))];
          else if (fitsSize(e.w, e.d, deckOf(col, NO_INSETS, ROOF_EDGE_M))) stats.rkTurned.waterTower++;
        } else if (kind === "exit") {
          group = exitGroup(h, col);
        } else {
          const s = roofBounds(BILLBOARD_STRUCTURE);
          const f = roofBounds(face!);
          const plain = deckOf(col, NO_INSETS, BILLBOARD_EDGE_M);
          const deck = deckOf(col, insets, BILLBOARD_EDGE_M);
          const fits = (r: Rect): boolean => fitsSize(s.w, s.d + f.d, r) && f.w <= r.right - r.left + EPS;
          if (!streetMid(ctx, col)) {
            if (fits(plain)) stats.rbTurned[col.kind]++;
          } else if (fits(deck)) {
            const x = (deck.left + deck.right) / 2;
            group = [
              piece(h, "billboard", col, col.front, placeOnRoof(col, BILLBOARD_STRUCTURE, x, deck.front - f.d - s.d / 2, y, 0)),
              piece(h, "billboardFace", col, col.front, placeOnRoof(col, face!, x, deck.front - f.d / 2, y + BILLBOARD_SIGN_Y_M, 0)),
            ];
          } else if (fits(plain)) stats.rkTurned.billboard++;
        }
        if (!group) continue;
        if (!room(col, group.length)) {
          stats.capTurned[NAME[kind]]++;
          continue;
        }
        addLoad(col, group.length);
        h.big = group;
        h.bigN = n;
        if (kind === "tower") {
          h.tower = true;
          stats.towerCandidates++;
        } else stats.placed[NAME[kind]]++;
        if (kind === "exit") stats.exitOn[col.kind === "blind" ? "blind" : "mid"]++;
        if (kind === "billboard") billboards.set(run, (billboards.get(run) ?? 0) + 1);
        done = true;
        break;
      }
      if (!done) stats.fellThrough[NAME[kind]]++;
    }
    if (!done) stats.noBig++;
  }

  // ---- pass 2: TX and TS, each block keeps at most floor(n / towerPer) of its tower candidates, by the hashed rank ----
  const perBlock = new Map<string, number>();
  for (const b of buildings.buildings) perBlock.set(b.block, (perBlock.get(b.block) ?? 0) + 1);
  const candidates = new Map<string, { h: Held; rank: number }[]>();
  for (const h of helds) if (h.tower) (candidates.get(h.b.block) ?? candidates.set(h.b.block, []).get(h.b.block)!).push({ h, rank: unitOf(rand("roof", "tower", h.b.block, h.b.id)) });
  const freed: Held[] = [];
  for (const [block, list] of candidates) {
    const cap = Math.floor((perBlock.get(block) ?? 0) / towerPer);
    list.sort(byRank);
    list.forEach(({ h }, n) => {
      if (n < cap) {
        stats.placed.waterTower++;
        return;
      }
      addLoad(h.cols[h.bigN]!, -h.big.length);
      h.big = [];
      h.bigN = -1;
      h.tower = false;
      freed.push(h);
    });
  }
  stats.freed = freed.length;

  // ---- pass 3: TF, the bare-run top-up: in a run with no big roof item left, its first freed roof (by the hashed rank) tries the roof exit ----
  const runHasBig = new Set(helds.filter((h) => h.big.length > 0).map((h) => h.run));
  const freedOfRun = new Map<string, Held[]>();
  for (const h of freed) if (!runHasBig.has(h.run)) (freedOfRun.get(h.run) ?? freedOfRun.set(h.run, []).get(h.run)!).push(h);
  let toppedUp = 0;
  for (const [run, list] of freedOfRun) {
    stats.bareRuns++;
    const h = list.map((x) => ({ h: x, rank: unitOf(rand("roof", "exit", run, x.b.id)) })).sort(byRank)[0]!.h;
    for (const n of exitTries(h)) {
      const col = h.cols[n]!;
      const group = exitGroup(h, col);
      if (!group) continue;
      if (!room(col, group.length)) {
        stats.capTurned.exit++;
        continue;
      }
      addLoad(col, group.length);
      h.big = group;
      h.bigN = n;
      stats.placed.exit++;
      stats.exitOn[col.kind === "blind" ? "blind" : "mid"]++;
      stats.freedTook[col.kind === "blind" ? "exitBlind" : "exitMid"]++;
      toppedUp++;
      break;
    }
  }
  stats.bareRunsToppedUp = toppedUp;
  stats.freedTook.none = freed.length - toppedUp;

  // ---- pass 4: the small roof props: each roof column without the big prop, by probability, one or two, in cells ----
  const roofs: CityRoofPiece[] = [];
  for (const h of helds) {
    const { b, cols } = h;
    const mine: CityRoofPiece[] = [...h.big];
    cols.forEach((col, n) => {
      if (n === h.bigN) return;
      if (unitOf(rand("roof", "small", b.id, n)) >= P_ROOF_SMALL) return;
      const deck = deckOf(col, insets, ROOF_EDGE_M);
      if (deck.right <= deck.left || deck.front <= deck.back) return;
      const count = ROOF_SMALL_PER_BAY >= 2 && unitOf(rand("roof", "second", b.id, n)) < P_ROOF_SECOND ? 2 : 1;
      if (count === 2) stats.smallColumns.two++;
      else stats.smallColumns.one++;
      const mid = (deck.left + deck.right) / 2;
      const cells: Rect[] = count === 2 ? [{ ...deck, right: mid }, { ...deck, left: mid }] : [deck];
      const plainDeck = deckOf(col, NO_INSETS, ROOF_EDGE_M);
      const plainMid = (plainDeck.left + plainDeck.right) / 2;
      const plains: Rect[] = count === 2 ? [{ ...plainDeck, right: plainMid }, { ...plainDeck, left: plainMid }] : [plainDeck];
      const y = deckY(col);
      cells.forEach((c, m) => {
        for (const key of rotated(ROOF_SMALL, rand("roof", "key", b.id, n, m))) {
          const e = roofBounds(key);
          if (!fitsSize(e.w, e.d, c)) {
            if (fitsSize(e.w, e.d, plains[m]!)) stats.rkTurned.small++;
            continue;
          }
          if (!room(col, 1)) {
            stats.capTurned.small++;
            continue;
          }
          const flip = isTurnable(key) && unitOf(rand("roof", "flip", b.id, n, m, key)) < 0.5;
          const fx = c.left + e.w / 2 + unitOf(rand("roof", "x", b.id, n, m)) * (c.right - c.left - e.w);
          const fz = c.back + e.d / 2 + unitOf(rand("roof", "z", b.id, n, m)) * (c.front - c.back - e.d);
          const own = planSide(col.yaw + (flip ? 180 : 0), 0, 1);
          addLoad(col, 1);
          mine.push(piece(h, "small", col, own, placeOnRoof(col, key, fx, fz, y, flip ? 180 : 0)));
          break;
        }
      });
    });
    roofs.push(...mine);
  }
  return { roofs, stats };
}

/** The lowest building of each run (the old novelty sign's place): its fewest storeys, the first along the run on a tie. For the report only. */
export function lowestOfRuns(buildings: Pick<CityBuildingsLayer, "rows" | "buildings">): Map<string, CityBuilding> {
  const runOf = runsOf(buildings);
  const lowest = new Map<string, CityBuilding>();
  for (const b of buildings.buildings) {
    const r = runOf.get(b.id) ?? b.id;
    const cur = lowest.get(r);
    if (!cur || b.storeys < cur.storeys) lowest.set(r, b);
  }
  return lowest;
}
