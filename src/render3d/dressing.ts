/**
 * Ticket 052 A: building dressing for the City Pack stacks (050), as pure data and pure maths. Awnings, shop glass, signs, an ATM, door canopies, fire
 * escapes, wall AC units and window planters, rooftop props and the one big roof prop (water tower, roof stair hut, billboard, a novelty sign).
 * No three, no DOM, no fetch, no GLB: pieces are named by `city-pack:<name>` keys, sizes come from the manifest entries the caller passes (typed-in
 * fixtures in tests), fronts from the `FrontTable` the caller passes. Nothing here draws; 052 B draws what `dressStack` returns.
 *
 * Frames: the lot frame of `stacks.ts` (origin front-centre of the lot, +x along the road, +z at the road, metres, y up). `yaw` is `frontYaw(front)`,
 * so a prop whose own front faces `f` faces the road after it. Every piece is placed by its base centre (the converter centres every pivot in x and z).
 *
 * Attachment (pivots are centred, so where a piece sits is a rule, not data): a front-face prop's back face lies on the front face of the stack piece
 * that stands behind it at the prop's base height (front face = the piece's `z + d / 2`), plus a per-key `DRESS_NUDGE_M`; a roof prop's base lies on the
 * roof piece's top, inset `ROOF_EDGE_M` from every roof edge and inside its column. Shop glass is the exception (its back is `GLASS_INSET_M` inside the
 * shop's front face, its base at `GLASS_SILL_M`; a corner shop's glass wraps the corner and is centred on it).
 *
 * Every choice is `dressUnit(lot.key, slot, column)`: a function of the lot key and the stack, never of the run or the order. Per-run caps (an ATM, a
 * billboard, a novelty sign) are carried in `RunUsed`, which `dressTown` threads along a run in order.
 *
 * Two departures from the ticket's design text, both deliberate:
 *  - The ATM stands beside a residents' door (slot `wall` on `base.door`), not on a shop pier: a shop's glass is 4.3 to 8.7 m wide in a 5 or 10 m bay, so a
 *    shop has no pier to put it on.
 *  - "At most one block in two along a run has a fire escape" is "no two consecutive blocks of a run both have one"; the clause "unless every block
 *    qualifies" is dropped, as a block cannot know that. That caps the density below "most 3-bay blocks"; the two statements cannot both hold. Which blocks get one is the map's choice
 *    (ticket 061, `escapeBlocks` in `escapes.ts`, run first by `dressTown`), no longer a per-block coin toss.
 *
 * Fire escapes (ticket 058) stand one platform per storey, each deck under its storey's window sill and each flight meeting the deck above; `escapes.ts` holds the measured numbers and the
 * check, the block of `dressBlock` below places them, and a piece the pack lacks is drawn in code (a `code:escape` piece with boxes). Chapter 16.11 of the style guide has the rules.
 *
 * The pack's lamps, signals and electrical cabinets are never used here: they would read as puzzle parts, and no dressing ever glows (this module has
 * no colour and no emission at all). Nothing that is a person, an animal or a vehicle is used either.
 */

import type { AssetEntry, CalibrationKey } from "../core";
import { stableHash } from "../city/pipeline/hash";
import { CODE_ESCAPE, CODE_ESCAPE_KEY, ESCAPE_FIRST, escapeBlocks, type EscapeSite, ESCAPE_GEOMETRY, ESCAPE_GROUND_TOL_M, codeEscape, ladderParts, planEscape, storeysOfColumn, ESCAPE_DECK_BELOW_SILL_M, type EscapePart } from "./escapes";
import { frontYaw, sizeOf, type FrontTable, type ModelFront } from "./models";
import type { Stack, StackPiece } from "./stacks";
import { PAVE_W, SETBACK, WORLD_PER_METRE, type Lot } from "./kitunits";

export type DressSlotKind = "glass" | "awning" | "sign" | "wall" | "escape" | "wallUpper" | "roofSmall" | "roofLarge";
/** 050's recipe roles, split the way the stack's pieces split: a shop, a residents' door, a shop corner; a mid floor or a corner floor; a mid roof or a corner roof. */
export type DressRole = "base.mid" | "base.door" | "base.corner" | "floor.mid" | "floor.corner" | "roof.mid" | "roof.corner";

/** A placed piece of dressing, metres, lot frame. `w`, `d` are its size after the turn (along the road, away from it); `column` is the stack column it counts against. */
export interface DressPiece {
  key: CalibrationKey;
  slot: DressSlotKind;
  x: number;
  y: number;
  z: number;
  yaw: number;
  column: number;
  w: number;
  h: number;
  d: number;
  /** The piece's y-scale about its base (ticket 058: a fire escape's pieces are scaled so each flight meets the deck above); absent means 1. `h` is already scaled. */
  scaleY?: number;
  /** Boxes drawn with the piece, in its own frame at scale 1 (ticket 058): the first escape piece's ladder down to the walk, or the whole of a code-drawn escape (`CODE_ESCAPE_KEY`). */
  parts?: readonly EscapePart[];
}

// ---- constants (every one a one-line tuning change; 053 pins them in its Numbers table) ----

export const P_AWNING = 0.75;
export const P_SIGN = 0.6;
export const P_ATM = 0.3;
export const ATM_PER_RUN = 2;
export const P_CANOPY = 0.5;
export const ESCAPE_MIN_BAYS = 3;
/** Ticket 061: the share of qualifying blocks that get a fire escape on a puzzle map (the ladder), `CITY_CHECK.R7`. A tile city passes its own floor (`TILE_CITY_R7_MIN`). */
export const ESCAPE_SHARE_LADDER = 0.5;
export const P_WALL_AC = 0.15;
export const P_PLANTER = 0.1;
export const WALL_PROPS_PER_BLOCK = 4;
export const P_ROOF_SMALL = 0.7;
export const ROOF_SMALL_PER_BAY = 2;
export const P_ROOF_LARGE = 0.5;
export const DRESS_PER_BAY_MAX = 6;
export const DRESS_MAX = 6000;
export const ROOF_EDGE_M = 0.3;
export const AWNING_KERB_M = 0.3;
export const GLASS_INSET_M = 0.05;
export const GLASS_SILL_M = 0.3;
export const DRESS_DRAW_CALLS_MAX = 120;
/** Not in the ticket's list: one block in four hangs a blade sign (instead of a fascia sign) over one awning-less shop bay. */
export const P_BLADE = 0.25;
/** Of the roof columns that get small props, the share that get a second one. */
export const P_ROOF_SECOND = 0.4;

