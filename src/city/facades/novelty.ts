/**
 * Stage 7, H1c: the novelty signs (ticket 070 H1c; NP, F and RS; Josh, 21 Nov 2026, Q26 "Yes, all four", and "It should be placed per the discretion of the storefront agent"). Pure: it reads `mass`, `buildings`, the
 * layer's `ground`, `dressing`, `walls` and `shops`, the kit (`noveltykit.ts`) and the stage's `rand`.
 * - **The plan** (made before the roofs). Each B2 run's shops are walked in `buildings.buildings` order, then row order; a shop whose kind has keys and whose `unitOf(rand("novelty", "chance", ...))` is under
 *   `NOVELTY_CHANCE` tries for a sign: the roof first where `unitOf(rand("novelty", "roof", ...))` is under `NOVELTY_ROOF_SHARE`, else the face first, then the other; at each spot its kind's keys are tried in a hashed
 *   rotation and the first that fits is taken. The first shop that gets a spot ends its run's walk (`NOVELTY_PER_RUN`). A roof sign goes to `buildRoofs` (RS); a face sign is placed after the roofs.
 * - **F, the face rule.** A face sign stands on its shop's column(s), in the shop's bay frame (`bayFrame`: origin the mean of its cells' centres, +z the column's front): its back on storey 1's wall plane, the first
 *   floor piece's bounds front (the plane H1b's front-face pieces lie on), centred across on the shop, its broad side to the street (turned `FACE_QUARTER_DEG` where the key's w is the narrower side), its base on top of
 *   the shopfront's tallest piece on that face (glass, awning, fascia sign) and never under the ground slot's `top_m`, its top at or under the roof piece's base, its extent along the wall at most the shop's (W1: 5 m, 10 m
 *   for a double), its front at most `CELL_M` past the front cell edge (T1), clear of every placed piece nearby (touching within `TOL` is not a clash); street fronts only, never on an escape's column (EP); no bracket.
 * - **RC, cap placed last.** A face sign is placed after the roofs, only where its column (the shop's first cell) still has room under `DRESS_PER_BAY_MAX` with every merged piece counted; one the cap turns away is not
 *   placed, and its run takes no other sign.
 */

import type {
  CalibrationKey,
  CityBuildingsLayer,
  CityCell,
  CityColumn,
  CityDressingPiece,
  CityFacadesLayer,
  CityGroundPiece,
  CityMassLayer,
  CityNoveltySign,
  CityPlacement,
  CityRoofPiece,
  CityShop,
  CityWallPiece,
} from "../../core";
import type { StageRand } from "../pipeline/seeds";
import { CELL_M } from "./constants";
import { type Bay, baysOf, placementOf, runsOf } from "./dress";
import { DRESS_PER_BAY_MAX, dressBounds } from "./dresskit";
import { makeCtx } from "./facts";
import { unitOf } from "./hash";
import { FACE_QUARTER_DEG, NOVELTY_BY_KIND, NOVELTY_CHANCE, NOVELTY_ROOF_SHARE, noveltyBounds } from "./noveltykit";
import { PARTY_WALL_KINDS, partyBounds } from "./partykit";
import { keyOf } from "./place";
import { P_ROOF_LARGE, ROOF_EDGE_M } from "./roofkit";
import { type RoofSignPlan, columnLoads, deckOf, roofInsets, signTurn } from "./roofs";
import { CODE_ESCAPE, CODE_ESCAPE_KEY, wallBounds } from "./wallkit";

/** The tolerance of every novelty check, metres: a touch within it is not a clash, an attach within it holds. */
export const TOL = 1e-6;
const EPS = 1e-9;
const HALF = CELL_M / 2;

/** A box in the plan and in height, metres. */
export interface Box3 {
  readonly x0: number;
  readonly x1: number;
  readonly y0: number;
  readonly y1: number;
  readonly z0: number;
  readonly z1: number;
}

/** A placed piece's box: its bounds about its pivot (the bounds' centre in x and z, base at y), a quarter turn swapping width and depth, its height scaled by `scaleY`. */
export function boxAt(p: CityPlacement, w: number, h: number, d: number, scaleY = 1): Box3 {
  const q = (((Math.round(p.yaw_deg / 90) % 4) + 4) % 4) & 1;
  const dx = q === 1 ? d : w;
  const dz = q === 1 ? w : d;
  return { x0: p.x_m - dx / 2, x1: p.x_m + dx / 2, y0: p.y_m, y1: p.y_m + h * scaleY, z0: p.z_m - dz / 2, z1: p.z_m + dz / 2 };
}

