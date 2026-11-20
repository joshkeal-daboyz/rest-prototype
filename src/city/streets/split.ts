/**
 * Stage 1 on the split plan (ticket 070 A4; docs/design/070-streets-t-junctions.md, option C), with one-way streets (ticket 070 A4b; docs/design/070-streets-one-way.md): the city's ground is cut in
 * two by a street, each piece again, across or along, until every piece is a block. Pure; every draw is by `hashOf` (stage 1's own `rand`), with keys beginning "split" (the cuts' places and the
 * two-way streets' parking sides, as in A4), "oneway", "bare" and "flow" (A4b's, so A4's draws are not shifted).
 *
 * The outline and the four edge streets come from today's lattice functions (`blockSizes`, `layoutAxis`), so a city covers the ground of today's city of that size (Josh, Q10). The edge streets are
 * two-way, 5 cells (S8). Every other street is a cut: two-way (5 cells, rule 10), or one-way (4 cells with a parking tile, 3 bare: Josh, 20 Nov 2026). A cut ends on the two streets that bound its
 * piece, and meets a collinear cut of the piece across the street it ends on as one street (a crossroads), with that cut's section. Directions are a pass after the cuts (S9). A draw that misses
 * S1, S3, S4, S5, S7, S8, S9, S11, V1 or V2 is repeated with the next; if every draw misses, the stage fails (R-2). A bare one-way street that would break S10 keeps its parking (the cuts are redone).
 */

import type {
  CityBlockSide,
  CityCell,
  CityJunction,
  CityJunctionFacing,
  CityJunctionKind,
  CityPlanBlock,
  CityPlanStreet,
  CitySide,
  CitySpan,
  CityStreetArrow,
  CityStreetBand,
  CityStreetCell,
  CityStreetFlow,
  CityStreetRole,
  CityStreetSection,
  CityStreetsLayer,
} from "../../core";
import { CityStageError } from "../pipeline/error";
import type { StageRand } from "../pipeline/seeds";
import { oneWayNeighbours, s10Violations, s11Failures, splitFailures, tOf, type SplitFailure } from "./check";
import { BLOCK_DRAWS_MAX, BLOCK_TILES, CUT_MIN_CELLS, JUNCTION_GAP_MIN_CELLS, ONE_WAY_ARROW_EVERY, ONE_WAY_BARE_SHARE, ONE_WAY_SHARE, SECTION_CELLS, STREET_CELLS, TILE_M } from "./constants";
import { blockSizes, blockType, hashOf, layoutAxis, mkStreet } from "./layout";

type BandRow = readonly CityStreetBand[];
const BANDS_LEFT: BandRow = ["pavement", "parking", "lane", "lane", "pavement"];
const BANDS_RIGHT: BandRow = ["pavement", "lane", "lane", "parking", "pavement"];
const ONE_LEFT: BandRow = ["pavement", "parking", "lane", "pavement"];
const ONE_RIGHT: BandRow = ["pavement", "lane", "parking", "pavement"];
const BARE: BandRow = ["pavement", "lane", "pavement"];

/** How many times a draw's cuts are redone for S10 (each time one more bare street keeps its parking) before the draw is given up. */
const S10_ROUNDS_MAX = 64;

interface Rect {
  readonly i0: number;
  readonly i1: number;
  readonly j0: number;
  readonly j1: number;
}

/** The street on one side of a piece: its width in cells, and whether it is one of the four edge streets. */
interface Bound {
  readonly w: number;
  readonly edge: boolean;
}

/** A piece of land and the streets that bound it: `loI` is the z street before it along x (at `i0 - loI.w`), `hiI` the one at `i1`; `loJ` and `hiJ` likewise along z for the x streets. */
interface Piece extends Rect {
  readonly loI: Bound;
  readonly hiI: Bound;
  readonly loJ: Bound;
  readonly hiJ: Bound;
}

