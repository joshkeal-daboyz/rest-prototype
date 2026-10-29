import { describe, expect, it } from "vitest";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { loadPuzzle, type Puzzle } from "../core";
import { puzzleBounds } from "./geometry";
import {
  CITY_BLOCK,
  DECOR_LANE_W,
  FOOTPRINT_MARGIN,
  HUB_R,
  LANE_W,
  NODE_SQUARE,
  WIRE_CLEAR_PX,
  nodeClearPx,
  avenuePieces,
  circuitStreets,
  cityForMap,
  cityPlaces,
  districtOf,
  DISTRICT,
  feedLanes,
  gridStreetLines,
  ladderNumber,
  laneBoxDistance,
  mapNumber,
  mapOrigin,
  spokeDir,
  type Building,
  type Lane,
} from "./city";

// Ticket 024 A1: inside a map's footprint the streets are the circuit itself.

const ROOT = join(__dirname, "..", "..", "puzzles");
interface Loaded {
  key: string;
  puzzle: Puzzle;
  locked: boolean;
}
function loadAll(): Loaded[] {
  const out: Loaded[] = [];
  for (const [dir, locked] of [[ROOT, false], [join(ROOT, "locked"), true]] as const) {
    if (!existsSync(dir)) continue;
    for (const f of readdirSync(dir)) {
      if (!f.endsWith(".json")) continue;
      const raw = JSON.parse(readFileSync(join(dir, f), "utf8")) as { scope?: string };
      if (raw.scope !== "map") continue;
      const puzzle = loadPuzzle(raw);
      out.push({ key: locked ? `locked/${puzzle.id}` : puzzle.id, puzzle, locked });
    }
  }
  return out;
}
const ALL = loadAll();
const OPEN = ALL.filter((p) => !p.locked);
const E = 1e-9;

const ptSegDist = (px: number, py: number, l: Lane): number => {
  const dx = l.bx - l.ax;
  const dy = l.by - l.ay;
  const len2 = dx * dx + dy * dy;
  const t = len2 > 0 ? Math.min(Math.max(((px - l.ax) * dx + (py - l.ay) * dy) / len2, 0), 1) : 0;
  return Math.hypot(px - (l.ax + t * dx), py - (l.ay + t * dy));
};
const inAnyLane = (lanes: readonly Lane[], x: number, y: number): boolean => lanes.some((l) => ptSegDist(x, y, l) <= l.w / 2 + E);
const inBuilding = (b: Building, x: number, y: number): boolean => Math.abs(x - b.x) < b.w / 2 && Math.abs(y - b.y) < b.h / 2;
const boxHit = (a: Building, b: Building): boolean => Math.abs(a.x - b.x) < (a.w + b.w) / 2 && Math.abs(a.y - b.y) < (a.h + b.h) / 2;
const windowOf = (p: Puzzle, m = 6) => {
  const f = circuitStreets(p).footprint;
  return { minX: f.minX - m, maxX: f.maxX + m, minY: f.minY - m, maxY: f.maxY + m };
};

