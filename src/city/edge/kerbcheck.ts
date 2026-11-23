/**
 * Stage 4's ground and kerb-line checks (ticket 070 D2), read from the layer, never from the code that laid it. Each failure names its rule:
 * - "D2 ground": every cell once, its role and street, its centre, its yaw, the bits its role may carry, a grate never with a kerb bit (criterion 1);
 * - "kerb line": one path for each block side (and one for each edge street's outer pavement), corner to corner, the chain unbroken, its own cells only, every pavement and kerb-cut cell on one path (criterion 2);
 * - "dropped kerb": the far side of every T, straight past, dropped at the two crossings (criterion 3, S2);
 * - "bare one-way": no flank on a bare one-way street (criterion 4);
 * - "no return at a plaza" and "return ends on the wall plane": grammar rule 10's two additions (criterion 5).
 * G4 is `g4Failures` in `check.ts`. Pure.
 */

import type { CityEdgeLayer, CityGroundCell, CityKerbPath, CityKerbPoint, CityMassLayer, CityPlanStreet, CityStreetsLayer } from "../../core";
import { CITY_GROUND_VARIANT as V } from "../../core";
import { RETURN_WALL_TOL_M, TILE_M } from "./constants";
import { pavementRow, yawToward } from "./ground";

export interface EdgeFailure {
  readonly id: string;
  readonly reason: string;
}

/** Most failures a check lists: a broken layer breaks in thousands of places, and the first few say what is wrong. */
const MAX_FAILURES = 40;

const LANE_BITS = V.laneRight | V.lanePatch;
const PAVEMENT_BITS = V.pavementReturnNear | V.pavementReturnFar | V.pavementFlush | V.pavementDip;
const YAWS: readonly number[] = [0, 90, 180, 270];

/** The distance from a point to a segment, metres. */
function distToSeg(p: CityKerbPoint, a: CityKerbPoint, b: CityKerbPoint): number {
  const dx = b.x - a.x;
  const dz = b.z - a.z;
  const len2 = dx * dx + dz * dz;
  const t = len2 === 0 ? 0 : Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.z - a.z) * dz) / len2));
  return Math.hypot(p.x - (a.x + t * dx), p.z - (a.z + t * dz));
}

const near = (p: CityKerbPoint, q: CityKerbPoint): boolean => Math.hypot(p.x - q.x, p.z - q.z) < 1e-6;

/** The far sides of the layer's Ts, worked out from the block sides' `junctions` and, for an edge street, from the junction itself: the through street, the side of it (+1 or -1) and the ending street's cells along it. */
interface FarSide {
  readonly junction: string;
  readonly street: string;
  readonly sign: 1 | -1;
  readonly lo: number;
  readonly hi: number;
}

function farSides(streets: CityStreetsLayer): { sides: FarSide[]; problems: string[] } {
  const sides: FarSide[] = [];
  const problems: string[] = [];
  const byId = new Map(streets.streets.map((s) => [s.id, s] as const));
  for (const b of streets.blocks) {
    for (const side of Object.values(b.sides)) {
      for (const f of side.junctions) sides.push({ junction: f.junction, street: side.street, sign: side.side[0] === "-" ? 1 : -1, lo: f.span.lo, hi: f.span.hi });
    }
  }
  for (const j of streets.junctions) {
    if (j.kind !== "T") continue;
    const through = byId.get(j.streets.find((x) => x.passes)?.street ?? "");
    const ending = byId.get(j.streets.find((x) => !x.passes)?.street ?? "");
    if (!through || !ending) {
      problems.push(`the T ${j.id} lacks a through street or an ending street`);
      continue;
    }
    const missing = (["-z", "+x", "+z", "-x"] as const).filter((s) => !j.arms.includes(s));
    if (through.outer !== null && missing.length === 1 && missing[0] === through.outer) sides.push({ junction: j.id, street: through.id, sign: through.outer[0] === "+" ? 1 : -1, lo: ending.across0, hi: ending.across0 + ending.bands.length });
  }
  const seen = new Map<string, number>();
  for (const f of sides) seen.set(f.junction, (seen.get(f.junction) ?? 0) + 1);
  for (const j of streets.junctions) {
    if (j.kind === "T" && seen.get(j.id) !== 1) problems.push(`the T ${j.id} has ${seen.get(j.id) ?? 0} far sides, not one`);
    if (j.kind !== "T" && seen.has(j.id)) problems.push(`the ${j.kind} ${j.id} has a far side`);
  }
  return { sides, problems };
}

