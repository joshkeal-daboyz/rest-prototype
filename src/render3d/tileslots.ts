/**
 * The tile city's keys and flags (ticket 055, section C). Pure: no three, no DOM, no assets. Which City Pack piece draws each tile role, which way each piece's own
 * front must be turned to sit on its cell, which level it stands at, how many draw calls the tiles may take, and the page's flags (`city=tiles`).
 *
 * Every key is the City Pack's (`city-pack`, 5 m squares, finding 2 of the ticket). Their orientation cannot be read from bounds: it is confirmed by eye on the tile sheet
 * (`&city=tiles&sheet=1`), and a wrong one is corrected here as one `TILE_FRONTS` line. Section E added the walking level, the yellow centre line, the sheet's grid and its labels.
 */

import type { CalibrationKey } from "../core";
import { CITY_BLOCKS_DEFAULT, CITY_BLOCKS_MAX, SIDEWALK_WALK_M, TILE_M, type TileRole } from "./tilecity";

/** The pack every tile is drawn from. */
export const TILE_PACK = "city-pack";

const k = (name: string): CalibrationKey => `${TILE_PACK}:${name}`;

/**
 * The keys of each role, in the order a cell's variant picks them (`tilecity.ts`: a lane cell's `LANE_RIGHT` bit picks the first or second, a pavement cell's variant
 * 0, 1 or 2 picks Straight_01, Straight_02 or the grate). A role whose keys are all missing or failed is drawn in code, cell by cell. `junction` and `lotSurface`
 * share `Road_Bare_01` (the ticket's own design), so they are present or absent together.
 */
export const TILE_SLOTS: Readonly<Record<TileRole, readonly CalibrationKey[]>> = {
  lane: [k("SM_Env_Road_YellowLines_01"), k("SM_Env_Road_YellowLines_02")],
  parking: [k("SM_Env_Road_ParkingLines_01")],
  parkingPlain: [k("SM_Env_Road_01")],
  junction: [k("SM_Env_Road_Bare_01")],
  crossing: [k("SM_Env_Road_Crossing_01")],
  pavement: [k("SM_Env_Sidewalk_Straight_01"), k("SM_Env_Sidewalk_Straight_02"), k("SM_Env_Sidewalk_Grate_01")],
  pavementCorner: [k("SM_Env_Sidewalk_Dip_Corner_01")],
  kerbCut: [k("SM_Env_Sidewalk_Dip_01")],
  // 056 B: a build-out is a pavement-level tile in the parking band, drawn from the two plain sidewalk straights it shares with the pavement (its variant's bit 0 picks one). Its kerb edge is the
  // straight's own +z edge, which the cell's yaw already turns toward the street's centre line, so it needs no `TILE_FRONTS` line of its own: the shared keys' (none: unturned) serve both roles.
  buildout: [k("SM_Env_Sidewalk_Straight_01"), k("SM_Env_Sidewalk_Straight_02")],
  lotSurface: [k("SM_Env_Road_Bare_01")],
  plaza: [k("SM_Env_Sidewalk_Panel_01")],
};

/**
 * The street trees of the build-outs (056 B): one of these three stands on each of `city.buildoutTrees`, chosen by hash (`buildoutTreePlan`). They are not a role's keys and not on the tile sheet: the
 * page loads them already as furniture (`furniture.ts` `TREES` names the same three), and the tile view reads them from that set. Pivot centred, minimum y 0, so a tree stands at y 0, the walk.
 */
export const TILE_TREES: readonly CalibrationKey[] = [k("SM_Env_Tree_01"), k("SM_Env_Tree_02"), k("SM_Env_Tree_03")];

/** The pothole-patch decal (1.8 m, no height) laid on a lane cell whose `variant` has `LANE_PATCH`. Optional: with no model there is no decal and no code-drawn stand-in. */
export const TILE_PATCH: CalibrationKey = k("SM_Env_Road_Patch_01");

/**
 * Pieces the tile sheet shows that no role uses: the plain corner (the fallback if the Dip corner is not a ramp), the patch, and the white-line road pieces the yellow ones replaced
 * (E, Q8: `Road_Lines_01/02` have a white edge on both sides and no centre mark, so two lanes of them read as a white double line). The corner stays first: the sheet gives it a second arrow.
 */
export const TILE_SHEET_EXTRA: readonly CalibrationKey[] = [k("SM_Env_Sidewalk_Corner_01"), TILE_PATCH, k("SM_Env_Road_Lines_01"), k("SM_Env_Road_Lines_02")];

