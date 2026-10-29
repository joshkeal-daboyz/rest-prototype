import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { EventBus } from "../core";
import type { SoundView } from "../core";
import { FakeContext, asContext } from "./fakeContext";
import { createAudio } from "./index";
import { levelDoneSound } from "./recipes";

const flush = async (): Promise<void> => {
  for (let i = 0; i < 4; i++) await Promise.resolve();
};

function setup(configure?: (f: FakeContext) => void) {
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

const won = (complete: boolean): SoundView => ({
  brownout: false,
  complete,
  feeds: new Map(),
  batteries: new Map(),
  sparking: new Set(),
});
/** Sources one choir cue starts: each voice, plus a vibrato or tremolo oscillator where it has one. */
const CHOIR_SOURCES = levelDoneSound().reduce((n, v) => n + 1 + (v.vibrato ? 1 : 0) + (v.lfo ? 1 : 0), 0);
const cueStarts = (f: FakeContext) =>
  [...f.all("osc"), ...f.all("buffersource")].filter((n) => n.starts.some((s) => s.when !== undefined));

beforeEach(() => {
  vi.spyOn(console, "warn").mockImplementation(() => undefined);
});
afterEach(() => vi.restoreAllMocks());

describe("levelDone on the fake context (ticket 025)", () => {
  it("after the gesture and a won frame, the choir's sources start at about currentTime", async () => {
    const s = setup();
    await s.unlock();
    s.audio.update(won(true), 0.016);
    expect(cueStarts(s.fake).length).toBe(0);
    s.audio.levelDone();
    const nodes = cueStarts(s.fake);
    expect(nodes.length).toBe(CHOIR_SOURCES);
    const whens = nodes.flatMap((n) => n.starts.map((x) => x.when ?? 0));
    expect(Math.min(...whens)).toBeCloseTo(s.fake.currentTime, 6);
    expect(Math.max(...whens)).toBeLessThan(s.fake.currentTime + 1);
  });

  it("a second call on the same win starts nothing", async () => {
    const s = setup();
    await s.unlock();
    s.audio.update(won(true), 0.016);
    s.audio.levelDone();
    s.audio.levelDone();
    s.audio.update(won(true), 0.016);
    s.audio.levelDone();
    expect(cueStarts(s.fake).length).toBe(CHOIR_SOURCES);
  });

  it("with the last view not complete, starts nothing", async () => {
    const s = setup();
    await s.unlock();
    s.audio.update(won(false), 0.016);
    s.audio.levelDone();
    expect(cueStarts(s.fake).length).toBe(0);
  });

  it("before the gesture starts nothing and is not queued; a fresh win after it plays", async () => {
    const s = setup();
    s.audio.update(won(true), 0.016);
    s.audio.levelDone();
    await s.unlock();
    s.audio.levelDone();
    expect(cueStarts(s.fake).length).toBe(0);
    s.audio.update(won(false), 0.016);
    s.audio.update(won(true), 0.016);
    s.audio.levelDone();
    expect(cueStarts(s.fake).length).toBe(CHOIR_SOURCES);
  });

  it("muted, the master stays 0 and is never raised; unmuting does not replay", async () => {
    const s = setup();
    s.audio.setMuted(true);
    await s.unlock();
    s.audio.update(won(true), 0.016);
    s.audio.levelDone();
    const master = s.fake.all("gain")[0];
    expect(master?.params.gain?.value).toBe(0);
    const raised = master?.params.gain?.calls.some((c) => c.op !== "cancel" && (c.args[0] ?? 0) > 0);
    expect(raised).toBe(false);
    const n = cueStarts(s.fake).length;
    s.audio.setMuted(false);
    s.audio.levelDone();
    expect(cueStarts(s.fake).length).toBe(n);
  });

  it("detach right after levelDone does not stop the cue early, but still stops other cues", async () => {
    const s = setup();
    await s.unlock();
    s.bus.emit("breaker:thrown", { nodeId: "b", closed: true });
    s.audio.update(won(true), 0.016);
    s.audio.levelDone();
    const all = cueStarts(s.fake);
    expect(all.length).toBe(2 + CHOIR_SOURCES); // breaker: thump + click; level: the choir
    s.detach();
    const rang = all.filter((n) => n.stops.length === 1);
    const killed = all.filter((n) => n.stops.length === 2);
    expect(rang.length).toBe(CHOIR_SOURCES);
    expect(killed.length).toBe(2);
    for (const n of rang) expect((n.stops[0] ?? 0) - s.fake.currentTime).toBeGreaterThan(0.08);
  });

  it("no AudioContext, a throwing factory and a rejecting resume never throw", async () => {
    const none = createAudio({ gestureTarget: new EventTarget() });
    none.update(won(true), 0.016);
    expect(() => none.levelDone()).not.toThrow();

    const target = new EventTarget();
    const bad = createAudio({
      createContext: () => {
        throw new Error("no");
      },
      gestureTarget: target,
    });
    target.dispatchEvent(new Event("pointerdown"));
    await flush();
    bad.update(won(true), 0.016);
    expect(() => bad.levelDone()).not.toThrow();

    const s = setup((f) => (f.resumeResult = "reject"));
    await s.unlock();
    s.audio.update(won(true), 0.016);
    expect(() => s.audio.levelDone()).not.toThrow();
  });
});
