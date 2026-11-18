/**
 * Ticket 051 C: the packer that turns a terrace run into exact blocks. Pure: no three, no DOM, no fetch. Section B laid each outer-block row as a run of
 * nominal lots (2 to 4 bays of TERRACE_BAY_M); here those lots are re-cut into City Pack stacks from the pieces' true widths (the manifest entries the caller
 * passes; fixture numbers in tests), so that neighbours touch, no model is scaled, and the run's far end is closed to a seam or an alley, never a slit.
 *
 * What is decided, and where:
 * - Which blocks: apartment styles only (a style whose `depth` is "bay"; an office is one footprint column and is left to the tall lots), 2 to 4 columns
 *   each, one style per block. The first block is a corner block exactly when the run starts at a corner (`run.startCorner`), with its corner column on that
 *   side; no other block is a corner block (Josh, 17 Nov 2026: corner buildings only on corners). Its style is `cornerStyle(run)` (from the run's id alone) unless
 *   another closes the row better; the row before it needs only its depth (`farWall_m`), which is the same for every style to within 0.03 m.
 * - The widths: a block is as wide as its columns (`Stack.width_m`: the floor pieces' true widths, the corner column's corner piece). Blocks are laid flush from the
 *   run's start along its direction. N unscaled columns span only 5.0 x N to about 5.28 x N metres, so most row lengths fall in a dead band that no choice can close.
 * - The far end, in this order (ticket 051 Q7): (1) a choice of bays and styles that leaves a gap of at most `TERRACE_SEAM_M`; else (2) one that leaves an alley, from
 *   `ALLEY_MIN_M` to `ALLEY_MAX_M` (052 C dresses it with a gate or bins); else (3) the smallest gap above `ALLEY_MAX_M` (within `TERRACE_SLACK_M` of it, the first in the
 *   preference order below); only if no choice leaves a gap above that, the smallest slit. Never a 0.3 to 0.5 m slit by choice. The gap is never negative.
 *   It is measured from the last block's pieces (a roof or a shop wider than its column overhangs it) to the far wall.
 * - The far wall: where the run ends at the next row's corner block, its real back wall (the run's length plus the 6 m band less that block's depth, `farWall_m`);
 *   otherwise the plaza's edge, or the last nominal lot's edge (a parking lot or a clearance end: the ground beyond it is not cleared). The 051 B strip between the last
 *   nominal lot and the band is what a corner or plaza end runs on into. Every block has the depth and front line of its run's nominal lots.
 * - Heights: a block's cap is the lowest cap of the nominal lots it overlaps. Its floors over the base are picked by hash inside `stackRange` for that cap (2 to 4 on
 *   a 16 m cap, so 3 to 5 storeys with the base), never the same as the block before it where the cap allows a choice, and apart from the one before that where it can.
 * - Variety: neighbours never share a style. Among the choices that land in the same tier, the one whose styles are least used so far in the run comes first, then a hash
 *   of the run id. The street-repeat rule (`STREET_REPEAT_GAP`) is vacuous for three styles (it applies to types with more families than that); and `FAMILY_SHARE_MAX` is
 *   not what bounds the terrace: the ticket's bound is that each apartment style is 20% to 50% of the ladder's terrace blocks, tested in `terracepack.test.ts`.
 *
 * The result is deterministic per run id and the styles, entries and fronts passed.
 */

import type { AssetEntry, CalibrationKey } from "../core";
import { stableHash } from "../render/city";
import { BUILDING_FRONTS, type FrontTable } from "./models";
import { assembleStack, stackDepth, stackRange, type Stack, type StackSide, type StackStyle } from "./stacks";
import { TERRACE_BAYS, TERRACE_DEPTH_M, WORLD_PER_METRE, type Lot, type LotSpec, type TerraceRun } from "./town";

/** The most a run's far end may be left short of its far wall, metres, to count as closed. */
export const TERRACE_SEAM_M = 0.1;

/** When no sequence closes a run to the seam or an alley, how much more than the least possible may be left, metres, to keep the styles varied. */
export const TERRACE_SLACK_M = 0.15;

