/**
 * Stage 7, H2: the fire escapes (ticket 070 H2 criteria 2 and 5; tickets 058 and 061 moved onto the pipeline's cells). Pure. The tile city's `planEscape`, `ladderParts`, `codeEscape`, `escapeCheck` and `escapeBlocks`
 * (src/render3d/escapes.ts) are ported line for line (this folder cannot import `src/render3d/`, R-1); `escapepin.test.ts` pins each to the original. What is new is where they read their inputs:
 * - **EQ** a qualifying building has at least `ESCAPE_MIN_BAYS` cells, at least 3 storeys and a street frontage; a quiet building that would qualify is a quiet site (**EX**, extra, not counted in R7).
 * - **EH** a host column is a `mid` column whose ground piece is not a `door`; **ET** with no open side onto a `stalls` cell. The column is `rand("escape", "col", building id)` among the hosts in row order.
 * - **ER** the rank is `finalise(rand("escape", "rank", building id))`; `escapeBlocks` takes it as an input.
 * - **EF** storey k (1 up) stands at y = 3 k, its sill `sillOf` of the floor piece over it; the drop ladder runs to the walk at y 0, and the escape is not raised by the ground piece's level (the floors do not move).
 * - **EW** an escape whose span is wider than its column (the first floor piece's bounds, W1) is drawn in code, and where that does not fit either the building is not a host.
 * - **RQ** an escape's outer face stands at most `CELL_M` past its column's front cell edge.
 * A piece is worked out in its column's own frame (origin the cell's centre, +z the column's front, +x across), then turned by the column's yaw, as H1b's bays are.
 */

import type { CalibrationKey, CityBuilding, CityBuildingsLayer, CityCell, CityColumn, CityGroundPiece, CityMassLayer, CityPiece, CityWallBox, CityWallPiece } from "../../core";
import type { StageRand } from "../pipeline/seeds";
import { CELL_M } from "./constants";
import { FLOOR_HOST } from "./dresskit";
import { type Ctx, facesStalls, factsOf, makeCtx } from "./facts";
import { finalise, indexOf } from "./hash";
import { centreOf, keyOf, rotate } from "./place";
import {
  CODE_ESCAPE,
  CODE_ESCAPE_KEY,
  ESCAPES,
  ESCAPE_DECK_BELOW_SILL_M,
  ESCAPE_DECK_TOL_M,
  ESCAPE_FIRST,
  ESCAPE_GEOMETRY,
  ESCAPE_GROUND_TOL_M,
  ESCAPE_JOINT_TOL_M,
  ESCAPE_MID,
  ESCAPE_MIN_BAYS,
  ESCAPE_SCALE_Y,
  ESCAPE_TABLES,
  ESCAPE_TOP,
  LADDER_RAIL_M,
  LADDER_RUNG_M,
  LADDER_RUNG_PITCH_M,
  WINDOW_SILL_M,
  wallBounds,
  type EscapeTables,
} from "./wallkit";

const EPS = 1e-9;
const norm = (n: number): number => (n === 0 ? 0 : n);

// ---- the sills ----

const median = (xs: readonly number[]): number => {
  const s = [...xs].sort((a, b) => a - b);
  return s.length === 0 ? 0 : s.length % 2 === 1 ? s[(s.length - 1) / 2]! : (s[s.length / 2 - 1]! + s[s.length / 2]!) / 2;
};
const flat = (v: number | readonly number[]): number[] => (typeof v === "number" ? [v] : [...v]);

/** The sill of storey `j` of a floor piece: its own entry, or the median of its style's entries (the style is the `_01` suffix), or of every entry. */
export function sillOf(key: CalibrationKey, j: number, sills: EscapeTables["sills"] = WINDOW_SILL_M): number {
  const own = sills[key];
  if (own !== undefined) return typeof own === "number" ? own : (own[j] ?? own[own.length - 1] ?? 0);
  const style = /(\d\d)$/.exec(key)?.[1];
  const same = Object.entries(sills).filter(([q]) => style !== undefined && q.endsWith(style));
  return median((same.length > 0 ? same : Object.entries(sills)).flatMap(([, v]) => flat(v!)));
}

