/**
 * Ticket 051 section C: the terrace packer. Pure: fixture entries with names and sizes typed in as numbers from the converted City Pack manifest (18 Nov 2026),
 * no GLB, no WebGL, no timers. The runs come from the committed puzzles (`townLayout`), never from assets/private/.
 */

import { describe, expect, it } from "vitest";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { ASSET_MANIFEST_VERSION, loadPuzzle, type AssetEntry, type CalibrationKey, type Puzzle } from "../core";
import { NODE_SQUARE } from "../render/city";
import { wireLayout } from "./layout";
import { BUILDING_FRONTS } from "./models";
import { STACK_STYLES, type Stack, type StackStyle } from "./stacks";
import { ALLEY_MAX_M, ALLEY_MIN_M, TERRACE_SEAM_M, cornerBlock, cornerOptions, cornerStyle, farWall_m, nextTerraceRun, packTerrace, packTown, type PackResult } from "./terrace";
import { TERRACE_BAYS, TERRACE_DEPTH_M, WIRE_CLEAR, WORLD_PER_METRE, townClears, townLayout, type Lot, type TerraceRun, type Town } from "./town";

void ASSET_MANIFEST_VERSION;

// ---- a fixture copied from the converted City Pack manifest: [name, width, height, depth] in metres; bounds are centred ----
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
  ["SM_Bld_OfficeOld_Small_Base_01", 10.936, 6.0, 10.936],
  ["SM_Bld_OfficeOld_Small_Floor_01", 10.0, 3.193, 10.0],
  ["SM_Bld_OfficeOld_Small_Roof_01", 11.12, 4.215, 11.2],
  ["SM_Bld_OfficeOld_Large_Base_01", 15.936, 6.0, 15.936],
  ["SM_Bld_OfficeOld_Large_Floor_01", 15.0, 3.193, 15.0],
  ["SM_Bld_OfficeOld_Large_Roof_01", 16.087, 4.227, 16.123],
  ["SM_Bld_OfficeOctagon_Base_01", 20.781, 3.896, 20.781],
  ["SM_Bld_OfficeOctagon_Floor_01", 20.465, 3.0, 20.465],
  ["SM_Bld_OfficeOctagon_Roof_01", 20.465, 5.382, 20.465],
];
const entryOf = (name: string, w: number, h: number, d: number): AssetEntry => ({
  name,
  source: `${name}.fbx`,
  bounds: { min: [-w / 2, 0, -d / 2], max: [w / 2, h, d / 2] },
  triangles: 100,
  textures: [],
  missingTextures: [],
  warnings: [],
});
const keyOf = (name: string): CalibrationKey => `city-pack:${name}`;
const ENTRIES: ReadonlyMap<CalibrationKey, AssetEntry> = new Map(SIZES.map(([n, w, h, d]) => [keyOf(n), entryOf(n, w, h, d)]));
const NO_ENTRIES: ReadonlyMap<CalibrationKey, AssetEntry> = new Map();

const W = WORLD_PER_METRE;
const EPS = 1e-6;
const MID_W: Record<string, number> = { "apartment-01": 5.0, "apartment-02": 5.17, "apartment-03": 5.281 };
const APARTMENTS = STACK_STYLES.filter((s) => s.depth === "bay").map((s) => s.id);

const nextRunOf = (town: Town, run: TerraceRun): TerraceRun | undefined => nextTerraceRun(town.terraces, run);
/** A town packed once (the runs of a block are packed together: each closes to its next row's real corner block). */
const packed = new WeakMap<Town, Map<string, PackResult>>();
const pack = (run: TerraceRun, town: Town): PackResult => {
  let m = packed.get(town);
  if (!m) {
    m = packTown(town, STACK_STYLES, ENTRIES, BUILDING_FRONTS);
    packed.set(town, m);
  }
  return m.get(run.id)!;
};
/** The far wall of a run on a town: its next row's real corner block's back wall, as that block was built. */
const wallOf = (town: Town, run: TerraceRun): number | undefined => {
  const next = nextRunOf(town, run);
  const block = run.endAbuts === "corner" && next && next.startCorner !== null ? pack(next, town).blocks[0] : undefined;
  return block ? run.len / W + Math.max(0, TERRACE_DEPTH_M - block.stack.depth_m) : undefined;
};

// ---- synthetic runs, typed in (no town): along +x, front toward +z, so the lot's +x points toward the run's start ----
function synthRun(opts: { lenM: number; bays: number[]; cap?: number[]; start: "corner" | "none"; end?: TerraceRun["endAbuts"]; id?: string }): { run: TerraceRun; nominal: Lot[] } {
  const id = opts.id ?? "road:1:r0";
  const lots: Lot[] = [];
  let at = 0;
  opts.bays.forEach((b, i) => {
    const w = b * 5.2 * W;
    lots.push({
      x: at + w / 2,
      z: -3 * W,
      w,
      d: 6 * W,
      yaw: 0,
      type: "large",
      hMax: (opts.cap?.[i] ?? 16) * W,
      key: `${id}:${i}`,
      street: "road",
      side: 1,
      corner: i === 0 && opts.start === "corner",
      cornerSides: i === 0 && opts.start === "corner" ? [{ side: "-x", road: "cross" }] : [],
      terrace: { run: id, index: i, bays: b },
    });
    at += w;
  });
  const run: TerraceRun = {
    id,
    block: "b",
    road: "road",
    side: 1,
    lots: lots.map((_, i) => i),
    ax: 0,
    az: 0,
    ux: 1,
    uz: 0,
    len: opts.lenM * W,
    startCorner: opts.start === "corner" ? { side: "-x", road: "cross" } : null,
    endAbuts: opts.end ?? "corner",
  };
  return { run, nominal: lots };
}
const packSynth = (s: { run: TerraceRun; nominal: Lot[] }, styles: readonly StackStyle[] = STACK_STYLES, entries = ENTRIES): PackResult => packTerrace(s.run, s.nominal, styles, entries, BUILDING_FRONTS);

/** A block's start and end along its run, metres, from its lot's centre. */
const spanOfBlock = (run: TerraceRun, l: Lot): [number, number] => {
  const t = ((l.x - run.ax) * run.ux + (l.z - run.az) * run.uz) / W;
  return [t - l.w / 2 / W, t + l.w / 2 / W];
};

