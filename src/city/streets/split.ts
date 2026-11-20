/**
 * Stage 1 on the split plan (ticket 070 A4; docs/design/070-streets-t-junctions.md, option C): the city's ground is cut in two by a street, each piece again, across or along,
 * until every piece is a block. Pure; every draw is by `hashOf` (stage 1's own `rand`), with keys beginning "split".
 *
 * The outline and the four edge streets come from today's lattice functions (`blockSizes`, `layoutAxis`), so a city covers the ground of today's city of that size (Josh, Q10).
 * Every other street is a cut. A cut is a street of rule 10's section (5 cells), ends on the two streets that bound its piece, and meets a collinear cut of the piece across
 * the street it ends on as one street (a crossroads). A draw that misses S1, S3, S4, S5, V1 or V2 is repeated with the next; if every draw misses, the stage fails (R-2).
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
  CityStreetBand,
  CityStreetCell,
  CityStreetRole,
  CityStreetsLayer,
} from "../../core";
import { CityStageError } from "../pipeline/error";
import { splitFailures, tOf, type SplitFailure } from "./check";
import { BLOCK_DRAWS_MAX, BLOCK_TILES, CUT_MIN_CELLS, JUNCTION_GAP_MIN_CELLS, STREET_CELLS } from "./constants";
import { blockSizes, blockType, hashOf, layoutAxis, mkStreet } from "./layout";

const BANDS_LEFT: readonly CityStreetBand[] = ["pavement", "parking", "lane", "lane", "pavement"];
const BANDS_RIGHT: readonly CityStreetBand[] = ["pavement", "lane", "lane", "parking", "pavement"];

interface Rect {
  readonly i0: number;
  readonly i1: number;
  readonly j0: number;
  readonly j1: number;
}

/** A street before it has a line and an id: where it lies, and how it is laid. */
interface RawStreet {
  readonly axis: "x" | "z";
  readonly across0: number;
  readonly lo: number;
  readonly hi: number;
  readonly bands: readonly CityStreetBand[];
  readonly outer: CitySide | null;
}

const OPPOSITE: Readonly<Record<CitySide, CitySide>> = { "+x": "-x", "-x": "+x", "+z": "-z", "-z": "+z" };
const SIDES: readonly CitySide[] = ["-x", "+x", "-z", "+z"];

// ---- the cuts ----

/** The pieces of `outline` after every cut of draw `draw`, and the cut streets (not yet merged). */
function cutOutline(seed: number, outline: Rect, draw: number): { pieces: Rect[]; cuts: RawStreet[] } {
  const pieces: Rect[] = [];
  const cuts: RawStreet[] = [];
  const stack: Rect[] = [outline];
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
    const cutColumn = wide && deep ? hashOf(seed, "split", draw, "axis", key) % 2 === 0 : wide;
    const axis = cutColumn ? "z" : "x";
    const a0 = cutColumn ? piece.i0 : piece.j0;
    const len = cutColumn ? w : d;
    // the cut ends on the street before the piece along the other axis and the one after it: at the squares (lo, hi)
    const lo = (cutColumn ? piece.j0 : piece.i0) - STREET_CELLS + 1;
    const hi = (cutColumn ? piece.j1 : piece.i1) + 4;
    const all: number[] = [];
    for (let c = a0 + BLOCK_TILES.min; c <= a0 + len - BLOCK_TILES.min - STREET_CELLS; c++) all.push(c);
    // The position is by hash among the places that keep S3 (no street already ending on the same street from the other side nearer than JUNCTION_GAP_MIN_CELLS without lining up)
    // and leave each child a size that can be finished well: 8 to 16, or 21 and more. When none does, the places that keep S3; when none does, any.
    const keepsS3 = (c: number): boolean => !cuts.some((e) => e.axis === axis && e.across0 !== c && Math.abs(e.across0 - c) < JUNCTION_GAP_MIN_CELLS && (e.hi === lo + 3 || e.lo === hi - 3));
    const fine = (n: number): boolean => (n >= BLOCK_TILES.min + 2 && n <= BLOCK_TILES.max) || n >= 2 * (BLOCK_TILES.min + 2) + STREET_CELLS;
    const s3 = all.filter(keepsS3);
    const good = s3.filter((c) => fine(c - a0) && fine(a0 + len - c - STREET_CELLS));
    const pool = good.length > 0 ? good : s3.length > 0 ? s3 : all;
    const c = pool[hashOf(seed, "split", draw, "at", key) % pool.length]!;
    const bands = hashOf(seed, "split", draw, "park", axis, c) % 2 === 0 ? BANDS_LEFT : BANDS_RIGHT;
    cuts.push({ axis, across0: c, lo, hi, bands, outer: null });
    stack.push(cutColumn ? { ...piece, i1: c } : { ...piece, j1: c }, cutColumn ? { ...piece, i0: c + STREET_CELLS } : { ...piece, j0: c + STREET_CELLS });
  }
  pieces.sort((p, q) => p.j0 - q.j0 || p.i0 - q.i0);
  return { pieces, cuts };
}

