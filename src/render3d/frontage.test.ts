/**
 * Ticket 057 A: check G1 (`frontage.ts`), no recess: on every terrace column of the tile city the street-level wall plane stands between the pavement's back edge and `OVERLAP_MAX_M`
 * onto it. Pure: the tile city is built from `tileCity` and packed by `packTown` on fixture entries typed in from the converted City Pack manifest (18 Nov 2026); no assets, no WebGL, no timers.
 * The failing fixture is the same city packed with `align: "back"`, which is how the city was laid before this ticket.
 */

import { describe, expect, it } from "vitest";
import type { AssetEntry, CalibrationKey } from "../core";
import { wallOffset } from "./facade";
import { END_OVERLAP_MAX_M, FRONTAGE_CHECK, FRONTAGE_TOL_M, OVERLAP_MAX_M, PASSAGE_W_M, RECESS_MAX_M, evaluateFrontage, frontageMetrics, groundDepth_m, tilePassages, type FaceOffset } from "./frontage";
import { BUILDING_FRONTS } from "./models";
import { STACK_STYLES } from "./stacks";
import { alignOf, farOverlapOf, nextTerraceRun, packTown, type PackResult } from "./terrace";
import { WORLD_PER_METRE } from "./town";
import { TILE_STACK_ALIGN, tileCity, type TileCity } from "./tilecity";

// [name, width, height, depth] in metres (the converted City Pack manifest, 18 Nov 2026); bounds are centred.
const SIZES: [string, number, number, number][] = [
  ["SM_Bld_Apartment_01", 5.0, 3.0, 5.196],
  ["SM_Bld_Apartment_02", 5.17, 3.0, 5.214],
  ["SM_Bld_Apartment_03", 5.281, 3.0, 5.497],
  ["SM_Bld_Apartment_Corner_01", 5.196, 3.0, 5.196],
  ["SM_Bld_Apartment_Corner_02", 5.214, 3.0, 5.214],
  ["SM_Bld_Apartment_Corner_03", 5.491, 3.0, 5.497],
  ["SM_Bld_Apartment_Door_01", 5.096, 3.0, 5.577],
  ["SM_Bld_Apartment_Door_02", 5.114, 3.0, 5.115],
  ["SM_Bld_Apartment_Roof_01", 5.31, 0.5, 5.918],
  ["SM_Bld_Apartment_Roof_02", 5.252, 0.744, 5.488],
  ["SM_Bld_Apartment_Roof_03", 5.31, 0.744, 5.624],
  ["SM_Bld_Apartment_Roof_Corner_01", 5.904, 0.5, 5.918],
  ["SM_Bld_Apartment_Roof_Corner_02", 5.611, 0.744, 5.624],
  ["SM_Bld_Apartment_Roof_Corner_03", 5.462, 0.744, 5.488],
  ["SM_Bld_Apartment_Stack_01", 5.0, 9.0, 5.196],
  ["SM_Bld_Apartment_Stack_02", 5.17, 9.0, 5.214],
  ["SM_Bld_Apartment_Stack_03", 5.281, 9.0, 5.497],
  ["SM_Bld_Shop_01", 5.0, 3.054, 5.536],
  ["SM_Bld_Shop_02", 5.0, 3.3, 5.425],
  ["SM_Bld_Shop_03", 10.087, 3.084, 5.493],
  ["SM_Bld_Shop_04", 5.106, 3.17, 5.886],
  ["SM_Bld_Shop_05", 5.108, 3.0, 5.224],
  ["SM_Bld_Shop_06", 5.175, 3.0, 5.877],
  ["SM_Bld_Shop_Corner_01", 5.377, 3.0, 5.471],
  ["SM_Bld_Shop_Corner_02", 5.332, 3.0, 5.332],
];
const ENTRIES: ReadonlyMap<CalibrationKey, AssetEntry> = new Map(
  SIZES.map(
    ([name, w, h, d]) =>
      [
        `city-pack:${name}` as CalibrationKey,
        { name, source: `${name}.fbx`, bounds: { min: [-w / 2, 0, -d / 2], max: [w / 2, h, d / 2] }, triangles: 100, textures: [], missingTextures: [], warnings: [] } as AssetEntry,
      ] as const,
  ),
);