/** Two boxes overlap when they overlap by more than `TOL` on every axis. */
export const overlaps = (a: Box3, b: Box3): boolean => Math.min(a.x1, b.x1) - Math.max(a.x0, b.x0) > TOL && Math.min(a.y1, b.y1) - Math.max(a.y0, b.y0) > TOL && Math.min(a.z1, b.z1) - Math.max(a.z0, b.z0) > TOL;

/** The boxes of a wall piece: its key's bounds (a code-drawn escape: one box over its footprint and height); none for a key without bounds. */
function wallBoxes(p: CityWallPiece): Box3[] {
  if (p.placement.key === CODE_ESCAPE_KEY) {
    const top = Math.max(0, ...p.boxes.map((b) => b.y_m + b.h_m / 2));
    return [boxAt({ ...p.placement }, CODE_ESCAPE.w, top, CODE_ESCAPE.d)];
  }
  if (PARTY_WALL_KINDS.includes(p.kind)) {
    const e = partyBounds(p.placement.key);
    return [boxAt(p.placement, e.w, e.h, e.d, p.scaleY)];
  }
  const e = wallBounds(p.placement.key);
  return [boxAt(p.placement, e.w, e.h, e.d, p.scaleY)];
}

/** Every placed dressing and wall piece's box, by the key of the cell the piece stands on. */
export function placedBoxes(layer: Pick<CityFacadesLayer, "dressing" | "walls">): Map<string, Box3[]> {
  const out = new Map<string, Box3[]>();
  const add = (c: CityCell, b: Box3[]): void => void (out.get(keyOf(c)) ?? out.set(keyOf(c), []).get(keyOf(c))!).push(...b);
  for (const p of layer.dressing ?? []) {
    const e = dressBounds(p.placement.key);
    add(p.cell, [boxAt(p.placement, e.w, e.h, e.d)]);
  }
  for (const p of layer.walls ?? []) add(p.cell, wallBoxes(p));
  return out;
}

/** The boxes on the cells of `cells` and on every cell next to them. */
export function nearBoxes(index: ReadonlyMap<string, readonly Box3[]>, cells: readonly CityCell[]): Box3[] {
  const seen = new Set<string>();
  const out: Box3[] = [];
  for (const c of cells) {
    for (let di = -1; di <= 1; di++) {
      for (let dj = -1; dj <= 1; dj++) {
        const k = keyOf({ i: c.i + di, j: c.j + dj });
        if (seen.has(k)) continue;
        seen.add(k);
        out.push(...(index.get(k) ?? []));
      }
    }
  }
  return out;
}

/** H1b's pieces by the key of the cell they stand on. */
export function dressingByCell(dressing: readonly CityDressingPiece[]): Map<string, CityDressingPiece[]> {
  const out = new Map<string, CityDressingPiece[]>();
  for (const p of dressing) (out.get(keyOf(p.cell)) ?? out.set(keyOf(p.cell), []).get(keyOf(p.cell))!).push(p);
  return out;
}

/** F's base: the top of the shopfront's tallest piece on the bay's first cell (glass, awning, fascia sign), and never under the ground slot's `top_m`. World metres. */
export function faceBase(bay: Bay, dressAt: ReadonlyMap<string, readonly CityDressingPiece[]>): number {
  let y = bay.col.ground.top_m;
  for (const p of dressAt.get(keyOf(bay.g.cells[0]!)) ?? []) {
    if (p.kind !== "glass" && p.kind !== "awning" && p.kind !== "fasciaSign") continue;
    y = Math.max(y, p.placement.y_m + dressBounds(p.placement.key).h);
  }
  return y;
}

/** What F does with one key on one bay: the placement, or the first part that turned it away. */
export type FaceFit = { readonly ok: true; readonly placement: CityPlacement } | { readonly ok: false; readonly why: "span" | "reach" | "top" | "clash" };

/** F's quarter and extents for a key: turned where its w is the narrower side, so that its larger side runs along the wall. */
export function faceExtent(key: CalibrationKey): { turned: boolean; along: number; out: number; h: number } {
  const e = noveltyBounds(key);
  const turned = e.w < e.d;
  return { turned, along: turned ? e.d : e.w, out: turned ? e.w : e.d, h: e.h };
}

