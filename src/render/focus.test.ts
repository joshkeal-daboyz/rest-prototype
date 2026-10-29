import { describe, expect, it } from "vitest";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { loadPuzzle, type GridNode, type Puzzle } from "../core";
import { NODE_HIT_RADIUS, buildGeometry, computeFit, freeArea, hitTestGeometry, puzzleBounds } from "./geometry";
import {
  CITY_BG,
  CITY_BUILDING,
  CITY_PLACE_FILL,
  WIRE_CLEAR_PX,
  cityPlaces,
  contrastRatio,
  feedLanes,
  footprintLayout,
  mapOrigin,
  nodeClearPx,
  placeParts,
  pointBoxDistance,
  type Building,
  type Place,
} from "./city";
import { bulbCount, bulbRadius, clusterRadius } from "./load";
import { LABEL_GAP_PX, lampMarks, placeAtPoint, placeShapes, targetLabels, type PxRect } from "./places";

// Ticket 026 A: places beside their own lamp, smaller lamps, buildings as the focus.

const ROOT = join(__dirname, "..", "..", "puzzles");
function loadAll(): { key: string; puzzle: Puzzle }[] {
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
const OPEN = loadAll();

function lampsOf(p: Puzzle): GridNode[] {
  return p.nodes.filter((n) => n.type === "lamp");
}
/** Edge distance in map units from a point to the nearest part of a place. */
function edge(px: number, py: number, p: Place): number {
  let best = Infinity;
  for (const q of placeParts(p)) best = Math.min(best, pointBoxDistance(px, py, q));
  return best;
}
function percentile(sorted: number[], q: number): number {
  return sorted[Math.min(sorted.length - 1, Math.ceil(q * sorted.length) - 1)]!;
}
function toPx(b: Building, s: number): PxRect {
  return { x: (b.x - b.w / 2) * s, y: (b.y - b.h / 2) * s, w: b.w * s, h: b.h * s };
}
function lone(kind: string, load = 1): Puzzle {
  return loadPuzzle({
    id: "99-test-lone",
    name: "t",
    version: 3,
      faults: [],
    scope: "map",
    capacity: 4,
    startingParts: [],
    nodes: [
      { id: "feed", type: "feed", pos: [0, 0] },
      { id: kind, type: "lamp", pos: [4, 0], load },
    ],
    lines: [{ id: "l1", from: "feed", to: kind }],
  });
}

describe("smaller lamps", () => {
  it("has 7 px and 6 px bulbs, and clusters of 7 and 12", () => {
    expect(bulbRadius(1)).toBe(7);
    expect(bulbRadius(2)).toBe(6);
    expect(bulbRadius(3)).toBe(6);
    expect(clusterRadius(1)).toBe(7);
    expect(clusterRadius(2)).toBe(12);
    expect(clusterRadius(3)).toBe(12);
  });
  it("still shows the load as size and count", () => {
    const area = (l: number): number => bulbCount(l) * Math.PI * bulbRadius(l) ** 2;
    expect(area(3)).toBeGreaterThan(area(1));
    expect(area(2)).toBeGreaterThan(area(1));
    expect(clusterRadius(3)).toBeGreaterThan(clusterRadius(1));
  });
  it("never lets a lamp be harder to hit than 18 px, and keeps nodeClear above the hit disc", () => {
    for (const load of [1, 2, 3, 4, 5]) {
      const puz = lone("shrine", load);
      const lamp = puz.nodes[1]!;
      const g = buildGeometry(puz, 1000, 600, 60);
      const i = g.nodeIndex.get("shrine")!;
      expect(g.hitR[i]!).toBeGreaterThanOrEqual(NODE_HIT_RADIUS);
      expect(nodeClearPx(lamp)).toBeGreaterThanOrEqual(g.hitR[i]! + 2);
      expect(nodeClearPx(lamp)).toBeGreaterThanOrEqual(clusterRadius(load) + 8);
    }
  });
  it("hit-tests a point at cr + 1 px from a load-3 lamp to that lamp", () => {
    const g = buildGeometry(lone("mill", 3), 1000, 600, 60);
    const i = g.nodeIndex.get("mill")!;
    expect(hitTestGeometry(g, g.nx[i]! + clusterRadius(3) + 1, g.ny[i]!)).toBe("mill");
    expect(hitTestGeometry(g, g.nx[i]!, g.ny[i]! + clusterRadius(3) + 1)).toBe("mill");
  });
  it("sizes the caption and star boxes as cut", () => {
    const lamp = lone("shrine").nodes[1]!;
    const [cap, star] = lampMarks(lamp, 100, 100);
    const cr = clusterRadius(1);
    expect(cap!.h).toBe(14);
    expect(cap!.y + cap!.h / 2).toBe(100 + cr + 10);
    expect(cap!.x + cap!.w / 2).toBe(100);
    expect(cap!.w).toBe("Lv1 Lamp".length * 6 + 4);
    expect(star).toEqual({ x: 93, y: 100 - cr - 13 - 7, w: 14, h: 14 });
  });
});

describe("places stay beside their own lamp", () => {
  it("is nearer to its own lamp than any other, with the gap statistics of the cut", { timeout: 120000 }, () => {
    for (const s of [30, 50, 80]) {
      const gaps: number[] = [];
      let pools = 0;
      let lampCount = 0;
      for (const { key: k, puzzle } of OPEN) {
        const lamps = lampsOf(puzzle);
        for (const pl of cityPlaces(puzzle, s)) {
          const own = lamps.find((n) => n.id === pl.lamp)!;
          if (pl.kind === "streetlight") continue;
          lampCount++;
          if (pl.pool) {
            pools++;
            continue;
          }
          const d = edge(own.pos[0], own.pos[1], pl);
          for (const o of lamps) {
            if (o === own) continue;
            expect(edge(o.pos[0], o.pos[1], pl) * s, `${k} ${pl.lamp} nearer ${o.id} @${s}`).toBeGreaterThanOrEqual(d * s - 1e-6);
          }
          if (pl.kind !== "gate") expect(d * s, `${k} ${pl.lamp} @${s}`).toBeLessThanOrEqual(60);
          gaps.push(d * s);
        }
      }
      gaps.sort((a, b) => a - b);
      expect(percentile(gaps, 0.5), `median @${s}`).toBeLessThanOrEqual(30);
      expect(percentile(gaps, 0.9), `p90 @${s}`).toBeLessThanOrEqual(40);
      expect(pools / lampCount, `pools @${s}`).toBeLessThanOrEqual(0.01);
    }
  });
});

describe("the free front slot", () => {
  it("puts a lone shrine within 36 px of its lamp, clear of the wire, caption and star", () => {
    const puz = lone("shrine");
    const s = 50;
    const pl = cityPlaces(puz, s)[0]!;
    expect(pl.pool).toBe(false);
    const lamp = puz.nodes[1]!;
    expect(edge(lamp.pos[0], lamp.pos[1], pl) * s).toBeLessThanOrEqual(36);
    const [cap, star] = lampMarks(lamp, lamp.pos[0] * s, lamp.pos[1] * s);
    for (const q of placeParts(pl)) {
      const r = toPx(q, s);
      for (const m of [cap!, star!]) {
        const dx = Math.max(m.x - (r.x + r.w), r.x - (m.x + m.w), 0);
        const dy = Math.max(m.y - (r.y + r.h), r.y - (m.y + m.h), 0);
        expect(Math.hypot(dx, dy)).toBeGreaterThanOrEqual(LABEL_GAP_PX - 1e-6);
      }
      // The wire runs along y = 0 from x = 0 to x = 4.
      const dxw = Math.max(0 - (r.x + r.w), r.x - 4 * s, 0);
      const dyw = Math.max(0 - (r.y + r.h), r.y - 0, 0);
      expect(Math.hypot(dxw, dyw)).toBeGreaterThanOrEqual(WIRE_CLEAR_PX - 1e-6);
    }
  });
  it("puts each of two lamps 3 units apart beside itself", () => {
    const puz = loadPuzzle({
      id: "99-test-two",
      name: "t",
      version: 3,
      faults: [],
      scope: "map",
      capacity: 4,
      startingParts: [],
      nodes: [
        { id: "feed", type: "feed", pos: [0, 0] },
        { id: "shrine", type: "lamp", pos: [4, 0], load: 1 },
        { id: "market", type: "lamp", pos: [4, 3], load: 1 },
      ],
      lines: [
        { id: "l1", from: "feed", to: "shrine" },
        { id: "l2", from: "feed", to: "market" },
      ],
    });
    for (const s of [30, 50, 80]) {
      const places = cityPlaces(puz, s);
      const [a, b] = [puz.nodes[1]!, puz.nodes[2]!];
      const [pa, pb] = [places[0]!, places[1]!];
      expect(pa.pool || pb.pool).toBe(false);
      expect(edge(a.pos[0], a.pos[1], pa)).toBeLessThanOrEqual(edge(b.pos[0], b.pos[1], pa));
      expect(edge(b.pos[0], b.pos[1], pb)).toBeLessThanOrEqual(edge(a.pos[0], a.pos[1], pb));
    }
  });
  it("picks a lone place: inside gives its lamp, just outside gives null", () => {
    const pl = cityPlaces(lone("shrine"), 50)[0]!;
    const s = 50;
    const fit = { scale: s, offsetX: 17, offsetY: 31 };
    const q = placeParts(pl)[0]!;
    const cx = q.x * s + fit.offsetX;
    const cy = q.y * s + fit.offsetY;
    expect(placeAtPoint([pl], fit, cx, cy)).toBe("shrine");
    expect(placeAtPoint([pl], fit, cx + (q.w * s) / 2 - 1, cy)).toBe("shrine");
    expect(placeAtPoint([pl], fit, cx + (q.w * s) / 2 + 1, cy)).toBeNull();
    expect(placeAtPoint([pl], fit, cx, cy - (q.h * s) / 2 - 1)).toBeNull();
  });
  it("is deterministic: the same map and scale give equal output", () => {
    const raw = JSON.parse(readFileSync(join(ROOT, "21-make-room.json"), "utf8"));
    expect(cityPlaces(loadPuzzle(raw), 50)).toEqual(cityPlaces(loadPuzzle(raw), 50));
  });
});

describe("clear of the circuit, built from the puzzle's own lines", () => {
  it("keeps every building and place off every wire and node, at three scales", { timeout: 240000 }, () => {
    for (const s of [30, 50, 80]) {
      for (const { key: k, puzzle } of OPEN) {
        const pos = new Map<string, readonly [number, number]>();
        for (const n of puzzle.nodes) pos.set(n.id, n.pos);
        const segs: [number, number, number, number][] = [];
        for (const l of puzzle.lines) {
          const a = pos.get(l.from)!;
          const z = pos.get(l.to)!;
          segs.push([a[0], a[1], z[0], z[1]]);
        }
        for (const d of puzzle.decor ?? []) for (let i = 0; i + 1 < d.path.length; i++) segs.push([d.path[i]![0], d.path[i]![1], d.path[i + 1]![0], d.path[i + 1]![1]]);
        for (const l of feedLanes(puzzle)) segs.push([l.ax, l.ay, l.bx, l.by]);
        // Sample every wire every 2 px.
        const pts: number[] = [];
        for (const [ax, ay, bx, by] of segs) {
          const len = Math.hypot(bx - ax, by - ay) * s;
          const n = Math.max(1, Math.ceil(len / 2));
          for (let i = 0; i <= n; i++) pts.push(ax + ((bx - ax) * i) / n, ay + ((by - ay) * i) / n);
        }
        const lay = footprintLayout(puzzle, mapOrigin(puzzle.id, puzzleBounds(puzzle)), s);
        const boxes: Building[] = lay.buildings.slice();
        for (const p of lay.places) if (!p.pool) for (const q of placeParts(p)) boxes.push(q);
        const wc = WIRE_CLEAR_PX / s;
        for (const b of boxes) {
          for (let i = 0; i < pts.length; i += 2) {
            const d = pointBoxDistance(pts[i]!, pts[i + 1]!, b);
            if (d < wc - 1e-6) throw new Error(`${k} @${s}: box ${JSON.stringify(b)} within ${(d * s).toFixed(2)} px of a wire`);
          }
          for (const n of puzzle.nodes) {
            const d = pointBoxDistance(n.pos[0], n.pos[1], b) * s;
            if (d < nodeClearPx(n) - 1e-6) throw new Error(`${k} @${s}: box within ${d.toFixed(2)} px of ${n.id}`);
          }
        }
      }
    }
  });
  it("keeps every place clear of every lamp's caption and star, at five scales", { timeout: 240000 }, () => {
    for (const s of [15, 30, 45, 70, 120]) {
      for (const { key: k, puzzle } of OPEN) {
        const marks: PxRect[] = [];
        for (const n of lampsOf(puzzle)) for (const m of lampMarks(n, n.pos[0] * s, n.pos[1] * s)) marks.push(m);
        for (const p of cityPlaces(puzzle, s)) {
          if (p.pool) continue;
          for (const q of placeParts(p)) {
            const r = toPx(q, s);
            for (const m of marks) {
              const hit = r.x < m.x + m.w && m.x < r.x + r.w && r.y < m.y + m.h && m.y < r.y + r.h;
              if (hit) throw new Error(`${k} ${p.lamp} @${s} overlaps a caption or star`);
            }
          }
        }
      }
    }
  });
});

describe("labels at the new sizes", () => {
  it("are inside the free area and clear of every lamp's caption and star, at two window sizes", { timeout: 120000 }, () => {
    const sizes: [number, number][] = [
      [1920, 1080],
      [400, 700],
    ];
    for (const [w, h] of sizes) {
      const inset = { top: 90, right: w > 800 ? 300 : 0, bottom: 40 };
      for (const { key: k, puzzle } of OPEN) {
        const fit = computeFit(puzzleBounds(puzzle), w, h, 64, inset);
        const free = freeArea(w, h, inset);
        const places = cityPlaces(puzzle, fit.scale);
        const boxes = targetLabels(puzzle, places, fit, free, (t) => t.length * 6.2);
        let hidden = 0;
        boxes.forEach((r, i) => {
          if (places[i]!.label === null) return;
          if (!r) {
            hidden++;
            return;
          }
          expect(r.x >= free.left && r.y >= free.top && r.x + r.w <= free.right && r.y + r.h <= free.bottom, `${k} inside`).toBe(true);
          for (const n of lampsOf(puzzle)) {
            for (const m of lampMarks(n, n.pos[0] * fit.scale + fit.offsetX, n.pos[1] * fit.scale + fit.offsetY)) {
              expect(r.x < m.x + m.w && m.x < r.x + r.w && r.y < m.y + m.h && m.y < r.y + r.h, `${k} ${n.id}`).toBe(false);
            }
          }
        });
        if (w === 1920) expect(hidden, k).toBeLessThanOrEqual(1);
      }
    }
  });
});

describe("fuller plans and place colours", () => {
  const box = (w: number, h: number, extra: Partial<Place>): Place => ({ x: 5, y: 3, w, h, lamp: "x", kind: "sacred", label: null, pool: false, ...extra });
  it("fills the cross arm to 0.9 of the box, the water ring to the quarter lot, the mill disc to 0.6", () => {
    expect(placeShapes(box(1.4, 1.4, { lamp: "shrine", kind: "sacred" }))[0]!.w).toBeCloseTo(1.4 * 0.9, 9);
    expect(placeShapes(box(0.6, 0.6, { lamp: "well", kind: "water" }))[0]!.w).toBeCloseTo(0.6, 9);
    expect(placeShapes(box(1.4, 1.4, { lamp: "mill", kind: "mill" }))[0]!.w).toBeCloseTo(0.6, 9);
  });
  it("never makes a place bigger than its lot size", () => {
    for (const { puzzle } of OPEN) {
      for (const p of cityPlaces(puzzle, 50)) {
        if (p.pool || p.kind === "gate") continue;
        for (const q of placeParts(p)) expect(Math.max(q.w, q.h)).toBeLessThanOrEqual(1.4 + 1e-9);
      }
    }
  });
  it("keeps the background town quiet and the place fill apart from it", () => {
    expect(contrastRatio(CITY_BUILDING, CITY_BG)).toBeLessThanOrEqual(1.6);
    expect(contrastRatio(CITY_PLACE_FILL, CITY_BUILDING)).toBeGreaterThanOrEqual(1.9);
  });
});