describe("packTerrace on a typed-in run", () => {
  it("lays blocks flush from the run's start, from the pieces' true widths, and closes a 31.2 m run to within the seam", () => {
    const r = packSynth(synthRun({ lenM: 31.2, bays: [3, 3], start: "none" }));
    expect(r.blocks.length).toBeGreaterThan(1);
    let end = 0;
    for (const b of r.blocks) {
      const [s, e] = spanOfBlock(synthRun({ lenM: 31.2, bays: [3, 3], start: "none" }).run, b.lot);
      expect(Math.abs(s - end)).toBeLessThan(EPS);
      expect(b.lot.w / W).toBeCloseTo(b.stack.width_m, 9);
      // No model is scaled: a mid-row block is exactly its columns' floor-piece width, whatever the nominal lot said.
      expect(b.stack.width_m).toBeCloseTo(b.bays * MID_W[b.style]!, 9);
      end = e;
    }
    expect(r.farGap_m).toBeGreaterThanOrEqual(0);
    expect(r.farGap_m).toBeLessThanOrEqual(TERRACE_SEAM_M + 1e-9);
    expect(Math.abs(end + r.farOverhang_m + r.farGap_m - 31.2)).toBeLessThan(EPS);
  });

  it("closes to within the seam nearly every length of a long run (over 90 m, columns of 5.0 to 5.3 m leave no dead band), at a corner start or not", () => {
    for (const start of ["corner", "none"] as const) {
      let closed = 0;
      let n = 0;
      for (let len = 90; len <= 120; len += 1.7) {
        const r = packSynth(synthRun({ lenM: len, bays: [4, 4, 4, 4, 4, 4], start, id: `long:${len.toFixed(1)}` }));
        n++;
        if (r.farGap_m <= TERRACE_SEAM_M + 1e-9) closed++;
        expect(r.farGap_m).toBeGreaterThanOrEqual(0);
      }
      expect(closed / n, start).toBeGreaterThanOrEqual(0.9);
    }
  });

  it("runs a corner or plaza end on past the last nominal lot to the run's end, and stops a parking or clearance end at the last lot", () => {
    const corner = packSynth(synthRun({ lenM: 42, bays: [4, 3], start: "none", end: "corner" }));
    const lastEnd = (r: PackResult, s: ReturnType<typeof synthRun>): number => spanOfBlock(s.run, r.blocks[r.blocks.length - 1]!.lot)[1];
    const sc = synthRun({ lenM: 42, bays: [4, 3], start: "none", end: "corner" });
    expect(lastEnd(corner, sc)).toBeGreaterThan(7 * 5.2 + 3);
    expect(lastEnd(corner, sc)).toBeLessThanOrEqual(42 + EPS);
    const sp = synthRun({ lenM: 7 * 5.2, bays: [4, 3], start: "none", end: "parking" });
    const parking = packSynth(sp);
    expect(parking.blocks.length).toBeGreaterThan(0);
    expect(lastEnd(parking, sp)).toBeLessThanOrEqual(7 * 5.2 + EPS);
  });

  it("makes the first block a corner block only when the run starts at a corner, with the corner column on that side and no other corner block", () => {
    const at = synthRun({ lenM: 41.6, bays: [4, 4], start: "corner" });
    const r = packSynth(at);
    expect(r.blocks[0]!.corner).toBe(true);
    expect(r.blocks[0]!.lot.cornerSides).toEqual([{ side: "-x", road: "cross" }]);
    expect(r.blocks[0]!.stack.cornerSides).toEqual(["-x"]);
    expect(r.blocks[0]!.stack.columns[0]!.corner).toBe("-x");
    for (const b of r.blocks.slice(1)) {
      expect(b.corner).toBe(false);
      expect(b.stack.cornerSides).toEqual([]);
      expect(b.stack.columns.every((c) => c.corner === null)).toBe(true);
    }
    const none = packSynth(synthRun({ lenM: 41.6, bays: [4, 4], start: "none" }));
    expect(none.blocks.every((b) => !b.corner && b.stack.cornerSides.length === 0)).toBe(true);
  });

  it("never lets neighbours share a style or a floor count, keeps each block under its nominal lot's cap, and uses 2 to 4 floors on a 16 m cap", () => {
    const s = synthRun({ lenM: 83.2, bays: [4, 4, 4, 4], start: "corner" });
    const r = packSynth(s);
    expect(r.blocks.length).toBeGreaterThan(5);
    r.blocks.forEach((b, i) => {
      expect(b.stack.height_m).toBeLessThanOrEqual(16 + 1e-9);
      expect(b.floors).toBeGreaterThanOrEqual(2);
      expect(b.floors).toBeLessThanOrEqual(4);
      expect(b.stack.floors).toBe(b.floors);
      expect(b.bays).toBeGreaterThanOrEqual(TERRACE_BAYS.min);
      expect(b.bays).toBeLessThanOrEqual(TERRACE_BAYS.max);
      if (i > 0) {
        expect(b.style).not.toBe(r.blocks[i - 1]!.style);
        expect(b.floors).not.toBe(r.blocks[i - 1]!.floors);
      }
    });
  });

  it("takes the lowest cap of the nominal lots a block overlaps: a 10 m cap gives two floors, a 13 m cap at most three", () => {
    const s = synthRun({ lenM: 62.4, bays: [4, 4, 4], cap: [16, 10, 13], start: "none" });
    const r = packSynth(s);
    expect(r.blocks.length).toBeGreaterThan(3);
    for (const b of r.blocks) {
      const [a, e] = spanOfBlock(s.run, b.lot);
      const lots = [16, 10, 13].filter((_, i) => e > i * 20.8 + 1e-6 && a < (i + 1) * 20.8 - 1e-6);
      const cap = Math.min(...lots);
      expect(b.lot.hMax / W).toBeCloseTo(cap, 6);
      expect(b.stack.height_m).toBeLessThanOrEqual(cap + 1e-9);
    }
    expect(r.blocks.some((b) => b.floors === 2 && b.lot.hMax / W <= 10 + 1e-6)).toBe(true);
  });

  it("is deterministic per run id, and a different id gives a different street wall", () => {
    const a = synthRun({ lenM: 83.2, bays: [4, 4, 4, 4], start: "corner", id: "road:1:r0" });
    const sig = (r: PackResult): string => r.blocks.map((b) => `${b.style}/${b.bays}/${b.floors}`).join(",");
    expect(sig(packSynth(a))).toBe(sig(packSynth(a)));
    expect(packSynth(a)).toEqual(packSynth(a));
    const sigs = new Set(["r0", "r1", "r2", "r3", "r4", "r5"].map((n) => sig(packSynth(synthRun({ lenM: 83.2, bays: [4, 4, 4, 4], start: "corner", id: `road:1:${n}` })))));
    expect(sigs.size).toBeGreaterThan(3);
  });

  it("gives no block, and the run's whole length as the gap, when nothing can stand: a run under one block, no City Pack piece, or only offices", () => {
    const short = synthRun({ lenM: 8, bays: [2], start: "none", end: "parking" });
    expect(packSynth(short)).toEqual({ blocks: [], farGap_m: 8, farOverhang_m: 0, dropped: 0 });
    const s = synthRun({ lenM: 41.6, bays: [4, 4], start: "none" });
    expect(packSynth(s, STACK_STYLES, NO_ENTRIES)).toEqual({ blocks: [], farGap_m: 41.6, farOverhang_m: 0, dropped: 0 });
    expect(packSynth(s, STACK_STYLES.filter((x) => x.depth === "footprint")).blocks).toEqual([]);
    // A corner start with no style that has corner pieces gets no block either (a corner block needs its corner column).
    const noCorner = new Map([...ENTRIES].filter(([k]) => !k.includes("Corner")));
    expect(packSynth(synthRun({ lenM: 41.6, bays: [4, 4], start: "corner" }), STACK_STYLES, noCorner).blocks).toEqual([]);
  });

  it("leaves the remainder at the far end only, never negative, when no block sequence fits (a 12 m run: one 2-bay block of 10.0 to 10.6 m)", () => {
    const s = synthRun({ lenM: 12, bays: [2], start: "none" });
    const r = packSynth(s);
    expect(r.blocks).toHaveLength(1);
    expect(r.farGap_m).toBeGreaterThan(TERRACE_SEAM_M);
    expect(r.farGap_m).toBeGreaterThanOrEqual(0);
    expect(spanOfBlock(s.run, r.blocks[0]!.lot)[0]).toBeCloseTo(0, 9);
    expect(r.farGap_m + r.farOverhang_m + r.blocks[0]!.stack.width_m).toBeCloseTo(12, 9);
  });
});

