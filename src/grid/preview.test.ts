import { describe, expect, it } from "vitest";
import type { Fault, GridNode, Line, Puzzle } from "../core";
import { createGrid, loadPreview } from "./index";

type N = { id: string; type: GridNode["type"] } & Record<string, unknown>;

function mini(nodes: N[], lines: Array<[string, string, string]>, faults: Fault[] = []): Puzzle {
  return {
    id: "mini",
    name: "mini",
    version: 4,
    scope: "map",
    capacity: null,
    nodes: nodes.map((n, i) => ({ pos: [i, 0], ...n }) as unknown as GridNode),
    lines: lines.map(([id, from, to]): Line => ({ id, from, to })),
    faults,
  };
}

const preview = (p: Puzzle, known: string[] = []) => loadPreview(p, createGrid(p).state(), new Set(known));

describe("load preview (ticket 081 V2)", () => {
  it("breaker and switch rule: +load of the lamps it lights less the lamps it darkens, and the call changes no state", () => {
    const p = mini(
      [
        { id: "feed", type: "feed" }, { id: "j", type: "junction" }, { id: "br", type: "breaker", closed: false },
        { id: "a1", type: "lamp", load: 1 }, { id: "a2", type: "lamp", load: 1 },
        { id: "s", type: "switch", outputs: ["sa", "sb"], selected: 0 },
        { id: "c", type: "lamp", load: 3 }, { id: "d", type: "lamp", load: 1 },
      ],
      [["l0", "feed", "j"], ["lb", "j", "br"], ["x1", "br", "a1"], ["x2", "br", "a2"], ["ls", "j", "s"], ["sa", "s", "c"], ["sb", "s", "d"]],
    );
    const g = createGrid(p);
    const before = g.state();
    const open = loadPreview(p, before, new Set());
    expect(open.get("br")).toMatchObject({ kind: "breaker", delta: 2 });
    expect(open.get("s")).toMatchObject({ kind: "switch", delta: -2 });
    expect(g.state()).toBe(before);
    g.throwBreaker("br");
    expect(loadPreview(p, g.state(), new Set()).get("br")?.delta).toBe(-2);
  });

  it("readable fault rule: a damaged cable current reaches has an entry for the load past it; one it does not reach has none", () => {
    const p = mini(
      [
        { id: "feed", type: "feed" }, { id: "j", type: "junction" }, { id: "e", type: "lamp", load: 2 },
        { id: "br", type: "breaker", closed: false }, { id: "f", type: "lamp", load: 4 },
      ],
      [["l0", "feed", "j"], ["cab1", "j", "e"], ["lb", "j", "br"], ["cab2", "br", "f"]],
      [{ id: "k1", at: "cab1", kind: "damaged-cable" }, { id: "k2", at: "cab2", kind: "damaged-cable" }],
    );
    const pv = preview(p);
    expect(pv.get("k1")).toMatchObject({ kind: "repair", delta: 2 });
    expect(pv.has("k2")).toBe(false);
  });

  it("Faults hide faults: an unread dead lamp behind a blown fuse is counted as sound in the fuse's repair entry", () => {
    const build = (dead: boolean) =>
      mini(
        [{ id: "feed", type: "feed" }, { id: "fb", type: "fusebox", rating: 9 }, { id: "m", type: "lamp", load: 1 }, { id: "k", type: "lamp", load: 3 }],
        [["l0", "feed", "fb"], ["lm", "fb", "m"], ["lk", "fb", "k"]],
        [{ id: "bf", at: "fb", kind: "blown-fuse" }, ...(dead ? [{ id: "dl", at: "k", kind: "dead-lamp" as const }] : [])],
      );
    const withDead = preview(build(true));
    expect(withDead.get("bf")?.delta).toBe(4);
    expect(withDead.get("bf")?.delta).toBe(preview(build(false)).get("bf")?.delta);
    expect(withDead.has("dl")).toBe(false);
  });

  it("known fault rule: a break the player has read still counts after current is routed away; unread, it counts as sound", () => {
    const p = mini(
      [{ id: "feed", type: "feed" }, { id: "s", type: "switch", outputs: ["sa", "sb"], selected: 1 }, { id: "p", type: "lamp", load: 3 }, { id: "q", type: "lamp", load: 1 }],
      [["l0", "feed", "s"], ["sa", "s", "p"], ["sb", "s", "q"]],
      [{ id: "kb", at: "sa", kind: "damaged-cable" }],
    );
    expect(preview(p, ["kb"]).get("s")?.delta).toBe(-1);
    expect(preview(p).get("s")?.delta).toBe(2);
  });

  it("over and blows rule: counted before the blow, red when a fuse would blow or a feed ends over, each feed on its own", () => {
    const p = mini(
      [
        { id: "fA", type: "feed", capacity: 9 }, { id: "brA", type: "breaker", closed: false }, { id: "fbA", type: "fusebox", rating: 1 },
        { id: "a1", type: "lamp", load: 1 }, { id: "a2", type: "lamp", load: 1 },
        { id: "fB", type: "feed", capacity: 1 }, { id: "b1", type: "lamp", load: 1 }, { id: "brB", type: "breaker", closed: false }, { id: "b2", type: "lamp", load: 1 },
        { id: "brB3", type: "breaker", closed: false }, { id: "b3", type: "lamp", load: 1 },
        { id: "fC", type: "feed", capacity: 5 }, { id: "brC", type: "breaker", closed: false }, { id: "c1", type: "lamp", load: 1 },
      ],
      [
        ["la", "fA", "brA"], ["lf", "brA", "fbA"], ["a1l", "fbA", "a1"], ["a2l", "fbA", "a2"],
        ["lb1", "fB", "b1"], ["lb", "fB", "brB"], ["b2l", "brB", "b2"], ["lb3", "fB", "brB3"], ["b3l", "brB3", "b3"],
        ["lc", "fC", "brC"], ["c1l", "brC", "c1"],
      ],
    );
    const pv = preview(p);
    expect(pv.get("brA")).toMatchObject({ kind: "breaker", delta: 2, over: true, blows: ["fbA"] });
    expect(pv.get("brB")).toMatchObject({ delta: 1, over: true, blows: [] });
    expect(pv.get("brC")).toMatchObject({ delta: 1, over: false, blows: [] });
    const g = createGrid(p);
    g.throwBreaker("brB");
    expect(loadPreview(p, g.state(), new Set()).get("brB3")).toMatchObject({ delta: 1, over: true });
  });

  it("control lines rule: a throw names the lines it makes live and dead; an unread break is sound, a read one stops the current at its cut", () => {
    const build = (faults: Fault[]) =>
      mini(
        [
          { id: "feed", type: "feed" }, { id: "br", type: "breaker", closed: false }, { id: "j", type: "junction" },
          { id: "a1", type: "lamp", load: 1 }, { id: "a2", type: "lamp", load: 1 },
          { id: "s", type: "switch", outputs: ["sa", "sb"], selected: 0 }, { id: "c", type: "lamp", load: 3 }, { id: "d", type: "lamp", load: 1 },
        ],
        [["l0", "feed", "br"], ["lb", "br", "j"], ["x1", "j", "a1"], ["x2", "j", "a2"], ["ls", "feed", "s"], ["sa", "s", "c"], ["sb", "s", "d"]],
        faults,
      );
    const p = build([]);
    const open = preview(p);
    expect(open.get("br")?.lines).toEqual({ on: ["lb", "x1", "x2"], off: [] });
    expect(open.get("s")?.lines).toEqual({ on: ["sb"], off: ["sa"] });
    const g = createGrid(p);
    g.throwBreaker("br");
    expect(loadPreview(p, g.state(), new Set()).get("br")?.lines).toEqual({ on: [], off: ["lb", "x1", "x2"] });
    const cut = build([{ id: "k", at: "lb", kind: "damaged-cable" }]);
    expect(preview(cut).get("br")?.lines?.on).toEqual(["lb", "x1", "x2"]);
    expect(preview(cut, ["k"]).get("br")?.lines).toEqual({ on: ["lb"], off: [] });
  });
});
