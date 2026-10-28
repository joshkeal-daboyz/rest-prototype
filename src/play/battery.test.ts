import { describe, expect, it } from "vitest";
import { EventBus, type Puzzle } from "../core";
import { createGrid } from "../grid";
import type { MapRenderer } from "../render";
import { createMapPlay } from "./index";

/** Ticket 009 B: battery and relay prompts, tick -> advance, and the log. feed -> bat -> relay sw -> A / B. */
const mini = (): Puzzle =>
  ({
    id: "mini",
    name: "mini",
    version: 4,
    scope: "map",
    capacity: null,
    nodes: [
      { id: "feed", type: "feed", pos: [0, 0] },
      { id: "bat", type: "battery", pos: [1, 0], capacity: 10, charge: 0, input: "l_in" },
      { id: "sw", type: "switch", pos: [2, 0], outputs: ["la", "lb"], selected: 0, relay: true },
      { id: "A", type: "lamp", pos: [3, 0] },
      { id: "B", type: "lamp", pos: [3, 1] },
    ],
    lines: [
      { id: "l_in", from: "feed", to: "bat" },
      { id: "l_out", from: "bat", to: "sw" },
      { id: "la", from: "sw", to: "A" },
      { id: "lb", from: "sw", to: "B" },
    ],
    faults: [],
    target: ["A", "B"],
  }) as unknown as Puzzle;

function setup() {
  const puzzle = mini();
  const bus = new EventBus();
  const grid = createGrid(puzzle, bus);
  const renderer: MapRenderer = { draw() {}, resize() {}, hitTest: () => null } as unknown as MapRenderer;
  let t = 1000;
  const play = createMapPlay(puzzle, grid, renderer, bus, { now: () => (t += 10) });
  const over = (id: string | null) => {
    play.hoverAt(id);
    return play.view().prompt;
  };
  const entries = () => JSON.parse(play.exportLog()).entries as Array<Record<string, unknown>>;
  return { grid, play, over, entries };
}

describe("battery and relay prompts", () => {
  it("charge floors, running ceils, a stuck relay says so", () => {
    const s = setup();
    expect(s.over("bat")).toBe("Charge: 0 / 10 — Release");
    expect(s.over("sw")).toBe("No power — relay stuck");
    s.play.tick(7.9);
    expect(s.over("bat")).toBe("Charge: 7 / 10 — Release");
    s.play.click("bat");
    expect(s.over("bat")).toBe("Running: 8 s left — Stop");
    s.play.tick(3.5);
    expect(s.over("bat")).toBe("Running: 5 s left — Stop");
    expect(s.over("sw")).toBe("Throw switch"); // the released battery powers the relay
  });

  it("tick calls grid.advance; a throw on the stuck relay is logged as refused", () => {
    const s = setup();
    s.play.tick(4);
    expect(s.grid.state().batteries.get("bat")?.charge).toBe(4);
    s.play.click("sw");
    expect(s.entries()[0]).toMatchObject({ kind: "throw-switch", target: "sw", ok: false });
  });
});

describe("battery log", () => {
  it("records release, stop and flat with game time and wall-clock time", () => {
    const s = setup();
    s.play.tick(3);
    s.play.click("bat"); // release at 3 s
    s.play.tick(1);
    s.play.click("bat"); // stop at 4 s, 2 s of charge left
    s.play.tick(2); // recharges to 4
    s.play.click("bat"); // release at 6 s
    s.play.tick(5); // 4 s of charge: flat at the end of this tick
    const e = s.entries();
    expect(e.map((x) => x["kind"])).toEqual(["battery-release", "battery-stop", "battery-release", "battery-flat"]);
    expect(e.map((x) => x["gameTime"])).toEqual([3, 4, 6, 11]);
    expect(e[3]).toMatchObject({ target: "bat", stopped: false, ok: true });
    expect(typeof e[3]!["time"]).toBe("number");
  });
});