/**
 * The turn, degrees, added to a cell's yaw so the piece's own axes land where the role says (`tilecity.ts` header: in a cell's own frame the street runs along x, the front is +z
 * toward the street's centre line for lane and parking cells, toward the carriageway for pavement and kerb-cut cells, and along the walkers' direction for a crossing; a corner has its
 * two kerb edges on +x and +z at yaw 0). A piece with no line is not turned. Read from the converted City Pack geometry (18 Nov 2026; every piece is centred, y up, +z down the page):
 * - `Road_Lines_01`, `Road_Lines_02` and `Road_01` are road pieces whose lines run along the piece's z (the edge strips of the lines pieces are at x = +-2.34 and span z = -2.5..2.5;
 *   `Road_01`'s dashes are on its +x edge). The street must run along x, so they are turned 270: local z lands on the street and local +x (the dashed edge) on the front, toward the centre.
 * - `Road_YellowLines_01` has one continuous yellow strip, 0.27 m wide, 0.14 m in from its +x edge (x = 2.09..2.36, z = -2.5..2.5) and nothing on the other edge: turned 270, its +x lands on the
 *   front, so the yellow is on the centre line. `Road_YellowLines_02` has the same strip on its -x edge (x = -2.36..-2.13) and two 1.25 m dashes on its +x edge (x = 2.34..2.5): turned 90, its -x
 *   lands on the front, so its yellow is on the centre line too (its dashes are then on the outer edge). A lane's two cells (left and right of the centre line, variant 0 and 1) take the first and
 *   second key, so the two yellow strips lie side by side at the centre line, 0.55 m apart: one yellow pair, no white double line.
 * - `Sidewalk_Corner_01` has its kerb on its -x and +z sides, so it is turned 90 to put them on +x and +z. `Sidewalk_Dip_Corner_01` already has its kerb on +x and +z (0).
 * - Unturned and right as they are: the straight, grate, dip and panel pieces have their kerb on +z (the front); `Road_ParkingLines_01` runs 10 m along x with its three bays' dividers
 *   (x = -5, -1.75, 1.6, 5) along z; `Road_Crossing_01` has its zebra bars along x (traffic along x, walkers along z, the front); `Road_Bare_01` has no direction.
 * - Where the kerb face is (E, criterion 28; a straight pavement along z at x = 0): the walking surface is 0.23 m high from z = -2.5 to 1.43, a raised lip 0.30 m high from 1.44 to 1.83, the
 *   kerb face drops at 1.83..1.90 to 0.00 m (the road's level when the tile stands on it), and a ramp rises from there to 0.23 m again at the cell's edge, z = 2.5. So the kerb face is 0.67 m
 *   INSIDE the cell edge, not on it: 0.67 m of the carriageway's edge is the tile's own gutter and ramp. The pole slots (0.75 m in from the cell edge) are 0.08 m behind the kerb face.
 */
export const TILE_FRONTS: Readonly<Partial<Record<CalibrationKey, 0 | 90 | 180 | 270>>> = {
  [k("SM_Env_Road_YellowLines_01")]: 270,
  [k("SM_Env_Road_YellowLines_02")]: 90,
  [k("SM_Env_Road_Lines_01")]: 270,
  [k("SM_Env_Road_Lines_02")]: 270,
  [k("SM_Env_Road_01")]: 270,
  [k("SM_Env_Sidewalk_Corner_01")]: 90,
};

/** The turn of a piece, degrees (0 when its key has no line). */
export function tileFront(key: CalibrationKey, fronts: Readonly<Partial<Record<CalibrationKey, 0 | 90 | 180 | 270>>> = TILE_FRONTS): number {
  return Object.prototype.hasOwnProperty.call(fronts, key) ? (fronts[key] ?? 0) : 0;
}

/**
 * Where a role's surface stands (design item 7, as E's criterion 28 re-measured it): `carriage` roads at the sidewalk tile's walking height below the pavement's walk, every sidewalk-family
 * piece standing on the carriageway so its walking surface is at 0 (its kerb lip 0.07 m above), `ground` (a parking lot's surface) at 0 beside the pavement.
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
  buildout: "pavement",
  lotSurface: "ground",
  plaza: "pavement",
};

/**
 * The measured walking height, metres, of a sidewalk-family key whose walk is more than 0.02 m off `SIDEWALK_WALK_M` (0.23): none is. Measured 18 Nov 2026 from the converted GLB, the
 * largest flat up-facing level of each piece away from its kerb edge: Straight_01/02, Grate_01, Dip_01, Dip_Corner_01 and Corner_01 are 0.230; Panel_01's border is 0.230 and its middle
 * panel 0.196 (0.034 m below, an inset), so the piece keeps the common walk.
 */
export const TILE_WALK_M: Readonly<Partial<Record<CalibrationKey, number>>> = {};

