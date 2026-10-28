import { describe, expect, it } from "vitest";
import {
  batteryCountdown,
  bannerText,
  capacityReadout,
  liveNotices,
  mapLabel,
  noticeFor,
  noticeOpacity,
  partsSummary,
  promptPosition,
  promptToShow,
  targetRows,
  WIN_TEXT,
} from "./logic";
import type { LogEntry } from "../play";

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
  it("shows the powersource level and the live total against it", () => {
    expect(capacityReadout(3, 4, false)).toBe("Lv4 Powersource — using 3 of 4");
  });

  it("names the brownout in words, not only by colour", () => {
    expect(capacityReadout(6, 4, true)).toBe("Lv4 Powersource — using 6 of 4 · Brownout");
  });

  it("drops the Brownout word once the section recovers", () => {
    expect(capacityReadout(4, 4, false)).toBe("Lv4 Powersource — using 4 of 4");
  });

  it("reads unlimited capacity as Powersource with no level and no limit", () => {
    expect(capacityReadout(2, null, false)).toBe("Powersource — using 2 (no limit)");
  });

  it("adds the Brownout word to an unlimited powersource too, and still shows no level", () => {
    expect(capacityReadout(2, null, true)).toBe("Powersource — using 2 (no limit) · Brownout");
  });

  it("prints a non-integer total as the simulator gives it", () => {
    expect(capacityReadout(2.5, 4, false)).toBe("Lv4 Powersource — using 2.5 of 4");
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

describe("noticeFor", () => {
  const log = (over: Partial<LogEntry>): LogEntry => ({ step: 1, time: 0, kind: "throw-switch", ok: false, ...over });
  const relays = new Set(["relay_a"]);

  it("names the fuse level and what it carried when a fuse blows", () => {
    expect(noticeFor({ kind: "fuse:blown", load: 2, rating: 1 })).toBe("Lv1 Fuse blew: carrying 2");
  });

  it("says brownout with the powersource level and the total when the section goes over, and nothing when it recovers", () => {
    expect(noticeFor({ kind: "grid:brownout", brownout: true, load: 5, capacity: 4 })).toBe(
      "Brownout: Lv4 Powersource using 5 of 4",
    );
    expect(noticeFor({ kind: "grid:brownout", brownout: false, load: 4, capacity: 4 })).toBeNull();
  });

  it("says the battery is flat when it ran out, not when the player stopped it", () => {
    expect(noticeFor({ kind: "battery:flat", stopped: false })).toBe("Battery flat");
    expect(noticeFor({ kind: "battery:flat", stopped: true })).toBeNull();
  });

  it("says no power at a relay whose throw was refused", () => {
    expect(noticeFor({ kind: "relay-refused", entry: log({ target: "relay_a" }), relays })).toBe(
      "No power at that relay",
    );
  });

  it("stays quiet for a relay throw that worked, a refused non-relay switch, or other refused actions", () => {
    expect(noticeFor({ kind: "relay-refused", entry: log({ target: "relay_a", ok: true }), relays })).toBeNull();
    expect(noticeFor({ kind: "relay-refused", entry: log({ target: "plain_switch" }), relays })).toBeNull();
    expect(noticeFor({ kind: "relay-refused", entry: log({ kind: "repair-refused", target: "relay_a" }), relays })).toBeNull();
    expect(noticeFor({ kind: "relay-refused", entry: log({ kind: "throw-breaker", target: "relay_a" }), relays })).toBeNull();
  });
});

describe("noticeOpacity", () => {
  it("is fully opaque until the last second, then fades to nothing at four seconds", () => {
    expect(noticeOpacity(0)).toBe(1);
    expect(noticeOpacity(3000)).toBe(1);
    expect(noticeOpacity(3500)).toBeCloseTo(0.5);
    expect(noticeOpacity(4000)).toBe(0);
    expect(noticeOpacity(9000)).toBe(0);
  });
});

describe("liveNotices", () => {
  it("drops notices past their lifetime", () => {
    const notices = [{ born: 0, text: "old" }, { born: 2500, text: "new" }];
    expect(liveNotices(notices, 4000).map((n) => n.text)).toEqual(["new"]);
  });

  it("keeps the newest few when several stack up, in arrival order", () => {
    const notices = [1, 2, 3, 4, 5, 6].map((i) => ({ born: 1000 + i, text: `n${i}` }));
    expect(liveNotices(notices, 1100, 4).map((n) => n.text)).toEqual(["n3", "n4", "n5", "n6"]);
  });

  it("returns an empty list when nothing is live", () => {
    expect(liveNotices([{ born: 0 }], 10000)).toEqual([]);
  });
});