/** A street before it has a line and an id: where it lies, and how it is laid. */
interface RawStreet {
  readonly axis: "x" | "z";
  readonly across0: number;
  /** The first cell along its axis it covers (the carriageway start of the street it begins on), and one past the last (the carriageway end of the street it ends on). */
  readonly lo: number;
  readonly hi: number;
  /** The carriageway width of the street at its high end (the junction there is that wide along the axis). */
  readonly hiCw: number;
  /** `across0` of the streets it begins and ends on (how a cut knows which cut lines up with it across a street). */
  readonly loAt: number;
  readonly hiAt: number;
  readonly bands: BandRow;
  readonly section: CityStreetSection;
  flow: CityStreetFlow;
  readonly outer: CitySide | null;
  /** The cuts that make it (their draw keys), for S10's redo. */
  readonly keys: readonly string[];
}

const OPPOSITE: Readonly<Record<CitySide, CitySide>> = { "+x": "-x", "-x": "+x", "+z": "-z", "-z": "+z" };
const SIDES: readonly CitySide[] = ["-x", "+x", "-z", "+z"];
const frac = (h: number): number => (h % 10000) / 10000;

// ---- the cuts ----

/** The pieces of `outline` after every cut of draw `draw`, and the cut streets (not yet merged or given a direction). `keep` holds the cuts that must keep their parking (S10). */
function cutOutline(rand: StageRand, outline: Rect, draw: number, share: number, keep: ReadonlySet<string>): { pieces: Piece[]; cuts: RawStreet[] } {
  const pieces: Piece[] = [];
  const cuts: RawStreet[] = [];
  const edgeBound: Bound = { w: STREET_CELLS, edge: true };
  const stack: Piece[] = [{ ...outline, loI: edgeBound, hiI: edgeBound, loJ: edgeBound, hiJ: edgeBound }];
  for (let piece = stack.pop(); piece; piece = stack.pop()) {
    const w = piece.i1 - piece.i0;
    const d = piece.j1 - piece.j0;
    const wide = w >= CUT_MIN_CELLS;
    const deep = d >= CUT_MIN_CELLS;
    if (!wide && !deep) {
      pieces.push(piece);
      continue;
    }
    const key = `${piece.i0}:${piece.j0}:${piece.i1}:${piece.j1}`;
    const cutColumn = wide && deep ? rand("split", draw, "axis", key) % 2 === 0 : wide;
    const axis = cutColumn ? "z" : "x";
    const a0 = cutColumn ? piece.i0 : piece.j0;
    const len = cutColumn ? w : d;
    // the cut ends on the street before the piece along the other axis and the one after it: its carriageways are where the junctions are
    const before = cutColumn ? piece.loJ : piece.loI;
    const after = cutColumn ? piece.hiJ : piece.hiI;
    const loAt = (cutColumn ? piece.j0 : piece.i0) - before.w;
    const hiAt = cutColumn ? piece.j1 : piece.i1;
    const lo = loAt + 1;
    const hi = hiAt + after.w - 1;
    // its own section, drawn before its place (its width depends on it): a candidate (not edge to edge) is one-way when "oneway" falls under the share, bare when "bare" falls under its share and S10 has not refused
    const cutKey = `${axis}:${key}`;
    let own: CityStreetSection = "twoWay";
    if (!(before.edge && after.edge) && frac(rand("oneway", draw, cutKey)) < share) {
      own = !keep.has(cutKey) && frac(rand("bare", draw, cutKey)) < ONE_WAY_BARE_SHARE ? "oneWayBare" : "oneWay";
    }
    // a cut of the piece across the street it ends on, at the same place, is the same street: a place that lines up takes that cut's section
    const linedWith = (c: number): RawStreet | undefined => cuts.find((e) => e.axis === axis && e.across0 === c && (e.hiAt === loAt || e.loAt === hiAt));
    const widthAt = (c: number): number => linedWith(c)?.bands.length ?? SECTION_CELLS[own];
    const all: number[] = [];
    for (let c = a0 + BLOCK_TILES.min; c <= a0 + len - BLOCK_TILES.min - SECTION_CELLS.oneWayBare; c++) if (c + widthAt(c) <= a0 + len - BLOCK_TILES.min) all.push(c);
    // The position is by hash among the places that keep S3 (no street already ending on the same street from the other side nearer than JUNCTION_GAP_MIN_CELLS between centre lines, without
    // lining up) and leave each child a size that can be finished well: 8 to 16, or twice 8 and this street's width. When none does, the places that keep S3; when none does, any.
    const keepsS3 = (c: number): boolean => {
      const centre2 = 2 * c + widthAt(c);
      return !cuts.some((e) => e.axis === axis && e.across0 !== c && Math.abs(2 * e.across0 + e.bands.length - centre2) < 2 * JUNCTION_GAP_MIN_CELLS && (e.hiAt === loAt || e.loAt === hiAt));
    };
    const fine = (n: number, wc: number): boolean => (n >= BLOCK_TILES.min + 2 && n <= BLOCK_TILES.max) || n >= 2 * (BLOCK_TILES.min + 2) + wc;
    const s3 = all.filter(keepsS3);
    const good = s3.filter((c) => fine(c - a0, widthAt(c)) && fine(a0 + len - c - widthAt(c), widthAt(c)));
    const pool = good.length > 0 ? good : s3.length > 0 ? s3 : all;
    const c = pool[rand("split", draw, "at", key) % pool.length]!;
    const lined = linedWith(c);
    const section = lined ? lined.section : own;
    const bands: BandRow =
      section === "twoWay"
        ? rand("split", draw, "park", axis, c) % 2 === 0 ? BANDS_LEFT : BANDS_RIGHT
        : section === "oneWayBare"
          ? BARE
          : rand("oneway", draw, "park", axis, c) % 2 === 0 ? ONE_LEFT : ONE_RIGHT;
    const wc = bands.length;
    cuts.push({ axis, across0: c, lo, hi, hiCw: after.w - 2, loAt, hiAt, bands, section, flow: "both", outer: null, keys: [cutKey] });
    const bound: Bound = { w: wc, edge: false };
    stack.push(
      cutColumn ? { ...piece, i1: c, hiI: bound } : { ...piece, j1: c, hiJ: bound },
      cutColumn ? { ...piece, i0: c + wc, loI: bound } : { ...piece, j0: c + wc, loJ: bound },
    );
  }
  pieces.sort((p, q) => p.j0 - q.j0 || p.i0 - q.i0);
  return { pieces, cuts };
}

