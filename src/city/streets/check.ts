/**
 * Stage 1's checks, run on the layer: street width (grammar rule 10), V1 and V2 (block variety), and on the split plan S1 to S5 (ticket 070 A4;
 * docs/design/070-streets-t-junctions.md, section 3). V1 and V2 are ported from `blockVariety` and `evaluateVariety` in `src/render3d/frontage.ts` with their
 * thresholds unchanged (V3 and V4 are stage 2's). S6 is stages 2 and 3's. Pure.
 */

import type { CityBlock, CityCell, CityJunction, CityPlanStreet, CitySide, CityStreet } from "../../core";
import { BLOCK_CV_MIN, BLOCK_MEAN_MIN_CELLS, BLOCK_NONSQUARE_MIN, BLOCK_TILES, CARRIAGE_M, JUNCTION_GAP_MIN_CELLS, KERB_BAY_SHARE_MAX, T_SHARE_MIN, TILE_M } from "./constants";

export type StreetsCheckId = "width" | "V1" | "V2";

/** What each check allows: how many of its parts may fail. */
export const STREETS_CHECK: Readonly<Record<StreetsCheckId, number>> = { width: 0, V1: 0, V2: 0 };

export interface StreetsVerdict {
  readonly id: StreetsCheckId;
  readonly value: number;
  readonly pass: boolean;
}

/** Street width: the streets whose carriageway is not `CARRIAGE_M` across, or that are an avenue. */
export function streetWidthFailures(layer: { readonly streets: readonly CityStreet[] }): string[] {
  const out: string[] = [];
  for (const s of layer.streets) {
    if (s.profile !== "street") out.push(`${s.id} is an ${s.profile}`);
    const width = s.carriage.hi_m - s.carriage.lo_m;
    if (Math.abs(width - CARRIAGE_M) > 1e-9) out.push(`${s.id} carriageway is ${width} m, not ${CARRIAGE_M} m`);
  }
  return out;
}

export interface StreetsVariety {
  readonly blocks: number;
  /** V1 reworded (20 Nov 2026): the widths (along x) and the depths (along z) of all the blocks, in cells, one each per block, in the order of the blocks. */
  readonly widths: readonly number[];
  readonly depths: readonly number[];
  readonly cvX: number;
  readonly cvZ: number;
  /** Distinct footprints, and how many V1 asks for: ceil(blocks / 2). */
  readonly footprints: number;
  readonly footprintsNeeded: number;
  readonly square: number;
  readonly nonSquareShare: number;
}

const cvOf = (a: readonly number[]): number => {
  if (a.length < 2) return 0;
  const m = a.reduce((x, y) => x + y, 0) / a.length;
  return m > 0 ? Math.sqrt(a.reduce((x, y) => x + (y - m) ** 2, 0) / a.length) / m : 0;
};

type Rect = Pick<CityBlock, "i0" | "i1" | "j0" | "j1">;
type NamedRect = Rect & { readonly id?: string };

/** The numbers behind V1 and V2, read from the blocks' cells alone (never from the code that drew the sizes). Over all blocks, not one per column and row. */
export function streetsVariety(layer: { readonly blocks: readonly Rect[] }): StreetsVariety {
  const widths: number[] = [];
  const depths: number[] = [];
  const shapes = new Set<string>();
  let square = 0;
  for (const b of layer.blocks) {
    const w = b.i1 - b.i0;
    const d = b.j1 - b.j0;
    widths.push(w);
    depths.push(d);
    shapes.add(`${Math.min(w, d)}x${Math.max(w, d)}`);
    if (w === d) square++;
  }
  const n = layer.blocks.length;
  return {
    blocks: n,
    widths,
    depths,
    cvX: cvOf(widths),
    cvZ: cvOf(depths),
    footprints: shapes.size,
    footprintsNeeded: Math.ceil(n / 2),
    square,
    nonSquareShare: n > 0 ? (n - square) / n : 0,
  };
}