/**
 * A second, independent pin (057 A review): for every ground piece, how far behind its front bound the frontmost face that reaches the pavement (y at most 0.3 m, at least 0.5 m2) stands,
 * measured separately from `WALL_FRONT_M` on the converted City Pack (18 Nov 2026). G1 reads these, not the table the stacks aligned on, so it fails if the face at the pavement is recessed
 * whatever the table says. `side` is the open side of a corner piece. A key not here (a floor, a roof) falls back to the stack's own table.
 */
const GROUND_FACE_M: Record<string, { front: number; side?: number }> = {
  SM_Bld_Shop_01: { front: 0.219 },
  SM_Bld_Shop_02: { front: 0.191 },
  SM_Bld_Shop_03: { front: 0.103 },
  SM_Bld_Shop_04: { front: 0.557 },
  SM_Bld_Shop_05: { front: 0.076 },
  SM_Bld_Shop_06: { front: 0.52 },
  SM_Bld_Apartment_Door_01: { front: 0 },
  SM_Bld_Apartment_Door_02: { front: 0.005 },
  SM_Bld_Shop_Corner_01: { front: 0.073, side: 0.188 },
  SM_Bld_Shop_Corner_02: { front: 0.107, side: 0.107 },
};
const groundFace: FaceOffset = (key, street) => {
  const g = GROUND_FACE_M[key.slice("city-pack:".length)];
  return g ? (street === "front" ? g.front : (g.side ?? g.front)) : wallOffset(key, street);
};

/** The cities the criterion names: the default (3 x 3, seed 1), seeds 1 to 10 at 3 x 3, and seeds 1 to 3 at 6 x 4. */
const CITIES: { label: string; blocksX: number; blocksZ: number; seed: number }[] = [
  ...Array.from({ length: 10 }, (_, k) => ({ label: `3x3 seed ${k + 1}`, blocksX: 3, blocksZ: 3, seed: k + 1 })),
  ...Array.from({ length: 3 }, (_, k) => ({ label: `6x4 seed ${k + 1}`, blocksX: 6, blocksZ: 4, seed: k + 1 })),
];

const built = new Map<string, { city: TileCity; wall: Map<string, PackResult> }>();
const cityOf = (c: (typeof CITIES)[number]): { city: TileCity; wall: Map<string, PackResult> } => {
  let b = built.get(c.label);
  if (!b) {
    const city = tileCity({ blocksX: c.blocksX, blocksZ: c.blocksZ, seed: c.seed });
    b = { city, wall: packTown({ terraces: city.town.terraces, lots: city.town.lots }, STACK_STYLES, ENTRIES, BUILDING_FRONTS, { align: TILE_STACK_ALIGN }) };
    built.set(c.label, b);
  }
  return b;
};

