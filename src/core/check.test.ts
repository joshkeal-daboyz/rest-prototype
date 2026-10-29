import { describe, expect, it } from "vitest";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { CHECK_CLICK_SECONDS, parseCheckBlock, parseCheckMove, validateCheck } from "./check";
import { loadPuzzle } from "./load";
import type { Puzzle } from "./schema";

const PUZZLES = join(__dirname, "..", "..", "puzzles");
const read = (f: string): Puzzle => loadPuzzle(JSON.parse(readFileSync(join(PUZZLES, f), "utf8")));
const shrine = read("09-shrine-circuit.json"); // startingParts [wire]; faults f1 @ j_dead, f2 @ l_b; fb_A rating 3
const battery = read("20-battery-run.json"); // battery "bat"

/** A well-formed block for 09: two sections joined by l_sw (j1 -> sw_1). */
const good = () =>
  ({
    clickSeconds: 1,
    solution: ["br_street", "sw_1", "repair:l_b"],
    traps: [
      {
        name: "repair the dead junction",
        moves: ["repair:j_dead", "wait:2"],
        expect: { readable: ["f2"], lit: ["street_1"], complete: false, brownout: false, blown: [] },
        recover: ["undo", "sw_1", "repair:l_b"],
      },
    ],
    sections: [
      { id: "street", nodes: ["feed", "br_main", "j1", "br_street", "fb_A", "j2", "street_1", "street_2", "street_3"], parts: [] },
      { id: "shrine", nodes: ["sw_1", "j_dead", "j4", "flood", "j5", "shrine"], parts: ["wire"] },
    ],
    links: [{ line: "l_sw", sides: { street: { lamp: { load: 3, must: true } }, shrine: { feed: { capacity: 4 } } } }],
  }) as Record<string, any>;

/** Validate and expect exactly one error, matching `re`. */
const rejectsOnce = (json: unknown, re: RegExp, puzzle: Puzzle = shrine) => {
  const r = validateCheck(json, puzzle);
  expect(r.ok).toBe(false);
  if (r.ok) return;
  expect(r.errors, r.errors.join("\n")).toHaveLength(1);
  expect(r.errors[0]).toMatch(re);
};

describe("parseCheckBlock", () => {
  it("returns null when the note has no check block", () => {
    expect(parseCheckBlock("# 08\n\nNo block here.\n\n```json\n{\"a\": 1}\n```\n")).toBeNull();
    expect(parseCheckBlock("")).toBeNull();
  });

  it("returns the parsed JSON of the first block tagged check", () => {
    const md = [
      "# A note",
      "```json",
      '{ "not": "this" }',
      "```",
      "",
      "```check",
      '{ "solution": ["sw_1"] }',
      "```",
      "```check",
      '{ "solution": ["second"] }',
      "```",
    ].join("\n");
    expect(parseCheckBlock(md)).toEqual({ ok: true, json: { solution: ["sw_1"] } });
  });

  it("handles CRLF, tilde fences, and a ``` line inside a longer fence", () => {
    expect(parseCheckBlock("~~~check\r\n{\"solution\": []}\r\n~~~\r\n")).toEqual({ ok: true, json: { solution: [] } });
    const md = "````md\n```check\n{ bad }\n```\n````\n\n```check\n{\"solution\": [\"x\"]}\n```";
    expect(parseCheckBlock(md)).toEqual({ ok: true, json: { solution: ["x"] } });
  });

  it("returns an error result on bad JSON", () => {
    const r = parseCheckBlock("text\n```check\n{ \"solution\": [ }\n```\n");
    expect(r).not.toBeNull();
    expect(r!.ok).toBe(false);
    if (r && !r.ok) expect(r.error).toMatch(/line 2.*not valid JSON/);
  });

  it("returns an error result on an unterminated block", () => {
    const r = parseCheckBlock("```check\n{}\n");
    expect(r?.ok).toBe(false);
  });
});

describe("parseCheckMove", () => {
  it("parses the five forms", () => {
    expect(parseCheckMove("sw_1")).toEqual({ kind: "click", id: "sw_1" });
    expect(parseCheckMove("repair:l_b")).toEqual({ kind: "repair", id: "l_b" });
    expect(parseCheckMove("release:bat")).toEqual({ kind: "release", id: "bat" });
    expect(parseCheckMove("wait:2.5")).toEqual({ kind: "wait", seconds: 2.5 });
    expect(parseCheckMove("undo")).toEqual({ kind: "undo" });
  });
  it("rejects malformed moves", () => {
    for (const m of ["", "wait:0", "wait:-1", "wait:", "wait:x", "repair:", "fly:sw_1", "a b"]) expect(parseCheckMove(m)).toBeNull();
  });
  it("defaults clickSeconds to 1", () => expect(CHECK_CLICK_SECONDS).toBe(1));
});

