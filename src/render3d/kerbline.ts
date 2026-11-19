/**
 * The kerb line of the tile city (ticket 063 F; Josh, 19 Nov 2026: "It's ok to have curbs that stretch out like this in spots but the curb structures have to follow the crub.", and, of an inlet between two buildings, "Here is an
 * example of how the curbs may flow in this case scenario": the street kerb turns in at a corner on each side of the opening and runs along that side to the building line). Pure: no three, no DOM, no assets.
 *
 * Two parts.
 * - `kerbLine(city)` is the kerb as it should run, in plan, on the cell edges (metres): one path for each stretch of walk along each street side, from the corner at one end to the corner at the other. It runs along the pavement band's
 *   carriageway edge; steps out round every stretch of build-outs (out along the first build-out's flank, along its outer edge, and back along the last flank); and at every kerb cut (an inlet: a court drive, a frontage lot, an alley's
 *   mouth) turns in at a return on each side, runs along that side of the opening to the building line (the pavement's back edge), crosses the opening (marked `opening`: no kerb) and comes out the same way on the far side. The mouth's edge on
 *   the street, between the two returns, is the `dip`.
 * - `tileKerbPlan(city, keyOf)` is what the drawing puts on that line: every kerb face a pack piece brings with it (a pavement or build-out cell's, at the inset `KERB_FACES_M` measured) and every code-drawn strip: the flanks of
 *   build-outs, the returns of inlets, and a fallback strip for a cell with no piece. Each face is a segment in plan, with the way to the walk and the height of its lip.
 *
 * The pack's sidewalk piece has its kerb face 0.66 m inside the cell's edge, not on it, and no face on its ends; a code strip has its face on the line it is given, at the same inset where it continues a pack face (the flanks start and
 * end on the pack faces' ends) and on the cell edge where it stands alone (a return, along a mouth's side, from the street kerb face to the building line).
 */

import type { CalibrationKey } from "../core";
import { PAVEMENT_FLUSH, PAVEMENT_RETURN_FAR, PAVEMENT_RETURN_NEAR, TILE_M, type TileCell, type TileCity } from "./tilecity";
import { KERB_FACES_M, KERB_GAP_MAX_M, KERB_HEIGHT_TOL_M, KERB_INSET_M, KERB_LIP_TOP_M, KERB_TOL_M } from "./tileslots";

// The tolerances live in tileslots.ts with the pack's kerb numbers (the style guide's drift test reads that file); the kerb line's users take them from here.
export { KERB_GAP_MAX_M, KERB_HEIGHT_TOL_M, KERB_TOL_M };

/** A point in plan, metres. */
export interface Mp {
  x: number;
  z: number;
}

/** What a stretch of the kerb path is: `edge` (a cell's carriageway edge), `dip` (a kerb cut's, beside the returns, not on the path's chain), `flank` (the side of a build-out), `return` (the side of an opening) or `opening` (across the opening at the building line: no kerb). */
export type KerbSegKind = "edge" | "dip" | "flank" | "return" | "opening";

export interface KerbSeg {
  kind: KerbSegKind;
  a: Mp;
  b: Mp;
  /** The unit vector, in plan, from the kerb line toward the walk: across the street for an edge or a dip, along it for a flank or a return (an opening has none, 0 0). */
  walk: Mp;
  /** The cell that carries this stretch: an edge's pavement or build-out cell, a dip's kerb-cut cell, a return's pavement cell on that side (null where there is none); null for a flank and an opening. */
  cell: { i: number; j: number } | null;
  /** An edge along a build-out: the pavement cell under it, whose own carriageway edge is one cell in (it is flush when `PAVEMENT_FLUSH` is set, and has a kerb and a gutter when not). */
  under: { i: number; j: number } | null;
  /** A return: which side of its inlet it is on, in the direction the path runs (null for every other stretch). */
  which: "near" | "far" | null;
}

export interface KerbReturn {
  inlet: string;
  /** Where the return meets the street edge, on the cell edges (the cell edge of the pavement band's carriageway side). */
  at: Mp;
  side: "near" | "far";
}

export interface KerbPath {
  /** `<street>|<side>|<first cell along the street>`. */
  id: string;
  street: string;
  /** `Kerb.side` of the pavement the path is on. */
  side: 1 | -1;
  /** The unit vector across the street, from the carriageway toward the walk. */
  across: Mp;
  /** The path in order, the dips after the opening they belong to. */
  segs: readonly KerbSeg[];
  /** The chain of the path's vertices, in order: every segment but the dips. */
  points: readonly Mp[];
  /** The dipped mouth's edge on the street, between the two returns: one per inlet, its two ends on the returns. */
  dips: readonly { inlet: string; a: Mp; b: Mp }[];
  /** The index ranges into `points` (start, end) of the segments that cross an opening. */
  openings: readonly (readonly [number, number])[];
  returns: readonly KerbReturn[];
}