/** Collinear cuts whose spans overlap (they meet across a street, at its junction square) are one street. */
function mergeCuts(cuts: readonly RawStreet[]): RawStreet[] {
  const sorted = [...cuts].sort((p, q) => (p.axis < q.axis ? -1 : p.axis > q.axis ? 1 : p.across0 - q.across0 || p.lo - q.lo));
  const out: RawStreet[] = [];
  for (const c of sorted) {
    const last = out[out.length - 1];
    if (last && last.axis === c.axis && last.across0 === c.across0 && c.lo < last.hi) out[out.length - 1] = { ...last, hi: Math.max(last.hi, c.hi) };
    else out.push(c);
  }
  return out;
}

// ---- streets, junctions ----

const junctionId = (i: number, j: number): string => `junction:${i}:${j}`;

/** The streets with lines, ids and ends: x streets first, each axis ordered by `across0` then `span.lo` (cityplan.ts). */
function finishStreets(raw: readonly RawStreet[]): CityPlanStreet[] {
  const out: CityPlanStreet[] = [];
  for (const axis of ["x", "z"] as const) {
    const mine = raw.filter((s) => s.axis === axis).sort((p, q) => p.across0 - q.across0 || p.lo - q.lo);
    mine.forEach((s, line) => {
      const base = mkStreet(axis, { line, first: s.across0, profile: "street", bands: s.bands });
      const at = s.across0 + 1; // the square's row (an "x" street) or column (a "z" street)
      const end = (along: number): { junction: string } => ({ junction: axis === "x" ? junctionId(along, at) : junctionId(at, along) });
      out.push({ ...base, span: { lo: s.lo, hi: s.hi }, ends: [end(s.lo), end(s.hi - 3)], outer: s.outer });
    });
  }
  return out;
}

