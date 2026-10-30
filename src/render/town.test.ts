import { describe, expect, it } from "vitest";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { loadPuzzle, placeKind, type Puzzle } from "../core";
import { computeFit, freeArea, puzzleBounds } from "./geometry";
import * as city from "./city";
import {
  AVENUE_PX,
  CITY_AVENUE_COLOUR,
  CITY_BG,
  CITY_BLOCK,
  CITY_BUILDING,
  CITY_PLACE_EDGE,
  CITY_PLACE_FILL,
  CITY_SEED,
  CITY_STREET_LINE,
  CITY_WARM,
  DISTRICT,
  GATE_POST,
  GLOW_MAX,
  GLOW_SPRITE_PX,
  LIT_FILL_ALPHA,
  LOT,
  LOT_GAP,
  LOT_HALF,
  POOL_PX,
  SETBACK,
  STREET_PX,
  WIRE_CLEAR_PX,
  blockLots,
  circuitStreets,
  cityCells,
  cityForMap,
  cityPlaces,
  contrastRatio,
  feedLanes,
  footprintLayout,
  glowFalloff,
  glowRadiusPx,
  glowSpriteData,
  gridStreetLines,
  mapOrigin,
  nodeClearPx,
  placeParts,
  slotKind,
  type Building,
  type Lane,
  type Place,
} from "./city";
import { LABEL_EDGE_PX, LABEL_H_PX, labelArea, labelClear, placeLabel, placeShapes, shapeSignature, targetLabels, type LabelObstacles, type PxRect } from "./places";

// Ticket 024 A3: a calm town the wires run through.

const ROOT = join(__dirname, "..", "..", "puzzles");
function loadOpen(): { key: string; puzzle: Puzzle }[] {
  const out: { key: string; puzzle: Puzzle }[] = [];
  if (!existsSync(ROOT)) return out;
  for (const f of readdirSync(ROOT)) {
    if (!f.endsWith(".json")) continue;
    const raw = JSON.parse(readFileSync(join(ROOT, f), "utf8")) as { scope?: string };
    if (raw.scope !== "map") continue;
    const puzzle = loadPuzzle(raw);
    out.push({ key: puzzle.id, puzzle });
  }
  return out;
}
const OPEN = loadOpen();
const E = 1e-9;
const SCALES = [30, 50, 80] as const;

const originOf = (p: Puzzle) => mapOrigin(p.id, puzzleBounds(p));
const windowOf = (p: Puzzle, m = 1) => {
  const f = circuitStreets(p).footprint;
  return { minX: f.minX - m, maxX: f.maxX + m, minY: f.minY - m, maxY: f.maxY + m };
};
/** Distance from a point to a Building box. */
const toBox = (x: number, y: number, b: Building): number => city.pointBoxDistance(x, y, b);
/** Points every 2 px along a lane, in map units. */
function samples(l: Lane, scale: number): [number, number][] {
  const len = Math.hypot(l.bx - l.ax, l.by - l.ay) * scale;
  const n = Math.max(Math.ceil(len / 2), 1);
  const out: [number, number][] = [];
  for (let i = 0; i <= n; i++) out.push([l.ax + ((l.bx - l.ax) * i) / n, l.ay + ((l.by - l.ay) * i) / n]);
  return out;
}
/** A 1920 x 1080 canvas fit at an exact scale, the map centred. */
function fitAt(p: Puzzle, scale: number, w = 1920, h = 1080) {
  const b = puzzleBounds(p);
  return { scale, offsetX: (w - (b.maxX - b.minX) * scale) / 2 - b.minX * scale, offsetY: (h - (b.maxY - b.minY) * scale) / 2 - b.minY * scale };
}
const approxText = (t: string): number => t.length * 6.2;

