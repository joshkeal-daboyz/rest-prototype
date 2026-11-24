/**
 * The 3D town's layout (ticket 041, section A), as pure data. No three, no DOM, no play.
 *
 * World units equal map units (x = map x, z = map y). The streets follow the circuit: a road runs beside every
 * long line (not under it), so the wire and its poles stand on the pavement; short lines are service runs
 * (pavement only). A ring road and one ring of city blocks surround the circuit. Buildings are placed by
 * frontage fill: lots of fixed sizes (`LOT_TYPES`, metres x WORLD_PER_METRE) stand in rows along every road side,
 * each facing its road, and a lot is kept only if it clears every road, pavement, node, wire and other lot and
 * does not hide a wire from the camera. Places (what a lamp lights) are placed before the ordinary lots.
 *
 * Terrace rows (ticket 051 B): the rows of the outer blocks are runs of abutting lots (`TERRACE_*`), with parking lots and corner plazas as open ground in `openLots`.
 * `townLayout(puzzle, { terraces: false })` is the layout as 041 made it, without them.
 *
 * Wires, lamps and places are the same as on `main`: nothing here touches a rule or a puzzle.
 */

import { placeName, type Puzzle } from "../core";
import { GATE_POST, NODE_SQUARE, feedLanes, slotKind, stableHash, type CityRect, type SlotKind } from "../render/city";
import { wireLayout } from "./layout";
import { POLE_HEIGHT } from "./kitunits";
import { WORLD_PER_METRE, ROAD_W, PAVE_W, SETBACK, WIRE_CLEAR, STOREY_M, TERRACE_DEPTH_M, PARKING_W_M, PARKING_D_M, PLAZA_W_M, type LotType, LOT_TYPES, LOT_TYPE_NAMES, type Pt, type Lot, type CornerSide, type TerraceRun, type OpenLot } from "./kitunits";

// ---- constants (ticket 041) ----

/** A line this long or longer is a street; a shorter one is a service run (pavement only). */
export const STREET_MIN_LEN = 2.5;
/** The road's near kerb is this far from the line it runs beside. */
export const KERB_OFFSET = 0.4;
export const RING_MARGIN = 4;
export const BLOCK_PITCH = 12;
export const OUTER_RINGS = 1;
export const LOT_GAP = 0.1;
/** The cursor's step along a frontage when no lot fits. */
export const FILL_STEP = 0.25;
/** A place is tried at every step of this along each frontage (finer than a lot's, as 2D tries a place on a 0.1 grid). */
export const PLACE_STEP = 0.1;
/** A lot whose side edge is within this of another road's pavement meets that road (equal to `NEIGHBOUR_GAP` in models.ts, which imports from here). */
export const CORNER_GAP = 0.5;
/** A cross road only makes a side of a lot a corner side if the direction from the lot's centre to the road's centreline is within this many degrees of that side's outward axis (a road behind the lot's back edge is not a cross street). */
export const CORNER_ANGLE_MAX = 45;
/** A block takes a lot type only if a row beside that type's band still holds this many small lots. */
export const ROW_MIN_SMALLS = 2;
/** A place is looked for within this distance of its lamp. */
export const PLACE_REACH = 2.5;
/** Camera facts (kept equal to camera.ts by a test): the camera looks from the south at 45 degrees with a 40 degree lens. */
export const OCCLUDE_SLOPE = 1 / Math.tan(((45 - 20) * Math.PI) / 180);
/** Heights (world units) the occlusion rule protects: a node's top meets the wire; a lamp's head sits just above. */
export const NODE_TOP_Y = POLE_HEIGHT;
export const LAMP_HEAD_Y = POLE_HEIGHT + 0.05;
export const PLACE_STOREYS = 2;
/** A place is two storeys high. */
export const PLACE_H = PLACE_STOREYS * STOREY_M * WORLD_PER_METRE;

// ---- terrace rows (ticket 051 B) ----

/** One bay of a terrace block, metres (the City Pack's apartment columns are 5.0 to 5.5 m; the packer in 051 C uses the pieces' true widths). */
export const TERRACE_BAY_M = 5.2;
/** A nominal terrace lot is this many bays wide, by hash. */
export const TERRACE_BAYS = { min: 2, max: 4 } as const;
/** The height caps a terrace lot may take, metres, highest first: 5, 4 and 3 storeys. The highest that clears the occlusion rule wins. */
export const TERRACE_CAPS_M: readonly number[] = [16, 13, 10];
export const PARKING_MIN_RUN_BAYS = 8;
export const PARKING_ONE_IN = 3;
export const PLAZA_ONE_IN = 4;


/** What a place of each kind stands on, metres: a whole lot, a quarter, one of a row of three homes. */
export const PLACE_SIZES = {
  whole: { w: 10, d: 10 },
  quarter: { w: 6, d: 6 },
  home: { w: 6, d: 8 },
} as const;

// ---- output types ----


export type RoadKind = "line" | "feed" | "decor" | "ring" | "grid";

export interface Road {
  id: string;
  kind: RoadKind;
  /** The circuit line's id for a "line" road; null for every other kind. */
  line: string | null;
  /** The line (or lane, or decor segment) the road runs beside. For ring and grid roads, the road's own centreline. */
  lineFrom: Pt;
  lineTo: Pt;
  /** Which side of the line: +1 along the normal (-uz, ux) of from -> to, -1 the other; 0 for ring and grid roads. */
  side: 1 | -1 | 0;
  /** The road's centreline (ends trimmed clear of the nodes), parallel to the line. */
  ax: number;
  az: number;
  bx: number;
  bz: number;
  w: number;
  /** Its four corners. */
  corners: Pt[];
}

/** A junction pad: the convex hull of the end edges of the roads that end together. Fewer than three points when the ends coincide (a straight run). */
export interface Pad {
  id: string;
  /** The node it stands at, or null. */
  node: string | null;
  pts: Pt[];
  /** The roads whose ends it covers. */
  roads: string[];
}

/** A pale lip along one edge of a road, minus the parts inside another road or a pad. */
export interface Kerb {
  road: string;
  side: 1 | -1;
  ax: number;
  az: number;
  bx: number;
  bz: number;
}

/** A band of pavement: PAVE_W wide, outside a kerb, or a service run's own strip. */
export interface Pavement {
  /** The road (or the service line) it belongs to. */
  road: string;
  service: boolean;
  pts: Pt[];
}

/** An outer city block: the rectangle inside its four streets' pavements. */
export interface TownBlock {
  id: string;
  minX: number;
  minZ: number;
  maxX: number;
  maxZ: number;
}



export interface PlaceBox {
  x: number;
  z: number;
  w: number;
  d: number;
  yaw: number;
  /** Two storeys. */
  h: number;
}

export interface PlaceLot {
  lamp: string;
  /** The words beside the place (`placeName`) for a target lamp; null for any other. */
  label: string | null;
  kind: SlotKind;
  /** A pool place is a pool of light on the lamp's lane: no building. */
  pool: boolean;
  /** One box (whole, quarter), three (row3), two posts (gate); empty for a pool. */
  boxes: PlaceBox[];
  /** The road it faces; null for a gate or a pool. */
  street: string | null;
}



/** What `build` makes. Callers get it as a `Town`, which is read-only. */
interface TownData {
  roads: Road[];
  kerbs: Kerb[];
  pavements: Pavement[];
  pads: Pad[];
  /** The outer city blocks (the ring of blocks round the ring road). */
  blocks: TownBlock[];
  lots: Lot[];
  /** The terrace runs of the outer blocks (empty when the town is laid out with `terraces: false`). */
  terraces: TerraceRun[];
  /** Parking lots and plazas in the terrace rows (empty with `terraces: false`). */
  openLots: OpenLot[];
  /** One per lamp, in `nodes` order. */
  places: PlaceLot[];
  /** The ring road's centreline rectangle (minY/maxY are z). */
  ring: CityRect;
  /** The town's edge: the outer street's outer pavement edge (minY/maxY are z). */
  window: CityRect;
}

// ---- geometry (convex polygons, by hand) ----

interface HalfPlane {
  nx: number;
  nz: number;
  c: number;
}
interface Poly {
  pts: Pt[];
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
  /** Outward normals: a point is inside where nx*x + nz*z <= c for every plane. */
  hp: HalfPlane[];
}

function area(pts: readonly Pt[]): number {
  let s = 0;
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i]!;
    const b = pts[(i + 1) % pts.length]!;
    s += a.x * b.z - b.x * a.z;
  }
  return Math.abs(s) / 2;
}

function mkPoly(pts: Pt[]): Poly | null {
  if (pts.length < 3 || area(pts) < 1e-9) return null;
  let cx = 0;
  let cz = 0;
  let minX = Infinity;
  let maxX = -Infinity;
  let minZ = Infinity;
  let maxZ = -Infinity;
  for (const p of pts) {
    cx += p.x;
    cz += p.z;
    minX = Math.min(minX, p.x);
    maxX = Math.max(maxX, p.x);
    minZ = Math.min(minZ, p.z);
    maxZ = Math.max(maxZ, p.z);
  }
  cx /= pts.length;
  cz /= pts.length;
  const hp: HalfPlane[] = [];
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i]!;
    const b = pts[(i + 1) % pts.length]!;
    const dx = b.x - a.x;
    const dz = b.z - a.z;
    const len = Math.hypot(dx, dz);
    if (len < 1e-12) continue;
    let nx = dz / len;
    let nz = -dx / len;
    let c = nx * a.x + nz * a.z;
    if (nx * cx + nz * cz > c) {
      nx = -nx;
      nz = -nz;
      c = -c;
    }
    hp.push({ nx, nz, c });
  }
  return { pts, minX, maxX, minZ, maxZ, hp };
}

/** A rectangle: centre, size `w` along (fz, -fx) and `d` along the front (fx, fz). */
function rectPts(cx: number, cz: number, w: number, d: number, fx: number, fz: number): Pt[] {
  const ex = fz;
  const ez = -fx;
  const hw = w / 2;
  const hd = d / 2;
  return [
    { x: cx - ex * hw - fx * hd, z: cz - ez * hw - fz * hd },
    { x: cx + ex * hw - fx * hd, z: cz + ez * hw - fz * hd },
    { x: cx + ex * hw + fx * hd, z: cz + ez * hw + fz * hd },
    { x: cx - ex * hw + fx * hd, z: cz - ez * hw + fz * hd },
  ];
}

