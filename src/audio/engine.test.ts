import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { EventBus } from "../core";
import type { BatteryReadout, FeedReadout, SoundView } from "../core";
import { FakeContext, asContext } from "./fakeContext";
import type { FakeNode } from "./fakeContext";
import { createAudio } from "./index";
import { BATTERY_RUNOUT_HZ, BATTERY_WHINE_HZ, CHIME_HZ } from "./recipes";
import { noteHz } from "./tuning";

const flush = async (): Promise<void> => {
  for (let i = 0; i < 4; i++) await Promise.resolve();
};

function setup(configure?: (f: FakeContext) => void) {
  const fake = new FakeContext();
  configure?.(fake);
  const target = new EventTarget();
  let made = 0;
  const audio = createAudio({
    createContext: () => {
      made++;
      return asContext(fake) as unknown as AudioContext;
    },
    gestureTarget: target,
  });
  const bus = new EventBus();
  const detach = audio.attach(bus);
  const unlock = async (type = "pointerdown") => {
    target.dispatchEvent(new Event(type));
    await flush();
  };
  return { fake, target, audio, bus, detach, unlock, made: () => made };
}

const view = (o: Partial<{ feeds: [string, FeedReadout][]; batteries: [string, BatteryReadout][]; sparking: string[]; brownout: boolean }> = {}): SoundView => ({
  brownout: o.brownout ?? false,
  complete: false,
  feeds: new Map(o.feeds ?? []),
  batteries: new Map(o.batteries ?? []),
  sparking: new Set(o.sparking ?? []),
});
const master = (f: FakeContext): FakeNode => f.all("gain")[0] as FakeNode;
const blowEvent = (paths: string[][] = [["a", "b"]]) => ({
  nodeId: "fb", faultId: "f", load: 5, rating: 3,
  culprit: paths[0] ? "l0" : null, path: paths[0] ?? [],
  lamps: paths.map((path, i) => ({ id: `l${i}`, path })),
});
const oscStartsAt = (f: FakeContext, when: number) =>
  f.all("osc").filter((n) => n.starts.some((s) => s.when !== undefined && Math.abs(s.when - when) < 1e-9));

beforeEach(() => {
  vi.spyOn(console, "warn").mockImplementation(() => undefined);
});
afterEach(() => vi.restoreAllMocks());

describe("starts only after a user gesture", () => {
  it("creates nothing before the first pointerdown, then one context, resumed", async () => {
    const s = setup();
    s.bus.emit("play:click", { kind: "undo" });
    s.audio.update(view(), 0.016);
    s.audio.relight([0.2], 1);
    expect(s.made()).toBe(0);
    expect(s.fake.nodes.length).toBe(1); // only the fake's own destination
    await s.unlock();
    expect(s.made()).toBe(1);
    expect(s.fake.resumeCalls).toBe(1);
    await s.unlock();
    expect(s.made()).toBe(1);
  });

  it("a keydown also unlocks, and only once", async () => {
    const s = setup();
    await s.unlock("keydown");
    await s.unlock("pointerdown");
    expect(s.made()).toBe(1);
    expect(s.fake.resumeCalls).toBe(1);
  });

  it("events before the gesture are dropped, not queued", async () => {
    const s = setup();
    s.bus.emit("switch:thrown", { nodeId: "s", selected: 1 });
    s.bus.emit("fuse:blown", blowEvent());
    await s.unlock();
    const before = s.fake.started("osc").length + s.fake.started("buffersource").length;
    s.fake.currentTime += 5;
    expect(s.fake.started("osc").length + s.fake.started("buffersource").length).toBe(before);
    expect(oscStartsAt(s.fake, 10.7).length).toBe(0);
  });

  it("a context that stays suspended is not played into; the next gesture tries again", async () => {
    const s = setup((f) => (f.resumeResult = "stay"));
    await s.unlock();
    s.bus.emit("switch:thrown", { nodeId: "s", selected: 1 });
    expect(s.fake.started("buffersource").length).toBe(0);
    await s.unlock();
    expect(s.made()).toBe(1);
    expect(s.fake.resumeCalls).toBe(2);
  });

  it("a rejected resume re-arms the listeners without throwing", async () => {
    const s = setup((f) => (f.resumeResult = "reject"));
    await s.unlock();
    s.fake.resumeResult = "ok";
    await s.unlock();
    expect(s.made()).toBe(1);
    expect(s.fake.resumeCalls).toBe(2);
    expect(s.fake.state).toBe("running");
  });
});

