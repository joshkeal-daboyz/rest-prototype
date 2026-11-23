/**
 * Stage 12, section E2, the "settle" step: camps, water towers, farms and irrigators, market stalls, containers, clutter and roof items, each with its removes (ticket 073 E2). Pure.
 *
 * Every chance reads the district's `held` only (X-6). A piece stands only where the kit table says, clear of the clean pieces and of the circuit (T-1), and never scaled. The pass writes only adds and `remove`s:
 * a farm's park props, a stall's place props.
 *
 * Where each goes:
 * - camp: a court's apron, lawn and paths, or a park that is not a farm; inside the place's cells, `CAMP_BUILDING_GAP_M` off any building, `CAMP_GAP_M` apart, `CLEAN_GAP_M` clear of the place's clean props.
 * - water tower: on the ground in a court, one per court at most, placed before the court's camps.
 * - farm and irrigator: a park's green interior; only a piece whose footprint after its turn fits inside it; the park's props are removed.
 * - stall: one `Bld_Market_Stall_02` per plaza or front lot; the props it stands on are removed. A front lot with a stall takes no container.
 * - container: one per court parking bay or kerb bay, centred.
 * - clutter: one per pavement cell at most, on a hashed spot that keeps the cell's middle clear (T-2).
 * - roof: `Solar_Panel_02`, `Fabric_01` or `_02` on a roof deck, up to 2 a column.
 */

import type { CalibrationKey, CityChange, CityEraPiece, CityHoldoutPieceKind, CityPlacement } from "../../core";
import type { StageRand } from "../pipeline/seeds";
import {
  BAND_HIGH,
  BAND_MID,
  CAMP_ATTEMPTS,
  CAMP_BUILDING_GAP_M,
  CAMP_GAP_M,
  CELL_INSET_M,
  CELL_M,
  CENTRE_CLEAR_M,
  CIRCUIT_CLEAR_M,
  CLEAN_GAP_M,
  CLUTTER_TRIES,
  FARM_ATTEMPTS,
  FARM_GAP_M,
  P_CLUTTER,
  P_CONTAINER,
  P_ROOF,
  ROOF_GAP_M,
  ROOF_PER_COLUMN_MAX,
  ROOF_TRIES,
  STALL_TRIES,
  TOWER_TRIES,
  TRIES,
} from "./constants";
import { cellKey, cellOfPoint, cellRect, cellsOver, grow, inside, overlaps, rectAt, snap, turned, type Rect } from "./geom";
import { CAMP_KEYS, CLUTTER_KEYS, CONTAINER_KEYS, FARM_KEYS, IRRIGATOR_KEYS, KIT, ROOF_KEYS, STALL_KEY, WATER_TOWER_KEY } from "./kit";
import { circuitHit } from "./guard";
import { drawsOf } from "./rng";
import { meetsBuilding, meetsFacade, type World } from "./world";

type HoldoutPiece = CityEraPiece<CityHoldoutPieceKind>;

/** What the settle step wrote, and what it left out (reported, not asserted). */
export interface SettleResult {
  readonly adds: readonly HoldoutPiece[];
  readonly changes: readonly CityChange[];
  readonly stats: SettleStats;
}

export interface SettleStats {
  /** Courts and parks that were offered camps, and those that got at least one. */
  campPlaces: number;
  campPlacesFilled: number;
  /** Parks at the farm band, and those that fitted at least one piece. */
  farmParks: number;
  farmParksFilled: number;
  /** Plazas and front lots at the stall band. */
  stallPlaces: number;
  /** Bays and pavement cells that rolled a piece but found no room, and roof spots likewise. */
  containersNoRoom: number;
  clutterNoRoom: number;
  roofNoRoom: number;
  /** Props removed by farms and by stalls. */
  farmRemoves: number;
  stallRemoves: number;
}

const YAWS = [0, 90, 180, 270] as const;