/** Gap between two convex polygons along their best separating axis: >= 0 apart by at least that much, < 0 overlapping. */
function sepDist(a: Poly, b: Poly): number {
  let best = -Infinity;
  for (let k = 0; k < 2; k++) {
    const src = k === 0 ? a : b;
    for (const h of src.hp) {
      let amin = Infinity;
      let amax = -Infinity;
      for (const p of a.pts) {
        const v = h.nx * p.x + h.nz * p.z;
        if (v < amin) amin = v;
        if (v > amax) amax = v;
      }
      let bmin = Infinity;
      let bmax = -Infinity;
      for (const p of b.pts) {
        const v = h.nx * p.x + h.nz * p.z;
        if (v < bmin) bmin = v;
        if (v > bmax) bmax = v;
      }
      const gap = Math.max(bmin - amax, amin - bmax);
      if (gap > best) best = gap;
    }
  }
  return best;
}

/** `subject` clipped to the half-plane. */
function clipTo(subject: readonly Pt[], h: HalfPlane): Pt[] {
  const out: Pt[] = [];
  for (let i = 0; i < subject.length; i++) {
    const a = subject[i]!;
    const b = subject[(i + 1) % subject.length]!;
    const da = h.nx * a.x + h.nz * a.z - h.c;
    const db = h.nx * b.x + h.nz * b.z - h.c;
    if (da <= 0) out.push(a);
    if ((da < 0 && db > 0) || (da > 0 && db < 0)) {
      const t = da / (da - db);
      out.push({ x: a.x + (b.x - a.x) * t, z: a.z + (b.z - a.z) * t });
    }
  }
  return out;
}

/** The part of `subject` inside `clip`. */
function clipPoly(subject: readonly Pt[], clip: Poly): Pt[] {
  let pts: Pt[] = subject.slice();
  for (const h of clip.hp) {
    pts = clipTo(pts, h);
    if (pts.length === 0) break;
  }
  return pts;
}

function overlapArea(subject: readonly Pt[], clip: Poly): number {
  const pts = clipPoly(subject, clip);
  return pts.length < 3 ? 0 : area(pts);
}

/** Convex hull, counter-clockwise; two points if they are all in a line. */
function hull(points: readonly Pt[]): Pt[] {
  const p = points.slice().sort((a, b) => a.x - b.x || a.z - b.z);
  const u: Pt[] = [];
  for (const q of p) if (u.length === 0 || Math.hypot(q.x - u[u.length - 1]!.x, q.z - u[u.length - 1]!.z) > 1e-9) u.push(q);
  if (u.length < 3) return u;
  const cross = (o: Pt, a: Pt, b: Pt): number => (a.x - o.x) * (b.z - o.z) - (a.z - o.z) * (b.x - o.x);
  const lower: Pt[] = [];
  for (const q of u) {
    while (lower.length >= 2 && cross(lower[lower.length - 2]!, lower[lower.length - 1]!, q) <= 1e-12) lower.pop();
    lower.push(q);
  }
  const upper: Pt[] = [];
  for (let i = u.length - 1; i >= 0; i--) {
    const q = u[i]!;
    while (upper.length >= 2 && cross(upper[upper.length - 2]!, upper[upper.length - 1]!, q) <= 1e-12) upper.pop();
    upper.push(q);
  }
  lower.pop();
  upper.pop();
  return lower.concat(upper);
}

/** The parameter range [t0, t1] of segment p -> q strictly inside `poly` shrunk by `eps`, written into `out`; false if there is none. */
function insideRange(px: number, pz: number, qx: number, qz: number, poly: Poly, eps: number, out: [number, number]): boolean {
  let t0 = 0;
  let t1 = 1;
  const dx = qx - px;
  const dz = qz - pz;
  for (const h of poly.hp) {
    const den = h.nx * dx + h.nz * dz;
    const num = h.c - eps - (h.nx * px + h.nz * pz);
    if (Math.abs(den) < 1e-12) {
      if (num < 0) return false;
    } else {
      const t = num / den;
      if (den > 0) {
        if (t < t1) t1 = t;
      } else if (t > t0) t0 = t;
    }
    if (t1 - t0 <= 1e-9) return false;
  }
  out[0] = t0;
  out[1] = t1;
  return true;
}

function pointSegDist(px: number, pz: number, ax: number, az: number, bx: number, bz: number): number {
  const dx = bx - ax;
  const dz = bz - az;
  const l2 = dx * dx + dz * dz;
  let t = l2 > 0 ? ((px - ax) * dx + (pz - az) * dz) / l2 : 0;
  t = Math.min(Math.max(t, 0), 1);
  return Math.hypot(px - (ax + t * dx), pz - (az + t * dz));
}

/** Distance from a point to a convex polygon (0 inside). */
function pointPolyDist(px: number, pz: number, poly: Poly): number {
  let inside = true;
  for (const h of poly.hp) {
    if (h.nx * px + h.nz * pz > h.c) {
      inside = false;
      break;
    }
  }
  if (inside) return 0;
  let best = Infinity;
  for (let i = 0; i < poly.pts.length; i++) {
    const a = poly.pts[i]!;
    const b = poly.pts[(i + 1) % poly.pts.length]!;
    best = Math.min(best, pointSegDist(px, pz, a.x, a.z, b.x, b.z));
  }
  return best;
}

const RANGE: [number, number] = [0, 0];

/** Distance from a segment to a convex polygon (0 if they touch). */
function segPolyDist(ax: number, az: number, bx: number, bz: number, poly: Poly): number {
  if (insideRange(ax, az, bx, bz, poly, -1e-12, RANGE)) return 0;
  let best = Math.min(pointPolyDist(ax, az, poly), pointPolyDist(bx, bz, poly));
  for (const p of poly.pts) best = Math.min(best, pointSegDist(p.x, p.z, ax, az, bx, bz));
  return best;
}

/** The z range of a convex polygon along the vertical line at x, or false if x is outside it. */
function chordAt(poly: Poly, x: number, out: [number, number]): boolean {
  if (x < poly.minX - 1e-9 || x > poly.maxX + 1e-9) return false;
  let lo = Infinity;
  let hi = -Infinity;
  const n = poly.pts.length;
  for (let i = 0; i < n; i++) {
    const a = poly.pts[i]!;
    const b = poly.pts[(i + 1) % n]!;
    const x0 = Math.min(a.x, b.x);
    const x1 = Math.max(a.x, b.x);
    if (x < x0 - 1e-9 || x > x1 + 1e-9) continue;
    const z = x1 - x0 < 1e-12 ? undefined : a.z + ((b.z - a.z) * (x - a.x)) / (b.x - a.x);
    if (z === undefined) {
      lo = Math.min(lo, a.z, b.z);
      hi = Math.max(hi, a.z, b.z);
    } else {
      lo = Math.min(lo, z);
      hi = Math.max(hi, z);
    }
  }
  if (lo > hi) return false;
  out[0] = lo;
  out[1] = hi;
  return true;
}

// ---- a uniform grid over boxes ----

class Grid {
  private cells = new Map<number, number[]>();
  private stamp: number[] = [];
  private cur = 0;
  constructor(private readonly size = 2) {}
  private key(cx: number, cz: number): number {
    return (cx + 8192) * 16384 + (cz + 8192);
  }
  add(i: number, minX: number, minZ: number, maxX: number, maxZ: number): void {
    const x0 = Math.floor(minX / this.size);
    const x1 = Math.floor(maxX / this.size);
    const z0 = Math.floor(minZ / this.size);
    const z1 = Math.floor(maxZ / this.size);
    for (let cx = x0; cx <= x1; cx++) {
      for (let cz = z0; cz <= z1; cz++) {
        const k = this.key(cx, cz);
        const cell = this.cells.get(k);
        if (cell) cell.push(i);
        else this.cells.set(k, [i]);
      }
    }
  }
  /** Calls `fn` once per item whose cells touch the box; `fn` returns true to stop. Returns true if stopped. */
  query(minX: number, minZ: number, maxX: number, maxZ: number, fn: (i: number) => boolean): boolean {
    this.cur++;
    const x0 = Math.floor(minX / this.size);
    const x1 = Math.floor(maxX / this.size);
    const z0 = Math.floor(minZ / this.size);
    const z1 = Math.floor(maxZ / this.size);
    for (let cx = x0; cx <= x1; cx++) {
      for (let cz = z0; cz <= z1; cz++) {
        const cell = this.cells.get(this.key(cx, cz));
        if (!cell) continue;
        for (let k = 0; k < cell.length; k++) {
          const i = cell[k]!;
          if (this.stamp[i] === this.cur) continue;
          this.stamp[i] = this.cur;
          if (fn(i)) return true;
        }
      }
    }
    return false;
  }
}

class PolySet {
  readonly polys: Poly[] = [];
  private readonly grid = new Grid();
  add(p: Poly): number {
    const i = this.polys.length;
    this.polys.push(p);
    this.grid.add(i, p.minX, p.minZ, p.maxX, p.maxZ);
    return i;
  }
  /** True if any polygon is closer than `margin` to `p` (overlap when margin is 0), apart from `skip`. */
  hits(p: Poly, margin: number, skip = -1): boolean {
    return this.grid.query(p.minX - margin, p.minZ - margin, p.maxX + margin, p.maxZ + margin, (i) => {
      if (i === skip) return false;
      return sepDist(p, this.polys[i]!) < margin - 1e-9;
    });
  }
}

// ---- terrace rows (ticket 051 B; extracted from `build` in ticket 055 B) ----

/** One side of a block: the row of terrace lots facing the street on it. `(ax, az)` is where the row's reference line starts, `(ux, uz)` runs along it, `(mx, mz)` points from the street into the block. */
export interface TerraceSide {
  /** The street it faces and which side of that street's line (`Lot.side`). */
  road: string;
  side: 1 | -1;
  ax: number;
  az: number;
  ux: number;
  uz: number;
  mx: number;
  mz: number;
  /** The side's length along the row, before the next row's band is taken off. */
  span: number;
}

/** A box the terrace fill asks the lot rules about: centre, size (`w` along the street, `d` away from it) and the unit vector of its front, which points at the street. */
export interface TerraceBox {
  x: number;
  z: number;
  w: number;
  d: number;
  fx: number;
  fz: number;
}

/** Slot and run numbers per street side, shared by every block on that side so lot keys and run ids stay unique. */
export interface TerraceCounters {
  slots: Map<string, number>;
  runs: Map<string, number>;
}

