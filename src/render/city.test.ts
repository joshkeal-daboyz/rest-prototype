import { describe, expect, it } from "vitest";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { loadPuzzle, type Puzzle } from "../core";
import type { GridState } from "../grid";
import { puzzleBounds } from "./geometry";
import { planRelight } from "./relight";
import {
  CITY_AVENUE,
  CITY_AVENUE_COLOUR,
  CITY_BG,
  CITY_BLOCK,
  CITY_BUILDING,
  CITY_PLACE_EDGE,
  CITY_PLACE_FILL,
  CITY_SEED,
  CITY_STREET_LINE,
  DISTRICT,
  GLOW_EASE_SECONDS,
  HUB_R,
  LIT_FILL_ALPHA,
  nodeClearPx,
  R0,
  SPOKES,
  circuitStreets,
  cityCells,
  cityForMap,
  cityPlaces,
  contrastRatio,
  districtOf,
  easeGlow,
  glowTarget,
  inHub,
  ladderNumber,
  mapNumber,
  mapOrigin,
  onAvenue,
  regionOf,
  spokeDir,
  spokeStep,
  type Building,
  type CityRect,
} from "./city";

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
const byId = (id: string): Puzzle => OPEN.find((p) => p.puzzle.id === id)!.puzzle;

const key = (b: Building): string => `${b.x.toFixed(6)},${b.y.toFixed(6)},${b.w.toFixed(6)},${b.h.toFixed(6)}`;
const sorted = (bs: Building[]): string[] => bs.map(key).sort();
const sq = (c: { x: number; y: number }, size: number = DISTRICT) => ({ minX: c.x - size / 2, maxX: c.x + size / 2, minY: c.y - size / 2, maxY: c.y + size / 2 });
const E = 1e-9;
const overlapSq = (a: ReturnType<typeof sq>, b: ReturnType<typeof sq>): boolean =>
  a.minX < b.maxX - E && b.minX < a.maxX - E && a.minY < b.maxY - E && b.minY < a.maxY - E;

describe("one city", () => {
  const rect = { minX: -13, minY: -9, maxX: 21, maxY: 15 };
  it("is deterministic", () => {
    expect(cityCells(rect)).toEqual(cityCells(rect));
    expect(CITY_SEED).toBe(0x5e57);
  });
  it("gives identical buildings where rects overlap", () => {
    const a = { minX: -20, minY: -20, maxX: 10, maxY: 10 };
    const b = { minX: -4, minY: -6, maxX: 30, maxY: 25 };
    const inBoth = (x: Building) => x.x >= -4 && x.x <= 10 && x.y >= -6 && x.y <= 10;
    const fa = sorted(cityCells(a).filter(inBoth));
    const fb = sorted(cityCells(b).filter(inBoth));
    expect(fa.length).toBeGreaterThan(10);
    expect(fa).toEqual(fb);
  });
  it("keeps every building inside its cell, off the streets", () => {
    for (const b of cityCells({ minX: -30, minY: -30, maxX: 30, maxY: 30 })) {
      const cx = Math.floor(b.x / CITY_BLOCK);
      const cy = Math.floor(b.y / CITY_BLOCK);
      expect(b.x - b.w / 2).toBeGreaterThan(cx * CITY_BLOCK);
      expect(b.x + b.w / 2).toBeLessThan((cx + 1) * CITY_BLOCK);
      expect(b.y - b.h / 2).toBeGreaterThan(cy * CITY_BLOCK);
      expect(b.y + b.h / 2).toBeLessThan((cy + 1) * CITY_BLOCK);
    }
  });
});

describe("ladder number", () => {
  it("reads the leading digits", () => {
    expect(ladderNumber("08-where-it-stops")).toBe(8);
    expect(ladderNumber("locked/08-where-it-stops")).toBe(8);
    expect(ladderNumber("15-meet-in-the-middle")).toBe(15);
    expect(ladderNumber("lamp-row")).toBeNull();
  });
});

