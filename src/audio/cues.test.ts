import { describe, expect, it } from "vitest";
import { BLOW_TIMING } from "../core";
import type { Events } from "../core";
import { CueTracker, blowCues, chimeTimes, cuesFor, relightCues } from "./cues";
import { CUE_CEILING_DB, envelope, sparkBoostDb, sparkBurst } from "./recipes";
import type { Cue } from "./types";

const peak = (c: Cue): number => Math.max(...c.voices.map((v) => v.gainDb));
const blown = (paths: string[][], extra: Partial<Events["fuse:blown"]> = {}): Events["fuse:blown"] => ({
  nodeId: "fb",
  faultId: "f",
  load: 5,
  rating: 3,
  culprit: paths[0] ? "l0" : null,
  path: paths[0] ?? [],
  lamps: paths.map((path, i) => ({ id: `l${i}`, path })),
  ...extra,
});
const one = (name: Parameters<typeof cuesFor>[0], p: unknown): Cue => {
  const c = cuesFor(name, p as never)[0];
  if (!c) throw new Error("no cue");
  return c;
};
const sig = (c: Cue): string => JSON.stringify(c.voices);

describe("sound per event class", () => {
  it("breaker:thrown closed and open are different sounds, under 180 ms", () => {
    const closed = one("breaker:thrown", { nodeId: "b", closed: true });
    const open = one("breaker:thrown", { nodeId: "b", closed: false });
    expect(sig(closed)).not.toBe(sig(open));
    expect(closed.voices.find((v) => v.wave === "sine")?.freq).toBe(110);
    expect(open.voices.find((v) => v.wave === "sine")?.freq).toBe(90);
    for (const c of [closed, open]) expect(Math.max(...c.voices.map((v) => v.at + v.duration))).toBeLessThan(0.18);
  });

  it("a spring return is 6 dB quieter than a throw and has a different blip", () => {
    const throwIt = one("switch:thrown", { nodeId: "s", selected: 1 });
    const spring = one("switch:thrown", { nodeId: "s", selected: 0, spring: true });
    expect(spring.name).not.toBe(throwIt.name);
    throwIt.voices.forEach((v, i) => expect(spring.voices[i]?.gainDb).toBe(v.gainDb - 6));
    expect(throwIt.voices.find((v) => v.wave === "square")?.freq).toBe(1200);
    expect(spring.voices.find((v) => v.wave === "square")?.freq).toBe(800);
  });

  it("the three repair parts are three different sounds", () => {
    const sigs = (["bulb", "fuse", "wire"] as const).map((part) =>
      sig(one("repair:completed", { faultId: "f", at: "n", part, count: 1 })),
    );
    expect(new Set(sigs).size).toBe(3);
  });

  it("refused, undo and reset are one click, quieter than a switch, with no tonal blip", () => {
    const clicks = (["refused", "undo", "reset"] as const).map((kind) => one("play:click", { kind }));
    expect(new Set(clicks.map(sig)).size).toBe(1);
    expect(new Set(clicks.map((c) => c.name)).size).toBe(1);
    const sw = one("switch:thrown", { nodeId: "s", selected: 1 });
    expect(peak(clicks[0] as Cue)).toBeLessThan(peak(sw));
    expect(sig(clicks[0] as Cue)).not.toBe(sig(sw));
    expect((clicks[0] as Cue).voices.every((v) => v.kind === "noise")).toBe(true);
  });

  it("battery:flat stopped (down-click, whine cut at once) differs from ran out (whine sags over 400 ms)", () => {
    const stopped = one("battery:flat", { nodeId: "bat", stopped: true });
    const ranOut = one("battery:flat", { nodeId: "bat", stopped: false });
    expect(sig(stopped)).not.toBe(sig(ranOut));
    expect(stopped.voices.length).toBeGreaterThan(0);
    expect(ranOut.voices).toEqual([]);
    expect(stopped.stop?.fade).toBeLessThan(0.05);
    expect(ranOut.stop).toMatchObject({ fade: 0.4, freqTo: 900 });
    expect(stopped.stop?.key).toBe(ranOut.stop?.key);
  });

  it("battery:released is a thump plus a held whine keyed to the node", () => {
    const cues = cuesFor("battery:released", { nodeId: "bat", charge: 5 });
    expect(cues.length).toBe(2);
    expect(cues[1]?.hold?.key).toBe(one("battery:flat", { nodeId: "bat", stopped: true }).stop?.key);
    expect(cues[1]?.hold?.voice.freq).toBe(1800);
  });

  it("job:completed, grid:changed and night events make no sound", () => {
    expect(cuesFor("job:completed", { puzzleId: "p", actions: 3 })).toEqual([]);
    expect(cuesFor("grid:changed", { reason: "time" })).toEqual([]);
    expect(cuesFor("night:dawn", { night: 1, repairsKept: [] })).toEqual([]);
  });

  it("no cue peaks above -8 dBFS", () => {
    const all: Cue[] = [
      ...blowCues(blown([["a"], ["b"]])),
      ...blowCues(blown(Array.from({ length: 32 }, () => ["a"]))),
      ...relightCues([0.2, 1, 2], 3),
      ...cuesFor("breaker:thrown", { nodeId: "b", closed: true }),
      ...cuesFor("battery:released", { nodeId: "b", charge: 1 }),
    ];
    for (const c of all) for (const v of c.voices) expect(v.gainDb).toBeLessThanOrEqual(CUE_CEILING_DB);
  });
});