/** Collinear cuts whose spans overlap (they meet across a street, at its junction rectangle) are one street. */
function mergeCuts(cuts: readonly RawStreet[]): RawStreet[] {
  const sorted = [...cuts].sort((p, q) => (p.axis < q.axis ? -1 : p.axis > q.axis ? 1 : p.across0 - q.across0 || p.lo - q.lo));
  const out: RawStreet[] = [];
  for (const c of sorted) {
    const last = out[out.length - 1];
    if (last && last.axis === c.axis && last.across0 === c.across0 && c.lo < last.hi) {
      out[out.length - 1] = { ...last, hi: Math.max(last.hi, c.hi), hiCw: c.hi > last.hi ? c.hiCw : last.hiCw, hiAt: c.hi > last.hi ? c.hiAt : last.hiAt, keys: [...last.keys, ...c.keys] };
    } else out.push(c);
  }
  return out;
}

// ---- directions (S9) ----

/**
 * The one-way streets' directions, a pass after the cuts and the junctions (direction changes no cell). S9 says two one-way streets that are next to each other on a line straight across their
 * axis's streets (`oneWayNeighbours`) run opposite ways, so the one-way streets that touch this way form a graph that must be two-coloured. They are taken in `across0` order; the first of each
 * group of touching streets takes its hash's direction and the rest follow from it, one search per group, so S9 holds whenever it can. When it cannot (a ring of an odd number of one-way streets,
 * each next to the next), the draw misses: returns the reason. Otherwise the streets with their `flow`.
 */
