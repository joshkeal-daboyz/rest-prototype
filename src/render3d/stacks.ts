/**
 * Ticket 050 A: City Pack buildings as stacks (a shopfront base, apartment or office floors, a roof), as pure data and pure maths.
 * No three, no DOM, no fetch, no GLB: the recipes name pieces by `city-pack:<name>` keys; sizes come from the manifest entries the caller passes
 * (fixture numbers in tests); fronts come from the `FrontTable` the caller passes. Nothing here trusts a saved front: a front is only a yaw and a
 * width/depth swap, and the stack gallery (section B) is where Josh sees whether it is right.
 *
 * The lot frame: the origin is the front-centre of the lot, +x runs along the road, +z points at the road (the lot's front), and the stack
 * stands at z <= 0 with its frontmost piece face on z = 0. Metres, y up. `yaw` is the turn about y three.js applies (x' = x cos + z sin,
 * z' = -x sin + z cos), the same as `frontYaw` in models.ts, so a piece whose door faces `f` in its own frame faces +z after `frontYaw(f)`.
 *
 * Every piece is placed by its base centre, as the converter centres every pivot in x and z and puts the base at y = 0 (src/core/assets.ts).
 */

import type { AssetEntry, CalibrationKey } from "../core";
import { stableHash } from "../render/city";
import { BUILDING_FRONTS, STACK_LOT_TYPES, frontIsQuarter, frontYaw, sizeOf, type FrontTable, type ModelFront, type StackOffer } from "./models";
import { LOT_TYPES, type Lot, type LotSpec, type LotType } from "./town";

export type StackRole = "base" | "floor" | "roof";
/** A side of the lot along the road, in the lot frame. */
export type StackSide = "+x" | "-x";

/**
 * A place for dressing that a later section fills (awnings, fire escapes, rooftop props). Declared now so a recipe can carry its own slots;
 * section A's assembly ignores them and every recipe leaves them empty.
 */
export interface StackPropSlot {
  id: string;
  /** Where the prop stands: on a street face of a storey, on the roof, or on the ground in front. */
  anchor: "street-face" | "roof" | "ground";
  keys: CalibrationKey[];
}

export interface StackStyle {
  id: string;
  pack: "city-pack";
  /** `mid` is the ground row of a mid-row column (shops; one may span two bays), `door` the residents' door (never in a corner column), `corner` the corner base. */
  base: { mid: CalibrationKey[]; door?: CalibrationKey[]; corner: CalibrationKey[] };
  /** `stack3` is a piece that is three mid floors in one, parallel to `mid` (used for runs of three). */
  floor: { mid: CalibrationKey[]; corner: CalibrationKey[]; stack3?: CalibrationKey[] };
  roof: { mid: CalibrationKey[]; corner: CalibrationKey[] };
  /**
   * `base` and `floor` are storey pitches (metres): the height one takes, from a recipe number and not each piece's bounds (shop pieces stand
   * 3.05 to 3.30 m, taken to be signs and parapets). `roof` is the height reserved for the roof when counting floors under a cap; the roof's real
   * height (the entry's) is used too if it is taller, so a wrong number here cannot push a stack over its cap.
   */
  pitch_m: Record<StackRole, number>;
  /** "bay": a row of columns, each one bay wide. "footprint": one column, the whole building (an office). */
  depth: "bay" | "footprint";
  /**
   * A corner piece's second street face, on the lot side it is in once its front is turned to the road. Every entry is a guess until Josh confirms it
   * in the stack gallery; a `BuildingFront.open` in the fronts table wins over it (section B, from the 050 A review).
   */
  open?: Partial<Record<CalibrationKey, StackSide>>;
  /** Metres toward the street (+) or away (-) for a piece the gallery shows off. */
  nudge_m?: Partial<Record<CalibrationKey, number>>;
  /** The fewest floors over the base on a type, where this style differs from `STACK_FLOORS`. */
  min_floors?: Partial<Record<LotType, number>>;
  props?: readonly StackPropSlot[];
}

const k = (name: string): CalibrationKey => `city-pack:${name}`;