// ---- placing (ported from escapes.ts) ----

/** One box of a code-drawn part: its centre (x, y, z) in the piece's frame, its size, and a turn about z (a stringer), radians. */
export interface EscapePart {
  kind: CityWallBox["kind"];
  x: number;
  y: number;
  z: number;
  w: number;
  h: number;
  d: number;
  rz?: number;
}

export interface EscapeSlot {
  key: CalibrationKey;
  /** The piece's base, metres, and its y-scale. */
  y: number;
  scaleY: number;
  /** The piece's centre x, from the column's axis, after the whole escape is centred. */
  x: number;
  w: number;
  h: number;
}

export interface EscapePlan {
  slots: EscapeSlot[];
  decks: number[];
  span_m: number;
}

/** A storey of the building: where its floor starts, and the sill of its windows over that. */
export interface EscapeStorey {
  y: number;
  sill: number;
}

/** The pack's pieces placed one per storey, or null when a piece is missing from `sizes`, has no flight where one is needed, or must be scaled outside `ESCAPE_SCALE_Y` (then the escape is code-drawn). */
export function planEscape(storeys: readonly EscapeStorey[], sizes: (key: CalibrationKey) => readonly [number, number, number] | null, geometry: EscapeTables["geometry"] = ESCAPE_GEOMETRY): EscapePlan | null {
  const n = storeys.length;
  if (n < 2) return null;
  const decks = storeys.map((s) => s.y + s.sill - ESCAPE_DECK_BELOW_SILL_M);
  const keys = (j: number): CalibrationKey => (j === 0 ? ESCAPE_FIRST : j === n - 1 ? ESCAPE_TOP : ESCAPE_MID);
  const slots: EscapeSlot[] = [];
  let shift = 0;
  for (let j = 0; j < n; j++) {
    const key = keys(j);
    const g = geometry[key];
    const size = sizes(key);
    if (!g || !size) return null;
    let scaleY = 1;
    if (j < n - 1) {
      if (g.flightTop_m === null || g.flightFoot_m === null || g.flightTopX_m === null) return null;
      scaleY = (decks[j + 1]! - decks[j]!) / (g.flightTop_m - g.flightFoot_m);
      if (!(scaleY >= ESCAPE_SCALE_Y.min - 1e-9 && scaleY <= ESCAPE_SCALE_Y.max + 1e-9)) return null;
    }
    if (j > 0) {
      const below = geometry[keys(j - 1)]!;
      if (g.hatchX_m === null || below.flightTopX_m === null) return null;
      shift += below.flightTopX_m - g.hatchX_m;
    }
    slots.push({ key, y: decks[j]! - g.deck_m * scaleY, scaleY, x: shift, w: size[0], h: size[1] * scaleY });
  }
  const lo = Math.min(...slots.map((s) => s.x - s.w / 2));
  const hi = Math.max(...slots.map((s) => s.x + s.w / 2));
  const mid = (lo + hi) / 2;
  for (const s of slots) s.x -= mid;
  return { slots, decks, span_m: hi - lo };
}

/** The ladder's boxes below a pack piece: from the walk up to the pack ladder's foot, in the first piece's frame (its base is at `pieceY`). Empty when the foot is on the walk. */
export function ladderParts(footWorld_m: number, pieceY: number, x0: number, x1: number, z: number): EscapePart[] {
  if (footWorld_m <= ESCAPE_GROUND_TOL_M) return [];
  const parts: EscapePart[] = [];
  const len = footWorld_m + LADDER_RUNG_M / 2;
  for (const x of [x0 + LADDER_RAIL_M / 2, x1 - LADDER_RAIL_M / 2]) parts.push({ kind: "ladderRail", x, y: len / 2 - pieceY, z, w: LADDER_RAIL_M, h: len, d: LADDER_RAIL_M });
  for (let y = LADDER_RUNG_PITCH_M; y < footWorld_m - LADDER_RUNG_PITCH_M / 2 + 1e-9; y += LADDER_RUNG_PITCH_M) {
    parts.push({ kind: "rung", x: (x0 + x1) / 2, y: y - pieceY, z, w: x1 - x0 - 2 * LADDER_RAIL_M, h: LADDER_RUNG_M, d: LADDER_RUNG_M });
  }
  return parts;
}

