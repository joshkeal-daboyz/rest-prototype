/**
 * Stage 4, section D2: the kerb line, moved from `src/render3d/kerbline.ts` (ticket 063 F; Josh, 19 Nov 2026) onto the split plan. Pure: it reads the ground cells and stage 1's streets and blocks, and the kerb cuts.
 *
 * One path for each stretch of pavement along a street side, from block corner to block corner (grammar rule 10 as D2 re-words it). The path:
 * - runs along the pavement band's carriageway edge (`edge`);
 * - steps out round every stretch of build-outs (a `flank` at each end, along the build-out's outer edge between);
 * - at every kerb cut turns in at a `return` on each side, runs along that side of the opening to the building line, crosses it (`opening`: no kerb) and comes out the same way on the far side;
 * - on the far side of a T runs straight past with the carriageway edge of the two dropped pavement cells marked `crossingDip` (no return, no corner).
 * The mouth's edge on the street, between the two returns, is the `dip`, off the chain.
 *
 * It walks only each street's own span and the pavement and kerb-cut cells whose street is its own (D1b's rule for the band scan), so a street that ends in a T, its lattice line running on past the junction, has no path
 * cell beyond its span. Linear in street cells: each street walks its own span, twice.
 */

import type { CityBlockSide, CityCell, CityGroundCell, CityKerbCut, CityKerbPath, CityKerbPoint, CityKerbReturn, CityKerbSeg, CityStreetsLayer } from "../../core";
import { CITY_GROUND_VARIANT as V } from "../../core";
import { CityStageError } from "../pipeline/error";
import { TILE_M } from "./constants";

type Mp = CityKerbPoint;

const key = (i: number, j: number): string => `${i},${j}`;

