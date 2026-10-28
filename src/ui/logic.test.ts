import { describe, expect, it } from "vitest";
import { bannerText, capacityReadout, mapLabel, partsSummary, promptToShow, targetRows, WIN_TEXT } from "./logic";

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
