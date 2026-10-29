/**
 * The city under the map (ticket 023), as pure data. No DOM, no canvas.
 *
 * One city, a pure function of world position under one fixed seed: space is cut into cells of
 * CITY_BLOCK units, each cell's buildings come from hash(CITY_SEED, cellX, cellY). Maps are windows
 * onto it: `mapOrigin` says where a map sits (hub and spokes, from the id alone), `cityForMap`
 * gives the buildings in map units with the circuit's nodes and the lamps' places kept clear.
 *
 * Boxes: `Building` and `Place` use x,y as the CENTRE and w,h as the full size.
 */

import type { Puzzle } from "../core";
import type { GridState } from "../grid";
import { puzzleBounds, type Bounds } from "./geometry";

export const CITY_SEED = 0x5e57;
export const CITY_BLOCK = 2;
export const CITY_STREET = 0.35;
export const DISTRICT = 32;
export const HUB_R = 40;
export const SPOKES = 8;
export const SLOTS_PER_SPOKE = 8;
export const R0 = 64;
export const CITY_AVENUE = 1.2;
export const CITY_LINK_R = 1.6;
export const GLOW_EASE_SECONDS = 0.25;
/** Nothing of the city is centred closer than this to a node of the open map. */
export const NODE_CLEAR = 0.6;
export const PLACE_W = 1.1;
export const PLACE_H = 0.9;
/** Ticket 024 A1: inside a map's footprint the streets are the circuit itself. */
export const FOOTPRINT_MARGIN = 2;
export const LANE_W = 0.5;
export const DECOR_LANE_W = 0.3;
export const NODE_SQUARE = 0.7;
/** Footprint buildings sit on a grid of this many city units, keyed on city coordinates. */
export const FINE_CELL = 0.5;
/** Clear space kept between a footprint building and any lane, node square or place. */
export const BUILDING_GAP = 0.1;

export interface Building {
  x: number;
  y: number;
  w: number;
  h: number;
}
export interface Place extends Building {
  lamp: string;
}
export interface Linked extends Building {
  lamp: string;
  strength: 0.5;
}
export interface CityRect {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}
export interface Vec {
  x: number;
  y: number;
}
/** A street along the exact segment a-b, `w` wide, in map units. */
export interface Lane {
  ax: number;
  ay: number;
  bx: number;
  by: number;
  w: number;
}

// ---- style (all within contrast 1.6 of the map background) ----
export const CITY_BG = "#0b0f17";
export const CITY_STREET_COLOUR = "#07090e";
export const CITY_AVENUE_COLOUR = "#06080c";
export const CITY_BUILDING = "#121823";
export const CITY_PLACE = "#151c28";
export const CITY_PLACE_EDGE = "#1b2332";
export const CITY_WARM = "#ffd37a";
/** Lit fill alpha at full glow. */
export const LIT_FILL_ALPHA = 0.33;
/** Halo layers, each grown by `grow` map units on every side. Their alphas sum to at most 0.2. */
export const HALO_LAYERS: readonly { grow: number; alpha: number }[] = [
  { grow: 0.55, alpha: 0.04 },
  { grow: 0.32, alpha: 0.06 },
  { grow: 0.14, alpha: 0.09 },
];
export const HALO_ALPHA = HALO_LAYERS.reduce((s, l) => s + l.alpha, 0);

