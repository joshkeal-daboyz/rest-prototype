import { describe, expect, it } from "vitest";
import * as R from "./recipes";
import { onGrid } from "./tuning";
import type { Voice } from "./types";

/** Every recipe that returns voices, called over its full range of arguments. */
const RECIPES: Record<string, () => Voice[]> = {
  breakerThrow: () => [...R.breakerThrow(true), ...R.breakerThrow(false)],
  switchThrow: () => [...R.switchThrow(true), ...R.switchThrow(false)],
  repairSound: () => (["bulb", "fuse", "wire"] as const).flatMap((p) => R.repairSound(p)),
  brownoutSag: () => R.brownoutSag(),
  brownoutRecovery: () => R.brownoutRecovery(),
  batteryRelease: () => R.batteryRelease(),
  batteryWhine: () => [R.batteryWhine()],
  batteryCutOff: () => R.batteryCutOff(),
  playClick: () => R.playClick(),
  fullTick: () => R.fullTick(),
  crackleTick: () => R.crackleTick(),
  runSound: () => R.runSound(),
  glowSound: () => R.glowSound(),
  sparkBurst: () => Array.from({ length: 10 }, (_, i) => R.sparkBurst(i + 1)).flat(),
  popSound: () => R.popSound(),
  relightBed: () => [...R.relightBed(0.5, 1), ...R.relightBed(3, 3.5)],
  relightChime: () => Array.from({ length: 12 }, (_, i) => R.relightChime(i)).flat(),
  relightClose: () => R.relightClose(),
  levelDoneSound: () => R.levelDoneSound(),
  beatThump: () => R.beatThump(),
};
/** Exported functions that make no voices. */
const EXEMPT = ["envelope", "dbToGain", "sparkBoostDb"];

describe("the 432 Hz grid", () => {
  it("every exported recipe function is in the scan or the exemption list", () => {
    const fns = Object.entries(R)
      .filter(([, v]) => typeof v === "function")
      .map(([k]) => k);
    for (const name of fns) expect(name in RECIPES || EXEMPT.includes(name), `${name} is neither scanned nor exempt`).toBe(true);
    for (const name of Object.keys(RECIPES)) expect(fns, `${name} is not exported`).toContain(name);
  });

  it("every pitched osc voice (freq and freqTo) is on the 432 grid unless marked unpitched", () => {
    for (const [name, make] of Object.entries(RECIPES)) {
      const voices = make();
      expect(voices.length, name).toBeGreaterThan(0);
      for (const v of voices) {
        if (v.kind === "noise" || v.unpitched) continue;
        expect(onGrid(v.freq), `${name}: freq ${v.freq}`).toBe(true);
        if (v.freqTo !== undefined) expect(onGrid(v.freqTo), `${name}: freqTo ${v.freqTo}`).toBe(true);
      }
    }
  });

  it("no voice opts out of the grid", () => {
    for (const make of Object.values(RECIPES)) for (const v of make()) expect(v.unpitched).toBeUndefined();
  });

  it("the named pitches are on the grid", () => {
    const named = [
      ...R.HUM_HZ,
      R.FLICKER_HZ,
      R.WHINE_LOW_HZ,
      R.WHINE_HIGH_HZ,
      R.BATTERY_WHINE_HZ,
      R.BATTERY_RUNOUT_HZ,
      ...R.CHIME_HZ,
      R.BEAT_HZ,
      R.BEAT_TICK_HZ,
      R.LEVEL_NOTE1_HZ,
      R.LEVEL_NOTE2_HZ,
      R.LEVEL_UNDER_HZ,
    ];
    for (const hz of named) expect(onGrid(hz), `${hz} Hz`).toBe(true);
  });

  it("the hum is A1 + A2 and the flicker saw is in unison with the upper hum", () => {
    expect(R.HUM_HZ).toEqual([54, 108]);
    expect(R.FLICKER_HZ).toBe(R.HUM_HZ[1]);
  });

  it("the sag still falls and the recovery still rises", () => {
    const sag = R.brownoutSag()[0];
    const rec = R.brownoutRecovery()[0];
    expect(sag?.freqTo ?? 0).toBeLessThan(sag?.freq ?? 0);
    expect(rec?.freqTo ?? 0).toBeGreaterThan(rec?.freq ?? 0);
  });
});
