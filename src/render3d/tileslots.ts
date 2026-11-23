/**
 * The tile city's keys and flags (ticket 055, section C). Pure: no three, no DOM, no assets. Which City Pack piece draws each tile role, which way each piece's own
 * front must be turned to sit on its cell, which level it stands at, how many draw calls the tiles may take, and the page's flag (`city=tiles&sheet=1`).
 *
 * Every key is the City Pack's (`city-pack`, 5 m squares, finding 2 of the ticket). Their orientation cannot be read from bounds: it is confirmed by eye on the tile sheet
 * (`&city=tiles&sheet=1`), and a wrong one is corrected here as one `TILE_FRONTS` line. Section E added the walking level, the yellow centre line, the sheet's grid and its labels.
 */

import type { CalibrationKey } from "../core";
import {
  CITY_BLOCKS_DEFAULT,
  CITY_BLOCKS_MAX,
  SIDEWALK_WALK_M,
  TILE_M,
  type InteriorRole,
  type TileRole,
  type TileYaw,
} from "./tilecity";

/** The pack every tile is drawn from. */
export const TILE_PACK = "city-pack";

const k = (name: string): CalibrationKey => `${TILE_PACK}:${name}`;

/**
 * Every role the tile view draws a surface for (ticket 057 D): the street's `TileRole`s and the block interiors' `InteriorRole`s together. An interior cell is not a `TileCell` (`TileCity.interior` keeps them apart, and
 * a court's drive and first row of stalls are also the `lotSurface` cells 056 laid), but the keys, the levels and the sheet's notes are one table, so the roles are merged here and not in `tilecity.ts`.
 */
export type SlotRole = TileRole | InteriorRole;

/**
 * The plain flat paving slab of the interiors' aprons, paths and park edges, of the ring-2 strip, of the passage floors and of the paved inlets (ticket 063 D and H), and the grass tile of the greens. `Sidewalk_01` is
 * 5 x 0.034 x 5 m, 38 triangles, opaque, on the base atlas, with only the slab and joint colours of the street's `Sidewalk_Straight_02`. The piece it replaced, `Sidewalk_Panel_02`, has two inset plates 0.04 m below its slab
 * (service covers, dark green-grey), which read as tree plots (Josh, 19 Nov 2026: "Are these tiles supposed to represent plots where trees should be planted?").
 */
const PAVING_FLAT = k("SM_Env_Sidewalk_01");

/**
 * The colour of the slab's walking surface, as the City Pack's atlas samples it at the walk faces of `Sidewalk_01` and of every sidewalk piece the tiles use (`#8c8987`, read from the embedded texture at the faces' UVs by a test). The interiors'
 * code-drawn pavement (the passage floors' part cells, which are nearly every real floor since a passage is 1.0 to 5.3 m wide, and the fallback for any pavement piece that is missing) is this colour, so a floor drawn in code reads the same
 * as one laid from the slab. It is not a lit-surface key: the light rig does not recolour it, so it takes the day and night light as the textured slab does.
 */
export const PAVING_SLAB_COLOUR = 0x8c8987;
const GRASS = k("SM_Env_Grass_01");

/**
 * The keys of each role, in the order a cell's variant picks them (`tilecity.ts`: a lane cell's `LANE_RIGHT` bit picks the first or second, a pavement cell's variant
 * 0 or 1 picks Straight_02 or the grate). A role whose keys are all missing or failed is drawn in code, cell by cell. `junction` and `lotSurface`
 * share `Road_Bare_01` (the ticket's own design), so they are present or absent together.
 */
