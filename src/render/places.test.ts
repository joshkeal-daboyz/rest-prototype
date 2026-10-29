import { describe, expect, it } from "vitest";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { loadPuzzle, placeBase, placeKind, placeName, type Puzzle } from "../core";
import { lampCaption } from "./labels";
import { computeFit, puzzleBounds } from "./geometry";
import { clusterRadius } from "./load";
import * as city from "./city";
import {
  BUILDING_GAP,
  LANE_W,
  NODE_SQUARE,
  PLACE_SHRINK,
  circuitStreets,
  cityPlaces,
  feedLanes,
  laneBoxDistance,
  mapOrigin,
  placeSize,
  type Lane,
  type Place,
} from "./city";
import { LABEL_H_PX, placeAtPoint, placeLabelBox, placeShapes, type PxBox } from "./places";

// Ticket 024 A2: places that look like what is lit.

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
const E = 1e-9;
const lampOf = (puzzle: Puzzle, id: string) => puzzle.nodes.find((n) => n.id === id)!;
const loadOf = (puzzle: Puzzle, id: string): number => {
  const n = lampOf(puzzle, id);
  return n.type === "lamp" ? (n.load ?? 1) : 1;
};

describe("cityPlaces", () => {
  it("gives each lamp exactly one place of its kind, at the kind's size, shrunk, or as a pool", () => {
    for (const { key: k, puzzle } of OPEN) {
      const places = cityPlaces(puzzle);
      const lamps = puzzle.nodes.filter((n) => n.type === "lamp").map((n) => n.id);
      expect(places.map((p) => p.lamp), k).toEqual(lamps);
      for (const p of places) {
        expect(p.kind, `${k} ${p.lamp}`).toBe(placeKind(p.lamp));
        const size = placeSize(p.lamp);
        if (p.pool) {
          expect(p.w).toBe(NODE_SQUARE);
          continue;
        }
        expect(size, `${k} ${p.lamp} is a building`).not.toBeNull();
        const dims = [p.w, p.h].sort((a, b) => b - a);
        const ok = [1, PLACE_SHRINK].some((s) => Math.abs(dims[0]! - size!.w * s) < E && Math.abs(dims[1]! - size!.h * s) < E);
        expect(ok, `${k} ${p.lamp} size ${p.w}x${p.h}`).toBe(true);
      }
    }
  });
  it("makes a street light a pool, and any other kind a pool only when nothing fits (rarely)", () => {
    let fallbacks = 0;
    let total = 0;
    for (const { puzzle } of OPEN) {
      for (const p of cityPlaces(puzzle)) {
        total++;
        if (p.kind === "streetlight") expect(p.pool).toBe(true);
        else if (p.pool) fallbacks++;
      }
    }
    expect(total).toBeGreaterThan(100);
    expect(fallbacks / total).toBeLessThan(0.03);
  });
  it("clears every lane and node square, never overlaps, and fronts its lamp", () => {
    for (const { key: k, puzzle } of OPEN) {
      const cs = circuitStreets(puzzle);
      const lanes: Lane[] = cs.lanes.concat(feedLanes(puzzle, mapOrigin(puzzle.id, puzzleBounds(puzzle))));
      const places = cityPlaces(puzzle);
      for (const p of places) {
        if (p.pool) continue;
        for (const l of lanes) expect(laneBoxDistance(l, p), `${k} ${p.lamp} on a lane`).toBeGreaterThanOrEqual(l.w / 2 - E);
        for (const s of cs.squares) {
          const hit = Math.abs(p.x - s.x) < (p.w + s.w) / 2 - E && Math.abs(p.y - s.y) < (p.h + s.h) / 2 - E;
          expect(hit, `${k} ${p.lamp} on a node square`).toBe(false);
        }
        // fronts the lamp: the edge facing it is within BUILDING_GAP + LANE_W of the lamp's square
        const n = lampOf(puzzle, p.lamp);
        const [sx, sy] = city.PLACE_SIDES[p.side]!;
        const along = (p.x - n.pos[0]) * sx + (p.y - n.pos[1]) * sy - (sx !== 0 ? p.w : p.h) / 2 - NODE_SQUARE / 2;
        expect(along, `${k} ${p.lamp} gap`).toBeGreaterThanOrEqual(BUILDING_GAP - E);
        expect(along, `${k} ${p.lamp} gap`).toBeLessThanOrEqual(BUILDING_GAP + LANE_W + E);
      }
      for (let i = 0; i < places.length; i++)
        for (let j = i + 1; j < places.length; j++) {
          const a = places[i]!;
          const b = places[j]!;
          const hit = Math.abs(a.x - b.x) < (a.w + b.w) / 2 && Math.abs(a.y - b.y) < (a.h + b.h) / 2;
          expect(hit, `${k} ${a.lamp}/${b.lamp}`).toBe(false);
        }
    }
  });
  it("sits on the side with the fewest lines when it fits", () => {
    const p = loadPuzzle({
      id: "t", name: "t", version: 5, scope: "map", capacity: null,
      nodes: [
        { id: "feed", type: "feed", pos: [0, 0] },
        { id: "shrine", type: "lamp", pos: [4, 0] },
      ],
      lines: [{ id: "l1", from: "feed", to: "shrine" }],
      faults: [],
    });
    const place = cityPlaces(p)[0]!;
    expect(place.kind).toBe("sacred");
    expect(place.x).toBeGreaterThan(4); // away from the line, which comes in from the left
    expect(place.y).toBeCloseTo(0, 9);
    expect(place.w).toBeCloseTo(1.4, 9);
    expect(place.label).toBe("shrine"); // no target list: every lamp is a target
  });
  it("falls back to a pool when a lamp is boxed in", () => {
    const p = loadPuzzle({
      id: "boxed", name: "b", version: 5, scope: "map", capacity: null,
      nodes: [
        { id: "feed", type: "feed", pos: [0, 0] },
        { id: "mill", type: "lamp", pos: [3, 0] },
        { id: "n", type: "junction", pos: [3, 1.2] },
        { id: "s", type: "junction", pos: [3, -1.2] },
        { id: "e", type: "junction", pos: [4.4, 0] },
      ],
      lines: [
        { id: "l0", from: "feed", to: "mill" },
        { id: "l1", from: "feed", to: "n" },
        { id: "l2", from: "feed", to: "s" },
        { id: "l3", from: "n", to: "e" },
        { id: "l4", from: "s", to: "e" },
      ],
      faults: [],
    });
    const place = cityPlaces(p)[0]!;
    expect(place.pool).toBe(true);
    expect(place.kind).toBe("mill");
  });
  it("labels only the target lamps, with the list's own words", () => {
    let labelled = 0;
    let unlabelled = 0;
    for (const { key: k, puzzle } of OPEN) {
      const targets = puzzle.target && puzzle.target.length ? new Set(puzzle.target) : null;
      for (const p of cityPlaces(puzzle)) {
        const isTarget = targets === null || targets.has(p.lamp);
        if (isTarget) {
          expect(p.label, `${k} ${p.lamp}`).toBe(placeName(p.lamp));
          labelled++;
        } else {
          expect(p.label, `${k} ${p.lamp}`).toBeNull();
          unlabelled++;
        }
      }
    }
    expect(labelled).toBeGreaterThan(0);
    expect(unlabelled).toBeGreaterThan(0);
  });
  it("is cached per puzzle", () => {
    const p = OPEN[0]!.puzzle;
    expect(cityPlaces(p)).toBe(cityPlaces(p));
  });
});

