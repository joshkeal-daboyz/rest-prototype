/**
 * Stage 7, H1c: the shop kinds (ticket 070 H1c; SK; Josh, 21 Nov 2026, Q26 answers 1 and 3). Every shop ground piece ("shop", "shopDouble", "shopCorner") is given one `CityShopKind`, once, as a `CityShop` in `ground`'s order.
 * - **From the sign.** Where H1b's `dressing` has a fascia or blade sign on the shop's first cell whose key names a trade (`SIGN_KIND`), the shop takes that kind (`source` "sign"); H1b's signs are read, never changed.
 * - **From the hash.** Every other shop (no sign, or the plain Entrance sign) takes `indexOf(rand("shop", "kind", building id, i, j), n)` over the 16 kinds less those its building already has (the sign-read shops first, then the
 *   building's other shops in row order); over all 16 where none is left (`source` "hash", `sign` null).
 * Pure: it reads `ground`, `dressing` and the stage's `rand`.
 */

import type { CalibrationKey, CityBuildingsLayer, CityDressingPiece, CityGroundPiece, CityShop, CityShopKind } from "../../core";
import type { StageRand } from "../pipeline/seeds";
import { indexOf } from "./hash";
import { SHOP_KINDS, SIGN_KIND } from "./noveltykit";
import { keyOf } from "./place";

/** True for a ground piece that is a shop. */
export const isShop = (g: CityGroundPiece): boolean => g.kind === "shop" || g.kind === "shopDouble" || g.kind === "shopCorner";

/** H1b's sign (fascia or blade) on each shop's first cell, by that cell's key. A bay carries at most one. */
export function signsByCell(dressing: readonly CityDressingPiece[]): Map<string, CalibrationKey> {
  const out = new Map<string, CalibrationKey>();
  for (const p of dressing) if (p.kind === "fasciaSign" || p.kind === "bladeSign") out.set(keyOf(p.cell), p.placement.key);
  return out;
}

/** One `CityShop` for every shop ground piece, in `ground`'s order. */
export function buildShops(buildings: Pick<CityBuildingsLayer, "buildings">, ground: readonly CityGroundPiece[], dressing: readonly CityDressingPiece[], rand: StageRand): CityShop[] {
  const signAt = signsByCell(dressing);
  const shopsOf = new Map<string, CityGroundPiece[]>();
  for (const g of ground) if (isShop(g)) (shopsOf.get(g.building) ?? shopsOf.set(g.building, []).get(g.building)!).push(g);
  const byGround = new Map<CityGroundPiece, CityShop>();
  for (const b of buildings.buildings) {
    const mine = shopsOf.get(b.id) ?? [];
    const used = new Set<CityShopKind>();
    const read = new Map<CityGroundPiece, { sign: CalibrationKey; kind: CityShopKind }>();
    for (const g of mine) {
      const sign = signAt.get(keyOf(g.cells[0]!));
      const kind = sign === undefined ? null : (SIGN_KIND[sign] ?? null);
      if (sign !== undefined && kind !== null) {
        read.set(g, { sign, kind });
        used.add(kind);
      }
    }
    for (const g of mine) {
      const r = read.get(g);
      if (r) {
        byGround.set(g, { building: g.building, cells: g.cells.map((c) => ({ i: c.i, j: c.j })), kind: r.kind, source: "sign", sign: r.sign });
        continue;
      }
      const free = SHOP_KINDS.filter((k) => !used.has(k));
      const from = free.length > 0 ? free : SHOP_KINDS;
      const first = g.cells[0]!;
      const kind = from[indexOf(rand("shop", "kind", b.id, first.i, first.j), from.length)]!;
      used.add(kind);
      byGround.set(g, { building: g.building, cells: g.cells.map((c) => ({ i: c.i, j: c.j })), kind, source: "hash", sign: null });
    }
  }
  return ground.filter(isShop).map((g) => byGround.get(g)!);
}