function assignFlows(streets: readonly CityPlanStreet[], junctions: readonly CityJunction[], rand: StageRand, draw: number): CityPlanStreet[] | string {
  const flow = new Map<string, CityStreetFlow>();
  const next = new Map<string, string[]>();
  for (const [a, b] of oneWayNeighbours(streets, junctions)) {
    (next.get(a.id) ?? next.set(a.id, []).get(a.id)!).push(b.id);
    (next.get(b.id) ?? next.set(b.id, []).get(b.id)!).push(a.id);
  }
  const opposite = (f: CityStreetFlow): CityStreetFlow => (f === "+" ? "-" : "+");
  const order = streets.filter((s) => s.section !== "twoWay").sort((p, q) => (p.axis < q.axis ? -1 : p.axis > q.axis ? 1 : p.across0 - q.across0 || p.span.lo - q.span.lo));
  for (const s of order) {
    if (flow.has(s.id)) continue;
    flow.set(s.id, rand("flow", draw, s.axis, s.across0, s.span.lo) % 2 === 0 ? "+" : "-");
    const stack = [s.id];
    for (let n = stack.pop(); n !== undefined; n = stack.pop()) {
      for (const m of next.get(n) ?? []) {
        if (!flow.has(m)) {
          flow.set(m, opposite(flow.get(n)!));
          stack.push(m);
        } else if (flow.get(m) === flow.get(n)) return `S9: the one-way streets ${n} and ${m} are next to each other and cannot run opposite ways`;
      }
    }
  }
  return streets.map((s) => (s.section === "twoWay" ? s : { ...s, flow: flow.get(s.id)! }));
}

// ---- streets, junctions ----

const junctionId = (i: number, j: number): string => `junction:${i}:${j}`;

/** A one-way street's lane cell index in its `bands`. */
const laneIndex = (bands: BandRow): number => bands.indexOf("lane");

/** The streets with lines, ids and ends: x streets first, each axis ordered by `across0` then `span.lo` (cityplan.ts). Also each street's cuts' keys. */
function finishStreets(raw: readonly RawStreet[]): { streets: CityPlanStreet[]; keys: Map<string, readonly string[]> } {
  const out: CityPlanStreet[] = [];
  const keys = new Map<string, readonly string[]>();
  for (const axis of ["x", "z"] as const) {
    const mine = raw.filter((s) => s.axis === axis).sort((p, q) => p.across0 - q.across0 || p.lo - q.lo);
    mine.forEach((s, line) => {
      const base = mkStreet(axis, { line, first: s.across0, profile: "street", bands: s.bands });
      const n = s.bands.length;
      // on one lane the lane's edge is a kerb: the centre line is the middle of the lane cell (cityplan.ts)
      const lane = laneIndex(s.bands);
      const centre_m = s.section === "twoWay" ? base.centre_m : (axis === "x" ? s.across0 + lane + 0.5 : s.across0 + n - 1 - lane + 0.5) * TILE_M;
      const at = s.across0 + 1; // the carriageway's first row (an "x" street) or column (a "z" street)
      const end = (along: number): { junction: string } => ({ junction: axis === "x" ? junctionId(along, at) : junctionId(at, along) });
      out.push({ ...base, centre_m, section: s.section, flow: s.flow, span: { lo: s.lo, hi: s.hi }, ends: [end(s.lo), end(s.hi - s.hiCw)], outer: s.outer });
      keys.set(`${axis}:${line}`, s.keys);
    });
  }
  return { streets: out, keys };
}

/** The streets by `axis:key` (several may share a line when their spans do not meet). */
function indexStreets(streets: readonly CityPlanStreet[], key: (s: CityPlanStreet) => number): Map<string, CityPlanStreet[]> {
  const m = new Map<string, CityPlanStreet[]>();
  for (const s of streets) {
    const k = `${s.axis}:${key(s)}`;
    const list = m.get(k);
    if (list) list.push(s);
    else m.set(k, [s]);
  }
  return m;
}

/** The width of a street's carriageway, in cells. */
const carriageCells = (s: CityPlanStreet): number => s.bands.length - 2;

/**
 * Every junction: each x street and z street whose carriageways cross inside both spans, found by walking each x street's cells and looking up the z street whose carriageway begins there. The
 * junction is the two carriageways' rectangle (3, 2 or 1 cells each way). Row-major by low corner.
 */
