/**
 * Ticket 058: fire escapes that connect and meet the windows. Pure: no three, no DOM, no fetch, no GLB. Three jobs.
 *
 * A. Measure. The City Pack's three escape pieces are stacked by their bounding heights in 052, which is why the platforms drifted off the floors and the flights stopped short of the
 *    deck above: a piece's bound runs from its lowest leg to its highest rail, and says nothing about where its deck or flight is. `ESCAPE_GEOMETRY` holds, per piece, the heights read
 *    from the converted GLB (`measureEscape`: the deck is the largest upward-facing horizontal surface, the flight is the run of tread faces, the ladder is the rung set beyond the deck's
 *    front edge), and `WINDOW_SILL_M` the sill of the windows of each apartment floor piece (`measureSills`). `escapes.test.ts` pins every value as a typed-in fixture and re-measures it
 *    from the GLB when this machine has it.
 * B. Place. `planEscape` puts one platform on every storey, its deck `ESCAPE_DECK_BELOW_SILL_M` under that storey's sill, each piece scaled in y so its flight's top meets the deck above (and
 *    shifted in x so the flight arrives at the upper deck's hatch), and `ladderParts` / `codeEscape` draw in boxes what the pack's piece does not reach (the drop ladder's last metres, or a whole
 *    escape when a piece does not fit the storey pitch or is absent). `escapeCheck` is the pure check of the result.
 * C. Nothing here draws: `models3d.ts` turns the boxes into one InstancedMesh.
 *
 * Frames are the dressing's: metres, the piece's own centred frame (x along the road, y up, z away from the wall), a piece standing with its back on the wall at yaw 0.
 */

import type { CalibrationKey } from "../core";
import type { DressPiece } from "./dressing";
import type { Stack } from "./stacks";

// ---- the rule's numbers (the guide's Numbers table pins every one) ----

/** The deck's top stands this far under the window sill above it, metres: a person steps out over the sill onto a deck no more than a hand's height lower. */
export const ESCAPE_DECK_BELOW_SILL_M = 0.15;
/** How far a deck's top may be from sill minus `ESCAPE_DECK_BELOW_SILL_M`, metres. */
export const ESCAPE_DECK_TOL_M = 0.05;
/** How far a flight's top step may be from the deck above (and its x from the hatch), metres. */
export const ESCAPE_JOINT_TOL_M = 0.02;
/** How far a drop ladder's foot may be from the walk (y 0 of the lot frame), metres. */
export const ESCAPE_GROUND_TOL_M = 0.02;
/** The range a piece's y-scale may take to meet the storey pitch; outside it the whole escape is drawn in code. */
export const ESCAPE_SCALE_Y = { min: 0.8, max: 1.2 } as const;
/** The code-drawn ladder: rungs this far apart, rails and rungs this thick, metres (the pack ladder's rails are 0.04 thick, its rungs about 0.3 apart). */
export const LADDER_RUNG_PITCH_M = 0.3;
export const LADDER_RAIL_M = 0.04;
export const LADDER_RUNG_M = 0.03;
/**
 * The code-drawn escape's parts, metres: a deck `w` wide and `d` deep, `deck` thick, a rail `rail` high of `bar` section, a flight's treads `tread` deep, `riser` apart, over a `run` of x,
 * through a hatch `hatch0` to `hatch1` in x (the deck's own centre is x 0), at z `stair0` to `stair1` of the deck's centre; `ladderX0`, `ladderX1`, `ladderZ` place its drop ladder.
 */
export const CODE_ESCAPE = {
  w: 3.25,
  d: 1.64,
  deck: 0.08,
  rail: 0.9,
  bar: 0.05,
  tread: 0.25,
  riser: 0.2,
  hatch0: -0.9,
  hatch1: 1,
  stair0: 0.07,
  stair1: 0.67,
  ladderX0: 0.853,
  ladderX1: 1.303,
  ladderZ: 0.83,
} as const;

// ---- the keys ----

const k = (name: string): CalibrationKey => `city-pack:${name}`;
/** The top piece (a deck and a railing), the middle piece (a deck and a flight up), the first landing (a deck, a flight up and the drop ladder). */
export const ESCAPE_TOP: CalibrationKey = k("SM_Bld_FireEscape_01");
export const ESCAPE_MID: CalibrationKey = k("SM_Bld_FireEscape_02");
export const ESCAPE_FIRST: CalibrationKey = k("SM_Bld_FireEscape_03");
/** The key a code-drawn escape's `DressPiece` carries. */
export const CODE_ESCAPE_KEY: CalibrationKey = "code:escape";

