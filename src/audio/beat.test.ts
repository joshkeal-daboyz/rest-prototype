import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { BEAT, EventBus, beatClock } from "../core";
import type { FeedReadout, SoundView } from "../core";
import { relightCues } from "./cues";
import { FakeContext, asContext } from "./fakeContext";
import type { FakeNode } from "./fakeContext";
import { createAudio } from "./index";
import { BeatScheduler, initialLayerState, layersFor } from "./layers";
import { DUCK_DB, Mixer, VOICE_BUDGET } from "./mixer";
import * as R from "./recipes";
import { noteHz, onGrid } from "./tuning";
import type { Cue, Voice } from "./types";

const flush = async (): Promise<void> => {
  for (let i = 0; i < 4; i++) await Promise.resolve();
};
const feed = (load: number, capacity: number | null = 10): FeedReadout => ({ load, capacity, over: capacity !== null && load > capacity });
const view = (feeds: Array<[string, FeedReadout]> = [], complete = false): SoundView => ({
  brownout: false,
  complete,
  feeds: new Map(feeds),
  batteries: new Map(),
  sparking: new Set(),
});
const powered = (): SoundView => view([["f", feed(4)]]);

beforeEach(() => {
  vi.spyOn(console, "warn").mockImplementation(() => undefined);
});
afterEach(() => vi.restoreAllMocks());

describe("beatThump (ticket 032)", () => {
  const [low, tick] = R.beatThump();
  it("a sine on A1 at -28 dB or quieter, attack 20 ms or less, release 0.2 to 0.35 s", () => {
    expect(low?.wave).toBe("sine");
    expect(low?.freq).toBe(noteHz("A1"));
    expect(R.dbToGain(low?.gainDb ?? 0)).toBeLessThanOrEqual(R.dbToGain(-28));
    expect(low?.attack).toBeLessThanOrEqual(0.02);
    expect(low?.release).toBeGreaterThanOrEqual(0.2);
    expect(low?.release).toBeLessThanOrEqual(0.35);
  });
  it("the tick is a sine on A2 at -40 dB or quieter", () => {
    expect(tick?.wave).toBe("sine");
    expect(tick?.freq).toBe(noteHz("A2"));
    expect(tick?.gainDb).toBeLessThanOrEqual(-40);
  });
  it("BEAT_HZ and BEAT_TICK_HZ are on the 432 grid, and the thump fits inside one beat period", () => {
    expect(onGrid(R.BEAT_HZ)).toBe(true);
    expect(onGrid(R.BEAT_TICK_HZ)).toBe(true);
    for (const v of R.beatThump()) expect(v.at + v.duration).toBeLessThan(BEAT.period);
  });
  it("is deterministic, and the thump is far below the cue ceiling", () => {
    expect(R.beatThump()).toEqual(R.beatThump());
    const sum = R.beatThump().reduce((a, v) => a + R.dbToGain(v.gainDb), 0);
    expect(sum).toBeLessThan(R.dbToGain(R.CUE_CEILING_DB));
  });
});

describe("beatOn: the beat plays only while the hum does", () => {
  it("false with no feeds, and false with feeds that carry no load", () => {
    expect(layersFor(view(), initialLayerState()).beatOn).toBe(false);
    expect(layersFor(view([["a", feed(0)], ["b", feed(0, null)]]), initialLayerState()).beatOn).toBe(false);
  });
  it("true exactly when hum > 0", () => {
    for (const v of [view(), powered(), view([["a", feed(0)]]), view([["a", feed(3, null)]]), view([["a", feed(99)]])]) {
      const l = layersFor(v, initialLayerState());
      expect(l.beatOn).toBe(l.hum > 0);
    }
    expect(layersFor(powered(), initialLayerState()).beatOn).toBe(true);
  });
});