describe("no overlap with the circuit", () => {
  it("has maps to test", () => {
    expect(OPEN.length).toBeGreaterThan(20);
  });
  it("keeps every building and place WIRE_CLEAR_PX from every wire sample and nodeClearPx from every node, at 30, 50 and 80 px per unit", { timeout: 120000 }, () => {
    for (const scale of SCALES) {
      for (const { key: k, puzzle } of OPEN) {
        const o = originOf(puzzle);
        const lay = footprintLayout(puzzle, o, scale);
        const blds = cityForMap(puzzle, o, windowOf(puzzle), scale);
        expect(lay.buildings.length, `${k} @${scale}`).toBeGreaterThan(0);
        const boxes: { b: Building; what: string }[] = [];
        for (const b of blds) boxes.push({ b, what: "building" });
        for (const p of lay.places) if (!p.pool) for (const q of placeParts(p)) boxes.push({ b: q, what: `place ${p.lamp}` });
        const wc = WIRE_CLEAR_PX / scale;
        for (const l of lay.streets) {
          for (const [sx, sy] of samples(l, scale)) {
            for (const { b, what } of boxes) {
              if (Math.abs(b.x - sx) > b.w / 2 + wc + 0.01 || Math.abs(b.y - sy) > b.h / 2 + wc + 0.01) continue;
              if (toBox(sx, sy, b) * scale < WIRE_CLEAR_PX - 1e-6) throw new Error(`${k} @${scale}: ${what} within ${(toBox(sx, sy, b) * scale).toFixed(2)}px of a wire at ${sx},${sy}`);
            }
          }
        }
        for (const n of puzzle.nodes) {
          const r = nodeClearPx(n) / scale;
          for (const { b, what } of boxes) {
            if (toBox(n.pos[0], n.pos[1], b) < r - 1e-9) throw new Error(`${k} @${scale}: ${what} within ${nodeClearPx(n)}px of node ${n.id}`);
          }
        }
      }
    }
  });
  it("keeps every shown label WIRE_CLEAR_PX from every wire sample and nodeClearPx from every node centre", { timeout: 120000 }, () => {
    for (const scale of SCALES) {
      for (const { key: k, puzzle } of OPEN) {
        const o = originOf(puzzle);
        const places = footprintLayout(puzzle, o, scale).places;
        const fit = fitAt(puzzle, scale);
        const boxes = targetLabels(puzzle, places, fit, freeArea(1920, 1080), approxText);
        const lanes = footprintLayout(puzzle, o, scale).streets;
        boxes.forEach((b, i) => {
          if (!b) return;
          const px = (r: PxRect) => ({ x: r.x + r.w / 2, y: r.y + r.h / 2, w: r.w, h: r.h });
          const c = px(b);
          const box: Building = { x: c.x, y: c.y, w: c.w, h: c.h };
          for (const l of lanes) {
            for (const [sx, sy] of samples(l, scale)) {
              const x = sx * scale + fit.offsetX;
              const y = sy * scale + fit.offsetY;
              if (toBox(x, y, box) < WIRE_CLEAR_PX - 1e-6) throw new Error(`${k} @${scale}: label ${places[i]!.lamp} on a wire`);
            }
          }
          for (const n of puzzle.nodes) {
            const d = toBox(n.pos[0] * scale + fit.offsetX, n.pos[1] * scale + fit.offsetY, box);
            if (d < nodeClearPx(n) - 1e-6) throw new Error(`${k} @${scale}: label ${places[i]!.lamp} near node ${n.id}`);
          }
        });
      }
    }
  });
  it("samples decor paths too (they are wires)", () => {
    const decor = loadPuzzle({
      id: "decor", name: "d", version: 5, scope: "map", capacity: null,
      nodes: [
        { id: "feed", type: "feed", pos: [0, 0] },
        { id: "lamp", type: "lamp", pos: [8, 0] },
      ],
      lines: [{ id: "a", from: "feed", to: "lamp" }],
      decor: [{ path: [[1, 6], [7, 6], [7, 9]] }],
      faults: [],
    } as unknown);
    const o = originOf(decor);
    for (const scale of SCALES) {
      const lay = footprintLayout(decor, o, scale);
      expect(lay.streets.length).toBe(1 + 2 + 1); // the line, two decor segments, the feed lane
      const wc = WIRE_CLEAR_PX / scale;
      for (const l of lay.streets.slice(1, 3)) for (const [sx, sy] of samples(l, scale)) for (const b of lay.buildings) expect(toBox(sx, sy, b)).toBeGreaterThanOrEqual(wc - 1e-9);
    }
  });
});