interface Grid {
  w: number;
  h: number;
  cells: (TileCell | null)[];
}

function gridOf(city: Pick<TileCity, "cells">): Grid {
  let w = 0;
  let h = 0;
  const across = (c: TileCell): boolean => c.cells === 2 && (c.yaw === 0 || c.yaw === 180);
  // (A cell off the grid, a fixture with a cell on row -3, is on no street: it is left out.)
  const cellsOn = city.cells.filter((c) => c.i >= 0 && c.j >= 0);
  for (const c of cellsOn) {
    w = Math.max(w, c.i + 1 + (across(c) ? 1 : 0));
    h = Math.max(h, c.j + 1 + (c.cells === 2 && !across(c) ? 1 : 0));
  }
  const cells = new Array<TileCell | null>(w * h).fill(null);
  for (const c of cellsOn) {
    cells[c.j * w + c.i] = c;
    if (c.cells === 2) cells[across(c) ? c.j * w + c.i + 1 : (c.j + 1) * w + c.i] = c;
  }
  return { w, h, cells };
}

const cellAt = (g: Grid, i: number, j: number): TileCell | null => (i < 0 || j < 0 || i >= g.w || j >= g.h ? null : (g.cells[j * g.w + i] ?? null));

/** The kerb of the city as it should run, in plan on the cell edges: see the file's header. Pure. */
export function kerbLine(city: Pick<TileCity, "cells" | "streets">): KerbPath[] {
  const g = gridOf(city);
  const paths: KerbPath[] = [];
  for (const s of city.streets) {
    const n = s.bands.length;
    for (const k of [0, n - 1]) {
      const alongX = s.axis === "x";
      // The pavement band's cell row (an "x" street) or column (a "z" street), and the step from it toward the carriageway, in cells across the street.
      const a = alongX ? s.across0 + k : s.across0 + n - 1 - k;
      const sigma: 1 | -1 = alongX ? (k === 0 ? 1 : -1) : k === 0 ? -1 : 1;
      const centreSign = ((a + 0.5) * TILE_M > s.centre_m ? 1 : -1) as 1 | -1;
      const side: 1 | -1 = (alongX ? centreSign : -centreSign) > 0 ? 1 : -1;
      const E0 = (a + (sigma > 0 ? 1 : 0)) * TILE_M;
      const E1 = E0 + sigma * TILE_M;
      const Bl = E0 - sigma * TILE_M;
      const P = (sAlong: number, v: number): Mp => (alongX ? { x: sAlong, z: v } : { x: v, z: sAlong });
      const alongUnit = (d: 1 | -1): Mp => (alongX ? { x: d, z: 0 } : { x: 0, z: d });
      const acrossWalk: Mp = alongX ? { x: 0, z: -sigma } : { x: -sigma, z: 0 };
      const len = alongX ? g.w : g.h;
      const pav = (t: number): TileCell | null => {
        const c = alongX ? cellAt(g, t, a) : cellAt(g, a, t);
        return c !== null && (c.role === "pavement" || c.role === "kerbCut") ? c : null;
      };
      const beyond = (t: number, steps: number): TileCell | null => (alongX ? cellAt(g, t, a + sigma * steps) : cellAt(g, a + sigma * steps, t));

      type Cls = { k: "edge" | "deep" | "mouth"; cell: TileCell; face: TileCell };
      const classOf = (t: number): Cls => {
        const c = pav(t)!;
        if (c.role === "kerbCut") return { k: "mouth", cell: c, face: c };
        const n1 = beyond(t, 1);
        return n1 !== null && n1.role === "buildout" ? { k: "deep", cell: c, face: n1 } : { k: "edge", cell: c, face: c };
      };

      for (let t0 = 0; t0 < len; t0++) {
        if (pav(t0) === null || (t0 > 0 && pav(t0 - 1) !== null)) continue;
        let t1 = t0;
        while (t1 < len && pav(t1) !== null) t1++;
        const cls: Cls[] = [];
        for (let t = t0; t < t1; t++) cls.push(classOf(t));
        const at = (t: number): Cls | null => (t < t0 || t >= t1 ? null : cls[t - t0]!);
        const vOf = (c: Cls | null): number => (c !== null && c.k === "deep" ? E1 : E0);
        const segs: KerbSeg[] = [];
        const returns: KerbReturn[] = [];
        const dips: { inlet: string; a: Mp; b: Mp }[] = [];
        const cellRef = (c: TileCell | null): { i: number; j: number } | null => (c === null ? null : { i: c.i, j: c.j });
        const pathId = `${s.id}|${side}|${t0}`;
        let mouthFrom = -1;
        let mouthId = "";
        for (let kk = t0; kk <= t1; kk++) {
          const before = at(kk - 1);
          const after = at(kk);
          const sAt = kk * TILE_M;
          const beforeMouth = before !== null && before.k === "mouth";
          const afterMouth = after !== null && after.k === "mouth";
          if (!beforeMouth && afterMouth) {
            // The near return: from the street edge (or the flank's end) in along the mouth's near side to the building line.
            const v = vOf(before);
            mouthFrom = kk;
            mouthId = `${pathId}|${after!.cell.i},${after!.cell.j}`;
            returns.push({ inlet: mouthId, at: P(sAt, E0), side: "near" });
            segs.push({ kind: "return", a: P(sAt, v), b: P(sAt, Bl), walk: alongUnit(-1), cell: before !== null ? cellRef(before.cell) : null, under: null, which: "near" });
          } else if (beforeMouth && !afterMouth) {
            // The opening, and the far return back out.
            segs.push({ kind: "opening", a: P(mouthFrom * TILE_M, Bl), b: P(sAt, Bl), walk: { x: 0, z: 0 }, cell: null, under: null, which: null });
            segs.push({ kind: "return", a: P(sAt, Bl), b: P(sAt, vOf(after)), walk: alongUnit(1), cell: after !== null ? cellRef(after.cell) : null, under: null, which: "far" });
            returns.push({ inlet: mouthId, at: P(sAt, E0), side: "far" });
            dips.push({ inlet: mouthId, a: P(mouthFrom * TILE_M, E0), b: P(sAt, E0) });
            for (let t = mouthFrom; t < kk; t++) segs.push({ kind: "dip", a: P(t * TILE_M, E0), b: P((t + 1) * TILE_M, E0), walk: acrossWalk, cell: cellRef(at(t)!.cell), under: null, which: null });
          } else if (!beforeMouth && !afterMouth && vOf(before) !== vOf(after)) {
            segs.push({ kind: "flank", a: P(sAt, vOf(before)), b: P(sAt, vOf(after)), walk: alongUnit(after !== null && after.k === "deep" ? 1 : -1), cell: null, under: null, which: null });
          }
          if (kk < t1 && after !== null && after.k !== "mouth") {
            segs.push({
              kind: "edge",
              a: P(sAt, vOf(after)),
              b: P(sAt + TILE_M, vOf(after)),
              walk: acrossWalk,
              cell: cellRef(after.face),
              under: after.k === "deep" ? cellRef(after.cell) : null,
              which: null,
            });
          }
        }
        // The chain of vertices (the dips are not on it) and the openings' indices into it.
        const chain = segs.filter((q) => q.kind !== "dip");
        const points: Mp[] = chain.length > 0 ? [chain[0]!.a, ...chain.map((q) => q.b)] : [];
        const openings: [number, number][] = [];
        chain.forEach((q, idx) => {
          if (q.kind === "opening") openings.push([idx, idx + 1]);
        });
        if (chain.length === 0) continue;
        paths.push({ id: pathId, street: s.id, side, across: acrossWalk, segs, points, dips, openings, returns });
      }
    }
  }
  return paths;
}