/** V1 and V2 against `STREETS_CHECK`. A layer with no blocks fails both (value 1). */
export function evaluateStreetsVariety(m: StreetsVariety): StreetsVerdict[] {
  const cvLow = (axis: readonly number[], cv: number): number => (axis.length >= 2 && cv < BLOCK_CV_MIN - 1e-9 ? 1 : 0);
  const v1 = cvLow(m.widths, m.cvX) + cvLow(m.depths, m.cvZ) + (m.footprints < m.footprintsNeeded ? 1 : 0) + (m.blocks === 0 ? 1 : 0);
  const allowed = Math.floor(m.blocks * (1 - BLOCK_NONSQUARE_MIN) + 1e-9);
  const v2 = Math.max(0, m.square - allowed) + (m.blocks === 0 ? 1 : 0);
  return [
    { id: "V1", value: v1, pass: v1 <= STREETS_CHECK.V1 },
    { id: "V2", value: v2, pass: v2 <= STREETS_CHECK.V2 },
  ];
}

/** Street width, V1 and V2 on a layer. */
export function evaluateStreets(layer: { readonly streets: readonly CityStreet[]; readonly blocks: readonly Rect[] }): StreetsVerdict[] {
  const width = streetWidthFailures(layer).length;
  return [{ id: "width", value: width, pass: width <= STREETS_CHECK.width }, ...evaluateStreetsVariety(streetsVariety(layer))];
}

/** The cells of a block, for a failure's `cells` (its first cell). */
export const blockCorner = (b: { i0: number; j0: number }): CityCell => ({ i: b.i0, j: b.j0 });

// ---- S1 to S5 (the split plan) ----

type JunctionIn = Pick<CityJunction, "id" | "kind" | "streets" | "arms">;
type StreetIn = Pick<CityPlanStreet, "id" | "axis" | "across0" | "ends">;

const axisOfSide = (s: CitySide): "x" | "z" => (s === "+x" || s === "-x" ? "x" : "z");

/**
 * S1: every street ends on a street. Each street's two ends name junctions that exist and list the street with `passes` false, and each junction's `streets`
 * and `arms` agree with its `kind` (corner: two ending, 2 arms; T: one passing, one ending, 3 arms; crossroads: two passing, 4 arms). Each failure begins with the street's (or junction's) id.
 */
export function s1Failures(layer: { readonly streets: readonly StreetIn[]; readonly junctions: readonly JunctionIn[] }): string[] {
  const out: string[] = [];
  const byId = new Map(layer.junctions.map((j) => [j.id, j] as const));
  for (const s of layer.streets) {
    s.ends.forEach((e, k) => {
      const j = byId.get(e.junction);
      if (!j) out.push(`${s.id}: its ${k === 0 ? "low" : "high"} end names junction ${e.junction}, which does not exist (S1: every street ends on a street)`);
      else if (!j.streets.some((m) => m.street === s.id && !m.passes)) out.push(`${s.id}: junction ${j.id} does not list it as ending there (S1)`);
    });
  }
  for (const j of layer.junctions) {
    const passing = j.streets.filter((m) => m.passes).length;
    const ending = j.streets.length - passing;
    const want = j.kind === "corner" ? { passing: 0, ending: 2, arms: 2 } : j.kind === "T" ? { passing: 1, ending: 1, arms: 3 } : { passing: 2, ending: 0, arms: 4 };
    if (j.streets.length !== 2 || passing !== want.passing || ending !== want.ending || j.arms.length !== want.arms) {
      out.push(`${j.id}: a ${j.kind} has ${want.passing} passing, ${want.ending} ending and ${want.arms} arms, not ${passing}, ${ending} and ${j.arms.length} (S1)`);
    }
  }
  return out;
}

