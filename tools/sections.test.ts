import { describe, expect, it } from "vitest";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { validateCheck, validatePuzzle } from "../src/core";
import type { CheckLink, Puzzle, PuzzleCheck } from "../src/core";
import { PUZZLES_DIR } from "./check";
import { loadPuzzle, sectionsForFile } from "./analyze";
import { analyzePuzzle } from "./analyzerun";
import { analyzeSections, buildSectionPuzzles, formatSections } from "./sectionrun";

function valid(json: unknown): Puzzle {
  const r = validatePuzzle(json);
  if (!r.ok) throw new Error(r.errors.join("; "));
  return r.puzzle;
}
function validCheck(json: unknown, puzzle: Puzzle): PuzzleCheck {
  const r = validateCheck(json, puzzle);
  if (!r.ok) throw new Error(r.errors.join("; "));
  return r.check;
}

// ---- Fixture 1: two copies of 08 joined by a shared cable (no control on the link) ----

function copyOf08(pre: string, dx: number): { nodes: Puzzle["nodes"]; lines: Puzzle["lines"]; faults: Puzzle["faults"] } {
  const p = loadPuzzle(join(PUZZLES_DIR, "08-shrine-circuit.json"));
  const nodes = p.nodes.map((n) => {
    const moved = { ...n, id: pre + n.id, pos: [n.pos[0] + dx, n.pos[1]] as const };
    return n.type === "switch" ? { ...moved, outputs: [pre + n.outputs[0], pre + n.outputs[1]] as const } : moved;
  });
  return {
    nodes: nodes as Puzzle["nodes"],
    lines: p.lines.map((l) => ({ ...l, id: pre + l.id, from: pre + l.from, to: pre + l.to })),
    faults: p.faults.map((f) => ({ ...f, id: pre + f.id, at: pre + f.at })),
  };
}

function twoShrines(): { puzzle: Puzzle; check: PuzzleCheck; json: unknown; checkJson: unknown } {
  const a = copyOf08("a_", 0);
  const b = copyOf08("b_", 20);
  const json = {
    id: "two-shrines", name: "Two shrines", version: 5, scope: "map", capacity: null,
    startingParts: ["wire", "wire"], target: ["a_shrine", "b_shrine"],
    nodes: [...a.nodes, ...b.nodes].map((n) => (n.type === "feed" ? { ...n, capacity: 4 } : n)),
    lines: [...a.lines, ...b.lines, { id: "tie", from: "a_j2", to: "b_j2" }],
    faults: [...a.faults, ...b.faults],
  };
  const puzzle = valid(json);
  const checkJson = {
    solution: ["a_br_street", "a_sw_1", "repair:a_l_b", "b_br_street", "b_sw_1", "repair:b_l_b"],
    sections: [
      { id: "A", nodes: a.nodes.map((n) => n.id), parts: ["wire"] },
      { id: "B", nodes: b.nodes.map((n) => n.id), parts: ["wire"] },
    ],
    links: [{ line: "tie", sides: { A: "cut", B: "cut" } }],
  };
  return { puzzle, check: validCheck(checkJson, puzzle), json, checkJson };
}

// ---- Fixture 2: a tie switch. North's feed can light South's lamp, but South's own feed is too small
//      and carries the lamp until South opens its breaker. ----