describe("circuitStreets", () => {
  it("has maps to test", () => {
    expect(OPEN.length).toBeGreaterThan(20);
  });
  it("is one lane per line exactly on its segment, a square per node, a lane per decor segment", () => {
    for (const { key: k, puzzle } of ALL) {
      const cs = circuitStreets(puzzle);
      const decorSegs = (puzzle.decor ?? []).reduce((n, d) => n + d.path.length - 1, 0);
      expect(cs.lanes.length, k).toBe(puzzle.lines.length + decorSegs);
      const pos = new Map(puzzle.nodes.map((n) => [n.id, n.pos] as const));
      puzzle.lines.forEach((l, i) => {
        const a = pos.get(l.from)!;
        const z = pos.get(l.to)!;
        expect(cs.lanes[i], `${k} ${l.id}`).toEqual({ ax: a[0], ay: a[1], bx: z[0], by: z[1], w: LANE_W });
      });
      for (const d of cs.lanes.slice(puzzle.lines.length)) expect(d.w, k).toBe(DECOR_LANE_W);
      expect(cs.squares.length, k).toBe(puzzle.nodes.length);
      puzzle.nodes.forEach((n, i) => expect(cs.squares[i], `${k} ${n.id}`).toEqual({ x: n.pos[0], y: n.pos[1], w: NODE_SQUARE, h: NODE_SQUARE }));
    }
  });
  it("includes diagonal lanes", () => {
    expect(OPEN.some(({ puzzle }) => circuitStreets(puzzle).lanes.some((l) => l.ax !== l.bx && l.ay !== l.by))).toBe(true);
  });
  it("grows the bounds by FOOTPRINT_MARGIN, clipped to the map's district", () => {
    for (const { key: k, puzzle } of ALL) {
      const b = puzzleBounds(puzzle);
      const fp = circuitStreets(puzzle).footprint;
      const o = mapOrigin(puzzle.id, b);
      const c = districtOf(mapNumber(puzzle.id)).centre;
      expect(fp.minX + o.x, k).toBeGreaterThanOrEqual(c.x - DISTRICT / 2 - E);
      expect(fp.maxX + o.x, k).toBeLessThanOrEqual(c.x + DISTRICT / 2 + E);
      expect(fp.minY + o.y, k).toBeGreaterThanOrEqual(c.y - DISTRICT / 2 - E);
      expect(fp.maxY + o.y, k).toBeLessThanOrEqual(c.y + DISTRICT / 2 + E);
      // the bounds are always inside it, and it is the full margin wherever the district allows
      expect(fp.minX, k).toBeLessThanOrEqual(b.minX);
      expect(fp.maxX, k).toBeGreaterThanOrEqual(b.maxX);
      expect(fp.minY, k).toBeLessThanOrEqual(b.minY);
      expect(fp.maxY, k).toBeGreaterThanOrEqual(b.maxY);
      if (b.maxX - b.minX + 2 * FOOTPRINT_MARGIN <= DISTRICT - 2 && b.maxY - b.minY + 2 * FOOTPRINT_MARGIN <= DISTRICT - 2) {
        expect(fp, k).toEqual({ minX: b.minX - FOOTPRINT_MARGIN, minY: b.minY - FOOTPRINT_MARGIN, maxX: b.maxX + FOOTPRINT_MARGIN, maxY: b.maxY + FOOTPRINT_MARGIN });
      }
    }
  });
});

