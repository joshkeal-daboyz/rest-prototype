import { describe, expect, it } from "vitest";
import { EventBus, type GridNode, type Line, type Puzzle } from "../core";
import { createGrid } from "../grid";
import type { MapRenderer } from "../render3d/maprender";
import { createMapPlay } from "./index";
import { TEXT } from "./prompt";

/** feed - br - lx (a no-load lamp, the player's first move) and feed - tb (2 s closed, 2 s open) - l. */
const nodes = [
  { id: "feed", type: "feed" },
  { id: "br", type: "breaker", closed: true },
  { id: "lx", type: "lamp", load: 0 },
  { id: "tb", type: "breaker", closed: true, timer: { closed: 2, open: 2, offset: 0 } },
  { id: "l", type: "lamp" },
  { id: "never", type: "lamp" },
].map((n, i) => ({ pos: [i, 0], ...n }) as unknown as GridNode);
const lines: Line[] = [
  { id: "a", from: "feed", to: "br" },
  { id: "b", from: "br", to: "lx" },
  { id: "c", from: "feed", to: "tb" },
  { id: "d", from: "tb", to: "l" },
];
const puzzle: Puzzle = { id: "t", name: "t", version: 4, scope: "map", capacity: null, nodes, lines, faults: [], target: ["never"] };

describe("the timed breaker's prompt and log (081 TB4)", () => {
  it("the prompt counts the clock, a click is refused with its flash, and each flip is a timer-flip entry that is no undo step", () => {
    const bus = new EventBus();
    const grid = createGrid(puzzle, bus);
    const renderer = { draw() {}, resize() {}, setInsets() {}, notify() {}, hitTest: () => null } as MapRenderer;
    const clicks: unknown[] = [];
    bus.on("play:click", (e) => clicks.push(e));
    const play = createMapPlay(puzzle, grid, renderer, bus, { now: () => 5 });
    play.hoverAt("tb");
    expect(play.view().prompt).toBe(TEXT.timerWaiting);
    play.click("tb");
    expect(clicks).toEqual([{ kind: "refused", target: "tb" }]);
    expect(play.view().prompt).toBe("Thrown by its clock");
    play.click("br"); // the first move starts the clock
    play.tick(1.5); // flash gone; 0.5 s of its window left
    expect(play.view().prompt).toBe("Timed breaker: opens in 1 s");
    play.tick(1); // flipped open at 2 s, 1.5 s to close
    expect(play.view().prompt).toBe("Timed breaker: closes in 2 s");
    const flip = play.lastEntry();
    expect(flip).toMatchObject({ kind: "timer-flip", target: "tb", closed: false, ok: true });
    expect(flip?.gameTime).toBeCloseTo(2.5);
    expect(JSON.parse(play.exportLog()).entries.map((e: { kind: string }) => e.kind)).toEqual(["throw-breaker", "throw-breaker", "timer-flip"]);
    play.undo(); // undoes the player's throw of br, not the flip
    expect(grid.state().timers.get("tb")?.closed).toBe(false);
  });
});
