import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { EventBus, loadPuzzle, type Puzzle } from "../core";
import { createGrid } from "../grid";
import type { MapRenderer } from "../render";
import { createMapPlay, NEEDS_FLASH_SECONDS } from "./index";

const shrine = (): Puzzle =>
  loadPuzzle(JSON.parse(readFileSync(join(__dirname, "../../puzzles/shrine-circuit.json"), "utf8")) as unknown);

/** A renderer whose hitTest answers with whatever id the test last chose. */
function fakeRenderer(): MapRenderer & { next: string | null; calls: Array<[number, number]> } {
  const r = {
    next: null as string | null,
    calls: [] as Array<[number, number]>,
    draw() {},
    resize() {},
    hitTest(x: number, y: number) {
      r.calls.push([x, y]);
      return r.next;
    },
  };
  return r;
}

function setup() {
  const puzzle = shrine();
  const bus = new EventBus();
  const grid = createGrid(puzzle, bus);
  const renderer = fakeRenderer();
  let t = 1000;
  const play = createMapPlay(puzzle, grid, renderer, bus, { now: () => (t += 10) });
  const over = (id: string | null) => {
    play.hoverAt(id);
    return play.view();
  };
  return { puzzle, bus, grid, renderer, play, over };
}

/** Win the shrine circuit: switch to the B run, repair the cable, open the street breaker. */
function win(s: ReturnType<typeof setup>) {
  s.play.click("sw_1");
  s.play.click("l_b");
  s.play.click("br_street");
}

describe("prompts", () => {
  it("names breakers and switches", () => {
    const s = setup();
    expect(s.over("br_main")).toMatchObject({ hover: "br_main", prompt: "Throw breaker" });
    expect(s.over("sw_1")).toMatchObject({ hover: "sw_1", prompt: "Throw switch" });
  });

  it("shows the shortfall for a readable fault the satchel can't cover", () => {
    const s = setup();
    expect(s.over("j_dead").prompt).toBe("Needs: wire × 2");
  });

  it("gives no repair prompt for an unreadable fault, and null for anything else", () => {
    const s = setup();
    expect(s.over("l_b").prompt).toBeNull(); // dead feed side: unreadable
    expect(s.over("shrine").prompt).toBeNull();
    expect(s.over("l_feed").prompt).toBeNull();
    expect(s.over(null)).toMatchObject({ hover: null, prompt: null });
  });

  it("offers Repair (wire) once the fault is readable and the part is on hand", () => {
    const s = setup();
    s.play.click("sw_1");
    expect(s.over("l_b").prompt).toBe("Repair (wire)");
  });
});

describe("clicks", () => {
  it("throws breakers and switches through the grid", () => {
    const s = setup();
    s.play.click("br_street");
    expect(s.grid.state().breakers.get("br_street")).toBe(false);
    s.play.click("sw_1");
    expect(s.grid.state().switches.get("sw_1")).toBe(1);
  });

  it("repairs a readable fault and consumes the part", () => {
    const s = setup();
    s.play.click("sw_1");
    s.play.click("l_b");
    expect(s.grid.state().faults.map((f) => f.id)).toEqual(["f1"]);
    expect(s.grid.state().parts).toEqual([]);
  });

  it("ignores an unreadable fault", () => {
    const s = setup();
    s.play.click("l_b");
    expect(s.grid.state().faults).toHaveLength(2);
    expect(s.grid.state().actions).toBe(0);
    expect(JSON.parse(s.play.exportLog()).entries).toHaveLength(0);
  });

  it("flashes the shortfall for a second after a refused repair", () => {
    const s = setup();
    s.play.click("j_dead");
    expect(s.grid.state().parts).toEqual(["wire"]);
    s.play.hoverAt(null);
    expect(s.play.view().prompt).toBe("Needs: wire × 2");
    s.play.tick(NEEDS_FLASH_SECONDS - 0.1);
    expect(s.play.view().prompt).toBe("Needs: wire × 2");
    s.play.tick(0.2);
    expect(s.play.view().prompt).toBeNull();
  });

  it("reads hover and clicks from the canvas through renderer.hitTest", () => {
    const s = setup();
    const handlers = new Map<string, (e: unknown) => void>();
    const canvas = {
      addEventListener: (n: string, f: (e: unknown) => void) => handlers.set(n, f),
      removeEventListener: (n: string) => handlers.delete(n),
      getBoundingClientRect: () => ({ left: 10, top: 20 }),
    } as unknown as HTMLCanvasElement;
    const detach = s.play.attach(canvas);
    s.renderer.next = "br_main";
    handlers.get("pointermove")?.({ clientX: 110, clientY: 70 });
    expect(s.renderer.calls.at(-1)).toEqual([100, 50]);
    expect(s.play.view()).toMatchObject({ hover: "br_main", prompt: "Throw breaker" });
    handlers.get("click")?.({ clientX: 110, clientY: 70 });
    expect(s.grid.state().breakers.get("br_main")).toBe(false);
    handlers.get("pointerleave")?.({});
    expect(s.play.view().hover).toBeNull();
    detach();
    expect(handlers.size).toBe(0);
  });
});