/** Lot front to the road's edge, metres: the pavement and the setback (town.ts). No front-face prop reaches past it. */
export const KERB_FROM_FRONT_M = (PAVE_W + SETBACK) / WORLD_PER_METRE;
/** A glass piece deeper than this is a wrap (a corner shop's): centred on the shop's footprint instead of placed on its face. */
export const GLASS_WRAP_DEPTH_M = 1;
/** Base heights of ground-floor dressing, metres above the lot. Awnings and signs sit over the glass (never under its top). */
export const AWNING_BASE_M = 2.85;
export const SIGN_BASE_M = 2.85;
export const DOOR_CANOPY_Y_M = 2.3;
export const ATM_Y_M = 0.6;
/** How far in from a door bay's edge the ATM's edge stands, metres. */
export const ATM_PIER_M = 0.35;
/** Wall props stand on the second apartment floor and up (the first floor's wall is under the awnings and signs). */
export const WALL_MIN_LEVEL = 2;
export const WALL_AC_LIFT_M = 1;
export const PLANTER_LIFT_M = 0.9;
export const WALL_AC_OFFSET_M = 1.5;
/** A roof billboard's face stands this high on its structure, and a blade sign this far in from its bay's edge. */
export const BILLBOARD_SIGN_Y_M = 0.9;
export const BLADE_INSET_M = 0.1;

// ---- the keys ----

const k = (name: string): CalibrationKey => `city-pack:${name}`;
const seq = (prefix: string, ...nn: string[]): CalibrationKey[] => nn.map((n) => k(`${prefix}${n}`));

export const AWNINGS: readonly CalibrationKey[] = seq("SM_Bld_Shop_Cover_", "01", "02", "03", "04");
/** The L-shaped awning, for a corner column only. */
export const AWNING_CORNER: readonly CalibrationKey[] = seq("SM_Bld_Shop_Cover_", "05");
export const DOOR_CANOPIES: readonly CalibrationKey[] = seq("SM_Bld_Cover_", "01", "02");
export const SIGNS_FASCIA: readonly CalibrationKey[] = seq("SM_Prop_Sign_", "Bar_01", "Cafe_01", "Chinese_Noodles_01", "Pizza_01", "Pub_01", "Entrance_01");
export const SIGNS_BLADE: readonly CalibrationKey[] = seq("SM_Prop_Sign_", "Barber_01", "DeliPizza_01", "Hotel_01");
export const ATMS: readonly CalibrationKey[] = seq("SM_Prop_ATM_", "01");
/** Fire escapes: `_03` (the tall first landing) on the first floor, `_02` for each floor between, `_01` on top, one per storey (ticket 058: `planEscape` in `escapes.ts` places them by their measured decks and flights). */
export const ESCAPES: readonly CalibrationKey[] = seq("SM_Bld_FireEscape_", "01", "02", "03");
export const WALL_ACS: readonly CalibrationKey[] = seq("SM_Prop_Aircon_", "01");
export const WALL_PLANTERS: readonly CalibrationKey[] = seq("SM_Prop_PlanterWindow_", "01", "02");
/** Small roof props. The skylight, its glass and the vent end pieces are left out (a pair or a very wide piece; 052 B may add them). */
export const ROOF_SMALL: readonly CalibrationKey[] = seq("SM_Prop_", "Roof_Aircon_01", "Roof_Aircon_02", "Roof_Aircon_03", "SatDish_01", "Vents_Exhaust_01", "Vents_Straight_01");
/** The small roof props that look the same from the back (they may turn a half-turn by hash); the dish keeps facing the street. */
const ROOF_TURNABLE: ReadonlySet<CalibrationKey> = new Set(ROOF_SMALL.filter((q) => !/SatDish/.test(q)));
export const ROOF_WATER_TOWER: CalibrationKey = k("SM_Prop_Water_Tower_01");
export const ROOF_ACCESS: CalibrationKey = k("SM_Bld_Roof_Access_01");
/** A roof billboard is its structure plus one face (`BILLBOARD_FACES`), two pieces that count as one large prop. */
export const BILLBOARD_STRUCTURE: CalibrationKey = k("SM_Prop_Billboard_Roof_01");
export const BILLBOARD_FACES: readonly CalibrationKey[] = seq("SM_Prop_Billboard_Sign_", "01", "02", "03", "04", "05", "06", "07");
/** The novelty signs (the pizza slice and its 16 kin): one per run at most, on its lowest block. */
export const NOVELTY_SIGNS: readonly CalibrationKey[] = seq(
  "SM_Prop_LargeSign_",
  "Pizza_01",
  "Burger_01",
  "Donut_01",
  "Coffee_01",
  "Hotdog_01",
  "Icecream_01",
  "Milkshake_01",
  "Noodles_01",
  "Popcorn_01",
  "Soda_01",
  "Taco_01",
  "Beer_01",
  "Bottle_01",
  "Guitar_01",
  "Lollypop_01",
  "BowlingBall_01",
  "BowlingPin_01",
);
/** Shop glass: a shop's own key plus `_Glass`. `Shop_06` has none. */
export const SHOP_GLASS: readonly CalibrationKey[] = seq("SM_Bld_Shop_", "01_Glass", "02_Glass", "03_Glass", "04_Glass", "05_Glass", "Corner_01_Glass", "Corner_02_Glass");
const GLASS_SET: ReadonlySet<CalibrationKey> = new Set(SHOP_GLASS);