describe("G1, no recess (criterion 3)", () => {
  it("holds its limits: no recess, and the walls at most OVERLAP_MAX_M (0.6 m, the ticket's 0.5 m raised after the review) onto the pavement, with the ticket's 0.01 m", () => {
    expect(RECESS_MAX_M).toBe(0);
    expect(OVERLAP_MAX_M).toBe(0.6);
    expect(FRONTAGE_TOL_M).toBe(0.01);
    expect(FRONTAGE_CHECK).toEqual({ G1: 0, G2: 0 });
  });

  it("passes on every terrace column of the default city and of seeds 1 to 10 at 3 x 3 and 1 to 3 at 6 x 4", { timeout: 120000 }, () => {
    const bad: string[] = [];
    for (const c of CITIES) {
      const { city, wall } = cityOf(c);
      const m = frontageMetrics(city, wall);
      const g1 = evaluateFrontage(m)[0]!;
      // The independent pin: no street-level face that meets the pavement stands behind its back edge, and the furthest one over it is within the reach.
      const ind = frontageMetrics(city, wall, undefined, groundFace);
      if (!evaluateFrontage(ind)[0]!.pass) bad.push(`${c.label}: independent pin: ${ind.recessed} recessed, ${ind.overlapped} over, from ${ind.wallMin_m.toFixed(3)} to ${ind.wallMax_m.toFixed(3)} m`);
      expect(ind.recessed, c.label).toBe(0);
      expect(ind.wallMin_m, c.label).toBeGreaterThanOrEqual(-FRONTAGE_TOL_M);
      expect(ind.wallMax_m, c.label).toBeLessThanOrEqual(OVERLAP_MAX_M + FRONTAGE_TOL_M);
      expect(m.runs, c.label).toBe(city.town.terraces.length);
      expect(m.groundPieces, c.label).toBeGreaterThan(40);
      expect(m.unmeasured, c.label).toEqual([]);
      if (!g1.pass) bad.push(`${c.label}: ${m.recessed} recessed, ${m.overlapped} over the limit, wall from ${m.wallMin_m.toFixed(3)} to ${m.wallMax_m.toFixed(3)} m`);
      // The ground floor's wall is on the pavement's back edge; so is every storey's (sills and signs stand out by the table's offsets, never past the reach).
      expect(m.wallMin_m, c.label).toBeGreaterThanOrEqual(-RECESS_MAX_M - FRONTAGE_TOL_M);
      expect(m.wallMax_m, c.label).toBeLessThanOrEqual(OVERLAP_MAX_M + FRONTAGE_TOL_M);
      expect(m.upperMin_m, c.label).toBeGreaterThanOrEqual(-RECESS_MAX_M - FRONTAGE_TOL_M);
      expect(m.upperMax_m, c.label).toBeLessThanOrEqual(OVERLAP_MAX_M + FRONTAGE_TOL_M);
      expect(m.frontMax_m, c.label).toBeLessThanOrEqual(OVERLAP_MAX_M + FRONTAGE_TOL_M);
    }
    expect(bad).toEqual([]);
  });

  it("reports how far the buildings overlap the pavement: the furthest front bound is Shop_04's 0.557 m, inside the 0.6 m reach, and no street-level piece is recessed (0%)", () => {
    for (const c of CITIES) {
      const { city, wall } = cityOf(c);
      const m = frontageMetrics(city, wall, undefined, groundFace);
      expect(m.recessed / m.groundPieces, c.label).toBe(0);
      expect(m.frontMax_m, c.label).toBeLessThanOrEqual(0.557 + 1e-9);
      expect(m.frontMax_m, c.label).toBeLessThanOrEqual(OVERLAP_MAX_M);
    }
  });

  it("measures a column from its piece's wall, not its bound: on the default city every street-level wall is on the edge within 1e-6", () => {
    const { city, wall } = cityOf(CITIES[0]!);
    const m = frontageMetrics(city, wall);
    expect(Math.abs(m.wallMin_m)).toBeLessThan(1e-6);
    expect(Math.abs(m.wallMax_m)).toBeLessThan(1e-6);
    // The front bounds stand out further than the walls (sills, frames, signs), by the table's offsets and no more than the reach.
    expect(m.frontMax_m).toBeGreaterThan(0.1);
    expect(Math.abs(frontageMetrics(city, wall).frontMax_m)).toBeLessThanOrEqual(OVERLAP_MAX_M);
  });

  it("fails on today's back-aligned packing of the default city (the failing fixture: the same city with align: \"back\")", () => {
    const { city } = cityOf(CITIES[0]!);
    const back = packTown({ terraces: city.town.terraces, lots: city.town.lots }, STACK_STYLES, ENTRIES, BUILDING_FRONTS, { align: "back" });
    const m = frontageMetrics(city, back);
    const g1 = evaluateFrontage(m)[0]!;
    expect(g1.pass).toBe(false);
    expect(m.recessed).toBeGreaterThan(m.groundPieces / 3);
    // Josh's strip: the street-level wall stands back by up to the depth difference of the pieces, about 0.5 m on this city.
    expect(m.wallMin_m).toBeLessThan(-0.4);
  });

  it("the independent pin fails a packing aligned on a face that is not the one at the pavement: Shop_01 aligned on its sign (0.004) stands 0.215 m behind the edge", () => {
    const { city, wall } = cityOf(CITIES[0]!);
    const shop1 = "city-pack:SM_Bld_Shop_01";
    let moved = 0;
    const wrong = new Map(
      [...wall].map(([id, r]) => [
        id,
        { ...r, blocks: r.blocks.map((b) => ({ ...b, stack: { ...b.stack, pieces: b.stack.pieces.map((p) => (p.key === shop1 && p.role === "base" ? (moved++, { ...p, z: p.z - (0.219 - 0.004) }) : p)) } })) },
      ]),
    );
    expect(moved).toBeGreaterThan(0);
    // z - 0.004: the piece sits as the old table (0.004) put it. Its pavement face (0.219 back of the bound) is then 0.215 behind the edge.
    const m = frontageMetrics(city, wrong, undefined, groundFace);
    expect(m.recessed).toBe(moved);
    expect(evaluateFrontage(m)[0]!.pass).toBe(false);
    expect(m.wallMin_m).toBeCloseTo(-0.215, 6);
  });

  it("fails on a city with nothing packed, which has shown no wall on the pavement", () => {
    const { city } = cityOf(CITIES[0]!);
    const m = frontageMetrics(city, new Map());
    expect(m.groundPieces).toBe(0);
    expect(evaluateFrontage(m)[0]).toEqual({ id: "G1", value: 1, pass: false });
  });

  it("fails on a wall over the limit, and counts a recess just past the tolerance", () => {
    const { city, wall } = cityOf(CITIES[0]!);
    // Move every block of every run onto the pavement by 0.7 m (a copy of the packed city; the cached one is not touched).
    const shift = (dz: number): Map<string, PackResult> =>
      new Map([...wall].map(([id, r]) => [id, { ...r, blocks: r.blocks.map((b) => ({ ...b, stack: { ...b.stack, pieces: b.stack.pieces.map((p) => ({ ...p, z: p.z + dz })) } }) ) }]));
    const over = frontageMetrics(city, shift(0.7));
    expect(over.overlapped).toBe(over.groundPieces);
    expect(evaluateFrontage(over)[0]!.pass).toBe(false);
    const edge = frontageMetrics(city, shift(OVERLAP_MAX_M));
    expect(evaluateFrontage(edge)[0]!.pass).toBe(true);
    const slit = frontageMetrics(city, shift(-0.02));
    expect(slit.recessed).toBe(slit.groundPieces);
    expect(evaluateFrontage(slit)[0]!.pass).toBe(false);
    expect(evaluateFrontage(frontageMetrics(city, shift(-0.005)))[0]!.pass).toBe(true);
  });

  it("reads a run's pavement frame: a wall 0.3 m behind a pavement that starts 0.3 m in front of the front line is on the edge", () => {
    const { city, wall } = cityOf(CITIES[0]!);
    const framed = { town: { ...city.town, terraces: city.town.terraces.map((r) => ({ ...r, frame: { wall_m: 0.3, kerb_m: 5 } })) } };
    const m = frontageMetrics(framed, wall);
    expect(m.wallMax_m).toBeCloseTo(-0.3, 6);
    expect(evaluateFrontage(m)[0]!.pass).toBe(false);
  });
});