describe("streets connect", () => {
  /** Segments of the street graph in map units: circuit lines (not decor), feed lanes, the ring, grid streets meeting the ring. */
  function graph(p: Puzzle) {
    const cs = circuitStreets(p);
    const fp = cs.footprint;
    const o = originOf(p);
    const segs: { name: string; ax: number; ay: number; bx: number; by: number }[] = [];
    cs.lanes.slice(0, p.lines.length).forEach((l, i) => segs.push({ name: `line ${p.lines[i]!.id}`, ...l }));
    feedLanes(p).forEach((l, i) => segs.push({ name: `feed ${i}`, ...l }));
    const ring = [
      { name: "ring N", ax: fp.minX, ay: fp.minY, bx: fp.maxX, by: fp.minY },
      { name: "ring E", ax: fp.maxX, ay: fp.minY, bx: fp.maxX, by: fp.maxY },
      { name: "ring S", ax: fp.maxX, ay: fp.maxY, bx: fp.minX, by: fp.maxY },
      { name: "ring W", ax: fp.minX, ay: fp.maxY, bx: fp.minX, by: fp.minY },
    ];
    segs.push(...ring);
    const hole = { minX: fp.minX + o.x, maxX: fp.maxX + o.x, minY: fp.minY + o.y, maxY: fp.maxY + o.y };
    const vis = { minX: hole.minX - 3, maxX: hole.maxX + 3, minY: hole.minY - 3, maxY: hole.maxY + 3 };
    // The shared streets that meet the ring (the rest of the grid is the city's own business).
    const all = gridStreetLines(vis, hole).map((s, i) => ({ name: `grid ${i}`, ax: s.ax - o.x, ay: s.ay - o.y, bx: s.bx - o.x, by: s.by - o.y }));
    const grid = all.filter((g) => ring.some((r) => segDist(g, r) < 1e-6));
    return { segs, grid, ring, fp };
  }
  const segDist = (a: { ax: number; ay: number; bx: number; by: number }, b: { ax: number; ay: number; bx: number; by: number }): number => {
    const d = (px: number, py: number, s: typeof a): number => {
      const dx = s.bx - s.ax;
      const dy = s.by - s.ay;
      const l2 = dx * dx + dy * dy;
      const t = l2 > 0 ? Math.min(Math.max(((px - s.ax) * dx + (py - s.ay) * dy) / l2, 0), 1) : 0;
      return Math.hypot(px - (s.ax + t * dx), py - (s.ay + t * dy));
    };
    // Segments in a street graph touch at an end of one (or cross): ends are enough except for a plain crossing.
    let best = Math.min(d(a.ax, a.ay, b), d(a.bx, a.by, b), d(b.ax, b.ay, a), d(b.bx, b.by, a));
    const den = (a.bx - a.ax) * (b.by - b.ay) - (a.by - a.ay) * (b.bx - b.ax);
    if (Math.abs(den) > 1e-12) {
      const t = ((b.ax - a.ax) * (b.by - b.ay) - (b.ay - a.ay) * (b.bx - b.ax)) / den;
      const u = ((b.ax - a.ax) * (a.by - a.ay) - (b.ay - a.ay) * (a.bx - a.ax)) / den;
      if (t >= 0 && t <= 1 && u >= 0 && u <= 1) best = 0;
    }
    return best;
  };
  it("joins every circuit line, feed lane, the ring and the shared grid into one network", () => {
    for (const { key: k, puzzle } of OPEN) {
      const { segs, grid } = graph(puzzle);
      const all = segs.concat(grid);
      const parent = all.map((_, i) => i);
      const find = (i: number): number => (parent[i] === i ? i : (parent[i] = find(parent[i]!)));
      for (let i = 0; i < all.length; i++) for (let j = i + 1; j < all.length; j++) if (segDist(all[i]!, all[j]!) < 1e-6) parent[find(i)] = find(j);
      const roots = new Set(all.map((_, i) => find(i)));
      const lost = all.filter((_, i) => find(i) !== find(0)).map((s) => s.name);
      expect(roots.size, `${k} is split: ${lost.slice(0, 5).join(", ")}`).toBe(1);
    }
  });
  it("meets at least one shared-grid street on each side of the ring", () => {
    for (const { key: k, puzzle } of OPEN) {
      const { grid, ring } = graph(puzzle);
      for (const side of ring) {
        expect(
          grid.some((g) => segDist(g, side) < 1e-6),
          `${k} ${side.name}`,
        ).toBe(true);
      }
    }
  });
  it("has every feed lane reach the ring and no shared street inside it", () => {
    for (const { key: k, puzzle } of OPEN) {
      const { fp, grid } = graph(puzzle);
      const feeds = puzzle.nodes.filter((n) => n.type === "feed");
      feedLanes(puzzle).forEach((l, i) => {
        expect([l.ax, l.ay], k).toEqual([feeds[i]!.pos[0], feeds[i]!.pos[1]]);
        const onEdge = Math.abs(l.bx - fp.minX) < E || Math.abs(l.bx - fp.maxX) < E || Math.abs(l.by - fp.minY) < E || Math.abs(l.by - fp.maxY) < E;
        expect(onEdge, `${k} feed ${i}`).toBe(true);
      });
      for (const g of grid) {
        for (const [x, y] of [[g.ax, g.ay], [g.bx, g.by], [(g.ax + g.bx) / 2, (g.ay + g.by) / 2]] as const) {
          expect(x > fp.minX + 1e-6 && x < fp.maxX - 1e-6 && y > fp.minY + 1e-6 && y < fp.maxY - 1e-6, `${k} grid inside the ring`).toBe(false);
        }
      }
    }
  });
  it("draws streets and avenues as thin lines", () => {
    expect(STREET_PX).toBe(3);
    expect(AVENUE_PX).toBe(6);
  });
});

