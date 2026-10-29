import { describe, expect, it } from "vitest";
import { LevelDoneGate, levelDoneCue, relightCues } from "./cues";
import { DUCK_DB, Mixer, VOICE_BUDGET } from "./mixer";
import { CHIME_HZ, CUE_CEILING_DB, dbToGain, levelDoneSound, relightChime, relightClose } from "./recipes";
import { noteHz, onGrid } from "./tuning";
import type { Cue, Voice } from "./types";

const CHORD = ["A3", "E4", "A4", "C#5"].map(noteHz);
/** A-major pitch classes as semitones above A (A, C#, E), octave-folded. */
const A_MAJOR_PCS = [0, 4, 7];

describe("levelDoneSound (the choir, ticket 031)", () => {
  const voices = levelDoneSound();
  const osc = voices.filter((v) => v.kind === "osc");
  const sung = voices.filter((v) => v.formants !== undefined);

  it("4 to 12 voices, every chord note sung by at least 2 oscillators with differing detunes within +-3..+-10 cents", () => {
    expect(voices.length).toBeGreaterThanOrEqual(4);
    expect(voices.length).toBeLessThanOrEqual(VOICE_BUDGET);
    for (const hz of CHORD) {
      const on = osc.filter((v) => Math.abs(v.freq - hz) < 1e-9);
      expect(on.length, `${hz} Hz`).toBeGreaterThanOrEqual(2);
      const cents = on.map((v) => v.detuneCents ?? 0);
      expect(new Set(cents).size).toBeGreaterThan(1);
      for (const c of cents) {
        expect(Math.abs(c)).toBeGreaterThanOrEqual(3);
        expect(Math.abs(c)).toBeLessThanOrEqual(10);
      }
    }
  });
  it("no noise voice at 0", () => {
    expect(voices.filter((v) => v.kind === "noise").every((v) => v.at > 0)).toBe(true);
  });
  it("every oscillator is an A-major pitch class on the 432 grid", () => {
    for (const v of osc) {
      expect(onGrid(v.freq), `${v.freq} Hz`).toBe(true);
      const semis = Math.round(12 * Math.log2(v.freq / 432));
      expect(A_MAJOR_PCS).toContain(((semis % 12) + 12) % 12);
    }
  });
  it("every sung voice has an F1 bandpass in 600-900 Hz and an F2 in 1000-1300 Hz, gains summing to at most 1", () => {
    expect(sung.length).toBeGreaterThanOrEqual(8);
    for (const v of sung) {
      const f = v.formants ?? [];
      expect(f.some((x) => x.freq >= 600 && x.freq <= 900)).toBe(true);
      expect(f.some((x) => x.freq >= 1000 && x.freq <= 1300)).toBe(true);
      expect(f.reduce((a, x) => a + dbToGain(x.gainDb), 0)).toBeLessThanOrEqual(1);
    }
  });
  it("every sung voice has a 4-7 Hz, 5-30 cent vibrato, and at least two rates are used", () => {
    for (const v of sung) {
      expect(v.vibrato?.freq).toBeGreaterThanOrEqual(4);
      expect(v.vibrato?.freq).toBeLessThanOrEqual(7);
      expect(v.vibrato?.cents).toBeGreaterThanOrEqual(5);
      expect(v.vibrato?.cents).toBeLessThanOrEqual(30);
    }
    expect(new Set(sung.map((v) => v.vibrato?.freq)).size).toBeGreaterThanOrEqual(2);
  });
  it("the shimmer is a high oscillator or highpassed noise, quieter than the loudest sung voice, and enters after 0", () => {
    const shimmer = voices.filter(
      (v) => (v.kind === "osc" && v.freq >= 1200) || (v.kind === "noise" && v.filter?.type === "highpass" && v.filter.freq >= 3000),
    );
    expect(shimmer.length).toBeGreaterThanOrEqual(1);
    const loudest = Math.max(...sung.map((v) => v.gainDb));
    for (const v of shimmer) {
      expect(v.gainDb).toBeLessThan(loudest);
      expect(v.at).toBeGreaterThan(0);
    }
  });
  it("sung voices attack in 0.3-0.6 s and release over 1.5 s or more; every voice ends by 4.0 s and the last at 3.0 s or later", () => {
    for (const v of sung) {
      expect(v.attack).toBeGreaterThanOrEqual(0.3);
      expect(v.attack).toBeLessThanOrEqual(0.6);
      expect(v.release).toBeGreaterThanOrEqual(1.5);
    }
    for (const v of voices) expect(v.at + v.duration).toBeLessThanOrEqual(4.0);
    expect(Math.max(...voices.map((v) => v.at + v.duration))).toBeGreaterThanOrEqual(3.0);
  });
  it("no voice above -20 dB and the summed peaks stay under the cue ceiling", () => {
    for (const v of voices) expect(v.gainDb).toBeLessThanOrEqual(-20);
    const sum = voices.reduce((a, v) => a + dbToGain(v.gainDb), 0);
    expect(sum).toBeLessThan(dbToGain(CUE_CEILING_DB));
  });
  it("is unlike the Relight: no sine at a chime pitch, and not any chime or the close", () => {
    for (const v of voices) {
      if (v.wave === "sine") expect(CHIME_HZ.some((h) => Math.abs(h - v.freq) < 1)).toBe(false);
    }
    for (let i = 0; i < CHIME_HZ.length; i++) expect(voices).not.toEqual(relightChime(i));
    expect(voices).not.toEqual(relightClose());
  });
  it("is deterministic", () => {
    expect(levelDoneSound()).toEqual(levelDoneSound());
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