function findJunctions(streets: readonly CityPlanStreet[]): CityJunction[] {
  const out: CityJunction[] = [];
  const starts = indexStreets(streets, (s) => s.across0 + 1);
  for (const x of streets) {
    if (x.axis !== "x") continue;
    const r0 = x.across0 + 1;
    const xcw = carriageCells(x);
    for (let c0 = x.span.lo; c0 < x.span.hi; c0++) {
      for (const z of starts.get(`z:${c0}`) ?? []) {
        const zcw = carriageCells(z);
        if (!(c0 + zcw <= x.span.hi && z.span.lo <= r0 && r0 + xcw <= z.span.hi)) continue;
        const xEnds = x.span.lo === c0 || x.span.hi === c0 + zcw;
        const zEnds = z.span.lo === r0 || z.span.hi === r0 + xcw;
        const kind: CityJunctionKind = xEnds && zEnds ? "corner" : xEnds || zEnds ? "T" : "crossroads";
        const arms: CitySide[] = [];
        if (x.span.lo < c0) arms.push("-x");
        if (x.span.hi > c0 + zcw) arms.push("+x");
        if (z.span.lo < r0) arms.push("-z");
        if (z.span.hi > r0 + xcw) arms.push("+z");
        const cells: CityCell[] = [];
        for (let j = r0; j < r0 + xcw; j++) for (let i = c0; i < c0 + zcw; i++) cells.push({ i, j });
        out.push({
          id: junctionId(c0, r0),
          kind,
          cells,
          streets: [
            { street: x.id, passes: !xEnds },
            { street: z.id, passes: !zEnds },
          ],
          arms,
          inner: x.outer === null && z.outer === null,
        });
      }
    }
  }
  return out.sort((p, q) => p.cells[0]!.j - q.cells[0]!.j || p.cells[0]!.i - q.cells[0]!.i);
}

// ---- blocks ----

/** The blocks of a draw, with ranks for `bi` and `bj`, and their four sides. */
function layBlocks(pieces: readonly Rect[], streets: readonly CityPlanStreet[], junctions: readonly CityJunction[]): CityPlanBlock[] {
  const rank = (vals: number[]): Map<number, number> => new Map([...new Set(vals)].sort((a, b) => a - b).map((v, k) => [v, k] as const));
  const bi = rank(pieces.map((p) => p.i0));
  const bj = rank(pieces.map((p) => p.j0));
  const blocks = pieces.map((p) => ({ i0: p.i0, i1: p.i1, j0: p.j0, j1: p.j1, id: `block:${bi.get(p.i0)!}:${bj.get(p.j0)!}`, bi: bi.get(p.i0)!, bj: bj.get(p.j0)! })).sort((p, q) => p.bj - q.bj || p.bi - q.bi);

  // A block's side street is the one whose pavement touches the block edge: it begins there (`across0`) for the "+" sides, and ends there (`across0` plus its width) for the "-" sides.
  const first = indexStreets(streets, (s) => s.across0);
  const last = indexStreets(streets, (s) => s.across0 + s.bands.length);
  const streetOf = (axis: "x" | "z", from: "first" | "last", line: number, span: CitySpan, id: string): CityPlanStreet => {
    const s = ((from === "first" ? first : last).get(`${axis}:${line}`) ?? []).find((t) => t.span.lo <= span.lo && span.hi <= t.span.hi);
    if (!s) throw new CityStageError(`S4: ${id} has no street along its side at ${axis}:${line}, cells ${span.lo} to ${span.hi}`, [{ i: span.lo, j: line }]);
    return s;
  };
  const base = blocks.map((b) => {
    const along: Record<CitySide, { street: CityPlanStreet; span: CitySpan }> = {
      "-z": { span: { lo: b.i0, hi: b.i1 }, street: streetOf("x", "last", b.j0, { lo: b.i0, hi: b.i1 }, b.id) },
      "+z": { span: { lo: b.i0, hi: b.i1 }, street: streetOf("x", "first", b.j1, { lo: b.i0, hi: b.i1 }, b.id) },
      "-x": { span: { lo: b.j0, hi: b.j1 }, street: streetOf("z", "last", b.i0, { lo: b.j0, hi: b.j1 }, b.id) },
      "+x": { span: { lo: b.j0, hi: b.j1 }, street: streetOf("z", "first", b.i1, { lo: b.j0, hi: b.j1 }, b.id) },
    };
    return { b, along };
  });
  // (street, side) -> the blocks that have that side on that street
  const onSide = new Map<string, { id: string; span: CitySpan }[]>();
  for (const { b, along } of base) for (const s of SIDES) {
    const k = `${along[s].street.id}|${s}`;
    const list = onSide.get(k) ?? [];
    list.push({ id: b.id, span: along[s].span });
    onSide.set(k, list);
  }
  // the Ts by the street they run along and the side they open to: `through|arm`
  const tsOn = new Map<string, { junction: string; ending: string }[]>();
  for (const j of junctions) {
    const t = tOf(j);
    if (!t) continue;
    const k = `${t.through}|${t.arm}`;
    const list = tsOn.get(k);
    if (list) list.push({ junction: j.id, ending: t.ending });
    else tsOn.set(k, [{ junction: j.id, ending: t.ending }]);
  }
  const endingStreet = new Map(streets.map((s) => [s.id, s] as const));

  return base.map(({ b, along }) => {
    const sides = {} as Record<CitySide, CityBlockSide>;
    for (const s of SIDES) {
      const { street, span } = along[s];
      const facesOut = street.outer === s;
      const across = facesOut
        ? []
        : (onSide.get(`${street.id}|${OPPOSITE[s]}`) ?? [])
            .map((o) => ({ block: o.id, span: { lo: Math.max(span.lo, o.span.lo), hi: Math.min(span.hi, o.span.hi) } }))
            .filter((o) => o.span.hi > o.span.lo)
            .sort((p, q) => p.span.lo - q.span.lo);
      const junctionsFacing: CityJunctionFacing[] = [];
      if (!facesOut) {
        for (const t of tsOn.get(`${street.id}|${s}`) ?? []) {
          const e = endingStreet.get(t.ending)!;
          const facing = { lo: e.across0, hi: e.across0 + e.bands.length };
          if (span.lo <= facing.lo && facing.hi <= span.hi) junctionsFacing.push({ junction: t.junction, street: e.id, span: facing });
        }
        junctionsFacing.sort((p, q) => p.span.lo - q.span.lo);
      }
      sides[s] = { side: s, street: street.id, span, across, junctions: junctionsFacing };
    }
    return { id: b.id, bi: b.bi, bj: b.bj, i0: b.i0, i1: b.i1, j0: b.j0, j1: b.j1, type: blockType(b.i1 - b.i0, b.j1 - b.j0), sides };
  });
}

