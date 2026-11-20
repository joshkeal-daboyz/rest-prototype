/**
 * Stage 1's checks, run on the layer: street width (grammar rule 10), V1 and V2 (block variety), and on the split plan S1 to S5 (ticket 070 A4;
 * docs/design/070-streets-t-junctions.md, section 3). V1 and V2 are ported from `blockVariety` and `evaluateVariety` in `src/render3d/frontage.ts` with their
 * thresholds unchanged (V3 and V4 are stage 2's). S6 is stages 2 and 3's. Pure.
 */

import type { CityBlock, CityBlockSide, CityCell, CityJunction, CityPlanStreet, CitySide, CityStreet, CityStreetBand, CityStreetSection, CityStreetTraffic } from "../../core";
import { BLOCK_CV_MIN, BLOCK_MEAN_MIN_CELLS, BLOCK_NONSQUARE_MIN, BLOCK_TILES, CARRIAGE_M, JUNCTION_GAP_MIN_CELLS, KERB_BAY_SHARE_MAX, ONE_WAY_CARRIAGE_M, T_SHARE_MIN, TILE_M } from "./constants";

export type StreetsCheckId = "width" | "V1" | "V2";

/** What each check allows: how many of its parts may fail. */
export const STREETS_CHECK: Readonly<Record<StreetsCheckId, number>> = { width: 0, V1: 0, V2: 0 };

export interface StreetsVerdict {
  readonly id: StreetsCheckId;
  readonly value: number;
  readonly pass: boolean;
}

/** A street as the width check reads it. `section` and `flow` are absent on the old lattice's streets, which read as two-way (ticket 070 A4b). */
export type WidthStreetIn = CityStreet & Partial<CityStreetTraffic>;

type BandRow = readonly CityStreetBand[];
/** The cross-sections each section allows (A4b criterion 1), kerb to kerb across. */
export const SECTION_BANDS: Readonly<Record<CityStreetSection, readonly BandRow[]>> = {
  twoWay: [
    ["pavement", "parking", "lane", "lane", "pavement"],
    ["pavement", "lane", "lane", "parking", "pavement"],
  ],
  oneWay: [
    ["pavement", "parking", "lane", "pavement"],
    ["pavement", "lane", "parking", "pavement"],
  ],
  oneWayBare: [["pavement", "lane", "pavement"]],
};

/** The carriageway a section has, kerb to kerb, metres: 15 two-way, 10 or 5 one-way. */
export const carriageOfSection = (section: CityStreetSection): number => (section === "twoWay" ? CARRIAGE_M : section === "oneWay" ? ONE_WAY_CARRIAGE_M.parking : ONE_WAY_CARRIAGE_M.bare);

/**
 * Street width (grammar rule 10, and Josh's one-way sections): each street's `bands` are one of its section's shapes, its carriageway is the section's (15 m two-way; 10 m or 5 m one-way),
 * its `flow` is "both" exactly when it is two-way, and it is not an avenue. Each failure begins with the street's id.
 */