/** A whole escape in boxes: a deck, three rails and four posts on each storey, a flight from each deck to the next, and a ladder from the walk to the first deck (`escapes.ts`' `codeEscape`). Pure. */
export function codeEscape(decks: readonly number[], baseY: number): EscapePart[] {
  const c = CODE_ESCAPE;
  const parts: EscapePart[] = [];
  const hw = c.w / 2;
  const hd = c.d / 2;
  decks.forEach((top, j) => {
    const y = top - baseY;
    parts.push({ kind: "deck", x: 0, y: y - c.deck / 2, z: (c.stair0 - hd) / 2, w: c.w, h: c.deck, d: hd + c.stair0 });
    const front = hd - c.stair0;
    parts.push({ kind: "deck", x: (-hw + c.hatch0) / 2, y: y - c.deck / 2, z: c.stair0 + front / 2, w: c.hatch0 + hw, h: c.deck, d: front });
    parts.push({ kind: "deck", x: (c.hatch1 + hw) / 2, y: y - c.deck / 2, z: c.stair0 + front / 2, w: hw - c.hatch1, h: c.deck, d: front });
    const ry = y + c.rail - c.bar / 2;
    parts.push({ kind: "rail", x: 0, y: ry, z: hd - c.bar / 2, w: c.w, h: c.bar, d: c.bar });
    for (const sx of [-1, 1]) parts.push({ kind: "rail", x: sx * (hw - c.bar / 2), y: ry, z: 0, w: c.bar, h: c.bar, d: c.d });
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) parts.push({ kind: "post", x: sx * (hw - c.bar / 2), y: y + c.rail / 2, z: sz * (hd - c.bar / 2), w: c.bar, h: c.rail, d: c.bar });
    if (j < decks.length - 1) {
      const rise = decks[j + 1]! - top;
      const run = c.hatch1 - c.hatch0 - 0.05;
      const x1 = c.hatch1 - 0.05;
      const x0 = x1 - run;
      const len = Math.hypot(run, rise);
      const rz = Math.atan2(rise, -run);
      for (const z of [c.stair0 + c.bar / 2, c.stair1 - c.bar / 2]) parts.push({ kind: "stringer", x: (x0 + x1) / 2, y: y + rise / 2, z, w: len, h: c.bar, d: c.bar, rz });
      const steps = Math.max(1, Math.round(rise / c.riser));
      for (let s = 1; s < steps; s++) parts.push({ kind: "tread", x: x1 - (run * s) / steps, y: y + (rise * s) / steps, z: (c.stair0 + c.stair1) / 2, w: c.tread, h: c.bar / 2, d: c.stair1 - c.stair0 });
    }
  });
  return [...parts, ...ladderParts(decks[0]! + c.rail, baseY, c.ladderX0, c.ladderX1, c.ladderZ)];
}

// ---- which buildings get an escape (ticket 061; ER) ----

/** A building as the choice sees it: `id` names it in the result, `rank` is its hash rank (ER), `run` the run it stands in (sites of a run come in run order). */
export interface EscapeSite {
  id: string;
  rank: number;
  run: string;
  /** R7's count (EQ). */
  qualifies: boolean;
  /** A qualifying building that can hold an escape (EH, ET, and the escape fits). */
  hosts: boolean;
}

export interface EscapeChoice {
  chosen: ReadonlySet<string>;
  qualifying: number;
  /** `ceil(share x qualifying)`. */
  target: number;
  /** How many of `target` could not be placed (fewer hostable buildings than the neighbour rule needs); 0 when the target is met. */
  escapeShort: number;
}

interface EscapeNode {
  site: EscapeSite;
  rank: number;
  order: number;
  seg: EscapeNode[];
  pos: number;
  picked: boolean;
}

