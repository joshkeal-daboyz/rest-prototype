/**
 * The city under the map (tickets 023, 024), as pure data. No DOM, no canvas.
 *
 * One city, a pure function of world position under one fixed seed: space is cut into blocks of
 * CITY_BLOCK units, each block's lots come from hash(CITY_SEED, cellX, cellY) (`blockLots`). Maps are
 * windows onto it: `mapOrigin` says where a map sits (hub and spokes, from the id alone). Inside a map's
 * footprint the streets are the circuit's own lines and the lots are kept clear of every wire and node in
 * SCREEN PIXELS (`footprintLayout`, cached per scale); outside it the shared city carries on as before.
 *
 * Boxes: `Building` and `Place` use x,y as the CENTRE and w,h as the full size.
 */

import { placeBase, placeKind, placeName, type GridNode, type PlaceKind, type Puzzle } from "../core";
import type { GridState } from "../grid";
import { clusterRadius } from "./load";
import { NODE_HIT_RADIUS, puzzleBounds, type Bounds } from "./geometry";
import { LABEL_GAP_PX, lampMarks, type PxRect } from "./places";

export const CITY_SEED = 0x5e57;
export const CITY_BLOCK = 2;
export const DISTRICT = 32;
export const HUB_R = 40;
export const SPOKES = 8;
export const SLOTS_PER_SPOKE = 8;
export const R0 = 64;
export const CITY_AVENUE = 1.2;
export const GLOW_EASE_SECONDS = 0.25;
/** Ticket 024 A1: inside a map's footprint the streets are the circuit itself. */
export const FOOTPRINT_MARGIN = 2;
export const LANE_W = 0.5;
export const DECOR_LANE_W = 0.3;
export const NODE_SQUARE = 0.7;

// ---- ticket 024 A3: a calm town ----
/** Street line widths in CSS px (not scaled with the map). */
export const STREET_PX = 3;
export const AVENUE_PX = 6;
/** Map units from a block's street edge to its lots. */
export const SETBACK = 0.3;
/** Lot sizes (map units): the buildable area is CITY_BLOCK - 2 * SETBACK. */
export const LOT = CITY_BLOCK - 2 * SETBACK;
export const LOT_GAP = 0.2;
export const LOT_HALF = (LOT - LOT_GAP) / 2;
/** A lot or place is dropped if any part comes within this many px of a wire's centreline. */
export const WIRE_CLEAR_PX = 10;
/** Warm glow at most this opaque. */
export const GLOW_MAX = 0.5;
/** Radius in px of a street light's pool. */
export const POOL_PX = 28;
/** Floor for the glow radius of any lit place, px. */
export const GLOW_MIN_PX = 32;
/** Map units kept between a lot or place and the ring road / each other. */
export const RING_GAP = 0.1;
export const PLACE_GAP = 0.05;
/** Scale (px per map unit) used when a caller does not give one. */
export const DEFAULT_SCALE = 50;
/** A place looks for a free slot this many blocks round its lamp. */
export const PLACE_SEARCH_BLOCKS = 2;
/** A street light's hit and overlap box: just the lamp's own node square. */
export const POOL_BOX = NODE_SQUARE;