describe("brownout", () => {
  const ev = (brownout: boolean, over?: string[]): Events["grid:brownout"] =>
    over ? { brownout, load: 9, capacity: 6, over } : { brownout, load: 9, capacity: 6 };

  it("the sag plays once when brownout stays true with a new over", () => {
    const t = new CueTracker();
    expect(t.cues("grid:brownout", ev(true, ["north"])).map((c) => c.name)).toEqual(["grid:sag"]);
    expect(t.cues("grid:brownout", ev(true, ["south"]))).toEqual([]);
  });

  it("true to false plays the recovery once, and a false that was already false plays nothing", () => {
    const t = new CueTracker();
    t.cues("grid:brownout", ev(true));
    expect(t.cues("grid:brownout", ev(false)).map((c) => c.name)).toEqual(["grid:recover"]);
    expect(t.cues("grid:brownout", ev(false))).toEqual([]);
  });

  it("the sag falls and the recovery rises", () => {
    const t = new CueTracker();
    const sag = t.cues("grid:brownout", ev(true))[0]?.voices[0];
    const rec = t.cues("grid:brownout", ev(false))[0]?.voices[0];
    expect((sag?.freqTo ?? 0) < (sag?.freq ?? 0)).toBe(true);
    expect((rec?.freqTo ?? 0) > (rec?.freq ?? 0)).toBe(true);
  });
});