/**
 * Which buildings get a fire escape (`escapes.ts`' `escapeBlocks`, ported unchanged but for the rank, which is the site's own). Exactly `ceil(share x qualifying)` of them, however many there are: the hostable ones are
 * ranked and take an escape in rank order, skipping one whose neighbour in its run already has one; a run that holds fewer than ceil(k / 2) of its k hostable buildings in a row is re-laid alternating, best-ranked run
 * first, until the target is met; a surplus is trimmed from the worst-ranked end. Pure and deterministic.
 */
export function escapeBlocks(sites: readonly EscapeSite[], share: number): EscapeChoice {
  const qualifying = sites.filter((s) => s.qualifies).length;
  const target = share > 0 ? Math.ceil(share * qualifying - 1e-9) : 0;
  const nodes: EscapeNode[] = [];
  const segs: EscapeNode[][] = [];
  const open = new Map<string, EscapeNode[]>();
  sites.forEach((site, order) => {
    if (!(site.qualifies && site.hosts)) {
      open.delete(site.run);
      return;
    }
    let seg = open.get(site.run);
    if (!seg) {
      seg = [];
      open.set(site.run, seg);
      segs.push(seg);
    }
    nodes.push({ site, rank: site.rank, order, seg, pos: seg.length, picked: false });
    seg.push(nodes[nodes.length - 1]!);
  });
  const capacity = segs.reduce((n, s) => n + Math.ceil(s.length / 2), 0);
  const goal = Math.min(target, capacity);
  const better = (a: EscapeNode, b: EscapeNode): number => a.rank - b.rank || a.order - b.order;
  let count = 0;
  for (const n of [...nodes].sort(better)) {
    if (count >= goal) break;
    if (n.seg[n.pos - 1]?.picked || n.seg[n.pos + 1]?.picked) continue;
    n.picked = true;
    count++;
  }
  if (count < goal) {
    const best = (s: EscapeNode[]): EscapeNode => [...s].sort(better)[0]!;
    for (const seg of [...segs].sort((a, b) => better(best(a), best(b)))) {
      if (count >= goal) break;
      const want = Math.ceil(seg.length / 2);
      const have = seg.filter((n) => n.picked).length;
      if (have >= want) continue;
      const fromLast = seg.length % 2 === 0 && better(seg[seg.length - 1]!, seg[0]!) < 0;
      seg.forEach((n, i) => (n.picked = (fromLast ? seg.length - 1 - i : i) % 2 === 0));
      count += want - have;
    }
  }
  if (count > goal) {
    for (const n of nodes.filter((q) => q.picked).sort(better).reverse()) {
      if (count <= goal) break;
      n.picked = false;
      count--;
    }
  }
  return { chosen: new Set(nodes.filter((n) => n.picked).map((n) => n.site.id)), qualifying, target, escapeShort: target - count };
}

// ---- a column's frame ----

/** A column's own frame: its cell's centre in the plan, and its turn. */
export interface ColumnFrame {
  readonly ox: number;
  readonly oz: number;
  readonly yaw: number;
}

export function frameOfColumn(col: CityColumn): ColumnFrame {
  const c = centreOf(col);
  return { ox: c.x, oz: c.z, yaw: col.yaw };
}

/** A plan point in a column's frame. */
export function toFrame(f: ColumnFrame, x: number, z: number): { x: number; z: number } {
  return rotate(-f.yaw, x - f.ox, z - f.oz);
}

/** A frame point in the plan. */
export function fromFrame(f: ColumnFrame, x: number, z: number): { x: number; z: number } {
  const r = rotate(f.yaw, x, z);
  return { x: norm(f.ox + r.x), z: norm(f.oz + r.z) };
}

/** The floor piece of a column that covers storey `storey` (1 up), or null. */
export function floorOver(col: CityColumn, storey: number): CityPiece | null {
  return col.pieces.find((p) => p.role !== "roof" && p.storey <= storey && storey < p.storey + Math.max(1, p.span)) ?? null;
}