describe("BeatScheduler (pure; the clock and the time are arguments)", () => {
  const clock = beatClock(60); // a beat every second: easy sums
  it("overlapping frames return each beat once", () => {
    const s = new BeatScheduler();
    const got: number[] = [];
    for (let t = 0.5; t < 6; t += 0.016) got.push(...s.collect(clock, t, 0.1, true));
    expect(got).toEqual([1, 2, 3, 4, 5, 6]); // the last frame at t=5.99 looks 0.1 ahead
  });
  it("returns nothing before t: a beat already in the past is skipped, never played late", () => {
    const s = new BeatScheduler();
    expect(s.collect(clock, 2.4, 0.1, true)).toEqual([]);
    expect(s.collect(clock, 2.95, 0.1, true)).toEqual([3]);
    expect(s.collect(clock, 7.5, 0.1, true)).toEqual([]); // a long stall skipped 4..7
    expect(s.collect(clock, 7.95, 0.1, true)).toEqual([8]);
  });
  it("off returns nothing; on again resumes from the next beat", () => {
    const s = new BeatScheduler();
    expect(s.collect(clock, 0.95, 0.1, true)).toEqual([1]);
    expect(s.collect(clock, 1.5, 0.1, false)).toEqual([]);
    expect(s.collect(clock, 2.95, 0.1, true)).toEqual([3]);
  });
  it("reset() restarts: the same window hands the beat out again", () => {
    const s = new BeatScheduler();
    expect(s.collect(clock, 0.95, 0.1, true)).toEqual([1]);
    expect(s.collect(clock, 0.96, 0.1, true)).toEqual([]);
    s.reset();
    expect(s.collect(clock, 0.96, 0.1, true)).toEqual([1]);
  });
  it("a clock that jumps backwards starts over instead of going silent", () => {
    const s = new BeatScheduler();
    s.collect(clock, 50.95, 0.1, true);
    expect(s.collect(clock, 0.95, 0.1, true)).toEqual([1]);
  });
  it("never reads a clock: no Date, performance or Math.random in layers.ts", () => {
    const src = readFileSync(new URL("./layers.ts", import.meta.url), "utf8");
    expect(src).not.toMatch(/Date\.now|performance\.now|Math\.random/);
  });
});

async function setup(configure?: (f: FakeContext) => void) {
  const fake = new FakeContext();
  configure?.(fake);
  const target = new EventTarget();
  const audio = createAudio({ createContext: () => asContext(fake) as unknown as AudioContext, gestureTarget: target });
  const bus = new EventBus();
  const detach = audio.attach(bus);
  const unlock = async () => {
    target.dispatchEvent(new Event("pointerdown"));
    await flush();
  };
  return { fake, audio, bus, detach, unlock };
}
/** Oscillators started at an explicit time that were created after `before` (the permanent layers start with no time). */
const thumpSources = (f: FakeContext, before: ReadonlySet<FakeNode>) =>
  f.nodes.filter((n) => !before.has(n) && (n.kind === "osc" || n.kind === "buffersource") && n.starts.some((s) => s.when !== undefined));