/** The ending street of a T, its through street and the side of the junction the ending street leaves by; null when `j` is not a well-formed T. */
export function tOf(j: JunctionIn): { through: string; ending: string; arm: CitySide } | null {
  if (j.kind !== "T" || j.streets.length !== 2) return null;
  const through = j.streets.find((m) => m.passes);
  const ending = j.streets.find((m) => !m.passes);
  if (!through || !ending) return null;
  // the through street leaves by the two arms on one axis; the ending street's arm is the one alone on its axis
  const arm = j.arms.find((a) => j.arms.filter((b) => axisOfSide(b) === axisOfSide(a)).length === 1);
  return arm ? { through: through.street, ending: ending.street, arm } : null;
}

/**
 * S3: two streets that end on the same street from opposite sides either line up (one street, so a crossroads) or have centre lines at least
 * `JUNCTION_GAP_MIN_CELLS` apart. Each failure names both streets.
 */
export function s3Failures(layer: { readonly streets: readonly StreetIn[]; readonly junctions: readonly JunctionIn[] }, gapMin: number = JUNCTION_GAP_MIN_CELLS): string[] {
  const across0 = new Map(layer.streets.map((s) => [s.id, s.across0] as const));
  // the Ts by through street; only Ts on one street can meet S3, so only those are paired (in the order of the junctions, as a scan over all pairs would)
  const onStreet = new Map<string, { t: NonNullable<ReturnType<typeof tOf>>; n: number }[]>();
  let n = 0;
  for (const j of layer.junctions) {
    const t = tOf(j);
    if (!t) continue;
    const list = onStreet.get(t.through);
    if (list) list.push({ t, n });
    else onStreet.set(t.through, [{ t, n }]);
    n++;
  }
  const found: { a: number; b: number; reason: string }[] = [];
  for (const list of onStreet.values()) {
    for (let a = 0; a < list.length; a++) {
      for (let b = a + 1; b < list.length; b++) {
        const p = list[a]!.t;
        const q = list[b]!.t;
        if (p.arm === q.arm) continue;
        const gap = Math.abs(across0.get(p.ending)! - across0.get(q.ending)!);
        if (gap < gapMin) found.push({ a: list[a]!.n, b: list[b]!.n, reason: `${p.ending} and ${q.ending}: end on ${p.through} from opposite sides ${gap} cells apart, under ${gapMin} (S3: line up or keep apart)` });
      }
    }
  }
  const out = found.sort((p, q) => p.a - q.a || p.b - q.b).map((f) => f.reason);
  return out;
}

/** S5: the share of the junctions with `inner` true that are Ts (1 when none is inner: nothing to complain of). */
export function innerTShare(junctions: readonly Pick<CityJunction, "kind" | "inner">[]): number {
  const inner = junctions.filter((j) => j.inner);
  return inner.length === 0 ? 1 : inner.filter((j) => j.kind === "T").length / inner.length;
}

/** S5: at least `T_SHARE_MIN` of the inner junctions are Ts. */
export function s5Failures(junctions: readonly Pick<CityJunction, "kind" | "inner">[], shareMin: number = T_SHARE_MIN): string[] {
  const share = innerTShare(junctions);
  return share + 1e-9 >= shareMin ? [] : [`S5: ${(share * 100).toFixed(0)}% of the inner junctions are Ts, under ${(shareMin * 100).toFixed(0)}%`];
}

/** The longer side a block must have: one tile of kerbside bays must fit a street side's share cap (056's P3), so 7 cells. */
export const BLOCK_LONG_ENOUGH_CELLS = Math.ceil((2 * TILE_M) / KERB_BAY_SHARE_MAX.street / TILE_M - 1e-9);

/**
 * S4's sizes, over the blocks: every side 6 to 16 cells, every block's longer side at least `BLOCK_LONG_ENOUGH_CELLS` (`blockSizesWork`'s first test), and the mean width and the mean depth
 * each at least `BLOCK_MEAN_MIN_CELLS` (its second). Each per-block failure begins with the block's id where it has one.
 */
