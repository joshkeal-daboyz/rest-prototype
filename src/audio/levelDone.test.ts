import { describe, expect, it } from "vitest";
import { LevelDoneGate, levelDoneCue, relightCues } from "./cues";
import { DUCK_DB, Mixer, VOICE_BUDGET } from "./mixer";
import * as R from "./recipes";
import { CHIME_HZ, CUE_CEILING_DB, LEVEL_CHIME_INDEX, dbToGain, levelDoneSound, relightChime } from "./recipes";
import { noteHz, onGrid } from "./tuning";
import type { Cue, Voice } from "./types";

describe("levelDoneSound (ticket 034: one more Relight chime)", () => {
  const voices = levelDoneSound();
  it("one note: exactly one voice, deep-equal to the chime's main voice", () => {
    expect(voices.length).toBe(1);
    expect(voices[0]).toEqual(relightChime(LEVEL_CHIME_INDEX)[0]);
  });
  it("a plain sine at 0: no filter, no noise, no vibrato, formants or detune, ends by 0.7 s", () => {
    const v = voices[0] as Voice;
    expect(v.kind).toBe("osc");
    expect(v.wave).toBe("sine");
    expect(v.filter).toBeUndefined();
    expect(v.formants).toBeUndefined();
    expect(v.vibrato).toBeUndefined();
    expect(v.detuneCents).toBeUndefined();
    expect(v.at).toBe(0);
    expect(v.at + v.duration).toBeLessThanOrEqual(0.7);
  });
  it("its pitch is CHIME_HZ[LEVEL_CHIME_INDEX], on the grid, and A4 (the key's tonic) by default", () => {
    const v = voices[0] as Voice;
    expect(v.freq).toBe(CHIME_HZ[LEVEL_CHIME_INDEX]);
    expect(onGrid(v.freq)).toBe(true);
    expect(LEVEL_CHIME_INDEX).toBe(2);
    expect(v.freq).toBe(noteHz("A4"));
  });
  it("same family: wave, attack, release, duration and gain equal the chime's for every index", () => {
    const v = voices[0] as Voice;
    for (let i = 0; i < CHIME_HZ.length; i++) {
      const c = relightChime(i)[0] as Voice;
      expect(v.wave).toBe(c.wave);
      expect(v.attack).toBe(c.attack);
      expect(v.release).toBe(c.release);
      expect(v.duration).toBe(c.duration);
      expect(v.gainDb).toBe(c.gainDb);
    }
  });
  it("under the ceiling: peak at most -22 dB and below the cue ceiling; budget unchanged", () => {
    const sum = voices.reduce((a, v) => a + dbToGain(v.gainDb), 0);
    expect(sum).toBeLessThanOrEqual(dbToGain(-22) + 1e-12);
    expect(sum).toBeLessThan(dbToGain(CUE_CEILING_DB));
    expect(CUE_CEILING_DB).toBe(-8);
    expect(VOICE_BUDGET).toBe(12);
  });
  it("is deterministic", () => {
    expect(levelDoneSound()).toEqual(levelDoneSound());
  });
  it("the 025 knock, figure and under-note constants are gone", () => {
    expect(Object.keys(R).filter((k) => /^LEVEL_(KNOCK|NOTE|UNDER)/.test(k))).toEqual([]);
    expect(Object.keys(R).filter((k) => k.startsWith("CHOIR_"))).toEqual([]);
  });
  it("032 pins: the chime keeps its quiet fifth, and the close and bed are as built", () => {
    const c = relightChime(0);
    expect(c.length).toBe(2);
    expect(c[0]?.freq).toBe(noteHz("E4"));
    expect(c[1]?.freq).toBeCloseTo(noteHz("E4") * Math.pow(2, 7 / 12), 9);
    expect(c[1]?.gainDb).toBe(-30);
    expect(R.relightClose().map((v) => [v.freq, v.gainDb, v.attack, v.release])).toEqual([
      [noteHz("A3"), -28, 0.3, 2],
      [noteHz("E4"), -28, 0.3, 2],
    ]);
    expect(R.relightBed(1, 1).map((v) => v.freq)).toEqual([noteHz("A1"), noteHz("A2")]);
    expect(R.BEAT_HZ).toBe(noteHz("A1"));
    expect(R.BEAT_DB).toBe(-28);
  });
});

describe("levelDoneCue", () => {
  it("is named level:done, at 0, in the level group, and ducks", () => {
    const c = levelDoneCue();
    expect(c.name).toBe("level:done");
    expect(c.at).toBe(0);
    expect(c.group).toBe("level");
    expect(c.ducks).toBe(true);
    expect(c.voices).toEqual(levelDoneSound());
  });
});

describe("the mixer and the level cue", () => {
  const tone = (gainDb: number): Voice => ({
    kind: "osc", wave: "sine", freq: 432, attack: 0.01, decay: 0, sustain: 1, release: 0.1, gainDb, at: 0, duration: 2,
  });
  it("a level cue is never dropped when the voice budget is full; an ordinary voice is", () => {
    const m = new Mixer();
    const fill: Cue = { name: "fill", at: 0, voices: Array.from({ length: VOICE_BUDGET }, () => tone(-30)) };
    expect(m.take([fill], 0).play[0]?.voices.length).toBe(VOICE_BUDGET);
    const r = m.take([levelDoneCue(), { name: "extra", at: 0, voices: [tone(-30)] }], 0.1);
    expect(r.play.find((c) => c.name === "level:done")?.voices.length).toBe(levelDoneSound().length);
    expect(r.dropped).toContain("extra");
  });
  it("sets a duck", () => {
    expect(new Mixer().take([levelDoneCue()], 5).duck).toBe(DUCK_DB);
  });
  it("the Relight still plays beside it", () => {
    const relight = relightCues([0.3, 0.9], 1.5);
    const r = new Mixer().take([...relight, levelDoneCue()], 0);
    expect(r.play.length).toBe(relight.length + 1);
  });
});

describe("LevelDoneGate", () => {
  it("no see yet: false", () => expect(new LevelDoneGate().take()).toBe(false));
  it("see(false): false", () => {
    const g = new LevelDoneGate();
    g.see(false);
    expect(g.take()).toBe(false);
  });
  it("once per win, even across further complete frames", () => {
    const g = new LevelDoneGate();
    g.see(true);
    expect(g.take()).toBe(true);
    expect(g.take()).toBe(false);
    g.see(true);
    expect(g.take()).toBe(false);
  });
  it("Replay then win: plays again", () => {
    const g = new LevelDoneGate();
    g.see(true);
    expect(g.take()).toBe(true);
    g.see(false);
    g.see(true);
    expect(g.take()).toBe(true);
  });
  it("Reset before the splash: no cue", () => {
    const g = new LevelDoneGate();
    g.see(true);
    g.see(false);
    expect(g.take()).toBe(false);
  });
  it("reset() disarms until a fresh see(true)", () => {
    const g = new LevelDoneGate();
    g.see(true);
    g.reset();
    expect(g.take()).toBe(false);
    g.see(true);
    expect(g.take()).toBe(true);
  });
});