describe("the engine schedules the beat on the fake context", () => {
  it("a powered view schedules thump sources at currentTime + (beatT - t), within 1 ms", async () => {
    const s = await setup();
    await s.unlock();
    const before = new Set<FakeNode>(s.fake.nodes);
    const t = BEAT.at(5) - 0.04;
    s.audio.update(powered(), 0.016, t);
    const made = thumpSources(s.fake, before);
    expect(made.length).toBe(R.beatThump().length);
    for (const n of made) expect(Math.abs((n.starts[0]?.when ?? 0) - (s.fake.currentTime + 0.04))).toBeLessThan(0.001);
    expect(made.map((n) => n.frequency.calls[0]?.args[0]).sort()).toEqual([R.BEAT_HZ, R.BEAT_TICK_HZ].sort());
  });

  it("each beat is scheduled once over many frames", async () => {
    const s = await setup();
    await s.unlock();
    const before = new Set<FakeNode>(s.fake.nodes);
    const frames = 600;
    for (let i = 0; i < frames; i++) s.audio.update(powered(), 1 / 60, 3 + i / 60);
    const lows = thumpSources(s.fake, before).filter((n) => n.frequency.calls[0]?.args[0] === R.BEAT_HZ);
    expect(lows.length).toBeGreaterThanOrEqual(BEAT.between(3, 3 + (frames - 1) / 60).length);
    expect(lows.length).toBeLessThanOrEqual(BEAT.between(3, 3 + frames / 60 + 0.1).length);
  });

  it("an unpowered view, a missing timeSeconds, or a locked context schedules none", async () => {
    const s = await setup();
    s.audio.update(powered(), 0.016, 0.85); // before the gesture: no context yet
    await s.unlock();
    const before = new Set<FakeNode>(s.fake.nodes);
    s.audio.update(view(), 0.016, 0.85);
    s.audio.update(view([["f", feed(0)]]), 0.016, 0.85);
    s.audio.update(powered(), 0.016);
    expect(thumpSources(s.fake, before).length).toBe(0);

    const locked = await setup((f) => (f.resumeResult = "stay"));
    await locked.unlock();
    const b2 = new Set<FakeNode>(locked.fake.nodes);
    locked.audio.update(powered(), 0.016, 0.85);
    expect(thumpSources(locked.fake, b2).length).toBe(0);
  });

  it("the thump path runs voice gain -> duck -> master, the same duck as the hum", async () => {
    const s = await setup();
    await s.unlock();
    const before = new Set<FakeNode>(s.fake.nodes);
    s.audio.update(powered(), 0.016, BEAT.at(3) - 0.02);
    const master = s.fake.all("gain")[0];
    const fresh = s.fake.nodes.filter((n) => !before.has(n));
    const voiceGains = fresh.filter((n) => n.kind === "gain");
    expect(voiceGains.length).toBe(R.beatThump().length);
    const duck = voiceGains[0]?.connections[0];
    expect(duck?.kind).toBe("gain");
    expect(duck?.connections[0]).toBe(master);
    for (const g of voiceGains) expect(g.connections[0]).toBe(duck);
    expect(duck).not.toBe(master);
    const humGain = s.fake.all("gain").find((n) => n.connections[0] === duck && !voiceGains.includes(n));
    expect(humGain).toBeDefined();
  });

  it("mute ramps the master to 0 within 30 ms, and the graph and the beat keep running", async () => {
    const s = await setup();
    await s.unlock();
    s.audio.setMuted(true);
    const master = s.fake.all("gain")[0];
    const last = master?.params.gain?.calls.filter((c) => c.op === "linearRamp").pop();
    expect(last?.args[0]).toBe(0);
    expect((last?.args[1] ?? 99) - s.fake.currentTime).toBeLessThanOrEqual(0.03);
    const before = new Set<FakeNode>(s.fake.nodes);
    s.audio.update(powered(), 0.016, BEAT.at(3) - 0.02);
    expect(thumpSources(s.fake, before).length).toBe(R.beatThump().length);
  });

  it("a Relight dips the duck gain the beat runs through (the beat ducks like the hum)", async () => {
    const s = await setup();
    await s.unlock();
    s.audio.update(powered(), 0.016, BEAT.at(2) + 0.1);
    const master = s.fake.all("gain")[0];
    const duck = s.fake.all("gain").find((n) => n !== master && n.connections[0] === master);
    expect(duck).toBeDefined();
    const before = duck?.params.gain?.calls.length ?? 0;
    s.audio.relight([0.3], 1);
    s.audio.update(powered(), 0.016, BEAT.at(2) + 0.116);
    const target = duck?.params.gain?.calls.slice(before).find((c) => c.op === "setTarget");
    expect(target?.args[0]).toBeCloseTo(R.dbToGain(DUCK_DB), 6);
  });

  it("detach stops pending thumps and resets the scheduler (the same beat can be scheduled afresh)", async () => {
    const s = await setup();
    await s.unlock();
    const before = new Set<FakeNode>(s.fake.nodes);
    const t = BEAT.at(4) - 0.05;
    s.audio.update(powered(), 0.016, t);
    const made = thumpSources(s.fake, before);
    expect(made.length).toBe(2);
    expect(made.every((n) => n.stops.length === 1)).toBe(true);
    s.detach();
    expect(made.every((n) => n.stops.length === 2)).toBe(true);
    s.audio.attach(new EventBus());
    const b2 = new Set<FakeNode>(s.fake.nodes);
    s.audio.update(powered(), 0.016, t);
    expect(thumpSources(s.fake, b2).length).toBe(2);
  });

  it("with the voice budget full of protected Relight voices, a beat still sounds", async () => {
    const s = await setup();
    await s.unlock();
    s.audio.relight([0, 0.5, 1, 1.5, 2, 2.5], 3);
    const before = new Set<FakeNode>(s.fake.nodes);
    s.audio.update(powered(), 0.016, BEAT.at(3) - 0.02);
    expect(thumpSources(s.fake, before).length).toBe(R.beatThump().length);
  });

  it("no AudioContext, or a rejecting resume: update with a time never throws", async () => {
    const none = createAudio({ gestureTarget: new EventTarget() });
    expect(() => none.update(powered(), 0.016, 1)).not.toThrow();
    const rej = await setup((f) => (f.resumeResult = "reject"));
    await rej.unlock();
    expect(() => rej.audio.update(powered(), 0.016, 1)).not.toThrow();
  });
});

