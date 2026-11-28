import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { PUZZLES_DIR } from "./check";
import { formatAnalysis, loadCityPuzzle, loadPuzzle, withoutHidden } from "./analyze";
import { analyzePuzzle, DEFAULT_CAP } from "./analyzerun";
import { replayMoves } from "./checkrun";
import type { GridNode, Puzzle } from "../src/core";

const FIXTURES = join(PUZZLES_DIR, "fixtures");
const load = (name: string) => loadPuzzle(join(FIXTURES, `${name}.json`));

describe("D2: tools/analyze.ts is the npm run analyze script", () => {
  it("package.json points analyze at tools/analyze.ts, and the default cap is 500 000 states", () => {
    const pkg = JSON.parse(readFileSync(join(PUZZLES_DIR, "..", "package.json"), "utf8")) as { scripts: Record<string, string> };
    expect(pkg.scripts["analyze"]).toBe("tsx tools/analyze.ts");
    expect(DEFAULT_CAP).toBe(500_000);
  });
});

describe("D2: the numbers on small maps equal the notes and the ladder", () => {
  it("06-the-spark: 3 clicks, 1 winning configuration, 5 reachable states, no dead ends (its note)", () => {
    const r = analyzePuzzle(load("06-the-spark"));
    expect(r.exhaustive).toBe(true);
    expect(r.solvable).toBe(true);
    expect(r.minClicks).toBe(3);
    expect(r.winningConfigs).toBe(1);
    expect(r.states).toBe(5);
    expect(r.deadStates).toBe(0);
    expect(r.win?.moves.at(-1)).toBe("repair:l_lane");
    expect(r.win?.partsUsed).toEqual(["wire"]);
    expect(r.win?.feeds).toEqual([{ id: "feed", load: 1, capacity: 3 }]);
  });

  it("06-the-spark: the two shortest orders (br_main and sw_1 in either order) are counted", () => {
    expect(analyzePuzzle(load("06-the-spark")).winningOrders).toBe(2);
  });

  it("09-shrine-circuit: 3 clicks, 1 winning configuration, 1 wire spent, load 3 of 4 (its note)", () => {
    const r = analyzePuzzle(load("09-shrine-circuit"));
    expect(r.minClicks).toBe(3);
    expect(r.winningConfigs).toBe(1);
    expect(r.win?.partsUsed).toEqual(["wire"]);
    expect(r.win?.feeds).toEqual([{ id: "feed", load: 3, capacity: 4 }]);
    expect(r.blowOnShortestWin).toEqual([]);
  });

  it("a battery map: 20-battery-run is solvable in 4 clicks (3 waits at 0.5 s), as the ladder says", () => {
    const r = analyzePuzzle(load("20-battery-run"));
    expect(r.exhaustive).toBe(true);
    expect(r.minClicks).toBe(4);
    expect(r.win?.waits).toBe(3);
    expect(r.win?.moves.filter((m) => m.startsWith("wait:"))).toEqual(["wait:0.5", "wait:0.5", "wait:0.5"]);
  }, 30_000);
});

describe("D2: what it reports", () => {
  it("dead-end share and the first moves that lead only to dead ends (16: some first move cannot win)", () => {
    const r = analyzePuzzle(load("16-behind-the-first"));
    expect(r.deadShare).toBeCloseTo(4 / 9, 9);
    expect(r.deadStates).toBe(4);
    for (const m of r.deadFirstMoves!) expect(r.firstMoves).toContain(m);
  }, { timeout: 60000 });

  it("a fuse that can blow is reported as blowing somewhere, and not on the shortest win (11-the-small-fuse)", () => {
    const r = analyzePuzzle(load("11-the-small-fuse"));
    expect(r.blowAnywhere).toContain("fb_1");
    expect(r.blowOnShortestWin).toEqual([]);
  }, { timeout: 60000 });

  it("a map that cannot be won says so: not solvable, no min clicks, and every state is dead", () => {
    const p = { ...load("06-the-spark"), startingParts: [] };
    const r = analyzePuzzle(p);
    expect(r.exhaustive).toBe(true);
    expect(r.solvable).toBe(false);
    expect(r.minClicks).toBeNull();
    expect(r.deadShare).toBe(1);
    expect(r.win).toBeNull();
  });

  it("the report prints the numbers, and the same map prints the same text every time", () => {
    const a = formatAnalysis(analyzePuzzle(load("11-the-small-fuse")));
    const b = formatAnalysis(analyzePuzzle(load("11-the-small-fuse")));
    expect(a).toEqual(b);
    expect(a.join("\n")).toMatch(/min clicks: 3/);
    expect(a.join("\n")).toMatch(/dead-end states/);
  });
});

describe("D2: stepping back with Undo gives the same answers as replaying every state", () => {
  for (const name of ["11-the-small-fuse", "16-behind-the-first", "city-two-ways-round"]) {
    it(name, () => {
      const p = load(name);
      expect(analyzePuzzle(p)).toEqual(analyzePuzzle(p, { replayOnly: true }));
    });
  }
});