export interface TerraceRowOpts {
  /** The distance from each side's reference line to the lots' front line, world units. Default (the ladder): half a road, the pavement and `SETBACK`. */
  frontOff?: number;
  /**
   * How far in from its start each row's first lot stands, metres: asked of row `row` (0 to 3 in order top, right, bottom, left), whether the row ends at a plaza and whether it
   * starts after one (the inset is then from the plaza's far edge). Default 0 for every row.
   */
  startInset_m?: (row: number, endsAtPlaza: boolean, startsAfterPlaza: boolean) => number;
  /** The lot rules asked of a box at height `h` (world units) with `margin` clear of lots already claimed. Default: everything clears. */
  clears?: (box: TerraceBox, h: number, margin: number) => boolean;
  /** Called with every lot, plaza and parking lot as it is laid, so the next `clears` sees it. */
  claim?: (box: TerraceBox) => void;
  /** Open lots start on multiples of this many metres along their row (the run before them stretches to meet them). Default: no snap. */
  snap_m?: number;
  /** A plaza's side, metres. Default `PLAZA_W_M`. */
  plazaW_m?: number;
  /**
   * The runs that take a parking lot whatever their length or hash (when it fits): the first place after a lot where it does, not about the middle. A run is named by
   * its block, its side and its place among that side's runs in this block, `"<block id>|<road>:<side>|<n>"` (`terraceRunKey`), which does not shift when a run before it on
   * the street elsewhere is split by a lot, as its id does.
   */
  parkRuns?: ReadonlySet<string>;
  /** Whether a long run takes a parking lot by `stableHash(run id) % PARKING_ONE_IN` (ticket 056). Default true, the ladder's rule; the tile city turns it off and places every lot by demand through `parkRuns`. */
  parkByHash?: boolean;
  counters?: TerraceCounters;
  /** The index in the town's `lots` of the first lot this call lays (`TerraceRun.lots` holds town indices). Default 0. */
  lotBase?: number;
  /** Set on every run laid (`TerraceRun.frame`). Default: absent. */
  frame?: { wall_m: number; kerb_m: number };
}

/** The name `TerraceRowOpts.parkRuns` knows a run by: its block, its street side, and the number of runs before it on that side in that block. */
export const terraceRunKey = (block: string, road: string, side: 1 | -1, n: number): string => `${block}|${road}:${side}|${n}`;

/**
 * One block's four rows as terraces (ticket 051 B). Every side's band is `TERRACE_DEPTH_M`, so a row runs on to the next row's corner lot with no
 * gap on the street (its far end is left short by under one bay: the packer in 051 C closes it). Lots abut (gap 0), each the highest of
 * `TERRACE_CAPS_M` that clears; a slot that clears none ends the run and the next starts `FILL_STEP` on. A plaza may take one row's corner
 * (the row before it then ends at the plaza's edge); a long run may have one parking lot in its middle.
 * `sides` are in the order top, right, bottom, left (clockwise): each row starts at its own corner and stops short of the next row's band. With no options this is exactly
 * what the ladder's towns do (055 B pins it in townpin.test.ts).
 */
export function terraceBlockRows(block: { id: string }, sides: readonly [TerraceSide, TerraceSide, TerraceSide, TerraceSide], opts: TerraceRowOpts = {}): { lots: Lot[]; runs: TerraceRun[]; openLots: OpenLot[] } {
  const lots: Lot[] = [];
  const terraceRuns: TerraceRun[] = [];
  const openLots: OpenLot[] = [];
  const off = opts.frontOff ?? ROAD_W / 2 + PAVE_W + SETBACK;
  const clears = opts.clears ?? ((): boolean => true);
  const claim = opts.claim ?? ((): void => undefined);
  const counters = opts.counters ?? { slots: new Map<string, number>(), runs: new Map<string, number>() };
  const slotCount = counters.slots;
  const runCount = counters.runs;
  const lotBase = opts.lotBase ?? 0;
  const bayW = TERRACE_BAY_M * WORLD_PER_METRE;
  const terraceD = TERRACE_DEPTH_M * WORLD_PER_METRE;
  const plazaW = (opts.plazaW_m ?? PLAZA_W_M) * WORLD_PER_METRE;
  const parkW = PARKING_W_M * WORLD_PER_METRE;
  const parkD = PARKING_D_M * WORLD_PER_METRE;
  const snap = opts.snap_m === undefined ? 0 : opts.snap_m * WORLD_PER_METRE;
  const defs = sides;

  /** One side of a street a building can face, as the rows see it. */
  interface RowFront {
    id: string;
    ax: number;
    az: number;
    ux: number;
    uz: number;
    len: number;
    mx: number;
    mz: number;
    off: number;
    side: 1 | -1;
  }
  const frontage = (f: RowFront, c: number, w: number, d: number): { box: TerraceBox; cx: number; cz: number; fx: number; fz: number } => {
    const o = f.off + d / 2;
    const cx = f.ax + f.ux * (c + w / 2) + f.mx * o;
    const cz = f.az + f.uz * (c + w / 2) + f.mz * o;
    return { box: { x: cx, z: cz, w, d, fx: -f.mx, fz: -f.mz }, fx: -f.mx, fz: -f.mz, cx, cz };
  };
  /** A run being laid: its nominal lots so far. */
  interface OpenRun {
    id: string;
    lots: number[];
    /** The cursor where it started. */
    c0: number;
    /** Nominal bays laid so far, and the bays it could hold from its start to the row's end. */
    bays: number;
    total: number;
    /** A parking lot is still to come (decided by hash when the run starts). */
    park: boolean;
    /** The lot was asked for by `parkRuns`: it goes where it first fits, not about the middle (and whatever the hash said). */
    early: boolean;
  }

  /** Row `i`'s length: its span less the next row's band (a plaza's width when the next row starts with one). */
  const lenOf = (i: number, plaza: number): number => defs[i]!.span - (plaza === (i + 1) % 4 ? plazaW : terraceD);
  const frontOf = (i: number, plaza: number): RowFront => {
    const r = defs[i]!;
    return { id: r.road, ax: r.ax, az: r.az, ux: r.ux, uz: r.uz, len: lenOf(i, plaza), mx: r.mx, mz: r.mz, off, side: r.side };
  };
  const runIdFor = (f: RowFront): string => `${f.id}:${f.side}:r${runCount.get(`${f.id}:${f.side}`) ?? 0}`;

  // The plaza: one block in PLAZA_ONE_IN, at one row's start, in place of its corner block, if it clears and both rows it touches stay long enough.
  let plaza = -1;
  if (stableHash(block.id) % PLAZA_ONE_IN === 0) {
    const cand = stableHash(`${block.id}:plaza`) % 4;
    const own = frontOf(cand, cand);
    const prev = (cand + 3) % 4;
    if (own.len - plazaW >= TERRACE_BAYS.min * bayW - 1e-9 && lenOf(prev, cand) >= TERRACE_BAYS.min * bayW - 1e-9) {
      const f = frontage(own, 0, plazaW, plazaW);
      if (clears(f.box, 0, 0)) {
        claim(f.box);
        openLots.push({ kind: "plaza", run: runIdFor(own), x: f.cx, z: f.cz, w: plazaW, d: plazaW, yaw: Math.atan2(f.fx, f.fz) });
        plaza = cand;
      }
    }
  }

  for (let i = 0; i < 4; i++) {
    const front = frontOf(i, plaza);
    const sideKey = `${front.id}:${front.side}`;
    let slot = slotCount.get(sideKey) ?? 0;
    let c = (plaza === i ? plazaW : 0) + (opts.startInset_m?.(i, plaza === (i + 1) % 4, plaza === i) ?? 0) * WORLD_PER_METRE;
    let cur: OpenRun | null = null;
    let rowRuns = 0;
    const closeRun = (endAbuts: TerraceRun["endAbuts"], endC: number): void => {
      if (!cur) return;
      runCount.set(sideKey, (runCount.get(sideKey) ?? 0) + 1);
      terraceRuns.push({
        id: cur.id,
        block: block.id,
        road: front.id,
        side: front.side,
        lots: cur.lots,
        ax: front.ax + front.ux * cur.c0 + front.mx * front.off,
        az: front.az + front.uz * cur.c0 + front.mz * front.off,
        ux: front.ux,
        uz: front.uz,
        len: endC - cur.c0,
        startCorner: null,
        endAbuts,
        ...(opts.frame ? { frame: opts.frame } : {}),
      });
      cur = null;
    };
    while (c < front.len - 1e-9) {
      const room = Math.floor((front.len - c) / bayW + 1e-9);
      if (room < TERRACE_BAYS.min) break;
      const key = `${front.id}:${front.side}:${slot}`;
      slot++;
      let bays = Math.min(TERRACE_BAYS.min + (stableHash(key) % (TERRACE_BAYS.max - TERRACE_BAYS.min + 1)), room);
      // Never leave a single bay behind: nothing could stand on it.
      if (room - bays === 1) bays += bays > TERRACE_BAYS.min ? -1 : 1;
      const lw = bays * bayW;
      const f = frontage(front, c, lw, terraceD);
      let cap = 0;
      for (const m of TERRACE_CAPS_M) {
        if (clears(f.box, m * WORLD_PER_METRE, 0)) {
          cap = m;
          break;
        }
      }
      if (cap === 0) {
        closeRun("end", c);
        c += FILL_STEP;
        continue;
      }
      claim(f.box);
      if (!cur) {
        const id = `${sideKey}:r${runCount.get(sideKey) ?? 0}`;
        const total = Math.floor((front.len - c) / bayW + 1e-9);
        const byHash = (opts.parkByHash ?? true) && total >= PARKING_MIN_RUN_BAYS && stableHash(id) % PARKING_ONE_IN === 0;
        const asked = opts.parkRuns?.has(terraceRunKey(block.id, front.id, front.side, rowRuns)) ?? false;
        rowRuns++;
        cur = { id, lots: [], c0: c, bays: 0, total, park: asked || byHash, early: asked };
      }
      const run: OpenRun = cur;
      run.lots.push(lotBase + lots.length);
      run.bays += bays;
      lots.push({
        x: f.cx,
        z: f.cz,
        w: lw,
        d: terraceD,
        yaw: Math.atan2(f.fx, f.fz),
        type: "large",
        hMax: cap * WORLD_PER_METRE,
        key,
        street: front.id,
        side: front.side,
        corner: false,
        cornerSides: [],
        terrace: { run: run.id, index: run.lots.length - 1, bays },
      });
      c += lw;
      // One parking lot, about the middle of a long run, if it clears and leaves two bays after it. With a snap it starts on the next multiple of the snap, and the run stretches to it.
      if (run.park && (run.early || run.bays * 2 >= run.total - 2)) {
        run.park = false;
        const cp = snap > 0 ? Math.ceil(c / snap - 1e-9) * snap : c;
        if (front.len - (cp + parkW) >= TERRACE_BAYS.min * bayW - 1e-9) {
          const pf = frontage(front, cp, parkW, parkD);
          if (clears(pf.box, 0, 0)) {
            claim(pf.box);
            openLots.push({ kind: "parking", run: run.id, x: pf.cx, z: pf.cz, w: parkW, d: parkD, yaw: Math.atan2(pf.fx, pf.fz) });
            closeRun("parking", cp);
            c = cp + parkW;
          }
        }
      }
    }
    closeRun(plaza === (i + 1) % 4 ? "plaza" : "corner", front.len);
    slotCount.set(sideKey, slot);
  }
  return { lots, runs: terraceRuns, openLots };
}