describe("footprint buildings", () => {
  it("leave every line's ends, midpoint and quarter points on open ground, WIRE_CLEAR_PX from any building", () => {
    for (const { key: k, puzzle } of OPEN) {
      const cs = circuitStreets(puzzle);
      const o = mapOrigin(puzzle.id, puzzleBounds(puzzle));
      const bs = cityForMap(puzzle, o, windowOf(puzzle), 50);
      for (const l of cs.lanes) {
        for (const t of [0, 0.25, 0.5, 0.75, 1]) {
          const x = l.ax + (l.bx - l.ax) * t;
          const y = l.ay + (l.by - l.ay) * t;
          expect(inAnyLane(cs.lanes, x, y), `${k} lane point ${t}`).toBe(true);
          expect(bs.some((b) => inBuilding(b, x, y)), `${k} building on lane at ${x},${y}`).toBe(false);
          expect(bs.every((b) => laneBoxDistance({ ax: x, ay: y, bx: x, by: y, w: 0 }, b) * 50 >= WIRE_CLEAR_PX - 1e-6), `${k} building near ${x},${y}`).toBe(true);
        }
      }
    }
  });
  it("clear every lane, node and place by the pixel rules (the full sampled test is town.test.ts)", { timeout: 60000 }, () => {
    for (const { key: k, puzzle } of OPEN) {
      const cs = circuitStreets(puzzle);
      const o = mapOrigin(puzzle.id, puzzleBounds(puzzle));
      const lanes: Lane[] = cs.lanes.concat(feedLanes(puzzle));
      const places = cityPlaces(puzzle, 50);
      const bs = cityForMap(puzzle, o, windowOf(puzzle), 50);
      expect(bs.length, k).toBeGreaterThan(20);
      for (const b of bs) {
        for (const l of lanes) if (laneBoxDistance(l, b) * 50 < WIRE_CLEAR_PX - 1e-6) throw new Error(k + " building near a lane");
        puzzle.nodes.forEach((n, i) => {
          const d = Math.hypot(Math.max(Math.abs(n.pos[0] - b.x) - b.w / 2, 0), Math.max(Math.abs(n.pos[1] - b.y) - b.h / 2, 0));
          if (d * 50 < nodeClearPx(n) - 1e-6) throw new Error(k + " building near node " + i);
        });
        for (const p of places) for (const q of p.parts ?? [p]) if (!p.pool && boxHit(b, q)) throw new Error(k + " building on place " + p.lamp);
      }
    }
  });
  it("sit inside the footprint or outside it, never across its edge", () => {
    for (const { key: k, puzzle } of OPEN) {
      const fp = circuitStreets(puzzle).footprint;
      const o = mapOrigin(puzzle.id, puzzleBounds(puzzle));
      for (const b of cityForMap(puzzle, o, windowOf(puzzle), 50)) {
        const inside = b.x - b.w / 2 >= fp.minX && b.x + b.w / 2 <= fp.maxX && b.y - b.h / 2 >= fp.minY && b.y + b.h / 2 <= fp.maxY;
        const outside = b.x + b.w / 2 <= fp.minX || b.x - b.w / 2 >= fp.maxX || b.y + b.h / 2 <= fp.minY || b.y - b.h / 2 >= fp.maxY;
        expect(inside || outside, k).toBe(true);
      }
    }
  });
  it("are deterministic", () => {
    for (const { puzzle } of OPEN.slice(0, 6)) {
      const o = mapOrigin(puzzle.id, puzzleBounds(puzzle));
      expect(cityForMap(puzzle, o, windowOf(puzzle), 50)).toEqual(cityForMap(puzzle, o, windowOf(puzzle), 50));
    }
  });
  it("are keyed on city coordinates: the same circuit shifted with its origin gives the same city", () => {
    const make = (dx: number, dy: number): Puzzle =>
      loadPuzzle({
        id: "k", name: "k", version: 5, scope: "map", capacity: null,
        nodes: [
          { id: "feed", type: "feed", pos: [0 + dx, 0 + dy] },
          { id: "j", type: "junction", pos: [3 + dx, 1.5 + dy] },
          { id: "lamp", type: "lamp", pos: [6 + dx, -1 + dy] },
        ],
        lines: [{ id: "a", from: "feed", to: "j" }, { id: "b", from: "j", to: "lamp" }],
        faults: [],
      });
    const p1 = make(0, 0);
    const p2 = make(4, 6);
    const o1 = { x: 20, y: 10 };
    const o2 = { x: 16, y: 4 }; // o + pos is the same city point
    const toCity = (list: Building[], o: { x: number; y: number }): string[] =>
      list.map((b) => `${(b.x + o.x).toFixed(6)},${(b.y + o.y).toFixed(6)},${b.w.toFixed(6)},${b.h.toFixed(6)}`).sort();
    const a = toCity(cityForMap(p1, o1, windowOf(p1), 50), o1);
    const b = toCity(cityForMap(p2, o2, windowOf(p2), 50), o2);
    expect(a.length).toBeGreaterThan(50);
    expect(b).toEqual(a);
  });
});

describe("feed lanes", () => {
  it("run from every feed straight out to the ring road (the footprint edge)", () => {
    for (const { key: k, puzzle } of OPEN) {
      const fp = circuitStreets(puzzle).footprint;
      const lanes = feedLanes(puzzle);
      const feeds = puzzle.nodes.filter((n) => n.type === "feed");
      expect(feeds.length, k).toBeGreaterThan(0);
      expect(lanes.length, k).toBe(feeds.length);
      feeds.forEach((f, i) => {
        const l = lanes[i]!;
        expect([l.ax, l.ay], k).toEqual([f.pos[0], f.pos[1]]);
        const horizontal = l.ay === l.by;
        expect(horizontal || l.ax === l.bx, k).toBe(true);
        const edge = horizontal ? (Math.abs(l.bx - fp.minX) < E || Math.abs(l.bx - fp.maxX) < E) : (Math.abs(l.by - fp.minY) < E || Math.abs(l.by - fp.maxY) < E);
        expect(edge, `${k} ${f.id} ends on the ring`).toBe(true);
      });
    }
  });
});

