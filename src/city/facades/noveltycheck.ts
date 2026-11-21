/**
 * Stage 7, H1c: the checks of `facades.shops`, `facades.novelty` and the roof novelty pieces (ticket 070 H1c criterion 5), each a function of the facades layer, `buildings` and `mass`, run by the stage after `roofFailures`
 * and by the tests on fixtures. A failure names its check and its cells:
 * - SK: one `CityShop` for every shop ground piece, in `ground`'s order, with its cells; a shop with a trade sign on its first cell has that sign's kind, `source` "sign" and the sign's key; every other shop has `source` "hash" and no sign;
 * - NM: every face sign's and roof novelty piece's key is one of its shop's kind's keys (`NOVELTY_BY_KIND`), and a face sign's `kind` field is its shop's;
 * - F, the face rule: street front, a column that is not an escape's (EP), centred, broad side out, base on the shopfront's tallest piece, top under the roof, width (W1), clear of every placed piece nearby;
 * - reach (T1) and attach, each its own check: the sign's front at most `CELL_M` past the front cell edge; its back on storey 1's wall plane within `TOL`;
 * - cap: the sign's column with every piece counted (roofs and face signs included) at most `DRESS_PER_BAY_MAX`;
 * - NR: at most `NOVELTY_PER_RUN` signs (face or roof) a B2 run, one a shop.
 * The roof novelty piece's own place (its key in `NOVELTY_KEYS`, a mid column of a shop) is `roofcheck.ts`' NV; its deck, base, cap and one-big-prop checks are H3's.
 */

import type { CityCell, CityFacadesLayer, CityGroundPiece, CityShop } from "../../core";
import type { GroundInput } from "./check";
import { baysOf, runsOf } from "./dress";
import { DRESS_PER_BAY_MAX } from "./dresskit";
import { CELL_M } from "./constants";
import { makeCtx } from "./facts";
import { NOVELTY_BY_KIND, NOVELTY_KEYS, NOVELTY_PER_RUN, SIGN_KIND, noveltyBounds } from "./noveltykit";
import { TOL, boxAt, dressingByCell, faceBase, faceExtent, loadsWithRoofs, nearBoxes, overlaps, placedBoxes } from "./novelty";
import { keyOf, rotate } from "./place";
import { isShop, signsByCell } from "./shops";

export interface NoveltyFailure {
  readonly check: string;
  readonly reason: string;
  readonly cells: readonly CityCell[];
}

const HALF = CELL_M / 2;
const short = (k: string): string => k.slice("city-pack:SM_Prop_LargeSign_".length);

