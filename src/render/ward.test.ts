import { describe, expect, it } from "vitest";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { loadPuzzle, type Puzzle } from "../core";
import { MIN_SCALE, PADDING, clampPan, computeFit, freeArea, mapBox, puzzleBounds, type Insets } from "./geometry";
import {
  CITY_BLOCK,
  DISTRICT,
  FOOTPRINT_MARGIN,
  HUB_R,
  LAYOUT_CACHE_LEVELS,
  WARD,
  WARD_R,
  WARD_RING_STEP,
  WARD_SLOTS,
  WIRE_CLEAR_PX,
  circuitStreets,
  cityCells,
  cityForMap,
  districtOf,
  feedLanes,
  footprintLayout,
  gridStreetLines,
  isLarge,
  lampPlaceStubs,
  layoutBuildingsIn,
  layoutStats,
  mapNumber,
  mapOrigin,
  nodeClearPx,
  placeParts,
  pointBoxDistance,
  regionOf,
  visibleMapRect,
  wardOf,
  type Building,
  type Lane,
} from "./city";
import { createLabelCache } from "./labelcache";
import { createMapRenderer } from "./map-renderer";
import { targetLabels } from "./places";

// Ticket 027 A2: a ward for a large map; the clip is gone; a pan costs what the screen costs.

const ROOT = join(__dirname, "..", "..", "puzzles");
function loadDir(dir: string): Puzzle[] {
  const out: Puzzle[] = [];
  if (!existsSync(dir)) return out;
  for (const f of readdirSync(dir)) {
    if (!f.endsWith(".json")) continue;
    const raw = JSON.parse(readFileSync(join(dir, f), "utf8")) as { scope?: string };
    if (raw.scope !== "map") continue;
    out.push(loadPuzzle(raw));
  }
  return out;
}
const OPEN = loadDir(ROOT);
const FILES = OPEN.concat(loadDir(join(ROOT, "locked")));

/** A 64 x 40 unit comb (the same shape as view.test.ts): a trunk with the feed on it, branches up and down, lamps at the tips. */
function synthetic(): Puzzle {
  const nodes: unknown[] = [];
  const lines: unknown[] = [];
  const targets: string[] = [];
  const cols = 17;
  const rows = 11;
  const mid = 5;
  for (let c = 0; c < cols; c++) {
    for (let r = 0; r < rows; r++) {
      const id = `n_${c}_${r}`;
      const pos = [c * 4, r * 4];
      const tip = r === 0 || r === rows - 1;
      if (c === 8 && r === mid) nodes.push({ id, type: "feed", pos });
      else if (tip) {
        nodes.push({ id, type: "lamp", pos, load: 1 });
        if (r === 0 && c % 4 === 0) targets.push(id);
      } else nodes.push({ id, type: "junction", pos });
      if (r !== mid) lines.push({ id: `v_${c}_${r}`, from: `n_${c}_${r < mid ? r + 1 : r - 1}`, to: id });
    }
    if (c > 0) lines.push({ id: `h_${c}`, from: `n_${c - 1}_${mid}`, to: `n_${c}_${mid}` });
  }
  return loadPuzzle({ id: "40-synthetic-large", name: "Synthetic large", version: 4, scope: "map", capacity: 10, startingParts: [], target: targets, nodes, lines, faults: [] });
}
const BIG = synthetic();
const E = 1e-9;
const W = 1920;
const H = 1080;
const INS: Insets = { top: 220, bottom: 140 };

/** What "large" means, written out again: the footprint is wider or taller than a district. */
const largeBy = (p: Puzzle): boolean => {
  const b = puzzleBounds(p);
  return b.maxX - b.minX + 2 * FOOTPRINT_MARGIN > DISTRICT || b.maxY - b.minY + 2 * FOOTPRINT_MARGIN > DISTRICT;
};
const LARGE_FILES = OPEN.filter(largeBy);
const sqr = (c: { x: number; y: number }, size: number) => ({ minX: c.x - size / 2, maxX: c.x + size / 2, minY: c.y - size / 2, maxY: c.y + size / 2 });
const overlap = (a: ReturnType<typeof sqr>, b: ReturnType<typeof sqr>): boolean => a.minX < b.maxX - E && b.minX < a.maxX - E && a.minY < b.maxY - E && b.minY < a.maxY - E;

