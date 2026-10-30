import { describe, expect, it } from "vitest";
import { BLOCKER_SELECTORS, measureBlockers, type BlockerRoot } from "./blockers";

interface Box {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

/** A stub element: counts its getBoundingClientRect reads. */
function stub(box: Box) {
  const el = {
    reads: 0,
    getBoundingClientRect(): Box {
      el.reads += 1;
      return box;
    },
  };
  return el;
}

/** A stub root whose querySelectorAll returns the elements registered for each selector, and records the queries. */
function root(bySelector: Record<string, ReturnType<typeof stub>[]>) {
  const queries: string[] = [];
  const r: BlockerRoot = {
    querySelectorAll(selector: string) {
      queries.push(selector);
      return bySelector[selector] ?? [];
    },
  };
  return { root: r, queries };
}

/** A canvas at client (30, 40), 1100 x 650. */
const canvas = stub({ left: 30, top: 40, right: 1130, bottom: 690 });

describe("BLOCKER_SELECTORS", () => {
  it("lists the HUD columns, the inventory, the sound dock and its popover", () => {
    expect([...BLOCKER_SELECTORS]).toEqual([".hud", ".inventory", ".sound-dock", ".sound-popover"]);
  });
});

describe("measureBlockers", () => {
  it("queries exactly the blocker selectors, in order", () => {
    const { root: r, queries } = root({});
    measureBlockers(r, canvas);
    expect(queries).toEqual([...BLOCKER_SELECTORS]);
  });

  it("returns nothing when no panel is on the page", () => {
    const { root: r } = root({});
    expect(measureBlockers(r, canvas)).toEqual([]);
  });

  it("makes a panel's rect relative to the canvas's client origin", () => {
    const hud = stub({ left: 50, top: 60, right: 150, bottom: 120 });
    const { root: r } = root({ ".hud": [hud] });
    expect(measureBlockers(r, canvas)).toEqual([{ left: 20, top: 20, right: 120, bottom: 80 }]);
  });

  it("gives two rects for two .hud columns", () => {
    const left = stub({ left: 30, top: 40, right: 230, bottom: 300 });
    const right = stub({ left: 930, top: 40, right: 1130, bottom: 260 });
    const { root: r } = root({ ".hud": [left, right] });
    expect(measureBlockers(r, canvas)).toEqual([
      { left: 0, top: 0, right: 200, bottom: 260 },
      { left: 900, top: 0, right: 1100, bottom: 220 },
    ]);
  });

  it("clips a panel that overhangs the canvas edges", () => {
    // Client x from 0 to 200 (canvas starts at 30) and y from 600 to 800 (canvas ends at 690 client).
    const overhang = stub({ left: 0, top: 600, right: 200, bottom: 800 });
    const { root: r } = root({ ".inventory": [overhang] });
    expect(measureBlockers(r, canvas)).toEqual([{ left: 0, top: 560, right: 170, bottom: 650 }]);
  });

  it("clips a panel that overhangs the right and top edges", () => {
    const overhang = stub({ left: 1000, top: 0, right: 1300, bottom: 100 });
    const { root: r } = root({ ".hud": [overhang] });
    expect(measureBlockers(r, canvas)).toEqual([{ left: 970, top: 0, right: 1100, bottom: 60 }]);
  });

  it("drops a 0x0 rect (a closed popover is display:none)", () => {
    const closed = stub({ left: 0, top: 0, right: 0, bottom: 0 });
    const inside = stub({ left: 100, top: 100, right: 100, bottom: 100 });
    const { root: r } = root({ ".sound-popover": [closed, inside] });
    expect(measureBlockers(r, canvas)).toEqual([]);
  });

  it("drops a rect wholly off the canvas", () => {
    const above = stub({ left: 100, top: 0, right: 200, bottom: 30 });
    const left = stub({ left: 0, top: 100, right: 20, bottom: 200 });
    const right = stub({ left: 1200, top: 100, right: 1300, bottom: 200 });
    const below = stub({ left: 100, top: 800, right: 200, bottom: 900 });
    const { root: r } = root({ ".hud": [above, left, right, below] });
    expect(measureBlockers(r, canvas)).toEqual([]);
  });

  it("keeps the rects on the canvas and drops only the off ones", () => {
    const on = stub({ left: 50, top: 60, right: 150, bottom: 120 });
    const off = stub({ left: 0, top: 0, right: 10, bottom: 10 });
    const { root: r } = root({ ".hud": [off, on] });
    expect(measureBlockers(r, canvas)).toEqual([{ left: 20, top: 20, right: 120, bottom: 80 }]);
  });

  it("counts a panel's whole rect, whether or not it takes the pointer", () => {
    // The HUD text is pointer-events:none in the stylesheet; the measure does not look at styles, so it is counted too.
    const text = stub({ left: 40, top: 50, right: 90, bottom: 70 });
    const { root: r } = root({ ".hud": [text] });
    expect(measureBlockers(r, canvas)).toHaveLength(1);
  });

  it("reads each element's rect once and the canvas once", () => {
    const hud = stub({ left: 50, top: 60, right: 150, bottom: 120 });
    const inv = stub({ left: 50, top: 600, right: 300, bottom: 700 });
    const canvasReads = { n: 0 };
    const counted = {
      getBoundingClientRect(): Box {
        canvasReads.n += 1;
        return { left: 30, top: 40, right: 1130, bottom: 690 };
      },
    };
    const { root: r } = root({ ".hud": [hud], ".inventory": [inv] });
    measureBlockers(r, counted);
    expect(canvasReads.n).toBe(1);
    expect(hud.reads).toBe(1);
    expect(inv.reads).toBe(1);
  });
});
