import { describe, expect, it } from "vitest";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { loadPuzzle, type Puzzle } from "../core";
import type { GridState } from "../grid";
import {
  CAPTION_MIN_SCALE,
  MAX_SCALE,
  MAX_ZOOM_SCALE,
  MIN_SCALE,
  PADDING,
  PAN_KEEP,
  ZOOM_STEP,
  buildGeometry,
  captionFloor,
  captionsShown,
  clampPan,
  computeFit,
  fitScale,
  freeArea,
  hitTestGeometry,
  initialPan,
  mapBox,
  minZoomScale,
  openScale,
  puzzleBounds,
  visibleLines,
  visibleNodes,
  zoomAbout,
  zoomLevels,
  type Insets,
  type Pan,
  type Rect,
} from "./geometry";
import {
  WIRE_CLEAR_PX,
  circuitStreets,
  cityForMap,
  footprintLayout,
  layoutStats,
  mapOrigin,
  nodeClearPx,
  placeParts,
  pointBoxDistance,
  type Building,
  type Lane,
} from "./city";
import { createMapRenderer } from "./map-renderer";
import { offscreenMarkers } from "./markers";
import { fuseCaption, lampCaption } from "./labels";
import { lampMarks, targetLabels } from "./places";

// Ticket 027 A4: zoom levels, zoom about a point, the view methods, hit-testing, captions, the city and the overlays at every level.

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
const byPrefix = (p: string): Puzzle => FILES.find((q) => q.id.startsWith(p))!;

/** The same 64 x 40 unit comb as view.test.ts and ward.test.ts (a fresh object each call, so layout caches start empty). */
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
const BIG_B = puzzleBounds(BIG);
const W = 1920;
const H = 1080;
const INS: Insets = { top: 220, bottom: 140 };
const FREE = freeArea(W, H, INS);
const BIG_MIN = minZoomScale(BIG_B, W, H, PADDING, INS);
const BIG_LEVELS = zoomLevels(BIG_MIN, openScale(fitScale(BIG_B, W, H, PADDING, INS)), MAX_ZOOM_SCALE);

/** A canvas stand-in. Records every string drawn with fillText or strokeText. */
function fakeCanvas(w: number, h: number, drawn?: string[]): HTMLCanvasElement {
  const store: Record<string, unknown> = {};
  const noop = (): void => {};
  const ctx = new Proxy(store, {
    get: (t, p: string) => {
      if (p === "measureText") return (s: string) => ({ width: s.length * 6 });
      if (drawn && (p === "fillText" || p === "strokeText")) return (s: string) => void drawn.push(s);
      return p in t ? t[p] : noop;
    },
    set: (t, p: string, v) => {
      t[p] = v;
      return true;
    },
  });
  return { clientWidth: w, clientHeight: h, width: w, height: h, getContext: () => ctx } as unknown as HTMLCanvasElement;
}

function emptyState(): GridState {
  return {
    wouldBlow: new Map(),
    feeds: new Map(),
    feedOf: new Map(),
    powered: new Set(),
    flowFrom: new Map(),
    lit: new Set(),
    readableFaults: new Set(),
    sparking: new Set(),
    fuseLoad: new Map(),
    faults: [],
    breakers: new Map(),
    switches: new Map(),
    batteries: new Map(),
    parts: [],
    targets: [],
    load: 0,
    capacity: 10,
    brownout: false,
    complete: false,
    actions: 0,
  };
}

/** Zoom a renderer down to its lowest level, then call `each` at every level on the way back up (the last call is the top). */
function everyLevel(r: ReturnType<typeof createMapRenderer>, each: (scale: number) => void): void {
  r.fitWhole();
  each(r.getScale());
  for (let guard = 0; guard < 100; guard++) {
    const before = r.getScale();
    if (r.zoomStep(1) === before) break;
    each(r.getScale());
  }
}

