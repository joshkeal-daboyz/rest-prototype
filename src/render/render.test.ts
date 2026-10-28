import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { loadPuzzle } from "../core";
import type { GridState } from "../grid";
import { buildGeometry, computeFit, hitTestGeometry, puzzleBounds } from "./geometry";
import { chargeFraction, popProgress, wentFlat, FLAT_POP_SECONDS } from "./battery";
import { flicker, pulseCount, pulsePhase, PULSE_SPACING } from "./motion";
import { planRelight, RELIGHT_TRAVEL_SECONDS } from "./relight";

const puzzle = loadPuzzle(JSON.parse(readFileSync(join(__dirname, "..", "..", "puzzles", "08-shrine-circuit.json"), "utf8")));

function wonState(): GridState {
  const flowFrom = new Map<string, string>([
    ["l_feed", "feed"],
    ["l_main", "br_main"],
    ["l_sw", "j1"],
    ["l_b", "sw_1"],
    ["l_b2", "j4"],
    ["l_flood", "j4"],
    ["l_shrine", "j5"],
  ]);
  const powered = new Set<string>([
    "feed", "br_main", "l_feed", "l_main", "j1", "l_sw", "sw_1", "l_b", "j4", "l_b2", "j5", "l_shrine", "shrine", "l_flood", "flood",
  ]);
  return {
    powered,
    flowFrom,
    lit: new Set(["shrine", "flood"]),
    readableFaults: new Set(),
    sparking: new Set(),
    fuseLoad: new Map(),
    wouldBlow: new Map(),
    faults: [{ id: "f1", at: "j_dead", kind: "dead-junction" }],
    breakers: new Map([["br_main", true], ["br_street", false]]),
    switches: new Map<string, 0 | 1>([["sw_1", 1]]),
    batteries: new Map(),
    parts: [],
    targets: ["shrine"],
    load: 3,
    capacity: 4,
    brownout: false,
    complete: true,
    actions: 3,
  };
}

describe("map fit", () => {
  const b = puzzleBounds(puzzle);
  it("keeps every node inside the canvas with padding", () => {
    for (const [w, h] of [[800, 600], [400, 900], [1600, 300]] as const) {
      const g = buildGeometry(puzzle, w, h, 40);
      for (let i = 0; i < g.nodeIds.length; i++) {
        expect(g.nx[i]).toBeGreaterThanOrEqual(40 - 1e-6);
        expect(g.nx[i]).toBeLessThanOrEqual(w - 40 + 1e-6);
        expect(g.ny[i]).toBeGreaterThanOrEqual(40 - 1e-6);
        expect(g.ny[i]).toBeLessThanOrEqual(h - 40 + 1e-6);
      }
    }
  });
  it("refits when the canvas size changes", () => {
    const a = computeFit(b, 800, 600, 40);
    const c = computeFit(b, 400, 600, 40);
    expect(c.scale).toBeLessThan(a.scale);
  });
  it("survives a degenerate canvas", () => {
    const f = computeFit(b, 0, 0, 40);
    expect(Number.isFinite(f.scale)).toBe(true);
  });
});

describe("hit testing", () => {
  const g = buildGeometry(puzzle, 1000, 600, 60);
  const nodeAt = (id: string): [number, number] => {
    const i = g.nodeIndex.get(id)!;
    return [g.nx[i]!, g.ny[i]!];
  };
  it("returns a node under the point", () => {
    const [x, y] = nodeAt("sw_1");
    expect(hitTestGeometry(g, x + 3, y - 2)).toBe("sw_1");
  });
  it("returns a line under a point on its middle", () => {
    const i = g.lineIndex.get("l_flood")!;
    const x = (g.ax[i]! + g.bx[i]!) / 2;
    const y = (g.ay[i]! + g.by[i]!) / 2;
    expect(hitTestGeometry(g, x, y)).toBe("l_flood");
  });
  it("nodes win over lines where both are under the point", () => {
    const [x, y] = nodeAt("j4"); // on the end of three lines
    expect(hitTestGeometry(g, x, y)).toBe("j4");
  });
  it("returns null over empty space", () => {
    expect(hitTestGeometry(g, 2, 2)).toBeNull();
  });
});

