import { describe, expect, it } from "vitest";
import { LevelDoneGate, levelDoneCue, relightCues } from "./cues";
import { DUCK_DB, Mixer, VOICE_BUDGET } from "./mixer";
import { CHIME_HZ, CUE_CEILING_DB, dbToGain, levelDoneSound, relightChime, relightClose } from "./recipes";
import type { Cue, Voice } from "./types";

const A_MAJOR = [440, 554.37, 659.25]; // A, C#, E

describe("levelDoneSound", () => {
  const voices = levelDoneSound();
  it("a noise knock at 0 and at least two tonal voices later", () => {
    const knock = voices.filter((v) => v.kind === "noise");
    expect(knock.length).toBe(1);
    expect(knock[0]?.at).toBe(0);
    const tones = voices.filter((v) => v.kind === "osc");
    expect(tones.length).toBeGreaterThanOrEqual(2);
    expect(tones.every((v) => v.at > 0)).toBe(true);
  });
  it("every voice ends by 1.0 s", () => {
    for (const v of voices) expect(v.at + v.duration).toBeLessThanOrEqual(1.0);
  });
  it("no voice above -14 dB and the summed peaks stay under the cue ceiling", () => {
    for (const v of voices) expect(v.gainDb).toBeLessThanOrEqual(-14);
    const sum = voices.reduce((a, v) => a + dbToGain(v.gainDb), 0);
    expect(sum).toBeLessThan(dbToGain(CUE_CEILING_DB));
  });
  it("every oscillator is within 1% of an A-major note", () => {
    for (const v of voices.filter((x) => x.kind === "osc")) {
      const ok = A_MAJOR.some((n) => {
        const oct = Math.log2(v.freq / n);
        return Math.abs(Math.pow(2, oct - Math.round(oct)) - 1) < 0.01;
      });
      expect(ok, `${v.freq} Hz`).toBe(true);
    }
  });
  it("is unlike the Relight: no sine at a chime pitch, and not any chime or the close", () => {
    for (const v of voices) {
      if (v.wave === "sine") expect(CHIME_HZ.some((h) => Math.abs(h - v.freq) < 1)).toBe(false);
    }
    for (let i = 0; i < CHIME_HZ.length; i++) expect(voices).not.toEqual(relightChime(i));
    expect(voices).not.toEqual(relightClose());
    expect(voices.some((v) => v.wave === "triangle")).toBe(true);
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
    kind: "osc", wave: "sine", freq: 440, attack: 0.01, decay: 0, sustain: 1, release: 0.1, gainDb, at: 0, duration: 2,
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