/** F for `key` on `bay` with its base at `base`, against the boxes `near`: pure maths on the kit's bounds. */
export function faceFit(bay: Bay, key: CalibrationKey, base: number, near: readonly Box3[]): FaceFit {
  const f = bay.frame;
  const x = faceExtent(key);
  if (x.along > CELL_M * bay.g.cells.length + EPS) return { ok: false, why: "span" };
  if (f.floorFront + x.out - HALF > CELL_M + EPS) return { ok: false, why: "reach" };
  if (base + x.h > bay.roofY + EPS) return { ok: false, why: "top" };
  const at = placementOf(f, key, 0, base - f.yM, f.floorFront + x.out / 2);
  const placement: CityPlacement = { ...at, y_m: base, yaw_deg: (bay.col.yaw + (x.turned ? FACE_QUARTER_DEG : 0)) % 360 };
  const e = noveltyBounds(key);
  const box = boxAt(placement, e.w, e.h, e.d);
  if (near.some((b) => overlaps(box, b))) return { ok: false, why: "clash" };
  return { ok: true, placement };
}

/** `xs` rotated to start at a hashed index: a deterministic order that tries every element once. */
function rotated<T>(xs: readonly T[], hash: number): T[] {
  if (xs.length === 0) return [];
  const s = Math.min(xs.length - 1, Math.floor(unitOf(hash) * xs.length));
  return [...xs.slice(s), ...xs.slice(0, s)];
}

/** What the plan counted (reported, never asserted). */
export interface NoveltyStats {
  /** Shops, shops whose kind has keys, and tries (a shop under `NOVELTY_CHANCE`, in a run with no sign yet). */
  shops: number;
  withKeys: number;
  tries: number;
  /** Face spots turned away because the shop is not on a street front (or is a bay of no street) or stands on an escape's column. */
  faceNoSpot: number;
  /** Key tries on a face turned away, by F's first failing part. */
  faceTurned: { span: number; reach: number; top: number; clash: number };
  /** Roof tries turned away: the building drew no `P_ROOF_LARGE`; the shop is a corner; no key fits the deck, or fits only without the RK inset; the column has no room (RC). */
  roofTurned: { noDraw: number; corner: number; deck: number; rk: number; rc: number };
  /** Tries that got no spot at all, signs planned (face and roof), and face signs the cap turned away after the roofs. */
  noSpot: number;
  plannedFace: number;
  plannedRoof: number;
  capTurned: number;
}

const emptyStats = (): NoveltyStats => ({
  shops: 0,
  withKeys: 0,
  tries: 0,
  faceNoSpot: 0,
  faceTurned: { span: 0, reach: 0, top: 0, clash: 0 },
  roofTurned: { noDraw: 0, corner: 0, deck: 0, rk: 0, rc: 0 },
  noSpot: 0,
  plannedFace: 0,
  plannedRoof: 0,
  capTurned: 0,
});

/** A face sign the plan chose, before the cap. */
export interface PlannedFace {
  readonly building: string;
  readonly shop: CityShop;
  readonly column: CityColumn;
  readonly placement: CityPlacement;
}

export interface NoveltyPlan {
  readonly faces: readonly PlannedFace[];
  /** The roof signs by building id, for `buildRoofs`. */
  readonly roofs: ReadonlyMap<string, RoofSignPlan>;
  readonly stats: NoveltyStats;
}

/** The layers the plan reads. */
export type NoveltyInput = Required<Pick<CityFacadesLayer, "ground" | "dressing" | "walls" | "shops">>;