/** The kerb of the city as it should run, in plan on the cell edges: see the file's header. `ground` is the layer's ground cells, `kerbCuts` its kerb cuts. */
export function kerbLine(streets: CityStreetsLayer, ground: readonly CityGroundCell[], kerbCuts: readonly CityKerbCut[]): CityKerbPath[] {
  const W = streets.w;
  const H = streets.h;
  const at: (CityGroundCell | null)[] = new Array<CityGroundCell | null>(W * H).fill(null);
  for (const g of ground) at[g.j * W + g.i] = g;
  const cellAt = (i: number, j: number): CityGroundCell | null => (i < 0 || j < 0 || i >= W || j >= H ? null : at[j * W + i]!);
  const cutOf = new Map(kerbCuts.map((k) => [key(k.cell.i, k.cell.j), k.opening] as const));
  // The block side each stretch of pavement is: a street, the side of the block that faces it, and the block's span along the street.
  const sideOf = new Map<string, string>();
  for (const b of streets.blocks) {
    for (const s of Object.values(b.sides) as CityBlockSide[]) sideOf.set(`${s.street}|${s.side}|${s.span.lo}|${s.span.hi}`, b.id);
  }

  const paths: CityKerbPath[] = [];
  for (const s of streets.streets) {
    const n = s.bands.length;
    const alongX = s.axis === "x";
    for (const k of [0, n - 1]) {
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
      const pav = (t: number): CityGroundCell | null => {
        if (t < s.span.lo || t >= s.span.hi) return null;
        const c = alongX ? cellAt(t, a) : cellAt(a, t);
        return c !== null && c.street === s.id && (c.role === "pavement" || c.role === "kerbCut") ? c : null;
      };
      const beyond = (t: number): CityGroundCell | null => {
        const c = alongX ? cellAt(t, a + sigma) : cellAt(a + sigma, t);
        return c !== null && c.street === s.id ? c : null;
      };
      // Which block's side this pavement faces, from which side of the carriageway it is on.
      const outer = s.outer !== null && (s.outer[0] === "+" ? 1 : -1) === centreSign;
      const sideName = centreSign > 0 ? (alongX ? "-z" : "-x") : alongX ? "+z" : "+x";

      type Cls = { k: "edge" | "deep" | "mouth" | "dip"; cell: CityGroundCell; face: CityGroundCell };
      const classOf = (t: number): Cls => {
        const c = pav(t)!;
        if (c.role === "kerbCut") return { k: "mouth", cell: c, face: c };
        if ((c.variant & V.pavementDip) !== 0) return { k: "dip", cell: c, face: c };
        const n1 = beyond(t);
        return n1 !== null && n1.role === "buildout" ? { k: "deep", cell: c, face: n1 } : { k: "edge", cell: c, face: c };
      };

      for (let t0 = s.span.lo; t0 < s.span.hi; t0++) {
        if (pav(t0) === null || (t0 > s.span.lo && pav(t0 - 1) !== null)) continue;
        let t1 = t0;
        while (t1 < s.span.hi && pav(t1) !== null) t1++;
        const cls: Cls[] = [];
        for (let t = t0; t < t1; t++) cls.push(classOf(t));
        const at2 = (t: number): Cls | null => (t < t0 || t >= t1 ? null : cls[t - t0]!);
        const vOf = (c: Cls | null): number => (c !== null && c.k === "deep" ? E1 : E0);
        const segs: CityKerbSeg[] = [];
        const returns: CityKerbReturn[] = [];
        const dips: { inlet: string; a: Mp; b: Mp }[] = [];
        const cellRef = (c: CityCell | null): CityCell | null => (c === null ? null : { i: c.i, j: c.j });
        const pathId = `${s.id}|${side}|${t0}`;
        const openingOf = (c: Cls): string => {
          const o = cutOf.get(key(c.cell.i, c.cell.j));
          if (o === undefined) throw new CityStageError(`kerb line: the kerb-cut cell (${c.cell.i}, ${c.cell.j}) of ${s.id} has no kerb cut`, [{ i: c.cell.i, j: c.cell.j }]);
          return o;
        };
        let mouthFrom = -1;
        let mouthId = "";
        let mouthOpening = "";
        for (let kk = t0; kk <= t1; kk++) {
          const before = at2(kk - 1);
          const after = at2(kk);
          const sAt = kk * TILE_M;
          const beforeMouth = before !== null && before.k === "mouth";
          const afterMouth = after !== null && after.k === "mouth";
          if (beforeMouth && afterMouth && openingOf(before!) !== openingOf(after!)) {
            throw new CityStageError(`kerb line: the kerb cuts of ${openingOf(before!)} and ${openingOf(after!)} touch along ${s.id}, so their mouths have no corner between them`, [{ i: after!.cell.i, j: after!.cell.j }]);
          }
          if (!beforeMouth && afterMouth) {
            // The near return: from the street edge (or the flank's end) in along the mouth's near side to the building line.
            const v = vOf(before);
            mouthFrom = kk;
            mouthId = `${pathId}|${after!.cell.i},${after!.cell.j}`;
            mouthOpening = openingOf(after!);
            returns.push({ inlet: mouthId, opening: mouthOpening, at: P(sAt, E0), side: "near", end: P(sAt, Bl) });
            segs.push({ kind: "return", a: P(sAt, v), b: P(sAt, Bl), walk: alongUnit(-1), cell: before !== null ? cellRef(before.cell) : null, under: null, which: "near" });
          } else if (beforeMouth && !afterMouth) {
            // The opening, and the far return back out.
            segs.push({ kind: "opening", a: P(mouthFrom * TILE_M, Bl), b: P(sAt, Bl), walk: { x: 0, z: 0 }, cell: null, under: null, which: null });
            segs.push({ kind: "return", a: P(sAt, Bl), b: P(sAt, vOf(after)), walk: alongUnit(1), cell: after !== null ? cellRef(after.cell) : null, under: null, which: "far" });
            returns.push({ inlet: mouthId, opening: mouthOpening, at: P(sAt, E0), side: "far", end: P(sAt, Bl) });
            dips.push({ inlet: mouthId, a: P(mouthFrom * TILE_M, E0), b: P(sAt, E0) });
            for (let t = mouthFrom; t < kk; t++) segs.push({ kind: "dip", a: P(t * TILE_M, E0), b: P((t + 1) * TILE_M, E0), walk: acrossWalk, cell: cellRef(at2(t)!.cell), under: null, which: null });
          } else if (!beforeMouth && !afterMouth && vOf(before) !== vOf(after)) {
            segs.push({ kind: "flank", a: P(sAt, vOf(before)), b: P(sAt, vOf(after)), walk: alongUnit(after !== null && after.k === "deep" ? 1 : -1), cell: null, under: null, which: null });
          }
          if (kk < t1 && after !== null && after.k !== "mouth") {
            segs.push({
              kind: after.k === "dip" ? "crossingDip" : "edge",
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
        let faces: string;
        let blockSide: CityKerbPath["blockSide"] = null;
        if (outer) faces = "outer";
        else {
          const id = sideOf.get(`${s.id}|${sideName}|${t0}|${t1}`);
          if (id === undefined) throw new CityStageError(`kerb line: the pavement stretch of ${s.id} from ${t0} to ${t1} on its ${sideName} side is no block side's, so its path would not run from block corner to block corner`, [alongX ? { i: t0, j: a } : { i: a, j: t0 }]);
          faces = id;
          blockSide = sideName;
        }
        paths.push({ id: pathId, street: s.id, side, faces, blockSide, across: acrossWalk, segs, points, dips, openings, returns });
      }
    }
  }
  return paths;
}