describe("district layout", () => {
  it("puts map 01 on the hub", () => {
    expect(districtOf(1)).toEqual({ spoke: null, slot: null, centre: { x: 0, y: 0 } });
    const s = sq(districtOf(1).centre);
    expect(Math.hypot(s.maxX, s.maxY)).toBeLessThan(HUB_R);
    expect(inHub(s.maxX, s.maxY)).toBe(true);
  });
  it("gives 128 distinct, non-overlapping districts", () => {
    const sqs = Array.from({ length: 128 }, (_, i) => sq(districtOf(i + 1).centre));
    for (let i = 0; i < sqs.length; i++) for (let j = i + 1; j < sqs.length; j++) expect(overlapSq(sqs[i]!, sqs[j]!), `${i + 1} vs ${j + 1}`).toBe(false);
  });
  it("makes neighbours on a spoke adjacent, one step apart", () => {
    for (let n = 2; n <= 127; n++) {
      const a = districtOf(n);
      const b = districtOf(n + 1);
      if (a.spoke !== b.spoke) continue;
      const d = spokeDir(a.spoke!);
      const step = spokeStep(a.spoke!);
      expect(b.centre.x - a.centre.x).toBeCloseTo(d.x * step, 9);
      expect(b.centre.y - a.centre.y).toBeCloseTo(d.y * step, 9);
      const sa = sq(a.centre);
      const sb = sq(b.centre);
      const dx = Math.abs(a.centre.x - b.centre.x);
      const dy = Math.abs(a.centre.y - b.centre.y);
      if (a.spoke! % 2 === 0) {
        expect(Math.max(dx, dy)).toBeCloseTo(DISTRICT, 9); // shared edge
        expect(Math.min(dx, dy)).toBeCloseTo(0, 9);
      } else {
        expect(dx).toBeCloseTo(DISTRICT, 9); // shared corner
        expect(dy).toBeCloseTo(DISTRICT, 9);
      }
      expect(overlapSq(sa, sb)).toBe(false);
    }
  });
  it("runs 8 maps per spoke", () => {
    for (let n = 2; n <= 9; n++) expect(districtOf(n)).toMatchObject({ spoke: 0, slot: n - 2 });
    expect(districtOf(10)).toMatchObject({ spoke: 1, slot: 0 });
    expect(districtOf(58)).toMatchObject({ spoke: 7, slot: 0 });
    expect(districtOf(64)).toMatchObject({ spoke: 7, slot: 6 });
    expect(districtOf(65)).toMatchObject({ spoke: 7, slot: 7 });
    expect(districtOf(66)).toMatchObject({ spoke: 0, slot: 8 });
  });
  it("reaches the hub from every spoke", () => {
    const first = sq(districtOf(1).centre);
    for (let s = 0; s < SPOKES; s++) {
      const d = spokeDir(s);
      expect(Math.hypot(d.x, d.y)).toBeCloseTo(1, 12);
      const n = 2 + s * 8;
      const dist = districtOf(n);
      expect(dist.spoke).toBe(s);
      // centre on the ray
      expect(Math.abs(-dist.centre.x * d.y + dist.centre.y * d.x)).toBeLessThan(E);
      expect(dist.centre.x * d.x + dist.centre.y * d.y).toBeGreaterThan(0);
      const q = sq(dist.centre);
      expect(overlapSq(q, first)).toBe(false);
      // nearest point of the square to the hub
      const nx = Math.min(Math.max(0, q.minX), q.maxX);
      const ny = Math.min(Math.max(0, q.minY), q.maxY);
      const near = Math.hypot(nx, ny);
      expect(near).toBeGreaterThanOrEqual(HUB_R);
      expect(near).toBeLessThanOrEqual(R0);
      // the avenue runs from HUB_R to the far end of slot 7
      const farR = R0 + 7 * spokeStep(s) + DISTRICT;
      for (let r = HUB_R; r <= farR; r += 1.7) expect(onAvenue(d.x * r, d.y * r)).toBe(true);
      expect(onAvenue(d.x * (HUB_R - 1), d.y * (HUB_R - 1))).toBe(false);
    }
  });
  it("builds nothing on the avenues, and builds the town square", () => {
    for (let s = 0; s < SPOKES; s++) {
      const d = spokeDir(s);
      const a = { x: d.x * (HUB_R + 2), y: d.y * (HUB_R + 2) };
      const b = { x: d.x * (HUB_R + 60), y: d.y * (HUB_R + 60) };
      const rect = { minX: Math.min(a.x, b.x) - 3, maxX: Math.max(a.x, b.x) + 3, minY: Math.min(a.y, b.y) - 3, maxY: Math.max(a.y, b.y) + 3 };
      const cells = cityCells(rect);
      expect(cells.length).toBeGreaterThan(20);
      for (const bd of cells) {
        expect(onAvenue(bd.x, bd.y)).toBe(false);
        // and no corner of the footprint sits well inside the band either
        for (const [sx, sy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]] as const) {
          const px = bd.x + (sx * bd.w) / 2;
          const py = bd.y + (sy * bd.h) / 2;
          if (onAvenue(px, py)) throw new Error(`building corner on avenue ${s}`);
        }
      }
    }
    expect(cityCells({ minX: -16, minY: -16, maxX: 16, maxY: 16 }).length).toBeGreaterThan(100);
  });
  it("leaves the avenue wide enough to see", () => {
    expect(CITY_AVENUE).toBeGreaterThan(1);
  });
});

