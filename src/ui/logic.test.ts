import { describe, expect, it } from "vitest";
import { batteryCountdown, bannerText, capacityReadout, mapLabel, partsSummary, promptPosition, promptToShow, targetRows, WIN_TEXT } from "./logic";

describe("batteryCountdown", () => {
  const battery = (charge: number, released: boolean) => ({ charge, capacity: 10, released, charging: false });

  it("is null when no battery is released", () => {
    expect(batteryCountdown({ batteries: new Map([["b1", battery(7, false)]]) })).toBeNull();
    expect(batteryCountdown({ batteries: new Map() })).toBeNull();
  });

  it("rounds a released charge up to whole seconds", () => {
    expect(batteryCountdown({ batteries: new Map([["b1", battery(3.2, true)]]) })).toBe("Battery: 4 s");
  });

  it("shows the lowest charge when several batteries are released", () => {
    const batteries = new Map([
      ["b1", battery(6.5, true)],
      ["b2", battery(2.1, true)],
      ["b3", battery(1, false)],
    ]);
    expect(batteryCountdown({ batteries })).toBe("Battery: 3 s");
  });
});

describe("promptPosition", () => {
  const bounds = { width: 800, height: 600 };
  const box = { width: 200, height: 40 };

  it("sits a small offset right and below the pointer", () => {
    expect(promptPosition({ x: 100, y: 100 }, bounds, box)).toEqual({ left: 116, top: 116 });
  });

  it("is pulled back inside the right and bottom edges", () => {
    expect(promptPosition({ x: 790, y: 590 }, bounds, box)).toEqual({ left: 592, top: 552 });
  });

  it("never goes past the left and top margin", () => {
    expect(promptPosition({ x: -50, y: -50 }, bounds, box)).toEqual({ left: 8, top: 8 });
  });
});

describe("promptToShow", () => {
  it("shows the play prompt while the map is idle", () => {
    expect(promptToShow({ prompt: "Throw breaker", relightT: null })).toBe("Throw breaker");
    expect(promptToShow({ prompt: "Needs: wire × 2", relightT: null })).toBe("Needs: wire × 2");
  });

  it("shows nothing when play has no prompt for the pointer", () => {
    expect(promptToShow({ prompt: null, relightT: null })).toBeNull();
  });

  it("shows nothing once the Relight has started, even if a prompt is still set", () => {
    expect(promptToShow({ prompt: "Throw switch", relightT: 0 })).toBeNull();
    expect(promptToShow({ prompt: "Throw switch", relightT: 1.5 })).toBeNull();
  });
});

describe("bannerText", () => {
  it("shows the win banner exactly when the grid reports complete", () => {
    expect(bannerText({ complete: true })).toBe(WIN_TEXT);
    expect(bannerText({ complete: false })).toBeNull();
  });
});

describe("partsSummary", () => {
  it("lists all three kinds, with zero counts and plural forms", () => {
    expect(partsSummary([])).toBe("On hand: 0 bulbs, 0 fuses, 0 wires");
    expect(partsSummary(["wire"])).toBe("On hand: 0 bulbs, 0 fuses, 1 wire");
    expect(partsSummary(["wire", "wire", "bulb"])).toBe("On hand: 1 bulb, 0 fuses, 2 wires");
    expect(partsSummary(["fuse"])).toBe("On hand: 0 bulbs, 1 fuse, 0 wires");
  });
});

describe("capacityReadout", () => {
  it("shows load over capacity", () => {
    expect(capacityReadout(3, 4, false)).toBe("Load 3 / 4");
  });

  it("names the brownout in words, not only by colour", () => {
    expect(capacityReadout(6, 4, true)).toBe("Load 6 / 4 · Brownout");
  });

  it("reads unlimited capacity as no limit", () => {
    expect(capacityReadout(2, null, false)).toBe("Load 2 (no limit)");
  });
});

describe("targetRows", () => {
  it("marks a target lit only when it is lit and there is no brownout", () => {
    const lit = new Set(["shrine", "street_1"]);
    expect(targetRows(["shrine"], lit, false)).toEqual([{ id: "shrine", lit: true, text: "shrine: lit" }]);
    expect(targetRows(["shrine"], lit, true)).toEqual([{ id: "shrine", lit: false, text: "shrine: dark" }]);
  });

  it("marks a target dark when its lamp is not lit", () => {
    expect(targetRows(["far_lamp"], new Set(), false)).toEqual([
      { id: "far_lamp", lit: false, text: "far lamp: dark" },
    ]);
  });
});

describe("mapLabel", () => {
  it("marks locked maps in the picker text", () => {
    expect(mapLabel({ name: "The shrine circuit", locked: false })).toBe("The shrine circuit");
    expect(mapLabel({ name: "The shrine circuit", locked: true })).toBe("The shrine circuit (locked)");
  });
});