function tieMap(links: CheckLink[], extra: Partial<{ fault: boolean }> = {}): { puzzle: Puzzle; check: PuzzleCheck; json: unknown; checkJson: unknown } {
  const json = {
    id: "tie-map", name: "Tie map", version: 5, scope: "map", capacity: null,
    target: ["n_lamp1", "s_lamp"],
    nodes: [
      { id: "n_feed", type: "feed", pos: [0, 0], capacity: 3 },
      { id: "n_br", type: "breaker", pos: [2, 0], closed: true },
      { id: "n_j", type: "junction", pos: [4, 0] },
      { id: "n_lamp1", type: "lamp", pos: [6, -2], load: 1 },
      { id: "n_tie", type: "switch", pos: [6, 0], outputs: ["n_x", "link"], selected: 0 },
      { id: "n_lamp2", type: "lamp", pos: [8, 2], load: 1 },
      { id: "s_feed", type: "feed", pos: [20, 0], capacity: 1 },
      { id: "s_br", type: "breaker", pos: [18, 0], closed: true },
      { id: "s_j", type: "junction", pos: [16, 0] },
      { id: "s_in", type: "junction", pos: [12, 0] },
      { id: "s_lamp", type: "lamp", pos: [14, 2], load: 2 },
    ],
    lines: [
      { id: "n1", from: "n_feed", to: "n_br" },
      { id: "n2", from: "n_br", to: "n_j" },
      { id: "n3", from: "n_j", to: "n_lamp1" },
      { id: "n4", from: "n_j", to: "n_tie" },
      { id: "n_x", from: "n_tie", to: "n_lamp2" },
      { id: "link", from: "n_tie", to: "s_in" },
      { id: "d", from: "s_in", to: "s_j" },
      { id: "c", from: "s_j", to: "s_lamp" },
      { id: "b", from: "s_br", to: "s_j" },
      { id: "a", from: "s_feed", to: "s_br" },
    ],
    faults: extra.fault ? [{ id: "f_link", at: "link", kind: "damaged-cable" }] : [],
    ...(extra.fault ? { startingParts: ["wire"] } : {}),
  };
  const puzzle = valid(json);
  const checkJson = {
    solution: ["n_tie", "s_br"],
    traps: [
      { name: "tie without opening the south breaker", moves: ["n_tie"], expect: { brownout: true, complete: false }, recover: ["s_br"] },
    ],
    sections: [
      { id: "N", nodes: ["n_feed", "n_br", "n_j", "n_lamp1", "n_tie", "n_lamp2"], ...(extra.fault ? { parts: ["wire"] } : {}) },
      { id: "S", nodes: ["s_feed", "s_br", "s_j", "s_in", "s_lamp"] },
    ],
    links,
  };
  return { puzzle, check: validCheck(checkJson, puzzle), json, checkJson };
}

const goodLink: CheckLink = { line: "link", sides: { N: { lamp: { load: 2, must: true } }, S: { feed: { capacity: 2 } } } };

describe("D3: the sub-puzzle built for a section", () => {
  it("is a valid version-5 puzzle with the section's nodes, inner lines, faults, parts and targets", () => {
    const { puzzle, check } = tieMap([goodLink]);
    const builds = buildSectionPuzzles(puzzle, check);
    expect(builds.map((b) => b.id)).toEqual(["N", "S"]);
    for (const b of builds) {
      expect(b.errors).toEqual([]);
      expect(b.puzzle).not.toBeNull();
      expect(validatePuzzle(b.puzzle).ok).toBe(true);
      expect(b.puzzle!.version).toBe(5);
    }
    const n = builds[0]!.puzzle!;
    expect(n.nodes.map((x) => x.id)).toEqual(["n_feed", "n_br", "n_j", "n_lamp1", "n_tie", "n_lamp2", "__stub_link"]);
    expect(n.lines.map((l) => l.id)).toEqual(["n1", "n2", "n3", "n4", "n_x", "link"]);
    expect(n.lines.find((l) => l.id === "link")).toMatchObject({ from: "n_tie", to: "__stub_link" });
  });

  it("a lamp stub is a lamp with the declared load, and a target only when must is true", () => {
    const { puzzle, check } = tieMap([goodLink]);
    const n = buildSectionPuzzles(puzzle, check)[0]!;
    expect(n.puzzle!.nodes.find((x) => x.id === "__stub_link")).toMatchObject({ type: "lamp", load: 2 });
    expect(n.targets).toEqual(["n_lamp1", "__stub_link"]);

    const loose = tieMap([{ line: "link", sides: { N: { lamp: { load: 2 } }, S: { feed: { capacity: 2 } } } }]);
    const m = buildSectionPuzzles(loose.puzzle, loose.check)[0]!;
    expect(m.targets).toEqual(["n_lamp1"]);
    expect(m.puzzle!.target).toEqual(["n_lamp1"]);
  });

  it("a feed stub is a feed with the declared capacity, and every feed in the sub-puzzle states its own capacity", () => {
    const { puzzle, check } = tieMap([goodLink]);
    const s = buildSectionPuzzles(puzzle, check)[1]!.puzzle!;
    expect(s.nodes.find((x) => x.id === "__stub_link")).toMatchObject({ type: "feed", capacity: 2 });
    expect(s.nodes.find((x) => x.id === "s_feed")).toMatchObject({ type: "feed", capacity: 1 });
    expect(s.capacity).toBeNull();
    const nolimit = tieMap([{ line: "link", sides: { N: { lamp: { load: 2 } }, S: { feed: { capacity: null } } } }]);
    expect(buildSectionPuzzles(nolimit.puzzle, nolimit.check)[1]!.puzzle!.nodes.find((x) => x.id === "__stub_link")).toMatchObject({ capacity: null });
  });

  it("cut leaves the line in place with a dead-end junction beyond it, so a switch output stays a valid line", () => {
    const { puzzle, check } = tieMap([{ line: "link", sides: { N: "cut", S: "cut" } }]);
    const [n, s] = buildSectionPuzzles(puzzle, check);
    expect(n!.puzzle!.nodes.find((x) => x.id === "__stub_link")).toMatchObject({ type: "junction" });
    expect(validatePuzzle(n!.puzzle).ok).toBe(true);
    // South has no feed of its own beyond s_feed here, but it is still a valid, single-feed section.
    expect(s!.puzzle!.nodes.filter((x) => x.type === "feed")).toHaveLength(1);
  });

  it("each section gets its own share of the parts, and a fault on the link line is left out with a note", () => {
    const { puzzle, check } = tieMap([goodLink], { fault: true });
    const [n, s] = buildSectionPuzzles(puzzle, check);
    expect(n!.puzzle!.startingParts).toEqual(["wire"]);
    expect(s!.puzzle!.startingParts).toEqual([]);
    expect(n!.puzzle!.faults).toEqual([]);
    expect(n!.warnings.join(" ")).toContain("f_link");
    expect(s!.warnings.join(" ")).toContain("f_link");
  });

  it("a section with no feed of its own and no feed stub is reported as invalid, not searched", () => {
    const { puzzle, check } = tieMap([{ line: "link", sides: { N: { lamp: { load: 2, must: true } }, S: "cut" } }]);
    const bad: PuzzleCheck = { ...check, sections: [check.sections![0]!, { ...check.sections![1]!, nodes: check.sections![1]!.nodes.filter((x) => x !== "s_feed") }, { id: "F", nodes: ["s_feed"] }] };
    // Not a valid partition for the validator's links rule; build directly to see the sub-puzzle error.
    const builds = buildSectionPuzzles(puzzle, { ...bad, links: [] });
    expect(builds[1]!.errors.join(" ")).toMatch(/no stub|feed/);
  });
});

