/**
 * Ticket 051 C: the packer that turns a terrace run into exact blocks. Pure: no three, no DOM, no fetch. Section B laid each outer-block row as a run of
 * nominal lots (2 to 4 bays of TERRACE_BAY_M); here those lots are re-cut into City Pack stacks from the pieces' true widths (the manifest entries the caller
 * passes; fixture numbers in tests), so that neighbours touch, no model is scaled, and the run's far end is closed.
 *
 * What is decided, and where:
 * - Which blocks: apartment styles only (a style whose `depth` is "bay"; an office is one footprint column and is left to the tall lots), 2 to 4 columns
 *   each, one style per block. The first block is a corner block exactly when the run starts at a corner (`run.startCorner`), with its corner column on that
 *   side; no other block is a corner block (Josh, 17 Nov 2026: corner buildings only on corners).
 * - The widths: a block is as wide as its columns (`Stack.width_m`: the floor pieces' true widths, the corner column's corner piece). Blocks are laid flush from the
 *   run's start along its direction. The packer searches, in a hash-driven order, for a sequence of blocks whose total leaves at most `TERRACE_SEAM_M` at the far
 *   end; when none exists (a row between 11 and 15 m cannot be made from 5.0 to 5.5 m columns) it takes the sequence with the least left over, and the remainder
 *   is left at the far end only. It is never negative.
 * - Where it may stand: from the run's start to its far end. A run that ends at a next row's corner block or at a plaza runs on to `run.len`, which is
 *   under two bays past its last nominal lot (the strip the nominal lots left); a run that ends at a parking lot or a clearance gap stops at its last nominal lot,
 *   because the ground beyond it is not cleared. Every block has the depth and front line of its run's nominal lots.
 * - Heights: a block's cap is the lowest cap of the nominal lots it overlaps. Its floors over the base are picked by hash inside `stackRange` for that cap (2 to 4 on
 *   a 16 m cap, so 3 to 5 storeys with the base), never the same as the block before it where the cap allows a choice, and apart from the one before that where it can.
 * - Variety: neighbours never share a style. Styles are handed out least-used first inside a run, so a run shares its styles near-evenly; the street-repeat rule
 *   (`STREET_REPEAT_GAP`) is vacuous for three styles (it applies to types with more families than that), and `FAMILY_SHARE_MAX` is met by the same near-even spread.
 *
 * The result is deterministic per run id and the styles, entries and fronts passed.
 */

import type { AssetEntry, CalibrationKey } from "../core";
import { stableHash } from "../render/city";
import { BUILDING_FRONTS, type FrontTable } from "./models";
import { assembleStack, stackRange, type Stack, type StackSide, type StackStyle } from "./stacks";
import { TERRACE_BAYS, TERRACE_DEPTH_M, WORLD_PER_METRE, type Lot, type LotSpec, type TerraceRun } from "./town";

/** The most a run's far end may be left short of its end, metres (the gap between the last block and the next row's corner block, a plaza or a parking lot). */
export const TERRACE_SEAM_M = 0.1;

/** When no sequence closes a run to within the seam, how much more than the least possible may be left, metres, to keep the styles varied. */
export const TERRACE_SLACK_M = 0.15;

/** The search stops after this many states: a run longer than the ladder's gives its best sequence so far. Deterministic (a count, not a clock). */
const SEARCH_NODES = 60000;
const EPS = 1e-9;

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
  /** Metres left between the last block and the run's far end (the whole run's length when no block stands). Never negative. */
  farGap_m: number;
}

interface Opt {
  style: StackStyle;
  bays: number;
  /** Metres: the block's width. */
  w: number;
}

const widthCache = new WeakMap<Entries, WeakMap<FrontTable, Map<string, number | null>>>();

/** Cap in metres, rounded so a world-unit cap compares equal to the metre tier it came from. */
const capM = (hMax: number): number => Math.round((hMax / WORLD_PER_METRE) * 1e6) / 1e6;

const specFor = (cap: number, frontage: number): LotSpec => ({ frontage, depth: TERRACE_DEPTH_M, cap });

/**
 * One run of a terrace as blocks. `nominal` are the run's lots in order (`run.lots.map((i) => town.lots[i])`); `styles` the stack styles on offer (the apartment
 * ones are used); `entries` and `fronts` as for `assembleStack`. Returns no block (and the run's whole length as the gap) when nothing can stand: no usable style,
 * no corner piece for a corner start, or a run shorter than one block.
 */
