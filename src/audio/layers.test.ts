import { describe, expect, it } from "vitest";
import type { BatteryReadout, FeedReadout, SoundView } from "../core";
import { BEAT } from "../core";
import { BeatScheduler, CRACKLE_MAX_PER_COLLECT, Crackle, initialLayerState, layersFor } from "./layers";
import { WHINE_HIGH_HZ, WHINE_LOW_HZ, dbToGain } from "./recipes";

const view = (o: Partial<{ feeds: [string, FeedReadout][]; batteries: [string, BatteryReadout][]; sparking: string[]; brownout: boolean }> = {}): SoundView => ({
  brownout: o.brownout ?? false,
  complete: false,
  feeds: new Map(o.feeds ?? []),
  batteries: new Map(o.batteries ?? []),
  sparking: new Set(o.sparking ?? []),
});
const feed = (load: number, capacity: number | null): FeedReadout => ({ load, capacity, over: capacity !== null && load > capacity });
const bat = (charge: number, charging = true, capacity = 4): BatteryReadout => ({ charge, capacity, released: false, charging });

describe("hum", () => {
  it("is silent when nothing is powered", () => {
    expect(layersFor(view({ feeds: [["a", feed(0, 6)], ["b", feed(0, null)]] }), initialLayerState()).hum).toBe(0);
    expect(layersFor(view(), initialLayerState()).hum).toBe(0);
  });

  it("is -30 dB times sqrt of the highest load fraction, capped at 1", () => {
    const hum = (l: number) => layersFor(view({ feeds: [["a", feed(l, 4)], ["b", feed(1, 8)]] }), initialLayerState()).hum;
    expect(hum(4)).toBeCloseTo(dbToGain(-30), 9);
    expect(hum(1)).toBeCloseTo(dbToGain(-30) * Math.sqrt(0.25), 9);
    expect(hum(40)).toBeCloseTo(dbToGain(-30), 9);
    expect(hum(3)).toBeGreaterThan(hum(2));
  });

  it("a feed with no limit counts as 0.5 while it carries load", () => {
    const h = layersFor(view({ feeds: [["a", feed(3, null)]] }), initialLayerState()).hum;
    expect(h).toBeCloseTo(dbToGain(-30) * Math.sqrt(0.5), 9);
  });
});

describe("flicker", () => {
  it("is above 0 exactly while the view is browned out", () => {
    expect(layersFor(view({ brownout: true }), initialLayerState()).flicker).toBeGreaterThan(0);
    expect(layersFor(view({ brownout: false }), initialLayerState()).flicker).toBe(0);
  });
});

describe("charge whine", () => {
  it("is on while any battery charges, and its pitch rises with charge / capacity", () => {
    const at = (c: number) => layersFor(view({ batteries: [["b", bat(c)]] }), initialLayerState());
    expect(at(0).whineOn).toBe(true);
    expect(at(0).whineHz).toBe(WHINE_LOW_HZ);
    expect(at(2).whineHz).toBeCloseTo((WHINE_LOW_HZ + WHINE_HIGH_HZ) / 2, 9);
    expect(at(3).whineHz).toBeGreaterThan(at(2).whineHz);
    expect(at(4).whineHz).toBe(WHINE_HIGH_HZ);
    expect(at(1).whine).toBeCloseTo(dbToGain(-34), 9);
  });

  it("is off when no battery charges", () => {
    const l = layersFor(view({ batteries: [["b", bat(2, false)]] }), initialLayerState());
    expect(l.whineOn).toBe(false);
    expect(l.whine).toBe(0);
  });

  it("follows the highest ratio among charging batteries only", () => {
    const l = layersFor(view({ batteries: [["a", bat(1)], ["b", bat(4, false)]] }), initialLayerState());
    expect(l.whineHz).toBeCloseTo(WHINE_LOW_HZ + (WHINE_HIGH_HZ - WHINE_LOW_HZ) * 0.25, 9);
  });

  it("the full tick fires on one frame only, and again after dropping below and refilling", () => {
    let s = initialLayerState();
    const frame = (c: number) => {
      const l = layersFor(view({ batteries: [["b", bat(c)]] }), s);
      s = l.next;
      return l.fullTick;
    };
    expect([frame(1), frame(3), frame(4), frame(4), frame(4)]).toEqual([false, false, true, false, false]);
    expect([frame(0), frame(4)]).toEqual([false, true]);
  });

  it("a battery already full on the first frame does not tick", () => {
    expect(layersFor(view({ batteries: [["b", bat(4)]] }), initialLayerState()).fullTick).toBe(false);
  });
});