/** A floor piece's front plane in a column's frame (W1: its bounds' depth over two, from its pivot). */
export function floorFront(f: ColumnFrame, p: CityPiece): number {
  const h = FLOOR_HOST[p.placement.key];
  if (!h) throw new Error(`${p.placement.key} is not in the floor host table`);
  return toFrame(f, p.placement.x_m, p.placement.z_m).z + h.d / 2;
}

/** A column's width (W1): its first floor piece's bounds. */
export function columnWidth(col: CityColumn): number {
  const first = col.pieces[0];
  const h = first ? FLOOR_HOST[first.placement.key] : undefined;
  if (!h) throw new Error(`the column (${col.i}, ${col.j}) has no first floor piece in the floor host table`);
  return h.w;
}

/** The storeys of a column over the ground, lowest first (EF): storey k stands at `top_m` x k, the sill that of the floor piece over it. */
export function storeysOfColumn(col: CityColumn, sills: EscapeTables["sills"] = WINDOW_SILL_M): EscapeStorey[] {
  const out: EscapeStorey[] = [];
  const pitch = col.ground.top_m;
  for (const p of col.pieces.filter((q) => q.role !== "roof")) {
    const n = Math.max(1, p.span);
    for (let j = 0; j < n; j++) out.push({ y: pitch * (p.storey + j), sill: sillOf(p.placement.key, j, sills) });
  }
  return out;
}

const boxOfPart = (p: EscapePart): CityWallBox => ({ kind: p.kind, x_m: p.x, y_m: p.y, z_m: p.z, w_m: p.w, h_m: p.h, d_m: p.d, rz_rad: p.rz ?? 0 });

export interface EscapeResult {
  readonly pieces: CityWallPiece[];
  /** What the escape counts against its column's `DRESS_PER_BAY_MAX` (`dressBlock`'s count by bounds under the roof). */
  readonly weight: number;
}

/** A pack escape's weight against its column's cap: the tall landing, a middle piece while it and the top still fit under the roof, the top piece (`dressBlock`). */
function packWeight(firstY: number, roofY: number): number {
  const height = (k: CalibrationKey): number => wallBounds(k).h;
  let weight = 0;
  let at = firstY;
  if (at + height(ESCAPE_FIRST) <= roofY + EPS) {
    weight++;
    at += height(ESCAPE_FIRST);
  }
  while (at + height(ESCAPE_MID) + height(ESCAPE_TOP) <= roofY + EPS) {
    weight++;
    at += height(ESCAPE_MID);
  }
  if (at + height(ESCAPE_TOP) <= roofY + EPS) weight++;
  return weight;
}

/**
 * The escape of one column: the pack's pieces when they fit (one per storey, in the column's frame, turned by its yaw), else the code-drawn one; null when neither stands (a piece's outer face would pass `CELL_M` past the
 * column's front cell edge, RQ; the code escape wider than the column; a column with no storeys). `width` is the column's (W1; a test narrows it). `storeys` is the building's, the ground storey included.
 */
