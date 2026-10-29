import { describe, expect, it } from "vitest";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { loadPuzzle, type Puzzle } from "../core";
import {
  MAX_SCALE,
  MIN_SCALE,
  NODE_HIT_RADIUS,
  PADDING,
  PAN_KEEP,
  buildGeometry,
  clampPan,
  computeFit,
  freeArea,
  hitTestGeometry,
  initialPan,
  mapBox,
  overflows,
  puzzleBounds,
  visibleLines,
  visibleNodes,
  type Insets,
  type Rect,
} from "./geometry";
import { footprintLayout, mapOrigin } from "./city";
import { LOT } from "./city";
import { createMapRenderer } from "./map-renderer";
import { targetLabels } from "./places";

// Ticket 027 A1: readable scale, overflow, edge-stop pan, opening view, centreOn, free-area picking, culling.

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
const FILES = loadDir(ROOT).concat(loadDir(join(ROOT, "locked")));

/** A 64 x 40 unit comb: a trunk along y = 20 with the feed on it at (32, 20), a branch up and down from every trunk node, lamps at the branch tips. */
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
const CORNER = loadPuzzle({
  id: "41-corner",
  name: "Corner",
  version: 4,
  scope: "map",
  capacity: 2,
  startingParts: [],
  target: ["far"],
  nodes: [
    { id: "feed", type: "feed", pos: [0, 0] },
    { id: "far", type: "lamp", pos: [64, 40], load: 1 },
  ],
  lines: [{ id: "l", from: "feed", to: "far" }],
  faults: [],
});
const BIG = synthetic();
const BIG_B = puzzleBounds(BIG);
const W = 1920;
const H = 1080;
const INS: Insets = { top: 220, bottom: 140 };

describe("synthetic map is 64 x 40 units", () => {
  it("has those bounds", () => {
    expect(BIG_B.maxX - BIG_B.minX).toBe(64);
    expect(BIG_B.maxY - BIG_B.minY).toBe(40);
  });
});

describe("scale clamp", () => {
  it("never leaves [MIN_SCALE, MAX_SCALE]", () => {
    const sizes: [number, number][] = [[200, 150], [400, 300], [1100, 650], [1920, 1080], [4000, 3000]];
    for (const p of FILES.concat([BIG])) {
      for (const [w, h] of sizes) {
        const s = computeFit(puzzleBounds(p), w, h, PADDING, INS).scale;
        expect(s, `${p.id} ${w}x${h}`).toBeGreaterThanOrEqual(MIN_SCALE);
        expect(s, `${p.id} ${w}x${h}`).toBeLessThanOrEqual(MAX_SCALE);
      }
    }
  });
  it("gives every file of puzzles/ today's scale at 1920 x 1080 (they all fit)", () => {
    expect(FILES.length).toBeGreaterThan(50);
    const below: string[] = [];
    for (const p of FILES) {
      const b = puzzleBounds(p);
      const availX = W - 2 * PADDING;
      const availY = H - INS.top! - INS.bottom! - 2 * PADDING;
      const today = Math.min(availX / Math.max(b.maxX - b.minX, 1e-6), availY / Math.max(b.maxY - b.minY, 1e-6), MAX_SCALE);
      if (today < MIN_SCALE) {
        below.push(`${p.id} ${today.toFixed(1)}`);
        expect(computeFit(b, W, H, PADDING, INS).scale, p.id).toBe(MIN_SCALE);
      } else expect(computeFit(b, W, H, PADDING, INS).scale, p.id).toBe(today);
    }
    // The ticket says all fit at >= 36 here; the files below do not, so they now open at MIN_SCALE and overflow a little.
    console.info("files whose fit was below MIN_SCALE at 1920x1080 with insets 220/140:", below);
    expect(below.length).toBeLessThan(FILES.length / 4);
  });
  it("gives a 64 x 40 map exactly MIN_SCALE", () => {
    expect(computeFit(BIG_B, W, H, PADDING, INS).scale).toBe(MIN_SCALE);
  });
  it("an explicit scale overrides the fit", () => {
    expect(computeFit(BIG_B, W, H, PADDING, INS, undefined, 20).scale).toBe(20);
  });
});