describe("zoomLevels", () => {
  const cases: [number, number, number][] = [
    [BIG_MIN, MIN_SCALE, MAX_ZOOM_SCALE],
    [20, 36, 96],
    [36, 36, 96],
    [30, 30, 96],
    [10, 80, 96],
    [14.8, 36.0001, 96],
    [36, 72, 96],
    [5, 36, 96],
  ];
  it("is sorted, has no duplicates, holds min, open and max, and steps by at most ZOOM_STEP", () => {
    for (const [min, open, max] of cases) {
      const lv = zoomLevels(min, open, max);
      const name = `${min}/${open}/${max}`;
      for (let i = 1; i < lv.length; i++) {
        expect(lv[i]!, name).toBeGreaterThan(lv[i - 1]!);
        expect(lv[i]! / lv[i - 1]!, name).toBeLessThanOrEqual(ZOOM_STEP + 1e-9);
      }
      expect(lv, name).toContain(min);
      expect(lv, name).toContain(open);
      expect(lv, name).toContain(max);
      expect(new Set(lv).size, name).toBe(lv.length);
    }
  });
  it("keeps the lattice open x ZOOM_STEP^k", () => {
    const lv = zoomLevels(10, 36, 96);
    expect(lv.some((x) => Math.abs(x / (36 * ZOOM_STEP) - 1) < 1e-9)).toBe(true);
    expect(lv.some((x) => Math.abs(x / (36 / ZOOM_STEP) - 1) < 1e-9)).toBe(true);
    expect(lv.some((s) => Math.abs(s / 36 - 2) < 1e-9)).toBe(true);
  });
  it("has no level below open when min === open", () => {
    for (const lv of [zoomLevels(36, 36, 96), zoomLevels(50, 50, 96)]) {
      expect(Math.min(...lv)).toBe(lv.includes(36) && lv[0] === 36 ? 36 : 50);
    }
    expect(zoomLevels(36, 36, 96)[0]).toBe(36);
  });
  it("drops a lattice level that sits on min or max rather than listing it twice", () => {
    const lv = zoomLevels(36 / ZOOM_STEP, 36, 36 * ZOOM_STEP);
    expect(lv).toHaveLength(3);
  });
});

describe("zoom range", () => {
  it("on the 64 x 40 map minZoomScale is below MIN_SCALE and the whole map sits centred in the free area", { timeout: 60000 }, () => {
    expect(BIG_MIN).toBeLessThan(MIN_SCALE);
    const r = createMapRenderer(fakeCanvas(W, H), BIG, { insets: INS });
    r.fitWhole();
    expect(r.getScale()).toBe(BIG_MIN);
    const box = mapBox(BIG_B, computeFit(BIG_B, W, H, PADDING, INS, r.getPan(), r.getScale()));
    expect(box.left).toBeGreaterThanOrEqual(FREE.left + PADDING - 0.5);
    expect(box.right).toBeLessThanOrEqual(FREE.right - PADDING + 0.5);
    expect(box.top).toBeGreaterThanOrEqual(FREE.top + PADDING - 0.5);
    expect(box.bottom).toBeLessThanOrEqual(FREE.bottom - PADDING + 0.5);
    expect(Math.abs((box.left + box.right) / 2 - (FREE.left + FREE.right) / 2)).toBeLessThanOrEqual(0.5);
    expect(Math.abs((box.top + box.bottom) / 2 - (FREE.top + FREE.bottom) / 2)).toBeLessThanOrEqual(0.5);
  });
  it("on 09-shrine-circuit minZoomScale equals openScale", () => {
    const b = puzzleBounds(byPrefix("09"));
    expect(minZoomScale(b, W, H, PADDING, INS)).toBe(openScale(fitScale(b, W, H, PADDING, INS)));
  });
  it("on every file at 1920 x 1080 minZoomScale equals openScale (they all fit)", () => {
    for (const p of FILES) {
      const b = puzzleBounds(p);
      expect(minZoomScale(b, W, H, PADDING, INS), p.id).toBe(openScale(fitScale(b, W, H, PADDING, INS)));
    }
  });
  it("no level exceeds MAX_ZOOM_SCALE, and the top level is MAX_ZOOM_SCALE", { timeout: 60000 }, () => {
    expect(MAX_ZOOM_SCALE).toBeGreaterThan(MAX_SCALE);
    expect(Math.max(...BIG_LEVELS)).toBe(MAX_ZOOM_SCALE);
    const r = createMapRenderer(fakeCanvas(W, H), BIG, { insets: INS });
    let top = 0;
    everyLevel(r, (s) => {
      expect(s).toBeLessThanOrEqual(MAX_ZOOM_SCALE);
      top = s;
    });
    expect(top).toBe(MAX_ZOOM_SCALE);
  });
  it("the renderer visits exactly the levels zoomLevels lists", { timeout: 60000 }, () => {
    const r = createMapRenderer(fakeCanvas(W, H), BIG, { insets: INS });
    const seen: number[] = [];
    everyLevel(r, (s) => seen.push(s));
    expect(seen).toEqual(BIG_LEVELS);
  });
});