describe("map origins", () => {
  it("has maps to test", () => {
    expect(OPEN.length).toBeGreaterThan(20);
  });
  it("centres every map in its district (its ward, if large), whole cells, bounds inside", () => {
    for (const { key: k, puzzle } of ALL) {
      const b = puzzleBounds(puzzle);
      const o = mapOrigin(puzzle.id, b);
      expect(Math.abs(o.x % CITY_BLOCK), k).toBe(0);
      expect(Math.abs(o.y % CITY_BLOCK), k).toBe(0);
      const c = regionOf(puzzle.id, b).centre;
      expect(Math.abs((b.minX + b.maxX) / 2 + o.x - c.x), k).toBeLessThanOrEqual(CITY_BLOCK / 2 + E);
      expect(Math.abs((b.minY + b.maxY) / 2 + o.y - c.y), k).toBeLessThanOrEqual(CITY_BLOCK / 2 + E);
      const q = sq(c, regionOf(puzzle.id, b).size);
      expect(b.minX + o.x, k).toBeGreaterThanOrEqual(q.minX);
      expect(b.maxX + o.x, k).toBeLessThanOrEqual(q.maxX);
      expect(b.minY + o.y, k).toBeGreaterThanOrEqual(q.minY);
      expect(b.maxY + o.y, k).toBeLessThanOrEqual(q.maxY);
    }
  });
  it("gives a locked copy its open map's origin", () => {
    const b = { minX: 0, maxX: 10, minY: 0, maxY: 6 };
    expect(mapOrigin("locked/08-where-it-stops", b)).toEqual(mapOrigin("08-where-it-stops", b));
  });
  it("puts an unnumbered id on the outer ring, stably", () => {
    const n = mapNumber("lamp-row");
    expect(n).toBeGreaterThanOrEqual(65);
    expect(n).toBeLessThanOrEqual(128);
    expect(mapNumber("lamp-row")).toBe(n);
  });
});