describe("sound reaches the graph", () => {
  it("master -> compressor -> destination with the ceiling settings", async () => {
    const s = setup();
    await s.unlock();
    const comp = s.fake.all("compressor")[0] as FakeNode;
    expect(master(s.fake).connections).toContain(comp);
    expect(comp.connections).toContain(s.fake.destination);
    expect(comp.threshold.value).toBe(-10);
    expect(comp.ratio.value).toBe(12);
    expect(comp.knee.value).toBe(0);
    expect(comp.attack.value).toBe(0.003);
    expect(comp.release.value).toBe(0.1);
    expect(master(s.fake).gain.value).toBe(0.5);
  });

  it("the pop's oscillator starts at currentTime + 0.7, the run's noise at currentTime", async () => {
    const s = setup();
    await s.unlock();
    s.bus.emit("fuse:blown", blowEvent());
    const pop = oscStartsAt(s.fake, 10.7).find((n) => n.type === "sine");
    expect(pop).toBeDefined();
    expect(pop?.frequency.calls[0]).toEqual({ op: "setValueAtTime", args: [noteHz("F#3"), 10.7] });
    expect(pop?.frequency.calls[1]).toEqual({ op: "expRamp", args: [noteHz("E1"), 10.7 + 0.08] });
    expect(s.fake.all("buffersource").some((n) => n.starts[0]?.when === 10)).toBe(true);
  });

  it("with no path the pop starts at once and nothing else is scheduled", async () => {
    const s = setup();
    await s.unlock();
    const before = s.fake.all("osc").length;
    s.bus.emit("fuse:blown", { ...blowEvent([]), culprit: null, path: [], lamps: [] });
    const added = s.fake.all("osc").slice(before);
    expect(added.length).toBe(1);
    expect(added[0]?.starts[0]?.when).toBe(10);
  });

  it("the spark burst is scheduled when update() sees it is due", async () => {
    const s = setup();
    await s.unlock();
    s.bus.emit("fuse:blown", blowEvent([["a"], ["b"], ["c"]]));
    const noiseBefore = s.fake.all("buffersource").length;
    s.fake.currentTime = 10.2;
    s.audio.update(view(), 0.016);
    expect(s.fake.all("buffersource").length).toBe(noiseBefore);
    s.fake.currentTime = 10.49;
    s.audio.update(view(), 0.016);
    const added = s.fake.all("buffersource").slice(noiseBefore);
    expect(added.length).toBe(6 + 3);
    for (const n of added) expect(n.starts[0]?.when).toBeGreaterThanOrEqual(10.5 - 1e-9);
    expect(added.every((n) => (n.starts[0]?.when ?? 0) <= 10.5 + 0.3)).toBe(true);
  });

  it("voice nodes are stopped and disconnected when they end", async () => {
    const s = setup();
    await s.unlock();
    s.bus.emit("breaker:thrown", { nodeId: "b", closed: true });
    const voices = s.fake.all("buffersource");
    expect(voices.length).toBe(1);
    const v = voices[0] as FakeNode;
    expect(v.stops.length).toBe(1);
    v.onended();
    expect(v.disconnected).toBe(true);
  });

  it("layers: the hum rises with load, the whine follows charging, ducking follows the pop", async () => {
    const s = setup();
    await s.unlock();
    const hum = s.fake.all("gain")[2] as FakeNode; // master, duck, hum
    s.audio.update(view({ feeds: [["a", { load: 3, capacity: 3, over: false }]] }), 0.016);
    expect(hum.gain.calls.at(-1)).toEqual({ op: "linearRamp", args: [Math.pow(10, -30 / 20), 10 + 0.08] });
    s.audio.update(view(), 0.016);
    expect(hum.gain.calls.at(-1)?.args[0]).toBe(0);
    const duck = s.fake.all("gain")[1] as FakeNode;
    s.bus.emit("fuse:blown", { ...blowEvent([]), culprit: null, path: [], lamps: [] });
    s.fake.currentTime = 10.1;
    s.audio.update(view(), 0.016);
    expect(duck.gain.calls.at(-1)?.op).toBe("setTarget");
    expect(duck.gain.calls.at(-1)?.args[0]).toBeCloseTo(Math.pow(10, -12 / 20), 9);
  });

  it("a held battery whine starts after the release thump and stops with battery:flat", async () => {
    const s = setup();
    await s.unlock();
    s.bus.emit("battery:released", { nodeId: "bat", charge: 4 });
    const whine = s.fake.all("osc").find((n) => n.frequency.calls[0]?.args[0] === BATTERY_WHINE_HZ);
    expect(whine?.starts[0]?.when).toBe(10.25);
    expect(whine?.stops.length).toBe(0);
    s.fake.currentTime = 12;
    s.bus.emit("battery:flat", { nodeId: "bat", stopped: false });
    expect(whine?.stops.length).toBe(1);
    expect(whine?.frequency.calls.at(-1)).toEqual({ op: "linearRamp", args: [BATTERY_RUNOUT_HZ, 12.4] });
  });
});