describe("D2: past the cap it proves a lower bound", () => {
  it("49 with cap 1000: exhaustive false, a lower bound below the note's 11 clicks, and no dead-end share", () => {
    const r = analyzePuzzle(load("49-two-cells"), { cap: 1000 });
    expect(r.exhaustive).toBe(false);
    expect(r.states).toBe(1000);
    expect(r.noWinBelow).not.toBeNull();
    expect(r.noWinBelow!).toBeGreaterThan(0);
    expect(r.noWinBelow!).toBeLessThanOrEqual(11);
    expect(r.minClicks).toBeNull();
    expect(r.deadShare).toBeNull();
    expect(r.deadFirstMoves).toBeNull();
    expect(formatAnalysis(r).join("\n")).toMatch(/no win in fewer than \d+ clicks/);
  }, 60_000);

  it("a cap that cuts a small map short still never claims a win below the true minimum", () => {
    const p = load("10-around-the-dead-post"); // 4 clicks, 16 states
    for (const cap of [1, 3, 6, 10, 15]) {
      const r = analyzePuzzle(p, { cap });
      expect(r.exhaustive).toBe(false);
      expect(r.noWinBelow!).toBeLessThanOrEqual(4);
      if (r.minClicks !== null) expect(r.minClicks).toBe(4);
    }
    expect(analyzePuzzle(p, { cap: 16 }).exhaustive).toBe(true);
  }, { timeout: 60000 });
});

describe("081 N0: npm run analyze reads a city puzzle on its conversion", () => {
  it("P0 on the city: a win with the schematic's fewest clicks, and no hidden scenery id in the report's lists", () => {
    const c = loadCityPuzzle(join(FIXTURES, "city-two-ways-round.city.json"));
    const r = withoutHidden(analyzePuzzle(c.puzzle), c.hidden);
    expect(c.hidden.size).toBeGreaterThan(0);
    expect(r.solvable).toBe(true);
    expect(r.minClicks).toBe(analyzePuzzle(load("city-two-ways-round")).minClicks);
    const listed = [...r.firstMoves, ...(r.deadFirstMoves ?? []), ...r.blowAnywhere, ...(r.win?.moves ?? [])];
    expect(listed.filter((m) => c.hidden.has(m.slice(m.indexOf(":") + 1)))).toEqual([]);
  }, { timeout: 60000 });
});

/**
 * 081 TB2: a lamp behind a timed breaker whose window opens at t = 4 s (closed 2 s of every 6, offset 2), with two damaged cables past it and two wires. `br` is the move that starts the clock.
 * At 1 s a click the window holds both repairs; at 3 s a click it holds one, so the second waits for the next window.
 */
const WINDOWED: Puzzle = {
  id: "windowed",
  name: "windowed",
  version: 4,
  scope: "map",
  capacity: null,
  nodes: [
    { id: "feed", type: "feed" },
    { id: "br", type: "breaker", closed: true },
    { id: "lx", type: "lamp", load: 0 },
    { id: "tb", type: "breaker", closed: false, timer: { closed: 2, open: 4, offset: 2 } },
    { id: "l1", type: "lamp" },
    { id: "l2", type: "lamp" },
  ].map((n, i) => ({ pos: [i, 0], ...n }) as unknown as GridNode),
  lines: [
    { id: "l_br", from: "feed", to: "br" }, { id: "l_x", from: "br", to: "lx" }, { id: "l_t", from: "feed", to: "tb" },
    { id: "d1", from: "tb", to: "l1" }, { id: "d2", from: "tb", to: "l2" },
  ],
  faults: [{ id: "f1", at: "d1", kind: "damaged-cable" }, { id: "f2", at: "d2", kind: "damaged-cable" }],
  target: ["l1", "l2"],
  startingParts: ["wire", "wire"],
};

describe("081 TB2: the analyzer on a timed map", () => {
  it("offers waits and never clicks the timed breaker; finds the win that needs the window, with its waits; a slower click needs more waits; the check replays it", () => {
    const fast = analyzePuzzle(WINDOWED, { clickSeconds: 1 });
    expect(fast.exhaustive).toBe(true);
    expect(fast.firstMoves).not.toContain("tb");
    expect(fast.win).toMatchObject({ clicks: 3, waits: 6 });
    expect(fast.win!.moves).toEqual(["br", ...Array<string>(6).fill("wait:0.5"), "repair:d1", "repair:d2"]);
    expect(replayMoves(WINDOWED, fast.win!.moves)).toMatchObject({ state: { complete: true } });
    const slow = analyzePuzzle(WINDOWED, { clickSeconds: 3 });
    expect(slow.solvable).toBe(true);
    expect(slow.win!.waits).toBeGreaterThan(fast.win!.waits);
    expect(analyzePuzzle(WINDOWED, { clickSeconds: 1 })).toEqual(fast); // the same run prints the same report
  });
});
