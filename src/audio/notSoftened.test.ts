import { describe, expect, it } from "vitest";
import * as R from "./recipes";

/**
 * Ticket 032, Josh: "don't soften those". Every mechanical recipe is pinned to the output 031 left,
 * taken from the recipes BEFORE any 032 edit (see __snapshots__). Only relightChime, levelDoneSound
 * and the new beatThump may differ; a changed number here is a changed sound.
 */
const PINNED: Record<string, () => unknown> = {
  breakerThrow: () => [R.breakerThrow(true), R.breakerThrow(false)],
  switchThrow: () => [R.switchThrow(true), R.switchThrow(false)],
  repairSound: () => (["bulb", "fuse", "wire"] as const).map((p) => R.repairSound(p)),
  brownoutSag: () => R.brownoutSag(),
  brownoutRecovery: () => R.brownoutRecovery(),
  batteryRelease: () => R.batteryRelease(),
  batteryWhine: () => R.batteryWhine(),
  batteryCutOff: () => R.batteryCutOff(),
  playClick: () => R.playClick(),
  fullTick: () => R.fullTick(),
  crackleTick: () => R.crackleTick(),
  runSound: () => R.runSound(),
  glowSound: () => R.glowSound(),
  sparkBurst: () => Array.from({ length: 10 }, (_, i) => R.sparkBurst(i + 1)),
  popSound: () => R.popSound(),
  relightBed: () => [R.relightBed(0.5, 1), R.relightBed(3, 3.5)],
  relightClose: () => R.relightClose(),
  constants: () => ({
    HUM_DB: R.HUM_DB, FLICKER_DB: R.FLICKER_DB, WHINE_DB: R.WHINE_DB, HUM_HZ: R.HUM_HZ, FLICKER_HZ: R.FLICKER_HZ,
    WHINE_LOW_HZ: R.WHINE_LOW_HZ, WHINE_HIGH_HZ: R.WHINE_HIGH_HZ, CRACKLE_DB: R.CRACKLE_DB, CHIME_HZ: R.CHIME_HZ,
    CHIME_MERGE: R.CHIME_MERGE, RELIGHT_TAIL: R.RELIGHT_TAIL, CUE_CEILING_DB: R.CUE_CEILING_DB,
  }),
};

describe("not softened (ticket 032)", () => {
  for (const [name, make] of Object.entries(PINNED)) {
    it(`${name} is exactly what 031 left`, () => {
      expect(make()).toMatchSnapshot();
    });
  }
});