export function packTerrace(run: TerraceRun, nominal: readonly Lot[], styles: readonly StackStyle[], entries: Entries, fronts: FrontTable = BUILDING_FRONTS): PackResult {
  const W = WORLD_PER_METRE;
  const first = nominal[0];
  const len = run.len / W;
  const nomEnd = nominal.reduce((sum, l) => sum + l.w, 0) / W;
  const avail = run.endAbuts === "corner" || run.endAbuts === "plaza" ? Math.max(len, nomEnd) : Math.min(len, nomEnd);
  const empty: PackResult = { blocks: [], farGap_m: Math.max(0, avail) };
  if (!first) return empty;

  // The nominal lots' ends along the run, metres: the cap at a place is the lowest cap of the lots it overlaps.
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

  const apartments = styles.filter((s) => s.depth === "bay");
  const cornerSide: StackSide | null = run.startCorner ? run.startCorner.side : null;
  const cornerSides = run.startCorner ? [run.startCorner] : [];

  // Block widths from the real pieces: one probe stack per style, column count and corner side (the width does not depend on the lot's key).
  const byFronts = widthCache.get(entries) ?? new WeakMap<FrontTable, Map<string, number | null>>();
  widthCache.set(entries, byFronts);
  const cache = byFronts.get(fronts) ?? new Map<string, number | null>();
  byFronts.set(fronts, cache);
  const widthOf = (style: StackStyle, bays: number, side: StackSide | null): number | null => {
    const id = `${style.id}|${bays}|${side ?? "-"}`;
    if (cache.has(id)) return cache.get(id)!;
    const stack = assembleStack(style, { type: "large", key: "probe", cornerSides: side ? [{ side, road: "probe" }] : [] }, entries, fronts, { spec: specFor(16, 40), bays });
    const w = stack ? stack.width_m : null;
    cache.set(id, w);
    return w;
  };
  const optsFor = (side: StackSide | null): Opt[] => {
    const out: Opt[] = [];
    for (const style of apartments) {
      for (let bays = TERRACE_BAYS.min; bays <= TERRACE_BAYS.max; bays++) {
        const w = widthOf(style, bays, side);
        if (w !== null && w > 0) out.push({ style, bays, w });
      }
    }
    return out;
  };
  const midOpts = optsFor(null);
  const cornerOpts = cornerSide ? optsFor(cornerSide) : [];
  if (midOpts.length === 0 || (cornerSide && cornerOpts.length === 0)) return empty;
  const minW = Math.min(...midOpts.map((o) => o.w));

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

  // ---- the search: a sequence of blocks whose total fills the run to within a threshold ----
  const used = new Map<string, number>();
  const seq: Opt[] = [];
  let nodes = 0;
  let failed = new Set<string>();
  let least = Infinity;

  /** The first sequence in preference order (least-used style first, hash for the rest) that leaves at most `threshold` at the far end; `least` tracks the smallest left over seen. */
  const search = (s: number, threshold: number): boolean => {
    const i = seq.length;
    const rem = avail - s;
    if (i > 0) {
      least = Math.min(least, rem);
      if (rem <= threshold + EPS) return true;
    }
    if (rem < minW - EPS || ++nodes > SEARCH_NODES) return false;
    const last = i > 0 ? seq[i - 1]!.style.id : "";
    const memo = `${Math.round(rem * 1000)}|${last}`;
    if (i > 0 && failed.has(memo)) return false;
    const before2 = i > 1 ? seq[i - 2]! : null;
    const pool = (i === 0 && cornerSide ? cornerOpts : midOpts).filter((o) => o.style.id !== last && o.w <= rem + EPS && rangeOf(o.style, capAt(s, s + o.w)) !== null);
    const score = (o: Opt): number =>
      (used.get(o.style.id) ?? 0) * 1000 + (before2 && before2.style.id === o.style.id ? 500 : 0) + (i > 0 && seq[i - 1]!.bays === o.bays ? 60 : 0) + (stableHash(`${run.id}:${i}:${o.style.id}:${o.bays}`) % 50);
    const order = pool.map((o) => ({ o, k: score(o) })).sort((a, b) => a.k - b.k || (a.o.style.id < b.o.style.id ? -1 : a.o.style.id > b.o.style.id ? 1 : a.o.bays - b.o.bays));
    for (const { o } of order) {
      seq.push(o);
      used.set(o.style.id, (used.get(o.style.id) ?? 0) + 1);
      if (search(s + o.w, threshold)) return true;
      used.set(o.style.id, used.get(o.style.id)! - 1);
      seq.pop();
    }
    failed.add(memo);
    return false;
  };
  const reset = (): void => {
    seq.length = 0;
    used.clear();
    failed = new Set();
    nodes = 0;
  };
  // First try to close the run to within the seam. Where the pieces cannot (a length between N columns of the widest piece and N + 1 of the narrowest),
  // take the least that can be left, then the first sequence in preference order that leaves no more than that plus TERRACE_SLACK_M: so a run that cannot
  // be closed still varies its styles instead of always taking the widest.
  let plan: Opt[] | null = null;
  if (search(0, TERRACE_SEAM_M)) plan = seq.slice();
  else if (Number.isFinite(least)) {
    const target = least + TERRACE_SLACK_M;
    reset();
    if (search(0, target)) plan = seq.slice();
  }
  if (!plan || plan.length === 0) return empty;

  // ---- assemble each block with its own key and floors; place them flush from the run's start ----
  const blocks: PackedBlock[] = [];
  let s = 0;
  for (let i = 0; i < plan.length; i++) {
    const o = plan[i]!;
    const cap = capAt(s, s + o.w);
    const range = rangeOf(o.style, cap);
    if (!range) return empty;
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
    if (!stack) return empty;
    const w = stack.width_m;
    // The block's front-centre on the run's front line, and its centre one half-depth behind it (the lot frame's +z points at the road).
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
  }
  // The real widths are the probes' (one floor piece per role today); if a manifest ever made them differ, a sequence that no longer fits gives no block.
  if (s > avail + 1e-6) return empty;
  return { blocks, farGap_m: Math.max(0, avail - s) };
}
