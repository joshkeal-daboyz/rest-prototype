import { expect, it } from "vitest";
import type { LoadPreview } from "../core/preview";
import type { TimerReadout } from "../core/state";
import { overlayLabels, type OverlayIcon } from "./overlay";
import { createFlipTracker, cueIds, timerRing } from "./timerring";

const at = (closed: boolean, next: number): TimerReadout => ({ closed, next });
const TAU = Math.PI * 2;

it("the ring: the closed share's arc, the hand where the clock stands, the whole seconds, no number before the first move, and one pulse per flip (081 TB3)", () => {
  const t = { closed: 6, open: 2 };
  const r = timerRing(t, at(true, 4), 2);
  expect([r.closedEnd, r.hand, r.label]).toEqual([TAU * 0.75, TAU * 0.25, "4"]);
  const o = timerRing(t, at(false, 0.4), 7.6);
  expect([o.hand, o.label]).toEqual([TAU * 0.95, "1"]);
  expect(timerRing({ ...t, offset: 6 }, at(false, 2), null)).toEqual({ closedEnd: TAU * 0.75, hand: TAU * 0.75, label: null });
  const f = createFlipTracker();
  expect([f.pulse("a", true, 0, 1), f.pulse("a", true, 1, 2)]).toEqual([0, 0]);
  expect(f.pulse("a", false, 3, 3)).toBe(1);
  expect(f.pulse("a", false, 3.3, 3.3)).toBeCloseTo(0.5);
  expect(f.pulse("a", false, 4, 4)).toBe(0);
});

it("the next cue shows for a hovered timer, and for an unhovered one within 3 s of its flip; for both timers of a coincident pair and one that flips after another; not under the numbers off (081 TB3)", () => {
  const ids = (hover: string | null, timers: [string, TimerReadout][], clock: number | null = 5) => [...cueIds([], hover, new Map(timers), clock)];
  expect(ids("a", [["a", at(true, 8)]])).toEqual(["a"]);
  expect(ids(null, [["a", at(true, 3)]])).toEqual(["a"]);
  expect(ids(null, [["a", at(true, 3.1)]])).toEqual([]);
  expect(ids(null, [["a", at(true, 1)]], null)).toEqual([]);
  expect(ids("sw", [["a", at(true, 2)]])).toEqual(["sw", "a"]);
  // The preview is joint (TB1b1): both timers of a coincident pair show, and so does a timer that flips after another.
  expect(ids("a", [["a", at(true, 2)], ["b", at(false, 2)]])).toEqual(["a", "b"]);
  expect(ids(null, [["a", at(true, 2)], ["b", at(false, 2)]])).toEqual(["a", "b"]);
  expect(ids(null, [["a", at(true, 2)], ["b", at(false, 3)]])).toEqual(["a", "b"]);
  expect(ids("b", [["a", at(true, 2)], ["b", at(false, 5)]])).toEqual(["b", "a"]);
  // The number: drawn for the shown timer with the clock mark, red when over; not under V or the Relight (a null preview, or relighting).
  const ring = { closedEnd: 1, hand: 0, label: "2" };
  const icon = { id: "a", type: "breaker", x: 10, y: 10, size: 30, ring } as unknown as OverlayIcon;
  const preview: LoadPreview = new Map([["a", { kind: "breaker", delta: 3, over: true, blows: [] }]]);
  const state = { timers: new Map([["a", at(true, 2)]]), clock: 5, fuseLoad: new Map(), feeds: new Map() } as never;
  const shown = overlayLabels([icon], [], preview, state, new Map());
  expect(shown.map((l) => [l.text, l.red, l.clock])).toEqual([["+3", true, true]]);
  expect(overlayLabels([icon], [], null, state, new Map())).toEqual([]);
  expect(overlayLabels([icon], [], preview, state, new Map(), true)).toEqual([]);
  expect(overlayLabels([icon], [], preview, { ...(state as object), timers: new Map([["a", at(true, 5)]]) } as never, new Map())).toEqual([]);
});