describe("calm blocks", () => {
  const SIZES: [number, number][] = [[1.4, 1.4], [1.4, 0.6], [0.6, 1.4], [0.6, 0.6]];
  it("uses only four lot sizes, each edge on the setback line or a lot gap, at most four per block", () => {
    for (let cx = -20; cx < 20; cx++) {
      for (let cy = -20; cy < 20; cy++) {
        const lots = blockLots(cx, cy);
        expect(lots.length).toBeLessThanOrEqual(4);
        const lines = [cx * CITY_BLOCK + SETBACK, cx * CITY_BLOCK + SETBACK + LOT_HALF, cx * CITY_BLOCK + SETBACK + LOT_HALF + LOT_GAP, cx * CITY_BLOCK + SETBACK + LOT];
        const linesY = lines.map((v) => v - cx * CITY_BLOCK + cy * CITY_BLOCK);
        for (const b of lots) {
          expect(SIZES.some(([w, h]) => Math.abs(b.w - w) < E && Math.abs(b.h - h) < E), `${cx},${cy} size ${b.w}x${b.h}`).toBe(true);
          for (const v of [b.x - b.w / 2, b.x + b.w / 2]) expect(lines.some((l) => Math.abs(l - v) < E), `x edge ${v}`).toBe(true);
          for (const v of [b.y - b.h / 2, b.y + b.h / 2]) expect(linesY.some((l) => Math.abs(l - v) < E), `y edge ${v}`).toBe(true);
        }
        for (let i = 0; i < lots.length; i++)
          for (let j = i + 1; j < lots.length; j++) {
            const a = lots[i]!;
            const b = lots[j]!;
            expect(Math.abs(a.x - b.x) < (a.w + b.w) / 2 - E && Math.abs(a.y - b.y) < (a.h + b.h) / 2 - E).toBe(false);
          }
      }
    }
    expect(LOT).toBeCloseTo(1.4, 12);
    expect(LOT_HALF).toBeCloseTo(0.6, 12);
  });
  it("is about 2 buildings per block with about 20 % yards over a 40 x 40 sample", () => {
    let yards = 0;
    let total = 0;
    for (let cx = -20; cx < 20; cx++)
      for (let cy = -20; cy < 20; cy++) {
        const n = blockLots(cx, cy).length;
        if (n === 0) yards++;
        total += n;
      }
    expect(yards / 1600).toBeGreaterThanOrEqual(0.15);
    expect(yards / 1600).toBeLessThanOrEqual(0.25);
    expect(total / 1600).toBeGreaterThanOrEqual(1.8);
    expect(total / 1600).toBeLessThanOrEqual(2.4);
  });
  it("keeps every footprint building a lot of a block, inside the ring", () => {
    for (const { key: k, puzzle } of OPEN) {
      const o = originOf(puzzle);
      const fp = circuitStreets(puzzle).footprint;
      for (const b of footprintLayout(puzzle, o, 50).buildings) {
        expect(SIZES.some(([w, h]) => Math.abs(b.w - w) < E && Math.abs(b.h - h) < E), k).toBe(true);
        expect(b.x - b.w / 2 >= fp.minX && b.x + b.w / 2 <= fp.maxX && b.y - b.h / 2 >= fp.minY && b.y + b.h / 2 <= fp.maxY, k).toBe(true);
        const cx = Math.floor((b.x + o.x) / CITY_BLOCK);
        const cy = Math.floor((b.y + o.y) / CITY_BLOCK);
        const hit = blockLots(cx, cy).some((l) => Math.abs(l.x - o.x - b.x) < 1e-6 && Math.abs(l.y - o.y - b.y) < 1e-6 && Math.abs(l.w - b.w) < E && Math.abs(l.h - b.h) < E);
        expect(hit, `${k} is a lot of its block`).toBe(true);
      }
    }
  });
});

describe("deterministic", () => {
  it("gives equal output for the same map and scale", () => {
    for (const { puzzle } of OPEN.slice(0, 6)) {
      const o = originOf(puzzle);
      for (const scale of SCALES) expect(cityForMap(puzzle, o, windowOf(puzzle, 8), scale)).toEqual(cityForMap(puzzle, o, windowOf(puzzle, 8), scale));
    }
    expect(CITY_SEED).toBe(0x5e57);
  });
  it("outside the footprint, equals cityCells for the same rect", () => {
    for (const { key: k, puzzle } of OPEN.slice(0, 20)) {
      const o = originOf(puzzle);
      const fp = circuitStreets(puzzle).footprint;
      const rect = windowOf(puzzle, 10);
      const outside = (b: Building): boolean => b.x + b.w / 2 <= fp.minX - 0.1 || b.x - b.w / 2 >= fp.maxX + 0.1 || b.y + b.h / 2 <= fp.minY - 0.1 || b.y - b.h / 2 >= fp.maxY + 0.1;
      const key = (b: Building): string => `${b.x.toFixed(6)},${b.y.toFixed(6)},${b.w.toFixed(6)},${b.h.toFixed(6)}`;
      const got = cityForMap(puzzle, o, rect, 50).filter(outside).map(key).sort();
      const want = cityCells({ minX: rect.minX + o.x, maxX: rect.maxX + o.x, minY: rect.minY + o.y, maxY: rect.maxY + o.y })
        .map((b) => ({ x: b.x - o.x, y: b.y - o.y, w: b.w, h: b.h }))
        .filter(outside)
        .map(key)
        .sort();
      expect(got.length, k).toBeGreaterThan(20);
      // Only a lot within WIRE_CLEAR_PX of a feed lane's end on the ring may be missing.
      const missing = want.filter((x) => !got.includes(x));
      const feeds = feedLanes(puzzle);
      for (const m of missing) {
        const [x, y, w, h] = m.split(",").map(Number) as [number, number, number, number];
        expect(feeds.some((l) => city.laneBoxDistance(l, { x, y, w, h }) < WIRE_CLEAR_PX / 50 + 1e-6), `${k} lot ${m} missing`).toBe(true);
      }
      expect(got.every((x) => want.includes(x)), k).toBe(true);
    }
  });
});

