import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { BEAT, loadPuzzle } from "../core";
import type { GridState } from "../grid";
import { createMapRenderer } from "./map-renderer";
import * as motion from "./motion";
import { PULSE_SPACING, PULSE_SPEED, pulsePhase } from "./motion";

const puzzle = loadPuzzle(JSON.parse(readFileSync(join(__dirname, "..", "..", "puzzles", "09-shrine-circuit.json"), "utf8")));

/** Only l_feed (feed <-> br_main) is live; `source` is the end the current comes from. */
function liveState(source: "feed" | "br_main"): GridState {
  return {
    powered: new Set(["feed", "br_main", "l_feed"]),
    flowFrom: new Map([["l_feed", source]]),
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

interface Chev { tipX: number; tipY: number; baseX: number; baseY: number; cx: number; cy: number }

/** Chevrons of the one live line at time t. Each is 4 points: tip, back-left, notch, back-right. */
function frame(source: "feed" | "br_main", t: number): Chev[] {
  const out: number[][] = [];
  createMapRenderer(fakeCanvas(out), puzzle).draw(liveState(source), {} as never, t);
  expect(out.length).toBe(1);
  const p = out[0]!;
  const res: Chev[] = [];
  for (let i = 0; i + 7 < p.length; i += 8) {
    const tipX = p[i]!, tipY = p[i + 1]!;
    const nx = p[i + 4]!, ny = p[i + 5]!; // notch: centre - u
    const ux = (tipX - nx) / 8, uy = (tipY - ny) / 8;
    res.push({ tipX, tipY, baseX: nx, baseY: ny, cx: nx + ux, cy: ny + uy });
  }
  return res;
}

const dist = (ax: number, ay: number, bx: number, by: number): number => Math.hypot(ax - bx, ay - by);

describe("chevrons flow steadily (ticket 034 B)", () => {
  const times = [0, 0.05, BEAT.at(0), BEAT.at(1), BEAT.at(7), BEAT.at(30) + BEAT.period * 0.1, BEAT.at(30) + BEAT.period * 0.5, 12.345, 100.77];

  for (const source of ["feed", "br_main"] as const) {
    // At t = 0 the first chevron's centre sits on the source end.
    const src = frame(source, 0)[0]!;

    it(`first chevron sits at pulsePhase(t) from the source end (source ${source})`, () => {
      for (const t of times) {
        const c = frame(source, t)[0]!;
        expect(dist(c.cx, c.cy, src.cx, src.cy)).toBeCloseTo(pulsePhase(t), 6);
      }
    });

    it(`advances by dt * PULSE_SPEED between frames, with no surge (source ${source})`, () => {
      const dt = 1 / 60;
      expect(dt * PULSE_SPEED).toBeLessThan(PULSE_SPACING);
      for (const t of times) {
        const a = frame(source, t)[0]!;
        const b = frame(source, t + dt)[0]!;
        const da = dist(a.cx, a.cy, src.cx, src.cy);
        const db = dist(b.cx, b.cy, src.cx, src.cy);
        const step = (((db - da) % PULSE_SPACING) + PULSE_SPACING) % PULSE_SPACING;
        expect(step).toBeCloseTo(dt * PULSE_SPEED, 6);
      }
      // equal steps across a beat boundary and mid-beat
      const step = (t: number): number => pulsePhase(t + 0.01) - pulsePhase(t);
      expect(step(BEAT.at(5) - 0.005)).toBeCloseTo(0.01 * PULSE_SPEED, 9);
    });

    it(`each tip is farther from the source than its base, and chevrons move away as t grows (source ${source})`, () => {
      for (const t of times) {
        for (const c of frame(source, t)) {
          expect(dist(c.tipX, c.tipY, src.cx, src.cy)).toBeGreaterThan(dist(c.baseX, c.baseY, src.cx, src.cy));
        }
      }
      let prev = -1;
      for (let k = 0; k < 20; k++) {
        const t = k * 0.01; // 0.9 px per step, under one spacing: no wrap
        const c = frame(source, t)[0]!;
        const d = dist(c.cx, c.cy, src.cx, src.cy);
        expect(d).toBeGreaterThan(prev);
        prev = d;
      }
    });
  }

  it("the two sources flow in opposite screen directions", () => {
    const a = frame("feed", 0.2)[0]!;
    const b = frame("br_main", 0.2)[0]!;
    expect(Math.sign(a.tipX - a.baseX)).toBe(-Math.sign(b.tipX - b.baseX));
  });
});

describe("no beat clock in render", () => {
  const dir = __dirname;
  const sources = readdirSync(dir).filter((f) => f.endsWith(".ts") && !f.endsWith(".test.ts"));
  // Built from pieces so this file does not match itself.
  const banned = new RegExp(["\\bBE" + "AT\\b", "beat" + "Clock", "beat" + "PulsePhase", "ease" + "OutCubic", "PULSE_" + "BEAT"].join("|"));

  it("no render source references the beat clock or its helpers", () => {
    expect(sources).toContain("map-renderer.ts");
    for (const f of sources) expect(readFileSync(join(dir, f), "utf8"), f).not.toMatch(banned);
  });

  it("motion.ts no longer exports the beat helpers", () => {
    const m = motion as Record<string, unknown>;
    expect(m["beat" + "PulsePhase"]).toBeUndefined();
    expect(m["ease" + "OutCubic"]).toBeUndefined();
    expect(m["PULSE_" + "BEAT_STEPS"]).toBeUndefined();
    expect(typeof m["pulsePhase"]).toBe("function");
  });
});