export function placeEscape(col: CityColumn, building: string, storeys: number, tables: EscapeTables = ESCAPE_TABLES, width: number = columnWidth(col)): EscapeResult | null {
  const roof = col.pieces[col.pieces.length - 1];
  const first = col.pieces[0];
  if (!roof || roof.role !== "roof" || !first) return null;
  const list = storeysOfColumn(col, tables.sills);
  if (list.length !== storeys - 1) return null;
  const f = frameOfColumn(col);
  const colW = width;
  const cell: CityCell = { i: col.i, j: col.j };
  const make = (key: CalibrationKey, storey: number, x: number, y: number, z: number, scaleY: number, boxes: readonly CityWallBox[]): CityWallPiece => {
    const at = fromFrame(f, x, z);
    return { kind: "escape", building, cell, face: col.front, storey, span: 1, placement: { key, x_m: at.x, y_m: norm(y), z_m: at.z, yaw_deg: col.yaw }, scaleY, boxes };
  };
  const reach = (z: number, d: number): number => z + d / 2 - CELL_M / 2;
  const plan = planEscape(list, (k) => {
    const e = tables.geometry[k] ? wallBounds(k) : null;
    return e ? [e.w, e.h, e.d] : null;
  }, tables.geometry);
  if (plan && plan.span_m <= colW + EPS) {
    const pieces: CityWallPiece[] = [];
    for (let j = 0; j < plan.slots.length; j++) {
      const slot = plan.slots[j]!;
      const e = wallBounds(slot.key);
      const host = floorOver(col, j + 1);
      if (!host) return null;
      const z = floorFront(f, host) + e.d / 2;
      if (reach(z, e.d) > CELL_M + EPS) return null;
      pieces.push(make(slot.key, j + 1, slot.x, slot.y, z, slot.scaleY, []));
    }
    const g = tables.geometry[ESCAPE_FIRST]!;
    const firstSlot = plan.slots[0]!;
    let boxes: CityWallBox[] = [];
    if (g.ladderFoot_m !== null && g.ladder_m !== null) {
      const foot = firstSlot.y + g.ladderFoot_m * firstSlot.scaleY;
      if (foot < -ESCAPE_GROUND_TOL_M) return null;
      boxes = ladderParts(foot, firstSlot.y, g.ladder_m[0], g.ladder_m[1], (g.ladder_m[2] + g.ladder_m[3]) / 2).map(boxOfPart);
    }
    pieces[0] = { ...pieces[0]!, boxes };
    return { pieces, weight: packWeight(col.ground.top_m, roof.placement.y_m) };
  }
  // Code-drawn: one piece with its boxes.
  const decks = list.map((s) => s.y + s.sill - ESCAPE_DECK_BELOW_SILL_M);
  const baseY = decks[0]! - CODE_ESCAPE.deck;
  const host = floorOver(col, 1);
  if (!host) return null;
  const z = floorFront(f, host) + CODE_ESCAPE.d / 2;
  if (reach(z, CODE_ESCAPE.d) > CELL_M + EPS || CODE_ESCAPE.w > colW + EPS) return null;
  return { pieces: [make(CODE_ESCAPE_KEY, 1, 0, baseY, z, 1, codeEscape(decks, baseY).map(boxOfPart))], weight: 1 };
}

/** What an escape's pieces count against their column's cap: 1 for a code-drawn escape, else the pack's count by bounds under the roof. */
export function escapeWeight(col: CityColumn, pieces: readonly CityWallPiece[]): number {
  const roof = col.pieces[col.pieces.length - 1];
  if (!roof || pieces.length === 0 || pieces.some((p) => p.placement.key === CODE_ESCAPE_KEY)) return 1;
  return packWeight(col.ground.top_m, roof.placement.y_m);
}

// ---- the check ----

export interface EscapeReport {
  /** The escape's column. */
  column: CityCell;
  storeys: number;
  platforms: number;
  /** Storeys (0 is the first over the ground) with no platform. */
  missing: number[];
  worstDeck_m: number;
  worstJoint_m: number;
  /** The height of the drop ladder's foot above the walk, metres; null when the escape has no ladder. */
  ladderFoot_m: number | null;
  ok: boolean;
}

/**
 * Checks one building's fire escape against its column (`escapes.ts`' `escapeCheck` on the layer's pieces): `pieces` are the escape's pieces, bottom up. Passes when no storey is missing, every deck is within
 * `ESCAPE_DECK_TOL_M` of its sill less `ESCAPE_DECK_BELOW_SILL_M`, every joint within `ESCAPE_JOINT_TOL_M` and the ladder's foot within `ESCAPE_GROUND_TOL_M` of the walk (y 0).
 */