describe("the mixer never sees the beat", () => {
  it("VOICE_BUDGET and the cue ceiling are unchanged", () => {
    expect(VOICE_BUDGET).toBe(12);
    expect(R.CUE_CEILING_DB).toBe(-8);
  });
  it("with the budget full an ordinary extra cue is dropped, and nothing about the beat is in the mixer's drops", () => {
    const tone: Voice = { kind: "osc", wave: "sine", freq: 432, attack: 0.01, decay: 0, sustain: 1, release: 0.1, gainDb: -30, at: 0, duration: 2 };
    const m = new Mixer();
    const fill: Cue = { name: "fill", at: 0, voices: Array.from({ length: VOICE_BUDGET }, () => tone) };
    m.take([fill], 0);
    const r = m.take([{ name: "extra", at: 0, voices: [tone] }], 0.1);
    expect(r.dropped).toEqual(["extra"]);
  });
});

describe("node cleanup: the beat thumps for as long as a feed is powered", () => {
  /** Fire onended for every source whose last stop time has passed, once (what the browser does). */
  function reap(f: FakeContext, done: Set<FakeNode>): void {
    for (const n of f.nodes) {
      if (done.has(n) || (n.kind !== "osc" && n.kind !== "buffersource") || typeof n.onended !== "function") continue;
      const stop = n.stops.length ? Math.max(...n.stops.map((x) => x ?? 0)) : Infinity;
      if (stop <= f.currentTime) {
        done.add(n);
        n.onended();
      }
    }
  }

  it("every thump node is stopped and disconnected at its end; live nodes stay bounded over 6000 update() calls", async () => {
    const s = await setup();
    await s.unlock();
    const baseline = s.fake.nodes.length;
    const done = new Set<FakeNode>();
    const dt = 1 / 60;
    let peak = 0;
    for (let i = 0; i < 6000; i++) {
      s.fake.currentTime += dt;
      s.audio.update(powered(), dt, 1000 + i * dt);
      reap(s.fake, done);
      peak = Math.max(peak, s.fake.nodes.slice(baseline).filter((n) => !n.disconnected).length);
    }
    const made = s.fake.nodes.slice(baseline);
    const beats = made.filter((n) => n.kind === "osc").length / R.beatThump().length;
    expect(beats).toBeGreaterThan(100); // 100 s at 66 bpm is about 110 beats
    const perBeat = 2 * R.beatThump().length; // an oscillator and a gain per voice
    expect(peak).toBeLessThanOrEqual(perBeat * 2); // at most a couple of beats in flight
    s.fake.currentTime += 2;
    reap(s.fake, done);
    expect(s.fake.nodes.slice(baseline).filter((n) => !n.disconnected).length).toBe(0);
    for (const n of made.filter((x) => x.kind === "osc")) expect(n.stops.length).toBe(1);
  });

  it("an unpowered stretch creates no nodes at all, over thousands of calls", async () => {
    const s = await setup();
    await s.unlock();
    const count = s.fake.nodes.length;
    for (let i = 0; i < 3000; i++) s.audio.update(view(), 1 / 60, 50 + i / 60);
    expect(s.fake.nodes.length).toBe(count);
  });

  it("no timers are used: the engine, shell and layers never call setTimeout, setInterval or requestAnimationFrame", () => {
    for (const f of ["engine.ts", "shell.ts", "layers.ts"]) {
      expect(readFileSync(new URL(`./${f}`, import.meta.url), "utf8"), f).not.toMatch(/setTimeout|setInterval|requestAnimationFrame/);
    }
  });
});