describe("placeAtPoint", () => {
  it("returns the lamp for a point inside its place, also after a pan, and null on a lane or empty ground", () => {
    for (const { key: k, puzzle } of OPEN.slice(0, 25)) {
      const b = puzzleBounds(puzzle);
      const places = cityPlaces(puzzle);
      const cs = circuitStreets(puzzle);
      for (const pan of [{ x: 0, y: 0 }, { x: 137, y: -61 }]) {
        const fit = computeFit(b, 1000, 800, 64, { top: 90 }, pan);
        const px = (mx: number): number => mx * fit.scale + fit.offsetX;
        const py = (my: number): number => my * fit.scale + fit.offsetY;
        for (const p of places) {
          if (p.pool) continue;
          expect(placeAtPoint(places, fit, px(p.x), py(p.y)), `${k} ${p.lamp}`).toBe(p.lamp);
          expect(placeAtPoint(places, fit, px(p.x + p.w / 2 - 0.02), py(p.y - p.h / 2 + 0.02)), `${k} ${p.lamp} corner`).toBe(p.lamp);
          expect(placeAtPoint(places, fit, px(p.x + p.w / 2 + 0.05), py(p.y)), `${k} ${p.lamp} outside`).not.toBe(p.lamp);
        }
        for (const l of cs.lanes.slice(0, 60)) {
          const mx = (l.ax + l.bx) / 2;
          const my = (l.ay + l.by) / 2;
          if (places.some((p) => Math.abs(mx - p.x) <= p.w / 2 && Math.abs(my - p.y) <= p.h / 2)) continue; // a lane ending inside a lamp's square
          expect(placeAtPoint(places, fit, px(mx), py(my)), `${k} lane`).toBeNull();
        }
        expect(placeAtPoint(places, fit, -5000, -5000), k).toBeNull();
      }
    }
  });
  it("moves with the pan: the same screen point is a different map point", () => {
    const puzzle = OPEN.find((o) => o.key.startsWith("08"))!.puzzle;
    const b = puzzleBounds(puzzle);
    const places = cityPlaces(puzzle);
    const shrine = places.find((p) => p.lamp === "shrine")!;
    const f0 = computeFit(b, 1000, 800, 64);
    const f1 = computeFit(b, 1000, 800, 64, undefined, { x: 200, y: 0 });
    const sx = shrine.x * f0.scale + f0.offsetX;
    const sy = shrine.y * f0.scale + f0.offsetY;
    expect(placeAtPoint(places, f0, sx, sy)).toBe("shrine");
    expect(placeAtPoint(places, f1, sx, sy)).not.toBe("shrine");
    expect(placeAtPoint(places, f1, sx + 200, sy)).toBe("shrine");
  });
});