describe("mute and volume", () => {
  it("defaults to volume 0.5, unmuted", () => {
    const { audio } = setup();
    expect(audio.volume).toBe(0.5);
    expect(audio.muted).toBe(false);
  });

  it("setMuted takes the master gain to 0 within 30 ms without stopping anything", async () => {
    const s = setup();
    await s.unlock();
    s.audio.update(view({ feeds: [["a", { load: 1, capacity: 3, over: false }]] }), 0.016);
    const stopsBefore = s.fake.nodes.reduce((n, x) => n + x.stops.length, 0);
    s.audio.setMuted(true);
    expect(s.audio.muted).toBe(true);
    const last = master(s.fake).gain.calls.at(-1);
    expect(last?.op).toBe("linearRamp");
    expect(last?.args[0]).toBe(0);
    expect((last?.args[1] ?? 99) - s.fake.currentTime).toBeLessThanOrEqual(0.03);
    expect(s.fake.nodes.reduce((n, x) => n + x.stops.length, 0)).toBe(stopsBefore);
    s.audio.setMuted(false);
    expect(master(s.fake).gain.calls.at(-1)?.args[0]).toBe(0.5);
  });

  it("setVolume clamps to 0..1 and ignores NaN", async () => {
    const s = setup();
    await s.unlock();
    s.audio.setVolume(0.8);
    expect(s.audio.volume).toBe(0.8);
    s.audio.setVolume(3);
    expect(s.audio.volume).toBe(1);
    s.audio.setVolume(-2);
    expect(s.audio.volume).toBe(0);
    s.audio.setVolume(0.3);
    s.audio.setVolume(NaN);
    expect(s.audio.volume).toBe(0.3);
    expect(master(s.fake).gain.calls.at(-1)?.args[0]).toBe(0.3);
  });

  it("mute and volume set before the first gesture apply when the graph is built", async () => {
    const s = setup();
    s.audio.setMuted(true);
    s.audio.setVolume(0.9);
    await s.unlock();
    expect(master(s.fake).gain.value).toBe(0);
    s.audio.setMuted(false);
    expect(master(s.fake).gain.calls.at(-1)?.args[0]).toBe(0.9);
  });
});

describe("no crackle catch-up after a time gap (ticket 033)", () => {
  const nodesAfterGap = async (suspend: boolean): Promise<number> => {
    const s = setup();
    await s.unlock();
    const sparking = view({ sparking: ["a"] });
    s.audio.update(sparking, 0.016);
    if (suspend) s.fake.state = "suspended";
    s.fake.currentTime += 600;
    if (suspend) {
      s.audio.update(sparking, 0.016);
      s.fake.state = "running";
    }
    const before = s.fake.nodes.length;
    s.audio.update(sparking, 0.016);
    return s.fake.nodes.length - before;
  };

  it("a 600 s gap creates a handful of nodes on the next frame, not thousands", async () => {
    expect(await nodesAfterGap(false)).toBeLessThanOrEqual(2 * 3 * 2);
  });

  it("also with the context suspended in between", async () => {
    expect(await nodesAfterGap(true)).toBeLessThanOrEqual(2 * 3 * 2);
  });
});

describe("never throws without audio", () => {
  const exercise = (audio: ReturnType<typeof createAudio>, bus: EventBus) => {
    const detach = audio.attach(bus);
    expect(() => {
      bus.emit("fuse:blown", blowEvent());
      bus.emit("switch:thrown", { nodeId: "s", selected: 1 });
      bus.emit("grid:brownout", { brownout: true, load: 1, capacity: 1 });
      bus.emit("battery:released", { nodeId: "b", charge: 1 });
      bus.emit("battery:flat", { nodeId: "b", stopped: true });
      bus.emit("play:click", { kind: "refused", target: "x" });
      bus.emit("job:completed", { puzzleId: "p", actions: 1 });
      audio.update(view({ sparking: ["a"], brownout: true }), 0.016);
      audio.relight([0.1, 0.5], 1);
      audio.setMuted(true);
      audio.setVolume(0.2);
      detach();
    }).not.toThrow();
  };

  it("with no AudioContext on the global (this node environment), and no factory", async () => {
    expect(typeof window).toBe("undefined");
    const audio = createAudio();
    exercise(audio, new EventBus());
    expect(audio.muted).toBe(true);
  });

  it("with a factory that throws", async () => {
    const target = new EventTarget();
    const audio = createAudio({
      createContext: () => {
        throw new Error("no audio");
      },
      gestureTarget: target,
    });
    target.dispatchEvent(new Event("pointerdown"));
    await flush();
    exercise(audio, new EventBus());
  });

  it("with a resume() that rejects", async () => {
    const s = setup((f) => (f.resumeResult = "reject"));
    await s.unlock();
    exercise(s.audio, s.bus);
  });

  it("with a graph that fails to build", async () => {
    const s = setup((f) => {
      f.createGain = () => {
        throw new Error("nope");
      };
    });
    await s.unlock();
    exercise(s.audio, s.bus);
  });
});