// ---- the tables ----

/** What one escape piece is, measured from the converted GLB (centred frame, metres, y up; see the file comment). */
export interface EscapeGeometry {
  /** The deck's top surface above the piece's base. */
  deck_m: number;
  /** The deck's extent in x: the hatch and the flight sit inside it or just past it. */
  deckX0_m: number;
  deckX1_m: number;
  /** Where the flight meets the deck below (the deck's own height) and the deck above (the stringer's top), and the x of the lowest and the highest tread's centre. Null: the piece has no flight. */
  flightFoot_m: number | null;
  flightTop_m: number | null;
  flightFootX_m: number | null;
  flightTopX_m: number | null;
  /** The x where a flight from the piece below arrives at this piece's deck (the flight of `ESCAPE_MID` ends there); null for a piece nothing arrives at. */
  hatchX_m: number | null;
  /** The lowest point of the drop ladder, and its rails' x and z extent at that height (`[x0, x1, z0, z1]`); null: no ladder. */
  ladderFoot_m: number | null;
  ladder_m: readonly [x0: number, x1: number, z0: number, z1: number] | null;
  /** The top of the deck's railing. */
  railTop_m: number;
}

/** Measured from `city-pack.glb` of 18 Nov 2026 by `measureEscape`; `escapes.test.ts` pins every value and re-measures it within 0.02 m. */
export const ESCAPE_GEOMETRY: Readonly<Record<CalibrationKey, EscapeGeometry>> = {
  [ESCAPE_TOP]: {
    deck_m: 0.609,
    deckX0_m: -1.616,
    deckX1_m: 1.567,
    flightFoot_m: null,
    flightTop_m: null,
    flightFootX_m: null,
    flightTopX_m: null,
    hatchX_m: -0.939,
    ladderFoot_m: null,
    ladder_m: null,
    railTop_m: 1.492,
  },
  [ESCAPE_MID]: {
    deck_m: 0.609,
    deckX0_m: -1.616,
    deckX1_m: 1.567,
    flightFoot_m: 0.609,
    flightTop_m: 3.609,
    flightFootX_m: 0.867,
    flightTopX_m: -0.939,
    hatchX_m: -0.939,
    ladderFoot_m: null,
    ladder_m: null,
    railTop_m: 1.492,
  },
  [ESCAPE_FIRST]: {
    deck_m: 0.609,
    deckX0_m: -0.584,
    deckX1_m: 2.067,
    flightFoot_m: 0.609,
    flightTop_m: 3.609,
    flightFootX_m: -0.215,
    flightTopX_m: -2.02,
    hatchX_m: null,
    ladderFoot_m: 0.099,
    ladder_m: [0.853, 1.303, 0.798, 0.858],
    railTop_m: 1.492,
  },
};

/**
 * The sill of the windows on each apartment floor piece's front, above the piece's base, metres: the lowest point of the window glass (the deepest recessed front-facing plane of at least
 * `SILL_MIN_AREA_M2`), per storey. A `stack3` piece is three storeys and has three. Measured by `measureSills` from `city-pack.glb` of 18 Nov 2026. Every key of the three apartment styles'
 * floor, corner floor and `Stack` pieces has an entry; a key without one takes its style's median (`sillOf`).
 */
export const WINDOW_SILL_M: Readonly<Partial<Record<CalibrationKey, number | readonly number[]>>> = {
  [k("SM_Bld_Apartment_01")]: 0.756,
  [k("SM_Bld_Apartment_Corner_01")]: 0.756,
  [k("SM_Bld_Apartment_Stack_01")]: [0.756, 0.756, 0.756],
  [k("SM_Bld_Apartment_02")]: 0.417,
  [k("SM_Bld_Apartment_Corner_02")]: 0.417,
  [k("SM_Bld_Apartment_Stack_02")]: [0.417, 0.417, 0.417],
  [k("SM_Bld_Apartment_03")]: 0.854,
  [k("SM_Bld_Apartment_Corner_03")]: 0.854,
  [k("SM_Bld_Apartment_Stack_03")]: [0.854, 0.854, 0.854],
};

/** The tables a check or a placement reads: the tests swap them for fixtures. */
export interface EscapeTables {
  geometry: Readonly<Record<CalibrationKey, EscapeGeometry>>;
  sills: Readonly<Partial<Record<CalibrationKey, number | readonly number[]>>>;
}
export const ESCAPE_TABLES: EscapeTables = { geometry: ESCAPE_GEOMETRY, sills: WINDOW_SILL_M };