// ---- the street cells ----

/** The base role of every street cell, row by row (the lattice's rule; `cells` not listed are inside blocks). A corner junction's streets also cover the other street's outer pavement. */
function layCells(w: number, h: number, streets: readonly CityPlanStreet[], junctions: readonly CityJunction[]): CityStreetCell[] {
  const kindOf = new Map(junctions.map((j) => [j.id, j.kind] as const));
  const zAt = new Int16Array(w * h).fill(-1);
  const xAt = new Int16Array(w * h).fill(-1);
  streets.forEach((s, k) => {
    const lo = s.span.lo - (kindOf.get(s.ends[0].junction) === "corner" ? 1 : 0);
    const hi = s.span.hi + (kindOf.get(s.ends[1].junction) === "corner" ? 1 : 0);
    const own = s.axis === "x" ? xAt : zAt;
    for (let a = s.across0; a < s.across0 + s.bands.length; a++) {
      for (let p = lo; p < hi; p++) {
        const i = s.axis === "x" ? p : a;
        const j = s.axis === "x" ? a : p;
        if (i < 0 || j < 0 || i >= w || j >= h) throw new CityStageError(`S1: ${s.id} leaves the lattice at (${i}, ${j})`, [{ i, j }]);
        if (own[j * w + i]! >= 0) throw new CityStageError(`S1: ${s.id} and ${streets[own[j * w + i]!]!.id} overlap at (${i}, ${j})`, [{ i, j }]);
        own[j * w + i] = k;
      }
    }
  });
  const isCarriage = (b: CityStreetBand): boolean => b === "lane" || b === "parking";
  const bandIndex = (s: CityPlanStreet, i: number, j: number): number => (s.axis === "x" ? j - s.across0 : s.bands.length - 1 - (i - s.across0));
  const cells: CityStreetCell[] = [];
  for (let j = 0; j < h; j++) {
    for (let i = 0; i < w; i++) {
      const idx = j * w + i;
      const zs = zAt[idx]! >= 0 ? streets[zAt[idx]!]! : null;
      const xs = xAt[idx]! >= 0 ? streets[xAt[idx]!]! : null;
      if (!zs && !xs) continue;
      const zk = zs ? bandIndex(zs, i, j) : -1;
      const xk = xs ? bandIndex(xs, i, j) : -1;
      const vb = zs ? zs.bands[zk]! : null;
      const hb = xs ? xs.bands[xk]! : null;
      let role: CityStreetRole;
      let street: string | null = null;
      let band = -1;
      if (vb && !hb) {
        role = vb === "parking" ? "parkingPlain" : vb;
        street = zs!.id;
        band = zk;
      } else if (hb && !vb) {
        role = hb === "parking" ? "parkingPlain" : hb;
        street = xs!.id;
        band = xk;
      } else if (isCarriage(vb!) && isCarriage(hb!)) role = "junction";
      else if (isCarriage(vb!)) {
        role = "crossing";
        street = zs!.id;
      } else if (isCarriage(hb!)) {
        role = "crossing";
        street = xs!.id;
      } else role = "pavementCorner";
      cells.push({ i, j, role, street: role === "junction" || role === "pavementCorner" ? null : street, band });
    }
  }
  return cells;
}