/** The alley a far gap aims for when the pieces cannot close it to the seam, metres: wide enough to read as a way between blocks, never a slit. */
export const ALLEY_MIN_M = 1.0;
export const ALLEY_MAX_M = 1.5;

/** The search stops after this many states in a pass: a run longer than the ladder's gives what it has found. Deterministic (a count, not a clock). */
const SEARCH_NODES = 60000;
const EPS = 1e-9;
/** How many keys a block's end overhang is probed over (a shop is picked per column by hash of the key). */
const PROBE_KEYS = 8;

type Entries = ReadonlyMap<CalibrationKey, AssetEntry>;

export interface PackedBlock {
  /** The block's own lot: centre, width (its columns' total, world units), the run's depth and yaw, the cap it stands under, `terrace.index` its place in the run. */
  lot: Lot;
  style: string;
  /** Columns across. */
  bays: number;
  /** Floors over the base (so storeys are floors + 1). */
  floors: number;
  /** The run's first block when the run starts at a corner: its corner column is on `lot.cornerSides[0].side`. */
  corner: boolean;
  /** The assembled stack, in the lot frame (origin at the lot's front-centre, as `assembleStack` makes it). */
  stack: Stack;
}

export interface PackResult {
  blocks: PackedBlock[];
  /**
   * Metres between the last block's pieces and the far wall (the whole run's length when no block stands). Never negative. Measured to `opts.farWall_m` when
   * given, else to the run's length (the 6 m band line) for a corner end.
   */
  farGap_m: number;
  /** How far the last block's pieces overhang its columns at the far end, metres (0 with no block). The columns end `farGap_m + farOverhang_m` short of the wall. */
  farOverhang_m: number;
  /** Blocks planned from the probe widths that were dropped because the assembled stacks did not fit (a style whose pieces differ in width). 0 today. */
  dropped: number;
}

export interface PackOptions {
  /** The far wall's distance from the run's start, metres (see `farWall_m`). Default: the run's length for a corner end. */
  farWall_m?: number | undefined;
}

interface Opt {
  style: StackStyle;
  bays: number;
  /** Metres: the block's width, and how far its pieces overhang its columns at the run's far end. */
  w: number;
  ov: number;
}

interface Probe {
  w: number;
  plus: number;
  minus: number;
}

const probeCache = new WeakMap<Entries, WeakMap<FrontTable, Map<string, Probe | null>>>();

/** Cap in metres, rounded so a world-unit cap compares equal to the metre tier it came from. */
const capM = (hMax: number): number => Math.round((hMax / WORLD_PER_METRE) * 1e6) / 1e6;

const specFor = (cap: number, frontage: number): LotSpec => ({ frontage, depth: TERRACE_DEPTH_M, cap });

/** How far a stack's pieces reach past its columns on a side, metres (columns are centred, so they end at +-width/2). */
function overhang(stack: Stack, side: StackSide): number {
  let m = 0;
  for (const p of stack.pieces) m = Math.max(m, side === "+x" ? p.x + p.w / 2 - stack.width_m / 2 : -(p.x - p.w / 2) - stack.width_m / 2);
  return m;
}

/** The styles a terrace can stand: apartment styles (one bay deep). */
const bayStyles = (styles: readonly StackStyle[]): StackStyle[] => styles.filter((s) => s.depth === "bay");

/**
 * The preferred style of a run's corner block, from the run's id alone, among the apartment styles that have corner pieces in every role; null when there is none.
 * `packTerrace` tries it first and takes another only when that one cannot close the row to a seam or an alley (the corner styles' depths differ by 0.03 m, so the row
 * before does not need to know which: `farWall_m` uses the deepest).
 */
export function cornerStyle(run: Pick<TerraceRun, "id">, styles: readonly StackStyle[]): StackStyle | null {
  const ok = bayStyles(styles).filter((s) => s.base.corner.length > 0 && s.floor.corner.length > 0 && s.roof.corner.length > 0);
  return ok.length === 0 ? null : ok[stableHash(`${run.id}:corner-style`) % ok.length]!;
}