export interface Building {
  x: number;
  y: number;
  w: number;
  h: number;
}
/** What a lamp lights (ticket 024 A2). A `pool` place is a pool of light on the lamp's lane, with no building. */
export interface Place extends Building {
  lamp: string;
  kind: PlaceKind;
  /** The words beside the place (`placeName`) for a target lamp; null for any other. */
  label: string | null;
  pool: boolean;
  /** The separate boxes of a place made of several (a gate's two posts, a row of homes); x,y,w,h is their bounding box. */
  parts?: Building[];
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

// ---- style (the background town is within contrast 1.6 of the map background; places are brighter, ticket 026) ----
export const CITY_BG = "#0b0f17";
/** Streets are faint lines, a little lighter than the ground (contrast 1.15..1.35). */
export const CITY_STREET_LINE = "#18202e";
export const CITY_AVENUE_COLOUR = "#1a2331";
export const CITY_BUILDING = "#111723";
export const CITY_PLACE_FILL = "#3a4a68";
export const CITY_PLACE_EDGE = "#5a6d90";
export const CITY_WARM = "#ffd37a";
/** Lit tint alpha at full glow. */
export const LIT_FILL_ALPHA = 0.5;

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

// ---- the shared city: blocks and their lots ----

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

const lotCache = new Map<number, readonly Building[]>();
const LOT_CACHE_MAX = 40000;
const CELL_OFFSET = 1 << 20;

/**
 * The lots of one block (city units), from hash(CITY_SEED, cellX, cellY): whole (25 %), halves (30 %),
 * quarters (25 %) or a yard (20 %). Only four sizes, every edge on the setback line or a lot gap.
 */
export function blockLots(cellX: number, cellY: number): Building[] {
  const key = (cellX + CELL_OFFSET) * 2097152 + (cellY + CELL_OFFSET);
  const hit = lotCache.get(key);
  if (hit) return hit as Building[];
  if (lotCache.size > LOT_CACHE_MAX) lotCache.clear();
  const h = mix(mix(CITY_SEED ^ Math.imul(cellX | 0, 0x27d4eb2d)) ^ Math.imul(cellY | 0, 0x165667b1));
  const x0 = cellX * CITY_BLOCK + SETBACK;
  const y0 = cellY * CITY_BLOCK + SETBACK;
  const p = rnd(h, 0);
  const out: Building[] = [];
  if (p < 0.25) {
    out.push({ x: x0 + LOT / 2, y: y0 + LOT / 2, w: LOT, h: LOT });
  } else if (p < 0.55) {
    if (rnd(h, 1) < 0.5) {
      for (let k = 0; k < 2; k++) out.push({ x: x0 + LOT / 2, y: y0 + LOT_HALF / 2 + k * (LOT_HALF + LOT_GAP), w: LOT, h: LOT_HALF });
    } else {
      for (let k = 0; k < 2; k++) out.push({ x: x0 + LOT_HALF / 2 + k * (LOT_HALF + LOT_GAP), y: y0 + LOT / 2, w: LOT_HALF, h: LOT });
    }
  } else if (p < 0.8) {
    for (let i = 0; i < 2; i++)
      for (let j = 0; j < 2; j++)
        out.push({ x: x0 + LOT_HALF / 2 + i * (LOT_HALF + LOT_GAP), y: y0 + LOT_HALF / 2 + j * (LOT_HALF + LOT_GAP), w: LOT_HALF, h: LOT_HALF });
  }
  lotCache.set(key, out);
  return out;
}

/** Every lot of every block the rect touches, in city units, minus any that reach an avenue. Deterministic and map-independent. */
export function cityCells(rect: CityRect): Building[] {
  const out: Building[] = [];
  const x0 = Math.floor(rect.minX / CITY_BLOCK);
  const x1 = Math.floor(rect.maxX / CITY_BLOCK);
  const y0 = Math.floor(rect.minY / CITY_BLOCK);
  const y1 = Math.floor(rect.maxY / CITY_BLOCK);
  for (let cx = x0; cx <= x1; cx++) for (let cy = y0; cy <= y1; cy++) for (const b of blockLots(cx, cy)) if (!touchesAvenue(b)) out.push(b);
  return out;
}

// ---- distances (allocation free) ----

function overlaps(a: Building, b: Building, gap = 0): boolean {
  return Math.abs(a.x - b.x) < (a.w + b.w) / 2 + gap && Math.abs(a.y - b.y) < (a.h + b.h) / 2 + gap;
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
  let crosses = true;
  for (let i = 0; i < 4; i++) {
    const p = i === 0 ? -dx : i === 1 ? dx : i === 2 ? -dy : dy;
    const q = i === 0 ? l.ax - x0 : i === 1 ? x1 - l.ax : i === 2 ? l.ay - y0 : y1 - l.ay;
    if (p === 0) {
      if (q < 0) crosses = false;
    } else {
      const r = q / p;
      if (p < 0) t0 = Math.max(t0, r);
      else t1 = Math.min(t1, r);
    }
  }
  if (crosses && t0 <= t1) return 0;
  let best = Infinity;
  for (let e = 0; e < 2; e++) {
    const px = e === 0 ? l.ax : l.bx;
    const py = e === 0 ? l.ay : l.by;
    best = Math.min(best, Math.hypot(Math.max(x0 - px, 0, px - x1), Math.max(y0 - py, 0, py - y1)));
  }
  const len2 = dx * dx + dy * dy;
  for (let k = 0; k < 4; k++) {
    const px = k & 1 ? x1 : x0;
    const py = k & 2 ? y1 : y0;
    let t = len2 > 0 ? ((px - l.ax) * dx + (py - l.ay) * dy) / len2 : 0;
    t = Math.min(Math.max(t, 0), 1);
    best = Math.min(best, Math.hypot(px - (l.ax + t * dx), py - (l.ay + t * dy)));
  }
  return best;
}

/** Distance from a point to an axis-aligned box (0 inside). */
export function pointBoxDistance(px: number, py: number, b: Building): number {
  return Math.hypot(Math.max(b.x - b.w / 2 - px, 0, px - (b.x + b.w / 2)), Math.max(b.y - b.h / 2 - py, 0, py - (b.y + b.h / 2)));
}

/** How far (CSS px) lots, places and labels stay from a node's centre, so its drawn icon has open ground round it. */
export function nodeClearPx(node: GridNode): number {
  switch (node.type) {
    case "lamp":
      return Math.max(clusterRadius(node.load ?? 1) + 8, NODE_HIT_RADIUS + 2);
    case "feed":
      return 25;
    case "breaker":
    case "switch":
      return 22;
    case "junction":
      return 20;
    case "fusebox":
      return 24;
    case "battery":
      return 36;
  }
}

// ---- the circuit as streets (ticket 024 A1) ----

export interface CircuitStreets {
  /** One lane per line, then one per decor segment. */
  lanes: Lane[];
  /** One square per node. */
  squares: Building[];
  /** The bounds grown by FOOTPRINT_MARGIN, in map units. This edge is the ring road. */
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

const feedLaneCache = new WeakMap<Puzzle, Lane[]>();

/**
 * One lane per feed, from the feed straight out to the ring road (the footprint edge), away from the
 * map's centre (along the axis it lies furthest on). Map units.
 */
export function feedLanes(puzzle: Puzzle): Lane[] {
  const hit = feedLaneCache.get(puzzle);
  if (hit) return hit;
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
    if (Math.abs(dx) >= Math.abs(dy)) lanes.push({ ax: fx, ay: fy, bx: dx >= 0 ? fp.maxX : fp.minX, by: fy, w: LANE_W });
    else lanes.push({ ax: fx, ay: fy, bx: fx, by: dy > 0 ? fp.maxY : fp.minY, w: LANE_W });
  }
  feedLaneCache.set(puzzle, lanes);
  return lanes;
}

// ---- places (ticket 024 A2, lots in A3): what each lamp lights ----

/** How a kind takes a lot: a whole lot, a quarter lot, a row of three quarter lots, or posts beside the wire. */
export type SlotKind = "whole" | "quarter" | "row3" | "gate" | "none";

export function slotKind(lampId: string): SlotKind {
  switch (placeKind(lampId)) {
    case "sacred": {
      const b = placeBase(lampId);
      return b === "bell" || b === "tower" ? "quarter" : "whole";
    }
    case "water":
    case "home":
      return "quarter";
    case "mill":
    case "work":
    case "market":
    case "hall":
      return "whole";
    case "homes":
      return "row3";
    case "gate":
      return "gate";
    case "streetlight":
      return "none";
  }
}

/** Gate posts are 0.25 squares. */
export const GATE_POST = 0.25;

/** Wires (lines, decor, feed lanes) and node centres of a puzzle, in map units. */
interface Obstacle {
  wires: Lane[];
  nodes: { x: number; y: number; clear: number }[];
}
function obstaclesOf(puzzle: Puzzle): Obstacle {
  return {
    wires: circuitStreets(puzzle).lanes.concat(feedLanes(puzzle)),
    nodes: puzzle.nodes.map((n) => ({ x: n.pos[0], y: n.pos[1], clear: nodeClearPx(n) })),
  };
}

/** True if the box keeps WIRE_CLEAR_PX from every wire and nodeClearPx from every node centre at this scale. */
function clearOfCircuit(b: Building, ob: Obstacle, scale: number): boolean {
  const wc = WIRE_CLEAR_PX / scale;
  const x0 = b.x - b.w / 2 - wc;
  const x1 = b.x + b.w / 2 + wc;
  const y0 = b.y - b.h / 2 - wc;
  const y1 = b.y + b.h / 2 + wc;
  for (let i = 0; i < ob.wires.length; i++) {
    const l = ob.wires[i]!;
    if (Math.max(l.ax, l.bx) < x0 || Math.min(l.ax, l.bx) > x1 || Math.max(l.ay, l.by) < y0 || Math.min(l.ay, l.by) > y1) continue;
    if (laneBoxDistance(l, b) < wc - 1e-9) return false;
  }
  for (let i = 0; i < ob.nodes.length; i++) {
    const n = ob.nodes[i]!;
    if (pointBoxDistance(n.x, n.y, b) < n.clear / scale - 1e-9) return false;
  }
  return true;
}

function insideRing(b: Building, fp: CityRect): boolean {
  return b.x - b.w / 2 >= fp.minX + RING_GAP && b.x + b.w / 2 <= fp.maxX - RING_GAP && b.y - b.h / 2 >= fp.minY + RING_GAP && b.y + b.h / 2 <= fp.maxY - RING_GAP;
}

function boundsOf(parts: readonly Building[]): Building {
  let x0 = Infinity;
  let y0 = Infinity;
  let x1 = -Infinity;
  let y1 = -Infinity;
  for (const p of parts) {
    x0 = Math.min(x0, p.x - p.w / 2);
    y0 = Math.min(y0, p.y - p.h / 2);
    x1 = Math.max(x1, p.x + p.w / 2);
    y1 = Math.max(y1, p.y + p.h / 2);
  }
  return { x: (x0 + x1) / 2, y: (y0 + y1) / 2, w: x1 - x0, h: y1 - y0 };
}

/** The boxes a place covers: its parts if it has them, else its own box. */
export function placeParts(p: Place): readonly Building[] {
  return p.parts ?? [p];
}

/** Lot-slot centres along one axis of a block (city units): the whole lot, or the two quarter positions. */
const QUARTER_OFF = [SETBACK + LOT_HALF / 2, SETBACK + LOT_HALF + LOT_GAP + LOT_HALF / 2] as const;

/** Candidate boxes (CITY units) for a lamp's slot kind in the blocks round (lampX, lampY); each is a list of parts. */
function slotCandidates(kind: SlotKind, lampX: number, lampY: number): Building[][] {
  const out: Building[][] = [];
  const r = PLACE_SEARCH_BLOCKS;
  const c0x = Math.floor(lampX / CITY_BLOCK);
  const c0y = Math.floor(lampY / CITY_BLOCK);
  const quarter = (x: number, y: number): Building => ({ x, y, w: LOT_HALF, h: LOT_HALF });
  for (let cx = c0x - r; cx <= c0x + r; cx++) {
    for (let cy = c0y - r; cy <= c0y + r; cy++) {
      const bx = cx * CITY_BLOCK;
      const by = cy * CITY_BLOCK;
      if (kind === "whole") out.push([{ x: bx + CITY_BLOCK / 2, y: by + CITY_BLOCK / 2, w: LOT, h: LOT }]);
      else if (kind === "quarter") {
        for (const ox of QUARTER_OFF) for (const oy of QUARTER_OFF) out.push([quarter(bx + ox, by + oy)]);
      } else if (kind === "row3") {
        // Three quarter lots in a row (or a column): this block's two, then the next block's first.
        for (const oy of QUARTER_OFF) {
          out.push([quarter(bx + QUARTER_OFF[0], by + oy), quarter(bx + QUARTER_OFF[1], by + oy), quarter(bx + CITY_BLOCK + QUARTER_OFF[0], by + oy)]);
          out.push([quarter(bx - CITY_BLOCK + QUARTER_OFF[1], by + oy), quarter(bx + QUARTER_OFF[0], by + oy), quarter(bx + QUARTER_OFF[1], by + oy)]);
        }
        for (const ox of QUARTER_OFF) {
          out.push([quarter(bx + ox, by + QUARTER_OFF[0]), quarter(bx + ox, by + QUARTER_OFF[1]), quarter(bx + ox, by + CITY_BLOCK + QUARTER_OFF[0])]);
          out.push([quarter(bx + ox, by - CITY_BLOCK + QUARTER_OFF[1]), quarter(bx + ox, by + QUARTER_OFF[0]), quarter(bx + ox, by + QUARTER_OFF[1])]);
        }
      }
    }
  }
  return out;
}

/** Free placement (ticket 026): a place's box is tried at every offset on this grid (map units) round its lamp, within FREE_RANGE. */
export const FREE_STEP = 0.1;
export const FREE_RANGE = 3;

interface FreeCand {
  dx: number;
  dy: number;
  /** row3 only: 0 along x, 1 along y. */
  vert: number;
  d: number;
}

/** The parts of a free candidate whose box centre is (cx, cy). */
function freeParts(kind: SlotKind, cx: number, cy: number, vert: number): Building[] {
  if (kind === "whole") return [{ x: cx, y: cy, w: LOT, h: LOT }];
  if (kind === "quarter") return [{ x: cx, y: cy, w: LOT_HALF, h: LOT_HALF }];
  const step = LOT_HALF + LOT_GAP;
  const out: Building[] = [];
  for (let k = -1; k <= 1; k++) out.push({ x: vert ? cx : cx + k * step, y: vert ? cy + k * step : cy, w: LOT_HALF, h: LOT_HALF });
  return out;
}

/** Edge distance from a point to the nearest part of a free candidate (no allocation). */
function freeDistance(kind: SlotKind, px: number, py: number, cx: number, cy: number, vert: number, scratch: Building): number {
  if (kind !== "row3") {
    const s = kind === "whole" ? LOT : LOT_HALF;
    scratch.x = cx;
    scratch.y = cy;
    scratch.w = s;
    scratch.h = s;
    return pointBoxDistance(px, py, scratch);
  }
  const step = LOT_HALF + LOT_GAP;
  let best = Infinity;
  scratch.w = LOT_HALF;
  scratch.h = LOT_HALF;
  for (let k = -1; k <= 1; k++) {
    scratch.x = vert ? cx : cx + k * step;
    scratch.y = vert ? cy + k * step : cy;
    best = Math.min(best, pointBoxDistance(px, py, scratch));
  }
  return best;
}

/** Every free candidate round a lamp (map units, lamp-relative), nearest edge first; ties by dy then dx. */
function freeCandidates(kind: SlotKind, lx: number, ly: number): FreeCand[] {
  const out: FreeCand[] = [];
  const n = Math.round(FREE_RANGE / FREE_STEP);
  const scratch: Building = { x: 0, y: 0, w: 0, h: 0 };
  for (let vert = 0; vert < (kind === "row3" ? 2 : 1); vert++) {
    for (let j = -n; j <= n; j++) {
      for (let i = -n; i <= n; i++) {
        const dx = i * FREE_STEP;
        const dy = j * FREE_STEP;
        out.push({ dx, dy, vert, d: freeDistance(kind, lx, ly, lx + dx, ly + dy, vert, scratch) });
      }
    }
  }
  out.sort((a, b) => a.d - b.d || a.dy - b.dy || a.dx - b.dx || a.vert - b.vert);
  return out;
}

/** Smallest edge distance from a point to any of the parts. */
function partsDistance(px: number, py: number, parts: readonly Building[]): number {
  let best = Infinity;
  for (const q of parts) best = Math.min(best, pointBoxDistance(px, py, q));
  return best;
}

interface Layout {
  buildings: Building[];
  places: Place[];
  /** Every wire: circuit lines, decor, feed lanes (map units). */
  streets: Lane[];
}

const layoutCache = new WeakMap<Puzzle, { scale: number; ox: number; oy: number; value: Layout }>();

/**
 * Everything the footprint holds, in map units, with clearances measured in px at `scale`: one place per
 * lamp (in `nodes` order, each in a free lot slot of its kind's size, or a pool), and the lots of the
 * blocks the footprint covers that clear every wire, node and place. Cached per puzzle and scale.
 */
export function footprintLayout(puzzle: Puzzle, origin: Vec, scale: number): Layout {
  const hit = layoutCache.get(puzzle);
  if (hit && hit.scale === scale && hit.ox === origin.x && hit.oy === origin.y) return hit.value;
  const cs = circuitStreets(puzzle);
  const fp = cs.footprint;
  const ob = obstaclesOf(puzzle);
  const pos = new Map<string, GridNode>();
  for (const n of puzzle.nodes) pos.set(n.id, n);
  const allTargets = !puzzle.target || puzzle.target.length === 0;
  const targets = new Set(puzzle.target ?? []);
  const wc = WIRE_CLEAR_PX / scale;
  const places: Place[] = [];
  const taken: Building[] = [];

  // Every lamp's caption and star, as map-unit boxes (centre form), kept LABEL_GAP_PX clear of a place.
  const marks: Building[] = [];
  const lamps: GridNode[] = [];
  for (const n of puzzle.nodes) {
    if (n.type !== "lamp") continue;
    lamps.push(n);
    for (const m of lampMarks(n, n.pos[0] * scale, n.pos[1] * scale)) {
      marks.push({ x: (m.x + m.w / 2) / scale, y: (m.y + m.h / 2) / scale, w: m.w / scale, h: m.h / scale });
    }
  }
  const markGap = LABEL_GAP_PX / scale + 1e-6;

  const fits = (parts: readonly Building[]): boolean => {
    for (const q of parts) {
      if (!insideRing(q, fp)) return false;
      if (!clearOfCircuit(q, ob, scale)) return false;
      for (const t of taken) if (overlaps(q, t, PLACE_GAP)) return false;
      for (const m of marks) if (overlaps(q, m, markGap)) return false;
    }
    return true;
  };
  /** True if some other lamp's centre is nearer (edge distance) to the parts than the lamp's own. */
  const nearerElsewhere = (n: GridNode, parts: readonly Building[]): boolean => {
    const own = partsDistance(n.pos[0], n.pos[1], parts);
    for (const o of lamps) if (o !== n && partsDistance(o.pos[0], o.pos[1], parts) < own - 1e-9) return true;
    return false;
  };

  for (const n of puzzle.nodes) {
    if (n.type !== "lamp") continue;
    const kind = placeKind(n.id);
    const label = allTargets || targets.has(n.id) ? placeName(n.id) : null;
    const slot = slotKind(n.id);
    let parts: Building[] | null = null;
    if (slot === "gate") {
      const wire = puzzle.lines.find((l) => l.from === n.id || l.to === n.id);
      const other = wire ? pos.get(wire.from === n.id ? wire.to : wire.from) : undefined;
      if (other) {
        const dx = other.pos[0] - n.pos[0];
        const dy = other.pos[1] - n.pos[1];
        const len = Math.hypot(dx, dy) || 1;
        const ux = dx / len;
        const uy = dy / len;
        const d = wc + GATE_POST * Math.SQRT1_2;
        for (let s = nodeClearPx(n) / scale + GATE_POST; s < len; s += 0.1) {
          const cand: Building[] = [-1, 1].map((side) => ({
            x: n.pos[0] + ux * s - uy * d * side,
            y: n.pos[1] + uy * s + ux * d * side,
            w: GATE_POST,
            h: GATE_POST,
          }));
          if (fits(cand)) {
            parts = cand;
            break;
          }
        }
      }
    } else if (slot !== "none") {
      const lx = n.pos[0] + origin.x;
      const ly = n.pos[1] + origin.y;
      const free = freeCandidates(slot, n.pos[0], n.pos[1]);
      // The lot slots of 024 A3 are the fallback, nearest centre first.
      const lots = slotCandidates(slot, lx, ly)
        .map((ps) => {
          const b = boundsOf(ps);
          return { ps, d: Math.hypot(b.x - lx, b.y - ly) };
        })
        .sort((a, b) => a.d - b.d);
      // Pass 0 keeps only candidates nearer this lamp than any other; pass 1 takes whatever fits.
      for (let pass = 0; pass < 2 && !parts; pass++) {
        for (const f of free) {
          const cand = freeParts(slot, n.pos[0] + f.dx, n.pos[1] + f.dy, f.vert);
          if (pass === 0 && nearerElsewhere(n, cand)) continue;
          if (fits(cand)) {
            parts = cand;
            break;
          }
        }
        if (parts) break;
        for (const { ps } of lots) {
          const mapParts = ps.map((q) => ({ x: q.x - origin.x, y: q.y - origin.y, w: q.w, h: q.h }));
          if (pass === 0 && nearerElsewhere(n, mapParts)) continue;
          if (fits(mapParts)) {
            parts = mapParts;
            break;
          }
        }
      }
    }
    if (parts) {
      for (const q of parts) taken.push(q);
      const box = boundsOf(parts);
      const place: Place = { ...box, lamp: n.id, kind, label, pool: false };
      if (parts.length > 1) place.parts = parts;
      places.push(place);
    } else {
      places.push({ x: n.pos[0], y: n.pos[1], w: POOL_BOX, h: POOL_BOX, lamp: n.id, kind, label, pool: true });
    }
  }

  // The lots of every block the footprint covers.
  const buildings: Building[] = [];
  const cx0 = Math.floor((fp.minX + origin.x) / CITY_BLOCK);
  const cx1 = Math.floor((fp.maxX + origin.x) / CITY_BLOCK);
  const cy0 = Math.floor((fp.minY + origin.y) / CITY_BLOCK);
  const cy1 = Math.floor((fp.maxY + origin.y) / CITY_BLOCK);
  for (let cx = cx0; cx <= cx1; cx++) {
    for (let cy = cy0; cy <= cy1; cy++) {
      for (const lot of blockLots(cx, cy)) {
        const b: Building = { x: lot.x - origin.x, y: lot.y - origin.y, w: lot.w, h: lot.h };
        if (!insideRing(b, fp)) continue;
        if (!clearOfCircuit(b, ob, scale)) continue;
        if (taken.some((t) => overlaps(b, t, RING_GAP))) continue;
        buildings.push(b);
      }
    }
  }
  const value: Layout = { buildings, places, streets: ob.wires };
  layoutCache.set(puzzle, { scale, ox: origin.x, oy: origin.y, value });
  return value;
}

/** The places of a puzzle at a scale (default DEFAULT_SCALE), one per lamp in `nodes` order. */
export function cityPlaces(puzzle: Puzzle, scale: number = DEFAULT_SCALE): Place[] {
  return footprintLayout(puzzle, mapOrigin(puzzle.id, puzzleBounds(puzzle)), scale).places;
}

/**
 * The city's lots for a map window, in MAP units (rect too). Outside the map's footprint these are the
 * shared city's lots, minus any that touch the ring road or come within WIRE_CLEAR_PX of a feed lane. Inside it they are `footprintLayout`'s lots.
 */
export function cityForMap(puzzle: Puzzle, origin: Vec, rect: CityRect, scale: number = DEFAULT_SCALE): Building[] {
  const raw = cityCells({ minX: rect.minX + origin.x, minY: rect.minY + origin.y, maxX: rect.maxX + origin.x, maxY: rect.maxY + origin.y });
  const fp = circuitStreets(puzzle).footprint;
  const feeds = feedLanes(puzzle);
  const wc = WIRE_CLEAR_PX / scale;
  const out: Building[] = [];
  for (const r of raw) {
    const b: Building = { x: r.x - origin.x, y: r.y - origin.y, w: r.w, h: r.h };
    if (b.x + b.w / 2 > fp.minX - RING_GAP && b.x - b.w / 2 < fp.maxX + RING_GAP && b.y + b.h / 2 > fp.minY - RING_GAP && b.y - b.h / 2 < fp.maxY + RING_GAP) continue;
    // A feed lane ends on the ring: a lot just outside keeps its distance from it too.
    if (b.x + b.w / 2 > fp.minX - wc && b.x - b.w / 2 < fp.maxX + wc && b.y + b.h / 2 > fp.minY - wc && b.y - b.h / 2 < fp.maxY + wc && feeds.some((l) => laneBoxDistance(l, b) < wc - 1e-9)) continue;
    out.push(b);
  }
  for (const b of footprintLayout(puzzle, origin, scale).buildings) {
    if (b.x + b.w / 2 >= rect.minX && b.x - b.w / 2 <= rect.maxX && b.y + b.h / 2 >= rect.minY && b.y - b.h / 2 <= rect.maxY) out.push(b);
  }
  return out;
}

// ---- the shared grid's streets and avenues, minus the footprint ----

/** A street segment, in whichever units its caller uses. */
export interface Seg {
  ax: number;
  ay: number;
  bx: number;
  by: number;
}

/**
 * The shared grid's street centrelines over `vis` (all CITY units): one vertical and one horizontal line
 * on every cell edge, with the `hole` (the open map's footprint) cut out of them, so each street stops on
 * the ring road.
 */
export function gridStreetLines(vis: CityRect, hole: CityRect | null): Seg[] {
  const out: Seg[] = [];
  const kx0 = Math.floor(vis.minX / CITY_BLOCK);
  const kx1 = Math.ceil(vis.maxX / CITY_BLOCK);
  for (let k = kx0; k <= kx1; k++) {
    const x = k * CITY_BLOCK;
    if (hole && x > hole.minX && x < hole.maxX) {
      if (vis.minY < hole.minY) out.push({ ax: x, ay: vis.minY, bx: x, by: Math.min(hole.minY, vis.maxY) });
      if (hole.maxY < vis.maxY) out.push({ ax: x, ay: Math.max(hole.maxY, vis.minY), bx: x, by: vis.maxY });
    } else out.push({ ax: x, ay: vis.minY, bx: x, by: vis.maxY });
  }
  const ky0 = Math.floor(vis.minY / CITY_BLOCK);
  const ky1 = Math.ceil(vis.maxY / CITY_BLOCK);
  for (let k = ky0; k <= ky1; k++) {
    const y = k * CITY_BLOCK;
    if (hole && y > hole.minY && y < hole.maxY) {
      if (vis.minX < hole.minX) out.push({ ax: vis.minX, ay: y, bx: Math.min(hole.minX, vis.maxX), by: y });
      if (hole.maxX < vis.maxX) out.push({ ax: Math.max(hole.maxX, vis.minX), ay: y, bx: vis.maxX, by: y });
    } else out.push({ ax: vis.minX, ay: y, bx: vis.maxX, by: y });
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

/** Side of the pre-rendered glow sprite, px. */
export const GLOW_SPRITE_PX = 128;

/** The glow's alpha at radius fraction r (0 centre, 1 edge): (1 - r)^2, 0 from the edge outward. */
export function glowFalloff(r: number): number {
  if (r >= 1) return 0;
  const k = 1 - Math.max(r, 0);
  return k * k;
}

/** RGBA pixels of the round glow sprite in CITY_WARM: alpha is `glowFalloff` of the distance from the centre. */
export function glowSpriteData(size: number = GLOW_SPRITE_PX): Uint8ClampedArray {
  const out = new Uint8ClampedArray(size * size * 4);
  const rgb = parseInt(CITY_WARM.slice(1), 16);
  const half = size / 2;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const r = Math.hypot(x + 0.5 - half, y + 0.5 - half) / half;
      const o = (y * size + x) * 4;
      out[o] = (rgb >> 16) & 255;
      out[o + 1] = (rgb >> 8) & 255;
      out[o + 2] = rgb & 255;
      out[o + 3] = Math.round(255 * glowFalloff(r));
    }
  }
  return out;
}

/** Radius in px of a lit place's glow sprite. */
export function glowRadiusPx(halfDiagonalPx: number): number {
  return Math.max(halfDiagonalPx * 2.2, GLOW_MIN_PX);
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