/** Every junction: each pair of streets whose junction square lies inside both spans. Row-major by low corner. */
function findJunctions(streets: readonly CityPlanStreet[]): CityJunction[] {
  const out: CityJunction[] = [];
  const xs = streets.filter((s) => s.axis === "x");
  const zs = streets.filter((s) => s.axis === "z");
  for (const x of xs) {
    for (const z of zs) {
      const c0 = z.across0 + 1;
      const r0 = x.across0 + 1;
      if (!(x.span.lo <= c0 && c0 + 3 <= x.span.hi && z.span.lo <= r0 && r0 + 3 <= z.span.hi)) continue;
      const xEnds = x.span.lo === c0 || x.span.hi === c0 + 3;
      const zEnds = z.span.lo === r0 || z.span.hi === r0 + 3;
      const kind: CityJunctionKind = xEnds && zEnds ? "corner" : xEnds || zEnds ? "T" : "crossroads";
      const arms: CitySide[] = [];
      if (x.span.lo < c0) arms.push("-x");
      if (x.span.hi > c0 + 3) arms.push("+x");
      if (z.span.lo < r0) arms.push("-z");
      if (z.span.hi > r0 + 3) arms.push("+z");
      const cells: CityCell[] = [];
      for (let j = r0; j < r0 + 3; j++) for (let i = c0; i < c0 + 3; i++) cells.push({ i, j });
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
  return out.sort((p, q) => p.cells[0]!.j - q.cells[0]!.j || p.cells[0]!.i - q.cells[0]!.i);
}

// ---- blocks ----

/** The blocks of a draw, with ranks for `bi` and `bj`, and their four sides. */
function layBlocks(pieces: readonly Rect[], streets: readonly CityPlanStreet[], junctions: readonly CityJunction[]): CityPlanBlock[] {
  const rank = (vals: number[]): Map<number, number> => new Map([...new Set(vals)].sort((a, b) => a - b).map((v, k) => [v, k] as const));
  const bi = rank(pieces.map((p) => p.i0));
  const bj = rank(pieces.map((p) => p.j0));
  const blocks = pieces.map((p) => ({ ...p, id: `block:${bi.get(p.i0)!}:${bj.get(p.j0)!}`, bi: bi.get(p.i0)!, bj: bj.get(p.j0)! })).sort((p, q) => p.bj - q.bj || p.bi - q.bi);

  const streetOf = (axis: "x" | "z", across0: number, span: CitySpan, id: string): CityPlanStreet => {
    const s = streets.find((t) => t.axis === axis && t.across0 === across0 && t.span.lo <= span.lo && span.hi <= t.span.hi);
    if (!s) throw new CityStageError(`S4: ${id} has no street along its side at ${axis}:${across0}, cells ${span.lo} to ${span.hi}`, [{ i: span.lo, j: across0 }]);
    return s;
  };
  const base = blocks.map((b) => {
    const along: Record<CitySide, { street: CityPlanStreet; span: CitySpan }> = {
      "-z": { span: { lo: b.i0, hi: b.i1 }, street: streetOf("x", b.j0 - STREET_CELLS, { lo: b.i0, hi: b.i1 }, b.id) },
      "+z": { span: { lo: b.i0, hi: b.i1 }, street: streetOf("x", b.j1, { lo: b.i0, hi: b.i1 }, b.id) },
      "-x": { span: { lo: b.j0, hi: b.j1 }, street: streetOf("z", b.i0 - STREET_CELLS, { lo: b.j0, hi: b.j1 }, b.id) },
      "+x": { span: { lo: b.j0, hi: b.j1 }, street: streetOf("z", b.i1, { lo: b.j0, hi: b.j1 }, b.id) },
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
  const ts = junctions.flatMap((j) => {
    const t = tOf(j);
    return t ? [{ junction: j.id, ...t }] : [];
  });
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
        for (const t of ts) {
          if (t.through !== street.id || t.arm !== s) continue;
          const e = endingStreet.get(t.ending)!;
          const facing = { lo: e.across0, hi: e.across0 + STREET_CELLS };
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

// ---- the layout ----

export interface SplitLayout {
  readonly layer: CityStreetsLayer;
  /** The split draw that was taken (0 first). The outline's own draw is `layer.outline.draw`. */
  readonly draw: number;
  /** How many draws missed, by rule, before it. */
  readonly misses: Readonly<Record<string, number>>;
}

/**
 * Stage 1's layout on the split plan, for a city of `blocksX` by `blocksZ` blocks' worth of ground (both already clamped). Throws `CityStageError` naming the rule when every draw
 * of `BLOCK_DRAWS_MAX + 1` misses (R-2): there is no fallback list. `held` is the test a draw must pass (`splitFailures`; a test may hand in another).
 */
export function laySplit(seed: number, blocksX: number, blocksZ: number, held: typeof splitFailures = splitFailures): SplitLayout {
  const { widths, depths, draw: outlineDraw } = blockSizes(seed, blocksX, blocksZ);
  const cols = layoutAxis(seed, "z", blocksX, widths);
  const rows = layoutAxis(seed, "x", blocksZ, depths);
  const w = cols.total;
  const h = rows.total;
  const outline = { i0: cols.blocks[0]!.first, i1: cols.streets[blocksX]!.first, j0: rows.blocks[0]!.first, j1: rows.streets[blocksZ]!.first, draw: outlineDraw };

  // the four edge streets, from the lattice's outer lines (their bands by its hash); they run between the corner squares (1 to w - 1 and 1 to h - 1)
  const edge = (axis: "x" | "z", line: { first: number; bands: readonly CityStreetBand[] }, outer: CitySide): RawStreet => ({
    axis,
    across0: line.first,
    lo: 1,
    hi: (axis === "x" ? w : h) - 1,
    bands: line.bands,
    outer,
  });
  const edges: RawStreet[] = [edge("x", rows.streets[0]!, "-z"), edge("x", rows.streets[blocksZ]!, "+z"), edge("z", cols.streets[0]!, "-x"), edge("z", cols.streets[blocksX]!, "+x")];

  const misses: Record<string, number> = {};
  let last: SplitFailure | null = null;
  for (let draw = 0; draw <= BLOCK_DRAWS_MAX; draw++) {
    const { pieces, cuts } = cutOutline(seed, outline, draw);
    const streets = finishStreets([...edges, ...mergeCuts(cuts)]);
    const junctions = findJunctions(streets);
    const blocks = pieces.map((p) => ({ ...p }));
    const failures = held({ streets, junctions, blocks });
    if (failures.length > 0) {
      for (const f of new Set(failures.map((x) => x.rule))) misses[f] = (misses[f] ?? 0) + 1;
      last = failures[0]!;
      continue;
    }
    const planBlocks = layBlocks(pieces, streets, junctions);
    const cells = layCells(w, h, streets, junctions);
    return { layer: { stage: "streets", w, h, streets, cells, blocks: planBlocks, junctions, outline }, draw, misses };
  }
  const worst = Object.entries(misses).sort((p, q) => q[1] - p[1])[0];
  throw new CityStageError(
    `${worst?.[0] ?? "S4"}: no split of the ${blocksX} x ${blocksZ} ground held every rule in ${BLOCK_DRAWS_MAX + 1} draws (misses ${JSON.stringify(misses)}; last: ${last?.reason ?? "none"})`,
    [{ i: outline.i0, j: outline.j0 }],
  );
}