describe("isLarge", () => {
  it("is true for exactly the maps whose bounds + 2 x FOOTPRINT_MARGIN exceed DISTRICT on an axis", () => {
    const names: string[] = [];
    for (const p of FILES.concat([BIG])) {
      expect(isLarge(puzzleBounds(p)), p.id).toBe(largeBy(p));
      if (isLarge(puzzleBounds(p))) names.push(p.id);
    }
    console.info("large maps:", names);
    expect(isLarge(puzzleBounds(BIG))).toBe(true);
    // The ticket named four (33, 55, 56, 59); after the 029 reorder only 56-whole-ward is over the line today.
    expect(LARGE_FILES.length).toBeGreaterThanOrEqual(1);
    expect(LARGE_FILES.some((p) => p.id.includes("whole-ward"))).toBe(true);
  });
  it("is a threshold on the footprint, not the bounds: 28 units is small, 28.01 is large", () => {
    expect(isLarge({ minX: 0, maxX: DISTRICT - 2 * FOOTPRINT_MARGIN, minY: 0, maxY: 10 })).toBe(false);
    expect(isLarge({ minX: 0, maxX: DISTRICT - 2 * FOOTPRINT_MARGIN + 0.01, minY: 0, maxY: 10 })).toBe(true);
    expect(isLarge({ minX: 0, maxX: 10, minY: 0, maxY: DISTRICT - 2 * FOOTPRINT_MARGIN + 0.01 })).toBe(true);
  });
});

describe("wards", () => {
  it("sits on the ring: radius WARD_R + WARD_RING_STEP x floor(n / WARD_SLOTS), angle (n mod WARD_SLOTS) x 2 pi / WARD_SLOTS", () => {
    for (const n of [1, 16, 17, 33, 40, 56, 100, 129, 512]) {
      const w = wardOf(n);
      expect(Math.hypot(w.x, w.y)).toBeCloseTo(WARD_R + WARD_RING_STEP * Math.floor(n / WARD_SLOTS), 6);
      const a = (n % WARD_SLOTS) * ((2 * Math.PI) / WARD_SLOTS);
      expect(w.x).toBeCloseTo(Math.hypot(w.x, w.y) * Math.cos(a), 6);
      expect(w.y).toBeCloseTo(Math.hypot(w.x, w.y) * Math.sin(a), 6);
    }
    expect([WARD, WARD_R, WARD_SLOTS, WARD_RING_STEP]).toEqual([96, 1024, 16, 160]);
  });
  it("overlaps no spoke district, for ladder numbers 1..129", { timeout: 60000 }, () => {
    const districts = Array.from({ length: 129 }, (_, i) => sqr(districtOf(i + 1).centre, DISTRICT));
    for (let n = 1; n <= 129; n++) {
      const w = sqr(wardOf(n), WARD);
      for (let d = 0; d < districts.length; d++) expect(overlap(w, districts[d]!), `ward ${n} vs district ${d + 1}`).toBe(false);
    }
  });
  it("overlaps no other ward, for 1..512", () => {
    const wards = Array.from({ length: 512 }, (_, i) => sqr(wardOf(i + 1), WARD));
    for (let i = 0; i < wards.length; i++) for (let j = i + 1; j < wards.length; j++) if (overlap(wards[i]!, wards[j]!)) throw new Error(`ward ${i + 1} overlaps ward ${j + 1}`);
  });
  it("never contains the hub", () => {
    for (let n = 1; n <= 512; n++) {
      const w = sqr(wardOf(n), WARD);
      const nx = Math.min(Math.max(0, w.minX), w.maxX);
      const ny = Math.min(Math.max(0, w.minY), w.maxY);
      expect(Math.hypot(nx, ny), `ward ${n}`).toBeGreaterThan(HUB_R);
    }
  });
});