export function blockSizeFailures(blocks: readonly NamedRect[]): string[] {
  const out: string[] = [];
  const name = (b: NamedRect): string => b.id ?? `block at (${b.i0}, ${b.j0})`;
  for (const b of blocks) {
    const w = b.i1 - b.i0;
    const d = b.j1 - b.j0;
    if (w < BLOCK_TILES.min || w > BLOCK_TILES.max || d < BLOCK_TILES.min || d > BLOCK_TILES.max) out.push(`${name(b)}: ${w} by ${d} cells, a side outside ${BLOCK_TILES.min} to ${BLOCK_TILES.max} (S4)`);
    else if (Math.max(w, d) < BLOCK_LONG_ENOUGH_CELLS) out.push(`${name(b)}: ${w} by ${d} cells, no side of ${BLOCK_LONG_ENOUGH_CELLS} (S4, blockSizesWork)`);
  }
  if (blocks.length > 0) {
    const mean = (f: (b: Rect) => number): number => blocks.reduce((s, b) => s + f(b), 0) / blocks.length;
    if (mean((b) => b.i1 - b.i0) < BLOCK_MEAN_MIN_CELLS) out.push(`S4: the mean block width is under ${BLOCK_MEAN_MIN_CELLS} cells`);
    if (mean((b) => b.j1 - b.j0) < BLOCK_MEAN_MIN_CELLS) out.push(`S4: the mean block depth is under ${BLOCK_MEAN_MIN_CELLS} cells`);
  }
  return out;
}

export interface SplitFailure {
  readonly rule: "S1" | "S3" | "S4" | "S5" | "V1" | "V2";
  readonly reason: string;
}

/** What a draw is held to before it is taken: S1, S3, S4's sizes, S5, and V1 and V2 over the blocks. Empty when it holds. */
export function splitFailures(layer: {
  readonly streets: readonly StreetIn[];
  readonly junctions: readonly (JunctionIn & Pick<CityJunction, "inner">)[];
  readonly blocks: readonly NamedRect[];
}): SplitFailure[] {
  const out: SplitFailure[] = [];
  for (const reason of s1Failures(layer)) out.push({ rule: "S1", reason });
  for (const reason of s3Failures(layer)) out.push({ rule: "S3", reason });
  for (const reason of blockSizeFailures(layer.blocks)) out.push({ rule: "S4", reason });
  for (const reason of s5Failures(layer.junctions)) out.push({ rule: "S5", reason });
  for (const v of evaluateStreetsVariety(streetsVariety(layer))) if (!v.pass) out.push({ rule: v.id as "V1" | "V2", reason: `${v.id}: block sizes fail the variety rule (value ${v.value})` });
  return out;
}

/** Every lattice cell is a street cell or in exactly one block (S4). `cells` are the street cells. Returns the problems, empty when sound. */
export function coverageProblems(layer: { readonly w: number; readonly h: number; readonly cells: readonly CityCell[]; readonly blocks: readonly Rect[] }): string[] {
  const seen = new Uint8Array(layer.w * layer.h);
  const out: string[] = [];
  const mark = (i: number, j: number, what: string): void => {
    if (i < 0 || j < 0 || i >= layer.w || j >= layer.h) out.push(`${what} at (${i}, ${j}) is outside the lattice`);
    else {
      const k = j * layer.w + i;
      if (seen[k]! > 0) out.push(`${what} at (${i}, ${j}) is covered twice`);
      seen[k] = 1;
    }
  };
  for (const c of layer.cells) mark(c.i, c.j, "street cell");
  for (const b of layer.blocks) for (let j = b.j0; j < b.j1; j++) for (let i = b.i0; i < b.i1; i++) mark(i, j, "block cell");
  for (let k = 0; k < seen.length; k++) if (seen[k] === 0) out.push(`cell (${k % layer.w}, ${Math.floor(k / layer.w)}) is neither a street nor in a block`);
  return out;
}