/** The shop ground floors shared by every apartment style; `Shop_03` is two bays wide (its width tells the assembly). */
const SHOPS = ["SM_Bld_Shop_01", "SM_Bld_Shop_02", "SM_Bld_Shop_04", "SM_Bld_Shop_05", "SM_Bld_Shop_06", "SM_Bld_Shop_03"].map(k);
const DOORS = ["SM_Bld_Apartment_Door_01", "SM_Bld_Apartment_Door_02"].map(k);
const SHOP_CORNERS = ["SM_Bld_Shop_Corner_01", "SM_Bld_Shop_Corner_02"].map(k);

/** The three apartment styles: the base is shared, the floors and roofs are per style (`_01` to `_03`). Roof heights are from the manifest (0.50 / 0.744 / 0.744 m). */
function apartment(n: "01" | "02" | "03", roofReserve: number): StackStyle {
  const floor = k(`SM_Bld_Apartment_${n}`);
  const corner = k(`SM_Bld_Apartment_Corner_${n}`);
  const roof = k(`SM_Bld_Apartment_Roof_${n}`);
  const roofCorner = k(`SM_Bld_Apartment_Roof_Corner_${n}`);
  return {
    id: `apartment-${n}`,
    pack: "city-pack",
    base: { mid: SHOPS, door: DOORS, corner: SHOP_CORNERS },
    floor: { mid: [floor], corner: [corner], stack3: [k(`SM_Bld_Apartment_Stack_${n}`)] },
    roof: { mid: [roof], corner: [roofCorner] },
    pitch_m: { base: 3, floor: 3, roof: roofReserve },
    depth: "bay",
    // Guesses: no data says which end a corner piece's second face is on.
    open: Object.fromEntries([...SHOP_CORNERS, corner, roofCorner].map((c) => [c, "+x" as const])),
    props: [],
  };
}

/** An office: one column, a base, floors and a roof, no corner pieces (Square and Round have no floor piece, so they are not here). */
function office(id: string, name: string, pitch: Record<StackRole, number>, minFloors: Partial<Record<LotType, number>>): StackStyle {
  return {
    id,
    pack: "city-pack",
    base: { mid: [k(`SM_Bld_${name}_Base_01`)], corner: [] },
    floor: { mid: [k(`SM_Bld_${name}_Floor_01`)], corner: [] },
    roof: { mid: [k(`SM_Bld_${name}_Roof_01`)], corner: [] },
    pitch_m: pitch,
    depth: "footprint",
    min_floors: minFloors,
    props: [],
  };
}

/**
 * Every City Pack recipe. Roles list the keys a style may use; a key the manifest lacks drops out, and a role with none left drops the style.
 * Add a piece kind or a style here and nothing else changes. Office floors run 1 up to what the cap allows on house and large, 3 up on tall (Q2).
 */
export const STACK_STYLES: readonly StackStyle[] = [
  apartment("01", 0.5),
  apartment("02", 0.75),
  apartment("03", 0.75),
  office("office-old-small", "OfficeOld_Small", { base: 6, floor: 3.19, roof: 4.22 }, { house: 1, large: 1, tall: 3 }),
  office("office-old-large", "OfficeOld_Large", { base: 6, floor: 3.19, roof: 4.23 }, { house: 1, large: 1, tall: 3 }),
  office("office-octagon", "OfficeOctagon", { base: 3.9, floor: 3, roof: 5.38 }, { house: 1, large: 1, tall: 3 }),
];

/** The fewest floors over the base per lot type (ticket 050 Q2): so large is 3 to 5 storeys with its base. A style may override a type (`min_floors`). */
export const STACK_FLOORS: Readonly<Record<LotType, number>> = { small: 1, house: 1, large: 2, tall: 5 };

/** Every key a style's recipe names, once each, in role order. */
export function stackKeys(style: StackStyle): CalibrationKey[] {
  const all = [
    ...style.base.mid,
    ...(style.base.door ?? []),
    ...style.base.corner,
    ...style.floor.mid,
    ...style.floor.corner,
    ...(style.floor.stack3 ?? []),
    ...style.roof.mid,
    ...style.roof.corner,
    ...(style.props ?? []).flatMap((p) => p.keys),
  ];
  return [...new Set(all)];
}