describe("D3: two copies of 08 joined by a shared cable (cut on both sides)", () => {
  it("each section's numbers equal 08's", () => {
    const { puzzle, check } = twoShrines();
    const r = analyzeSections(puzzle, check);
    const ref = analyzePuzzle(loadPuzzle(join(PUZZLES_DIR, "08-shrine-circuit.json")));
    expect(ref.exhaustive).toBe(true);
    for (const [row, pre] of [[r.sections[0]!, "a_"], [r.sections[1]!, "b_"]] as const) {
      const a = row.analysis!;
      expect(a.exhaustive).toBe(true);
      expect(a.solvable).toBe(true);
      expect(a.minClicks).toBe(ref.minClicks);
      expect(a.winningConfigs).toBe(ref.winningConfigs);
      expect(a.winningOrders).toBe(ref.winningOrders);
      expect(a.states).toBe(ref.states);
      expect(a.deadStates).toBe(ref.deadStates);
      expect(a.deadFirstMoves).toEqual(ref.deadFirstMoves!.map((m) => pre + m));
      expect(a.win!.moves).toEqual(ref.win!.moves.map((m) => m.replace(/^(repair:)?/, `$1${pre}`)));
      expect(a.win!.partsUsed).toEqual(ref.win!.partsUsed);
      expect(a.win!.feeds).toEqual([{ id: `${pre}feed`, load: 3, capacity: 4 }]);
      expect(a.blowOnShortestWin).toEqual(ref.blowOnShortestWin);
    }
  });

  it("the full-map replay passes, each section's share of the solution wins it, and the run is ok", () => {
    const { puzzle, check } = twoShrines();
    const r = analyzeSections(puzzle, check);
    expect(r.full.ok).toBe(true);
    expect(r.problems).toEqual([]);
    expect(r.ok).toBe(true);
    expect(r.sections[0]!.projection).toMatchObject({ complete: true, clicks: 3, moves: ["a_br_street", "a_sw_1", "repair:a_l_b"] });
    expect(r.sections[1]!.projection).toMatchObject({ complete: true, clicks: 3, moves: ["b_br_street", "b_sw_1", "repair:b_l_b"] });
    expect(r.sumMinClicks).toBe(6);
    expect(r.solutionClicks).toBe(6);
  });

  it("the printed report is a table with one row per section, and is the same on every run", () => {
    const { puzzle, check } = twoShrines();
    const a = formatSections("two-shrines", analyzeSections(puzzle, check));
    const b = formatSections("two-shrines", analyzeSections(puzzle, check));
    expect(a).toEqual(b);
    expect(a[0]).toBe("PASS two-shrines: 2 sections");
    expect(a[1]).toMatch(/^ {2}section +nodes +search +states +solvable +min clicks/);
    expect(a[2]).toMatch(/^ {2}A +15 +exhaustive +\d+ +yes +3 +1 /);
    expect(a[3]).toMatch(/^ {2}B +15 +exhaustive/);
    expect(a.some((l) => l.includes("full-map replay of the check block: passes"))).toBe(true);
  });
});

