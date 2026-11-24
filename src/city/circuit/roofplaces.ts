/**
 * Stage 6, roof structures and roof span places (ticket 081 K2d1; CK17a to CK17c of `docs/design/081-B1-roof-spans.md`). Pure.
 *
 * - **CK17a** A corner place stands on every `corner` column whose two open sides both face a street; a mid-row place on every `mid` column whose open front faces a street.
 * - **CK17c** Each place is offered `pavement` spans to the two nearest poles of its own block's pole lines, `street` spans across its street, and (corner places) `junction` spans to the diagonal block.
 *   A candidate is offered only where CK17b and CK17d pass, by `judgeSpan`.
 */

import type { CityCircuitLayer, CityPlanBlock, CityPole, CityRoofKeep, CityRoofMast, CityRoofSpan, CitySide } from "../../core";
import type { CircuitInput } from "./check";
import { CELL_M, ROOF_DECK_M, ROOF_MAST_ATTACH_MIN_M, ROOF_MAST_INSET_M, ROOF_MAST_KEEP_M, ROOF_SPAN_MAX_M } from "./constants";
import { cellKey, oppositeSide } from "./geometry";
import { judgeSpan, roofContext, type End, type RoofContext } from "./roofgeom";

const round4 = (n: number): number => Math.round(n * 10000) / 10000;
const SIDE_ORDER: readonly CitySide[] = ["+x", "-x", "+z", "-z"];

export const roofId = (i: number, j: number): string => `roof:${i}:${j}`;
export const roofSpanId = (a: string, b: string): string => (a < b ? `span:${a}~${b}` : `span:${b}~${a}`);

/** The point of a roof structure: `ROOF_MAST_INSET_M` in from each street wall it has, or at the middle of a mid column's street front. */
export function roofPoint(i: number, j: number, sides: readonly CitySide[]): { readonly x_m: number; readonly z_m: number } {
  const x0 = i * CELL_M;
  const z0 = j * CELL_M;
  const sx = sides.find((s) => s === "+x" || s === "-x");
  const sz = sides.find((s) => s === "+z" || s === "-z");
  const x = sx === "+x" ? x0 + CELL_M - ROOF_MAST_INSET_M : sx === "-x" ? x0 + ROOF_MAST_INSET_M : x0 + CELL_M / 2;
  const z = sz === "+z" ? z0 + CELL_M - ROOF_MAST_INSET_M : sz === "-z" ? z0 + ROOF_MAST_INSET_M : z0 + CELL_M / 2;
  return { x_m: round4(x), z_m: round4(z) };
}

/** CK17a: every roof structure place of the city, in `mass.built` order, and the corner places' keep squares. */
export function layRoofs(input: CircuitInput): { readonly roofs: CityRoofMast[]; readonly roofKeep: CityRoofKeep[] } {
  const built = new Map(input.mass.built.map((c) => [cellKey(c.i, c.j), c] as const));
  const roofs: CityRoofMast[] = [];
  const roofKeep: CityRoofKeep[] = [];
  for (const col of input.buildings.columns ?? []) {
    const cell = built.get(cellKey(col.i, col.j));
    const piece = col.pieces[col.pieces.length - 1];
    if (cell === undefined || piece === undefined || piece.role !== "roof") continue;
    const row = cell.column === "corner" && cell.open.length === 2 ? "corner" : cell.column === "mid" && cell.open.length === 1 ? "mid" : null;
    if (row === null || !cell.open.every((o) => o.faces === "street")) continue;
    const sides = SIDE_ORDER.filter((s) => cell.open.some((o) => o.side === s));
    const at = roofPoint(col.i, col.j, sides);
    const id = roofId(col.i, col.j);
    roofs.push({ id, row, building: col.building, block: cell.block, cell: { i: col.i, j: col.j }, sides, x_m: at.x_m, z_m: at.z_m, deck_y_m: round4(piece.placement.y_m + ROOF_DECK_M), keep_half_m: ROOF_MAST_KEEP_M });
    if (row === "corner") roofKeep.push({ roof: id, x_m: at.x_m, z_m: at.z_m, half_m: ROOF_MAST_KEEP_M });
  }
  return { roofs, roofKeep };
}

/** A roof place as the end of a span: its point at the deck plus the attachment floor. */
export const roofEnd = (r: CityRoofMast): End => ({ id: r.id, x: r.x_m, z: r.z_m, y: r.deck_y_m + ROOF_MAST_ATTACH_MIN_M, cell: r.cell });

/** Who a roof place may be offered a span to, before CK17b and CK17d judge it. */
export interface Candidates {
  /** CK17c `pavement`: the two nearest poles of each own-block pole line on its street sides. */
  readonly pavement: readonly CityPole[];
  /** The blocks across its street sides, and (corner places) the block diagonally across the junction. */
  readonly facing: readonly string[];
  readonly diagonal: string | null;
}

const nearestTwo = (line: readonly CityPole[], r: CityRoofMast): CityPole[] =>
  [...line].sort((p, q) => Math.hypot(p.x_m - r.x_m, p.z_m - r.z_m) - Math.hypot(q.x_m - r.x_m, q.z_m - r.z_m) || (p.id < q.id ? -1 : 1)).slice(0, 2);

/** The poles of a block side's pole line (every kind but a crossing pole, which stands on the side that is no line). */
export const lineOf = (poles: readonly CityPole[], block: string, side: CitySide): CityPole[] => poles.filter((p) => p.block === block && p.side === side && p.kind !== "crossing");