export interface StackPiece {
  key: CalibrationKey;
  /** The piece's base centre, metres, lot frame (origin at the lot's front-centre). */
  x: number;
  y: number;
  z: number;
  /** Turn about y: `frontYaw(front)`, plus a quarter for a corner piece at the end its open side is not on. */
  yaw: number;
  role: StackRole;
  /** The column it stands in (the first one, for a piece that spans two). */
  column: number;
  /** Its size after the turn, metres: along the road, up, away from the road. */
  w: number;
  h: number;
  d: number;
  /** Which of the piece's own street faces points at the road: its front, or (a corner piece turned at the far end) its open side. */
  street: "front" | "open";
}

export interface StackColumn {
  /** The column's axis, metres along the road. */
  x: number;
  w: number;
  /** The lot side this is a corner column for, or null. */
  corner: StackSide | null;
}

export interface Stack {
  style: string;
  /** `city-pack:stack:<style>`, for the variety rules. */
  family: string;
  type: LotType;
  bays: number;
  /** Floors over the base. */
  floors: number;
  /** The columns' total width (the pieces may overhang it a little, never the lot). */
  width_m: number;
  /** Back face to frontmost face. */
  depth_m: number;
  /** Top of the highest piece. */
  height_m: number;
  /** Corner columns, in the order "-x", "+x". Empty for a mid-row stack and for a style with no corner pieces. */
  cornerSides: readonly StackSide[];
  columns: readonly StackColumn[];
  pieces: readonly StackPiece[];
}

// ---- candidates: a key turned and sized ----

const EPS = 1e-9;
const QUARTER = Math.PI / 2;

interface Cand {
  key: CalibrationKey;
  yaw: number;
  /** Size after the turn. */
  w: number;
  h: number;
  d: number;
  nudge: number;
  street: "front" | "open";
}

type Entries = ReadonlyMap<CalibrationKey, AssetEntry>;

function usable(e: AssetEntry): boolean {
  if (e.warnings.includes("scale-suspect")) return false;
  const [w, h, d] = sizeOf(e);
  return [w, h, d].every((v) => Number.isFinite(v) && v > 0);
}

function normYaw(a: number): number {
  let y = a;
  while (y > Math.PI + EPS) y -= 2 * Math.PI;
  while (y <= -Math.PI + EPS) y += 2 * Math.PI;
  return y;
}

/**
 * `key` turned to face the road, or null when the manifest lacks it. `end` is the side of the lot a corner piece stands at: the piece keeps
 * its front on the road if its open side is that side, else it turns a quarter so the open side is on the road and its front on that side
 * (a yaw cannot mirror, so one corner piece serves both ends).
 */
function cand(style: StackStyle, key: CalibrationKey, entries: Entries, fronts: FrontTable, end: StackSide | null): Cand | null {
  const e = entries.get(key);
  if (!e || !usable(e)) return null;
  const [sw, sh, sd] = sizeOf(e);
  const bf = Object.prototype.hasOwnProperty.call(fronts, key) ? fronts[key] : undefined;
  const front: ModelFront = bf?.front ?? "+z";
  let yaw = frontYaw(front);
  let quarter = frontIsQuarter(front);
  let street: "front" | "open" = "front";
  if (end) {
    // The fronts table's `open` (Josh's confirmed value) wins over the recipe's guess, so a corrected `open` is honoured; then the recipe's; then "+x".
    const open = bf?.open ?? style.open?.[key] ?? "+x";
    if (open !== end) {
      yaw += open === "-x" ? QUARTER : -QUARTER;
      quarter = !quarter;
      street = "open";
    }
  }
  return { key, yaw: normYaw(yaw), w: quarter ? sd : sw, h: sh, d: quarter ? sw : sd, nudge: style.nudge_m?.[key] ?? 0, street };
}

function cands(style: StackStyle, keys: readonly CalibrationKey[] | undefined, entries: Entries, fronts: FrontTable, end: StackSide | null): Cand[] {
  const out: Cand[] = [];
  for (const key of keys ?? []) {
    const c = cand(style, key, entries, fronts, end);
    if (c) out.push(c);
  }
  return out;
}

const SIDES: readonly StackSide[] = ["-x", "+x"];

interface Kit {
  baseMid: Cand[];
  door: Cand[];
  floorMid: Cand[];
  stack3: Cand[];
  roofMid: Cand[];
  baseCorner: Record<StackSide, Cand[]>;
  floorCorner: Record<StackSide, Cand[]>;
  roofCorner: Record<StackSide, Cand[]>;
}