// ---- the town ----

const cache = new WeakMap<Puzzle, { on?: Town; off?: Town }>();

/** The layout's own lot rules (roads, pavements, nodes, wires, placed lots, the occlusion rule at height `h`, world units) asked of one box: centre, size, yaw (the lot's front is `(sin yaw, cos yaw)`). */
export type TownClears = (x: number, z: number, w: number, d: number, yaw: number, h: number, margin?: number) => boolean;
const clearsOf = new WeakMap<object, TownClears>();

/** `clears` of a town `townLayout` made (the same function the lots were placed with), or null for any other object. A margin of 0 lets a box touch a placed lot. */
export function townClears(town: Town): TownClears | null {
  return clearsOf.get(town) ?? null;
}

type DeepReadonly<T> = T extends readonly (infer U)[] ? readonly DeepReadonly<U>[] : T extends object ? { readonly [K in keyof T]: DeepReadonly<T[K]> } : T;

/** The town as callers see it: read-only in the type, and frozen at run time (the result is cached and shared between callers). */
export type Town = DeepReadonly<TownData>;

function deepFreeze<T>(o: T): T {
  if (typeof o === "object" && o !== null && !Object.isFrozen(o)) {
    Object.freeze(o);
    for (const v of Object.values(o)) deepFreeze(v);
  }
  return o;
}

interface Street {
  id: string;
  kind: "line" | "feed" | "decor";
  line: string | null;
  a: Pt;
  b: Pt;
  len: number;
  ux: number;
  uz: number;
  /** The normal (-uz, ux). */
  nx: number;
  nz: number;
  side: 1 | -1 | 0;
  ta: number;
  tb: number;
  /** For a feed lane: the ring road the end meets. */
  ringEnd: boolean;
}

interface End {
  st: Street;
  atB: boolean;
}

const keyOf = (x: number, z: number): string => `${Math.round(x * 1e6)},${Math.round(z * 1e6)}`;

/** How many equal blocks to cut a side of length `len` into, so each is as near 11..15 as it can be, and nearest BLOCK_PITCH. A side shorter than 11 is one block. */
export function gridCount(len: number): number {
  let best = 1;
  let bo = Infinity;
  let bn = Infinity;
  for (let n = 1; n <= 64; n++) {
    const s = len / n;
    const out = s < 11 ? 11 - s : s > 15 ? s - 15 : 0;
    const near = Math.abs(s - BLOCK_PITCH);
    if (out < bo - 1e-9 || (Math.abs(out - bo) <= 1e-9 && near < bn - 1e-9)) {
      best = n;
      bo = out;
      bn = near;
    }
  }
  return best;
}

/** The town for a puzzle: streets, kerbs, pavements, junction pads, the ring of city blocks, lots and places. Pure and deterministic. */
export function townLayout(puzzle: Puzzle, opts: { terraces?: boolean } = {}): Town {
  const terraces = opts.terraces !== false;
  const entry = cache.get(puzzle) ?? {};
  const hit = terraces ? entry.on : entry.off;
  if (hit) return hit;
  const sink: { clears?: TownClears } = {};
  const town = deepFreeze(build(puzzle, terraces, sink)) as Town;
  if (sink.clears) clearsOf.set(town, sink.clears);
  if (terraces) entry.on = town;
  else entry.off = town;
  cache.set(puzzle, entry);
  return town;
}