describe("validateCheck accepts", () => {
  it("a well-formed block with traps, sections and links", () => {
    const r = validateCheck(good(), shrine);
    expect(r.ok, r.ok ? "" : r.errors.join("\n")).toBe(true);
  });

  it("a minimal block (solution only)", () => {
    expect(validateCheck({ solution: ["sw_1", "repair:l_b"] }, shrine).ok).toBe(true);
  });

  it("battery clicks and release, and a repair of a fuse that blew in play", () => {
    const r = validateCheck(
      {
        solution: ["release:bat", "bat", "wait:3", "repair:fb_east"],
        traps: [{ name: "blow it", moves: ["br_east"], expect: { blown: ["fb_east"], readable: ["blown-fb_east"] }, recover: ["repair:fb_east"] }],
      },
      battery,
    );
    expect(r.ok, r.ok ? "" : r.errors.join("\n")).toBe(true);
  });

  it("a cut stub and a null feed capacity", () => {
    const c = good();
    c["links"] = [{ line: "l_sw", sides: { street: "cut", shrine: { feed: { capacity: null } } } }];
    expect(validateCheck(c, shrine).ok).toBe(true);
  });
});

describe("validateCheck rejects, with one message each", () => {
  it("a move naming a node that isn't a breaker, switch or battery", () => {
    const c = good();
    c["solution"] = ["j1"];
    rejectsOnce(c, /j1 is a junction; a move clicks a breaker, switch or battery/);
    c["solution"] = ["nowhere"];
    rejectsOnce(c, /"nowhere" is not a node/);
  });

  it("release: on something that isn't a battery", () => {
    rejectsOnce({ solution: ["release:sw_1"] }, /sw_1 is not a battery/);
  });

  it("a repair: move on an id with no fault", () => {
    rejectsOnce({ solution: ["repair:l_a"] }, /repair:l_a: l_a has no fault/);
    rejectsOnce({ solution: ["repair:j1"] }, /repair:j1: j1 has no fault/);
  });

  it("a wait: that isn't positive", () => {
    rejectsOnce({ solution: ["wait:0"] }, /wait needs a positive number/);
    rejectsOnce({ solution: ["wait:-2"] }, /wait needs a positive number/);
  });

  it("a trap without recover", () => {
    const c = good();
    delete c["traps"][0].recover;
    rejectsOnce(c, /trap "repair the dead junction": recover is required/);
  });

  it("a trap expect naming the wrong kinds of thing", () => {
    const c = good();
    c["traps"][0].expect = { lit: ["j1"] };
    rejectsOnce(c, /expect\.lit: j1 is not a lamp/);
    c["traps"][0].expect = {};
    rejectsOnce(c, /expect must name at least one/);
    c["traps"][0].expect = { complete: true };
    rejectsOnce(c, /complete can only be false/);
  });

  it("a section listing a node twice", () => {
    const c = good();
    c["sections"][1].nodes.push("flood");
    rejectsOnce(c, /section shrine: lists flood twice/);
  });

  it("a node in two sections", () => {
    const c = good();
    c["sections"][1].nodes.push("j2");
    rejectsOnce(c, /node j2 is in two sections: street and shrine/);
  });

  it("sections that don't cover every node", () => {
    const c = good();
    c["sections"][1].nodes = c["sections"][1].nodes.filter((n: string) => n !== "flood");
    rejectsOnce(c, /don't cover every node; missing: flood/);
  });

  it("a link that isn't a line", () => {
    const c = good();
    c["links"].push({ line: "l_nope", sides: {} });
    rejectsOnce(c, /link l_nope: not a line/);
  });

  it("a link that doesn't join two different sections", () => {
    const c = good();
    c["links"].push({ line: "l_s2", sides: { street: "cut" } });
    rejectsOnce(c, /link l_s2: doesn't join two different sections/);
  });

  it("a stub on a side the link doesn't touch", () => {
    const c = good();
    c["sections"].push({ id: "empty", nodes: [] });
    c["links"][0].sides.empty = "cut";
    rejectsOnce(c, /link l_sw: has a stub for section empty, a side it doesn't touch/);
  });

  it("section parts that don't add up to startingParts (as multisets)", () => {
    const c = good();
    c["sections"][0].parts = ["wire"];
    rejectsOnce(c, /parts \[wire, wire\] don't add up to startingParts \[wire\]/);
    c["sections"][0].parts = [];
    c["sections"][1].parts = ["fuse"];
    rejectsOnce(c, /don't add up to startingParts/);
  });

  it("a line between sections that isn't declared a link", () => {
    const c = good();
    c["links"] = [];
    rejectsOnce(c, /line l_sw joins sections street and shrine but is not a link/);
  });

  it("a malformed stub", () => {
    const c = good();
    c["links"][0].sides.shrine = { feed: { capacity: 0 } };
    rejectsOnce(c, /feed stub capacity/);
  });
});

describe("every check block in puzzles/*.md is valid", () => {
  const notes = readdirSync(PUZZLES).filter((f) => f.endsWith(".md") && !["README.md", "SCHEMA.md"].includes(f));
  for (const md of notes) {
    const block = parseCheckBlock(readFileSync(join(PUZZLES, md), "utf8"));
    if (block === null) continue;
    it(md, () => {
      expect(block.ok, block.ok ? "" : block.error).toBe(true);
      const base = md.replace(/\.md$/, "");
      const json = existsSync(join(PUZZLES, `${base}.json`)) ? `${base}.json` : `${base}.grid.json`;
      const r = validateCheck((block as { json: unknown }).json, read(json));
      expect(r.ok, r.ok ? "" : r.errors.join("\n")).toBe(true);
    });
  }
  it("(the scan runs)", () => expect(notes.length).toBeGreaterThan(0));
});