/** NP: the plan, made before the roofs (see the module comment). */
export function planNovelty(mass: Pick<CityMassLayer, "cells" | "built">, buildings: Pick<CityBuildingsLayer, "rows" | "columns" | "buildings">, layer: NoveltyInput, rand: StageRand): NoveltyPlan {
  const ctx = makeCtx(mass, buildings);
  const stats = emptyStats();
  const runOf = runsOf(buildings);
  const insets = roofInsets(layer.walls);
  const load = columnLoads(layer, buildings);
  const index = placedBoxes(layer);
  const dressAt = dressingByCell(layer.dressing);
  const escapes = new Set(layer.walls.filter((p) => p.kind === "escape").map((p) => keyOf(p.cell)));
  const groundOf = new Map<string, CityGroundPiece[]>();
  for (const g of layer.ground) (groundOf.get(g.building) ?? groundOf.set(g.building, []).get(g.building)!).push(g);
  const shopsOf = new Map<string, CityShop[]>();
  for (const s of layer.shops) (shopsOf.get(s.building) ?? shopsOf.set(s.building, []).get(s.building)!).push(s);

  const faces: PlannedFace[] = [];
  const roofs = new Map<string, RoofSignPlan>();
  const runDone = new Set<string>();

  for (const b of buildings.buildings) {
    const run = runOf.get(b.id) ?? b.id;
    const mine = shopsOf.get(b.id) ?? [];
    stats.shops += mine.length;
    if (runDone.has(run) || mine.length === 0) continue;
    const bays = new Map(baysOf(ctx, b, groundOf.get(b.id) ?? []).map((x) => [keyOf(x.g.cells[0]!), x] as const));
    for (const shop of mine) {
      const kinds = NOVELTY_BY_KIND[shop.kind];
      if (kinds.length === 0) continue;
      stats.withKeys++;
      const first = shop.cells[0]!;
      if (unitOf(rand("novelty", "chance", b.id, first.i, first.j)) >= NOVELTY_CHANCE) continue;
      stats.tries++;
      const keys = rotated(kinds, rand("novelty", "key", b.id, first.i, first.j));
      const roofFirst = unitOf(rand("novelty", "roof", b.id, first.i, first.j)) < NOVELTY_ROOF_SHARE;

      const tryRoof = (): boolean => {
        if (unitOf(rand("roof", "large", b.id)) >= P_ROOF_LARGE) {
          stats.roofTurned.noDraw++;
          return false;
        }
        const cols = shop.cells.map((c) => ctx.col.get(keyOf(c))!);
        const at = cols.findIndex((c) => c.kind === "mid");
        if (at < 0) {
          stats.roofTurned.corner++;
          return false;
        }
        const col = cols[at]!;
        const deck = deckOf(col, insets, ROOF_EDGE_M);
        const key = keys.find((k) => signTurn(deck, k) !== null);
        if (key === undefined) {
          if (keys.some((k) => signTurn(deckOf(col, new Map(), ROOF_EDGE_M), k) !== null)) stats.roofTurned.rk++;
          else stats.roofTurned.deck++;
          return false;
        }
        if ((load.get(keyOf(col)) ?? 0) + 1 > DRESS_PER_BAY_MAX) {
          stats.roofTurned.rc++;
          return false;
        }
        roofs.set(b.id, { n: b.cells.findIndex((c) => keyOf(c) === keyOf(col)), key });
        stats.plannedRoof++;
        return true;
      };
      const tryFace = (): boolean => {
        const bay = bays.get(keyOf(first));
        if (!bay || bay.kind === "door" || !bay.frontStreet || bay.g.frontage !== "street" || bay.g.cells.some((c) => escapes.has(keyOf(c)))) {
          stats.faceNoSpot++;
          return false;
        }
        const base = faceBase(bay, dressAt);
        const near = nearBoxes(index, bay.g.cells);
        for (const key of keys) {
          const r = faceFit(bay, key, base, near);
          if (r.ok) {
            faces.push({ building: b.id, shop, column: bay.col, placement: { ...r.placement, key } });
            stats.plannedFace++;
            return true;
          }
          stats.faceTurned[r.why]++;
        }
        return false;
      };
      const got = roofFirst ? tryRoof() || tryFace() : tryFace() || tryRoof();
      if (got) {
        runDone.add(run);
        break;
      }
      stats.noSpot++;
    }
  }
  return { faces, roofs, stats };
}

/** RC: what each column holds against `DRESS_PER_BAY_MAX` with the roof pieces counted too. */
export function loadsWithRoofs(layer: Pick<CityFacadesLayer, "dressing" | "walls">, buildings: Pick<CityBuildingsLayer, "columns">, roofs: readonly CityRoofPiece[]): Map<string, number> {
  const load = columnLoads(layer, buildings);
  for (const p of roofs) load.set(keyOf(p.cell), (load.get(keyOf(p.cell)) ?? 0) + 1);
  return load;
}

/** The face signs, placed after the roofs: a planned sign whose column has no room left is turned away (counted in `stats.capTurned`). In `plan`'s order: building by building, then along the row. */
export function placeFaceSigns(
  plan: NoveltyPlan,
  roofs: readonly CityRoofPiece[],
  layer: Pick<CityFacadesLayer, "dressing" | "walls">,
  buildings: Pick<CityBuildingsLayer, "columns" | "buildings">,
): { novelty: CityNoveltySign[]; stats: NoveltyStats } {
  const load = loadsWithRoofs(layer, buildings, roofs);
  const out: CityNoveltySign[] = [];
  let capTurned = 0;
  for (const f of plan.faces) {
    const cell: CityCell = { i: f.shop.cells[0]!.i, j: f.shop.cells[0]!.j };
    const k = keyOf(cell);
    if ((load.get(k) ?? 0) + 1 > DRESS_PER_BAY_MAX) {
      capTurned++;
      continue;
    }
    load.set(k, (load.get(k) ?? 0) + 1);
    out.push({ building: f.building, cell, face: f.column.front, kind: f.shop.kind, placement: f.placement });
  }
  return { novelty: out, stats: { ...plan.stats, capTurned } };
}