/** How many storeys a floor piece is (a `stack3` piece is three). */
export const storeysOfPiece = (key: CalibrationKey): number => (/_Stack_\d\d$/.test(key) ? 3 : 1);

const median = (xs: readonly number[]): number => {
  const s = [...xs].sort((a, b) => a - b);
  return s.length === 0 ? 0 : s.length % 2 === 1 ? s[(s.length - 1) / 2]! : (s[s.length / 2 - 1]! + s[s.length / 2]!) / 2;
};
const flat = (v: number | readonly number[]): number[] => (typeof v === "number" ? [v] : [...v]);

/** The sill of storey `j` of a floor piece: its own entry, or the median of its style's entries (the style is the `_01` suffix), or of every entry. */
export function sillOf(key: CalibrationKey, j: number, sills: EscapeTables["sills"] = WINDOW_SILL_M): number {
  const own = sills[key];
  if (own !== undefined) return typeof own === "number" ? own : (own[j] ?? own[own.length - 1] ?? 0);
  const style = /(\d\d)$/.exec(key)?.[1];
  const same = Object.entries(sills).filter(([q]) => style !== undefined && q.endsWith(style));
  return median((same.length > 0 ? same : Object.entries(sills)).flatMap(([, v]) => flat(v!)));
}

// ---- A. measuring a mesh (pure: positions x,y,z per vertex, indices per triangle) ----

/** Triangles whose three heights are within this of each other, with a normal this close to straight up, are one horizontal face; faces this close in height are one level. */
const LEVEL_TOL_M = 0.004;
const UP_COS = 0.99;
/** A tread: a level above the deck of at most this area, at most this wide in x and at least this deep in z. The railings' top rails are wider; the deck and its rungs are neither. */
const TREAD_AREA_MAX_M2 = 0.13;
const TREAD_X_MAX_M = 0.3;
const TREAD_Z_MIN_M = 0.4;
/** A railing's top: a level above the deck at least this wide in x. */
const RAIL_X_MIN_M = 1.5;
/** The flight's own box in plan: its treads' extent grown by this in x and z; the stringer's top is the highest vertex in it. */
const FLIGHT_BOX_X_M = 0.25;
const FLIGHT_BOX_Z_M = 0.1;
/** A vertex this far past the deck's front edge belongs to the ladder. */
const LADDER_PAST_DECK_M = 0.02;
/** Vertices this near the ladder's lowest point give its footprint. */
const LADDER_FOOT_BAND_M = 0.02;

interface Level {
  y: number;
  area: number;
  x0: number;
  x1: number;
  z0: number;
  z1: number;
}

type Mesh = { pos: ArrayLike<number>; idx: ArrayLike<number> | null };

function triangles(m: Mesh): [number, number, number][] {
  const out: [number, number, number][] = [];
  const count = m.idx ? m.idx.length : Math.floor(m.pos.length / 3);
  for (let t = 0; t + 2 < count; t += 3) out.push(m.idx ? [m.idx[t]!, m.idx[t + 1]!, m.idx[t + 2]!] : [t, t + 1, t + 2]);
  return out;
}

/** The upward-facing horizontal levels of a mesh: triangles flat in y with a normal within 8 degrees of up, grouped by height, with their area and extent. */
export function upLevels(m: Mesh): Level[] {
  const at = (v: number, c: number): number => m.pos[v * 3 + c]!;
  const tris: { y: number; area: number; v: number[] }[] = [];
  for (const [a, b, c] of triangles(m)) {
    const ys = [at(a, 1), at(b, 1), at(c, 1)];
    if (Math.max(...ys) - Math.min(...ys) > LEVEL_TOL_M) continue;
    const ux = at(b, 0) - at(a, 0);
    const uz = at(b, 2) - at(a, 2);
    const vx = at(c, 0) - at(a, 0);
    const vz = at(c, 2) - at(a, 2);
    // Flat in y, so the normal is (0, uz*vx - ux*vz, 0) up to the sign: up when positive.
    const ny = uz * vx - ux * vz;
    const area = Math.abs(ny) / 2;
    if (area < 1e-12 || ny / Math.abs(ny) < UP_COS) continue;
    tris.push({ y: (ys[0]! + ys[1]! + ys[2]!) / 3, area, v: [a, b, c] });
  }
  tris.sort((p, q) => p.y - q.y);
  const levels: (Level & { sum: number; last: number })[] = [];
  for (const t of tris) {
    const l = levels[levels.length - 1];
    const ext = t.v.map((v) => [at(v, 0), at(v, 2)] as const);
    const x0 = Math.min(...ext.map((e) => e[0]));
    const x1 = Math.max(...ext.map((e) => e[0]));
    const z0 = Math.min(...ext.map((e) => e[1]));
    const z1 = Math.max(...ext.map((e) => e[1]));
    if (l && t.y - l.last <= LEVEL_TOL_M) {
      l.sum += t.y * t.area;
      l.area += t.area;
      l.last = t.y;
      l.x0 = Math.min(l.x0, x0);
      l.x1 = Math.max(l.x1, x1);
      l.z0 = Math.min(l.z0, z0);
      l.z1 = Math.max(l.z1, z1);
    } else levels.push({ y: t.y, area: t.area, x0, x1, z0, z1, sum: t.y * t.area, last: t.y });
  }
  return levels.map((l) => ({ y: l.sum / l.area, area: l.area, x0: l.x0, x1: l.x1, z0: l.z0, z1: l.z1 }));
}