function channel(v: number): number {
  const s = v / 255;
  return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
}
function luminance(hex: string): number {
  const n = parseInt(hex.slice(1), 16);
  return 0.2126 * channel((n >> 16) & 255) + 0.7152 * channel((n >> 8) & 255) + 0.0722 * channel(n & 255);
}
/** WCAG contrast ratio of two #rrggbb colours (>= 1). */
export function contrastRatio(a: string, b: string): number {
  const la = luminance(a);
  const lb = luminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

// ---- hashing ----
function mix(h0: number): number {
  let h = h0 >>> 0;
  h ^= h >>> 16;
  h = Math.imul(h, 0x7feb352d);
  h ^= h >>> 15;
  h = Math.imul(h, 0x846ca68b);
  h ^= h >>> 16;
  return h >>> 0;
}
function rnd(h: number, i: number): number {
  return mix(h + Math.imul(i + 1, 0x9e3779b9)) / 4294967296;
}
/** FNV-1a, 32 bit. */
export function stableHash(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

// ---- where maps sit ----

/** The id's leading digits (`07-where-it-stops`, `locked/07-where-it-stops`), or null. */
export function ladderNumber(id: string): number | null {
  const last = id.slice(id.lastIndexOf("/") + 1);
  const m = /^(\d+)/.exec(last);
  if (!m) return null;
  const n = parseInt(m[1]!, 10);
  return n >= 1 ? n : null;
}

const SQ = Math.SQRT1_2;
/** Unit direction of each spoke (screen y points down): E, NE, N, NW, W, SW, S, SE. */
const SPOKE_DIRS: readonly (readonly [number, number])[] = [
  [1, 0],
  [SQ, -SQ],
  [0, -1],
  [-SQ, -SQ],
  [-1, 0],
  [-SQ, SQ],
  [0, 1],
  [SQ, SQ],
];
export function spokeDir(spoke: number): Vec {
  const d = SPOKE_DIRS[((spoke % SPOKES) + SPOKES) % SPOKES]!;
  return { x: d[0], y: d[1] };
}
/** Distance between consecutive district centres on a spoke. */
export function spokeStep(spoke: number): number {
  return spoke % 2 === 0 ? DISTRICT : DISTRICT * Math.SQRT2;
}

export interface District {
  spoke: number | null;
  slot: number | null;
  centre: Vec;
}

/** District of ladder number n (n >= 1). n = 1 is the town square on the hub. */
export function districtOf(n: number): District {
  if (n <= 1) return { spoke: null, slot: null, centre: { x: 0, y: 0 } };
  const k = n - 2;
  const spoke = Math.floor(k / SLOTS_PER_SPOKE) % SPOKES;
  const slot = (k % SLOTS_PER_SPOKE) + SLOTS_PER_SPOKE * Math.floor(k / (SLOTS_PER_SPOKE * SPOKES));
  const d = spokeDir(spoke);
  const r = R0 + slot * spokeStep(spoke);
  return { spoke, slot, centre: { x: d.x * r, y: d.y * r } };
}

export function inHub(x: number, y: number): boolean {
  return Math.hypot(x, y) < HUB_R;
}

/** True where a spoke's avenue band lies: beyond the hub's edge, within half CITY_AVENUE of a spoke's ray. */
export function onAvenue(x: number, y: number): boolean {
  for (let s = 0; s < SPOKES; s++) {
    const d = SPOKE_DIRS[s]!;
    const along = x * d[0] + y * d[1];
    if (along < HUB_R - 1e-9) continue;
    if (Math.abs(-x * d[1] + y * d[0]) <= CITY_AVENUE / 2 + 1e-9) return true;
  }
  return false;
}

/** Ladder number of a map id; an id with no number goes on the outer ring (65..128). */
export function mapNumber(id: string): number {
  return ladderNumber(id) ?? 65 + (stableHash(id) % 64);
}

/** Offset that turns map units into city units (`city = pos + origin`), whole cells, bounds centred on the district. */
export function mapOrigin(id: string, bounds: Bounds): Vec {
  const c = districtOf(mapNumber(id)).centre;
  const bx = (bounds.minX + bounds.maxX) / 2;
  const by = (bounds.minY + bounds.maxY) / 2;
  const x = Math.round((c.x - bx) / CITY_BLOCK) * CITY_BLOCK;
  const y = Math.round((c.y - by) / CITY_BLOCK) * CITY_BLOCK;
  return { x: x + 0, y: y + 0 }; // + 0 turns -0 into 0
}

// ---- the shared city ----

/** True if a building's rectangle reaches an avenue band (so it is not built there). */
function touchesAvenue(b: Building): boolean {
  if (Math.hypot(b.x, b.y) < HUB_R - 4) return false;
  for (let s = 0; s < SPOKES; s++) {
    const d = SPOKE_DIRS[s]!;
    const ax = Math.abs(d[0]);
    const ay = Math.abs(d[1]);
    const along = b.x * d[0] + b.y * d[1];
    const perp = -b.x * d[1] + b.y * d[0];
    const ea = (ax * b.w + ay * b.h) / 2;
    const ep = (ay * b.w + ax * b.h) / 2;
    if (along + ea >= HUB_R && Math.abs(perp) <= CITY_AVENUE / 2 + ep) return true;
  }
  return false;
}

const cellCache = new Map<number, readonly Building[]>();
const CELL_CACHE_MAX = 40000;
const CELL_OFFSET = 1 << 20;

function cellBuildings(cx: number, cy: number): readonly Building[] {
  const key = (cx + CELL_OFFSET) * 2097152 + (cy + CELL_OFFSET);
  const hit = cellCache.get(key);
  if (hit) return hit;
  if (cellCache.size > CELL_CACHE_MAX) cellCache.clear();
  const h = mix(mix(CITY_SEED ^ Math.imul(cx | 0, 0x27d4eb2d)) ^ Math.imul(cy | 0, 0x165667b1));
  const half = CITY_STREET / 2;
  const inner = CITY_BLOCK - CITY_STREET;
  const ix = cx * CITY_BLOCK + half;
  const iy = cy * CITY_BLOCK + half;
  const out: Building[] = [];
  const kind = rnd(h, 0);
  if (kind >= 0.1) {
    if (kind < 0.55) {
      const w = inner * (0.62 + 0.34 * rnd(h, 1));
      const hh = inner * (0.62 + 0.34 * rnd(h, 2));
      out.push({ x: ix + w / 2 + (inner - w) * rnd(h, 3), y: iy + hh / 2 + (inner - hh) * rnd(h, 4), w, h: hh });
    } else {
      const gap = 0.1;
      const part = (inner - gap) / 2;
      const vertical = kind < 0.8; // two side by side
      for (let k = 0; k < 2; k++) {
        const along = part * (0.8 + 0.2 * rnd(h, 5 + k));
        const across = inner * (0.55 + 0.4 * rnd(h, 7 + k));
        const a0 = k * (part + gap) + (part - along) * rnd(h, 9 + k);
        const c0 = (inner - across) * rnd(h, 11 + k);
        out.push(
          vertical
            ? { x: ix + a0 + along / 2, y: iy + c0 + across / 2, w: along, h: across }
            : { x: ix + c0 + across / 2, y: iy + a0 + along / 2, w: across, h: along },
        );
      }
    }
  }
  const kept = out.filter((b) => !touchesAvenue(b));
  cellCache.set(key, kept);
  return kept;
}

/** Every building of every cell the rect touches, in city units. Deterministic and map-independent. */
export function cityCells(rect: CityRect): Building[] {
  const out: Building[] = [];
  const x0 = Math.floor(rect.minX / CITY_BLOCK);
  const x1 = Math.floor(rect.maxX / CITY_BLOCK);
  const y0 = Math.floor(rect.minY / CITY_BLOCK);
  const y1 = Math.floor(rect.maxY / CITY_BLOCK);
  for (let cx = x0; cx <= x1; cx++) for (let cy = y0; cy <= y1; cy++) for (const b of cellBuildings(cx, cy)) out.push(b);
  return out;
}

// ---- places ----

function overlaps(a: Building, b: Building, gap = 0): boolean {
  return Math.abs(a.x - b.x) < (a.w + b.w) / 2 + gap && Math.abs(a.y - b.y) < (a.h + b.h) / 2 + gap;
}

const SIDES: readonly (readonly [number, number])[] = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
];

const placeCache = new WeakMap<Puzzle, Place[]>();

/** One place per lamp: a footprint beside it, on the side with the fewest of its lines. Map units. */
export function cityPlaces(puzzle: Puzzle): Place[] {
  const hit = placeCache.get(puzzle);
  if (hit) return hit;
  const pos = new Map<string, readonly [number, number]>();
  for (const n of puzzle.nodes) pos.set(n.id, n.pos);
  const places: Place[] = [];
  for (const n of puzzle.nodes) {
    if (n.type !== "lamp") continue;
    const [lx, ly] = n.pos;
    const score = [0, 0, 0, 0];
    for (const l of puzzle.lines) {
      if (l.from !== n.id && l.to !== n.id) continue;
      const o = pos.get(l.from === n.id ? l.to : l.from);
      if (!o) continue;
      const dx = o[0] - lx;
      const dy = o[1] - ly;
      const len = Math.hypot(dx, dy) || 1;
      for (let s = 0; s < 4; s++) score[s]! += Math.max(0, (dx * SIDES[s]![0] + dy * SIDES[s]![1]) / len);
    }
    const order = [0, 1, 2, 3].sort((a, b) => score[a]! - score[b]! || a - b);
    let placed: Place | null = null;
    for (let d = 1.0; d <= 8 && !placed; d += 0.25) {
      for (const s of order) {
        const cand: Place = { x: lx + SIDES[s]![0] * d, y: ly + SIDES[s]![1] * d, w: PLACE_W, h: PLACE_H, lamp: n.id };
        if (puzzle.nodes.some((o) => Math.hypot(o.pos[0] - cand.x, o.pos[1] - cand.y) < NODE_CLEAR)) continue;
        if (places.some((p) => overlaps(p, cand, 0.1))) continue;
        placed = cand;
        break;
      }
    }
    places.push(placed ?? { x: lx + 9, y: ly, w: PLACE_W, h: PLACE_H, lamp: n.id });
  }
  placeCache.set(puzzle, places);
  return places;
}

// ---- the circuit as streets (ticket 024 A1) ----

export interface CircuitStreets {
  /** One lane per line, then one per decor segment. */
  lanes: Lane[];
  /** One square per node. */
  squares: Building[];
  /** The bounds grown by FOOTPRINT_MARGIN, in map units. */
  footprint: CityRect;
}

const streetCache = new WeakMap<Puzzle, CircuitStreets>();

/** The streets inside a map's footprint: they are the circuit's own lines and nodes. Map units; cached per puzzle. */
export function circuitStreets(puzzle: Puzzle): CircuitStreets {
  const hit = streetCache.get(puzzle);
  if (hit) return hit;
  const b = puzzleBounds(puzzle);
  const pos = new Map<string, readonly [number, number]>();
  for (const n of puzzle.nodes) pos.set(n.id, n.pos);
  const lanes: Lane[] = [];
  for (const l of puzzle.lines) {
    const a = pos.get(l.from);
    const z = pos.get(l.to);
    if (a && z) lanes.push({ ax: a[0], ay: a[1], bx: z[0], by: z[1], w: LANE_W });
  }
  for (const d of puzzle.decor ?? []) {
    for (let i = 0; i + 1 < d.path.length; i++) {
      const a = d.path[i]!;
      const z = d.path[i + 1]!;
      lanes.push({ ax: a[0], ay: a[1], bx: z[0], by: z[1], w: DECOR_LANE_W });
    }
  }
  const squares = puzzle.nodes.map((n): Building => ({ x: n.pos[0], y: n.pos[1], w: NODE_SQUARE, h: NODE_SQUARE }));
  // Grown by the margin, but never out of the map's own district (a few big maps, 29 units wide, would otherwise spill over).
  const o = mapOrigin(puzzle.id, b);
  const c = districtOf(mapNumber(puzzle.id)).centre;
  const half = DISTRICT / 2;
  const footprint: CityRect = {
    minX: Math.max(b.minX - FOOTPRINT_MARGIN, c.x - half - o.x),
    minY: Math.max(b.minY - FOOTPRINT_MARGIN, c.y - half - o.y),
    maxX: Math.min(b.maxX + FOOTPRINT_MARGIN, c.x + half - o.x),
    maxY: Math.min(b.maxY + FOOTPRINT_MARGIN, c.y + half - o.y),
  };
  const out = { lanes, squares, footprint };
  streetCache.set(puzzle, out);
  return out;
}

const feedLaneCache = new WeakMap<Puzzle, { ox: number; oy: number; lanes: Lane[] }>();

/**
 * One lane per feed: from the feed straight out through the footprint edge, away from the map's centre
 * (along the axis it lies furthest on), then on to the nearest shared-grid street line, so the power
 * visibly comes in from the city. Map units. Depends on the origin only through where that street is.
 */
export function feedLanes(puzzle: Puzzle, origin: Vec): Lane[] {
  const hit = feedLaneCache.get(puzzle);
  if (hit && hit.ox === origin.x && hit.oy === origin.y) return hit.lanes;
  const b = puzzleBounds(puzzle);
  const fp = circuitStreets(puzzle).footprint;
  const cx = (b.minX + b.maxX) / 2;
  const cy = (b.minY + b.maxY) / 2;
  const lanes: Lane[] = [];
  for (const n of puzzle.nodes) {
    if (n.type !== "feed") continue;
    const [fx, fy] = n.pos;
    const dx = fx - cx;
    const dy = fy - cy;
    if (Math.abs(dx) >= Math.abs(dy)) {
      const s = dx >= 0 ? 1 : -1;
      const edge = (s > 0 ? fp.maxX : fp.minX) + origin.x;
      const street = (s > 0 ? Math.ceil(edge / CITY_BLOCK) : Math.floor(edge / CITY_BLOCK)) * CITY_BLOCK;
      lanes.push({ ax: fx, ay: fy, bx: street - origin.x, by: fy, w: LANE_W });
    } else {
      const s = dy > 0 ? 1 : -1;
      const edge = (s > 0 ? fp.maxY : fp.minY) + origin.y;
      const street = (s > 0 ? Math.ceil(edge / CITY_BLOCK) : Math.floor(edge / CITY_BLOCK)) * CITY_BLOCK;
      lanes.push({ ax: fx, ay: fy, bx: fx, by: street - origin.y, w: LANE_W });
    }
  }
  feedLaneCache.set(puzzle, { ox: origin.x, oy: origin.y, lanes });
  return lanes;
}

/** Distance from a lane's segment to an axis-aligned box (0 if they touch). */
export function laneBoxDistance(l: Lane, b: Building): number {
  const x0 = b.x - b.w / 2;
  const x1 = b.x + b.w / 2;
  const y0 = b.y - b.h / 2;
  const y1 = b.y + b.h / 2;
  // Liang-Barsky: does the segment cross the box?
  let t0 = 0;
  let t1 = 1;
  const dx = l.bx - l.ax;
  const dy = l.by - l.ay;
  const p = [-dx, dx, -dy, dy];
  const q = [l.ax - x0, x1 - l.ax, l.ay - y0, y1 - l.ay];
  let crosses = true;
  for (let i = 0; i < 4; i++) {
    if (p[i] === 0) {
      if (q[i]! < 0) crosses = false;
    } else {
      const r = q[i]! / p[i]!;
      if (p[i]! < 0) t0 = Math.max(t0, r);
      else t1 = Math.min(t1, r);
    }
  }
  if (crosses && t0 <= t1) return 0;
  let best = Infinity;
  for (const [px, py] of [[l.ax, l.ay], [l.bx, l.by]] as const) {
    best = Math.min(best, Math.hypot(Math.max(x0 - px, 0, px - x1), Math.max(y0 - py, 0, py - y1)));
  }
  const len2 = dx * dx + dy * dy;
  for (const [px, py] of [[x0, y0], [x1, y0], [x0, y1], [x1, y1]] as const) {
    let t = len2 > 0 ? ((px - l.ax) * dx + (py - l.ay) * dy) / len2 : 0;
    t = Math.min(Math.max(t, 0), 1);
    best = Math.min(best, Math.hypot(px - (l.ax + t * dx), py - (l.ay + t * dy)));
  }
  return best;
}

/** True if the box keeps `gap` clear of every lane's edge. */
function clearOfLanes(b: Building, lanes: readonly Lane[], gap: number): boolean {
  for (const l of lanes) {
    const m = l.w / 2 + gap;
    if (Math.max(l.ax, l.bx) + m < b.x - b.w / 2 || Math.min(l.ax, l.bx) - m > b.x + b.w / 2) continue;
    if (Math.max(l.ay, l.by) + m < b.y - b.h / 2 || Math.min(l.ay, l.by) - m > b.y + b.h / 2) continue;
    if (laneBoxDistance(l, b) < m) return false;
  }
  return true;
}

const fineCache = new WeakMap<Puzzle, { ox: number; oy: number; list: Building[] }>();

/** The footprint's buildings (map units), whole footprint, cached: the fine grid kept clear of lanes, node squares and places. */
function footprintBuildings(puzzle: Puzzle, origin: Vec): Building[] {
  const hit = fineCache.get(puzzle);
  if (hit && hit.ox === origin.x && hit.oy === origin.y) return hit.list;
  const { lanes, squares, footprint: fp } = circuitStreets(puzzle);
  const all = lanes.concat(feedLanes(puzzle, origin));
  const places = cityPlaces(puzzle);
  const list: Building[] = [];
  const fx0 = Math.floor((fp.minX + origin.x) / FINE_CELL);
  const fx1 = Math.ceil((fp.maxX + origin.x) / FINE_CELL);
  const fy0 = Math.floor((fp.minY + origin.y) / FINE_CELL);
  const fy1 = Math.ceil((fp.maxY + origin.y) / FINE_CELL);
  for (let fx = fx0; fx < fx1; fx++) {
    for (let fy = fy0; fy < fy1; fy++) {
      const h = mix(mix(CITY_SEED ^ 0x3c6ef372 ^ Math.imul(fx | 0, 0x27d4eb2d)) ^ Math.imul(fy | 0, 0x165667b1));
      if (rnd(h, 0) >= 0.62) continue;
      const w = 0.3 + 0.12 * rnd(h, 1);
      const hh = 0.3 + 0.12 * rnd(h, 2);
      const b: Building = {
        x: (fx + 0.5) * FINE_CELL + ((FINE_CELL - w) / 2) * 0.8 * (rnd(h, 3) * 2 - 1) - origin.x,
        y: (fy + 0.5) * FINE_CELL + ((FINE_CELL - hh) / 2) * 0.8 * (rnd(h, 4) * 2 - 1) - origin.y,
        w,
        h: hh,
      };
      if (b.x - w / 2 < fp.minX || b.x + w / 2 > fp.maxX || b.y - hh / 2 < fp.minY || b.y + hh / 2 > fp.maxY) continue;
      if (!clearOfLanes(b, all, BUILDING_GAP)) continue;
      if (squares.some((s) => overlaps(b, s, BUILDING_GAP))) continue;
      if (places.some((p) => overlaps(b, p, BUILDING_GAP))) continue;
      list.push(b);
    }
  }
  fineCache.set(puzzle, { ox: origin.x, oy: origin.y, list });
  return list;
}

/**
 * The city's buildings for a map window, in MAP units (rect too). Outside the map's footprint these are
 * 023's shared buildings, minus any that touch the footprint, the feed lanes or a place. Inside it they
 * are the fine-grid buildings that clear every lane, node square and place.
 */
export function cityForMap(puzzle: Puzzle, origin: Vec, rect: CityRect): Building[] {
  const raw = cityCells({ minX: rect.minX + origin.x, minY: rect.minY + origin.y, maxX: rect.maxX + origin.x, maxY: rect.maxY + origin.y });
  const places = cityPlaces(puzzle);
  const fp = circuitStreets(puzzle).footprint;
  const feeds = feedLanes(puzzle, origin);
  const out: Building[] = [];
  for (const r of raw) {
    const b: Building = { x: r.x - origin.x, y: r.y - origin.y, w: r.w, h: r.h };
    if (b.x + b.w / 2 > fp.minX && b.x - b.w / 2 < fp.maxX && b.y + b.h / 2 > fp.minY && b.y - b.h / 2 < fp.maxY) continue;
    if (!clearOfLanes(b, feeds, 0)) continue;
    let ok = true;
    for (const p of places) {
      if (overlaps(b, p)) {
        ok = false;
        break;
      }
    }
    if (ok) out.push(b);
  }
  for (const b of footprintBuildings(puzzle, origin)) {
    if (b.x + b.w / 2 >= rect.minX && b.x - b.w / 2 <= rect.maxX && b.y + b.h / 2 >= rect.minY && b.y - b.h / 2 <= rect.maxY) out.push(b);
  }
  return out;
}

// ---- the shared grid's streets and avenues, minus the footprint ----

/**
 * The shared grid's street bands over `vis`, as rects (all CITY units), with the `hole` (the open map's
 * footprint) cut out of them. Pure; the renderer fills these.
 */
export function gridStreetRects(vis: CityRect, hole: CityRect | null): CityRect[] {
  const out: CityRect[] = [];
  const hw = CITY_STREET / 2;
  const kx0 = Math.floor(vis.minX / CITY_BLOCK);
  const kx1 = Math.ceil(vis.maxX / CITY_BLOCK);
  for (let k = kx0; k <= kx1; k++) {
    const x0 = k * CITY_BLOCK - hw;
    const x1 = k * CITY_BLOCK + hw;
    if (hole && x1 > hole.minX && x0 < hole.maxX) {
      if (vis.minY < hole.minY) out.push({ minX: x0, maxX: x1, minY: vis.minY, maxY: Math.min(hole.minY, vis.maxY) });
      if (hole.maxY < vis.maxY) out.push({ minX: x0, maxX: x1, minY: Math.max(hole.maxY, vis.minY), maxY: vis.maxY });
    } else out.push({ minX: x0, maxX: x1, minY: vis.minY, maxY: vis.maxY });
  }
  const ky0 = Math.floor(vis.minY / CITY_BLOCK);
  const ky1 = Math.ceil(vis.maxY / CITY_BLOCK);
  for (let k = ky0; k <= ky1; k++) {
    const y0 = k * CITY_BLOCK - hw;
    const y1 = k * CITY_BLOCK + hw;
    if (hole && y1 > hole.minY && y0 < hole.maxY) {
      if (vis.minX < hole.minX) out.push({ minX: vis.minX, maxX: Math.min(hole.minX, vis.maxX), minY: y0, maxY: y1 });
      if (hole.maxX < vis.maxX) out.push({ minX: Math.max(hole.maxX, vis.minX), maxX: vis.maxX, minY: y0, maxY: y1 });
    } else out.push({ minX: vis.minX, maxX: vis.maxX, minY: y0, maxY: y1 });
  }
  return out;
}

/** Keep the part of a convex polygon with nx*x + ny*y <= c. */
function clipHalf(poly: readonly Vec[], nx: number, ny: number, c: number): Vec[] {
  const out: Vec[] = [];
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i]!;
    const z = poly[(i + 1) % poly.length]!;
    const da = nx * a.x + ny * a.y - c;
    const dz = nx * z.x + ny * z.y - c;
    if (da <= 0) out.push(a);
    if ((da < 0 && dz > 0) || (da > 0 && dz < 0)) {
      const t = da / (da - dz);
      out.push({ x: a.x + (z.x - a.x) * t, y: a.y + (z.y - a.y) * t });
    }
  }
  return out;
}