/** The walking height of a sidewalk-family key, metres. */
export function tileWalkM(key?: CalibrationKey): number {
  return key !== undefined && Object.prototype.hasOwnProperty.call(TILE_WALK_M, key) ? (TILE_WALK_M[key] ?? SIDEWALK_WALK_M) : SIDEWALK_WALK_M;
}

/**
 * Where a piece's origin stands, metres (every piece's pivot is centred with its minimum y at 0): a carriageway piece at `-SIDEWALK_WALK_M`, a parking lot's surface at 0, and a sidewalk
 * piece on the carriageway's level (`-walk`), so its walking surface is at 0.
 */
export function tileLevelY_m(role: TileRole, key?: CalibrationKey): number {
  const level = TILE_LEVELS[role];
  if (level === "ground") return 0;
  if (level === "carriage") return -SIDEWALK_WALK_M;
  return -tileWalkM(key);
}

/** The most draw calls (InstancedMeshes) the tiles take, pack and code-drawn together. A key is a call per sub-mesh; the keys with the fewest cells are dropped first. */
export const TILE_DRAW_CALLS_MAX = 40;

/** Every key the tile view loads, once each: every role's keys in role order, then the sheet's extras (the plain corner, the patch and the white-line road pieces). */
export function tileKeys(): CalibrationKey[] {
  const out = new Set<CalibrationKey>();
  for (const keys of Object.values(TILE_SLOTS)) for (const key of keys) out.add(key);
  for (const key of TILE_SHEET_EXTRA) out.add(key);
  return [...out];
}

// ---- the tile sheet (what each piece should show, for the eye check) ----

/** What a piece must show once turned by its `TILE_FRONTS` line: the sheet's arrow points along +z, and in a cell's own frame the street runs along x. */
export const TILE_FRONT_TEXT: Readonly<Record<TileRole, string>> = {
  lane: "the street runs along x: its lines must run left-right, across the arrow; arrow = toward the centre line, and the yellow line is on the arrow side",
  parking: "the street runs along x (2 cells long); the bay dividers run along the arrow",
  parkingPlain: "the street runs along x: its dashes run left-right; the dashed edge is on the arrow side",
  junction: "no front",
  crossing: "the zebra bars run left-right (traffic along x); arrow = the walkers' direction, across the bars",
  pavement: "arrow = toward the kerb (the carriageway)",
  pavementCorner: "the kerb edges are on the +x and +z sides (the two arrows)",
  kerbCut: "arrow = toward the carriageway (the dip)",
  buildout: "arrow = toward the carriageway (the kerb)",
  lotSurface: "no front",
  plaza: "no front",
};