describe("undo and reset", () => {
  it("undo reverts the last action; reset restores the start", () => {
    const s = setup();
    s.play.click("br_street");
    s.play.undo();
    expect(s.grid.state().breakers.get("br_street")).toBe(true);
    s.play.click("sw_1");
    s.play.click("br_main");
    s.play.reset();
    expect(s.grid.state().switches.get("sw_1")).toBe(0);
    expect(s.grid.state().breakers.get("br_main")).toBe(true);
  });
});

describe("the Relight", () => {
  it("ignores clicks and counts relightT up from 0 after job:completed", () => {
    const s = setup();
    expect(s.play.view().relightT).toBeNull();
    let completed = 0;
    s.bus.on("job:completed", () => completed++);
    win(s);
    expect(completed).toBe(1);
    expect(s.play.view().relightT).toBe(0);
    s.play.tick(0.5);
    s.play.tick(0.25);
    expect(s.play.view().relightT).toBeCloseTo(0.75);

    const before = s.grid.state().actions;
    const entries = JSON.parse(s.play.exportLog()).entries.length;
    s.play.click("br_main");
    s.play.click("sw_1");
    s.play.undo();
    expect(s.grid.state().actions).toBe(before);
    expect(s.grid.state().complete).toBe(true);
    expect(JSON.parse(s.play.exportLog()).entries).toHaveLength(entries);
    expect(s.over("br_main").prompt).toBeNull();
  });

  it("reset clears it", () => {
    const s = setup();
    win(s);
    s.play.reset();
    expect(s.play.view().relightT).toBeNull();
  });
});

describe("session log", () => {
  it("records throws, repairs, refusals, undo and reset with monotonic steps and times", () => {
    const s = setup();
    s.play.click("j_dead"); // refused: needs-parts
    s.play.click("sw_1");
    s.play.click("l_b"); // repair
    s.play.click("br_main");
    s.play.undo();
    s.play.reset();
    const log = JSON.parse(s.play.exportLog()) as {
      puzzle: string;
      entries: Array<{ step: number; time: number; kind: string; target?: string; ok: boolean; reason?: string }>;
    };
    expect(log.puzzle).toBe("shrine-circuit");
    expect(log.entries.map((e) => e.kind)).toEqual([
      "repair-refused",
      "throw-switch",
      "repair",
      "throw-breaker",
      "undo",
      "reset",
    ]);
    expect(log.entries.map((e) => e.step)).toEqual([1, 2, 3, 4, 5, 6]);
    for (let i = 1; i < log.entries.length; i++) {
      expect(log.entries[i]!.time).toBeGreaterThan(log.entries[i - 1]!.time);
    }
    expect(log.entries[0]).toMatchObject({ target: "j_dead", ok: false, reason: "needs-parts", needs: { part: "wire", count: 2, have: 1 } });
    expect(log.entries[2]).toMatchObject({ target: "l_b", ok: true, fault: "f2" });
  });

  it("keeps steps increasing across a reset", () => {
    const s = setup();
    s.play.click("br_main");
    s.play.reset();
    s.play.click("br_main");
    const steps = (JSON.parse(s.play.exportLog()).entries as Array<{ step: number }>).map((e) => e.step);
    expect(steps).toEqual([1, 2, 3]);
  });
});