function build(puzzle: Puzzle, terraces: boolean, sink?: { clears?: TownClears }): TownData {
  const posOf = new Map<string, Pt>();
  for (const n of puzzle.nodes) posOf.set(n.id, { x: n.pos[0], z: n.pos[1] });

  // The circuit's bounds (nodes and decor), then the ring road round it.
  let bx0 = Infinity;
  let bx1 = -Infinity;
  let bz0 = Infinity;
  let bz1 = -Infinity;
  const grow = (x: number, z: number): void => {
    bx0 = Math.min(bx0, x);
    bx1 = Math.max(bx1, x);
    bz0 = Math.min(bz0, z);
    bz1 = Math.max(bz1, z);
  };
  for (const n of puzzle.nodes) grow(n.pos[0], n.pos[1]);
  for (const d of puzzle.decor ?? []) for (const p of d.path) grow(p[0], p[1]);
  if (!Number.isFinite(bx0)) {
    bx0 = 0;
    bx1 = 1;
    bz0 = 0;
    bz1 = 1;
  }
  const ring: CityRect = { minX: bx0 - RING_MARGIN, minY: bz0 - RING_MARGIN, maxX: bx1 + RING_MARGIN, maxY: bz1 + RING_MARGIN };
  const P = OUTER_RINGS * BLOCK_PITCH;
  const half = ROAD_W / 2;
  const edge = half + PAVE_W;
  const win: CityRect = { minX: ring.minX - P - edge, minY: ring.minY - P - edge, maxX: ring.maxX + P + edge, maxY: ring.maxY + P + edge };

  // ---- node squares ----
  const squares = new PolySet();
  const squareAt = new Map<string, Poly>();
  for (const n of puzzle.nodes) {
    const s = mkPoly(rectPts(n.pos[0], n.pos[1], NODE_SQUARE, NODE_SQUARE, 0, 1))!;
    squares.add(s);
    squareAt.set(keyOf(n.pos[0], n.pos[1]), s);
  }

  // ---- streets of the circuit: lines in file order, feed lanes, decor ----
  const streets: Street[] = [];
  const mk = (id: string, kind: Street["kind"], line: string | null, a: Pt, b: Pt, ringEnd = false): Street => {
    const len = Math.hypot(b.x - a.x, b.z - a.z);
    const ux = len > 0 ? (b.x - a.x) / len : 1;
    const uz = len > 0 ? (b.z - a.z) / len : 0;
    return { id, kind, line, a, b, len, ux, uz, nx: -uz, nz: ux, side: 0, ta: 0, tb: 0, ringEnd };
  };
  for (const l of puzzle.lines) {
    const a = posOf.get(l.from);
    const b = posOf.get(l.to);
    if (a && b) streets.push(mk(l.id, "line", l.id, a, b));
  }
  const lanes = feedLanes(puzzle);
  let laneIdx = 0;
  for (const n of puzzle.nodes) {
    if (n.type !== "feed") continue;
    const lane = lanes[laneIdx++];
    if (!lane) continue;
    // 2D's lane stops on its footprint edge; 3D runs it on to the ring road's centreline.
    const horizontal = Math.abs(lane.by - lane.ay) < 1e-9;
    const dir = horizontal ? Math.sign(lane.bx - lane.ax) : Math.sign(lane.by - lane.ay);
    const end: Pt = horizontal ? { x: dir >= 0 ? ring.maxX : ring.minX, z: lane.ay } : { x: lane.ax, z: dir > 0 ? ring.maxY : ring.minY };
    streets.push(mk(`feed:${n.id}`, "feed", null, { x: lane.ax, z: lane.ay }, end, true));
  }
  (puzzle.decor ?? []).forEach((d, i) => {
    for (let j = 0; j + 1 < d.path.length; j++) {
      const a = d.path[j]!;
      const b = d.path[j + 1]!;
      streets.push(mk(`decor:${i}:${j}`, "decor", null, { x: a[0], z: a[1] }, { x: b[0], z: b[1] }));
    }
  });

  // Side rule: the road goes on the side of the normal that points toward +z (a line parallel to z: +x); if it would cover another node's
  // square it takes the other side; if both sides are blocked the line has no road.
  const roadBox = (s: Street, side: 1 | -1, ta: number, tb: number): Pt[] => {
    const mx = s.nx * side;
    const mz = s.nz * side;
    const ax = s.a.x + s.ux * ta;
    const az = s.a.z + s.uz * ta;
    const bx = s.b.x - s.ux * tb;
    const bz = s.b.z - s.uz * tb;
    const o0 = KERB_OFFSET;
    const o1 = KERB_OFFSET + ROAD_W;
    return [
      { x: ax + mx * o0, z: az + mz * o0 },
      { x: ax + mx * o1, z: az + mz * o1 },
      { x: bx + mx * o1, z: bz + mz * o1 },
      { x: bx + mx * o0, z: bz + mz * o0 },
    ];
  };
  const crowded = (s: Street, pts: Pt[]): boolean => {
    const poly = mkPoly(pts);
    if (!poly) return true;
    const ka = keyOf(s.a.x, s.a.z);
    const kb = keyOf(s.b.x, s.b.z);
    for (const n of puzzle.nodes) {
      const k = keyOf(n.pos[0], n.pos[1]);
      if (k === ka || k === kb) continue;
      const sq = squareAt.get(k)!;
      if (sq.maxX < poly.minX || sq.minX > poly.maxX || sq.maxZ < poly.minZ || sq.minZ > poly.maxZ) continue;
      if (sepDist(poly, sq) < -1e-6) return true;
    }
    return false;
  };
  for (const s of streets) {
    if (s.len < STREET_MIN_LEN) continue;
    const pref: 1 | -1 = Math.abs(s.nz) > 1e-9 ? (s.nz > 0 ? 1 : -1) : s.nx > 0 ? 1 : -1;
    const other: 1 | -1 = pref === 1 ? -1 : 1;
    if (!crowded(s, roadBox(s, pref, 0, 0))) s.side = pref;
    else if (!crowded(s, roadBox(s, other, 0, 0))) s.side = other;
  }

  // ---- junctions: roads ending at one point share a pad; each end is trimmed clear of the node's square ----
  const groups = new Map<string, { pt: Pt; ends: End[] }>();
  for (const s of streets) {
    if (s.side === 0) continue;
    for (const atB of [false, true]) {
      if (atB && s.ringEnd) continue;
      const pt = atB ? s.b : s.a;
      const k = keyOf(pt.x, pt.z);
      const g = groups.get(k);
      if (g) g.ends.push({ st: s, atB });
      else groups.set(k, { pt, ends: [{ st: s, atB }] });
    }
  }
  const outDir = (e: End): Pt => (e.atB ? { x: -e.st.ux, z: -e.st.uz } : { x: e.st.ux, z: e.st.uz });
  const endEdge = (e: End, t: number): [Pt, Pt] => {
    const p = e.atB ? e.st.b : e.st.a;
    const d = outDir(e);
    const mx = e.st.nx * e.st.side;
    const mz = e.st.nz * e.st.side;
    const cx = p.x + d.x * t;
    const cz = p.z + d.z * t;
    return [
      { x: cx + mx * KERB_OFFSET, z: cz + mz * KERB_OFFSET },
      { x: cx + mx * (KERB_OFFSET + ROAD_W), z: cz + mz * (KERB_OFFSET + ROAD_W) },
    ];
  };
  /** How far the road must start from the node so it does not cover the node's own square. */
  const baseTrim = (e: End, sq: Poly | undefined): number => {
    if (!sq) return 0;
    const p = e.atB ? e.st.b : e.st.a;
    const mx = e.st.nx * e.st.side;
    const mz = e.st.nz * e.st.side;
    // keep the square's part with (q - p) . m >= KERB_OFFSET, i.e. -m . q <= -(m . p) - KERB_OFFSET
    const clipped = clipTo(sq.pts, { nx: -mx, nz: -mz, c: -(mx * p.x + mz * p.z) - KERB_OFFSET + 1e-9 });
    if (clipped.length === 0) return 0;
    const d = outDir(e);
    let maxU = -Infinity;
    for (const q of clipped) maxU = Math.max(maxU, (q.x - p.x) * d.x + (q.z - p.z) * d.z);
    return maxU > 0 ? maxU + 1e-6 : 0;
  };
  const pads: Pad[] = [];
  const padPolys: (Poly | null)[] = [];
  for (const [k, g] of groups) {
    const sq = squareAt.get(k);
    const base = g.ends.map((e) => baseTrim(e, sq));
    let delta = 0;
    if (g.ends.length >= 2) {
      // The pad is pushed out along its roads until it covers the least of any node's square (none, where the corner allows).
      const covered = (d: number): number => {
        const pts: Pt[] = [];
        g.ends.forEach((e, i) => pts.push(...endEdge(e, base[i]! + d)));
        const h = hull(pts);
        if (h.length < 3) return 0;
        let hx0 = Infinity;
        let hx1 = -Infinity;
        for (const q of h) {
          hx0 = Math.min(hx0, q.x);
          hx1 = Math.max(hx1, q.x);
        }
        let total = 0;
        for (const o of squareAt.values()) {
          if (o.maxX < hx0 || o.minX > hx1) continue;
          total += overlapArea(h, o);
        }
        return total;
      };
      let least = Infinity;
      for (let d = 0; d <= 1.0 + 1e-9; d += 0.05) {
        const c = covered(d);
        if (c < least - 1e-9) {
          least = c;
          delta = d;
        }
        if (c < 1e-9) break;
      }
    }
    g.ends.forEach((e, i) => {
      const t = base[i]! + delta;
      if (e.atB) e.st.tb = t;
      else e.st.ta = t;
    });
    if (g.ends.length >= 2) {
      const pts: Pt[] = [];
      g.ends.forEach((e, i) => pts.push(...endEdge(e, base[i]! + delta)));
      const h = hull(pts);
      const node = puzzle.nodes.find((n) => keyOf(n.pos[0], n.pos[1]) === k);
      pads.push({ id: `pad:${k}`, node: node ? node.id : null, pts: h, roads: g.ends.map((e) => e.st.id) });
      padPolys.push(mkPoly(h));
    }
  }

  // ---- roads ----
  const roads: Road[] = [];
  const roadPolys: Poly[] = [];
  const addRoad = (r: Road): void => {
    roads.push(r);
    roadPolys.push(mkPoly(r.corners)!);
  };
  const lineRoadIndex = new Map<string, number>();
  for (const s of streets) {
    if (s.side === 0) continue;
    const corners = roadBox(s, s.side, s.ta, s.tb);
    const off = s.side * (KERB_OFFSET + half);
    lineRoadIndex.set(s.id, roads.length);
    addRoad({
      id: s.id,
      kind: s.kind,
      line: s.line,
      lineFrom: s.a,
      lineTo: s.b,
      side: s.side,
      ax: s.a.x + s.ux * s.ta + s.nx * off,
      az: s.a.z + s.uz * s.ta + s.nz * off,
      bx: s.b.x - s.ux * s.tb + s.nx * off,
      bz: s.b.z - s.uz * s.tb + s.nz * off,
      w: ROAD_W,
      corners,
    });
  }
  const circuitRoads = roads.length;

  // The ring road (sides extended by half a road so the corners are whole) and the outer city blocks' streets.
  interface Seg {
    id: string;
    kind: "ring" | "grid";
    a: Pt;
    b: Pt;
  }
  const ringSegs: Seg[] = [
    { id: "ring:n", kind: "ring", a: { x: ring.minX - half, z: ring.minY }, b: { x: ring.maxX + half, z: ring.minY } },
    { id: "ring:e", kind: "ring", a: { x: ring.maxX, z: ring.minY - half }, b: { x: ring.maxX, z: ring.maxY + half } },
    { id: "ring:s", kind: "ring", a: { x: ring.maxX + half, z: ring.maxY }, b: { x: ring.minX - half, z: ring.maxY } },
    { id: "ring:w", kind: "ring", a: { x: ring.minX, z: ring.maxY + half }, b: { x: ring.minX, z: ring.minY - half } },
  ];
  const gridSegs: Seg[] = [];
  const W = ring.maxX - ring.minX;
  const H = ring.maxY - ring.minY;
  const nx = gridCount(W);
  const nz = gridCount(H);
  const xs: number[] = [];
  for (let i = 0; i <= nx; i++) xs.push(ring.minX + (W * i) / nx);
  const zs: number[] = [];
  for (let i = 0; i <= nz; i++) zs.push(ring.minY + (H * i) / nz);
  const ox0 = ring.minX - P;
  const ox1 = ring.maxX + P;
  const oz0 = ring.minY - P;
  const oz1 = ring.maxY + P;
  gridSegs.push({ id: "grid:loop:n", kind: "grid", a: { x: ox0 - half, z: oz0 }, b: { x: ox1 + half, z: oz0 } });
  gridSegs.push({ id: "grid:loop:e", kind: "grid", a: { x: ox1, z: oz0 - half }, b: { x: ox1, z: oz1 + half } });
  gridSegs.push({ id: "grid:loop:s", kind: "grid", a: { x: ox1 + half, z: oz1 }, b: { x: ox0 - half, z: oz1 } });
  gridSegs.push({ id: "grid:loop:w", kind: "grid", a: { x: ox0, z: oz1 + half }, b: { x: ox0, z: oz0 - half } });
  xs.forEach((x, i) => {
    gridSegs.push({ id: `grid:n:${i}`, kind: "grid", a: { x, z: oz0 }, b: { x, z: ring.minY } });
    gridSegs.push({ id: `grid:s:${i}`, kind: "grid", a: { x, z: ring.maxY }, b: { x, z: oz1 } });
  });
  zs.forEach((z, i) => {
    gridSegs.push({ id: `grid:w:${i}`, kind: "grid", a: { x: ox0, z }, b: { x: ring.minX, z } });
    gridSegs.push({ id: `grid:e:${i}`, kind: "grid", a: { x: ring.maxX, z }, b: { x: ox1, z } });
  });
  const segInfos: { seg: Seg; len: number; ux: number; uz: number }[] = [];
  for (const seg of ringSegs.concat(gridSegs)) {
    const len = Math.hypot(seg.b.x - seg.a.x, seg.b.z - seg.a.z);
    const ux = (seg.b.x - seg.a.x) / len;
    const uz = (seg.b.z - seg.a.z) / len;
    segInfos.push({ seg, len, ux, uz });
    const mx = -uz * half;
    const mz = ux * half;
    addRoad({
      id: seg.id,
      kind: seg.kind,
      line: null,
      lineFrom: seg.a,
      lineTo: seg.b,
      side: 0,
      ax: seg.a.x,
      az: seg.a.z,
      bx: seg.b.x,
      bz: seg.b.z,
      w: ROAD_W,
      corners: [
        { x: seg.a.x + mx, z: seg.a.z + mz },
        { x: seg.a.x - mx, z: seg.a.z - mz },
        { x: seg.b.x - mx, z: seg.b.z - mz },
        { x: seg.b.x + mx, z: seg.b.z + mz },
      ],
    });
  }

  // A feed lane meets the ring road: a pad where the two overlap.
  for (const s of streets) {
    if (!s.ringEnd || s.side === 0) continue;
    const ri = lineRoadIndex.get(s.id)!;
    for (let j = circuitRoads; j < roads.length; j++) {
      if (roads[j]!.kind !== "ring") continue;
      const clip = clipPoly(roads[ri]!.corners, roadPolys[j]!);
      if (clip.length < 3 || area(clip) < 1e-6) continue;
      pads.push({ id: `pad:${s.id}:${roads[j]!.id}`, node: null, pts: clip, roads: [s.id, roads[j]!.id] });
      padPolys.push(mkPoly(clip));
    }
  }

  // ---- kerbs and pavements, clipped where another road or a pad lies over them ----
  const blockers = new PolySet();
  const blockerOwner: number[] = [];
  roadPolys.forEach((p, i) => {
    blockers.add(p);
    blockerOwner.push(i);
  });
  padPolys.forEach((p) => {
    if (p) {
      blockers.add(p);
      blockerOwner.push(-1);
    }
  });
  const scratch: [number, number] = [0, 0];
  /** The pieces of segment p -> q not inside any blocker other than road `own`, as parameter ranges. */
  const freeRanges = (px: number, pz: number, qx: number, qz: number, own: number): [number, number][] => {
    const cut: [number, number][] = [];
    const minX = Math.min(px, qx);
    const maxX = Math.max(px, qx);
    const minZ = Math.min(pz, qz);
    const maxZ = Math.max(pz, qz);
    for (let i = 0; i < blockers.polys.length; i++) {
      const b = blockers.polys[i]!;
      if (blockerOwner[i] === own || b.maxX < minX || b.minX > maxX || b.maxZ < minZ || b.minZ > maxZ) continue;
      if (insideRange(px, pz, qx, qz, b, 1e-6, scratch)) cut.push([scratch[0], scratch[1]]);
    }
    cut.sort((u, v) => u[0] - v[0]);
    const len = Math.hypot(qx - px, qz - pz);
    const out: [number, number][] = [];
    let t = 0;
    for (const [c0, c1] of cut) {
      if (c0 > t && (c0 - t) * len > 1e-6) out.push([t, c0]);
      t = Math.max(t, c1);
    }
    if (t < 1 && (1 - t) * len > 1e-6) out.push([t, 1]);
    return out;
  };

  const kerbs: Kerb[] = [];
  const pavements: Pavement[] = [];
  roads.forEach((r, i) => {
    const len = Math.hypot(r.bx - r.ax, r.bz - r.az);
    const ux = (r.bx - r.ax) / len;
    const uz = (r.bz - r.az) / len;
    const nxr = -uz;
    const nzr = ux;
    for (const e of [1, -1] as const) {
      const kx0 = r.ax + nxr * e * half;
      const kz0 = r.az + nzr * e * half;
      const kx1 = r.bx + nxr * e * half;
      const kz1 = r.bz + nzr * e * half;
      for (const [t0, t1] of freeRanges(kx0, kz0, kx1, kz1, i)) {
        kerbs.push({ road: r.id, side: e, ax: kx0 + (kx1 - kx0) * t0, az: kz0 + (kz1 - kz0) * t0, bx: kx0 + (kx1 - kx0) * t1, bz: kz0 + (kz1 - kz0) * t1 });
      }
      // The pavement band outside this kerb; ring and grid bands run on past the road's ends so the corners close.
      const ext = r.kind === "ring" || r.kind === "grid" ? PAVE_W : 0;
      const co = e * (half + PAVE_W / 2);
      const sx0 = r.ax - ux * ext + nxr * co;
      const sz0 = r.az - uz * ext + nzr * co;
      const sx1 = r.bx + ux * ext + nxr * co;
      const sz1 = r.bz + uz * ext + nzr * co;
      for (const [t0, t1] of freeRanges(sx0, sz0, sx1, sz1, i)) {
        const px = sx0 + (sx1 - sx0) * t0;
        const pz = sz0 + (sz1 - sz0) * t0;
        const qx = sx0 + (sx1 - sx0) * t1;
        const qz = sz0 + (sz1 - sz0) * t1;
        const hw = PAVE_W / 2;
        pavements.push({
          road: r.id,
          service: false,
          pts: [
            { x: px - nxr * hw, z: pz - nzr * hw },
            { x: px + nxr * hw, z: pz + nzr * hw },
            { x: qx + nxr * hw, z: qz + nzr * hw },
            { x: qx - nxr * hw, z: qz - nzr * hw },
          ],
        });
      }
    }
  });
  // Service runs: a line or decor segment with no road gets a pavement strip of its own.
  for (const s of streets) {
    if (s.side !== 0 || s.kind === "feed") continue;
    for (const [t0, t1] of freeRanges(s.a.x, s.a.z, s.b.x, s.b.z, -2)) {
      const px = s.a.x + (s.b.x - s.a.x) * t0;
      const pz = s.a.z + (s.b.z - s.a.z) * t0;
      const qx = s.a.x + (s.b.x - s.a.x) * t1;
      const qz = s.a.z + (s.b.z - s.a.z) * t1;
      const hw = PAVE_W / 2;
      pavements.push({
        road: s.id,
        service: true,
        pts: [
          { x: px - s.nx * hw, z: pz - s.nz * hw },
          { x: px + s.nx * hw, z: pz + s.nz * hw },
          { x: qx + s.nx * hw, z: qz + s.nz * hw },
          { x: qx - s.nx * hw, z: qz - s.nz * hw },
        ],
      });
    }
  }

  // ---- the outer city blocks ----
  const blocks: TownBlock[] = [];
  const inset = half + PAVE_W;
  /** A block's centreline rectangle and the four streets round it (each faces into the block). */
  const blockDefs: { id: string; x0: number; z0: number; x1: number; z1: number; top: string; bottom: string; left: string; right: string }[] = [];
  const addBlock = (id: string, x0: number, z0: number, x1: number, z1: number, top: string, bottom: string, left: string, right: string): void => {
    blocks.push({ id, minX: x0 + inset, minZ: z0 + inset, maxX: x1 - inset, maxZ: z1 - inset });
    blockDefs.push({ id, x0, z0, x1, z1, top, bottom, left, right });
  };
  for (let i = 0; i < nx; i++) {
    addBlock(`block:n:${i}`, xs[i]!, oz0, xs[i + 1]!, ring.minY, "grid:loop:n", "ring:n", `grid:n:${i}`, `grid:n:${i + 1}`);
    addBlock(`block:s:${i}`, xs[i]!, ring.maxY, xs[i + 1]!, oz1, "ring:s", "grid:loop:s", `grid:s:${i}`, `grid:s:${i + 1}`);
  }
  for (let i = 0; i < nz; i++) {
    addBlock(`block:w:${i}`, ox0, zs[i]!, ring.minX, zs[i + 1]!, `grid:w:${i}`, `grid:w:${i + 1}`, "grid:loop:w", "ring:w");
    addBlock(`block:e:${i}`, ring.maxX, zs[i]!, ox1, zs[i + 1]!, `grid:e:${i}`, `grid:e:${i + 1}`, "ring:e", "grid:loop:e");
  }
  addBlock("block:nw", ox0, oz0, ring.minX, ring.minY, "grid:loop:n", "grid:w:0", "grid:loop:w", "grid:n:0");
  addBlock("block:ne", ring.maxX, oz0, ox1, ring.minY, "grid:loop:n", "grid:e:0", `grid:n:${nx}`, "grid:loop:e");
  addBlock("block:sw", ox0, ring.maxY, ring.minX, oz1, `grid:w:${nz}`, "grid:loop:s", "grid:loop:w", "grid:s:0");
  addBlock("block:se", ring.maxX, ring.maxY, ox1, oz1, `grid:e:${nz}`, "grid:loop:s", `grid:s:${nx}`, "grid:loop:e");

  // ---- what lots and places must clear ----
  const statics = new PolySet();
  for (const p of roadPolys) statics.add(p);
  for (const p of padPolys) if (p) statics.add(p);
  for (const pv of pavements) {
    const p = mkPoly(pv.pts);
    if (p) statics.add(p);
  }
  for (const p of squares.polys) statics.add(p);
  const placed = new PolySet();

  const wireSegs: { ax: number; az: number; bx: number; bz: number }[] = [];
  const wireGrid = new Grid();
  const points: { x: number; y: number; z: number }[] = [];
  const pointGrid = new Grid();
  const addPoint = (x: number, y: number, z: number): void => {
    pointGrid.add(points.length, x, z, x, z);
    points.push({ x, y, z });
  };
  for (const run of wireLayout(puzzle)) {
    for (const span of run.spans) {
      for (let j = 0; j < span.length; j++) {
        const p = span[j]!;
        addPoint(p.x, p.y, p.z);
        if (j > 0) {
          const q = span[j - 1]!;
          wireGrid.add(wireSegs.length, Math.min(p.x, q.x), Math.min(p.z, q.z), Math.max(p.x, q.x), Math.max(p.z, q.z));
          wireSegs.push({ ax: q.x, az: q.z, bx: p.x, bz: p.z });
        }
      }
    }
  }
  for (const n of puzzle.nodes) addPoint(n.pos[0], n.type === "lamp" ? LAMP_HEAD_Y : NODE_TOP_Y, n.pos[1]);

  const ringOuter = mkPoly(rectPts((ring.minX + ring.maxX) / 2, (ring.minY + ring.maxY) / 2, W + 2 * edge, H + 2 * edge, 0, 1))!;
  const windowPoly = win;

  const chord: [number, number] = [0, 0];
  /** Would a building of height `h` on `poly` hide any wire point, node top or lamp head from the camera? */
  const hides = (poly: Poly, h: number): boolean => {
    const reach = h * OCCLUDE_SLOPE;
    return pointGrid.query(poly.minX, poly.minZ - reach, poly.maxX, poly.maxZ, (i) => {
      const p = points[i]!;
      const need = Math.max(0, h - p.y) * OCCLUDE_SLOPE;
      if (!chordAt(poly, p.x, chord)) return false;
      // The point's distance north of the lot's north edge at its x must be at least `need`; inside the lot counts as hidden.
      return p.z <= chord[1] && p.z > chord[0] - need + 1e-9;
    });
  };
  const nearWire = (poly: Poly): boolean =>
    wireGrid.query(poly.minX - WIRE_CLEAR, poly.minZ - WIRE_CLEAR, poly.maxX + WIRE_CLEAR, poly.maxZ + WIRE_CLEAR, (i) => {
      const w = wireSegs[i]!;
      return segPolyDist(w.ax, w.az, w.bx, w.bz, poly) < WIRE_CLEAR - 1e-9;
    });
  const inWindow = (poly: Poly): boolean => poly.minX >= windowPoly.minX - 1e-9 && poly.maxX <= windowPoly.maxX + 1e-9 && poly.minZ >= windowPoly.minY - 1e-9 && poly.maxZ <= windowPoly.maxY + 1e-9;
  /** The rules a lot or place box must clear. */
  const clears = (poly: Poly, h: number, outsideRing: boolean, margin = LOT_GAP): boolean => {
    if (!inWindow(poly)) return false;
    if (statics.hits(poly, 0)) return false;
    if (placed.hits(poly, margin)) return false;
    if (nearWire(poly)) return false;
    if (outsideRing && sepDist(poly, ringOuter) < -1e-9) return false;
    if (hides(poly, h)) return false;
    return true;
  };

  // The lot rules, for a caller that wants to ask them of a box the layout did not place (ticket 051 C's strip test). Unchanged: the closure above, exposed.
  if (sink) sink.clears = (x, z, w, d, yaw, h, margin = 0) => clears(mkPoly(rectPts(x, z, w, d, Math.sin(yaw), Math.cos(yaw)))!, h, false, margin);

  // ---- places, before the ordinary lots ----
  const allTargets = !puzzle.target || puzzle.target.length === 0;
  const targets = new Set(puzzle.target ?? []);
  const lamps = puzzle.nodes.filter((n) => n.type === "lamp");
  const places: PlaceLot[] = [];

  /** One side of a street a building can face: a reference line, the way the buildings go (away from the street), and how far its front edge stands from the line. */
  interface Front {
    id: string;
    ax: number;
    az: number;
    ux: number;
    uz: number;
    len: number;
    mx: number;
    mz: number;
    off: number;
    side: 1 | -1;
  }
  /** The sides of a road a frontage can face: a line's road faces its far side only (the near side is the wire's pavement). */
  const roadFronts = (roadIndex: number): Front[] => {
    const r = roads[roadIndex]!;
    const len = Math.hypot(r.bx - r.ax, r.bz - r.az);
    const ux = (r.bx - r.ax) / len;
    const uz = (r.bz - r.az) / len;
    const sides: (1 | -1)[] = r.kind === "line" ? [r.side === 1 ? 1 : -1] : [1, -1];
    return sides.map((side) => ({ id: r.id, ax: r.ax, az: r.az, ux, uz, len, mx: -uz * side, mz: ux * side, off: half + PAVE_W + SETBACK, side }));
  };
  /** A service run's two sides: places (not ordinary lots) may face them too, so a lamp off the roads still gets its building. */
  const serviceFronts: Front[] = [];
  for (const st of streets) {
    if (st.side !== 0 || st.kind === "feed") continue;
    for (const side of [1, -1] as const) {
      serviceFronts.push({ id: st.id, ax: st.a.x, az: st.a.z, ux: st.ux, uz: st.uz, len: st.len, mx: st.nx * side, mz: st.nz * side, off: PAVE_W / 2 + SETBACK, side });
    }
  }
  const frontage = (f: Front, c: number, w: number, d: number): { pts: Pt[]; fx: number; fz: number; cx: number; cz: number } => {
    const off = f.off + d / 2;
    const cx = f.ax + f.ux * (c + w / 2) + f.mx * off;
    const cz = f.az + f.uz * (c + w / 2) + f.mz * off;
    return { pts: rectPts(cx, cz, w, d, -f.mx, -f.mz), fx: -f.mx, fz: -f.mz, cx, cz };
  };
  const roadLen = (i: number): number => Math.hypot(roads[i]!.bx - roads[i]!.ax, roads[i]!.bz - roads[i]!.az);

  for (const n of lamps) {
    const kind = slotKind(n.id);
    const label = allTargets || targets.has(n.id) ? placeName(n.id) : null;
    const lx = n.pos[0];
    const lz = n.pos[1];
    const pool: PlaceLot = { lamp: n.id, label, kind, pool: true, boxes: [], street: null };
    /** Within reach of its own lamp and nearer it than any other lamp. */
    const mine = (poly: Poly): boolean => {
      const own = pointPolyDist(lx, lz, poly);
      if (own > PLACE_REACH + 1e-9) return false;
      for (const o of lamps) if (o !== n && pointPolyDist(o.pos[0], o.pos[1], poly) < own - 1e-9) return false;
      return true;
    };
    const commit = (boxes: Pt[][], street: string | null, yaws: number[], dims: { w: number; d: number }[], centres: Pt[]): void => {
      const out: PlaceBox[] = [];
      boxes.forEach((pts, i) => {
        placed.add(mkPoly(pts)!);
        out.push({ x: centres[i]!.x, z: centres[i]!.z, w: dims[i]!.w, d: dims[i]!.d, yaw: yaws[i]!, h: PLACE_H });
      });
      places.push({ lamp: n.id, label, kind, pool: false, boxes: out, street });
    };
    if (kind === "none") {
      places.push(pool);
      continue;
    }
    if (kind === "gate") {
      let done = false;
      // Two posts beside one of the lamp's wires, as in 2D: one each side of the wire, or (where a road runs on one side) both on the free side.
      const lat = WIRE_CLEAR + GATE_POST / 2 + 0.002;
      for (const wire of puzzle.lines) {
        if (done) break;
        if (wire.from !== n.id && wire.to !== n.id) continue;
        const otherPos = posOf.get(wire.from === n.id ? wire.to : wire.from);
        if (!otherPos) continue;
        const dx = otherPos.x - lx;
        const dz = otherPos.z - lz;
        const len = Math.hypot(dx, dz) || 1;
        const ux = dx / len;
        const uz = dz / len;
        const pairs: { sides: [number, number]; gap: number }[] = [
          { sides: [-1, 1], gap: 0 },
          { sides: [-1, -1], gap: GATE_POST + LOT_GAP },
          { sides: [1, 1], gap: GATE_POST + LOT_GAP },
        ];
        for (const pair of pairs) {
          for (let s = NODE_SQUARE / 2 + GATE_POST / 2 + 0.05; s <= PLACE_REACH && !done; s += 0.1) {
            const cs: Pt[] = pair.sides.map((side, i) => ({ x: lx + ux * (s + i * pair.gap) - uz * lat * side, z: lz + uz * (s + i * pair.gap) + ux * lat * side }));
            // Each post turns its front to the wire.
            const polys = cs.map((c, i) => mkPoly(rectPts(c.x, c.z, GATE_POST, GATE_POST, uz * pair.sides[i]!, -ux * pair.sides[i]!))!);
            if (!polys.every((q) => mine(q) && clears(q, PLACE_H, false))) continue;
            if (sepDist(polys[0]!, polys[1]!) < LOT_GAP - 1e-9) continue;
            commit(
              polys.map((q) => q.pts),
              null,
              pair.sides.map((side) => Math.atan2(uz * side, -ux * side)),
              cs.map(() => ({ w: GATE_POST, d: GATE_POST })),
              cs,
            );
            done = true;
          }
          if (done) break;
        }
      }
      if (!done) places.push(pool);
      continue;
    }
    const part = kind === "whole" ? PLACE_SIZES.whole : kind === "quarter" ? PLACE_SIZES.quarter : PLACE_SIZES.home;
    const pw = part.w * WORLD_PER_METRE;
    const pd = part.d * WORLD_PER_METRE;
    const count = kind === "row3" ? 3 : 1;
    const total = count * pw + (count - 1) * LOT_GAP;
    // Every frontage slot in reach, nearest first; ties in road, side and position order.
    const fronts: Front[] = [];
    for (let r = 0; r < roads.length; r++) {
      const rp = roadPolys[r]!;
      if (rp.maxX < lx - PLACE_REACH - 6 || rp.minX > lx + PLACE_REACH + 6 || rp.maxZ < lz - PLACE_REACH - 6 || rp.minZ > lz + PLACE_REACH + 6) continue;
      fronts.push(...roadFronts(r));
    }
    for (const f of serviceFronts) {
      if (Math.abs(f.ax - lx) > PLACE_REACH + 8 + f.len || Math.abs(f.az - lz) > PLACE_REACH + 8 + f.len) continue;
      fronts.push(f);
    }
    const cands: { dist: number; f: Front; c: number; order: number }[] = [];
    let order = 0;
    for (const f of fronts) {
      for (let c = 0; c + total <= f.len + 1e-9; c += PLACE_STEP) {
        const q = mkPoly(frontage(f, c, total, pd).pts)!;
        const dist = pointPolyDist(lx, lz, q);
        if (dist <= PLACE_REACH + 1e-9) cands.push({ dist, f, c, order: order++ });
      }
    }
    cands.sort((a, b) => a.dist - b.dist || a.order - b.order);
    let done = false;
    for (const cand of cands) {
      const polys: Poly[] = [];
      const centres: Pt[] = [];
      let fxz = { fx: 0, fz: 0 };
      for (let k = 0; k < count; k++) {
        const f = frontage(cand.f, cand.c + k * (pw + LOT_GAP), pw, pd);
        polys.push(mkPoly(f.pts)!);
        centres.push({ x: f.cx, z: f.cz });
        fxz = { fx: f.fx, fz: f.fz };
      }
      if (!polys.every((q) => mine(q) && clears(q, PLACE_H, false))) continue;
      // A row's homes must clear one another too.
      let ok = true;
      for (let i = 0; i < polys.length && ok; i++) for (let j = i + 1; j < polys.length; j++) if (sepDist(polys[i]!, polys[j]!) < LOT_GAP - 1e-9) ok = false;
      if (!ok) continue;
      const yaw = Math.atan2(fxz.fx, fxz.fz);
      commit(
        polys.map((q) => q.pts),
        cand.f.id,
        polys.map(() => yaw),
        polys.map(() => ({ w: pw, d: pd })),
        centres,
      );
      done = true;
      break;
    }
    if (!done) places.push(pool);
  }

  // ---- lots: frontage fill. The ring road's inside, then the outer blocks pinwheel-fashion, then the circuit's streets in file order, then decor ----
  const lots: Lot[] = [];
  const small = LOT_TYPES.small;
  const outerDepth = BLOCK_PITCH - ROAD_W - 2 * PAVE_W - 2 * SETBACK;
  const typesFor = (kind: RoadKind): LotType[] => {
    // In a city block a lot must leave room for a small one opposite; a circuit street has no opposite.
    if (kind === "ring" || kind === "grid") return LOT_TYPE_NAMES.filter((t) => (LOT_TYPES[t].depth + small.depth) * WORLD_PER_METRE + LOT_GAP <= outerDepth);
    return LOT_TYPE_NAMES.filter((t) => t !== "tall");
  };
  /** Fill one row: the cursor starts at the row's own corner and steps by FILL_STEP when nothing fits. */
  const slotCount = new Map<string, number>();
  const fillRow = (front: Front, roadId: string, types: LotType[]): void => {
    let c = 0;
    // A road side can serve several rows (a loop street runs past many blocks): the slot count carries on along it, so keys stay unique.
    const side = `${roadId}:${front.side}`;
    let slot = slotCount.get(side) ?? 0;
    while (c < front.len - 1e-9) {
      const key = `${roadId}:${front.side}:${slot}`;
      const h0 = stableHash(key) % types.length;
      slot++;
      let did = false;
      for (let k = 0; k < types.length && !did; k++) {
        const type = types[(h0 + k) % types.length]!;
        const spec = LOT_TYPES[type];
        const w = spec.frontage * WORLD_PER_METRE;
        const d = spec.depth * WORLD_PER_METRE;
        if (c + w > front.len + 1e-9) continue;
        const f = frontage(front, c, w, d);
        const poly = mkPoly(f.pts)!;
        if (!clears(poly, spec.cap * WORLD_PER_METRE, type === "tall")) continue;
        placed.add(poly);
        lots.push({ x: f.cx, z: f.cz, w, d, yaw: Math.atan2(f.fx, f.fz), type, hMax: spec.cap * WORLD_PER_METRE, key, street: roadId, side: front.side, corner: false, cornerSides: [] });
        c += w + LOT_GAP;
        did = true;
      }
      if (!did) c += FILL_STEP;
    }
    slotCount.set(side, slot);
  };
  const ringInside = (f: Front): boolean => {
    const cx = (ring.minX + ring.maxX) / 2;
    const cz = (ring.minY + ring.maxY) / 2;
    return (cx - f.ax) * f.mx + (cz - f.az) * f.mz > 0;
  };
  for (let ri = circuitRoads; ri < roads.length; ri++) {
    if (roads[ri]!.kind !== "ring") continue;
    for (const front of roadFronts(ri)) if (ringInside(front)) fillRow(front, roads[ri]!.id, typesFor("ring"));
  }

  // Outer blocks: each side's row starts at its own corner, going clockwise (north row east, east row south, south row west, west row north),
  // and stops LOT_GAP short of the next side's band. Every side reserves its band first: the deepest type allowed there.
  const roadById = new Map(roads.map((r) => [r.id, r] as const));
  const sideOf = (roadId: string, mx: number, mz: number): 1 | -1 => {
    const r = roadById.get(roadId)!;
    const len = Math.hypot(r.bx - r.ax, r.bz - r.az);
    return (-((r.bz - r.az) / len) * mx + ((r.bx - r.ax) / len) * mz) > 0 ? 1 : -1;
  };
  const terraceRuns: TerraceRun[] = [];
  const openLots: OpenLot[] = [];
  const runCount = new Map<string, number>();
  /** The lot rules and the claim of a box, as `terraceBlockRows` asks for them (the polygon is made from the box's centre, size and front, as the lot's own was). */
  const rowClears = (b: TerraceBox, h: number, margin: number): boolean => clears(mkPoly(rectPts(b.x, b.z, b.w, b.d, b.fx, b.fz))!, h, false, margin);
  const rowClaim = (b: TerraceBox): void => {
    placed.add(mkPoly(rectPts(b.x, b.z, b.w, b.d, b.fx, b.fz))!);
  };
  /** One outer block's four rows as terraces (ticket 051 B; the fill is `terraceBlockRows`, extracted in 055 B with today's behaviour as its defaults). */
  const fillTerraceBlock = (d: (typeof blockDefs)[number], R: { x0: number; z0: number; x1: number; z1: number }, w: number, h: number): void => {
    const sides: [TerraceSide, TerraceSide, TerraceSide, TerraceSide] = [
      { road: d.top, side: sideOf(d.top, 0, 1), ax: R.x0, az: d.z0, ux: 1, uz: 0, mx: 0, mz: 1, span: w },
      { road: d.right, side: sideOf(d.right, -1, 0), ax: d.x1, az: R.z0, ux: 0, uz: 1, mx: -1, mz: 0, span: h },
      { road: d.bottom, side: sideOf(d.bottom, 0, -1), ax: R.x1, az: d.z1, ux: -1, uz: 0, mx: 0, mz: -1, span: w },
      { road: d.left, side: sideOf(d.left, 1, 0), ax: d.x0, az: R.z1, ux: 0, uz: -1, mx: 1, mz: 0, span: h },
    ];
    const res = terraceBlockRows({ id: d.id }, sides, { clears: rowClears, claim: rowClaim, counters: { slots: slotCount, runs: runCount }, lotBase: lots.length });
    lots.push(...res.lots);
    terraceRuns.push(...res.runs);
    openLots.push(...res.openLots);
  };

  blockDefs.forEach((d) => {
    const R = { x0: d.x0 + inset + SETBACK, z0: d.z0 + inset + SETBACK, x1: d.x1 - inset - SETBACK, z1: d.z1 - inset - SETBACK };
    const w = R.x1 - R.x0;
    const h = R.z1 - R.z0;
    if (terraces) {
      fillTerraceBlock(d, R, w, h);
      return;
    }
    // The types a side takes: the ring/grid rule. `large` is five metres deeper than the rest, so one side of a block (by hash) may take it, and only
    // where a row beside its band still holds ROW_MIN_SMALLS small lots. Every side's band is its deepest type, reserved before any row is filled.
    const base = typesFor("ring").filter((t) => t !== "large");
    const largeFits = typesFor("ring").includes("large") && Math.min(w, h) - LOT_TYPES.large.depth * WORLD_PER_METRE - LOT_GAP >= ROW_MIN_SMALLS * (small.frontage * WORLD_PER_METRE + LOT_GAP);
    const largeSide = stableHash(`${d.top}|${d.left}`) % 4;
    const sideTypes: LotType[][] = [0, 1, 2, 3].map((i) => (largeFits && i === largeSide ? [...base, "large" as LotType] : base));
    const bands = sideTypes.map((ts) => Math.max(...ts.map((t) => LOT_TYPES[t].depth)) * WORLD_PER_METRE);
    const off = half + PAVE_W + SETBACK;
    // Each row runs to the next side's band (clockwise: top, right, bottom, left).
    const rows: { road: string; ax: number; az: number; ux: number; uz: number; mx: number; mz: number; len: number }[] = [
      { road: d.top, ax: R.x0, az: d.z0, ux: 1, uz: 0, mx: 0, mz: 1, len: w - bands[1]! - LOT_GAP },
      { road: d.right, ax: d.x1, az: R.z0, ux: 0, uz: 1, mx: -1, mz: 0, len: h - bands[2]! - LOT_GAP },
      { road: d.bottom, ax: R.x1, az: d.z1, ux: -1, uz: 0, mx: 0, mz: -1, len: w - bands[3]! - LOT_GAP },
      { road: d.left, ax: d.x0, az: R.z1, ux: 0, uz: -1, mx: 1, mz: 0, len: h - bands[0]! - LOT_GAP },
    ];
    rows.forEach((row, i) => {
      if (row.len < small.frontage * WORLD_PER_METRE) return;
      fillRow({ id: row.road, ax: row.ax, az: row.az, ux: row.ux, uz: row.uz, len: row.len, mx: row.mx, mz: row.mz, off, side: sideOf(row.road, row.mx, row.mz) }, row.road, sideTypes[i]!);
    });
  });

  const kindRank =(k: RoadKind): number => (k === "line" ? 0 : k === "feed" ? 1 : 2);
  const circuitOrder: number[] = [];
  for (let i = 0; i < circuitRoads; i++) circuitOrder.push(i);
  circuitOrder.sort((x, y) => kindRank(roads[x]!.kind) - kindRank(roads[y]!.kind) || x - y);
  for (const ri of circuitOrder) {
    const r = roads[ri]!;
    for (const front of roadFronts(ri)) fillRow(front, r.id, typesFor(r.kind));
  }

  // A corner lot (Josh, 17 Nov 2026): a side edge within CORNER_GAP of another road's pavement, that road lying toward that side. A row end alone is not one.
  // Service strips are footpaths, not roads: only a pavement of a real road counts.
  const pavePolys = pavements.filter((pv) => roadById.has(pv.road)).map((pv) => ({ road: roadById.get(pv.road)!, poly: mkPoly(pv.pts) }));
  const cosMax = Math.cos((CORNER_ANGLE_MAX * Math.PI) / 180) - 1e-9;
  for (const l of lots) {
    const sides: CornerSide[] = [];
    const ex = Math.cos(l.yaw);
    const ez = -Math.sin(l.yaw);
    const fx = Math.sin(l.yaw);
    const fz = Math.cos(l.yaw);
    for (const sgn of [1, -1] as const) {
      const px = l.x + (ex * l.w * sgn) / 2;
      const pz = l.z + (ez * l.w * sgn) / 2;
      const ax = px - (fx * l.d) / 2;
      const az = pz - (fz * l.d) / 2;
      const bx = px + (fx * l.d) / 2;
      const bz = pz + (fz * l.d) / 2;
      for (const pv of pavePolys) {
        const r = pv.road;
        if (!pv.poly || r.id === l.street) continue;
        if (Math.min(ax, bx) > pv.poly.maxX + CORNER_GAP || Math.max(ax, bx) < pv.poly.minX - CORNER_GAP || Math.min(az, bz) > pv.poly.maxZ + CORNER_GAP || Math.max(az, bz) < pv.poly.minZ - CORNER_GAP) continue;
        if (segPolyDist(ax, az, bx, bz, pv.poly) > CORNER_GAP) continue;
        const side = sgn === 1 ? "+x" : "-x";
        if (sides.some((c) => c.side === side && c.road === r.id)) continue;
        // The nearest point of the cross road's centreline to the lot's centre must lie toward this side.
        const dx = r.bx - r.ax;
        const dz = r.bz - r.az;
        const t = Math.max(0, Math.min(1, ((l.x - r.ax) * dx + (l.z - r.az) * dz) / (dx * dx + dz * dz)));
        const vx = r.ax + dx * t - l.x;
        const vz = r.az + dz * t - l.z;
        const vl = Math.hypot(vx, vz);
        if (vl < 1e-9 || (vx * ex * sgn + vz * ez * sgn) / vl < cosMax) continue;
        sides.push({ side, road: r.id });
      }
    }
    l.cornerSides = sides;
    l.corner = sides.length > 0;
  }

  // A run starts at a corner when its first lot has a cross road on the side toward the run's start (the lot's +x is against the run's direction).
  for (const run of terraceRuns) {
    const first = lots[run.lots[0]!]!;
    const toStart = Math.cos(first.yaw) * run.ux - Math.sin(first.yaw) * run.uz < 0 ? "+x" : "-x";
    run.startCorner = first.cornerSides.find((cs) => cs.side === toStart) ?? null;
  }

  return { roads, kerbs, pavements, pads, blocks, lots, terraces: terraceRuns, openLots, places, ring, window: win };
}