describe("zoomAbout", () => {
  const pts: [number, number][] = [];
  for (let i = 0; i < 10; i++) pts.push([FREE.left + 60 + ((i * 397) % (FREE.right - FREE.left - 120)), FREE.top + 40 + ((i * 211) % (FREE.bottom - FREE.top - 80))]);
  const startPans: Pan[] = [{ x: 0, y: 0 }, { x: -300, y: -100 }, { x: 250, y: 120 }];

  it("keeps the map point under the canvas point, or equals the clamp of the unclamped pan", () => {
    let kept = 0;
    let clamped = 0;
    for (let k = 0; k + 1 < BIG_LEVELS.length; k++) {
      for (const [a, b] of [[BIG_LEVELS[k]!, BIG_LEVELS[k + 1]!], [BIG_LEVELS[k + 1]!, BIG_LEVELS[k]!]] as const) {
        for (const sp of startPans) {
          const pan0 = clampPan(sp, mapBox(BIG_B, computeFit(BIG_B, W, H, PADDING, INS, undefined, a)), FREE, PAN_KEEP, PADDING);
          for (const [px, py] of pts) {
            const fa = computeFit(BIG_B, W, H, PADDING, INS, pan0, a);
            const mx = (px - fa.offsetX) / a;
            const my = (py - fa.offsetY) / a;
            const f0 = computeFit(BIG_B, W, H, PADDING, INS, undefined, b);
            const want = { x: px - (mx * b + f0.offsetX), y: py - (my * b + f0.offsetY) };
            const clampedWant = clampPan(want, mapBox(BIG_B, f0), FREE, PAN_KEEP, PADDING);
            const got = zoomAbout(BIG_B, W, H, PADDING, INS, pan0, a, px, py, b);
            expect(got.x).toBeCloseTo(clampedWant.x, 6);
            expect(got.y).toBeCloseTo(clampedWant.y, 6);
            if (Math.abs(want.x - clampedWant.x) < 1e-9 && Math.abs(want.y - clampedWant.y) < 1e-9) {
              const fb = computeFit(BIG_B, W, H, PADDING, INS, got, b);
              expect(Math.abs(mx * b + fb.offsetX - px)).toBeLessThanOrEqual(0.5);
              expect(Math.abs(my * b + fb.offsetY - py)).toBeLessThanOrEqual(0.5);
              kept++;
            } else clamped++;
          }
        }
      }
    }
    expect(kept).toBeGreaterThan(100);
    expect(clamped).toBeGreaterThan(0);
  });

  it("zooming in a level and out again about the same point returns the same pan", () => {
    let tested = 0;
    for (let k = 0; k + 1 < BIG_LEVELS.length; k++) {
      const a = BIG_LEVELS[k]!;
      const b = BIG_LEVELS[k + 1]!;
      for (const sp of startPans) {
        const pan0 = clampPan(sp, mapBox(BIG_B, computeFit(BIG_B, W, H, PADDING, INS, undefined, a)), FREE, PAN_KEEP, PADDING);
        for (const [px, py] of pts) {
          const fa = computeFit(BIG_B, W, H, PADDING, INS, pan0, a);
          const mx = (px - fa.offsetX) / a;
          const my = (py - fa.offsetY) / a;
          const f0 = computeFit(BIG_B, W, H, PADDING, INS, undefined, b);
          const want = { x: px - (mx * b + f0.offsetX), y: py - (my * b + f0.offsetY) };
          const inPan = zoomAbout(BIG_B, W, H, PADDING, INS, pan0, a, px, py, b);
          if (Math.abs(inPan.x - want.x) > 1e-9 || Math.abs(inPan.y - want.y) > 1e-9) continue; // the clamp moved it: no promise
          const back = zoomAbout(BIG_B, W, H, PADDING, INS, inPan, b, px, py, a);
          expect(Math.abs(back.x - pan0.x)).toBeLessThanOrEqual(0.5);
          expect(Math.abs(back.y - pan0.y)).toBeLessThanOrEqual(0.5);
          tested++;
        }
      }
    }
    expect(tested).toBeGreaterThan(50);
  });
});