describe("whole footprints", () => {
  it("lies every file's footprint (bounds + margin, unclipped) inside its district or its ward, and the synthetic map's", () => {
    for (const p of FILES.concat([BIG])) {
      const b = puzzleBounds(p);
      const fp = circuitStreets(p).footprint;
      expect(fp, p.id).toEqual({ minX: b.minX - FOOTPRINT_MARGIN, minY: b.minY - FOOTPRINT_MARGIN, maxX: b.maxX + FOOTPRINT_MARGIN, maxY: b.maxY + FOOTPRINT_MARGIN });
      const o = mapOrigin(p.id, b);
      const r = regionOf(p.id, b);
      expect(r.size, p.id).toBe(isLarge(b) ? WARD : DISTRICT);
      expect(fp.minX + o.x, p.id).toBeGreaterThanOrEqual(r.centre.x - r.size / 2 - E);
      expect(fp.maxX + o.x, p.id).toBeLessThanOrEqual(r.centre.x + r.size / 2 + E);
      expect(fp.minY + o.y, p.id).toBeGreaterThanOrEqual(r.centre.y - r.size / 2 - E);
      expect(fp.maxY + o.y, p.id).toBeLessThanOrEqual(r.centre.y + r.size / 2 + E);
    }
  });
  it("puts the synthetic 64 x 40 map in the ward of its ladder number", () => {
    const o = mapOrigin(BIG.id, puzzleBounds(BIG));
    const b = puzzleBounds(BIG);
    const w = wardOf(mapNumber(BIG.id));
    expect(Math.abs((b.minX + b.maxX) / 2 + o.x - w.x)).toBeLessThanOrEqual(CITY_BLOCK / 2 + E);
    expect(Math.abs((b.minY + b.maxY) / 2 + o.y - w.y)).toBeLessThanOrEqual(CITY_BLOCK / 2 + E);
  });
  it("leaves a large map's old spoke slot as plain city: no footprint there", () => {
    for (const p of LARGE_FILES.concat([BIG])) {
      const o = mapOrigin(p.id, puzzleBounds(p));
      const slot = districtOf(mapNumber(p.id)).centre;
      // The map's circuit is nowhere near the district it would have had.
      expect(Math.hypot(o.x - slot.x, o.y - slot.y), p.id).toBeGreaterThan(WARD_R / 2);
    }
  });
});

describe("small maps unmoved", () => {
  it("mapOrigin is the 023/024 formula (centred on the district) for every map that is not large", () => {
    let n = 0;
    for (const p of FILES) {
      const b = puzzleBounds(p);
      if (isLarge(b)) continue;
      const c = districtOf(mapNumber(p.id)).centre;
      const x = Math.round((c.x - (b.minX + b.maxX) / 2) / CITY_BLOCK) * CITY_BLOCK;
      const y = Math.round((c.y - (b.minY + b.maxY) / 2) / CITY_BLOCK) * CITY_BLOCK;
      expect(mapOrigin(p.id, b), p.id).toEqual({ x: x + 0, y: y + 0 });
      n++;
    }
    expect(n).toBeGreaterThan(40);
  });
});