export interface SheetPiece {
  key: CalibrationKey;
  /** Every role that draws this key (empty for an extra piece no role uses). */
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

/**
 * A piece's name for its label: the pack's name without `SM_Env_` and without its `Road_` or `Sidewalk_` family (the role line says which), unless that would leave only a number
 * (`Road_01`). At most 15 characters for every key the sheet shows.
 */
export function sheetShortName(key: CalibrationKey): string {
  const name = key.slice(key.indexOf(":") + 1).replace(/^SM_Env_/, "");
  const short = name.replace(/^(Road|Sidewalk)_/, "");
  return /^\d+$/.test(short) ? name : short;
}

/** The two lines of a piece's label: its short name, then the turn it has now (or, when the pack has no such piece, that it is missing). Short, because a label keeps its pixel size while the grid is fitted to the window. */
export function sheetLabel(key: CalibrationKey, present: boolean, fronts: Readonly<Partial<Record<CalibrationKey, 0 | 90 | 180 | 270>>> = TILE_FRONTS, roles: readonly TileRole[] = []): string[] {
  // 056 B: a build-out shares its pieces with the pavement, so the sheet shows them once and says on the second line that they are the build-out's too (a third line would not fit between the rows).
  // A piece that is not in the pack says only that: "NOT IN PACK + build-out" is wider than the room between two columns at 1280 x 720.
  const note = present && roles.includes("buildout") ? ` ${SHEET_BUILDOUT_NOTE}` : "";
  return [sheetShortName(key), (present ? `turn ${tileFront(key, fronts)}` : "NOT IN PACK") + note];
}

/** The label's last line on a piece the build-out is drawn from (it is the pavement's straight, so the sheet shows it once). */
export const SHEET_BUILDOUT_NOTE = "+ build-out";

/** The first lines of the sheet's legend: what the arrow means and what each kind of piece must show beside it. Every line is at most `SHEET_LEGEND_CHARS` characters. */
export const SHEET_LEGEND: readonly string[] = [
  "tile sheet. yellow arrow = expected front",
  "lane: yellow edge at the arrow",
  "pavement, dip: kerb at the arrow",
  "build-out: pavement piece, kerb at arrow",
  "corner: kerbs at both arrows",
  "crossing: bars across the arrow",
  "parking: dividers along the arrow",
  "wrong? set that key's TILE_FRONTS turn",
];
export const SHEET_LEGEND_CHARS = 41;

/**
 * The legend a sheet shows: `SHEET_LEGEND`, and, in a numbered sheet (a tall window has no room for names beside the pieces), one line per piece after it: its number, its short name and its turn
 * (or that it is missing from the pack).
 */
export function sheetLegend(numbered: boolean, pieces: readonly { key: CalibrationKey; present: boolean; roles?: readonly TileRole[] }[], fronts: Readonly<Partial<Record<CalibrationKey, 0 | 90 | 180 | 270>>> = TILE_FRONTS): string[] {
  if (!numbered) return [...SHEET_LEGEND];
  return [...SHEET_LEGEND, ...pieces.map((p, i) => `${i + 1} ${sheetShortName(p.key)} ${p.present ? `turn ${tileFront(p.key, fronts)}${p.roles?.includes("buildout") ? ` ${SHEET_BUILDOUT_NOTE}` : ""}` : "NOT IN PACK"}`)];
}

// ---- the sheet's grid ----

/**
 * The sheet's grid, per window shape. A label keeps a fixed size in pixels (so it is readable at any zoom) while a piece scales with the picture, so the grid is fitted with room left for the
 * labels (each hangs under its piece; the sheet adds half a label's width at each side, a label's height at the bottom and the legend's height at the top to the rig's insets), its columns are far
 * enough apart that two labels side by side fit, and its rows far enough that a label fits between two pieces: a window at least `SHEET_WIDE_ASPECT` wide for its height gets `wide` (four
 * columns, each piece's name under it), any other `tall` (three columns, each piece's number under it and the names in the legend). `pitchX_m` is the distance between two columns' pieces, `pitchZ_m` between two rows' (a piece's 5 m and at least one cell, 5 m, of free ground).
 */
export const SHEET_WIDE_ASPECT = 1.25;
export const SHEET_SHAPES = {
  wide: { cols: 4, pitchX_m: 16, pitchZ_m: 12, numbered: false },
  tall: { cols: 3, pitchX_m: 13, pitchZ_m: 12, numbered: true },
} as const;
/** Metres of ground round the grid inside its frame. */
export const SHEET_MARGIN_M = 1;

/** Columns of the sheet's grid for a window of this width over height. */
export function sheetColumns(aspect: number): number {
  return (aspect >= SHEET_WIDE_ASPECT ? SHEET_SHAPES.wide : SHEET_SHAPES.tall).cols;
}

export interface SheetSlot {
  piece: SheetPiece;
  /** The piece's centre, metres from the grid's corner (the first row's far edge, the first column's centre line). */
  x_m: number;
  z_m: number;
}

export interface SheetLayout {
  /** Labels are the pieces' numbers (the legend lists the names), not their names. */
  numbered: boolean;
  cols: number;
  rows: number;
  slots: readonly SheetSlot[];
  /** Metres between two columns' pieces, and between two rows'. */
  pitchX_m: number;
  pitchZ_m: number;
  /** The rectangle the camera frames, metres: the grid and `SHEET_MARGIN_M` round it (the parking lines are 10 m wide, so a column holding them reaches 5 m each side of its centre line). */
  frame_m: { minX: number; maxX: number; minZ: number; maxZ: number };
}

/** The sheet's pieces on a grid, row by row, in the shape of a window of this width over height. Pure. */
export function sheetLayout(aspect: number, pieces: readonly SheetPiece[] = sheetPieces()): SheetLayout {
  const shape = aspect >= SHEET_WIDE_ASPECT ? SHEET_SHAPES.wide : SHEET_SHAPES.tall;
  const cols = shape.cols;
  const rows = Math.max(1, Math.ceil(pieces.length / cols));
  const slots = pieces.map((piece, i) => ({ piece, x_m: (i % cols) * shape.pitchX_m, z_m: Math.floor(i / cols) * shape.pitchZ_m + TILE_M / 2 }));
  return {
    numbered: shape.numbered,
    cols,
    rows,
    slots,
    pitchX_m: shape.pitchX_m,
    pitchZ_m: shape.pitchZ_m,
    frame_m: {
      minX: Math.min(...slots.map((s) => s.x_m - (s.piece.cells * TILE_M) / 2)) - SHEET_MARGIN_M,
      maxX: Math.max(...slots.map((s) => s.x_m + (s.piece.cells * TILE_M) / 2)) + SHEET_MARGIN_M,
      minZ: -SHEET_MARGIN_M,
      maxZ: (rows - 1) * shape.pitchZ_m + TILE_M + SHEET_MARGIN_M,
    },
  };
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