describe("view methods", () => {
  it("fitWhole gives minZoomScale with the map centred", { timeout: 60000 }, () => {
    const r = createMapRenderer(fakeCanvas(W, H), BIG, { insets: INS });
    r.setPan(-500, -200);
    r.fitWhole();
    expect(r.getScale()).toBe(BIG_MIN);
    expect(r.getPan()).toEqual({ x: 0, y: 0 });
  });
  it("resetView gives openScale and the initial pan, from any zoom", { timeout: 60000 }, () => {
    const r = createMapRenderer(fakeCanvas(W, H), BIG, { insets: INS });
    const open = r.getPan();
    for (const act of [() => r.fitWhole(), () => { r.zoomStep(1, 900, 500); r.zoomStep(1); r.zoomStep(1); r.setPan(-700, -250); }]) {
      act();
      r.resetView();
      expect(r.getScale()).toBe(MIN_SCALE);
      expect(r.getPan()).toEqual(open);
      expect(r.getPan()).toEqual(initialPan(BIG, W, H, PADDING, INS));
    }
  });
  it("zoomStep(+1) at the top level and zoomStep(-1) at the bottom change nothing", { timeout: 60000 }, () => {
    const r = createMapRenderer(fakeCanvas(W, H), BIG, { insets: INS });
    r.fitWhole();
    const pan = r.getPan();
    expect(r.zoomStep(-1)).toBe(BIG_MIN);
    expect(r.getScale()).toBe(BIG_MIN);
    expect(r.getPan()).toEqual(pan);
    for (let i = 0; i < 40; i++) r.zoomStep(1);
    expect(r.getScale()).toBe(MAX_ZOOM_SCALE);
    const top = r.getPan();
    expect(r.zoomStep(1, 700, 400)).toBe(MAX_ZOOM_SCALE);
    expect(r.getPan()).toEqual(top);
  });
  it("on a map that fits, zooming out does nothing at the opening view", () => {
    const p = byPrefix("09");
    const r = createMapRenderer(fakeCanvas(W, H), p, { insets: INS });
    const s = r.getScale();
    expect(r.zoomStep(-1)).toBe(s);
    expect(r.getPan()).toEqual({ x: 0, y: 0 });
    r.fitWhole();
    expect(r.getScale()).toBe(s);
    expect(r.zoomStep(1)).toBeGreaterThan(s);
  });
  it("zoomStep moves exactly one level and keeps the point under the pointer", () => {
    const r = createMapRenderer(fakeCanvas(W, H), BIG, { insets: INS });
    r.setPan(-420, -160);
    const [px, py] = [800, 500];
    const g0 = buildGeometry(BIG, W, H, PADDING, INS, r.getPan(), r.getScale());
    const mx = (px - g0.fit.offsetX) / g0.fit.scale;
    const my = (py - g0.fit.offsetY) / g0.fit.scale;
    const s = r.zoomStep(1, px, py);
    expect(s).toBe(BIG_LEVELS[BIG_LEVELS.indexOf(MIN_SCALE) + 1]);
    const g1 = buildGeometry(BIG, W, H, PADDING, INS, r.getPan(), r.getScale());
    expect(Math.abs(mx * g1.fit.scale + g1.fit.offsetX - px)).toBeLessThanOrEqual(0.5);
    expect(Math.abs(my * g1.fit.scale + g1.fit.offsetY - py)).toBeLessThanOrEqual(0.5);
  });
  it("centreOn and a refit (setInsets) use the zoomed scale, not the opening one", () => {
    const r = createMapRenderer(fakeCanvas(W, H), BIG, { insets: INS });
    for (let i = 0; i < 3; i++) r.zoomStep(1);
    const s = r.getScale();
    expect(s).toBeGreaterThan(MIN_SCALE);
    r.centreOn("n_9_5");
    expect(r.getScale()).toBe(s);
    const f = computeFit(BIG_B, W, H, PADDING, INS, r.getPan(), s);
    expect(Math.abs(9 * 4 * s + f.offsetX - (FREE.left + FREE.right) / 2)).toBeLessThanOrEqual(0.5);
    expect(Math.abs(5 * 4 * s + f.offsetY - (FREE.top + FREE.bottom) / 2)).toBeLessThanOrEqual(0.5);
    r.setInsets({ top: 220, bottom: 141 });
    expect(r.getScale()).toBe(s);
    r.resize();
    expect(r.getScale()).toBe(s);
  });
  it("a zoom stays inside the edge-stop clamp at every level", { timeout: 60000 }, () => {
    const r = createMapRenderer(fakeCanvas(W, H), BIG, { insets: INS });
    everyLevel(r, (s) => {
      for (const [x, y] of [[1e9, 1e9], [-1e9, -1e9]] as const) {
        const pan = r.setPan(x, y);
        const box = mapBox(BIG_B, computeFit(BIG_B, W, H, PADDING, INS, undefined, s));
        expect(pan).toEqual(clampPan(pan, box, FREE, PAN_KEEP, PADDING));
      }
    });
  });
});

