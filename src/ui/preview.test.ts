import { describe, expect, it } from "vitest";
import type { Fault, GridNode, Line, Puzzle } from "../core";
import { createGrid } from "../grid";
import { previewFor } from "./preview";

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

describe("previewFor (ticket 081 V4)", () => {
  it("a fault read at one state stays known after current is routed away; an empty known (Reset) forgets it; relighting gives no numbers", () => {
    const p = mini(
      [{ id: "feed", type: "feed" }, { id: "j", type: "junction" }, { id: "br", type: "breaker", closed: true }, { id: "e", type: "lamp", load: 2 }],
      [["l0", "feed", "j"], ["lb", "j", "br"], ["cab1", "br", "e"]],
      [{ id: "k1", at: "cab1", kind: "damaged-cable" }],
    );
    const g = createGrid(p);
    const first = previewFor(p, g.state(), new Set(), false);
    expect(first.known.has("k1")).toBe(true);
    expect(first.preview?.has("k1")).toBe(true);

    g.throwBreaker("br");
    expect(g.state().readableFaults.has("k1")).toBe(false);
    expect(previewFor(p, g.state(), first.known, false).known.has("k1")).toBe(true);
    expect(previewFor(p, g.state(), new Set(), false).known.has("k1")).toBe(false);
    expect(previewFor(p, g.state(), first.known, true).preview).toBeNull();
  });
});
