/**
 * Stage 11: the shopfronts (ticket 073 D1; D1-Q2; the D1 pre-check's section 0). A shopfront is an **add plus removes, never a swap**: a swap keeps the placement, and a shop ground piece's pivot is 2.29 to 2.64 m behind
 * its front wall, so a swapped `Bld_Advanced_*` would stand inside the building (and removing the shop would leave a hollow storey, rule 1). So the panel is an add, standing `SHOP_OUT_M` (its own depth) out from the old shop's front
 * wall onto the pavement, its top at 3.0 m, and the changes are the `remove`s of that face's glass, awnings, fascia signs and blade signs below 3 m. Face novelty signs (above 3 m) stay.
 *
 * - **Eligible:** single and double shops only (`shop`, `shopDouble`), **never corner shops** (a flat panel covers one face, and the corner's other face keeps the old shop and its wrap), on a street front, with no escape
 *   ladder in front below 3 m, no stage 8 or 9 piece in the panel's footprint, no stage 4 keep-out under it, no pole, street light or lamp-post place within `FURN_KEEP_M`, and the pavement's clear walk kept (D1-Q4).
 * - **Behind a constant** (`TECH_SHOPFRONTS`, or `TechOptions.shopfronts`): off, the pass adds no shopfront and lists no change.
 * - **No filler piece.** The panel's end returns are only partly faced in the GLB; nothing is invented to hide them (the drawn section's picture decides, D1g criterion 6).
 * The add's `cell` is the shop's first cell (the cell it is mounted on), so its district is that cell's.
 */

import type { CityChange, CityGroundPiece } from "../../core";
import { CityStageError } from "../pipeline/error";
import type { StageRand } from "../pipeline/seeds";
import type { S7Box } from "./boxes";
import { circuitRefusal, coversCircuit } from "./circuit";
import { CELL_M, CLEAR_WALK_M, EPS, P_SHOPFRONT, SHOP_COVER_M, SHOPFRONT_FROM_TECH } from "./constants";
import { districtOf, type TechCtx } from "./context";
import { SIDE_VEC, SIDE_YAW, cellKey, overlaps, rectAt, type Grid, type Rect } from "./geom";
import { unitOf } from "./hash";
import { SHOP_DOUBLE, SHOP_SINGLE, boundsOf } from "./kit";
import { clearWalk, type PaveState } from "./pavement";
import type { TechPiece } from "./pavement";
import type { RunGeo } from "./runs";

export interface ShopStats {
  /** Shop ground pieces of every kind. */
  shops: number;
  single: number;
  double: number;
  corner: number;
  /** Single and double shops that pass every test, in districts where shopfronts are on offer. */
  eligible: number;
  placed: number;
  removes: number;
  /** Why an otherwise-offered shop was refused, by reason. */
  refused: Record<string, number>;
}
export const newShopStats = (): ShopStats => ({ shops: 0, single: 0, double: 0, corner: 0, eligible: 0, placed: 0, removes: 0, refused: {} });

/** The panel's footprint for a shop piece: `null` when its column or front is not one a panel can stand before. */
export function panelOf(ctx: TechCtx, g: CityGroundPiece): { rect: Rect; x: number; z: number; yaw: number; key: typeof SHOP_SINGLE; side: "+x" | "-x" | "+z" | "-z" } | null {
  const first = g.cells[0];
  if (first === undefined) return null;
  const col = ctx.columns.get(cellKey(first.i, first.j));
  if (!col) return null;
  const side = col.front;
  for (const c of g.cells) {
    const b = ctx.built.get(cellKey(c.i, c.j));
    if (!b || !b.open.some((o) => o.side === side && o.faces === "street")) return null;
  }
  const key = g.kind === "shopDouble" ? SHOP_DOUBLE : SHOP_SINGLE;
  const e = boundsOf(key);
  const cx = g.cells.reduce((s, c) => s + (c.i + 0.5) * CELL_M, 0) / g.cells.length;
  const cz = g.cells.reduce((s, c) => s + (c.j + 0.5) * CELL_M, 0) / g.cells.length;
  const [vx, vz] = SIDE_VEC[side];
  // the panel's back is on the cell's front edge: from the cell centre, half a cell to the wall, then half the depth out
  const x = cx + vx * (CELL_M / 2 + e.d / 2);
  const z = cz + vz * (CELL_M / 2 + e.d / 2);
  const yaw = SIDE_YAW[side];
  return { rect: rectAt(x, z, e.w, e.d, yaw), x, z, yaw, key, side };
}