describe("hit-testing at every level", () => {
  it("on the 64 x 40 map returns the node itself (or one no farther) at each sampled node, at every level; exactly it from the opening scale up", { timeout: 60000 }, () => {
    const r = createMapRenderer(fakeCanvas(W, H), BIG, { insets: INS });
    r.fitWhole();
    let levelsSeen = 0;
    everyLevel(r, (s) => {
      levelsSeen++;
      r.setPan(-300 * (levelsSeen % 3), -120 * (levelsSeen % 2));
      const g = buildGeometry(BIG, W, H, PADDING, INS, r.getPan(), s);
      let tested = 0;
      for (let i = 0; i < g.nodeIds.length; i += 2) {
        const x = g.nx[i]!;
        const y = g.ny[i]!;
        if (x < FREE.left || x > FREE.right || y < FREE.top || y > FREE.bottom) continue;
        const id = r.hitTest(x, y);
        expect(id, `${g.nodeIds[i]} @${s}`).not.toBeNull();
        const j = g.nodeIndex.get(id!);
        if (j === undefined) throw new Error(`${id} is not a node at ${s}`);
        expect(Math.hypot(g.nx[j]! - x, g.ny[j]! - y), `${g.nodeIds[i]} @${s}`).toBeLessThanOrEqual(0 + 1e-9);
        if (s >= MIN_SCALE) expect(id).toBe(g.nodeIds[i]);
        tested++;
      }
      expect(tested, `@${s}`).toBeGreaterThanOrEqual(3);
    });
    expect(levelsSeen).toBe(BIG_LEVELS.length);
  });
  it("points in the insets return null at every level, for hitTest and placeAt", { timeout: 60000 }, () => {
    const r = createMapRenderer(fakeCanvas(W, H), BIG, { insets: INS });
    everyLevel(r, () => {
      const g = buildGeometry(BIG, W, H, PADDING, INS, r.getPan(), r.getScale());
      for (const [x, y] of [[960, 100], [300, 20], [1500, 215], [960, H - 50], [200, H - 5], [900, H - 135]] as const) {
        expect(r.hitTest(x, y)).toBeNull();
        expect(r.placeAt(x, y)).toBeNull();
      }
      // and a node drawn under the top inset is still unreachable
      for (let i = 0; i < g.nodeIds.length; i++) {
        const x = g.nx[i]!;
        const y = g.ny[i]!;
        if (x >= 0 && x <= W && y >= 0 && y < INS.top!) expect(r.hitTest(x, y)).toBeNull();
      }
    });
  });
  it("where hit circles overlap the nearest centre wins (two nodes 0.3 units apart)", () => {
    const p = loadPuzzle({
      id: "42-overlap",
      name: "Overlap",
      version: 4,
      scope: "map",
      capacity: 2,
      startingParts: [],
      target: ["lamp"],
      nodes: [
        { id: "feed", type: "feed", pos: [0, 0] },
        { id: "lamp", type: "lamp", pos: [0.3, 0], load: 1 },
      ],
      lines: [{ id: "l", from: "feed", to: "lamp" }],
      faults: [],
    });
    const g = buildGeometry(p, 100000, 100000, PADDING, undefined, undefined, 36);
    const [fx, lx, y] = [g.nx[0]!, g.nx[1]!, g.ny[0]!];
    expect(lx - fx).toBeCloseTo(10.8, 6);
    expect(hitTestGeometry(g, fx + 2, y)).toBe("feed");
    expect(hitTestGeometry(g, fx + 9, y)).toBe("lamp");
    expect(hitTestGeometry(g, lx - 2, y)).toBe("lamp");
    expect(hitTestGeometry(g, fx - 3, y)).toBe("feed");
  });
  it("in the overview of 56 a point beside a node always resolves to the nearest node whose circle holds it", () => {
    const p = byPrefix("56");
    const g = buildGeometry(p, W, H, PADDING, INS, undefined, 6);
    let overlapping = 0;
    for (let i = 0; i < g.nodeIds.length; i++) {
      const x = g.nx[i]! + 5;
      const y = g.ny[i]! + 3;
      let best = Infinity;
      let inside = 0;
      for (let j = 0; j < g.nodeIds.length; j++) {
        const d = Math.hypot(x - g.nx[j]!, y - g.ny[j]!);
        if (d <= g.hitR[j]!) {
          inside++;
          if (d < best) best = d;
        }
      }
      const id = hitTestGeometry(g, x, y);
      const j = g.nodeIndex.get(id!);
      expect(j).toBeDefined();
      expect(Math.hypot(x - g.nx[j!]!, y - g.ny[j!]!)).toBeCloseTo(best, 9);
      if (inside > 1) overlapping++;
    }
    expect(overlapping).toBeGreaterThan(0);
  });
});