// ---- the drawing plan ----

/** One kerb face the drawing puts on the line: a pack piece's own (`pack`) or a code-drawn strip (`code`). */
export interface KerbFace {
  kind: "pack" | "code";
  part: "edge" | "dip" | "flank" | "return";
  /** The face's two ends in plan, metres. */
  a: Mp;
  b: Mp;
  /** The unit vector from the face toward the walk (where a code strip's lip lies). */
  walk: Mp;
  /** The top of the face's lip above the carriageway, metres. */
  top_m: number;
  /** How far inside its line the face stands: the piece's measured inset, 0 for a flank's and a return's strips along their own line. */
  inset_m: number;
  /** The cell the face belongs to (a pack piece's, or a fallback strip's), null for a flank or a return. */
  cell: { i: number; j: number } | null;
}

export interface KerbPlan {
  faces: readonly KerbFace[];
}

const plus = (p: Mp, d: Mp, m: number): Mp => ({ x: p.x + d.x * m, z: p.z + d.z * m });

/** The inset of a piece's kerb face on +z (its carriageway side): `KERB_FACES_M`'s, or `KERB_INSET_M` when the key has none. */
function insetOf(key: CalibrationKey | null): { inset: number; top: number } {
  const f = key === null ? undefined : KERB_FACES_M[key]?.find((q) => q.side === "+z");
  return f ? { inset: f.inset_m, top: f.top_m } : { inset: KERB_INSET_M, top: KERB_LIP_TOP_M };
}