export function escapeCheck(col: CityColumn, pieces: readonly CityWallPiece[], tables: EscapeTables = ESCAPE_TABLES): EscapeReport | null {
  const mine = pieces.filter((p) => p.kind === "escape");
  if (mine.length === 0) return null;
  const f = frameOfColumn(col);
  const storeys = storeysOfColumn(col, tables.sills);
  const want = storeys.map((s) => s.y + s.sill - ESCAPE_DECK_BELOW_SILL_M);
  const decks: { y: number; x: number }[] = [];
  const tops: { y: number; x: number }[] = [];
  let ladder: number | null = null;
  const xOf = (p: CityWallPiece): number => toFrame(f, p.placement.x_m, p.placement.z_m).x;
  const code = mine.find((p) => p.placement.key === CODE_ESCAPE_KEY);
  if (code) {
    const cx = xOf(code);
    const at = (p: CityWallBox): number => code.placement.y_m + p.y_m;
    for (const p of code.boxes.filter((q) => q.kind === "deck")) {
      const y = at(p) + p.h_m / 2;
      if (!decks.some((d) => Math.abs(d.y - y) < 1e-6)) decks.push({ y, x: cx + CODE_ESCAPE.hatch0 });
    }
    decks.sort((a, b) => a.y - b.y);
    for (const p of code.boxes.filter((q) => q.kind === "stringer")) {
      const half = (p.w_m / 2) * Math.sin(p.rz_rad);
      const x = cx + p.x_m + (p.w_m / 2) * Math.cos(p.rz_rad);
      if (!tops.some((t) => Math.abs(t.y - (at(p) + half)) < 1e-6)) tops.push({ y: at(p) + half, x });
    }
    tops.sort((a, b) => a.y - b.y);
    const rails = code.boxes.filter((q) => q.kind === "ladderRail");
    ladder = rails.length > 0 ? Math.min(...rails.map((r) => code.placement.y_m + r.y_m - r.h_m / 2)) : null;
  } else {
    const packs = mine.filter((p) => p.placement.key in tables.geometry).sort((a, b) => a.placement.y_m - b.placement.y_m);
    for (const p of packs) {
      const g = tables.geometry[p.placement.key]!;
      const s = p.scaleY;
      const px = xOf(p);
      decks.push({ y: p.placement.y_m + g.deck_m * s, x: px + (g.hatchX_m ?? Infinity) });
      if (g.flightTop_m !== null && g.flightTopX_m !== null) tops.push({ y: p.placement.y_m + g.flightTop_m * s, x: px + g.flightTopX_m });
      if (g.ladderFoot_m !== null) {
        const rails = p.boxes.filter((q) => q.kind === "ladderRail");
        ladder = rails.length > 0 ? Math.min(...rails.map((r) => p.placement.y_m + r.y_m - r.h_m / 2)) : p.placement.y_m + g.ladderFoot_m * s;
      }
    }
  }
  const missing: number[] = [];
  let worstDeck = 0;
  storeys.forEach((_, j) => {
    const d = decks[j];
    if (!d) missing.push(j);
    else worstDeck = Math.max(worstDeck, Math.abs(d.y - want[j]!));
  });
  let worstJoint = 0;
  tops.forEach((t, j) => {
    const up = decks[j + 1];
    if (!up) return;
    worstJoint = Math.max(worstJoint, Math.abs(t.y - up.y), Number.isFinite(up.x) ? Math.abs(t.x - up.x) : 0);
  });
  const ok = missing.length === 0 && worstDeck <= ESCAPE_DECK_TOL_M + 1e-9 && worstJoint <= ESCAPE_JOINT_TOL_M + 1e-9 && (ladder === null || Math.abs(ladder) <= ESCAPE_GROUND_TOL_M + 1e-9);
  return { column: { i: col.i, j: col.j }, storeys: storeys.length, platforms: decks.length, missing, worstDeck_m: worstDeck, worstJoint_m: worstJoint, ladderFoot_m: ladder, ok };
}

// ---- deciding the escapes of a city ----

/** EQ: a building that qualifies by its size (the frontage is the caller's). */
export const qualifiesBySize = (b: CityBuilding): boolean => b.cells.length >= ESCAPE_MIN_BAYS && b.storeys >= 3;

/** One building's escape, as the stage decided it. */
export interface DecidedEscape {
  readonly building: string;
  /** The column it stands on. */
  readonly col: CityColumn;
  readonly street: boolean;
  readonly result: EscapeResult;
}

