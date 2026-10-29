import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { PUZZLES_DIR } from "./check";
import { formatAnalysis, loadPuzzle } from "./analyze";
import { analyzePuzzle, DEFAULT_CAP } from "./analyzerun";

const load = (name: string) => loadPuzzle(join(PUZZLES_DIR, `${name}.json`));

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

  it("01 = 1, 02 = 2, 09 = 3 clicks (the ladder table)", () => {
    expect(analyzePuzzle(load("01-first-light")).minClicks).toBe(1);
    expect(analyzePuzzle(load("02-this-way-or-that")).minClicks).toBe(2);
    expect(analyzePuzzle(load("09-shrine-circuit")).minClicks).toBe(3);
  });

  it("every map without a battery that the search finishes under 300 states has the README ladder's min clicks", () => {
    const readme = readFileSync(join(PUZZLES_DIR, "README.md"), "utf8");
    const want = new Map<string, number>();
    for (const m of readme.matchAll(/^\| (\d\d) \|.*\| (\d+) \|$/gm)) want.set(m[1]!, Number(m[2]));
    let checked = 0;
    for (const f of readdirSync(PUZZLES_DIR).filter((x) => /^\d\d-.*\.json$/.test(x))) {
      const p = load(f.replace(/\.json$/, ""));
      if (p.nodes.some((n) => n.type === "battery")) continue;
      const r = analyzePuzzle(p, { cap: 300 });
      if (!r.exhaustive) continue;
      expect(r.minClicks, f).toBe(want.get(f.slice(0, 2)));
      checked++;
    }
    expect(checked).toBeGreaterThan(20);
  }, 60_000);

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
  });

  it("a fuse that can blow is reported as blowing somewhere, and not on the shortest win (11-the-small-fuse)", () => {
    const r = analyzePuzzle(load("11-the-small-fuse"));
    expect(r.blowAnywhere).toContain("fb_1");
    expect(r.blowOnShortestWin).toEqual([]);
  });

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
  for (const name of ["07-past-the-fuse", "11-the-small-fuse", "13-one-box-three-lamps", "14-ring-from-the-east"]) {
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
  });
});