// ---- the arrows ----

/**
 * The painted arrows of every one-way street (A4b criterion 10): along its lane, each unbroken run of lane cells (broken by a junction or a crossing) gets one on its first cell in the direction of
 * traffic, then one every `ONE_WAY_ARROW_EVERY` cells, each pointing with the flow. Row-major.
 */
function layArrows(streets: readonly CityPlanStreet[], cells: readonly CityStreetCell[], w: number): CityStreetArrow[] {
  const at = new Map<number, CityStreetCell>(cells.map((c) => [c.j * w + c.i, c] as const));
  const out: CityStreetArrow[] = [];
  for (const s of streets) {
    if (s.flow === "both") continue;
    const lane = laneIndex(s.bands);
    const fixed = s.axis === "x" ? s.across0 + lane : s.across0 + s.bands.length - 1 - lane;
    const toward: CitySide = s.axis === "x" ? (s.flow === "+" ? "+x" : "-x") : s.flow === "+" ? "+z" : "-z";
    let run = 0;
    for (let k = 0; k < s.span.hi - s.span.lo; k++) {
      const p = s.flow === "+" ? s.span.lo + k : s.span.hi - 1 - k;
      const i = s.axis === "x" ? p : fixed;
      const j = s.axis === "x" ? fixed : p;
      const c = at.get(j * w + i);
      if (!c || c.role !== "lane" || c.street !== s.id) {
        run = 0;
        continue;
      }
      if (run % ONE_WAY_ARROW_EVERY === 0) out.push({ i, j, street: s.id, toward });
      run++;
    }
  }
  return out.sort((p, q) => p.j - q.j || p.i - q.i);
}

// ---- the layout ----

export interface SplitLayout {
  readonly layer: CityStreetsLayer;
  /** The split draw that was taken (0 first). The outline's own draw is `layer.outline.draw`. */
  readonly draw: number;
  /** How many draws missed, by rule, before it. */
  readonly misses: Readonly<Record<string, number>>;
  /** How many times S10 made a bare one-way street keep its parking (the cuts redone each time), in the draw that was taken. */
  readonly refusals: number;
}

/**
 * Stage 1's layout on the split plan, for a city of `blocksX` by `blocksZ` blocks' worth of ground (both already clamped). Throws `CityStageError` naming the rule when every draw
 * of `BLOCK_DRAWS_MAX + 1` misses (R-2): there is no fallback list. `held` is the test a draw must pass (`splitFailures`; a test may hand in another). `rand` is stage 1's hash (the runner's; by
 * default `hashOf`, the same function) and draws every cut. `oneWayShare` is the share of the candidate streets made one-way (default `ONE_WAY_SHARE`; 0 gives A4's plan with every street two-way).
 */