const overlapPx = (a: PxBox, b: PxBox): boolean => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;

describe("labels", () => {
  it("never cover the lamp, its Lv caption or the target star, at any scale", () => {
    for (const { key: k, puzzle } of OPEN) {
      for (const p of cityPlaces(puzzle)) {
        if (p.label === null) continue;
        const n = lampOf(puzzle, p.lamp);
        const load = loadOf(puzzle, p.lamp);
        const cr = clusterRadius(load);
        const lamp: PxBox = { x: -(cr + 8), y: -(cr + 8), w: 2 * (cr + 8), h: 2 * (cr + 8) };
        const capW = lampCaption(load).length * 7;
        const caption: PxBox = { x: -capW / 2, y: cr + 13 - 7, w: capW, h: 14 };
        const star: PxBox = { x: -8, y: -cr - 17 - 8, w: 16, h: 16 };
        for (const scale of [15, 30, 45, 70, 120]) {
          const box = placeLabelBox(p, n.pos[0], n.pos[1], load, scale, p.label.length);
          expect(box.h).toBe(LABEL_H_PX);
          for (const [what, other] of [["lamp", lamp], ["caption", caption], ["star", star]] as const)
            expect(overlapPx(box, other), `${k} ${p.lamp} label over ${what} at ${scale}`).toBe(false);
        }
      }
    }
  });
  it("sits past the place's centre, away from the lamp", () => {
    const puzzle = OPEN.find((o) => o.key.startsWith("08"))!.puzzle;
    const shrine = cityPlaces(puzzle).find((p) => p.lamp === "shrine")!;
    const n = lampOf(puzzle, "shrine");
    const scale = 60;
    const box = placeLabelBox(shrine, n.pos[0], n.pos[1], loadOf(puzzle, "shrine"), scale, 6);
    const [sx, sy] = city.PLACE_SIDES[shrine.side]!;
    const near = sx !== 0 ? (sx > 0 ? box.x : -(box.x + box.w)) : sy > 0 ? box.y : -(box.y + box.h);
    const centre = ((shrine.x - n.pos[0]) * sx + (shrine.y - n.pos[1]) * sy) * scale;
    expect(near).toBeGreaterThan(centre);
  });
});