describe("024 A3 on the large maps, at 36, 50 and 80 px per unit", () => {
  const maps = LARGE_FILES.concat([BIG]);
  const toBox = (x: number, y: number, b: Building): number => pointBoxDistance(x, y, b);
  function samples(l: Lane, scale: number): [number, number][] {
    const len = Math.hypot(l.bx - l.ax, l.by - l.ay) * scale;
    const n = Math.max(Math.ceil(len / 2), 1);
    const out: [number, number][] = [];
    for (let i = 0; i <= n; i++) out.push([l.ax + ((l.bx - l.ax) * i) / n, l.ay + ((l.by - l.ay) * i) / n]);
    return out;
  }
  it("keeps every building and place WIRE_CLEAR_PX from every wire sample and nodeClearPx from every node", { timeout: 300000 }, () => {
    for (const scale of [MIN_SCALE, 50, 80]) {
      for (const p of maps) {
        const o = mapOrigin(p.id, puzzleBounds(p));
        const lay = footprintLayout(p, o, scale);
        const f = circuitStreets(p).footprint;
        const blds = cityForMap(p, o, { minX: f.minX - 1, maxX: f.maxX + 1, minY: f.minY - 1, maxY: f.maxY + 1 }, scale);
        expect(lay.buildings.length, `${p.id} @${scale}`).toBeGreaterThan(0);
        const boxes: { b: Building; what: string }[] = blds.map((b) => ({ b, what: "building" }));
        for (const pl of lay.places) if (!pl.pool) for (const q of placeParts(pl)) boxes.push({ b: q, what: `place ${pl.lamp}` });
        const wc = WIRE_CLEAR_PX / scale;
        for (const l of lay.streets) {
          for (const [sx, sy] of samples(l, scale)) {
            for (const { b, what } of boxes) {
              if (Math.abs(b.x - sx) > b.w / 2 + wc + 0.01 || Math.abs(b.y - sy) > b.h / 2 + wc + 0.01) continue;
              if (toBox(sx, sy, b) * scale < WIRE_CLEAR_PX - 1e-6) throw new Error(`${p.id} @${scale}: ${what} within ${(toBox(sx, sy, b) * scale).toFixed(2)}px of a wire at ${sx},${sy}`);
            }
          }
        }
        for (const n of p.nodes) {
          const r = nodeClearPx(n) / scale;
          for (const { b, what } of boxes) {
            if (toBox(n.pos[0], n.pos[1], b) < r - 1e-9) throw new Error(`${p.id} @${scale}: ${what} within ${nodeClearPx(n)}px of node ${n.id}`);
          }
        }
        // And nothing is built across the ring road.
        for (const b of lay.buildings) {
          expect(b.x - b.w / 2, p.id).toBeGreaterThanOrEqual(f.minX);
          expect(b.x + b.w / 2, p.id).toBeLessThanOrEqual(f.maxX);
          expect(b.y - b.h / 2, p.id).toBeGreaterThanOrEqual(f.minY);
          expect(b.y + b.h / 2, p.id).toBeLessThanOrEqual(f.maxY);
        }
      }
    }
  });

  type Seg = { name: string; ax: number; ay: number; bx: number; by: number };
  const segDist = (a: Seg, b: Seg): number => {
    const d = (px: number, py: number, s: Seg): number => {
      const dx = s.bx - s.ax;
      const dy = s.by - s.ay;
      const l2 = dx * dx + dy * dy;
      const t = l2 > 0 ? Math.min(Math.max(((px - s.ax) * dx + (py - s.ay) * dy) / l2, 0), 1) : 0;
      return Math.hypot(px - (s.ax + t * dx), py - (s.ay + t * dy));
    };
    let best = Math.min(d(a.ax, a.ay, b), d(a.bx, a.by, b), d(b.ax, b.ay, a), d(b.bx, b.by, a));
    const den = (a.bx - a.ax) * (b.by - b.ay) - (a.by - a.ay) * (b.bx - b.ax);
    if (Math.abs(den) > 1e-12) {
      const t = ((b.ax - a.ax) * (b.by - b.ay) - (b.ay - a.ay) * (b.bx - b.ax)) / den;
      const u = ((b.ax - a.ax) * (a.by - a.ay) - (b.ay - a.ay) * (a.bx - a.ax)) / den;
      if (t >= 0 && t <= 1 && u >= 0 && u <= 1) best = 0;
    }
    return best;
  };
  it("joins every circuit line, feed lane, the ring and the shared grid into one network (streets connect), and has a street on each side of the ring", () => {
    for (const p of maps) {
      const cs = circuitStreets(p);
      const fp = cs.footprint;
      const o = mapOrigin(p.id, puzzleBounds(p));
      const segs: Seg[] = [];
      cs.lanes.slice(0, p.lines.length).forEach((l, i) => segs.push({ name: `line ${p.lines[i]!.id}`, ...l }));
      feedLanes(p).forEach((l, i) => segs.push({ name: `feed ${i}`, ...l }));
      const ring: Seg[] = [
        { name: "ring N", ax: fp.minX, ay: fp.minY, bx: fp.maxX, by: fp.minY },
        { name: "ring E", ax: fp.maxX, ay: fp.minY, bx: fp.maxX, by: fp.maxY },
        { name: "ring S", ax: fp.maxX, ay: fp.maxY, bx: fp.minX, by: fp.maxY },
        { name: "ring W", ax: fp.minX, ay: fp.maxY, bx: fp.minX, by: fp.minY },
      ];
      segs.push(...ring);
      const hole = { minX: fp.minX + o.x, maxX: fp.maxX + o.x, minY: fp.minY + o.y, maxY: fp.maxY + o.y };
      const vis = { minX: hole.minX - 3, maxX: hole.maxX + 3, minY: hole.minY - 3, maxY: hole.maxY + 3 };
      const grid = gridStreetLines(vis, hole)
        .map((s, i) => ({ name: `grid ${i}`, ax: s.ax - o.x, ay: s.ay - o.y, bx: s.bx - o.x, by: s.by - o.y }))
        .filter((g) => ring.some((r) => segDist(g, r) < 1e-6));
      for (const side of ring) expect(grid.some((g) => segDist(g, side) < 1e-6), `${p.id} ${side.name}`).toBe(true);
      const all = segs.concat(grid);
      const parent = all.map((_, i) => i);
      const find = (i: number): number => (parent[i] === i ? i : (parent[i] = find(parent[i]!)));
      for (let i = 0; i < all.length; i++) for (let j = i + 1; j < all.length; j++) if (segDist(all[i]!, all[j]!) < 1e-6) parent[find(i)] = find(j);
      const lost = all.filter((_, i) => find(i) !== find(0)).map((s) => s.name);
      expect(new Set(all.map((_, i) => find(i))).size, `${p.id} is split: ${lost.slice(0, 5).join(", ")}`).toBe(1);
      // No shared street runs inside the ring.
      for (const g of grid) {
        for (const [x, y] of [[g.ax, g.ay], [g.bx, g.by], [(g.ax + g.bx) / 2, (g.ay + g.by) / 2]] as const) {
          expect(x > fp.minX + 1e-6 && x < fp.maxX - 1e-6 && y > fp.minY + 1e-6 && y < fp.maxY - 1e-6, `${p.id} grid inside the ring`).toBe(false);
        }
      }
    }
  });
});