/** Why a panel may not stand, or null. Eligibility reads every box of stage 7 (the dressing the panel removes is the shop's own and sits at the wall, not in the escape and prop tests). */
export function shopRefusal(ctx: TechCtx, boxes: Grid<S7Box>, state: PaveState, rect: Rect, run: RunGeo | undefined): string | null {
  if (run === undefined) return "no run";
  for (const b of boxes.near(rect)) if (b.escape && b.low < SHOP_COVER_M - EPS && overlaps(rect, b)) return "escape";
  for (const f of ctx.feet.near(rect)) if (!f.flat && overlaps(rect, f)) return "piece";
  for (const q of ctx.ko.near(rect)) if (overlaps(rect, q)) return "KO"; // a panel stands on the wall edge: it may not cover a keep-out
  const c = circuitRefusal(ctx.circuit, rect, SHOP_COVER_M);
  if (c !== null) return c;
  if (coversCircuit(ctx.circuit, rect, false) !== null) return "T-1";
  if (clearWalk(ctx, state, run, rect) < CLEAR_WALK_M - EPS) return "walk";
  return null;
}

/** The dressing a panel covers: the indices (in `facades.dressing`) of the shop's glass, awnings, fascia signs and blade signs below 3 m on its front face. */
export function coveredDressing(ctx: TechCtx, g: CityGroundPiece, side: string): number[] {
  const first = g.cells[0]!;
  const out: number[] = [];
  (ctx.resolved.plan.layers.facades!.dressing ?? []).forEach((d, index) => {
    if (d.building !== g.building || d.cell.i !== first.i || d.cell.j !== first.j || d.face !== side || d.wrap) return;
    if (d.kind !== "glass" && d.kind !== "awning" && d.kind !== "fasciaSign" && d.kind !== "bladeSign") return;
    if (d.placement.y_m >= SHOP_COVER_M) return;
    out.push(index);
  });
  return out;
}

export interface ShopResult {
  readonly adds: TechPiece[];
  readonly changes: CityChange[];
  }

/** The shopfronts: each eligible shop in a district from `SHOPFRONT_FROM_TECH` takes a panel with chance `P_SHOPFRONT` x its district's `tech`. Pieces are added to `state` so the pavement counts them. */
export function layoutShops(ctx: TechCtx, state: PaveState, rand: StageRand, stats: ShopStats, enabled: boolean): ShopResult {
  const adds: TechPiece[] = [];
  const changes: CityChange[] = [];
  const runOf = new Map<string, RunGeo>();
  for (const r of ctx.runs) for (const b of r.buildings) runOf.set(b, r);
  const dressing = ctx.resolved.plan.layers.facades!.dressing ?? [];
  for (const g of ctx.resolved.plan.layers.facades!.ground) {
    if (g.kind !== "shop" && g.kind !== "shopDouble" && g.kind !== "shopCorner") continue;
    stats.shops++;
    if (g.kind === "shopCorner") {
      stats.corner++;
      continue;
    }
    if (g.kind === "shop") stats.single++;
    else stats.double++;
    const building = ctx.buildings.get(g.building);
    if (!building) throw new CityStageError(`tech: shop ${g.building} is in no building`);
    const district = districtOf(ctx, building.block);
    if (!enabled || district.tech < SHOPFRONT_FROM_TECH) continue;
    const panel = panelOf(ctx, g);
    if (panel === null) {
      stats.refused["front"] = (stats.refused["front"] ?? 0) + 1;
      continue;
    }
    const why = shopRefusal(ctx, ctx.boxesAll, state, panel.rect, runOf.get(g.building));
    if (why !== null) {
      stats.refused[why] = (stats.refused[why] ?? 0) + 1;
      continue;
    }
    stats.eligible++;
    const first = g.cells[0]!;
    if (!(unitOf(rand(g.building, first.i, first.j, "shopfront")) < P_SHOPFRONT * district.tech)) continue;
    const e = boundsOf(panel.key);
    adds.push({
      id: `tech:shopfront:${g.building}|${first.i},${first.j}`,
      kind: "shopfront",
      district: district.id,
      cell: { i: first.i, j: first.j },
      placement: { key: panel.key, x_m: panel.x, y_m: 0, z_m: panel.z, yaw_deg: panel.yaw },
      size: { x_m: panel.rect.x1 - panel.rect.x0, z_m: panel.rect.z1 - panel.rect.z0, h_m: e.h },
    });
    const run = runOf.get(g.building)!;
    state.add(run, { rect: panel.rect, s: (run.along === "x" ? panel.x : panel.z) - run.lo_m, at: "panel" });
    for (const index of coveredDressing(ctx, g, panel.side)) {
      changes.push({ ref: { list: "facades.dressing", index, key: dressing[index]!.placement.key }, op: "remove" });
      stats.removes++;
    }
    stats.placed++;
  }
  return { adds, changes };
}