/**
 * What the drawing puts on the kerb line, from the finished city's cells (their variants say which pavement cells are flush and which are returns) and the key each cell is drawn from (`keyOf`: null for a cell drawn in code):
 * - every pavement, kerb-cut and build-out cell on the path brings its own kerb face on its carriageway edge, at the piece's measured inset (a fallback strip at `KERB_INSET_M`), except a flush pavement cell, which has none;
 * - a pavement cell under a build-out that is not flush brings its own as well (today's trench), which is why a city without its flush cells fails the plan's check;
 * - each build-out stretch's flanks, and the side of every opening that has a return cell (`PAVEMENT_RETURN_NEAR` or `PAVEMENT_RETURN_FAR` on the pavement cell beside it), are code-drawn strips: on the flank line from the pavement's kerb face to the
 *   build-out's outer kerb face, and from the street kerb face (or the flank's end) to the building line.
 * Pure.
 */
export function tileKerbPlan(city: TileCity, keyOf: (c: TileCell) => CalibrationKey | null): KerbPlan {
  const g = gridOf(city);
  const faces: KerbFace[] = [];
  const cellOf = (r: { i: number; j: number } | null): TileCell | null => (r === null ? null : (g.cells[r.j * g.w + r.i] ?? null));
  for (const p of kerbLine(city)) {
    for (const seg of p.segs) {
      if (seg.kind === "opening") continue;
      if (seg.kind === "edge" || seg.kind === "dip") {
        const c = cellOf(seg.cell);
        if (c === null) continue;
        const addFace = (cell: TileCell, shift: number): void => {
          if (cell.role === "pavement" && (cell.variant & PAVEMENT_FLUSH) !== 0) return;
          const key = keyOf(cell);
          const { inset, top } = insetOf(key);
          const from = plus(seg.a, seg.walk, shift + inset);
          const to = plus(seg.b, seg.walk, shift + inset);
          faces.push({ kind: key === null ? "code" : "pack", part: seg.kind as "edge" | "dip", a: from, b: to, walk: seg.walk, top_m: key === null ? KERB_LIP_TOP_M : top, inset_m: inset, cell: { i: cell.i, j: cell.j } });
        };
        addFace(c, 0);
        // A build-out's edge: the pavement cell under it brings its own kerb face one cell in, unless it is flush.
        const under = cellOf(seg.under);
        if (under !== null) addFace(under, TILE_M);
      } else if (seg.kind === "flank") {
        // On the flank line, from the pavement's kerb face to the build-out's outer kerb face: both ends are the pack faces' ends, so the line is shifted across by the common inset.
        faces.push({ kind: "code", part: "flank", a: plus(seg.a, p.across, KERB_INSET_M), b: plus(seg.b, p.across, KERB_INSET_M), walk: seg.walk, top_m: KERB_LIP_TOP_M, inset_m: 0, cell: null });
      } else {
        // A return: only where the pavement cell beside the mouth is a return cell.
        const c = cellOf(seg.cell);
        if (c === null || c.role !== "pavement") continue;
        const bit = seg.which === "near" ? PAVEMENT_RETURN_NEAR : PAVEMENT_RETURN_FAR;
        if ((c.variant & bit) === 0) continue;
        // From the street kerb face (the flank's or the edge's end, at the common inset) to the building line. The path runs in along the near return and out along the far one, so the street end is the near one's first point and the far one's last.
        const streetEnd = seg.which === "near" ? seg.a : seg.b;
        const buildingLine = seg.which === "near" ? seg.b : seg.a;
        faces.push({ kind: "code", part: "return", a: plus(streetEnd, p.across, KERB_INSET_M), b: buildingLine, walk: seg.walk, top_m: KERB_LIP_TOP_M, inset_m: 0, cell: { i: c.i, j: c.j } });
      }
    }
  }
  return { faces };
}