/** Round to the millimetre, so a table and a measurement compare. */
const mm = (v: number): number => Math.round(v * 1000) / 1000;

/**
 * An escape piece's geometry by the rules in the file comment, or null when the mesh has no horizontal face. `hatchX_m` is left null: it is the x a flight from below arrives at, which is a
 * fact about the piece below (the table holds it), checked by `deckCovers`.
 */
export function measureEscape(m: Mesh): EscapeGeometry | null {
  const levels = upLevels(m);
  if (levels.length === 0) return null;
  const deck = levels.reduce((a, b) => (b.area > a.area ? b : a));
  const above = levels.filter((l) => l.y > deck.y + 0.02);
  const treads = above.filter((l) => l.area <= TREAD_AREA_MAX_M2 && l.x1 - l.x0 <= TREAD_X_MAX_M && l.z1 - l.z0 >= TREAD_Z_MIN_M);
  const rails = above.filter((l) => l.x1 - l.x0 >= RAIL_X_MIN_M);
  const railTop = rails.length > 0 ? Math.max(...rails.map((l) => l.y)) : deck.y;
  const n = Math.floor(m.pos.length / 3);
  const vx = (v: number): number => m.pos[v * 3]!;
  const vy = (v: number): number => m.pos[v * 3 + 1]!;
  const vz = (v: number): number => m.pos[v * 3 + 2]!;

  let flightFoot: number | null = null;
  let flightTop: number | null = null;
  let flightFootX: number | null = null;
  let flightTopX: number | null = null;
  if (treads.length > 0) {
    const low = treads.reduce((a, b) => (b.y < a.y ? b : a));
    const high = treads.reduce((a, b) => (b.y > a.y ? b : a));
    flightFoot = mm(deck.y);
    flightFootX = mm((low.x0 + low.x1) / 2);
    flightTopX = mm((high.x0 + high.x1) / 2);
    const bx0 = Math.min(...treads.map((l) => l.x0)) - FLIGHT_BOX_X_M;
    const bx1 = Math.max(...treads.map((l) => l.x1)) + FLIGHT_BOX_X_M;
    const bz0 = Math.min(...treads.map((l) => l.z0)) - FLIGHT_BOX_Z_M;
    const bz1 = Math.max(...treads.map((l) => l.z1)) + FLIGHT_BOX_Z_M;
    let top = -Infinity;
    for (let v = 0; v < n; v++) if (vx(v) >= bx0 && vx(v) <= bx1 && vz(v) >= bz0 && vz(v) <= bz1) top = Math.max(top, vy(v));
    flightTop = mm(top);
  }

  let ladderFoot: number | null = null;
  let ladder: [number, number, number, number] | null = null;
  let foot = Infinity;
  for (let v = 0; v < n; v++) if (vz(v) > deck.z1 + LADDER_PAST_DECK_M) foot = Math.min(foot, vy(v));
  if (foot < Infinity) {
    let x0 = Infinity;
    let x1 = -Infinity;
    let z0 = Infinity;
    let z1 = -Infinity;
    for (let v = 0; v < n; v++) {
      if (vz(v) <= deck.z1 + LADDER_PAST_DECK_M || vy(v) > foot + LADDER_FOOT_BAND_M) continue;
      x0 = Math.min(x0, vx(v));
      x1 = Math.max(x1, vx(v));
      z0 = Math.min(z0, vz(v));
      z1 = Math.max(z1, vz(v));
    }
    ladderFoot = mm(foot);
    ladder = [mm(x0), mm(x1), mm(z0), mm(z1)];
  }
  return {
    deck_m: mm(deck.y),
    deckX0_m: mm(deck.x0),
    deckX1_m: mm(deck.x1),
    flightFoot_m: flightFoot,
    flightTop_m: flightTop,
    flightFootX_m: flightFootX,
    flightTopX_m: flightTopX,
    hatchX_m: null,
    ladderFoot_m: ladderFoot,
    ladder_m: ladder,
    railTop_m: mm(railTop),
  };
}