describe("footprintLayout is cached per scale", () => {
  it("builds once per scale and serves repeat visits from the cache (the most recent LAYOUT_CACHE_LEVELS)", () => {
    const p = OPEN.find((q) => q.id.startsWith("09"))!;
    const o = mapOrigin(p.id, puzzleBounds(p));
    const start = layoutStats.builds;
    const scales = [31, 41, 51, 61, 71];
    for (const s of scales.slice(0, LAYOUT_CACHE_LEVELS)) footprintLayout(p, o, s);
    expect(layoutStats.builds - start).toBe(LAYOUT_CACHE_LEVELS);
    // revisit all four: all hits
    for (const s of scales.slice(0, LAYOUT_CACHE_LEVELS)) footprintLayout(p, o, s);
    expect(layoutStats.builds - start).toBe(LAYOUT_CACHE_LEVELS);
    // a fifth evicts the oldest (31, least recently used after the revisit order 31..61: 31 is oldest)
    footprintLayout(p, o, scales[4]!);
    expect(layoutStats.builds - start).toBe(LAYOUT_CACHE_LEVELS + 1);
    footprintLayout(p, o, 41);
    footprintLayout(p, o, 51);
    footprintLayout(p, o, 61);
    footprintLayout(p, o, 71);
    expect(layoutStats.builds - start).toBe(LAYOUT_CACHE_LEVELS + 1);
    footprintLayout(p, o, 31);
    expect(layoutStats.builds - start).toBe(LAYOUT_CACHE_LEVELS + 2);
    // identical output on a hit
    expect(footprintLayout(p, o, 71)).toBe(footprintLayout(p, o, 71));
  });
  it("lampPlaceStubs has a place per lamp in nodes order, with the real layout's kinds and labels", () => {
    for (const p of [BIG, ...OPEN.slice(0, 12)]) {
      const stubs = lampPlaceStubs(p);
      const real = footprintLayout(p, mapOrigin(p.id, puzzleBounds(p)), MIN_SCALE).places;
      expect(stubs.map((s) => [s.lamp, s.kind, s.label]), p.id).toEqual(real.map((s) => [s.lamp, s.kind, s.label]));
    }
  });
});