describe("shapes", () => {
  const mk = (lamp: string, kind: Place["kind"], w: number, h: number, pool = false): Place => ({ x: 5, y: 3, w, h, lamp, kind, label: null, pool, side: 0 });
  const inside = (p: Place, s: ReturnType<typeof placeShapes>[number]): boolean => {
    const eps = 1e-9;
    const bx0 = p.x - p.w / 2 - eps;
    const bx1 = p.x + p.w / 2 + eps;
    const by0 = p.y - p.h / 2 - eps;
    const by1 = p.y + p.h / 2 + eps;
    if (s.s === "line") return s.x >= bx0 && s.x <= bx1 && s.y >= by0 && s.y <= by1 && s.w >= bx0 && s.w <= bx1 && s.h >= by0 && s.h <= by1;
    return s.x - s.w / 2 >= bx0 && s.x + s.w / 2 <= bx1 && s.y - s.h / 2 >= by0 && s.y + s.h / 2 <= by1;
  };
  it("stay inside the place's box, for every kind and both orientations", () => {
    const cases: [string, Place["kind"], number, number][] = [
      ["shrine", "sacred", 1.4, 1.4], ["bell", "sacred", 0.8, 0.8], ["well", "water", 0.6, 0.6], ["mill", "mill", 1, 1],
      ["gate", "gate", 1.2, 0.3], ["forge", "work", 1.6, 0.8], ["market", "market", 1.6, 1.6], ["inn", "hall", 1.8, 1.1],
      ["homes", "homes", 1.9, 0.7], ["home", "home", 0.8, 0.7],
    ];
    for (const [id, kind, w, h] of cases) {
      for (const [ww, hh] of [[w, h], [h, w]] as const) {
        const p = mk(id, kind, ww, hh);
        const shapes = placeShapes(p);
        expect(shapes.length, id).toBeGreaterThan(0);
        for (const s of shapes) expect(inside(p, s), `${id} ${ww}x${hh}`).toBe(true);
        expect(shapes.some((s) => s.glow), `${id} glows`).toBe(true);
      }
    }
  });
  it("tells the kinds apart", () => {
    const count = (id: string, kind: Place["kind"], w: number, h: number, role: string, s: string): number =>
      placeShapes(mk(id, kind, w, h)).filter((x) => x.role === role && x.s === s).length;
    expect(placeShapes(mk("well", "water", 0.6, 0.6)).filter((x) => x.s === "circle")).toHaveLength(2); // round, with a darker centre
    expect(count("well", "water", 0.6, 0.6, "cut", "circle")).toBe(1);
    expect(count("shrine", "sacred", 1.4, 1.4, "cut", "rect")).toBe(1); // the court
    expect(count("bell", "sacred", 0.8, 0.8, "edge", "circle")).toBe(1); // a dot
    expect(count("bell", "sacred", 0.8, 0.8, "cut", "rect")).toBe(0);
    expect(count("mill", "mill", 1, 1, "edge", "line")).toBe(2); // the sails
    expect(count("gate", "gate", 1.2, 0.3, "body", "rect")).toBe(2); // two posts
    expect(count("forge", "work", 1.6, 0.8, "edge", "rect")).toBe(1); // the chimney
    expect(count("market", "market", 1.6, 1.6, "edge", "circle")).toBe(4); // stalls
    expect(count("inn", "hall", 1.8, 1.1, "body", "rect")).toBe(1);
    expect(count("homes", "homes", 1.9, 0.7, "body", "rect")).toBe(3); // a row of three
    expect(count("houses", "homes", 1.9, 0.7, "body", "rect")).toBe(3);
    expect(count("cottage", "home", 0.8, 0.7, "body", "rect")).toBe(1);
  });
  it("draws a pool as a post only: its light is drawn per frame", () => {
    const shapes = placeShapes(mk("lantern", "streetlight", NODE_SQUARE, NODE_SQUARE, true));
    expect(shapes).toHaveLength(1);
    expect(shapes[0]!.glow).toBe(false);
  });
});

describe("the half-strength glow is gone", () => {
  it("exports neither linkBuildings nor CITY_LINK_R", () => {
    expect("linkBuildings" in city).toBe(false);
    expect("CITY_LINK_R" in city).toBe(false);
  });
  it("every open lamp has a base name", () => {
    for (const { puzzle } of OPEN) for (const n of puzzle.nodes) if (n.type === "lamp") expect(placeBase(n.id).length).toBeGreaterThan(0);
  });
});
