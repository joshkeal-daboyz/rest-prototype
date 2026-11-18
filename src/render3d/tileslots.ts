/**
 * The tile city's keys and flags (ticket 055, section C). Pure: no three, no DOM, no assets. Which City Pack piece draws each tile role, which way each piece's own
 * front must be turned to sit on its cell, which level it stands at, how many draw calls the tiles may take, and the page's flags (`city=tiles`).
 *
 * Every key is the City Pack's (`city-pack`, 5 m squares, finding 2 of the ticket). Their orientation cannot be read from bounds: it is confirmed by eye on the tile sheet
 * (`&city=tiles&sheet=1`), and a wrong one is corrected here as one `TILE_FRONTS` line.
 */

import type { CalibrationKey } from "../core";
import { CITY_BLOCKS_DEFAULT, CITY_BLOCKS_MAX, type TileRole } from "./tilecity";

/** The pack every tile is drawn from. */
export const TILE_PACK = "city-pack";

const k = (name: string): CalibrationKey => `${TILE_PACK}:${name}`;

/**
 * The keys of each role, in the order a cell's variant picks them (`tilecity.ts`: a lane cell's `LANE_RIGHT` bit picks the first or second, a pavement cell's variant
 * 0, 1 or 2 picks Straight_01, Straight_02 or the grate). A role whose keys are all missing or failed is drawn in code, cell by cell. `junction` and `lotSurface`
 * share `Road_Bare_01` (the ticket's own design), so they are present or absent together.
 */
export const TILE_SLOTS: Readonly<Record<TileRole, readonly CalibrationKey[]>> = {
  lane: [k("SM_Env_Road_Lines_01"), k("SM_Env_Road_Lines_02")],
  parking: [k("SM_Env_Road_ParkingLines_01")],
  parkingPlain: [k("SM_Env_Road_01")],
  junction: [k("SM_Env_Road_Bare_01")],
  crossing: [k("SM_Env_Road_Crossing_01")],
  pavement: [k("SM_Env_Sidewalk_Straight_01"), k("SM_Env_Sidewalk_Straight_02"), k("SM_Env_Sidewalk_Grate_01")],
  pavementCorner: [k("SM_Env_Sidewalk_Dip_Corner_01")],
  kerbCut: [k("SM_Env_Sidewalk_Dip_01")],
  lotSurface: [k("SM_Env_Road_Bare_01")],
  plaza: [k("SM_Env_Sidewalk_Panel_01")],
};

/** The pothole-patch decal (1.8 m, no height) laid on a lane cell whose `variant` has `LANE_PATCH`. Optional: with no model there is no decal and no code-drawn stand-in. */
export const TILE_PATCH: CalibrationKey = k("SM_Env_Road_Patch_01");

/** Pieces the tile sheet shows that no role uses yet: the plain corner (the fallback if the Dip corner is not a ramp). */
export const TILE_SHEET_EXTRA: readonly CalibrationKey[] = [k("SM_Env_Sidewalk_Corner_01"), TILE_PATCH];

/**
 * The turn, degrees, added to a cell's yaw so the piece's own front lies where the role says (`tilecity.ts` header: lane and parking, toward the street's centre line;
 * pavement and kerb cut, toward the carriageway; crossing, along the walkers' direction; corner, its two kerb edges on +x and +z at yaw 0). Empty until the tile sheet
 * has been checked by eye: a piece with no line is not turned.
 */
export const TILE_FRONTS: Readonly<Partial<Record<CalibrationKey, 0 | 90 | 180 | 270>>> = {};

/** The turn of a piece, degrees (0 when its key has no line). */
export function tileFront(key: CalibrationKey, fronts: Readonly<Partial<Record<CalibrationKey, 0 | 90 | 180 | 270>>> = TILE_FRONTS): number {
  return Object.prototype.hasOwnProperty.call(fronts, key) ? (fronts[key] ?? 0) : 0;
}

/**
 * Where a role's surface stands (design item 7): `carriage` roads at the sidewalk tile's height below the pavement top, `pavement` pieces with their top at 0, `ground`
 * (a parking lot's surface) at 0 beside the pavement.
 */