describe("layoutBuildingsIn", () => {
  it("returns exactly the buildings that touch the window", () => {
    const o = mapOrigin(BIG.id, puzzleBounds(BIG));
    const lay = footprintLayout(BIG, o, MIN_SCALE);
    for (const rect of [
      { minX: 0, maxX: 10, minY: 0, maxY: 8 },
      { minX: -5, maxX: 30, minY: 15, maxY: 25 },
      { minX: 40, maxX: 70, minY: 30, maxY: 45 },
      { minX: -100, maxX: -50, minY: -100, maxY: -50 },
    ]) {
      const got = layoutBuildingsIn(lay, rect);
      const want = lay.buildings.filter((b) => b.x + b.w / 2 >= rect.minX && b.x - b.w / 2 <= rect.maxX && b.y + b.h / 2 >= rect.minY && b.y - b.h / 2 <= rect.maxY);
      const k = (b: Building): string => `${b.x},${b.y},${b.w},${b.h}`;
      expect(got.map(k).sort()).toEqual(want.map(k).sort());
    }
  });
});

describe("a pan is bounded by the screen", () => {
  const free = freeArea(W, H, INS);
  const base = computeFit(puzzleBounds(BIG), W, H, PADDING, INS);
  const box = mapBox(puzzleBounds(BIG), base);
  const pans = [{ x: 0, y: 0 }, { x: -300, y: -120 }, { x: 400, y: 200 }, { x: -900, y: -300 }, { x: 900, y: 300 }, { x: -1e9, y: -1e9 }, { x: 1e9, y: 1e9 }, { x: -640, y: 250 }].map((p) => clampPan(p, box, free, undefined, PADDING));

  it("draws no more buildings than a map-free window of the same canvas size", () => {
    const o = mapOrigin(BIG.id, puzzleBounds(BIG));
    const s = base.scale;
    // The most lots any plain window of this size holds, over 40 windows of the shared city.
    let most = 0;
    for (let k = 0; k < 40; k++) {
      const x = 300 + k * 37;
      const y = -250 + k * 53;
      const w = visibleMapRect({ scale: s, offsetX: 0, offsetY: 0 }, W, H, CITY_BLOCK);
      most = Math.max(most, cityCells({ minX: w.minX + x, maxX: w.maxX + x, minY: w.minY + y, maxY: w.maxY + y }).length);
    }
    expect(most).toBeGreaterThan(50);
    const counts: number[] = [];
    for (const pan of pans) {
      const fit = computeFit(puzzleBounds(BIG), W, H, PADDING, INS, pan);
      counts.push(cityForMap(BIG, o, visibleMapRect(fit, W, H, CITY_BLOCK), fit.scale).length);
    }
    expect(Math.max(...counts)).toBeLessThanOrEqual(most);
  });

  it("builds the footprint layout once per scale: not at all on a pan", () => {
    const r = createMapRenderer(fakeCanvas(W, H), BIG, { insets: INS });
    const before = layoutStats.builds;
    for (const pan of pans) r.setPan(pan.x, pan.y);
    for (let i = 0; i < 40; i++) r.setPan(-i * 11, i * 5);
    expect(layoutStats.builds - before).toBe(0);
  });

  it("builds at most one layout to open a renderer (the opening scale)", () => {
    const before = layoutStats.builds;
    const other = loadPuzzle({ id: "41-ward-open", name: "x", version: 4, scope: "map", capacity: 10, startingParts: [], target: ["l"], nodes: [{ id: "f", type: "feed", pos: [0, 0] }, { id: "l", type: "lamp", pos: [60, 38], load: 1 }], lines: [{ id: "w", from: "f", to: "l" }], faults: [] });
    createMapRenderer(fakeCanvas(W, H), other, { insets: INS });
    expect(layoutStats.builds - before).toBeLessThanOrEqual(1);
  });
});

