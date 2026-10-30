import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";
import { EventBus, loadPuzzle } from "../core";
import { createGrid } from "../grid";
import type { MapPanView, MapRenderer } from "../render";
import { attachPan, DRAG_SLOP, PINCH_STEP, RIGHT_DOUBLE_MS, WHEEL_IDLE_MS, WHEEL_MAX_STEPS } from "./pan";
import { createMapPlay } from "./play";

type Handler = (e: never) => void;

/** A fake event target that keeps its handlers so tests can fire events and check detach. */
function fakeTarget() {
  const handlers = new Map<string, Set<Handler>>();
  return {
    handlers,
    options: new Map<string, unknown>(),
    addEventListener(type: string, fn: Handler, options?: unknown) {
      this.options.set(type, options);
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
    clientWidth: 900,
    clientHeight: 600,
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
    getScale: () => 40,
    zoomStep: vi.fn((_dir: 1 | -1, _x?: number, _y?: number) => 40),
    fitWhole: vi.fn(),
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
    key: (key: string, extra: Record<string, unknown> = {}) => doc.fire("keydown", { key, target: { tagName: "BODY" }, ...extra }),
    wheel: (deltaY: number, extra: Record<string, unknown> = {}) =>
      canvas.fire("wheel", { deltaY, deltaMode: 0, clientX: 300, clientY: 200, ...extra }),
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
    s.key("ArrowLeft");
    s.key("+");
    s.key("f");
    s.wheel(-100);
    s.wheel(-15, { ctrlKey: true });

    expect(play.exportLog()).toBe(logBefore);
    expect(grid.state().actions).toBe(actionsBefore);
    expect(clicks).not.toHaveBeenCalled();
  });
});