describe("places in lots", () => {
  it("gives each lamp one place of its kind, in a lot slot of the kind's size, or a pool", () => {
    let pools = 0;
    let total = 0;
    for (const scale of SCALES) {
      for (const { key: k, puzzle } of OPEN) {
        const places = footprintLayout(puzzle, originOf(puzzle), scale).places;
        const lamps = puzzle.nodes.filter((n) => n.type === "lamp").map((n) => n.id);
        expect(places.map((p) => p.lamp), k).toEqual(lamps);
        for (const p of places) {
          total++;
          expect(p.kind, `${k} ${p.lamp}`).toBe(placeKind(p.lamp));
          const slot = slotKind(p.lamp);
          if (p.pool) {
            if (slot !== "none") pools++;
            continue;
          }
          expect(slot, `${k} ${p.lamp} is a building`).not.toBe("none");
          const parts = placeParts(p);
          if (slot === "whole") expect(Math.abs(p.w - LOT) < E && Math.abs(p.h - LOT) < E).toBe(true);
          if (slot === "quarter") expect(Math.abs(p.w - LOT_HALF) < E && Math.abs(p.h - LOT_HALF) < E).toBe(true);
          if (slot === "row3") {
            expect(parts).toHaveLength(3);
            for (const q of parts) expect(Math.abs(q.w - LOT_HALF) < E && Math.abs(q.h - LOT_HALF) < E).toBe(true);
          }
          if (slot === "gate") {
            expect(parts).toHaveLength(2);
            for (const q of parts) expect(Math.abs(q.w - GATE_POST) < E && Math.abs(q.h - GATE_POST) < E).toBe(true);
          }
        }
        for (let i = 0; i < places.length; i++)
          for (let j = i + 1; j < places.length; j++)
            for (const a of placeParts(places[i]!))
              for (const b of placeParts(places[j]!)) {
                if (places[i]!.pool || places[j]!.pool) continue;
                expect(Math.abs(a.x - b.x) < (a.w + b.w) / 2 - E && Math.abs(a.y - b.y) < (a.h + b.h) / 2 - E, `${k} ${places[i]!.lamp}/${places[j]!.lamp}`).toBe(false);
              }
      }
    }
    expect(total).toBeGreaterThan(300);
    expect(pools / total).toBeLessThan(0.08);
  });
  it("makes a street light a pool with no silhouette", () => {
    let seen = 0;
    for (const { puzzle } of OPEN)
      for (const p of cityPlaces(puzzle)) {
        if (p.kind !== "streetlight") continue;
        seen++;
        expect(p.pool).toBe(true);
        expect(placeShapes(p)).toEqual([]);
      }
    expect(seen).toBeGreaterThan(5);
  });
  it("puts a place in a free slot within 2 blocks of its lamp, or falls back to a pool", () => {
    const open = loadPuzzle({
      id: "open", name: "o", version: 5, scope: "map", capacity: null,
      nodes: [
        { id: "feed", type: "feed", pos: [0, 0] },
        { id: "j", type: "junction", pos: [10, 0] },
        { id: "shrine", type: "lamp", pos: [10, 8] },
      ],
      lines: [{ id: "l0", from: "feed", to: "j" }, { id: "l1", from: "j", to: "shrine" }],
      faults: [],
    });
    const o = originOf(open);
    const place = footprintLayout(open, o, 50).places.find((p) => p.lamp === "shrine")!;
    expect(place.pool).toBe(false);
    expect(Math.hypot(place.x - 10, place.y - 8)).toBeLessThanOrEqual(CITY_BLOCK * 2 + 1.5);
    // at a clearance bigger than any gap in the lattice, nothing fits: a pool
    expect(footprintLayout(open, o, 1).places.find((p) => p.lamp === "shrine")!.pool).toBe(true);
  });
  it("sits a gate's posts WIRE_CLEAR_PX either side of the lamp's own wire", () => {
    const gates: { key: string; puzzle: Puzzle }[] = OPEN.filter(({ puzzle }) => puzzle.nodes.some((n) => n.type === "lamp" && placeKind(n.id) === "gate"));
    expect(gates.length).toBeGreaterThan(0);
    for (const scale of SCALES) {
      for (const { key: k, puzzle } of gates) {
        const pos = new Map(puzzle.nodes.map((n) => [n.id, n.pos] as const));
        for (const p of footprintLayout(puzzle, originOf(puzzle), scale).places) {
          if (p.kind !== "gate" || p.pool) continue;
          const lamp = pos.get(p.lamp)!;
          const wire = puzzle.lines.find((l) => l.from === p.lamp || l.to === p.lamp)!;
          const other = pos.get(wire.from === p.lamp ? wire.to : wire.from)!;
          const lane: Lane = { ax: lamp[0], ay: lamp[1], bx: other[0], by: other[1], w: 0 };
          const sides = placeParts(p).map((q) => {
            const d = city.laneBoxDistance(lane, q) * scale;
            const t = ((q.x - lamp[0]) * (other[0] - lamp[0]) + (q.y - lamp[1]) * (other[1] - lamp[1])) / Math.hypot(other[0] - lamp[0], other[1] - lamp[1]) ** 2;
            const cross = (other[0] - lamp[0]) * (q.y - lamp[1]) - (other[1] - lamp[1]) * (q.x - lamp[0]);
            return { d, t, side: Math.sign(cross) };
          });
          expect(sides[0]!.side, `${k} @${scale}`).toBe(-sides[1]!.side);
          for (const s of sides) {
            expect(s.d, `${k} @${scale}`).toBeGreaterThanOrEqual(WIRE_CLEAR_PX - 1e-6);
            expect(s.d, `${k} @${scale}`).toBeLessThanOrEqual(WIRE_CLEAR_PX + 0.1 * scale); // edge distance = clearance, plus the post's own corner slack
          }
        }
      }
    }
  });
});