describe("the Relight chimes are soft dyads (ticket 032)", () => {
  it("[0] is exactly 031's chime voice, for every index", () => {
    for (let i = 0; i < 12; i++) {
      expect(R.relightChime(i)[0]).toEqual({
        kind: "osc", wave: "sine", freq: R.CHIME_HZ[i % 5], attack: 0.04, decay: 0, sustain: 1, release: 0.6, at: 0, duration: 0.7, gainDb: -22,
      });
    }
  });
  it("[1] is a sine a fifth above on the grid, same envelope and timing, not louder; exactly 2 voices", () => {
    expect(R.CHIME_PARTNER_SEMITONES).toBe(7);
    for (let i = 0; i < 12; i++) {
      const [a, b] = R.relightChime(i);
      expect(R.relightChime(i).length).toBe(2);
      expect(b?.wave).toBe("sine");
      expect(b?.freq).toBeCloseTo((a?.freq ?? 0) * Math.pow(2, 7 / 12), 9);
      expect(onGrid(b?.freq ?? 0)).toBe(true);
      expect(b?.attack).toBe(a?.attack);
      expect(b?.release).toBe(a?.release);
      expect(b?.duration).toBe(a?.duration);
      expect(b?.at).toBe(a?.at);
      expect(b?.gainDb).toBe(R.CHIME_PARTNER_DB);
      expect(R.CHIME_PARTNER_DB).toBeLessThanOrEqual(-30);
      expect(R.dbToGain(b?.gainDb ?? 0)).toBeLessThanOrEqual(R.dbToGain(a?.gainDb ?? 0));
    }
  });
  it("each chime cue's summed peaks are below the ceiling; the notes, order, timing, bed and close are unchanged", () => {
    const cues = relightCues([0.25, 0.9, 2.65], 3);
    const chimes = cues.filter((c) => c.name.startsWith("relight:chime"));
    expect(chimes.map((c) => c.at)).toEqual([0.25, 0.9, 2.65]);
    for (const c of chimes) expect(c.voices.reduce((a, v) => a + R.dbToGain(v.gainDb), 0)).toBeLessThan(R.dbToGain(R.CUE_CEILING_DB));
    expect(chimes.map((c) => c.voices[0]?.freq)).toEqual([noteHz("E4"), noteHz("G4"), noteHz("A4")]);
    expect(R.CHIME_HZ).toEqual([noteHz("E4"), noteHz("G4"), noteHz("A4"), noteHz("C5"), noteHz("E5")]);
    expect(cues[0]?.name).toBe("relight:bed");
    expect(cues[cues.length - 1]?.name).toBe("relight:close");
    expect(cues[cues.length - 1]?.voices).toEqual(R.relightClose());
  });
  it("with the budget full, every chime plays both voices", () => {
    const tone: Voice = { kind: "osc", wave: "sine", freq: 432, attack: 0.01, decay: 0, sustain: 1, release: 0.1, gainDb: -30, at: 0, duration: 9 };
    const m = new Mixer();
    m.take([{ name: "fill", at: 0, voices: Array.from({ length: VOICE_BUDGET }, () => tone) }], 0);
    const r = m.take(relightCues([0, 0.5, 1, 1.5, 2, 2.5], 3), 0.1);
    const chimes = r.play.filter((c) => c.name.startsWith("relight:chime"));
    expect(chimes.length).toBe(6);
    for (const c of chimes) expect(c.voices.length).toBe(2);
    expect(r.dropped).toEqual([]);
  });
});
