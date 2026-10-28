import { describe, expect, it } from "vitest";
import type { Puzzle } from "../core";
import type { GridState } from "../grid";
import { createFeedCaptions, feedIsOver } from "./feedcaps";

function puz(feeds: { id: string; capacity?: number | null; name?: string }[], cap: number | null): Puzzle {
  return {
    version: feeds.length > 1 ? 5 : 4,
    id: "t",
    title: "t",
    capacity: cap,
    nodes: feeds.map((f, i) => ({ id: f.id, type: "feed", pos: [i, 0], capacity: f.capacity, name: f.name })),
    lines: [],
  } as unknown as Puzzle;
}
function st(over: Partial<GridState>): GridState {
  return { load: 0, capacity: null, brownout: false, feeds: new Map(), feedOf: new Map(), ...over } as unknown as GridState;
}

describe("feed captions", () => {
  it("one feed: no heading, alarm follows the section brownout, strings as before", () => {
    const fc = createFeedCaptions(puz([{ id: "feed" }], 4));
    fc.update(st({ load: 5, capacity: 4, brownout: true }));
    expect(fc.heading).toEqual([""]);
    expect(fc.name[0]).toBe("Lv4 Powersource");
    expect(fc.using[0]).toBe("using 5 of 4");
    expect(fc.alarm[0]).toBe("! using 5 of 4 !");
    expect(fc.isOver(0, st({ brownout: true }))).toBe(true);
    expect(fc.isOver(0, st({ brownout: false }))).toBe(false);
  });
  it("two feeds: names above, alarm only on the over feed", () => {
    const fc = createFeedCaptions(
      puz([{ id: "n", capacity: 4, name: "North" }, { id: "s", capacity: 2, name: "South" }], null),
    );
    const s = st({
      brownout: true,
      feeds: new Map([
        ["n", { load: 3, capacity: 4, over: false }],
        ["s", { load: 3, capacity: 2, over: true }],
      ]),
    });
    fc.update(s);
    expect(fc.heading).toEqual(["North", "South"]);
    expect(fc.using).toEqual(["using 3 of 4", "using 3 of 2"]);
    expect(fc.isOver(0, s)).toBe(false);
    expect(fc.isOver(1, s)).toBe(true);
    expect(fc.alarm[1]).toBe("! using 3 of 2 !");
  });
  it("rebuilds a string only when that feed changes", () => {
    const fc = createFeedCaptions(puz([{ id: "a", capacity: 4 }, { id: "b", capacity: 4 }], null));
    const mk = (la: number) =>
      st({ feeds: new Map([["a", { load: la, capacity: 4, over: false }], ["b", { load: 1, capacity: 4, over: false }]]) });
    fc.update(mk(1));
    const b0 = fc.using[1];
    fc.update(mk(2));
    expect(fc.using[0]).toBe("using 2 of 4");
    expect(fc.using[1]).toBe(b0);
  });
  it("feedIsOver rule", () => {
    expect(feedIsOver(true, true, false)).toBe(false);
    expect(feedIsOver(true, false, true)).toBe(true);
    expect(feedIsOver(false, true, undefined)).toBe(true);
  });
});
