import { describe, expect, it } from "vitest";
import type { Events } from "../core";
import { blowCues, cuesFor, relightCues } from "./cues";
import { DUCK_DB, Mixer } from "./mixer";
import { sparkBoostDb } from "./recipes";
import type { Cue, Voice } from "./types";

const blown = (lamps: number, withPath = true): Events["fuse:blown"] => ({
  nodeId: "fb",
  faultId: "f",
  load: 5,
  rating: 3,
  culprit: withPath ? "l0" : null,
  path: withPath ? ["a"] : [],
  lamps: withPath ? Array.from({ length: lamps }, (_, i) => ({ id: `l${i}`, path: ["a"] })) : [],
});
const names = (cues: Cue[]) => cues.map((c) => c.name);
const peak = (c: Cue) => Math.max(...c.voices.map((v) => v.gainDb));
const tone = (gainDb: number, dur = 1): Voice => ({
  kind: "osc", wave: "sine", freq: 440, attack: 0.01, decay: 0, sustain: 1, release: 0.1, gainDb, at: 0, duration: dur,
});

describe("blow merging", () => {
  it("a blow gives run, glow and pop now and the spark burst when it is due, once", () => {
    const m = new Mixer();
    const first = m.take(blowCues(blown(1)), 0);
    expect(names(first.play)).toEqual(["blow:run", "blow:glow", "blow:pop"]);
    expect(m.take([], 0.3).play).toEqual([]);
    const burst = m.take([], 0.49).play;
    expect(names(burst)).toEqual(["blow:spark"]);
    expect(burst[0]?.at).toBeCloseTo(0.01, 9);
    expect(m.take([], 0.6).play).toEqual([]);
  });

  it("a second blow within 0.7 s adds a pop but no second run or glow", () => {
    const m = new Mixer();
    m.take(blowCues(blown(1)), 0);
    const second = m.take(blowCues(blown(2)), 0.3);
    expect(names(second.play)).toEqual(["blow:pop"]);
    expect(second.play[0]?.at).toBe(0.7);
  });

  it("its lamps add to the one burst before it starts: one burst, louder", () => {
    const m = new Mixer();
    m.take(blowCues(blown(1)), 0);
    m.take(blowCues(blown(3)), 0.3);
    const bursts = [...m.take([], 0.49).play, ...m.take([], 0.6).play].filter((c) => c.part === "spark");
    expect(bursts.length).toBe(1);
    expect(bursts[0]?.voices.length).toBe(6 + 4);
    expect(peak(bursts[0] as Cue)).toBeCloseTo(-16 + sparkBoostDb(4), 9);
  });

  it("a second blow after the burst started does not add to it", () => {
    const m = new Mixer();
    m.take(blowCues(blown(1)), 0);
    m.take([], 0.49);
    const second = m.take(blowCues(blown(5)), 0.6);
    expect(names(second.play)).toEqual(["blow:pop"]);
    expect(m.take([], 0.7).play).toEqual([]);
  });

  it("the merged lamp count keeps the +6 dB cap", () => {
    const m = new Mixer();
    m.take(blowCues(blown(5)), 0);
    m.take(blowCues(blown(30)), 0.3);
    const burst = m.take([], 0.49).play[0] as Cue;
    expect(peak(burst)).toBeCloseTo(-10, 9);
    expect(burst.voices.length).toBe(14);
  });

  it("a blow 0.8 s after the first starts a new sequence", () => {
    const m = new Mixer();
    m.take(blowCues(blown(1)), 0);
    m.take([], 0.49);
    const second = m.take(blowCues(blown(1)), 0.8);
    expect(names(second.play)).toEqual(["blow:run", "blow:glow", "blow:pop"]);
  });

  it("a blow with no path is just a pop at its own time inside a running sequence", () => {
    const m = new Mixer();
    m.take(blowCues(blown(1)), 0);
    const second = m.take(blowCues(blown(0, false)), 0.3);
    expect(second.play.map((c) => [c.name, c.at])).toEqual([["blow:pop", 0]]);
  });

  it("two blows in one instant are one pop (and one run), whether in one take or two", () => {
    const m1 = new Mixer();
    const both = m1.take([...blowCues(blown(1)), ...blowCues(blown(2))], 5);
    expect(names(both.play).filter((n) => n === "blow:pop").length).toBe(1);
    expect(names(both.play).filter((n) => n === "blow:run").length).toBe(1);
    const burst = m1.take([], 5.49).play[0] as Cue;
    expect(burst.voices.length).toBe(6 + 3);

    const m2 = new Mixer();
    m2.take(blowCues(blown(1)), 5);
    expect(m2.take(blowCues(blown(1)), 5).play).toEqual([]);
  });

  it("pops 40 ms apart are one pop; 41 ms apart are two", () => {
    const m = new Mixer();
    m.take(blowCues(blown(0, false)), 0);
    expect(m.take(blowCues(blown(0, false)), 0.039).play).toEqual([]);
    expect(names(m.take(blowCues(blown(0, false)), 0.1).play)).toEqual(["blow:pop"]);
  });
});