describe("crackle", () => {
  it("is on while sparking is non-empty, the same for one line or five", () => {
    const one = layersFor(view({ sparking: ["a"] }), initialLayerState());
    const five = layersFor(view({ sparking: ["a", "b", "c", "d", "e"] }), initialLayerState());
    expect(one.crackleOn).toBe(true);
    expect(five.crackleOn).toBe(true);
    expect(layersFor(view(), initialLayerState()).crackleOn).toBe(false);
  });

  it("schedules 4 to 9 ticks a second, deterministically, none when off, and restarts after off", () => {
    const run = () => {
      const c = new Crackle(7);
      const times: number[] = [];
      for (let now = 0; now < 10; now += 0.05) times.push(...c.collect(now, 0.1, true));
      return times;
    };
    const a = run();
    expect(a).toEqual(run());
    expect(a.length / 10).toBeGreaterThanOrEqual(4 - 0.5);
    expect(a.length / 10).toBeLessThanOrEqual(9 + 0.5);
    const c = new Crackle(7);
    expect(c.collect(0, 0.1, false)).toEqual([]);
    c.collect(0, 0.1, true);
    expect(c.collect(1, 0.1, false)).toEqual([]);
  });

  it("never schedules more than 100 ms ahead", () => {
    const c = new Crackle(3);
    for (let now = 0; now < 5; now += 0.016) for (const t of c.collect(now, 0.1, true)) expect(t).toBeLessThan(now + 0.1);
  });
});

describe("crackle after a time gap (ticket 033)", () => {
  it.each([1, 60, 600])("a %i s gap gives at most 2 ticks, all in [now, now + horizon), none replayed", (gap) => {
    const c = new Crackle(7);
    c.collect(0, 0.1, true);
    const out = c.collect(gap, 0.1, true);
    expect(out.length).toBeLessThanOrEqual(2);
    for (const t of out) {
      expect(t).toBeGreaterThanOrEqual(gap);
      expect(t).toBeLessThan(gap + 0.1);
    }
  });

  it("no collect returns more than CRACKLE_MAX_PER_COLLECT, whatever the horizon", () => {
    const c = new Crackle(7);
    expect(c.collect(0, 1000, true).length).toBeLessThanOrEqual(CRACKLE_MAX_PER_COLLECT);
    expect(c.collect(500, 1000, true).length).toBeLessThanOrEqual(CRACKLE_MAX_PER_COLLECT);
  });

  it("steady 16 ms frames for 5 s: every tick once, none before now, none at or past now + horizon", () => {
    const c = new Crackle(7);
    const seen: number[] = [];
    for (let i = 0; i < 313; i++) {
      const now = i * 0.016;
      for (const t of c.collect(now, 0.1, true)) {
        expect(t).toBeGreaterThanOrEqual(now);
        expect(t).toBeLessThan(now + 0.1);
        seen.push(t);
      }
    }
    expect(new Set(seen).size).toBe(seen.length);
    expect(seen.length).toBeGreaterThanOrEqual(20);
  });
});

describe("BeatScheduler after a time gap (ticket 033)", () => {
  it("a 600 s gap gives at most 1 beat and none in the past", () => {
    const b = new BeatScheduler();
    b.collect(BEAT, 0, 0.1, true);
    const out = b.collect(BEAT, 600, 0.1, true);
    expect(out.length).toBeLessThanOrEqual(1);
    for (const t of out) expect(t).toBeGreaterThanOrEqual(600);
  });
});