// ---- the ladder: every run on every map ----

const files = [...readdirSync("puzzles").filter((f) => f.endsWith(".json")), "lamp-row.grid.json"].map((f) => join("puzzles", f)).filter((f, i, all) => existsSync(f) && all.indexOf(f) === i);
interface Packed {
  name: string;
  puzzle: Puzzle;
  town: Town;
  runs: { run: TerraceRun; result: PackResult }[];
}
let memo: Packed[] | null = null;
function ladder(): Packed[] {
  memo ??= files.map((f) => {
    const puzzle = loadPuzzle(JSON.parse(readFileSync(f, "utf8")));
    const town = townLayout(puzzle);
    return { name: f.split(/[\\/]/).pop()!, puzzle, town, runs: town.terraces.map((run) => ({ run, result: pack(run, town) })) };
  });
  return memo;
}

describe("packTerrace over every run on every map", () => {
  it("lays every block flush from the run's start, never past its far end, and the far gap never negative", { timeout: 60000 }, () => {
    let runs = 0;
    for (const m of ladder()) {
      for (const { run, result } of m.runs) {
        runs++;
        const tag = `${m.name} ${run.id}`;
        expect(result.blocks.length, tag).toBeGreaterThan(0);
        expect(result.farGap_m, tag).toBeGreaterThanOrEqual(0);
        const nominal = run.lots.map((i) => m.town.lots[i]!);
        const nomEnd = nominal.reduce((sum, l) => sum + l.w, 0) / W;
        const wall = wallOf(m.town, run);
        const avail = run.endAbuts === "corner" ? Math.max(run.len / W, wall ?? 0) : run.endAbuts === "plaza" ? run.len / W : nomEnd;
        let end = 0;
        result.blocks.forEach((b, i) => {
          const [s, e] = spanOfBlock(run, b.lot);
          expect(Math.abs(s - end), `${tag} block ${i} flush`).toBeLessThan(EPS);
          expect(e - s, `${tag} block ${i}`).toBeGreaterThan(0);
          end = e;
          // Inside the run's ground: its front line and depth are the nominal lots', and it ends no later than the run does.
          const f = nominal[0]!;
          expect(b.lot.d, tag).toBeCloseTo(f.d, 9);
          expect(b.lot.yaw, tag).toBe(f.yaw);
          const frontOff = (b.lot.x + Math.sin(b.lot.yaw) * (b.lot.d / 2) - run.ax) * Math.sin(b.lot.yaw) + (b.lot.z + Math.cos(b.lot.yaw) * (b.lot.d / 2) - run.az) * Math.cos(b.lot.yaw);
          expect(Math.abs(frontOff), `${tag} front line`).toBeLessThan(EPS);
        });
        expect(end, tag).toBeLessThanOrEqual(avail + EPS);
        expect(Math.abs(end + result.farOverhang_m + result.farGap_m - avail), tag).toBeLessThan(EPS);
      }
    }
    expect(runs).toBeGreaterThan(1000);
  });

  it("keeps every block on cleared ground: none overlaps a road, pad, pavement, node square, place or another block's lot, or comes within WIRE_CLEAR of a wire", { timeout: 60000 }, () => {
    type P = { x: number; z: number };
    const boxPts = (b: { x: number; z: number; w: number; d: number; yaw: number }): P[] => {
      const ex = Math.cos(b.yaw);
      const ez = -Math.sin(b.yaw);
      const fx = Math.sin(b.yaw);
      const fz = Math.cos(b.yaw);
      return ([[-1, -1], [1, -1], [1, 1], [-1, 1]] as const).map(([sw, sd]) => ({ x: b.x + (ex * sw * b.w) / 2 + (fx * sd * b.d) / 2, z: b.z + (ez * sw * b.w) / 2 + (fz * sd * b.d) / 2 }));
    };
    const bbox = (pts: readonly P[]): { minX: number; maxX: number; minZ: number; maxZ: number } => ({
      minX: Math.min(...pts.map((p) => p.x)),
      maxX: Math.max(...pts.map((p) => p.x)),
      minZ: Math.min(...pts.map((p) => p.z)),
      maxZ: Math.max(...pts.map((p) => p.z)),
    });
    const near = (a: ReturnType<typeof bbox>, b: ReturnType<typeof bbox>): boolean => a.minX <= b.maxX && a.maxX >= b.minX && a.minZ <= b.maxZ && a.maxZ >= b.minZ;
    /** Separating-axis gap: >= 0 apart, below 0 overlapping by that much. */
    const gap = (a: readonly P[], b: readonly P[]): number => {
      let best = -Infinity;
      for (const poly of [a, b]) {
        for (let i = 0; i < poly.length; i++) {
          const p = poly[i]!;
          const q = poly[(i + 1) % poly.length]!;
          const len = Math.hypot(q.x - p.x, q.z - p.z);
          if (len < 1e-12) continue;
          const nx = (q.z - p.z) / len;
          const nz = -(q.x - p.x) / len;
          const proj = (s: readonly P[]): [number, number] => [Math.min(...s.map((v) => v.x * nx + v.z * nz)), Math.max(...s.map((v) => v.x * nx + v.z * nz))];
          const [alo, ahi] = proj(a);
          const [blo, bhi] = proj(b);
          best = Math.max(best, blo - ahi, alo - bhi);
        }
      }
      return best;
    };
    const segDist = (px: number, pz: number, ax: number, az: number, bx: number, bz: number): number => {
      const dx = bx - ax;
      const dz = bz - az;
      const l2 = dx * dx + dz * dz;
      const t = l2 > 0 ? Math.min(Math.max(((px - ax) * dx + (pz - az) * dz) / l2, 0), 1) : 0;
      return Math.hypot(px - (ax + t * dx), pz - (az + t * dz));
    };
    let checked = 0;
    for (const m of ladder()) {
      const statics: { pts: P[]; box: ReturnType<typeof bbox> }[] = [];
      const add = (pts: P[]): void => void statics.push({ pts, box: bbox(pts) });
      for (const r of m.town.roads) add(r.corners.map((c) => ({ x: c.x, z: c.z })));
      for (const pv of m.town.pavements) add(pv.pts.map((c) => ({ x: c.x, z: c.z })));
      for (const pad of m.town.pads) if (pad.pts.length >= 3) add(pad.pts.map((c) => ({ x: c.x, z: c.z })));
      for (const n of m.puzzle.nodes) add(boxPts({ x: n.pos[0], z: n.pos[1], w: NODE_SQUARE, d: NODE_SQUARE, yaw: 0 }));
      for (const pl of m.town.places) for (const b of pl.boxes) add(boxPts(b));
      // Lots that are not terrace lots (the circuit's and the ring's own), and the open lots, which a block must not cover either.
      for (const l of m.town.lots) if (l.terrace === undefined) add(boxPts(l));
      for (const o of m.town.openLots) add(boxPts(o));
      const segs: { ax: number; az: number; bx: number; bz: number }[] = [];
      for (const w of wireLayout(m.puzzle)) for (const span of w.spans) span.forEach((p, j) => j > 0 && segs.push({ ax: span[j - 1]!.x, az: span[j - 1]!.z, bx: p.x, bz: p.z }));
      const terraceLots = m.town.lots.filter((l) => l.terrace !== undefined).map((l) => ({ run: l.terrace!.run, pts: boxPts(l), box: bbox(boxPts(l)) }));
      for (const { run, result } of m.runs) {
        for (const b of result.blocks) {
          checked++;
          const pts = boxPts(b.lot);
          const box = bbox(pts);
          for (const s of statics) if (near(box, s.box)) expect(gap(pts, s.pts), `${m.name} ${b.lot.key} overlaps something`).toBeGreaterThan(-EPS);
          // Nor another run's nominal lots (the next row's corner block it runs on to).
          // Nor another run's nominal lots, the part of the block past the run's length (the band line) apart: that part is in the next corner lot, behind its stack, and
          // the corner-footprint test below holds the pieces out of the stack.
          const [bs, be] = spanOfBlock(run, b.lot);
          const cut = Math.min(be, run.len / W);
          const shift = ((bs + cut) / 2 - (bs + be) / 2) * W;
          const clipped = boxPts({ ...b.lot, w: (cut - bs) * W, x: b.lot.x + run.ux * shift, z: b.lot.z + run.uz * shift });
          const cbox = bbox(clipped);
          for (const t of terraceLots) if (t.run !== run.id && near(cbox, t.box)) expect(gap(clipped, t.pts), `${m.name} ${b.lot.key} overlaps a lot of ${t.run}`).toBeGreaterThan(-EPS);
          for (const sg of segs) {
            if (Math.min(sg.ax, sg.bx) > box.maxX + WIRE_CLEAR || Math.max(sg.ax, sg.bx) < box.minX - WIRE_CLEAR || Math.min(sg.az, sg.bz) > box.maxZ + WIRE_CLEAR || Math.max(sg.az, sg.bz) < box.minZ - WIRE_CLEAR) continue;
            const d = Math.min(...pts.map((p) => segDist(p.x, p.z, sg.ax, sg.az, sg.bx, sg.bz)), ...pts.flatMap((p, i) => { const q = pts[(i + 1) % 4]!; return [segDist(sg.ax, sg.az, p.x, p.z, q.x, q.z), segDist(sg.bx, sg.bz, p.x, p.z, q.x, q.z)]; }));
            const inside = gap(pts, [{ x: sg.ax, z: sg.az }, { x: sg.bx, z: sg.bz }]) < 0;
            expect(inside || d < WIRE_CLEAR - 1e-9, `${m.name} ${b.lot.key} is too near a wire`).toBe(false);
          }
        }
        // Blocks of one run never overlap one another (flush neighbours touch, never below 0): implied by the flush test; the run's block keys are unique.
        expect(new Set(result.blocks.map((b) => b.lot.key)).size, run.id).toBe(result.blocks.length);
      }
    }
    expect(checked).toBeGreaterThan(3000);
  });

  it("puts a corner block only at a run's start, exactly when the run starts at a corner, with its corner column on that side; a run that starts at a plaza has none", { timeout: 60000 }, () => {
    let corners = 0;
    let afterPlaza = 0;
    for (const m of ladder()) {
      const plazaRuns = new Set(m.town.openLots.filter((o) => o.kind === "plaza").map((o) => o.run));
      for (const { run, result } of m.runs) {
        const tag = `${m.name} ${run.id}`;
        result.blocks.forEach((b, i) => {
          const wantCorner = i === 0 && run.startCorner !== null;
          expect(b.corner, `${tag} block ${i}`).toBe(wantCorner);
          if (wantCorner) {
            corners++;
            const side = run.startCorner!.side;
            expect(b.stack.cornerSides, tag).toEqual([side]);
            expect(b.stack.columns[side === "-x" ? 0 : b.stack.columns.length - 1]!.corner, tag).toBe(side);
            expect(b.lot.cornerSides, tag).toEqual([run.startCorner]);
            // The lot's +x side is the one toward the run's start (the corner column is where the run starts).
            const toStart = Math.cos(b.lot.yaw) * run.ux - Math.sin(b.lot.yaw) * run.uz < 0 ? "+x" : "-x";
            expect(toStart, tag).toBe(side);
          } else {
            expect(b.stack.cornerSides, `${tag} block ${i}`).toEqual([]);
            expect(b.stack.columns.every((c) => c.corner === null), `${tag} block ${i}`).toBe(true);
            expect(b.lot.corner, `${tag} block ${i}`).toBe(false);
          }
        });
        if (plazaRuns.has(run.id)) {
          // The plaza's own run id is the row it stands at the start of: that row's first run starts after the plaza, so it has no corner.
          const startsAfter = m.town.terraces.filter((r) => r.block === run.block && r.road === run.road && r.side === run.side)[0];
          if (startsAfter === run) {
            afterPlaza++;
            expect(run.startCorner, tag).toBeNull();
            expect(result.blocks.some((b) => b.corner), tag).toBe(false);
          }
        }
      }
    }
    expect(corners).toBeGreaterThan(500);
    expect(afterPlaza).toBeGreaterThan(20);
  });

  it("keeps neighbours different in style and in floor count, every block under its nominal lot's cap, floors at 2 to 4, and gives the same packing twice", { timeout: 60000 }, () => {
    const styles = new Set<string>();
    const floors = new Set<number>();
    const bays = new Set<number>();
    for (const m of ladder()) {
      for (const { run, result } of m.runs) {
        const nominal = run.lots.map((i) => m.town.lots[i]!);
        result.blocks.forEach((b, i) => {
          const tag = `${m.name} ${run.id} block ${i}`;
          styles.add(b.style);
          floors.add(b.floors);
          bays.add(b.bays);
          expect(APARTMENTS, tag).toContain(b.style);
          expect(b.floors, tag).toBeGreaterThanOrEqual(2);
          expect(b.floors, tag).toBeLessThanOrEqual(4);
          expect(b.stack.height_m, tag).toBeLessThanOrEqual(b.lot.hMax / W + 1e-9);
          expect(b.stack.depth_m, tag).toBeLessThanOrEqual(b.lot.d / W + 1e-9);
          // Its cap is the lowest of the nominal lots it overlaps.
          const [s, e] = spanOfBlock(run, b.lot);
          let at = 0;
          let cap = Infinity;
          for (const l of nominal) {
            if (at + l.w / W > s + 1e-6 && at < e - 1e-6) cap = Math.min(cap, l.hMax / W);
            at += l.w / W;
          }
          if (Number.isFinite(cap)) expect(b.lot.hMax / W, tag).toBeCloseTo(cap, 6);
          if (i > 0) {
            const p = result.blocks[i - 1]!;
            expect(b.style, tag).not.toBe(p.style);
            // A 10 m cap allows one floor count only; the ladder's rows are all 16 m, so this holds everywhere today.
            if (b.lot.hMax / W > 10 + 1e-6 || p.lot.hMax / W > 10 + 1e-6) {
              expect(b.floors, tag).not.toBe(p.floors);
              // So two neighbours are never of equal height either (a floor is 3 m, a roof under 0.75): the party wall always steps (051 D, equal heights only at a 10 m cap).
              expect(Math.abs(b.stack.height_m - p.stack.height_m), tag).toBeGreaterThan(1);
            }
          }
        });
      }
    }
    expect([...styles].sort()).toEqual(APARTMENTS.slice().sort());
    expect([...floors].sort()).toEqual([2, 3, 4]);
    expect([...bays].sort()).toEqual([2, 3, 4]);
    // Deterministic: a second pass over three maps gives the same blocks.
    for (const m of ladder().slice(0, 3)) {
      const second = packTown(m.town, STACK_STYLES, ENTRIES, BUILDING_FRONTS);
      for (const { run, result } of m.runs) {
        const again = second.get(run.id)!;
        expect(again.farGap_m).toBe(result.farGap_m);
        expect(again.blocks.map((b) => [b.lot.key, b.style, b.bays, b.floors, b.lot.x, b.lot.z, b.lot.w])).toEqual(result.blocks.map((b) => [b.lot.key, b.style, b.bays, b.floors, b.lot.x, b.lot.z, b.lot.w]));
      }
    }
  });

  it("uses every style over the ladder and none for two thirds of the blocks (the dead-band rows take the widest pieces, so an even third each is not reachable; TERRACE_SLACK_M is the knob)", { timeout: 60000 }, () => {
    const count = new Map<string, number>();
    let total = 0;
    for (const m of ladder()) {
      for (const { result } of m.runs) {
        for (const b of result.blocks) {
          count.set(b.style, (count.get(b.style) ?? 0) + 1);
          total++;
        }
      }
    }
    for (const id of APARTMENTS) {
      expect(count.get(id) ?? 0, id).toBeGreaterThan(0.05 * total);
      expect(count.get(id) ?? 0, id).toBeLessThan((2 / 3) * total);
    }
  });

  it("overhangs its columns only a little: no piece sticks out past a block's width by more than 0.45 m", { timeout: 60000 }, () => {
    for (const m of ladder().slice(0, 6)) {
      for (const { result } of m.runs) {
        for (const b of result.blocks) {
          const lo = Math.min(...b.stack.pieces.map((p) => p.x - p.w / 2));
          const hi = Math.max(...b.stack.pieces.map((p) => p.x + p.w / 2));
          const over = Math.max(-lo - b.stack.width_m / 2, hi - b.stack.width_m / 2);
          // Overhang is the roof and shop pieces being a little wider than the column (at most 0.4 m with these pieces), never a block's worth.
          expect(over, `${m.name} ${b.lot.key}`).toBeLessThan(0.45);
        }
      }
    }
  });
});

