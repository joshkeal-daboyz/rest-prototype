import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";
import { EventBus, loadPuzzle } from "../core";
import { createGrid } from "../grid";
import type { MapPanView, MapRenderer } from "../render";
import { attachPan, DRAG_SLOP, RIGHT_DOUBLE_MS } from "./pan";
import { createMapPlay } from "./play";

type Handler = (e: never) => void;

/** A fake event target that keeps its handlers so tests can fire events and check detach. */
function fakeTarget() {
  const handlers = new Map<string, Set<Handler>>();
  return {
    handlers,
    addEventListener(type: string, fn: Handler) {
      if (!handlers.has(type)) handlers.set(type, new Set());
      handlers.get(type)?.add(fn);
    },
    removeEventListener(type: string, fn: Handler) {
      handlers.get(type)?.delete(fn);
      if (handlers.get(type)?.size === 0) handlers.delete(type);
    },
    fire(type: string, e: Record<string, unknown> = {}) {
      const ev = { preventDefault: vi.fn(), ...e };
      for (const fn of [...(handlers.get(type) ?? [])]) fn(ev as never);
      return ev as { preventDefault: ReturnType<typeof vi.fn> };
    },
  };
}

function setup(opts: { capture?: boolean } = {}) {
  const canvas = Object.assign(fakeTarget(), {
    style: { cursor: "" },
    setPointerCapture: opts.capture === false ? undefined : vi.fn(),
  });
  const doc = fakeTarget();
  let pan = { x: 10, y: 20 };
  const view = {
    getPan: () => pan,
    setPan: vi.fn((x: number, y: number) => (pan = { x, y })),
    resetView: vi.fn(() => {
      pan = { x: 0, y: 0 };
    }),
  } satisfies MapPanView;
  let t = 0;
  const detach = attachPan(canvas as unknown as HTMLCanvasElement, view, doc as unknown as Document, { now: () => t });
  return {
    canvas,
    doc,
    view,
    detach,
    at: (ms: number) => void (t = ms),
    down: (x = 100, y = 100, button = 2) => canvas.fire("pointerdown", { button, clientX: x, clientY: y, pointerId: 1 }),
    move: (x: number, y: number) => canvas.fire("pointermove", { clientX: x, clientY: y, pointerId: 1 }),
    up: (button = 2) => canvas.fire("pointerup", { button, pointerId: 1 }),
  };
}