/**
 * Where a run's far wall is, metres from its start, or undefined when it is the run's length. At a corner end the wall is the next row's corner block's real back wall: the
 * block fronts its own street and is only as deep as its pieces (`stackDepth`, about 5.9 m), not the 6 m band the run was cut to. `next` is the run that starts the next row
 * of the block (it must start at a corner to have a corner block); the result feeds `packTerrace`'s `opts.farWall_m`.
 */
export function farWall_m(run: TerraceRun, next: TerraceRun | undefined, styles: readonly StackStyle[], entries: Entries, fronts: FrontTable = BUILDING_FRONTS): number | undefined {
  if (run.endAbuts !== "corner" || !next || next.startCorner === null) return undefined;
  // The deepest any style that can stand at a corner reaches (5.918, 5.886 and 5.886 m with the City Pack's three: the shops are shared, so they differ by 0.03 m): the wall
  // is then the same whichever style the next run's corner block takes, and the block never reaches past it.
  let depth = -Infinity;
  for (const style of bayStyles(styles)) {
    if (style.base.corner.length === 0 || style.floor.corner.length === 0 || style.roof.corner.length === 0) continue;
    const d = stackDepth(style, entries, fronts);
    if (d !== null) depth = Math.max(depth, d);
  }
  return Number.isFinite(depth) ? run.len / WORLD_PER_METRE + Math.max(0, TERRACE_DEPTH_M - depth) : undefined;
}

/**
 * One run of a terrace as blocks. `nominal` are the run's lots in order (`run.lots.map((i) => town.lots[i])`); `styles` the stack styles on offer (the apartment
 * ones are used); `entries` and `fronts` as for `assembleStack`. Returns no block (and the run's whole length as the gap) when nothing can stand: no usable style,
 * no corner piece for a corner start, or a run shorter than one block.
 */