describe("neighbouring maps share streets outside their footprints", () => {
  it("is the same strip whichever map is open (07/08 and 01/02), outside both footprints", () => {
    for (const [na, nb] of [[7, 8], [1, 2]] as const) {
      const pa = OPEN.find((p) => ladderNumber(p.puzzle.id) === na)!.puzzle;
      const pb = OPEN.find((p) => ladderNumber(p.puzzle.id) === nb)!.puzzle;
      const oa = mapOrigin(pa.id, puzzleBounds(pa));
      const ob = mapOrigin(pb.id, puzzleBounds(pb));
      const ca = districtOf(na).centre;
      const cb = districtOf(nb).centre;
      const mx = (ca.x + cb.x) / 2;
      const my = (ca.y + cb.y) / 2;
      const strip = { minX: mx - 3, maxX: mx + 3, minY: my - 8, maxY: my + 8 };
      // A footprint grown by one block: a feed lane runs on to the next street, and a building may touch the edge.
      const grown = (p: Puzzle, o: { x: number; y: number }): CityRect => {
        const f = circuitStreets(p).footprint;
        return { minX: f.minX + o.x - CITY_BLOCK, maxX: f.maxX + o.x + CITY_BLOCK, minY: f.minY + o.y - CITY_BLOCK, maxY: f.maxY + o.y + CITY_BLOCK };
      };
      const ga = grown(pa, oa);
      const gb = grown(pb, ob);
      const outside = (x: Building): boolean =>
        [ga, gb].every((g) => x.x + x.w / 2 <= g.minX || x.x - x.w / 2 >= g.maxX || x.y + x.h / 2 <= g.minY || x.y - x.h / 2 >= g.maxY);
      const through = (p: Puzzle, o: { x: number; y: number }): string[] =>
        sorted(
          cityForMap(p, o, { minX: strip.minX - o.x, maxX: strip.maxX - o.x, minY: strip.minY - o.y, maxY: strip.maxY - o.y }, 50)
            .map((bd) => ({ ...bd, x: bd.x + o.x, y: bd.y + o.y }))
            .filter(outside),
        );
      const viaA = through(pa, oa);
      expect(viaA.length).toBeGreaterThan(0);
      expect(viaA).toEqual(through(pb, ob));
      expect(viaA).toEqual(sorted(cityCells(strip).filter(outside)));
    }
  });
});

describe("places", () => {
  it("gives one place per lamp, never overlapping (node-square and lane clearance: places.test.ts)", () => {
    for (const { key: k, puzzle } of OPEN) {
      const places = cityPlaces(puzzle);
      const lamps = puzzle.nodes.filter((n) => n.type === "lamp").map((n) => n.id);
      expect(places.map((p) => p.lamp), k).toEqual(lamps);
      for (let i = 0; i < places.length; i++)
        for (let j = i + 1; j < places.length; j++) {
          const a = places[i]!;
          const b = places[j]!;
          const hit = Math.abs(a.x - b.x) < (a.w + b.w) / 2 && Math.abs(a.y - b.y) < (a.h + b.h) / 2;
          expect(hit, `${k} ${a.lamp}/${b.lamp}`).toBe(false);
        }
    }
  });
});

describe("filtering", () => {
  it("keeps the city off every node (nodeClearPx) and every place", () => {
    for (const { key: k, puzzle } of OPEN) {
      const b = puzzleBounds(puzzle);
      const o = mapOrigin(puzzle.id, b);
      const rect = { minX: b.minX - 6, maxX: b.maxX + 6, minY: b.minY - 6, maxY: b.maxY + 6 };
      const bs = cityForMap(puzzle, o, rect, 50);
      expect(bs.length, k).toBeGreaterThan(0);
      const places = cityPlaces(puzzle, 50);
      let nearNode = 0;
      let onPlace = 0;
      for (const bd of bs) {
        for (const n of puzzle.nodes) {
          const d = Math.hypot(Math.max(Math.abs(n.pos[0] - bd.x) - bd.w / 2, 0), Math.max(Math.abs(n.pos[1] - bd.y) - bd.h / 2, 0));
          if (d * 50 < nodeClearPx(n) - 1e-6) nearNode++;
        }
        for (const p of places) if (!p.pool && Math.abs(bd.x - p.x) < (bd.w + p.w) / 2 && Math.abs(bd.y - p.y) < (bd.h + p.h) / 2) onPlace++;
      }
      expect(nearNode, k).toBe(0);
      expect(onPlace, k).toBe(0);
    }
  });
});

