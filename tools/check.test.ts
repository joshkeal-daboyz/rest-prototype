import { describe, expect, it } from "vitest";
import { mkdtempSync, writeFileSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { parseCheckBlock, validateCheck, validatePuzzle } from "../src/core";
import type { Puzzle, PuzzleCheck } from "../src/core";
import { checkFile, noteFor, puzzlesWithBlocks, PUZZLES_DIR } from "./check";
import { firstDifference, runCheck } from "./checkrun";

const load = (name: string): Puzzle => {
  const r = validatePuzzle(JSON.parse(readFileSync(join(PUZZLES_DIR, `${name}.json`), "utf8")) as unknown);
  if (!r.ok) throw new Error(r.errors.join("\n"));
  return r.puzzle;
};

// A check block for 09-shrine-circuit, as test data (the note itself has none).
const SHRINE: PuzzleCheck = {
  solution: ["sw_1", "repair:l_b", "br_street"],
  traps: [
    {
      name: "reroute without shedding",
      moves: ["sw_1", "repair:l_b"],
      expect: { brownout: true, complete: false, lit: ["shrine", "flood"] },
      recover: ["br_street"],
    },
    {
      name: "the dead junction is not mendable with one wire",
      moves: [],
      expect: { readable: ["f1"], complete: false },
      recover: ["sw_1", "repair:l_b", "br_street"],
    },
  ],
};

describe("D1: the check replay on 09-shrine-circuit (test data, not the note)", () => {
  it("the block validates against the puzzle", () => {
    expect(validateCheck(SHRINE, load("09-shrine-circuit")).ok).toBe(true);
  });

  it("the intended solution wins; the report has clicks, parts used and each feed's load against capacity", () => {
    const r = runCheck(load("09-shrine-circuit"), SHRINE);
    expect(r.ok).toBe(true);
    expect(r.solution.complete).toBe(true);
    expect(r.solution.clicks).toBe(3);
    expect(r.solution.partsUsed).toEqual(["wire"]);
    expect(r.solution.feeds).toEqual([{ id: "feed", load: 3, capacity: 4 }]);
  });

  it("every trap's expect held and its recovery wins", () => {
    const r = runCheck(load("09-shrine-circuit"), SHRINE);
    expect(r.traps.map((t) => [t.name, t.expectHeld, t.recovered])).toEqual([
      ["reroute without shedding", true, true],
      ["the dead junction is not mendable with one wire", true, true],
    ]);
  });

  it("a wrong solution that is legal but does not win fails, and the report says it did not complete", () => {
    const r = runCheck(load("09-shrine-circuit"), { solution: ["sw_1", "repair:l_b"] });
    expect(r.ok).toBe(false);
    expect(r.solution.complete).toBe(false);
    expect(r.solution.failure).toMatch(/does not complete the job after 2 moves/);
    expect(r.solution.failure).toMatch(/BROWNOUT/);
  });

  it("a wrong solution with a refused move fails naming that move", () => {
    const r = runCheck(load("09-shrine-circuit"), { solution: ["repair:l_b", "sw_1", "br_street"] });
    expect(r.ok).toBe(false);
    expect(r.solution.failure).toMatch(/move 1 "repair:l_b".*not readable/);
  });

  it("firstDifference names the first move whose state differs from the intended solution", () => {
    const p = load("09-shrine-circuit");
    const d = firstDifference(p, SHRINE.solution, ["sw_1", "br_street", "repair:l_b"]);
    expect(d).toEqual({ move: 2, expected: "repair:l_b", actual: "br_street" });
    expect(firstDifference(p, SHRINE.solution, SHRINE.solution)).toBeNull();
  });

  it("a trap whose expect does not hold is reported with the mismatch", () => {
    const r = runCheck(load("09-shrine-circuit"), {
      solution: SHRINE.solution,
      traps: [{ name: "wrong claim", moves: ["sw_1", "repair:l_b"], expect: { brownout: false, lit: ["street_1"] }, recover: ["br_street"] }],
    });
    expect(r.ok).toBe(false);
    expect(r.traps[0]!.expectHeld).toBe(false);
    expect(r.traps[0]!.mismatches.join("\n")).toMatch(/brownout: expected false, got true/);
    expect(r.traps[0]!.recovered).toBe(true);
  });

  it("a trap whose recovery does not win fails", () => {
    const r = runCheck(load("09-shrine-circuit"), {
      solution: SHRINE.solution,
      traps: [{ name: "no way out", moves: ["sw_1", "repair:l_b"], expect: { brownout: true }, recover: ["wait:1"] }],
    });
    expect(r.ok).toBe(false);
    expect(r.traps[0]!.recovered).toBe(false);
    expect(r.traps[0]!.failure).toMatch(/recovery does not complete/);
  });

  it("a trap that already wins with an empty recover passes (the state already wins)", () => {
    const r = runCheck(load("09-shrine-circuit"), {
      solution: SHRINE.solution,
      traps: [{ name: "already there", moves: SHRINE.solution, expect: {}, recover: [] }],
    });
    expect(r.traps[0]!.recovered).toBe(true);
  });
});

describe("D1: the click and time rules", () => {
  const S61 = ["sw_b", "rC", "wait:4", "sw_b", "cell", "rA", "rB", "br_R", "repair:shrine"];

  it("each click is followed by clickSeconds (default 1) and wait adds none: 61 wins at 1 s and 1.5 s a click, not at 5 s", () => {
    const p = load("61-charge-it-first");
    expect(runCheck(p, { solution: S61 }).ok).toBe(true);
    expect(runCheck(p, { clickSeconds: 1.5, solution: S61 }).ok).toBe(true);
    const slow = runCheck(p, { clickSeconds: 5, solution: S61 });
    expect(slow.ok).toBe(false);
    expect(slow.solution.failure).toMatch(/move 6 "rA"/);
  });

  it("wait:N advances exactly N: without the 4 s wait the cell is not charged and the run does not win", () => {
    const p = load("61-charge-it-first");
    const r = runCheck(p, { solution: S61.filter((m) => m !== "wait:4") });
    expect(r.ok).toBe(false);
  });

  it("a fuse that blows is seen: feeding fb_R before rB moves blows it; undo recovers", () => {
    const p = load("61-charge-it-first");
    const early = ["sw_b", "rC", "wait:4", "sw_b", "cell", "rA", "br_R"];
    const r = runCheck(p, {
      solution: S61,
      traps: [
        { name: "feed early", moves: early, expect: { blown: ["fb_R"], readable: ["blown-fb_R"] }, recover: ["undo", "rB", "br_R", "repair:shrine"] },
        { name: "feed early, wrong blown claim", moves: early, expect: { blown: ["fb_C"] }, recover: ["undo", "rB", "br_R", "repair:shrine"] },
      ],
    });
    expect(r.traps[0]!.expectHeld).toBe(true);
    expect(r.traps[0]!.recovered).toBe(true);
    expect(r.traps[1]!.expectHeld).toBe(false);
    expect(r.traps[1]!.mismatches.join()).toMatch(/blown: expected \[fb_C\], got \[fb_R\]/);
  });

  it("repair:<fusebox> mends a fuse that blew in play (spends the fuse part)", () => {
    const p = load("61-charge-it-first");
    const r = runCheck(p, {
      solution: S61,
      traps: [{ name: "mend the blown fuse", moves: ["sw_b", "rC", "wait:4", "sw_b", "cell", "rA", "br_R", "rB"], expect: { blown: ["fb_R"], readable: ["blown-fb_R"], complete: false }, recover: ["repair:fb_R", "repair:shrine"] }],
    });
    expect(r.traps[0]!.failure).toBeUndefined();
    expect(r.traps[0]!.expectHeld).toBe(true);
    expect(r.traps[0]!.recovered).toBe(true);
  });
});

describe("D1: files and the CLI", () => {
  const dir = mkdtempSync(join(tmpdir(), "rest-check-"));
  const shrine = readFileSync(join(PUZZLES_DIR, "09-shrine-circuit.json"), "utf8");
  const note = (block: unknown) => "# note\n\n```check\n" + JSON.stringify(block, null, 2) + "\n```\n";

  it("noteFor maps x.json and x.grid.json to x.md", () => {
    expect(noteFor("a/b/09-shrine-circuit.json")).toBe("a/b/09-shrine-circuit.md");
    expect(noteFor("a/lamp-row.grid.json")).toBe("a/lamp-row.md");
  });

  it("checkFile reads the note beside the map and replays its block", () => {
    writeFileSync(join(dir, "m.json"), shrine);
    writeFileSync(join(dir, "m.md"), note(SHRINE));
    const r = checkFile(join(dir, "m.json"));
    expect(r.status).toBe("checked");
    if (r.status === "checked") {
      expect(r.report.ok).toBe(true);
      expect(r.lines.join("\n")).toMatch(/PASS m[\s\S]*solution: complete, 3 clicks, parts used wire/);
    }
  });

  it("a note with no block is no-block; with no note, no-note; with a block that does not validate, invalid", () => {
    writeFileSync(join(dir, "n.json"), shrine);
    expect(checkFile(join(dir, "n.json")).status).toBe("no-note");
    writeFileSync(join(dir, "n.md"), "# nothing here\n");
    expect(checkFile(join(dir, "n.json")).status).toBe("no-block");
    writeFileSync(join(dir, "n.md"), note({ solution: ["feed"] }));
    const r = checkFile(join(dir, "n.json"));
    expect(r.status).toBe("invalid");
    if (r.status === "invalid") expect(r.errors.join()).toMatch(/feed is a feed/);
  });

  const cli = (...args: string[]) =>
    spawnSync(process.execPath, [join(PUZZLES_DIR, "..", "node_modules", "tsx", "dist", "cli.mjs"), join(PUZZLES_DIR, "..", "tools", "check.ts"), ...args], { encoding: "utf8" });

  it("the CLI exits 0 on a passing block and non-zero on a failing one, printing the report", () => {
    writeFileSync(join(dir, "ok.json"), shrine);
    writeFileSync(join(dir, "ok.md"), note(SHRINE));
    const good = cli(join(dir, "ok.json"));
    expect(good.status).toBe(0);
    expect(good.stdout).toMatch(/PASS ok/);

    writeFileSync(join(dir, "bad.json"), shrine);
    writeFileSync(join(dir, "bad.md"), note({ solution: ["sw_1", "repair:l_b"] }));
    const bad = cli(join(dir, "bad.json"));
    expect(bad.status).not.toBe(0);
    expect(bad.stdout).toMatch(/FAIL bad[\s\S]*NOT complete/);
  }, { timeout: 60000 });

  it("naming a map whose note has no block exits non-zero", () => {
    writeFileSync(join(dir, "none.json"), shrine);
    writeFileSync(join(dir, "none.md"), "# nothing\n");
    expect(cli(join(dir, "none.json")).status).not.toBe(0);
  }, { timeout: 60000 });

  it("npm run check is wired to tools/check.ts", () => {
    const pkg = JSON.parse(readFileSync(join(PUZZLES_DIR, "..", "package.json"), "utf8")) as { scripts: Record<string, string> };
    expect(pkg.scripts["check"]).toBe("tsx tools/check.ts");
  });
});

describe("D1 in the gate: every design note in puzzles/ that has a check block replays and passes", () => {
  const files = puzzlesWithBlocks();
  it("the finder only returns notes that have a block (none yet is fine)", () => {
    for (const f of files) {
      expect(parseCheckBlock(readFileSync(f.replace(/\.grid\.json$|\.json$/, ".md"), "utf8"))).not.toBeNull();
    }
  });
  for (const f of files) {
    it(f, () => {
      const r = checkFile(f);
      expect(r.status, r.status === "invalid" ? r.errors.join("\n") : "").toBe("checked");
      if (r.status === "checked") expect(r.report.ok, r.lines.join("\n")).toBe(true);
    });
  }
});
