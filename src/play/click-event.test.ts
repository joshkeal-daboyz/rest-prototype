import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { EventBus, loadPuzzle, type Events } from "../core";
import { createGrid } from "../grid";
import type { MapRenderer } from "../render";
import { createMapPlay } from "./index";

function setup() {
  const puzzle = loadPuzzle(
    JSON.parse(readFileSync(join(__dirname, "../../puzzles/08-shrine-circuit.json"), "utf8")) as unknown,
  );
  const bus = new EventBus();
  const grid = createGrid(puzzle, bus);
  const renderer = { draw() {}, resize() {}, setInsets() {}, notify() {}, hitTest: () => null } as MapRenderer;
  const play = createMapPlay(puzzle, grid, renderer, bus);
  const got: Events["play:click"][] = [];
  bus.on("play:click", (e) => got.push(e));
  return { play, got };
}

describe("play:click", () => {
  it("emits refused with the target when a repair is refused", () => {
    const { play, got } = setup();
    play.click("j_dead"); // needs 2 wires, none on hand
    expect(got).toEqual([{ kind: "refused", target: "j_dead" }]);
  });

  it("emits nothing for accepted actions or clicks with no intent", () => {
    const { play, got } = setup();
    play.click("sw_1");
    play.click("br_main");
    play.click("l_feed");
    play.click(null);
    expect(got).toEqual([]);
  });

  it("emits undo every time, even with nothing to undo, and reset every time (no target key)", () => {
    const { play, got } = setup();
    play.undo();
    play.click("sw_1");
    play.undo();
    play.reset();
    expect(got).toEqual([{ kind: "undo" }, { kind: "undo" }, { kind: "reset" }]);
    expect("target" in got[0]!).toBe(false);
  });

  it("emits nothing for click or undo once the job is complete, but reset still does", () => {
    const { play, got } = setup();
    play.click("sw_1");
    play.click("l_b");
    play.click("br_street");
    got.length = 0;
    play.click("j_dead");
    play.undo();
    expect(got).toEqual([]);
    play.reset();
    expect(got).toEqual([{ kind: "reset" }]);
  });
});