describe("captions", () => {
  it("captionsShown flips at CAPTION_MIN_SCALE", () => {
    expect(CAPTION_MIN_SCALE).toBe(27);
    expect(captionsShown(CAPTION_MIN_SCALE - 1e-9)).toBe(false);
    expect(captionsShown(CAPTION_MIN_SCALE)).toBe(true);
    expect(captionsShown(MAX_ZOOM_SCALE)).toBe(true);
  });
  it("lampMarks emits no Lv caption box below the threshold (the star stays) and the same boxes as before at or above it", () => {
    const lamp = BIG.nodes.find((n) => n.type === "lamp")!;
    expect(lampMarks(lamp, 100, 100, CAPTION_MIN_SCALE - 0.01)).toHaveLength(1);
    expect(lampMarks(lamp, 100, 100, CAPTION_MIN_SCALE - 0.01)).toEqual([lampMarks(lamp, 100, 100)[1]]);
    expect(lampMarks(lamp, 100, 100, CAPTION_MIN_SCALE)).toEqual(lampMarks(lamp, 100, 100));
    expect(lampMarks(lamp, 100, 100, 60)).toHaveLength(2);
  });
  it("targetLabels emits no place label below the threshold, and some at it", { timeout: 60000 }, () => {
    const origin = mapOrigin(BIG.id, BIG_B);
    const measure = (t: string): number => t.length * 6;
    for (const s of [BIG_MIN, 15, 20, 26.9]) {
      const places = footprintLayout(BIG, origin, s).places;
      const fit = computeFit(BIG_B, W, H, PADDING, INS, { x: 0, y: 0 }, s);
      expect(targetLabels(BIG, places, fit, FREE, measure).every((b) => b === null), `@${s}`).toBe(true);
    }
    const s = CAPTION_MIN_SCALE;
    const places = footprintLayout(BIG, origin, s).places;
    const fit = computeFit(BIG_B, W, H, PADDING, INS, { x: 0, y: 540 }, s); // the top row of lamps (the targets) centred
    const shown = targetLabels(BIG, places, fit, FREE, measure).filter((b) => b !== null);
    expect(shown.length).toBeGreaterThan(0);
  });
  it("the renderer draws no Lv caption and no place label in the overview, and both at the opening view", { timeout: 60000 }, () => {
    const drawn: string[] = [];
    const p = byPrefix("56");
    const r = createMapRenderer(fakeCanvas(W, H, drawn), p, { insets: INS });
    const state = emptyState();
    const caption = lampCaption(1);
    const placeNames = new Set(footprintLayout(p, mapOrigin(p.id, puzzleBounds(p)), r.getScale()).places.map((q) => q.label).filter((l): l is string => l !== null));
    expect(placeNames.size).toBeGreaterThan(0);
    r.draw(state, {}, 0);
    expect(drawn.some((s) => s === caption)).toBe(true);
    expect(drawn.some((s) => placeNames.has(s))).toBe(true);

    drawn.length = 0;
    const big = createMapRenderer(fakeCanvas(W, H, drawn), BIG, { insets: INS });
    big.centreOn("n_8_0");
    big.draw(state, {}, 0);
    expect(drawn.filter((s) => s === caption).length).toBeGreaterThan(0);
    drawn.length = 0;
    big.fitWhole();
    expect(big.getScale()).toBeLessThan(CAPTION_MIN_SCALE);
    big.draw(state, {}, 0);
    expect(drawn.filter((s) => s === caption)).toEqual([]);
    const bigNames = new Set(footprintLayout(BIG, mapOrigin(BIG.id, BIG_B), big.getScale()).places.map((q) => q.label).filter((l): l is string => l !== null));
    expect(drawn.filter((s) => bigNames.has(s))).toEqual([]);
    // zoom back above the threshold: both return
    for (let i = 0; i < 10; i++) big.zoomStep(1);
    big.centreOn("n_8_0");
    drawn.length = 0;
    big.draw(state, {}, 1);
    expect(drawn.filter((s) => s === caption).length).toBeGreaterThan(0);
  });
  it("captionFloor never exceeds the opening scale, and captionsShown honours it", () => {
    expect(captionFloor(36)).toBe(CAPTION_MIN_SCALE);
    expect(captionFloor(25)).toBe(25);
    expect(captionsShown(25, 25)).toBe(true);
    expect(captionsShown(24.9, 25)).toBe(false);
    expect(captionsShown(26, captionFloor(25))).toBe(true);
  });
  it("every file in puzzles/ draws its Lv captions and fuse ratings right after resetView()", { timeout: 300000 }, () => {
    const caption = lampCaption(1);
    for (const [w, h] of [[1920, 1080], [1920, 950], [1366, 768]] as const) {
      for (const p of FILES) {
        const drawn: string[] = [];
        const r = createMapRenderer(fakeCanvas(w, h, drawn), p, { insets: INS });
        r.zoomStep(-1);
        r.resetView();
        r.draw(emptyState(), {}, 0);
        const lamps = p.nodes.filter((n) => n.type === "lamp");
        if (lamps.length > 0) expect(drawn.some((s) => s.startsWith("Lv") || s === caption), `${p.id} @${w}x${h} (scale ${r.getScale().toFixed(1)}) lamp caption`).toBe(true);
        const ratings = p.nodes.filter((n) => n.type === "fusebox").map((n) => fuseCaption(n.rating)).filter((t) => t !== "");
        if (ratings.length > 0) expect(drawn.some((t) => ratings.includes(t)), `${p.id} @${w}x${h} fuse rating`).toBe(true);
      }
    }
  });
  it("fuse ratings and feed captions are also hidden below the threshold", () => {
    const fuseMap = FILES.find((q) => q.nodes.some((n) => n.type === "fusebox") && q.nodes.filter((n) => n.type === "feed").length === 1)!;
    const drawn: string[] = [];
    const r = createMapRenderer(fakeCanvas(W, H, drawn), fuseMap, { insets: INS });
    r.draw(emptyState(), {}, 0);
    const ratings = fuseMap.nodes.filter((n) => n.type === "fusebox").map((n) => fuseCaption(n.rating)).filter((t) => t !== "");
    expect(ratings.length).toBeGreaterThan(0);
    expect(drawn.some((t) => ratings.includes(t))).toBe(true);
    expect(drawn.some((t) => t.length > 8)).toBe(true); // the feed's readout
    // the same map in a tiny window overflows at MIN_SCALE, and zooming out to the whole map goes below 27 px
    const drawn2: string[] = [];
    const small = createMapRenderer(fakeCanvas(300, 300, drawn2), fuseMap, { insets: {} });
    small.fitWhole();
    expect(small.getScale()).toBeLessThan(CAPTION_MIN_SCALE);
    small.draw(emptyState(), {}, 0);
    // only the target star and the breaker's ON/OFF are left: no rating, no feed readout, no Lv caption
    expect(drawn2.filter((t) => t !== "★" && t !== "ON" && t !== "OFF")).toEqual([]);
  });
});