describe("D3: a tie switch between two sections, with a feed stub and a must-lamp stub", () => {
  it("each section is searched on its own with its stub, and both are won in one click", () => {
    const { puzzle, check } = tieMap([goodLink]);
    const r = analyzeSections(puzzle, check);
    expect(r.problems).toEqual([]);
    expect(r.ok).toBe(true);
    const [n, s] = r.sections.map((x) => x.analysis!);
    expect(n!.minClicks).toBe(1);
    expect(n!.win!.moves).toEqual(["n_tie"]);
    expect(n!.win!.feeds).toEqual([{ id: "n_feed", load: 3, capacity: 3 }]);
    expect(s!.minClicks).toBe(1);
    expect(s!.win!.moves).toEqual(["s_br"]);
    expect(s!.win!.feeds.find((f) => f.id === "__stub_link")).toEqual({ id: "__stub_link", load: 2, capacity: 2 });
    expect(r.full.traps).toHaveLength(1);
    expect(r.full.traps[0]).toMatchObject({ expectHeld: true, recovered: true });
  });

  it("when the intended solution opens the south breaker first, the shares still win each section", () => {
    const { puzzle, check } = tieMap([goodLink]);
    const r = analyzeSections(puzzle, { ...check, solution: ["s_br", "n_tie"] });
    expect(r.ok).toBe(true);
    expect(r.sections[0]!.projection!.moves).toEqual(["n_tie"]);
  });
});

describe("D3: a wrong stub is reported clearly", () => {
  it("a lamp stub that understates the load the solution really sends is a problem naming the section and both numbers", () => {
    const { puzzle, check } = tieMap([{ line: "link", sides: { N: { lamp: { load: 1, must: true } }, S: { feed: { capacity: 2 } } } }]);
    const r = analyzeSections(puzzle, check);
    expect(r.ok).toBe(false);
    expect(r.problems.join("\n")).toContain("section N: the intended solution sends 2 load to other sections, but its lamp stubs declare only 1");
  });

  it("a feed stub that promises less than the solution draws is a problem, and the section cannot be won", () => {
    const { puzzle, check } = tieMap([{ line: "link", sides: { N: { lamp: { load: 2, must: true } }, S: { feed: { capacity: 1 } } } }]);
    const r = analyzeSections(puzzle, check);
    expect(r.ok).toBe(false);
    const text = r.problems.join("\n");
    expect(text).toContain("section S: the intended solution draws 2 load from other sections' feeds, but its feed stubs promise only 1");
    expect(text).toContain("section S: cannot be won on its own with its stubs");
    expect(r.sections[1]!.analysis!.solvable).toBe(false);
  });

  it("a lamp stub that overstates the load makes the north section unwinnable, and says so", () => {
    const { puzzle, check } = tieMap([{ line: "link", sides: { N: { lamp: { load: 3, must: true } }, S: { feed: { capacity: 3 } } } }]);
    const r = analyzeSections(puzzle, check);
    expect(r.ok).toBe(false);
    expect(r.problems.join("\n")).toContain("section N: cannot be won on its own with its stubs");
  });

  it("a stub that cuts a link the solution relies on makes the section's share fail and the section unwinnable", () => {
    const { puzzle, check } = tieMap([{ line: "link", sides: { N: "cut", S: "cut" } }]);
    const r = analyzeSections(puzzle, check);
    expect(r.ok).toBe(false);
    const text = r.problems.join("\n");
    expect(text).toContain("section S: cannot be won on its own with its stubs");
    expect(text).toContain("section S: its share of the intended solution [s_br] does not win it on its own");
    expect(text).toContain("sends 2 load to other sections, but its lamp stubs declare only 0");
  });

  it("the printed report carries the PROBLEM lines and starts with FAIL", () => {
    const { puzzle, check } = tieMap([{ line: "link", sides: { N: { lamp: { load: 1, must: true } }, S: { feed: { capacity: 2 } } } }]);
    const lines = formatSections("tie-map", analyzeSections(puzzle, check));
    expect(lines[0]).toBe("FAIL tie-map: 2 sections");
    expect(lines.some((l) => l.startsWith("  PROBLEM: section N:"))).toBe(true);
  });

  it("a check block whose full-map replay fails says the sections cannot be shown to compose", () => {
    const { puzzle, check } = tieMap([goodLink]);
    const r = analyzeSections(puzzle, { ...check, solution: ["n_tie"] });
    expect(r.ok).toBe(false);
    expect(r.problems.join("\n")).toContain("the full-map replay of the check block fails");
  });
});