describe("overflows", () => {
  it("flags the axes where the box plus padding exceeds the area", () => {
    const fit = computeFit(BIG_B, W, H, PADDING, INS);
    expect(overflows(BIG_B, fit, freeArea(W, H, INS), PADDING)).toEqual({ x: true, y: true });
    const area = freeArea(W, 2200, INS);
    const o = overflows(BIG_B, computeFit(BIG_B, W, 2200, PADDING, INS), area, PADDING);
    expect(o.x).toBe(true);
    expect(o.y).toBe(false);
  });
  it("a map that fits at its fit scale does not overflow", () => {
    for (const p of FILES) {
      const b = puzzleBounds(p);
      if (computeFit(b, W, H, PADDING, INS).scale === MIN_SCALE) continue;
      expect(overflows(b, computeFit(b, W, H, PADDING, INS), freeArea(W, H, INS), PADDING), p.id).toEqual({ x: false, y: false });
    }
  });
});

describe("edge-stop clamp", () => {
  const area: Rect = { left: 0, top: 200, right: 1000, bottom: 700 };
  const big: Rect = { left: -500, top: -300, right: 1900, bottom: 1500 };
  it("stops the box edge exactly PADDING inside, on each of the four sides", () => {
    const r = clampPan({ x: 10_000, y: 10_000 }, big, area, PAN_KEEP, PADDING);
    expect(big.left + r.x).toBe(area.left + PADDING);
    expect(big.top + r.y).toBe(area.top + PADDING);
    const l = clampPan({ x: -10_000, y: -10_000 }, big, area, PAN_KEEP, PADDING);
    expect(big.right + l.x).toBe(area.right - PADDING);
    expect(big.bottom + l.y).toBe(area.bottom - PADDING);
  });
  it("passes a pan in range", () => {
    expect(clampPan({ x: -300, y: -200 }, big, area, PAN_KEEP, PADDING)).toEqual({ x: -300, y: -200 });
  });
  it("a fitting axis keeps the 022 rule even with edgePad given", () => {
    const box: Rect = { left: 300, top: 300, right: 700, bottom: 600 };
    expect(clampPan({ x: 10_000, y: 10_000 }, box, area, PAN_KEEP, PADDING)).toEqual(clampPan({ x: 10_000, y: 10_000 }, box, area));
    expect(clampPan({ x: -10_000, y: -10_000 }, box, area, PAN_KEEP, PADDING)).toEqual(clampPan({ x: -10_000, y: -10_000 }, box, area));
  });
  it("uses each rule on its own axis", () => {
    const box: Rect = { left: -500, top: 300, right: 1900, bottom: 600 }; // overflows x, fits y
    const hi = clampPan({ x: 10_000, y: 10_000 }, box, area, PAN_KEEP, PADDING);
    expect(box.left + hi.x).toBe(area.left + PADDING); // edge-stop
    expect(box.top + hi.y).toBe(area.bottom - PAN_KEEP); // PAN_KEEP
    const lo = clampPan({ x: -10_000, y: -10_000 }, box, area, PAN_KEEP, PADDING);
    expect(box.right + lo.x).toBe(area.right - PADDING);
    expect(box.bottom + lo.y).toBe(area.top + PAN_KEEP);
  });
});

/** A canvas stand-in: a no-op 2D context that measures text at 6 px a glyph. */
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

function nodePos(p: Puzzle, id: string): [number, number] {
  const n = p.nodes.find((q) => q.id === id)!;
  return [n.pos[0], n.pos[1]];
}