function kitOf(style: StackStyle, entries: Entries, fronts: FrontTable): Kit {
  const per = (keys: readonly CalibrationKey[]): Record<StackSide, Cand[]> => ({
    "-x": cands(style, keys, entries, fronts, "-x"),
    "+x": cands(style, keys, entries, fronts, "+x"),
  });
  return {
    baseMid: cands(style, style.base.mid, entries, fronts, null),
    door: cands(style, style.base.door, entries, fronts, null),
    floorMid: cands(style, style.floor.mid, entries, fronts, null),
    stack3: cands(style, style.floor.stack3, entries, fronts, null),
    roofMid: cands(style, style.roof.mid, entries, fronts, null),
    baseCorner: per(style.base.corner),
    floorCorner: per(style.floor.corner),
    roofCorner: per(style.roof.corner),
  };
}

/** A style with corner pieces in any role is a corner-capable style; one with none (an office) never has a corner column. */
function hasCornerPieces(style: StackStyle): boolean {
  return style.base.corner.length > 0 || style.floor.corner.length > 0 || style.roof.corner.length > 0;
}

/** The sides that really get a corner column: the lot's corner sides, in order, for a style with corner pieces; none otherwise. */
function effectiveSides(style: StackStyle, requested: readonly StackSide[]): StackSide[] {
  if (!hasCornerPieces(style)) return [];
  return SIDES.filter((s) => requested.includes(s));
}

const maxOf = (xs: readonly number[], floor = 0): number => xs.reduce((m, v) => Math.max(m, v), floor);

/** How many columns' span a base piece takes: one bay, or two for a double-bay shop. */
function spanOf(c: Cand, bayW: number): number {
  return Math.max(1, Math.round(c.w / bayW));
}

// ---- the range of a style on a lot type ----

/** What a style gives on a lot type: the columns across, and the floors over the base from `min` to `max`. */
export interface StackFit {
  bays: number;
  min: number;
  max: number;
}

/**
 * The most whole columns whose widest candidates fit the frontage with their end overhang (worst case over every candidate, so any pick fits),
 * or 0. `sides` are the corner columns (at the ends, each counted in `n`).
 */
function fitBays(style: StackStyle, kit: Kit, frontage: number, sides: readonly StackSide[]): number {
  const wMid = maxOf(kit.floorMid.map((c) => c.w));
  const wCorner: Record<StackSide, number> = {
    "-x": maxOf(kit.floorCorner["-x"].map((c) => c.w)),
    "+x": maxOf(kit.floorCorner["+x"].map((c) => c.w)),
  };
  // The overhang beyond the column's outer edge of the widest piece that can stand in an end column.
  const overhang = (end: StackSide | null): number => {
    if (end) {
      const col = wCorner[end];
      return maxOf([...kit.baseCorner[end], ...kit.floorCorner[end], ...kit.roofCorner[end]].map((c) => c.w / 2 - col / 2));
    }
    return maxOf([...kit.baseMid.map((c) => c.w / 2 - (spanOf(c, wMid) * wMid) / 2), ...kit.floorMid.map((c) => c.w / 2 - wMid / 2), ...kit.roofMid.map((c) => c.w / 2 - wMid / 2)]);
  };
  const left = sides.includes("-x") ? "-x" : null;
  const right = sides.includes("+x") ? "+x" : null;
  const maxN = style.depth === "footprint" ? 1 : Math.ceil(frontage / Math.max(wMid, 0.5)) + 1;
  for (let n = maxN; n >= Math.max(1, sides.length); n--) {
    const mids = n - sides.length;
    const total = mids * wMid + sides.reduce((s, side) => s + wCorner[side], 0);
    const ends = Math.max(overhang(left), overhang(right));
    if (total + 2 * ends <= frontage + EPS) return n;
  }
  return 0;
}

/** The worst-case depth, back face to frontmost face, over every candidate. */
function worstDepth(style: StackStyle, kit: Kit): number {
  const all = [
    ...kit.baseMid,
    ...kit.door,
    ...kit.floorMid,
    ...kit.stack3,
    ...kit.roofMid,
    ...SIDES.flatMap((s) => [...kit.baseCorner[s], ...kit.floorCorner[s], ...kit.roofCorner[s]]),
  ];
  if (all.length === 0) return 0;
  const [front, back] = zExtent(style);
  return Math.max(...all.map((c) => front(c))) - Math.min(...all.map((c) => back(c)));
}