describe("the blow sequence", () => {
  const withPath = blown([["l1", "l2"]]);
  const part = (cues: Cue[], p: string): Cue | undefined => cues.find((c) => c.part === p);

  it("with a path: run 0, glow 0.4, spark 0.5, pop 0.7, read from BLOW_TIMING", () => {
    const cues = blowCues(withPath);
    expect(cues.map((c) => c.at)).toEqual([BLOW_TIMING.run * 0, BLOW_TIMING.run, BLOW_TIMING.sparkAt, BLOW_TIMING.popAt]);
    expect(cues.map((c) => c.part)).toEqual(["run", "glow", "spark", "pop"]);
  });

  it("the clock is the literal 0, 0.4, 0.5, 0.7 (a change to BLOW_TIMING is noticed here)", () => {
    const cues = blowCues(withPath);
    expect(cues.map((c) => c.at)).toEqual([0, 0.4, 0.5, 0.7]);
    expect(part(cues, "run")?.voices[0]?.duration).toBe(0.4);
    expect(part(cues, "glow")?.voices[0]?.duration).toBe(0.3);
  });

  it("the pop lands at 0.7 s when there is a path and at 0 without", () => {
    expect(part(blowCues(withPath), "pop")?.at).toBe(0.7);
    const none = blowCues(blown([], { culprit: null, path: [], lamps: [] }));
    expect(none.map((c) => [c.part, c.at])).toEqual([["pop", 0]]);
  });

  it("lamps that all have empty paths count as no path", () => {
    expect(blowCues(blown([[], []])).map((c) => c.part)).toEqual(["pop"]);
  });

  it("an old payload without lamps uses [{ culprit, path }]", () => {
    const old: Events["fuse:blown"] = { nodeId: "f", faultId: "x", load: 5, rating: 3, culprit: "l", path: ["a"] };
    expect(blowCues(old).map((c) => c.part)).toEqual(["run", "glow", "spark", "pop"]);
    expect(blowCues({ ...old, culprit: null, path: [] }).map((c) => c.part)).toEqual(["pop"]);
  });

  it("the pop ducks; the run rises in level and the glow is two saws", () => {
    const cues = blowCues(withPath);
    expect(part(cues, "pop")?.ducks).toBe(true);
    const run = part(cues, "run")?.voices[0];
    expect(run?.gainDb).toBe(-30);
    expect(run?.gainDbTo).toBe(-18);
    expect(part(cues, "glow")?.voices.map((v) => v.freq)).toEqual([100, 200]);
  });

  it("1, 4, 7 and 32 lamps each make exactly one spark cue, at base, +3, +6 and +6 dB", () => {
    const base = peak(part(blowCues(blown([["a"]])), "spark") as Cue);
    for (const [n, boost] of [[1, 0], [4, 3], [7, 6], [32, 6]] as const) {
      const cues = blowCues(blown(Array.from({ length: n }, () => ["a"])));
      const sparks = cues.filter((c) => c.part === "spark");
      expect(sparks.length).toBe(1);
      expect(peak(sparks[0] as Cue)).toBeCloseTo(base + boost, 9);
    }
    expect(sparkBoostDb(100)).toBe(6);
  });

  it("the burst is 6 + min(lamps, 8) ticks of 8 ms inside 0.3 s, falling in level, deterministic", () => {
    for (const [n, ticks] of [[1, 7], [4, 10], [8, 14], [32, 14]] as const) {
      const v = sparkBurst(n);
      expect(v.length).toBe(ticks);
      for (const t of v) {
        expect(t.duration).toBe(0.008);
        expect(t.at + t.duration).toBeLessThanOrEqual(BLOW_TIMING.spark + 1e-9);
      }
    }
    expect(sparkBurst(3)).toEqual(sparkBurst(3));
    const v = sparkBurst(1);
    expect((v[0]?.gainDb ?? 0) > (v[v.length - 1]?.gainDb ?? 0)).toBe(true);
  });

  it("envelopes are finite, start and end at silence", () => {
    for (const c of blowCues(withPath)) {
      for (const v of c.voices) {
        const e = envelope(v);
        expect(e[0]?.[1]).toBe(0);
        expect(e[e.length - 1]?.[1]).toBe(0);
        expect(e.every(([t, g]) => Number.isFinite(t) && Number.isFinite(g))).toBe(true);
      }
    }
  });
});

describe("the Relight", () => {
  it("makes a bed plus one chime per distinct ignition time, and a close at the last chime", () => {
    const cues = relightCues([0.25, 0.25, 0.9, 2.65], 3.25);
    expect(cues.filter((c) => c.name.startsWith("relight:chime")).map((c) => c.at)).toEqual([0.25, 0.9, 2.65]);
    expect(cues.find((c) => c.name === "relight:bed")?.voices.length).toBe(2);
    expect(cues.find((c) => c.name === "relight:close")?.at).toBe(2.65);
    expect(cues.every((c) => c.group === "relight")).toBe(true);
  });

  it("ignitions 60 ms apart share one chime; 61 ms apart do not", () => {
    expect(chimeTimes([1, 1.06])).toEqual([1]);
    expect(chimeTimes([1, 1.061])).toEqual([1, 1.061]);
  });

  it("chime pitch rises through 330, 392, 440, 523, 659 and cycles", () => {
    const cues = relightCues([0, 1, 2, 3, 4, 5], 6).filter((c) => c.name.startsWith("relight:chime"));
    expect(cues.map((c) => c.voices[0]?.freq)).toEqual([330, 392, 440, 523, 659, 330]);
  });

  it("the bed's filter opens 200 to 2000 Hz over the duration and rings 1.5 s past the last chime", () => {
    const bed = relightCues([1, 2], 3).find((c) => c.name === "relight:bed");
    const v = bed?.voices[0];
    expect(v?.filter).toMatchObject({ freq: 200, freqTo: 2000, glideTime: 3 });
    expect(v?.duration).toBe(2 + 1.5);
  });

  it("a Relight with no lamps still has a bed and no chimes; junk numbers do not throw", () => {
    expect(relightCues([], 2).map((c) => c.name)).toEqual(["relight:bed"]);
    expect(() => relightCues([NaN, -1, Infinity], NaN)).not.toThrow();
  });
});