export function settle(world: World, rand: StageRand): SettleResult {
  const adds: HoldoutPiece[] = [];
  const changes: CityChange[] = [];
  const stats: SettleStats = { campPlaces: 0, campPlacesFilled: 0, farmParks: 0, farmParksFilled: 0, stallPlaces: 0, containersNoRoom: 0, clutterNoRoom: 0, roofNoRoom: 0, farmRemoves: 0, stallRemoves: 0 };
  const { u, pick } = drawsOf(rand);
  const heldOf = (block: string): { id: string; held: number } | null => {
    const d = world.districtOfBlock.get(block);
    return d === undefined ? null : { id: d.id, held: d.held };
  };

  const make = (kind: CityHoldoutPieceKind, id: string, district: string, key: CalibrationKey, x: number, z: number, yaw: number, y = 0): HoldoutPiece => {
    const k = KIT[key]!;
    const t = turned(k.w, k.d, yaw);
    const placement: CityPlacement = { key, x_m: x, y_m: y, z_m: z, yaw_deg: yaw };
    return { id: `holdout:${kind}:${id}`, kind, district, cell: cellOfPoint(x, z), placement, size: { x_m: t.x, z_m: t.z, h_m: k.h } };
  };

  const removedProps = new Set<number>();
  const removeProp = (index: number, key: CalibrationKey): boolean => {
    if (removedProps.has(index)) return false;
    removedProps.add(index);
    changes.push({ ref: { list: "ground.props", index, key }, op: "remove" });
    return true;
  };

  const clearOfClean = (r: Rect, y0: number, y1: number): boolean => !world.obstacles.any(grow(r, CLEAN_GAP_M)) && !meetsFacade(world, r, y0, y1, CLEAN_GAP_M);
  const clearOfCircuit = (r: Rect, top: number): boolean => !circuitHit(world.circuit, r, top, CIRCUIT_CLEAR_M);

  // ---- courts: the water tower first, then the camps; parks: a farm or the camps ----
  const camp = (placeId: string, cells: readonly { i: number; j: number }[], held: number, districtId: string, placed: Rect[]): void => {
    if (cells.length === 0) return;
    const set = new Set(cells.map((c) => cellKey(c.i, c.j)));
    const insideCells = (r: Rect): boolean => cellsOver(r).every((c) => set.has(cellKey(c.i, c.j)));
    const bbox: Rect = {
      x0: Math.min(...cells.map((c) => c.i)) * CELL_M,
      x1: (Math.max(...cells.map((c) => c.i)) + 1) * CELL_M,
      z0: Math.min(...cells.map((c) => c.j)) * CELL_M,
      z1: (Math.max(...cells.map((c) => c.j)) + 1) * CELL_M,
    };
    const budget = held * cells.length * CELL_M * CELL_M;
    let used = 0;
    const n0 = adds.length;
    stats.campPlaces++;
    for (let n = 0; n < CAMP_ATTEMPTS; n++) {
      const key = pick(CAMP_KEYS, "camp", placeId, n, "key");
      const yaw = pick(YAWS, "camp", placeId, n, "yaw");
      const k = KIT[key]!;
      const t = turned(k.w, k.d, yaw);
      const area = t.x * t.z;
      if (used + area > budget) break;
      const spanX = bbox.x1 - bbox.x0 - t.x;
      const spanZ = bbox.z1 - bbox.z0 - t.z;
      if (spanX < 0 || spanZ < 0) continue;
      for (let tr = 0; tr < TRIES; tr++) {
        const x = snap(bbox.x0 + t.x / 2 + u("camp", placeId, n, "x", tr) * spanX);
        const z = snap(bbox.z0 + t.z / 2 + u("camp", placeId, n, "z", tr) * spanZ);
        const r = rectAt(x, z, t.x, t.z);
        if (!insideCells(r)) continue;
        if (meetsBuilding(world, r, CAMP_BUILDING_GAP_M)) continue;
        if (!clearOfClean(r, 0, k.h)) continue;
        if (placed.some((p) => overlaps(grow(r, CAMP_GAP_M), p))) continue;
        if (!clearOfCircuit(r, k.h)) continue;
        placed.push(r);
        used += area;
        adds.push(make("camp", `${cellOfPoint(x, z).i},${cellOfPoint(x, z).j}`, districtId, key, x, z, yaw));
        break;
      }
    }
    if (adds.length > n0) stats.campPlacesFilled++;
  };

  for (const court of world.courts) {
    const h = heldOf(court.block);
    if (h === null || h.held <= 0) continue;
    const placed: Rect[] = [];
    if (h.held >= BAND_MID) {
      const set = new Set(court.cells.map((c) => cellKey(c.i, c.j)));
      const k = KIT[WATER_TOWER_KEY]!;
      const bbox: Rect = {
        x0: Math.min(...court.cells.map((c) => c.i)) * CELL_M,
        x1: (Math.max(...court.cells.map((c) => c.i)) + 1) * CELL_M,
        z0: Math.min(...court.cells.map((c) => c.j)) * CELL_M,
        z1: (Math.max(...court.cells.map((c) => c.j)) + 1) * CELL_M,
      };
      const spanX = bbox.x1 - bbox.x0 - k.w;
      const spanZ = bbox.z1 - bbox.z0 - k.d;
      if (spanX >= 0 && spanZ >= 0) {
        for (let tr = 0; tr < TOWER_TRIES; tr++) {
          const x = snap(bbox.x0 + k.w / 2 + u("tower", court.id, "x", tr) * spanX);
          const z = snap(bbox.z0 + k.d / 2 + u("tower", court.id, "z", tr) * spanZ);
          const r = rectAt(x, z, k.w, k.d);
          if (!cellsOver(r).every((c) => set.has(cellKey(c.i, c.j)))) continue;
          if (meetsBuilding(world, r, CAMP_BUILDING_GAP_M)) continue;
          if (!clearOfClean(r, 0, k.h)) continue;
          if (!clearOfCircuit(r, k.h)) continue;
          placed.push(r);
          adds.push(make("water-tower", court.id, h.id, WATER_TOWER_KEY, x, z, 0));
          break;
        }
      }
    }
    camp(court.id, court.cells, h.held, h.id, placed);
  }

  for (const park of world.parks) {
    const h = heldOf(park.block);
    if (h === null || h.held <= 0) continue;
    if (h.held >= BAND_HIGH) {
      stats.farmParks++;
      if (farm(park.id, park.rect, h.id)) {
        stats.farmParksFilled++;
        continue;
      }
    }
    camp(park.id, park.cells, h.held, h.id, []);
  }

  /** Fills a park's interior with field pieces, each with its irrigator, and removes the park's props. False when no piece fits. */
  function farm(parkId: string, rect: Rect | null, districtId: string): boolean {
    if (rect === null) return false;
    const fields: { rect: Rect; key: CalibrationKey; x: number; z: number; yaw: number }[] = [];
    for (let n = 0; n < FARM_ATTEMPTS; n++) {
      const key = pick(FARM_KEYS, "farm", parkId, n, "key");
      const yaw = pick([0, 90] as const, "farm", parkId, n, "yaw");
      const k = KIT[key]!;
      const t = turned(k.w, k.d, yaw);
      const spanX = rect.x1 - rect.x0 - t.x;
      const spanZ = rect.z1 - rect.z0 - t.z;
      if (spanX < 0 || spanZ < 0) continue;
      for (let tr = 0; tr < TRIES; tr++) {
        const x = snap(rect.x0 + t.x / 2 + u("farm", parkId, n, "x", tr) * spanX);
        const z = snap(rect.z0 + t.z / 2 + u("farm", parkId, n, "z", tr) * spanZ);
        const r = rectAt(x, z, t.x, t.z);
        if (!inside(r, rect)) continue;
        if (meetsFacade(world, r, 0, k.h, CLEAN_GAP_M)) continue;
        if (fields.some((f) => overlaps(grow(r, FARM_GAP_M), f.rect))) continue;
        if (!clearOfCircuit(r, k.h)) continue;
        fields.push({ rect: r, key, x, z, yaw });
        break;
      }
    }
    if (fields.length === 0) return false;
    fields.forEach((f, n) => {
      adds.push(make("farm", `${parkId}:${n}`, districtId, f.key, f.x, f.z, f.yaw));
      const wide = f.rect.x1 - f.rect.x0 >= f.rect.z1 - f.rect.z0;
      const order = [pick(IRRIGATOR_KEYS, "irrigator", parkId, n, "key"), ...IRRIGATOR_KEYS];
      for (const ik of order) {
        const ikit = KIT[ik]!;
        // The boom's long side runs along the field's longer side.
        const yaw = (ikit.d >= ikit.w) === wide ? 90 : 0;
        const t = turned(ikit.w, ikit.d, yaw);
        const r = rectAt(f.x, f.z, t.x, t.z);
        if (!inside(r, f.rect) || !clearOfCircuit(r, ikit.h) || meetsFacade(world, r, 0, ikit.h, CLEAN_GAP_M)) continue;
        adds.push(make("irrigator", `${parkId}:${n}`, districtId, ik, f.x, f.z, yaw));
        break;
      }
    });
    for (const e of world.propsByHost.get(parkId) ?? []) if (removeProp(e.index, e.prop.placement.key)) stats.farmRemoves++;
    return true;
  }

  // ---- stalls: one per plaza or front lot ----
  const stalled = new Set<string>();
  for (const sq of world.squares) {
    const h = heldOf(sq.block);
    if (h === null || h.held < BAND_MID) continue;
    stats.stallPlaces++;
    const k = KIT[STALL_KEY]!;
    const props = (world.propsByHost.get(sq.id) ?? []).filter((e) => !e.prop.flat);
    let best: { x: number; z: number; yaw: number; hits: number } | null = null;
    for (let tr = 0; tr < STALL_TRIES; tr++) {
      const yaw = pick(YAWS, "stall", sq.id, tr, "yaw");
      const t = turned(k.w, k.d, yaw);
      const spanX = sq.rect.x1 - sq.rect.x0 - t.x;
      const spanZ = sq.rect.z1 - sq.rect.z0 - t.z;
      if (spanX < 0 || spanZ < 0) continue;
      const x = snap(sq.rect.x0 + t.x / 2 + u("stall", sq.id, tr, "x") * spanX);
      const z = snap(sq.rect.z0 + t.z / 2 + u("stall", sq.id, tr, "z") * spanZ);
      const r = rectAt(x, z, t.x, t.z);
      if (!inside(r, sq.rect) || !clearOfCircuit(r, k.h) || meetsFacade(world, r, 0, k.h, CLEAN_GAP_M)) continue;
      const hits = props.filter((e) => overlaps(e.rect, r)).length;
      if (best === null || hits < best.hits) best = { x, z, yaw, hits };
    }
    if (best === null) continue;
    adds.push(make("stall", sq.id, h.id, STALL_KEY, best.x, best.z, best.yaw));
    stalled.add(sq.id);
    const r = rectAt(best.x, best.z, turned(k.w, k.d, best.yaw).x, turned(k.w, k.d, best.yaw).z);
    for (const e of props) if (overlaps(e.rect, r) && removeProp(e.index, e.prop.placement.key)) stats.stallRemoves++;
  }

  // ---- containers: one per court stall or kerb bay ----
  for (const bay of world.bays) {
    const h = heldOf(bay.block);
    if (h === null || h.held <= 0) continue;
    if (bay.court !== null && stalled.has(bay.court)) continue;
    if (u("container", bay.id, "p") >= P_CONTAINER * h.held) continue;
    const key = pick(CONTAINER_KEYS, "container", bay.id, "key");
    const k = KIT[key]!;
    // The container's long side runs across the bay: along z for bays that run along x.
    const yaw = (bay.alongX ? 0 : 90) + pick([0, 180] as const, "container", bay.id, "flip");
    const t = turned(k.w, k.d, yaw);
    const r = rectAt(bay.x, bay.z, t.x, t.z);
    const bayRect = rectAt(bay.x, bay.z, bay.alongX ? bay.along : bay.across, bay.alongX ? bay.across : bay.along);
    if (!inside(r, bayRect) || !clearOfClean(r, 0, k.h) || !clearOfCircuit(r, k.h)) {
      stats.containersNoRoom++;
      continue;
    }
    adds.push(make("container", `${Math.round(bay.x * 10)},${Math.round(bay.z * 10)}`, h.id, key, bay.x, bay.z, yaw));
  }

  // ---- clutter: one per pavement cell at most ----
  for (const pc of world.pavement) {
    const h = heldOf(pc.block);
    if (h === null || h.held <= 0) continue;
    if (u("clutter", pc.i, pc.j, "p") >= P_CLUTTER * h.held) continue;
    const key = pick(CLUTTER_KEYS, "clutter", pc.i, pc.j, "key");
    const k = KIT[key]!;
    const cell = cellRect(pc.i, pc.j);
    const cx = (cell.x0 + cell.x1) / 2;
    const cz = (cell.z0 + cell.z1) / 2;
    let done = false;
    for (let tr = 0; tr < CLUTTER_TRIES && !done; tr++) {
      const yaw = pick(YAWS, "clutter", pc.i, pc.j, tr, "yaw");
      const t = turned(k.w, k.d, yaw);
      const x = snap(cell.x0 + CELL_INSET_M + t.x / 2 + u("clutter", pc.i, pc.j, tr, "x") * (CELL_M - 2 * CELL_INSET_M - t.x));
      const z = snap(cell.z0 + CELL_INSET_M + t.z / 2 + u("clutter", pc.i, pc.j, tr, "z") * (CELL_M - 2 * CELL_INSET_M - t.z));
      const r = rectAt(x, z, t.x, t.z);
      if (!inside(r, grow(cell, -CELL_INSET_M + 1e-9))) continue;
      // The cell's middle stays open (T-2 closes a cell whose middle a ground piece covers).
      if (Math.abs(cx - x) <= t.x / 2 + CENTRE_CLEAR_M && Math.abs(cz - z) <= t.z / 2 + CENTRE_CLEAR_M) continue;
      if (!clearOfClean(r, 0, k.h) || !clearOfCircuit(r, k.h)) continue;
      adds.push(make("clutter", `${pc.i},${pc.j}`, h.id, key, x, z, yaw));
      done = true;
    }
    if (!done) stats.clutterNoRoom++;
  }

  // ---- roof items: up to two a column ----
  for (const deck of world.decks) {
    const h = heldOf(deck.block);
    if (h === null || h.held <= 0) continue;
    const taken: Rect[] = [...deck.taken];
    for (let slot = 0; slot < ROOF_PER_COLUMN_MAX; slot++) {
      if (u("roof", deck.building, deck.i, deck.j, slot, "p") >= P_ROOF * h.held) continue;
      const key = pick(ROOF_KEYS, "roof", deck.building, deck.i, deck.j, slot, "key");
      const yaw = pick(YAWS, "roof", deck.building, deck.i, deck.j, slot, "yaw");
      const k = KIT[key]!;
      const t = turned(k.w, k.d, yaw);
      const spanX = deck.rect.x1 - deck.rect.x0 - t.x;
      const spanZ = deck.rect.z1 - deck.rect.z0 - t.z;
      let done = false;
      if (spanX >= 0 && spanZ >= 0) {
        for (let tr = 0; tr < ROOF_TRIES && !done; tr++) {
          const x = snap(deck.rect.x0 + t.x / 2 + u("roof", deck.building, deck.i, deck.j, slot, "x", tr) * spanX);
          const z = snap(deck.rect.z0 + t.z / 2 + u("roof", deck.building, deck.i, deck.j, slot, "z", tr) * spanZ);
          const r = rectAt(x, z, t.x, t.z);
          if (!inside(r, deck.rect)) continue;
          if (taken.some((p) => overlaps(grow(r, ROOF_GAP_M), p))) continue;
          if (!clearOfCircuit(r, deck.y + k.h) || meetsFacade(world, r, deck.y, deck.y + k.h, CLEAN_GAP_M, true)) continue;
          taken.push(r);
          adds.push(make("roof", `${deck.i},${deck.j}:${slot}`, h.id, key, x, z, yaw, deck.y));
          done = true;
        }
      }
      if (!done) stats.roofNoRoom++;
    }
  }

  return { adds, changes, stats };
}