/**
 * The along-ranges [from, to] of a spoke's avenue, from HUB_R to `aFar`, with the `hole` (CITY units) cut
 * out: the avenue stops at the open map's footprint and picks up again on its far side.
 */
export function avenuePieces(spoke: number, aFar: number, hole: CityRect | null): [number, number][] {
  const a0 = HUB_R;
  if (!hole) return [[a0, aFar]];
  const d = SPOKE_DIRS[((spoke % SPOKES) + SPOKES) % SPOKES]!;
  const hw = CITY_AVENUE / 2;
  let poly: Vec[] = [
    { x: hole.minX, y: hole.minY },
    { x: hole.maxX, y: hole.minY },
    { x: hole.maxX, y: hole.maxY },
    { x: hole.minX, y: hole.maxY },
  ];
  poly = clipHalf(poly, -d[1], d[0], hw);
  poly = clipHalf(poly, d[1], -d[0], hw);
  if (poly.length === 0) return [[a0, aFar]];
  let p0 = Infinity;
  let p1 = -Infinity;
  for (const p of poly) {
    const along = p.x * d[0] + p.y * d[1];
    if (along < p0) p0 = along;
    if (along > p1) p1 = along;
  }
  if (p1 <= a0 || p0 >= aFar) return [[a0, aFar]];
  const out: [number, number][] = [];
  if (p0 > a0) out.push([a0, p0]);
  if (p1 < aFar) out.push([p1, aFar]);
  return out;
}