/** True when the deck (the largest horizontal face) of the mesh has a triangle over (x, z): a point that is not over the deck is in its hatch. */
export function deckCovers(m: Mesh, x: number, z: number): boolean {
  const deck = measureEscape(m);
  if (!deck) return false;
  const at = (v: number, c: number): number => m.pos[v * 3 + c]!;
  for (const [a, b, c] of triangles(m)) {
    if (Math.abs(at(a, 1) - deck.deck_m) > LEVEL_TOL_M || Math.abs(at(b, 1) - deck.deck_m) > LEVEL_TOL_M || Math.abs(at(c, 1) - deck.deck_m) > LEVEL_TOL_M) continue;
    const side = (px: number, pz: number, qx: number, qz: number, rx: number, rz: number): number => (px - rx) * (qz - rz) - (qx - rx) * (pz - rz);
    const d1 = side(x, z, at(a, 0), at(a, 2), at(b, 0), at(b, 2));
    const d2 = side(x, z, at(b, 0), at(b, 2), at(c, 0), at(c, 2));
    const d3 = side(x, z, at(c, 0), at(c, 2), at(a, 0), at(a, 2));
    if (!((d1 < 0 || d2 < 0 || d3 < 0) && (d1 > 0 || d2 > 0 || d3 > 0))) return true;
  }
  return false;
}

/** The least area, m^2, a front-facing plane needs to be a window's glass. */
export const SILL_MIN_AREA_M2 = 1;
/** Front-facing planes whose centroids are this close along z are one plane. */
const SILL_PLANE_TOL_M = 0.02;
/** The storey height the bands of a floor piece are cut at, metres (every apartment style's floor pitch). */
const SILL_PITCH_M = 3;

/**
 * The sills of a floor piece's windows, one per storey (its height over `SILL_PITCH_M`), or null when the geometry cannot settle them. The glass is the deepest front-facing (normal within 8
 * degrees of +z) plane of at least `SILL_MIN_AREA_M2` (a window's reveal and frame are shallower; the wall and a pilaster stand in front of it); a storey's sill is the lowest vertex of the
 * glass triangles whose centroid is in that storey's band, over the band's base.
 */
export function measureSills(m: Mesh, storeys: number): number[] | null {
  const at = (v: number, c: number): number => m.pos[v * 3 + c]!;
  const tris: { z: number; y: number; area: number; low: number }[] = [];
  for (const [a, b, c] of triangles(m)) {
    const ux = at(b, 0) - at(a, 0);
    const uy = at(b, 1) - at(a, 1);
    const uz = at(b, 2) - at(a, 2);
    const vx = at(c, 0) - at(a, 0);
    const vy = at(c, 1) - at(a, 1);
    const vz = at(c, 2) - at(a, 2);
    const nx = uy * vz - uz * vy;
    const ny = uz * vx - ux * vz;
    const nz = ux * vy - uy * vx;
    const len = Math.hypot(nx, ny, nz);
    if (len < 1e-12 || nz / len < UP_COS) continue;
    tris.push({ z: (at(a, 2) + at(b, 2) + at(c, 2)) / 3, y: (at(a, 1) + at(b, 1) + at(c, 1)) / 3, area: len / 2, low: Math.min(at(a, 1), at(b, 1), at(c, 1)) });
  }
  tris.sort((p, q) => p.z - q.z);
  const planes: { t: typeof tris; last: number; area: number }[] = [];
  for (const t of tris) {
    const p = planes[planes.length - 1];
    if (p && t.z - p.last <= SILL_PLANE_TOL_M) {
      p.t.push(t);
      p.last = t.z;
      p.area += t.area;
    } else planes.push({ t: [t], last: t.z, area: t.area });
  }
  const glass = planes.find((p) => p.area >= SILL_MIN_AREA_M2);
  if (!glass) return null;
  const out: number[] = [];
  for (let s = 0; s < storeys; s++) {
    const band = glass.t.filter((t) => Math.floor(t.y / SILL_PITCH_M) === s);
    if (band.length === 0) return null;
    out.push(mm(Math.min(...band.map((t) => t.low)) - s * SILL_PITCH_M));
  }
  return out;
}

// ---- B. placing ----