/**
 * Where a piece's faces lie before the whole stack is moved so its frontmost face is on z = 0. A "bay" stack (apartments) is back-aligned: every
 * back face on one line (z = nudge), so a deeper shop sticks out toward the street. A "footprint" stack (an office) is centred in z, as it is in x,
 * so a base 10.9 m deep, a floor 10.0 m and a roof 11.2 m share one middle and no piece juts out on one side only.
 */
function zExtent(style: StackStyle): [front: (c: Cand) => number, back: (c: Cand) => number] {
  return style.depth === "footprint" ? [(c) => c.nudge + c.d / 2, (c) => c.nudge - c.d / 2] : [(c) => c.nudge + c.d, (c) => c.nudge];
}

function rangeFor(style: StackStyle, type: LotType, entries: Entries, fronts: FrontTable, sides: readonly StackSide[], spec: LotSpec = LOT_TYPES[type], exactBays?: number): StackFit | null {
  const kit = kitOf(style, entries, fronts);
  if (kit.baseMid.length === 0 || kit.floorMid.length === 0 || kit.roofMid.length === 0) return null;
  for (const s of sides) {
    if (kit.baseCorner[s].length === 0 || kit.floorCorner[s].length === 0 || kit.roofCorner[s].length === 0) return null;
  }
  const roofH = maxOf([style.pitch_m.roof, ...kit.roofMid.map((c) => c.h), ...SIDES.flatMap((s) => kit.roofCorner[s].map((c) => c.h))]);
  const max = Math.floor((spec.cap - style.pitch_m.base - roofH) / style.pitch_m.floor + EPS);
  const min = style.min_floors?.[type] ?? STACK_FLOORS[type];
  if (max < min) return null;
  if (worstDepth(style, kit) > spec.depth + EPS) return null;
  if (exactBays !== undefined) {
    // The caller (051 C's packer) sets the columns and owns the frontage: only the count has to be possible for the style.
    if (!Number.isInteger(exactBays) || exactBays < Math.max(1, sides.length) || (style.depth === "footprint" && exactBays !== 1)) return null;
    return { bays: exactBays, min, max };
  }
  const bays = fitBays(style, kit, spec.frontage, sides);
  if (bays < 1) return null;
  return { bays, min, max };
}

/**
 * What `style` gives on a lot type, for a mid-row stack (no corner column), or null when it cannot be offered: a piece missing from `entries`,
 * a column that does not fit the frontage, the depth over the lot's, or fewer floors under the cap than its minimum. `spec` stands in for the type's own
 * frontage, depth and cap (a terrace lot is not `LOT_TYPES.large`'s size, ticket 051 C); the floors minimum still comes from the type.
 */
export function stackRange(style: StackStyle, type: LotType, entries: Entries, fronts: FrontTable = BUILDING_FRONTS, spec?: LotSpec): StackFit | null {
  return rangeFor(style, type, entries, fronts, [], spec);
}

/**
 * The styles that can stand on each of `types` (default STACK_LOT_TYPES), for the town's plan (ticket 050 C): a style is offered on a type when `stackRange` gives it a
 * range there from the pieces in `entries` (so a piece that did not load, or that Josh excluded, drops the styles that need it and nothing else). A style with no type is
 * left out. Pure; empty when `entries` has no City Pack piece, which is how a fresh checkout and CI keep today's town.
 */
export function offeredStacks(
  entries: Entries,
  fronts: FrontTable = BUILDING_FRONTS,
  styles: readonly StackStyle[] = STACK_STYLES,
  types: readonly LotType[] = STACK_LOT_TYPES,
): StackOffer[] {
  const out: StackOffer[] = [];
  for (const style of styles) {
    const ok = types.filter((t) => stackRange(style, t, entries, fronts) !== null);
    if (ok.length > 0) out.push({ style: style.id, types: ok });
  }
  return out;
}

// ---- assembly ----

export interface AssembleOptions {
  /** Force the floors over the base ("max": the most the cap allows; a number is clamped into the range). Default: picked by hash per lot key. The stack gallery uses "max". */
  floors?: number | "max";
  /** The lot's own frontage, depth and cap in metres, in place of `LOT_TYPES[type]` (a terrace block, ticket 051 C). */
  spec?: LotSpec;
  /**
   * Exactly this many columns (the terrace packer picks them from the true widths), or null if the style cannot have that many. The frontage is then
   * the caller's to keep: the columns' total is `Stack.width_m`, and a piece may overhang it a little, as in any stack. Without it, the most that fit.
   */
  bays?: number;
}