export function packTerrace(run: TerraceRun, nominal: readonly Lot[], styles: readonly StackStyle[], entries: Entries, fronts: FrontTable = BUILDING_FRONTS, opts: PackOptions = {}): PackResult {
  const W = WORLD_PER_METRE;
  const first = nominal[0];
  const len = run.len / W;
  const nomEnd = nominal.reduce((sum, l) => sum + l.w, 0) / W;
  const toEnd = run.endAbuts === "corner" ? Math.max(len, nomEnd, opts.farWall_m ?? 0) : run.endAbuts === "plaza" ? Math.max(len, nomEnd) : Math.min(len, nomEnd);
  const avail = toEnd;
  const empty: PackResult = { blocks: [], farGap_m: Math.max(0, avail), farOverhang_m: 0, dropped: 0 };
  if (!first) return empty;

  // The nominal lots' ends along the run, metres: the cap at a place is the lowest cap of the lots it overlaps (the last lot's cap past its end).
  const bounds: { a: number; b: number; cap: number }[] = [];
  let at = 0;
  for (const l of nominal) {
    bounds.push({ a: at, b: at + l.w / W, cap: capM(l.hMax) });
    at += l.w / W;
  }
  const capAt = (s0: number, s1: number): number => {
    let cap = Infinity;
    for (const b of bounds) if (b.b > s0 + 1e-6 && b.a < s1 - 1e-6) cap = Math.min(cap, b.cap);
    return Number.isFinite(cap) ? cap : bounds[bounds.length - 1]!.cap;
  };

  const apartments = bayStyles(styles);
  const cornerSide: StackSide | null = run.startCorner ? run.startCorner.side : null;
  const cornerSides = run.startCorner ? [run.startCorner] : [];
  // The lot's +x is toward the run's start when its direction dot the run's is negative; the far end is the other side.
  const toStart: StackSide = Math.cos(first.yaw) * run.ux - Math.sin(first.yaw) * run.uz < 0 ? "+x" : "-x";
  const farSide: StackSide = toStart === "+x" ? "-x" : "+x";

  // Block widths and overhangs from the real pieces: probe stacks per style, column count and corner side. The width is the first probe's (the lot's key does not change
  // it with one floor piece per role); the overhang is the most over the probe keys, since a shop is picked per column by hash.
  const byFronts = probeCache.get(entries) ?? new WeakMap<FrontTable, Map<string, Probe | null>>();
  probeCache.set(entries, byFronts);
  const cache = byFronts.get(fronts) ?? new Map<string, Probe | null>();
  byFronts.set(fronts, cache);
  const probeOf = (style: StackStyle, bays: number, side: StackSide | null): Probe | null => {
    const id = `${style.id}|${bays}|${side ?? "-"}`;
    if (cache.has(id)) return cache.get(id)!;
    let out: Probe | null = null;
    for (let k = 0; k < PROBE_KEYS; k++) {
      const stack = assembleStack(style, { type: "large", key: `probe${k}`, cornerSides: side ? [{ side, road: "probe" }] : [] }, entries, fronts, { spec: specFor(16, 40), bays });
      if (!stack) {
        out = null;
        break;
      }
      const plus = overhang(stack, "+x");
      const minus = overhang(stack, "-x");
      out = out ? { w: out.w, plus: Math.max(out.plus, plus), minus: Math.max(out.minus, minus) } : { w: stack.width_m, plus, minus };
    }
    cache.set(id, out);
    return out;
  };
  const optsFor = (list: readonly StackStyle[], side: StackSide | null): Opt[] => {
    const out: Opt[] = [];
    for (const style of list) {
      for (let bays = TERRACE_BAYS.min; bays <= TERRACE_BAYS.max; bays++) {
        const p = probeOf(style, bays, side);
        if (p && p.w > 0) out.push({ style, bays, w: p.w, ov: farSide === "+x" ? p.plus : p.minus });
      }
    }
    return out;
  };
  const cornerOf = cornerSide ? cornerStyle(run, styles) : null;
  const midOpts = optsFor(apartments, null);
  const cornerOpts = cornerSide ? optsFor(apartments, cornerSide) : [];
  if (midOpts.length === 0 || (cornerSide && cornerOpts.length === 0)) return empty;
  const minNeed = Math.min(...midOpts.map((o) => o.w + o.ov));

  // The floors a style can have under a cap (inside the type's minimum).
  const ranges = new Map<string, { min: number; max: number } | null>();
  const rangeOf = (style: StackStyle, cap: number): { min: number; max: number } | null => {
    const id = `${style.id}|${cap}`;
    if (ranges.has(id)) return ranges.get(id)!;
    const r = stackRange(style, "large", entries, fronts, specFor(cap, 40));
    const out = r ? { min: r.min, max: r.max } : null;
    ranges.set(id, out);
    return out;
  };

  // ---- the search: a sequence of blocks whose far gap (to the far wall, from the last block's pieces) a pass accepts ----
  const used = new Map<string, number>();
  const seq: Opt[] = [];
  let nodes = 0;
  let failed = new Set<string>();
  /** The smallest gap seen above ALLEY_MAX_M, and the smallest gap of any size, over the terminals of the last pass. */
  let leastBig = Infinity;
  let leastAny = Infinity;

  /** The first sequence in preference order (least-used style first, hash for the rest) whose far gap `accept` takes. */
  const search = (s: number, accept: (gap: number) => boolean): boolean => {
    const i = seq.length;
    const room = avail - s;
    if (i > 0) {
      const gap = room - seq[i - 1]!.ov;
      leastAny = Math.min(leastAny, gap);
      if (gap > ALLEY_MAX_M + EPS) leastBig = Math.min(leastBig, gap);
      if (accept(gap)) return true;
    }
    if (room < minNeed - EPS || ++nodes > SEARCH_NODES) return false;
    const last = i > 0 ? seq[i - 1]!.style.id : "";
    const memo = `${Math.round(room * 1000)}|${last}`;
    if (i > 0 && failed.has(memo)) return false;
    const before2 = i > 1 ? seq[i - 2]! : null;
    const pool = (i === 0 && cornerSide ? cornerOpts : midOpts).filter((o) => o.style.id !== last && o.w + o.ov <= room + EPS && rangeOf(o.style, capAt(s, s + o.w)) !== null);
    const score = (o: Opt): number =>
      (used.get(o.style.id) ?? 0) * 1000 + (before2 && before2.style.id === o.style.id ? 500 : 0) + (i > 0 && seq[i - 1]!.bays === o.bays ? 60 : 0) + (i === 0 && cornerOf && o.style.id !== cornerOf.id ? 100 : 0) + (stableHash(`${run.id}:${i}:${o.style.id}:${o.bays}`) % 50);
    const order = pool.map((o) => ({ o, k: score(o) })).sort((a, b) => a.k - b.k || (a.o.style.id < b.o.style.id ? -1 : a.o.style.id > b.o.style.id ? 1 : a.o.bays - b.o.bays));
    for (const { o } of order) {
      seq.push(o);
      used.set(o.style.id, (used.get(o.style.id) ?? 0) + 1);
      if (search(s + o.w, accept)) return true;
      used.set(o.style.id, used.get(o.style.id)! - 1);
      seq.pop();
    }
    failed.add(memo);
    return false;
  };
  const pass = (accept: (gap: number) => boolean): Opt[] | null => {
    seq.length = 0;
    used.clear();
    failed = new Set();
    nodes = 0;
    return search(0, accept) ? seq.slice() : null;
  };
  const inSeam = (g: number): boolean => g <= TERRACE_SEAM_M + EPS;
  const inAlley = (g: number): boolean => g >= ALLEY_MIN_M - EPS && g <= ALLEY_MAX_M + EPS;
  let plan = pass(inSeam) ?? pass(inAlley);
  if (!plan && Number.isFinite(leastBig)) {
    const target = leastBig + TERRACE_SLACK_M;
    plan = pass((g) => g > ALLEY_MAX_M + EPS && g <= target + EPS);
  }
  if (!plan && Number.isFinite(leastAny)) {
    const target = leastAny + TERRACE_SLACK_M;
    plan = pass((g) => g <= target + EPS);
  }
  if (!plan || plan.length === 0) return empty;

  // ---- assemble each block with its own key and floors; place them flush from the run's start ----
  const blocks: PackedBlock[] = [];
  let s = 0;
  let lastOv = 0;
  for (let i = 0; i < plan.length; i++) {
    const o = plan[i]!;
    const cap = capAt(s, s + o.w);
    const range = rangeOf(o.style, cap);
    if (!range) break;
    const prev = blocks[i - 1]?.floors;
    const prev2 = blocks[i - 2]?.floors;
    const all: number[] = [];
    for (let f = range.min; f <= range.max; f++) all.push(f);
    const differ = all.filter((f) => f !== prev);
    const pool = differ.length > 0 ? differ : all;
    const apart = pool.filter((f) => f !== prev2);
    const choice = apart.length > 0 ? apart : pool;
    const floors = choice[stableHash(`${run.id}:floors:${i}`) % choice.length]!;
    const isCorner = i === 0 && cornerSide !== null;
    const key = `${run.id}:b${i}`;
    const stack = assembleStack(o.style, { type: "large", key, cornerSides: isCorner ? cornerSides : [] }, entries, fronts, { spec: specFor(cap, 40), bays: o.bays, floors });
    if (!stack) break;
    // The probe widths and overhangs planned this block; the real stack may differ (a style with several floor pieces of different widths). A block whose real width and
    // overhang no longer fit before the far wall is dropped with the rest, one short of the plan, never the whole run.
    const w = stack.width_m;
    const ov = overhang(stack, farSide);
    if (s + w + ov > avail + 1e-6) break;
    const mid = (s + w / 2) * W;
    const fx = Math.sin(first.yaw);
    const fz = Math.cos(first.yaw);
    const frontX = run.ax + run.ux * mid;
    const frontZ = run.az + run.uz * mid;
    blocks.push({
      lot: {
        x: frontX - (fx * first.d) / 2,
        z: frontZ - (fz * first.d) / 2,
        w: w * W,
        d: first.d,
        yaw: first.yaw,
        type: "large",
        hMax: cap * W,
        key,
        street: first.street,
        side: first.side,
        corner: isCorner,
        cornerSides: isCorner ? cornerSides : [],
        terrace: { run: run.id, index: i, bays: o.bays },
      },
      style: o.style.id,
      bays: o.bays,
      floors,
      corner: isCorner,
      stack,
    });
    s += w;
    lastOv = ov;
  }
  if (blocks.length === 0) return empty;
  return { blocks, farGap_m: Math.max(0, avail - s - lastOv), farOverhang_m: lastOv, dropped: plan.length - blocks.length };
}
