import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { EventBus, loadPuzzle, type Puzzle } from "../core";
import { createGrid } from "../grid";
import { FLARE_SECONDS, RELIGHT_LEAD_SECONDS, RELIGHT_TRAVEL_SECONDS, planRelight } from "./relightplan";
import { createRelightClock, lampIgnition, lineFraction, nodeArrived } from "./relight3d";

const shrine: Puzzle = loadPuzzle(JSON.parse(readFileSync("puzzles/09-shrine-circuit.json", "utf8")));
function won() {
  const g = createGrid(shrine, new EventBus());
  g.throwSwitch("sw_1");
  g.repairAt("l_b");
  g.throwBreaker("br_street");
  return g;
}

describe("relight3d is pure", () => {
  it("imports nothing from three, play or render/index, and only types from grid", () => {
    const src = readFileSync("src/render3d/relight3d.ts", "utf8");
    const imports = [...src.matchAll(/^\s*import\s+([^;]*?)\s+from\s+["']([^"']+)["']/gms)].map((m) => ({ head: m[1]!, spec: m[2]! }));
    expect(imports.length).toBeGreaterThan(0);
    for (const i of imports) {
      expect(i.spec).not.toMatch(/three|play/);
      expect(i.spec).not.toMatch(/render\/index$|^\.\.\/render$/);
      if (/grid/.test(i.spec)) expect(i.head.startsWith("type ")).toBe(true);
    }
  });
});

describe("the same schedule as 2D", () => {
  const state = won().state();
  const plan = planRelight(shrine, state);
  const idx = (id: string): number => shrine.nodes.findIndex((n) => n.id === id);

  it("plans exactly what planRelight plans; flood then shrine; the farthest powered node (j_dead) at lead + travel; duration = the shrine's arrival + the flare", () => {
    expect(createRelightClock(shrine).update(state, 0)).toEqual(plan);
    expect(plan.lampOrder).toEqual(["flood", "shrine"]);
    // The ticket said the shrine is the farthest node. It is not: the powered dead end j_dead is, so it sets the pace.
    expect(plan.nodeArrive[idx("j_dead")]!).toBeCloseTo(RELIGHT_LEAD_SECONDS + RELIGHT_TRAVEL_SECONDS, 9);
    const shrineAt = plan.nodeArrive[idx("shrine")]!;
    expect(shrineAt).toBeGreaterThan(plan.nodeArrive[idx("flood")]!);
    expect(shrineAt).toBeLessThan(RELIGHT_LEAD_SECONDS + RELIGHT_TRAVEL_SECONDS);
    expect(plan.duration).toBeCloseTo(shrineAt + FLARE_SECONDS, 9);
  });

  it("ignites each lamp at the time main.ts's cues give (lampOrder mapped to nodeArrive), scanned in 1 ms steps", () => {
    const cues = plan.lampOrder.map((id) => plan.nodeArrive[idx(id)]!);
    plan.lampOrder.forEach((id, k) => {
      let first = -1;
      for (let ms = 0; ms <= 4000; ms++) {
        if (lampIgnition(plan, state, id, idx(id), ms / 1000).on) {
          first = ms / 1000;
          break;
        }
      }
      expect(Math.abs(first - cues[k]!), id).toBeLessThan(1e-3 + 1e-9);
    });
    // A lamp that is not lit never ignites, and flareAge counts from the arrival.
    expect(lampIgnition(plan, state, "street_1", idx("street_1"), 5).on).toBe(false);
    const a = plan.nodeArrive[idx("flood")]!;
    expect(lampIgnition(plan, state, "flood", idx("flood"), a + 0.1).flareAge).toBeCloseTo(0.1, 9);
    expect(lampIgnition(plan, state, "flood", idx("flood"), a - 0.01).flareAge).toBe(-1);
  });

  it("nodeArrived follows the plan", () => {
    const f = idx("feed");
    expect(nodeArrived(plan, f, RELIGHT_LEAD_SECONDS - 0.01)).toBe(false);
    expect(nodeArrived(plan, f, RELIGHT_LEAD_SECONDS)).toBe(true);
    expect(nodeArrived(plan, idx("street_1"), 99)).toBe(false);
  });
});

describe("the clock's rules", () => {
  it("keeps one plan for a whole Relight, ends at the duration, and plans again after a reset", () => {
    const g = won();
    const clock = createRelightClock(shrine);
    const a = clock.update(g.state(), 0)!;
    expect(clock.update(g.state(), 1.3)).toBe(a);
    // A state change mid-Relight does not re-plan.
    g.reset();
    expect(clock.update(g.state(), 1.4)).toBe(a);
    expect(clock.update(g.state(), a.duration)).toBeNull();
    expect(clock.update(g.state(), undefined)).toBeNull();
    // The reset state is the start state: planning now gives a different plan.
    const b = clock.update(g.state(), 0)!;
    expect(b).not.toBe(a);
    expect(b.lampOrder).not.toEqual(a.lampOrder);
  });
});

describe("lineFraction", () => {
  const state = won().state();
  const plan = planRelight(shrine, state);
  const li = (id: string): number => shrine.lines.findIndex((l) => l.id === id);

  it("l_feed: 0 through the lead, 1 at its end, never going back between", () => {
    const i = li("l_feed");
    expect(lineFraction(plan, i, 0)).toBe(0);
    expect(lineFraction(plan, i, RELIGHT_LEAD_SECONDS)).toBe(0);
    expect(lineFraction(plan, i, plan.lineEnd[i]!)).toBe(1);
    let prev = 0;
    for (let t = 0; t <= plan.duration; t += 0.01) {
      const f = lineFraction(plan, i, t);
      expect(f).toBeGreaterThanOrEqual(prev);
      prev = f;
    }
    expect(lineFraction(plan, i, (plan.lineStart[i]! + plan.lineEnd[i]!) / 2)).toBeCloseTo(0.5, 9);
  });

  it("a line that is not powered stays 0", () => {
    for (const id of ["l_st1", "l_s2", "l_a"]) for (const t of [0, 1, 3, 99]) expect(lineFraction(plan, li(id), t), id).toBe(0);
  });
});