describe("D3: a missing or wrong link is rejected by the check-block validator and reported by the CLI path", () => {
  it("a line between two sections that is not listed as a link is named", () => {
    const { puzzle, checkJson } = tieMap([goodLink]);
    const r = validateCheck({ ...(checkJson as object), links: [] }, puzzle);
    expect(r.ok).toBe(false);
    expect(r.ok ? [] : r.errors).toContain("line link joins sections N and S but is not a link");
  });

  it("a link with no stub for one of its sections is named", () => {
    const { puzzle, checkJson } = tieMap([goodLink]);
    const r = validateCheck({ ...(checkJson as object), links: [{ line: "link", sides: { N: "cut" } }] }, puzzle);
    expect(r.ok ? [] : r.errors).toContain("link link: no stub for section S");
  });

  it("sectionsForFile prints INVALID with the validator's message, and passes a good note", () => {
    const dir = mkdtempSync(join(tmpdir(), "d3-sections-"));
    try {
      const good = tieMap([goodLink]);
      const bad = tieMap([goodLink]);
      const note = (cj: unknown): string => `# note\n\n\`\`\`check\n${JSON.stringify(cj, null, 2)}\n\`\`\`\n`;
      writeFileSync(join(dir, "tie.json"), JSON.stringify(good.json));
      writeFileSync(join(dir, "tie.md"), note(good.checkJson));
      writeFileSync(join(dir, "missing.json"), JSON.stringify(bad.json));
      writeFileSync(join(dir, "missing.md"), note({ ...(bad.checkJson as object), links: [] }));
      writeFileSync(join(dir, "plain.json"), JSON.stringify(bad.json));
      writeFileSync(join(dir, "plain.md"), note({ solution: ["n_tie", "s_br"] }));
      writeFileSync(join(dir, "nonote.json"), JSON.stringify(bad.json));

      const ok = sectionsForFile(join(dir, "tie.json"));
      expect(ok.ok).toBe(true);
      expect(ok.lines[0]).toBe("PASS tie: 2 sections");

      const miss = sectionsForFile(join(dir, "missing.json"));
      expect(miss.ok).toBe(false);
      expect(miss.lines.join("\n")).toContain("line link joins sections N and S but is not a link");

      const plain = sectionsForFile(join(dir, "plain.json"));
      expect(plain.ok).toBe(false);
      expect(plain.lines.join("\n")).toContain('no "sections"');

      expect(sectionsForFile(join(dir, "nonote.json")).lines[0]).toContain("no design note");
      expect(readFileSync(join(dir, "tie.md"), "utf8")).toContain("```check");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe("D3: a section with nothing to win", () => {
  it("is skipped with a reason and does not fail the run", () => {
    // North alone has no target when the stub lamp is not a must and n_lamp1 is not wanted.
    const { puzzle, check } = tieMap([{ line: "link", sides: { N: { lamp: { load: 2 } }, S: { feed: { capacity: 2 } } } }]);
    const p2: Puzzle = { ...puzzle, target: ["s_lamp"] };
    const r = analyzeSections(p2, { ...check, solution: ["n_tie", "s_br"], traps: [] });
    expect(r.sections[0]!.skipped).toMatch(/no target lamps/);
    expect(r.sections[0]!.analysis).toBeUndefined();
    expect(r.problems).toEqual([]);
    expect(r.ok).toBe(true);
  });
});