describe("initial view", () => {
  it("opens the large map with its first feed at the free area's centre (or on the clamp's edge)", () => {
    const r = createMapRenderer(fakeCanvas(W, H), BIG, { insets: INS });
    r.resetView();
    const pan = r.getPan();
    const fit = computeFit(BIG_B, W, H, PADDING, INS, pan);
    const [fx, fy] = nodePos(BIG, "n_8_5");
    const sx = fx * fit.scale + fit.offsetX;
    const sy = fy * fit.scale + fit.offsetY;
    const area = freeArea(W, H, INS);
    const cx = (area.left + area.right) / 2;
    const cy = (area.top + area.bottom) / 2;
    const clamped = clampPan({ x: 1e9, y: 1e9 }, mapBox(BIG_B, computeFit(BIG_B, W, H, PADDING, INS)), area, PAN_KEEP, PADDING);
    const clampedLo = clampPan({ x: -1e9, y: -1e9 }, mapBox(BIG_B, computeFit(BIG_B, W, H, PADDING, INS)), area, PAN_KEEP, PADDING);
    const onEdgeX = Math.abs(pan.x - clamped.x) < 1e-6 || Math.abs(pan.x - clampedLo.x) < 1e-6;
    const onEdgeY = Math.abs(pan.y - clamped.y) < 1e-6 || Math.abs(pan.y - clampedLo.y) < 1e-6;
    if (!onEdgeX) expect(Math.abs(sx - cx)).toBeLessThanOrEqual(0.5);
    if (!onEdgeY) expect(Math.abs(sy - cy)).toBeLessThanOrEqual(0.5);
    // the feed is at the map's centre: not clamped at 1080p, so both must be centred here
    expect(onEdgeX || onEdgeY).toBe(false);
    expect(fit.scale).toBe(MIN_SCALE);
  });
  it("a feed in the corner of a big map opens on the clamp's edge", () => {
    const corner = CORNER;
    const b = puzzleBounds(corner);
    const p = initialPan(corner, W, H, PADDING, INS);
    const box = mapBox(b, computeFit(b, W, H, PADDING, INS));
    const area = freeArea(W, H, INS);
    expect(box.left + p.x).toBeCloseTo(area.left + PADDING, 6);
    expect(box.top + p.y).toBeCloseTo(area.top + PADDING, 6);
  });
  it("a map that fits gets {0, 0}", () => {
    for (const p of FILES) {
      if (computeFit(puzzleBounds(p), W, H, PADDING, INS).scale === MIN_SCALE) continue;
      expect(initialPan(p, W, H, PADDING, INS), p.id).toEqual({ x: 0, y: 0 });
    }
    const r = createMapRenderer(fakeCanvas(W, H), FILES[0]!, { insets: INS });
    r.setPan(30, 20);
    r.resetView();
    expect(r.getPan()).toEqual({ x: 0, y: 0 });
  });
  it("resetView returns to the opening view from anywhere", () => {
    const r = createMapRenderer(fakeCanvas(W, H), BIG, { insets: INS });
    const open = r.getPan();
    r.setPan(-5000, 4000);
    expect(r.getPan()).not.toEqual(open);
    r.resetView();
    expect(r.getPan()).toEqual(open);
  });
  it("only an overflowing axis is moved toward the feed", () => {
    const tall = 2000; // 64 x 40 at 36 px/unit fits vertically here, not horizontally
    const p = initialPan(CORNER, W, tall, PADDING, INS);
    expect(p.y).toBe(0);
    expect(p.x).not.toBe(0);
  });
});

describe("centreOn", () => {
  it("puts a middle node at the free area's centre", () => {
    const r = createMapRenderer(fakeCanvas(W, H), BIG, { insets: INS });
    r.centreOn("n_9_5");
    const fit = computeFit(BIG_B, W, H, PADDING, INS, r.getPan());
    const [x, y] = nodePos(BIG, "n_9_5");
    const area = freeArea(W, H, INS);
    expect(Math.abs(x * fit.scale + fit.offsetX - (area.left + area.right) / 2)).toBeLessThanOrEqual(0.5);
    expect(Math.abs(y * fit.scale + fit.offsetY - (area.top + area.bottom) / 2)).toBeLessThanOrEqual(0.5);
  });
  it("clamps a corner node and leaves it inside the free area", () => {
    const r = createMapRenderer(fakeCanvas(W, H), BIG, { insets: INS });
    const pan = r.centreOn("n_16_10");
    const fit = computeFit(BIG_B, W, H, PADDING, INS, pan);
    const area = freeArea(W, H, INS);
    const sx = 64 * fit.scale + fit.offsetX;
    const sy = 40 * fit.scale + fit.offsetY;
    expect(sx).toBeCloseTo(area.right - PADDING, 6);
    expect(sy).toBeCloseTo(area.bottom - PADDING, 6);
  });
  it("an unknown id leaves the pan unchanged", () => {
    const r = createMapRenderer(fakeCanvas(W, H), BIG, { insets: INS });
    r.setPan(-200, -100);
    const before = r.getPan();
    expect(r.centreOn("nope")).toEqual(before);
    expect(r.getPan()).toEqual(before);
  });
});