describe("the tile city's alignment (criterion 2)", () => {
  it("is wall for a run with a pavement frame and back for a run without one, and packTown takes it from there", { timeout: 60000 }, () => {
    const { city, wall } = cityOf(CITIES[0]!);
    expect(TILE_STACK_ALIGN).toBe("wall");
    expect(city.town.terraces.every((r) => alignOf(r) === "wall")).toBe(true);
    expect(alignOf({})).toBe("back");
    // No option: the tile city is wall-aligned, exactly as if it were asked for.
    const dflt = packTown({ terraces: city.town.terraces, lots: city.town.lots }, STACK_STYLES, ENTRIES, BUILDING_FRONTS);
    expect(dflt).toEqual(wall);
    // A run with no frame (a ladder run) is back-aligned whatever the others are.
    const bare = city.town.terraces.map((r) => {
      const { frame: _f, ...rest } = r;
      return rest;
    });
    const back = packTown({ terraces: bare, lots: city.town.lots }, STACK_STYLES, ENTRIES, BUILDING_FRONTS);
    // Only the alignment differs: the framed runs take the far overlap of 057 B by default, which a bare run does not, so it is asked for 0 here.
    const asked = packTown({ terraces: city.town.terraces, lots: city.town.lots }, STACK_STYLES, ENTRIES, BUILDING_FRONTS, { align: "back", farOverlap_m: 0 });
    expect(back).toEqual(asked);
    expect(back).not.toEqual(wall);
  });
});