describe("attachPan", () => {
  it("detach removes every listener and restores the cursor", () => {
    const s = setup();
    s.down();
    expect(s.canvas.style.cursor).toBe("grabbing");
    s.detach();
    expect(s.canvas.handlers.size).toBe(0);
    expect(s.doc.handlers.size).toBe(0);
    expect(s.canvas.style.cursor).toBe("");
  });

  it("right-drag sets the pan from the start pan plus the pointer delta, grabbing while held", () => {
    const s = setup();
    s.down(100, 100);
    expect(s.canvas.style.cursor).toBe("grabbing");
    expect(s.canvas.setPointerCapture).toHaveBeenCalledWith(1);
    s.move(130, 80);
    expect(s.view.setPan).toHaveBeenLastCalledWith(40, 0);
    s.up();
    expect(s.canvas.style.cursor).toBe("");
  });

  it("works on a canvas without setPointerCapture", () => {
    const s = setup({ capture: false });
    expect(() => s.down()).not.toThrow();
    s.move(110, 100);
    expect(s.view.setPan).toHaveBeenCalledTimes(1);
  });

  it("ignores moves with no right button held, and left-button presses", () => {
    const s = setup();
    s.move(150, 150);
    expect(s.view.setPan).not.toHaveBeenCalled();
    s.down(100, 100, 0);
    s.move(150, 150);
    expect(s.view.setPan).not.toHaveBeenCalled();
    expect(s.canvas.style.cursor).toBe("");
    s.up(0);
    s.move(160, 160);
    expect(s.view.setPan).not.toHaveBeenCalled();
  });

  it.each(["pointercancel", "lostpointercapture"])("%s ends the hold", (type) => {
    const s = setup();
    s.down();
    s.canvas.fire(type, {});
    expect(s.canvas.style.cursor).toBe("");
    s.move(200, 200);
    expect(s.view.setPan).not.toHaveBeenCalled();
  });

  it("suppresses the context menu after a drag and after a still press", () => {
    const s = setup();
    s.down();
    s.move(160, 160);
    s.up();
    expect(s.canvas.fire("contextmenu").preventDefault).toHaveBeenCalled();
    s.at(5000);
    s.down();
    s.up();
    expect(s.canvas.fire("contextmenu").preventDefault).toHaveBeenCalled();
  });

  it("two still right presses within the window reset once and the second starts no drag", () => {
    const s = setup();
    s.at(0);
    s.down();
    s.up();
    s.at(300);
    s.down();
    expect(s.view.resetView).toHaveBeenCalledTimes(1);
    expect(s.canvas.style.cursor).toBe("");
    s.move(200, 200);
    expect(s.view.setPan).not.toHaveBeenCalled();
  });

  it("presses far apart do not reset", () => {
    const s = setup();
    s.at(0);
    s.down();
    s.up();
    s.at(RIGHT_DOUBLE_MS + 100);
    s.down();
    s.up();
    expect(s.view.resetView).not.toHaveBeenCalled();
  });

  it("a drag followed by a still press does not reset; a tiny wobble still counts as still", () => {
    const s = setup();
    s.at(0);
    s.down(100, 100);
    s.move(110, 100);
    s.up();
    s.at(100);
    s.down();
    s.up();
    expect(s.view.resetView).not.toHaveBeenCalled();

    const w = setup();
    w.at(0);
    w.down(100, 100);
    w.move(100 + DRAG_SLOP - 1, 100);
    w.up();
    w.at(200);
    w.down();
    expect(w.view.resetView).toHaveBeenCalledTimes(1);
  });

  it("Home resets and prevents default; not from a select, input, or with Ctrl", () => {
    const s = setup();
    const ev = s.doc.fire("keydown", { key: "Home", target: { tagName: "CANVAS" } });
    expect(s.view.resetView).toHaveBeenCalledTimes(1);
    expect(ev.preventDefault).toHaveBeenCalled();
    const sel = s.doc.fire("keydown", { key: "Home", target: { tagName: "SELECT" } });
    s.doc.fire("keydown", { key: "Home", target: { tagName: "INPUT" } });
    const ctrl = s.doc.fire("keydown", { key: "Home", ctrlKey: true, target: { tagName: "BODY" } });
    s.doc.fire("keydown", { key: "End", target: { tagName: "BODY" } });
    expect(s.view.resetView).toHaveBeenCalledTimes(1);
    expect(sel.preventDefault).not.toHaveBeenCalled();
    expect(ctrl.preventDefault).not.toHaveBeenCalled();
  });

  it("panning makes no grid call, adds no log entry and emits no play:click", () => {
    const puzzle = loadPuzzle(JSON.parse(readFileSync(join(__dirname, "../../puzzles/09-shrine-circuit.json"), "utf8")) as unknown);
    const bus = new EventBus();
    const grid = createGrid(puzzle, bus);
    const renderer: MapRenderer = { draw() {}, resize() {}, setInsets() {}, notify() {}, hitTest: () => null };
    const play = createMapPlay(puzzle, grid, renderer, bus);
    const clicks = vi.fn();
    bus.on("play:click", clicks);
    const logBefore = play.exportLog();
    const actionsBefore = grid.state().actions;

    const s = setup();
    s.down();
    s.move(180, 60);
    s.up();
    s.doc.fire("keydown", { key: "Home", target: { tagName: "BODY" } });

    expect(play.exportLog()).toBe(logBefore);
    expect(grid.state().actions).toBe(actionsBefore);
    expect(clicks).not.toHaveBeenCalled();
  });
});