describe("the city at every level", () => {
  const maps = [BIG, byPrefix("56")];
  function samples(l: Lane, scale: number): [number, number][] {
    const len = Math.hypot(l.bx - l.ax, l.by - l.ay) * scale;
    const n = Math.max(Math.ceil(len / 2), 1);
    const out: [number, number][] = [];
    for (let i = 0; i <= n; i++) out.push([l.ax + ((l.bx - l.ax) * i) / n, l.ay + ((l.by - l.ay) * i) / n]);
    return out;
  }
  it("keeps every building and place clear of every wire and node at minZoomScale, openScale and MAX_ZOOM_SCALE", { timeout: 300000 }, () => {
    for (const p of maps) {
      const b = puzzleBounds(p);
      const levels = [minZoomScale(b, W, H, PADDING, INS), openScale(fitScale(b, W, H, PADDING, INS)), MAX_ZOOM_SCALE];
      for (const scale of levels) {
        const o = mapOrigin(p.id, b);
        const lay = footprintLayout(p, o, scale);
        const f = circuitStreets(p).footprint;
        const blds = cityForMap(p, o, { minX: f.minX - 1, maxX: f.maxX + 1, minY: f.minY - 1, maxY: f.maxY + 1 }, scale);
        expect(lay.buildings.length, `${p.id} @${scale}`).toBeGreaterThan(0);
        const boxes: { b: Building; what: string }[] = blds.map((q) => ({ b: q, what: "building" }));
        for (const pl of lay.places) if (!pl.pool) for (const q of placeParts(pl)) boxes.push({ b: q, what: `place ${pl.lamp}` });
        const wc = WIRE_CLEAR_PX / scale;
        for (const l of lay.streets) {
          for (const [sx, sy] of samples(l, scale)) {
            for (const { b: q, what } of boxes) {
              if (Math.abs(q.x - sx) > q.w / 2 + wc + 0.01 || Math.abs(q.y - sy) > q.h / 2 + wc + 0.01) continue;
              if (pointBoxDistance(sx, sy, q) * scale < WIRE_CLEAR_PX - 1e-6) throw new Error(`${p.id} @${scale}: ${what} within ${(pointBoxDistance(sx, sy, q) * scale).toFixed(2)}px of a wire`);
            }
          }
        }
        for (const n of p.nodes) {
          const r = nodeClearPx(n) / scale;
          for (const { b: q, what } of boxes) {
            if (pointBoxDistance(n.pos[0], n.pos[1], q) < r - 1e-9) throw new Error(`${p.id} @${scale}: ${what} within ${nodeClearPx(n)}px of node ${n.id}`);
          }
        }
      }
    }
  });
  it("builds the footprint layout once per level visited, serves a revisit from the cache and evicts the oldest on a fifth level", { timeout: 60000 }, () => {
    const p = synthetic(); // a fresh object: nothing cached yet
    const r = createMapRenderer(fakeCanvas(W, H), p, { insets: INS });
    expect(BIG_LEVELS.indexOf(MIN_SCALE)).toBeGreaterThanOrEqual(4);
    const b0 = layoutStats.builds;
    for (let i = 0; i < 3; i++) r.zoomStep(-1); // three new levels (the opening one is cached already): four held
    expect(layoutStats.builds - b0).toBe(3);
    for (let i = 0; i < 3; i++) r.zoomStep(1); // back up through cached levels
    expect(layoutStats.builds - b0).toBe(3);
    for (let i = 0; i < 3; i++) r.zoomStep(-1);
    expect(layoutStats.builds - b0).toBe(3);
    r.zoomStep(-1); // a fifth level
    expect(layoutStats.builds - b0).toBe(4);
    for (let i = 0; i < 3; i++) r.zoomStep(1); // the three above it are still cached
    expect(layoutStats.builds - b0).toBe(4);
    r.zoomStep(1); // the opening level was the oldest: evicted
    expect(layoutStats.builds - b0).toBe(5);
    // a pan builds nothing
    for (let i = 0; i < 20; i++) r.setPan(-i * 9, i * 4);
    expect(layoutStats.builds - b0).toBe(5);
  });
});