describe("silhouettes", () => {
  const mk = (lamp: string, kind: Place["kind"], box: { w: number; h: number; parts?: Building[] }): Place => ({ x: 5, y: 3, w: box.w, h: box.h, lamp, kind, label: null, pool: false, ...(box.parts ? { parts: box.parts } : {}) });
  const quarter = (x: number, y: number): Building => ({ x, y, w: LOT_HALF, h: LOT_HALF });
  const cases: [string, Place["kind"], { w: number; h: number; parts?: Building[] }][] = [
    ["shrine", "sacred", { w: LOT, h: LOT }],
    ["water", "water", { w: LOT_HALF, h: LOT_HALF }],
    ["mill", "mill", { w: LOT, h: LOT }],
    ["gate", "gate", { w: 0.25, h: 1.25, parts: [{ x: 5, y: 2.5, w: 0.25, h: 0.25 }, { x: 5, y: 3.5, w: 0.25, h: 0.25 }] }],
    ["forge", "work", { w: LOT, h: LOT }],
    ["market", "market", { w: LOT, h: LOT }],
    ["inn", "hall", { w: LOT, h: LOT }],
    ["homes", "homes", { w: 2.6, h: 0.6, parts: [quarter(4, 3), quarter(4.8, 3), quarter(6, 3)] }],
    ["home", "home", { w: LOT_HALF, h: LOT_HALF }],
    ["lantern", "streetlight", { w: 0.7, h: 0.7 }],
  ];
  it("gives each of the ten kinds a different primitive signature", () => {
    const sigs = cases.map(([id, kind, box]) => shapeSignature(placeShapes(mk(id, kind, box))));
    expect(new Set(sigs).size, sigs.join(" | ")).toBe(10);
    expect(cases.map((c) => c[1]).sort()).toEqual(["gate", "home", "homes", "hall", "market", "mill", "sacred", "streetlight", "water", "work"].sort());
  });
  it("draws homes as three home shapes and a street light as nothing", () => {
    const one = shapeSignature(placeShapes(mk("home", "home", { w: LOT_HALF, h: LOT_HALF })));
    const homes = placeShapes(mk("homes", "homes", cases[7]![2]));
    expect(homes.filter((s) => s.s === "rect")).toHaveLength(3);
    expect(homes.filter((s) => s.s === "line")).toHaveLength(3);
    expect(one).toBe("rect1 disc0 ring0 line1");
    expect(placeShapes(mk("lantern", "streetlight", { w: 0.7, h: 0.7 }))).toEqual([]);
  });
  it("draws a well as a hollow ring, a mill with four sails, a cross for the shrine", () => {
    expect(shapeSignature(placeShapes(mk("well", "water", { w: LOT_HALF, h: LOT_HALF })))).toBe("rect0 disc0 ring1 line0");
    expect(placeShapes(mk("mill", "mill", { w: LOT, h: LOT })).filter((s) => s.s === "line")).toHaveLength(4);
    const cross = placeShapes(mk("shrine", "sacred", { w: LOT, h: LOT })).filter((s) => s.s === "rect");
    expect(cross).toHaveLength(2);
    expect(cross[0]!.w).toBeGreaterThan(cross[0]!.h);
    expect(cross[1]!.h).toBeGreaterThan(cross[1]!.w);
  });
  it("keeps every piece inside the place's lot (a gate and homes: inside a part)", () => {
    for (const [id, kind, box] of cases) {
      const p = mk(id, kind, box);
      const parts = placeParts(p);
      for (const s of placeShapes(p)) {
        const pts: [number, number][] = s.s === "line" ? [[s.x, s.y], [s.w, s.h]] : [[s.x - s.w / 2, s.y - s.h / 2], [s.x + s.w / 2, s.y + s.h / 2]];
        const bx = p.x - p.w / 2 - 1e-9;
        for (const [x, y] of pts) {
          expect(x >= bx && x <= p.x + p.w / 2 + 1e-9 && y >= p.y - p.h / 2 - 1e-9 && y <= p.y + p.h / 2 + 1e-9, `${id} piece in its box`).toBe(true);
        }
        void parts;
      }
    }
  });
});