/** What the decision counted, for the report. */
export interface EscapeStats {
  /** EQ's street buildings, and the ones that can host. */
  readonly streetQualifying: number;
  readonly streetHostable: number;
  readonly target: number;
  readonly streetPlaced: number;
  readonly escapeShort: number;
  readonly quietSites: number;
  readonly quietHostable: number;
  readonly quietPlaced: number;
  /** ET: host columns taken away, and sites left with no host by it. */
  readonly etColumns: number;
  readonly etSites: number;
}

export interface EscapeDecision {
  readonly escapes: ReadonlyMap<string, DecidedEscape>;
  readonly stats: EscapeStats;
}

/**
 * The escapes of a city (EQ to ET, ER, EX): for each building that qualifies by size, its host columns (EH: a `mid` column whose ground piece is not a `door`; ET: no open side onto `stalls`), its picked column
 * (`rand("escape", "col", id)` among them in row order) and the escape that stands on it; then `escapeBlocks` over the street buildings at `share`, and again over the quiet ones. Reads only `mass`, `buildings`
 * and `ground`.
 */
export function decideEscapes(
  mass: Pick<CityMassLayer, "cells" | "built">,
  buildings: Pick<CityBuildingsLayer, "rows" | "columns" | "buildings">,
  ground: readonly CityGroundPiece[],
  rand: StageRand,
  share: number,
  runOf: ReadonlyMap<string, string>,
): EscapeDecision {
  const ctx: Ctx = makeCtx(mass, buildings);
  const doorCells = new Set<string>();
  for (const g of ground) if (g.kind === "door") for (const c of g.cells) doorCells.add(keyOf(c));
  const tried = new Map<string, { site: Omit<EscapeSite, "qualifies">; street: boolean; size: boolean; result: EscapeResult | null; col: CityColumn | null }>();
  let etColumns = 0;
  let etSites = 0;
  for (const b of buildings.buildings) {
    const size = qualifiesBySize(b);
    const frontage = factsOf(ctx, b).frontage;
    let result: EscapeResult | null = null;
    let col: CityColumn | null = null;
    if (size) {
      const mids = b.cells.map((c) => ctx.col.get(keyOf(c))!).filter((c) => c.kind === "mid" && !doorCells.has(keyOf(c)));
      const hosts = mids.filter((c) => !facesStalls(ctx, c));
      etColumns += mids.length - hosts.length;
      if (hosts.length > 0) {
        col = hosts[indexOf(rand("escape", "col", b.id), hosts.length)]!;
        result = placeEscape(col, b.id, b.storeys);
      } else if (mids.length > 0) etSites++;
    }
    tried.set(b.id, { site: { id: b.id, rank: finalise(rand("escape", "rank", b.id)), run: runOf.get(b.id) ?? `solo:${b.id}`, hosts: result !== null }, street: frontage === "street", size, result, col });
  }
  const sites = (street: boolean): EscapeSite[] => buildings.buildings.map((b) => {
    const t = tried.get(b.id)!;
    return { ...t.site, qualifies: t.size && t.street === street };
  });
  const streetChoice = escapeBlocks(sites(true), share);
  const quietChoice = escapeBlocks(sites(false), share);
  const escapes = new Map<string, DecidedEscape>();
  for (const b of buildings.buildings) {
    const t = tried.get(b.id)!;
    const chosen = t.street ? streetChoice.chosen.has(b.id) : quietChoice.chosen.has(b.id);
    if (chosen && t.result && t.col) escapes.set(b.id, { building: b.id, col: t.col, street: t.street, result: t.result });
  }
  const hostable = (street: boolean): number => buildings.buildings.filter((b) => {
    const t = tried.get(b.id)!;
    return t.size && t.street === street && t.result !== null;
  }).length;
  return {
    escapes,
    stats: {
      streetQualifying: streetChoice.qualifying,
      streetHostable: hostable(true),
      target: streetChoice.target,
      streetPlaced: streetChoice.chosen.size,
      escapeShort: streetChoice.escapeShort,
      quietSites: quietChoice.qualifying,
      quietHostable: hostable(false),
      quietPlaced: quietChoice.chosen.size,
      etColumns,
      etSites,
    },
  };
}