/** Buildings (map units) within CITY_LINK_R of a lamp link to the nearest lamp (earlier in nodes on a tie). */
export function linkBuildings(buildings: readonly Building[], puzzle: Puzzle): Linked[] {
  const out: Linked[] = [];
  for (const b of buildings) {
    let best: string | null = null;
    let bestD = Infinity;
    for (const n of puzzle.nodes) {
      if (n.type !== "lamp") continue;
      const d = Math.hypot(n.pos[0] - b.x, n.pos[1] - b.y);
      if (d <= CITY_LINK_R && d < bestD) {
        bestD = d;
        best = n.id;
      }
    }
    if (best !== null) out.push({ x: b.x, y: b.y, w: b.w, h: b.h, lamp: best, strength: 0.5 });
  }
  return out;
}

// ---- glow ----

/**
 * 1 if the lamp is lit; 0 if not, and 0 for every lamp in a brownout. During a Relight, 0 until the
 * cascade reaches the lamp (`arriveAt`, seconds), then 1.
 */
export function glowTarget(lampId: string, state: GridState, relight: { t: number; arriveAt: number } | null): 0 | 1 {
  if (state.brownout || !state.lit.has(lampId)) return 0;
  if (relight && relight.t < relight.arriveAt) return 0;
  return 1;
}

/** Ease toward the target, reaching it in GLOW_EASE_SECONDS from the far end; never overshoots. */
export function easeGlow(current: number, target: number, dt: number): number {
  const step = Math.max(dt, 0) / GLOW_EASE_SECONDS;
  if (current < target) return Math.min(target, current + step);
  return Math.max(target, current - step);
}

/** The visible window in map units, from the fit that places the circuit, grown by `margin`. */
export function visibleMapRect(fit: { scale: number; offsetX: number; offsetY: number }, width: number, height: number, margin: number): CityRect {
  return {
    minX: -fit.offsetX / fit.scale - margin,
    minY: -fit.offsetY / fit.scale - margin,
    maxX: (width - fit.offsetX) / fit.scale + margin,
    maxY: (height - fit.offsetY) / fit.scale + margin,
  };
}