describe("the packing helpers keep stacks.ts as it was", () => {
  it("lets assembleStack take a lot's own spec and exact columns, and keeps the default call unchanged", async () => {
    const { assembleStack, stackRange } = await import("./stacks");
    const style = STACK_STYLES.find((s) => s.id === "apartment-02")!;
    // Default: a large lot's own 25 m frontage fits 4 columns (the 050 A result); the spec and bays arguments change nothing unless given.
    const plain = assembleStack(style, { type: "large", key: "k", cornerSides: [] }, ENTRIES, BUILDING_FRONTS);
    expect(plain?.bays).toBe(4);
    expect(assembleStack(style, { type: "large", key: "k", cornerSides: [] }, ENTRIES, BUILDING_FRONTS, { bays: 2, spec: { frontage: 40, depth: 6, cap: 16 } })?.bays).toBe(2);
    expect(assembleStack(style, { type: "large", key: "k", cornerSides: [] }, ENTRIES, BUILDING_FRONTS, { bays: 2, spec: { frontage: 40, depth: 5, cap: 16 } })).toBeNull();
    expect(assembleStack(style, { type: "large", key: "k", cornerSides: [] }, ENTRIES, BUILDING_FRONTS, { bays: 0 })).toBeNull();
    expect(stackRange(style, "large", ENTRIES, BUILDING_FRONTS, { frontage: 40, depth: 6, cap: 13 })).toEqual({ bays: 7, min: 2, max: 3 });
    expect(stackRange(style, "large", ENTRIES, BUILDING_FRONTS, { frontage: 40, depth: 6, cap: 10 })).toEqual({ bays: 7, min: 2, max: 2 });
    expect(stackRange(style, "large", ENTRIES, BUILDING_FRONTS, { frontage: 40, depth: 6, cap: 9 })).toBeNull();
    const stack: Stack | null = assembleStack(style, { type: "large", key: "k", cornerSides: [] }, ENTRIES, BUILDING_FRONTS, { bays: 3, spec: { frontage: 40, depth: 6, cap: 16 }, floors: 4 });
    expect(stack?.floors).toBe(4);
    expect(stack?.height_m).toBeLessThanOrEqual(16);
  });
});