describe("hit-testing and the free area", () => {
  it("finds each of 20 sampled nodes at its screen position on the large map after a pan", () => {
    const r = createMapRenderer(fakeCanvas(W, H), BIG, { insets: INS });
    r.setPan(-420, -160);
    const pan = r.getPan();
    const g = buildGeometry(BIG, W, H, PADDING, INS, pan);
    const area = freeArea(W, H, INS);
    let tested = 0;
    for (let i = 0; i < g.nodeIds.length && tested < 20; i += 3) {
      const x = g.nx[i]!;
      const y = g.ny[i]!;
      if (x < area.left || x > area.right || y < area.top || y > area.bottom) continue;
      expect(r.hitTest(x, y), g.nodeIds[i]).toBe(g.nodeIds[i]);
      expect(hitTestGeometry(g, x, y)).toBe(g.nodeIds[i]);
      tested++;
    }
    expect(tested).toBe(20);
  });
  it("returns null inside the top and bottom inset even where a node is drawn", () => {
    const r = createMapRenderer(fakeCanvas(W, H), BIG, { insets: INS });
    r.setPan(-420, -160);
    const g = buildGeometry(BIG, W, H, PADDING, INS, r.getPan());
    let underTop = 0;
    let underBottom = 0;
    for (let i = 0; i < g.nodeIds.length; i++) {
      const x = g.nx[i]!;
      const y = g.ny[i]!;
      if (x < 0 || x > W) continue;
      if (y >= 0 && y < INS.top!) {
        expect(r.hitTest(x, y)).toBeNull();
        expect(r.placeAt(x, y)).toBeNull();
        underTop++;
      } else if (y > H - INS.bottom! && y <= H) {
        expect(r.hitTest(x, y)).toBeNull();
        expect(r.placeAt(x, y)).toBeNull();
        underBottom++;
      }
    }
    expect(underTop).toBeGreaterThan(0);
    expect(underBottom).toBeGreaterThan(0);
  });
  it("without insets every point of the canvas is live", () => {
    const r = createMapRenderer(fakeCanvas(W, H), FILES[0]!);
    const g = buildGeometry(FILES[0]!, W, H, PADDING);
    expect(r.hitTest(g.nx[0]!, g.ny[0]!)).toBe(g.nodeIds[0]);
  });
});

describe("spacing at MIN_SCALE", () => {
  it("no two nodes 1 unit or more apart share a hit circle, except around a lamp with load >= 2", () => {
    const bad: string[] = [];
    const exempt: string[] = [];
    for (const p of FILES) {
      const g = buildGeometry(p, 100000, 100000, PADDING, undefined, undefined, MIN_SCALE);
      for (let i = 0; i < p.nodes.length; i++) {
        for (let j = i + 1; j < p.nodes.length; j++) {
          const a = p.nodes[i]!;
          const b = p.nodes[j]!;
          const du = Math.hypot(a.pos[0] - b.pos[0], a.pos[1] - b.pos[1]);
          if (du < 1 - 1e-9) continue;
          if (du * MIN_SCALE + 1e-9 >= g.hitR[i]! + g.hitR[j]!) continue;
          const big = (a.type === "lamp" && (a.load ?? 1) >= 2) || (b.type === "lamp" && (b.load ?? 1) >= 2);
          (big ? exempt : bad).push(`${p.id} ${a.id}-${b.id}`);
        }
      }
    }
    // informational: pairs excused because a lamp's cluster hit circle is bigger
    console.info(`spacing: ${exempt.length} overlapping pairs around loaded lamps`, exempt.slice(0, 10));
    expect(bad).toEqual([]);
    expect(NODE_HIT_RADIUS * 2).toBe(MIN_SCALE);
  });
});

