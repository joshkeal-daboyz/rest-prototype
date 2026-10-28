import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { EventBus, loadPuzzle, type Puzzle } from "../core";
import { createGrid, type Grid } from "../grid";
import type { MapRenderer } from "../render";
import { createMapPlay } from "./index";

/** Ticket 020 A: the play-time clock. */
const shrine = (): Puzzle =>
  loadPuzzle(JSON.parse(readFileSync(join(__dirname, "../../puzzles/08-shrine-circuit.json"), "utf8")) as unknown);
const renderer = { draw() {}, resize() {}, setInsets() {}, notify() {}, hitTest: () => null } as unknown as MapRenderer;

function setup() {
  const puzzle = shrine();
  const bus = new EventBus();
  const grid = createGrid(puzzle, bus);
  const play = createMapPlay(puzzle, grid, renderer, bus);
  return { puzzle, bus, grid, play };
}
const winClicks = (p: ReturnType<typeof setup>["play"]) => {
  p.click("sw_1");
  p.click("l_b");
  p.click("br_street");
};

describe("elapsed clock", () => {
  it("starts at 0 and sums ticks; zero and negative dt add nothing", () => {
    const { play } = setup();
    expect(play.view().elapsed).toBe(0);
    play.tick(0.5);
    play.tick(0.5);
    play.tick(0.5);
    expect(play.view().elapsed).toBe(1.5);
    play.tick(0);
    play.tick(-3);
    expect(play.view().elapsed).toBe(1.5);
  });

  it("clicks, refused clicks and undo do not move it", () => {
    const { play } = setup();
    play.tick(2);
    play.click("sw_1");
    play.click("j_dead"); // refused: no parts
    play.undo();
    expect(play.view().elapsed).toBe(2);
  });

  it("a winning click stops it while relightT keeps counting", () => {
    const { play, grid } = setup();
    play.tick(2);
    winClicks(play);
    expect(grid.state().complete).toBe(true);
    play.tick(5);
    expect(play.view().elapsed).toBe(2);
    expect(play.view().relightT).toBe(5);
  });

  it("a win during a tick counts that tick's dt, then stops", () => {
    // Stub grid: the job completes inside advance(). (No real map completes on a tick alone.)
    const puzzle = shrine();
    const bus = new EventBus();
    let complete = false;
    const grid = {
      state: () => ({ complete }),
      advance: (dt: number) => {
        if (dt !== 0.75) return;
        complete = true;
        bus.emit("job:completed", { puzzleId: puzzle.id, actions: 0 });
      },
      reset: () => {
        complete = false;
      },
    } as unknown as Grid;
    const play = createMapPlay(puzzle, grid, renderer, bus);
    play.tick(1);
    play.tick(0.75); // wins here
    play.tick(4);
    expect(play.view().elapsed).toBe(1.75);
  });

  it("reset zeroes it and it counts again, including after a win", () => {
    const { play } = setup();
    play.tick(3);
    winClicks(play);
    play.tick(1);
    play.reset();
    expect(play.view().elapsed).toBe(0);
    play.tick(1);
    expect(play.view().elapsed).toBe(1);
    expect(play.view().relightT).toBeNull();
  });
});