describe("overlays at every level", () => {
  const origin = mapOrigin(BIG.id, BIG_B);
  const measure = (t: string): number => t.length * 6;
  it("every shown label lies inside the free area, at every level and several pans", { timeout: 60000 }, () => {
    let shown = 0;
    for (const s of BIG_LEVELS) {
      const places = footprintLayout(BIG, origin, s).places;
      const base = mapBox(BIG_B, computeFit(BIG_B, W, H, PADDING, INS, undefined, s));
      for (const pan0 of [{ x: 0, y: 0 }, { x: -700, y: -300 }, { x: 600, y: 200 }, { x: 1e9, y: 1e9 }, { x: -1e9, y: -1e9 }]) {
        const pan = clampPan(pan0, base, FREE, PAN_KEEP, PADDING);
        const fit = computeFit(BIG_B, W, H, PADDING, INS, pan, s);
        for (const box of targetLabels(BIG, places, fit, FREE, measure)) {
          if (!box) continue;
          shown++;
          expect(box.x).toBeGreaterThanOrEqual(FREE.left);
          expect(box.y).toBeGreaterThanOrEqual(FREE.top);
          expect(box.x + box.w).toBeLessThanOrEqual(FREE.right);
          expect(box.y + box.h).toBeLessThanOrEqual(FREE.bottom);
        }
      }
    }
    expect(shown).toBeGreaterThan(0);
  });
  it("at fitWhole there are no off-screen markers; zoomed in there are", () => {
    const targets = BIG.target ?? [];
    expect(targets.length).toBeGreaterThan(0);
    const g = buildGeometry(BIG, W, H, PADDING, INS, { x: 0, y: 0 }, BIG_MIN);
    expect(offscreenMarkers(g, FREE, targets, new Set()), "whole map").toEqual([]);
    const gz = buildGeometry(BIG, W, H, PADDING, INS, clampPan({ x: -900, y: 0 }, mapBox(BIG_B, computeFit(BIG_B, W, H, PADDING, INS, undefined, MAX_ZOOM_SCALE)), FREE, PAN_KEEP, PADDING), MAX_ZOOM_SCALE);
    expect(offscreenMarkers(gz, FREE, targets, new Set()).length).toBeGreaterThan(0);
  });
  it("culling is correct at the extreme levels", () => {
    const area: Rect = { left: 0, top: 0, right: W, bottom: H };
    for (const s of [BIG_MIN, MAX_ZOOM_SCALE]) {
      const base = mapBox(BIG_B, computeFit(BIG_B, W, H, PADDING, INS, undefined, s));
      for (const pan0 of [{ x: 0, y: 0 }, { x: -1e9, y: -1e9 }, { x: 1e9, y: 1e9 }, { x: -2000, y: 700 }]) {
        const g = buildGeometry(BIG, W, H, PADDING, INS, clampPan(pan0, base, FREE, PAN_KEEP, PADDING), s);
        const vl = new Set(visibleLines(g, area, 32));
        const vn = new Set(visibleNodes(g, area, 32));
        for (let i = 0; i < g.nodeIds.length; i++) {
          const x = g.nx[i]!;
          const y = g.ny[i]!;
          if (x >= 0 && x <= W && y >= 0 && y <= H) expect(vn.has(i), `${g.nodeIds[i]} @${s}`).toBe(true);
          if (x < -32 || x > W + 32 || y < -32 || y > H + 32) expect(vn.has(i)).toBe(false);
        }
        for (let i = 0; i < g.lineIds.length; i++) {
          const x0 = Math.min(g.ax[i]!, g.bx[i]!);
          const x1 = Math.max(g.ax[i]!, g.bx[i]!);
          const y0 = Math.min(g.ay[i]!, g.by[i]!);
          const y1 = Math.max(g.ay[i]!, g.by[i]!);
          if (x1 >= 0 && x0 <= W && y1 >= 0 && y0 <= H) expect(vl.has(i), `${g.lineIds[i]} @${s}`).toBe(true);
          if (x1 < -32 || x0 > W + 32 || y1 < -32 || y0 > H + 32) expect(vl.has(i)).toBe(false);
        }
        if (s === MAX_ZOOM_SCALE) {
          expect(vl.size).toBeLessThan(g.lineIds.length);
          expect(vn.size).toBeLessThan(g.nodeIds.length);
        } else if (pan0.x === 0 && pan0.y === 0) {
          expect(vn.size).toBe(g.nodeIds.length);
          expect(vl.size).toBe(g.lineIds.length);
        }
      }
    }
  });
});