export type TileLevel = "carriage" | "pavement" | "ground";
export const TILE_LEVELS: Readonly<Record<TileRole, TileLevel>> = {
  lane: "carriage",
  parking: "carriage",
  parkingPlain: "carriage",
  junction: "carriage",
  crossing: "carriage",
  pavement: "pavement",
  pavementCorner: "pavement",
  kerbCut: "pavement",
  lotSurface: "ground",
  plaza: "pavement",
};

/** The most draw calls (InstancedMeshes) the tiles take, pack and code-drawn together. A key is a call per sub-mesh; the keys with the fewest cells are dropped first. */
export const TILE_DRAW_CALLS_MAX = 40;

/** Every key the tile view loads, once each: every role's keys in role order, then the sheet's extras (the plain corner and the patch). */
export function tileKeys(): CalibrationKey[] {
  const out = new Set<CalibrationKey>();
  for (const keys of Object.values(TILE_SLOTS)) for (const key of keys) out.add(key);
  for (const key of TILE_SHEET_EXTRA) out.add(key);
  return [...out];
}

// ---- the tile sheet (what each piece should show, for the eye check) ----

/** What a piece's front means for each role: the arrow on the sheet points along +z, and the piece, turned by its `TILE_FRONTS` line, must show this on the arrow's side. */
export const TILE_FRONT_TEXT: Readonly<Record<TileRole, string>> = {
  lane: "arrow = toward the centre line",
  parking: "arrow = toward the centre line; 2 cells long along x",
  parkingPlain: "arrow = toward the centre line",
  junction: "no front",
  crossing: "arrow = the walkers' direction",
  pavement: "arrow = toward the kerb (the carriageway)",
  pavementCorner: "kerb edges on +x and +z (arrows)",
  kerbCut: "arrow = toward the carriageway (the dip)",
  lotSurface: "no front",
  plaza: "no front",
};

export interface SheetPiece {
  key: CalibrationKey;
  /** Every role that draws this key (empty for an extra piece no role uses yet). */
  roles: readonly TileRole[];
  /** The piece's footprint in cells along x (2 for the parking lines). */
  cells: 1 | 2;
}

/** Every piece the sheet shows, once each, in role order and then the extras: a key several roles share appears once with all of them. */
export function sheetPieces(): SheetPiece[] {
  const out = new Map<CalibrationKey, TileRole[]>();
  for (const role of Object.keys(TILE_SLOTS) as TileRole[]) {
    for (const key of TILE_SLOTS[role]) {
      const list = out.get(key);
      if (list) list.push(role);
      else out.set(key, [role]);
    }
  }
  for (const key of TILE_SHEET_EXTRA) if (!out.has(key)) out.set(key, []);
  return [...out].map(([key, roles]) => ({ key, roles, cells: roles.includes("parking") ? 2 : 1 }));
}

// ---- the page's flags ----

export interface CityTilesRequest {
  blocksX: number;
  blocksZ: number;
  seed: number;
  sheet: boolean;
}

/**
 * What the page asks of the tile city, or null when it does not ask: `city=tiles`, `blocks=WxD` (each clamped to 1..CITY_BLOCKS_MAX; anything else is the default 3 x 3),
 * `seed=N` (an integer; anything else is 1) and `sheet=1`. Pure; renderer.ts passes the address in, behind `import.meta.env.DEV`.
 */
export function cityTilesRequested(search: string): CityTilesRequest | null {
  const q = new URLSearchParams(search);
  if (q.get("city") !== "tiles") return null;
  let blocksX = CITY_BLOCKS_DEFAULT;
  let blocksZ = CITY_BLOCKS_DEFAULT;
  const m = /^(\d+)x(\d+)$/i.exec((q.get("blocks") ?? "").trim());
  if (m) {
    const clamp = (v: number): number => Math.min(CITY_BLOCKS_MAX, Math.max(1, v));
    blocksX = clamp(Number.parseInt(m[1]!, 10));
    blocksZ = clamp(Number.parseInt(m[2]!, 10));
  }
  const seedText = (q.get("seed") ?? "").trim();
  const seed = /^-?\d+$/.test(seedText) ? Number.parseInt(seedText, 10) : 1;
  return { blocksX, blocksZ, seed: Number.isSafeInteger(seed) ? seed : 1, sheet: q.get("sheet") === "1" };
}