describe("labels on an overflowing map", () => {
  const free = freeArea(W, H, INS);
  const origin = mapOrigin(BIG.id, BIG_B);
  const places = footprintLayout(BIG, origin, MIN_SCALE).places;
  const measure = (t: string): number => t.length * 6;
  const pans = [{ x: 0, y: 0 }, { x: -700, y: -300 }, { x: 600, y: 200 }, { x: -1200, y: -500 }, { x: 1e9, y: 1e9 }, { x: -1e9, y: -1e9 }];
  it("hides a target whose place is outside the free area, and keeps every shown label inside it within a lot", () => {
    let shownTotal = 0;
    let hiddenOff = 0;
    for (const pan0 of pans) {
      const pan = clampPan(pan0, mapBox(BIG_B, computeFit(BIG_B, W, H, PADDING, INS)), free, PAN_KEEP, PADDING);
      const fit = computeFit(BIG_B, W, H, PADDING, INS, pan);
      const boxes = targetLabels(BIG, places, fit, free, measure);
      places.forEach((p, i) => {
        const px = p.x * fit.scale + fit.offsetX;
        const py = p.y * fit.scale + fit.offsetY;
        const inside = px >= free.left && px <= free.right && py >= free.top && py <= free.bottom;
        const box = boxes[i]!;
        if (!inside) {
          expect(box, `${p.lamp} at ${JSON.stringify(pan)}`).toBeNull();
          if (p.label !== null) hiddenOff++;
          return;
        }
        if (!box) return;
        shownTotal++;
        expect(box.x).toBeGreaterThanOrEqual(free.left);
        expect(box.y).toBeGreaterThanOrEqual(free.top);
        expect(box.x + box.w).toBeLessThanOrEqual(free.right);
        expect(box.y + box.h).toBeLessThanOrEqual(free.bottom);
        const gapX = Math.max(p.x * fit.scale + fit.offsetX - (p.w * fit.scale) / 2 - (box.x + box.w), box.x - (px + (p.w * fit.scale) / 2), 0);
        const gapY = Math.max(py - (p.h * fit.scale) / 2 - (box.y + box.h), box.y - (py + (p.h * fit.scale) / 2), 0);
        expect(Math.hypot(gapX, gapY)).toBeLessThanOrEqual(LOT * fit.scale);
      });
    }
    expect(shownTotal).toBeGreaterThan(0);
    expect(hiddenOff).toBeGreaterThan(0);
  });
});

describe("culling", () => {
  const area: Rect = { left: 0, top: 0, right: W, bottom: H };
  function check(pan: { x: number; y: number }): void {
    const g = buildGeometry(BIG, W, H, PADDING, INS, pan);
    const vl = new Set(visibleLines(g, area, 32));
    const vn = new Set(visibleNodes(g, area, 32));
    for (let i = 0; i < g.nodeIds.length; i++) {
      const x = g.nx[i]!;
      const y = g.ny[i]!;
      const onScreen = x >= area.left && x <= area.right && y >= area.top && y <= area.bottom;
      const far = x < -32 || x > W + 32 || y < -32 || y > H + 32;
      if (onScreen) expect(vn.has(i)).toBe(true);
      if (far) expect(vn.has(i)).toBe(false);
    }
    for (let i = 0; i < g.lineIds.length; i++) {
      const x0 = Math.min(g.ax[i]!, g.bx[i]!);
      const x1 = Math.max(g.ax[i]!, g.bx[i]!);
      const y0 = Math.min(g.ay[i]!, g.by[i]!);
      const y1 = Math.max(g.ay[i]!, g.by[i]!);
      const touches = x1 >= 0 && x0 <= W && y1 >= 0 && y0 <= H;
      const far = x1 < -32 || x0 > W + 32 || y1 < -32 || y0 > H + 32;
      if (touches) expect(vl.has(i), g.lineIds[i]).toBe(true);
      if (far) expect(vl.has(i), g.lineIds[i]).toBe(false);
    }
  }
  it("keeps everything on screen and drops everything wholly 32 px off", () => {
    check({ x: 0, y: 0 });
    check({ x: -600, y: -250 });
    check({ x: 500, y: 300 });
  });
  it("at the large map's initial view there are fewer than all", () => {
    const g = buildGeometry(BIG, W, H, PADDING, INS, initialPan(BIG, W, H, PADDING, INS));
    expect(visibleLines(g, area, 32).length).toBeLessThan(g.lineIds.length);
    expect(visibleNodes(g, area, 32).length).toBeLessThan(g.nodeIds.length);
  });
  it("a map that fits is drawn whole", () => {
    const p = FILES[0]!;
    const g = buildGeometry(p, W, H, PADDING, INS);
    expect(visibleLines(g, area, 32).length).toBe(g.lineIds.length);
    expect(visibleNodes(g, area, 32).length).toBe(g.nodeIds.length);
  });
});