describe("shared grid minus the footprint", () => {
  it("returns no street line inside the footprint, and still covers every street outside it", { timeout: 60000 }, () => {
    for (const { key: k, puzzle } of OPEN) {
      const f = circuitStreets(puzzle).footprint;
      const o = mapOrigin(puzzle.id, puzzleBounds(puzzle));
      const hole = { minX: f.minX + o.x, maxX: f.maxX + o.x, minY: f.minY + o.y, maxY: f.maxY + o.y };
      const vis = { minX: hole.minX - 10, maxX: hole.maxX + 10, minY: hole.minY - 10, maxY: hole.maxY + 10 };
      const lines = gridStreetLines(vis, hole);
      for (const s of lines) {
        const mx = (s.ax + s.bx) / 2;
        const my = (s.ay + s.by) / 2;
        expect(mx > hole.minX + E && mx < hole.maxX - E && my > hole.minY + E && my < hole.maxY - E, k).toBe(false);
        // a street stops on the ring: it never crosses into the footprint
        for (const [x, y] of [[s.ax, s.ay], [s.bx, s.by]] as const) expect(x > hole.minX + E && x < hole.maxX - E && y > hole.minY + E && y < hole.maxY - E, k).toBe(false);
      }
      let covered = 0;
      const outsideHole = (x: number, y: number): boolean => !(x > hole.minX && x < hole.maxX && y > hole.minY && y < hole.maxY);
      for (let g = Math.ceil(vis.minX / CITY_BLOCK) * CITY_BLOCK; g <= vis.maxX; g += CITY_BLOCK) {
        for (let y = vis.minY + 0.05; y < vis.maxY; y += 0.37) {
          if (!outsideHole(g, y)) continue;
          covered++;
          expect(lines.some((s) => s.ax === s.bx && Math.abs(s.ax - g) < E && y >= s.ay - E && y <= s.by + E), `${k} v ${g},${y}`).toBe(true);
        }
      }
      for (let g = Math.ceil(vis.minY / CITY_BLOCK) * CITY_BLOCK; g <= vis.maxY; g += CITY_BLOCK) {
        for (let x = vis.minX + 0.05; x < vis.maxX; x += 0.37) {
          if (!outsideHole(x, g)) continue;
          covered++;
          expect(lines.some((s) => s.ay === s.by && Math.abs(s.ay - g) < E && x >= s.ax - E && x <= s.bx + E), `${k} h ${x},${g}`).toBe(true);
        }
      }
      expect(covered, k).toBeGreaterThan(5);
    }
  });
  it("without a hole is the plain grid", () => {
    const vis = { minX: 0, maxX: 10, minY: 0, maxY: 10 };
    expect(gridStreetLines(vis, null).length).toBe(2 * (Math.ceil(10 / CITY_BLOCK) + 1));
  });
  it("stops an avenue at the footprint and carries on beyond it", () => {
    const p = OPEN.find((x) => ladderNumber(x.puzzle.id) === 2)!.puzzle; // spoke 0, east: its district is centred on the avenue
    const f = circuitStreets(p).footprint;
    const o = mapOrigin(p.id, puzzleBounds(p));
    const hole = { minX: f.minX + o.x, maxX: f.maxX + o.x, minY: f.minY + o.y, maxY: f.maxY + o.y };
    const d = spokeDir(0);
    const far = 200;
    const pieces = avenuePieces(0, far, hole);
    expect(pieces.length).toBe(2);
    for (const [a0, a1] of pieces) {
      expect(a1).toBeGreaterThan(a0);
      for (let a = a0; a <= a1; a += 0.9) {
        for (const off of [-0.55, 0, 0.55]) {
          const x = d.x * a - d.y * off;
          const y = d.y * a + d.x * off;
          expect(x > hole.minX + 1e-6 && x < hole.maxX - 1e-6 && y > hole.minY + 1e-6 && y < hole.maxY - 1e-6).toBe(false);
        }
      }
    }
    expect(pieces[0]![0]).toBe(HUB_R);
    expect(pieces[1]![1]).toBe(far);
    // the cut is the footprint's own width
    expect(pieces[1]![0] - pieces[0]![1]).toBeCloseTo(hole.maxX - hole.minX, 6);
    expect(avenuePieces(0, far, null)).toEqual([[HUB_R, far]]);
    expect(avenuePieces(0, far, { minX: 100, maxX: 110, minY: 50, maxY: 60 })).toEqual([[HUB_R, far]]);
  });
});