/** Which slot kinds each 050 role carries. The tables above say which keys fill a slot. */
export const DRESS_SLOTS: Readonly<Record<DressRole, readonly DressSlotKind[]>> = {
  "base.mid": ["glass", "awning", "sign"],
  "base.door": ["awning", "wall"],
  "base.corner": ["glass", "awning", "sign"],
  "floor.mid": ["escape", "wallUpper"],
  "floor.corner": ["wallUpper"],
  "roof.mid": ["roofSmall", "roofLarge"],
  "roof.corner": ["roofSmall"],
};

/** Per-key correction toward the street (+) or away (-), metres, for a piece the stack gallery shows off (050's `nudge_m` pattern). Empty until 052 B shows it. */
export const DRESS_NUDGE_M: Readonly<Partial<Record<CalibrationKey, number>>> = {};
/** Which of a dressing piece's own axes faces the street, where the guess "+z" is wrong. A `FrontTable` line for the key wins over it. Empty until 052 B shows it. */
export const DRESS_FRONTS: Readonly<Partial<Record<CalibrationKey, ModelFront>>> = {};

/** Every key this module can place, once each (for loading, and for the tests' fixture check). */
export function dressKeys(): CalibrationKey[] {
  return [
    ...new Set<CalibrationKey>([
      ...SHOP_GLASS,
      ...AWNINGS,
      ...AWNING_CORNER,
      ...DOOR_CANOPIES,
      ...SIGNS_FASCIA,
      ...SIGNS_BLADE,
      ...ATMS,
      ...ESCAPES,
      ...WALL_ACS,
      ...WALL_PLANTERS,
      ...ROOF_SMALL,
      ROOF_WATER_TOWER,
      ROOF_ACCESS,
      BILLBOARD_STRUCTURE,
      ...BILLBOARD_FACES,
      ...NOVELTY_SIGNS,
    ]),
  ];
}

/** The role a stack piece plays, for `DRESS_SLOTS`. */
export function dressRoleOf(p: Pick<StackPiece, "key" | "role">): DressRole {
  if (p.role === "base") return /Apartment_Door/.test(p.key) ? "base.door" : /Shop_Corner/.test(p.key) ? "base.corner" : "base.mid";
  if (p.role === "floor") return /Corner/.test(p.key) ? "floor.corner" : "floor.mid";
  return /Roof_Corner/.test(p.key) ? "roof.corner" : "roof.mid";
}

// ---- hashing ----