/** Every failure of `layer.shops`, `layer.novelty` and the roof novelty pieces. Empty when every check holds. */
export function noveltyFailures(layer: CityFacadesLayer, input: GroundInput): NoveltyFailure[] {
  const failures: NoveltyFailure[] = [];
  const fail = (check: string, reason: string, cells: readonly CityCell[]): void => {
    failures.push({ check, reason, cells });
  };
  const { shops, novelty } = layer;
  if (!shops || !novelty || !layer.dressing || !layer.walls || !layer.roofs) {
    fail("H1c", "the facades layer has no shops, novelty, dressing, walls or roofs", []);
    return failures;
  }
  if (!input.buildings.columns) {
    fail("H1c", "the buildings layer has no columns", []);
    return failures;
  }
  const ctx = makeCtx(input.mass, input.buildings);
  const at = (c: CityCell): string => `(${c.i}, ${c.j})`;

  // ---- SK: one shop a shop ground piece, a trade-signed shop's kind is its sign's ----
  const groundShops = layer.ground.filter(isShop);
  if (shops.length !== groundShops.length) fail("SK", `${shops.length} shops for ${groundShops.length} shop ground pieces`, []);
  const signAt = signsByCell(layer.dressing);
  groundShops.forEach((g, n) => {
    const s = shops[n];
    if (!s) return;
    if (s.building !== g.building || s.cells.length !== g.cells.length || s.cells.some((c, m) => keyOf(c) !== keyOf(g.cells[m]!))) {
      fail("SK", `shop ${n} is not its ground piece's (${g.building} ${at(g.cells[0]!)})`, g.cells);
      return;
    }
    const sign = signAt.get(keyOf(g.cells[0]!));
    const read = sign === undefined ? null : (SIGN_KIND[sign] ?? null);
    if (read !== null) {
      if (s.kind !== read || s.source !== "sign" || s.sign !== sign) fail("SK", `the shop on ${at(s.cells[0]!)} has a trade sign (${sign}) for ${read} and is ${s.kind} from ${s.source}`, s.cells);
    } else if (s.source !== "hash" || s.sign !== null) fail("SK", `the shop on ${at(s.cells[0]!)} has no trade sign and its kind is from ${s.source}`, s.cells);
  });
  const shopFirst = new Map<string, CityShop>();
  const shopAny = new Map<string, CityShop>();
  for (const s of shops) {
    shopFirst.set(keyOf(s.cells[0]!), s);
    for (const c of s.cells) shopAny.set(keyOf(c), s);
  }

  // ---- the face signs ----
  const groundOf = new Map<string, CityGroundPiece[]>();
  for (const g of layer.ground) (groundOf.get(g.building) ?? groundOf.set(g.building, []).get(g.building)!).push(g);
  const buildingOf = new Map(input.buildings.buildings.map((b) => [b.id, b] as const));
  const dressAt = dressingByCell(layer.dressing);
  const index = placedBoxes(layer);
  const escapes = new Set(layer.walls.filter((p) => p.kind === "escape").map((p) => keyOf(p.cell)));
  const faceCount = new Map<string, number>();
  for (const s of novelty) {
    const where = `the ${short(s.placement.key)} face sign on ${at(s.cell)}`;
    const shop = shopFirst.get(keyOf(s.cell));
    const b = buildingOf.get(s.building);
    if (!shop || !b || shop.building !== s.building) {
      fail("F", `${where} is not on the first cell of a shop of building ${s.building}`, [s.cell]);
      continue;
    }
    faceCount.set(keyOf(s.cell), (faceCount.get(keyOf(s.cell)) ?? 0) + 1);
    if (s.kind !== shop.kind || !NOVELTY_BY_KIND[shop.kind].includes(s.placement.key)) fail("NM", `${where} is ${s.kind} and its shop is ${shop.kind}, whose keys are ${NOVELTY_BY_KIND[shop.kind].map(short).join(", ") || "none"}`, [s.cell]);
    if (!NOVELTY_KEYS.includes(s.placement.key)) {
      fail("NM", `${where}: ${s.placement.key} is not a novelty key`, [s.cell]);
      continue;
    }
    const bay = baysOf(ctx, b, groundOf.get(b.id) ?? []).find((x) => keyOf(x.g.cells[0]!) === keyOf(s.cell));
    if (!bay) {
      fail("F", `${where} is on a shop that is not a street bay`, [s.cell]);
      continue;
    }
    const col = bay.col;
    const f = bay.frame;
    if (!bay.frontStreet || bay.g.frontage !== "street" || s.face !== col.front) fail("F", `${where}: not on a street front (its face ${s.face}, its column's front ${col.front})`, [s.cell]);
    if (bay.g.cells.some((c) => escapes.has(keyOf(c)))) fail("F", `${where}: EP, it stands on an escape's column`, [s.cell]);
    // the frame: origin the mean of the shop's cells' centres, +z the column's front
    const e = noveltyBounds(s.placement.key);
    const x = faceExtent(s.placement.key);
    const rel = ((((s.placement.yaw_deg - col.yaw) % 360) + 360) % 360) as number;
    if (rel !== (x.turned ? 90 : 0)) fail("F", `${where}: its broad side is not out (turned ${rel} from its column's yaw, expected ${x.turned ? 90 : 0})`, [s.cell]);
    const q = (rel / 90) & 1;
    const along = q === 1 ? e.d : e.w;
    const out = q === 1 ? e.w : e.d;
    const v = rotate(-col.yaw, s.placement.x_m - f.ox, s.placement.z_m - f.oz);
    if (Math.abs(v.x) > TOL) fail("F", `${where}: it is ${v.x.toFixed(4)} m off the middle of its shop`, [s.cell]);
    if (Math.abs(v.z - out / 2 - f.floorFront) > TOL) fail("attach", `${where}: its back is ${(v.z - out / 2 - f.floorFront).toFixed(4)} m off storey 1's wall plane`, [s.cell]);
    if (v.z + out / 2 - HALF > CELL_M + TOL) fail("reach", `${where}: its front is ${(v.z + out / 2 - HALF).toFixed(3)} m past the front cell edge, over ${CELL_M}`, [s.cell]);
    const base = faceBase(bay, dressAt);
    if (Math.abs(s.placement.y_m - base) > TOL) fail("F", `${where}: its base ${s.placement.y_m.toFixed(4)} is not on top of the shopfront's tallest piece (${base.toFixed(4)})`, [s.cell]);
    if (s.placement.y_m + e.h > bay.roofY + TOL) fail("F", `${where}: its top ${(s.placement.y_m + e.h).toFixed(3)} is over its roof piece's base ${bay.roofY}`, [s.cell]);
    if (along > CELL_M * bay.g.cells.length + TOL) fail("F", `${where}: it is ${along.toFixed(3)} m along the wall, over its shop's ${CELL_M * bay.g.cells.length} (W1)`, [s.cell]);
    const box = boxAt(s.placement, e.w, e.h, e.d);
    const hit = nearBoxes(index, bay.g.cells).findIndex((o) => overlaps(box, o));
    if (hit >= 0) fail("F", `${where}: it is not clear of a placed piece nearby (clear)`, [s.cell]);
  }

  // ---- the roof novelty pieces: NM ----
  const perShop = new Map<string, number>(faceCount);
  const perRun = new Map<string, number>();
  const runOf = runsOf(input.buildings);
  const addRun = (building: string): void => void perRun.set(runOf.get(building) ?? building, (perRun.get(runOf.get(building) ?? building) ?? 0) + 1);
  for (const s of novelty) addRun(s.building);
  for (const p of layer.roofs) {
    if (p.kind !== "novelty") continue;
    addRun(p.building);
    const shop = shopAny.get(keyOf(p.cell));
    if (!shop || shop.building !== p.building) continue;
    perShop.set(keyOf(shop.cells[0]!), (perShop.get(keyOf(shop.cells[0]!)) ?? 0) + 1);
    if (!NOVELTY_BY_KIND[shop.kind].includes(p.placement.key)) fail("NM", `the roof sign ${short(p.placement.key)} on ${at(p.cell)} is on a ${shop.kind} shop, whose keys are ${NOVELTY_BY_KIND[shop.kind].map(short).join(", ") || "none"}`, [p.cell]);
  }

  // ---- the cap, placed last ----
  const loads = loadsWithRoofs(layer, input.buildings, layer.roofs);
  for (const [k, n] of faceCount) {
    const total = (loads.get(k) ?? 0) + n;
    if (total > DRESS_PER_BAY_MAX) fail("cap", `the column ${k} has ${total} pieces with the roofs and face signs counted, over ${DRESS_PER_BAY_MAX}`, [ctx.col.get(k)!]);
  }

  // ---- NR ----
  for (const [run, n] of perRun) if (n > NOVELTY_PER_RUN) fail("NR", `the run ${run} has ${n} novelty signs, over ${NOVELTY_PER_RUN}`, []);
  for (const [k, n] of perShop) if (n > 1) fail("NR", `the shop on ${k} has ${n} novelty signs, over one`, [shopFirst.get(k)!.cells[0]!]);
  return failures;
}