/** One box of a code-drawn part: its centre (x, y, z) in the piece's frame, its size, and a turn about z (a stringer), radians. */
export interface EscapePart {
  kind: "deck" | "rail" | "post" | "stringer" | "tread" | "ladderRail" | "rung";
  x: number;
  y: number;
  z: number;
  w: number;
  h: number;
  d: number;
  rz?: number;
}

/** What one piece of a pack escape is: which key, where its base stands, how it is scaled and shifted. */
export interface EscapeSlot {
  key: CalibrationKey;
  /** The piece's base, metres, and its y-scale. */
  y: number;
  scaleY: number;
  /** The piece's centre x, from the column's axis, after the whole escape is centred. */
  x: number;
  w: number;
  h: number;
}

export interface EscapePlan {
  /** One piece per storey, lowest first. */
  slots: EscapeSlot[];
  /** Every deck's top, metres, lowest first. */
  decks: number[];
  /** The escape's width in x, metres: the first piece's and the others' bounds together. */
  span_m: number;
}

/** A storey of the block: where its floor starts, and the sill of its windows over that. */
export interface EscapeStorey {
  y: number;
  sill: number;
}

/**
 * The pack's pieces placed one per storey, or null when a piece is missing from `sizes`, has no flight where one is needed, or must be scaled outside `ESCAPE_SCALE_Y` (then the escape is code-drawn).
 * `sizes` gives a key's bound [w, h, d]. The deck of storey j stands at `storeys[j].y + sill - ESCAPE_DECK_BELOW_SILL_M`; piece j is scaled in y by (the next deck - this deck) over its flight's rise,
 * so its flight's top meets the next deck, and shifted in x so the flight's top x is the next piece's hatch x. The top piece has no flight and no scale. The result is centred on x 0.
 */
export function planEscape(storeys: readonly EscapeStorey[], sizes: (key: CalibrationKey) => readonly [number, number, number] | null, geometry: EscapeTables["geometry"] = ESCAPE_GEOMETRY): EscapePlan | null {
  const n = storeys.length;
  if (n < 2) return null;
  const decks = storeys.map((s) => s.y + s.sill - ESCAPE_DECK_BELOW_SILL_M);
  const keys = (j: number): CalibrationKey => (j === 0 ? ESCAPE_FIRST : j === n - 1 ? ESCAPE_TOP : ESCAPE_MID);
  const slots: EscapeSlot[] = [];
  let shift = 0;
  for (let j = 0; j < n; j++) {
    const key = keys(j);
    const g = geometry[key];
    const size = sizes(key);
    if (!g || !size) return null;
    let scaleY = 1;
    if (j < n - 1) {
      if (g.flightTop_m === null || g.flightFoot_m === null || g.flightTopX_m === null) return null;
      scaleY = (decks[j + 1]! - decks[j]!) / (g.flightTop_m - g.flightFoot_m);
      if (!(scaleY >= ESCAPE_SCALE_Y.min - 1e-9 && scaleY <= ESCAPE_SCALE_Y.max + 1e-9)) return null;
    }
    if (j > 0) {
      const below = geometry[keys(j - 1)]!;
      if (g.hatchX_m === null || below.flightTopX_m === null) return null;
      shift += below.flightTopX_m - g.hatchX_m;
    }
    slots.push({ key, y: decks[j]! - g.deck_m * scaleY, scaleY, x: shift, w: size[0], h: size[1] * scaleY });
  }
  const lo = Math.min(...slots.map((s) => s.x - s.w / 2));
  const hi = Math.max(...slots.map((s) => s.x + s.w / 2));
  const mid = (lo + hi) / 2;
  for (const s of slots) s.x -= mid;
  return { slots, decks, span_m: hi - lo };
}

/** The ladder's boxes below a pack piece: from the walk (y 0 of the lot frame) up to the pack ladder's foot, in the first piece's frame (its base is at `pieceY`). Empty when the foot is on the walk. */
export function ladderParts(footWorld_m: number, pieceY: number, x0: number, x1: number, z: number): EscapePart[] {
  if (footWorld_m <= ESCAPE_GROUND_TOL_M) return [];
  const parts: EscapePart[] = [];
  const len = footWorld_m + LADDER_RUNG_M / 2;
  for (const x of [x0 + LADDER_RAIL_M / 2, x1 - LADDER_RAIL_M / 2]) parts.push({ kind: "ladderRail", x, y: len / 2 - pieceY, z, w: LADDER_RAIL_M, h: len, d: LADDER_RAIL_M });
  for (let y = LADDER_RUNG_PITCH_M; y < footWorld_m - LADDER_RUNG_PITCH_M / 2 + 1e-9; y += LADDER_RUNG_PITCH_M) {
    parts.push({ kind: "rung", x: (x0 + x1) / 2, y: y - pieceY, z, w: x1 - x0 - 2 * LADDER_RAIL_M, h: LADDER_RUNG_M, d: LADDER_RUNG_M });
  }
  return parts;
}