export const TILE_SLOTS: Readonly<Record<SlotRole, readonly CalibrationKey[]>> = {
  lane: [k("SM_Env_Road_YellowLines_01"), k("SM_Env_Road_YellowLines_02")],
  parking: [k("SM_Env_Road_ParkingLines_01")],
  parkingPlain: [k("SM_Env_Road_01")],
  junction: [k("SM_Env_Road_Bare_01")],
  crossing: [k("SM_Env_Road_Crossing_01")],
  // 063 A (Josh, 19 Nov 2026: "Make the side walk one uniform color."): one plain straight, `Straight_02`. `Straight_01` is the pack's translucent one (the converter left its atlas copy's alpha channel on and set BLEND, so it
  // drew at 17 to 40% opacity over the sage ground and the asphalt), so it is in no role. The grate is the same walking colour and opaque, and stays (one cell in `GRATE_ONE_IN`).
  pavement: [k("SM_Env_Sidewalk_Straight_02"), k("SM_Env_Sidewalk_Grate_01")],
  pavementCorner: [k("SM_Env_Sidewalk_Dip_Corner_01")],
  kerbCut: [k("SM_Env_Sidewalk_Dip_01")],
  // 056 B: a build-out is a pavement-level tile in the parking band, drawn from the plain sidewalk straight it shares with the pavement (063 A: the one straight, so the sidewalk is one colour). Its kerb edge is the
  // straight's own +z edge, which the cell's yaw already turns toward the street's centre line, so it needs no `TILE_FRONTS` line of its own: the shared key's (none: unturned) serves both roles.
  buildout: [k("SM_Env_Sidewalk_Straight_02")],
  lotSurface: [k("SM_Env_Road_Bare_01")],
  plaza: [k("SM_Env_Sidewalk_Panel_01")],
  // 057 D, the block interiors (Josh, 18 Nov 2026: "Grass and pavement should fill the blank areas."). The ticket drafted `Sidewalk_Panel_01` (the plaza piece) for every paving, but that piece has a kerb on its +z edge
  // (a 0.23 m drop to the road level every 5 m), which would cross an apron; 057 D drew the flat `Sidewalk_Panel_02`, and 063 D replaced it with the plain `Sidewalk_01` (Panel_02 has inset service plates). The strip behind the
  // terraces (`APRON_STRIP`) and the passage floors are the same slab (`INTERIOR_KEYS.strip`), with the code quad as their fallback only. A court's floor is the bare road (its stalls' own `lotSurface` cells already are, and
  // the drive through the row, which 063 H paves) with `ParkingLines_01` over each row of stalls.
  apron: [PAVING_FLAT],
  court: [k("SM_Env_Road_Bare_01"), k("SM_Env_Road_ParkingLines_01")],
  drive: [k("SM_Env_Road_Bare_01")],
  green: [GRASS],
  greenPath: [PAVING_FLAT],
  alley: [k("SM_Env_Road_Bare_01")],
  parkEdge: [PAVING_FLAT],
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
export const TILE_LEVELS: Readonly<Record<SlotRole, TileLevel>> = {
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
  // 057 D: the interiors' ground is flush with the pavement's walk (0); a key whose own surface stands above or below its origin has a base in `TILE_BASE_M`.
  apron: "ground",
  court: "ground",
  drive: "ground",
  green: "ground",
  greenPath: "ground",
  alley: "ground",
  parkEdge: "ground",
};

/**
 * Where a `ground`-level piece's origin stands, metres, when its surface is not at its origin (measured from the converted City Pack, the largest up-facing level of each piece): `Sidewalk_01` is a slab warped by at most
 * 0.024 m whose largest up-facing level is 0.01 m up (measured 19 Nov 2026, 063 D; the ticket guessed 0.03), so its origin is 0.01 m down and its top is the walk's; `Grass_01`'s blades stand 0.12 m up (to 0.14 m), so its origin
 * is 0.11 m down and the grass is 0.01 m over the walk, a hair above the paving beside it. A key not here stands at 0 (the bare road and the parking lines are flat at their origin).
 */
export const TILE_BASE_M: Readonly<Partial<Record<CalibrationKey, number>>> = {
  [PAVING_FLAT]: -0.01,
  [GRASS]: -0.11,
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
export function tileLevelY_m(role: SlotRole, key?: CalibrationKey): number {
  const level = TILE_LEVELS[role];
  if (level === "ground") return key !== undefined && Object.prototype.hasOwnProperty.call(TILE_BASE_M, key) ? (TILE_BASE_M[key] ?? 0) : 0;
  if (level === "carriage") return -SIDEWALK_WALK_M;
  return -tileWalkM(key);
}

// ---- the kerb (ticket 063 F; Josh, 19 Nov 2026: "It's ok to have curbs that stretch out like this in spots but the curb structures have to follow the crub.") ----

/** One kerb face of a sidewalk piece: the side of the cell it is on, how far inside the cell's edge it stands (the rest of that edge is the piece's own gutter and ramp), and the top of its lip above the carriageway. */
export interface KerbFaceSpec {
  side: "+x" | "-x" | "+z" | "-z";
  inset_m: number;
  top_m: number;
}

/**
 * Where each sidewalk piece's kerb face stands, measured from the converted City Pack (19 Nov 2026, 063 F; a test re-measures every line within 0.02 m): the area-weighted mean of the piece's full-height faces (road level up to the lip) on
 * each side, in from the cell's 2.5 m edge. The lip is 0.30 m above the road the piece stands on and 0.07 m above its walk (0.23 m), and 0.39 m wide; the 0.65 m outside the face is the piece's gutter and ramp, at road level.
 * - `Straight_02` and `Grate_01`: one face on +z, the whole 5 m. A straight has no face on its +-x ends: an open edge 0.23 m high (the jog a build-out's flank closes).
 * - `Dip_01`: the face on +z stands at the two ends only (about 1 m of full-height kerb in all); the 3 m between them is dipped to 0.14 m above the road.
 * - `Dip_Corner_01`: a pedestrian ramp, not a kerb return. Each of its two legs (+x and +z) has only about 1.1 m of full-height kerb, at the far end of the leg, and the rest of the corner falls away on a diagonal ramp to road level. It cannot carry
 *   a kerb round an inlet's return, so the returns are the straight with a code-drawn strip (`KerbPlan`).
 */
export const KERB_FACES_M: Readonly<Partial<Record<CalibrationKey, readonly KerbFaceSpec[]>>> = {
  [k("SM_Env_Sidewalk_Straight_02")]: [{ side: "+z", inset_m: 0.66, top_m: 0.3 }],
  [k("SM_Env_Sidewalk_Grate_01")]: [{ side: "+z", inset_m: 0.65, top_m: 0.3 }],
  [k("SM_Env_Sidewalk_Dip_01")]: [{ side: "+z", inset_m: 0.66, top_m: 0.3 }],
  [k("SM_Env_Sidewalk_Dip_Corner_01")]: [
    { side: "+x", inset_m: 0.68, top_m: 0.3 },
    { side: "+z", inset_m: 0.69, top_m: 0.3 },
  ],
};

/** A kerb face with no measured piece behind it (a code-drawn strip's, a fallback cell's) stands this far inside the cell edge: the pack's, to a hundredth of a metre. */
export const KERB_INSET_M = 0.66;
/** The lip's top above the carriageway (0.30 m, so 0.07 m above the walk) and its width across (0.39 m, measured on `Straight_02`: the lip runs from 1.44 to 1.83 m). A code-drawn kerb strip has both. */
export const KERB_LIP_TOP_M = 0.3;
export const KERB_LIP_W_M = 0.39;
/** The colour of a code-drawn kerb strip: the pack's kerb lip and joints (`#7b7b79`, sampled from the atlas), so a strip beside a pack piece reads as the same kerb. Not a lit-surface key: it takes the day and night light as the textured pieces do. */
export const KERB_STRIP_COLOUR = 0x7b7b79;
/**
 * How near two kerb faces on one line must be, in plan (metres): the pack's faces stand 0.65 to 0.69 m in, so the one common inset is within 0.02 m of each of the three pieces the plan lays along the line (`kerbline.ts`). How much a face's lip
 * height may differ from the line's. The longest gap in a kerb run: a return reaches the building line, and the faces along a path meet, within it.
 */
export const KERB_TOL_M = 0.03;
export const KERB_HEIGHT_TOL_M = 0.02;
export const KERB_GAP_MAX_M = 0.05;

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
export const TILE_FRONT_TEXT: Readonly<Record<SlotRole, string>> = {
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
  apron: "no front (flat slab; a kerb on an edge would be wrong)",
  court: "bare road: no front. parking lines: dividers along the arrow, which points to the aisle",
  drive: "no front",
  green: "no front",
  greenPath: "no front (flat slab)",
  alley: "no front",
  parkEdge: "no front (flat slab)",
};

export interface SheetPiece {
  key: CalibrationKey;
  /** Every role that draws this key (empty for an extra piece no role uses). */
  roles: readonly SlotRole[];
  /** The piece's footprint in cells along x (2 for the parking lines). */
  cells: 1 | 2;
}

/** Every piece the sheet shows, once each, in role order and then the extras: a key several roles share appears once with all of them. */
export function sheetPieces(): SheetPiece[] {
  const out = new Map<CalibrationKey, SlotRole[]>();
  for (const role of Object.keys(TILE_SLOTS) as SlotRole[]) {
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
export function sheetLabel(key: CalibrationKey, present: boolean, fronts: Readonly<Partial<Record<CalibrationKey, 0 | 90 | 180 | 270>>> = TILE_FRONTS, roles: readonly SlotRole[] = []): string[] {
  // 056 B: a build-out shares its pieces with the pavement, so the sheet shows them once and says on the second line that they are the build-out's too (a third line would not fit between the rows).
  // A piece that is not in the pack says only that: "NOT IN PACK + build-out" is wider than the room between two columns at 1280 x 720.
  const note = present ? roleNote(roles) : "";
  return [sheetShortName(key), (present ? `turn ${tileFront(key, fronts)}` : "NOT IN PACK") + note];
}

/** The label's last line on a piece the build-out is drawn from (it is the pavement's straight, so the sheet shows it once). */
export const SHEET_BUILDOUT_NOTE = "+ build-out";
/**
 * The same for a piece a block interior is drawn from (057 D), by the interior roles it serves in their short names (the sheet shows a piece once, so `Bare_01` says `court drive alley` and `Sidewalk_01` `apron path edge`): the
 * roles `TileRole` does not have, each named in a word so the whole second line is at most 26 characters.
 */
export const SHEET_INTERIOR_NAMES: Readonly<Partial<Record<SlotRole, string>>> = {
  apron: "apron",
  greenPath: "path",
  parkEdge: "edge",
  green: "green",
  court: "court",
  drive: "drive",
  alley: "alley",
};

/** What a label adds to its second line for the roles a piece serves: " + build-out", else " + " and the interior roles' short names, else nothing. */
function roleNote(roles: readonly SlotRole[] | undefined): string {
  if (roles?.includes("buildout")) return ` ${SHEET_BUILDOUT_NOTE}`;
  const names = (roles ?? []).flatMap((r) => SHEET_INTERIOR_NAMES[r] ?? []);
  return names.length > 0 ? ` + ${names.join(" ")}` : "";
}

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
export function sheetLegend(numbered: boolean, pieces: readonly { key: CalibrationKey; present: boolean; roles?: readonly SlotRole[] }[], fronts: Readonly<Partial<Record<CalibrationKey, 0 | 90 | 180 | 270>>> = TILE_FRONTS): string[] {
  if (!numbered) return [...SHEET_LEGEND];
  return [...SHEET_LEGEND, ...pieces.map((p, i) => `${i + 1} ${sheetShortName(p.key)} ${p.present ? `turn ${tileFront(p.key, fronts)}${roleNote(p.roles)}` : "NOT IN PACK"}`)];
}

// ---- the sheet's grid ----

/**
 * The sheet's grid, per window shape. A label keeps a fixed size in pixels (so it is readable at any zoom) while a piece scales with the picture, so the grid is fitted with room left for the
 * labels (each hangs under its piece; the sheet adds half a label's width at each side, a label's height at the bottom and the legend's height at the top to the rig's insets), its columns are far
 * enough apart that two labels side by side fit, and its rows far enough that a label fits between two pieces: a window at least `SHEET_WIDE_ASPECT` wide for its height gets `wide` (five
 * columns since 057 D, which added two pieces to the sheet and so a fifth row at four columns; each piece's name under it), any other `tall` (three columns, each piece's number under it and the names in the legend). `pitchX_m` is the distance between two columns' pieces, `pitchZ_m` between two rows' (a piece's 5 m and at least one cell, 5 m, of free ground).
 */
export const SHEET_WIDE_ASPECT = 1.25;
export const SHEET_SHAPES = {
  wide: { cols: 5, pitchX_m: 14, pitchZ_m: 12, numbered: false },
  tall: { cols: 3, pitchX_m: 13, pitchZ_m: 14, numbered: true },
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

// ---- the block interiors (ticket 057 D; Josh, 18 Nov 2026: "Grass and pavement should fill the blank areas.") ----

/** The park bench and the two bins the interiors stand (optional dressing: the page loads them already as furniture, and `furniture.ts`'s `BENCHES` and `BINS` name the same keys; a test holds them equal). */
export const TILE_BENCH: CalibrationKey = k("SM_Prop_ParkBench_01");
export const TILE_BINS: readonly CalibrationKey[] = [k("SM_Prop_Trashbin_01"), k("SM_Prop_Trashbin_02")];
/** Every prop key the interiors may stand, once each: the three trees (the build-outs' too), the bench and the bins. None is a tile role's key and none is on the sheet. */
export const TILE_PROPS: readonly CalibrationKey[] = [...TILE_TREES, TILE_BENCH, ...TILE_BINS];
/** The turn, degrees, added to a prop's yaw so its own front lands where the layout faces it (`GreenProp.yaw`, `AlleyBin.yaw`: the front toward the path or the lane). A piece with no line is not turned; one wrong by eye is one line here. */
export const TILE_PROP_TURN: Readonly<Partial<Record<CalibrationKey, 0 | 90 | 180 | 270>>> = {};

/** A `ParkingLines_01` tile laid over a court's row of stalls stands this far (metres) above the bare road under it, so the two do not fight for the pixel. */
export const STALL_LINES_LIFT_M = 0.01;

/** The most draw calls the interiors take (InstancedMeshes, pack and code together), on top of `TILE_DRAW_CALLS_MAX` for the street's tiles: the keys with the fewest instances are dropped first. */
export const INTERIOR_DRAW_CALLS_MAX = 24;

/**
 * What a block interior's cell is drawn as. `strip` is the apron behind the terraces (ring 2, `APRON_STRIP`, the ground the buildings' backs stand over). Every kind is a pack tile with a code-drawn fallback: `strip`, `apron`,
 * `path` (a `greenPath`), `parkEdge` (all the plain slab, 063 D), `inlet` (an alley's mouth cell, paved with the same slab: 063 H), `green`, `bare` (a court or alley lane cell: the bare road) and `stalls` (`ParkingLines_01` laid
 * over one row of a court's stalls, two cells).
 */
export type InteriorKind = "strip" | "apron" | "path" | "parkEdge" | "inlet" | "green" | "bare" | "stalls";

/** The pack keys of each kind, in the order they are tried. */
export const INTERIOR_KEYS: Readonly<Record<InteriorKind, readonly CalibrationKey[]>> = {
  strip: [PAVING_FLAT],
  inlet: [PAVING_FLAT],
  apron: TILE_SLOTS.apron,
  path: TILE_SLOTS.greenPath,
  parkEdge: TILE_SLOTS.parkEdge,
  green: TILE_SLOTS.green,
  bare: TILE_SLOTS.alley,
  stalls: [TILE_SLOTS.court[1]!],
};

/** One thing drawn on a block's ground: its kind, the role it comes from, its first cell, its centre (metres; for a two-cell row the middle of the pair) and the turn of its front (degrees, as `InteriorCell.yaw`). */
export interface InteriorItem {
  kind: InteriorKind;
  role: InteriorRole;
  i: number;
  j: number;
  x_m: number;
  z_m: number;
  yaw: TileYaw;
  cells: 1 | 2;
}

/** The dividers of a row of stalls drawn in code: where each stands along the row's 10 m (metres from its middle), and its size (width along the row, length across it, metres). The pack's tile has its three bays' dividers at about these. */
export const STALL_DIVIDERS_X_M: readonly number[] = [-5, -5 / 3, 5 / 3, 5];
export const STALL_DIVIDER_W_M = 0.12;
export const STALL_DIVIDER_L_M = 4;

// ---- gated passages ----

/** The height of a passage's gate, metres; a gate at an alley's mouth is the small one (the lane is a service lane, and the gate is only there to close the gap beside it). The posts stand `GATE_POST_EXTRA_H_M` taller. */
export const GATE_H_M = 2.2;
export const GATE_SMALL_H_M = 1.3;
export const GATE_POST_W_M = 0.2;
export const GATE_POST_EXTRA_H_M = 0.25;
export const GATE_THICK_M = 0.12;
/** The gate's wood: a dark brown that reads in both light modes (not a lit surface key, so the rig leaves it). */
export const GATE_COLOUR = 0x6b4b32;
/** A passage whose middle is within this many metres of the edge of an alley's mouth (the lane's half width from the lane's centre line, plus half the passage, plus this) opens on that mouth. */
export const GATE_ALLEY_REACH_M = 1.0;

/** One gate: the middle of its passage on the pavement's back edge, the turn of its front (toward the street), the passage's width, whether it is the small alley-mouth gate, and the run it closes. */
export interface GatePlan {
  x_m: number;
  z_m: number;
  yaw: TileYaw;
  w_m: number;
  small: boolean;
  run: string;
}

/** One box of a gate, in the gate's own frame (x along the passage, y up, z through the wall line): its middle along x, and its width, height and thickness, metres. */
export interface GatePart {
  kind: "panel" | "post";
  x_m: number;
  w_m: number;
  h_m: number;
  d_m: number;
}

/** A gate's boxes: a post at each side of the passage and the gate's panel between them. A passage narrower than two posts and a hand is one panel and no posts. */
export function gateParts(g: Pick<GatePlan, "w_m" | "small">): GatePart[] {
  const h = g.small ? GATE_SMALL_H_M : GATE_H_M;
  if (g.w_m < 2 * GATE_POST_W_M + 0.1) return [{ kind: "panel", x_m: 0, w_m: g.w_m, h_m: h, d_m: GATE_THICK_M }];
  const side = g.w_m / 2 - GATE_POST_W_M / 2;
  return [
    { kind: "post", x_m: -side, w_m: GATE_POST_W_M, h_m: h + GATE_POST_EXTRA_H_M, d_m: GATE_POST_W_M },
    { kind: "post", x_m: side, w_m: GATE_POST_W_M, h_m: h + GATE_POST_EXTRA_H_M, d_m: GATE_POST_W_M },
    { kind: "panel", x_m: 0, w_m: g.w_m - 2 * GATE_POST_W_M, h_m: h, d_m: GATE_THICK_M },
  ];
}

/** A rectangle on the ground, metres: its centre and its size along world x and z. */
export interface GroundRect {
  x_m: number;
  z_m: number;
  w_m: number;
  d_m: number;
}

/** The pack keys a passage's floor is laid from (063 D): the interiors' plain slab, as the strip's. Absent from the pack, the whole floor is a code quad. */
export const PASSAGE_FLOOR_KEYS: readonly CalibrationKey[] = INTERIOR_KEYS.strip;

/** What is left of a floor under a part cell is under this size (metres), and is not drawn. */
const FLOOR_PART_MIN_M = 1e-6;

/**
 * A passage floor's rectangle cut into pack tiles (063 D): one whole `TILE_M` cell for every whole 5 m that fits along each axis, laid from the rectangle's low x and low z corner, and the rest as part-cell rectangles (the right-hand
 * strip over the full depth, then the near strip under the whole cells), which stay code quads. No tile is scaled. The areas of the cells and the parts add up to the rectangle's. Pure.
 */
export function passageFloorCells(floor: GroundRect): { whole: { x_m: number; z_m: number }[]; part: GroundRect[] } {
  const minX = floor.x_m - floor.w_m / 2;
  const minZ = floor.z_m - floor.d_m / 2;
  let nx = Math.floor(floor.w_m / TILE_M + 1e-9);
  let nz = Math.floor(floor.d_m / TILE_M + 1e-9);
  // Not a whole cell either way: it is all part cell.
  if (nx === 0 || nz === 0) nx = nz = 0;
  const whole: { x_m: number; z_m: number }[] = [];
  for (let b = 0; b < nz; b++) for (let a = 0; a < nx; a++) whole.push({ x_m: minX + (a + 0.5) * TILE_M, z_m: minZ + (b + 0.5) * TILE_M });
  const part: GroundRect[] = [];
  const restW = floor.w_m - nx * TILE_M;
  if (restW > FLOOR_PART_MIN_M) part.push({ x_m: minX + nx * TILE_M + restW / 2, z_m: floor.z_m, w_m: restW, d_m: floor.d_m });
  const restD = floor.d_m - nz * TILE_M;
  if (nx > 0 && restD > FLOOR_PART_MIN_M) part.push({ x_m: minX + (nx * TILE_M) / 2, z_m: minZ + nz * TILE_M + restD / 2, w_m: nx * TILE_M, d_m: restD });
  return { whole, part };
}

// ---- the page's flags ----

export interface CityTilesRequest {
  blocksX: number;
  blocksZ: number;
  seed: number;
  sheet: boolean;
}

/**
 * What the page asks of the tile sheet, or null when it does not ask: `city=tiles&sheet=1` (plain `city=tiles` is the pipeline's city, `plan3d.ts`'s `tilesPlanRequested`; the old tile city went in ticket 081 A1), with `blocks=WxD` (each clamped to 1..CITY_BLOCKS_MAX; anything else is the default 3 x 3),
 * `seed=N` (an integer; anything else is 1) and `sheet=1`. Pure; renderer.ts passes the address in, behind `import.meta.env.DEV`.
 */
export function cityTilesRequested(search: string): CityTilesRequest | null {
  const q = new URLSearchParams(search);
  if (q.get("city") !== "tiles" || q.get("sheet") !== "1") return null;
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
  return { blocksX, blocksZ, seed: Number.isSafeInteger(seed) ? seed : 1, sheet: true };
}