interface Item {
  c: Cand;
  x: number;
  bottom: number;
  role: StackRole;
  column: number;
}

/**
 * One stack on a lot, as a list of pieces in the lot frame, or null when the style cannot stand on the lot's type (see `stackRange`).
 * - The columns lie side by side along x, each as wide as its floor piece, centred on the lot. Storeys sit at base pitch + i x floor pitch and the
 *   roof on the last. A mid column's runs of three floors are one `stack3` piece when the style has one.
 * - In a "bay" style every piece's back face lies on one line (plus its `nudge_m`), the frontmost face on z = 0, so a deeper piece (a shop's sill or sign) sticks
 *   out toward the street. In a "footprint" style (an office) the pieces are centred in z instead, the frontmost face on z = 0.
 * - `lot.cornerSides` asks for a corner column at each of its sides ("-x", "+x"), for a style with corner pieces: shop corner, corner floors and corner roof, no
 *   `stack3`. A stack with a corner column is a corner building (the caller stands it only on a lot with that corner side). Pass `cornerSides: []` for a mid-row stack.
 * - The ground row of a mid column is a shop picked by hash (a double-bay shop takes two free columns), plus one residents' door bay, never in a corner column.
 * - The floor count is picked by `stableHash(lot.key + style.id)` within the range, so it varies from lot to lot and never changes.
 */