describe("contrast", () => {
  it("keeps the street line faint: lighter than the ground, contrast 1.15 to 1.35", () => {
    const c = contrastRatio(CITY_STREET_LINE, CITY_BG);
    expect(c).toBeGreaterThanOrEqual(1.15);
    expect(c).toBeLessThanOrEqual(1.35);
    expect(parseInt(CITY_STREET_LINE.slice(1), 16)).toBeGreaterThan(parseInt(CITY_BG.slice(1), 16));
    expect(contrastRatio(CITY_AVENUE_COLOUR, CITY_BG)).toBeLessThanOrEqual(1.35);
  });
  it("makes a place stand out from the town, without out-shining the circuit", () => {
    expect(contrastRatio(CITY_PLACE_FILL, CITY_STREET_LINE)).toBeGreaterThanOrEqual(1.25);
    expect(contrastRatio(CITY_PLACE_FILL, CITY_BUILDING)).toBeGreaterThanOrEqual(1.9);
    const c = contrastRatio(CITY_PLACE_FILL, CITY_BG);
    expect(c).toBeGreaterThanOrEqual(2.0);
    expect(c).toBeLessThanOrEqual(2.4);
    expect(c).toBeLessThan(contrastRatio("#4a586f", CITY_BG));
  });
  it("gives a place a visible edge: lighter than its fill", () => {
    const lum = (h: string): number => parseInt(h.slice(1), 16);
    expect(lum(CITY_PLACE_EDGE)).toBeGreaterThan(lum(CITY_PLACE_FILL));
    expect(contrastRatio(CITY_PLACE_EDGE, CITY_PLACE_FILL)).toBeGreaterThanOrEqual(1.5);
    expect(contrastRatio(CITY_PLACE_EDGE, CITY_BG)).toBeLessThanOrEqual(3.8);
  });
  it("keeps the background town within 1.6 of the ground, and the glow within 0.5", () => {
    for (const c of [CITY_BUILDING, CITY_STREET_LINE, CITY_AVENUE_COLOUR]) expect(contrastRatio(c, CITY_BG), c).toBeLessThanOrEqual(1.6);
    expect(GLOW_MAX).toBeLessThanOrEqual(0.5);
    expect(LIT_FILL_ALPHA).toBeLessThanOrEqual(0.5);
  });
});

describe("the glow is round", () => {
  it("falls monotonically from the centre and is 0 at the edge", () => {
    let prev = Infinity;
    for (let r = 0; r <= 1.0001; r += 0.01) {
      const a = glowFalloff(r);
      expect(a).toBeLessThanOrEqual(prev);
      prev = a;
    }
    expect(glowFalloff(0)).toBe(1);
    expect(glowFalloff(1)).toBe(0);
    expect(glowFalloff(1.5)).toBe(0);
  });
  it("makes a sprite that depends only on the distance from the centre", () => {
    const n = GLOW_SPRITE_PX;
    const d = glowSpriteData(n);
    expect(d.length).toBe(n * n * 4);
    const alpha = (x: number, y: number): number => d[(y * n + x) * 4 + 3]!;
    const mid = n / 2;
    expect(alpha(mid, mid)).toBeGreaterThan(240);
    expect(alpha(0, 0)).toBe(0);
    expect(alpha(n - 1, n - 1)).toBe(0);
    // four-fold symmetric, so round
    for (const [x, y] of [[mid + 10, mid + 3], [mid + 30, mid - 20], [mid - 1, mid + 40]] as const) {
      const a = alpha(x, y);
      expect(alpha(n - 1 - x, y)).toBe(a);
      expect(alpha(x, n - 1 - y)).toBe(a);
    }
    // monotone along a row from the centre out
    let prev = 256;
    for (let x = mid; x < n; x++) {
      expect(alpha(x, mid)).toBeLessThanOrEqual(prev);
      prev = alpha(x, mid);
    }
    expect(d[0]).toBe(parseInt(CITY_WARM.slice(1, 3), 16));
  });
  it("sizes the glow from the place, never under 32 px, and a pool at POOL_PX", () => {
    expect(glowRadiusPx(10)).toBe(32);
    expect(glowRadiusPx(100)).toBeCloseTo(220, 9);
    for (const h of [5, 14.5, 15, 40, 90]) expect(glowRadiusPx(h)).toBe(Math.max(2.2 * h, 32));
    expect(POOL_PX).toBe(28);
  });
  it("no longer has square halos", () => {
    expect("HALO_LAYERS" in city).toBe(false);
    expect("HALO_ALPHA" in city).toBe(false);
    expect("FINE_CELL" in city).toBe(false);
    expect("gridStreetRects" in city).toBe(false);
  });
});