/**
 * A whole escape in boxes: a deck, three rails and four posts on each storey, a flight (two stringers and treads) from each deck to the next, and a ladder from the walk to the first deck. `decks`
 * are the deck tops, lowest first; the frame is the escape's own, centred on its deck, its y 0 at `baseY` (the first deck's underside). Pure.
 */
export function codeEscape(decks: readonly number[], baseY: number): EscapePart[] {
  const c = CODE_ESCAPE;
  const parts: EscapePart[] = [];
  const hw = c.w / 2;
  const hd = c.d / 2;
  decks.forEach((top, j) => {
    const y = top - baseY;
    // A deck of three slabs round its hatch (the stair's opening), so a flight rises through the deck above.
    parts.push({ kind: "deck", x: 0, y: y - c.deck / 2, z: (c.stair0 - hd) / 2, w: c.w, h: c.deck, d: hd + c.stair0 });
    const front = hd - c.stair0;
    parts.push({ kind: "deck", x: (-hw + c.hatch0) / 2, y: y - c.deck / 2, z: c.stair0 + front / 2, w: c.hatch0 + hw, h: c.deck, d: front });
    parts.push({ kind: "deck", x: (c.hatch1 + hw) / 2, y: y - c.deck / 2, z: c.stair0 + front / 2, w: hw - c.hatch1, h: c.deck, d: front });
    const ry = y + c.rail - c.bar / 2;
    parts.push({ kind: "rail", x: 0, y: ry, z: hd - c.bar / 2, w: c.w, h: c.bar, d: c.bar });
    for (const sx of [-1, 1]) parts.push({ kind: "rail", x: sx * (hw - c.bar / 2), y: ry, z: 0, w: c.bar, h: c.bar, d: c.d });
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) parts.push({ kind: "post", x: sx * (hw - c.bar / 2), y: y + c.rail / 2, z: sz * (hd - c.bar / 2), w: c.bar, h: c.rail, d: c.bar });
    if (j < decks.length - 1) {
      const rise = decks[j + 1]! - top;
      const run = c.hatch1 - c.hatch0 - 0.05;
      const x1 = c.hatch1 - 0.05;
      const x0 = x1 - run;
      const len = Math.hypot(run, rise);
      const rz = Math.atan2(rise, -run);
      for (const z of [c.stair0 + c.bar / 2, c.stair1 - c.bar / 2]) parts.push({ kind: "stringer", x: (x0 + x1) / 2, y: y + rise / 2, z, w: len, h: c.bar, d: c.bar, rz });
      const steps = Math.max(1, Math.round(rise / c.riser));
      for (let s = 1; s < steps; s++) parts.push({ kind: "tread", x: x1 - (run * s) / steps, y: y + (rise * s) / steps, z: (c.stair0 + c.stair1) / 2, w: c.tread, h: c.bar / 2, d: c.stair1 - c.stair0 });
    }
  });
  // The ladder runs from the walk past the first deck's rail, on the deck's front edge.
  return [...parts, ...ladderParts(decks[0]! + c.rail, baseY, c.ladderX0, c.ladderX1, c.ladderZ)];
}

// ---- the check ----

export interface EscapeReport {
  /** The escape's column. */
  column: number;
  /** Storeys over the base, and how many have a platform. */
  storeys: number;
  platforms: number;
  /** Storeys (0 is the first floor over the base) with no platform. */
  missing: number[];
  /** The worst deck-to-sill offset: |deck - (floor y + sill - ESCAPE_DECK_BELOW_SILL_M)|, metres, over the platforms present. */
  worstDeck_m: number;
  /** The worst flight joint: the larger of a flight top's height from the deck above and its x from that deck's hatch, over the joints present. */
  worstJoint_m: number;
  /** The height of the drop ladder's foot above the walk, metres; null when the escape has no ladder. */
  ladderFoot_m: number | null;
  ok: boolean;
}

/** The storeys of one column of a stack, lowest first: each floor piece's storeys at its pitch, with the sill of its windows. */
export function storeysOfColumn(stack: Pick<Stack, "pieces">, column: number, sills: EscapeTables["sills"] = WINDOW_SILL_M): EscapeStorey[] {
  const out: EscapeStorey[] = [];
  for (const p of stack.pieces.filter((q) => q.role === "floor" && q.column === column).sort((a, b) => a.y - b.y)) {
    const n = storeysOfPiece(p.key);
    for (let j = 0; j < n; j++) out.push({ y: p.y + (j * p.h) / n, sill: sillOf(p.key, j, sills) });
  }
  return out;
}