function stateOf(over: Partial<GridState>): GridState {
  return { lit: new Set<string>(), brownout: false, ...over } as unknown as GridState;
}

describe("glow", () => {
  it("is 1 for a lit lamp and 0 otherwise", () => {
    const st = stateOf({ lit: new Set(["a"]) });
    expect(glowTarget("a", st, null)).toBe(1);
    expect(glowTarget("b", st, null)).toBe(0);
  });
  it("is 0 for every lamp in a brownout", () => {
    const st = stateOf({ lit: new Set(["a", "b"]), brownout: true });
    expect(glowTarget("a", st, null)).toBe(0);
    expect(glowTarget("b", st, null)).toBe(0);
  });
  it("waits for the Relight to arrive", () => {
    const puzzle = byId("09-shrine-circuit");
    const st = stateOf({
      lit: new Set(["shrine", "flood"]),
      powered: new Set(["feed", "br_main", "l_feed", "l_main", "j1", "l_sw", "sw_1", "l_b", "j4", "l_b2", "j5", "l_shrine", "shrine", "l_flood", "flood"]),
      flowFrom: new Map([["l_feed", "feed"], ["l_main", "br_main"], ["l_sw", "j1"], ["l_b", "sw_1"], ["l_b2", "j4"], ["l_flood", "j4"], ["l_shrine", "j5"]]),
    } as Partial<GridState>);
    const plan = planRelight(puzzle, st);
    const i = puzzle.nodes.findIndex((n) => n.id === "shrine");
    const arrive = plan.nodeArrive[i]!;
    expect(arrive).toBeGreaterThan(0);
    expect(glowTarget("shrine", st, { t: arrive - 0.01, arriveAt: arrive })).toBe(0);
    expect(glowTarget("shrine", st, { t: arrive, arriveAt: arrive })).toBe(1);
    expect(glowTarget("shrine", st, { t: arrive + 1, arriveAt: arrive })).toBe(1);
    // lamps come on in distance order
    const order = plan.lampOrder.map((id) => plan.nodeArrive[puzzle.nodes.findIndex((n) => n.id === id)]!);
    expect([...order].sort((a, b) => a - b)).toEqual(order);
  });
});

describe("easing", () => {
  it("reaches the target in GLOW_EASE_SECONDS and never overshoots", () => {
    expect(easeGlow(0, 1, GLOW_EASE_SECONDS)).toBeCloseTo(1, 12);
    expect(easeGlow(0, 1, 10)).toBe(1);
    expect(easeGlow(1, 0, 10)).toBe(0);
    expect(easeGlow(0, 1, GLOW_EASE_SECONDS / 2)).toBeCloseTo(0.5, 12);
    let g = 0;
    for (let i = 0; i < 100; i++) {
      g = easeGlow(g, 1, 0.01);
      expect(g).toBeLessThanOrEqual(1);
    }
    expect(g).toBe(1);
  });
  it("does nothing for dt 0", () => {
    expect(easeGlow(0.3, 1, 0)).toBe(0.3);
    expect(easeGlow(0.3, 0, 0)).toBe(0.3);
  });
});

describe("contrast", () => {
  it("keeps the background town within 1.6 of the background (places are brighter, ticket 026)", () => {
    for (const c of [CITY_BUILDING, CITY_STREET_LINE, CITY_AVENUE_COLOUR]) {
      expect(contrastRatio(c, CITY_BG), c).toBeLessThanOrEqual(1.6);
    }
  });
  it("keeps the lit alpha low", () => {
    expect(LIT_FILL_ALPHA).toBeLessThanOrEqual(0.5);
  });
});