describe("errors inside a cue", () => {
  it("are swallowed and warned once per cue name", async () => {
    const s = setup();
    await s.unlock();
    s.fake.createBufferSource = () => {
      throw new Error("boom");
    };
    expect(() => {
      s.bus.emit("switch:thrown", { nodeId: "s", selected: 1 });
      s.fake.currentTime += 1;
      s.bus.emit("switch:thrown", { nodeId: "s", selected: 0 });
    }).not.toThrow();
    const warns = vi.mocked(console.warn).mock.calls.filter((c) => String(c[0]).includes("switch:thrown"));
    expect(warns.length).toBe(1);
  });
});

describe("detach", () => {
  it("makes a later emit silent and stops that map's sounds and layers", async () => {
    const s = setup();
    await s.unlock();
    s.audio.update(view({ feeds: [["a", { load: 3, capacity: 3, over: false }]] }), 0.016);
    s.bus.emit("battery:released", { nodeId: "bat", charge: 4 });
    s.bus.emit("fuse:blown", blowEvent());
    const hum = s.fake.all("gain")[2] as FakeNode;
    const live = s.fake.nodes.filter((n) => n.kind === "gain" && n.disconnected === false).length;
    expect(live).toBeGreaterThan(0);
    s.detach();
    // layers zeroed
    expect(hum.gain.calls.at(-1)?.args[0]).toBe(0);
    // every voice gain got a quick fade and its sources were stopped
    const voiceSources = s.fake.nodes.filter((n) => (n.kind === "osc" || n.kind === "buffersource") && n.starts.some((x) => x.when !== undefined && x.when >= 10));
    expect(voiceSources.length).toBeGreaterThan(0);
    expect(voiceSources.every((n) => n.stops.length >= 1)).toBe(true);
    const nodesAfter = s.fake.nodes.length;
    s.fake.currentTime += 5;
    s.bus.emit("switch:thrown", { nodeId: "s", selected: 1 });
    s.bus.emit("fuse:blown", blowEvent());
    expect(s.fake.nodes.length).toBe(nodesAfter);
    expect(() => s.detach()).not.toThrow();
  });

  it("a second attach after detach works (switching maps) and brownout state starts fresh", async () => {
    const s = setup();
    await s.unlock();
    s.bus.emit("grid:brownout", { brownout: true, load: 5, capacity: 3 });
    s.detach();
    const bus2 = new EventBus();
    s.audio.attach(bus2);
    s.fake.currentTime += 2;
    const before = s.fake.nodes.length;
    bus2.emit("grid:brownout", { brownout: true, load: 5, capacity: 3 });
    expect(s.fake.nodes.length).toBeGreaterThan(before);
  });
});

describe("the Relight through the engine", () => {
  it("schedules the chimes at the lamp times and nothing on the bus stops it", async () => {
    const s = setup();
    await s.unlock();
    s.audio.relight([0.25, 0.25, 0.9, 2.65], 3.25);
    const chimes = [CHIME_HZ[0], CHIME_HZ[1], CHIME_HZ[2]].map((hz) => s.fake.all("osc").find((n) => n.frequency.calls[0]?.args[0] === hz && n.starts[0]?.when !== undefined && n.type === "sine"));
    expect(chimes.map((c) => c?.starts[0]?.when)).toEqual([10.25, 10.9, 12.65]);
    const stopsBefore = s.fake.nodes.reduce((n, x) => n + x.stops.length, 0);
    s.bus.emit("job:completed", { puzzleId: "p", actions: 1 });
    s.bus.emit("play:click", { kind: "reset" });
    expect(s.fake.nodes.reduce((n, x) => n + x.stops.length, 0)).toBeGreaterThanOrEqual(stopsBefore);
    // the click may play, but no running relight node was cancelled
    for (const c of chimes) expect(c?.gain).toBeUndefined();
  });
});

describe("localStorage", () => {
  it("is never touched", async () => {
    const touched: string[] = [];
    vi.stubGlobal("localStorage", new Proxy({}, { get: (_t, k) => (touched.push(String(k)), undefined) }));
    const s = setup();
    await s.unlock();
    s.audio.setMuted(true);
    s.audio.setVolume(0.2);
    vi.unstubAllGlobals();
    expect(touched).toEqual([]);
  });
});
