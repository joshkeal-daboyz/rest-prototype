import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { EventBus } from "../core";
import type { SoundView } from "../core";
import { FakeContext, asContext } from "./fakeContext";
import type { FakeNode } from "./fakeContext";
import { createAudio } from "./index";
import { FLICKER_HZ, HUM_HZ, WHINE_LOW_HZ, levelDoneSound } from "./recipes";

const flush = async (): Promise<void> => {
  for (let i = 0; i < 4; i++) await Promise.resolve();
};

async function setup() {
  const fake = new FakeContext();
  const target = new EventTarget();
  const audio = createAudio({ createContext: () => asContext(fake) as unknown as AudioContext, gestureTarget: target });
  const bus = new EventBus();
  audio.attach(bus);
  target.dispatchEvent(new Event("pointerdown"));
  await flush();
  return { fake, audio, bus };
}
const view = (complete: boolean): SoundView => ({
  brownout: false,
  complete,
  feeds: new Map(),
  batteries: new Map(),
  sparking: new Set(),
});

beforeEach(() => {
  vi.spyOn(console, "warn").mockImplementation(() => undefined);
});
afterEach(() => vi.restoreAllMocks());

describe("the shell uses the named pitches", () => {
  it("the hum oscillators start at HUM_HZ, the flicker saw at FLICKER_HZ and the whine at WHINE_LOW_HZ", async () => {
    const { fake } = await setup();
    const osc = fake.all("osc");
    const at = (type: string, hz: number) => osc.some((n) => n.type === type && n.frequency.value === hz);
    expect(at("sine", HUM_HZ[0])).toBe(true);
    expect(at("triangle", HUM_HZ[1])).toBe(true);
    expect(at("sawtooth", FLICKER_HZ)).toBe(true);
    expect(at("sine", WHINE_LOW_HZ)).toBe(true);
  });

  it("a voice without detune, formants or vibrato builds the nodes it always did", async () => {
    const { fake, bus } = await setup();
    const oscBefore = fake.all("osc").length;
    const biquadBefore = fake.all("biquad").length;
    bus.emit("breaker:thrown", { nodeId: "b", closed: true });
    const fresh = fake.all("osc").slice(oscBefore);
    expect(fresh.length).toBe(1);
    expect(fresh[0]?.detune.calls.length).toBe(0);
    expect(fake.all("biquad").length - biquadBefore).toBe(1); // the click's lowpass only
  });
});

describe("the shell builds the choir", () => {
  const wins = async () => {
    const s = await setup();
    const before = new Set<FakeNode>(s.fake.nodes);
    s.audio.update(view(true), 0.016);
    s.audio.levelDone();
    return { ...s, fresh: s.fake.nodes.filter((n) => !before.has(n)) };
  };
  const sung = levelDoneSound().filter((v) => v.formants);

  it("a voice with detuneCents sets the source's detune to that many cents", async () => {
    const { fresh } = await wins();
    const set = fresh
      .filter((n) => n.kind === "osc")
      .flatMap((n) => (n.detune.calls as Array<{ op: string; args: number[] }>).filter((c) => c.op === "setValueAtTime").map((c) => c.args[0]));
    expect(set.sort()).toEqual(sung.map((v) => v.detuneCents ?? 0).sort());
  });

  it("a voice with formants gets one bandpass per formant, with its freq and Q, summed into one gain", async () => {
    const { fresh } = await wins();
    const bps = fresh.filter((n) => n.kind === "biquad" && n.type === "bandpass");
    const per = sung[0]?.formants ?? [];
    expect(bps.length).toBe(sung.length * per.length);
    for (const f of per) {
      const match = bps.filter((b) => b.Q.value === f.q && b.frequency.calls[0]?.args[0] === f.freq);
      expect(match.length).toBe(sung.length);
    }
    // each bandpass feeds a gain that feeds one summing gain
    const bp = bps[0];
    const fg = bp?.connections[0];
    expect(fg?.kind).toBe("gain");
    expect(fg?.connections[0]?.kind).toBe("gain");
  });

  it("a voice with vibrato gets an oscillator whose depth gain drives the source's detune, started and stopped with the voice", async () => {
    const { fresh } = await wins();
    const oscs = fresh.filter((n) => n.kind === "osc");
    const detunes = oscs.map((o) => o.params.detune);
    const depths = fresh.filter((n) => n.kind === "gain" && n.connections.some((c: unknown) => detunes.includes(c as never)));
    expect(depths.length).toBe(sung.length);
    expect(new Set(depths.map((d) => d.gain.value))).toEqual(new Set(sung.map((v) => v.vibrato?.cents)));
    const lfos = oscs.filter((o) => o.connections.some((c: FakeNode) => depths.includes(c)));
    expect(lfos.length).toBe(sung.length);
    for (const l of lfos) {
      expect(l.starts.length).toBe(1);
      expect(l.stops.length).toBe(1);
    }
    expect(new Set(lfos.map((l) => l.frequency.value))).toEqual(new Set(sung.map((v) => v.vibrato?.freq)));
  });
});