describe("pulses and flicker", () => {
  it("pulse phase stays within one spacing and advances with time", () => {
    for (const t of [0, 0.3, 5.7, 123.456]) {
      const p = pulsePhase(t);
      expect(p).toBeGreaterThanOrEqual(0);
      expect(p).toBeLessThan(PULSE_SPACING);
    }
    expect(pulsePhase(0.1)).toBeGreaterThan(pulsePhase(0));
  });
  it("pulse count fits the line", () => {
    expect(pulseCount(0, 0)).toBe(0);
    expect(pulseCount(100, 10)).toBe(Math.ceil(90 / PULSE_SPACING));
    expect(pulseCount(5, 10)).toBe(0);
  });
  it("flicker is bounded and varies", () => {
    const vals = new Set<number>();
    for (let i = 0; i < 200; i++) {
      const v = flicker(i * 0.05, 3);
      expect(v).toBeGreaterThanOrEqual(0.15);
      expect(v).toBeLessThanOrEqual(1);
      vals.add(Math.round(v * 100));
    }
    expect(vals.size).toBeGreaterThan(3);
  });
});

describe("the Relight (shrine circuit)", () => {
  const plan = planRelight(puzzle, wonState());
  const idx = (id: string) => puzzle.nodes.findIndex((n) => n.id === id);
  it("ignites flood before shrine", () => {
    expect(plan.lampOrder).toEqual(["flood", "shrine"]);
  });
  it("power spreads from the feed: each node is reached no earlier than its feeder", () => {
    expect(plan.nodeArrive[idx("feed")]).toBeLessThan(plan.nodeArrive[idx("j1")]!);
    expect(plan.nodeArrive[idx("j1")]).toBeLessThan(plan.nodeArrive[idx("j4")]!);
    expect(plan.nodeArrive[idx("j4")]).toBeLessThan(plan.nodeArrive[idx("flood")]!);
    expect(plan.nodeArrive[idx("flood")]).toBeLessThan(plan.nodeArrive[idx("shrine")]!);
  });
  it("unpowered parts are never reached", () => {
    expect(plan.nodeArrive[idx("street_1")]).toBe(Infinity);
    const li = puzzle.lines.findIndex((l) => l.id === "l_a");
    expect(plan.lineEnd[li]).toBe(Infinity);
  });
  it("a line starts where its feeder is reached and ends at its far node", () => {
    const li = puzzle.lines.findIndex((l) => l.id === "l_b2");
    expect(plan.lineStart[li]).toBeCloseTo(plan.nodeArrive[idx("j4")]!, 9);
    expect(plan.lineEnd[li]).toBeCloseTo(plan.nodeArrive[idx("j5")]!, 9);
  });
  it("runs 2-4 seconds", () => {
    expect(plan.duration).toBeGreaterThanOrEqual(2);
    expect(plan.duration).toBeLessThanOrEqual(4);
    expect(plan.duration).toBeGreaterThan(RELIGHT_TRAVEL_SECONDS);
  });
});

describe("battery helpers", () => {
  it("charge fraction is charge / capacity, clamped", () => {
    expect(chargeFraction(7, 10)).toBeCloseTo(0.7, 9);
    expect(chargeFraction(0, 10)).toBe(0);
    expect(chargeFraction(12, 10)).toBe(1);
    expect(chargeFraction(-1, 10)).toBe(0);
    expect(chargeFraction(5, 0)).toBe(0);
  });
  it("flat is released -> not released at charge 0 only", () => {
    expect(wentFlat(true, false, 0)).toBe(true);
    expect(wentFlat(true, false, 0.0004)).toBe(true);
    expect(wentFlat(true, false, 4)).toBe(false); // stopped early
    expect(wentFlat(true, true, 0)).toBe(false); // still released
    expect(wentFlat(false, false, 0)).toBe(false); // was already idle
    expect(wentFlat(false, true, 3)).toBe(false);
  });
  it("pop progress runs 0..1 then ends", () => {
    expect(popProgress(-0.1)).toBe(-1);
    expect(popProgress(0)).toBe(0);
    expect(popProgress(FLAT_POP_SECONDS / 2)).toBeCloseTo(0.5, 9);
    expect(popProgress(FLAT_POP_SECONDS)).toBe(-1);
  });
});

describe("render folder imports", () => {
  const dir = __dirname;
  const files = readdirSync(dir).filter((f) => f.endsWith(".ts") && !f.endsWith(".test.ts"));
  for (const f of files) {
    it(`${f} imports only core, grid types, and its own files`, () => {
      const src = readFileSync(join(dir, f), "utf8");
      const re = /^\s*(import|export)\s+(type\s+)?[^;]*?from\s+["']([^"']+)["']/gms;
      for (const m of src.matchAll(re)) {
        const spec = m[3]!;
        if (spec.startsWith("./")) continue;
        expect(["../core", "../grid"], `${f} imports ${spec}`).toContain(spec);
        if (spec === "../grid") expect(m[2], `${f}: ../grid must be a type import`).toBeTruthy();
      }
    });
  }
});
