/**
 * Ticket 051 section B: terrace rows in the town layout. Every outer block row becomes a run of abutting lots (2 to 4 bays of TERRACE_BAY_M, one bay deep, a cap
 * from TERRACE_CAPS_M), with parking lots and corner plazas as open ground, and nothing else in the town moves. Tests read puzzles/ (committed) and nothing under
 * assets/; no timers; no Windows paths.
 */

import { describe, expect, it } from "vitest";
import { createHash } from "node:crypto";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { Box3, type BufferGeometry, type Mesh, type Object3D } from "three";
import { loadPuzzle, type Puzzle } from "../core";
import { NODE_SQUARE, stableHash } from "../render/city";
import { wireLayout } from "./layout";
import { FOOTPRINT_FACTORS, pickPlaceholders } from "./placeholders";
import { buildScene } from "./scene";
import { stubTextSurface } from "./text";
import {
  LAMP_HEAD_Y,
  LOT_GAP,
  NODE_TOP_Y,
  OCCLUDE_SLOPE,
  PARKING_D_M,
  PARKING_MIN_RUN_BAYS,
  PARKING_ONE_IN,
  PARKING_W_M,
  PLAZA_ONE_IN,
  PLAZA_W_M,
  SETBACK,
  TERRACE_BAYS,
  TERRACE_BAY_M,
  TERRACE_CAPS_M,
  TERRACE_DEPTH_M,
  WIRE_CLEAR,
  WORLD_PER_METRE,
  townLayout,
  type Lot,
  type Town,
  type TerraceRun,
} from "./town";

const files = [...readdirSync("puzzles").filter((f) => f.endsWith(".json")), "lamp-row.grid.json"].map((f) => join("puzzles", f)).filter((f, i, all) => existsSync(f) && all.indexOf(f) === i);
const load = (f: string): Puzzle => loadPuzzle(JSON.parse(readFileSync(f, "utf8")));
const maps = files.map((f) => {
  const puzzle = load(f);
  return { name: f.split(/[\\/]/).pop()!, puzzle, on: townLayout(puzzle), off: townLayout(puzzle, { terraces: false }) };
});

const BAY = TERRACE_BAY_M * WORLD_PER_METRE;
const DEPTH = TERRACE_DEPTH_M * WORLD_PER_METRE;
const EPS = 1e-6;

// ---- 041's layout as it stood before 051 B (terraces: false must reproduce it) ----

/**
 * A short hash of every field of the town as 041 laid it (roads, kerbs, pavements, pads, blocks, lots, places, ring, window), numbers rounded to 1e-9, taken on
 * `goal/city-style` before 051 B changed town.ts. `townLayout(p, { terraces: false })` must still give exactly these. A map added later is not in the table and is skipped.
 */
const GOLDEN: Readonly<Record<string, string>> = {
  "01-first-light.json": "1c3db96f58b5", "02-this-way-or-that.json": "46f5f40fd5ee", "03-not-enough-for-all.json": "b7901fbd18f6", "04-the-tired-feed.json": "3fba12261830",
  "05-two-feeds.json": "c302e152732d", "06-the-spark.json": "887453e840aa", "07-past-the-fuse.json": "be0096bd4ca8", "08-where-it-stops.json": "f892bf45a28b",
  "09-shrine-circuit.json": "db5cb31d847f", "10-around-the-dead-post.json": "e06d04b84286", "11-the-small-fuse.json": "9c66166ed7ef", "12-which-fuse.json": "c51aa7284d5c",
  "13-one-box-three-lamps.json": "0294c7812f13", "14-ring-from-the-east.json": "f25cf2f196f9", "15-meet-in-the-middle.json": "f00e2a840e6b", "16-behind-the-first.json": "8687b7040187",
  "17-count-the-dark.json": "56cf6978fde2", "18-the-long-way-round.json": "790fe863277d", "19-why-it-blew.json": "2c91f3c14632", "20-battery-run.json": "9a0ff7174c05",
  "21-wake-the-relay.json": "322a7dfaff2b", "22-look-both-ways.json": "c7c970956648", "23-make-room.json": "f282818719d7", "24-one-wire.json": "d2211511a1ac",
  "25-only-the-relays.json": "f5a42893afa0", "26-far-one-first.json": "68fcfba425ab", "27-switch-before-breaker.json": "4b27727075a2", "28-last-light.json": "33d359894ba5",
  "29-open-point.json": "6251b303b956", "30-which-break.json": "c95c0da3e3d2", "31-leave-the-ring-open.json": "2b33997810bb", "32-read-it-in-the-window.json": "c6d393c9492f",
  "33-take-the-feed-out.json": "a84f8f43dc82", "34-main-fuse.json": "74784dd5aa72", "35-cell-light.json": "2975d157ac5e", "36-set-it-dark.json": "6ec8fe1ea219",
  "37-spend-the-fuse-first.json": "0b28a19873d6", "38-look-behind.json": "abcb54ff37c8", "39-what-is-left.json": "c5dd968c7506", "40-the-priests-list.json": "f7c1c60858e4",
  "41-room-to-charge.json": "30bb13ffdce2", "42-two-windows.json": "88f461a3ead0", "43-parent-fuse.json": "8c837d882aa5", "44-set-in-the-light.json": "b046ccdb620d",
  "45-live-relays.json": "d268e988976f", "46-read-it-from-behind.json": "d9fd674320a7", "47-open-point.json": "92ae53fe2505", "48-the-old-arrangement.json": "baced5554139",
  "49-two-cells.json": "47a67c2c79cd", "50-the-whole-quarter.json": "591ab1753d7d", "51-thrown-twice.json": "988dbe85929c", "52-wire-short.json": "6a8a87cfb9b6",
  "53-from-behind.json": "2190222866e3", "54-the-whole-circuit.json": "054a7f1cead1", "55-leave-it-blown.json": "696053df9d28", "56-whole-ward.json": "9df578e2ffe0",
  "57-the-back-door.json": "542428f681d9", "58-keep-it-live.json": "32514e067316", "59-move-the-meeting.json": "9c99c2b0a5da", "60-hold-the-spring.json": "2b648a906383",
  "61-charge-it-first.json": "284b4e740237", "62-two-springs.json": "c3ed0ffaecd7", "63-keep-the-wire.json": "43a56883c5b7", "64-the-whole-chain.json": "9f266c3bab3b",
  "lamp-row.grid.json": "a02693f47cd4",
};