// ---- the far end: seam, or alley, never a slit ----

const sourceOf = (f: string): string => readFileSync(join("src", "render3d", f), "utf8");
const gapTier = (g: number): "seam" | "alley" | "slit" | "big" => (g <= TERRACE_SEAM_M + 1e-9 ? "seam" : g >= ALLEY_MIN_M - 1e-9 && g <= ALLEY_MAX_M + 1e-9 ? "alley" : g < ALLEY_MIN_M ? "slit" : "big");

describe("closing the far gap: a seam, or an alley, never a slit", () => {
  it("ends at least 85% of ladder runs in the seam or the alley window and at most 5% in a slit, measured to the next corner block's real back wall", { timeout: 60000 }, () => {
    let runs = 0;
    const tiers = { seam: 0, alley: 0, slit: 0, big: 0 };
    for (const m of ladder()) {
      for (const { result } of m.runs) {
        runs++;
        tiers[gapTier(result.farGap_m)]++;
      }
    }
    expect(runs).toBeGreaterThan(1000);
    expect((tiers.seam + tiers.alley) / runs, JSON.stringify(tiers)).toBeGreaterThanOrEqual(0.85);
    expect(tiers.slit / runs, JSON.stringify(tiers)).toBeLessThanOrEqual(0.05);
  });

  it("takes an alley (1.0 to 1.5 m) where only a 0.3 to 0.5 m slit was possible before: row lengths from 36 to 60 m, between corner blocks, end in a seam or an alley, and in a slit almost never", () => {
    // Nine unscaled columns reach at most about 47.5 m and ten start at 50 m, so a 47.89 m row has no seam; the old packer left 0.37 to 0.48 m there.
    const tiers = { seam: 0, alley: 0, slit: 0, big: 0 };
    let n = 0;
    for (let len = 36; len <= 60; len += 0.37) {
      const bays: number[] = [];
      for (let at = 0; at + 10.4 <= len - 5.2; at += 20.8) bays.push(4);
      const r = packSynth(synthRun({ lenM: len, bays, start: "corner", end: "corner", id: `alley:${len.toFixed(2)}` }));
      tiers[gapTier(r.farGap_m)]++;
      n++;
    }
    expect(tiers.alley, JSON.stringify(tiers)).toBeGreaterThan(n * 0.1);
    expect(tiers.slit, JSON.stringify(tiers)).toBeLessThanOrEqual(n * 0.05);
    expect((tiers.seam + tiers.alley) / n, JSON.stringify(tiers)).toBeGreaterThan(0.7);
    const dead = packSynth(synthRun({ lenM: 47.89, bays: [4, 4], start: "corner", end: "corner", id: "alley:dead" }));
    expect(gapTier(dead.farGap_m)).toBe("alley");
  });

  it("keeps the seam wherever the pieces allow it: runs of 90 to 120 m still close to the seam at least 90% of the time, so an alley never replaces one", () => {
    for (const start of ["corner", "none"] as const) {
      let closed = 0;
      let n = 0;
      for (let len = 90; len <= 120; len += 1.7) {
        const r = packSynth(synthRun({ lenM: len, bays: [4, 4, 4, 4, 4, 4], start, id: `long:${len.toFixed(1)}` }));
        n++;
        if (r.farGap_m <= TERRACE_SEAM_M + 1e-9) closed++;
      }
      expect(closed / n, start).toBeGreaterThanOrEqual(0.9);
    }
  });

  it("ties go to the style used least so far in the run: a long run uses all three styles, none more than a third of its blocks plus one", () => {
    const r = packSynth(synthRun({ lenM: 150, bays: [4, 4, 4, 4, 4, 4, 4], start: "none", id: "tie:r0" }));
    const count = new Map<string, number>();
    for (const b of r.blocks) count.set(b.style, (count.get(b.style) ?? 0) + 1);
    expect(count.size).toBe(3);
    for (const n of count.values()) expect(n).toBeLessThanOrEqual(Math.ceil(r.blocks.length / 3) + 1);
  });

  it("gives each apartment style 20% to 50% of the ladder's terrace blocks", { timeout: 60000 }, () => {
    const count = new Map<string, number>();
    let total = 0;
    for (const m of ladder()) {
      for (const { result } of m.runs) {
        for (const b of result.blocks) {
          count.set(b.style, (count.get(b.style) ?? 0) + 1);
          total++;
        }
      }
    }
    for (const id of APARTMENTS) {
      expect((count.get(id) ?? 0) / total, id).toBeGreaterThanOrEqual(0.2);
      expect((count.get(id) ?? 0) / total, id).toBeLessThanOrEqual(0.5);
    }
  });

  it("makes cornerStyle from the run's id alone, an apartment style with corner pieces, spread over the ids; and prefers it for the corner block", () => {
    const ids = Array.from({ length: 60 }, (_, i) => `road:1:r${i}`);
    const styles = ids.map((id) => cornerStyle({ id }, STACK_STYLES)!.id);
    expect(new Set(styles)).toEqual(new Set(APARTMENTS));
    expect(cornerStyle({ id: ids[3]! }, STACK_STYLES)!.id).toBe(styles[3]);
    expect(cornerStyle({ id: "x" }, STACK_STYLES.filter((x) => x.depth === "footprint"))).toBeNull();
    let preferred = 0;
    for (const id of ids) {
      const r = packSynth(synthRun({ lenM: 83.2, bays: [4, 4, 4, 4], start: "corner", id }));
      if (r.blocks[0]!.style === cornerStyle({ id }, STACK_STYLES)!.id) preferred++;
    }
    // A preference only where the run is packed alone (packTown tries every corner option round a block): the hash's own choice leads cornerOptions.
    expect(preferred / ids.length).toBeGreaterThan(0.5);
    const s = synthRun({ lenM: 83.2, bays: [4, 4, 4, 4], start: "corner", id: ids[0]! });
    expect(cornerOptions(s.run, s.nominal, STACK_STYLES, ENTRIES, BUILDING_FRONTS)[0]!.style.id).toBe(cornerStyle({ id: ids[0]! }, STACK_STYLES)!.id);
    expect(cornerBlock(s.run, s.nominal, STACK_STYLES, ENTRIES, BUILDING_FRONTS)).toEqual(cornerOptions(s.run, s.nominal, STACK_STYLES, ENTRIES, BUILDING_FRONTS)[0]);
  });

  it("states the rule in the guide, and the terrace.ts header no longer claims FAMILY_SHARE_MAX is met by a near-even spread", () => {
    const src = sourceOf("terrace.ts");
    expect(src).not.toMatch(/near-even/);
    expect(src).toContain("not what bounds the terrace");
    expect(readFileSync(join("docs", "city-style-guide.md"), "utf8")).toContain("seam, or alley, never a slit");
  });
});