export function laySplit(
  seed: number,
  blocksX: number,
  blocksZ: number,
  held: typeof splitFailures = splitFailures,
  rand: StageRand = (...key) => hashOf(seed, ...key),
  oneWayShare: number = ONE_WAY_SHARE,
): SplitLayout {
  const { widths, depths, draw: outlineDraw } = blockSizes(seed, blocksX, blocksZ);
  const cols = layoutAxis(seed, "z", blocksX, widths);
  const rows = layoutAxis(seed, "x", blocksZ, depths);
  const w = cols.total;
  const h = rows.total;
  const outline = { i0: cols.blocks[0]!.first, i1: cols.streets[blocksX]!.first, j0: rows.blocks[0]!.first, j1: rows.streets[blocksZ]!.first, draw: outlineDraw };

  // the four edge streets, from the lattice's outer lines (their bands by its hash); they run between the corner squares (1 to w - 1 and 1 to h - 1), and are two-way (S8)
  const edge = (axis: "x" | "z", line: { first: number; bands: readonly CityStreetBand[] }, outer: CitySide): RawStreet => ({
    axis,
    across0: line.first,
    lo: 1,
    hi: (axis === "x" ? w : h) - 1,
    hiCw: 3,
    loAt: -1,
    hiAt: -1,
    bands: line.bands,
    section: "twoWay",
    flow: "both",
    outer,
    keys: [],
  });
  const edges = (): RawStreet[] => [edge("x", rows.streets[0]!, "-z"), edge("x", rows.streets[blocksZ]!, "+z"), edge("z", cols.streets[0]!, "-x"), edge("z", cols.streets[blocksX]!, "+x")];

  const misses: Record<string, number> = {};
  const miss = (f: readonly SplitFailure[]): void => {
    for (const r of new Set(f.map((x) => x.rule))) misses[r] = (misses[r] ?? 0) + 1;
  };
  let last: SplitFailure | null = null;
  for (let draw = 0; draw <= BLOCK_DRAWS_MAX; draw++) {
    const keep = new Set<string>();
    let refusals = 0;
    for (let round = 0; ; round++) {
      const { pieces, cuts } = cutOutline(rand, outline, draw, oneWayShare, keep);
      const { streets: undirected, keys } = finishStreets([...edges(), ...mergeCuts(cuts)]);
      const junctions = findJunctions(undirected);
      const directed = assignFlows(undirected, junctions, rand, draw);
      if (typeof directed === "string") {
        last = { rule: "S9", reason: directed };
        miss([last]);
        break;
      }
      const streets = directed;
      const blocks = pieces.map((p) => ({ i0: p.i0, i1: p.i1, j0: p.j0, j1: p.j1 }));
      const failures = held({ streets, junctions, blocks });
      if (failures.length > 0) {
        miss(failures);
        last = failures[0]!;
        break;
      }
      const planBlocks = layBlocks(blocks, streets, junctions);
      // S10: a bare one-way street that takes a block's last own parking band keeps its parking, and the cuts are redone
      const bad = s10Violations({ streets, blocks: planBlocks });
      if (bad.length > 0) {
        const before = keep.size;
        for (const k of keys.get(bad[0]!.street) ?? []) keep.add(k);
        if (keep.size > before && round < S10_ROUNDS_MAX) {
          refusals++;
          continue;
        }
        last = { rule: "S10", reason: `S10: ${bad[0]!.block} has no parking band of its own beside the bare one-way street ${bad[0]!.street}, and it cannot keep its parking` };
        miss([last]);
        break;
      }
      // S11: the split leaves Land its park places (judged on the final layer, after S9 and S10)
      const parks = s11Failures({ streets, blocks: planBlocks });
      if (parks.length > 0) {
        last = { rule: "S11", reason: parks[0]! };
        miss([last]);
        break;
      }
      const cells = layCells(w, h, streets, junctions);
      const arrows = layArrows(streets, cells, w);
      return { layer: { stage: "streets", w, h, streets, cells, blocks: planBlocks, junctions, outline, arrows }, draw, misses, refusals };
    }
  }
  const worst = Object.entries(misses).sort((p, q) => q[1] - p[1])[0];
  throw new CityStageError(
    `${worst?.[0] ?? "S4"}: no split of the ${blocksX} x ${blocksZ} ground held every rule in ${BLOCK_DRAWS_MAX + 1} draws (misses ${JSON.stringify(misses)}; last: ${last?.reason ?? "none"})`,
    [{ i: outline.i0, j: outline.j0 }],
  );
}