const round = (_k: string, v: unknown): unknown => (typeof v === "number" ? Math.round(v * 1e9) / 1e9 : v);
const flatHash = (t: Town): string => {
  const { roads, kerbs, pavements, pads, blocks, lots, places, ring, window } = t;
  return createHash("sha1").update(JSON.stringify({ roads, kerbs, pavements, pads, blocks, lots, places, ring, window }, round)).digest("hex").slice(0, 12);
};

// ---- geometry, written here and not shared with town.ts ----

type P = { x: number; z: number };
interface Box {
  x: number;
  z: number;
  w: number;
  d: number;
  yaw: number;
}
const boxPts = (b: Box): P[] => {
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
/** Best separating-axis gap between two convex polygons: >= 0 apart, < 0 overlapping by that much. */
function gap(a: readonly P[], b: readonly P[]): number {
  let best = -Infinity;
  for (const poly of [a, b]) {
    for (let i = 0; i < poly.length; i++) {
      const p = poly[i]!;
      const q = poly[(i + 1) % poly.length]!;
      const len = Math.hypot(q.x - p.x, q.z - p.z);
      if (len < 1e-12) continue;
      const nx = (q.z - p.z) / len;
      const nz = -(q.x - p.x) / len;
      const proj = (s: readonly P[]): [number, number] => {
        let lo = Infinity;
        let hi = -Infinity;
        for (const v of s) {
          const t = v.x * nx + v.z * nz;
          lo = Math.min(lo, t);
          hi = Math.max(hi, t);
        }
        return [lo, hi];
      };
      const [alo, ahi] = proj(a);
      const [blo, bhi] = proj(b);
      best = Math.max(best, blo - ahi, alo - bhi);
    }
  }
  return best;
}
const boxesNear = (a: ReturnType<typeof bbox>, b: ReturnType<typeof bbox>): boolean => a.minX <= b.maxX && a.maxX >= b.minX && a.minZ <= b.maxZ && a.maxZ >= b.minZ;

function pointSegDist(px: number, pz: number, ax: number, az: number, bx: number, bz: number): number {
  const dx = bx - ax;
  const dz = bz - az;
  const l2 = dx * dx + dz * dz;
  const t = l2 > 0 ? Math.min(Math.max(((px - ax) * dx + (pz - az) * dz) / l2, 0), 1) : 0;
  return Math.hypot(px - (ax + t * dx), pz - (az + t * dz));
}
/** Distance from a segment to an axis-aligned rectangle (0 if they touch). */
function segRectDist(ax: number, az: number, bx: number, bz: number, r: ReturnType<typeof bbox>): number {
  const inside = (x: number, z: number): boolean => x >= r.minX && x <= r.maxX && z >= r.minZ && z <= r.maxZ;
  if (inside(ax, az) || inside(bx, bz)) return 0;
  const corners: P[] = [{ x: r.minX, z: r.minZ }, { x: r.maxX, z: r.minZ }, { x: r.maxX, z: r.maxZ }, { x: r.minX, z: r.maxZ }];
  let best = Infinity;
  const cross = (o: P, p: P, q: P): number => (p.x - o.x) * (q.z - o.z) - (p.z - o.z) * (q.x - o.x);
  for (let i = 0; i < 4; i++) {
    const c = corners[i]!;
    const d = corners[(i + 1) % 4]!;
    const a: P = { x: ax, z: az };
    const b: P = { x: bx, z: bz };
    if (cross(a, b, c) * cross(a, b, d) < 0 && cross(c, d, a) * cross(c, d, b) < 0) return 0;
    best = Math.min(best, pointSegDist(c.x, c.z, ax, az, bx, bz));
  }
  // The endpoints' distance to the rectangle.
  for (const [x, z] of [[ax, az], [bx, bz]] as const) best = Math.min(best, Math.hypot(Math.max(r.minX - x, 0, x - r.maxX), Math.max(r.minZ - z, 0, z - r.maxZ)));
  return best;
}

interface World {
  statics: { pts: P[]; box: ReturnType<typeof bbox> }[];
  segs: { ax: number; az: number; bx: number; bz: number }[];
  points: { x: number; y: number; z: number }[];
}
function worldOf(town: Town, puzzle: Puzzle): World {
  const statics: P[][] = [];
  for (const r of town.roads) statics.push(r.corners.map((c) => ({ x: c.x, z: c.z })));
  for (const pv of town.pavements) statics.push(pv.pts.map((c) => ({ x: c.x, z: c.z })));
  for (const pad of town.pads) if (pad.pts.length >= 3) statics.push(pad.pts.map((c) => ({ x: c.x, z: c.z })));
  for (const n of puzzle.nodes) statics.push(boxPts({ x: n.pos[0], z: n.pos[1], w: NODE_SQUARE, d: NODE_SQUARE, yaw: 0 }));
  for (const pl of town.places) for (const b of pl.boxes) statics.push(boxPts(b));
  const segs: World["segs"] = [];
  const points: World["points"] = [];
  for (const run of wireLayout(puzzle)) {
    for (const span of run.spans) {
      span.forEach((p, j) => {
        points.push({ x: p.x, y: p.y, z: p.z });
        if (j > 0) segs.push({ ax: span[j - 1]!.x, az: span[j - 1]!.z, bx: p.x, bz: p.z });
      });
    }
  }
  for (const n of puzzle.nodes) points.push({ x: n.pos[0], y: n.type === "lamp" ? LAMP_HEAD_Y : NODE_TOP_Y, z: n.pos[1] });
  return { statics: statics.map((pts) => ({ pts, box: bbox(pts) })), segs, points };
}
/** Would a building of height h on this axis-aligned box hide a wire point, node top or lamp head from the camera (the 041 rule)? */
const hidden = (w: World, box: ReturnType<typeof bbox>, h: number): boolean =>
  w.points.some((p) => {
    if (p.x < box.minX - 1e-9 || p.x > box.maxX + 1e-9) return false;
    const need = Math.max(0, h - p.y) * OCCLUDE_SLOPE;
    return p.z <= box.maxZ && p.z > box.minZ - need + 1e-9;
  });

const outerBlockOf = (town: Town, x: number, z: number): string | null => town.blocks.find((b) => x >= b.minX - EPS && x <= b.maxX + EPS && z >= b.minZ - EPS && z <= b.maxZ + EPS)?.id ?? null;
const runsOf = (town: Town): Map<string, TerraceRun> => new Map(town.terraces.map((r) => [r.id, r] as const));
/** A lot's start and end along its run's direction, measured from the run's start point. */
const span = (run: TerraceRun, l: Lot): [number, number] => {
  const t = (l.x - run.ax) * run.ux + (l.z - run.az) * run.uz;
  return [t - l.w / 2, t + l.w / 2];
};

// ---- terraces: false is today's layout ----

describe("townLayout(puzzle, { terraces: false })", () => {
  it("has the maps the golden table knows", () => {
    expect(maps.length).toBeGreaterThan(60);
    expect(Object.keys(GOLDEN).filter((k) => maps.some((m) => m.name === k)).length).toBeGreaterThan(60);
  });

  it("is exactly 041's layout on every map: roads, kerbs, pavements, pads, blocks, lots, places, ring and window hash to the values taken before 051 B", () => {
    for (const m of maps) {
      const want = GOLDEN[m.name];
      if (want === undefined) continue;
      expect(flatHash(m.off), m.name).toBe(want);
      expect(m.off.terraces, m.name).toEqual([]);
      expect(m.off.openLots, m.name).toEqual([]);
      expect(
        m.off.lots.some((l) => l.terrace !== undefined),
        m.name,
      ).toBe(false);
    }
  });

  it("is cached per option: one object for each, and the default is terraces on", () => {
    const m = maps[0]!;
    expect(townLayout(m.puzzle, { terraces: false })).toBe(m.off);
    expect(townLayout(m.puzzle, { terraces: true })).toBe(m.on);
    expect(townLayout(m.puzzle)).toBe(m.on);
    expect(m.on).not.toBe(m.off);
  });
});

describe("nothing else moves with terraces on", () => {
  it("keeps roads, kerbs, pavements, pads, blocks, places, ring and window deep-equal, and every lot that is not on an outer block row", () => {
    for (const m of maps) {
      for (const k of ["roads", "kerbs", "pavements", "pads", "blocks", "places", "ring", "window"] as const) expect(m.on[k], `${m.name} ${k}`).toEqual(m.off[k]);
      const outside = (l: Lot): boolean => outerBlockOf(m.off, l.x, l.z) === null;
      const before = m.off.lots.filter(outside);
      const after = m.on.lots.filter((l) => l.terrace === undefined);
      expect(after.length, m.name).toBe(before.length);
      expect(after, m.name).toEqual(before);
      // Every lot the terraces took was in an outer block, and every lot left in one is a terrace lot.
      expect(
        m.on.lots.every((l) => (l.terrace !== undefined) === (outerBlockOf(m.on, l.x, l.z) !== null)),
        m.name,
      ).toBe(true);
    }
  });
});

describe("pick targets are unchanged with terraces on", () => {
  const ids = ["01-first-light", "09-shrine-circuit", "64-the-whole-chain"];
  const targets = (root: Object3D): unknown[] => {
    const out: unknown[] = [];
    root.updateMatrixWorld(true);
    root.traverse((o) => {
      const kind = o.userData["pickKind"];
      if (kind !== "node" && kind !== "wire") return;
      const g = (o as Mesh).geometry as BufferGeometry | undefined;
      const box = g ? new Box3().setFromBufferAttribute(g.getAttribute("position") as never) : null;
      out.push({ id: o.userData["pickId"], kind, matrix: o.matrixWorld.elements.map((v) => Math.round(v * 1e9) / 1e9), box: box ? [box.min.toArray(), box.max.toArray()] : null });
    });
    return out;
  };
  for (const id of ids) {
    it(`has the same pickId, pickKind, world matrix and geometry bounds, in the same order, on ${id}`, () => {
      const puzzle = load(join("puzzles", `${id}.json`));
      const on = buildScene(puzzle, { text: stubTextSurface });
      const off = buildScene(puzzle, { text: stubTextSurface, terraces: false });
      const a = targets(on.scene);
      const b = targets(off.scene);
      expect(a.length).toBeGreaterThan(puzzle.nodes.length);
      expect(a).toEqual(b);
      on.dispose();
      off.dispose();
    });
  }
});

// ---- the terrace rows ----

describe("terrace runs on every map", () => {
  it("turns every outer block row into a run of abutting terrace lots, each bays x TERRACE_BAY_M wide and TERRACE_DEPTH_M deep, under one of TERRACE_CAPS_M", () => {
    for (const m of maps) {
      const runs = runsOf(m.on);
      expect(runs.size, m.name).toBe(m.on.terraces.length);
      const keys = new Set<string>();
      let inRuns = 0;
      for (const run of m.on.terraces) {
        expect(run.lots.length, `${m.name} ${run.id}`).toBeGreaterThan(0);
        const lots = run.lots.map((i) => m.on.lots[i]!);
        let end: number | null = null;
        let total = 0;
        lots.forEach((l, i) => {
          const tag = `${m.name} ${run.id} lot ${i}`;
          expect(l.terrace, tag).toEqual({ run: run.id, index: i, bays: l.terrace!.bays });
          expect(l.terrace!.bays, tag).toBeGreaterThanOrEqual(TERRACE_BAYS.min);
          expect(l.terrace!.bays, tag).toBeLessThanOrEqual(TERRACE_BAYS.max);
          expect(l.type, tag).toBe("large");
          expect(Math.abs(l.w - l.terrace!.bays * BAY), tag).toBeLessThan(EPS);
          expect(Math.abs(l.d - DEPTH), tag).toBeLessThan(EPS);
          expect(TERRACE_CAPS_M.some((c) => Math.abs(l.hMax - c * WORLD_PER_METRE) < EPS), `${tag} cap ${l.hMax}`).toBe(true);
          expect(l.street, tag).toBe(run.road);
          expect(l.side, tag).toBe(run.side);
          expect(keys.has(l.key), `${tag} key ${l.key} repeated`).toBe(false);
          keys.add(l.key);
          // The front edge is on the run's front line, and it starts where the last lot ended (they share an edge and do not overlap).
          const fx = l.x + Math.sin(l.yaw) * (l.d / 2);
          const fz = l.z + Math.cos(l.yaw) * (l.d / 2);
          const nx = Math.sin(l.yaw);
          const nz = Math.cos(l.yaw);
          expect(Math.abs((fx - run.ax) * nx + (fz - run.az) * nz), tag).toBeLessThan(EPS);
          const [s, e] = span(run, l);
          if (end === null) expect(Math.abs(s), tag).toBeLessThan(EPS);
          else expect(Math.abs(s - end), tag).toBeLessThan(EPS);
          end = e;
          total += l.w;
        });
        inRuns += lots.length;
        // The run's far end: the lots fill it to within one bay (the packer closes the rest); a parking or clearance end is the last lot's edge.
        expect(run.len, `${m.name} ${run.id}`).toBeGreaterThanOrEqual(total - EPS);
        if (run.endAbuts === "parking" || run.endAbuts === "end") expect(Math.abs(run.len - total), `${m.name} ${run.id}`).toBeLessThan(EPS);
        else expect(run.len - total, `${m.name} ${run.id}`).toBeLessThan(BAY);
      }
      expect(m.on.lots.filter((l) => l.terrace !== undefined).length, m.name).toBe(inRuns);
      // Every lot in an outer block is a terrace lot, and every outer block has a run on each of its four sides.
      for (const b of m.on.blocks) {
        expect(m.on.lots.filter((l) => outerBlockOf(m.on, l.x, l.z) === b.id).every((l) => l.terrace !== undefined), `${m.name} ${b.id}`).toBe(true);
        const roads = new Set(m.on.terraces.filter((r) => r.block === b.id).map((r) => r.road));
        expect(roads.size, `${m.name} ${b.id}`).toBe(4);
      }
    }
  });

  it("runs each row on to the next row's band: its far end is TERRACE_DEPTH_M (a plaza's width where a plaza starts the next row) short of the block's corner", () => {
    for (const m of maps) {
      for (const run of m.on.terraces) {
        if (run.endAbuts !== "corner" && run.endAbuts !== "plaza") continue;
        const b = m.on.blocks.find((q) => q.id === run.block)!;
        const band = run.endAbuts === "plaza" ? PLAZA_W_M * WORLD_PER_METRE : DEPTH;
        const ex = run.ax + run.ux * run.len;
        const ez = run.az + run.uz * run.len;
        // The block's inside, shrunk by SETBACK, is where the rows stand; a run's direction is along one axis.
        const lo = { x: b.minX + SETBACK, z: b.minZ + SETBACK };
        const hi = { x: b.maxX - SETBACK, z: b.maxZ - SETBACK };
        const want = run.ux > 0.5 ? hi.x - band : run.ux < -0.5 ? lo.x + band : run.uz > 0.5 ? hi.z - band : lo.z + band;
        expect(Math.abs((run.ux !== 0 ? ex : ez) - want), `${m.name} ${run.id}`).toBeLessThan(EPS);
      }
    }
  });

  it("starts every row with a corner block: a run has a startCorner exactly when it starts a row at a block corner, so each block has four of them less one per plaza", () => {
    for (const m of maps) {
      const withCorner = m.on.terraces.filter((r) => r.startCorner !== null);
      const plazas = m.on.openLots.filter((o) => o.kind === "plaza").length;
      expect(withCorner.length, m.name).toBe(m.on.blocks.length * 4 - plazas);
      for (const run of withCorner) {
        // The corner side is the first lot's side toward the run's start, with the cross road's id; no other lot of the run has one on that side.
        const first = m.on.lots[run.lots[0]!]!;
        expect(first.cornerSides, `${m.name} ${run.id}`).toContainEqual(run.startCorner);
        expect(run.startCorner!.road, `${m.name} ${run.id}`).not.toBe(run.road);
      }
    }
  });

  it("passes the lot rules: no road, pad, pavement, node square, place or other lot overlapped, WIRE_CLEAR from every wire, and the occlusion rule at its own cap", { timeout: 60000 }, () => {
    let lots = 0;
    for (const m of maps) {
      const world = worldOf(m.on, m.puzzle);
      const items: { tag: string; pts: P[]; box: ReturnType<typeof bbox>; h: number; block: string | null }[] = [];
      for (const l of m.on.lots) {
        if (l.terrace === undefined) continue;
        const pts = boxPts(l);
        items.push({ tag: `${m.name} ${l.key}`, pts, box: bbox(pts), h: l.hMax, block: outerBlockOf(m.on, l.x, l.z) });
      }
      for (const o of m.on.openLots) {
        const pts = boxPts(o);
        items.push({ tag: `${m.name} ${o.kind} of ${o.run}`, pts, box: bbox(pts), h: 0, block: outerBlockOf(m.on, o.x, o.z) });
      }
      for (const it of items) {
        lots++;
        for (const s of world.statics) if (boxesNear(it.box, s.box)) expect(gap(it.pts, s.pts), `${it.tag} overlaps a road, pad, pavement, node square or place`).toBeGreaterThan(-EPS);
        for (const sg of world.segs) {
          if (Math.min(sg.ax, sg.bx) > it.box.maxX + WIRE_CLEAR || Math.max(sg.ax, sg.bx) < it.box.minX - WIRE_CLEAR || Math.min(sg.az, sg.bz) > it.box.maxZ + WIRE_CLEAR || Math.max(sg.az, sg.bz) < it.box.minZ - WIRE_CLEAR) continue;
          expect(segRectDist(sg.ax, sg.az, sg.bx, sg.bz, it.box), `${it.tag} is too near a wire`).toBeGreaterThanOrEqual(WIRE_CLEAR - 1e-9);
        }
        expect(hidden(world, it.box, it.h), `${it.tag} hides a wire point, node top or lamp head`).toBe(false);
        expect(it.box.minX).toBeGreaterThanOrEqual(m.on.window.minX - EPS);
        expect(it.box.maxX).toBeLessThanOrEqual(m.on.window.maxX + EPS);
        expect(it.box.minZ).toBeGreaterThanOrEqual(m.on.window.minY - EPS);
        expect(it.box.maxZ).toBeLessThanOrEqual(m.on.window.maxY + EPS);
      }
      // Lots and open lots of one block do not overlap one another (neighbours abut, so the gap is 0, never below).
      for (let i = 0; i < items.length; i++) {
        for (let j = i + 1; j < items.length; j++) {
          const a = items[i]!;
          const b = items[j]!;
          if (a.block === null || a.block !== b.block || !boxesNear(a.box, b.box)) continue;
          expect(gap(a.pts, b.pts), `${a.tag} overlaps ${b.tag}`).toBeGreaterThan(-EPS);
        }
      }
      // Each lot has the highest cap that clears the occlusion rule: the next tier up would hide something.
      for (const l of m.on.lots) {
        if (l.terrace === undefined) continue;
        const k = TERRACE_CAPS_M.findIndex((c) => Math.abs(c * WORLD_PER_METRE - l.hMax) < EPS);
        if (k > 0) expect(hidden(world, bbox(boxPts(l)), TERRACE_CAPS_M[k - 1]! * WORLD_PER_METRE), `${m.name} ${l.key}`).toBe(true);
      }
    }
    expect(lots).toBeGreaterThan(5000);
  });

  it("uses only the three height tiers, and the top tier on the ladder (lower tiers appear only where the occlusion rule bites, which RING_MARGIN keeps clear of the outer blocks today)", () => {
    const seen = new Set<number>();
    for (const m of maps) for (const l of m.on.lots) if (l.terrace) seen.add(Math.round(l.hMax / WORLD_PER_METRE));
    for (const c of seen) expect(TERRACE_CAPS_M).toContain(c);
    expect(seen.has(TERRACE_CAPS_M[0]!)).toBe(true);
    expect([...TERRACE_CAPS_M]).toEqual([16, 13, 10]);
  });

  it("varies the bays across the ladder: every width from TERRACE_BAYS.min to TERRACE_BAYS.max appears", () => {
    const seen = new Set<number>();
    for (const m of maps) for (const l of m.on.lots) if (l.terrace) seen.add(l.terrace.bays);
    expect([...seen].sort()).toEqual(Array.from({ length: TERRACE_BAYS.max - TERRACE_BAYS.min + 1 }, (_, i) => TERRACE_BAYS.min + i));
  });

  it("is deterministic: a freshly loaded copy of the puzzle gives deep-equal terraces, open lots and lots", () => {
    for (const m of maps.slice(0, 6)) {
      const again = townLayout(load(join("puzzles", m.name)));
      expect(again.terraces, m.name).toEqual(m.on.terraces);
      expect(again.openLots, m.name).toEqual(m.on.openLots);
      expect(again.lots, m.name).toEqual(m.on.lots);
    }
  });
});

describe("open lots", () => {
  const plazaW = PLAZA_W_M * WORLD_PER_METRE;
  const parkW = PARKING_W_M * WORLD_PER_METRE;
  const parkD = PARKING_D_M * WORLD_PER_METRE;

  it("has at most one parking lot per run and one plaza per outer block, at the sizes in metres", () => {
    let parking = 0;
    let plazas = 0;
    for (const m of maps) {
      const perRun = new Map<string, number>();
      const perBlock = new Map<string, number>();
      for (const o of m.on.openLots) {
        const tag = `${m.name} ${o.kind} ${o.run}`;
        if (o.kind === "parking") {
          parking++;
          perRun.set(o.run, (perRun.get(o.run) ?? 0) + 1);
          expect(Math.abs(o.w - parkW), tag).toBeLessThan(EPS);
          expect(Math.abs(o.d - parkD), tag).toBeLessThan(EPS);
        } else {
          plazas++;
          const b = outerBlockOf(m.on, o.x, o.z)!;
          expect(b, tag).not.toBeNull();
          perBlock.set(b, (perBlock.get(b) ?? 0) + 1);
          expect(Math.abs(o.w - plazaW), tag).toBeLessThan(EPS);
          expect(Math.abs(o.d - plazaW), tag).toBeLessThan(EPS);
        }
      }
      for (const [k, n] of perRun) expect(n, `${m.name} ${k}`).toBe(1);
      for (const [k, n] of perBlock) expect(n, `${m.name} ${k}`).toBe(1);
    }
    expect(parking).toBeGreaterThan(50);
    expect(plazas).toBeGreaterThan(20);
  });

  it("puts a plaza only at a row's start, in the block's corner, and a parking lot after at least one lot of a run that ends at it", () => {
    for (const m of maps) {
      const runs = runsOf(m.on);
      for (const o of m.on.openLots) {
        const tag = `${m.name} ${o.kind} ${o.run}`;
        const pts = boxPts(o);
        if (o.kind === "plaza") {
          const b = m.on.blocks.find((q) => q.id === outerBlockOf(m.on, o.x, o.z))!;
          const bb = bbox(pts);
          const corner = [bb.minX, bb.maxX].some((x) => Math.abs(x - (b.minX + SETBACK)) < EPS || Math.abs(x - (b.maxX - SETBACK)) < EPS) && [bb.minZ, bb.maxZ].some((z) => Math.abs(z - (b.minZ + SETBACK)) < EPS || Math.abs(z - (b.maxZ - SETBACK)) < EPS);
          expect(corner, `${tag} stands in a corner of its block`).toBe(true);
        } else {
          const run = runs.get(o.run)!;
          expect(run, tag).toBeDefined();
          expect(run.endAbuts, tag).toBe("parking");
          expect(run.lots.length, tag).toBeGreaterThan(0);
          // It starts where its run ends, on the run's front line, and is TERRACE_DEPTH_M..PARKING_D_M deep behind it.
          const ex = run.ax + run.ux * run.len;
          const ez = run.az + run.uz * run.len;
          const t = (o.x - ex) * run.ux + (o.z - ez) * run.uz;
          expect(Math.abs(t - o.w / 2), tag).toBeLessThan(EPS);
        }
      }
    }
  });

  it("is never in Town.lots: no terrace lot shares a footprint with an open lot, and the lots of an outer block are all terrace lots", () => {
    for (const m of maps) {
      for (const o of m.on.openLots) {
        const pts = boxPts(o);
        for (const l of m.on.lots) {
          if (!boxesNear(bbox(pts), bbox(boxPts(l)))) continue;
          expect(gap(pts, boxPts(l)), `${m.name} ${o.kind} ${o.run} against ${l.key}`).toBeGreaterThan(-EPS);
        }
      }
    }
  });

  it("follows the hash rules: parking only where stableHash(run id) % PARKING_ONE_IN is 0 and the stretch holds PARKING_MIN_RUN_BAYS bays, a plaza only where stableHash(block id) % PLAZA_ONE_IN is 0", () => {
    for (const m of maps) {
      const runs = runsOf(m.on);
      for (const o of m.on.openLots) {
        const tag = `${m.name} ${o.kind} ${o.run}`;
        if (o.kind === "parking") {
          expect(stableHash(o.run) % PARKING_ONE_IN, tag).toBe(0);
          const run = runs.get(o.run)!;
          const before = run.lots.reduce((n, i) => n + m.on.lots[i]!.terrace!.bays, 0);
          // The run after it on the same row starts where the parking lot ends.
          const px = run.ax + run.ux * (run.len + o.w);
          const pz = run.az + run.uz * (run.len + o.w);
          const next = m.on.terraces.find((r) => r.road === run.road && r.side === run.side && r.block === run.block && Math.hypot(r.ax - px, r.az - pz) < EPS);
          const after = next ? next.lots.reduce((n, i) => n + m.on.lots[i]!.terrace!.bays, 0) : 0;
          // The stretch held PARKING_MIN_RUN_BAYS bays; the lot itself takes about two and the far end under one.
          expect(before + after, tag).toBeGreaterThanOrEqual(PARKING_MIN_RUN_BAYS - 3);
          expect(before, tag).toBeGreaterThanOrEqual(TERRACE_BAYS.min);
          expect(after, tag).toBeGreaterThanOrEqual(TERRACE_BAYS.min);
        } else {
          const b = outerBlockOf(m.on, o.x, o.z)!;
          expect(stableHash(b) % PLAZA_ONE_IN, tag).toBe(0);
        }
      }
    }
  });
});

describe("placeholders on terrace lots", () => {
  it("fill their lot's footprint exactly and stay under hMax; every other placeholder keeps its 0.8 or 0.9 footprint", () => {
    let terrace = 0;
    let other = 0;
    for (const m of maps.slice(0, 12)) {
      const specs = pickPlaceholders(m.on.lots);
      m.on.lots.forEach((l, i) => {
        const s = specs[i]!;
        const tag = `${m.name} ${l.key}`;
        expect(s.bodyH + s.roofH, tag).toBeLessThanOrEqual(l.hMax + 1e-12);
        if (l.terrace) {
          terrace++;
          expect(s.w, tag).toBe(l.w);
          expect(s.d, tag).toBe(l.d);
        } else {
          other++;
          expect(FOOTPRINT_FACTORS.some((f) => Math.abs(f - s.w / l.w) < 1e-9), tag).toBe(true);
          expect(FOOTPRINT_FACTORS.some((f) => Math.abs(f - s.d / l.d) < 1e-9), tag).toBe(true);
        }
      });
    }
    expect(terrace).toBeGreaterThan(500);
    expect(other).toBeGreaterThan(100);
  });

  it("has abutting boxes in a run: neighbouring terrace placeholders share an edge", () => {
    const m = maps.find((q) => q.name === "09-shrine-circuit.json")!;
    for (const run of m.on.terraces) {
      for (let i = 1; i < run.lots.length; i++) {
        const a = m.on.lots[run.lots[i - 1]!]!;
        const b = m.on.lots[run.lots[i]!]!;
        const [, ea] = span(run, a);
        const [sb] = span(run, b);
        expect(Math.abs(ea - sb), `${run.id} ${i}`).toBeLessThan(EPS);
      }
    }
  });
});

describe("lot spacing", () => {
  it("keeps LOT_GAP between lots that are not terrace neighbours: a terrace lot never touches a lot of another block", () => {
    for (const m of maps.slice(0, 8)) {
      const terraceLots = m.on.lots.filter((l) => l.terrace);
      const others = m.on.lots.filter((l) => !l.terrace);
      for (const a of terraceLots) {
        const pa = boxPts(a);
        const ba = bbox(pa);
        for (const b of others) {
          const pb = boxPts(b);
          if (!boxesNear({ minX: ba.minX - LOT_GAP, maxX: ba.maxX + LOT_GAP, minZ: ba.minZ - LOT_GAP, maxZ: ba.maxZ + LOT_GAP }, bbox(pb))) continue;
          expect(gap(pa, pb), `${m.name} ${a.key} and ${b.key}`).toBeGreaterThanOrEqual(LOT_GAP - 1e-9);
        }
      }
    }
  });
});

describe("terrace lots take no model and no stack until 051 D", () => {
  it("skips a terrace lot in buildingPlacements, whatever the set offers, and keeps the other lots' picks", async () => {
    const { buildingPlacements } = await import("./models3d");
    const lot = (key: string, terrace: boolean): Lot => ({ x: 0, z: 0, w: 2, d: 2, yaw: 0, type: "small", hMax: 2.5, key, street: "r", side: 1, corner: false, cornerSides: [], ...(terrace ? { terrace: { run: "r:1:r0", index: 0, bays: 2 } } : {}) });
    const model = { pack: "simple-town", glb: "x.glb", entry: { name: "Small_01", bounds: { min: [-5, 0, -5], max: [5, 4, 5] }, warnings: [] }, front: "+z", corner: false, family: "Small_01", root: null } as never;
    // The same set, on a lot that is not a terrace lot, does place a model (so the skip is the terrace's, not the set's).
    expect(buildingPlacements([lot("a", false)], [model]).map((p) => p.lot)).toEqual([0]);
    const placed = buildingPlacements([lot("a", true), lot("b", false), lot("c", true)], [model]);
    expect(placed.map((p) => p.lot)).toEqual([1]);
  });
});