/** The block diagonally across the junction a corner place faces: the nearest block in the opposite quadrant of that junction. Null where there is none. */
function diagonalBlock(input: CircuitInput, r: CityRoofMast): string | null {
  const block = input.streets.blocks.find((b) => b.id === r.block);
  const sx = r.sides.find((s) => s === "+x" || s === "-x");
  const sz = r.sides.find((s) => s === "+z" || s === "-z");
  if (block === undefined || sx === undefined || sz === undefined) return null;
  const jn = input.streets.junctions.find((j) => j.streets.some((s) => s.street === block.sides[sx].street) && j.streets.some((s) => s.street === block.sides[sz].street));
  if (jn === undefined) return null;
  const ci = jn.cells.map((c) => c.i);
  const cj = jn.cells.map((c) => c.j);
  const i0 = Math.min(...ci);
  const i1 = Math.max(...ci) + 1;
  const j0 = Math.min(...cj);
  const j1 = Math.max(...cj) + 1;
  let best: { d: number; b: CityPlanBlock } | undefined;
  for (const b of input.streets.blocks) {
    if (b.id === block.id) continue;
    if (sx === "+x" ? b.i0 < i1 : b.i1 > i0) continue;
    if (sz === "+z" ? b.j0 < j1 : b.j1 > j0) continue;
    const d = (sx === "+x" ? b.i0 - i1 : i0 - b.i1) + (sz === "+z" ? b.j0 - j1 : j0 - b.j1);
    if (best === undefined || d < best.d) best = { d, b };
  }
  return best?.b.id ?? null;
}

export function candidatesOf(input: CircuitInput, poles: readonly CityPole[], r: CityRoofMast): Candidates {
  const block = input.streets.blocks.find((b) => b.id === r.block);
  if (block === undefined) return { pavement: [], facing: [], diagonal: null };
  const pavement = r.sides.flatMap((s) => nearestTwo(lineOf(poles, r.block, s), r));
  const facing = [...new Set(r.sides.flatMap((s) => block.sides[s].across.map((a) => a.block)))];
  return { pavement, facing, diagonal: r.row === "corner" ? diagonalBlock(input, r) : null };
}

/** The fixed poles (end slots, landings, crossing poles) of `block` on the sides in `sides`: no mid-line slot is offered. */
const fixedPoles = (poles: readonly CityPole[], block: string, sides: readonly CitySide[]): CityPole[] => poles.filter((p) => p.block === block && sides.includes(p.side) && p.kind !== "slot");

/** CK17c: every roof span place, judged by CK17b and CK17d. Sorted by id. */
export function layRoofSpans(input: CircuitInput, layer: Pick<CityCircuitLayer, "poles" | "spans" | "lights" | "posts" | "poleModels" | "roofs">): CityRoofSpan[] {
  const roofs = layer.roofs ?? [];
  const ctx: RoofContext = roofContext(layer, input);
  const byBlock = new Map<string, CityRoofMast[]>();
  for (const r of roofs) byBlock.set(r.block, [...(byBlock.get(r.block) ?? []), r]);
  const out = new Map<string, CityRoofSpan>();
  const reach = (r: CityRoofMast, x: number, z: number): boolean => Math.hypot(x - r.x_m, z - r.z_m) <= ROOF_SPAN_MAX_M;
  const offer = (r: CityRoofMast, other: End, otherId: string, want: "pavement" | "street" | "junction", otherMid = false): void => {
    const id = roofSpanId(r.id, otherId);
    if (out.has(id)) return;
    const j = judgeSpan(ctx, roofEnd(r), other);
    if (j.problems.length > 0 || j.over !== want) return;
    if (want === "junction" && (r.row === "mid" || otherMid)) return;
    const [a, b] = r.id < otherId ? [r.id, otherId] : [otherId, r.id];
    out.set(id, { id, kind: "roof", over: j.over, a, b, len_m: j.len_m, street: j.street, junction: j.junction });
  };
  for (const r of roofs) {
    const cand = candidatesOf(input, layer.poles, r);
    for (const p of cand.pavement) {
      const e = ctx.poleEnd.get(p.id);
      if (e !== undefined) offer(r, e, p.id, "pavement");
    }
    const sides = (blockId: string): CitySide[] => {
      const own = input.streets.blocks.find((b) => b.id === r.block)!;
      return r.sides.flatMap((s) => (own.sides[s].across.some((a) => a.block === blockId) ? [oppositeSide(s)] : []));
    };
    for (const blockId of cand.facing) {
      for (const o of byBlock.get(blockId) ?? []) if (reach(r, o.x_m, o.z_m)) offer(r, roofEnd(o), o.id, "street");
      for (const p of fixedPoles(layer.poles, blockId, sides(blockId))) {
        const e = ctx.poleEnd.get(p.id);
        if (e !== undefined && reach(r, e.x, e.z)) offer(r, e, p.id, "street");
      }
    }
    if (cand.diagonal !== null) {
      const facingSides = r.sides.map(oppositeSide);
      for (const o of byBlock.get(cand.diagonal) ?? []) if (reach(r, o.x_m, o.z_m)) offer(r, roofEnd(o), o.id, "junction", o.row === "mid");
      for (const p of fixedPoles(layer.poles, cand.diagonal, facingSides)) {
        const e = ctx.poleEnd.get(p.id);
        if (e !== undefined && reach(r, e.x, e.z)) offer(r, e, p.id, "junction");
      }
    }
  }
  return [...out.values()].sort((x, y) => (x.id < y.id ? -1 : x.id > y.id ? 1 : 0));
}