export function streetWidthFailures(layer: { readonly streets: readonly WidthStreetIn[] }): string[] {
  const out: string[] = [];
  for (const s of layer.streets) {
    if (s.profile !== "street") out.push(`${s.id} is an ${s.profile}`);
    const section = s.section ?? "twoWay";
    const want = carriageOfSection(section);
    const width = s.carriage.hi_m - s.carriage.lo_m;
    if (Math.abs(width - want) > 1e-9) out.push(`${s.id} carriageway is ${width} m, not ${want} m (${section})`);
    if (!SECTION_BANDS[section].some((b) => b.length === s.bands.length && b.every((x, k) => x === s.bands[k]))) out.push(`${s.id} bands [${s.bands.join(", ")}] are not a ${section} section`);
    if (((s.flow ?? "both") === "both") !== (section === "twoWay")) out.push(`${s.id} flow ${s.flow ?? "both"} does not match its section ${section}`);
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
export function evaluateStreets(layer: { readonly streets: readonly WidthStreetIn[]; readonly blocks: readonly Rect[] }): StreetsVerdict[] {
  const width = streetWidthFailures(layer).length;
  return [{ id: "width", value: width, pass: width <= STREETS_CHECK.width }, ...evaluateStreetsVariety(streetsVariety(layer))];
}

/** The cells of a block, for a failure's `cells` (its first cell). */
export const blockCorner = (b: { i0: number; j0: number }): CityCell => ({ i: b.i0, j: b.j0 });

// ---- S1 to S5 (the split plan) ----

type JunctionIn = Pick<CityJunction, "id" | "kind" | "streets" | "arms">;
type StreetIn = Pick<CityPlanStreet, "id" | "axis" | "across0" | "ends" | "bands">;

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
 * `JUNCTION_GAP_MIN_CELLS` apart (a street's centre line is the middle of its cross-section, so on streets of different widths it is not `across0`). Each failure names both streets.
 */
export function s3Failures(layer: { readonly streets: readonly StreetIn[]; readonly junctions: readonly JunctionIn[] }, gapMin: number = JUNCTION_GAP_MIN_CELLS): string[] {
  const centre2 = new Map(layer.streets.map((s) => [s.id, 2 * s.across0 + s.bands.length] as const)); // twice the centre line, in cells
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
        const gap = Math.abs(centre2.get(p.ending)! - centre2.get(q.ending)!) / 2;
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

// ---- S7 to S10 (one-way streets; ticket 070 A4b) ----

type TrafficStreet = Pick<CityPlanStreet, "id" | "axis" | "span" | "across0" | "section" | "flow" | "outer">;

/** The junctions along each street, in order along its axis (by the low corner of each junction). */
function junctionsAlong(streets: readonly Pick<CityPlanStreet, "id" | "axis">[], junctions: readonly Pick<CityJunction, "id" | "cells" | "streets">[]): Map<string, { pos: number; id: string }[]> {
  const axisOf = new Map(streets.map((s) => [s.id, s.axis] as const));
  const out = new Map<string, { pos: number; id: string }[]>();
  for (const j of junctions) {
    for (const m of j.streets) {
      const c = j.cells[0]!;
      const list = out.get(m.street) ?? [];
      list.push({ pos: axisOf.get(m.street) === "x" ? c.i : c.j, id: j.id });
      out.set(m.street, list);
    }
  }
  for (const list of out.values()) list.sort((p, q) => p.pos - q.pos);
  return out;
}

/**
 * S7: every junction reaches every other. The junction graph has an edge for each street stretch between two junctions in a row, both ways on a two-way street and with the flow on a one-way
 * street; it must be strongly connected (one search forwards and one backwards from the first junction, linear in junctions). Each failure names the junction. Also (A4b criterion 9) every junction
 * has at least one arm that traffic enters by and one it leaves by.
 */
export function s7Failures(layer: {
  readonly streets: readonly Pick<CityPlanStreet, "id" | "axis" | "flow">[];
  readonly junctions: readonly Pick<CityJunction, "id" | "cells" | "streets" | "arms">[];
}): string[] {
  const out: string[] = [];
  const flowOf = new Map(layer.streets.map((s) => [s.id, s.flow] as const));
  const axisOf = new Map(layer.streets.map((s) => [s.id, s.axis] as const));
  const fwd = new Map<string, string[]>();
  const back = new Map<string, string[]>();
  for (const j of layer.junctions) {
    fwd.set(j.id, []);
    back.set(j.id, []);
  }
  const link = (a: string, b: string): void => {
    fwd.get(a)!.push(b);
    back.get(b)!.push(a);
  };
  for (const [street, list] of junctionsAlong(layer.streets, layer.junctions)) {
    const flow = flowOf.get(street);
    for (let k = 0; k + 1 < list.length; k++) {
      if (flow !== "-") link(list[k]!.id, list[k + 1]!.id);
      if (flow !== "+") link(list[k + 1]!.id, list[k]!.id);
    }
  }
  const reach = (adj: Map<string, string[]>, from: string): Set<string> => {
    const seen = new Set([from]);
    const stack = [from];
    for (let n = stack.pop(); n !== undefined; n = stack.pop()) {
      for (const m of adj.get(n) ?? []) {
        if (!seen.has(m)) {
          seen.add(m);
          stack.push(m);
        }
      }
    }
    return seen;
  };
  if (layer.junctions.length > 0) {
    const first = layer.junctions[0]!.id;
    const forwards = reach(fwd, first);
    const backwards = reach(back, first);
    for (const j of layer.junctions) {
      if (!forwards.has(j.id)) out.push(`${j.id}: not reachable from ${first} (S7: every junction reaches every other)`);
      else if (!backwards.has(j.id)) out.push(`${j.id}: cannot reach ${first} (S7: every junction reaches every other)`);
    }
  }
  for (const j of layer.junctions) {
    let enter = 0;
    let leave = 0;
    for (const arm of j.arms) {
      const street = j.streets.find((m) => axisOf.get(m.street) === axisOfSide(arm))?.street;
      const flow = street === undefined ? "both" : (flowOf.get(street) ?? "both");
      const high = arm === "+x" || arm === "+z";
      if (flow === "both" || (high ? flow === "-" : flow === "+")) enter++;
      if (flow === "both" || (high ? flow === "+" : flow === "-")) leave++;
    }
    if (enter === 0 || leave === 0) out.push(`${j.id}: no arm traffic ${enter === 0 ? "enters" : "leaves"} by (S7)`);
  }
  return out;
}

/** S8: the four edge streets are two-way (they stay 5 cells, so the outline does not move). Each failure names the street. */
export function s8Failures(streets: readonly Pick<CityPlanStreet, "id" | "outer" | "section" | "flow">[]): string[] {
  const out: string[] = [];
  for (const s of streets) if (s.outer !== null && (s.section !== "twoWay" || s.flow !== "both")) out.push(`${s.id}: an edge street is ${s.section} (${s.flow}), not two-way (S8)`);
  return out;
}

/**
 * The pairs of one-way streets that are next to each other on a line straight across their axis's streets (a lattice column for the x streets, a row for the z streets): consecutive in the order
 * the line crosses the axis's streets, with no street between them. A line does not cross a street where another street crosses or ends on it (on that street's cells the line runs along it, and it is between them).
 * Each pair once, the street with the lower `across0` first.
 */
export function oneWayNeighbours<S extends TrafficStreet & Pick<CityPlanStreet, "bands">>(streets: readonly S[], junctions: readonly Pick<CityJunction, "cells" | "streets">[]): [S, S][] {
  // the cells of the other street's cross-section, on each street that meets it in a junction (the line is there along the other street)
  const byId = new Map(streets.map((s) => [s.id, s] as const));
  const inJunction = new Map<string, Set<number>>();
  for (const j of junctions) {
    for (const m of j.streets) {
      const other = byId.get(j.streets.find((o) => o.street !== m.street)?.street ?? "");
      if (!other) continue;
      const set = inJunction.get(m.street) ?? new Set<number>();
      for (let p = other.across0; p < other.across0 + other.bands.length; p++) set.add(p);
      inJunction.set(m.street, set);
    }
  }
  const found = new Map<string, [S, S]>();
  for (const axis of ["x", "z"] as const) {
    const mine = streets.filter((s) => s.axis === axis).sort((p, q) => p.across0 - q.across0 || p.span.lo - q.span.lo);
    const lines = new Map<number, S[]>();
    for (const s of mine) {
      const skip = inJunction.get(s.id);
      for (let p = s.span.lo; p < s.span.hi; p++) {
        if (skip?.has(p)) continue;
        const list = lines.get(p);
        if (list) list.push(s);
        else lines.set(p, [s]);
      }
    }
    for (const list of lines.values()) {
      for (let k = 0; k + 1 < list.length; k++) {
        const a = list[k]!;
        const b = list[k + 1]!;
        if (a.section !== "twoWay" && b.section !== "twoWay" && !found.has(`${a.id}|${b.id}`)) found.set(`${a.id}|${b.id}`, [a, b]);
      }
    }
  }
  return [...found.values()];
}

/**
 * S9 (Josh: "there should always be a two way or one way street in the opposite direction between two one ways that share the same direction"): on every line straight across one axis's streets,
 * in the order the line crosses them, no two one-way streets with the same `flow` are next to each other (`oneWayNeighbours`). Each failure names both streets. Linear in cells.
 */
export function s9Failures(layer: { readonly streets: readonly (TrafficStreet & Pick<CityPlanStreet, "bands">)[]; readonly junctions: readonly Pick<CityJunction, "cells" | "streets">[] }): string[] {
  const out: string[] = [];
  for (const [a, b] of oneWayNeighbours(layer.streets, layer.junctions)) {
    if (a.flow === b.flow) out.push(`${a.id} and ${b.id}: one-way streets next to each other, both ${a.flow}, with no street between them the other way (S9)`);
  }
  return out;
}

/**
 * Whether the street along a block's `side` has its parking band on the block's side of the street (the block's own band). `bands` run along +z for an "x" street's rows and against +x for a "z"
 * street's columns (`bandIndex` in split.ts). A block's "+z" side has its street at higher j, whose first row touches the block, so the band next to the block is bands[1]; "-z", "+x" (a "z" street at
 * higher i, whose first column is its last band) take bands[n - 2], and "-x" takes bands[1]. A street too narrow for parking (3 cells) has none.
 */
export function ownBand(street: Pick<CityPlanStreet, "bands">, side: CitySide): boolean {
  const n = street.bands.length;
  return street.bands[side === "+z" || side === "-x" ? 1 : n - 2] === "parking";
}

export interface S10Violation {
  readonly block: string;
  readonly street: string;
}

type BlockSidesIn = { readonly id: string; readonly sides: { readonly [S in CitySide]: Pick<CityBlockSide, "street"> } };

/**
 * S10 (Josh: "yes, the recommended"): a bare one-way street leaves every block along it a parking band of its own on another side (a side whose street's parking band is on that block's side).
 * Returns the blocks and the bare streets that break it.
 */
export function s10Violations(layer: { readonly streets: readonly Pick<CityPlanStreet, "id" | "section" | "bands">[]; readonly blocks: readonly BlockSidesIn[] }): S10Violation[] {
  const byId = new Map(layer.streets.map((s) => [s.id, s] as const));
  const out: S10Violation[] = [];
  for (const b of layer.blocks) {
    const sides = (["-x", "+x", "-z", "+z"] as const).map((side) => ({ side, street: byId.get(b.sides[side].street)! }));
    for (const own of sides) {
      if (own.street.section !== "oneWayBare") continue;
      const another = sides.some((o) => o.side !== own.side && ownBand(o.street, o.side));
      if (!another && !out.some((v) => v.block === b.id && v.street === own.street.id)) out.push({ block: b.id, street: own.street.id });
    }
  }
  return out;
}

export const s10Failures = (layer: Parameters<typeof s10Violations>[0]): string[] => s10Violations(layer).map((v) => `${v.block}: its only own parking band is on the bare one-way street ${v.street} (S10)`);

export interface SplitFailure {
  readonly rule: "S1" | "S3" | "S4" | "S5" | "S7" | "S8" | "S9" | "S10" | "V1" | "V2";
  readonly reason: string;
}

/** What a draw is held to before it is taken: S1, S3, S4's sizes, S5, S7 to S9, and V1 and V2 over the blocks (S10 is held on the blocks' sides, after them). Empty when it holds. */
export function splitFailures(layer: {
  readonly streets: readonly (StreetIn & TrafficStreet)[];
  readonly junctions: readonly (JunctionIn & Pick<CityJunction, "inner" | "cells">)[];
  readonly blocks: readonly NamedRect[];
}): SplitFailure[] {
  const out: SplitFailure[] = [];
  for (const reason of s1Failures(layer)) out.push({ rule: "S1", reason });
  for (const reason of s3Failures(layer)) out.push({ rule: "S3", reason });
  for (const reason of blockSizeFailures(layer.blocks)) out.push({ rule: "S4", reason });
  for (const reason of s5Failures(layer.junctions)) out.push({ rule: "S5", reason });
  for (const reason of s7Failures(layer)) out.push({ rule: "S7", reason });
  for (const reason of s8Failures(layer.streets)) out.push({ rule: "S8", reason });
  for (const reason of s9Failures(layer)) out.push({ rule: "S9", reason });
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