describe("attachPan arrows, wheel and zoom keys (ticket 027 B)", () => {
  it("arrows pan by a third of the free area, the map moving against the arrow", () => {
    const s = setup(); // pan {10, 20}, free area 900 x 600
    const right = s.key("ArrowRight");
    expect(s.view.setPan).toHaveBeenLastCalledWith(10 - 300, 20);
    expect(right.preventDefault).toHaveBeenCalled();
    s.key("ArrowLeft");
    expect(s.view.setPan).toHaveBeenLastCalledWith(10, 20);
    s.key("ArrowDown");
    expect(s.view.setPan).toHaveBeenLastCalledWith(10, 20 - 200);
    s.key("ArrowUp");
    expect(s.view.setPan).toHaveBeenLastCalledWith(10, 20);
  });

  it("arrows, zoom keys and F do nothing from a select, input, textarea or with Ctrl, Alt or Meta", () => {
    const s = setup();
    for (const key of ["ArrowRight", "ArrowUp", "+", "=", "-", "F", "f", "Home"]) {
      for (const tagName of ["SELECT", "INPUT", "TEXTAREA"]) {
        const ev = s.key(key, { target: { tagName } });
        expect(ev.preventDefault).not.toHaveBeenCalled();
      }
      for (const mod of ["ctrlKey", "altKey", "metaKey"]) {
        const ev = s.key(key, { [mod]: true });
        expect(ev.preventDefault).not.toHaveBeenCalled();
      }
    }
    expect(s.view.setPan).not.toHaveBeenCalled();
    expect(s.view.zoomStep).not.toHaveBeenCalled();
    expect(s.view.fitWhole).not.toHaveBeenCalled();
    expect(s.view.resetView).not.toHaveBeenCalled();
  });

  it("+, = and - zoom about the centre (no point); F and f fit the whole map; Home still resets", () => {
    const s = setup();
    s.key("+");
    s.key("=");
    s.key("-");
    expect(s.view.zoomStep.mock.calls).toEqual([[1], [1], [-1]]);
    s.key("F");
    s.key("f");
    expect(s.view.fitWhole).toHaveBeenCalledTimes(2);
    s.key("Home");
    expect(s.view.resetView).toHaveBeenCalledTimes(1);
    expect(s.key("x").preventDefault).not.toHaveBeenCalled();
  });

  it("the wheel listener is passive: false; a notch zooms one level about the pointer and prevents default", () => {
    const s = setup();
    expect(s.canvas.options.get("wheel")).toEqual({ passive: false });
    const up = s.wheel(-100);
    expect(s.view.zoomStep).toHaveBeenCalledTimes(1);
    expect(s.view.zoomStep).toHaveBeenLastCalledWith(1, 300, 200);
    expect(up.preventDefault).toHaveBeenCalled();
    s.wheel(100);
    expect(s.view.zoomStep).toHaveBeenCalledTimes(2);
    expect(s.view.zoomStep).toHaveBeenLastCalledWith(-1, 300, 200);
  });

  it("pointer coordinates are relative to the canvas", () => {
    const s = setup();
    (s.canvas as unknown as { getBoundingClientRect: () => unknown }).getBoundingClientRect = () => ({ left: 50, top: 30 });
    s.wheel(-100);
    expect(s.view.zoomStep).toHaveBeenLastCalledWith(1, 250, 170);
  });

  it("deltaMode 1 with deltaY 3 is one notch; a big delta is limited to WHEEL_MAX_STEPS", () => {
    const s = setup();
    s.wheel(3, { deltaMode: 1 });
    expect(s.view.zoomStep).toHaveBeenCalledTimes(1);
    expect(s.view.zoomStep).toHaveBeenLastCalledWith(-1, 300, 200);
    s.wheel(-1000);
    expect(s.view.zoomStep).toHaveBeenCalledTimes(1 + WHEEL_MAX_STEPS);
    expect(s.view.zoomStep).toHaveBeenLastCalledWith(1, 300, 200);
  });

  it("small touchpad wheel deltas add up to a notch; a reversal drops the leftover; idle time forgets it", () => {
    const s = setup();
    s.at(0);
    for (let i = 0; i < 3; i++) s.wheel(-30);
    expect(s.view.zoomStep).not.toHaveBeenCalled(); // 90 of 100
    s.wheel(-30); // 120: one level, 20 left over
    expect(s.view.zoomStep).toHaveBeenCalledTimes(1);
    s.wheel(30); // reversal starts afresh
    s.wheel(30);
    s.wheel(30);
    expect(s.view.zoomStep).toHaveBeenCalledTimes(1);
    s.wheel(30);
    expect(s.view.zoomStep).toHaveBeenCalledTimes(2);
    expect(s.view.zoomStep).toHaveBeenLastCalledWith(-1, 300, 200);
    s.wheel(-60);
    s.at(WHEEL_IDLE_MS + 10);
    s.wheel(-60); // the first 60 was forgotten
    expect(s.view.zoomStep).toHaveBeenCalledTimes(2);
  });

  it("pinch (ctrl + wheel): -15 three times is one zoom-in about the last pointer; under 40 does nothing", () => {
    const s = setup();
    s.wheel(-15, { ctrlKey: true, clientX: 10, clientY: 10 });
    s.wheel(-15, { ctrlKey: true, clientX: 20, clientY: 20 });
    expect(s.view.zoomStep).not.toHaveBeenCalled();
    const ev = s.wheel(-15, { ctrlKey: true, clientX: 30, clientY: 40 });
    expect(s.view.zoomStep).toHaveBeenCalledTimes(1);
    expect(s.view.zoomStep).toHaveBeenLastCalledWith(1, 30, 40);
    expect(ev.preventDefault).toHaveBeenCalled();
    s.wheel(PINCH_STEP, { ctrlKey: true });
    expect(s.view.zoomStep).toHaveBeenLastCalledWith(-1, 300, 200);
  });

  it("detach removes the wheel listener along with the rest", () => {
    const s = setup();
    expect(s.canvas.handlers.has("wheel")).toBe(true);
    s.detach();
    expect(s.canvas.handlers.size).toBe(0);
    expect(s.doc.handlers.size).toBe(0);
  });
});