describe("labels that survive a pan", () => {
  const measure = (t: string): number => t.length * 6;
  function walk(puzzle: Puzzle, w: number, h: number, ins: Insets): { updates: number; recomputes: number } {
    const b = puzzleBounds(puzzle);
    const fr = freeArea(w, h, ins);
    const base = computeFit(b, w, h, PADDING, ins);
    const bx = mapBox(b, base);
    const cache = createLabelCache(puzzle);
    const centres = new Float64Array(4096);
    const shown = new Uint8Array(2048);
    let updates = 0;
    // A drag-like walk to the corners and back.
    const targets = [[0, 0], [-500, -200], [-1400, -600], [300, 400], [1400, 600], [-700, 100], [0, 0]];
    let px = 0;
    let py = 0;
    for (const [tx, ty] of targets) {
      for (let i = 1; i <= 24; i++) {
        const pan = clampPan({ x: px + ((tx! - px) * i) / 24, y: py + ((ty! - py) * i) / 24 }, bx, fr, undefined, PADDING);
        const fit = computeFit(b, w, h, PADDING, ins, pan);
        const places = footprintLayout(puzzle, mapOrigin(puzzle.id, b), fit.scale).places;
        cache.update(places, fit, fr, measure, centres, shown);
        updates++;
        const fresh = targetLabels(puzzle, places, fit, fr, measure);
        places.forEach((pl, k) => {
          const box = fresh[k] ?? null;
          expect(shown[k], `${puzzle.id} ${pl.lamp} @ ${JSON.stringify(pan)}`).toBe(box ? 1 : 0);
          if (box) {
            expect(centres[k * 2]!, `${puzzle.id} ${pl.lamp} x`).toBeCloseTo(box.x + box.w / 2, 6);
            expect(centres[k * 2 + 1]!, `${puzzle.id} ${pl.lamp} y`).toBeCloseTo(box.y + box.h / 2, 6);
          }
        });
      }
      px = tx!;
      py = ty!;
    }
    return { updates, recomputes: cache.recomputes };
  }
  it("gives, at every step of a drag, exactly what a full recompute gives", { timeout: 120000 }, () => {
    const big = walk(BIG, W, H, INS);
    const ward = walk(OPEN.find((p) => p.id.includes("whole-ward"))!, W, H, INS);
    const small = walk(OPEN.find((p) => p.id.startsWith("09"))!, 800, 600, { top: 90, right: 200, bottom: 40 });
    console.info("label recomputes / updates:", { big, ward, small });
    expect(big.updates).toBeGreaterThan(100);
  });
  it("recomputes only some of the time on a large map (most pans just slide the boxes)", { timeout: 120000 }, () => {
    const r = walk(BIG, W, H, INS);
    expect(r.recomputes).toBeLessThan(r.updates * 0.6);
    expect(r.recomputes).toBeGreaterThan(0);
  });
  it("recomputes when the scale changes", () => {
    const cache = createLabelCache(BIG);
    const b = puzzleBounds(BIG);
    const fr = freeArea(W, H, INS);
    const centres = new Float64Array(4096);
    const shown = new Uint8Array(2048);
    for (const s of [36, 36, 50]) {
      const fit = { scale: s, offsetX: 100, offsetY: 300 };
      cache.update(footprintLayout(BIG, mapOrigin(BIG.id, b), s).places, fit, fr, measure, centres, shown);
    }
    expect(cache.recomputes).toBe(2);
  });
});

function fakeCanvas(w: number, h: number): HTMLCanvasElement {
  const store: Record<string, unknown> = {};
  const noop = (): void => {};
  const ctx = new Proxy(store, {
    get: (t, p: string) => (p === "measureText" ? (s: string) => ({ width: s.length * 6 }) : p in t ? t[p] : noop),
    set: (t, p: string, v) => {
      t[p] = v;
      return true;
    },
  });
  return { clientWidth: w, clientHeight: h, width: w, height: h, getContext: () => ctx } as unknown as HTMLCanvasElement;
}

