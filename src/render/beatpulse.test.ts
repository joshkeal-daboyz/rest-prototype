import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { BEAT, loadPuzzle } from "../core";
import type { GridState } from "../grid";
import { createMapRenderer } from "./map-renderer";
import { PULSE_BEAT_STEPS, PULSE_SPACING, beatPulsePhase, easeOutCubic, pulsePhase } from "./motion";

const EPS = 1e-9;

describe("beatPulsePhase follows the shared clock", () => {
  it("ease is 0 at 0, 1 at 1, monotonic", () => {
    expect(easeOutCubic(0)).toBe(0);
    expect(easeOutCubic(1)).toBe(1);
    let prev = -1;
    for (let i = 0; i <= 100; i++) {
      const v = easeOutCubic(i / 100);
      expect(v).toBeGreaterThanOrEqual(prev);
      prev = v;
    }
  });

  it("is 0 on every beat and always in [0, spacing)", () => {
    for (let i = 0; i < 200; i++) expect(beatPulsePhase(BEAT.at(i))).toBeCloseTo(0, 6);
    for (let k = 0; k < 2000; k++) {
      const p = beatPulsePhase(k * 0.0137);
      expect(p).toBeGreaterThanOrEqual(0);
      expect(p).toBeLessThan(PULSE_SPACING);
    }
  });

  it("rises monotonically through each beat and is continuous across the boundary", () => {
    expect(PULSE_BEAT_STEPS).toBe(1);
    for (const i of [0, 1, 7, 100]) {
      let prev = -1;
      for (let s = 0; s < 200; s++) {
        const p = beatPulsePhase(BEAT.at(i) + (s / 200) * BEAT.period);
        expect(p).toBeGreaterThanOrEqual(prev);
        prev = p;
      }
      const below = beatPulsePhase(BEAT.at(i + 1) - 1e-7);
      expect(Math.min(below, PULSE_SPACING - below)).toBeLessThan(1e-3); // limit from below is one spacing, 0 mod spacing
      expect(beatPulsePhase(BEAT.at(i + 1)) % PULSE_SPACING).toBeLessThan(1e-3);
    }
  });

  it("is front-loaded: more than half a spacing in the first third of a beat", () => {
    for (const i of [0, 3, 50]) expect(beatPulsePhase(BEAT.at(i) + BEAT.period / 3)).toBeGreaterThan(PULSE_SPACING / 2);
  });

  it("is a pure function of t, equal to what the clock says", () => {
    for (const t of [0.3, 12.7, 600.123]) {
      expect(beatPulsePhase(t)).toBe(beatPulsePhase(t));
      expect(beatPulsePhase(t)).toBeCloseTo(easeOutCubic(BEAT.phase(t)) * PULSE_SPACING, 9);
    }
  });

  it("pulsePhase keeps its old behaviour", () => {
    expect(pulsePhase(0)).toBe(0);
    expect(pulsePhase(0.1)).toBeGreaterThan(pulsePhase(0));
  });
});

// ---- the draw uses it: fake canvas ----
const puzzle = loadPuzzle(JSON.parse(readFileSync(join(__dirname, "..", "..", "puzzles", "08-shrine-circuit.json"), "utf8")));

function liveState(): GridState {
  return {
    powered: new Set(["feed", "br_main", "l_feed", "l_main"]),
    flowFrom: new Map([["l_feed", "feed"], ["l_main", "br_main"]]),
    lit: new Set(),
    readableFaults: new Set(),
    sparking: new Set(),
    fuseLoad: new Map(),
    wouldBlow: new Map(),
    faults: [],
    breakers: new Map([["br_main", true]]),
    switches: new Map<string, 0 | 1>(),
    batteries: new Map(),
    parts: [],
    targets: [],
    feeds: new Map(),
    feedOf: new Map(),
    load: 0,
    capacity: 4,
    brownout: false,
    complete: false,
    actions: 0,
  } as unknown as GridState;
}

/** Records the points of every path filled with the pulse colour. */
function fakeCanvas(chevrons: number[][]): HTMLCanvasElement {
  let path: number[] = [];
  const state: Record<string, unknown> = {};
  const ctx: unknown = new Proxy(state, {
    get(target, prop: string) {
      if (prop in target) return target[prop];
      if (prop === "beginPath") return () => { path = []; };
      if (prop === "moveTo" || prop === "lineTo") return (x: number, y: number) => { path.push(x, y); };
      if (prop === "fill") return () => { if (target["fillStyle"] === "#e6fbff") chevrons.push(path.slice()); };
      if (prop === "measureText") return () => ({ width: 10 });
      if (prop === "createLinearGradient" || prop === "createRadialGradient") return () => ({ addColorStop() {} });
      return () => undefined;
    },
    set(target, prop: string, v) { target[prop] = v; return true; },
  });
  return { getContext: () => ctx, clientWidth: 800, clientHeight: 600, width: 0, height: 0, addEventListener() {}, style: {} } as unknown as HTMLCanvasElement;
}

describe("the draw uses beatPulsePhase", () => {
  const frame = (t: number): number[][] => {
    const out: number[][] = [];
    const r = createMapRenderer(fakeCanvas(out), puzzle);
    r.draw(liveState(), {} as never, t);
    return out;
  };
  it("chevron positions at t and t + one beat are identical, and differ mid-beat", () => {
    const t = 5.31;
    const a = frame(t);
    const b = frame(t + BEAT.period);
    expect(a.length).toBeGreaterThan(0);
    expect(b.length).toBe(a.length);
    a.forEach((p, i) => p.forEach((v, j) => expect(Math.abs(v - b[i]![j]!)).toBeLessThan(1e-6 + EPS)));
    const c = frame(t + BEAT.period * 0.1);
    expect(c.flat().join()).not.toBe(a.flat().join());
  });
});
