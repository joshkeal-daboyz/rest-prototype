import { describe, expect, it } from "vitest";
import {
  CULPRIT_FLARE_SECONDS,
  LAMP_DROPPED,
  LAMP_FLARE_ONLY,
  LAMP_STREAK_AND_FLARE,
  lampTreatment,
  MAX_BLOW_LAMPS,
  MAX_FLARE_LAMPS,
  POP_SECONDS,
  SHOCK_SECONDS,
  arrivalTime,
  blowTargets,
  headDistance,
  lampFlare,
  popFraction,
  sequenceTotal,
  streakLength,
} from "./shock";

describe("arrivalTime", () => {
  it("the longest path arrives at SHOCK_SECONDS, shorter ones proportionally earlier", () => {
    expect(arrivalTime(200, 200)).toBeCloseTo(SHOCK_SECONDS);
    expect(arrivalTime(100, 200)).toBeCloseTo(SHOCK_SECONDS / 2);
    expect(arrivalTime(50, 200)).toBeLessThan(arrivalTime(100, 200));
  });
  it("a zero-length path arrives at 0, even with no longest path", () => {
    expect(arrivalTime(0, 200)).toBe(0);
    expect(arrivalTime(0, 0)).toBe(0);
  });
});

describe("shared streak speed", () => {
  it("head reaches the longest path exactly at SHOCK_SECONDS and each path at its arrival time", () => {
    expect(headDistance(0, 300)).toBe(0);
    expect(headDistance(SHOCK_SECONDS, 300)).toBeCloseTo(300);
    expect(headDistance(SHOCK_SECONDS * 5, 300)).toBeCloseTo(300);
    const short = 120;
    expect(headDistance(arrivalTime(short, 300), 300)).toBeCloseTo(short);
  });
  it("streak length scales with the longest path", () => {
    expect(streakLength(100)).toBeGreaterThan(0);
    expect(streakLength(200)).toBeCloseTo(streakLength(100) * 2);
  });
});

describe("lampFlare", () => {
  it("is 0 before arrival, 1 on arrival, fades to 0 over CULPRIT_FLARE_SECONDS", () => {
    expect(lampFlare(0.1, 0.2)).toBe(0);
    expect(lampFlare(0.2, 0.2)).toBe(1);
    expect(lampFlare(0.2 + CULPRIT_FLARE_SECONDS / 2, 0.2)).toBeCloseTo(0.5);
    expect(lampFlare(0.2 + CULPRIT_FLARE_SECONDS + 0.01, 0.2)).toBe(0);
  });
  it("the last flare finishes before the sequence ends", () => {
    expect(SHOCK_SECONDS + CULPRIT_FLARE_SECONDS).toBeLessThanOrEqual(sequenceTotal(true));
  });
});

describe("sequence length is unchanged", () => {
  it("pop starts at SHOCK_SECONDS and total is shock plus pop", () => {
    expect(popFraction(SHOCK_SECONDS - 0.01, true)).toBe(-1);
    expect(popFraction(SHOCK_SECONDS, true)).toBe(0);
    expect(sequenceTotal(true)).toBeCloseTo(SHOCK_SECONDS + POP_SECONDS);
    expect(sequenceTotal(false)).toBeCloseTo(POP_SECONDS);
  });
});

describe("blowTargets", () => {
  it("uses lamps when the payload carries them", () => {
    const lamps = [
      { id: "a", path: ["l1"] },
      { id: "b", path: ["l1", "l2"] },
    ];
    expect(blowTargets({ culprit: "a", path: ["l1"], lamps })).toBe(lamps);
  });
  it("falls back to the single culprit for an old payload", () => {
    expect(blowTargets({ culprit: "a", path: ["l1", "l2"] })).toEqual([{ id: "a", path: ["l1", "l2"] }]);
    expect(blowTargets({ culprit: null, path: [] })).toEqual([{ id: null, path: [] }]);
  });
  it("an empty lamps list means no targets", () => {
    expect(blowTargets({ culprit: null, path: [], lamps: [] })).toEqual([]);
  });
});

describe("lampTreatment caps", () => {
  it("the first 8 lamps get a streak and a flare", () => {
    expect(MAX_BLOW_LAMPS).toBe(8);
    for (let i = 0; i < 8; i++) expect(lampTreatment(i)).toBe(LAMP_STREAK_AND_FLARE);
  });
  it("the 9th lamp onward flares without a streak", () => {
    expect(lampTreatment(8)).toBe(LAMP_FLARE_ONLY);
    expect(lampTreatment(20)).toBe(LAMP_FLARE_ONLY);
    expect(lampTreatment(MAX_FLARE_LAMPS - 1)).toBe(LAMP_FLARE_ONLY);
  });
  it("past the 32 cap lamps are dropped", () => {
    expect(MAX_FLARE_LAMPS).toBe(32);
    expect(lampTreatment(32)).toBe(LAMP_DROPPED);
    expect(lampTreatment(100)).toBe(LAMP_DROPPED);
  });
  it("12 lamps: 8 streak, 4 flare-only, none dropped", () => {
    const counts = [0, 0, 0];
    for (let i = 0; i < 12; i++) counts[lampTreatment(i)]!++;
    expect(counts).toEqual([8, 4, 0]);
  });
});