/** A float in [0, 1), a pure function of its parts: `stableHash` (FNV-1a, whose low bits are weak on short strings) through a murmur-style finaliser. */
export function dressUnit(...parts: readonly (string | number)[]): number {
  let h = stableHash(parts.join("|"));
  h ^= h >>> 16;
  h = Math.imul(h, 0x7feb352d);
  h ^= h >>> 15;
  h = Math.imul(h, 0x846ca68b);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

function pickOf<T>(xs: readonly T[], ...parts: readonly (string | number)[]): T | undefined {
  return xs.length === 0 ? undefined : xs[Math.min(xs.length - 1, Math.floor(dressUnit(...parts) * xs.length))];
}

/** `xs` rotated to start at a hashed index: a deterministic order that tries every element once. */
function rotated<T>(xs: readonly T[], ...parts: readonly (string | number)[]): T[] {
  if (xs.length === 0) return [];
  const s = Math.min(xs.length - 1, Math.floor(dressUnit(...parts) * xs.length));
  return [...xs.slice(s), ...xs.slice(0, s)];
}

// ---- run context ----

/** What earlier blocks along a run have already used (the caps that span blocks). */
export interface RunUsed {
  atm: number;
  billboard: number;
  novelty: number;
}
export const NO_USED: RunUsed = { atm: 0, billboard: 0, novelty: 0 };

export interface RunContext {
  id: string;
  /** The block's place along the run. */
  index: number;
  /** The run's lowest block: where a novelty sign goes. */
  lowest: boolean;
  /** What earlier blocks used; absent means nothing (a block dressed alone). */
  used?: RunUsed;
  /**
   * Ticket 061: this block is one of the map's chosen escape blocks (`escapeBlocks`, which `dressTown` runs first). `false` means it gets none; absent means chosen, so a block dressed alone
   * (`dressStack`) gets its escape wherever it can hold one.
   */
  escape?: boolean;
  /** The run's pavement frame (`TerraceRun.frame`, ticket 055 B): its `kerb_m` is the lot front to the road edge, and wins over the `kerbM` argument. Absent: the argument. */
  frame?: { readonly wall_m: number; readonly kerb_m: number };
}

export interface DressResult {
  pieces: DressPiece[];
  used: RunUsed;
}

type Entries = ReadonlyMap<CalibrationKey, AssetEntry>;
type Size3 = readonly [w: number, h: number, d: number];

const EPS = 1e-9;
const quarterYaw = (yaw: number): boolean => Math.abs(Math.sin(yaw)) > 0.5;

interface Bay {
  /** The base piece (a shop, a corner shop, a door). */
  b: StackPiece;
  kind: "shop" | "corner" | "door";
  /** The first column it spans, and every column it spans (a two-bay shop spans two). */
  col: number;
  cols: number[];
  left: number;
  right: number;
  cx: number;
}

/**
 * The dressing of one block (one stack on one lot), and what it used of its run. Deterministic per `lot.key`. A key missing from `entries` drops only its own
 * placements. See the module comment for the attachment rules and the ticket for the caps; in short, in priority order when a bay is full: glass, awnings,
 * fire escape, the big roof prop, signs, door canopy, small roof props, ATM, wall props. `kerbM` is the lot front to the road edge (default the town's
 * pavement and setback, 3.33 m; a service-run front is nearer): no front-face prop reaches past it, and awnings stop `AWNING_KERB_M` short of it.
 */
export function dressBlock(
  stack: Stack,
  lot: Pick<Lot, "key" | "hMax">,
  run: RunContext,
  entries: Entries,
  fronts: FrontTable = {},
  kerbM: number = KERB_FROM_FRONT_M,
  probe = false,
): DressResult {
  const used0 = run.used ?? NO_USED;
  const used: RunUsed = { ...used0 };
  const out: DressPiece[] = [];
  const perColumn = new Map<number, number>();
  const kerb = run.frame?.kerb_m ?? kerbM;
  const hMaxM = lot.hMax / WORLD_PER_METRE;
  const cols = stack.columns;

  const rawSize = (key: CalibrationKey): Size3 | null => {
    const e = entries.get(key);
    if (!e || e.warnings.includes("scale-suspect")) return null;
    const s = sizeOf(e);
    return s.every((v) => Number.isFinite(v) && v >= 0) && s[0] > 0 && s[1] > 0 ? (s as Size3) : null;
  };
  const yawOf = (key: CalibrationKey): number => {
    const bf = Object.prototype.hasOwnProperty.call(fronts, key) ? fronts[key] : undefined;
    return frontYaw(bf?.front ?? DRESS_FRONTS[key] ?? "+z");
  };
  const turned = (size: Size3, yaw: number): { w: number; d: number } => (quarterYaw(yaw) ? { w: size[2], d: size[0] } : { w: size[0], d: size[2] });
  const nudge = (key: CalibrationKey): number => DRESS_NUDGE_M[key] ?? 0;

  /**
   * All-or-nothing: the group goes in only if no column would pass `DRESS_PER_BAY_MAX`. `weight` (a group in one column) is what the group counts as against the column, where it is not its
   * piece count (the fire escape, below).
   */
  const accept = (group: readonly (DressPiece | null)[], weight?: number): boolean => {
    const g = group.filter((p): p is DressPiece => p !== null);
    if (g.length === 0 || g.length < group.length) return false;
    const need = new Map<number, number>();
    for (const p of g) need.set(p.column, (need.get(p.column) ?? 0) + 1);
    if (weight !== undefined) for (const c of need.keys()) need.set(c, weight);
    for (const [c, n] of need) if ((perColumn.get(c) ?? 0) + n > DRESS_PER_BAY_MAX) return false;
    for (const [c, n] of need) perColumn.set(c, (perColumn.get(c) ?? 0) + n);
    out.push(...g);
    return true;
  };

  // ---- the stack's own geometry ----
  const roofOf = new Map<number, StackPiece>();
  for (const p of stack.pieces) if (p.role === "roof") roofOf.set(p.column, p);
  const floorYs = stack.pieces.filter((p) => p.role === "floor").map((p) => p.y);
  const firstFloorY = floorYs.length > 0 ? Math.min(...floorYs) : null;
  const apartment = stack.pieces.some((p) => /SM_Bld_Apartment_/.test(p.key));

  /** The stack piece that stands behind x at height y: the highest one starting at or under y that spans x. */
  const hostAt = (x: number, y: number): StackPiece | null => {
    let best: StackPiece | null = null;
    for (const p of stack.pieces) {
      if (p.role === "roof" || Math.abs(p.x - x) > p.w / 2 + 1e-6 || p.y > y + EPS) continue;
      if (!best || p.y > best.y) best = p;
    }
    return best;
  };
  const faceZ = (h: StackPiece): number => h.z + h.d / 2;

  /** A prop whose back lies on its host's front face, centred on x (clamped inside [left, right]), base at y; null when it does not fit or reaches past the kerb. */
  const onFace = (key: CalibrationKey, slot: DressSlotKind, column: number, x: number, y: number, left: number, right: number, reach = kerb): DressPiece | null => {
    const size = rawSize(key);
    if (!size) return null;
    const yaw = yawOf(key);
    const { w, d } = turned(size, yaw);
    if (w > right - left + EPS) return null;
    const xx = Math.min(Math.max(x, left + w / 2), right - w / 2);
    const host = hostAt(xx, y);
    if (!host) return null;
    const z = faceZ(host) + nudge(key) + d / 2;
    if (z + d / 2 > reach + EPS) return null;
    return { key, slot, x: xx, y, z, yaw, column, w, h: size[1], d };
  };

  // ---- the ground row ----
  const bays: Bay[] = [];
  for (const b of stack.pieces.filter((p) => p.role === "base").sort((p, q) => p.x - q.x)) {
    const role = dressRoleOf(b);
    const kind = role === "base.door" ? "door" : role === "base.corner" ? "corner" : /SM_Bld_Shop_\d\d$/.test(b.key) ? "shop" : null;
    if (!kind) continue;
    const spanned = cols.map((c, i) => ({ c, i })).filter(({ c }) => Math.abs(c.x - b.x) <= b.w / 2 + 1e-6);
    if (spanned.length === 0) continue;
    bays.push({
      b,
      kind,
      col: spanned[0]!.i,
      cols: spanned.map((s) => s.i),
      left: Math.min(...spanned.map(({ c }) => c.x - c.w / 2)),
      right: Math.max(...spanned.map(({ c }) => c.x + c.w / 2)),
      cx: b.x,
    });
  }
  const shopBays = bays.filter((b) => b.kind !== "door");

  // ---- fire escape: decided first, because its column keeps the ground row plain ----
  // Ticket 058: one platform on every storey over the base, the deck of each `ESCAPE_DECK_BELOW_SILL_M` under that storey's window sill, each piece scaled in y so its flight meets the deck above and
  // shifted in x so the flight arrives at the upper deck's hatch (`planEscape`); the first piece's ladder is drawn down to the walk. Where the pack's pieces are missing or do not fit the storey
  // pitch, the escape is drawn in code (`codeEscape`). Eligibility is 052's: `ESCAPE_MIN_BAYS`, a mid column that is not a door column. Whether this block gets one is not decided here (ticket 061):
  // `run.escape` says it was chosen by `escapeBlocks`, by hash rank, so the share of qualifying blocks with an escape is a guarantee.
  const escape = ((): { col: number; pieces: DressPiece[]; weight: number } | null => {
    if (!apartment || stack.bays < ESCAPE_MIN_BAYS || stack.floors < 2 || run.escape === false || firstFloorY === null) return null;
    const doorCols = new Set(bays.filter((b) => b.kind === "door").flatMap((b) => b.cols));
    const eligible = cols.map((c, i) => ({ c, i })).filter(({ c, i }) => c.corner === null && !doorCols.has(i) && roofOf.has(i));
    const pick = pickOf(eligible, lot.key, "escapecol");
    if (!pick) return null;
    const storeys = storeysOfColumn(stack, pick.i);
    if (storeys.length !== stack.floors) return null;
    const cx = pick.c.x;
    // Against the column's cap the escape counts what 052's stacking by bounds used (the tall landing, a middle piece while it and the top still fit under the roof, the top piece): a piece for
    // every storey is one more on a four or five storey block, and the cap's other pieces (signs, the canopy, roof props, the ATM, wall props) must not change with it (ticket 058, criterion 7).
    const height = (key: CalibrationKey): number => rawSize(key)?.[1] ?? Infinity;
    const [top, mid, first] = ESCAPES as [CalibrationKey, CalibrationKey, CalibrationKey];
    const roofY = roofOf.get(pick.i)!.y;
    let weight = 0;
    let at = firstFloorY;
    if (at + height(first) <= roofY + EPS) {
      weight++;
      at += height(first);
    }
    while (at + height(mid) + height(top) <= roofY + EPS) {
      weight++;
      at += height(mid);
    }
    if (at + height(top) <= roofY + EPS) weight++;
    const pieces: DressPiece[] = [];
    // The pack's pieces, upright (a front other than "+z" would turn the measured frame, which is not worked out).
    const plan = planEscape(storeys, (key) => (yawOf(key) === 0 ? rawSize(key) : null));
    if (plan && plan.span_m <= pick.c.w + EPS) {
      for (let j = 0; j < plan.slots.length; j++) {
        const slot = plan.slots[j]!;
        const size = rawSize(slot.key)!;
        const x = cx + slot.x;
        // The piece stands against the storey it serves: its legs may hang a little under that floor, where the sill is low.
        const host = hostAt(x, storeys[j]!.y);
        if (!host) return null;
        const z = faceZ(host) + nudge(slot.key) + size[2] / 2;
        if (z + size[2] / 2 > kerb + EPS) return null;
        pieces.push({ key: slot.key, slot: "escape", x, y: slot.y, z, yaw: 0, column: pick.i, w: slot.w, h: slot.h, d: size[2], scaleY: slot.scaleY });
      }
      // The drop ladder reaches the walk: boxes from y 0 up to where the pack's ladder starts.
      const first = pieces[0]!;
      const g = ESCAPE_GEOMETRY[ESCAPE_FIRST]!;
      if (g.ladderFoot_m !== null && g.ladder_m !== null && first.scaleY !== undefined) {
        const foot = first.y + g.ladderFoot_m * first.scaleY;
        if (foot < -ESCAPE_GROUND_TOL_M) return null;
        const parts = ladderParts(foot, first.y, g.ladder_m[0], g.ladder_m[1], (g.ladder_m[2] + g.ladder_m[3]) / 2);
        if (parts.length > 0) first.parts = parts;
      }
      return { col: pick.i, pieces, weight };
    }
    // Code-drawn: one piece with its boxes. With nothing loaded at all (no City Pack, the dressing not asked for) there is no dressing, escape included.
    if (entries.size === 0) return null;
    const decks = storeys.map((s) => s.y + s.sill - ESCAPE_DECK_BELOW_SILL_M);
    const baseY = decks[0]! - CODE_ESCAPE.deck;
    const host = hostAt(cx, storeys[0]!.y);
    if (!host) return null;
    const z = faceZ(host) + CODE_ESCAPE.d / 2;
    if (z + CODE_ESCAPE.d / 2 > kerb + EPS || CODE_ESCAPE.w > pick.c.w + EPS) return null;
    pieces.push({ key: CODE_ESCAPE_KEY, slot: "escape", x: cx, y: baseY, z, yaw: 0, column: pick.i, w: CODE_ESCAPE.w, h: decks[decks.length - 1]! + CODE_ESCAPE.rail - baseY, d: CODE_ESCAPE.d, parts: codeEscape(decks, baseY) });
    return { col: pick.i, pieces, weight: 1 };
  })();
  const plain = (b: Bay): boolean => !escape || !b.cols.includes(escape.col);
  // Ticket 061: a chosen block's escape takes its column's room first (`DRESS_PER_BAY_MAX`), so no other piece can crowd it out. It joins the block's pieces where it always did (after the roof's large prop).
  let escapeIn = false;
  if (escape && escape.weight <= DRESS_PER_BAY_MAX) {
    perColumn.set(escape.col, escape.weight);
    escapeIn = true;
  }
  if (probe) return { pieces: escapeIn ? escape!.pieces : [], used };

  // ---- glass ----
  const glassOf = new Map<Bay, DressPiece>();
  for (const bay of shopBays) {
    const key = k(bay.b.key.slice("city-pack:".length) + "_Glass");
    if (!GLASS_SET.has(key)) continue;
    const size = rawSize(key);
    if (!size) continue;
    const wrap = size[2] > GLASS_WRAP_DEPTH_M;
    // Glass is authored in its shop's frame, so it follows the shop's turn. A flat pane is thin along z whatever its shop's front says (a quarter-turned shop
    // would stand it on its edge), so only a wrap (a square corner pane) takes a quarter turn from its host; a flat pane then uses its own front.
    const yaw = Object.prototype.hasOwnProperty.call(fronts, key) || (!wrap && quarterYaw(bay.b.yaw)) ? yawOf(key) : bay.b.yaw;
    const { w, d } = turned(size, yaw);
    const z = (wrap ? bay.b.z : faceZ(bay.b) - GLASS_INSET_M + d / 2) + nudge(key);
    glassOf.set(bay, { key, slot: "glass", x: bay.b.x, y: GLASS_SILL_M, z, yaw, column: bay.col, w, h: size[1], d });
  }
  for (const g of glassOf.values()) accept([g]);
  const glassTop = (bay: Bay): number => {
    const g = glassOf.get(bay);
    return g ? g.y + g.h : 0;
  };

  // ---- awnings: one key for the block, on each shop bay by probability, only those that stop short of the kerb ----
  const awningOf = new Map<Bay, DressPiece>();
  {
    const awnReach = kerb - AWNING_KERB_M;
    const wanting = shopBays.filter((b) => plain(b) && dressUnit(lot.key, "awning", b.col) < P_AWNING);
    const tryKey = (key: CalibrationKey, bay: Bay): DressPiece | null => onFace(key, "awning", bay.col, bay.cx, Math.max(AWNING_BASE_M, glassTop(bay)), bay.left, bay.right, awnReach);
    let best: CalibrationKey | null = null;
    let bestN = -1;
    for (const key of rotated(AWNINGS, lot.key, "awningkey")) {
      if (!rawSize(key)) continue;
      const n = wanting.filter((b) => tryKey(key, b) !== null).length;
      if (n > bestN) {
        best = key;
        bestN = n;
      }
      if (n === wanting.length) break;
    }
    for (const bay of wanting) {
      let p: DressPiece | null = null;
      if (bay.kind === "corner") {
        // The L-shaped awning wraps a corner shop: centred on its footprint, and inside its column.
        const key = AWNING_CORNER[0]!;
        const size = rawSize(key);
        if (size) {
          const yaw = bay.b.yaw;
          const { w, d } = turned(size, yaw);
          const col = cols[bay.col]!;
          const z = bay.b.z + nudge(key);
          if (w <= col.w + EPS && z + d / 2 <= awnReach + EPS) p = { key, slot: "awning", x: bay.b.x, y: Math.max(AWNING_BASE_M, glassTop(bay)), z, yaw, column: bay.col, w, h: size[1], d };
        }
      }
      if (!p && best) p = tryKey(best, bay);
      if (p && accept([p])) awningOf.set(bay, p);
    }
  }

  // ---- the big roof prop: at most one per block, chosen before the small ones so it takes its column ----
  const roofCell = (col: number): { left: number; right: number; back: number; front: number; top: number } | null => {
    const r = roofOf.get(col);
    const c = cols[col];
    if (!r || !c) return null;
    return {
      left: Math.max(r.x - r.w / 2, c.x - c.w / 2) + ROOF_EDGE_M,
      right: Math.min(r.x + r.w / 2, c.x + c.w / 2) - ROOF_EDGE_M,
      back: r.z - r.d / 2 + ROOF_EDGE_M,
      front: r.z + r.d / 2 - ROOF_EDGE_M,
      top: r.y + r.h,
    };
  };
  /** A prop on a roof cell, its front edge on the cell's front, or null when it does not fit its footprint or the height cap. */
  const onRoof = (
    key: CalibrationKey,
    slot: DressSlotKind,
    col: number,
    cell: { left: number; right: number; back: number; front: number; top: number },
    where: { fx: number; fz: number } | "front",
    heightMax: number,
    yawFlip = false,
  ): DressPiece | null => {
    const size = rawSize(key);
    if (!size) return null;
    const yaw = yawOf(key) + (yawFlip ? Math.PI : 0);
    const { w, d } = turned(size, yaw);
    if (w > cell.right - cell.left + EPS || d > cell.front - cell.back + EPS || cell.top + size[1] > heightMax + EPS) return null;
    const x = where === "front" ? (cell.left + cell.right) / 2 : cell.left + w / 2 + where.fx * (cell.right - cell.left - w);
    const z = where === "front" ? cell.front - d / 2 : cell.back + d / 2 + where.fz * (cell.front - cell.back - d);
    return { key, slot, x, y: cell.top, z: z + nudge(key), yaw: normYaw(yaw), column: col, w, h: size[1], d };
  };

  const largeCol = new Set<number>();
  if (dressUnit(lot.key, "large") < P_ROOF_LARGE) {
    type Kind = "tower" | "access" | "billboard" | "novelty";
    const kinds: Kind[] = run.lowest && used.novelty === 0 ? ["novelty", ...rotated<Kind>(["tower", "access", "billboard"], lot.key, "largekind")] : rotated<Kind>(["tower", "access", "billboard"], lot.key, "largekind");
    const roofCols = cols
      .map((c, i) => ({ c, i }))
      .filter(({ i }) => roofOf.has(i) && DRESS_SLOTS[dressRoleOf(roofOf.get(i)!)].includes("roofLarge"));
    const colOrder = rotated(roofCols, lot.key, "largecol");
    let done = false;
    for (const kind of kinds) {
      if (done) break;
      if (kind === "billboard" && used.billboard > 0) continue;
      for (const { i } of colOrder) {
        const cell = roofCell(i);
        if (!cell || done) continue;
        let group: (DressPiece | null)[] = [];
        if (kind === "tower") group = [onRoof(ROOF_WATER_TOWER, "roofLarge", i, cell, "front", hMaxM)];
        else if (kind === "access") group = [onRoof(ROOF_ACCESS, "roofLarge", i, cell, "front", hMaxM)];
        else if (kind === "novelty") {
          for (const key of rotated(NOVELTY_SIGNS, lot.key, "novelty")) {
            const p = onRoof(key, "roofLarge", i, cell, "front", hMaxM);
            if (p) {
              group = [p];
              break;
            }
          }
        } else {
          const face = pickOf(BILLBOARD_FACES.filter((q) => rawSize(q)), lot.key, "face");
          const fsize = face ? rawSize(face) : null;
          const fd = face && fsize ? turned(fsize, yawOf(face)).d : 0;
          // The face stands in front of its structure, so the structure steps back by the face's depth and the face ends on the roof inset.
          const structure = onRoof(BILLBOARD_STRUCTURE, "roofLarge", i, { ...cell, front: cell.front - fd }, "front", hMaxM);
          if (structure && face && fsize) {
            const yaw = yawOf(face);
            const { w, d } = turned(fsize, yaw);
            const faceP: DressPiece = {
              key: face,
              slot: "roofLarge",
              x: structure.x,
              y: structure.y + BILLBOARD_SIGN_Y_M,
              z: structure.z + structure.d / 2 + d / 2 + nudge(face),
              yaw,
              column: i,
              w,
              h: fsize[1],
              d,
            };
            const fits = faceP.x - w / 2 >= cell.left - EPS && faceP.x + w / 2 <= cell.right + EPS && faceP.z + d / 2 <= cell.front + EPS && faceP.z + d / 2 <= kerb && cell.top + faceP.y - structure.y + fsize[1] <= hMaxM + EPS;
            group = fits ? [structure, faceP] : [];
          }
        }
        if (group.length > 0 && accept(group)) {
          largeCol.add(i);
          if (kind === "billboard") used.billboard++;
          if (kind === "novelty") used.novelty++;
          done = true;
        }
      }
    }
  }

  // ---- fire escape goes in now (it was decided first) ----
  if (escapeIn) out.push(...escape!.pieces);

  // ---- signs: a fascia sign by probability over the awning (or the glass); at most one blade sign, on a bay with no awning ----
  {
    const usedSigns = new Set<CalibrationKey>();
    const signY = (bay: Bay): number => {
      const a = awningOf.get(bay);
      return a ? a.y + a.h : Math.max(SIGN_BASE_M, glassTop(bay));
    };
    const roofTopOf = (bay: Bay): number => roofOf.get(bay.col)?.y ?? stack.height_m;
    let bladeBay: Bay | null = null;
    if (dressUnit(lot.key, "blade") < P_BLADE) {
      const eligible = shopBays.filter((b) => plain(b) && !awningOf.has(b));
      bladeBay = pickOf(eligible, lot.key, "bladebay") ?? null;
    }
    if (bladeBay) {
      for (const key of rotated(SIGNS_BLADE, lot.key, "bladekey")) {
        const y = Math.max(signY(bladeBay), SIGN_BASE_M);
        const size = rawSize(key);
        if (!size || y + size[1] > roofTopOf(bladeBay) + EPS) continue;
        const w = turned(size, yawOf(key)).w;
        const p = onFace(key, "sign", bladeBay.col, bladeBay.left + BLADE_INSET_M + w / 2, y, bladeBay.left, bladeBay.right);
        if (p && accept([p])) {
          usedSigns.add(key);
          break;
        }
      }
    }
    for (const bay of shopBays) {
      if (bay === bladeBay || !plain(bay) || dressUnit(lot.key, "sign", bay.col) >= P_SIGN) continue;
      for (const key of rotated(SIGNS_FASCIA, lot.key, "signkey", bay.col)) {
        if (usedSigns.has(key)) continue;
        const y = signY(bay);
        const size = rawSize(key);
        if (!size || y + size[1] > roofTopOf(bay) + EPS) continue;
        const p = onFace(key, "sign", bay.col, bay.cx, y, bay.left, bay.right);
        if (p && accept([p])) {
          usedSigns.add(key);
          break;
        }
      }
    }
  }

  // ---- door canopy ----
  const doorBays = bays.filter((b) => b.kind === "door");
  for (const bay of doorBays) {
    if (dressUnit(lot.key, "canopy", bay.col) >= P_CANOPY) continue;
    for (const key of rotated(DOOR_CANOPIES, lot.key, "canopykey")) {
      const p = onFace(key, "awning", bay.col, bay.cx, DOOR_CANOPY_Y_M, bay.left, bay.right);
      if (p && accept([p])) break;
    }
  }

  // ---- small roof props: each roof column by probability, one or two, in cells ----
  for (const [col, roof] of [...roofOf.entries()].sort((a, b) => a[0] - b[0])) {
    if (largeCol.has(col) || !DRESS_SLOTS[dressRoleOf(roof)].includes("roofSmall")) continue;
    if (dressUnit(lot.key, "roofsmall", col) >= P_ROOF_SMALL) continue;
    const cell = roofCell(col);
    if (!cell || cell.right <= cell.left || cell.front <= cell.back) continue;
    const count = ROOF_SMALL_PER_BAY >= 2 && dressUnit(lot.key, "roofsecond", col) < P_ROOF_SECOND ? 2 : 1;
    const mid = (cell.left + cell.right) / 2;
    const cells = count === 2 ? [{ ...cell, right: mid }, { ...cell, left: mid }] : [cell];
    cells.forEach((c, n) => {
      for (const key of rotated(ROOF_SMALL, lot.key, "roofkey", col, n)) {
        const flip = ROOF_TURNABLE.has(key) && dressUnit(lot.key, "roofflip", col, n, key) < 0.5;
        const p = onRoof(key, "roofSmall", col, c, { fx: dressUnit(lot.key, "roofx", col, n), fz: dressUnit(lot.key, "roofz", col, n) }, Infinity, flip);
        if (p && accept([p])) break;
      }
    });
  }

  // ---- ATM: at most one per block and `ATM_PER_RUN` per run, beside a residents' door ----
  if (used.atm < ATM_PER_RUN && dressUnit(lot.key, "atm") < P_ATM) {
    for (const bay of doorBays) {
      const key = ATMS[0]!;
      const size = rawSize(key);
      if (!size || bay.b.role !== "base") continue;
      const side = dressUnit(lot.key, "atmside", bay.col) < 0.5 ? -1 : 1;
      const p = onFace(key, "wall", bay.col, bay.cx + side * (bay.b.w / 2 - size[0] / 2 - ATM_PIER_M), ATM_Y_M, bay.left, bay.right);
      if (p && accept([p])) {
        used.atm++;
        break;
      }
    }
  }

  // ---- wall AC units and window planters on the upper floors ----
  if (apartment && firstFloorY !== null) {
    let walls = 0;
    const levels = Math.max(0, stack.floors);
    for (let level = WALL_MIN_LEVEL; level <= levels && walls < WALL_PROPS_PER_BLOCK; level++) {
      for (let i = 0; i < cols.length && walls < WALL_PROPS_PER_BLOCK; i++) {
        const c = cols[i]!;
        const roof = roofOf.get(i);
        if (!roof || (escape && escape.col === i)) continue;
        const y0 = firstFloorY + (level - 1) * ((roof.y - firstFloorY) / levels);
        const u = dressUnit(lot.key, "wall", i, level);
        const left = c.x - c.w / 2;
        const right = c.x + c.w / 2;
        let p: DressPiece | null = null;
        if (u < P_WALL_AC) {
          const key = pickOf(WALL_ACS, lot.key, "wallackey", i, level)!;
          const side = dressUnit(lot.key, "wallside", i, level) < 0.5 ? -1 : 1;
          p = onFace(key, "wallUpper", i, c.x + side * WALL_AC_OFFSET_M, y0 + WALL_AC_LIFT_M, left, right);
        } else if (u < P_WALL_AC + P_PLANTER) {
          const key = pickOf(WALL_PLANTERS, lot.key, "wallplkey", i, level)!;
          p = onFace(key, "wallUpper", i, c.x, y0 + PLANTER_LIFT_M, left, right);
        }
        if (p && accept([p])) walls++;
      }
    }
  }

  return { pieces: out, used };
}

function normYaw(a: number): number {
  let y = a;
  while (y > Math.PI + EPS) y -= 2 * Math.PI;
  while (y <= -Math.PI + EPS) y += 2 * Math.PI;
  return y;
}

/** The dressing of one block, dressed alone (no earlier blocks in its run). See `dressBlock` for the run-carrying form and `dressTown` for a whole town. */
export function dressStack(stack: Stack, lot: Pick<Lot, "key" | "hMax">, run: RunContext, entries: Entries, fronts: FrontTable = {}, kerbM: number = KERB_FROM_FRONT_M): DressPiece[] {
  return dressBlock(stack, lot, run, entries, fronts, kerbM).pieces;
}

export interface DressBlockInput {
  stack: Stack;
  lot: Pick<Lot, "key" | "hMax">;
  run: { id: string; index: number; lowest: boolean; frame?: { readonly wall_m: number; readonly kerb_m: number } };
  /** The lot front to the road edge, metres; default `KERB_FROM_FRONT_M` (a `run.frame` wins). */
  kerbM?: number;
}

/** What `dressTown` is given beyond the blocks (ticket 061). */
export interface DressTownOptions {
  /** The share of qualifying blocks that get a fire escape (default `ESCAPE_SHARE_LADDER`). */
  escapeShare?: number;
}

/** The qualifying blocks of a town as `escapeBlocks` sees them: R7's definition (`citymetrics.ts`), and whether the block can hold an escape. */
export function escapeSitesOf(blocks: readonly DressBlockInput[], entries: Entries, fronts: FrontTable = {}): EscapeSite[] {
  return probeEscapes(blocks, entries, fronts).sites;
}

/** Each block's escape as it would stand (a probe of `dressBlock` that stops after the escape), and the sites `escapeBlocks` chooses among. A block that cannot hold one has no pieces. */
function probeEscapes(blocks: readonly DressBlockInput[], entries: Entries, fronts: FrontTable): { sites: EscapeSite[]; pieces: DressPiece[][] } {
  const pieces: DressPiece[][] = [];
  const sites = blocks.map((bl, i) => {
    const st = bl.stack;
    const qualifies = st.bays >= ESCAPE_MIN_BAYS && st.floors >= 2 && st.style.startsWith("apartment");
    pieces.push(qualifies ? dressBlock(st, bl.lot, { ...bl.run, escape: true }, entries, fronts, bl.kerbM, true).pieces : []);
    return { id: String(i), key: bl.lot.key, run: bl.run.id, qualifies, hosts: pieces[i]!.length > 0 };
  });
  return { sites, pieces };
}

/**
 * The dressing of every block, in the order given (a run's blocks in run order), threading each run's caps (ATM, billboard, novelty sign) along it. The result is aligned with `blocks`. Once
 * `DRESS_MAX` pieces are placed, later blocks stay plain, but for a chosen block's escape.
 *
 * Ticket 061: before any block is dressed, `escapeBlocks` chooses which blocks get a fire escape: exactly `ceil(escapeShare x qualifying)` of them, by hash rank, never two neighbours in a run. The
 * share is the map's R7 floor: `ESCAPE_SHARE_LADDER` (the default) on a puzzle map, `TILE_CITY_R7_MIN` on a tile city. A block is told whether it was chosen (`run.escape`); the choice is made from what
 * each block can hold (a probe of `dressBlock` that stops after its escape), so a chosen block always shows one.
 */
export function dressTown(blocks: readonly DressBlockInput[], entries: Entries, fronts: FrontTable = {}, opts: DressTownOptions = {}): DressPiece[][] {
  const probe = probeEscapes(blocks, entries, fronts);
  const chosen = escapeBlocks(probe.sites, opts.escapeShare ?? ESCAPE_SHARE_LADDER).chosen;
  const runs = new Map<string, RunUsed>();
  const out: DressPiece[][] = [];
  let total = 0;
  // A chosen block keeps its escape even past `DRESS_MAX` (the cap is on the rest of the dressing, and an escape is a handful of pieces): the share is a guarantee.
  const escapeOnly = (): DressPiece[] => (chosen.has(String(out.length)) ? probe.pieces[out.length]! : []);
  for (const bl of blocks) {
    const used = runs.get(bl.run.id) ?? NO_USED;
    if (total >= DRESS_MAX) {
      const e = escapeOnly();
      total += e.length;
      out.push(e);
      continue;
    }
    const r = dressBlock(bl.stack, bl.lot, { ...bl.run, used, escape: chosen.has(String(out.length)) }, entries, fronts, bl.kerbM);
    if (total + r.pieces.length > DRESS_MAX) {
      const e = escapeOnly();
      out.push(e);
      total = Math.max(DRESS_MAX, total) + e.length;
      continue;
    }
    total += r.pieces.length;
    runs.set(bl.run.id, r.used);
    out.push(r.pieces);
  }
  return out;
}