describe("rate limit and budget", () => {
  it("the same cue twice in 30 ms plays once; 30 ms apart plays twice", () => {
    const m = new Mixer();
    const sw = () => cuesFor("switch:thrown", { nodeId: "s", selected: 1, spring: true });
    expect(m.take(sw(), 0).play.length).toBe(1);
    const again = m.take(sw(), 0.02);
    expect(again.play).toEqual([]);
    expect(again.dropped).toEqual(["switch:spring"]);
    expect(m.take(sw(), 0.05).play.length).toBe(1);
  });

  it("a burst of play:click is one click", () => {
    const m = new Mixer();
    const total = [0, 0, 0, 0.01].map((t) => m.take(cuesFor("play:click", { kind: "reset" }), t).play.length);
    expect(total).toEqual([1, 0, 0, 0]);
  });

  it("different cue names do not limit each other", () => {
    const m = new Mixer();
    const cues = [...cuesFor("breaker:thrown", { nodeId: "b", closed: true }), ...cuesFor("play:click", { kind: "undo" })];
    expect(m.take(cues, 0).play.length).toBe(2);
  });

  it("over 12 voices, the quietest non-blow voice goes first; blow voices are never dropped", () => {
    const m = new Mixer();
    const gains = Array.from({ length: 12 }, (_, i) => -40 + i);
    const crowd: Cue = { name: "crowd", at: 0, voices: gains.map((g) => tone(g)) };
    const res = m.take([crowd, ...blowCues(blown(0, false))], 0);
    const kept = res.play.find((c) => c.name === "crowd");
    // pop has 2 voices, so the two quietest crowd voices go
    expect(kept?.voices.map((v) => v.gainDb)).toEqual(gains.slice(2));
    expect(res.play.find((c) => c.name === "blow:pop")?.voices.length).toBe(2);
  });

  it("a cue whose voices are all dropped is listed in dropped", () => {
    const m = new Mixer();
    const full: Cue = { name: "full", at: 0, voices: Array.from({ length: 12 }, () => tone(-10)) };
    m.take([full], 0);
    const res = m.take([{ name: "extra", at: 0, voices: [tone(-30)] }], 0.1);
    expect(res.play).toEqual([]);
    expect(res.dropped).toEqual(["extra"]);
  });

  it("voices that have ended free their slots", () => {
    const m = new Mixer();
    m.take([{ name: "full", at: 0, voices: Array.from({ length: 12 }, () => tone(-10, 0.5)) }], 0);
    expect(m.take([{ name: "later", at: 0, voices: [tone(-30)] }], 0.6).play.length).toBe(1);
  });
});

describe("ducking", () => {
  it("while a blow's pop sounds the hum and whine duck by 12 dB, then release", () => {
    const m = new Mixer();
    const res = m.take(blowCues(blown(1)), 0);
    expect(res.duck).toBe(0);
    expect(m.duckAt(0.5)).toBe(0);
    expect(m.duckAt(0.8)).toBe(DUCK_DB);
    expect(DUCK_DB).toBe(-12);
    expect(m.duckAt(1.5)).toBe(0);
  });

  it("a pathless pop ducks at once and take reports it", () => {
    const m = new Mixer();
    expect(m.take(blowCues(blown(0, false)), 0).duck).toBe(-12);
  });

  it("an ordinary click does not duck", () => {
    const m = new Mixer();
    expect(m.take(cuesFor("play:click", { kind: "undo" }), 0).duck).toBe(0);
  });

  it("the Relight ducks for its whole length", () => {
    const m = new Mixer();
    m.take(relightCues([0.25, 0.9, 2.65], 3.25), 10);
    expect(m.duckAt(10.1)).toBe(-12);
    expect(m.duckAt(13)).toBe(-12);
    expect(m.duckAt(20)).toBe(0);
  });
});

describe("the Relight is never dropped, ducked away or interrupted", () => {
  it("survives a full voice budget", () => {
    const m = new Mixer();
    m.take([{ name: "full", at: 0, voices: Array.from({ length: 12 }, () => tone(-10, 5)) }], 0);
    const res = m.take(relightCues([0.25, 0.9], 1.5), 0.1);
    expect(res.play.length).toBe(relightCues([0.25, 0.9], 1.5).length);
    expect(res.dropped).toEqual([]);
  });

  it("no bus event cancels it, and a second relight() while one runs is ignored", () => {
    const m = new Mixer();
    m.take(relightCues([0.25, 2], 3), 0);
    for (const [n, p] of [
      ["job:completed", { puzzleId: "p", actions: 1 }],
      ["play:click", { kind: "reset" }],
      ["battery:flat", { nodeId: "b", stopped: true }],
    ] as const) {
      m.take(cuesFor(n, p as never), 0.5);
    }
    expect(m.duckAt(2)).toBe(-12);
    expect(m.take(relightCues([0.1], 1), 1).play).toEqual([]);
    expect(m.take(relightCues([0.1], 1), 10).play.length).toBeGreaterThan(0);
  });

  it("reset (detach) forgets a running Relight", () => {
    const m = new Mixer();
    m.take(relightCues([0.25], 1), 0);
    m.reset();
    expect(m.duckAt(0.5)).toBe(0);
    expect(m.take(relightCues([0.25], 1), 0.5).play.length).toBeGreaterThan(0);
  });
});
