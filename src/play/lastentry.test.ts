import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";
import { EventBus, loadPuzzle, type Puzzle } from "../core";
import { createGrid } from "../grid";
import type { MapRenderer } from "../render";
import { createMapPlay } from "./index";
import { createSessionLog } from "./log";

/** Ticket 033 C: lastEntry() is O(1) and agrees with the exported log. */
const renderer = { draw() {}, resize() {}, hitTest: () => null } as unknown as MapRenderer;

function shrine() {
  const puzzle: Puzzle = loadPuzzle(
    JSON.parse(readFileSync(join(__dirname, "../../puzzles/09-shrine-circuit.json"), "utf8")) as unknown,
  );
  const bus = new EventBus();
  const grid = createGrid(puzzle, bus);
  let t = 1000;
  const play = createMapPlay(puzzle, grid, renderer, bus, { now: () => (t += 10) });
  return { bus, grid, play };
}

const lastOfExport = (exported: string): unknown => {
  const entries = (JSON.parse(exported) as { entries: unknown[] }).entries;
  return entries[entries.length - 1];
};

describe("lastEntry", () => {
  it("is undefined on an empty log", () => {
    expect(shrine().play.lastEntry()).toBeUndefined();
    expect(createSessionLog().lastEntry()).toBeUndefined();
  });

  it("matches the last exported entry after throws, a refusal, a repair, undo and reset", () => {
    const { play } = shrine();
    const check = (): void => expect(play.lastEntry()).toEqual(lastOfExport(play.exportLog()));
    play.click("j_dead"); // refused: needs parts
    expect(play.lastEntry()).toMatchObject({ kind: "repair-refused", ok: false });
    check();
    play.click("sw_1");
    expect(play.lastEntry()).toMatchObject({ kind: "throw-switch", target: "sw_1" });
    check();
    play.click("l_b");
    expect(play.lastEntry()).toMatchObject({ kind: "repair", ok: true });
    check();
    play.click("br_main");
    expect(play.lastEntry()?.kind).toBe("throw-breaker");
    check();
    play.undo();
    expect(play.lastEntry()?.kind).toBe("undo");
    check();
    play.reset();
    expect(play.lastEntry()).toMatchObject({ kind: "reset", ok: true });
    check();
  });

  it("matches after battery release, stop and running flat", () => {
    const puzzle = {
      id: "bat",
      name: "bat",
      version: 4,
      scope: "map",
      capacity: null,
      nodes: [
        { id: "feed", type: "feed", pos: [0, 0] },
        { id: "bat", type: "battery", pos: [1, 0], capacity: 2, charge: 0, input: "l_in" },
        { id: "A", type: "lamp", pos: [2, 0] },
      ],
      lines: [
        { id: "l_in", from: "feed", to: "bat" },
        { id: "l_out", from: "bat", to: "A" },
      ],
      faults: [],
      target: ["A"],
    } as unknown as Puzzle;
    const bus = new EventBus();
    const grid = createGrid(puzzle, bus);
    const play = createMapPlay(puzzle, grid, renderer, bus, { now: () => 5 });
    const check = (): void => expect(play.lastEntry()).toEqual(lastOfExport(play.exportLog()));
    play.tick(3);
    play.click("bat");
    expect(play.lastEntry()?.kind).toBe("battery-release");
    check();
    play.click("bat");
    expect(play.lastEntry()?.kind).toBe("battery-stop");
    check();
    play.click("bat");
    play.tick(5); // runs flat
    expect(play.lastEntry()).toMatchObject({ kind: "battery-flat", stopped: false });
    check();
  });

  it("does not stringify or export with 10,000 entries", () => {
    const log = createSessionLog(() => 1);
    for (let i = 0; i < 10_000; i++) log.add({ kind: "throw-breaker", target: "b", ok: true });
    const spy = vi.spyOn(JSON, "stringify");
    const toJSON = vi.spyOn(log, "toJSON");
    expect(log.lastEntry()?.step).toBe(10_000);
    expect(spy).not.toHaveBeenCalled();
    expect(toJSON).not.toHaveBeenCalled();
    spy.mockRestore();

    const { play } = shrine();
    for (let i = 0; i < 50; i++) play.click("sw_1");
    const spy2 = vi.spyOn(JSON, "stringify");
    play.lastEntry();
    expect(spy2).not.toHaveBeenCalled();
    spy2.mockRestore();
  });

  it("leaves exportLog's format unchanged (pretty JSON of {puzzle, entries})", () => {
    const { play } = shrine();
    play.click("sw_1");
    const parsed = JSON.parse(play.exportLog()) as { puzzle: string; entries: unknown[] };
    expect(play.exportLog()).toBe(JSON.stringify(parsed, null, 2));
    expect(Object.keys(parsed)).toEqual(["puzzle", "entries"]);
  });
});