/** The ground and kerb-line failures of an edge layer (empty when every rule holds). */
export function kerbFailures(edge: CityEdgeLayer, streets: CityStreetsLayer, mass: CityMassLayer): EdgeFailure[] {
  const out: EdgeFailure[] = [];
  const fail = (id: string, reason: string): void => {
    if (out.length < MAX_FAILURES) out.push({ id, reason });
  };
  const ground = edge.ground;
  const kerb = edge.kerb;
  if (ground === undefined) fail("D2 ground", "the edge layer has no ground");
  if (kerb === undefined) fail("kerb line", "the edge layer has no kerb");
  if (ground === undefined || kerb === undefined) return out;

  const W = streets.w;
  const H = streets.h;
  const streetOf = new Map(streets.streets.map((s) => [s.id, s] as const));
  const edgeAt: (CityEdgeLayer["cells"][number] | undefined)[] = new Array<CityEdgeLayer["cells"][number] | undefined>(W * H).fill(undefined);
  for (const c of edge.cells) edgeAt[c.j * W + c.i] = c;
  const idxOf = (i: number, j: number): number => j * W + i;
  const groundAt: (CityGroundCell | undefined)[] = new Array<CityGroundCell | undefined>(W * H).fill(undefined);

  // ---- D2 ground (criterion 1) ----
  const covered = new Array<number>(W * H).fill(0);
  const firstOfTile = new Set(edge.tiles.map((t) => idxOf(t.cells[0].i, t.cells[0].j)));
  for (const g of ground) {
    const s = g.street === null ? null : streetOf.get(g.street);
    const e = edgeAt[idxOf(g.i, g.j)];
    if (e === undefined) {
      fail("D2 ground", `the ground cell (${g.i}, ${g.j}) is on no edge cell`);
      continue;
    }
    groundAt[idxOf(g.i, g.j)] = g;
    covered[idxOf(g.i, g.j)] = (covered[idxOf(g.i, g.j)] ?? 0) + 1;
    if (g.role !== e.role || g.street !== e.street) fail("D2 ground", `(${g.i}, ${g.j}) is ${g.role} of ${String(g.street)}, its edge cell ${e.role} of ${String(e.street)}`);
    if ((g.cells === 2) !== firstOfTile.has(idxOf(g.i, g.j))) fail("D2 ground", `(${g.i}, ${g.j}) is ${g.cells} cells, but ${firstOfTile.has(idxOf(g.i, g.j)) ? "is" : "is not"} the first cell of a bay tile`);
    if (g.cells === 2) {
      if (!s) fail("D2 ground", `the tile record (${g.i}, ${g.j}) has no street`);
      else {
        const k2 = s.axis === "x" ? idxOf(g.i + 1, g.j) : idxOf(g.i, g.j + 1);
        covered[k2] = (covered[k2] ?? 0) + 1;
      }
    }
    const tileShift = g.cells === 2 && s ? TILE_M / 2 : 0;
    if (Math.abs(g.x_m - ((g.i + 0.5) * TILE_M + (s?.axis === "x" ? tileShift : 0))) > 1e-9 || Math.abs(g.z_m - ((g.j + 0.5) * TILE_M + (s?.axis === "z" ? tileShift : 0))) > 1e-9) fail("D2 ground", `(${g.i}, ${g.j}) is not centred on its cell`);
    if (!YAWS.includes(g.yaw)) fail("D2 ground", `(${g.i}, ${g.j}) has yaw ${g.yaw}`);
    const v = g.variant;
    if (g.role === "lane") {
      if ((v & ~LANE_BITS) !== 0) fail("D2 ground", `the lane (${g.i}, ${g.j}) has variant ${v}`);
      if ((v & V.laneRight) !== 0 && s?.section !== "twoWay") fail("D2 ground", `the lane (${g.i}, ${g.j}) of ${String(g.street)} is laneRight on a street that is not two-way`);
    } else if (g.role === "pavement") {
      if ((v & V.pavementGrate) !== 0 ? v !== V.pavementGrate : (v & ~PAVEMENT_BITS) !== 0) fail("D2 ground", `the pavement cell (${g.i}, ${g.j}) has variant ${v}: a grate carries no kerb bit, and no other bit is its own`);
    } else if (v !== 0) fail("D2 ground", `the ${g.role} cell (${g.i}, ${g.j}) has variant ${v}`);
    if (g.role === "crossing" && s && g.yaw !== yawToward(s.axis, 1)) fail("D2 ground", `the crossing (${g.i}, ${g.j}) is not turned along its own street ${s.id}`);
    if (g.role === "junction" && g.yaw !== 0) fail("D2 ground", `the junction cell (${g.i}, ${g.j}) is turned`);
  }
  for (const e of edge.cells) if (covered[idxOf(e.i, e.j)] !== 1) fail("D2 ground", `the cell (${e.i}, ${e.j}) is in ${covered[idxOf(e.i, e.j)]} ground records, not one`);

  // ---- the kerb line (criterion 2) ----
  const dropped = new Set<number>();
  for (const g of ground) if (g.role === "pavement" && (g.variant & V.pavementDip) !== 0) dropped.add(idxOf(g.i, g.j));
  const kerbCoord = (s: CityPlanStreet, p: CityKerbPath): number => {
    const hi = s.axis === "x" ? p.across.z > 0 : p.across.x > 0;
    return hi ? s.carriage.hi_m : s.carriage.lo_m;
  };
  const alongCoord = (s: CityPlanStreet, p: CityKerbPoint): number => (s.axis === "x" ? p.x : p.z);
  const acrossCoord = (s: CityPlanStreet, p: CityKerbPoint): number => (s.axis === "x" ? p.z : p.x);
  const wanted: { key: string; label: string; street: string; lo: number; hi: number }[] = [];
  for (const b of streets.blocks) for (const side of Object.values(b.sides)) wanted.push({ key: `${b.id}|${side.side}`, label: `${b.id}'s ${side.side} side`, street: side.street, lo: side.span.lo, hi: side.span.hi });
  // An edge street's outer pavement is one stretch between its two pavement corners: its span less the cross-section of the other edge street at each corner junction (that street's pavement, parking and carriageway).
  const junctionOf = new Map(streets.junctions.map((j) => [j.id, j] as const));
  for (const s of streets.streets) {
    if (s.outer === null) continue;
    const reach = (end: 0 | 1): number => {
      const j = junctionOf.get(s.ends[end].junction);
      const other = j?.kind === "corner" ? streetOf.get(j.streets.find((x) => x.street !== s.id)?.street ?? "") : undefined;
      if (!other) return end === 0 ? s.span.lo : s.span.hi;
      return end === 0 ? other.across0 + other.bands.length : other.across0;
    };
    wanted.push({ key: `outer|${s.id}`, label: `the outer pavement of ${s.id}`, street: s.id, lo: reach(0), hi: reach(1) });
  }
  const pathsOf = new Map<string, CityKerbPath[]>();
  for (const p of kerb) {
    const k = p.faces === "outer" ? `outer|${p.street}` : `${p.faces}|${String(p.blockSide)}`;
    pathsOf.set(k, [...(pathsOf.get(k) ?? []), p]);
  }
  if (kerb.length !== wanted.length) fail("kerb line", `${kerb.length} paths for ${wanted.length} block sides and outer pavements`);
  for (const w of wanted) {
    const ps = pathsOf.get(w.key) ?? [];
    if (ps.length !== 1) {
      fail("kerb line", `${w.label} has ${ps.length} paths, not one`);
      continue;
    }
    const p = ps[0]!;
    const s = streetOf.get(w.street)!;
    const first = p.points[0];
    const last = p.points[p.points.length - 1];
    if (p.street !== w.street) fail("kerb line", `${w.label}'s path runs along ${p.street}, not ${w.street}`);
    if (!first || !last) fail("kerb line", `${w.label}'s path has no points`);
    else {
      const k = kerbCoord(s, p);
      for (const [pt, along, which] of [[first, w.lo, "first"], [last, w.hi, "last"]] as const) {
        if (Math.abs(alongCoord(s, pt) - along * TILE_M) > 1e-6 || Math.abs(acrossCoord(s, pt) - k) > 1e-6) fail("kerb line", `${w.label}'s ${which} point is not on its corner (cell ${along} along ${w.street}, on the kerb line)`);
      }
    }
  }
  const covers = new Map<string, number>();
  for (const p of kerb) {
    const s = streetOf.get(p.street);
    if (!s) {
      fail("kerb line", `a path along ${p.street}, which the streets layer does not have`);
      continue;
    }
    const chain = p.segs.filter((q) => q.kind !== "dip");
    if (p.points.length !== chain.length + 1) fail("kerb line", `${p.id}: ${p.points.length} points for ${chain.length} segments`);
    for (let n = 1; n < chain.length; n++) if (!near(chain[n - 1]!.b, chain[n]!.a)) fail("kerb line", `${p.id}: the chain breaks before segment ${n}`);
    for (const q of p.segs) {
      if (Math.abs(q.a.x - q.b.x) > 1e-9 && Math.abs(q.a.z - q.b.z) > 1e-9) fail("kerb line", `${p.id}: a ${q.kind} segment off the axes`);
      for (const c of [q.cell, q.kind === "edge" ? q.under : null]) {
        if (c === null) continue;
        const g = groundAt[idxOf(c.i, c.j)];
        const along = s.axis === "x" ? c.i : c.j;
        if (g === undefined || g.street !== p.street || along < s.span.lo || along >= s.span.hi) fail("kerb line", `${p.id}: a ${q.kind} segment on the cell (${c.i}, ${c.j}), which is not ${p.street}'s own`);
      }
      if (q.kind === "edge" || q.kind === "crossingDip") {
        const c = q.under ?? q.cell;
        if (c !== null) covers.set(`${c.i},${c.j}`, (covers.get(`${c.i},${c.j}`) ?? 0) + 1);
      } else if (q.kind === "dip" && q.cell !== null) covers.set(`${q.cell.i},${q.cell.j}`, (covers.get(`${q.cell.i},${q.cell.j}`) ?? 0) + 1);
      if (q.kind === "flank" && s.section === "oneWayBare") fail("bare one-way", `${p.id}: a flank on ${s.id}, a bare one-way street with no build-out`);
    }
  }
  for (const g of ground) {
    if (g.role !== "pavement" && g.role !== "kerbCut") continue;
    const n = covers.get(`${g.i},${g.j}`) ?? 0;
    if (n !== 1) fail("kerb line", `the ${g.role} cell (${g.i}, ${g.j}) of ${String(g.street)} is on ${n} kerb paths, not one`);
  }

  // ---- the two additions (criterion 5) ----
  const openingOf = new Map(mass.openings.map((o) => [o.id, o] as const));
  const returnsOf = new Map<string, { near: number; far: number }>();
  for (const k of edge.kerbCuts) {
    const o = openingOf.get(k.opening);
    if (o === undefined || (o.kind !== "lane" && o.kind !== "drive" && o.kind !== "frontLot") || o.mouth.length === 0) fail("no return at a plaza, park edge or walk-through", `a kerb cut at (${k.cell.i}, ${k.cell.j}) in front of ${k.opening}, which no vehicle enters from the street (${o?.kind ?? "unknown"})`);
  }
  const built = new Set(mass.built.map((b) => idxOf(b.i, b.j)));
  for (const p of kerb) {
    const s = streetOf.get(p.street);
    if (!s) continue;
    for (const r of p.returns) {
      const o = openingOf.get(r.opening);
      if (o === undefined || (o.kind !== "lane" && o.kind !== "drive" && o.kind !== "frontLot") || o.mouth.length === 0) fail("no return at a plaza, park edge or walk-through", `${p.id}: a return at ${r.inlet} for ${r.opening}, which no vehicle enters from the street`);
      const c = returnsOf.get(r.opening) ?? { near: 0, far: 0 };
      c[r.side]++;
      returnsOf.set(r.opening, c);
      // The built cell beside the opening on that side: in the row just inside the building line, one cell before (near) or after (far) the mouth's edge.
      const atAlong = alongCoord(s, r.at);
      const rowCentre = acrossCoord(s, r.at) + (s.axis === "x" ? p.across.z : p.across.x) * (TILE_M + TILE_M / 2);
      const cellAlong = Math.floor((atAlong + (r.side === "near" ? -TILE_M / 2 : TILE_M / 2)) / TILE_M);
      const cellAcross = Math.floor(rowCentre / TILE_M);
      const ci = s.axis === "x" ? cellAlong : cellAcross;
      const cj = s.axis === "x" ? cellAcross : cellAlong;
      if (!built.has(idxOf(ci, cj))) {
        fail("return ends on the wall plane", `${p.id}: the cell (${ci}, ${cj}) beside ${r.opening}'s ${r.side} return is not built, so the return has no wall plane to end on`);
        continue;
      }
      const wallA: CityKerbPoint = s.axis === "x" ? { x: atAlong, z: acrossCoord(s, r.at) + p.across.z * TILE_M } : { x: acrossCoord(s, r.at) + p.across.x * TILE_M, z: atAlong };
      const wallB: CityKerbPoint = s.axis === "x" ? { x: atAlong, z: wallA.z + p.across.z * TILE_M } : { x: wallA.x + p.across.x * TILE_M, z: atAlong };
      const d = distToSeg(r.end, wallA, wallB);
      if (d > RETURN_WALL_TOL_M + 1e-9) fail("return ends on the wall plane", `${p.id}: the ${r.side} return of ${r.opening} ends ${d.toFixed(3)} m from the wall plane of the built cell (${ci}, ${cj}), more than ${RETURN_WALL_TOL_M} m`);
    }
  }
  for (const o of mass.openings) {
    const c = returnsOf.get(o.id) ?? { near: 0, far: 0 };
    const want = o.mouth.length;
    if (c.near !== want || c.far !== want) fail("kerb line", `${o.id} has ${c.near} near and ${c.far} far returns for ${want} mouths`);
  }

  // ---- the far side of a T (criterion 3) ----
  const fars = farSides(streets);
  for (const p of fars.problems) fail("dropped kerb", p);
  const wantDrop = new Set<number>();
  const dipPath = new Map<number, CityKerbPath>();
  for (const p of kerb) for (const q of p.segs) if (q.kind === "crossingDip" && q.cell !== null) dipPath.set(idxOf(q.cell.i, q.cell.j), p);
  for (const f of fars.sides) {
    const s = streetOf.get(f.street);
    const row = s ? pavementRow(s, f.sign) : null;
    if (!s || row === null) {
      fail("dropped kerb", `the far side of ${f.junction} has no pavement row on ${f.street}`);
      continue;
    }
    const cellAt = (along: number, across: number): number => (s.axis === "x" ? idxOf(along, across) : idxOf(across, along));
    const inward = s.carriage.lo_m > (row.across + 0.5) * TILE_M ? 1 : -1;
    for (let t = f.lo; t < f.hi; t++) {
      const ends = t === f.lo || t === f.hi - 1;
      const idx = cellAt(t, row.across);
      const g = groundAt[idx];
      const front = groundAt[cellAt(t, row.across + inward)];
      if (ends) wantDrop.add(idx);
      if (g === undefined || g.role !== "pavement" || g.street !== s.id) {
        fail("dropped kerb", `the far side of ${f.junction}: (${t} along ${s.id}) is not its pavement cell`);
        continue;
      }
      if (ends && front?.role !== "crossing") fail("dropped kerb", `the dropped kerb of ${f.junction} at ${t} along ${s.id} has no crossing in front of it`);
      if (!ends && front?.role !== "junction") fail("dropped kerb", `the far side of ${f.junction}: the cell at ${t} along ${s.id} has no junction in front of it`);
      if (!ends && (g.variant & V.pavementDip) !== 0) fail("dropped kerb", `the far side of ${f.junction}: the cell at ${t} along ${s.id}, between the crossings, is dropped`);
    }
    // The path runs straight past: no return, opening or corner strictly inside the facing span (a flank at its very ends is the next build-out's, as at a block corner).
    const p = dipPath.get(cellAt(f.lo, row.across));
    if (p === undefined || dipPath.get(cellAt(f.hi - 1, row.across)) !== p) fail("dropped kerb", `the far side of ${f.junction}: its two dropped kerbs are not on one path`);
    else {
      for (const q of p.segs) {
        if (q.kind === "edge" || q.kind === "crossingDip" || q.kind === "dip") continue;
        const along = alongCoord(s, q.a);
        if (along > f.lo * TILE_M + 1e-6 && along < f.hi * TILE_M - 1e-6) fail("dropped kerb", `${p.id}: a ${q.kind} inside the far side of ${f.junction}`);
      }
    }
  }
  for (const d of dropped) if (!wantDrop.has(d)) fail("dropped kerb", `the cell (${d % W}, ${Math.floor(d / W)}) is dropped but is no T's far side`);
  for (const d of wantDrop) if (!dropped.has(d)) fail("dropped kerb", `the cell (${d % W}, ${Math.floor(d / W)}) should be dropped, as the end of a T's far side`);
  return out;
}