/**
 * Checks a block's fire escape against its stack. `pieces` is the block's dressing (any slots; only "escape" pieces are read), `tables` the geometry and sills. One report per escape (a block has
 * at most one). A platform is found by order: the j-th pack piece (or the j-th deck of a code-drawn escape) is storey j's, so a missing top storey is the last storeys with no platform. Passes
 * when no storey is missing, every deck is within `ESCAPE_DECK_TOL_M` of its sill, every joint within `ESCAPE_JOINT_TOL_M` and the ladder's foot within `ESCAPE_GROUND_TOL_M` of the walk.
 */
export function escapeCheck(stack: Pick<Stack, "pieces">, pieces: readonly DressPiece[], tables: EscapeTables = ESCAPE_TABLES): EscapeReport[] {
  const mine = pieces.filter((p) => p.slot === "escape");
  if (mine.length === 0) return [];
  const column = mine[0]!.column;
  const storeys = storeysOfColumn(stack, column, tables.sills);
  const want = storeys.map((s) => s.y + s.sill - ESCAPE_DECK_BELOW_SILL_M);
  const decks: { y: number; x: number }[] = [];
  const tops: { y: number; x: number }[] = [];
  let ladder: number | null = null;
  const code = mine.find((p) => p.key === CODE_ESCAPE_KEY);
  if (code && code.parts) {
    const at = (p: EscapePart): number => code.y + p.y;
    for (const p of code.parts.filter((q) => q.kind === "deck")) {
      const y = at(p) + p.h / 2;
      if (!decks.some((d) => Math.abs(d.y - y) < 1e-6)) decks.push({ y, x: code.x + CODE_ESCAPE.hatch0 });
    }
    decks.sort((a, b) => a.y - b.y);
    for (const p of code.parts.filter((q) => q.kind === "stringer")) {
      const half = (p.w / 2) * Math.sin(p.rz ?? 0);
      const x = code.x + p.x + (p.w / 2) * Math.cos(p.rz ?? 0);
      if (!tops.some((t) => Math.abs(t.y - (at(p) + half)) < 1e-6)) tops.push({ y: at(p) + half, x });
    }
    tops.sort((a, b) => a.y - b.y);
    const rails = code.parts.filter((q) => q.kind === "ladderRail");
    // The code ladder's rails stand on the walk: its foot is the lowest rail end.
    ladder = rails.length > 0 ? Math.min(...rails.map((r) => code.y + r.y - r.h / 2)) : null;
  } else {
    const packs = mine.filter((p) => p.key in tables.geometry).sort((a, b) => a.y - b.y);
    for (const p of packs) {
      const g = tables.geometry[p.key]!;
      const s = p.scaleY ?? 1;
      decks.push({ y: p.y + g.deck_m * s, x: p.x + (g.hatchX_m ?? Infinity) });
      if (g.flightTop_m !== null && g.flightTopX_m !== null) tops.push({ y: p.y + g.flightTop_m * s, x: p.x + g.flightTopX_m });
      if (g.ladderFoot_m !== null) {
        const parts = (p.parts ?? []).filter((q) => q.kind === "ladderRail");
        ladder = parts.length > 0 ? Math.min(...parts.map((r) => p.y + r.y - r.h / 2)) : p.y + g.ladderFoot_m * s;
      }
    }
  }
  const missing: number[] = [];
  let worstDeck = 0;
  storeys.forEach((_, j) => {
    const d = decks[j];
    if (!d) missing.push(j);
    else worstDeck = Math.max(worstDeck, Math.abs(d.y - want[j]!));
  });
  let worstJoint = 0;
  tops.forEach((t, j) => {
    const up = decks[j + 1];
    if (!up) return;
    worstJoint = Math.max(worstJoint, Math.abs(t.y - up.y), Number.isFinite(up.x) ? Math.abs(t.x - up.x) : 0);
  });
  const ok = missing.length === 0 && worstDeck <= ESCAPE_DECK_TOL_M + 1e-9 && worstJoint <= ESCAPE_JOINT_TOL_M + 1e-9 && (ladder === null || Math.abs(ladder) <= ESCAPE_GROUND_TOL_M + 1e-9);
  return [{ column, storeys: storeys.length, platforms: decks.length, missing, worstDeck_m: worstDeck, worstJoint_m: worstJoint, ladderFoot_m: ladder, ok }];
}