// ---- the risks the 051 C review handed on ----

describe("the strip, the overhang and the probe", () => {
  it("passes the town's own lot rules on every map: the part of a block past the last nominal lot clears roads, nodes, wires and the occlusion rule at the block's height", { timeout: 60000 }, () => {
    let strips = 0;
    let past = 0;
    for (const m of ladder()) {
      const clears = townClears(m.town)!;
      expect(clears, m.name).not.toBeNull();
      for (const { run, result } of m.runs) {
        const nomEnd = run.lots.reduce((sum, i) => sum + m.town.lots[i]!.w, 0) / W;
        for (const b of result.blocks) {
          const [bs, be] = spanOfBlock(run, b.lot);
          // The strip: from the last nominal lot's end to the run's length (beyond that is the next corner lot's own ground, held off its stack by the footprint test).
          const a = Math.max(bs, nomEnd);
          const e = Math.min(be, run.len / W);
          if (e - a <= 1e-6) continue;
          strips++;
          const mid = ((a + e) / 2) * W;
          const fx = Math.sin(b.lot.yaw);
          const fz = Math.cos(b.lot.yaw);
          const cx = run.ax + run.ux * mid - (fx * b.lot.d) / 2;
          const cz = run.az + run.uz * mid - (fz * b.lot.d) / 2;
          expect(clears(cx, cz, (e - a) * W, b.lot.d, b.lot.yaw, b.lot.hMax, 0), `${m.name} ${b.lot.key} strip at ${b.lot.hMax / W} m`).toBe(true);
        }
        // The part past the run's length (the band line, up to 0.4 m once the far wall is the corner block's real back wall) lies in the next row's corner lot, which was cleared at its
        // own cap: a block that reaches into it is never taller than that lot.
        const next = nextRunOf(m.town, run);
        if (run.endAbuts !== "corner" || !next || next.startCorner === null) continue;
        const cornerLot = m.town.lots[next.lots[0]!]!;
        for (const b of result.blocks) {
          if (spanOfBlock(run, b.lot)[1] <= run.len / W + 1e-6) continue;
          past++;
          expect(b.stack.height_m, `${m.name} ${b.lot.key} reaches into ${cornerLot.key}`).toBeLessThanOrEqual(cornerLot.hMax / W + 1e-9);
        }
      }
    }
    expect(strips).toBeGreaterThan(500);
    expect(past).toBeGreaterThan(100);
  });

  it("holds every piece, roofs and bases included, out of the next row's corner block: none passes its real back wall", { timeout: 60000 }, () => {
    let checked = 0;
    for (const m of ladder()) {
      for (const { run, result } of m.runs) {
        if (run.endAbuts !== "corner") continue;
        const next = nextRunOf(m.town, run);
        const nextBlock = next ? pack(next, m.town).blocks[0] : undefined;
        if (!next || next.startCorner === null || !nextBlock) continue;
        const realWall = run.len / W + (TERRACE_DEPTH_M - nextBlock.stack.depth_m);
        const sign = Math.cos(result.blocks[0]!.lot.yaw) * run.ux - Math.sin(result.blocks[0]!.lot.yaw) * run.uz;
        for (const b of result.blocks) {
          const [bs, be] = spanOfBlock(run, b.lot);
          const mid = (bs + be) / 2;
          for (const p of b.stack.pieces) {
            checked++;
            const far = Math.max(mid + sign * p.x + p.w / 2, mid + sign * p.x - p.w / 2);
            expect(far, `${m.name} ${b.lot.key} ${p.key}`).toBeLessThanOrEqual(realWall + 1e-6);
          }
        }
      }
    }
    expect(checked).toBeGreaterThan(10000);
  });

  it("measures the far wall at the next corner block's real back wall: the run's length plus the band less the depth of the corner block built for that row", () => {
    const s = synthRun({ lenM: 47.89, bays: [4, 4], start: "corner", end: "corner" });
    const nextS = synthRun({ lenM: 40, bays: [4, 4], start: "corner", id: "road2:1:r0" });
    const next = nextS.run;
    const wall = farWall_m(s.run, next, nextS.nominal, STACK_STYLES, ENTRIES, BUILDING_FRONTS)!;
    const real = cornerBlock(next, nextS.nominal, STACK_STYLES, ENTRIES, BUILDING_FRONTS)!;
    expect(wall).toBeGreaterThan(47.89);
    expect(wall).toBeCloseTo(47.89 + (TERRACE_DEPTH_M - real.stack.depth_m), 9);
    // No wall of its own where the next row does not start at a corner (a plaza), or this run does not end at one.
    expect(farWall_m(s.run, { ...next, startCorner: null }, nextS.nominal, STACK_STYLES, ENTRIES, BUILDING_FRONTS)).toBeUndefined();
    expect(farWall_m({ ...s.run, endAbuts: "parking" }, next, nextS.nominal, STACK_STYLES, ENTRIES, BUILDING_FRONTS)).toBeUndefined();
    expect(farWall_m(s.run, undefined, [], STACK_STYLES, ENTRIES, BUILDING_FRONTS)).toBeUndefined();
    // The packer runs on past the band line to the wall, and no further.
    const r = packTerrace(s.run, s.nominal, STACK_STYLES, ENTRIES, BUILDING_FRONTS, { farWall_m: wall });
    const last = r.blocks[r.blocks.length - 1]!;
    const end = spanOfBlock(s.run, last.lot)[1];
    expect(end + r.farOverhang_m).toBeLessThanOrEqual(wall + 1e-9);
    expect(Math.abs(end + r.farOverhang_m + r.farGap_m - wall)).toBeLessThan(1e-9);
  });

  it("builds the corner block the row before measured to: its stack is the one packTerrace stands, and its depth is the wall's, over every corner end on the ladder (5.62 to 5.92 m, not the worst case)", { timeout: 60000 }, () => {
    let ends = 0;
    const depths = new Set<number>();
    for (const m of ladder()) {
      for (const { run, result } of m.runs) {
        if (run.startCorner === null) continue;
        const nominal = run.lots.map((i) => m.town.lots[i]!);
        const options = cornerOptions(run, nominal, STACK_STYLES, ENTRIES, BUILDING_FRONTS);
        expect(options.length, `${m.name} ${run.id}`).toBeGreaterThan(0);
        // The block stood is one of the options, exactly as built (the real stack, not a probe).
        const fixed = options.find((o) => o.style.id === result.blocks[0]!.style && o.bays === result.blocks[0]!.bays);
        expect(fixed, `${m.name} ${run.id}`).toBeDefined();
        expect(result.blocks[0]!.stack, `${m.name} ${run.id}`).toEqual(fixed!.stack);
        // The row before it ends at exactly that block's back wall.
        const before = m.town.terraces.find((r) => r.endAbuts === "corner" && nextRunOf(m.town, r) === run);
        if (before) {
          ends++;
          depths.add(Math.round(fixed!.stack.depth_m * 1000) / 1000);
          expect(wallOf(m.town, before), `${m.name} ${before.id}`).toBeCloseTo(before.len / W + (TERRACE_DEPTH_M - fixed!.stack.depth_m), 9);
        }
      }
    }
    expect(ends).toBeGreaterThan(1000);
    expect(depths.size).toBeGreaterThan(1);
  });

  it("drops the last block, not the whole run, when a style's real piece widths differ from the probe's", () => {
    // A fixture style with two floor pieces of different widths: which one a block takes depends on its key, the probe's (first key) width is planned, the real one may be wider.
    const wide = entryOf("SM_Bld_Apartment_01_Wide", 5.9, 3.0, 5.196);
    const entries = new Map([...ENTRIES, [keyOf("SM_Bld_Apartment_01_Wide"), wide]]);
    const base = STACK_STYLES.find((x) => x.id === "apartment-01")!;
    let dropped = 0;
    for (let i = 0; i < 60; i++) {
      // A style id per case, since the style's id salts the floor piece it picks (the probe is cached per style).
      const mixed: StackStyle = { ...base, id: `apartment-mixed${i % 12}`, floor: { ...base.floor, mid: [keyOf("SM_Bld_Apartment_01"), keyOf("SM_Bld_Apartment_01_Wide")] } };
      const s = synthRun({ lenM: 41.6, bays: [4, 4], start: "none", id: `mix:${i}`, end: "parking" });
      const r = packTerrace(s.run, s.nominal, [mixed, STACK_STYLES.find((x) => x.id === "apartment-02")!], entries, BUILDING_FRONTS);
      expect(r.blocks.length, `mix:${i}`).toBeGreaterThan(0);
      expect(r.farGap_m).toBeGreaterThanOrEqual(0);
      // What stands never passes the far end (the run's last nominal lot).
      const last = r.blocks[r.blocks.length - 1]!;
      expect(spanOfBlock(s.run, last.lot)[1] + r.farOverhang_m, `mix:${i}`).toBeLessThanOrEqual(41.6 + 1e-6);
      if (r.dropped > 0) dropped++;
    }
    expect(dropped).toBeGreaterThan(0);
  });
});