describe("labels never clip", () => {
  const view = (w: number, h: number) => ({ w, h });
  it("keeps every shown label inside the free area, at 1920 x 1080 and 400 x 700, with insets and pans to the clamp extremes", { timeout: 120000 }, () => {
    for (const { w, h } of [view(1920, 1080), view(400, 700)]) {
      const insets = w > 800 ? { top: 90, right: 300, bottom: 40, left: 0 } : { top: 70, right: 0, bottom: 120, left: 0 };
      for (const { key: k, puzzle } of OPEN) {
        const b = puzzleBounds(puzzle);
        const base = computeFit(b, w, h, 64, insets);
        const free = freeArea(w, h, insets);
        const area = labelArea(free);
        for (const pan of [{ x: 0, y: 0 }, { x: -3000, y: -3000 }, { x: 3000, y: 3000 }, { x: -3000, y: 3000 }, { x: 3000, y: -3000 }]) {
          // Clamp like the renderer does: keep PAN_KEEP px of the map box in the free area.
          const box = { left: b.minX * base.scale + base.offsetX, right: b.maxX * base.scale + base.offsetX, top: b.minY * base.scale + base.offsetY, bottom: b.maxY * base.scale + base.offsetY };
          const clamped = clampTo(pan, box, free);
          const fit = computeFit(b, w, h, 64, insets, clamped);
          const places = footprintLayout(puzzle, originOf(puzzle), fit.scale).places;
          for (const r of targetLabels(puzzle, places, fit, free, approxText)) {
            if (!r) continue;
            expect(r.x, `${k} ${w}x${h}`).toBeGreaterThanOrEqual(area.x - 1e-6);
            expect(r.y, `${k} ${w}x${h}`).toBeGreaterThanOrEqual(area.y - 1e-6);
            expect(r.x + r.w, `${k} ${w}x${h}`).toBeLessThanOrEqual(area.x + area.w + 1e-6);
            expect(r.y + r.h, `${k} ${w}x${h}`).toBeLessThanOrEqual(area.y + area.h + 1e-6);
          }
        }
      }
    }
    expect(LABEL_EDGE_PX).toBe(4);
  });
  function clampTo(pan: { x: number; y: number }, box: { left: number; right: number; top: number; bottom: number }, area: { left: number; right: number; top: number; bottom: number }) {
    const keep = (lo: number, hi: number, alo: number, ahi: number, v: number): number => {
      const k = Math.max(Math.min(96, hi - lo, ahi - alo), 0);
      return Math.min(Math.max(v, alo + k - hi), ahi - k - lo);
    };
    return { x: keep(box.left, box.right, area.left, area.right, pan.x), y: keep(box.top, box.bottom, area.top, area.bottom, pan.y) };
  }
  it("hides a label only when no candidate fits, and shows it when one does (constructed)", () => {
    const place: Place = { x: 2, y: 2, w: 1.4, h: 1.4, lamp: "shrine", kind: "sacred", label: "shrine", pool: false };
    const fit = { scale: 50, offsetX: 0, offsetY: 0 };
    const area: PxRect = { x: 4, y: 4, w: 492, h: 292 };
    const none: LabelObstacles = { rects: [], segs: [], discs: [] };
    const lamp = { x: 0, y: 0 };
    // far side is to the right (and below): there is room
    const free = placeLabel(place, lamp, area, none, 40, LABEL_H_PX, fit);
    expect(free).not.toBeNull();
    // a place at the right edge: the far side would clip, so another side wins and the label stays inside
    const edge: Place = { ...place, x: 9.4, y: 1 };
    const moved = placeLabel(edge, { x: 8, y: 1 }, area, none, 40, LABEL_H_PX, fit)!;
    expect(moved).not.toBeNull();
    expect(moved.x + moved.w).toBeLessThanOrEqual(area.x + area.w);
    // every candidate blocked by a wall of obstacles: hidden
    const wall: LabelObstacles = { rects: [{ x: 0, y: 0, w: 500, h: 300 }], segs: [], discs: [] };
    expect(placeLabel(place, lamp, area, wall, 40, LABEL_H_PX, fit)).toBeNull();
    // a wire across the far side is avoided
    const wire: LabelObstacles = { rects: [], segs: [{ ax: 0, ay: 100, bx: 500, by: 100 }], discs: [] };
    const around = placeLabel(place, lamp, area, wire, 40, LABEL_H_PX, fit)!;
    expect(labelClear(around, wire)).toBe(true);
  });
  it("hides at most one label per map at 1920 x 1080", () => {
    let hidden = 0;
    let shown = 0;
    for (const { key: k, puzzle } of OPEN) {
      const free = freeArea(1920, 1080, { top: 90, right: 300, bottom: 40 });
      const fit = computeFit(puzzleBounds(puzzle), 1920, 1080, 64, { top: 90, right: 300, bottom: 40 });
      const places = footprintLayout(puzzle, originOf(puzzle), fit.scale).places;
      const boxes = targetLabels(puzzle, places, fit, free, approxText);
      let h = 0;
      boxes.forEach((b, i) => {
        if (places[i]!.label === null) return;
        if (b) shown++;
        else h++;
      });
      hidden += h;
      expect(h, `${k} hides ${h}`).toBeLessThanOrEqual(1);
    }
    expect(shown).toBeGreaterThan(100);
    void hidden;
  });
});

describe("the circuit area is a district's size, or a ward's if the map is large", () => {
  it("keeps every footprint inside its district, except a large map's, which has the ward", () => {
    for (const { puzzle } of OPEN) {
      const fp = circuitStreets(puzzle).footprint;
      const large = city.isLarge(puzzleBounds(puzzle));
      expect(fp.maxX - fp.minX <= DISTRICT && fp.maxY - fp.minY <= DISTRICT, puzzle.id).toBe(!large);
      expect(Math.max(fp.maxX - fp.minX, fp.maxY - fp.minY), puzzle.id).toBeLessThanOrEqual(city.WARD);
    }
  });
});