export function assembleStack(
  style: StackStyle,
  lot: Pick<Lot, "type" | "key" | "cornerSides">,
  entries: Entries,
  fronts: FrontTable = BUILDING_FRONTS,
  opts: AssembleOptions = {},
): Stack | null {
  const sides = effectiveSides(
    style,
    lot.cornerSides.map((c) => c.side),
  );
  const spec = opts.spec ?? LOT_TYPES[lot.type];
  const range = rangeFor(style, lot.type, entries, fronts, sides, spec, opts.bays);
  if (!range) return null;
  const kit = kitOf(style, entries, fronts);
  const salt = `${lot.key}${style.id}`;
  const floors =
    opts.floors === "max"
      ? range.max
      : typeof opts.floors === "number"
        ? Math.min(range.max, Math.max(range.min, Math.round(opts.floors)))
        : range.min + (stableHash(salt) % (range.max - range.min + 1));
  const pick = <T>(xs: readonly T[], what: string): T | undefined => xs[stableHash(`${salt}${what}`) % Math.max(1, xs.length)];

  const floorMid = pick(kit.floorMid, "floor");
  const roofMid = pick(kit.roofMid, "roof");
  if (!floorMid || !roofMid) return null;
  const idx = kit.floorMid.indexOf(floorMid);
  const stack3 = kit.stack3.length > 0 ? kit.stack3[idx % kit.stack3.length] : undefined;
  const corner = {} as Record<StackSide, { base: Cand; floor: Cand; roof: Cand }>;
  for (const s of sides) {
    const base = pick(kit.baseCorner[s], `base${s}`);
    const fl = pick(kit.floorCorner[s], `floor${s}`);
    const rf = pick(kit.roofCorner[s], `roof${s}`);
    if (!base || !fl || !rf) return null;
    corner[s] = { base, floor: fl, roof: rf };
  }

  const fewest = opts.bays !== undefined ? range.bays : Math.max(1, sides.length);
  for (let n = range.bays; n >= fewest; n--) {
    const stack = build(n);
    if (stack) return stack;
  }
  return null;

  function build(n: number): Stack | null {
    // Columns.
    const columns: StackColumn[] = [];
    const cornerAt = (i: number): StackSide | null => (i === 0 && sides.includes("-x") ? "-x" : i === n - 1 && sides.includes("+x") ? "+x" : null);
    let total = 0;
    for (let i = 0; i < n; i++) {
      const end = cornerAt(i);
      const w = end ? corner[end].floor.w : floorMid!.w;
      columns.push({ x: total + w / 2, w, corner: end });
      total += w;
    }
    for (const col of columns) col.x -= total / 2;

    // The ground row.
    const mids: number[] = [];
    for (let i = 0; i < n; i++) if (columns[i]!.corner === null) mids.push(i);
    const doorCol = kit.door.length > 0 && mids.length > 0 ? mids[stableHash(`${salt}doorcol`) % mids.length]! : -1;
    const items: Item[] = [];
    const bayW = floorMid!.w;
    for (let i = 0; i < n; ) {
      const col = columns[i]!;
      if (col.corner) {
        items.push({ c: corner[col.corner].base, x: col.x, bottom: 0, role: "base", column: i });
        i++;
      } else if (i === doorCol) {
        items.push({ c: pick(kit.door, "door")!, x: col.x, bottom: 0, role: "base", column: i });
        i++;
      } else {
        let c = pick(kit.baseMid, `shop${i}`)!;
        let span = spanOf(c, bayW);
        const free = (j: number): boolean => j < n && columns[j]!.corner === null && j !== doorCol;
        const fits = (): boolean => {
          for (let j = i; j < i + span; j++) if (!free(j)) return false;
          return true;
        };
        if (!fits()) {
          const singles = kit.baseMid.filter((s) => spanOf(s, bayW) === 1);
          if (singles.length === 0) return null;
          c = pick(singles, `shop1-${i}`)!;
          span = 1;
        }
        items.push({ c, x: (col.x + columns[i + span - 1]!.x) / 2, bottom: 0, role: "base", column: i });
        i += span;
      }
    }

    // Floors and roofs.
    for (let i = 0; i < n; i++) {
      const col = columns[i]!;
      const end = col.corner;
      let y = style.pitch_m.base;
      let left = floors;
      if (!end && stack3) {
        while (left >= 3) {
          items.push({ c: stack3, x: col.x, bottom: y, role: "floor", column: i });
          y += 3 * style.pitch_m.floor;
          left -= 3;
        }
      }
      for (; left > 0; left--) {
        items.push({ c: end ? corner[end].floor : floorMid!, x: col.x, bottom: y, role: "floor", column: i });
        y += style.pitch_m.floor;
      }
      items.push({ c: end ? corner[end].roof : roofMid!, x: col.x, bottom: y, role: "roof", column: i });
    }

    // z: back faces on one line (bay) or centres on one line (footprint), the frontmost face on z = 0.
    const [frontOf, backOf] = zExtent(style);
    const maxFront = Math.max(...items.map((it) => frontOf(it.c)));
    const minBack = Math.min(...items.map((it) => backOf(it.c)));
    const depth = maxFront - minBack;
    if (depth > spec.depth + EPS) return null;
    const pieces: StackPiece[] = items.map((it) => ({
      key: it.c.key,
      x: it.x,
      y: it.bottom,
      z: it.c.nudge - maxFront + (style.depth === "footprint" ? 0 : it.c.d / 2),
      yaw: it.c.yaw,
      role: it.role,
      column: it.column,
      w: it.c.w,
      h: it.c.h,
      d: it.c.d,
      street: it.c.street,
    }));
    const height = Math.max(...pieces.map((p) => p.y + p.h));
    if (height > spec.cap + EPS) return null;
    if (opts.bays === undefined && pieces.some((p) => p.x - p.w / 2 < -spec.frontage / 2 - EPS || p.x + p.w / 2 > spec.frontage / 2 + EPS)) return null;
    return {
      style: style.id,
      family: `city-pack:stack:${style.id}`,
      type: lot.type,
      bays: n,
      floors,
      width_m: total,
      depth_m: depth,
      height_m: height,
      cornerSides: sides,
      columns,
      pieces,
    };
  }
}

/**
 * The deepest any candidate piece of `style` stands, back face to frontmost face, metres (worst case over every piece the recipe can pick, as `stackRange`'s depth check
 * uses), or null when the manifest lacks a role. A corner block's real back wall is at most this far from its front line: the terrace packer (ticket 051 C) closes a
 * row's far end to it.
 */
export function stackDepth(style: StackStyle, entries: Entries, fronts: FrontTable = BUILDING_FRONTS): number | null {
  const kit = kitOf(style, entries, fronts);
  if (kit.baseMid.length === 0 || kit.floorMid.length === 0 || kit.roofMid.length === 0) return null;
  return worstDepth(style, kit);
}