describe("G2, no gap in the frontage (ticket 057 B, criterion 6)", () => {
  const U = WORLD_PER_METRE;
  const defaultCity = (): { city: TileCity; wall: Map<string, PackResult> } => cityOf(CITIES[0]!);
  /** The city as 055 B laid it at 793bbf7: every run that starts at a corner stands `m` metres in from it (the run is that much shorter), packed as `packTown` packs a tile city. */
  const insetFixture = (m: number): { city: TileCity; packed: Map<string, PackResult>; moved: number } => {
    const { city } = defaultCity();
    let moved = 0;
    const terraces = city.town.terraces.map((r) => {
      if (!r.startCorner) return r;
      moved++;
      return { ...r, ax: r.ax + r.ux * m * U, az: r.az + r.uz * m * U, len: r.len - m * U };
    });
    const town = { ...city.town, terraces };
    return { city: { ...city, town }, packed: packTown({ terraces, lots: city.town.lots }, STACK_STYLES, ENTRIES, BUILDING_FRONTS), moved };
  };

  it("holds its limits: G1 and G2 each allow none, a far end overshoots at most 1.0 m, and a passage is 1.0 m to one column (5.3 m)", () => {
    expect(FRONTAGE_CHECK).toEqual({ G1: 0, G2: 0 });
    expect(END_OVERLAP_MAX_M).toBe(1.0);
    expect(PASSAGE_W_M).toEqual({ min: 1.0, max: 5.3 });
    expect(evaluateFrontage(frontageMetrics(defaultCity().city, defaultCity().wall)).map((v) => v.id)).toEqual(["G1", "G2"]);
  });

  it("passes on the default city and seeds 1 to 10 at 3 x 3 and 1 to 3 at 6 x 4: every metre of every block side is a wall, a flank, a seam, an overshoot, a passage, a lot or a plaza", { timeout: 120000 }, () => {
    for (const c of CITIES) {
      const { city, wall } = cityOf(c);
      const m = frontageMetrics(city, wall);
      expect(m.sides, c.label).toBe(city.town.blocks.length * 4);
      expect(m.uncovered, `${c.label} ${JSON.stringify(m.gaps.slice(0, 3))}`).toBe(0);
      expect(m.farEnds.overshootBad, c.label).toBe(0);
      expect(m.farEnds.overshootMax_m, c.label).toBeLessThanOrEqual(END_OVERLAP_MAX_M + FRONTAGE_TOL_M);
      expect(m.farEnds.slit + m.farEnds.wide, c.label).toBe(0);
      expect(m.farEnds.seam + m.farEnds.overshoot + m.farEnds.passage, c.label).toBe(m.farEnds.runs);
      expect(m.farEnds.runs, c.label).toBe(city.town.terraces.length);
      expect(m.passages.length, c.label).toBe(m.farEnds.passage);
      const g2 = evaluateFrontage(m)[1]!;
      expect(g2, c.label).toEqual({ id: "G2", value: 0, pass: true });
    }
  });

  // A uniform 1.5 m inset on every row that starts at a corner: the shape of 793bbf7's layout, not its real per-row insets (1.0 to 2.5 m, by the side's length), which are gone with `tileRowInset_m`.
  it("fails on a fixture of the default city with a uniform corner inset of 1.5 m (the shape of 793bbf7's layout, not its exact insets): the strip at every corner is nothing", { timeout: 60000 }, () => {
    const f = insetFixture(1.5);
    expect(f.moved).toBeGreaterThan(20);
    const m = frontageMetrics(f.city, f.packed);
    const g2 = evaluateFrontage(m)[1]!;
    expect(g2.pass).toBe(false);
    // Each inset leaves the stretch at the side's start bare, and the corner block of the row before stands off the line it should flank.
    expect(m.uncovered).toBeGreaterThanOrEqual(f.moved);
    expect(m.uncoveredMax_m).toBeGreaterThan(1.4);
    // G1 does not see it (the walls are still on the edge): G2 is the check for the corners.
    expect(evaluateFrontage(m)[0]!.pass).toBe(true);
  });

  /**
   * The corner-ending runs of the default city whose next row starts with a corner block, with how far the packer's far wall (the corner block's deepest piece, `wallTo`) stands from the corner
   * block's street-level flank (its corner column's ground piece): the opening G2 and the passages measure is `farGap_m - farOvershoot_m + flank`.
   */
  const cornerEnds = (): { id: string; flank: number }[] => {
    const { city, wall } = defaultCity();
    const out: { id: string; flank: number }[] = [];
    for (const r of city.town.terraces) {
      if (r.endAbuts !== "corner") continue;
      const n = nextTerraceRun(city.town.terraces, r);
      const nb = n && n.startCorner !== null ? wall.get(n.id)?.blocks[0] : undefined;
      if (nb?.corner) out.push({ id: r.id, flank: nb.stack.depth_m - groundDepth_m(nb.stack) });
    }
    return out;
  };
  /**
   * The packing with run `id`'s last building lengthened at its far end, and its numbers kept true, so that the packer's own gap to the corner block's deepest piece is `signed` metres (negative: an
   * overshoot of that much). The street-level opening is then `signed + flank`.
   */
  const withGap = (id: string, signed: number): Map<string, PackResult> => {
    const { city, wall } = defaultCity();
    const run = city.town.terraces.find((r) => r.id === id)!;
    const v = wall.get(id)!;
    // The last building is widened (or narrowed) at its far end by the difference, so the start of the run stays on its corner.
    const dm = v.farGap_m - (v.farOvershoot_m ?? 0) - signed;
    const d = dm * U;
    const last = v.blocks.length - 1;
    const blocks = v.blocks.map((b, i) => (i === last ? { ...b, lot: { ...b.lot, w: b.lot.w + d, x: b.lot.x + (run.ux * d) / 2, z: b.lot.z + (run.uz * d) / 2 }, stack: { ...b.stack, width_m: b.stack.width_m + dm } } : b));
    const moved = { ...v, blocks, farGap_m: Math.max(0, signed), farOvershoot_m: Math.max(0, -signed) };
    return new Map([...wall].map(([k, r]) => [k, k === id ? moved : r]));
  };
  /** The same with the opening at street level: `real` metres from the flank (negative: an overshoot past it). */
  const withOpening = (id: string, flank: number, real: number): Map<string, PackResult> => withGap(id, real - flank);

  it("measures a corner block's flank from its corner column's ground piece, not its roof: on the default city all 34 corner blocks stand 0.36 to 0.75 m shallower at street level", () => {
    const ends = cornerEnds();
    expect(ends.length).toBe(34);
    for (const e of ends) {
      expect(e.flank, e.id).toBeGreaterThan(0.35);
      expect(e.flank, e.id).toBeLessThan(0.76);
    }
    // The recorded passages are the real openings, wider than the packer's gap by the flank, and still inside a column.
    const { city, wall } = defaultCity();
    const wide = tilePassages(city, wall);
    expect(wide.length).toBeGreaterThan(30);
    for (const q of wide) expect(q.w_m, q.run).toBeLessThanOrEqual(PASSAGE_W_M.max);
    const flankOf = new Map(ends.map((e) => [e.id, e.flank] as const));
    for (const q of wide) {
      const gap = wall.get(q.run)!.farGap_m;
      expect(q.w_m, q.run).toBeCloseTo(gap + (flankOf.get(q.run) ?? 0), 9);
    }
  });

  it("fails a seam, and a 0.2 m overshoot, made against a corner block whose ground piece is shallower than its roof: the street-level opening is a slit nothing covers", { timeout: 60000 }, () => {
    const { city } = defaultCity();
    const ends = cornerEnds();
    for (const e of ends.slice(0, 6)) {
      // A seam by the packer's own measure (0.05 m to the roof's wall) leaves 0.05 + flank at street level, 0.41 to 0.80 m.
      const seam = frontageMetrics(city, withGap(e.id, 0.05));
      expect(seam.uncovered, `${e.id} seam`).toBeGreaterThan(0);
      expect(seam.farEnds.slit, `${e.id} seam`).toBeGreaterThanOrEqual(1);
      expect(evaluateFrontage(seam)[1]!.pass, `${e.id} seam`).toBe(false);
      // A 0.2 m overshoot to the roof's wall reaches only to 0.2 - flank at street level: flank is over 0.35, so it falls short.
      const over = frontageMetrics(city, withGap(e.id, -0.2));
      expect(over.uncovered, `${e.id} overshoot`).toBeGreaterThan(0);
      expect(evaluateFrontage(over)[1]!.pass, `${e.id} overshoot`).toBe(false);
    }
    // The same ends are fine when the street-level wall is really met: an opening of 0 (a seam), and an overshoot that reaches it.
    const e0 = ends[0]!;
    expect(evaluateFrontage(frontageMetrics(city, withOpening(e0.id, e0.flank, 0.05)))[1]!.pass).toBe(true);
    expect(evaluateFrontage(frontageMetrics(city, withOpening(e0.id, e0.flank, -0.3)))[1]!.pass).toBe(true);
  });

  it("fails on a far gap of a slit (0.5 m), a run left unpacked, and an overshoot past END_OVERLAP_MAX_M, and holds a passage to 5.3 m at street level", { timeout: 60000 }, () => {
    const { city, wall } = defaultCity();
    const e = cornerEnds()[0]!;
    // A real opening of 0.5 m is neither a seam nor a passage, so nothing covers it.
    const slit = frontageMetrics(city, withOpening(e.id, e.flank, 0.5));
    expect(slit.uncovered).toBeGreaterThan(0);
    expect(slit.farEnds.slit).toBe(1);
    expect(evaluateFrontage(slit)[1]!.pass).toBe(false);
    // A run with no building is a whole run of nothing.
    const none = frontageMetrics(city, new Map([...wall].map(([k, v]) => [k, k === e.id ? { ...v, blocks: [] } : v])));
    expect(none.uncovered).toBeGreaterThan(0);
    expect(evaluateFrontage(none)[1]!.pass).toBe(false);
    // An overshoot of 1.2 m at street level is further into the corner block than the ticket allows.
    const deep = frontageMetrics(city, withOpening(e.id, e.flank, -1.2));
    expect(deep.farEnds.overshootBad).toBe(1);
    expect(evaluateFrontage(deep)[1]!.pass).toBe(false);
    // 5.3 m is a passage and covered; 5.4 m is wider than a column and is not.
    const max = frontageMetrics(city, withOpening(e.id, e.flank, PASSAGE_W_M.max));
    expect(max.farEnds.wide).toBe(0);
    expect(max.uncovered).toBe(0);
    expect(max.passages.find((q) => q.run === e.id)?.w_m).toBeCloseTo(PASSAGE_W_M.max, 9);
    expect(evaluateFrontage(max)[1]!.pass).toBe(true);
    const wider = frontageMetrics(city, withOpening(e.id, e.flank, 5.4));
    expect(wider.farEnds.wide).toBe(1);
    expect(wider.uncovered).toBeGreaterThan(0);
  });

  it("fails on a city with nothing packed, which has covered none of its pavement edge", () => {
    const { city } = defaultCity();
    const m = frontageMetrics(city, new Map());
    expect(m.uncovered).toBeGreaterThan(0);
    expect(evaluateFrontage(m)[1]!.pass).toBe(false);
  });

  it("leaves the ladder as it was: a run with no frame takes no overlap, so no result carries farOvershoot_m and packTown on bare runs is the same as asking for 0", { timeout: 60000 }, () => {
    const { city, wall } = defaultCity();
    expect(farOverlapOf({})).toBe(0);
    expect(city.town.terraces.every((r) => farOverlapOf(r) === END_OVERLAP_MAX_M)).toBe(true);
    const bare = city.town.terraces.map((r) => {
      const { frame: _f, ...rest } = r;
      return rest;
    });
    const a = packTown({ terraces: bare, lots: city.town.lots }, STACK_STYLES, ENTRIES, BUILDING_FRONTS);
    const b = packTown({ terraces: bare, lots: city.town.lots }, STACK_STYLES, ENTRIES, BUILDING_FRONTS, { farOverlap_m: 0 });
    expect(a).toEqual(b);
    for (const r of a.values()) expect("farOvershoot_m" in r).toBe(false);
    // On the tile city the same option is what makes the overshoot: asking for 0 gives none, and nothing then overlaps.
    const none = packTown({ terraces: city.town.terraces, lots: city.town.lots }, STACK_STYLES, ENTRIES, BUILDING_FRONTS, { farOverlap_m: 0 });
    for (const r of none.values()) expect(r.farOvershoot_m ?? 0).toBe(0);
    expect([...wall.values()].some((r) => (r.farOvershoot_m ?? 0) > 0)).toBe(true);
  });
});
