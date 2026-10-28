import { describe, expect, it } from "vitest";
import type { FeedInfo, FeedReadout } from "../core";
import { brownoutNotices, capacityReadout, capacityRows } from "./logic";

const north: FeedInfo = { id: "north", name: "North", capacity: 4 };
const south: FeedInfo = { id: "south_feed", name: "South", capacity: null };
const feeds = [north, south];

const readout = (load: number, capacity: number | null, over: boolean): FeedReadout => ({ load, capacity, over });

describe("capacityRows on a one-feed map (014 unchanged)", () => {
  it("is the single capacityReadout row when no feed list is given", () => {
    const state = { load: 3, capacity: 4, brownout: false, feeds: new Map([["feed", readout(3, 4, false)]]) };
    expect(capacityRows(state, [])).toEqual([{ text: "Lv4 Powersource — using 3 of 4", alarm: false }]);
    expect(capacityRows(state, [])[0]!.text).toBe(capacityReadout(3, 4, false));
  });

  it("is the single row with Brownout and the alarm when browned out", () => {
    const state = { load: 5, capacity: 4, brownout: true, feeds: new Map([["feed", readout(5, 4, true)]]) };
    const rows = capacityRows(state, [{ id: "feed", name: "Feed", capacity: 4 }]);
    expect(rows).toEqual([{ text: "Lv4 Powersource — using 5 of 4 · Brownout", alarm: true }]);
  });

  it("keeps the no-limit form", () => {
    const state = { load: 2, capacity: null, brownout: false, feeds: new Map([["feed", readout(2, null, false)]]) };
    expect(capacityRows(state, [])[0]!.text).toBe("Powersource — using 2 (no limit)");
  });
});

describe("capacityRows on a multi-feed map", () => {
  const state = {
    load: 6,
    capacity: null,
    brownout: true,
    feeds: new Map([
      ["north", readout(3, 4, false)],
      ["south_feed", readout(3, null, false)],
    ]),
  };

  it("gives one row per feed, in file order, named", () => {
    const rows = capacityRows(state, feeds);
    expect(rows.map((r) => r.text)).toEqual([
      "North · Lv4 Powersource — using 3 of 4",
      "South · Powersource — using 3 (no limit)",
    ]);
  });

  it("adds · Brownout and the alarm only on the rows that are over", () => {
    const over = {
      load: 5,
      capacity: null,
      brownout: true,
      feeds: new Map([
        ["north", readout(5, 4, true)],
        ["south_feed", readout(1, null, false)],
      ]),
    };
    expect(capacityRows(over, feeds)).toEqual([
      { text: "North · Lv4 Powersource — using 5 of 4 · Brownout", alarm: true },
      { text: "South · Powersource — using 1 (no limit)", alarm: false },
    ]);
  });

  it("does not alarm the other rows while the section is browned out from one feed", () => {
    const rows = capacityRows(
      {
        load: 6,
        capacity: null,
        brownout: true,
        feeds: new Map([
          ["north", readout(3, 4, false)],
          ["south_feed", readout(3, 2, true)],
        ]),
      },
      [north, { id: "south_feed", name: "South", capacity: 2 }],
    );
    expect(rows.map((r) => r.alarm)).toEqual([false, true]);
    expect(rows[1]!.text).toBe("South · Lv2 Powersource — using 3 of 2 · Brownout");
  });

  it("skips a feed with no readout", () => {
    const rows = capacityRows({ load: 0, capacity: null, brownout: false, feeds: new Map([["north", readout(0, 4, false)]]) }, feeds);
    expect(rows.map((r) => r.text)).toEqual(["North · Lv4 Powersource — using 0 of 4"]);
  });
});

describe("brownoutNotices", () => {
  const readouts = new Map([
    ["north", readout(5, 4, true)],
    ["south_feed", readout(1, 2, false)],
  ]);

  it("names the one over feed in the notice", () => {
    expect(brownoutNotices(true, ["north"], feeds, readouts)).toEqual(["Brownout: North · Lv4 Powersource using 5 of 4"]);
  });

  it("gives one notice per over feed, in file order", () => {
    const both = new Map([
      ["north", readout(5, 4, true)],
      ["south_feed", readout(3, 2, true)],
    ]);
    expect(brownoutNotices(true, ["north", "south_feed"], [north, { id: "south_feed", name: "South", capacity: 2 }], both)).toEqual([
      "Brownout: North · Lv4 Powersource using 5 of 4",
      "Brownout: South · Lv2 Powersource using 3 of 2",
    ]);
  });

  it("uses the no-limit form for a feed with no capacity", () => {
    const r = new Map([["south_feed", readout(7, null, true)]]);
    expect(brownoutNotices(true, ["south_feed"], feeds, r)).toEqual(["Brownout: South · Powersource using 7 (no limit)"]);
  });

  it("is empty when the section is not browned out, or the over list is empty", () => {
    expect(brownoutNotices(false, [], feeds, readouts)).toEqual([]);
    expect(brownoutNotices(true, [], feeds, readouts)).toEqual([]);
  });

  it("ignores over ids that are not feeds of the map", () => {
    expect(brownoutNotices(true, ["nowhere"], feeds, readouts)).toEqual([]);
  });
});
